// ================= VUE : PROFIL =================
// objectif principal : mêmes mots et même ordre qu'au premier lancement
const GOAL_LABELS = { hypertrophie:"Prendre du muscle", force:"Gagner en force", endurance:"Endurance et tonus" };
const GOAL_HINTS = { hypertrophie:"8 à 12 répétitions, ~10 séries par muscle et par semaine", force:"Moins de répétitions, charges plus lourdes", endurance:"Plus de répétitions, repos courts" };
// liste à cocher (une seule réponse), comme les réglages iOS
function checkRows(keys, labels, cur, a, hints){
  return keys.map(k=>`<button class="row tap ck-row ${cur===k?"on":""}" data-a="${a}" data-v="${k}" role="radio" aria-checked="${cur===k}"><div class="grow"><div class="t">${labels[k]}</div>${hints&&hints[k]?`<div class="s">${hints[k]}</div>`:""}</div><em class="ob-ck">${icon("check")}</em></button>`).join("");
}
// rangée avec un stepper compact à droite
function stepRow(t, v, a, less, more){
  return `<div class="row"><div class="grow t">${t}</div><div class="mini-step"><button data-a="${a}" data-d="-1" aria-label="${less}">−</button><span>${v}</span><button data-a="${a}" data-d="1" aria-label="${more}">+</button></div></div>`;
}
const LEN_LABELS = { court:"Courte (≈ 20 min)", moyen:"Moyenne (≈ 35 min)", long:"Longue (≈ 50 min)" };
// niveau dit en durée de pratique : clair, et sans accord à faire
const LEVEL_LABELS = { debutant:"Moins d'un an", intermediaire:"1 à 3 ans", avance:"Plus de 3 ans" };

const LEVEL_HINTS = { debutant:"Exercices accessibles, la technique d'abord.", intermediaire:"Tous les exercices standard.", avance:"Variantes exigeantes privilégiées." };

function ownedEquipCount(){ return EQUIP_TYPES.filter(e=>!e.always && S.equipment.owned[e.id]).length; }

// ---------- images de profil : petites scènes dessinées (≈ 400 octets chacune), dans les couleurs de l'app ----------
const AVATARS = {
  sommet:`<rect width="64" height="64" fill="#F4E3D3"/><circle cx="46" cy="18" r="7" fill="#E07A55"/><path d="M0 64 22 26l9 12 7-9 26 35Z" fill="#5B6472"/><path d="m22 26 6.5 9-4-2-2.5 4-4-3Z" fill="#fff"/><path d="m38 29 5 6.5-3-1-2 3-2.5-2.5Z" fill="#fff"/>`,
  nuit:`<rect width="64" height="64" fill="#1B2440"/><circle cx="44" cy="18" r="8" fill="#F2EEE4"/><circle cx="48" cy="15" r="7" fill="#1B2440"/><g fill="#fff"><circle cx="14" cy="14" r="1.2"/><circle cx="26" cy="9" r=".9"/><circle cx="20" cy="24" r=".8"/><circle cx="56" cy="32" r=".9"/></g><path d="M0 64 18 36l10 12 12-18 24 34Z" fill="#2E3A5C"/><path d="m40 30 6 8.5-3.5-1.5-2.5 3-3-2.5Z" fill="#C9D3E8"/>`,
  lac:`<rect width="64" height="64" fill="#DCEAF2"/><path d="M0 40 20 18l10 11 8-8 26 19Z" fill="#59708A"/><path d="m20 18 5 6-3-1-2 2.5-3-2Z" fill="#fff"/><rect y="40" width="64" height="24" fill="#8FB3C9"/><path d="M0 40 20 60l10-10 8 7 26-17Z" fill="#59708A" opacity=".35"/><path d="M10 50h12M34 54h16M18 58h10" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`,
  aube:`<rect width="64" height="64" fill="#F6D9C2"/><circle cx="32" cy="40" r="12" fill="#F2A25F"/><path d="M0 44c10-6 20-7 32-3s22 3 32-2v25H0Z" fill="#D9774E"/><path d="M0 52c12-5 22-5 34-1s20 3 30-1v14H0Z" fill="#B85A3A"/><path d="M0 59c14-3 26-3 38 0s18 2 26 0v5H0Z" fill="#8E4430"/>`,
  sapin:`<rect width="64" height="64" fill="#E6EFE6"/><path d="M0 50c14-8 30-10 64-4v18H0Z" fill="#9DBF9A"/><g fill="#3F6B4E"><path d="m20 18-9 16h5l-7 12h22l-7-12h5Z"/><path d="m42 26-7 12h4l-5 9h16l-5-9h4Z"/></g><path d="M19 46h3v6h-3zM41 47h2.5v5H41z" fill="#5C4535"/>`,
  drapeau:`<rect width="64" height="64" fill="#EFE7DF"/><path d="M0 64 30 24l34 40Z" fill="#6E7682"/><path d="m30 24 7 9-4-1.5-3 3.5-3-3-4 1.5Z" fill="#fff"/><path d="M30 24V8" stroke="#2A2F36" stroke-width="2" stroke-linecap="round"/><path d="M30 8h13l-3.5 4.5L43 17H30Z" fill="#E07A55"/>`,
  vague:`<rect width="64" height="64" fill="#E3EEF3"/><circle cx="46" cy="16" r="6" fill="#F2A25F"/><path d="M0 40c8 0 10-12 22-12 9 0 12 8 9 12-2 3-7 2-6-2 3 4 10 4 14-1 6-7 16-6 25 1v26H0Z" fill="#3E7C9B"/><path d="M0 50c10-3 20 3 32 0s22-3 32 0v14H0Z" fill="#2D5F79"/>`,
  boussole:`<rect width="64" height="64" fill="#F1E7DC"/><circle cx="32" cy="32" r="20" fill="none" stroke="#5B6472" stroke-width="2.5"/><g fill="#5B6472"><circle cx="32" cy="12" r="1.6"/><circle cx="32" cy="52" r="1.6"/><circle cx="12" cy="32" r="1.6"/><circle cx="52" cy="32" r="1.6"/></g><path d="m32 17 5 15H27Z" fill="#E07A55"/><path d="m32 47-5-15h10Z" fill="#5B6472"/><circle cx="32" cy="32" r="2.4" fill="#F1E7DC"/>`,
  kettle:`<rect width="64" height="64" fill="#EDE6E0"/><path d="M23 30a9 9 0 0 1 18 0" fill="none" stroke="#2F3540" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="40" r="14" fill="#2F3540"/><path d="M24 50h16" stroke="#E07A55" stroke-width="3" stroke-linecap="round"/><path d="M25 36a8 8 0 0 1 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".35"/>`,
};
function avatarSVG(id){ return AVATARS[id] ? `<svg class="av-svg" viewBox="0 0 64 64" aria-hidden="true">${AVATARS[id]}</svg>` : ""; }
// carte d'identité : qui tu es et depuis quand (l'ascension est sur l'accueil, les chiffres dans Progrès)
function profileHeroHTML(){
  const name = (S.settings.name||"").trim(), since = firstSessionDate(), n = S.sessions.length;
  const initial = name ? esc(name[0].toUpperCase()) : `<svg viewBox="0 0 24 24" class="ph-person">${GLYPHS.person.replace(/#fff/g,"currentColor")}</svg>`;
  const d = since ? parseISO(since) : null, y = d && d.getFullYear()!==parseISO(todayISO()).getFullYear() ? " "+d.getFullYear() : "";
  return `<button class="profile-hero stagger" style="--i:0" data-a="editName" aria-label="${name ? esc(name)+" : modifier ton prénom" : "Ajoute ton prénom"}">
    <span class="ph-avatar${AVATARS[S.settings.avatar] ? " pic" : ""}" aria-hidden="true"><span>${AVATARS[S.settings.avatar] ? avatarSVG(S.settings.avatar) : initial}</span></span>
    <span class="ph-main">
      <span class="ph-name">${name ? esc(name) : "Ajoute ton prénom"}</span>
      <span class="ph-sub">${n ? `${nb(n, "séance")} depuis ${MOIS_LONG[d.getMonth()]}${y}` : "Ta première séance t'attend"}</span>
    </span>
  </button>`;
}
// Trophées : les trois derniers gagnés et le prochain à portée ; la collection s'ouvre au toucher
function trophiesCardHTML(){
  const won = MEDALS.filter(m=>medalTier(m)).length, total = MEDALS.length;
  const recent = Object.keys(S.medals||{}).map(id=>{ const m = MEDAL_MAP[id], st = S.medals[id]; return m && st.t ? { m, t:st.t, d:(st.d||{})[st.t]||"" } : null; })
    .filter(Boolean).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,3);
  const next = MEDALS.filter(m=>!m.secret).map(m=>({ m, p:medalProgress(m) })).filter(x=>x.p.next!=null).sort((a,b)=>b.p.pct-a.p.pct).slice(0, 4-recent.length);
  const thumbs = recent.map(r=>`<span class="pt-th">${medalHTML(r.m, r.t, "sm", true)}</span>`).join("") + next.map(x=>`<span class="pt-th next">${medalHTML(x.m, x.p.t+1, "sm", true)}</span>`).join("");
  return `<h2 class="sh">Trophées</h2>
    <button class="pt-card stagger" style="--i:1" data-a="openTrophies" aria-label="Trophées : ${won} sur ${total} ${won>1?"gagnés":"gagné"}. Voir tous les trophées">
      <span class="pt-thumbs" aria-hidden="true">${thumbs}</span>
      <span class="pt-foot"><span>${won} gagné${won>1?"s":""} sur ${total}</span><span class="chev">${icon("chev")}</span></span>
    </button>`;
}
// ---------- réglages regroupés (loi de Hick : peu de choix sur l'écran, le détail à un toucher) ----------
const MOTIV = [["beat","target","orange","Comparer à la dernière fois","Ta série de la dernière fois, en séance"],
  ["nextGoal","flag","red","Prochain cap sur l'accueil","Le but le plus proche : record à battre, trophée, muscle à reprendre"],
  ["trend","trendUp","green","Progression de force","Ta courbe depuis tes débuts, ton statut et les alertes de pause"],
  ["thenNow","chart","blue","Avant et maintenant","Tes séries d'avant face à celles de maintenant"]];
