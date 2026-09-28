// ================= VUE : PROFIL =================
const GOAL_LABELS = { force:"Force", hypertrophie:"Prise de masse", endurance:"Endurance" };
const LEN_LABELS = { court:"Courte (≈20 min)", moyen:"Moyenne (≈35 min)", long:"Longue (≈50 min)" };
const LEVEL_LABELS = { debutant:"Débutant·e", intermediaire:"Intermédiaire", avance:"Avancé·e" };
const LEVEL_HINTS = { debutant:"Moins d'un an de musculation régulière : exercices accessibles, technique d'abord.", intermediaire:"Un à trois ans de pratique : tous les exercices standard.", avance:"Plus de trois ans : variantes exigeantes privilégiées." };

function ownedEquipCount(){ return EQUIP_TYPES.filter(e=>!e.always && S.equipment.owned[e.id]).length; }

function profileHeroHTML(){
  const lv = levelInfo(), name = (S.settings.name||"").trim();
  const since = firstSessionDate();
  const c = tierCounts();
  const initial = name ? esc(name[0].toUpperCase()) : `<svg viewBox="0 0 24 24" class="ph-person">${GLYPHS.person.replace(/#fff/g,"currentColor")}</svg>`;
  return `<div class="profile-hero stagger" style="--i:0">
    <button class="ph-avatar" data-a="editName" aria-label="Modifier ton prénom"><span>${initial}</span><em>${lv.level}</em></button>
    <div class="ph-main">
      <button class="ph-name" data-a="editName">${name?esc(name):"Ajoute ton prénom"} ${icon("edit")}</button>
      <div class="ph-title">Niveau ${lv.level} · ${esc(lv.title)}</div>
      <div class="xpbar"><span style="width:${Math.round(lv.pct*100)}%"></span></div>
      <div class="ph-sub">${since?`Membre actif depuis le ${fmtDate(since)} ${parseISO(since).getFullYear()}`:"Ta première séance t'attend"}</div>
    </div>
  </div>
  <div class="ph-medals stagger" style="--i:1">
    ${[1,2,3,4].map(k=>`<div><span class="pip big t${k}"></span><b data-count="${c[k]}">${c[k]}</b><small>${TIERS[k].n}</small></div>`).join("")}
  </div>`;
}
let profMoreOpen = false;
function profileStatsHTML(){
  if(!S.sessions.length) return "";
  const fav = favoriteExercise(), wd = favoriteWeekday(), moment = favoriteMoment(), bw = bestWeek();
  const avg = Math.round(totalDurationSec()/S.sessions.length);
  const rows = [
    [["dumbbell","orange"],"Séances terminées", fmtNum(S.sessions.length), `${sessionsInYear()} cette année`],
    [["flame","red"],"Semaines d'affilée", currentStreakWeeks(), `record : ${maxStreakWeeksEver()}`],
    [["star","yellow"],"Exercice favori", fav?`${fav.n}×`:"–", fav?esc(fav.def.n):""],
    [["calendar","red"],"Jour préféré", wd?JOURS[(wd.i+1)%7]:"–", moment?`plutôt ${moment}`:""],
    [["stopwatch","teal"],"Durée moyenne", fmtDuration(avg), `${fmtDec(totalDurationSec()/3600)} h au total`],
    [["trophy","yellow"],"Meilleure semaine", bw?`${bw.n} séance${bw.n>1?"s":""}`:"–", bw?`semaine du ${fmtDate(bw.wk)}`:""],
    [["mountain","brown"],"Tonnage total", fmtKg(totalVolumeAllTime()), `${fmtNum(totalSets())} séries validées`],
    [["bolt","purple"],"Records battus", S.meta.prCount||0, `${distinctExosCount()} exercice${distinctExosCount()>1?"s":""} pratiqué${distinctExosCount()>1?"s":""}`],
  ];
  const lifts = topLifts(5);
  return `<h2 class="sh">Mes habitudes<button class="more" data-a="profMore">${profMoreOpen?"Moins":"Plus"}</button></h2>
    <div class="group habits ${profMoreOpen?"open":""}">${rows.map((r,i)=>`<div class="row stat-row stagger ${i>=4?"extra":""}" style="--i:${i+2}">
      ${sfIcon(r[0][0], r[0][1])}
      <div class="grow"><div class="t">${r[1]}</div>${r[3]?`<div class="s">${r[3]}</div>`:""}</div>
      <div class="val strong">${r[2]}</div>
    </div>`).join("")}</div>
    ${lifts.length?`<h2 class="sh">Mes records</h2><div class="group">${lifts.map((l,i)=>`<button class="row tap stagger" style="--i:${i+10}" data-a="openExoChart" data-id="${l.def.id}">
      <div class="rank">${i+1}</div>
      <div class="grow"><div class="t">${esc(l.def.n)}</div><div class="s">${l.r} ${isTimed(l.def)?"s":"reps"} · ${fmtRelative(l.date)}</div></div>
      <div class="val strong">${fmtDec(l.w)} kg</div><span class="chev">${icon("chev")}</span>
    </button>`).join("")}</div>`:""}`;
}

