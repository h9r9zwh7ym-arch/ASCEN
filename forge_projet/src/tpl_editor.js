// ================= ÉDITEUR DE SÉANCES ENREGISTRÉES & PROGRAMME DE LA SEMAINE =================
// Une séance enregistrée se crée et se modifie ici, indépendamment de « Ma séance » :
// nom, jours de la semaine, exercices et séries. Le programme de la semaine génère
// plusieurs séances d'un coup (répartition selon le nombre de jours) et les place.

let tplEdit = null; // { id, n, days, exos:[{exoId,sets}], fromCustom, dirty, order }

function openTplEditor(id, preset){
  const t = id && S.templates.find(x=>x.id===id);
  tplEdit = t ? { id:t.id, n:t.n, days:(t.days||[]).slice(), exos:clone(t.exos) } : { id:null, n:"", days:[], exos:[] };
  if(preset) Object.assign(tplEdit, clone(preset));
  tplEdit.dirty = !!(preset && preset.exos && preset.exos.length && !t);
  tplEdit.order = false;
  renderTplEditor();
}
function tplEdTakenDays(){
  const taken = {};
  S.templates.forEach(t=>{ if(t.id!==tplEdit.id) (t.days||[]).forEach(d=>taken[d]=t.n); });
  return taken;
}
function tplEdBodyHTML(){
  const e = tplEdit, taken = tplEdTakenDays();
  const sets = e.exos.reduce((a,x)=>a+x.sets,0);
  const regions = {}; e.exos.forEach(x=>{ const d=EXO_MAP[x.exoId]; if(d) regions[regionOf(d)]=(regions[regionOf(d)]||0)+x.sets; });
  const balance = Object.keys(REGIONS).filter(r=>regions[r]).map(r=>`<span class="rb r-${r}" style="flex:${regions[r]}"></span>`).join("");
  const stolen = e.days.filter(d=>taken[d]);
  const rows = e.exos.map((x,i)=>{
    const d = EXO_MAP[x.exoId]; if(!d) return "";
    const ctl = e.order
      ? `<div class="mini-step order"><button aria-label="Monter" data-a="tplEdMove" data-i="${i}" data-d="-1" ${i===0?"disabled":""}>↑</button><button aria-label="Descendre" data-a="tplEdMove" data-i="${i}" data-d="1" ${i===e.exos.length-1?"disabled":""}>↓</button></div>`
      : `<div class="mini-step"><button aria-label="Moins de séries" data-a="tplEdSets" data-i="${i}" data-d="-1">−</button><span>${x.sets}×</span><button aria-label="Plus de séries" data-a="tplEdSets" data-i="${i}" data-d="1">+</button></div>
         <button class="icon-btn" aria-label="Retirer" data-a="tplEdRemove" data-i="${i}">${icon("close")}</button>`;
    return `<div class="row te-row ${x.fresh?"fresh":""}">${exoIcon(d)}<div class="grow"><div class="t">${esc(d.n)}</div><div class="s">${esc(MUSCLE_MAP[d.muscles[0]].n)}</div></div>${ctl}</div>`;
  }).join("");
  e.exos.forEach(x=>delete x.fresh);
  return `
    <div class="te-sec">Nom</div>
    <div class="num-field te-name"><input id="tplEdName" type="text" maxlength="40" placeholder="Ex. Haut du corps A" value="${esc(e.n)}" autocomplete="off"></div>
    <div class="te-sec">Jours dans la semaine</div>
    <div class="tpl-daypick te-days">${JOURS_COURTS.map((j,i)=>{
      const on = e.days.includes(i);
      return `<button class="${on?"on":""} ${taken[i]?"taken":""}" data-a="tplEdDay" data-d="${i}" aria-pressed="${on}"><b>${j}</b><small>${on?ii("check"):taken[i]?esc(taken[i]):""}</small></button>`;
    }).join("")}</div>
    <div class="te-hint">${stolen.length ? `${ii("warn","warn")} ${stolen.map(d=>JOURS[(d+1)%7]).join(", ")} : remplacera « ${esc(taken[stolen[0]])} ».` : e.days.length ? `Elle s'affichera directement ${e.days.length>1?"ces jours-là":"ce jour-là"} à l'ouverture de l'app.` : "Aucun jour : elle restera disponible dans tes séances enregistrées."}</div>
    <div class="te-sec te-sec-row"><span>Exercices</span>${e.exos.length?`<span class="te-sum">${e.exos.length} · ${sets} séries · ≈ ${tplMinutes(e)} min</span>`:""}</div>
    ${e.exos.length ? `<div class="region-bar te-bar" aria-hidden="true">${balance}</div>
      <div class="group builder te-list ${e.order?"reorder":""}">${rows}</div>` : `<div class="te-empty">Ajoute des exercices, ou laisse l'app en proposer.</div>`}
    <div class="te-actions">
      <button class="btn secondary sm" data-a="tplEdAdd">${icon("plus")} Ajouter</button>
      <button class="btn secondary sm" data-a="tplEdFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Compléter</button>
      ${e.exos.length>1?`<button class="btn secondary sm" data-a="tplEdOrder">${e.order?"OK":"Ordre"}</button>`:""}
    </div>
    ${e.id?`<button class="btn ghost te-del" data-a="tplEdDelete">Supprimer cette séance</button>`:""}`;
}
function renderTplEditor(){
  openSheet(`<div class="sheet-hd te-hd">
      <button class="te-cancel" data-a="tplEdCancel">Annuler</button>
      <span class="t">${tplEdit.id?"Modifier la séance":"Nouvelle séance"}</span>
      <span class="te-spacer"></span>
    </div>
    <div class="sheet-body" id="tplEdBody">${tplEdBodyHTML()}</div>`,
    { tall:true, footer:`<button class="btn" id="tplEdSaveBtn" data-a="tplEdSave" ${tplEdit.exos.length?"":"disabled"}>Enregistrer la séance</button>` });
  bindTplEdName();
}
function refreshTplEditor(){
  const b = qs("#tplEdBody"); if(!b) return renderTplEditor();
  const st = b.scrollTop;
  b.innerHTML = tplEdBodyHTML(); b.scrollTop = st;
  const s = qs("#tplEdSaveBtn"); if(s) s.disabled = !tplEdit.exos.length;
  bindTplEdName();
}
function bindTplEdName(){
  const inp = qs("#tplEdName");
  if(inp) inp.addEventListener("input", ()=>{ tplEdit.n = inp.value; tplEdit.dirty = true; });
}

// ---------- programme de la semaine ----------
const WEEK_SPLITS = {
  2: [["full","Corps complet A",0],["full","Corps complet B",3]],
  3: [["full","Corps complet A",0],["full","Corps complet B",2],["full","Corps complet C",4]],
  4: [["haut","Haut du corps A",0],["bas","Bas du corps A",1],["haut","Haut du corps B",3],["bas","Bas du corps B",4]],
  5: [["push","Poussée",0],["pull","Tirage",1],["bas","Jambes",2],["haut","Haut du corps",4],["bas","Bas du corps",5]],
  6: [["push","Poussée A",0],["pull","Tirage A",1],["bas","Jambes A",2],["push","Poussée B",3],["pull","Tirage B",4],["bas","Jambes B",5]],
};
let wizardN = 3;
function openWeekWizard(){
  wizardN = Math.min(6, Math.max(2, S.goals.daysPerWeek||3));
  renderWeekWizard();
}
function weekWizardBody(){
  const split = WEEK_SPLITS[wizardN];
  const clash = S.templates.filter(t=>(t.days||[]).some(d=>split.some(s=>s[2]===d)));
  return `<p class="body" style="margin:0 4px 14px">ASCEN crée tes séances à partir de ton matériel et de tes objectifs, puis les place dans la semaine. Tu pourras tout modifier ensuite.</p>
    <div class="te-sec">Jours d'entraînement par semaine</div>
    <div class="wz-n">${[2,3,4,5,6].map(n=>`<button class="${n===wizardN?"on":""}" data-a="wizardN" data-v="${n}">${n}</button>`).join("")}</div>
    <div class="te-sec">Ta semaine</div>
    <div class="group wz-list">${split.map(([type,name,day],i)=>{
      const t = SESSION_TYPE_MAP[type];
      const region = type==="bas" ? "legs" : type==="pull" ? "pull" : type==="push" || type==="haut" ? "push" : "core";
      return `<div class="row wz-row" style="--k:${i}"><span class="wz-day">${JOURS_COURTS[day]}</span><span class="tc-bar-s r-${region}"></span><div class="grow"><div class="t">${esc(name)}</div><div class="s">${esc(t.n)}</div></div></div>`;
    }).join("")}</div>
    ${clash.length?`<div class="te-hint">${ii("warn","warn")} Ces jours sont déjà pris par ${clash.map(t=>`« ${esc(t.n)} »`).join(", ")} : ces séances seront gardées mais retirées de ces jours.</div>`:""}`;
}
function renderWeekWizard(){
  openSheet(`<div class="sheet-hd"><span class="t">Programme de la semaine</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body" id="wzBody">${weekWizardBody()}</div>`,
    { tall:true, footer:`<button class="btn" data-a="wizardCreate"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Créer mes ${wizardN} séances</button>` });
}