function sessionPrefsHTML(){
  return `<div class="group">
      <div class="row rest-row">
        ${sfIcon("stopwatch","teal")}
        <div class="grow"><div class="t">Temps de repos</div></div>
      </div>
      <div class="rest-seg">${[["court","Court"],["normal","Conseillé"],["long","Long"]].map(([k,l])=>`<button class="chip ${(S.settings.rest||"normal")===k?"on":""}" data-a="setRest" data-v="${k}" aria-pressed="${(S.settings.rest||"normal")===k}">${l}</button>`).join("")}</div>
      <div class="row">
        ${sfIcon("flame","orange")}
        <div class="grow"><div class="t">Échauffement</div></div>
        <button class="switch ${S.settings.warmup?"on":""}" role="switch" aria-checked="${!!S.settings.warmup}" aria-label="Échauffement" data-a="toggleWarmup"></button>
      </div>
      <div class="row">
        ${sfIcon("mat","indigo")}
        <div class="grow"><div class="t">Étirements en fin de séance</div></div>
        <button class="switch ${S.settings.stretching?"on":""}" role="switch" aria-checked="${!!(S.settings.stretching)}" aria-label="Étirements en fin de séance" data-a="toggleStretching"></button>
      </div>
      <button class="row tap" style="width:100%" data-a="deloadHow">
        ${sfIcon("leaf","green")}
        <div class="grow"><div class="t">Semaine allégée</div><div class="s">${deloadActive() ? `En cours · jour ${Math.min(DELOAD.days, deloadDay())} sur ${DELOAD.days}` : S.settings.deloadTips===false ? "Pas de conseil automatique" : "Conseillée au bon moment"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <div class="row">
        ${sfIcon("sparkles","purple")}
        <div class="grow"><div class="t">Suggestions de l'app</div></div>
        <button class="switch ${appPicksOn()?"on":""}" role="switch" aria-checked="${!!(appPicksOn())}" aria-label="Suggestions de l'app dans Ma séance" data-a="toggleAppPicks"></button>
      </div>
    </div>`;
}
function motivHTML(){
  return `<div class="group"><button class="row tap" style="width:100%" data-a="editWhy" data-from="motiv">
        ${sfIcon("heart","red")}
        <div class="grow"><div class="t">Ton pourquoi</div><div class="s wrap">${S.settings.why ? `« ${esc(S.settings.why)} »` : ""}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button></div>
    <div class="group" style="margin-top:20px">
      ${MOTIV.map(([k,ic,c,t,sub])=>`<div class="row">
        ${sfIcon(ic,c)}
        <div class="grow"><div class="t">${t}</div></div>
        <button class="switch ${S.settings[k]!==false?"on":""}" role="switch" aria-checked="${!!(S.settings[k]!==false)}" aria-label="${t}" data-a="toggleMotiv" data-k="${k}"></button>
      </div>`).join("")}
    </div>`;
}
function dataMoreHTML(){
  return `<div class="group">
      <button class="row tap" style="width:100%" data-a="backupData">
        ${sfIcon("download","green")}
        <div class="grow"><div class="t">Sauvegarder mes données</div><div class="s">${backupStatusText()}</div></div>
      </button>
      ${canAutoBackup() ? `<div class="row">${sfIcon("repeat","green")}<div class="grow"><div class="t">Sauvegarde automatique</div><div class="s wrap">${S.settings.autoBackup ? "Réécrite après chaque séance" : "Choisis un fichier, il sera réécrit après chaque séance"}</div></div>
        <button class="switch ${S.settings.autoBackup ? "on" : ""}" role="switch" aria-checked="${!!S.settings.autoBackup}" aria-label="Sauvegarde automatique" data-a="toggleAutoBackup"></button></div>` : ""}
    </div>
    ${isStandalone() ? "" : `<div class="group" style="margin-top:14px">
      <button class="row tap" style="width:100%" data-a="openInstall">
        ${sfIcon("phone","blue")}
        <div class="grow"><div class="t">Installer sur l'écran d'accueil</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>`}
    <div class="group" style="margin-top:14px">
      <button class="row tap" style="width:100%" data-a="restoreData">
        ${sfIcon("restore","teal")}
        <div class="grow"><div class="t">Restaurer une sauvegarde</div></div>
      </button>
      <button class="row tap" style="width:100%" data-a="exportCSV">
        ${sfIcon("list","teal")}
        <div class="grow"><div class="t">Exporter l'historique (tableur)</div></div>
      </button>
      <button class="row tap" style="width:100%" data-a="openExportImport">
        ${sfIcon("sparkles","purple")}
        <div class="grow"><div class="t">Programme par IA</div><div class="s">${S.importedProgram.length? nb(S.importedProgram.length, "séance")+" à ajouter" : "Aucun programme importé"}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openStorage">
        ${sfIcon("storage","gray")}
        <div class="grow"><div class="t">Espace de stockage</div><div class="s">${storageRowText()}</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>
    <div class="group" style="margin-top:14px">
      <button class="row tap row-danger" style="width:100%" data-a="confirmReset">
        <div class="grow"><div class="t">Réinitialiser toutes les données</div></div>
      </button>
    </div>`;
}
function prefsSheet(title, body, again){
  openSheet(`<div class="sheet-hd"><span class="t">${title}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body prefs-body">${body}</div>`, { child:true, restore:again });
  sheetBackHead();
}
function themeLabel(){ return S.settings.theme==="auto" ? "Automatique" : S.settings.theme==="dark" ? "Sombre" : "Clair"; }
// dernière sauvegarde, en court ; en orange quand il est temps d'en refaire une
function backupShort(){
  const b = S.meta.lastBackup;
  if(!b) return S.sessions.length ? { t:"jamais", due:true } : { t:"", due:false };
  const n = daysBetween(b, todayISO());
  return { t:n===0 ? "aujourd'hui" : n===1 ? "hier" : `il y a ${n} j`, due:backupDue() };
}
function renderProfil(){
  const eq = ownedEquipCount(), bk = backupShort(), bl = bodyLast();
  return `<div class="navbar"><div class="nb-title">Profil</div></div><div class="content">
    <h1 class="lt">Profil</h1>
    ${profileHeroHTML()}
    ${trophiesCardHTML()}

    <h2 class="sh">Réglages</h2>
    <div class="group">
      <button class="row tap" style="width:100%" data-a="openGoals">
        ${sfIcon("target","gray")}
        <div class="grow"><div class="t">Objectifs</div></div><span class="val">${S.goals.daysPerWeek} par semaine</span>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openSessionPrefs">
        ${sfIcon("stopwatch","gray")}
        <div class="grow"><div class="t">Réglages des séances</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openEquip">
        ${sfIcon("toolbox","gray")}
        <div class="grow"><div class="t">Matériel</div></div><span class="val">${nb(eq, "équipement")}</span>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openExoPrefs">
        ${sfIcon("list","gray")}
        <div class="grow"><div class="t">Mes exercices</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openBody">
        ${sfIcon("scale","gray")}
        <div class="grow"><div class="t">Poids du corps</div></div>${bl ? `<span class="val">${fmtDec(bl.kg)} kg</span>` : ""}
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>
    <div class="group" style="margin-top:16px">
      <div class="row">
        ${sfIcon("speaker","gray")}
        <div class="grow"><div class="t">Sons</div></div>
        <button class="switch ${S.settings.sound!==false?"on":""}" role="switch" aria-checked="${!!(S.settings.sound!==false)}" aria-label="Sons" data-a="toggleSound"></button>
      </div>
      <div class="row sub-setting ${S.settings.sound===false?"off":""}">
        ${sfIcon("tap","gray")}
        <div class="grow"><div class="t">Clics de l'interface</div></div>
        <button class="switch ${S.settings.uiSound!==false?"on":""}" role="switch" aria-checked="${!!(S.settings.uiSound!==false)}" aria-label="Clics de l'interface" data-a="toggleUiSound"></button>
      </div>
      <div class="row">
        ${sfIcon("tap","gray")}
        <div class="grow"><div class="t">Retour haptique</div></div>
        ${hapticSwitch()}
      </div>
      <button class="row tap" style="width:100%" data-a="openAppearance">
        ${sfIcon("contrast","gray")}
        <div class="grow"><div class="t">Apparence</div></div><span class="val">${themeLabel()}</span>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openMotivation">
        ${sfIcon("flame","gray")}
        <div class="grow"><div class="t">Motivation</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openData">
        ${sfIcon("storage","gray")}
        <div class="grow"><div class="t">Données et sauvegarde</div></div>${bk.t ? `<span class="val${bk.due ? " due" : ""}">${bk.t}</span>` : ""}
        <span class="chev">${icon("chev")}</span>
      </button>
      <button class="row tap" style="width:100%" data-a="openAbout">
        ${sfIcon("info","gray")}
        <div class="grow"><div class="t">À propos</div></div>
        <span class="chev">${icon("chev")}</span>
      </button>
    </div>
    <div style="height:40px"></div>
  </div>`;
}

