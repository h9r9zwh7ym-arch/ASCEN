// ================= VUE : AUJOURD'HUI =================
// Avant la séance : deux sections — « Proposée » (moteur, avec choix du type de séance)
// et « Ma séance » (composée par l'utilisateur, avec modèles réutilisables).
// Pendant la séance : mode focus, un exercice à la fois.

let liveFocusIdx = 0;
let focusAnimDir = null;
let valRoll = {};       // sens du défilement du chiffre modifié (+/−)
let restReady = false;  // le repos vient de se terminer
let stripBump = -1; // pastille du bandeau qui « rebondit » après une série validée
let justDone = null; // {exi, si} : série qui vient d'être validée (animation du point)

function fmtDuration(sec){
  if(sec<60) return `${sec} s`;
  const m = Math.round(sec/60);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`;
}
function repsLabel(range){ return range[0]===range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`; }
function musclesLabel(def){ return def.muscles.map(m=>MUSCLE_MAP[m].n).join(" · "); }

function renderToday(){
  const draft = getOrCreateDraft();
  liveFocusIdx = Math.min(liveFocusIdx, Math.max(0, draft.exos.length-1));
  return draft.startedAt ? renderTodayLive(draft) : renderTodayPreview(draft);
}

// ---------- accueil : en-tête, pastilles, carte « action du jour » ----------
function greeting(){
  const h = new Date().getHours(), name = (S.settings.name||"").trim().split(" ")[0];
  const w = h<5 ? "Bonne nuit" : h<12 ? "Bonjour" : h<18 ? "Salut" : "Bonsoir";
  return name ? `${w} ${esc(name)}` : "Aujourd'hui";
}
function statPillsHTML(){
  // résumé de la semaine : trois colonnes de même structure (valeur, libellé, jauge)
  const goal = S.goals.daysPerWeek||3, done = sessionsThisWeek(), si = streakInfo(), streak = si.n;
  const lv = levelInfo();
  return `<div class="stat-pills stagger" style="--i:1">
    <button class="spill ${done>=goal?"full":""}" data-a="tab" data-id="progress" aria-label="${done} séances sur ${goal} cette semaine">
      <span class="sp-v"><b data-count="${done}">${done}</b><i>/${goal}</i></span>
      <span class="sp-l">cette semaine</span>
      <span class="spg"><i style="width:${Math.min(100,Math.round(done/goal*100))}%"></i></span>
    </button>
    <button class="spill ${streak>0?"hot":""}" data-a="tab" data-id="progress" aria-label="${streak} semaines d'affilée${si.recent?", joker utilisé":""}">
      <span class="sp-v"><b data-count="${streak}">${streak}</b><i>sem.</i></span>
      <span class="sp-l">${si.recent ? "joker utilisé" : "d'affilée"}</span>
      <span class="spg spg-dots">${[0,1,2,3,4].map(k=>`<i class="${k<Math.min(streak,5)?"on":""}"></i>`).join("")}</span>
    </button>
    <button class="spill" data-a="tab" data-id="profil" aria-label="Niveau ${lv.level}">
      <span class="sp-v"><i>niv.</i><b>${lv.level}</b></span>
      <span class="sp-l">${Math.round(lv.pct*100)} % vers le ${lv.level+1}</span>
      <span class="spg"><i style="width:${Math.round(lv.pct*100)}%"></i></span>
    </button>
  </div>`;
}
// ---------- prochain cap (réglage Motivation) ----------
// Une seule ligne, la plus proche d'être atteinte : on se motive davantage quand l'arrivée est en vue.
function bestSetEver(exoId, def){
  return memo("bse:"+exoId, ()=>{ let b = null;
    for(const s of S.sessions){ const ex = s.exos.find(e=>e.exoId===exoId); if(!ex) continue;
      for(const st of ex.sets){ if(!st.done || !(st.reps>0)) continue;
        const sc = kgType(def) && st.weight ? estimated1RM(st.weight, st.reps) : st.reps;
        if(!b || sc>b.sc) b = { sc, r:st.reps, w:st.weight||0 }; } }
    return b; });
}
function nextGoal(){
  const goal = S.goals.daysPerWeek||3, done = sessionsThisWeek(), left = goal-done;
  const daysLeft = 7-weekdayIdx(todayISO()) - (sessionsToday().length ? 1 : 0);
  const week = left>0 && left<=daysLeft ? { ic:"target", pct:done/goal, act:'data-a="tab" data-id="progress"',
    t: left===1 ? "Une séance de plus et ta semaine est validée" : `Encore ${nb(left,"séance")} pour valider ta semaine` } : null;
  if(week && left===1) return week;
  // un muscle délaissé : l'indice de force va baisser (ou baisse déjà), comme l'alerte d'une montre de sport
  if(S.settings.trend!==false && typeof detrainAlerts==="function"){ const a = detrainAlerts()[0];
    if(a) return { ic:a.losing ? "warn" : "clock", pct:null, warn:a.losing, act:'data-a="tab" data-id="progress"',
      t: a.losing ? `${a.label} : ${a.m.days} jours sans séance, force estimée −${a.pct} %` : `${a.label} : ${a.m.days} jours sans séance, l'indice baisse dans ${nb(a.left,"jour")}` }; }
  // le record à battre dans la séance prête (composée ou prévue aujourd'hui)
  if(!sessionsToday().length){
    const ids = (S.custom.exos.length ? S.custom.exos : (plannedTemplate()||{exos:[]}).exos).map(e=>e.exoId);
    for(const id of ids){ const def = EXO_MAP[id]; if(!def || isStretch(def) || !kgType(def)) continue;
      const b = bestSetEver(id, def); if(!b || !b.w) continue;
      return { ic:"bolt", pct:null, act:`data-a="showExoInfo" data-id="${id}"`, t:`Record à battre aujourd'hui · ${def.n} : ${b.r} × ${fmtDec(b.w)} kg` }; }
  }
  if(week) return week;
  // un trophée presque gagné (au moins 60 % du chemin vers le palier suivant)
  let best = null;
  if(typeof MEDALS!=="undefined") MEDALS.forEach(m=>{ if(m.secret) return; const p = medalProgress(m);
    if(p.next==null || p.pct<.6 || p.pct>=1) return; if(!best || p.pct>best.p.pct) best = { m, p }; });
  if(best){ const { m, p } = best, rest = p.next - p.v;
    return { ic:"trophy", pct:p.pct, act:`data-a="showMedal" data-id="${m.id}"`,
      t:`${TIERS[p.t+1].n} « ${m.n} » : plus que ${fmtMedalVal(m, rest)} ${medalUnit(m, rest)}` }; }
  const lv = levelInfo(), toGo = lv.next-lv.xp, perSession = 50 + 2*Math.max(10, Math.round(totalSets()/Math.max(1,S.sessions.length)));
  return { ic:"star", pct:lv.pct, act:'data-a="tab" data-id="profil"', t:`Niveau ${lv.level+1} dans ${fmtNum(toGo)} XP, environ ${nb(Math.max(1, Math.ceil(toGo/perSession)), "séance")}` };
}
function nextGoalHTML(){
  if(S.settings.nextGoal===false) return "";
  const g = nextGoal(); if(!g) return "";
  const ring = g.pct==null ? "" : `<span class="gl-ring" style="--p:${Math.round(g.pct*100)}" aria-hidden="true"></span>`;
  return `<button class="goal-line ${g.warn?"warn":""} stagger" style="--i:1" ${g.act}><span class="gl-ic">${ii(g.ic)}</span><span class="gl-t"><small>${g.warn ? "À surveiller" : "Prochain cap"}</small>${esc(g.t)}</span>${ring}</button>`;
}
function heroPicts(ids){
  const defs = ids.map(id=>EXO_MAP[id]).filter(Boolean);
  // chaque pictogramme ouvre la fiche de l'exercice ; « +N » mène à la liste complète
  const more = defs.length>5 ? `<button class="hp-more" data-a="heroShowAll" aria-label="Voir les ${defs.length} exercices">+${defs.length-5}</button>` : "";
  return `<div class="hero-picts">${defs.slice(0,5).map((d,i)=>`<button class="hp" style="--k:${i}" data-a="showExoInfo" data-id="${d.id}" aria-label="${esc(d.n)} : voir la fiche">${exoPicto(d)}</button>`).join("")}${more}</div>`;
}
// Séance du jour déjà faite : une ligne d'état compacte (le détail est à un toucher)
function doneCardHTML(){
  const today = sessionsToday(); if(!today.length) return "";
  const s = today[today.length-1];
  return `<button class="hero done stagger" style="--i:2" data-a="openSessionDetail" data-id="${s.id}" aria-label="Séance du jour faite : ${esc(sessionTitle(s))}, voir le détail">
    <span class="hero-badge">${icon("check")}</span>
    <span class="hd-main"><span class="hero-eyebrow">Séance du jour faite</span>
      <span class="hero-title">${esc(sessionTitle(s))}</span>
      <span class="hero-meta"><span>${fmtDuration(s.durationSec||0)}</span><span>${nb(sessionSetCount(s),"série")}</span><span>${sessionVolume(s) ? fmtKg(sessionVolume(s)) : sessionReps(s)+" reps"}</span></span></span>
    <span class="chev">${icon("chev")}</span>
  </button>`;
}
// La carte principale : d'abord TA séance (composée, prévue ou à composer) ; la proposition
// de l'app n'y apparaît que si on l'a choisie (« Proposée par l'app »). Un seul bouton fort.
function heroKind(mode, draft){
  if(sessionsToday().length) return "done";
  if(mode==="proposal") return draft.exos.length ? "proposal" : "";
  if(S.custom.exos.length) return "custom";
  return plannedTemplate() ? "planned" : "compose";
}
function heroHTML(mode, draft){
  const kind = heroKind(mode, draft);
  if(kind==="done") return doneCardHTML();
  if(kind==="compose"){
    const pend = S.custom.pendingDays && S.custom.pendingDays.length;
    return `<div class="hero compose stagger" style="--i:2">
      <span class="hero-eyebrow">Ma séance</span>
      <span class="hero-title">Compose ta séance</span>
      <span class="hero-sub">${pend ? `Pour le ${pendingDaysLabel()} : choisis tes exercices, puis enregistre-la.` : "Choisis tes exercices : séries, charges et repos sont calculés pour toi."}</span>
      <button class="hero-go" data-a="customAddOpen"><span class="hg-ico">${icon("plus")}</span>Choisir mes exercices</button>
      <button class="hero-alt" data-a="customFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Ou laisse l'app choisir</button>
    </div>`;
  }
  let eyebrow, title, meta, ids, act, extra = "";
  const planned = plannedTemplate();
  if(kind==="planned"){
    eyebrow = "Prévu aujourd'hui"; title = esc(planned.n);
    ids = planned.exos.map(e=>e.exoId);
    meta = [nb(planned.exos.length, "exercice"), nb(planned.exos.reduce((a,e)=>a+e.sets,0), "série"), `≈ ${tplMinutes(planned)} min`];
    act = `data-a="startTemplate" data-id="${planned.id}"`;
  } else if(kind==="custom"){
    eyebrow = planned && S.custom.tplId===planned.id ? "Prévu aujourd'hui" : "Prête à démarrer";
    title = esc(S.custom.name||"Ma séance");
    ids = S.custom.exos.map(e=>e.exoId);
    meta = [nb(ids.length, "exercice"), nb(S.custom.exos.reduce((a,e)=>a+e.sets,0), "série"), `≈ ${estimateMinutes({ exos:S.custom.exos.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) })} min`];
    act = `data-a="startCustom"`;
  } else {
    const t = SESSION_TYPE_MAP[draft.type]||SESSION_TYPES[0], rt = SESSION_TYPE_MAP[draft.resolvedType];
    const lastS = S.sessions[S.sessions.length-1], away = lastS ? daysBetween(lastS.date, todayISO()) : 0;
    eyebrow = draft.source==="imported" ? "Programme importé" : away>=10 ? "Bon retour !" : "Proposée par l'app";
    title = draft.source==="imported" ? esc(draft.name||"Séance importée") : draft.type==="auto" && rt ? rt.n : t.n;
    ids = draft.exos.map(e=>e.exoId);
    meta = [nb(ids.length, "exercice"), nb(draft.exos.reduce((t,e)=>t+e.sets.length,0), "série"), `≈ ${estimateMinutes(draft)} min`];
    act = `data-a="startSession"`;
    extra = `<button class="hero-alt" data-a="startExpress">${icon("timer")} Pas le temps ? Express · 10 min</button>`;
  }
  return `<div class="hero ${kind} stagger" style="--i:2">
    <span class="hero-eyebrow">${eyebrow}</span>
    <span class="hero-title">${title}</span>
    <span class="hero-meta">${meta.map(m=>`<span>${m}</span>`).join("")}</span>
    ${heroPicts(ids)}
    <button class="hero-go" ${act}><span class="hg-ico">${icon("play")}</span>C'est parti</button>
    ${extra}
  </div>`;
}
// Un seul rappel à la fois, en bas de l'accueil : la sauvegarde d'abord, sinon le Rewind du mois écoulé
function nudgeHTML(){
  if(backupDue()) return `<div class="backup-nudge stagger" style="--i:7">${sfIcon("download","green")}<div class="grow"><div class="t">Sauvegarde conseillée</div><div class="s">${S.sessions.length} séances sont stockées uniquement sur ce téléphone.</div></div><div class="bn-act"><button data-a="backupData">Sauvegarder</button><button class="later" data-a="backupLater">Plus tard</button></div></div>`;
  const rk = recapNudgeKey();
  if(rk) return `<div class="backup-nudge rc-nudge stagger" style="--i:7">${sfIcon("sparkles","orange")}<div class="grow"><div class="t">Ton Rewind de ${MOIS_LONG[parseISO(rk+"-01").getMonth()]} est prêt</div><div class="s">Revis ton mois en une minute.</div></div><div class="bn-act"><button data-a="openRewind" data-kind="month" data-key="${rk}">Lancer</button><button class="later" data-a="recapLater">Plus tard</button></div></div>`;
  return "";
}

// ---------- aperçu ----------
function renderTodayPreview(draft){
  const mode = S.settings.todayTab==="proposal" ? "proposal" : "custom";
  return `<div class="navbar"><div class="nb-title">Aujourd'hui</div></div><div class="content home">
    <div class="home-head stagger" style="--i:0">
      <div class="eyebrow">${fmtDate(todayISO(),"long")}</div>
      <h1 class="lt">${greeting()}</h1>
    </div>
    ${statPillsHTML()}
    ${nextGoalHTML()}
    ${whyReminder() && !sessionsToday().length ? `<div class="why-card stagger" style="--i:2"><div class="why-k">${ii("flame")} Ton pourquoi</div><div class="why-t">« ${esc(whyReminder())} »</div><div class="why-s">${daysSinceLastSession()} jours sans séance : une seule suffit pour reprendre le fil.</div><button class="btn secondary sm why-go" data-a="startExpress">${icon("timer")} Séance express · 10 min</button></div>` : ""}
    ${sessionsToday().length ? doneCardHTML() : ""}
    <div class="home-seg stagger" style="--i:2">${segHTML("today", [["custom","Ma séance"],["proposal","Proposée par l'app"]], mode, "todayMode")}</div>
    <div class="seg-pane ${mode} ${paneDir?"from-"+paneDir:""}">${sessionsToday().length ? "" : heroHTML(mode, draft)}${mode==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}</div>
    ${nudgeHTML()}
  </div>`;
}

