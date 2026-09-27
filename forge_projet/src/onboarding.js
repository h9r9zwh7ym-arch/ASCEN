// ================= PREMIER LANCEMENT =================
// Quatre écrans courts pour que la première séance proposée corresponde vraiment à la
// personne : prénom, matériel, objectif et rythme, puis création (facultative) du
// programme de la semaine. Tout reste modifiable dans le Profil ; « Passer » à tout moment.

let obStep = 0;
const OB_EQUIP = ["dumbbells","kettlebell","bench","bench_incline","barbell","rack","bench_press","pullup_bar","dip_bars","suspension","ab_roller","bands","jump_rope","mat"];
function needsOnboarding(){ return !S.meta.onboarded && !S.sessions.length && !S.templates.length; }
function openOnboarding(){ obStep = 0; S.meta.onboarded = true; save(); renderOnboarding(); } // montré une seule fois
function obDots(){ return `<div class="ob-dots">${[0,1,2,3].map(i=>`<i class="${i===obStep?"on":""}"></i>`).join("")}</div>`; }
function obBody(){
  if(obStep===0) return `<div class="ob-hero"><img src="icon-192.png" alt="" onerror="this.remove()"><div class="ob-t">Bienvenue sur Forge</div>
      <div class="ob-s">Ta musculation à la maison, avec le matériel que tu as vraiment.</div></div>
    <div class="group ob-points">
      <div class="row">${sfIcon("sparkles","orange")}<div class="grow"><div class="t">Une séance prête chaque jour</div><div class="s">Adaptée à ton matériel, à ton objectif et à ta récupération</div></div></div>
      <div class="row">${sfIcon("bolt","purple")}<div class="grow"><div class="t">Une progression guidée</div><div class="s">Répétitions puis charge, au bon moment</div></div></div>
      <div class="row">${sfIcon("person","blue")}<div class="grow"><div class="t">100 % sur ton téléphone</div><div class="s">Aucun compte, aucune donnée envoyée</div></div></div>
    </div>
    <div class="te-sec">Ton prénom <span class="ob-opt">facultatif</span></div>
    <div class="num-field"><input id="obName" type="text" maxlength="30" placeholder="Prénom" autocomplete="given-name" value="${esc(S.settings.name||"")}"></div>`;
  if(obStep===1) return `<div class="ob-t2">Ton matériel</div><div class="ob-s2">Coche ce que tu as à la maison. Le poids du corps est toujours inclus.</div>
    <div class="ob-equip">${OB_EQUIP.map(id=>{ const e = EQUIP_MAP[id]; const on = S.equipment.owned[id];
      return `<button class="ob-eq ${on?"on":""}" data-a="obEquip" data-id="${id}" aria-pressed="${on}">${sfIcon(EQUIP_GLYPH[id]||"wrench", on ? (EQUIP_COLOR[id]||"gray") : "gray")}<span>${esc(e.n)}</span><em>${icon("check")}</em></button>`; }).join("")}</div>
    ${S.equipment.owned.dumbbells ? `<div class="te-sec">Tes haltères <span class="ob-opt">kg, séparés par des virgules</span></div>
      <div class="num-field"><input id="obDb" type="text" inputmode="decimal" placeholder="Ex. 4, 6, 8, 10" value="${(S.equipment.weights.dumbbells||[]).join(", ")}"></div>` : ""}`;
  if(obStep===2) return `<div class="ob-t2">Ton objectif</div><div class="ob-s2">Il règle les fourchettes de répétitions et le volume proposé.</div>
    <div class="ob-goals">${[["hypertrophie","Prendre du muscle","8 à 12 répétitions, ~10 séries par muscle et par semaine"],["force","Devenir plus fort·e","Moins de répétitions, charges plus lourdes"],["endurance","Endurance et tonus","Plus de répétitions, repos courts"]].map(([k,t,d])=>`<button class="ob-goal ${S.goals.overall===k?"on":""}" data-a="obGoal" data-v="${k}"><b>${t}</b><small>${d}</small></button>`).join("")}</div>
    <div class="te-sec">Ton niveau</div>
    <div class="cal-alarm">${Object.keys(LEVEL_LABELS).map(k=>`<button class="chip ${(S.goals.level||"intermediaire")===k?"on":""}" data-a="obLevel" data-v="${k}">${LEVEL_LABELS[k]}</button>`).join("")}</div>
    <div class="ob-note" id="obLevelHint">${LEVEL_HINTS[S.goals.level||"intermediaire"]}</div>
    <div class="te-sec">Séances par semaine</div>
    <div class="wz-n">${[2,3,4,5,6].map(n=>`<button class="${n===S.goals.daysPerWeek?"on":""}" data-a="obDays" data-v="${n}">${n}</button>`).join("")}</div>
    <div class="ob-note">2 à 3 séances suffisent pour progresser nettement : l'important est de tenir dans la durée.</div>
    <div class="te-sec">Durée d'une séance</div>
    <div class="cal-alarm">${[["court","≈ 20 min"],["moyen","≈ 35 min"],["long","≈ 50 min"]].map(([k,l])=>`<button class="chip ${S.goals.sessionLength===k?"on":""}" data-a="obLen" data-v="${k}">${l}</button>`).join("")}</div>`;
  const split = WEEK_SPLITS[Math.min(6, Math.max(2, S.goals.daysPerWeek))];
  return `<div class="ob-t2">Ta semaine</div><div class="ob-s2">Forge peut créer tes ${split.length} séances et les placer dans la semaine. Chaque jour prévu, ta séance s'affichera directement.</div>
    <div class="group wz-list">${split.map(([type,name,day],i)=>`<div class="row wz-row" style="--k:${i}"><span class="wz-day">${JOURS_COURTS[day]}</span><div class="grow"><div class="t">${esc(name)}</div><div class="s">${esc(SESSION_TYPE_MAP[type].n)}</div></div></div>`).join("")}</div>
    <div class="ob-note">Tu pourras changer les jours, les exercices et les noms quand tu veux.</div>`;
}
function renderOnboarding(){
  const last = obStep===3;
  openSheet(`<div class="sheet-hd ob-hd">${obStep ? `<button class="te-cancel" data-a="obBack">${icon("chev")}<span>Retour</span></button>` : `<span></span>`}${obDots()}<button class="ob-skip" data-a="obSkip">Passer</button></div>
    <div class="sheet-body ob-body" id="obBody">${obBody()}</div>`,
    { tall:true, noGrab:true, footer: last
      ? `<button class="btn" data-a="obFinish" data-v="plan">✨ Créer mon programme</button><button class="btn ghost" data-a="obFinish" data-v="free">Plus tard, je commence librement</button>`
      : `<button class="btn" data-a="obNext">Continuer</button>` });
  const b = qs("#obBody"); if(b){ b.classList.remove("ob-in"); void b.offsetWidth; b.classList.add("ob-in"); }
}
// « 4, 6, 8 » ou « 4 6 8 » ; « 12,5 » (virgule décimale suivie d'un seul chiffre) = 12,5 kg
function parseWeightList(txt){
  const out = [];
  txt.split(/[;\s]+/).forEach(tok=>{
    if(!tok) return;
    // « 12,5 » : virgule décimale ; « 8,10 » ou « 2.5,5 » : liste
    if(/^\d+,\d$/.test(tok)) out.push(parseFloat(tok.replace(",",".")));
    else tok.split(",").forEach(x=>{ const v = parseFloat(x); if(v>0) out.push(v); });
  });
  return out.filter(x=>x>0 && x<200);
}
function obCollect(){
  const n = qs("#obName"); if(n) S.settings.name = n.value.trim();
  const db = qs("#obDb");
  if(db){ S.equipment.weights.dumbbells = Array.from(new Set(parseWeightList(db.value))).sort((a,b)=>a-b); }
}
function obDone(){ S.meta.onboarded = true; save(); }
Object.assign(ACT, {
  obNext(){ obCollect(); obStep = Math.min(3, obStep+1); save(); renderOnboarding(); },
  obBack(){ obCollect(); obStep = Math.max(0, obStep-1); renderOnboarding(); },
  obSkip(){ obCollect(); obDone(); closeSheet(); regenerateDraft(); changed(); },
  obEquip(d){ obCollect(); S.equipment.owned[d.id] = !S.equipment.owned[d.id]; save(); const b = qs("#obBody"); if(b){ b.innerHTML = obBody(); } sfx("seg"); },
  obGoal(d){ S.goals.overall = d.v; qsa(".ob-goal").forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); save(); },
  obLevel(d){ S.goals.level = d.v; qsa('[data-a="obLevel"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); const h = qs("#obLevelHint"); if(h) h.textContent = LEVEL_HINTS[d.v]; save(); },
  obDays(d){ S.goals.daysPerWeek = +d.v; qsa('[data-a="obDays"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); save(); },
  obLen(d){ S.goals.sessionLength = d.v; qsa('[data-a="obLen"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); save(); },
  obFinish(d){
    obCollect(); obDone();
    if(d.v==="plan"){ wizardN = Math.min(6, Math.max(2, S.goals.daysPerWeek)); ACT.wizardCreate(); }
    else { closeSheet(); regenerateDraft(); renderViewAnimated("today"); }
  },
});
