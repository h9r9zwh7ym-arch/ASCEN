// ================= VUE : HISTORIQUE =================
function sessionTitle(s){
  if(s.name) return s.name;
  if(s.source==="custom") return "Ma séance";
  if(s.source==="imported") return "Programme importé";
  const t = SESSION_TYPE_MAP[s.resolvedType||s.type];
  return t ? t.n : "Séance";
}
// icône d'une séance : pictogramme de l'exercice principal, couleur de la zone dominante
function sessionIcon(s){
  const count = {};
  s.exos.forEach(ex=>{ const d=EXO_MAP[ex.exoId]; if(d) count[regionOf(d)] = (count[regionOf(d)]||0) + ex.sets.filter(st=>st.done).length; });
  const region = Object.keys(count).sort((a,b)=>count[b]-count[a])[0] || "core";
  const first = s.exos.map(ex=>EXO_MAP[ex.exoId]).find(d=>d && regionOf(d)===region);
  return `<span class="xico r-${region}">${pictoSVG(first?pictoKey(first):"squat")}</span>`;
}

// Affichage par paquets : l'historique complet (des centaines de séances après
// quelques années) prenait plus de 100 ms à dessiner sur téléphone.
let histLimit = 25;
let histMetric = "sessions"; // graphique de l'historique : séances, durée ou séries par semaine
const HIST_METRICS = [["sessions","Séances"],["minutes","Durée"],["sets","Séries"]];
function histChartHTML(){
  const weeks = memo("histWeeks", ()=>weeklyBuckets(12));
  const m = histMetric, lab = b => fmtDate(b.wk);
  const val = b => m==="minutes" ? Math.round(b.minutes) : b[m];
  const fmt = v => m==="minutes" ? fmtDuration(v*60) : `${fmtDec(v)} ${m==="sets"?"série":"séance"}${v>=2?"s":""}`;
  const cur = val(weeks[weeks.length-1]), prev = val(weeks[weeks.length-2]);
  // moyenne à une décimale pour les séances et séries (3 séances en 11 semaines ≠ « 0 séance »)
  const avgRaw = weeks.slice(0,-1).reduce((t,b)=>t+val(b),0)/(weeks.length-1);
  const avg = m==="minutes" ? Math.round(avgRaw) : round1(avgRaw);
  const delta = cur-prev;
  return `<div class="hist-kpi"><div><b>${fmt(cur)}</b><small>cette semaine</small></div>
      <div class="hk-delta ${delta>0?"up":delta<0?"down":""}">${delta>0?"▲":delta<0?"▼":"="} ${delta?fmt(Math.abs(delta)):"stable"}<small>vs semaine passée</small></div></div>
    ${columnChart(weeks.map(b=>({ label:lab(b), v:val(b), tip:`Semaine du ${lab(b)} : ${fmt(val(b))}` })), { goal: m==="sessions" ? S.goals.daysPerWeek : 0, fmt })}
    <div class="hist-avg">Moyenne sur 11 semaines : ${fmt(avg)}</div>`;
}
// écart avec le mois précédent (pas pour le mois en cours, encore incomplet)
function monthDeltaHTML(key, perMonth, curMonth, firstMonth){
  if(key===curMonth || key<=firstMonth) return "";
  const d = parseISO(key+"-01"); d.setMonth(d.getMonth()-1);
  const pk = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  const diff = (perMonth[key]||0)-(perMonth[pk]||0);
  return ` · <span class="md ${diff>0?"up":diff<0?"down":""}">${diff>0?"+"+diff:diff<0?"−"+Math.abs(diff):"autant"} vs ${MOIS[d.getMonth()]}</span>`;
}
function renderHistory(){
  const all = S.sessions.slice().reverse();
  const sessions = all.slice(0, histLimit);
  if(!sessions.length){
    return `<div class="navbar"><div class="nb-title">Historique</div></div><div class="content">
      <h1 class="lt">Historique</h1>
      <div class="empty-state"><span class="em">${sfIcon("history","indigo","lg")}</span>Aucune séance enregistrée pour l'instant.<br>Termine ta première séance pour la voir ici.</div>
    </div>`;
  }
  const months = [];
  sessions.forEach(s=>{
    const key = s.date.slice(0,7);
    let m = months[months.length-1];
    if(!m || m.key!==key){ m = { key, list:[] }; months.push(m); }
    m.list.push(s);
  });
  // séances par mois sur tout l'historique (pas seulement la partie affichée)
  const perMonth = {};
  all.forEach(s=>{ const k = s.date.slice(0,7); perMonth[k] = (perMonth[k]||0)+1; });
  const curMonth = todayISO().slice(0,7), firstMonth = S.sessions[0].date.slice(0,7);
  let i = 0;
  const html = months.map(m=>{
    const d = parseISO(m.key+"-01");
    const vol = m.list.reduce((t,s)=>t+sessionVolume(s),0);
    const rows = m.list.map(s=>{
      const prs = sessionPRCount(s);
      return `<button class="row tap stagger" style="--i:${Math.min(i++,12)}" data-a="openSessionDetail" data-id="${s.id}">
        ${sessionIcon(s)}
        <div class="grow"><div class="hr-top"><span class="t">${esc(sessionTitle(s))}${prs?` <span class="pr-badge">${ii("bolt")} ${prs}</span>`:""}</span><span class="hr-dur">${s.durationSec?fmtDuration(s.durationSec):""}</span></div>
        <div class="s">${esc(fmtDate(s.date,"short"))} · ${nb(sessionSetCount(s),"série")}${sessionVolume(s)?" · "+fmtKg(sessionVolume(s)):""}</div>${s.note?`<div class="hn">${esc(s.note)}</div>`:""}</div>
        <span class="chev">${icon("chev")}</span>
      </button>`;
    }).join("");
    return `<h2 class="sh">${MOIS_LONG[d.getMonth()].replace(/^./,c=>c.toUpperCase())} ${d.getFullYear()}</h2>
      <div class="sh-sub">${m.list.length} séance${m.list.length>1?"s":""}${vol?" · "+fmtKg(vol):""}${monthDeltaHTML(m.key, perMonth, curMonth, firstMonth)}</div>
      <div class="group">${rows}</div>`;
  }).join("");
  const more = all.length - sessions.length;
  return `<div class="navbar"><div class="nb-title">Historique</div></div><div class="content">
    <h1 class="lt">Historique</h1>
    <div class="sh-sub" style="margin-top:-4px">${all.length} séance${all.length>1?"s":""} au total${totalVolumeAllTime()?" · "+fmtKg(totalVolumeAllTime())+" soulevés":""}</div>
    <div class="chart-card hist-chart stagger" style="--i:0">
      <div class="cc-h"><div class="cc-t">12 dernières semaines</div></div>
      ${segHTML("histMetric", HIST_METRICS, histMetric, "histMetric")}
      <div id="histChart">${histChartHTML()}</div>
    </div>
    <div class="group rc-entry stagger" style="--i:1"><button class="row tap" style="width:100%" data-a="openRecap">${sfIcon("sparkles","orange")}<div class="grow"><div class="t">Rewind</div><div class="s">Revis ton mois ou ton année en animation</div></div><span class="chev">${icon("chev")}</span></button></div>
    ${html}
    ${more>0?`<div class="btnrow"><button class="btn tertiary" data-a="histMore">Afficher ${Math.min(more,25)} séance${Math.min(more,25)>1?"s":""} de plus</button></div><div class="hr-note center">${more} au total non affichée${more>1?"s":""}</div>`:""}
  </div>`;
}