let paneDir = ""; // sens du glissement quand on change de section
let freshIds = new Set(); // exercices qui viennent d'être ajoutés : animation d'apparition
function exoRowHTML(def, sub, i, actions, app){
  const fresh = freshIds.has(def.id);
  return `<div class="row stagger ${fresh?"fresh":""}" style="--i:${Math.min(i+2,14)}">
    <button class="row-main" data-a="showExoInfo" data-id="${def.id}" aria-label="${esc(def.n)} : voir la fiche">
      <span class="xwrap">${exoIcon(def)}<span class="info-dot" aria-hidden="true">i</span></span>
      <div class="grow"><div class="t">${esc(def.n)}${app?' <span class="app-badge" title="Ajouté par l\'app">'+icon("sparkle")+'</span>':""}</div><div class="s">${sub}</div></div>
    </button>${actions}
  </div>`;
}
function catLabel(def){ const c = EXO_CATS.find(c=>c.id===exoCategory(def)); return c ? c.n : ""; }

function proposalPaneHTML(draft){
  const imported = draft.source==="imported";
  const heroShown = !sessionsToday().length; // sinon la carte principale porte déjà le « C'est parti »
  const typeChips = SESSION_TYPES.map(t=>`<button class="type-chip ${!imported&&draft.type===t.id?"on":""}" data-a="setType" data-v="${t.id}">${t.n}</button>`).join("");
  let hero;
  if(imported){
    hero = `<div class="plan-card stagger" style="--i:1">
      <div class="pc-eyebrow">Programme importé</div>
      <div class="pc-title">${esc(draft.name||"Séance importée")}</div>
      <div class="pc-reason">${S.importedProgram.length} séance${S.importedProgram.length>1?"s":""} en attente dans ton programme.</div>
      <button class="btn ghost sm" style="margin-top:8px;padding:0" data-a="dropImported">Revenir à la suggestion automatique</button>
    </div>`;
  } else {
    const t = SESSION_TYPE_MAP[draft.type]||SESSION_TYPES[0], rt = SESSION_TYPE_MAP[draft.resolvedType];
    const title = draft.type==="auto" && rt ? rt.n : t.n;
    const focus = focusMuscles(draft).slice(0,4);
    hero = heroShown ? (draft.reason ? `<div class="pc-inline stagger" style="--i:5">${esc(draft.reason)}</div>` : "") : `<div class="plan-card stagger" style="--i:5">
      <div class="pc-eyebrow">${draft.type==="auto"?"Choisie pour toi":"Séance proposée"}</div>
      <div class="pc-title">${title}</div>
      ${draft.reason?`<div class="pc-reason">${esc(draft.reason)}</div>`:""}
      ${draft.exos.length?`<div class="pc-meta"><span>${mainExos(draft).length} exercices</span><span>${mainExos(draft).reduce((t,e)=>t+e.sets.length,0)} séries</span><span>≈ ${estimateMinutes(draft)} min</span></div>
      <div class="pc-muscles">${focus.map(m=>`<span>${MUSCLE_MAP[m].n}</span>`).join("")}</div>`:""}
    </div>`;
  }
  if(!draft.exos.length){
    return `<div class="type-scroll">${typeChips}</div>${hero}
      <div class="empty-state"><span class="em">${sfIcon("toolbox","gray","lg")}</span>Pas d'exercice disponible pour ce type de séance avec ton matériel.<br>Essaie un autre type, ou complète ton matériel dans l'onglet Profil.</div>`;
  }
  // exercices de force, puis (si le réglage est actif) le bloc d'étirements dans sa propre section
  const doseOf = ex=>{ const def = EXO_MAP[ex.exoId];
    return isStretch(def) ? `${repsLabel(ex.targetReps)} s${def.uni ? " · chaque côté" : ""}` : `${ex.targetSets} × ${repsLabel(ex.targetReps)}${ex.sets[0]&&ex.sets[0].weight?" · "+fmtLoad(def, ex.sets[0].weight):""}`; };
  const rowOf = (ex,i)=>exoRowHTML(EXO_MAP[ex.exoId], doseOf(ex), i,
    `<button class="icon-btn" aria-label="Remplacer" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
     <button class="icon-btn" aria-label="Retirer" data-a="removeExo" data-idx="${i}">${icon("close")}</button>`);
  const main = mainExos(draft), mainN = main.length;
  const rows = draft.exos.map((ex,i)=>isStretchEntry(ex) ? "" : rowOf(ex,i)).join("");
  const coolRows = draft.exos.map((ex,i)=>isStretchEntry(ex) ? rowOf(ex,i) : "").join("");
  freshIds = new Set();
  return `<div class="type-scroll">${typeChips}</div>
    ${hero}
    <div class="exo-count">
      <div class="ec-t"><b>${mainN}</b> exercice${mainN>1?"s":""} · ${main.reduce((t,e)=>t+e.sets.length,0)} séries · ≈ ${estimateMinutes(draft)} min</div>
      <div class="mini-step"><button aria-label="Un exercice de moins" data-a="draftCount" data-d="-1" ${mainN<=1?"disabled":""}>−</button><span>${mainN}</span><button aria-label="Un exercice de plus" data-a="draftCount" data-d="1" ${draft.exos.length>=10?"disabled":""}>+</button></div>
    </div>
    ${!imported && mainN < Math.min(sessionSize(), draft.resolvedType==="core"?5:10) ? `<div class="ec-limit">Ton matériel limite ce type de séance à ${mainN} exercice${mainN>1?"s":""}. Le « + » ajoute un exercice d'un autre groupe.</div>` : ""}
    <div class="group" style="margin-top:8px">${rows}</div>
    ${coolRows ? `<div class="cool-h">${ii("leaf")}<span>Étirements · retour au calme</span></div><div class="group cool-group">${coolRows}</div>` : ""}
    <div class="btnrow">
      <button class="btn tertiary sm" data-a="addExoOpen">${icon("plus")} Ajouter</button>
      ${imported?"":`<button class="btn tertiary sm" data-a="regenSession">${icon("repeat")} Autre proposition</button>`}
    </div>
    ${heroShown ? "" : `<div class="btnrow"><button class="btn big" data-a="startSession">${icon("play")} Commencer cette séance</button></div>`}`;
}

// ---------- séances enregistrées & planning ----------
function uiState(){ return S.settings.ui || (S.settings.ui = { planOpen:true, tplOpen:true }); }
let openTpls = new Set();   // séances enregistrées dépliées
let showAllTpls = false;
let reorderMode = false;

function tplRegion(t){
  const c = {};
  t.exos.forEach(e=>{ const d=EXO_MAP[e.exoId]; if(d) c[regionOf(d)]=(c[regionOf(d)]||0)+e.sets; });
  return Object.keys(c).sort((a,b)=>c[b]-c[a])[0] || "core";
}
function tplMinutes(t){ return estimateMinutes({ exos:t.exos.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) }); }
function daysLabel(days){ return days.slice().sort().map(d=>JOURS_COURTS[d]).join(" · "); }
// prochaine séance planifiée après aujourd'hui (sur 7 jours)
function nextPlanned(){
  for(let k=1;k<=7;k++){
    const iso = addDaysISO(todayISO(), k), t = plannedTemplate(iso);
    if(t) return { iso, t, k };
  }
  return null;
}

function sectionHead(title, key, extra){
  const open = uiState()[key];
  return `<button class="sec-h" data-a="toggleSection" data-k="${key}" aria-expanded="${open}">
    <span>${title}</span>${extra||""}<span class="sec-chev ${open?"open":""}">${icon("chev")}</span>
  </button>`;
}

function weekPlanBodyHTML(){
  const today = todayISO(), monday = weekKey(today);
  const doneDays = new Set(S.sessions.map(s=>s.date));
  return `<div class="wp-days">${JOURS_COURTS.map((j,i)=>{
      const iso = addDaysISO(monday,i);
      const t = S.templates.find(t=>(t.days||[]).includes(i));
      // « manquée » seulement si la séance était déjà prévue ce jour-là (pas pour un programme créé après)
      const done = doneDays.has(iso), missed = t && iso<today && !done && (!t.since || iso>=t.since);
      return `<button class="wp-day ${iso===today?"today":""} ${t?"has r-"+tplRegion(t):""} ${done?"done":""} ${missed?"missed":""}" style="--k:${i}" data-a="planDay" data-d="${i}" aria-label="${JOURS[(i+1)%7]} ${parseISO(iso).getDate()} : ${t?esc(t.n):"rien de prévu"}${done?", séance faite":""}${missed?", séance manquée":""}">
        <span class="wp-j">${j}</span><span class="wp-n">${parseISO(iso).getDate()}</span>
        <span class="wp-t">${t?esc(t.n):"—"}</span>
        ${done?`<span class="wp-check">${icon("check")}</span>`:missed?`<span class="wp-miss" title="Séance prévue non faite"></span>`:""}
      </button>`;
    }).join("")}</div>
    <div class="wp-foot">${S.templates.length ? "Touche un jour pour y placer une séance enregistrée." : "Enregistre une séance, puis place-la sur un ou plusieurs jours."}</div>
    ${S.templates.length ? `<button class="tpl-add wp-wizard" data-a="weekWizard"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg><span>Programme de la semaine</span></button>` : ""}`;
}
function weekPlanHTML(){
  const nxt = nextPlanned();
  const open = uiState().planOpen;
  const todayT = plannedTemplate();
  const summary = todayT ? `Aujourd'hui : ${esc(todayT.n)}` : nxt ? `Prochaine : ${JOURS_COURTS[weekdayIdx(nxt.iso)].toLowerCase()}. · ${esc(nxt.t.n)}` : (S.templates.length ? "Aucun jour planifié" : "");
  return `<div class="week-plan stagger" style="--i:6">
    ${sectionHead(`${icon("clock")}<span>Ma semaine</span>`, "planOpen", summary?`<span class="sec-sum">${summary}</span>`:"")}
    <div class="clp">${open ? weekPlanBodyHTML() : ""}</div>
  </div>`;
}

function tplCardHTML(t, i){
  const open = openTpls.has(t.id), region = tplRegion(t), loaded = S.custom.tplId===t.id;
  const sets = t.exos.reduce((a,e)=>a+e.sets,0);
  const list = open ? tplBodyHTML(t) : "";
  return `<div class="tpl-card2 r-${region} ${open?"open":""} ${loaded?"loaded":""} stagger" data-id="${t.id}" style="--i:${Math.min(i+1,10)}">
    <button class="tc-head" data-a="toggleTpl" data-id="${t.id}" aria-expanded="${open}">
      <span class="tc-bar"></span>
      <span class="tc-main">
        <span class="tc-name">${esc(t.n)}${loaded?' <span class="tc-tag">chargée</span>':""}</span>
        <span class="tc-meta">${t.exos.length} exercice${t.exos.length>1?"s":""} · ${sets} séries · ≈ ${tplMinutes(t)} min</span>
        <span class="tc-days">${(t.days||[]).length ? (t.days||[]).slice().sort().map(d=>`<span>${JOURS_COURTS[d]}</span>`).join("") : `<em>pas de jour fixe</em>`}</span>
      </span>
      <span class="tc-picts">${t.exos.slice(0,3).map(e=>EXO_MAP[e.exoId]?exoIcon(EXO_MAP[e.exoId],"xs"):"").join("")}</span>
      <span class="sec-chev ${open?"open":""}">${icon("chev")}</span>
    </button>
    <div class="clp">${list}</div>
  </div>`;
}
function tplBodyHTML(t){
  return `<div class="tc-list">${t.exos.map(e=>{ const d=EXO_MAP[e.exoId]; return d?`<button class="tc-exo" data-a="showExoInfo" data-id="${d.id}">${exoIcon(d,"sm")}<span class="tc-n">${esc(d.n)}</span><span class="tc-s">${e.sets}×</span></button>`:""; }).join("")}</div>
    <div class="tc-actions">
      <button class="btn sm" data-a="startTemplate" data-id="${t.id}">${icon("play")} Commencer</button>
      <button class="btn secondary sm" data-a="tplOpenEditor" data-id="${t.id}">${icon("edit")} Modifier</button>
      <button class="btn secondary sm icon-only" aria-label="Plus d'options" data-a="templateMenu" data-id="${t.id}">•••</button>
    </div>`;
}

function tplListHTML(){
  const list = showAllTpls ? S.templates : S.templates.slice(0,3);
  const hidden = S.templates.length - list.length;
  return `<div class="tpl-list">${list.map(tplCardHTML).join("")}</div>
      ${hidden>0 ? `<button class="show-more" data-a="tplShowAll">Afficher les ${hidden} autre${hidden>1?"s":""} ${icon("chev")}</button>`
        : S.templates.length>3 ? `<button class="show-more up" data-a="tplShowAll">Afficher moins ${icon("chev")}</button>` : ""}`;
}
function templatesHTML(){
  if(!S.templates.length){
    return `<div class="tpl-section stagger" style="--i:5">
      <div class="tpl-empty">
        <div class="te-ico">${sfIcon("calPlan","red","lg")}</div>
        <div class="te-t">Tes séances de la semaine</div>
        <div class="te-s">Compose une séance ci-dessus, puis enregistre-la et choisis ses jours : elle s'affichera toute seule le jour venu.</div>
        <button class="btn secondary sm" data-a="weekWizard"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Programme de la semaine</button>
      </div>
    </div>`;
  }
  const open = uiState().tplOpen;
  return `<div class="tpl-section stagger" style="--i:5">
    <div class="sec-row">
      ${sectionHead(`${icon("bookmark")}<span>Mes séances</span><span class="sec-count">${S.templates.length}</span>`, "tplOpen")}
    </div>
    <div class="clp">${open ? tplListHTML() : ""}</div>
  </div>`;
}