Object.assign(ACT, {
  profMore(d, el){
    profMoreOpen = !profMoreOpen;
    const g = qs("#v-profil .group.habits");
    if(el) el.textContent = profMoreOpen ? "Moins" : "Plus";
    if(!g) return changed();
    morphHeight(g, ()=>{ g.classList.toggle("open", profMoreOpen); g.classList.remove("clp-in"); if(profMoreOpen){ void g.offsetWidth; g.classList.add("clp-in"); } });
  },
});
function renderProfil(){
  return `<div class="navbar"><div class="nb-title">Profil</div></div><div class="content">
    <h1 class="lt">Profil</h1>
    ${profileHeroHTML()}
    ${profileStatsHTML()}

    <h2 class="sh">Entraînement</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openEquip">
        ${sfIcon("toolbox","orange")}
        <div class="grow"><div class="t">Matériel</div><div class="s">${ownedEquipCount()} équipement${ownedEquipCount()>1?"s":""} renseigné${ownedEquipCount()>1?"s":""}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openGoals">
        ${sfIcon("target","red")}
        <div class="grow"><div class="t">Objectifs</div><div class="s">${GOAL_LABELS[S.goals.overall]} · ${S.goals.daysPerWeek}×/sem.</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openBody">
        ${sfIcon("scale","mint")}
        <div class="grow"><div class="t">Poids du corps</div><div class="s">${bodyRowText()}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openExoPrefs">
        ${sfIcon("list","blue")}
        <div class="grow"><div class="t">Exercices inclus / exclus</div><div class="s">${S.prefs.excluded.length} exclu${S.prefs.excluded.length>1?"s":""} · ${S.prefs.included.length} privilégié${S.prefs.included.length>1?"s":""}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>

    <h2 class="sh">Suggestion par IA externe</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openExportImport">
        ${sfIcon("sparkles","purple")}
        <div class="grow"><div class="t">Exporter / importer un programme</div><div class="s">${S.importedProgram.length? S.importedProgram.length+" séance(s) importée(s) en attente" : "Aucun programme importé"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>

    <h2 class="sh">Mes données</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="backupData">
        ${sfIcon("download","green")}
        <div class="grow"><div class="t">Sauvegarder mes données</div><div class="s">${backupStatusText()}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openStorage">
        ${sfIcon("storage","gray")}
        <div class="grow"><div class="t">Espace de stockage</div><div class="s">${storageRowText()}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="restoreData">
        ${sfIcon("restore","teal")}
        <div class="grow"><div class="t">Restaurer une sauvegarde</div><div class="s">Fichier .json créé par Forge</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      ${isStandalone() ? "" : `<button class="row tap" style="width:100%" data-a="openInstall">
        ${sfIcon("phone","blue")}
        <div class="grow"><div class="t">Installer sur l'écran d'accueil</div><div class="s">Plein écran, hors ligne, données protégées</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>`}
    </div>

    <h2 class="sh">Réglages</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openAppearance">
        ${sfIcon("contrast","indigo")}
        <div class="grow"><div class="t">Apparence</div><div class="s">${S.settings.theme==="auto"?"Automatique":S.settings.theme==="dark"?"Sombre":"Clair"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <div class="row">
        ${sfIcon("speaker","pink")}
        <div class="grow"><div class="t">Sons</div><div class="s">Séries, records, repos, lancement</div></div>
        <button class="switch ${S.settings.sound!==false?"on":""}" aria-label="Sons" data-a="toggleSound"></button>
      </div>
      <div class="row sub-setting ${S.settings.sound===false?"off":""}">
        ${sfIcon("tap","gray")}
        <div class="grow"><div class="t">Clics de l'interface</div><div class="s">Petit « toc » sur les sélections et les +/−</div></div>
        <button class="switch ${S.settings.uiSound!==false?"on":""}" aria-label="Clics de l'interface" data-a="toggleUiSound"></button>
      </div>
      <button class="row tap" style="width:100%" data-a="confirmReset">
        ${sfIcon("trash","red")}
        <div class="grow"><div class="t">Réinitialiser toutes les données</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openAbout">
        ${sfIcon("info","gray")}
        <div class="grow"><div class="t">À propos</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>
    <p class="hr-note" style="margin:16px 20px 40px">Forge v${APP_VERSION} — toutes les données restent stockées localement sur cet appareil.</p>
  </div>`;
}

