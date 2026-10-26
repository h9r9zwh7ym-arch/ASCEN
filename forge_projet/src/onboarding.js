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
  if(obStep===0) return `<div class="ob-hero"><div class="ob-logo">${ascenMark()}</div><div class="ob-t">Bienvenue sur ASCEN</div>
      <div class="ob-s">La musculation à la maison, avec ton propre matériel.</div></div>
    <div class="group ob-points">
      <div class="row">${sfIcon("sparkles","gray")}<div class="grow"><div class="t">Une séance prête chaque jour</div><div class="s">Adaptée à ton matériel, à ton objectif et à ta récupération</div></div></div>
      <div class="row">${sfIcon("bolt","gray")}<div class="grow"><div class="t">Une progression guidée</div><div class="s">Répétitions puis charge, au bon moment</div></div></div>
      <div class="row">${sfIcon("person","gray")}<div class="grow"><div class="t">100 % sur ton téléphone</div><div class="s">Aucun compte, aucune donnée envoyée</div></div></div>
    </div>
    <div class="te-sec">Ton prénom <span class="ob-opt">facultatif</span></div>
    <div class="num-field txt"><input id="obName" type="text" maxlength="30" placeholder="Prénom" autocomplete="given-name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" value="${esc(S.settings.name||"")}"></div>`;
  if(obStep===1) return `<div class="ob-t2">Ton matériel</div><div class="ob-s2">Coche ce que tu as à la maison. Le poids du corps est toujours inclus.</div>
    <div class="group ob-list">${OB_EQUIP.map(id=>{ const e = EQUIP_MAP[id]; const on = !!S.equipment.owned[id];
      return `<button class="row tap ob-eq ${on?"on":""}" data-a="obEquip" data-id="${id}" role="checkbox" aria-checked="${on}">${sfIcon(EQUIP_GLYPH[id]||"wrench", "gray")}<div class="grow"><div class="t">${esc(e.n)}</div></div><em class="ob-ck">${icon("check")}</em></button>`; }).join("")}</div>
    ${S.equipment.owned.dumbbells ? obDbHTML() : ""}`;
  if(obStep===2) return `<div class="ob-t2">Ton objectif</div><div class="ob-s2">Il définit les répétitions et le volume proposés.</div>
    <div class="group ob-list" role="radiogroup" aria-label="Ton objectif">${checkRows(Object.keys(GOAL_LABELS), GOAL_LABELS, S.goals.overall, "obGoal", GOAL_HINTS)}</div>
    <div class="te-sec">Depuis combien de temps t'entraînes-tu ?</div>
    <div class="cal-alarm">${Object.keys(LEVEL_LABELS).map(k=>`<button class="chip ${(S.goals.level||"intermediaire")===k?"on":""}" data-a="obLevel" data-v="${k}">${LEVEL_LABELS[k]}</button>`).join("")}</div>
    <div class="ob-note" id="obLevelHint">${LEVEL_HINTS[S.goals.level||"intermediaire"]}</div>
    <div class="te-sec">Séances par semaine</div>
    <div class="wz-n">${[2,3,4,5,6].map(n=>`<button class="${n===S.goals.daysPerWeek?"on":""}" data-a="obDays" data-v="${n}">${n}</button>`).join("")}</div>
    <div class="ob-note">2 à 3 séances par semaine suffisent pour progresser. La régularité compte plus que le volume.</div>
    <div class="te-sec">Durée d'une séance</div>
    <div class="cal-alarm">${[["court","≈ 20 min"],["moyen","≈ 35 min"],["long","≈ 50 min"]].map(([k,l])=>`<button class="chip ${S.goals.sessionLength===k?"on":""}" data-a="obLen" data-v="${k}">${l}</button>`).join("")}</div>
    <div class="te-sec">Pourquoi t'entraînes-tu ? <span class="ob-opt">facultatif</span></div>
    <div class="num-field txt"><input id="obWhy" type="text" maxlength="120" enterkeyhint="done" placeholder="Ex. être en forme pour la randonnée d'été" value="${esc(S.settings.why||"")}"></div>
    <div class="ob-note">ASCEN te le rappellera quand la motivation baisse.</div>`;
  const split = WEEK_SPLITS[Math.min(6, Math.max(2, S.goals.daysPerWeek))];
  return `<div class="ob-t2">Ta semaine</div><div class="ob-s2">ASCEN peut créer tes ${split.length} séances et les placer dans la semaine. Chaque jour prévu, ta séance s'affichera directement.</div>
    <div class="group wz-list">${split.map(([type,name,day],i)=>`<div class="row wz-row" style="--k:${i}"><span class="wz-day">${JOURS_COURTS[day]}</span><div class="grow"><div class="t">${esc(name)}</div>${wzSub(name, SESSION_TYPE_MAP[type].n)}</div></div>`).join("")}</div>
    <div class="ob-note">Tu pourras changer les jours, les exercices et les noms quand tu veux.</div>`;
}
function renderOnboarding(){
  const last = obStep===3;
  openSheet(`<div class="sheet-hd ob-hd">${obStep ? `<button class="te-cancel" data-a="obBack">${icon("chev")}<span>Retour</span></button>` : `<span></span>`}${obDots()}<button class="ob-skip" data-a="obSkip">Passer</button></div>
    <div class="sheet-body ob-body" id="obBody">${obBody()}</div>`,
    { tall:true, noGrab:true, footer: last
      ? `<button class="btn" data-a="obFinish" data-v="plan"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Créer mon programme</button><button class="btn ghost" data-a="obFinish" data-v="free">Plus tard</button>`
      : `<button class="btn" data-a="obNext">Continuer</button>` });
  const b = qs("#obBody"); if(b){ b.classList.remove("ob-in"); void b.offsetWidth; b.classList.add("ob-in"); }
}
// Haltères : les charges courantes à toucher (pas de saisie au clavier, qui sur iPhone
// n'offre que chiffres et virgule et rend « 4,6 » ambigu) ; « Autre » pour une charge rare.
const OB_DB_KG = [1,2,2.5,3,4,5,6,7,8,9,10,12,12.5,14,15,16,17.5,18,20,22.5,24,25,27.5,30];
function obDbHTML(){
  const own = new Set(S.equipment.weights.dumbbells||[]);
  const list = Array.from(new Set([...OB_DB_KG, ...own])).sort((a,b)=>a-b);
  return `<div class="te-sec">Tes haltères <span class="ob-opt">kg par haltère</span></div>
    <div class="ob-kg" role="group" aria-label="Charges de tes haltères">${list.map(w=>`<button class="ob-w ${own.has(w)?"on":""}" data-a="obDbW" data-v="${w}" aria-pressed="${own.has(w)}">${fmtW(w)}</button>`).join("")}</div>
    <div class="ob-kg-add"><div class="num-field txt"><input id="obDbAdd" type="text" inputmode="decimal" enterkeyhint="done" maxlength="5" placeholder="Autre charge" aria-label="Autre charge, en kg"><span>kg</span></div><button class="btn sm" data-a="obDbAdd">Ajouter</button></div>
    <div class="ob-note" id="obDbSum">${obDbSum()}</div>`;
}
function obDbSum(){
  const n = (S.equipment.weights.dumbbells||[]).length;
  return n ? `${n} charge${n>1?"s":""} cochée${n>1?"s":""}. Haltère réglable : coche chaque charge possible.` : "Haltère réglable : coche chaque charge possible.";
}
function obCollect(){
  const n = qs("#obName"); if(n) S.settings.name = n.value.trim();
  const w = qs("#obWhy"); if(w) S.settings.why = w.value.trim().slice(0,120);
}
function obDone(){ S.meta.onboarded = true; save(); }
Object.assign(ACT, {
  obNext(){ obCollect(); obStep = Math.min(3, obStep+1); save(); renderOnboarding(); },
  obBack(){ obCollect(); obStep = Math.max(0, obStep-1); renderOnboarding(); },
  obSkip(){ obCollect(); obDone(); closeSheet(); regenerateDraft(); changed(); },
  obEquip(d){
    obCollect(); S.equipment.owned[d.id] = !S.equipment.owned[d.id]; save();
    const b = qs("#obBody"); if(b){ const top = b.scrollTop; b.innerHTML = obBody(); b.scrollTop = top; }
    // les charges apparaissent sous la grille : on les amène à l'écran
    const kg = d.id==="dumbbells" && S.equipment.owned.dumbbells && qs("#obBody .ob-kg");
    if(kg) setTimeout(()=>{ const r = kg.getBoundingClientRect(), br = b.getBoundingClientRect(); if(r.top > br.bottom-120) b.scrollTo({ top:b.scrollTop + r.top - br.top - 60, behavior:"smooth" }); }, 60);
    sfx("seg");
  },
  obDbW(d){
    const v = parseFloat(d.v), cur = new Set(S.equipment.weights.dumbbells||[]);
    if(cur.has(v)) cur.delete(v); else cur.add(v);
    S.equipment.weights.dumbbells = Array.from(cur).sort((a,b)=>a-b); save();
    qsa('[data-a="obDbW"]').forEach(x=>{ const on = cur.has(parseFloat(x.dataset.v)); x.classList.toggle("on", on); x.setAttribute("aria-pressed", on); });
    const s = qs("#obDbSum"); if(s) s.textContent = obDbSum(); sfx("seg");
  },
  obDbAdd(){
    const i = qs("#obDbAdd"); if(!i) return;
    const v = Math.round(parseFloat(String(i.value).replace(",", "."))*4)/4;
    if(!(v>0 && v<200)){ i.value = ""; return toast("Indique une charge entre 0,25 et 200 kg"); }
    S.equipment.weights.dumbbells = Array.from(new Set([...(S.equipment.weights.dumbbells||[]), v])).sort((a,b)=>a-b); save();
    const b = qs("#obBody"), top = b && b.scrollTop; if(b){ b.innerHTML = obBody(); b.scrollTop = top; }
  },
  obGoal(d){ S.goals.overall = d.v; qsa('[data-a="obGoal"]').forEach(x=>{ x.classList.toggle("on", x.dataset.v===d.v); x.setAttribute("aria-checked", x.dataset.v===d.v); }); save(); sfx("seg"); },
  obLevel(d){ S.goals.level = d.v; qsa('[data-a="obLevel"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); const h = qs("#obLevelHint"); if(h) h.textContent = LEVEL_HINTS[d.v]; save(); },
  obDays(d){ S.goals.daysPerWeek = +d.v; qsa('[data-a="obDays"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); save(); },
  obLen(d){ S.goals.sessionLength = d.v; qsa('[data-a="obLen"]').forEach(x=>x.classList.toggle("on", x.dataset.v===d.v)); save(); },
  obFinish(d){
    obCollect(); obDone();
    if(d.v==="plan"){ wizardN = Math.min(6, Math.max(2, S.goals.daysPerWeek)); ACT.wizardCreate({ first:true }); }
    else { closeSheet(); regenerateDraft(); renderViewAnimated("today"); }
  },
});