// Enregistrer ou non la séance composée : enregistrée, elle rejoint « Mes séances » et, avec des jours, le planning
function pendingDaysLabel(){ return (S.custom.pendingDays||[]).slice().sort().map(d=>JOURS[(d+1)%7]).join(", "); }
function saveRowHTML(){
  const t = S.custom.tplId && S.templates.find(x=>x.id===S.custom.tplId);
  if(t){
    const same = JSON.stringify(t.exos.map(e=>[e.exoId,e.sets]))===JSON.stringify(S.custom.exos.map(e=>[e.exoId,e.sets]));
    return `<button class="save-row saved" data-a="saveTemplateOpen">${sfIcon("bookmarkG","indigo")}<span class="grow"><span class="t">Enregistrée dans Mes séances</span>
      <span class="s">${same ? ((t.days||[]).length ? "Planifiée : "+daysLabel(t.days) : "Aucun jour planifié") : "Modifiée : touche pour mettre à jour"}</span></span><span class="chev">${icon("chev")}</span></button>`;
  }
  const pend = S.custom.pendingDays && S.custom.pendingDays.length;
  return `<button class="save-row" data-a="saveTemplateOpen">${sfIcon("bookmarkG","indigo")}<span class="grow"><span class="t">${pend?`Enregistrer pour le ${pendingDaysLabel()}`:"Enregistrer cette séance"}</span>
    <span class="s">Facultatif : pour la retrouver et la placer dans ton planning</span></span><span class="chev">${icon("chev")}</span></button>`;
}
function customPaneHTML(){
  const c = S.custom.exos;
  const tail = weekPlanHTML() + templatesHTML();
  const done = sessionsToday().length;
  if(!c.length){
    // la carte « Compose ta séance » est la carte principale ; ici seulement si une autre l'occupe
    if(!done && !plannedTemplate()) return tail;
    const pend = S.custom.pendingDays && S.custom.pendingDays.length;
    return `<div class="builder-empty stagger" style="--i:4">
      <div class="be-row"><div class="be-ico">${sfIcon("pencil","orange","lg")}</div>
      <div><div class="be-t">${pend ? "Compose ta séance" : done ? "Encore une séance ?" : "Autre chose en tête ?"}</div>
      <div class="be-s">${pend ? `Pour le ${pendingDaysLabel()} : choisis tes exercices, puis enregistre-la.` : "Choisis tes exercices ou laisse l'app te proposer une base."}</div></div></div>
      <div class="be-actions">
        <button class="btn secondary sm" data-a="customAddOpen">${icon("plus")} Choisir</button>
        <button class="btn tertiary sm" data-a="customFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> L'app choisit</button>
      </div>
    </div>${tail}`;
  }
  const rows = c.map((e,i)=>{
    const def = EXO_MAP[e.exoId]; if(!def) return "";
    const actions = reorderMode
      ? `<div class="mini-step order"><button aria-label="Monter" data-a="customMove" data-idx="${i}" data-d="-1" ${i===0?"disabled":""}>↑</button><button aria-label="Descendre" data-a="customMove" data-idx="${i}" data-d="1" ${i===c.length-1?"disabled":""}>↓</button></div>`
      : `<div class="mini-step">
        <button aria-label="Moins de séries" data-a="customSets" data-idx="${i}" data-d="-1">−</button><span>${e.sets}×</span><button aria-label="Plus de séries" data-a="customSets" data-idx="${i}" data-d="1">+</button>
      </div>
      <button class="icon-btn" aria-label="Retirer" data-a="customRemove" data-idx="${i}">${icon("close")}</button>`;
    return exoRowHTML(def, `${catLabel(def)} · ${MUSCLE_MAP[def.muscles[0]].n}`, i, actions, e.app);
  }).join("");
  freshIds = new Set();
  // la carte principale montre déjà nom, durée et « C'est parti » : ici, seulement la liste à éditer
  const inHero = !done;
  const sets = c.reduce((t,e)=>t+e.sets,0);
  const preview = { exos: c.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) };
  return `<h2 class="sh"><span class="sh-t">${inHero ? "Exercices" : esc(S.custom.name||"Ma séance")}</span><span class="sh-actions">${reorderMode?`<button class="more danger" data-a="customClear">Vider</button><button class="more strong" data-a="toggleReorder">OK</button>`:`<button class="more" data-a="toggleReorder">Modifier</button>`}</span></h2>
    ${inHero ? "" : `<div class="sh-sub">${nb(c.length, "exercice")} · ${nb(sets, "série")} · ≈ ${estimateMinutes(preview)} min</div>`}
    <div class="group builder ${reorderMode?"reorder":""}">${rows}</div>
    <div class="btnrow">
      <button class="btn tertiary sm" data-a="customAddOpen">${icon("plus")} Ajouter</button>
      <button class="btn tertiary sm" data-a="customFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Compléter</button>
    </div>
    ${saveRowHTML()}
    ${inHero ? "" : `<div class="btnrow"><button class="btn big" data-a="startCustom">${icon("play")} Commencer ma séance</button></div>`}
    ${tail}`;
}

// ---------- sélecteur d'exercices (recherche, filtre musculaire, multi-sélection) ----------
let picker = null;
function openPicker(opts){
  picker = Object.assign({ multi:false, selected:[], exclude:new Set(), q:"", muscle:null, cat:null }, opts);
  renderPickerSheet();
}
function renderPickerSheet(){
  const owned = new Set(availableExos().map(exoCategory));
  const favN = S.prefs.included.filter(id=>EXO_MAP[id] && !EXO_RETIRED.has(id)).length;
  const cats = [["","Tout le matériel"]].concat(favN ? [["fav","Favoris"]] : []).concat(EXO_CATS.filter(c=>owned.has(c.id)).map(c=>[c.id, c.n])).map(([id,n])=>`<button class="chip cat ${id==="fav"?"fav":""} ${(picker.cat||"")===id?"on":""}" data-a="pickerCat" data-v="${id}">${id==="fav"?ii("star"):""}${esc(n)}</button>`).join("");
  const chips = [["","Tous les muscles"]].concat(MUSCLES.map(m=>[m.id,m.n])).map(([id,n])=>`<button class="chip ${(picker.muscle||"")===id?"on":""}" data-a="pickerMuscle" data-v="${id}">${esc(n)}</button>`).join("");
  openSheet(`<div class="sheet-hd">${picker.onCancel?`<button class="te-cancel" data-a="pickerCancel">${icon("chev")}<span>Retour</span></button>`:""}<span class="t">${esc(picker.title)}</span>${picker.onCancel?`<span class="te-spacer"></span>`:`<button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button>`}</div>
    <div class="picker-top">
      <label class="search">${icon("search")}<input id="pickerSearch" type="search" placeholder="Rechercher un exercice" autocomplete="off"></label>
      <div class="chip-scroll" id="pickerCats">${cats}</div>
      <div class="chip-scroll" id="pickerChips" style="margin-top:8px">${chips}</div>
    </div>
    <div class="sheet-body" id="pickerList">${pickerListHTML()}</div>`,
    { tall:true, footer: picker.multi ? `<button class="btn" id="pickerDone" data-a="pickerDone" disabled>Ajouter</button>` : null,
      restore:renderPickerSheet, onBack:picker.onCancel || null });
  const inp = qs("#pickerSearch");
  // recherche : une seule reconstruction de la liste par image, même en tapant vite
  let pending = 0;
  if(inp){ inp.value = picker.q; inp.addEventListener("input", ()=>{ picker.q = inp.value; if(pending) return;
    pending = requestAnimationFrame(()=>{ pending = 0; const l = qs("#pickerList"); if(l && picker) l.innerHTML = pickerListHTML(); }); }); }
  // retour depuis une fiche : on retrouve la liste là où on l'avait laissée
  const list = qs("#pickerList"); if(list && picker.scroll) list.scrollTop = picker.scroll;
  refreshPickerFooter();
}
renderPickerSheet.isPicker = true;
// d'où la fiche d'un exercice a été ouverte : c'est là que « Ajouter » doit agir
function infoContext(){
  if(picker && sheetStack.some(f=>f && f.isPicker)) return "picker";
  if(S.draft && S.draft.startedAt) return "live";
  if(S.settings.todayTab==="proposal" && S.draft && currentTab==="today") return "proposal";
  return "custom";
}
function infoAddButton(id, small){
  const ctx = infoContext(), cls = small ? "chip" : "btn";
  if(ctx==="picker"){
    if(picker.exclude && picker.exclude.has(id)) return small ? "" : `<button class="btn tertiary" disabled>Déjà dans la séance</button>`;
    if(!picker.multi) return `<button class="${cls}" data-a="infoAdd" data-id="${id}">${small?"Choisir":"Choisir cet exercice"}</button>`;
    const on = picker.selected.includes(id);
    return `<button class="${cls} ${on&&!small?"tertiary":""}" data-a="infoAdd" data-id="${id}">${on?(small?"Retirer":"Retirer de la sélection"):(small?"+ Ajouter":"Ajouter à la sélection")}</button>`;
  }
  const list = ctx==="custom" ? S.custom.exos : S.draft.exos;
  if(list.some(x=>x.exoId===id)) return small ? "" : `<button class="btn tertiary" disabled>${ctx==="custom"?"Déjà dans Ma séance":"Déjà dans la séance"}</button>`;
  const lbl = ctx==="live" ? "Ajouter à la séance en cours" : ctx==="proposal" ? "Ajouter à la séance proposée" : "Ajouter à Ma séance";
  return `<button class="${cls}" data-a="infoAdd" data-id="${id}">${small?"+ Ajouter":lbl}</button>`;
}
// dose conseillée selon l'objectif : « 3 × 8–12 » ou « 3 × 20–45 s »
function exoDose(e){ const [a,b] = repRangeForGoal(e); return `${e.sets} × ${a}–${b}${isTimed(e) ? " s" : " reps"}`; }
function pickerListHTML(){
  const q = normName(picker.q);
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  const favOnly = picker.cat==="fav";
  const pool = availableExos().filter(e=>!picker.exclude.has(e.id)
    && (!picker.muscle || e.muscles.includes(picker.muscle))
    && (!picker.cat || (favOnly ? isIncluded(e.id) : exoCategory(e)===picker.cat))
    && (!q || normName(e.n+" "+(EXO_ALIAS[e.id]||"")).includes(q) || e.muscles.some(m=>normName(MUSCLE_MAP[m].n).includes(q))));
  if(!pool.length) return `<div class="empty-state"><span class="em">${sfIcon("search","gray","lg")}</span>Aucun exercice ne correspond.</div>`;
  // favoris en tête (sans recherche ni filtre de matériel) : ils restent aussi dans leur catégorie
  const favs = favOnly || picker.cat ? [] : pool.filter(e=>isIncluded(e.id)).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
  const favBlock = favs.length ? `<div class="pick-h fav">${sfIcon("star","yellow","sm")} Favoris <span class="pick-n">${favs.length}</span></div><div class="group">${favs.map(e=>pickRowHTML(e)).join("")}</div>` : "";
  return favBlock + EXO_CATS.map(c=>{
    const list = pool.filter(e=>exoCategory(e)===c.id).sort((a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr"));
    if(!list.length) return "";
    let lastM = null;
    return `<div class="pick-h">${sfIcon(EQUIP_GLYPH[c.id]||"wrench", EQUIP_COLOR[c.id]||"gray","sm")} ${esc(c.n)} <span class="pick-n">${list.length}</span></div><div class="group">${list.map(e=>{
      const m = e.muscles[0], sub = m!==lastM ? `<div class="pick-m">${esc(MUSCLE_MAP[m].n)}</div>` : ""; lastM = m;
      return sub + pickRowHTML(e);
    }).join("")}</div>`;
  }).join("");
}
function pickRowHTML(e){
  const on = picker.selected.includes(e.id), fav = isIncluded(e.id);
  return `<div class="row pick-row ${on?"on":""}" data-id="${e.id}">
    <button class="row-main" data-a="pickerTap" data-id="${e.id}">
      ${exoIcon(e)}
      <div class="grow"><div class="t">${fav?`<span class="fav-mark" aria-label="Favori">${ii("star")}</span>`:""}${esc(e.n)}</div><div class="s"><b class="dose">${exoDose(e)}</b> · ${musclesLabel(e)}</div></div>
    </button>
    <button class="info-btn" aria-label="Fiche de ${esc(e.n)}" data-a="pickerInfo" data-id="${e.id}">i</button>
    ${picker.multi?`<button class="pick-check" aria-label="Sélectionner" data-a="pickerTap" data-id="${e.id}">${on?icon("check"):""}</button>`:""}
  </div>`;
}
function refreshPickerFooter(){
  const b = qs("#pickerDone"); if(!b) return;
  const n = picker.selected.length;
  b.disabled = !n;
  b.textContent = n ? `Ajouter ${n} exercice${n>1?"s":""}` : "Ajouter";
}

// ---------- séance en cours ----------
function renderTodayLive(draft){
  const nav = `<div class="navbar live-nav"><div class="nb-left"><button class="icon-btn" aria-label="Abandonner la séance" data-a="abandonSession">${icon("close")}</button></div><div class="nb-title">${esc(liveName(draft))}</div><div class="nb-right"><button class="nb-done" data-a="finishSession">Terminer</button></div></div>`;
  if(!draft.exos.length){
    return `${nav}<div class="content"><div class="empty-state"><span class="em">${sfIcon("toolbox","gray","lg")}</span>Tous les exercices ont été retirés.<br>Ajoute-en un pour continuer.</div>
    <div class="btnrow"><button class="btn" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button></div></div>`;
  }
  return `${nav}
  <div class="content live">
    <div class="live-head" id="liveHead">${liveHeadHTML(draft)}</div>
    <div class="live-strip" id="liveStrip">${liveStripHTML(draft)}</div>
    <div id="focusRegion">${renderFocusRegionInner(draft)}</div>
  </div>`;
}
function liveName(draft){ return draft.name || (draft.source==="custom" ? "Ma séance" : (SESSION_TYPE_MAP[draft.resolvedType||draft.type]||{}).n || "Séance"); }
function liveCounts(draft){
  const total = draft.exos.reduce((t,e)=>t+e.sets.length,0);
  const done = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
  return { total, done, left: total-done, exosLeft: draft.exos.filter(e=>e.sets.some(s=>!s.done)).length };
}
function fmtClock(sec){
  const h = Math.floor(sec/3600), m = Math.floor(sec/60)%60, x = sec%60;
  return (h ? h+":"+String(m).padStart(2,"0") : m) + ":" + String(x).padStart(2,"0");
}
function elapsedSec(draft){ return Math.max(0, Math.round((Date.now()-Date.parse(draft.startedAt))/1000)); }
function liveHeadHTML(draft){
  const c = liveCounts(draft), pct = c.total ? c.done/c.total : 0;
  const segs = draft.exos.map((e,i)=>{
    const d = e.sets.filter(s=>s.done).length, n = e.sets.length;
    return `<span class="lp-seg ${i===liveFocusIdx?"current":""} ${d===n?"full":""}" style="flex:${n}"><i style="width:${Math.round(d/n*100)}%"></i></span>`;
  }).join("");
  return `<div class="lh-row">
      <div class="lh-clock"><span id="liveClock">${fmtClock(elapsedSec(draft))}</span><small>${esc(liveName(draft))}</small></div>
      <div class="lh-pct"><b>${Math.round(pct*100)}<span>%</span></b><small>${c.left ? `${c.left} série${c.left>1?"s":""} à faire` : "tout est fait"}</small></div>
    </div>
    <div class="lp-bar" aria-label="${c.done} séries sur ${c.total}">${segs}</div>`;
}
function liveStripHTML(draft){
  const idx = Math.min(liveFocusIdx, draft.exos.length-1);
  const chips = draft.exos.map((e,i)=>{
    const def = EXO_MAP[e.exoId], n = e.sets.length, d = e.sets.filter(s=>s.done).length;
    const allDone = !draft.exos.some(x=>x.sets.some(s=>!s.done));
    const cls = (i===idx && !allDone ? "current" : "") + (d===n ? " done" : d ? " started" : " todo") + (i===stripBump ? " bump" : "");
    return `<button class="ls-chip ${cls}" data-a="focusJump" data-idx="${i}" aria-label="${esc(def.n)} : ${d===n?"terminé":`${d} sur ${n} séries`}">
      <span class="ls-ring r-${regionOf(def)}" style="--p:${Math.round(d/n*100)}"><span>${d===n?icon("check"):exoPicto(def)}</span></span>
      <span class="ls-name">${esc(def.n)}</span>
      <span class="ls-sets">${d}/${n}</span>
    </button>`;
  }).join("");
  return `<div class="ls-chips" id="lsChips">${chips}</div>`;
}
// prochain exercice qui reste à faire après « from » (en bouclant), ou -1
function exoFinished0(ex){ return ex.sets.every(s=>s.done); }
// après un repos : en mode circuit (réglage par défaut) on passe à l'exercice suivant qui
// reste à faire ; en mode classique on reste sur l'exercice tant qu'il a des séries.
function circuitMode(){ return S.settings.flow!=="classic"; }
function restTarget(idx, arrived){
  if(!S.draft || idx==null || !S.draft.exos[idx]) return -1;
  const ex = S.draft.exos[idx], left = ex.sets.some(s=>!s.done);
  if(arrived) return left ? idx : nextUndone(idx);
  if(circuitMode()) return nextUndone(idx);
  return left ? idx : nextUndone(idx);
}
function restAdvance(idx, arrived){
  if(!S.draft || !S.draft.startedAt) return;
  const t = restTarget(idx, arrived);
  if(t<0) return;
  if(t!==liveFocusIdx){ focusAnimDir = t>liveFocusIdx || (liveFocusIdx===S.draft.exos.length-1 && t===0) ? "r" : "l"; liveFocusIdx = t; }
  const v = qs("#v-today"); if(v && currentTab==="today" && v.scrollTop>120) v.scrollTo({ top:0, behavior:"smooth" });
}
function nextUndone(from){
  const ex = S.draft.exos, n = ex.length;
  for(let k=1;k<=n;k++){ const i = (from+k)%n; if(ex[i].sets.some(s=>!s.done)) return i; }
  return -1;
}
function centerStripChip(smooth){
  const strip = qs("#lsChips"), c = strip && qs(".ls-chip.current", strip);
  if(!c) return;
  strip.scrollTo({ left: c.offsetLeft - strip.clientWidth/2 + c.offsetWidth/2, behavior: smooth?"smooth":"auto" });
}
// chronomètre de séance : une seule mise à jour du texte par seconde
setInterval(()=>{
  const c = document.getElementById("liveClock");
  if(c && S.draft && S.draft.startedAt) c.textContent = fmtClock(elapsedSec(S.draft));
}, 1000);

function ringSVG(remain, total){
  const r=76, c=2*Math.PI*r;
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  return `<div class="ring-wrap"><svg viewBox="0 0 172 172">
    <circle class="ring-bg" cx="86" cy="86" r="${r}"/>
    <circle class="ring-fg" id="ringFg" cx="86" cy="86" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c*(1-frac)).toFixed(1)}"/>
  </svg><div class="ring-label"><div class="ring-time" id="ringTime">${fmtMMSS(Math.max(0,remain))}</div><div class="ring-sub">restant</div></div></div>`;
}
function updateFocusRing(remain, total){
  const t = qs("#ringTime"), fg = qs("#ringFg");
  if(!t || !fg) return;
  t.textContent = fmtMMSS(Math.max(0,remain));
  const c = 2*Math.PI*76, frac = total>0 ? Math.max(0,remain)/total : 0;
  fg.setAttribute("stroke-dashoffset", (c*(1-frac)).toFixed(1));
}

function renderFocusRegionInner(draft){
  const idx = Math.min(liveFocusIdx, draft.exos.length-1);
  liveFocusIdx = idx;
  const ex = draft.exos[idx], def = EXO_MAP[ex.exoId];
  const c = liveCounts(draft);
  if(!c.left) return sessionCompleteHTML(draft);
  const nav = `<div class="focus-nav">
    <button class="navbtn" aria-label="Exercice précédent" data-a="focusPrev" ${draft.exos.length<2?"disabled":""} style="transform:scaleX(-1)">${icon("chev")}</button>
    <button class="center-link" data-a="openOverview"><span><b>${idx+1}</b> sur ${draft.exos.length}</span><small>Tout voir</small></button>
    <button class="navbtn" aria-label="Exercice suivant" data-a="focusNext" ${draft.exos.length<2?"disabled":""}>${icon("chev")}</button>
  </div>`;
  const firstTime = idx===0 && c.done===0;
  return `${renderFocusCard(idx, ex, def)}${upNextHTML(idx)}${nav}${firstTime?`<div class="swipe-hint">Glisse la carte ou touche le bandeau pour changer d'exercice</div>`:""}`;
}
function upNextHTML(idx){
  const ex = S.draft.exos[idx];
  const curDone = ex.sets.every(s=>s.done);
  const ni = nextUndone(idx);
  if(ni<0 || (ni===idx)) return curDone || ni<0 ? "" : `<div class="up-next last"><span class="un-flag">${sfIcon("flag","green")}</span><div class="grow"><div class="un-k">Dernier exercice</div><div class="un-t">Plus que celui-ci, tu y es presque !</div></div></div>`;
  if(curDone) return ""; // le bouton « Exercice suivant » de la carte fait déjà le travail
  const e = S.draft.exos[ni], def = EXO_MAP[e.exoId], left = e.sets.filter(s=>!s.done).length;
  return `<button class="up-next r-${regionOf(def)}" data-a="focusJump" data-idx="${ni}">
    ${exoIcon(def,"sm")}
    <div class="grow"><div class="un-k">À suivre</div><div class="un-t">${esc(def.n)}</div></div>
    <span class="un-s">${left} série${left>1?"s":""}</span>${icon("chev")}
  </button>`;
}
let completeShown = false; // la fête « séance complète » ne se joue qu'une fois
function sessionCompleteHTML(draft){
  const c = liveCounts(draft), vol = draft.exos.reduce((t,e)=>t+e.sets.reduce((a,s)=>a+(s.done&&s.weight?s.weight*(s.reps||0):0),0),0);
  const prs = draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.pr).length,0);
  const fresh = !completeShown; completeShown = true;
  if(fresh) setTimeout(()=>{ const b = qs(".complete-card .cc-trophy"); if(b){ const r = b.getBoundingClientRect(); confettiBurst(r.left+r.width/2, r.top+r.height/2, 90); haptic([30,50,30,50,60]); } }, 250);
  return `<div class="complete-card ${fresh?"fresh":""}">
    <div class="cc-rays" aria-hidden="true"></div>
    <div class="cc-trophy">${medalHTML({ cat:"regular", g:"cup", c:"orange" }, 3)}</div>
    <div class="cc-title">Séance complète !</div>
    <div class="cc-sub">Toutes les séries sont validées. Bravo.</div>
    <div class="cc-stats">
      <div><b>${c.done}</b><small>séries</small></div>
      <div><b>${fmtClock(elapsedSec(draft))}</b><small>durée</small></div>
      <div><b>${vol ? fmtNum(Math.round(vol)) : draft.exos.length}</b><small>${vol ? "kg soulevés" : "exercices"}</small></div>
      ${prs?`<div><b>${prs}</b><small>record${prs>1?"s":""}</small></div>`:""}
    </div>
    <button class="btn big" data-a="finishSession">${icon("check")} Enregistrer la séance</button>
    <button class="btn ghost sm" style="margin-top:6px" data-a="addExoOpen">${icon("plus")} Ajouter un exercice</button>
  </div>`;
}

