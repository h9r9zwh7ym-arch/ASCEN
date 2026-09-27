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
      <div class="empty-state"><span class="em">📋</span>Aucune séance enregistrée pour l'instant.<br>Termine ta première séance pour la voir ici.</div>
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
        <div class="grow"><div class="t">${esc(sessionTitle(s))}${prs?` <span class="pr-badge">💥 ${prs}</span>`:""}</div>
        <div class="s">${esc(fmtDate(s.date,"short"))} · ${nb(sessionSetCount(s),"série")}${sessionVolume(s)?" · "+fmtKg(sessionVolume(s)):""}</div>${s.note?`<div class="hn">${esc(s.note)}</div>`:""}</div>
        <div class="val">${s.durationSec?fmtDuration(s.durationSec):""}</div><span class="chev">${icon("chev")}</span>
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
    ${html}
    ${more>0?`<div class="btnrow"><button class="btn secondary" data-a="histMore">Afficher ${Math.min(more,25)} séance${Math.min(more,25)>1?"s":""} de plus <span class="muted-n">· ${more} restante${more>1?"s":""}</span></button></div>`:""}
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
      <div class="set-chips">${sets.map(st=>`<span class="chip ${st.pr?"pr":""}">${st.pr?"💥 ":""}${st.reps||"?"}${loadSuffix(def, st.weight)}</span>`).join("")}</div></div>
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
    <div class="btnrow"><button class="btn secondary" data-a="redoSession" data-id="${s.id}">${icon("repeat")} Refaire cette séance</button></div>
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