// ---------- Sauvegarde / restauration / installation ----------
// Tout est stocké sur l'appareil : sans sauvegarde, un effacement des données du site
// (Safari efface le stockage d'un site non installé après 7 jours sans visite) serait définitif.
function isStandalone(){ return !!(window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches)); }
function backupStatusText(){
  const b = S.meta.lastBackup;
  if(!b) return S.sessions.length ? "Aucune sauvegarde pour l'instant" : "Un fichier à garder dans Fichiers ou iCloud";
  const n = daysBetween(b, todayISO()), since = S.sessions.length-(S.meta.backupSessions||0);
  return `Dernière : ${n===0?"aujourd'hui":n===1?"hier":`il y a ${n} jours`}${since>0?` · ${since} séance${since>1?"s":""} depuis`:""}`;
}
function backupDue(){
  if(S.sessions.length<3) return false;
  if(S.settings.autoBackup && canAutoBackup()) return false;   // déjà faite toute seule
  if(S.meta.backupSnooze && daysBetween(S.meta.backupSnooze, todayISO())<7) return false;
  if(!S.meta.lastBackup) return true;
  // une semaine et trois séances depuis la dernière : on le rappelle (un toucher, sur l'accueil)
  return daysBetween(S.meta.lastBackup, todayISO())>=7 && S.sessions.length-(S.meta.backupSessions||0)>=3;
}
// fichier partagé (Fichiers, iCloud, AirDrop…) ou, à défaut, téléchargé
async function shareOrDownload(payload, name, type, title){
  try{
    const file = new File([payload], name, { type });
    if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title }); return true; }
  }catch(e){ if(e && e.name==="AbortError") return false; }
  const url = URL.createObjectURL(new Blob([payload], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 5000);
  return true;
}
// Historique en tableur (v4.0) : une ligne par série, séparateur « ; » et virgule décimale
// (Numbers et Excel en français l'ouvrent directement), UTF-8 avec BOM pour les accents.
function historyCSV(){
  // texte saisi (nom de séance, note) : une cellule qui commence par = + - @ serait lue comme une formule par
  // Excel ou Numbers (injection de formule) ; une apostrophe devant la neutralise
  const q = v=>{ let s = String(v==null?"":v); if(/^[=+\-@\t\r]/.test(s)) s = "'"+s; return /[";\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const dec = v=>v==null||v==="" ? "" : String(v).replace(".", ",");
  const lines = [["date","séance","exercice","série","répétitions","secondes","charge (kg)","élastique","record","note"].join(";")];
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId], name = def ? def.n : ex.exoId, timed = def && isTimed(def), lt = def && loadableTypeOf(def);
    ex.sets.filter(st=>st.done!==false).forEach((st,i)=>lines.push([s.date, q(sessionTitle(s)), q(name), i+1,
      timed ? "" : (st.reps||0), timed ? (st.reps||0) : "", lt && lt!=="bands" ? dec(st.weight) : "", lt==="bands" && st.weight ? q(bandLabel(st.weight)) : "",
      st.pr ? "oui" : "", i===0 ? q(s.note||"") : ""].join(";")));
  }));
  return "\ufeff"+lines.join("\r\n");
}
async function exportCSV(){
  if(!S.sessions.length){ toast("Aucune séance à exporter pour l'instant"); return; }
  const ok = await shareOrDownload(historyCSV(), `ascen-historique-${todayISO()}.csv`, "text/csv", "Historique ASCEN");
  if(ok){ sfx("set"); toast(`Historique exporté : ${S.sessions.length} séance${S.sessions.length>1?"s":""}`, "check"); }
}
// ---------- sauvegarde automatique ----------
// Toujours le même nom de fichier : enregistrée dans le même dossier de Fichiers, la nouvelle sauvegarde
// remplace l'ancienne (iOS demande de confirmer). Là où le navigateur sait écrire dans un fichier choisi
// une fois (Chrome, Edge sur ordinateur), l'app garde ce fichier et le réécrit seule après chaque séance.
// Safari sur iPhone ne le permet pas : il faut un geste à chaque fois (un seul toucher, rappel discret).
const BACKUP_NAME = "ASCEN-sauvegarde.json";
const canAutoBackup = ()=>typeof window.showSaveFilePicker==="function";
function backupPayload(){ return JSON.stringify({ app:"ASCEN", format:1, version:APP_VERSION, exportedAt:new Date().toISOString(), data:S }); }
function fsDB(){ return new Promise((ok, ko)=>{ try{ const r = indexedDB.open("ascen-files", 1); r.onupgradeneeded = ()=>r.result.createObjectStore("h"); r.onsuccess = ()=>ok(r.result); r.onerror = ()=>ko(r.error); }catch(e){ ko(e); } }); }
async function fsHandle(set){
  const db = await fsDB();
  return new Promise((ok, ko)=>{ const tx = db.transaction("h", set===undefined ? "readonly" : "readwrite"), st = tx.objectStore("h");
    const r = set===undefined ? st.get("backup") : set===null ? st.delete("backup") : st.put(set, "backup");
    r.onsuccess = ()=>ok(set===undefined ? r.result : null); r.onerror = ()=>ko(r.error); });
}
async function writeBackupTo(h){
  const w = await h.createWritable(); await w.write(backupPayload()); await w.close();
  S.meta.lastBackup = todayISO(); S.meta.backupSessions = S.sessions.length; delete S.meta.backupSnooze; save();
}
// après une séance : réécrit le fichier choisi, sans rien demander (si le navigateur a gardé l'autorisation)
async function autoBackup(){
  try{
    if(!S.settings.autoBackup || !canAutoBackup()) return false;
    const h = await fsHandle(); if(!h) return false;
    if(h.queryPermission && await h.queryPermission({ mode:"readwrite" })!=="granted") return false;
    persistNow(); await writeBackupTo(h); return true;
  }catch(e){ return false; }
}
async function backupData(){
  persistNow();
  // fichier choisi pour la sauvegarde automatique : on le réécrit directement
  if(S.settings.autoBackup && canAutoBackup()){
    try{ const h = await fsHandle();
      if(h && (!h.requestPermission || await h.requestPermission({ mode:"readwrite" })==="granted")){ await writeBackupTo(h); changed(); sfx("set"); toast("Sauvegarde mise à jour", "check"); return; } }catch(e){}
  }
  const payload = backupPayload();
  const name = BACKUP_NAME;
  let shared = false;
  try{
    const file = new File([payload], name, { type:"application/json" });
    if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:"Sauvegarde ASCEN" }); shared = true; }
  }catch(e){ if(e && e.name==="AbortError") return; }
  if(!shared){
    const url = URL.createObjectURL(new Blob([payload], { type:"application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
  }
  S.meta.lastBackup = todayISO(); S.meta.backupSessions = S.sessions.length; delete S.meta.backupSnooze;
  save(); changed(); sfx("set"); toast("Sauvegarde créée. Même dossier que la dernière fois : elle la remplace", "check");
}
function restoreData(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json,.json"; inp.style.display = "none";
  document.body.appendChild(inp);
  inp.addEventListener("change", async ()=>{
    const f = inp.files && inp.files[0]; inp.remove(); if(!f) return;
    let data;
    // une sauvegarde de plusieurs années pèse moins de 2 Mo : au-delà de 50 Mo, ce n'en est pas une
    try{ if(f.size>5e7) throw 0; const o = parseUntrusted(await f.text()); data = o && o.data ? o.data : o; }catch(e){ data = null; }
    if(!data || typeof data!=="object" || !(Array.isArray(data.sessions) || Array.isArray(data.zs))){ openModal(`<div style="font-weight:700;color:var(--red)">Fichier non reconnu</div><div class="hr-note" style="margin-top:8px">Choisis un fichier de sauvegarde créé par ASCEN (ascen-sauvegarde-….json).</div><button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`); return; }
    const n = (Array.isArray(data.sessions) && data.sessions.length ? data.sessions : data.zs || []).length, t = Array.isArray(data.templates) ? data.templates.length : 0;
    confirmSheet({ title:"Restaurer cette sauvegarde ?", html:`${nb(n, "séance")} dans l'historique${t ? ` et ${t} dans Mes séances` : ""}. Les données actuelles de cet appareil seront remplacées ; tu pourras annuler juste après.`, ok:"Restaurer", danger:true, onOk:()=>{
      try{ localStorage.setItem(STORAGE_KEY+".avant-restauration", JSON.stringify(S)); }catch(e){}
      let st; try{ st = normalizeState(data); }catch(e){ ERR_LOG.push({ at:new Date().toISOString(), where:"restauration", msg:String(e && e.message || e).slice(0,200) }); toast("Sauvegarde illisible : rien n'a été changé", "warn"); return; }
      if(S.draft) stopRestTimer();
      const prev = S;
      S = st;
      S.meta.lastBackup = S.meta.lastBackup || todayISO();
      upgradeRecords(); save(); persistNow(); applyTheme(); checkMedals(true);
      renderViewAnimated(currentTab);
      // « Annuler » remet les données d'avant (elles restent aussi en copie dans le stockage)
      toast(`Sauvegarde restaurée : ${nb(n, "séance")}`, null, ()=>{ S = prev; save(); persistNow(); applyTheme(); renderViewAnimated(currentTab); toast("Données d'avant remises"); });
    }});
  });
  inp.click();
}
function openInstall(){
  openSheet(`<div class="sheet-hd"><span class="t">Installer ASCEN</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
      <p class="body" style="margin:0 20px 14px">Installée sur l'écran d'accueil, ASCEN s'ouvre en plein écran, fonctionne sans réseau, et Safari ne peut plus effacer tes données après quelques jours sans visite.</p>
      <div class="group install-steps">
        <div class="row"><span class="step-n">1</span><div class="grow"><div class="t">Touche le bouton Partager</div><div class="s wrap">Le carré avec une flèche vers le haut, dans la barre de Safari</div></div></div>
        <div class="row"><span class="step-n">2</span><div class="grow"><div class="t">Choisis « Sur l'écran d'accueil »</div><div class="s wrap">Fais défiler la liste si besoin</div></div></div>
        <div class="row"><span class="step-n">3</span><div class="grow"><div class="t">Ouvre ASCEN depuis son icône</div><div class="s wrap">Tes séances actuelles ne sont pas transférées automatiquement : fais d'abord une sauvegarde, puis restaure-la dans l'app installée</div></div></div>
      </div>
      <div class="btnrow"><button class="btn secondary" data-a="backupData">${icon("bookmark")} Faire une sauvegarde d'abord</button></div>
    </div>`);
}

// Icône ajoutée avant la barre d'état fondue : iOS fige le style de la barre d'état au moment de l'ajout
// à l'écran d'accueil. L'ancienne icône s'ouvre donc avec une barre pleine (marge haute nulle, alors
// qu'une barre fondue laisse l'app passer dessous). Seul remède : réinstaller l'icône, en gardant ses données.
let legacySB = null;
function legacyStatusBar(){
  if(legacySB!==null) return legacySB;
  try{
    if(window.navigator.standalone!==true){ legacySB = false; return false; }
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
    document.body.appendChild(p); const h = p.offsetHeight; p.remove();
    legacySB = h===0;
  }catch(e){ legacySB = false; }
  return legacySB;
}
// ---------- Matériel ----------
const EQUIP_GLYPH = { stretch:"leaf", dumbbells:"dumbbell", barbell:"barbell", kettlebell:"kettlebell", bench:"bench", bench_incline:"benchIncline", bench_press:"benchPress", rack:"rack", pullup_bar:"bar", dip_bars:"dips", suspension:"straps", ab_roller:"wheel", bands:"band", jump_rope:"rope", mat:"mat", bodyweight:"person" };
function equipBodyHTML(){
  const rows = EQUIP_TYPES.filter(e=>!e.always).map(e=>{
    const on = S.equipment.owned[e.id];
    return `<div class="row">
      ${sfIcon(EQUIP_GLYPH[e.id]||"wrench", "gray")}
      <div class="grow"><div class="t">${esc(e.n)}</div>${e.hint && !e.loadable ? `<div class="s wrap">${esc(e.hint)}</div>` : ""}</div>
      <button class="switch ${on?"on":""}" role="switch" aria-checked="${!!(on)}" aria-label="${esc(e.n)}" data-a="toggleEquip" data-id="${e.id}"></button>
    </div>`;
  }).join("");
  const weightEditors = EQUIP_TYPES.filter(e=>e.loadable && S.equipment.owned[e.id]).map(e=>{
    if(e.id==="bands"){
      const own = new Set(S.equipment.weights.bands||[]);
      return `<div class="card" style="margin-top:12px">
        <div style="font-weight:700;margin-bottom:2px">${esc(e.n)}</div>
        <div class="hr-note" style="margin:0 0 10px">${esc(e.hint)}</div>
        <div class="chips" style="padding:0">${[1,2,3,4,5].map(v=>`<button class="chip ${own.has(v)?"on":""}" data-a="toggleBand" data-v="${v}">${bandLabel(v)}</button>`).join("")}</div>
      </div>`;
    }
    const list = (S.equipment.weights[e.id]||[]).slice().sort((a,b)=>a-b);
    const chips = list.map(w=>`<span class="chip on">${fmtW(w)} ${e.unit} <button class="chip-x" data-a="removeWeight" data-id="${e.id}" data-w="${w}" aria-label="Retirer ${fmtW(w)} ${e.unit}">${icon("close")}</button></span>`).join("");
    return `<div class="card" style="margin-top:12px">
      <div style="font-weight:700;margin-bottom:2px">${esc(e.n)}</div>
      <div class="hr-note" style="margin:0 0 10px">${esc(e.hint||"")}</div>
      <div class="chips" style="padding:0 0 10px">${chips||'<span class="hr-note" style="margin:0">Aucun poids renseigné</span>'}</div>
      <div style="display:flex;gap:8px">
        <input type="text" inputmode="decimal" enterkeyhint="done" maxlength="6" placeholder="${e.unit}" id="wadd-${e.id}" style="flex:1;min-width:0;background:var(--fill2);border:0;border-radius:10px;padding:0 12px;height:38px">
        <button class="btn sm" style="flex:none;width:auto" data-a="addWeight" data-id="${e.id}">Ajouter</button>
      </div>
    </div>`;
  }).join("");
  const customs = S.equipment.custom.map(c=>`<div class="row">${sfIcon("wrench","gray")}<div class="grow"><div class="t">${esc(c.n)}</div></div><button class="icon-btn" data-a="removeCustom" data-id="${c.id}" aria-label="Retirer ${esc(c.n)}">${icon("close")}</button></div>`).join("");
  return `<div class="group">${rows}</div>${weightEditors}
    <h2 class="sh">Autre équipement</h2>
    <div class="group">${customs}
      <div class="row"><input placeholder="Nom de l'équipement" id="customEquipName" maxlength="40" autocomplete="off" enterkeyhint="done" style="flex:1;border:0;background:transparent;height:100%;font-size:calc(17rem/17)"><button class="btn sm" data-a="addCustomEquip">Ajouter</button></div>
    </div>`;
}
function openEquip(){
  openSheet(`<div class="sheet-hd"><span class="t">Matériel</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body">${equipBodyHTML()}</div>`);
}
function refreshEquip(){ const b=qs(".sheet-body"); if(b) b.innerHTML = equipBodyHTML(); }

// ---------- Objectifs ----------
function goalsBodyHTML(){
  const lenChips = Object.keys(LEN_LABELS).map(k=>`<button class="chip ${S.goals.sessionLength===k?"on":""}" data-a="setSessionLength" data-v="${k}">${LEN_LABELS[k]}</button>`).join("");
  const emphasisRows = MUSCLES.filter(m=>m.id!=="cardio").map(m=>{
    const v = S.goals.emphasis[m.id]||"normal";
    return `<div class="row">
      <div class="grow t">${esc(m.n)}</div>
      <button class="chip ${v==="prioriser"?"on":""}" data-a="cycleEmphasis" data-id="${m.id}">${v==="prioriser"?"Prioriser":v==="eviter"?"À éviter":"Normal"}</button>
    </div>`;
  }).join("");
  return `<h2 class="sh" style="margin-top:6px">Objectif principal</h2><div class="group ob-list" role="radiogroup" aria-label="Objectif principal">${checkRows(Object.keys(GOAL_LABELS), GOAL_LABELS, S.goals.overall, "setGoalOverall", GOAL_HINTS)}</div>
    <h2 class="sh">Rythme</h2>
    <div class="group">${stepRow("Séances par semaine", S.goals.daysPerWeek, "stepDays", "Une séance de moins par semaine", "Une séance de plus par semaine")}
      ${stepRow("Exercices par séance", sessionSize(), "stepExoCount", "Moins d'exercices", "Plus d'exercices")}</div>
    <p class="hr-note">≈ ${sessionSize()*3} séries · ≈ ${Math.round(sessionSize()*3*(40+75)/60/5)*5} min</p>
    <h2 class="sh">Pratique de la musculation</h2><div class="chips">${Object.keys(LEVEL_LABELS).map(k=>`<button class="chip ${(S.goals.level||"intermediaire")===k?"on":""}" data-a="setLevel" data-v="${k}">${LEVEL_LABELS[k]}</button>`).join("")}</div>
    <h2 class="sh">Âge</h2><div class="chips">${[[false,"Moins de 65 ans"],[true,"65 ans et plus"]].map(([v,l])=>`<button class="chip ${!!S.goals.senior===v?"on":""}" data-a="setSenior" data-v="${v?1:0}" aria-pressed="${!!S.goals.senior===v}">${l}</button>`).join("")}</div>
    <h2 class="sh">Durée de séance</h2><div class="chips">${lenChips}</div>
    <h2 class="sh">Groupes musculaires</h2>
    <div class="group">${emphasisRows}</div>`;
}
function openGoals(){
  openSheet(`<div class="sheet-hd"><span class="t">Objectifs</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body">${goalsBodyHTML()}</div>`);
}
function refreshGoals(){ const b=qs(".sheet-body"); if(b){ const st = b.scrollTop; b.innerHTML = goalsBodyHTML(); b.scrollTop = st; } }

// ---------- Mes exercices : favoris et exclus ----------
// Exercices inclus / exclus : chaque catégorie ne liste que ce que ton matériel permet (tous au
// même aspect) ; ceux qui demandent un équipement que tu n'as pas sont regroupés à la fin, repliés,
// avec le matériel manquant indiqué (avant : mélangés et grisés, ce qui semblait incohérent).
function exoPrefRow(e, missing){
  const excl = isExcluded(e.id), incl = isIncluded(e.id);
  const sub = missing ? `Il manque : ${esc(missing)}` : e.muscles.map(m=>MUSCLE_MAP[m].n).join(" · ")+(e.equip.includes("bench")?" · banc":"");
  return `<div class="row">
    <button class="row-main" data-a="showExoInfo" data-id="${e.id}" style="flex:1">${exoIcon(e)}<div class="grow"><div class="t">${esc(e.n)}</div><div class="s">${sub}</div></div></button>
    <button class="chip fav ${incl?"on":""}" aria-label="${incl?"Retirer des favoris":"Ajouter aux favoris"} : ${esc(e.n)}" aria-pressed="${incl}" data-a="toggleIncluded" data-id="${e.id}">${ii("star")}</button>
    <button class="chip ${excl?"excl":""}" aria-pressed="${excl}" data-a="toggleExcluded" data-id="${e.id}">Exclure</button>
  </div>`;
}
function missingEquipLabel(e){
  return e.equip.filter(id=>!id.split("|").some(x=>ownsEquip(S.equipment, x)))
    .map(id=>id.split("|").map(x=>EQUIP_MAP[x] ? EQUIP_MAP[x].n : x).join(" ou ")).join(", ");
}
function exoPrefSort(){
  const muscleOrder = {}; MUSCLES.forEach((m,i)=>muscleOrder[m.id]=i);
  return (a,b)=>muscleOrder[a.muscles[0]]-muscleOrder[b.muscles[0]] || a.n.localeCompare(b.n,"fr");
}
// la section Favoris seule (redessinée quand un favori change, sans toucher au reste de la liste)
function exoFavsHTML(){
  const favs = S.prefs.included.map(id=>EXO_MAP[id]).filter(Boolean).sort(exoPrefSort());
  return favs.length ? `<h2 class="sh"><span class="sh-ico">${sfIcon("star","yellow","sm")}Favoris</span><span class="more" style="color:var(--label2)">${favs.length}</span></h2><div class="group">${favs.map(e=>exoPrefRow(e)).join("")}</div>` : "";
}
function exoPrefsBodyHTML(){
  const sortFn = exoPrefSort();
  const unavail = [];
  const cats = EXO_CATS.map(c=>{
    const all = EXOS.filter(e=>exoCategory(e)===c.id).sort(sortFn);
    const list = all.filter(e=>hasEquip(S.equipment, e.equip));
    all.forEach(e=>{ if(!list.includes(e)) unavail.push(e); });
    if(!list.length) return "";
    return `<h2 class="sh"><span class="sh-ico">${sfIcon(EQUIP_GLYPH[c.id]||"wrench", "gray","sm")}${esc(c.n)}</span><span class="more" style="color:var(--label2)">${list.length}</span></h2><div class="group">${list.map(e=>exoPrefRow(e)).join("")}</div>`;
  }).join("");
  const more = unavail.length ? `<details class="pref-more"><summary class="sh"><span>Sans ton matériel</span><span class="more">${unavail.length} ${icon("chev")}</span></summary>
      <div class="group">${unavail.sort(sortFn).map(e=>exoPrefRow(e, missingEquipLabel(e))).join("")}</div></details>` : "";
  return `<div id="epFavs">${exoFavsHTML()}</div>` + cats + more;
}
// un toucher sur ★ ou « Exclure » : seules les lignes de cet exercice et la section Favoris changent
function exoPrefSync(id){
  const b = qs(".ep-body"); if(!b){ refreshExoPrefs(); return; }
  const excl = isExcluded(id), incl = isIncluded(id), name = (EXO_MAP[id]||{}).n || "";
  qsa(`[data-a="toggleExcluded"][data-id="${id}"]`, b).forEach(c=>{ c.classList.toggle("excl", excl); c.setAttribute("aria-pressed", excl); });
  qsa(`[data-a="toggleIncluded"][data-id="${id}"]`, b).forEach(c=>{ c.classList.toggle("on", incl); c.setAttribute("aria-pressed", incl); c.setAttribute("aria-label", `${incl?"Retirer des favoris":"Ajouter aux favoris"} : ${name}`); });
  // la liste ne saute pas : si les Favoris (au-dessus) changent de hauteur, le défilement compense
  const f = qs("#epFavs", b); if(!f) return;
  const h0 = f.offsetHeight; f.innerHTML = exoFavsHTML();
  const dh = f.offsetHeight - h0; if(dh && b.scrollTop > f.offsetTop + 10) b.scrollTop += dh;
}
function openExoPrefs(){
  openSheet(`<div class="sheet-hd"><span class="t">Mes exercices</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body ep-body">${exoPrefsBodyHTML()}</div>`,
    { restore:openExoPrefs, refresh:el=>{ const b = qs(".sheet-body", el); if(!b) return; const top = b.scrollTop, open = !!qs(".pref-more[open]", b); b.innerHTML = exoPrefsBodyHTML(); if(open){ const d = qs(".pref-more", b); if(d) d.open = true; } b.scrollTop = top; } });
}
function refreshExoPrefs(){
  const b = qs(".sheet-body"); if(!b) return;
  const open = !!qs(".pref-more[open]", b), top = b.scrollTop; // la section repliée reste comme elle était
  b.innerHTML = exoPrefsBodyHTML();
  if(open){ const d = qs(".pref-more", b); if(d) d.open = true; }
  b.scrollTop = top;
}

// ---------- Export / import IA ----------
function exportImportBodyHTML(){
  const importedRows = S.importedProgram.map((s,i)=>`<div class="row"><div class="grow t">${esc(s.nom||("Séance "+(i+1)))}</div>${i===0?'<span class="chip on">Prochaine</span>':""}</div>`).join("");
  return `<p class="body">Copie cette demande dans une IA : elle te renverra un programme à importer ici.</p>
    <div class="btnrow" style="margin-top:16px"><button class="btn" data-a="copyPrompt">Copier la demande</button></div>
    <div class="field" style="margin-top:12px"><textarea readonly rows="6" style="width:100%;border:0;background:transparent;font-size:calc(13rem/17);padding:10px 0;resize:vertical">${esc(buildExportPrompt())}</textarea></div>
    <div class="btnrow"><button class="btn secondary" data-a="triggerImport">Importer le fichier reçu</button></div>
    ${S.importedProgram.length? `<h2 class="sh">Programme importé</h2><div class="group">${importedRows}</div><div class="btnrow"><button class="btn ghost te-del" data-a="clearImported">Supprimer le programme importé</button></div>`:""}`;
}
function openExportImport(){
  openSheet(`<div class="sheet-hd"><span class="t">Programme par IA</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body">${exportImportBodyHTML()}</div>`, { child:true, restore:openExportImport });
  sheetBackHead();
}

// ---------- Apparence ----------
// Apparence (refonte 5.0) : trois vignettes (clair, sombre, automatique) et, à part, la séance en sombre
function themeThumb(kind){
  const half = (dark, cls)=>`<span class="tt-half ${cls||""} ${dark ? "tt-dk" : "tt-lt"}"><i class="tt-t"></i><i class="tt-c"><b></b><b></b><em></em></i><i class="tt-c2"></i></span>`;
  return `<span class="tt-ph ${kind}" aria-hidden="true">${kind==="auto" ? half(false, "l")+half(true, "r") : half(kind==="dark")}</span>`;
}
function appearanceBodyHTML(){
  const th = S.settings.theme||"auto", dark = th==="dark", on = dark || S.settings.liveDark!==false;
  const opts = [["light","Clair"],["dark","Sombre"],["auto","Automatique"]];
  return `<h2 class="sh" style="margin-top:6px">Thème de l'app</h2>
    <div class="group tt-group" role="radiogroup" aria-label="Thème de l'app">${opts.map(([v,l])=>`<button class="tt-opt${th===v?" on":""}" role="radio" aria-checked="${th===v}" data-a="setTheme" data-v="${v}">${themeThumb(v)}<span class="tt-l">${l}</span><span class="tt-r" aria-hidden="true">${icon("check")}</span></button>`).join("")}</div>
    <h2 class="sh">Pendant la séance</h2>
    <div class="group"><div class="row${dark?" off":""}">
      <div class="grow"><div class="t">Séance en sombre</div></div>
      <button class="switch ${on?"on":""}" role="switch" aria-checked="${!!(on)}" aria-label="Séance en sombre" data-a="toggleLiveDark" ${dark?"disabled":""}></button>
    </div></div>`;
}
function openAppearance(){
  openSheet(`<div class="sheet-hd"><span class="t">Apparence</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body">${appearanceBodyHTML()}</div>`);
}

// ---------- À propos ----------
// Comme les réglages d'une app iOS : l'icône, le nom et la version en tête, puis des listes titrées ; les
// textes longs (sources, avertissement, droits) s'ouvrent chacun dans leur écran
const ABOUT_PAGES = {
  sources:["Sources des reliefs", ()=>`<p class="body">Les silhouettes des montagnes sont calculées depuis le relief réel :</p>
    <div class="group about-list"><div class="row"><div class="grow"><div class="t">Suisse</div><div class="s wrap">swisstopo swissALTI3D</div></div></div>
      <div class="row"><div class="grow"><div class="t">Reste du monde</div><div class="s wrap">Copernicus GLO-30, © DLR e.V. et Airbus, fourni par l'Union européenne et l'ESA</div></div></div>
      <div class="row"><div class="grow"><div class="t">Voies et refuges</div><div class="s wrap">© contributeurs OpenStreetMap (ODbL)</div></div></div></div>`],
  health:["Avertissement santé", ()=>`<div class="group about-txt"><p>Les consignes d'exécution sont des repères techniques généraux.</p><p>Elles ne remplacent pas l'avis d'un professionnel de santé ou d'un coach pour toute question médicale ou en cas de douleur.</p></div>`],
};
// mesures d'écran (pour comprendre un affichage décalé sur un appareil précis)
function screenDiag(){
  try{
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;left:0;top:0;width:1px;height:env(safe-area-inset-top,0px);border-bottom:solid 0 transparent;border-bottom-width:env(safe-area-inset-bottom,0px);visibility:hidden";
    document.body.appendChild(p); const t = p.clientHeight, b = p.offsetHeight - p.clientHeight; p.remove();
    const vg = getComputedStyle(document.documentElement).getPropertyValue("--vgap").trim() || "0px";
    return `${window.navigator.standalone===true ? "installée" : "web"} · page ${innerHeight} / écran ${screen.height} · haut ${t} · bas ${b} · écart ${vg}`;
  }catch(e){ return ""; }
}
function openAbout(){
  const row = (a, t, val, extra)=>`<${a ? "button" : "div"} class="row${a ? " tap" : ""}"${a ? ` style="width:100%" data-a="${a}"${extra||""}` : ""}><div class="grow"><div class="t">${t}</div></div>${val ? `<span class="val">${val}</span>` : ""}${a ? `<span class="chev">${icon("chev")}</span>` : ""}</${a ? "button" : "div"}>`;
  openSheet(`<div class="sheet-hd"><span class="t">À propos</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body about-body">
    <div class="about-hd"><img class="about-ic" src="icon-180.png" alt="" width="76" height="76"><b>ASCEN</b><span>Version ${APP_VERSION}</span></div>
    <h2 class="sh">Application</h2>
    <div class="group">${row("", "Données", "Sur cet appareil")}${row("", "Compte", "Aucun")}</div>
    <h2 class="sh">Mon ascension</h2>
    <div class="group">${row("ascHow", "Comment ça marche")}${row("aboutPage", "Sources des reliefs", "", ' data-k="sources"')}</div>
    <h2 class="sh">Mentions</h2>
    <div class="group">${row("aboutPage", "Avertissement santé", "", ' data-k="health"')}</div>
    <p class="about-ft">${COPYRIGHT}</p>
    <p class="about-diag">${esc(screenDiag())}</p>
    </div>`, { restore:openAbout });
}

let whyFrom = null; // « Ton pourquoi » ouvert depuis Motivation : on y revient après l'enregistrement
Object.assign(ACT, {
  editName(){
    const cur = S.settings.avatar, ini = esc(((S.settings.name||"").trim()[0]||"·").toUpperCase());
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">Ton profil</div>
      <div class="av-grid" role="radiogroup" aria-label="Image de profil">
        <button class="av-opt av-ini${!AVATARS[cur] ? " on" : ""}" data-a="setAvatar" data-v="" role="radio" aria-checked="${!AVATARS[cur]}" aria-label="Initiale"><span>${ini}</span></button>
        ${Object.keys(AVATARS).map(k=>`<button class="av-opt${cur===k ? " on" : ""}" data-a="setAvatar" data-v="${k}" role="radio" aria-checked="${cur===k}" aria-label="Image ${k}">${avatarSVG(k)}</button>`).join("")}
      </div>
      <div class="num-field txt"><input id="nameInput" type="text" maxlength="30" placeholder="Prénom" autocomplete="given-name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done" value="${esc(S.settings.name||"")}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        <button class="btn" data-a="saveName">Enregistrer</button>
        <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
      </div>`);
    // le clavier ne s'ouvre que s'il n'y a pas encore de prénom (on vient souvent choisir une image)
    if(!(S.settings.name||"").trim()) setTimeout(()=>{ const i=qs("#nameInput"); if(i) i.focus(); }, 80);
  },
  setAvatar(d){
    if(d.v) S.settings.avatar = d.v; else delete S.settings.avatar;
    qsa(".av-opt").forEach(b=>{ const on = (b.dataset.v||"")===(d.v||""); b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    sfx("seg"); haptic(6); save();
    const hero = qs("#v-profil .profile-hero"); if(hero){ hero.outerHTML = profileHeroHTML(); const h = qs("#v-profil .profile-hero"); if(h) h.classList.remove("stagger"); }
  },
  aboutPage(d){
    const P = ABOUT_PAGES[d.k]; if(!P) return;
    openSheet(`<div class="sheet-hd"><span class="t">${P[0]}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
      <div class="sheet-body about-body">${P[1]()}</div>`, { child:true, restore:()=>ACT.aboutPage(d) });
    sheetBackHead();
  },
  openSessionPrefs(){ prefsSheet("Réglages des séances", sessionPrefsHTML(), ()=>ACT.openSessionPrefs()); },
  openMotivation(){ prefsSheet("Motivation", motivHTML(), ()=>ACT.openMotivation()); },
  openData(){ prefsSheet("Données et sauvegarde", dataMoreHTML(), ()=>ACT.openData()); },
  openTrophies(){
    openSheet(`<div class="sheet-hd"><span class="t">Trophées</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
      <div class="sheet-body trophies-body">${medalsPaneHTML()}</div>`, { tall:true, restore:()=>ACT.openTrophies() });
    const b = qs(".trophies-body"); if(b && typeof mountTrophy3D==="function") mountTrophy3D(b);
  },
  setRest(d){ if(!REST_SCALE[d.v]) return; S.settings.rest = d.v; save(); changed();
    qsa('[data-a="setRest"]').forEach(b=>{ const on = b.dataset.v===d.v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    toast(d.v==="normal" ? "Repos conseillés" : d.v==="court" ? "Repos plus courts (≈ −30 %)" : "Repos plus longs (≈ +35 %)", "timer"); },
  editWhy(d){
    whyFrom = d && d.from;
    openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:6px">Ton pourquoi</div>
      <div class="num-field txt"><input id="whyInput" type="text" maxlength="120" enterkeyhint="done" placeholder="Ex. être en forme pour la randonnée d'été" value="${esc(S.settings.why||"")}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
        <button class="btn" data-a="saveWhy">Enregistrer</button>
        <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
      </div>`);
    setTimeout(()=>{ const i=qs("#whyInput"); if(i) i.focus(); }, 80);
  },
  saveWhy(){ S.settings.why = ((qs("#whyInput")||{}).value||"").trim().slice(0,120); closeSheet(); save(); changed(); if(whyFrom==="motiv") ACT.openMotivation(); whyFrom = null; },
  saveName(){ S.settings.name = ((qs("#nameInput")||{}).value||"").trim(); closeSheet(); save(); changed(); },
  openEquip, openGoals, openExoPrefs, openExportImport, openAppearance, openAbout,
  backupData(){ backupData(); }, exportCSV(){ exportCSV(); }, restoreData(){ restoreData(); }, openInstall(){ openInstall(); },
  async toggleAutoBackup(){
    if(S.settings.autoBackup){ S.settings.autoBackup = false; save(); try{ await fsHandle(null); }catch(e){} toast("Sauvegarde automatique désactivée"); ACT.openData(); return; }
    try{
      const h = await window.showSaveFilePicker({ suggestedName:BACKUP_NAME, types:[{ description:"Sauvegarde ASCEN", accept:{ "application/json":[".json"] } }] });
      await fsHandle(h); S.settings.autoBackup = true; persistNow(); await writeBackupTo(h);
      sfx("set"); toast("Sauvegarde automatique activée", "check");
    }catch(e){ if(!(e && e.name==="AbortError")) toast("Ce navigateur n'a pas permis l'écriture du fichier"); }
    ACT.openData();
  },
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
    const input = qs("#customEquipName"); const v = (input.value||"").replace(/\s+/g," ").trim().slice(0,40);
    // un nom déjà présent (casse ignorée) n'est pas ajouté une seconde fois
    if(v && !S.equipment.custom.some(c=>c.n.toLowerCase()===v.toLowerCase())){ S.equipment.custom.push({id:uid(),n:v}); save(); }
    refreshEquip();
  },
  removeCustom(d){
    const c = S.equipment.custom.find(x=>x.id===d.id); if(!c) return;
    S.equipment.custom = S.equipment.custom.filter(x=>x!==c); save(); refreshEquip();
    toast(`Retiré : ${c.n}`, null, ()=>{ if(S.equipment.custom.includes(c)) return; S.equipment.custom.push(c); save(); refreshEquip(); });
  },

  setGoalOverall(d){ S.goals.overall = d.v; save(); refreshGoals(); },
  setSessionLength(d){ S.goals.sessionLength = d.v; S.goals.exoCount = 0; save(); refreshGoals(); regenerateDraftIfIdle(); },
  setSenior(d){ S.goals.senior = d.v==="1"; save(); refreshGoals(); },
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
    save(); exoPrefSync(d.id);
  },
  toggleIncluded(d){ toggleFavorite(d.id); exoPrefSync(d.id); },

  copyPrompt(){
    const text = buildExportPrompt();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(()=>toast("Demande copiée")).catch(()=>toast("Copie impossible — sélectionne le texte manuellement"));
    } else toast("Sélectionne le texte ci-dessous pour le copier");
  },
  triggerImport(){ const f = qs("#fileImport"); if(f) f.click(); },
  clearImported(){
    confirmSheet({ title:"Supprimer le programme importé ?", ok:"Supprimer", danger:true, onOk:()=>{ S.importedProgram=[]; save(); closeSheet(); changed(); } });
  },

  toggleHaptic(d, el){
    S.settings.haptic = S.settings.haptic===false; el.classList.toggle("on", S.settings.haptic); el.setAttribute("aria-checked", S.settings.haptic); save();
    setTimeout(()=>{ if(el.isConnected) el.outerHTML = hapticSwitch(); }, 0); // après le toucher : le switch natif a déjà vibré
  },
  toggleSound(d, el){
    S.settings.sound = S.settings.sound===false; save(); el.classList.toggle("on", S.settings.sound);
    const sub = qs(".sub-setting"); if(sub) sub.classList.toggle("off", !S.settings.sound);
    if(S.settings.sound) sfx("set");
  },
  trendOn(){ S.settings.trend = true; save(); changed(); },
  toggleMotiv(d, el){
    if(!["beat","nextGoal","trend","thenNow"].includes(d.k)) return;
    S.settings[d.k] = S.settings[d.k]===false; el.classList.toggle("on", S.settings[d.k]); el.setAttribute("aria-pressed", S.settings[d.k]);
    changed();   // le résumé du profil suit à la fermeture de la feuille
  },
  toggleAppPicks(d, el){
    S.settings.appPicks = !appPicksOn(); el.classList.toggle("on", S.settings.appPicks); el.setAttribute("aria-pressed", S.settings.appPicks);
    changed(); renderView("today");
  },
  toggleWarmup(d, el){
    S.settings.warmup = !S.settings.warmup; el.classList.toggle("on", S.settings.warmup); el.setAttribute("aria-checked", S.settings.warmup); save(); sfx("toggle", S.settings.warmup);
  },
  toggleStretching(d, el){
    S.settings.stretching = !S.settings.stretching; el.classList.toggle("on", S.settings.stretching);
    applyStretchSetting(); changed(); renderView("today");
    toast(S.settings.stretching ? "Étirements ajoutés en fin de séance proposée" : "Plus d'étirements dans les séances proposées", "check");
  },
  toggleUiSound(d, el){ S.settings.uiSound = S.settings.uiSound===false; save(); el.classList.toggle("on", S.settings.uiSound); if(S.settings.uiSound) sfx("toggle", true); },
  toggleLiveDark(d, el){
    if(S.settings.theme==="dark") return;
    S.settings.liveDark = S.settings.liveDark===false; save(); applyTheme();
    const b = qs(".sheet-body"); if(b && qs(".tt-group", b)) b.innerHTML = appearanceBodyHTML();
    else if(el){ el.classList.toggle("on", S.settings.liveDark); el.setAttribute("aria-pressed", S.settings.liveDark); }
  },
  setTheme(d){ S.settings.theme = d.v; save(); applyTheme(); const b=qs(".sheet-body"); if(b) b.innerHTML = appearanceBodyHTML(); changed(); },

  confirmReset(){
    confirmSheet({ title:"Réinitialiser toutes les données ?", html:"Cette action est irréversible : séances, matériel, objectifs et trophées seront définitivement supprimés.", ok:"Tout supprimer", danger:true,
      onOk:()=>{
        // on recharge même si IndexedDB ne répond pas
        const go = ()=>location.reload(); setTimeout(go, 4000);
        wipeStorage().catch(()=>{}).then(go);
      } });
  },
});
VIEWS.profil = renderProfil;