// ---------- chronomètre des exercices en secondes (planche, chaise, suspension…) ----------
// 3-2-1 de préparation, puis décompte de la durée visée ; à zéro la série est validée
// toute seule (mains libres). « Arrêter » valide avec le temps réellement tenu.
let hold = null, holdTimer = null;
const HOLD_R = 76, HOLD_C = 2*Math.PI*HOLD_R;
function holdCardHTML(idx, ex, def, si, header, animClass, setDots){
  const prep = hold.phase==="prep";
  const left = prep ? 3 : Math.max(0, Math.ceil(hold.target - (Date.now()-hold.t0)/1000));
  return `<div class="focus-card holding r-${regionOf(def)} ${animClass}">${header}
    <div class="fc-phase">${prep?"Mets-toi en position":"Tiens bon !"} · série ${si+1} / ${ex.sets.length}</div>
    ${setDots(si)}
    <div class="ring-wrap hold-wrap ${prep?"prep":""}"><svg viewBox="0 0 172 172">
      <circle class="ring-bg" cx="86" cy="86" r="${HOLD_R}"/>
      <circle class="ring-fg" id="holdFg" cx="86" cy="86" r="${HOLD_R}" stroke-dasharray="${HOLD_C.toFixed(1)}" stroke-dashoffset="${prep?HOLD_C.toFixed(1):"0"}"/>
    </svg><div class="ring-label"><div class="ring-time" id="holdTime">${prep?left:fmtMMSS(left)}</div><div class="ring-sub" id="holdSub">${prep?"prêt…":`sur ${hold.target} s`}</div></div></div>
    <div class="hold-actions">
      <button class="btn big validate hold-stop" data-a="holdStop">${icon("check")} ${prep?"Annuler":"Arrêter et valider"}</button>
    </div>
  </div>`;
}
function holdTick(){
  if(!hold || !S.draft || !S.draft.startedAt || !S.draft.exos[hold.exi]){ clearInterval(holdTimer); hold = null; return; }
  const now = Date.now();   // horloge murale : juste même après un verrouillage de l'écran
  if(hold.phase==="prep"){
    const left = 3 - Math.floor((now-hold.t0)/1000);
    if(left<=0){ hold.phase = "hold"; hold.t0 = now; sfx("count"); haptic(35); refreshFocusRegion(); return; }
    if(left!==hold.lastTick){ hold.lastTick = left; sfx("restTick"); const t = qs("#holdTime"); if(t){ t.textContent = left; t.classList.remove("tick"); void t.offsetWidth; t.classList.add("tick"); } }
    return;
  }
  const el = (now-hold.t0)/1000, remain = Math.max(0, hold.target-el);
  const t = qs("#holdTime"), fg = qs("#holdFg");
  if(t) t.textContent = fmtMMSS(Math.ceil(remain));
  if(fg) fg.setAttribute("stroke-dashoffset", (HOLD_C*(1-Math.min(1, el/hold.target))).toFixed(1));
  const s = Math.ceil(remain);
  if(s<=3 && s>0 && s!==hold.lastTick){ hold.lastTick = s; sfx("restTick"); haptic(10); const w = qs(".hold-wrap"); if(w) w.classList.add("ending"); }
  if(remain<=0) holdFinish(hold.target);
}
function holdFinish(secs){
  const h = hold; clearInterval(holdTimer); hold = null;
  if(!h || !S.draft || !S.draft.exos[h.exi]) return;
  const st = S.draft.exos[h.exi].sets.find(s=>!s.done);
  if(st) st.reps = Math.max(1, Math.round(secs));
  ACT.validateSet({ exi:String(h.exi) });
}

// ---------- ressenti de la série (répétitions en réserve), facultatif, pendant le repos ----------
function effortHTML(){
  const src = restState && restState.src; if(!src || !S.draft || !S.draft.exos[src.exi]) return "";
  const st = S.draft.exos[src.exi].sets[src.si]; if(!st) return "";
  const timed = isTimed(EXO_MAP[S.draft.exos[src.exi].exoId]);
  const opts = timed ? [[3,"À fond"],[2,"Encore un peu"],[1,"Large marge"]] : [[3,"0"],[2,"1–2"],[1,"3 ou +"]];
  return `<div class="effort" role="group" aria-label="Ressenti de la série">
    <div class="ef-q">${timed?"Comment c'était ?":"Répétitions que tu aurais pu faire en plus ?"} <span>facultatif</span></div>
    <div class="ef-opts">${opts.map(([v,l])=>`<button class="${st.effort===v?"on":""}" data-a="setEffort" data-v="${v}" aria-pressed="${st.effort===v}">${l}</button>`).join("")}</div>
  </div>`;
}

function lastTimeHTML(exoId, hasNote){
  const last = lastPerformance(exoId);
  // première fois : le conseil de l'exercice (note) le dit déjà, on ne le répète pas
  if(!last) return hasNote ? "" : `<div class="fc-last">Première fois : prends tes repères</div>`;
  const done = last.exo.sets.filter(s=>s.done);
  const w = done[0] && done[0].weight;
  return `<div class="fc-last">La dernière fois (${fmtRelative(last.session.date)}) : ${done.map(s=>s.reps).join(" · ")}${loadSuffix(EXO_MAP[exoId], w)}</div>`;
}