// ---------- Sauvegarde / restauration / installation ----------
// Tout est stocké sur l'appareil : sans sauvegarde, un effacement des données du site
// (Safari efface le stockage d'un site non installé après 7 jours sans visite) serait définitif.
function isStandalone(){ return !!(window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches)); }
function backupStatusText(){
  const b = S.meta.lastBackup;
  if(!b) return S.sessions.length ? "Jamais sauvegardé — recommandé" : "Un fichier à garder dans Fichiers ou iCloud";
  const n = daysBetween(b, todayISO()), since = S.sessions.length-(S.meta.backupSessions||0);
  return `Dernière : ${n===0?"aujourd'hui":n===1?"hier":`il y a ${n} jours`}${since>0?` · ${since} séance${since>1?"s":""} depuis`:""}`;
}
function backupDue(){
  if(S.sessions.length<5) return false;
  if(S.meta.backupSnooze && daysBetween(S.meta.backupSnooze, todayISO())<14) return false;
  if(!S.meta.lastBackup) return true;
  return daysBetween(S.meta.lastBackup, todayISO())>=21 && S.sessions.length-(S.meta.backupSessions||0)>=6;
}
async function backupData(){
  persistNow();
  const payload = JSON.stringify({ app:"Forge", format:1, version:APP_VERSION, exportedAt:new Date().toISOString(), data:S });
  const name = `forge-sauvegarde-${todayISO()}.json`;
  let shared = false;
  try{
    const file = new File([payload], name, { type:"application/json" });
    if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:"Sauvegarde Forge" }); shared = true; }
  }catch(e){ if(e && e.name==="AbortError") return; }
  if(!shared){
    const url = URL.createObjectURL(new Blob([payload], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }
  S.meta.lastBackup = todayISO(); S.meta.backupSessions = S.sessions.length; delete S.meta.backupSnooze;
  save(); changed(); sfx("set"); toast("Sauvegarde créée. Garde le fichier dans Fichiers ou iCloud", "check");
}
function restoreData(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
  document.body.appendChild(inp);
  inp.addEventListener("change", async ()=>{
    const f = inp.files && inp.files[0]; inp.remove(); if(!f) return;
    let data;
    try{ const o = JSON.parse(await f.text()); data = o && o.data ? o.data : o; }catch(e){ data = null; }
    if(!data || !Array.isArray(data.sessions)){ openModal(`<div style="font-weight:700;color:var(--red)">Fichier non reconnu</div><div class="hr-note" style="margin-top:8px">Choisis un fichier de sauvegarde créé par Forge (forge-sauvegarde-….json).</div><button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`); return; }
    const n = data.sessions.length, t = (data.templates||[]).length;
    confirmSheet({ title:"Restaurer cette sauvegarde ?", html:`${n} séance${n>1?"s":""} et ${t} séance${t>1?"s":""} enregistrée${t>1?"s":""}. Les données actuelles de cet appareil seront remplacées (une copie de secours est gardée).`, ok:"Restaurer", danger:true, onOk:()=>{
      try{ localStorage.setItem(STORAGE_KEY+".avant-restauration", JSON.stringify(S)); }catch(e){}
      S = normalizeState(data);
      S.meta.lastBackup = S.meta.lastBackup || todayISO();
      save(); persistNow(); applyTheme(); checkMedals(true);
      renderViewAnimated(currentTab); toast(`Sauvegarde restaurée : ${n} séance${n>1?"s":""}`);
    }});
  });
  inp.click();
}
function openInstall(){
  openSheet(`<div class="sheet-hd"><span class="t">Installer Forge</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
      <p class="body" style="margin:0 4px 14px">Installée sur l'écran d'accueil, Forge s'ouvre en plein écran comme une vraie app, fonctionne sans réseau, et Safari ne peut plus effacer tes données après quelques jours sans visite.</p>
      <div class="group install-steps">
        <div class="row"><span class="step-n">1</span><div class="grow"><div class="t">Touche le bouton Partager</div><div class="s">Le carré avec une flèche vers le haut, dans la barre de Safari</div></div></div>
        <div class="row"><span class="step-n">2</span><div class="grow"><div class="t">Choisis « Sur l'écran d'accueil »</div><div class="s">Fais défiler la liste si besoin</div></div></div>
        <div class="row"><span class="step-n">3</span><div class="grow"><div class="t">Ouvre Forge depuis son icône</div><div class="s">Tes séances actuelles ne sont pas transférées automatiquement : fais d'abord une sauvegarde, puis restaure-la dans l'app installée</div></div></div>
      </div>
      <div class="btnrow"><button class="btn secondary" data-a="backupData">${icon("bookmark")} Faire une sauvegarde d'abord</button></div>
    </div>`);
}

// ---------- Matériel ----------
const EQUIP_GLYPH = { dumbbells:"dumbbell", barbell:"barbell", kettlebell:"kettlebell", bench:"bench", bench_incline:"benchIncline", bench_press:"benchPress", rack:"rack", pullup_bar:"bar", dip_bars:"dips", suspension:"straps", ab_roller:"wheel", bands:"band", jump_rope:"rope", mat:"mat", bodyweight:"person" };
const EQUIP_COLOR = { dumbbells:"orange", barbell:"indigo", kettlebell:"brown", bench:"teal", bench_incline:"teal", bench_press:"indigo", rack:"gray", pullup_bar:"blue", dip_bars:"blue", suspension:"yellow", ab_roller:"red", bands:"green", jump_rope:"pink", mat:"purple", bodyweight:"mint" };
function equipBodyHTML(){
  const rows = EQUIP_TYPES.filter(e=>!e.always).map(e=>{
    const on = S.equipment.owned[e.id];
    return `<div class="row">
      ${sfIcon(EQUIP_GLYPH[e.id]||"wrench", EQUIP_COLOR[e.id]||"gray")}
      <div class="grow"><div class="t">${esc(e.n)}</div>${e.hint && !e.loadable ? `<div class="s wrap">${esc(e.hint)}</div>` : ""}</div>
      <button class="switch ${on?"on":""}" data-a="toggleEquip" data-id="${e.id}"></button>
    </div>`;
  }).join("");
  const weightEditors = EQUIP_TYPES.filter(e=>e.loadable && S.equipment.owned[e.id]).map(e=>{
    if(e.id==="bands"){
      const own = new Set(S.equipment.weights.bands||[]);
      return `<div class="card" style="margin-top:12px">
        <div style="font-weight:700;margin-bottom:2px">${esc(e.n)}</div>
        <div class="hr-note" style="margin:0 0 10px">${esc(e.hint)} La progression passera d'une résistance à la suivante.</div>
        <div class="chips" style="padding:0">${[1,2,3,4,5].map(v=>`<button class="chip ${own.has(v)?"on":""}" data-a="toggleBand" data-v="${v}">${bandLabel(v)}</button>`).join("")}</div>
      </div>`;
    }
    const list = (S.equipment.weights[e.id]||[]).slice().sort((a,b)=>a-b);
    const chips = list.map(w=>`<span class="chip on">${w} ${e.unit} <button class="chip-x" data-a="removeWeight" data-id="${e.id}" data-w="${w}" aria-label="Retirer ${w} ${e.unit}">${icon("close")}</button></span>`).join("");
    return `<div class="card" style="margin-top:12px">
      <div style="font-weight:700;margin-bottom:2px">${esc(e.n)}</div>
      <div class="hr-note" style="margin:0 0 10px">${esc(e.hint||"")}</div>
      <div class="chips" style="padding:0 0 10px">${chips||'<span class="hr-note" style="margin:0">Aucun poids renseigné</span>'}</div>
      <div style="display:flex;gap:8px">
        <input type="text" inputmode="decimal" placeholder="${e.unit}" id="wadd-${e.id}" style="flex:1;min-width:0;background:var(--fill2);border:0;border-radius:10px;padding:0 12px;height:38px">
        <button class="btn sm" style="flex:none;width:auto" data-a="addWeight" data-id="${e.id}">Ajouter</button>
      </div>
    </div>`;
  }).join("");
  const customs = S.equipment.custom.map(c=>`<div class="row">${sfIcon("wrench","gray")}<div class="grow"><div class="t">${esc(c.n)}</div></div><button class="icon-btn" data-a="removeCustom" data-id="${c.id}">${icon("close")}</button></div>`).join("");
  return `<div class="group">${rows}</div>${weightEditors}
    <h2 class="sh">Autre équipement</h2>
    <div class="hr-note" style="margin-top:-6px">Pour mémoire : ces équipements n'influencent pas les séances proposées. Le matériel ci-dessus, lui, est pris en compte.</div>
    <div class="group" style="margin-top:10px">${customs}
      <div class="row"><input placeholder="Nom de l'équipement" id="customEquipName" style="flex:1;border:0;background:transparent;height:100%;font-size:calc(17rem/17)"><button class="btn sm" data-a="addCustomEquip">Ajouter</button></div>
    </div>`;
}
function openEquip(){
  openSheet(`<div class="sheet-hd"><span class="t">Matériel</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${equipBodyHTML()}</div>`);
}
function refreshEquip(){ const b=qs(".sheet-body"); if(b) b.innerHTML = equipBodyHTML(); }

// ---------- Objectifs ----------
function goalsBodyHTML(){
  const overallChips = Object.keys(GOAL_LABELS).map(k=>`<button class="chip ${S.goals.overall===k?"on":""}" data-a="setGoalOverall" data-v="${k}">${GOAL_LABELS[k]}</button>`).join("");
  const lenChips = Object.keys(LEN_LABELS).map(k=>`<button class="chip ${S.goals.sessionLength===k?"on":""}" data-a="setSessionLength" data-v="${k}">${LEN_LABELS[k]}</button>`).join("");
  const emphasisRows = MUSCLES.filter(m=>m.id!=="cardio").map(m=>{
    const v = S.goals.emphasis[m.id]||"normal";
    return `<div class="row">
      <div class="grow t">${esc(m.n)}</div>
      <button class="chip ${v==="prioriser"?"on":""}" data-a="cycleEmphasis" data-id="${m.id}">${v==="prioriser"?"Prioriser":v==="eviter"?"À éviter":"Normal"}</button>
    </div>`;
  }).join("");
  return `<h2 class="sh" style="margin-top:6px">Objectif principal</h2><div class="chips">${overallChips}</div>
    <h2 class="sh">Fréquence visée</h2>
    <div class="field" style="padding:10px 14px"><div class="stepper">
      <button data-a="stepDays" data-d="-1">−</button><div class="val">${S.goals.daysPerWeek}×/sem.</div><button data-a="stepDays" data-d="1">+</button>
    </div></div>
    <h2 class="sh">Niveau</h2><div class="chips">${Object.keys(LEVEL_LABELS).map(k=>`<button class="chip ${(S.goals.level||"intermediaire")===k?"on":""}" data-a="setLevel" data-v="${k}">${LEVEL_LABELS[k]}</button>`).join("")}</div>
    <p class="hr-note">${LEVEL_HINTS[S.goals.level||"intermediaire"]}</p>
    <h2 class="sh">Durée de séance</h2><div class="chips">${lenChips}</div>
    <h2 class="sh">Exercices par séance proposée</h2>
    <div class="field" style="padding:10px 14px"><div class="stepper">
      <button data-a="stepExoCount" data-d="-1" aria-label="Moins d'exercices">−</button><div class="val">${sessionSize()} exercices</div><button data-a="stepExoCount" data-d="1" aria-label="Plus d'exercices">+</button>
    </div></div>
    <p class="hr-note">${S.goals.exoCount ? "Réglage personnalisé. " : "Réglé automatiquement selon la durée. "}Environ ${sessionSize()*3} séries, ≈ ${Math.round(sessionSize()*3*(40+75)/60/5)*5} min.</p>
    <h2 class="sh">Groupes musculaires</h2>
    <p class="hr-note" style="margin-top:-6px">Touche un groupe pour faire défiler : normal → à prioriser → à éviter.</p>
    <div class="group" style="margin-top:10px">${emphasisRows}</div>`;
}
function openGoals(){
  openSheet(`<div class="sheet-hd"><span class="t">Objectifs</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${goalsBodyHTML()}</div>`);
}
function refreshGoals(){ const b=qs(".sheet-body"); if(b) b.innerHTML = goalsBodyHTML(); }

// ---------- Exercices inclus / exclus ----------
function exoPrefsBodyHTML(){
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  return `<p class="hr-note" style="margin:0 20px 4px">${ii("star","star")} = à privilégier dans les propositions · Exclure = ne jamais le proposer (blessure, goût…). Les exercices grisés demandent du matériel que tu n'as pas renseigné.</p>` +
  EXO_CATS.map(c=>{
    const list = EXOS.filter(e=>exoCategory(e)===c.id).sort((a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr"));
    const rows = list.map(e=>{
      const excl = isExcluded(e.id), incl = isIncluded(e.id), avail = hasEquip(S.equipment, e.equip);
      return `<div class="row ${avail?"":"unavail"}">
        <button class="row-main" data-a="showExoInfo" data-id="${e.id}" style="flex:1">${exoIcon(e)}<div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${e.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")}${e.equip.includes("bench")?" · banc":""}</div></div></button>
        <button class="chip ${incl?"on":""}" aria-label="Privilégier" data-a="toggleIncluded" data-id="${e.id}">${ii("star")}</button>
        <button class="chip ${excl?"excl":""}" data-a="toggleExcluded" data-id="${e.id}">Exclure</button>
      </div>`;
    }).join("");
    return `<h2 class="sh"><span class="sh-ico">${sfIcon(EQUIP_GLYPH[c.id]||"wrench", EQUIP_COLOR[c.id]||"gray","sm")}${esc(c.n)}</span><span class="more" style="color:var(--label2)">${list.length}</span></h2><div class="group">${rows}</div>`;
  }).join("");
}
const PATTERN_LABEL = { squat:"Squat", hinge:"Hanche", push:"Poussée", pull:"Tirage", lunge:"Fentes", core:"Gainage", calf:"Mollets" };
function openExoPrefs(){
  openSheet(`<div class="sheet-hd"><span class="t">Exercices</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${exoPrefsBodyHTML()}</div>`);
}
function refreshExoPrefs(){ const b=qs(".sheet-body"); if(b) b.innerHTML = exoPrefsBodyHTML(); }

// ---------- Export / import IA ----------
function exportImportBodyHTML(){
  const importedRows = S.importedProgram.map((s,i)=>`<div class="row"><div class="grow t">${esc(s.nom||s.name||("Séance "+(i+1)))}</div>${i===0?'<span class="chip on">Prochaine</span>':""}</div>`).join("");
  return `<p class="body">Génère un prompt résumant ton profil (matériel, objectifs, historique) à coller dans l'IA de ton choix. Elle te répondra avec un programme au format JSON que tu peux ensuite importer ici.</p>
    <div class="btnrow" style="margin-top:16px"><button class="btn" data-a="copyPrompt">Copier le prompt</button></div>
    <div class="field" style="margin-top:12px"><textarea readonly rows="6" style="width:100%;border:0;background:transparent;font-size:calc(13rem/17);padding:10px 0;resize:vertical">${esc(buildExportPrompt())}</textarea></div>
    <div class="btnrow"><button class="btn secondary" data-a="triggerImport">Importer le fichier JSON reçu</button></div>
    ${S.importedProgram.length? `<h2 class="sh">Programme importé</h2><div class="group">${importedRows}</div><div class="btnrow"><button class="btn ghost" data-a="clearImported">Supprimer le programme importé</button></div>`:""}`;
}
function openExportImport(){
  openSheet(`<div class="sheet-hd"><span class="t">Suggestion par IA</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${exportImportBodyHTML()}</div>`);
}

// ---------- Apparence ----------
function appearanceBodyHTML(){
  const opts = [["auto","Auto"],["light","Clair"],["dark","Sombre"]];
  return `<div class="chips" style="padding-top:4px">${opts.map(([v,l])=>`<button class="chip ${S.settings.theme===v?"on":""}" data-a="setTheme" data-v="${v}">${l}</button>`).join("")}</div>`;
}
function openAppearance(){
  openSheet(`<div class="sheet-hd"><span class="t">Apparence</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div><div class="sheet-body">${appearanceBodyHTML()}</div>`);
}

// ---------- À propos ----------
function openAbout(){
  openSheet(`<div class="sheet-hd"><span class="t">À propos</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
    <div class="sheet-body">
    <p class="body" style="margin-top:4px">Forge est une app de suivi de musculation pensée pour un usage solo sur iPhone. Elle propose une séance chaque jour à partir de ton matériel, de tes objectifs et de ton historique, grâce à un moteur de règles 100% local — aucune donnée n'est envoyée sur un serveur.</p>
    <h2 class="sh">Version</h2><p class="body">Forge v${APP_VERSION}</p>
    <h2 class="sh">Données</h2><p class="body">Toutes les données (séances, matériel, objectifs, trophées) restent stockées uniquement sur cet appareil, dans le stockage local du navigateur. Aucun compte, aucun serveur.</p>
    <h2 class="sh">Avertissement</h2><p class="body">Les consignes d'exécution proposées sont des repères techniques généraux. Elles ne remplacent pas l'avis d'un professionnel de santé ou d'un coach pour toute question médicale ou en cas de douleur.</p>
    <h2 class="sh">Copyright</h2><p class="body">${COPYRIGHT}</p>
    </div>`);
}

Object.assign(ACT, {
  editName(){
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">Ton prénom</div>
      <div class="num-field"><input id="nameInput" type="text" maxlength="30" placeholder="Prénom" value="${esc(S.settings.name||"")}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        <button class="btn" data-a="saveName">Enregistrer</button>
        <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
      </div>`);
    setTimeout(()=>{ const i=qs("#nameInput"); if(i) i.focus(); }, 80);
  },
  saveName(){ S.settings.name = ((qs("#nameInput")||{}).value||"").trim(); closeSheet(); save(); changed(); },
  openEquip, openGoals, openExoPrefs, openExportImport, openAppearance, openAbout,
  backupData(){ backupData(); }, restoreData(){ restoreData(); }, openInstall(){ openInstall(); },
  backupLater(){ S.meta.backupSnooze = todayISO(); save(); const c = qs(".backup-nudge"); if(c){ c.classList.add("leaving"); setTimeout(()=>changed(), 250); } else changed(); },
  toggleEquip(d){ S.equipment.owned[d.id] = !S.equipment.owned[d.id]; save(); refreshEquip(); regenerateDraftIfIdle(); },
  addWeight(d){
    const input = qs("#wadd-"+d.id); const v = parseFloat(String(input.value).replace(",", "."));
    if(!isNaN(v) && v>0 && v<=500){ S.equipment.weights[d.id] = Array.from(new Set([...(S.equipment.weights[d.id]||[]), v])); save(); }
    refreshEquip();
  },
  toggleBand(d){
    const v = +d.v, cur = new Set(S.equipment.weights.bands||[]);
    if(cur.has(v)) cur.delete(v); else cur.add(v);
    S.equipment.weights.bands = Array.from(cur).sort(); save(); refreshEquip();
  },
  removeWeight(d){
    S.equipment.weights[d.id] = (S.equipment.weights[d.id]||[]).filter(w=>w!==parseFloat(d.w));
    save(); refreshEquip();
  },
  addCustomEquip(){
    const input = qs("#customEquipName"); const v = (input.value||"").trim();
    if(v){ S.equipment.custom.push({id:uid(),n:v}); save(); }
    refreshEquip();
  },
  removeCustom(d){ S.equipment.custom = S.equipment.custom.filter(c=>c.id!==d.id); save(); refreshEquip(); },

  setGoalOverall(d){ S.goals.overall = d.v; save(); refreshGoals(); },
  setSessionLength(d){ S.goals.sessionLength = d.v; S.goals.exoCount = 0; save(); refreshGoals(); regenerateDraftIfIdle(); },
  setLevel(d){ S.goals.level = d.v; save(); refreshGoals(); regenerateDraftIfIdle(); },
  stepExoCount(d){ S.goals.exoCount = Math.max(2, Math.min(10, sessionSize()+parseInt(d.d,10))); save(); refreshGoals(); regenerateDraftIfIdle(); },
  stepDays(d){ S.goals.daysPerWeek = Math.max(2,Math.min(6, S.goals.daysPerWeek+parseInt(d.d,10))); save(); refreshGoals(); },
  cycleEmphasis(d){
    const cur = S.goals.emphasis[d.id]||"normal";
    S.goals.emphasis[d.id] = cur==="normal"?"prioriser":cur==="prioriser"?"eviter":"normal";
    save(); refreshGoals();
  },

  toggleExcluded(d){
    const i = S.prefs.excluded.indexOf(d.id);
    if(i>=0) S.prefs.excluded.splice(i,1); else { S.prefs.excluded.push(d.id); S.prefs.included = S.prefs.included.filter(x=>x!==d.id); }
    save(); refreshExoPrefs();
  },
  toggleIncluded(d){
    const i = S.prefs.included.indexOf(d.id);
    if(i>=0) S.prefs.included.splice(i,1); else { S.prefs.included.push(d.id); S.prefs.excluded = S.prefs.excluded.filter(x=>x!==d.id); }
    save(); refreshExoPrefs();
  },

  copyPrompt(){
    const text = buildExportPrompt();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(()=>toast("Prompt copié !")).catch(()=>toast("Copie impossible — sélectionne le texte manuellement"));
    } else toast("Sélectionne le texte ci-dessous pour le copier");
  },
  triggerImport(){ const f = qs("#fileImport"); if(f) f.click(); },
  clearImported(){
    confirmSheet({ title:"Supprimer le programme importé ?", ok:"Supprimer", danger:true, onOk:()=>{ S.importedProgram=[]; save(); closeSheet(); changed(); } });
  },

  toggleSound(d, el){
    S.settings.sound = S.settings.sound===false; save(); el.classList.toggle("on", S.settings.sound);
    const sub = qs(".sub-setting"); if(sub) sub.classList.toggle("off", !S.settings.sound);
    if(S.settings.sound) sfx("set");
  },
  toggleUiSound(d, el){ S.settings.uiSound = S.settings.uiSound===false; save(); el.classList.toggle("on", S.settings.uiSound); if(S.settings.uiSound) setTimeout(()=>sfx("tick"), 80); },
  setTheme(d){ S.settings.theme = d.v; save(); applyTheme(); const b=qs(".sheet-body"); if(b) b.innerHTML = appearanceBodyHTML(); changed(); },

  confirmReset(){
    confirmSheet({ title:"Réinitialiser toutes les données ?", html:"Cette action est irréversible : séances, matériel, objectifs et trophées seront définitivement supprimés.", ok:"Tout supprimer", danger:true,
      onOk:()=>{ persistBlocked = true; localStorage.removeItem(STORAGE_KEY); idbClear().then(()=>location.reload()); } });
  },
});
VIEWS.profil = renderProfil;

// ---------- poids du corps (facultatif) ----------
// Le poids varie de 1 à 2 kg d'un jour à l'autre (eau, glycogène, repas) : on montre la
// tendance sur plusieurs semaines plutôt que la dernière pesée seule.
function bodyLast(){ return S.body[S.body.length-1]; }
function bodyRowText(){
  const l = bodyLast();
  return l ? `${fmtDec(l.kg)} kg · ${fmtRelative(l.d)}` : "Facultatif · suivre la tendance";
}
function bodyTrend(){
  // moyenne des pesées des 14 derniers jours comparée à celle des 14 jours précédant il y a 30 jours
  const t = todayISO(), avg = (from, to)=>{ const l = S.body.filter(e=>e.d>from && e.d<=to); return l.length ? l.reduce((a,e)=>a+e.kg,0)/l.length : null; };
  const now = avg(addDaysISO(t,-14), t), before = avg(addDaysISO(t,-44), addDaysISO(t,-30));
  return now!=null && before!=null ? round1(now-before) : null;
}
function bodyBodyHTML(){
  const l = bodyLast();
  const pts = S.body.filter(e=>e.d>addDaysISO(todayISO(),-365)).map(e=>{ const d = parseISO(e.d); return { label:`${d.getDate()} ${MOIS[d.getMonth()]}`, v:e.kg, tip:`${fmtDate(e.d)} : ${fmtDec(e.kg)} kg` }; });
  const tr = bodyTrend();
  const recent = S.body.slice(-6).reverse();
  return `<p class="body" style="margin-bottom:14px">Facultatif. Une pesée par semaine, le matin à jeun, suffit : le poids varie naturellement d'un à deux kilos d'un jour à l'autre, seule la tendance compte.</p>
    <div class="body-add"><div class="num-field"><input id="bodyIn" type="text" inputmode="decimal" maxlength="6" placeholder="${l?fmtDec(l.kg):"Ex. 72,5"}" aria-label="Poids en kg"><span>kg</span></div>
    <button class="btn" data-a="bodyAdd">Ajouter</button></div>
    ${pts.length ? `<div class="chart-card" style="margin-top:14px">
      <div class="cc-h"><div class="cc-t">12 derniers mois</div>${tr!=null?`<div class="cc-s">${tr>0?"+":tr<0?"−":"±"}${fmtDec(Math.abs(tr))} kg en 1 mois</div>`:""}</div>
      ${lineChart(pts, { fmt:v=>fmtDec(v)+" kg", aria:"Évolution du poids du corps" })}</div>` : ""}
    ${recent.length ? `<h2 class="sh">Pesées récentes</h2><div class="group">${recent.map(e=>`<div class="row"><div class="grow"><div class="t">${fmtDec(e.kg)} kg</div><div class="s">${esc(fmtDate(e.d,"long"))}</div></div><button class="icon-btn" data-a="bodyDel" data-d="${e.d}" aria-label="Supprimer cette pesée">${icon("close")}</button></div>`).join("")}</div>` : ""}`;
}
function refreshBody(){ const b = qs("#bodyBody"); if(b) b.innerHTML = bodyBodyHTML(); }
Object.assign(ACT, {
  openBody(){
    openSheet(`<div class="sheet-hd"><span class="t">Poids du corps</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body" id="bodyBody">${bodyBodyHTML()}</div>`, { tall:true });
  },
  bodyAdd(){
    const inp = qs("#bodyIn"); if(!inp) return;
    const v = round1(parseFloat(inp.value.replace(",",".")));
    if(!(v>=20 && v<=400)){ toast("Indique un poids entre 20 et 400 kg"); inp.focus(); return; }
    const d = todayISO();
    S.body = S.body.filter(e=>e.d!==d).concat([{ d, kg:v }]).sort((a,b)=>a.d<b.d?-1:1); // une pesée par jour
    changed(); refreshBody(); sfx("seg"); toast("Pesée enregistrée");
  },
  bodyDel(d){ S.body = S.body.filter(e=>e.d!==d.d); changed(); refreshBody(); },
});

// ---------- espace de stockage ----------
function fmtBytes(n){ return n<1024*1024 ? `${Math.max(1, Math.round(n/1024))} Ko` : `${fmtDec(n/1024/1024)} Mo`; }
function storageRowText(){ const u = storageUsage(); return `${fmtBytes(u)} utilisés sur ~5 Mo · ${Math.max(1, Math.round(u/STORAGE_QUOTA*100))} %`; }
function storageYearsLeft(){
  // place moyenne d'une séance et rythme des 12 derniers mois
  const n = S.sessions.length; if(n<5) return null;
  const per = JSON.stringify(S.sessions.map(packSession)).length*2/n;
  const since = addDaysISO(todayISO(), -365), perYear = Math.max(52, S.sessions.filter(s=>s.date>=since).length);
  return Math.floor((STORAGE_QUOTA*0.9 - storageUsage())/(per*perYear));
}
Object.assign(ACT, {
  openStorage(){
    const u = storageUsage(), pct = Math.min(100, u/STORAGE_QUOTA*100), yrs = storageYearsLeft();
    openSheet(`<div class="sheet-hd"><span class="t">Espace de stockage</span><button class="icon-btn" data-a="closesheet">${icon("close")}</button></div>
      <div class="sheet-body" id="stoBody">
        <div class="chart-card" style="margin-top:0">
          <div class="cc-h"><div class="cc-t">${fmtBytes(u)} sur ~5 Mo</div><div class="cc-s">${S.sessions.length} séance${S.sessions.length>1?"s":""} enregistrée${S.sessions.length>1?"s":""}</div></div>
          <div class="xpbar sto-bar"><span style="width:${Math.max(1.5, pct).toFixed(1)}%"></span></div>
          ${yrs!=null ? `<p class="hr-note" style="margin:10px 0 0">Au rythme actuel, il reste de la place pour environ <b>${yrs>99?"plus de 99":yrs} ans</b> d'entraînement.</p>` : ""}
        </div>
        <div class="group" style="margin-top:14px">
          <div class="row">${sfIcon("storage","green")}<div class="grow"><div class="t">Format compact</div><div class="s wrap">L'historique est enregistré sous une forme condensée, environ 2,5 fois plus légère.</div></div></div>
          <div class="row">${sfIcon("shield","blue")}<div class="grow"><div class="t">Copie de secours</div><div class="s wrap">Chaque enregistrement est aussi copié dans une seconde base (IndexedDB). Si l'espace principal est plein ou effacé, l'app repart de cette copie.</div></div></div>
          <div class="row">${sfIcon("lock","indigo")}<div class="grow"><div class="t">Protection</div><div class="s wrap" id="stoPersist">Vérification…</div></div></div>
        </div>
        <p class="hr-note" style="margin:12px 20px 0">Rien ne quitte ton téléphone. Pour ne rien perdre en changeant d'appareil, garde une sauvegarde dans Fichiers ou iCloud.</p>
        <div class="btnrow"><button class="btn secondary" data-a="backupData">${icon("bookmark")} Faire une sauvegarde</button></div>
      </div>`, { tall:true });
    const el = qs("#stoPersist");
    const setTxt = t=>{ if(el) el.textContent = t; };
    try{
      if(navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p=>setTxt(p ? "Stockage protégé : le système ne l'effacera pas pour libérer de la place." : isStandalone() ? "Stockage standard. L'app installée sur l'écran d'accueil garde ses données." : "Installe l'app sur l'écran d'accueil : Safari efface les données des sites non installés après 7 jours sans visite."));
      else setTxt(isStandalone() ? "App installée : les données sont conservées." : "Installe l'app sur l'écran d'accueil pour protéger tes données.");
    }catch(e){ setTxt("—"); }
  },
});