Object.assign(ACT, {
  histMetric(d, el){
    if(histMetric===d.v) return;
    histMetric = d.v;
    const seg = el && el.closest(".seg");
    if(seg){ seg.dataset.cur = HIST_METRICS.findIndex(x=>x[0]===d.v); qsa("button", seg).forEach(b=>{ const on = b.dataset.v===d.v; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }); settleSegs(seg.parentElement); }
    const box = qs("#histChart");
    if(box){ box.classList.remove("swap"); box.innerHTML = histChartHTML(); void box.offsetWidth; box.classList.add("swap"); }
  },
});
function sessionDetailHTML(s){
  const rows = s.exos.map(ex=>{
    const def = EXO_MAP[ex.exoId];
    if(!def) return "";
    const sets = ex.sets.filter(st=>st.done);
    if(!sets.length) return "";
    return `<div class="row" style="align-items:flex-start">
      ${exoIcon(def)}
      <div class="grow"><div class="t">${esc(def.n)}</div>
      <div class="set-chips">${sets.map(st=>`<span class="chip ${st.pr?"pr":""}">${st.pr?ii("bolt"):""}${st.reps||"?"}${loadSuffix(def, st.weight)}</span>`).join("")}</div></div>
    </div>`;
  }).join("");
  const time = s.startedAt ? new Date(s.startedAt).toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"}) : "";
  return `<div class="sheet-hd"><span class="t">${esc(sessionTitle(s))}</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <p class="body" style="margin-bottom:12px">${esc(fmtDate(s.date,"long"))}${time?" à "+time:""}</p>
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${s.durationSec?fmtDuration(s.durationSec):"–"}</div><div class="lbl">durée</div></div>
      <div class="stat-box"><div class="num">${sessionSetCount(s)}</div><div class="lbl">séries</div></div>
      ${sessionVolume(s) ? `<div class="stat-box"><div class="num">${fmtKg(sessionVolume(s))}</div><div class="lbl">soulevés</div></div>` : `<div class="stat-box"><div class="num">${sessionReps(s)}</div><div class="lbl">répétitions</div></div>`}
      ${sessionPRCount(s) ? `<div class="stat-box pr"><div class="num">${sessionPRCount(s)}</div><div class="lbl">record${sessionPRCount(s)>1?"s":""}</div></div>` : ""}
    </div>
    <div class="group" style="margin-top:14px">${rows||'<div style="padding:16px" class="s">Aucune série complétée.</div>'}</div>
    <div class="te-sec">Note</div>
    <textarea class="note-in" rows="3" maxlength="280" data-c="saveNote" data-id="${esc(s.id)}" placeholder="Sensations, douleur, contexte… (facultatif)" aria-label="Note sur la séance">${esc(s.note||"")}</textarea>
    <div class="btnrow two"><button class="btn secondary" data-a="histEdit" data-id="${s.id}">${icon("edit")} Modifier</button><button class="btn secondary" data-a="redoSession" data-id="${s.id}">${icon("repeat")} Refaire</button></div>
    <div class="btnrow"><button class="btn ghost" style="color:var(--red)" data-a="deleteSession" data-id="${s.id}">Supprimer de l'historique</button></div>
    </div>`;
}