// « À battre » (réglage Motivation) : la cible du jour face à la même série la dernière fois,
// et un retour immédiat quand la saisie la dépasse
// un toucher dans un menu (modale centrée) le referme ; l'étoile d'une fiche, non
function closeModalIfMenu(){ const o = qs("#overlay"); if(o && o.dataset.kind==="modal" && qs("#overlay .menu-list")) closeSheet(); }
// la note « une répétition de plus que la dernière fois » double la ligne « à battre » : une seule suffit
function noteIsBeat(ex){ return S.settings.beat!==false && /^Objectif( du jour)? : (une répétition de plus|\+\d+ (s|répétitions?) )/.test(ex.note||""); }
let beatWinKey = ""; // série déjà annoncée « mieux » : l'animation ne rejoue pas à chaque +/−
function beatLineHTML(ex, def, si, st){
  const ref = isStretch(def) ? null : beatRef(ex.exoId, si);
  if(!ref) return lastTimeHTML(ex.exoId, !!ex.note);
  const u = isTimed(def) ? " s" : "", refTxt = `${ref.reps}${u}${loadSuffix(def, ref.weight)}`;
  const key = ex.exoId+":"+si, gap = daysBetween(ref.date, todayISO());
  // après 3 semaines sans l'exercice, on ne cherche pas à battre : on retrouve son niveau (la force revient vite)
  if(gap>=21) return `<div class="fc-beat">${ii("repeat")}<span>Reprise après ${gap} jours : retrouve tes sensations <small>(la dernière fois : ${refTxt})</small></span></div>`;
  if(beatCmp(def, st, ref)>0){ const pop = beatWinKey!==key; beatWinKey = key; return `<div class="fc-beat win${pop ? " pop" : ""}">${ii("trendUp")}<span>Ça bat la dernière fois <small>(${refTxt})</small></span></div>`; }
  if(beatWinKey===key) beatWinKey = "";
  const tgt = beatTarget(def, st.weight, ref);
  if(tgt==null) return `<div class="fc-beat">${ii("target")}<span>La dernière fois : <b>${refTxt}</b></span></div>`;
  const lt = loadableTypeOf(def), at = lt && st.weight ? (lt==="bands" ? ` · ${fmtLoad(def, st.weight)}` : ` à ${fmtDec(st.weight)} kg`) : "";
  return `<div class="fc-beat">${ii("target")}<span>À battre : <b>${tgt}${isTimed(def) ? " s" : " reps"}</b>${at} <small>(la dernière fois : ${refTxt})</small></span></div>`;
}
function renderFocusCard(idx, ex, def){
  const animClass = focusAnimDir==="r" ? "anim-r" : focusAnimDir==="l" ? "anim-l" : "";
  focusAnimDir = null;
  const jd = justDone && justDone.exi===idx ? justDone.si : -1;
  justDone = null;
  const resting = restState && restState.exoIdx===idx;
  const allDone = ex.sets.every(s=>s.done);
  const header = `<button class="fc-menu" aria-label="Options de l'exercice" data-a="focusMenu" data-idx="${idx}">•••</button>
    <button class="fc-info" aria-label="Fiche de l'exercice" data-a="showExoInfo" data-id="${def.id}">i</button>
    <div class="fc-icon">${exoIcon(def,"lg")}</div>
    <div class="fc-name">${esc(def.n)}</div>
    <div class="fc-sub">${musclesLabel(def)}</div>`;
  const anyDone = ex.sets.some(s=>s.done);
  const dots = si => ex.sets.map((s,i)=>`<span class="sd ${s.done?"done":i===si?"current":""} ${i===jd?"just":""} ${s.pr?"pr":""}"></span>`).join("");
  // une série validée par erreur se corrige en touchant les points (ou via •••)
  const setDots = si => anyDone ? `<button class="set-dots tap" data-a="editDoneSets" data-exi="${idx}" aria-label="Corriger les séries faites">${dots(si)}</button>` : `<div class="set-dots">${dots(si)}</div>`;

  if(resting){
    const remain = Math.max(0, Math.round((restState.endAt-Date.now())/1000));
    const tIdx = restTarget(restState.exoIdx, restState.arrived), tEx = tIdx>=0 ? S.draft.exos[tIdx] : null;
    const next = tEx && tEx.sets.find(s=>!s.done), nDef = tEx && EXO_MAP[tEx.exoId];
    const nextTxt = !next ? "" : tIdx===idx ? `Ensuite : ${next.reps} ${isTimed(def)?"s":"reps"}${loadSuffix(def, next.weight)}`
      : `Ensuite : <b>${esc(nDef.n)}</b> · ${next.reps} ${isTimed(nDef)?"s":"reps"}${loadSuffix(nDef, next.weight)}`;
    return `<div class="focus-card resting r-${regionOf(def)} ${animClass}">${header}
      ${setDots(-1)}
      <div class="fc-phase">Repos · respire</div>
      ${ringSVG(remain, restState.totalSec)}
      ${nextTxt?`<div class="fc-next">${nextTxt}</div>`:""}
      <div class="ring-adjust"><button data-a="restAdjust" data-d="-15">−15 s</button><button data-a="restAdjust" data-d="15">+15 s</button><button class="skip" data-a="restSkip">Passer</button></div>
      ${effortHTML()}
    </div>`;
  }

  if(allDone){
    const recap = ex.sets.map(s=>`<span class="chip ${s.pr?"pr":""}">${s.pr?ii("bolt"):""}${s.reps||"?"}${loadSuffix(def, s.weight)}</span>`).join("");
    return `<div class="focus-card r-${regionOf(def)} ${animClass}">${header}
      <div class="fc-done-badge">${icon("check")}</div>
      <div class="fc-done-t">Exercice terminé</div>
      <button class="fc-recap tap" data-a="editDoneSets" data-exi="${idx}" aria-label="Corriger les séries faites">${recap}</button>
      ${(()=>{ const ni = nextUndone(idx); if(ni<0) return ""; const nd = EXO_MAP[S.draft.exos[ni].exoId];
        return `<button class="btn big next-exo" data-a="focusJump" data-idx="${ni}"><span class="ne-k">Exercice suivant</span><span class="ne-n">${esc(nd.n)}</span>${icon("chev")}</button>`; })()}
      <div class="fc-quiet"><button data-a="addSetFocus" data-exi="${idx}">+ Ajouter une série</button></div>
    </div>`;
  }

  const si = ex.sets.findIndex(s=>!s.done);
  const st = ex.sets[si];
  const hasWeight = !!loadableTypeOf(def);
  const unit = isTimed(def) ? "Secondes" : "Répétitions";
  if(hold && hold.exi===idx) return holdCardHTML(idx, ex, def, si, header, animClass, setDots);
  const rr = restReady; restReady = false; // animation « c'est reparti » après le repos
  setTimeout(()=>{ valRoll = {}; }, 0);
  return `<div class="focus-card r-${regionOf(def)} ${animClass}">${header}
    <div class="fc-phase">Série ${si+1} / ${ex.sets.length} · objectif ${repsLabel(ex.targetReps)}</div>
    ${setDots(si)}
    <div class="big-steppers">
      <div class="big-stepper"><div class="bs-label">${unit}</div><div class="bs-row">
        <button aria-label="Moins" data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        <button class="bs-val ${valRoll.f==="reps"?"roll-"+valRoll.d:""}" aria-label="Saisir la valeur" data-a="editVal" data-f="reps" data-exi="${idx}" data-si="${si}">${st.reps??"–"}</button>
        <button aria-label="Plus" data-a="stepReps" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>
      ${hasWeight?`<div class="big-stepper ${loadableTypeOf(def)==="bands"?"band":""}"><div class="bs-label">${loadableTypeOf(def)==="bands"?"Élastique":"Charge (kg)"}</div><div class="bs-row">
        <button aria-label="Moins" data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="-1">−</button>
        ${loadableTypeOf(def)==="bands"
          ? `<span class="bs-val band-val ${valRoll.f==="weight"?"roll-"+valRoll.d:""}">${st.weight?bandLabel(st.weight):"–"}</span>`
          : `<button class="bs-val ${valRoll.f==="weight"?"roll-"+valRoll.d:""}" aria-label="Saisir la charge" data-a="editVal" data-f="weight" data-exi="${idx}" data-si="${si}">${st.weight??"–"}</button>`}
        <button aria-label="Plus" data-a="stepWeight" data-exi="${idx}" data-si="${si}" data-d="1">+</button>
      </div></div>`:""}
    </div>
    ${S.settings.beat===false ? lastTimeHTML(ex.exoId, !!ex.note) : beatLineHTML(ex, def, si, st)}
    ${kgType(def) && (st.weight||0)>=8 && !S.draft.exos.some(e=>e.sets.some(x=>x.done)) ? `<div class="warmup">${ii("flame")} Échauffement : 1 série légère (≈ ${fmtDec(Math.max(1, Math.round((st.weight||0)*0.5)))} kg) de 8 à 10 répétitions avant de commencer.</div>` : ""}
    ${ex.note && !noteIsBeat(ex) ?`<div class="exo-note" style="margin:0 0 14px">${esc(ex.note)}${ex.harder&&EXO_MAP[ex.harder]&&!ex.sets.some(s=>s.done)?`<button class="note-act" data-a="swapHarder" data-idx="${idx}">Essayer maintenant ${icon("chev")}</button>`:""}</div>`:""}
    ${isTimed(def)
      ? `<button class="btn big validate hold-go ${rr?"ready":""}" data-a="holdStart" data-exi="${idx}" data-si="${si}">${icon("timer")} Lancer le chrono · ${st.reps||30} s</button>
         <button class="btn ghost sm hold-skip" data-a="validateSet" data-exi="${idx}">Valider sans chrono</button>`
      : `<button class="btn big validate ${rr?"ready":""}" data-a="validateSet" data-exi="${idx}">${icon("check")} Valider la série ${si+1}</button>`}
  </div>`;
}

function refreshFocusRegion(){
  const el = qs("#focusRegion");
  if(!el || !S.draft || !S.draft.startedAt) return;
  el.innerHTML = renderFocusRegionInner(S.draft);
  const strip = qs("#liveStrip");
  // centrage du bandeau à l'image suivante : lire sa géométrie ici forcerait une mise en page de plus
  if(strip){ const sl = (qs("#lsChips")||{}).scrollLeft||0; strip.innerHTML = liveStripHTML(S.draft); requestAnimationFrame(()=>{ const c = qs("#lsChips"); if(c){ c.scrollLeft = sl; centerStripChip(true); } }); }
  stripBump = -1;
  const head = qs("#liveHead");
  if(head){
    // la barre et le pourcentage partent de l'ancienne valeur pour que le progrès se voie
    const oldW = qsa(".lp-seg i", head).map(i=>i.style.width), oldPct = parseInt((qs(".lh-pct b", head)||{}).textContent)||0;
    head.innerHTML = liveHeadHTML(S.draft);
    const segs = qsa(".lp-seg i", head);
    if(oldW.length===segs.length && !reducedMotion()){
      // la barre part de l'ancienne largeur (Web Animations : pas de mise en page forcée)
      segs.forEach((i,k)=>{ const to = i.style.width; if(to===oldW[k]) return; i.parentElement.classList.add("grew");
        // échelle horizontale plutôt que largeur : animée par le compositeur, sans mise en page à chaque image
        const r0 = parseFloat(oldW[k])||0, r1 = parseFloat(to)||0;
        if(i.animate && r1>0) try{ i.style.transition = "none"; i.style.transformOrigin = "left center"; i.animate([{ transform:`scaleX(${r0/r1})` }, { transform:"scaleX(1)" }], { duration:600, easing:"cubic-bezier(.32,.72,0,1)" }); }catch(e){} });
      const b = qs(".lh-pct b", head), newPct = parseInt(b.textContent)||0;
      if(newPct!==oldPct){
        b.classList.add("bump");
        const t0 = performance.now();
        (function step(t){ const p = Math.min(1,(t-t0)/600), e = 1-Math.pow(1-p,3);
          b.firstChild.textContent = Math.round(oldPct+(newPct-oldPct)*e);
          if(p<1) requestAnimationFrame(step); })(t0);
      }
    }
  }
  if(typeof renderRestBar==="function") renderRestBar();
}

function overviewBodyHTML(){
  const row = (ex,i)=>{
    const def = EXO_MAP[ex.exoId];
    const done = ex.sets.filter(s=>s.done).length, n = ex.sets.length, allDone = done===n;
    return `<div class="row ov-row ${i===liveFocusIdx?"current":""} ${allDone?"done":""}">
      <button class="row-main" data-a="jumpFromOverview" data-idx="${i}">
        <span class="ls-ring r-${regionOf(def)}" style="--p:${Math.round(done/n*100)}"><span>${allDone?icon("check"):exoPicto(def)}</span></span>
        <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${allDone?"Terminé":i===liveFocusIdx?`En cours · ${done}/${n} séries`:`${done}/${nb(n,"série")}`}</div></div>
      </button>
      <button class="icon-btn" aria-label="Remplacer" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
      <button class="icon-btn" aria-label="Retirer" data-a="removeExoOverview" data-idx="${i}">${icon("close")}</button>
    </div>`;
  };
  const todo = [], done = [];
  S.draft.exos.forEach((ex,i)=>(ex.sets.every(s=>s.done)?done:todo).push(row(ex,i)));
  return `${todo.length?`<div class="ov-h">À faire <span>${todo.length}</span></div><div class="group">${todo.join("")}</div>`:""}
    ${done.length?`<div class="ov-h done">Terminés <span>${done.length}</span></div><div class="group">${done.join("")}</div>`:""}
    <div class="btnrow"><button class="btn tertiary sm" data-a="addExoOpen">${icon("plus")} Ajouter des exercices</button></div>`;
}

let lastDoneForSave = null;
function finalizeSession(){
  const draft = S.draft;
  const xpBefore = totalXP();
  draft.completedAt = new Date().toISOString();
  draft.durationSec = Math.round((Date.parse(draft.completedAt)-Date.parse(draft.startedAt))/1000);
  draft.exos = draft.exos.filter(ex=>ex.sets.some(s=>s.done));
  // séries meilleures que la même série la dernière fois (comptées avant d'ajouter la séance)
  if(S.settings.beat!==false) draft.beats = draft.exos.reduce((t,ex)=>{ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return t;
    return t + ex.sets.filter((st,si)=>{ if(!st.done || st.pr) return false; const ref = beatRef(ex.exoId, si); return !!ref && daysBetween(ref.date, todayISO())<21 && beatCmp(def, st, ref)>0; }).length; }, 0);
  // étirements : gardés à part (nom et secondes tenues), hors séries, volume et muscles travaillés
  const cool = draft.exos.filter(isStretchEntry);
  if(cool.length){
    draft.stretches = cool.map(ex=>({ exoId:ex.exoId, sec:ex.sets.filter(s=>s.done).reduce((t,s)=>t+(s.reps||0),0) }));
    draft.exos = draft.exos.filter(ex=>!isStretchEntry(ex));
    if(!draft.exos.length && !draft.name) draft.name = "Étirements";
  }
  S.sessions.push(markStored(compactSession(clone(draft))));
  if(draft.source==="imported" && S.importedProgram.length) S.importedProgram.shift();
  S.draft = null;
  liveFocusIdx = 0;
  stopRestTimer();
  // la séance composée a été faite : le constructeur repart à vide
  S.custom = { exos:[] };
  // proposer d'enregistrer la séance si elle ne vient pas d'une séance enregistrée
  const ids = draft.exos.map(e=>e.exoId).join();
  const known = draft.tplId || S.templates.some(t=>t.exos.map(e=>e.exoId).join()===ids);
  lastDoneForSave = known || !draft.exos.length ? null : { n: draft.name && draft.source!=="engine" ? draft.name : sessionTitle(draft), exos: draft.exos.map(e=>({ exoId:e.exoId, sets:e.sets.filter(s=>s.done).length||e.sets.length })) };
  const won = checkChallenges(); // avant les trophées : « Défis relevés » compte la réussite
  const ups = checkMedals();
  const hits = checkTargets();
  const xpAfter = totalXP();
  save();
  scrollTodayTop();
  renderViewAnimated("today");
  showCelebration(draft, ups, xpBefore, xpAfter, hits, won);
}