// ---------- poids du corps (facultatif) ----------
// Le poids varie de 1 à 2 kg d'un jour à l'autre (eau, glycogène, repas) : on montre la
// tendance sur plusieurs semaines plutôt que la dernière pesée seule.
function bodyLast(){ return S.body[S.body.length-1]; }
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
  return `<div class="body-add"><div class="num-field"><input id="bodyIn" type="text" inputmode="decimal" maxlength="6" enterkeyhint="done" placeholder="${l?fmtDec(l.kg):"Ex. 72,5"}" aria-label="Poids en kg"><span>kg</span></div>
    <button class="btn" data-a="bodyAdd">Ajouter</button></div>
    ${pts.length ? `<div class="chart-card" style="margin-top:14px">
      <div class="cc-h"><div class="cc-t">12 derniers mois</div>${tr!=null?`<div class="cc-s">${tr>0?"+":tr<0?"−":"±"}${fmtDec(Math.abs(tr))} kg en 1 mois</div>`:""}</div>
      ${lineChart(pts, { fmt:v=>fmtDec(v)+" kg", aria:"Évolution du poids du corps" })}</div>` : ""}
    ${recent.length ? `<h2 class="sh">Pesées récentes</h2><div class="group">${recent.map(e=>`<div class="row"><div class="grow"><div class="t">${fmtDec(e.kg)} kg</div><div class="s">${esc(fmtDate(e.d,"long"))}</div></div><button class="icon-btn" data-a="bodyDel" data-d="${e.d}" aria-label="Supprimer cette pesée">${icon("close")}</button></div>`).join("")}</div>` : ""}`;
}
function refreshBody(){ const b = qs("#bodyBody"); if(b) b.innerHTML = bodyBodyHTML(); }
Object.assign(ACT, {
  openBody(){
    openSheet(`<div class="sheet-hd"><span class="t">Poids du corps</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
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
Object.assign(ACT, {
  openStorage(){
    const u = storageUsage(), pct = Math.min(100, u/STORAGE_QUOTA*100);
    openSheet(`<div class="sheet-hd"><span class="t">Espace de stockage</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
      <div class="sheet-body" id="stoBody">
        <div class="chart-card" style="margin-top:0">
          <div class="cc-h"><div class="cc-t">${fmtBytes(u)} sur ~5 Mo</div><div class="cc-s">${S.sessions.length} séance${S.sessions.length>1?"s":""} enregistrée${S.sessions.length>1?"s":""}</div></div>
          <div class="xpbar sto-bar"><span style="width:${Math.max(1.5, pct).toFixed(1)}%"></span></div>
        </div>
        <div class="group" style="margin-top:14px">
          <div class="row">${sfIcon("storage","green")}<div class="grow"><div class="t">Format compact</div></div><div class="val">≈ 2,5× plus léger</div></div>
          <div class="row">${sfIcon("shield","blue")}<div class="grow"><div class="t">Copie de secours</div></div><div class="val" id="stoIdb"></div></div>
          <div class="row">${sfIcon("phone","gray")}<div class="grow"><div class="t">Total sur l'appareil</div></div><div class="val" id="stoTotal"></div></div>
          <div class="row">${sfIcon("lock","indigo")}<div class="grow"><div class="t">Protection</div><div class="s wrap" id="stoPersist"></div></div></div>
        </div>
        <div class="btnrow"><button class="btn secondary" data-a="backupData">${icon("bookmark")} Faire une sauvegarde</button></div>
      </div>`, { tall:true, child:true, restore:()=>ACT.openStorage() });
    sheetBackHead();
    idbGet().then(r=>{ const e = qs("#stoIdb"); if(e && r && r.data) e.textContent = fmtBytes(typeof r.data==="string" ? r.data.length*2 : (r.data.byteLength || r.data.size || 0)); }).catch(()=>{});
    try{ if(navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(x=>{ const e = qs("#stoTotal"); if(e && x.usage) e.textContent = fmtBytes(x.usage + u); }); }catch(e){}
    const el = qs("#stoPersist");
    const setTxt = t=>{ if(el) el.textContent = t; };
    try{
      if(navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p=>setTxt(p ? "Activée" : isStandalone() ? "Standard" : "Installe l'app sur l'écran d'accueil : Safari efface les données des sites non installés après 7 jours sans visite."));
      else setTxt(isStandalone() ? "Standard" : "Installe l'app sur l'écran d'accueil pour protéger tes données.");
    }catch(e){ setTxt("—"); }
  },
});