Object.assign(ACT, {
  histMore(){ histLimit += 25; changed(); },
  saveNote(d, el){
    const s = S.sessions.find(x=>x.id===d.id); if(!s) return;
    const v = el.value.trim().slice(0,280);
    if(v===(s.note||"")) return;
    if(v) s.note = v; else delete s.note;
    changed();
  },
  openSessionDetail(d){
    const s = S.sessions.find(x=>x.id===d.id);
    if(s) openSheet(sessionDetailHTML(s));
  },
  redoSession(d){
    const s = S.sessions.find(x=>x.id===d.id); if(!s) return;
    S.custom = { exos: s.exos.filter(ex=>EXO_MAP[ex.exoId]).map(ex=>({ exoId:ex.exoId, sets:Math.max(1,ex.sets.length) })), name: s.name||null };
    S.settings.todayTab = "custom";
    save(); closeSheet();
    switchTab("today");
    toast("Séance chargée dans « Ma séance »");
  },
  deleteSession(d){
    confirmSheet({ title:"Supprimer cette séance ?", html:"Elle disparaîtra de l'historique et des statistiques. Les trophées déjà obtenus sont conservés.", ok:"Supprimer", danger:true,
      onOk:()=>{ S.sessions = S.sessions.filter(x=>x.id!==d.id); save(); changed(); toast("Séance supprimée"); } });
  },
});
VIEWS.history = renderHistory;