// changer d'écran (aperçu ↔ séance en cours) repart du haut de la page
function scrollTodayTop(){ const v = qs("#v-today"); if(v) v.scrollTop = 0; }
function centerOf(sel){
  const el = qs(sel); if(!el) return [null,null];
  const r = el.getBoundingClientRect();
  return [r.left+r.width/2, r.top+r.height/2];
}

// ---------- planning : séances enregistrées assignées à des jours ----------
function openPlanDaySheet(day){
  const cur = S.templates.find(t=>(t.days||[]).includes(day));
  const label = JOURS[(day+1)%7];
  const rows = S.templates.map(t=>`<button class="row tap" data-a="planSet" data-d="${day}" data-id="${t.id}">
      ${cur&&cur.id===t.id ? `<span class="xico done">${icon("check")}</span>` : (EXO_MAP[(t.exos[0]||{}).exoId] ? `<span class="xico r-${tplRegion(t)}">${exoPicto(EXO_MAP[t.exos[0].exoId])}</span>` : `<span class="xico">${icon("bookmark")}</span>`)}
      <div class="grow"><div class="t">${esc(t.n)}</div><div class="s">${t.exos.length} exercices · ${t.exos.reduce((a,e)=>a+e.sets,0)} séries</div></div>
    </button>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">Le ${label}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
      ${cur ? `<div class="pd-cur r-${tplRegion(cur)}"><span class="tc-bar-s"></span><div class="grow"><div class="pd-k">Prévu le ${label}</div><div class="pd-t">${esc(cur.n)}</div></div>
        <button class="btn secondary sm" data-a="tplOpenEditor" data-id="${cur.id}">${icon("edit")} Modifier</button></div>` : ""}
      ${S.templates.length ? `<p class="body" style="margin-bottom:12px">${cur?"Changer pour une autre séance :":`Quelle séance enregistrée veux-tu faire chaque ${label} ?`}</p><div class="group">${rows}</div>
        ${cur?`<div class="btnrow"><button class="btn ghost" data-a="planSet" data-d="${day}">Ne rien prévoir le ${label}</button></div>`:""}`
      : `<div class="empty-state" style="padding:24px 20px"><span class="em">${sfIcon("bookmarkG","indigo","lg")}</span>Tu n'as pas encore de séance enregistrée.</div>`}
      <div class="btnrow"><button class="btn ${S.templates.length?"secondary":""}" data-a="planNew" data-d="${day}">${icon("plus")} Composer une séance pour le ${label}</button></div>
    </div>`);
}
// À l'ouverture (et quand on planifie le jour même) : charge la séance prévue aujourd'hui dans « Ma séance »
function applyPlannedSession(force){
  if(S.draft && S.draft.startedAt) return false;
  const t = plannedTemplate();
  if(!t) return false;
  if(!force && S.custom.planDate===todayISO()) return false; // déjà chargée aujourd'hui (et peut-être modifiée)
  if(sessionsToday().some(s=>s.tplId===t.id)) return false;
  S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id, planDate: todayISO() };
  S.settings.todayTab = "custom";
  save();
  return true;
}

// ---------- glisser la carte pour changer d'exercice ----------
let swipe = null;
let suppressClicksUntil = 0;
document.addEventListener("pointerdown", e=>{
  const card = e.target.closest && e.target.closest(".focus-card");
  if(!card || !S.draft || !S.draft.startedAt || (e.pointerType==="mouse" && e.button!==0)) return;
  swipe = { card, x:e.clientX, y:e.clientY, dx:0, active:false, id:e.pointerId, t:performance.now() };
});
document.addEventListener("pointermove", e=>{
  if(!swipe || e.pointerId!==swipe.id) return;
  const dx = e.clientX-swipe.x, dy = e.clientY-swipe.y;
  if(!swipe.active){
    if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.3){ swipe.active = true; swipe.card.classList.add("dragging"); }
    else { if(Math.abs(dy)>10) swipe = null; return; }
  }
  const n = S.draft.exos.length;
  const edge = n<2;
  swipe.dx = edge ? dx*0.25 : dx;
  swipe.card.style.transform = `translateX(${swipe.dx}px) rotate(${swipe.dx/45}deg)`;
});
function endSwipe(e){
  if(!swipe || (e.pointerId!=null && e.pointerId!==swipe.id)) return;
  const s = swipe; swipe = null;
  if(!s.active) return;
  suppressClicksUntil = Date.now()+350;
  // geste interrompu (pointercancel, app mise en arrière-plan) : la carte revient, sans changer d'exercice
  const cancel = e.type!=="pointerup";
  const v = s.dx/Math.max(1, performance.now()-s.t), n = S.draft.exos.length;
  const go = cancel || n<2 ? 0 : (s.dx<-70 || v<-0.6) ? 1 : (s.dx>70 || v>0.6) ? -1 : 0;
  s.card.classList.remove("dragging");
  if(go){
    s.card.classList.add(go>0?"fly-l":"fly-r");
    sfx("swipe");
    if(navigator.vibrate) try{ navigator.vibrate(8); }catch(err){}
    setTimeout(()=>{ liveFocusIdx = (liveFocusIdx+go+n)%n; focusAnimDir = go>0?"r":"l"; refreshFocusRegion(); }, 170);
  } else {
    s.card.classList.add("snap");
    s.card.style.transform = "";
    setTimeout(()=>s.card.classList.remove("snap"), 350);
  }
}
document.addEventListener("pointerup", endSwipe);
document.addEventListener("pointercancel", endSwipe);
document.addEventListener("ascen:suspend", endSwipe);

Object.assign(ACT, {
  todayMode(d){
    if(S.settings.todayTab===d.v) return;
    paneDir = d.v==="proposal" ? "r" : "l";
    S.settings.todayTab = d.v; save(); renderViewAnimated("today");
    paneDir = "";
  },
  pickerCat(d){
    picker.cat = d.v || null;
    qsa("#pickerCats .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
    qs("#pickerList").scrollTop = 0;
  },
  customFill(){
    const have = S.custom.exos.map(e=>e.exoId);
    const target = sessionSize();
    const n = Math.max(have.length ? 1 : 3, target-have.length);
    const add = suggestComplement(have, Math.min(n, 4));
    if(!add.length){ toast("Aucun exercice disponible avec ton matériel"); return; }
    add.forEach(e=>{ S.custom.exos.push({ exoId:e.id, sets:e.sets, app:true }); freshIds.add(e.id); });
    save(); changed();
    toast(`${add.length} exercice${add.length>1?"s":""} ajouté${add.length>1?"s":""} par l'app`, "sparkle");
  },
  planDay(d){ openPlanDaySheet(+d.d); },
  planSet(d){
    const day = +d.d;
    S.templates.forEach(t=>{ t.days = (t.days||[]).filter(x=>x!==day); });
    if(d.id){ const t = S.templates.find(x=>x.id===d.id); if(t){ t.days.push(day); t.since = todayISO(); } }
    save(); closeSheet(); changed();
    if(day===weekdayIdx(todayISO())) applyPlannedSession(true);
    toast(d.id ? `Planifié le ${JOURS[(day+1)%7]}` : "Jour libéré");
  },
  templateMenu(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    openModal(`<div class="tm-head r-${tplRegion(t)}"><span class="tc-bar"></span><div><div style="font-weight:700;font-size:calc(17rem/17)">${esc(t.n)}</div>
      <div class="hr-note" style="margin:2px 0 0">${t.exos.length} exercices · ${(t.days||[]).length?daysLabel(t.days):"aucun jour fixe"}</div></div></div>
      <div class="menu-list">
        <button data-a="startTemplate" data-id="${t.id}">${icon("play")}<span>Commencer maintenant</span></button>
        <button data-a="tplOpenEditor" data-id="${t.id}">${icon("edit")}<span>Modifier (exercices, jours, nom)</span></button>
        <button data-a="loadTemplate" data-id="${t.id}">${icon("repeat")}<span>Charger dans Ma séance</span></button>
        <button data-a="duplicateTemplate" data-id="${t.id}">${icon("bookmark")}<span>Dupliquer</span></button>
        <button class="danger" data-a="deleteTemplate" data-id="${t.id}">${icon("trash")}<span>Supprimer</span></button>
      </div>
      <button class="btn ghost" style="height:40px;margin-top:6px" data-a="closesheet">Fermer</button>`);
  },
  toggleSection(d, el){
    const u = uiState(); u[d.k] = !u[d.k]; save();
    const sec = el && el.closest(".tpl-section, .week-plan"), clp = sec && sec.querySelector(":scope > .clp");
    if(!clp) return changed();
    el.setAttribute("aria-expanded", u[d.k]);
    const ch = el.querySelector(".sec-chev"); if(ch) ch.classList.toggle("open", u[d.k]);
    animateCollapse(clp, u[d.k], u[d.k] ? (d.k==="planOpen" ? weekPlanBodyHTML() : tplListHTML()) : null);
  },
  toggleTpl(d, el){
    const open = !openTpls.has(d.id);
    if(open) openTpls.add(d.id); else openTpls.delete(d.id);
    const card = el && el.closest(".tpl-card2"), t = S.templates.find(x=>x.id===d.id);
    if(!card || !t) return changed();
    card.classList.toggle("open", open);
    el.setAttribute("aria-expanded", open);
    const ch = el.querySelector(".sec-chev"); if(ch) ch.classList.toggle("open", open);
    animateCollapse(qs(".clp", card), open, open ? tplBodyHTML(t) : null);
  },
  tplShowAll(d, el){
    showAllTpls = !showAllTpls;
    const clp = el && el.closest(".clp");
    if(!clp) return changed();
    const before = qsa(".tpl-card2", clp).length;
    morphHeight(clp, ()=>{
      clp.innerHTML = tplListHTML();
      qsa(".tpl-card2", clp).forEach((c,i)=>{ if(i>=before){ c.classList.add("pop-in"); c.style.setProperty("--k", i-before); } });
    });
  },
  toggleReorder(){ reorderMode = !reorderMode; changed(); },
  customMove(d){
    const i = +d.idx, j = i+parseInt(d.d,10), a = S.custom.exos;
    if(j<0 || j>=a.length) return;
    [a[i],a[j]] = [a[j],a[i]];
    freshIds.add(a[j].exoId);
    save(); changed();
  },
  startTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id, planDate: todayISO() };
    closeSheet();
    ACT.startCustom();
  },
  duplicateTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    const copy = { id:uid(), n:`${t.n} (copie)`, days:[], exos:clone(t.exos) };
    S.templates.splice(S.templates.indexOf(t)+1, 0, copy);
    openTpls.add(copy.id);
    closeSheet(); save(); changed(); toast("Séance dupliquée");
  },
  planNew(d){
    // même chemin que partout : on compose dans « Ma séance », puis on l'enregistre pour ce jour
    const day = +d.d;
    if(S.custom.tplId || !S.custom.exos.length) S.custom = { exos:[], pendingDays:[day] };
    else S.custom.pendingDays = [day];
    S.settings.todayTab = "custom"; reorderMode = false;
    closeSheet(); save(); scrollTodayTop(); renderViewAnimated("today");
    toast(`Compose ta séance, puis enregistre-la pour le ${JOURS[(day+1)%7]}`);
  },
  pickerInfo(d){ const l = qs("#pickerList"); if(picker && l) picker.scroll = l.scrollTop; ACT.showExoInfo({ id:d.id }); },
  swapFromInfo(d){
    const idx = +d.idx;
    S.draft.exos[idx] = sessionEntryFor(EXO_MAP[d.id]);
    liveFocusIdx = idx; focusAnimDir = "r";
    closeSheet(); save(); refreshFocusRegion();
    toast(`Remplacé par ${EXO_MAP[d.id].n}`);
  },
  draftCount(d){
    // le nombre d'exercices ne concerne que la force : le bloc d'étirements reste à la fin
    const dir = parseInt(d.d,10), ex = S.draft.exos, main = mainExos(S.draft), firstCool = ex.findIndex(isStretchEntry);
    if(dir>0){
      if(main.length>=10) return;
      const add = suggestComplement(main.map(e=>e.exoId), 1)[0];
      if(!add){ toast("Plus d'exercice disponible avec ton matériel"); return; }
      ex.splice(firstCool<0 ? ex.length : firstCool, 0, sessionEntryFor(add)); freshIds.add(add.id);
    } else {
      if(main.length<=1) return;
      ex.splice(ex.indexOf(main[main.length-1]), 1);
    }
    S.goals.exoCount = mainExos(S.draft).length; // retenu pour les prochaines propositions
    sfx("step", dir>0); save(); renderView("today");
  },
  setType(d){ regenerateDraft(d.v); renderViewAnimated("today"); },
  startSession(){ if(!S.draft.exos.length) return; S.draft.startedAt = new Date().toISOString(); liveFocusIdx = 0; completeShown = false; save(); scrollTodayTop(); renderViewAnimated("today"); showLaunch(S.draft); },
  regenSession(){ regenerateDraft(); renderViewAnimated("today"); toast("Nouvelle proposition"); },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); liveFocusIdx=0; save(); renderViewAnimated("today"); } });
  },
  removeExo(d, el){
    sfx("remove");
    if(S.draft.startedAt) closeSheet();
    const row = el && !S.draft.startedAt && el.closest(".row");
    const draft = S.draft, i = +d.idx;
    const go = ()=>{
      const [ex] = draft.exos.splice(i,1); if(!ex) return;
      if(liveFocusIdx>=draft.exos.length) liveFocusIdx = Math.max(0,draft.exos.length-1);
      changed();
      toast(`${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "Exercice"} retiré`, null, ()=>{
        if(S.draft!==draft || draft.exos.includes(ex)) return;
        draft.exos.splice(Math.min(i, draft.exos.length), 0, ex); if(draft.startedAt) liveFocusIdx = Math.min(i, draft.exos.length-1); changed();
      });
    };
    if(row){ row.classList.add("leaving"); setTimeout(go, 220); } else go();
  },
  addExoOpen(){
    openPicker({ title:"Ajouter des exercices", multi:true, exclude:new Set(S.draft.exos.map(e=>e.exoId)), onDone:ids=>{
      ids.forEach(id=>S.draft.exos.push(sessionEntryFor(EXO_MAP[id])));
      closeSheet(); changed();
    }});
  },
  swapExoOpen(d){
    const idx = +d.idx;
    const cur = EXO_MAP[S.draft.exos[idx].exoId];
    // un étirement se remplace par un autre étirement (tous muscles), un exercice par un exercice du même muscle
    openPicker({ title:"Remplacer "+cur.n, muscle:isStretch(cur) ? null : cur.muscles[0], cat:isStretch(cur) ? "stretch" : null, exclude:new Set(S.draft.exos.map(e=>e.exoId)), onDone:ids=>{
      S.draft.exos[idx] = sessionEntryFor(EXO_MAP[ids[0]]);
      closeSheet(); changed();
    }});
  },
  pickerTap(d){
    if(!picker) return;
    if(!picker.multi){ picker.onDone([d.id]); return; }
    const i = picker.selected.indexOf(d.id);
    if(i>=0) picker.selected.splice(i,1); else picker.selected.push(d.id);
    const row = qs(`.pick-row[data-id="${d.id}"]`);
    if(row){ row.classList.toggle("on", i<0); const c = qs(".pick-check",row); if(c) c.innerHTML = i<0 ? icon("check") : ""; }
    if(navigator.vibrate) try{ navigator.vibrate(6); }catch(e){}
    refreshPickerFooter();
  },
  pickerMuscle(d){
    picker.muscle = d.v || null;
    qsa("#pickerChips .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
  },
  pickerDone(){ if(picker && picker.selected.length) picker.onDone(picker.selected.slice()); },

  // --- Ma séance ---
  customAddOpen(){
    openPicker({ title:"Choisir des exercices", multi:true, exclude:new Set(S.custom.exos.map(e=>e.exoId)), onDone:ids=>{
      ids.forEach(id=>{ S.custom.exos.push({ exoId:id, sets:EXO_MAP[id].sets }); freshIds.add(id); });
      closeSheet(); save(); changed();
    }});
  },
  heroShowAll(){
    const g = qs("#v-today .group.builder, #v-today .exo-count + .group, #v-today .exo-count ~ .group");
    if(g) g.scrollIntoView({ behavior:"smooth", block:"start" });
  },
  customSets(d){
    const e = S.custom.exos[+d.idx];
    e.sets = Math.max(1, Math.min(10, e.sets+parseInt(d.d,10)));
    changed();
  },
  customRemove(d, el){
    sfx("remove");
    const row = el.closest(".row");
    const i = +d.idx;
    const go = ()=>{
      const [ex] = S.custom.exos.splice(i,1); if(!ex) return; changed();
      const list = S.custom.exos;
      toast(`${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "Exercice"} retiré`, null, ()=>{ if(S.custom.exos!==list || list.includes(ex)) return; list.splice(Math.min(i, list.length), 0, ex); changed(); });
    };
    if(row){ row.classList.add("leaving"); setTimeout(go, 220); } else go();
  },
  customClear(){
    confirmSheet({ title:"Vider ma séance ?", html:"Les exercices choisis seront retirés. Tes séances enregistrées ne changent pas.", ok:"Vider", danger:true,
      onOk:()=>{ S.custom = { exos:[] }; save(); renderViewAnimated("today"); } });
  },
  startExpress(){
    if(S.draft && S.draft.startedAt) return;
    const s = buildExpressSession(); if(!s.exos.length) return;
    S.draft = s; S.draft.startedAt = new Date().toISOString();
    liveFocusIdx = 0; completeShown = false;
    save(); scrollTodayTop(); renderViewAnimated("today");
    showLaunch(S.draft);
  },
  startCustom(){
    if(!S.custom.exos.length) return;
    S.draft = buildCustomSession(S.custom.exos, S.custom.name);
    const planned = plannedTemplate();
    if(S.custom.tplId){ S.draft.tplId = S.custom.tplId; S.draft.planned = !!planned && planned.id===S.custom.tplId; }
    S.draft.startedAt = new Date().toISOString();
    liveFocusIdx = 0; completeShown = false;
    save(); scrollTodayTop(); renderViewAnimated("today");
    showLaunch(S.draft);
  },
  saveTemplateOpen(){
    // « Ma séance » s'enregistre via l'éditeur, pré-rempli (et relié à sa séance si elle en vient)
    openTplEditor(S.custom.tplId || null, { n:S.custom.name||"", exos:S.custom.exos.map(e=>({ exoId:e.exoId, sets:e.sets })), fromCustom:true, lite:true,
      ...(S.custom.tplId ? {} : { days:(S.custom.pendingDays||[]).slice() }) });
  },

  loadTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id };
    t.exos.forEach(e=>freshIds.add(e.exoId));
    closeSheet(); save(); renderViewAnimated("today"); toast(`« ${t.n} » chargée dans Ma séance`);
    setTimeout(()=>{ const g = qs("#v-today .group.builder"); if(g) g.scrollIntoView({ behavior:"smooth", block:"center" }); }, 260);
  },
  deleteTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    confirmSheet({ title:`Supprimer « ${t.n} » ?`, html:"La séance enregistrée et ses jours de planning seront supprimés.", ok:"Supprimer", danger:true, onOk:()=>{
      const i = S.templates.indexOf(t), wasCustom = S.custom.tplId===d.id;
      S.templates = S.templates.filter(x=>x.id!==d.id);
      if(wasCustom) delete S.custom.tplId;
      save(); changed();
      toast(`« ${t.n} » supprimée`, "trash", ()=>{
        if(S.templates.some(x=>x.id===t.id)) return;
        S.templates.splice(Math.min(i, S.templates.length), 0, t); if(wasCustom) S.custom.tplId = t.id; save(); changed();
      });
    } });
  },

  // --- séance en cours ---
  // navigation en boucle : après le dernier exercice on revient au premier, et inversement
  focusPrev(){ const n = S.draft ? S.draft.exos.length : 0; if(n>1){ liveFocusIdx = (liveFocusIdx-1+n)%n; focusAnimDir="l"; refreshFocusRegion(); } },
  focusNext(){ const n = S.draft ? S.draft.exos.length : 0; if(n>1){ liveFocusIdx = (liveFocusIdx+1)%n; focusAnimDir="r"; refreshFocusRegion(); } },
  focusJump(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; refreshFocusRegion(); },
  jumpFromOverview(d){ const ni=+d.idx; focusAnimDir = ni>liveFocusIdx?"r":ni<liveFocusIdx?"l":null; liveFocusIdx=ni; closeSheet(); refreshFocusRegion(); },

  holdStart(d){
    const exi = +d.exi, ex = S.draft.exos[exi], st = ex.sets.find(s=>!s.done); if(!st) return;
    if(restState) stopRestTimer();
    hold = { exi, target: Math.max(5, st.reps||30), phase:"prep", t0: Date.now(), lastTick:3 };
    clearInterval(holdTimer); holdTimer = setInterval(holdTick, 100);
    sfx("restTick"); haptic(12); refreshFocusRegion();
  },
  holdStop(){
    if(!hold) return;
    if(hold.phase==="prep"){ clearInterval(holdTimer); hold = null; refreshFocusRegion(); return; }
    holdFinish((Date.now()-hold.t0)/1000);
  },
  setEffort(d, el){
    const src = restState && restState.src; if(!src) return;
    const st = S.draft.exos[src.exi] && S.draft.exos[src.exi].sets[src.si]; if(!st) return;
    const v = +d.v; st.effort = st.effort===v ? 0 : v;
    const box = el && el.closest(".ef-opts");
    if(box) qsa("button", box).forEach(b=>{ const on = +b.dataset.v===st.effort; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    sfx("seg"); haptic(6); save();
  },
  swapHarder(d){
    const i = +d.idx, ex = S.draft.exos[i]; if(!ex || !ex.harder || !EXO_MAP[ex.harder]) return;
    const h = EXO_MAP[ex.harder];
    const entry = sessionEntryFor(h, ex.sets.length);
    // les séries déjà faites restent acquises sur l'exercice d'origine
    if(ex.sets.some(s=>s.done)){ ex.sets = ex.sets.filter(s=>s.done); delete ex.harder; S.draft.exos.splice(i+1, 0, entry); liveFocusIdx = i+1; }
    else S.draft.exos[i] = entry;
    focusAnimDir = "r"; save(); refreshFocusRegion(); sfx("open");
    toast(`Place à « ${h.n} »`);
  },
  toggleFlow(){
    S.settings.flow = circuitMode() ? "classic" : "circuit"; save(); closeSheet();
    toast(circuitMode() ? "Après chaque repos : exercice suivant" : "Toutes les séries d'un exercice, puis le suivant");
    refreshFocusRegion();
  },
  favToggle(d, el){
    const on = toggleFavorite(d.id), n = EXO_MAP[d.id] ? EXO_MAP[d.id].n : "Exercice";
    if(el && el.classList.contains("fav-toggle")){ el.classList.toggle("on", on); el.setAttribute("aria-pressed", on); el.setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris"); }
    haptic(10); closeModalIfMenu();
    toast(on ? `${n} ajouté aux favoris` : `${n} retiré des favoris`, "star");
    if(picker){ const l = qs("#pickerList"); if(l) l.innerHTML = pickerListHTML(); }
  },
  focusMenu(d){
    const i = +d.idx, def = EXO_MAP[S.draft.exos[i].exoId];
    openModal(`<div class="tm-head r-${regionOf(def)}">${exoIcon(def,"sm")}<div><div style="font-weight:700;font-size:calc(17rem/17)">${esc(def.n)}</div></div></div>
      <div class="menu-list">
        <button data-a="showExoInfo" data-id="${def.id}">${icon("search")}<span>Fiche et technique</span></button>
        <button data-a="favToggle" data-id="${def.id}">${icon("star")}<span>${isIncluded(def.id) ? "Retirer des favoris" : "Ajouter aux favoris"}</span></button>
        <button data-a="swapExoOpen" data-idx="${i}">${icon("swap")}<span>Remplacer l'exercice</span></button>
        <button data-a="addSetFocus" data-exi="${i}">${icon("plus")}<span>Ajouter une série</span></button>
        ${S.draft.exos[i].sets.some(s=>s.done) ? `<button data-a="editDoneSets" data-exi="${i}">${icon("edit")}<span>Corriger les séries faites</span></button>` : ""}
        <button data-a="toggleFlow">${icon("repeat")}<span>${circuitMode()?"Enchaînement : exercice suivant après chaque repos":"Enchaînement : toutes les séries d'abord"}</span></button>
        <button class="danger" data-a="removeExo" data-idx="${i}">${icon("trash")}<span>Retirer de la séance</span></button>
      </div>
      <button class="btn ghost" style="height:40px;margin-top:6px" data-a="closesheet">Fermer</button>`);
  },
  openOverview(){ openSheet(`<div class="sheet-hd"><span class="t">Exercices de la séance</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body">${overviewBodyHTML()}</div>`); },
  removeExoOverview(d){
    const draft = S.draft, i = +d.idx, [ex] = draft.exos.splice(i,1); if(!ex) return;
    toast(`${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "Exercice"} retiré`, null, ()=>{
      if(S.draft!==draft || draft.exos.includes(ex)) return;
      draft.exos.splice(Math.min(i, draft.exos.length), 0, ex); save(); refreshFocusRegion();
      const b = qs(".sheet-body"); if(b && qs("#overlay").classList.contains("open")) b.innerHTML = overviewBodyHTML();
    });
    if(liveFocusIdx>=S.draft.exos.length) liveFocusIdx = Math.max(0,S.draft.exos.length-1);
    save();
    refreshFocusRegion();
    const body = qs(".sheet-body");
    if(body) body.innerHTML = overviewBodyHTML();
  },

  addSetFocus(d){
    const ex = S.draft.exos[+d.exi];
    const last = ex.sets[ex.sets.length-1];
    ex.sets.push({ reps:last?last.reps:null, weight:last?last.weight:null, done:false, rpe:null });
    ex.targetSets = ex.sets.length;
    completeShown = false;
    closeSheet(); save(); refreshFocusRegion();
  },
  // un changement se reporte sur les séries suivantes non validées qui avaient la même valeur
  stepReps(d){
    const ex = S.draft.exos[+d.exi], st = ex.sets[+d.si], old = st.reps;
    const v = Math.max(0,(old||0)+parseInt(d.d,10));
    ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done && s.reps===old) s.reps = v; });
    st.reps = v;
    valRoll = { f:"reps", d: parseInt(d.d,10)>0 ? "up" : "down" }; sfx("step", parseInt(d.d,10)>0);
    save(); refreshFocusRegion();
  },
  stepWeight(d){
    const ex = S.draft.exos[+d.exi], def = EXO_MAP[ex.exoId], st = ex.sets[+d.si], old = st.weight;
    const v = stepWeightValue(def, old||0, parseInt(d.d,10));
    ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done && s.weight===old) s.weight = v; });
    st.weight = v;
    valRoll = { f:"weight", d: parseInt(d.d,10)>0 ? "up" : "down" }; sfx("step", parseInt(d.d,10)>0);
    save(); refreshFocusRegion();
  },
  editVal(d){
    const ex = S.draft.exos[+d.exi], st = ex.sets[+d.si], isW = d.f==="weight";
    promptNumber({ title: isW?"Charge de la série":"Répétitions", value: isW?st.weight:st.reps, unit: isW?"kg":"reps", step: isW?"0.5":"1",
      onOk: v=>{
        // bornes réalistes (comme dans l'édition de l'historique) : une faute de frappe ne doit pas
        // gonfler le tonnage, les records et les trophées ; élastiques = niveaux 1 à 5
        const def = EXO_MAP[ex.exoId], bands = def && loadableTypeOf(def)==="bands";
        v = isW ? Math.min(bands ? 5 : 500, v) : Math.min(9999, v);
        // la nouvelle valeur s'applique aussi aux séries suivantes non validées
        ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done){ if(isW) s.weight = round1(v); else s.reps = Math.round(v); } });
        save(); refreshFocusRegion();
      }});
  },
  validateSet(d){
    const exi = +d.exi;
    const ex = S.draft.exos[exi], def = EXO_MAP[ex.exoId];
    const si = ex.sets.findIndex(s=>!s.done);
    if(si<0) return;
    const st = ex.sets[si];
    haptic(12);
    let [bx,by] = centerOf(".validate");
    if(bx==null){ [bx,by] = centerOf(".focus-card .set-dots"); if(bx==null){ bx = innerWidth/2; by = innerHeight/2; } }
    // les textes flottants partent des points de série (même place avant et après le repos)
    const dotsR = (qs(".focus-card .set-dots")||{getBoundingClientRect:()=>null}).getBoundingClientRect();
    const fx0 = dotsR ? dotsR.left+dotsR.width/2 : bx, fy0 = dotsR ? dotsR.top-8 : by-30;
    // record : meilleur que l'historique ET que les séries déjà validées aujourd'hui
    const prevToday = ex.sets.filter(s=>s.done);
    const bestTodayW = Math.max(0,...prevToday.map(s=>s.weight||0));
    const best1rmToday = Math.max(0,...prevToday.map(s=>estimated1RM(s.weight,s.reps)));
    const w = st.weight||0, r = st.reps||0;
    const beatsToday = w>bestTodayW || estimated1RM(w,r)>best1rmToday+0.01;
    if((w||r) && beatsToday && isNewPR(ex.exoId, w, r)){
      st.pr = true;
      S.meta.prCount = (S.meta.prCount||0)+1;
      confettiBurst(bx, by, 60);
      floatText(fx0, fy0, "Record !", "pr", "bolt");
    }
    // mieux que la même série la dernière fois : petit retour immédiat (le record a déjà le sien)
    const ref = !st.pr && S.settings.beat!==false && !isStretch(def) ? beatRef(ex.exoId, si) : null;
    const beat = !!ref && daysBetween(ref.date, todayISO())<21 && beatCmp(def, st, ref)>0;
    if(beat){ floatText(fx0, fy0, "Mieux que la dernière fois", "beat", "trendUp"); haptic(20); }
    st.done = true;
    { const fin = ex.sets.every(s=>s.done), rest = S.draft.exos.some(e=>e.sets.some(s=>!s.done));
      sfx(!rest ? "complete" : st.pr ? "pr" : fin ? "exo" : "set"); }
    if(navigator.vibrate) try{ navigator.vibrate(18); }catch(e){}
    justDone = { exi, si };
    stripBump = exi;
    if(!st.pr && !beat && !exoFinished0(ex)) floatText(fx0, fy0, `Série ${si+1}`, "", "check");
    const exoFinished = !ex.sets.some(s=>!s.done);
    const ni = nextUndone(exi);
    if(ni>=0) startRestTimer(S.draft.express ? Math.min(45, restFor(def)) : restFor(def), def.n, exoFinished ? ni : exi, exoFinished, { exi, si });
    else stopRestTimer();
    if(exoFinished){
      if(!st.pr) confettiBurst(bx, by, 36);
      if(ni>=0){ const nm = qs(".focus-card .fc-name"), r = nm && nm.getBoundingClientRect(); floatText(r ? r.left+r.width/2 : bx, r ? r.top+r.height/2 : by, "Exercice terminé !", "big", "flame"); }
      if(ni>=0){ liveFocusIdx = ni; focusAnimDir = ni>exi ? "r" : "l"; }
    }
    save();
    refreshFocusRegion();
  },

  showExoInfo(d){
    const e = EXO_MAP[d.id];
    if(!e) return;
    const region = regionOf(e);
    const opener = ()=>ACT.showExoInfo({ id:e.id });
    // le contexte se lit après l'empilement : on ouvre d'abord, puis on dessine le contenu
    openSheet(`<div class="sheet-hd"><span class="t">Fiche exercice</span></div><div class="sheet-body"></div>`, { child:true, restore:opener });
    const ctx = infoContext(), canBack = sheetCanGoBack();
    // l'étoile des favoris, toujours au même endroit : en haut à droite de la fiche
    const favBtn = `<button class="icon-btn fav-toggle ${isIncluded(e.id)?"on":""}" data-a="favToggle" data-id="${e.id}" aria-pressed="${isIncluded(e.id)}" aria-label="${isIncluded(e.id)?"Retirer des favoris":"Ajouter aux favoris"}">${ii("star")}</button>`;
    const hd = canBack ? `<button class="te-cancel" data-a="sheetBack">${icon("chev")}<span>Retour</span></button><span class="t">Fiche exercice</span><span class="hd-acts">${favBtn}</span>`
      : `<span class="t">Fiche exercice</span><span class="hd-acts">${favBtn}<button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></span>`;
    const pr = exoPRs(e.id), last = lastPerformance(e.id);
    const live = S.draft && S.draft.startedAt;
    const cat = EXO_CATS.find(c=>c.id===exoCategory(e));
    const stats = pr.count ? `<div class="stat-strip" style="margin-top:14px">
        <div class="stat-box"><div class="num">${pr.count}</div><div class="lbl">séance${pr.count>1?"s":""}</div></div>
        <div class="stat-box"><div class="num">${pr.maxWeight?fmtLoad(e, pr.maxWeight):"–"}</div><div class="lbl">record charge</div></div>
        <div class="stat-box"><div class="num">${last?fmtRelative(last.session.date):"–"}</div><div class="lbl">dernière fois</div></div>
      </div>` : `<div class="first-time">Tu n'as encore jamais fait cet exercice : commence léger pour prendre tes repères.</div>`;
    const similar = availableExos().filter(x=>x.id!==e.id && x.muscles[0]===e.muscles[0]).slice(0,4);
    const liveIdx = live ? S.draft.exos.findIndex(x=>x.exoId===e.id) : -1;
    const simHTML = similar.length ? `<h2 class="sh">Même muscle principal</h2><div class="group">${similar.map(x=>`<div class="row">
        <button class="row-main" data-a="showExoInfo" data-id="${x.id}">${exoIcon(x)}<div class="grow"><div class="t">${esc(x.n)}</div><div class="s">${catLabel(x)}</div></div><span class="info-dot">i</span></button>
        ${liveIdx>=0 && ctx!=="picker" ? `<button class="chip" data-a="swapFromInfo" data-idx="${liveIdx}" data-id="${x.id}">Remplacer</button>` : infoAddButton(x.id, true)}
      </div>`).join("")}</div>` : "";
    const sheetEl = qs("#overlay .sheet");
    sheetEl.innerHTML = `<div class="sheet-grab"></div><div class="sheet-hd">${hd}</div>
      <div class="sheet-body">
      <div class="exo-hero r-${region}">
        <div class="exo-stage r-${region}">${exoAnimSVG(e)}</div>
        <div class="nm">${esc(e.n)}</div>
        <div class="exo-tags"><span class="rtag r-${region}">${REGIONS[region].n}</span><span class="etag">${sfIcon(EQUIP_GLYPH[cat.id]||"wrench", EQUIP_COLOR[cat.id]||"gray", "xs")} ${esc(cat.n)}</span>${e.equip.includes("bench")?`<span class="etag">+ banc</span>`:""}</div>
      </div>
      <div class="exo-muscle-chips">${e.muscles.map((m,i)=>`<span class="chip mchip ${i===0?"main":""}">${MUSCLE_MAP[m].n}${i===0?" <small>principal</small>":""}</span>`).join("")}</div>
      ${e.muscles.some(m=>m!=="cardio") ? `<div class="exo-mm">${exoMuscleMap(e)}</div>` : ""}
      ${stats}
      <div class="exo-facts">
        <div><b>${e.sets} × ${e.repsMin}-${e.repsMax}</b><span>${isTimed(e)?"secondes":"répétitions"} conseillées</span></div>
        <div><b>${restFor(e)} s</b><span>de repos</span></div>
        <div><b>${e.uni?"Unilatéral":"Bilatéral"}</b><span>${e.uni?"un côté à la fois":"les deux côtés"}</span></div>
      </div>
      <h2 class="sh">Exécution</h2>
      <div class="cue-list">${e.cues.map((c,i)=>`<div class="cue-item" style="animation-delay:${i*0.07}s"><div class="cue-num">${i+1}</div><div class="cue-txt">${esc(c)}</div></div>`).join("")}</div>
      <div class="safety-box"><div class="lbl">Sécurité</div><div class="txt">${esc(e.safety)}</div></div>
      ${simHTML}
      <div class="btnrow col">
        ${infoAddButton(e.id)}
        ${pr.count ? `<button class="btn secondary" data-a="openExoChart" data-id="${e.id}">Voir ma progression</button>` : ""}
      </div>
      </div>`;
  },
  // « Ajouter » depuis une fiche : agit sur la séance d'où l'on vient (sélection de la liste,
  // séance en cours, séance proposée ou Ma séance), puis ramène à cette séance
  infoAdd(d){
    const id = d.id, def = EXO_MAP[id]; if(!def) return;
    const ctx = infoContext();
    if(ctx==="picker"){
      if(!picker.multi){ picker.onDone([id]); return; }
      const i = picker.selected.indexOf(id);
      if(i>=0) picker.selected.splice(i,1); else picker.selected.push(id);
      // retour à la liste, sélection visible et bouton « Ajouter n » à jour
      while(sheetStack.length && !sheetStack[sheetStack.length-1].isPicker) sheetStack.pop();
      sheetBack();
      toast(i>=0 ? "Retiré de la sélection" : "Ajouté à la sélection", "check");
      return;
    }
    if(ctx==="live" || ctx==="proposal"){
      if(S.draft.exos.some(x=>x.exoId===id)) return;
      S.draft.exos.push(sessionEntryFor(def));
      save(); closeSheet(); changed();
      toast(ctx==="live" ? "Ajouté à la séance en cours" : "Ajouté à la séance proposée", "check");
      return;
    }
    ACT.addToCustom({ id });
  },
  addToCustom(d){
    if(S.custom.exos.some(x=>x.exoId===d.id)) return;
    S.custom.exos.push({ exoId:d.id, sets:EXO_MAP[d.id].sets });
    freshIds.add(d.id);
    save(); closeSheet(); changed(); toast("Ajouté à Ma séance");
  },

  finishSession(){
    const all = S.draft.exos.reduce((t,e)=>t+e.sets.length,0);
    const done = S.draft.exos.reduce((t,e)=>t+e.sets.filter(s=>s.done).length,0);
    if(!done){
      confirmSheet({ title:"Aucune série validée", html:"Il n'y a rien à enregistrer. Abandonner la séance ?", ok:"Abandonner", danger:true,
        onOk:()=>{ S.draft=null; liveFocusIdx=0; stopRestTimer(); save(); renderViewAnimated("today"); } });
    } else if(done<all){
      confirmSheet({ title:"Terminer la séance ?", html:`${all-done} série${all-done>1?"s":""} non validée${all-done>1?"s":""} ne ser${all-done>1?"ont":"a"} pas enregistrée${all-done>1?"s":""}.`, ok:"Terminer", onOk:finalizeSession });
    } else finalizeSession();
  },
  abandonSession(){
    confirmSheet({ title:"Abandonner la séance ?", html:"La progression de cette séance sera perdue.", ok:"Abandonner", danger:true,
      onOk:()=>{ S.draft=null; liveFocusIdx=0; stopRestTimer(); save(); renderViewAnimated("today"); } });
  },
});
VIEWS.today = renderToday;

