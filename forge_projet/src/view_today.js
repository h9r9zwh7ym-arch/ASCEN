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
let savedFresh = false; // repos qui suit une validation : la coche « Série N enregistrée » se dessine une fois
let customEdit = false; // carte du jour : « Modifier » rend la liste éditable (séries, retrait, ajout, enregistrement)
let heroSnap = null;     // la séance telle qu'avant « Modifier » / « Ajuster » : « Annuler » y revient
function editSnap(){ if(!customEdit) heroSnap = { custom: clone(S.custom) }; }
let heroAll = false;    // carte du jour : « Voir les N exercices » déplié

function fmtDuration(sec){
  if(sec<60) return `${sec} s`;
  const m = Math.round(sec/60);
  if(m<60) return `${m} min`;
  return `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`;
}
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
// Ce que la carte « Cette semaine » ne dit pas déjà : la semaine, la série en jeu, le retour en force et la
// promesse du jour sont dans la carte (refonte 5.0 : pas de doublon) ; restent les alertes de force,
// le record à battre et le trophée presque gagné.
function nextGoal(){
  const da = S.settings.trend!==false && typeof detrainAlerts==="function" ? detrainAlerts()[0] : null;
  // un muscle qui perd vraiment de la force (plus de 3 semaines sans séance) reste l'alerte la plus importante
  if(da && da.losing && da.pct>0) return { ic:"warn", pct:null, warn:true, act:'data-a="progressGo" data-v="force"', t:`${da.label} : ${da.m.days} jours sans séance, force estimée −${da.pct} %` };
  // un muscle délaissé : l'indice de force va baisser (ou baisse déjà), comme l'alerte d'une montre de sport
  if(da) return { ic:da.losing ? "warn" : "clock", pct:null, warn:da.losing, act:'data-a="progressGo" data-v="force"',
    t: da.losing ? `${da.label} : ${da.m.days} jours sans séance, l'indice commence à baisser` : `${da.label} : ${da.m.days} jours sans séance, l'indice baisse dans ${nb(da.left,"jour")}` };
  // le record à battre dans la séance prête (composée ou prévue aujourd'hui)
  if(!sessionsToday().length){
    const ids = (S.custom.exos.length ? S.custom.exos : (plannedTemplate()||{exos:[]}).exos).map(e=>e.exoId);
    for(const id of ids){ const def = EXO_MAP[id]; if(!def || isStretch(def) || !kgType(def)) continue;
      const b = bestSetEver(id, def); if(!b || !b.w) continue;
      return { ic:"bolt", pct:null, act:`data-a="showExoInfo" data-id="${id}"`, t:`Record à battre aujourd'hui · ${def.n} : ${b.r} × ${fmtDec(b.w)} kg` }; }
  }
  // un trophée presque gagné (au moins 60 % du chemin vers le palier suivant)
  let best = null;
  if(typeof MEDALS!=="undefined") MEDALS.forEach(m=>{ if(m.secret) return; const p = medalProgress(m);
    if(p.next==null || p.pct<.6 || p.pct>=1) return; if(!best || p.pct>best.p.pct) best = { m, p }; });
  if(best){ const { m, p } = best, rest = p.next - p.v;
    return { ic:"trophy", pct:p.pct, act:`data-a="showMedal" data-id="${m.id}"`,
      t:`${TIERS[p.t+1].n} « ${m.n} » : plus que ${fmtMedalVal(m, rest)} ${medalUnit(m, rest)}` }; }
  return null;
}
function nextGoalHTML(){
  if(S.settings.nextGoal===false) return "";
  const g = nextGoal(); if(!g) return "";
  const ring = g.pct==null ? "" : `<span class="gl-ring" style="--p:${Math.round(g.pct*100)}" aria-hidden="true"></span>`;
  return `<button class="goal-line ${g.warn?"warn":""} stagger" style="--i:1" ${g.act}><span class="gl-ic">${ii(g.ic)}</span><span class="gl-t"><small>${g.warn ? "À surveiller" : "Prochain cap"}</small>${esc(g.t)}</span>${ring}</button>`;
}
// rattrapage : une séance prévue cette semaine a été manquée ; on propose de la faire aujourd'hui
// (seulement s'il n'y a rien de prévu aujourd'hui ni de séance déjà faite)
function missedCardHTML(){
  if(sessionsToday().length || plannedTemplate() || (S.draft && S.draft.startedAt)) return "";
  const m = missedPlanned(); if(!m) return "";
  return `<div class="dl-card miss stagger" style="--i:1">
    <span class="dl-ic">${ii("repeat")}</span>
    <div class="dl-main"><div class="dl-t">Séance manquée : ${esc(m.t.n)}</div>
      <div class="dl-s">Prévue ${JOURS[parseISO(m.iso).getDay()]}. Une séance décalée vaut bien mieux qu'une séance sautée.</div>
      <div class="dl-act"><button class="btn sm" data-a="missCatchUp" data-id="${m.t.id}">La faire aujourd'hui</button><button class="btn tertiary sm" data-a="missSkip" data-iso="${m.iso}" data-id="${m.t.id}">Laisser passer</button></div></div>
  </div>`;
}
// dose d'un exercice : « 3 × 8–12 reps », « 3 × 30 s », étirements en secondes
function tplDose(exoId, sets){
  const d = EXO_MAP[exoId]; if(!d) return "";
  if(isStretch(d)) return `${d.repsMin===d.repsMax ? d.repsMin : d.repsMin+"–"+d.repsMax} s${d.uni ? " · chaque côté" : ""}`;
  return `${sets} × ${d.repsMin===d.repsMax ? d.repsMin : d.repsMin+"–"+d.repsMax}${isTimed(d) ? " s" : " rép."}`;
}
function propDose(ex){
  const def = EXO_MAP[ex.exoId], r = ex.targetReps, rl = r[0]===r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`;
  return isStretch(def) ? `${rl} s${def.uni ? " · chaque côté" : ""}` : `${ex.targetSets} × ${rl}${isTimed(def) ? " s" : " rép."}${ex.sets[0]&&ex.sets[0].weight?" · "+fmtLoad(def, ex.sets[0].weight):""}`;
}
// la liste de la carte du jour : trois exercices, puis « Voir les N exercices » (déplié sur place) ;
// toucher un exercice ouvre sa fiche
function heroListHTML(entries){
  const rows = entries.map((e,i)=>{ const d = EXO_MAP[e.id]; if(!d) return "";
    return `<button class="hl-row${i>=3?" more":""}" data-a="showExoInfo" data-id="${d.id}" aria-label="${esc(d.n)}, ${esc(e.dose)} : voir la fiche">${exoIcon(d)}<span class="hl-txt"><span class="t">${esc(d.n)}</span><span class="s">${esc(e.dose)}</span></span></button>`; }).join("");
  const n = entries.length;
  return `<div class="hero-list${heroAll ? " all" : ""}">${rows}${n>3 ? `<button class="hl-toggle" data-a="heroMore" aria-expanded="${heroAll}">${heroAll ? "Voir moins" : `Voir les ${n} exercices`}</button>` : ""}</div>`;
}
// Séance du jour déjà faite : une ligne d'état compacte (le détail est à un toucher)
function doneCardHTML(){
  const today = sessionsToday(); if(!today.length) return "";
  const s = today[today.length-1];
  return `<button class="hero done stagger" style="--i:2" data-a="openSessionDetail" data-id="${s.id}" aria-label="Séance du jour faite : ${esc(sessionTitle(s))}, voir le détail">
    <span class="hero-badge">${icon("check")}</span>
    <span class="hd-main"><span class="hero-eyebrow">Séance du jour faite</span>
      <span class="hero-title">${esc(sessionTitle(s))}</span>
      <span class="hero-meta"><span>${fmtDuration(s.durationSec||0)}</span><span>${nb(sessionSetCount(s),"série")}</span><span>${sessionVolume(s) ? fmtKg(sessionVolume(s)) : sessionReps(s)+" rép."}</span></span></span>
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
      <div class="hero-hd"><span class="hero-title">Compose ta séance</span></div>
      ${pend ? `<span class="hero-sub">Pour le ${pendingDaysLabel()}</span>` : ""}
      <button class="hero-go" data-a="customAddOpen">Choisir mes exercices</button>
      ${appPicksOn() ? `<button class="hero-alt" data-a="todayMode" data-v="proposal">Ou laisse l'app choisir</button>` : S.templates.length ? `<button class="hero-alt" data-a="chooseSession">Choisir une autre séance</button>` : ""}
    </div>`;
  }
  let tag = "", title, meta, entries, act, mod = "";
  const planned = plannedTemplate();
  if(kind==="planned"){
    title = esc(planned.n);
    entries = planned.exos.map(e=>({ id:e.exoId, dose:tplDose(e.exoId, e.sets) }));
    meta = [nb(planned.exos.length, "exercice"), nb(planned.exos.reduce((a,e)=>a+e.sets,0), "série"), `≈ ${tplMinutes(planned)} min`];
    act = `data-a="startTemplate" data-id="${planned.id}"`;
    mod = `<button class="hero-mod" data-a="heroEditPlanned" data-id="${planned.id}">Modifier</button>`;
  } else if(kind==="custom"){
    tag = !customEdit && customDiffers(customTpl()) ? "Modifiée pour aujourd'hui" : "";
    title = esc(S.custom.name||"Ma séance");
    entries = S.custom.exos.map(e=>({ id:e.exoId, dose:tplDose(e.exoId, e.sets) }));
    meta = [nb(entries.length, "exercice"), nb(S.custom.exos.reduce((a,e)=>a+e.sets,0), "série"), `≈ ${estimateMinutes({ exos:S.custom.exos.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) })} min`];
    act = `data-a="startCustom"`;
    mod = `<button class="hero-mod" data-a="heroEdit">Modifier</button>`;
  } else {
    const t = SESSION_TYPE_MAP[draft.type]||SESSION_TYPES[0], rt = SESSION_TYPE_MAP[draft.resolvedType];
    tag = draft.source==="imported" ? "Programme importé" : "Proposée par l'app";
    title = draft.source==="imported" ? esc(draft.name||"Séance importée") : draft.type==="auto" && rt ? rt.n : t.n;
    entries = draft.exos.map(ex=>({ id:ex.exoId, dose:propDose(ex) }));
    meta = [nb(mainExos(draft).length, "exercice"), nb(mainExos(draft).reduce((t,e)=>t+e.sets.length,0), "série"), `≈ ${estimateMinutes(draft)} min`];
    act = `data-a="startSession"`;
    mod = `<button class="hero-mod" data-a="propAdjust" aria-expanded="false">Ajuster</button>`;
  }
  // en édition (Modifier, Ajuster), la liste éditable suit la carte : la carte ne la répète pas, et on ne
  // lance rien d'ici. On modifie, « OK », puis « Commencer » (comme l'édition d'une liste sur iOS)
  const editing = (kind==="custom" && customEdit) || (kind==="proposal" && (propAdjust || !draft.exos.length));
  // en édition : un seul bouton, « OK », à la place de « Modifier » ; s'il y a eu des changements, c'est la
  // feuille d'actions qui propose de les garder ou de les annuler. La liste éditable suit, collée à la carte.
  if(editing) mod = `<button class="hero-mod on" data-a="${kind==="custom" ? "heroEdit" : "propAdjust"}"${kind==="custom" ? "" : ` aria-expanded="true"`}>OK</button>`;
  return `<div class="hero ${kind}${editing ? " editing" : ""} stagger" style="--i:2">
    <div class="hero-hd"><span class="hero-title">${title}</span>${mod}</div>
    <span class="hero-meta">${tag ? `<span class="hero-tag">${tag}</span>` : ""}${meta.map(m=>`<span>${m}</span>`).join("")}</span>
    ${editing ? "" : `${heroListHTML(entries)}
    <button class="hero-go" ${act}>Commencer</button>
    <button class="hero-alt" data-a="chooseSession">Choisir une autre séance</button>`}
  </div>`;
}
// Un seul rappel à la fois, en bas de l'accueil : la sauvegarde d'abord, sinon le Rewind du mois écoulé
function nudgeHTML(){
  if(backupDue()) return `<div class="backup-nudge stagger" style="--i:7">${sfIcon("download","green")}<div class="grow"><div class="t">Sauvegarde conseillée</div><div class="s">${S.sessions.length} séances sont stockées uniquement sur ce téléphone.</div></div><div class="bn-act"><button data-a="backupData">Sauvegarder</button><button class="later" data-a="backupLater">Plus tard</button></div></div>`;
  const rk = recapNudgeKey();
  if(rk) return `<div class="backup-nudge rc-nudge stagger" style="--i:7">${sfIcon("sparkles","orange")}<div class="grow"><div class="t">Ton Rewind ${deMois(MOIS_LONG[parseISO(rk+"-01").getMonth()])} est prêt</div><div class="s">Revis ton mois en une minute.</div></div><div class="bn-act"><button data-a="openRewind" data-kind="month" data-key="${rk}">Lancer</button><button class="later" data-a="recapLater">Plus tard</button></div></div>`;
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
    ${deloadCardHTML() || missedCardHTML() || nextGoalHTML()}
    ${whyReminder() && !sessionsToday().length ? `<div class="why-card stagger" style="--i:2"><div class="why-k">${ii("flame")} Ton pourquoi</div><div class="why-t">« ${esc(whyReminder())} »</div><div class="why-s">${daysSinceLastSession()} jours sans séance : une seule suffit pour reprendre le fil.</div><button class="btn secondary sm why-go" data-a="startExpress">${icon("timer")} Séance express · 10 min</button></div>` : ""}
    ${sessionsToday().length ? doneCardHTML() : ""}
    <div class="seg-pane ${mode} ${paneDir?"from-"+paneDir:""}">${sessionsToday().length ? "" : heroHTML(mode, draft)}${mode==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}</div>
    ${weekCardHTML()}
    ${templatesHTML()}
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

// La séance proposée : d'abord la liste, simple (toucher un exercice ouvre sa fiche), avec deux gestes à portée :
// « Autre proposition » et « Ajuster ». Ajuster déplie les réglages fins (type de séance, nombre d'exercices,
// remplacer ou retirer un exercice, en ajouter un) : peu de choix à la fois (loi de Hick), tout reste à un toucher.
let propAdjust = false;
function proposalPaneHTML(draft){
  const imported = draft.source==="imported", adj = propAdjust || !draft.exos.length;
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
    const stim = draft.stim ? `<div class="pc-stim">${ii("target")}<span>${esc(draft.stim)}</span></div>` : "";
    hero = heroShown ? (draft.reason || stim ? `<div class="pc-inline stagger" style="--i:5">${draft.reason ? esc(draft.reason) : ""}${stim}</div>` : "") : `<div class="plan-card stagger" style="--i:5">
      <div class="pc-eyebrow">${draft.type==="auto"?"Choisie pour toi":"Séance proposée"}</div>
      <div class="pc-title">${title}</div>
      ${draft.reason?`<div class="pc-reason">${esc(draft.reason)}</div>`:""}${stim}
      ${draft.exos.length?`<div class="pc-meta"><span>${nb(mainExos(draft).length, "exercice")}</span><span>${nb(mainExos(draft).reduce((t,e)=>t+e.sets.length,0), "série")}</span><span>≈ ${estimateMinutes(draft)} min</span></div>
      <div class="pc-muscles">${focus.map(m=>`<span>${MUSCLE_MAP[m].n}</span>`).join("")}</div>`:""}
    </div>`;
  }
  const types = adj && !imported ? `<div class="type-scroll">${typeChips}</div>` : "";
  if(!draft.exos.length){
    return `${types}${hero}
      ${emptyHTML("toolbox", "Aucun exercice possible", "Pas d'exercice pour ce type de séance avec ton matériel. Essaie un autre type, ou complète ton matériel dans le Profil.")}`;
  }
  // exercices de force, puis (si le réglage est actif) le bloc d'étirements dans sa propre section
  if(heroShown && !adj) return hero; // « Autre proposition » est dans « Choisir une autre séance »
  const rowOf = (ex,i)=>exoRowHTML(EXO_MAP[ex.exoId], propDose(ex), i, adj ?
    `<button class="icon-btn" aria-label="Remplacer ${esc((EXO_MAP[ex.exoId]||{}).n||"")}" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
     <button class="icon-btn" aria-label="Retirer ${esc((EXO_MAP[ex.exoId]||{}).n||"")}" data-a="removeExo" data-idx="${i}">${icon("close")}</button>` : "");
  const main = mainExos(draft), mainN = main.length;
  const rows = draft.exos.map((ex,i)=>isStretchEntry(ex) ? "" : rowOf(ex,i)).join("");
  const coolRows = draft.exos.map((ex,i)=>isStretchEntry(ex) ? rowOf(ex,i) : "").join("");
  freshIds = new Set();
  const glued = heroShown && adj;   // collée à la carte du jour en édition
  return `${glued ? `<div class="group prop-list adj">${rows}</div>` : ""}
    ${glued ? "" : types}
    ${glued ? "" : hero}
    ${adj ? `<div class="exo-count">
      <div class="ec-t"><b>${mainN}</b> exercice${mainN>1?"s":""} · ${main.reduce((t,e)=>t+e.sets.length,0)} séries · ≈ ${estimateMinutes(draft)} min</div>
      <div class="mini-step"><button aria-label="Un exercice de moins" data-a="draftCount" data-d="-1" ${mainN<=1?"disabled":""}>−</button><span>${mainN}</span><button aria-label="Un exercice de plus" data-a="draftCount" data-d="1" ${draft.exos.length>=10?"disabled":""}>+</button></div>
    </div>
    ${!imported && mainN < Math.min(sessionSize(), draft.resolvedType==="core"?5:10) ? `<div class="ec-limit">Ton matériel limite ce type de séance à ${mainN} exercice${mainN>1?"s":""}. Le « + » ajoute un exercice d'un autre groupe.</div>` : ""}` : ""}
    ${glued ? types : `<div class="group prop-list ${adj?"adj":""}" style="margin-top:8px">${rows}</div>`}
    ${coolRows ? `<div class="cool-h">${ii("leaf")}<span>Étirements · retour au calme</span></div><div class="group cool-group">${coolRows}</div>` : ""}
    <div class="btnrow">
      ${adj ? `<button class="btn tertiary sm" data-a="addExoOpen">${icon("plus")} Ajouter</button>` : ""}
      ${imported?"":`<button class="btn tertiary sm" data-a="regenSession">${icon("repeat")} Autre proposition</button>`}
      ${heroShown ? "" : `<button class="btn tertiary sm ${adj?"strong":""}" data-a="propAdjust" aria-expanded="${adj}">${adj ? `${icon("check")} Terminé` : `${icon("edit")} Ajuster`}</button>`}
    </div>
    ${heroShown ? "" : `<div class="btnrow"><button class="btn big" data-a="startSession">${icon("play")} Commencer cette séance</button></div>`}`;
}

// ---------- séances enregistrées & planning ----------
function uiState(){ return S.settings.ui || (S.settings.ui = { planOpen:true }); }
let openTpls = new Set();   // séances enregistrées dépliées

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


// ---------- « Cette semaine » : la montagne et la semaine dans une seule carte ----------
// En haut, la vraie scène de la montagne (view_ascent.js : chargée après l'affichage, puis gardée en image),
// où l'on en est et la jauge vers le prochain camp (toucher = Mon ascension). En bas, les 7 jours : fait, prévu,
// manqué (toucher un jour = y placer une séance enregistrée), le compte de la semaine et la série.
function weekCardHTML(){
  const a = ascent(), D = ASC_DATA[a.key], nc = a.nextCamp;
  const c0 = nc ? (a.camps[a.passed-1] || [a.start])[0] : 0;
  const pct = a.wait ? Math.min(1, a.series/Math.max(1, a.nextReq)) : nc ? Math.max(0, Math.min(1, (a.alt-c0)/Math.max(1, nc[0]-c0))) : Math.max(0, Math.min(1, a.done));
  const goal = S.goals.daysPerWeek||3, done = sessionsThisWeek(), si = streakInfo(), streak = si.n;
  const today = todayISO(), monday = weekKey(today), doneDays = new Set(S.sessions.map(s=>s.date)), doneToday = sessionsToday().length;
  // la ligne sous le nom : le retour en force (séance qui compte double), sinon ce que la séance du jour peut
  // faire atteindre, sinon la distance au prochain camp (une seule ligne, plus de « Prochain cap » qui la répète)
  const promise = !doneToday ? ascTodayPromise(a) : null;
  const where = a.comeback && !doneToday ? `Retour en force : séance ×${String(ASC_BACK).replace(".", ",")} jusqu'à ${ascM(a.comeback)}`
    : promise ? (a.wait ? `Dès aujourd'hui : ${ASC_DATA[a.next].n}` : promise.summit ? "Sommet à ta portée aujourd'hui" : `${nc[1]} à ta portée aujourd'hui`)
    : !S.sessions.length ? "Ta première séance te met en route"
    : a.wait ? `Au sommet ${ascDu(a.key)}` : nc ? `${nc[1]} dans ${ascM(nc[0]-a.alt)}` : `Sommet dans ${ascM(D.top-a.alt)}`;
  // la série en jeu : plus de jour de marge pour valider la semaine
  const left = goal-done, daysLeft = 7-weekdayIdx(today) - (doneToday ? 1 : 0);
  const risk = streak>=2 && !a.paused && left>0 && left<=daysLeft && daysLeft-left<=1;
  // animation signature n° 3 : de retour sur l'accueil après une séance, la carte part de là où on l'avait
  // laissée (barre et altitude) et le grimpeur avance (wkClimb, une fois la carte visible)
  wkNow = { key:a.key, alt:a.alt, pct, camp:nc ? nc[1] : "" };
  if(!wkSeen || wkSeen.key!==a.key || a.alt<wkSeen.alt-.5) wkSeen = wkNow;
  const climb = a.alt>wkSeen.alt+.5, via = climb && wkSeen.camp!==wkNow.camp;
  const days = JOURS_COURTS.map((j,i)=>{
    const iso = addDaysISO(monday,i), t = S.templates.find(t=>(t.days||[]).includes(i)), isToday = iso===today;
    // « manquée » seulement si la séance était déjà prévue ce jour-là (pas pour un programme créé après)
    const ok = doneDays.has(iso), missed = t && iso<today && !ok && (!t.since || iso>=t.since);
    const st = ok ? "done" : missed ? "missed" : t ? "plan" : "";
    return `<button class="wk-day ${st}${isToday ? " today" : ""}" data-a="planDay" data-d="${i}" aria-label="${JOURS[(i+1)%7]} ${parseISO(iso).getDate()}${isToday ? ", aujourd'hui" : ""} : ${t ? esc(t.n) : "rien de prévu"}${ok ? ", séance faite" : ""}${missed ? ", séance manquée" : ""}">
      <span class="wk-j" aria-hidden="true">${j.charAt(0)}</span><span class="wk-o">${ok ? icon("check") : ""}</span></button>`;
  }).join("");
  return `<section class="wk-sec stagger" style="--i:4">
    <h2 class="sh wk-h"><span class="sh-t">Cette semaine</span></h2>
    <div class="wk-card">
      <button class="wk-asc" data-a="openAscent" aria-label="Mon ascension : ${esc(D.n)}, ${fmtNum(a.alt)} mètres. ${esc(where)}">
        ${ascStripHTML(a)}
        <span class="wk-row"><span class="wk-n"><b>${esc(D.n)}</b><small${promise || (a.comeback && !doneToday) ? ' class="wk-hot"' : ""}>${esc(where)}</small></span><span class="wk-alt"${climb ? ` data-climb="${Math.round(a.alt)}" data-from="${Math.round(wkSeen.alt)}" data-unit="m"` : ""}>${fmtNum(climb ? wkSeen.alt : a.alt)} m</span><span class="chev">${icon("chev")}</span></span>
        <span class="wk-bar"><i style="width:${((climb ? wkSeen.pct : pct)*100).toFixed(1)}%"${climb ? ` data-to="${(pct*100).toFixed(1)}"${via ? ` data-via="1"` : ""}` : ""}></i></span>
      </button>
      <div class="wk-week">
        <div class="wk-days">${days}</div>
        <div class="wk-foot"><span class="wk-cnt"><b>${done}</b> sur ${goal} séances</span>${risk ? `<span class="wk-risk">${ii("flame")}${streak} sem. d'affilée en jeu</span>` : streak>0 ? `<span>${nb(streak, "semaine")} d'affilée${si.recent ? " · joker utilisé" : ""}</span>` : ""}</div>
      </div>
    </div>
  </section>`;
}
let wkSeen = null, wkNow = null; // { key, alt, pct, camp } : ce que la carte a montré / montre maintenant
function wkClimb(el){
  const bar = qs(".wk-bar i[data-to]", el); if(!bar) return;
  const alt = qs(".wk-alt", el), now = wkNow, t0 = Date.now();
  const go = ()=>{
    if(!bar.isConnected) return;
    wkSeen = now;
    const to = bar.dataset.to+"%";
    alt.dataset.count = alt.dataset.climb; // le défilement ne part que maintenant (pas au rendu, sous la fin de séance)
    if(reducedMotion()){ bar.style.width = to; animateCounts(alt.parentElement); return; }
    bar.classList.add("climb"); alt.classList.add("climb"); animateCounts(alt.parentElement);
    sfx("ascClimb", .9);
    if(bar.dataset.via){
      // un camp franchi : la barre va au bout, puis repart vers le camp suivant
      bar.style.width = "100%";
      setTimeout(()=>{ if(!bar.isConnected) return; bar.classList.remove("climb"); bar.style.width = "0%"; void bar.offsetWidth; bar.classList.add("climb"); bar.style.width = to; sfx("ascCamp"); }, 700);
    } else bar.style.width = to;
    setTimeout(()=>alt.classList.remove("climb"), 1700);
  };
  // la carte doit être réellement vue : onglet Aujourd'hui, rien par-dessus (fin de séance), app au premier plan
  const seen = ()=>currentTab==="today" && !document.hidden && !qs("#overlay.open") && !(S.draft && S.draft.startedAt);
  const wait = ()=>{
    if(!bar.isConnected) return;
    if(Date.now()-t0>300000){ wkSeen = now; bar.style.width = bar.dataset.to+"%"; alt.textContent = fmtNum(+alt.dataset.climb)+" m"; return; }
    if(!seen()){ setTimeout(wait, 400); return; }
    // revérifié au moment de partir : la fin de séance peut s'ouvrir pendant le court délai (l'animation se
    // jouait alors cachée dessous)
    const later = ()=>setTimeout(()=>{ if(seen()) go(); else wait(); }, 350);
    if(!window.IntersectionObserver){ later(); return; }
    const io = new IntersectionObserver(es=>{ if(es.some(x=>x.isIntersecting)){ io.disconnect(); later(); } }, { threshold:.6 });
    io.observe(bar.parentElement);
  };
  if(reducedMotion()) go(); else wait();   // rien ne bouge : inutile d'attendre que la carte soit vue
}
function tplCardHTML(t, i){
  const open = openTpls.has(t.id), region = tplRegion(t), loaded = S.custom.tplId===t.id;
  const list = open ? tplBodyHTML(t) : "";
  return `<div class="tpl-card2 r-${region} ${open?"open":""} ${loaded?"loaded":""} stagger" data-id="${t.id}" style="--i:${Math.min(i+1,10)}">
    <button class="tc-head" data-a="toggleTpl" data-id="${t.id}" aria-expanded="${open}">
      <span class="tc-bar"></span>
      <span class="tc-main">
        <span class="tc-name">${esc(t.n)}${loaded?' <span class="tc-tag">aujourd\'hui</span>':""}</span>
        <span class="tc-more"><span>
          <span class="tc-days">${(t.days||[]).length ? (t.days||[]).slice().sort().map(d=>`<span>${JOURS_COURTS[d]}</span>`).join("") : `<em>pas de jour fixe</em>`}</span>
        </span></span>
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

// toutes les séances, toujours ; chaque carte se déplie sur ses exercices
function tplListHTML(){ return `<div class="tpl-list">${S.templates.map(tplCardHTML).join("")}</div>`; }
function templatesHTML(){
  if(!S.templates.length){
    return `<div class="tpl-section stagger" style="--i:5">
      <div class="tpl-empty">
        <div class="te-ico">${sfIcon("calPlan","red","lg")}</div>
        <div class="te-t">Mes séances</div>
        <div class="te-s">Ajoute une séance à Mes séances et choisis ses jours : elle t'attendra ici le jour venu.</div>
        ${appPicksOn() ? `<button class="btn secondary sm" data-a="weekWizard"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Programme de la semaine</button>` : ""}
      </div>
    </div>`;
  }
  return `<div class="tpl-section stagger" style="--i:5">
    <div class="sec-row"><h2 class="sec-h"><span>Mes séances</span><span class="sec-count">${S.templates.length}</span></h2></div>
    ${tplListHTML()}
    ${appPicksOn() ? `<button class="tpl-add wp-wizard" data-a="weekWizard"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg><span>Programme de la semaine</span></button>` : ""}
  </div>`;
}

// Enregistrer ou non la séance composée : enregistrée, elle rejoint « Mes séances » et, avec des jours, le planning
function pendingDaysLabel(){ return (S.custom.pendingDays||[]).slice().sort().map(d=>JOURS[(d+1)%7]).join(", "); }
// glisser une ligne de Ma séance : nouvel ordre (la séance reste en édition)
SORTS.custom = (i, j)=>ACT.customMove({ idx:i, d:j-i });
// redessine la carte du jour et ce qui la suit, sur place (hauteur animée)
function heroRerender(){
  const v = qs("#v-today"), pane = v && qs(".seg-pane", v), draft = getOrCreateDraft();
  if(!pane || draft.startedAt){ renderView("today"); return; }
  const mode = S.settings.todayTab==="proposal" ? "proposal" : "custom";
  morphHeight(pane, ()=>{ pane.innerHTML = `${sessionsToday().length ? "" : heroHTML(mode, draft)}${mode==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}`; });
  v._ver = DATA_VER;
}
// la séance du jour vient-elle de Mes séances, et en diffère-t-elle ?
function customTpl(){ return S.custom.tplId && S.templates.find(x=>x.id===S.custom.tplId) || null; }
const exoSig = list=>JSON.stringify(list.map(e=>[e.exoId, e.sets]));
function customDiffers(t){ return !!t && exoSig(t.exos)!==exoSig(S.custom.exos); }
function saveRowHTML(){
  // déjà dans Mes séances : le choix (aujourd'hui seulement ou aussi les prochaines fois) se fait à « OK »
  if(customTpl()) return "";
  const pend = S.custom.pendingDays && S.custom.pendingDays.length;
  return `<button class="save-row" data-a="saveTemplateOpen">${sfIcon("bookmarkG","indigo")}<span class="grow"><span class="t">${pend?`Prévoir pour le ${pendingDaysLabel()}`:"Ajouter à Mes séances"}</span></span><span class="chev">${icon("chev")}</span></button>`;
}
function customPaneHTML(){
  const c = S.custom.exos;
  const tail = "";
  const done = sessionsToday().length;
  if(c.length && !done && !customEdit) return "";
  if(!c.length){
    // la carte « Compose ta séance » est la carte principale ; ici seulement si une autre l'occupe
    if(!done && !plannedTemplate()) return tail;
    const pend = S.custom.pendingDays && S.custom.pendingDays.length;
    return `<div class="builder-empty stagger" style="--i:4">
      <div class="be-row"><div class="be-ico">${sfIcon("pencil","orange","lg")}</div>
      <div><div class="be-t">${pend ? "Compose ta séance" : done ? "Encore une séance ?" : "Autre chose en tête ?"}</div>
      ${pend ? `<div class="be-s">Pour le ${pendingDaysLabel()}</div>` : ""}</div></div>
      <div class="be-actions">
        <button class="btn secondary sm" data-a="customAddOpen">${icon("plus")} Choisir</button>
        ${appPicksOn() ? `<button class="btn tertiary sm" data-a="customFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> L'app choisit</button>` : ""}
      </div>
    </div>${tail}`;
  }
  const rows = c.map((e,i)=>{
    const def = EXO_MAP[e.exoId]; if(!def) return "";
    const actions = `<div class="mini-step">
        <button aria-label="Moins de séries" data-a="customSets" data-idx="${i}" data-d="-1">−</button><span>${e.sets}×</span><button aria-label="Plus de séries" data-a="customSets" data-idx="${i}" data-d="1">+</button>
      </div>
      <button class="icon-btn" aria-label="Retirer ${esc(def.n)}" data-a="customRemove" data-idx="${i}">${icon("close")}</button>`;
    return exoRowHTML(def, `${catLabel(def)} · ${MUSCLE_MAP[def.muscles[0]].n}`, i, actions, e.app);
  }).join("");
  freshIds = new Set();
  // la carte principale montre déjà nom, durée et « C'est parti » : ici, seulement la liste à éditer
  const inHero = !done;
  const sets = c.reduce((t,e)=>t+e.sets,0);
  const preview = { exos: c.map(e=>({ exoId:e.exoId, sets:new Array(e.sets).fill(0) })) };
  // dans la carte du jour, la liste continue la carte (même bloc) : pas de titre entre les deux
  return `${inHero ? "" : `<h2 class="sh"><span class="sh-t">${esc(S.custom.name||"Ma séance")}</span><span class="sh-actions"><button class="more danger" data-a="customClear">Vider</button></span></h2>
    <div class="sh-sub">${nb(c.length, "exercice")} · ${nb(sets, "série")} · ≈ ${estimateMinutes(preview)} min</div>`}
    <div class="group builder" data-sort="custom">${rows}</div>
    <div class="btnrow">
      <button class="btn tertiary sm" data-a="customAddOpen">${icon("plus")} Ajouter</button>
      ${appPicksOn() ? `<button class="btn tertiary sm" data-a="customFill"><svg class="spk" viewBox="0 0 24 24">${ICONS.sparkle}</svg> Compléter</button>` : ""}
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
  openSheet(`<div class="sheet-hd${picker.onCancel?" te-hd":""}">${picker.onCancel?`<button class="te-cancel" data-a="pickerCancel">${icon("chev")}<span>Retour</span></button>`:""}<span class="t">${esc(picker.title)}</span>${picker.onCancel?`<span class="te-spacer"></span>`:`<button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button>`}</div>
    <div class="picker-top">
      <label class="search">${icon("search")}<input id="pickerSearch" type="search" placeholder="Rechercher un exercice" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></label>
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
function exoDose(e){ const [a,b] = repRangeForGoal(e); return `${e.sets} × ${a}–${b}${isTimed(e) ? " s" : " rép."}`; }
function pickerListHTML(){
  const q = normName(picker.q);
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  const favOnly = picker.cat==="fav";
  const pool = availableExos().filter(e=>!picker.exclude.has(e.id)
    && (!picker.muscle || e.muscles.includes(picker.muscle))
    && (!picker.cat || (favOnly ? isIncluded(e.id) : exoCategory(e)===picker.cat))
    && (!q || normName(e.n+" "+e.aka+" "+(EXO_ALIAS[e.id]||"")).includes(q) || e.muscles.some(m=>normName(MUSCLE_MAP[m].n).includes(q))));
  if(!pool.length) return emptyHTML("search", "Aucun résultat", "Vérifie l'orthographe ou essaie un autre mot.");
  // favoris en tête (sans recherche ni filtre de matériel) : ils restent aussi dans leur catégorie
  const favs = favOnly || picker.cat ? [] : pool.filter(e=>isIncluded(e.id)).sort((a,b)=>a.n.localeCompare(b.n,"fr"));
  const favBlock = favs.length ? `<div class="pick-h fav">${sfIcon("star","yellow","sm")} Favoris <span class="pick-n">${favs.length}</span></div><div class="group">${favs.map(e=>pickRowHTML(e)).join("")}</div>` : "";
  // tes habituels : les exercices que tu fais le plus ces deux derniers mois, en tête (loi de Hick : on choisit
  // d'abord parmi quelques exercices connus, le catalogue complet reste en dessous)
  const ids = new Set(pool.map(e=>e.id)), hab = q || picker.cat ? [] : habitualExos().filter(id=>ids.has(id) && !isIncluded(id)).slice(0, 6).map(id=>EXO_MAP[id]);
  const habBlock = hab.length ? `<div class="pick-h hab">${sfIcon("history","blue","sm")} Habituels <span class="pick-n">${hab.length}</span></div><div class="group">${hab.map(e=>pickRowHTML(e)).join("")}</div>` : "";
  return favBlock + habBlock + EXO_CATS.map(c=>{
    const list = pool.filter(e=>exoCategory(e)===c.id).sort((a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr"));
    if(!list.length) return "";
    let lastM = null;
    return `<div class="pick-h">${sfIcon(EQUIP_GLYPH[c.id]||"wrench", "gray","sm")} ${esc(c.n)} <span class="pick-n">${list.length}</span></div><div class="group">${list.map(e=>{
      const m = e.muscles[0], sub = m!==lastM ? `<div class="pick-m">${esc(MUSCLE_MAP[m].n)}</div>` : ""; lastM = m;
      return sub + pickRowHTML(e);
    }).join("")}</div>`;
  }).join("");
}
// exercices les plus faits sur les 60 derniers jours (au moins 2 séances), du plus fréquent au moins fréquent
function habitualExos(){
  return memo("habitual:"+todayISO(), ()=>{
    const from = addDaysISO(todayISO(), -60), c = {};
    S.sessions.forEach(s=>{ if(s.date<from) return; new Set(s.exos.map(ex=>ex.exoId)).forEach(id=>{ c[id] = (c[id]||0) + 1; }); });
    return Object.keys(c).filter(id=>c[id]>=2 && EXO_MAP[id]).sort((a, b)=>c[b]-c[a]);
  });
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
// un exercice peut figurer deux fois (favoris ou habituels, et sa catégorie) : toutes ses lignes suivent
function pickerSyncRows(id, on){
  qsa(`.pick-row[data-id="${id}"]`).forEach(row=>{ row.classList.toggle("on", on); const c = qs(".pick-check",row); if(c) c.innerHTML = on ? icon("check") : ""; });
}
function refreshPickerFooter(){
  const b = qs("#pickerDone"); if(!b) return;
  const n = picker.selected.length;
  b.disabled = !n;
  b.textContent = n ? `Ajouter ${n} exercice${n>1?"s":""}` : "Ajouter";
}

// ---------- séance en cours ----------
// Refonte (séance) : un écran sombre, une chose à la fois. En haut le nom et le chrono, « Terminer » ;
// la barre (un segment par exercice) ouvre la liste de la séance ; l'altitude en dessous. Changer
// d'exercice : glisser la carte, toucher « À suivre » ou un exercice de la liste.
function renderTodayLive(draft){
  const top = `<div class="sx-top"><div class="sx-clock"><small>${esc(liveName(draft))}</small><span id="liveClock">${fmtClock(liveElapsed(draft))}</span></div>
    <button class="sx-end nb-done" data-a="finishSession">Terminer</button></div>`;
  if(!draft.exos.length){
    return `<div class="content live sx">${top}${emptyHTML("toolbox", "Plus d'exercice", "Tous les exercices ont été retirés. Ajoute-en un pour continuer.")}
    <div class="btnrow">${hxBtn("btn", 'data-a="addExoOpen"', `${icon("plus")} Ajouter un exercice`)}</div></div>`;
  }
  return `<div class="content live sx">${top}
    <div class="live-head" id="liveHead">${liveHeadHTML(draft)}</div>
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
// chrono affiché : figé à la dernière série validée quand tout est fait (la séance est finie, même si
// l'enregistrement attend)
function liveElapsed(draft){
  const last = +draft.lastSetAt || 0;
  return last && !liveCounts(draft).left ? Math.max(0, Math.round((last-Date.parse(draft.startedAt))/1000)) : elapsedSec(draft);
}
function liveHeadHTML(draft){
  const c = liveCounts(draft), n = draft.exos.length, cur = Math.min(liveFocusIdx, n-1);
  const segs = draft.exos.map((e,i)=>{
    const d = e.sets.filter(s=>s.done).length, k = e.sets.length;
    return `<span class="lp-seg ${i===cur?"current":""} ${d===k?"full":""}"><i style="width:${Math.round(d/k*100)}%"></i></span>`;
  }).join("");
  return `<button class="lp-bar" style="--n:${n}" data-a="openOverview" aria-label="Exercice ${cur+1} sur ${n}, ${c.done} ${c.done>1?"séries":"série"} sur ${c.total} ${c.done>1?"faites":"faite"}. Voir les exercices de la séance">${segs}</button>
    ${typeof liveAscHTML==="function" ? liveAscHTML(draft) : ""}`;
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
// chronomètre de séance : une seule mise à jour du texte par seconde
setInterval(()=>{
  const c = document.getElementById("liveClock");
  if(c && S.draft && S.draft.startedAt) c.textContent = fmtClock(liveElapsed(S.draft));
}, 1000);

// anneau du repos : grand, le temps au centre ; à zéro il passe à l'orange (« C'est reparti ») un court instant
const RING_R = 112, RING_C = 2*Math.PI*RING_R;
function ringSVG(remain, total, label){
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  return `<div class="ring-wrap sx-ring"><svg viewBox="0 0 248 248" aria-hidden="true">
    <circle class="ring-bg" cx="124" cy="124" r="${RING_R}"/>
    <circle class="ring-fg" id="ringFg" cx="124" cy="124" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C*(1-frac)).toFixed(1)}"/>
  </svg><div class="ring-label"><div class="ring-sub" id="ringSub">${label||"Repos"}</div><div class="ring-time" id="ringTime" role="timer">${fmtMMSS(Math.max(0,remain))}</div></div></div>`;
}
function updateFocusRing(remain, total){
  const t = qs("#ringTime"), fg = qs("#ringFg");
  if(!t || !fg) return;
  t.textContent = fmtMMSS(Math.max(0,remain));
  const frac = total>0 ? Math.max(0,remain)/total : 0;
  fg.setAttribute("stroke-dashoffset", (RING_C*(1-frac)).toFixed(1));
}
function ringOver(on){
  const w = qs(".sx-ring"); if(!w) return false;
  w.classList.toggle("over", on!==false); w.classList.remove("ending");
  const s = qs("#ringSub"), t = qs("#ringTime"), fg = qs("#ringFg");
  if(s) s.textContent = on===false ? "Repos" : "C'est reparti";
  // l'anneau se remplit d'un coup, en orange : c'est le signal
  if(on!==false){ if(t) t.textContent = "0:00"; if(fg) fg.setAttribute("stroke-dashoffset", "0"); }
  return true;
}

function renderFocusRegionInner(draft){
  const idx = Math.min(liveFocusIdx, draft.exos.length-1);
  liveFocusIdx = idx;
  const ex = draft.exos[idx], def = EXO_MAP[ex.exoId];
  if(warmPending(draft)) return warmCardHTML(draft);
  if(!liveCounts(draft).left) return sessionCompleteHTML(draft);
  return renderFocusCard(idx, ex, def);
}
// « À suivre » : une ligne qui mène à l'exercice suivant (ou qui dit que c'est le dernier)
function upNextHTML(idx){
  const ex = S.draft.exos[idx];
  const curDone = ex.sets.every(s=>s.done);
  const ni = nextUndone(idx);
  if(ni<0 || (ni===idx)) return curDone || ni<0 ? "" : `<div class="sx-next last">Dernier exercice : tu y es presque</div>`;
  if(curDone) return ""; // le bouton « Exercice suivant » de la carte fait déjà le travail
  const def = EXO_MAP[S.draft.exos[ni].exoId];
  return `<button class="sx-next up-next" data-a="focusJump" data-idx="${ni}"><span>À suivre :</span> <b class="un-t">${esc(def.n)}</b></button>`;
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
      <div><b>${fmtClock(liveElapsed(draft))}</b><small>durée</small></div>
      <div><b>${vol ? fmtNum(Math.round(vol)) : draft.exos.length}</b><small>${vol ? "kg soulevés" : "exercices"}</small></div>
      ${prs?`<div><b>${prs}</b><small>record${prs>1?"s":""}</small></div>`:""}
    </div>
    <button class="btn big" data-a="finishSession">${icon("check")} Enregistrer la séance</button>
    ${hxBtn("btn ghost sm", 'style="margin-top:6px" data-a="addExoOpen"', `${icon("plus")} Ajouter un exercice`)}
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
  return `<div class="focus-card holding sx-card sx-hold r-${regionOf(def)} ${animClass}">${header}
    <div class="fc-phase">${prep?"Mets-toi en position":"Tiens bon !"} · série ${si+1} / ${ex.sets.length}</div>
    <div class="ring-wrap hold-wrap ${prep?"prep":""}"><svg viewBox="0 0 172 172">
      <circle class="ring-bg" cx="86" cy="86" r="${HOLD_R}"/>
      <circle class="ring-fg" id="holdFg" cx="86" cy="86" r="${HOLD_R}" stroke-dasharray="${HOLD_C.toFixed(1)}" stroke-dashoffset="${prep?HOLD_C.toFixed(1):"0"}"/>
    </svg><div class="ring-label"><div class="ring-time" id="holdTime">${prep?left:fmtMMSS(left)}</div><div class="ring-sub" id="holdSub">${prep?"prêt…":`sur ${hold.target} s`}</div></div></div>
    <div class="sx-grow"></div>
    ${setDots(si)}
    <div class="hold-actions">
      ${prep ? `<button class="btn big validate hold-stop" data-a="holdStop">Annuler</button>` : hxBtn("btn big validate hold-stop", 'data-a="holdStop"', "S'arrêter")}
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
  // arrêté avant la fin : on garde le temps tenu et la durée visée (rappelée et adaptée la prochaine fois)
  if(st){ st.reps = Math.max(1, Math.round(secs)); if(st.reps<h.target) st.goal = h.target; else delete st.goal; }
  ACT.validateSet({ exi:String(h.exi) });
}

// ---------- ressenti de la série (répétitions en réserve), facultatif, pendant le repos ----------
function effortHTML(){
  const src = restState && restState.src; if(!src || !S.draft || !S.draft.exos[src.exi]) return "";
  const st = S.draft.exos[src.exi].sets[src.si]; if(!st) return "";
  const timed = isTimed(EXO_MAP[S.draft.exos[src.exi].exoId]);
  const opts = timed ? [[3,"Difficile"],[2,"Moyen"],[1,"Facile"]] : [[3,"0"],[2,"1–2"],[1,"3 ou +"]];
  return `<div class="effort" role="group" aria-label="Ressenti de la série">
    <div class="ef-q">${timed?"Comment c'était ?":"Combien de reps en réserve ?"}</div>
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
function noteIsBeat(ex){ return S.settings.beat!==false && (ex.deload || /^Objectif( du jour)? : (une répétition de plus|\+\d+ (s|répétitions?) )/.test(ex.note||"")); }
let beatWinKey = ""; // série déjà annoncée « mieux » : l'animation ne rejoue pas à chaque +/−
function beatLineHTML(ex, def, si, st){
  const ref = isStretch(def) ? null : beatRef(ex.exoId, si);
  if(!ref) return lastTimeHTML(ex.exoId, !!ex.note);
  const u = isTimed(def) ? " s" : "", refTxt = `${ref.reps}${u}${ref.goal>ref.reps ? ` sur ${ref.goal} s` : ""}${loadSuffix(def, ref.weight)}`;
  const key = ex.exoId+":"+si, gap = daysBetween(ref.date, todayISO());
  // semaine allégée : pas de record à battre, on garde de la marge
  if(ex.deload) return `<div class="fc-beat dl">${ii("leaf")}<span>Semaine allégée : vise <b>${st.reps}${u}</b>${loadSuffix(def, st.weight)}, sans aller à fond <small>(la dernière fois : ${refTxt})</small></span></div>`;
  // après 3 semaines sans l'exercice, on ne cherche pas à battre : on retrouve son niveau (la force revient vite)
  if(gap>=21) return `<div class="fc-beat">${ii("repeat")}<span>Reprise après ${gap} jours : retrouve tes sensations <small>(la dernière fois : ${refTxt})</small></span></div>`;
  if(beatCmp(def, st, ref)>0){ const pop = beatWinKey!==key; beatWinKey = key; return `<div class="fc-beat win${pop ? " pop" : ""}">${ii("trendUp")}<span>Ça bat la dernière fois <small>(${refTxt})</small></span></div>`; }
  if(beatWinKey===key) beatWinKey = "";
  // exercice tenu arrêté avant la fin la dernière fois : un simple rappel, pas de « à battre »
  if(ref.goal>ref.reps) return `<div class="fc-beat">${ii("target")}<span>La dernière fois : <b>${ref.reps} s</b> sur ${ref.goal} s</span></div>`;
  // simple rappel de la même série la dernière fois (un « à battre » se lisait comme un record, qui reste géré par isNewPR)
  return `<div class="fc-beat">${ii("target")}<span>La dernière fois : <b>${refTxt}</b></span></div>`;
}
const SX_PM = d=>`<svg viewBox="0 0 18 18" aria-hidden="true"><path d="${d>0?"M9 3v12M3 9h12":"M3 9h12"}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const SX_CHECK = `<svg class="sx-ck" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.3l2.3 2.3 4.7-5" pathLength="1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SX_DOTS = `<svg viewBox="0 0 20 4" aria-hidden="true"><circle cx="2" cy="2" r="2" fill="currentColor"/><circle cx="10" cy="2" r="2" fill="currentColor"/><circle cx="18" cy="2" r="2" fill="currentColor"/></svg>`;
// le mouvement, joué deux fois à l'arrivée sur l'exercice puis au repos (rien ne tourne en boucle pendant une heure)
function sxAnim(def){ return def._sxa || (def._sxa = exoAnimSVG(def).replace(/repeatCount="indefinite"/g, 'repeatCount="2"')); }
// valeur courte d'une série : « 10 × 14 », « 12 », « 30 s »
function sxSetVal(def, s){
  if(isTimed(def)) return `${s.reps??"–"} s`;
  const lt = loadableTypeOf(def);
  return lt && lt!=="bands" && s.weight ? `${s.reps??"–"} × ${fmtDec(s.weight)}` : `${s.reps??"–"}`;
}
function sxSetSpeech(def, s){
  if(isTimed(def)) return `${s.reps||0} secondes`;
  const lt = loadableTypeOf(def);
  return `${nb(s.reps||0, "répétition")}${lt && lt!=="bands" && s.weight ? ` à ${fmtDec(s.weight)} kilos` : lt==="bands" && s.weight ? `, ${bandLabel(s.weight)}` : ""}`;
}
// les séries de l'exercice : faites (✓, touchées = corriger), en cours (cadre orange), à venir
function sxSetsHTML(idx, ex, def, si, jd){
  const n = ex.sets.length, cols = n<=5 ? n : Math.ceil(n/2);
  return `<div class="sx-sets${cols>=5?" many":""}" style="--n:${cols}">${ex.sets.map((s,i)=>{
    const lbl = `Série ${i+1}`;
    if(s.done) return `<button class="sx-set done${s.pr?" pr":""}${i===jd?" just":""}" data-a="editDoneSets" data-exi="${idx}" aria-label="${lbl} faite : ${sxSetSpeech(def, s)}${s.pr?", record":""}. Corriger"><small>${s.pr?ii("bolt"):SX_CHECK}${lbl}</small><b>${sxSetVal(def, s)}</b></button>`;
    if(i===si) return `<div class="sx-set cur" aria-current="step"><small>${lbl}</small><b aria-hidden="true">&nbsp;</b></div>`;
    return `<div class="sx-set"><small>${lbl}</small><b class="dim">—</b></div>`;
  }).join("")}</div>`;
}
function renderFocusCard(idx, ex, def){
  const animClass = focusAnimDir==="r" ? "anim-r" : focusAnimDir==="l" ? "anim-l" : "";
  focusAnimDir = null;
  const jd = justDone && justDone.exi===idx ? justDone.si : -1;
  justDone = null;
  const resting = restState && restState.exoIdx===idx;
  const allDone = ex.sets.every(s=>s.done);
  // l'exercice : le mouvement (toucher = fiche et technique), son nom, ••• pour les options
  const header = `<div class="sx-ex">
      <button class="sx-pic fc-info" data-a="showExoInfo" data-id="${def.id}" aria-label="${esc(def.n)} : fiche et technique">${sxAnim(def)}</button>
      <h2 class="sx-name fc-name">${esc(def.n)}</h2>
      <button class="sx-menu fc-menu" aria-label="Options de l'exercice : technique, remplacer, ajouter une série" data-a="focusMenu" data-idx="${idx}">${SX_DOTS}</button>
    </div>`;
  const sets = si => sxSetsHTML(idx, ex, def, si, jd);

  if(resting){
    const remain = Math.max(0, Math.round((restState.endAt-Date.now())/1000));
    const tIdx = restTarget(restState.exoIdx, restState.arrived), tEx = tIdx>=0 ? S.draft.exos[tIdx] : null;
    const next = tEx && tEx.sets.find(s=>!s.done), nDef = tEx && EXO_MAP[tEx.exoId];
    const src = restState.src, srcEx = src && S.draft.exos[src.exi];
    const fresh = savedFresh; savedFresh = false;
    const saved = srcEx && srcEx.sets[src.si] ? `<button class="sx-saved${fresh ? " fresh" : ""}" data-a="editDoneSets" data-exi="${src.exi}" aria-label="Série ${src.si+1} enregistrée. Corriger ou annuler"><span class="sx-okdot">${SX_CHECK}</span><span>Série ${src.si+1} enregistrée</span></button>` : "";
    const upcoming = next ? `<div class="sx-upcard fc-next"><span class="sx-uptile">${exoPicto(nDef)}</span><div class="grow"><b>${esc(nDef.n)}</b>
        <small>À suivre · série ${tEx.sets.indexOf(next)+1} · ${sxSetVal(nDef, next)}${loadableTypeOf(nDef) && loadableTypeOf(nDef)!=="bands" && next.weight ? " kg" : isTimed(nDef) ? "" : " rép."}</small></div></div>` : "";
    return `<div class="focus-card resting sx-card sx-rest r-${regionOf(def)} ${animClass}">
      ${saved}
      ${ringSVG(remain, restState.totalSec)}
      <div class="ring-adjust sx-adj"><button data-a="restAdjust" data-d="-15" aria-label="Retirer 15 secondes">−15 s</button><button data-a="restAdjust" data-d="15" aria-label="Ajouter 15 secondes">+15 s</button></div>
      ${effortHTML()}
      <div class="sx-grow"></div>
      ${upcoming}
      <button class="btn big sx-skip skip" data-a="restSkip">Passer le repos</button>
    </div>`;
  }

  if(allDone){
    const ni = nextUndone(idx), nd = ni>=0 ? EXO_MAP[S.draft.exos[ni].exoId] : null;
    return `<div class="focus-card sx-card r-${regionOf(def)} ${animClass}">${header}
      <div class="sx-grow"></div>
      <div class="sx-done fc-done-t"><span class="sx-okdot">${SX_CHECK}</span>Exercice terminé</div>
      ${sets(-1)}
      <div class="fc-quiet"><button data-a="addSetFocus" data-exi="${idx}">Ajouter une série</button></div>
      ${nd ? `<button class="btn big next-exo" data-a="focusJump" data-idx="${ni}"><span class="ne-k">Exercice suivant</span><span class="ne-n">${esc(nd.n)}</span></button>` : ""}
    </div>`;
  }

  const si = ex.sets.findIndex(s=>!s.done);
  const st = ex.sets[si];
  if(hold && hold.exi===idx) return holdCardHTML(idx, ex, def, si, header, animClass, sets);
  const rr = restReady; restReady = false; // animation « c'est reparti » après le repos
  setTimeout(()=>{ valRoll = {}; }, 0);
  const note = ex.note && !noteIsBeat(ex) ? `<div class="sx-note exo-note">${esc(ex.note)}${ex.harder&&EXO_MAP[ex.harder]&&!ex.sets.some(s=>s.done)?` <button class="note-act" data-a="swapHarder" data-idx="${idx}">Essayer maintenant</button>`:""}</div>` : "";
  return `<div class="focus-card sx-card r-${regionOf(def)} ${animClass}" data-exi="${idx}">${header}${note}
    <div class="sx-grow"></div>
    ${sets(si)}
    ${sxStepsHTML(idx, ex, def, si, st)}
    ${upNextHTML(idx)}
    ${isTimed(def)
      ? `${hxBtn(`btn big validate hold-go ${rr?"ready":""}`, `data-a="holdStart" data-exi="${idx}" data-si="${si}"`, `${icon("timer")} Lancer le chrono · ${st.reps||30} s`)}
         ${hxBtn("btn ghost sm hold-skip", `data-a="validateSet" data-exi="${idx}"`, "Valider sans chrono")}`
      : hxBtn(`btn big validate ${rr?"ready":""}`, `data-a="validateSet" data-exi="${idx}"`, "Valider la série")}
  </div>`;
}
// ---------- échauffement (réglage « Échauffement ») ----------
// Avant le premier exercice : 4 mouvements de 30 s sans matériel, choisis d'après les régions que la séance
// travaille (une séance de bras n'échauffe que le haut du corps). Chrono guidé ; « Passer » à tout moment.
// chaque mouvement d'échauffement est montré par l'animation d'un exercice proche, sans matériel
// ([rig de data_rigs.js, exercice de référence pour la posture et la durée])
const WARM_ANIM = {
  "Cercles de bras":["warm_bras", "elevations_frontales"], "Pompes contre un mur":["pompes_mur"], "Ouvertures de bras":["elevations_laterales"],
  "Rotations des épaules":["shrugs_halteres"], "Serrer les omoplates":["warm_omoplates", "face_pull_elastique"], "Rotations des poignets":["etir_avantbras"],
  "Squats au poids du corps":["squat_pdc"], "Balancements de jambe":["warm_jambe", "montees_genoux"], "Cercles de hanches":["warm_hanches", "shrugs_halteres"],
  "Montées sur pointes":["mollets_pdc"], "Rotations du buste":["woodchopper_haltere"], "Chat-vache":["etir_chat_vache"], "Montées de genoux":["montees_genoux"],
};
const WARM_DEFS = {};
function warmDef(name){
  if(WARM_DEFS[name]) return WARM_DEFS[name];
  const w = WARM_ANIM[name], base = w && EXO_MAP[w[1] || w[0]];
  return (WARM_DEFS[name] = base ? Object.assign({}, base, { id:w[0], equip:["bodyweight"], _load:null, _sxa:undefined }) : null);
}
const WARM_MOVES = {
  push: [["Cercles de bras", 30], ["Pompes contre un mur", 30], ["Ouvertures de bras", 30]],
  pull: [["Rotations des épaules", 30], ["Serrer les omoplates", 30], ["Rotations des poignets", 30]],
  legs: [["Squats au poids du corps", 30], ["Balancements de jambe", 30], ["Cercles de hanches", 30], ["Montées sur pointes", 30]],
  core: [["Rotations du buste", 30], ["Chat-vache", 30], ["Montées de genoux", 30]],
};
function warmPlan(draft){
  const w = {};
  draft.exos.forEach(ex=>{ const d = EXO_MAP[ex.exoId]; if(!d || isStretch(d)) return; const r = regionOf(d); w[r] = (w[r]||0) + ex.sets.length; });
  const regs = Object.keys(w).sort((a, b)=>w[b]-w[a]); if(!regs.length) regs.push("core");
  // chacune son tour, de la plus travaillée à la moins travaillée
  const out = [];
  for(let k = 0; out.length<4 && k<4; k++) regs.forEach(r=>{ const m = WARM_MOVES[r][k]; if(m && out.length<4) out.push(m); });
  for(let k = 0; out.length<4 && k<4; k++) regs.forEach(r=>{ WARM_MOVES[r].forEach(m=>{ if(out.length<4 && !out.includes(m)) out.push(m); }); });
  return out.map(m=>m.slice());
}
function warmStart(draft){ if(S.settings.warmup && draft.exos.length) draft.warm = { moves:warmPlan(draft), i:0, end:0 }; }
function warmPending(draft){ return !!(draft.warm && draft.warm.moves && !draft.exos.some(e=>e.sets.some(s=>s.done))); }
function warmRemain(W){ const m = W.moves[W.i]; return W.end ? Math.max(0, Math.ceil((W.end-Date.now())/1000)) : m[1]; }
function warmCardHTML(draft){
  const W = draft.warm, cur = W.moves[W.i], total = W.moves.reduce((t, m)=>t+m[1], 0);
  return `<div class="focus-card sx-card sx-warm">
    ${warmDef(cur[0]) ? `<div class="sx-wanim">${exoAnimSVG(warmDef(cur[0]))}</div>` : ""}
    <div class="sx-wh"><small>Échauffement</small><b>${esc(cur[0])}</b></div>
    ${ringSVG(warmRemain(W), cur[1], `${W.i+1} sur ${W.moves.length}`)}
    <ol class="sx-wl">${W.moves.map((m, i)=>`<li class="${i<W.i ? "done" : i===W.i ? "cur" : ""}"><span>${esc(m[0])}</span><b class="num">${m[1]} s</b></li>`).join("")}</ol>
    <div class="sx-grow"></div>
    ${W.end ? "" : `<button class="btn big validate" data-a="warmGo">Lancer · ${Math.round(total/60)} min</button>`}
    <button class="btn big sx-skip skip" data-a="warmSkip">Passer l'échauffement</button>
  </div>`;
}
function warmFinish(){ if(!S.draft) return; delete S.draft.warm; save(); refreshFocusRegion(); }
setInterval(()=>{
  const W = S.draft && S.draft.startedAt && S.draft.warm; if(!W || !W.end || !W.moves) return;
  const left = warmRemain(W);
  if(left>0){ if(currentTab==="today") updateFocusRing(left, W.moves[W.i][1]);
    if(left<=3 && left!==W.tick && !document.hidden){ W.tick = left; sfx("restTick"); } return; }
  if(W.i>=W.moves.length-1){ sfx("restEnd"); haptic(20); warmFinish(); toast("Échauffement terminé", "check"); return; }
  W.i++; W.end = Date.now() + W.moves[W.i][1]*1000; W.tick = 0; save(); sfx("set"); haptic(12);
  if(currentTab==="today") refreshFocusRegion();
}, 250);

// la charge puis les répétitions : gros chiffres, gros boutons ; en bas, la série à battre
function sxStepsHTML(idx, ex, def, si, st){
  const lt = loadableTypeOf(def), bands = lt==="bands", timed = isTimed(def);
  const roll = f => valRoll.f===f ? "roll-"+valRoll.d : "";
  const at = `data-exi="${idx}" data-si="${si}"`;
  const wRow = !lt ? "" : `<div class="big-stepper sx-row">
      <button class="sx-pm" aria-label="${bands?"Élastique plus léger":"Charge plus légère"}" data-a="stepWeight" ${at} data-d="-1">${SX_PM(-1)}</button>
      <div class="sx-val"><small>${bands?"Élastique":"Charge"}</small>${bands
        ? `<span class="bs-val band-val ${roll("weight")}" aria-live="polite">${st.weight?bandLabel(st.weight):"–"}</span>`
        : `<div class="bs-val ${roll("weight")}" role="spinbutton" tabindex="0" aria-label="Charge" aria-valuenow="${st.weight||0}" data-f="weight" ${at}><b>${st.weight!=null?fmtDec(st.weight):"–"}</b><span>kg</span></div>`}</div>
      <button class="sx-pm" aria-label="${bands?"Élastique plus fort":"Charge plus lourde"}" data-a="stepWeight" ${at} data-d="1">${SX_PM(1)}</button>
    </div>`;
  // exercice tenu : la règle des secondes remplace le − / + ; le chiffre reste en blanc, comme les autres exercices
  const rRow = timed ? `<div class="big-stepper sx-row sx-durrow">
      <div class="sx-val"><small>Secondes</small><div class="bs-val" aria-hidden="true" id="durNum"><b>${st.reps??"–"}</b></div>
      <div class="dur-dial" tabindex="0" role="slider" aria-label="Durée en secondes" aria-valuemin="${DUR_MIN}" aria-valuemax="${DUR_MAX}" aria-valuenow="${st.reps||30}" data-v="${st.reps||30}" ${at}><canvas></canvas><i></i></div></div>
    </div>` : `<div class="big-stepper sx-row">
      <button class="sx-pm" aria-label="Une répétition de moins" data-a="stepReps" ${at} data-d="-1">${SX_PM(-1)}</button>
      <div class="sx-val"><small>Répétitions</small><div class="bs-val ${roll("reps")}" role="spinbutton" tabindex="0" aria-label="Répétitions" aria-valuenow="${st.reps||0}" data-f="reps" ${at}><b>${st.reps??"–"}</b></div></div>
      <button class="sx-pm" aria-label="Une répétition de plus" data-a="stepReps" ${at} data-d="1">${SX_PM(1)}</button>
    </div>`;
  const hint = S.settings.beat===false ? lastTimeHTML(ex.exoId, !!ex.note) : beatLineHTML(ex, def, si, st);
  return `<div class="sx-steps">${wRow}${rRow}${hint ? `<div class="sx-hint" aria-live="polite">${hint}</div>` : ""}</div>`;
}
// +/− sans tout redessiner : seules les séries et les compteurs changent (le mouvement continue)
// ---------- saisie en un geste ----------
// Glisser vers le haut ou le bas sur le chiffre (répétitions ou charge) le fait défiler d'un cran tous les 46 px,
// avec un petit son à chaque cran ; lâcher enregistre. (Les secondes d'un exercice tenu ont leur règle.)
const VAL_PX = 46, DUR_PX = 22, DUR_MIN = 15, DUR_MAX = 600;   // px par cran : chiffre, règle (5 s)
let valDrag = null;
function valDragStep(def, f, v, n){
  if(f==="weight"){ let w = v||0; for(let i=0;i<Math.abs(n);i++) w = stepWeightValue(def, w, Math.sign(n)); return w; }
  return Math.max(0, Math.min(999, (v||0) + n));
}
document.addEventListener("pointerdown", e=>{
  const b = e.target.closest && e.target.closest('.sx-steps .bs-val[data-f]'); if(!b || !S.draft) return;
  const ex = S.draft.exos[+b.dataset.exi], st = ex && ex.sets[+b.dataset.si], def = ex && EXO_MAP[ex.exoId]; if(!st || !def) return;
  valDrag = { b, ex, st, def, f:b.dataset.f, si:+b.dataset.si, exi:+b.dataset.exi, y:e.clientY, v0:b.dataset.f==="weight" ? st.weight : st.reps, n:0, moved:false, id:e.pointerId };
});
document.addEventListener("pointermove", e=>{
  const D = valDrag; if(!D || e.pointerId!==D.id) return;
  const dy = D.y - e.clientY;
  if(!D.moved){ if(Math.abs(dy)<8) return; D.moved = true; D.b.classList.add("dragging"); try{ D.b.setPointerCapture(e.pointerId); }catch(err){} }
  e.preventDefault();
  const n = Math.round(dy/VAL_PX); if(n===D.n) return;
  const v = valDragStep(D.def, D.f, D.v0, n), prev = valDragStep(D.def, D.f, D.v0, D.n); D.n = n;
  if(v===prev) return;
  D.v = v; const t = qs("b", D.b); if(t) t.textContent = D.f==="weight" ? fmtDec(v) : v;
  sfx("step", v>prev); haptic(5);
}, { passive:false });
const valDragEnd = e=>{
  const D = valDrag; if(!D || (e && e.pointerId!==D.id)) return; valDrag = null;
  if(!D.moved) return;
  D.b.classList.remove("dragging");
  if(D.v==null || D.v===D.v0) return;
  D.ex.sets.forEach((s,i)=>{ if(i>=D.si && !s.done && (D.f==="weight" ? s.weight : s.reps)===D.v0){ if(D.f==="weight") s.weight = D.v; else s.reps = D.v; } });
  if(D.f==="weight") D.st.weight = D.v; else D.st.reps = D.v;
  save(); if(!patchFocusSteps(D.exi)) refreshFocusRegion();
};
document.addEventListener("pointerup", valDragEnd); document.addEventListener("pointercancel", valDragEnd);
document.addEventListener("keydown", e=>{
  const b = e.target.closest && e.target.closest('.sx-steps .bs-val[data-f]'); if(!b || !S.draft) return;
  const k = e.key==="ArrowUp" ? 1 : e.key==="ArrowDown" ? -1 : 0; if(!k) return; e.preventDefault();
  ACT[b.dataset.f==="weight" ? "stepWeight" : "stepReps"]({ exi:b.dataset.exi, si:b.dataset.si, d:String(k) });
});

// ---------- règle des secondes (exercices tenus) ----------
// Une règle qui défile sous le doigt, comme le minuteur d'iOS : un trait toutes les 5 s, un chiffre toutes les 30 s,
// l'élan continue puis s'arrête sur un cran. 15 s minimum. Posée à la place du − / + dans la carte de l'exercice.
function fmtDur(s){ return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
function mountDurDial(dial){
  if(dial._on) return; dial._on = true;
  const STEP = DUR_PX, cv = qs("canvas", dial), num = qs("#durNum b"), exi = +dial.dataset.exi, si = +dial.dataset.si;
  const start = Math.max(DUR_MIN, Math.min(DUR_MAX, Math.round((+dial.dataset.v||30)/5)*5));
  const P0 = DUR_MIN/5*STEP, P1 = DUR_MAX/5*STEP;
  let pos = start/5*STEP, vel = 0, drag = null, raf = 0, last = start, saved = +dial.dataset.v;
  const val = ()=>Math.round(pos/STEP)*5;
  function draw(){
    const w = dial.clientWidth, h = dial.clientHeight, r = window.devicePixelRatio || 1; if(!w || !dial.isConnected) return;
    if(cv.width!==Math.round(w*r)){ cv.width = Math.round(w*r); cv.height = Math.round(h*r); }
    const g = cv.getContext("2d"), cs = getComputedStyle(dial), on = cs.getPropertyValue("--tint").trim() || "#BC5736", off = cs.color;
    g.setTransform(r,0,0,r,0,0); g.clearRect(0,0,w,h);
    const c = w/2, sec = val();
    g.lineCap = "round"; g.textAlign = "center"; g.font = "600 12px ui-rounded,-apple-system,system-ui,sans-serif";
    for(let s = DUR_MIN; s<=DUR_MAX; s+=5){
      const x = c + s/5*STEP - pos; if(x<-12 || x>w+12) continue;
      const major = s%30===0, a = s<=sec;
      g.strokeStyle = g.fillStyle = a ? on : off; g.globalAlpha = a ? 1 : .4; g.lineWidth = major ? 2.6 : 1.8;
      g.beginPath(); g.moveTo(x, major ? h*.4 : s%15===0 ? h*.5 : h*.56); g.lineTo(x, h*.84); g.stroke();
      if(major) g.fillText(s<60 ? String(s) : fmtDur(s), x, h*.26);
    }
    g.globalAlpha = 1;
    if(sec!==last){ last = sec; if(num) num.textContent = sec; dial.setAttribute("aria-valuenow", sec); sfx("step", true); haptic(4); }
  }
  const clamp = ()=>{ pos = Math.max(P0, Math.min(P1, pos)); };
  // valeur posée : elle vaut pour cette série et les suivantes non validées, et le chrono la reprend
  const commit = ()=>{
    const v = val(); if(v===saved || !S.draft || !S.draft.exos[exi]) return; saved = v;
    const ex = S.draft.exos[exi]; ex.sets.forEach((s,i)=>{ if(i>=si && !s.done) s.reps = v; });
    save();
    const hg = qs(".hold-go"); if(hg) hg.innerHTML = `${icon("timer")} Lancer le chrono · ${v} s${hg.tagName==="LABEL"?HX_INPUT:""}`;
    const sx = qs(".sx-sets"); if(sx){ const def = EXO_MAP[ex.exoId]; sx.outerHTML = sxSetsHTML(exi, ex, def, si, -1); }
  };
  const glide = ()=>{
    if(Math.abs(vel)>.4){ pos += vel; vel *= .9; clamp(); draw(); raf = requestAnimationFrame(glide); return; }
    const t = Math.round(pos/STEP)*STEP; pos += (t-pos)*.35; draw();
    if(Math.abs(t-pos)>.3) raf = requestAnimationFrame(glide); else { pos = t; draw(); commit(); }
  };
  dial.addEventListener("pointerdown", e=>{ cancelAnimationFrame(raf); drag = { x:e.clientX, t:performance.now() }; vel = 0; try{ dial.setPointerCapture(e.pointerId); }catch(err){} });
  dial.addEventListener("pointermove", e=>{ if(!drag) return; const dx = e.clientX-drag.x, now = performance.now(); pos -= dx; clamp(); vel = -dx/Math.max(8, now-drag.t)*16; drag = { x:e.clientX, t:now }; draw(); });
  const up = ()=>{ if(!drag) return; drag = null; if(reducedMotion()) vel = 0; raf = requestAnimationFrame(glide); };
  dial.addEventListener("pointerup", up); dial.addEventListener("pointercancel", up);
  dial.addEventListener("keydown", e=>{ const k = e.key==="ArrowRight" || e.key==="ArrowUp" ? 1 : e.key==="ArrowLeft" || e.key==="ArrowDown" ? -1 : 0; if(!k) return; e.preventDefault(); pos += k*STEP; clamp(); draw(); commit(); });
  requestAnimationFrame(draw);
}
// la règle se pose dès que la carte de l'exercice tenu est dessinée
new MutationObserver(()=>{ const d = document.querySelector(".sx-durrow .dur-dial:not(._m)"); if(d){ d.classList.add("_m"); mountDurDial(d); } })
  .observe(document.getElementById("app") || document.body, { childList:true, subtree:true });

function patchFocusSteps(idx){
  const card = qs("#focusRegion .sx-card[data-exi]");
  if(!card || card.dataset.exi!==String(idx) || hold || (restState && restState.exoIdx===idx) || !S.draft || !S.draft.exos[idx]) return false;
  const ex = S.draft.exos[idx], si = ex.sets.findIndex(s=>!s.done); if(si<0) return false;
  const def = EXO_MAP[ex.exoId], a = qs(".sx-sets", card), b = qs(".sx-steps", card);
  if(!a || !b) return false;
  a.outerHTML = sxSetsHTML(idx, ex, def, si, -1);
  b.outerHTML = sxStepsHTML(idx, ex, def, si, ex.sets[si]);
  // exercice tenu : le bouton du chrono suit la durée choisie
  const hg = qs(".hold-go", card); if(hg) hg.innerHTML = `${icon("timer")} Lancer le chrono · ${ex.sets[si].reps||30} s${hg.tagName==="LABEL"?HX_INPUT:""}`;
  setTimeout(()=>{ valRoll = {}; }, 0);
  return true;
}

function refreshFocusRegion(){
  const el = qs("#focusRegion");
  if(!el || !S.draft || !S.draft.startedAt) return;
  el.innerHTML = renderFocusRegionInner(S.draft);
  // chaque état (série, repos, exercice terminé) est un écran : il commence en haut
  const v = qs("#v-today"); if(v && v.scrollTop && currentTab==="today") v.scrollTop = 0;
  stripBump = -1;
  const head = qs("#liveHead");
  if(head){
    // la barre part de l'ancienne valeur pour que le progrès se voie
    const oldW = qsa(".lp-seg i", head).map(i=>i.style.width);
    head.innerHTML = liveHeadHTML(S.draft);
    const segs = qsa(".lp-seg i", head);
    if(oldW.length===segs.length && !reducedMotion()){
      // la barre part de l'ancienne largeur (Web Animations : pas de mise en page forcée)
      segs.forEach((i,k)=>{ const to = i.style.width; if(to===oldW[k]) return; i.parentElement.classList.add("grew");
        // échelle horizontale plutôt que largeur : animée par le compositeur, sans mise en page à chaque image
        const r0 = parseFloat(oldW[k])||0, r1 = parseFloat(to)||0;
        if(i.animate && r1>0) try{ i.style.transition = "none"; i.style.transformOrigin = "left center"; i.animate([{ transform:`scaleX(${r0/r1})` }, { transform:"scaleX(1)" }], { duration:600, easing:"cubic-bezier(.32,.72,0,1)" }); }catch(e){} });
    }
  }
  // l'altitude de la séance : +X m, compteur, camp atteint en pleine séance (view_ascent.js)
  if(head && typeof liveAscAfter==="function") liveAscAfter(head);
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
      <button class="icon-btn" aria-label="Remplacer ${esc(def.n)}" data-a="swapExoOpen" data-idx="${i}">${icon("swap")}</button>
      <button class="icon-btn" aria-label="Retirer ${esc(def.n)}" data-a="removeExoOverview" data-idx="${i}">${icon("close")}</button>
    </div>`;
  };
  const todo = [], done = [];
  S.draft.exos.forEach((ex,i)=>(ex.sets.every(s=>s.done)?done:todo).push(row(ex,i)));
  return `${todo.length?`<div class="ov-h">À faire <span>${todo.length}</span></div><div class="group">${todo.join("")}</div>`:""}
    ${done.length?`<div class="ov-h done">Terminés <span>${done.length}</span></div><div class="group">${done.join("")}</div>`:""}
    <div class="btnrow"><button class="btn tertiary sm" data-a="addExoOpen">${icon("plus")} Ajouter des exercices</button></div>`;
}

let lastDoneForSave = null;
// séries validées meilleures que la même série la dernière fois (hors records, qui ont déjà le leur) ; l'altitude
// en direct et la fin de séance comptent les mêmes
function draftBeats(draft){
  if(S.settings.beat===false) return 0;
  return draft.exos.reduce((t,ex)=>{ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return t;
    return t + ex.sets.filter((st,si)=>{ if(!st.done || st.pr) return false; const ref = beatRef(ex.exoId, si); return !!ref && daysBetween(ref.date, todayISO())<21 && beatCmp(def, st, ref)>0; }).length; }, 0);
}
function finalizeSession(){
  const draft = S.draft; if(!draft) return;   // double appui sur « Terminer » : une seule fin de séance
  // séance restée ouverte (oubliée, plus de 30 min sans série validée) : elle s'arrête à la dernière série,
  // sinon la durée (et les statistiques) compterait toute la nuit
  const end = Date.now(), start = Date.parse(draft.startedAt), last = +draft.lastSetAt || 0;
  const stop = last && last>start && end-last>30*60e3 ? last+60e3 : end;
  draft.completedAt = new Date(stop).toISOString();
  draft.durationSec = isFinite(start) ? Math.max(0, Math.round((stop-start)/1000)) : 0;
  delete draft.lastSetAt; delete draft.warm;
  draft.exos = draft.exos.filter(ex=>ex.sets.some(s=>s.done));
  // séries meilleures que la même série la dernière fois (comptées avant d'ajouter la séance)
  if(S.settings.beat!==false) draft.beats = draftBeats(draft);
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
  save();
  scrollTodayTop();
  renderViewAnimated("today");
  showCelebration(draft, ups, hits, won);
}

// changer d'écran (aperçu ↔ séance en cours) repart du haut de la page
function scrollTodayTop(){ const v = qs("#v-today"); if(v) v.scrollTop = 0; }
// Accueil après une action (nouvelle proposition, séance chargée, vidée ou enregistrée…) : l'écran
// est reconstruit mais seul le bloc sous le sélecteur s'anime — sa hauteur suit et le nouveau
// contenu arrive en fondu (glissé du côté de la section quand elle change). Le reste de l'accueil
// ne bouge pas. Avant : toute la cascade d'entrée se rejouait, comme un rechargement de la page.
function renderTodaySoft(){
  const v = qs("#v-today");
  if(!v || !v.firstChild || currentTab!=="today" || reducedMotion()){ renderView("today"); return; }
  const modeOf = p=>p ? (p.classList.contains("custom") ? "custom" : "proposal") : "";
  const old = qs(".seg-pane", v), h0 = old ? old.offsetHeight : 0, m0 = modeOf(old);
  renderView("today");
  const pane = qs(".seg-pane", v); if(!pane || !pane.animate) return;
  const m1 = modeOf(pane), dx = m0 && m0!==m1 ? (m1==="proposal" ? 28 : -28) : 0, h1 = pane.offsetHeight;
  try{
    pane.animate([{ opacity:0, transform:dx ? `translateX(${dx}px)` : "translateY(8px)" }, { opacity:1, transform:"none" }], { duration:320, easing:"cubic-bezier(.2,.8,.2,1)" });
    if(old && Math.abs(h1-h0)>2){
      pane.style.overflow = "hidden";
      const a = pane.animate([{ height:h0+"px" }, { height:h1+"px" }], { duration:380, easing:"cubic-bezier(.32,.72,0,1)" });
      a.onfinish = a.oncancel = ()=>{ pane.style.overflow = ""; };
    }
  }catch(e){}
}
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
      <div class="grow"><div class="t">${esc(t.n)}</div><div class="s">${nb(t.exos.length, "exercice")} · ${nb(t.exos.reduce((a,e)=>a+e.sets,0), "série")}</div></div>
    </button>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">Le ${label}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
      ${cur ? `<div class="pd-cur r-${tplRegion(cur)}"><span class="tc-bar-s"></span><div class="grow"><div class="pd-k">Prévu le ${label}</div><div class="pd-t">${esc(cur.n)}</div></div>
        <button class="btn secondary sm" data-a="tplOpenEditor" data-id="${cur.id}">${icon("edit")} Modifier</button></div>` : ""}
      ${S.templates.length ? `<p class="body" style="margin-bottom:12px">${cur?"Changer pour une autre séance :":`Laquelle de Mes séances veux-tu faire chaque ${label} ?`}</p><div class="group">${rows}</div>
        ${cur?`<div class="btnrow"><button class="btn ghost" data-a="planSet" data-d="${day}">Ne rien prévoir le ${label}</button></div>`:""}`
      : emptyHTML("bookmarkG", "Mes séances est vide", "Compose une séance : tu pourras la garder pour ce jour.", "", "padding:24px 20px")}
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
  const card = e.target.closest && e.target.closest(".focus-card:not(.sx-warm)");
  // la règle des secondes et le chiffre glissable ont leur propre geste
  if(card && e.target.closest(".dur-dial, .bs-val[data-f]")) return;
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
    haptic(8);
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
  // Ma séance ↔ séance de l'app (liens de la carte principale) : seul le bloc de la séance change ; sa hauteur
  // suit et le nouveau contenu arrive du côté choisi, le reste de l'accueil ne bouge pas
  todayMode(d){
    if(S.settings.todayTab===d.v) return;
    S.settings.todayTab = d.v; propAdjust = false; heroAll = false; customEdit = false; save();
    const v = qs("#v-today"), pane = v && qs(".seg-pane", v), draft = getOrCreateDraft();
    if(!pane || draft.startedAt){ renderView("today"); return; }
    sfx("swipe");
    const html = `${sessionsToday().length ? "" : heroHTML(d.v, draft)}${d.v==="custom" ? customPaneHTML() : proposalPaneHTML(draft)}`;
    morphHeight(pane, ()=>{ pane.className = "seg-pane "+d.v; pane.innerHTML = html; });
    if(pane.animate && !reducedMotion()){
      const dx = d.v==="proposal" ? 28 : -28;
      try{ pane.animate([{ opacity:0, transform:`translateX(${dx}px)` }, { opacity:1, transform:"none" }], { duration:320, easing:"cubic-bezier(.2,.8,.2,1)" }); }catch(e){}
    }
    v._ver = DATA_VER; // l'écran reste à jour : pas de reconstruction au prochain passage
  },
  // carte du jour : « Voir les N exercices » déplié sur place, sans reconstruire
  heroMore(d, el){
    heroAll = !heroAll; const list = el && el.closest(".hero-list"); if(!list){ changed(); return; }
    const n = qsa(".hl-row", list).length;
    morphHeight(list, ()=>{ list.classList.toggle("all", heroAll); el.textContent = heroAll ? "Voir moins" : `Voir les ${n} exercices`; el.setAttribute("aria-expanded", heroAll); });
    sfx(heroAll ? "open" : "close");
  },
  // « Modifier » : la liste devient éditable (séries, retrait, ajout, enregistrement) ; « OK » la referme
  heroEdit(){
    const t = customTpl();
    if(customEdit && customDiffers(t) && S.custom.oneOff!==exoSig(S.custom.exos)){
      return actionSheet({ label:"Garder les modifications", msg:`Tu as modifié « ${esc(t.n)} ». Ces changements valent :`,
        actions:[{ t:"Pour aujourd'hui seulement", run:()=>{ S.custom.oneOff = exoSig(S.custom.exos); save(); ACT.heroEditDone(); } },
          { t:"Aussi pour les prochaines fois", run:()=>{
            t.exos = S.custom.exos.map(e=>({ exoId:e.exoId, sets:e.sets })); delete S.custom.oneOff; save();
            ACT.heroEditDone();
            const l = qs("#v-today .tpl-list"); if(l) l.outerHTML = tplListHTML();
            toast(`« ${t.n} » mise à jour dans Mes séances`, "check"); } }],
        cancel:"Annuler les modifications", cancelA:"heroRevert", cancelDanger:true });
    }
    // sans modèle à mettre à jour : les changements sont gardés, « Annuler » reste possible un instant
    const sn = heroSnap, changed = customEdit && sn && JSON.stringify(sn.custom)!==JSON.stringify(S.custom);
    ACT.heroEditDone();
    if(changed) toast("Séance modifiée", "check", ()=>{ S.custom = sn.custom; save(); heroRerender(); });
  },
  // « Annuler les modifications » (feuille d'actions de OK) : la séance revient à son état d'avant « Modifier »
  heroRevert(){
    closeSheet();
    const sn = heroSnap;
    if(sn){ if(sn.draft) S.draft = sn.draft; else S.custom = sn.custom; }
    heroSnap = null; customEdit = false; propAdjust = false; save(); sfx("close"); heroRerender();
  },
  // la séance prévue se modifie sur place, comme celle du jour (sa copie du jour devient éditable)
  heroEditPlanned(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id }; S.settings.todayTab = "custom"; customEdit = false; save();
    ACT.heroEditDone();
  },
  heroEditDone(){
    if(!customEdit) editSnap(); else heroSnap = null;
    customEdit = !customEdit; sfx(customEdit ? "open" : "close");
    const v = qs("#v-today"), pane = v && qs(".seg-pane", v), draft = getOrCreateDraft();
    if(!pane || draft.startedAt){ renderView("today"); return; }
    morphHeight(pane, ()=>{ pane.innerHTML = `${sessionsToday().length ? "" : heroHTML("custom", draft)}${customPaneHTML()}`; });
    v._ver = DATA_VER;
  },
  // « Choisir une autre séance » : tes séances enregistrées, la séance de l'app, l'express, composer
  // « Choisir une autre séance » : trois familles bien distinctes, comme des sections iOS : tes séances
  // (Mes séances), celle que l'app propose, et ce qui se décide sur le moment (express, composer)
  chooseSession(){
    const prop = S.settings.todayTab==="proposal", draft = getOrCreateDraft();
    const cur = S.custom.exos.length ? S.custom.tplId : (plannedTemplate()||{}).id;   // ta séance du jour : pas deux fois
    const row = (a, ic, t, sub, extra)=>`<button class="row tap cs-row" data-a="${a}"${extra||""}>${ic}<div class="grow"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div></button>`;
    const mine = S.templates.filter(t=>t.id!==cur).map(t=>{ const d = EXO_MAP[(t.exos[0]||{}).exoId];
      return row("csTemplate", d ? exoIcon(d) : sfIcon("bookmarkG", "indigo"), esc(t.n), `${(t.days||[]).length ? daysLabel(t.days)+" · " : ""}${nb(t.exos.length, "exercice")} · ≈ ${tplMinutes(t)} min`, ` data-id="${t.id}"`); });
    if(prop && (S.custom.exos.length || plannedTemplate())) mine.unshift(row("csMine", sfIcon("bookmarkG", "indigo"), `Revenir à « ${esc(S.custom.exos.length ? (S.custom.name||"Ma séance") : plannedTemplate().n)} »`, ""));
    const app = [];
    if(prop && draft.source!=="imported") app.push(row("csRegen", sfIcon("sparkles", "orange"), "Autre proposition"));
    else if(appPicksOn() && !prop) app.push(row("csApp", sfIcon("sparkles", "orange"), "Laisse l'app choisir"));
    const now = [row("csExpress", sfIcon("stopwatch", "green"), "Séance express", "10 min · tout le corps"),
      row("csCompose", sfIcon("pencil", "blue"), "Composer moi-même")];
    const sec = (h, rows)=>rows.length ? `<h2 class="sh">${h}</h2><div class="group">${rows.join("")}</div>` : "";
    openSheet(`<div class="sheet-hd"><span class="t" id="ovTitle">Choisir une séance</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
      <div class="sheet-body cs-body">${sec("Mes séances", mine)}${sec("Proposée par l'app", app)}${sec("Sur le moment", now)}</div>`);
  },
  csTemplate(d){ ACT.loadTemplate({ id:d.id }); },
  csMine(){ closeSheet(); ACT.todayMode({ v:"custom" }); },
  csRegen(){ closeSheet(); ACT.regenSession(); },
  csApp(){ closeSheet(); ACT.todayMode({ v:"proposal" }); },
  csExpress(){ closeSheet(); ACT.startExpress(); },
  csCompose(){ closeSheet(); customEdit = false; heroSnap = null; S.custom = { exos:[] }; S.settings.todayTab = "custom"; save(); renderTodaySoft(); ACT.customAddOpen(); },
  // la séance proposée : réglages fins dépliés ou repliés, sur place
  propAdjust(){
    const sn = heroSnap, changed = propAdjust && sn && sn.draft && JSON.stringify(sn.draft)!==JSON.stringify(S.draft);
    if(changed) setTimeout(()=>toast("Séance modifiée", "check", ()=>{ S.draft = sn.draft; save(); heroRerender(); }), 0);
    heroSnap = propAdjust ? null : { draft: clone(getOrCreateDraft()) };
    propAdjust = !propAdjust; sfx(propAdjust ? "open" : "close");
    const v = qs("#v-today"), pane = v && qs(".seg-pane", v), draft = getOrCreateDraft();
    if(!pane || draft.startedAt){ renderView("today"); return; }
    const html = `${sessionsToday().length ? "" : heroHTML("proposal", draft)}${proposalPaneHTML(draft)}`;
    morphHeight(pane, ()=>{ pane.innerHTML = html; });
    v._ver = DATA_VER;
  },
  pickerCat(d){
    picker.cat = d.v || null;
    qsa("#pickerCats .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
    qs("#pickerList").scrollTop = 0;
  },
  customFill(){
    editSnap();
    const have = S.custom.exos.map(e=>e.exoId);
    const target = sessionSize();
    const n = Math.max(have.length ? 1 : 3, target-have.length);
    const add = suggestComplement(have, Math.min(n, 4));
    if(!add.length){ toast("Aucun exercice disponible avec ton matériel"); return; }
    add.forEach(e=>{ S.custom.exos.push({ exoId:e.id, sets:e.sets, app:true }); freshIds.add(e.id); });
    customEdit = true; // la liste composée reste éditable jusqu'à « OK »
    save(); changed();
    // ce que l'app a visé : les muscles en retard sur la semaine, s'il y en a
    const t = stimTargets(add);
    toast(`${add.length} exercice${add.length>1?"s":""} ajouté${add.length>1?"s":""}${t.length ? ` · priorité : ${t.slice(0,2).map(r=>r.n.toLowerCase()).join(" et ")}, en retard cette semaine` : " par l'app"}`, "sparkle");
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
      <div class="hr-note" style="margin:2px 0 0">${nb(t.exos.length, "exercice")} · ${(t.days||[]).length?daysLabel(t.days):"aucun jour fixe"}</div></div></div>
      <div class="menu-list">
        <button data-a="startTemplate" data-id="${t.id}">${icon("play")}<span>Commencer maintenant</span></button>
        <button data-a="tplOpenEditor" data-id="${t.id}">${icon("edit")}<span>Modifier (exercices, jours, nom)</span></button>
        <button data-a="loadTemplate" data-id="${t.id}">${icon("repeat")}<span>Charger dans Ma séance</span></button>
        <button data-a="duplicateTemplate" data-id="${t.id}">${icon("bookmark")}<span>Dupliquer</span></button>
        <button class="danger" data-a="deleteTemplate" data-id="${t.id}">${icon("trash")}<span>Supprimer</span></button>
      </div>
      <button class="btn ghost" style="height:40px;margin-top:6px" data-a="closesheet">Fermer</button>`);
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
  customMove(d){
    const i = +d.idx, j = i+parseInt(d.d,10), a = S.custom.exos;
    if(j<0 || j>=a.length) return;
    const [x] = a.splice(i, 1); a.splice(j, 0, x);
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
    S.settings.todayTab = "custom";
    closeSheet(); save(); scrollTodayTop(); renderTodaySoft();
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
  setType(d){ regenerateDraft(d.v); renderTodaySoft(); },
  warmGo(){ const W = S.draft && S.draft.warm; if(!W || W.end) return; W.end = Date.now() + W.moves[W.i][1]*1000; save(); sfx("go"); refreshFocusRegion(); },
  warmSkip(){ warmFinish(); sfx("swipe"); },
  startSession(){ if(!S.draft.exos.length) return; S.draft.startedAt = new Date().toISOString(); warmStart(S.draft); liveFocusIdx = 0; completeShown = false; save(); scrollTodayTop(); renderViewAnimated("today"); showLaunch(S.draft); },
  regenSession(){ regenerateDraft(); renderTodaySoft(); toast("Nouvelle proposition");
    // l'icône du bouton fait un tour : on voit que c'est bien une autre proposition
    const ic = qs('#v-today [data-a="regenSession"] svg');
    if(ic && ic.animate && !reducedMotion()) try{ ic.animate([{ transform:"rotate(-360deg)" }, { transform:"none" }], { duration:600, easing:"cubic-bezier(.32,.72,0,1)" }); }catch(e){}
  },
  dropImported(){
    confirmSheet({ title:"Revenir à la suggestion automatique ?", html:"Le programme importé restera disponible pour une prochaine séance.", ok:"Revenir à l'auto", onOk:()=>{ S.draft = generateEngineSession(); liveFocusIdx=0; save(); renderTodaySoft(); } });
  },
  removeExo(d, el){
    if(!S.draft) return;
    const row = el && !S.draft.startedAt && el.closest(".row");
    if(row && row.classList.contains("leaving")) return;   // double toucher : une seule ligne retirée
    sfx("remove");
    if(S.draft.startedAt) closeSheet();
    const draft = S.draft, i = +d.idx;
    const go = ()=>{
      const [ex] = draft.exos.splice(i,1); if(!ex) return;
      if(liveFocusIdx>=draft.exos.length) liveFocusIdx = Math.max(0,draft.exos.length-1);
      changed();
      toast(`Retiré : ${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "exercice"}`, null, ()=>{
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
    pickerSyncRows(d.id, i<0);
    haptic(6);
    refreshPickerFooter();
  },
  pickerMuscle(d){
    picker.muscle = d.v || null;
    qsa("#pickerChips .chip").forEach(c=>c.classList.toggle("on", c.dataset.v===(d.v||"")));
    qs("#pickerList").innerHTML = pickerListHTML();
  },
  pickerDone(){ if(picker && picker.selected.length) picker.onDone(picker.selected.slice()); },
  // fermer le choix avec des exercices cochés : on demande, au lieu de perdre la sélection
  pickerAsk(){
    const l = qs("#pickerList"); if(l) picker.scroll = l.scrollTop;
    const p = picker, n = p.selected.length;
    actionSheet({ label:"Exercices choisis", msg:`${nb(n, "exercice")} ${n>1?"cochés":"coché"}.`,
      actions:[{ t:`Ajouter ${nb(n, "exercice")}`, run:()=>p.onDone(p.selected.slice()) }, { t:"Ignorer la sélection", danger:true, run:()=>{ if(picker===p) picker = null; } }],
      cancel:"Continuer à choisir", cancelA:"pickerResume" });
  },
  pickerResume(){ if(picker) renderPickerSheet(); else closeSheet(); },

  // --- Ma séance ---
  customAddOpen(){
    openPicker({ title:"Choisir des exercices", multi:true, exclude:new Set(S.custom.exos.map(e=>e.exoId)), onDone:ids=>{
      editSnap();
      ids.forEach(id=>{ S.custom.exos.push({ exoId:id, sets:EXO_MAP[id].sets }); freshIds.add(id); });
      customEdit = true; // en train de composer : la liste reste éditable (séries, retrait, Compléter) jusqu'à « OK »
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
    const row = el && el.closest(".row");
    if(row && row.classList.contains("leaving")) return;   // double toucher : une seule ligne retirée
    sfx("remove");
    const i = +d.idx;
    const go = ()=>{
      const [ex] = S.custom.exos.splice(i,1); if(!ex) return; changed();
      const list = S.custom.exos;
      toast(`Retiré : ${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "exercice"}`, null, ()=>{ if(S.custom.exos!==list || list.includes(ex)) return; list.splice(Math.min(i, list.length), 0, ex); changed(); });
    };
    if(row){ row.classList.add("leaving"); setTimeout(go, 220); } else go();
  },
  customClear(){
    confirmSheet({ title:"Vider ma séance ?", html:"Les exercices choisis seront retirés. Mes séances ne changent pas.", ok:"Vider", danger:true,
      onOk:()=>{ S.custom = { exos:[] }; save(); renderTodaySoft(); } });
  },
  startExpress(){
    if(S.draft && S.draft.startedAt) return;
    const s = buildExpressSession(); if(!s.exos.length) return;
    S.draft = s; S.draft.startedAt = new Date().toISOString(); warmStart(S.draft);
    liveFocusIdx = 0; completeShown = false;
    save(); scrollTodayTop(); renderViewAnimated("today");
    showLaunch(S.draft);
  },
  startCustom(){
    if(!S.custom.exos.length) return;
    S.draft = buildCustomSession(S.custom.exos, S.custom.name);
    const planned = plannedTemplate();
    if(S.custom.tplId){ S.draft.tplId = S.custom.tplId; S.draft.planned = !!planned && planned.id===S.custom.tplId; }
    S.draft.startedAt = new Date().toISOString(); warmStart(S.draft);
    liveFocusIdx = 0; completeShown = false;
    save(); scrollTodayTop(); renderViewAnimated("today");
    showLaunch(S.draft);
  },
  saveTemplateOpen(){
    // « Ma séance » s'enregistre via l'éditeur, pré-rempli (et relié à sa séance si elle en vient)
    openTplEditor(S.custom.tplId || null, { n:S.custom.name||"", exos:S.custom.exos.map(e=>({ exoId:e.exoId, sets:e.sets })), fromCustom:true, lite:true,
      ...(S.custom.tplId ? {} : { days:(S.custom.pendingDays||[]).slice() }) });
  },

  missCatchUp(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id, planDate: todayISO() };
    S.settings.todayTab = "custom"; t.exos.forEach(e=>freshIds.add(e.exoId));
    save(); renderTodaySoft(); toast(`« ${t.n} » prête dans Ma séance : en route pour le rattrapage`, "repeat");
  },
  missSkip(d){ S.meta.missSkip = d.iso+":"+d.id; save(); changed(); },
  loadTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    S.custom = { exos: clone(t.exos), name: t.n, tplId: t.id }; S.settings.todayTab = "custom"; customEdit = false; heroAll = false;
    t.exos.forEach(e=>freshIds.add(e.exoId));
    closeSheet(); save(); renderTodaySoft(); toast(`« ${t.n} » prête dans Ma séance`);
    setTimeout(()=>{ const g = qs("#v-today .group.builder"); if(g) g.scrollIntoView({ behavior:"smooth", block:"center" }); }, 260);
  },
  deleteTemplate(d){
    const t = S.templates.find(x=>x.id===d.id); if(!t) return;
    confirmSheet({ title:`Supprimer « ${t.n} » ?`, html:"Elle sera retirée de Mes séances, avec ses jours prévus. L'historique ne change pas.", ok:"Supprimer", danger:true, onOk:()=>{
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
    if(el && el.classList.contains("fav-toggle")){ el.classList.toggle("on", on); el.setAttribute("aria-pressed", on); el.setAttribute("aria-label", on ? "Retirer des favoris" : "Ajouter aux favoris");
      el.classList.remove("pop"); if(on){ void el.offsetWidth; el.classList.add("pop"); } }
    haptic(10); sfx(on ? "fav" : "close"); closeModalIfMenu();
    toast(on ? `Ajouté aux favoris : ${n}` : `Retiré des favoris : ${n}`, "star");
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
    toast(`Retiré : ${EXO_MAP[ex.exoId] ? EXO_MAP[ex.exoId].n : "exercice"}`, null, ()=>{
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
    save(); if(!patchFocusSteps(+d.exi)) refreshFocusRegion();
  },
  stepWeight(d){
    const ex = S.draft.exos[+d.exi], def = EXO_MAP[ex.exoId], st = ex.sets[+d.si], old = st.weight;
    const v = stepWeightValue(def, old||0, parseInt(d.d,10));
    ex.sets.forEach((s,i)=>{ if(i>=+d.si && !s.done && s.weight===old) s.weight = v; });
    st.weight = v;
    valRoll = { f:"weight", d: parseInt(d.d,10)>0 ? "up" : "down" }; sfx("step", parseInt(d.d,10)>0);
    save(); if(!patchFocusSteps(+d.exi)) refreshFocusRegion();
  },

  validateSet(d){
    const exi = +d.exi;
    const ex = S.draft && S.draft.exos[exi], def = ex && EXO_MAP[ex.exoId];
    if(!def) return;   // séance déjà terminée (double appui) ou exercice disparu
    const si = ex.sets.findIndex(s=>!s.done);
    if(si<0) return;
    S.draft.lastSetAt = Date.now();
    const st = ex.sets[si];
    let [bx,by] = centerOf(".validate");
    if(bx==null){ [bx,by] = centerOf(".focus-card .sx-sets"); if(bx==null){ bx = innerWidth/2; by = innerHeight/2; } }
    // les textes flottants partent de la série validée (sa case), sinon de la rangée des séries
    const dotsR = (qs(".focus-card .sx-set.cur")||qs(".focus-card .sx-sets")||{getBoundingClientRect:()=>null}).getBoundingClientRect();
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
      // record > exercice terminé > mieux que la dernière fois > série (la fin de séance a son propre son)
      sfx(st.pr ? "pr" : fin || !rest ? "exo" : beat ? "beat" : "set"); }
    haptic(st.pr ? [25, 40, 25] : 18); // la coche franche : une vibration nette (deux pour un record)
    justDone = { exi, si }; savedFresh = true;
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
    // une seule carte, deux lignes à filets (comme le récapitulatif d'Apple Forme) : le conseil, puis ton historique
    const facts = `<div class="exo-facts">
        <div class="ef-row"><div><b>${e.sets} × ${e.repsMin}–${e.repsMax}</b><span>${isTimed(e)?"secondes":"répétitions"} conseillées</span></div>
          <div><b>${restFor(e)} s</b><span>de repos</span></div>
          <div><b>${e.uni?"1 côté":"2 côtés"}</b><span>${e.uni?"à la fois":"en même temps"}</span></div></div>
        ${pr.count ? `<div class="ef-row"><div><b>${pr.count}</b><span>séance${pr.count>1?"s":""}</span></div>
          <div><b>${pr.maxWeight?fmtLoad(e, pr.maxWeight):"–"}</b><span>record charge</span></div>
          <div><b>${last?fmtRelative(last.session.date):"–"}</b><span>dernière fois</span></div></div>`
        : `<div class="ef-note">${ii("sparkle")}<span>Première fois : commence léger pour prendre tes repères.</span></div>`}
      </div>`;
    const similar = availableExos().filter(x=>x.id!==e.id && x.muscles[0]===e.muscles[0]).slice(0,4);
    const liveIdx = live ? S.draft.exos.findIndex(x=>x.exoId===e.id) : -1;
    const simHTML = similar.length ? `<h2 class="sh">Même muscle principal</h2><div class="group">${similar.map(x=>`<div class="row">
        <button class="row-main" data-a="showExoInfo" data-id="${x.id}">${exoIcon(x)}<div class="grow"><div class="t">${esc(x.n)}</div><div class="s">${catLabel(x)}</div></div><span class="info-dot">i</span></button>
        ${liveIdx>=0 && ctx!=="picker" ? `<button class="chip" data-a="swapFromInfo" data-idx="${liveIdx}" data-id="${x.id}">Remplacer</button>` : infoAddButton(x.id, true)}
      </div>`).join("")}</div>` : "";
    const sheetEl = qs("#overlay .sheet");
    sheetEl.innerHTML = `<div class="sheet-grab"></div><div class="sheet-hd${canBack?" te-hd":""}">${hd}</div>
      <div class="sheet-body">
      <div class="exo-hero r-${region}">
        <div class="exo-stage r-${region}">${exoAnimSVG(e)}</div>
        <div class="nm">${esc(e.n)}</div>${e.aka ? `<div class="nm-aka">${esc(e.aka)}</div>` : ""}
        <div class="exo-tags"><span class="rtag r-${region}">${REGIONS[region].n}</span><span class="etag">${sfIcon(EQUIP_GLYPH[cat.id]||"wrench", "gray", "xs")} ${esc(cat.n)}</span>${e.equip.includes("bench")?`<span class="etag">+ banc</span>`:""}</div>
      </div>
      <div class="exo-muscle-chips">${e.muscles.map((m,i)=>`<span class="chip mchip ${i===0?"main":""}">${MUSCLE_MAP[m].n}${i===0?" <small>principal</small>":""}</span>`).join("")}</div>
      ${e.muscles.some(m=>m!=="cardio") ? `<div class="exo-mm">${exoMuscleMap(e)}</div>` : ""}
      ${facts}
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
      // retour à la liste (gardée telle quelle sous la fiche) : sélection visible et bouton « Ajouter n » à jour
      pickerSyncRows(id, i<0); refreshPickerFooter();
      while(sheetStack.length && !sheetStack[sheetStack.length-1].isPicker) sheetStackPop();
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

  // « Terminer » : enregistrer, abandonner ou continuer, dans une seule feuille d'actions (tout fait : on enregistre)
  finishSession(){
    if(!S.draft) return;
    const c = liveCounts(S.draft);
    if(c.done && !c.left) return finalizeSession();
    finishSheet();
  },
  abandonSession(){ finishSheet(); },
  // abandon immédiat, mais rattrapable 5 s (« Annuler » dans le message)
  abandonNow(){
    const draft = S.draft, idx = liveFocusIdx; if(!draft) return;
    closeSheet(); S.draft = null; liveFocusIdx = 0; stopRestTimer(); save(); renderViewAnimated("today");
    toast("Séance abandonnée", "trash", ()=>{ if(S.draft && S.draft.startedAt) return; S.draft = draft; liveFocusIdx = idx; save(); renderViewAnimated("today"); });
  },
});
function finishSheet(){
  const c = liveCounts(S.draft);
  actionSheet({ label:"Terminer la séance", cancel:"Reprendre la séance", onYes:finalizeSession,
    msg: c.done ? `${nb(c.done, "série")} sur ${c.total} faite${c.done>1?"s":""}. Les séries non validées ne seront pas enregistrées.` : "Aucune série validée : il n'y a rien à enregistrer.",
    actions: [...(c.done ? [{ a:"confirmYes", t:"Enregistrer et terminer" }] : []), { a:"abandonNow", t:"Abandonner la séance", danger:true }] });
}
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
      ${lt ? `<div class="ds-f"><div class="mini-step"><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="weight" data-d="-1" aria-label="Charge plus légère">−</button><span>${lt==="bands" ? esc(bandLabel(s.weight||1)).slice(0,6) : fmtDec(s.weight||0)}</span><button data-a="dsStep" data-exi="${exi}" data-si="${si}" data-f="weight" data-d="1" aria-label="Plus lourd">+</button></div><small>${lt==="bands"?"élastique":"kg"}</small></div>` : ""}
      ${s.pr ? `<span class="ds-pr" title="Record">${ii("bolt")}</span>` : ""}
      <button class="icon-btn ds-undo" data-a="dsUndo" data-exi="${exi}" data-si="${si}" aria-label="Annuler la validation de la série ${si+1}">${icon("undo")}</button>
    </div>`).join("");
  return `<div class="group">${rows || `<div class="row"><div class="grow s">Aucune série validée.</div></div>`}</div>`;
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