// ---------- modifier une séance enregistrée ----------
// On travaille sur une copie : rien n'est touché tant qu'on n'a pas appuyé sur « Enregistrer ».
let histEdit = null;
function heTime(s){ return s.startedAt ? new Date(s.startedAt).toTimeString().slice(0,5) : ""; }
function heSetRow(def, i, j, st){
  const lt = loadableTypeOf(def), timed = isTimed(def);
  const load = lt==="bands"
    ? `<select class="he-sel" data-c="heVal" data-i="${i}" data-j="${j}" data-k="weight" aria-label="Résistance de l'élastique">${[1,2,3,4,5].map(v=>`<option value="${v}" ${Math.round(st.weight||0)===v?"selected":""}>${bandLabel(v)}</option>`).join("")}</select>`
    : lt ? `<span class="he-x">×</span><input class="he-in" type="text" inputmode="decimal" maxlength="5" value="${st.weight!=null?fmtDec(st.weight):""}" placeholder="0" data-c="heVal" data-i="${i}" data-j="${j}" data-k="weight" aria-label="Charge en kg"><span class="he-u">kg</span>` : "";
  return `<div class="he-set"><span class="he-n">${j+1}</span>
    <input class="he-in" type="text" inputmode="numeric" maxlength="4" value="${st.reps||""}" placeholder="0" data-c="heVal" data-i="${i}" data-j="${j}" data-k="reps" aria-label="${timed?"Secondes":"Répétitions"}"><span class="he-u">${timed?"s":"reps"}</span>
    ${load}<span class="grow"></span>
    <button class="icon-btn he-del" aria-label="Retirer la série ${j+1}" data-a="heDelSet" data-i="${i}" data-j="${j}">${icon("close")}</button></div>`;
}
function histEditBodyHTML(){
  const e = histEdit;
  const exos = e.exos.map((ex,i)=>{
    const def = EXO_MAP[ex.exoId]; if(!def) return "";
    return `<div class="group he-exo">
      <div class="row">${exoIcon(def)}<div class="grow"><div class="t">${esc(def.n)}</div></div>
        <button class="icon-btn" aria-label="Retirer ${esc(def.n)}" data-a="heDelExo" data-i="${i}">${icon("trash")}</button></div>
      ${ex.sets.map((st,j)=>heSetRow(def, i, j, st)).join("")}
      <button class="he-add" data-a="heAddSet" data-i="${i}">${icon("plus")} Ajouter une série</button>
    </div>`;
  }).join("");
  return `<div class="te-sec">Date et durée</div>
    <div class="group"><div class="row he-meta">
      <input type="date" class="he-date" max="${todayISO()}" value="${e.date}" data-c="heMeta" data-k="date" aria-label="Date">
      <input class="he-in" type="text" inputmode="numeric" maxlength="3" value="${e.min||""}" placeholder="–" data-c="heMeta" data-k="min" aria-label="Durée en minutes"><span class="he-u">min</span>
    </div></div>
    <div class="te-sec">Exercices</div>
    ${exos || `<div class="te-empty">Aucun exercice.</div>`}
    <div class="te-actions"><button class="btn secondary sm" data-a="heAddExo">${icon("plus")} Ajouter un exercice</button></div>`;
}
function renderHistEdit(){
  openSheet(`<div class="sheet-hd te-hd">
      <button class="te-cancel" data-a="heCancel">Annuler</button>
      <span class="t">Modifier la séance</span>
      <span class="te-spacer"></span>
    </div>
    <div class="sheet-body" id="heBody">${histEditBodyHTML()}</div>`,
    { tall:true, footer:`<button class="btn" data-a="heSave">Enregistrer les modifications</button>` });
}
function refreshHistEdit(){
  const b = qs("#heBody"); if(!b) return renderHistEdit();
  const st = b.scrollTop; b.innerHTML = histEditBodyHTML(); b.scrollTop = st;
}
function heNum(v){ return parseFloat(String(v).replace(",", ".")); }
Object.assign(ACT, {
  histEdit(d){
    const s = S.sessions.find(x=>x.id===d.id); if(!s) return;
    histEdit = { id:s.id, date:s.date, min: s.durationSec ? Math.round(s.durationSec/60) : 0,
      exos: clone(s.exos).map(ex=>({ exoId:ex.exoId, targetReps:ex.targetReps, sets:ex.sets.filter(st=>st.done) })) };
    renderHistEdit();
  },
  heCancel(){ const s = histEdit && S.sessions.find(x=>x.id===histEdit.id); histEdit = null; if(s) openSheet(sessionDetailHTML(s)); else closeSheet(); },
  heVal(d, el){
    const st = histEdit && histEdit.exos[+d.i] && histEdit.exos[+d.i].sets[+d.j]; if(!st) return;
    const v = heNum(el.value);
    if(d.k==="reps") st.reps = v>0 ? Math.min(9999, Math.round(v)) : 0;
    else if(isNaN(v) || v<=0) delete st.weight; else st.weight = Math.min(500, round1(v));
  },
  heMeta(d, el){
    if(!histEdit) return;
    if(d.k==="date"){ if(/^\d{4}-\d{2}-\d{2}$/.test(el.value) && el.value<=todayISO()) histEdit.date = el.value; else el.value = histEdit.date; }
    else { const v = heNum(el.value); histEdit.min = v>0 ? Math.min(600, Math.round(v)) : 0; }
  },
  heAddSet(d){
    const ex = histEdit.exos[+d.i]; if(!ex) return;
    const last = ex.sets[ex.sets.length-1], def = EXO_MAP[ex.exoId];
    ex.sets.push(last ? Object.assign({}, last, { pr:undefined, effort:undefined }) : { reps: def ? def.repsMin : 10, done:true });
    refreshHistEdit();
  },
  heDelSet(d){ const ex = histEdit.exos[+d.i]; if(!ex) return; ex.sets.splice(+d.j,1); if(!ex.sets.length) histEdit.exos.splice(+d.i,1); refreshHistEdit(); },
  heDelExo(d){ histEdit.exos.splice(+d.i,1); refreshHistEdit(); },
  heAddExo(){
    openPicker({ title:"Ajouter un exercice", multi:true, exclude:new Set(histEdit.exos.map(x=>x.exoId)),
      onCancel:()=>renderHistEdit(),
      onDone:ids=>{
        ids.forEach(id=>{ const def = EXO_MAP[id]; if(!def) return;
          const lt = loadableTypeOf(def), sug = suggestForExo(def, def.sets);
          const w = lt ? (lt==="bands" ? ((S.equipment.weights.bands||[])[0]||2) : sug.weight) : null;
          histEdit.exos.push({ exoId:id, sets:Array.from({ length:def.sets }, ()=>{ const o = { reps: sug.reps || def.repsMin, done:true }; if(w) o.weight = w; return o; }) });
        });
        renderHistEdit();
      } });
  },
  heSave(){
    // un champ encore en cours de saisie n'a pas forcément déclenché « change »
    const a = document.activeElement; if(a && a.dataset && a.dataset.c && ACT[a.dataset.c]) ACT[a.dataset.c](a.dataset, a);
    const e = histEdit, s = e && S.sessions.find(x=>x.id===e.id); if(!s) return closeSheet();
    const exos = e.exos.map(ex=>Object.assign({}, ex, { sets: ex.sets.filter(st=>st.reps>0).map(st=>{ const o = Object.assign({}, st, { done:true }); if(o.pr===undefined) delete o.pr; if(o.effort===undefined) delete o.effort; return o; }) })).filter(ex=>ex.sets.length && EXO_MAP[ex.exoId]);
    if(!exos.length){ toast("Garde au moins une série, ou supprime la séance"); return; }
    if(e.date!==s.date && s.startedAt){
      // même heure, nouveau jour
      const t = new Date(s.startedAt), n = parseISO(e.date); n.setHours(t.getHours(), t.getMinutes(), 0, 0);
      s.startedAt = n.toISOString();
    }
    s.date = e.date; s.exos = exos;
    if(e.min){ s.durationSec = e.min*60; if(s.startedAt) s.completedAt = new Date(Date.parse(s.startedAt)+s.durationSec*1000).toISOString(); }
    else delete s.durationSec;
    S.sessions.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    recomputePRFlags();
    checkMedals(true); // un palier atteint grâce à la correction est noté sans fête
    const hits = checkTargets();
    histEdit = null;
    changed();
    openSheet(sessionDetailHTML(s));
    sfx("seg"); toast(hits.length ? "Séance modifiée · objectif atteint" : "Séance modifiée", hits.length ? "target" : "check");
  },
});