// ---------- corriger une série déjà validée (v4.0) ----------
// Répétitions et charge ajustables, ou validation annulée (la série redevient à faire). Le record
// de la série est recalculé avec la même règle qu'en direct.
function draftSetIsPR(ex, si){
  const st = ex.sets[si], w = st.weight||0, r = st.reps||0, prev = ex.sets.filter((s,i)=>s.done && i<si);
  const beats = w>Math.max(0,...prev.map(s=>s.weight||0)) || estimated1RM(w,r)>Math.max(0,...prev.map(s=>estimated1RM(s.weight||0,s.reps||0)))+0.01;
  return !!((w||r) && beats && isNewPR(ex.exoId, w, r));
}
function setPRFlag(ex, si){
  const st = ex.sets[si], was = !!st.pr, now = st.done && draftSetIsPR(ex, si);
  if(was!==now){ st.pr = now || undefined; if(!now) delete st.pr; S.meta.prCount = Math.max(0, (S.meta.prCount||0) + (now?1:-1)); }
}
function doneSetsBodyHTML(exi){
  const ex = S.draft && S.draft.exos[exi]; if(!ex) return "";
  const def = EXO_MAP[ex.exoId], lt = loadableTypeOf(def), unit = isTimed(def) ? "s" : "reps";
  const rows = ex.sets.map((s,si)=>!s.done ? "" : `<div class="row ds-row">
      <span class="ds-n">${si+1}</span>
      <div class="ds-f"><div class="mini-step"><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="reps" data-d="-1" aria-label="Moins de ${unit}">−</button><span>${s.reps||0}</span><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="reps" data-d="1" aria-label="Plus de ${unit}">+</button></div><small>${unit}</small></div>
      ${lt ? `<div class="ds-f"><div class="mini-step"><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="weight" data-d="-1" aria-label="Moins lourd">−</button><span>${lt==="bands" ? esc(bandLabel(s.weight||1)).slice(0,6) : fmtDec(s.weight||0)}</span><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="weight" data-d="1" aria-label="Plus lourd">+</button></div><small>${lt==="bands"?"élastique":"kg"}</small></div>` : ""}
      ${s.pr ? `<span class="ds-pr" title="Record">${ii("bolt")}</span>` : ""}
      <button class="icon-btn ds-undo" data-a="dsUndo" data-exi="${exi}" data-si="${si}" aria-label="Annuler la validation de la série ${si+1}">${icon("undo")}</button>
    </div>`).join("");
  return `<p class="hr-note" style="margin:0 20px 12px">Ajuste une série validée par erreur, ou annule sa validation : elle redeviendra la prochaine à faire.</p><div class="group">${rows || `<div class="row"><div class="grow s">Aucune série validée.</div></div>`}</div>`;
}
function openDoneSets(exi){
  const def = EXO_MAP[S.draft.exos[exi].exoId];
  openSheet(`<div class="sheet-hd"><span class="t">Séries faites · ${esc(def.n)}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body" id="dsBody">${doneSetsBodyHTML(exi)}</div>`);
}
Object.assign(ACT, {
  editDoneSets(d){ if(S.draft && S.draft.exos[+d.exi]) openDoneSets(+d.exi); },
  dsStep(d){
    const exi = +d.exi, si = +d.si, ex = S.draft && S.draft.exos[exi]; if(!ex || !ex.sets[si] || !ex.sets[si].done) return;
    const st = ex.sets[si], def = EXO_MAP[ex.exoId], dir = parseInt(d.d,10);
    if(d.f==="reps") st.reps = Math.min(9999, Math.max(0, (st.reps||0)+dir*(isTimed(def) ? 5 : 1)));
    else st.weight = stepWeightValue(def, st.weight||0, dir);
    ex.sets.forEach((s,i)=>{ if(s.done && i>=si) setPRFlag(ex, i); });
    sfx("step", dir>0); save(); refreshFocusRegion();
    const b = qs("#dsBody"); if(b) b.innerHTML = doneSetsBodyHTML(exi);
  },
  dsUndo(d){
    const exi = +d.exi, si = +d.si, ex = S.draft && S.draft.exos[exi]; if(!ex || !ex.sets[si]) return;
    const st = ex.sets[si];
    if(st.pr){ S.meta.prCount = Math.max(0, (S.meta.prCount||0)-1); delete st.pr; }
    st.done = false; delete st.effort;
    ex.sets.forEach((s,i)=>{ if(s.done && i>si) setPRFlag(ex, i); });
    if(restState && restState.src && restState.src.exi===exi && restState.src.si===si) stopRestTimer();
    liveFocusIdx = exi; sfx("remove"); save(); refreshFocusRegion();
    const b = qs("#dsBody");
    if(!ex.sets.some(s=>s.done)) closeSheet(); else if(b) b.innerHTML = doneSetsBodyHTML(exi);
    toast(`Série ${si+1} à refaire`);
  },
});