Object.assign(ACT, {
  saveDoneSession(){
    const p = lastDoneForSave; lastDoneForSave = null; if(!p) return;
    openTplEditor(null, { n:p.n, exos:p.exos });
  },
  tplNew(){ openTplEditor(null); },
  tplOpenEditor(d){ openTplEditor(d.id); },
  tplEdDay(d){
    const k = +d.d, i = tplEdit.days.indexOf(k);
    if(i>=0) tplEdit.days.splice(i,1); else tplEdit.days.push(k);
    tplEdit.dirty = true; refreshTplEditor();
  },
  tplEdSets(d){
    const x = tplEdit.exos[+d.i]; x.sets = Math.max(1, Math.min(10, x.sets+parseInt(d.d,10)));
    tplEdit.dirty = true; sfx("step", parseInt(d.d,10)>0); refreshTplEditor();
  },
  tplEdRemove(d, el){
    sfx("remove");
    const row = el && el.closest(".row");
    const go = ()=>{ tplEdit.exos.splice(+d.i,1); tplEdit.dirty = true; refreshTplEditor(); };
    if(row){ row.classList.add("leaving"); setTimeout(go, 200); } else go();
  },
  tplEdMove(d){
    const i = +d.i, j = i+parseInt(d.d,10), a = tplEdit.exos;
    if(j<0 || j>=a.length) return;
    [a[i],a[j]] = [a[j],a[i]]; a[j].fresh = true;
    tplEdit.dirty = true; refreshTplEditor();
  },
  tplEdOrder(){ tplEdit.order = !tplEdit.order; refreshTplEditor(); },
  tplEdAdd(){
    openPicker({ title:"Ajouter des exercices", multi:true, exclude:new Set(tplEdit.exos.map(x=>x.exoId)),
      onCancel:()=>renderTplEditor(),
      onDone:ids=>{
        ids.forEach(id=>{ const d = EXO_MAP[id]; tplEdit.exos.push({ exoId:id, sets:d.sets||3, fresh:true }); });
        tplEdit.dirty = true; renderTplEditor();
        setTimeout(()=>{ const b = qs("#tplEdBody"); if(b) b.scrollTo({ top:b.scrollHeight, behavior:"smooth" }); }, 350);
      } });
  },
  tplEdFill(){
    const have = tplEdit.exos.map(x=>x.exoId);
    const target = sessionSize();
    const add = suggestComplement(have, Math.min(4, Math.max(have.length?1:3, target-have.length)));
    if(!add.length){ toast("Aucun exercice disponible avec ton matériel"); return; }
    add.forEach(e=>tplEdit.exos.push({ exoId:e.id, sets:e.sets, fresh:true }));
    tplEdit.dirty = true; sfx("open"); refreshTplEditor();
  },
  tplEdCancel(){
    if(!tplEdit || !tplEdit.dirty){ tplEdit = null; closeSheet(); return; }
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:6px">Abandonner les modifications ?</div>
      <div style="color:var(--label2);font-size:calc(14.5rem/17);margin-bottom:18px">Ce que tu as changé dans cette séance ne sera pas enregistré.</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn danger" data-a="tplEdDiscard">Abandonner</button>
        <button class="btn ghost" data-a="tplEdResume">Continuer l'édition</button>
      </div>`);
  },
  tplEdDiscard(){ tplEdit = null; closeSheet(); },
  tplEdResume(){ renderTplEditor(); },
  tplEdDelete(){ const id = tplEdit.id; tplEdit = null; ACT.deleteTemplate({ id }); },
  tplEdSave(){
    const e = tplEdit; if(!e || !e.exos.length) return;
    const name = (e.n||"").trim() || `Séance ${S.templates.length+(e.id?0:1)}`;
    // un jour de la semaine ne porte qu'une seule séance
    S.templates.forEach(x=>{ if(x.id!==e.id) x.days = (x.days||[]).filter(k=>!e.days.includes(k)); });
    const exos = e.exos.map(x=>({ exoId:x.exoId, sets:x.sets }));
    let t = e.id && S.templates.find(x=>x.id===e.id);
    const days = e.days.slice().sort();
    if(t){ if(days.join()!==(t.days||[]).join()) t.since = todayISO(); t.n = name; t.days = days; t.exos = exos; }
    else { t = { id:uid(), n:name, days, exos, since:todayISO() }; S.templates.push(t); }
    if(e.fromCustom || S.custom.tplId===t.id){ S.custom.name = name; S.custom.tplId = t.id; if(e.fromCustom) S.custom.exos = clone(exos); delete S.custom.pendingDays; }
    openTpls.add(t.id); uiState().tplOpen = true;
    tplEdit = null;
    if(t.days.includes(weekdayIdx(todayISO())) && !(S.draft && S.draft.startedAt)) applyPlannedSession(true);
    closeSheet(); save(); changed(); sfx("set");
    toast(t.days.length ? `« ${name} » : ${t.days.map(k=>JOURS_COURTS[k].toLowerCase()+".").join(" ")}` : `« ${name} » enregistrée`);
    setTimeout(()=>{ const c = qs(`.tpl-card2[data-id="${t.id}"]`); if(c){ c.scrollIntoView({ behavior:"smooth", block:"center" }); c.classList.add("flash"); } }, 380);
  },
  weekWizard(){ openWeekWizard(); },
  wizardN(d){ wizardN = +d.v; const b = qs("#wzBody"); if(b) b.innerHTML = weekWizardBody(); const f = qs('[data-a="wizardCreate"]'); if(f) f.innerHTML = `<svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Créer mes ${wizardN} séances`; },
  wizardCreate(){
    const split = WEEK_SPLITS[wizardN], days = split.map(s=>s[2]);
    S.templates.forEach(t=>{ t.days = (t.days||[]).filter(d=>!days.includes(d)); });
    const used = new Set(); let made = 0;
    split.forEach(([type,name,day])=>{
      const s = generateEngineSession(type, used);
      if(!s.exos.length) return;
      s.exos.forEach(x=>used.add(x.exoId));
      const n = S.templates.some(t=>t.n===name) ? `${name} (${JOURS_COURTS[day]})` : name;
      const t = { id:uid(), n, days:[day], since:todayISO(), exos:s.exos.map(x=>({ exoId:x.exoId, sets:x.sets.length })) };
      S.templates.push(t); openTpls.delete(t.id); made++;
    });
    if(!made){ toast("Pas assez d'exercices avec ton matériel"); return; }
    S.goals.daysPerWeek = wizardN;
    uiState().tplOpen = true; uiState().planOpen = true; showAllTpls = true;
    if(!(S.draft && S.draft.startedAt)) applyPlannedSession(true);
    closeSheet(); save(); renderViewAnimated("today"); sfx("exo");
    toast(`${made} séances créées et placées dans ta semaine`, "sparkle");
    setTimeout(()=>{ const w = qs("#v-today .week-plan"); if(w) w.scrollIntoView({ behavior:"smooth", block:"center" }); }, 420);
  },
  pickerCancel(){ const p = picker; if(p && p.onCancel) p.onCancel(); else closeSheet(); },
});

// ---------- planning → Calendrier de l'iPhone (.ics) ----------
// Fixer jour + heure (« intention de mise en œuvre ») aide à tenir une habitude, et les
// rappels du Calendrier fonctionnent sans serveur ni notification web.
let calTime = "18:00", calAlarm = 30;
function openCalendarExport(){
  const planned = S.templates.filter(t=>(t.days||[]).length);
  openSheet(`<div class="sheet-hd"><span class="t">Ajouter au Calendrier</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body" id="calBody">
      <p class="body" style="margin:0 4px 14px">Tes séances planifiées deviennent des évènements récurrents dans le Calendrier, avec un rappel. Tu pourras les modifier ou les supprimer depuis l'app Calendrier.</p>
      <div class="te-sec">Heure des séances</div>
      <div class="num-field"><input id="calTime" type="time" value="${calTime}"></div>
      <div class="te-sec">Rappel</div>
      <div class="cal-alarm">${[[0,"Aucun"],[15,"15 min avant"],[30,"30 min avant"],[60,"1 h avant"]].map(([v,l])=>`<button class="chip ${calAlarm===v?"on":""}" data-a="calAlarm" data-v="${v}">${l}</button>`).join("")}</div>
      <div class="te-sec">Séances</div>
      <div class="group">${planned.map(t=>`<div class="row"><span class="tc-bar-s r-${tplRegion(t)}"></span><div class="grow"><div class="t">${esc(t.n)}</div><div class="s">${daysLabel(t.days)} · ≈ ${tplMinutes(t)} min</div></div></div>`).join("")}</div>
    </div>`, { tall:true, footer:`<button class="btn" data-a="calExport">${icon("clock")} Créer les évènements</button>` });
}
function icsText(s){ return String(s).replace(/\\/g,"\\\\").replace(/[,;]/g,m=>"\\"+m).replace(/\n/g,"\\n"); }
function buildICS(){
  const [hh,mm] = calTime.split(":").map(Number), pad = n => String(n).padStart(2,"0");
  const stamp = new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const BYDAY = ["MO","TU","WE","TH","FR","SA","SU"];
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//ASCEN//Planning//FR","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  S.templates.filter(t=>(t.days||[]).length).forEach(t=>{
    const days = t.days.slice().sort();
    // première occurrence : le prochain jour planifié à partir d'aujourd'hui
    let k = 0; while(!days.includes(weekdayIdx(addDaysISO(todayISO(), k)))) k++;
    const d = addDaysISO(todayISO(), k).replace(/-/g,"");
    const mins = tplMinutes(t);
    lines.push("BEGIN:VEVENT", `UID:forge-${t.id}@forge.app`, `DTSTAMP:${stamp}`, `DTSTART:${d}T${pad(hh)}${pad(mm)}00`,
      `DURATION:PT${mins}M`, `RRULE:FREQ=WEEKLY;BYDAY=${days.map(x=>BYDAY[x]).join(",")}`,
      `SUMMARY:${icsText("ASCEN · "+t.n)}`, `DESCRIPTION:${icsText(`${t.exos.length} exercices · ${t.exos.reduce((a,e)=>a+e.sets,0)} séries · ≈ ${mins} min`)}`);
    if(calAlarm) lines.push("BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${icsText("Séance ASCEN : "+t.n)}`,`TRIGGER:-PT${calAlarm}M`,"END:VALARM");
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n")+"\r\n";
}
Object.assign(ACT, {
  openCalendarExport(){ openCalendarExport(); },
  calAlarm(d, el){ calAlarm = +d.v; qsa(".cal-alarm .chip").forEach(c=>c.classList.toggle("on", +c.dataset.v===calAlarm)); },
  calExport(){
    const inp = qs("#calTime"); if(inp && /^\d\d:\d\d$/.test(inp.value)) calTime = inp.value;
    const url = URL.createObjectURL(new Blob([buildICS()], { type:"text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "ascen-planning.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 8000);
    closeSheet(); sfx("set"); toast("Ouvre le fichier pour ajouter tes séances au Calendrier");
  },
});
