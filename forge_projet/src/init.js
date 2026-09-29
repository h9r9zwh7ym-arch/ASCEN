// ================= INITIALISATION =================
const APP_VERSION = "3.9";
const COPYRIGHT = `© ${new Date().getFullYear()} Yannick Wahler. Tous droits réservés.`;

function applyTheme(){
  const t = S.settings.theme;
  if(t==="light") document.documentElement.setAttribute("data-theme","light");
  else if(t==="dark") document.documentElement.setAttribute("data-theme","dark");
  else document.documentElement.removeAttribute("data-theme");
}

// ---------- animation de lancement ----------
// Le mot ASCEN apparaît en balayage, puis la barre du A monte de mi-hauteur à sa place :
// on « relève la barre ». Les animations portent sur des <div>, jamais sur des éléments
// internes aux SVG : piège Safari documenté dans Zeste.
function splashTagline(){
  const why = whyReminder(); if(why) return `« ${why} »`;
  const t = plannedTemplate();
  if(t && !sessionsToday().some(s=>s.tplId===t.id)) return `Aujourd'hui : ${t.n}`;
  const streak = currentStreakWeeks();
  if(streak>=2) return `${streak} semaines d'affilée — on continue`;
  if(sessionsToday().length) return "Séance du jour déjà faite, bravo";
  return "Un cran plus haut, à chaque séance";
}
function showSplash(){
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sp = document.createElement("div");
  sp.id = "splash";
  sp.className = reduce ? "splash reduce" : "splash";
  sp.innerHTML = `<div class="sp-logo">
      <div class="sp-letters">${ascenMark("", false)}</div>
      <div class="sp-bar"><svg class="ascen-mark" viewBox="0 5 206 56" stroke-width="6.5" stroke-linecap="round" aria-hidden="true"><path class="bar" d="${ASCEN_BAR}"/></svg></div>
    </div>
    <div class="sp-tag">${esc(splashTagline())}</div>`;
  document.body.appendChild(sp);
  let gone = false;
  const leave = ()=>{
    if(gone) return; gone = true;
    sp.classList.add("out");
    if(typeof needsOnboarding==="function" && needsOnboarding()) openOnboarding();
    setTimeout(()=>sp.remove(), 450);
  };
  sp.addEventListener("click", leave);
  setTimeout(leave, reduce ? 600 : 1500);
}

function init(){
  buildShell();
  applyTheme();
  applyPlannedSession(); // la séance prévue aujourd'hui s'affiche directement
  switchTab("today");
  showSplash();
  // médailles déjà méritées (ex. après une mise à jour) : attribuées sans célébration, au calme
  // (une quarantaine de statistiques sur tout l'historique : pas pendant le démarrage)
  (window.requestIdleCallback || (f=>setTimeout(f, 1600)))(()=>{ const v = DATA_VER; checkMedals(true); if(DATA_VER!==v && !(S.draft && S.draft.startedAt)) renderView(currentTab); }, { timeout:2500 });
  // préchauffage au calme (v4.0) : les pictogrammes de tous les exercices sont calculés par petits
  // lots pendant les temps morts, pour que le choix d'exercices s'ouvre sans à-coup ; le test
  // WebGL des trophées 3D (≈ 40 ms la première fois) est fait au même moment
  const idle = window.requestIdleCallback || (f=>setTimeout(()=>f({ timeRemaining:()=>8 }), 200));
  const warm = EXOS.slice(); let warmedGL = false;
  (function step(dl){
    while(warm.length && (!dl || dl.timeRemaining()>3)){ const d = warm.shift(); try{ exoIcon(d); exoIcon(d, "sm"); }catch(e){} }
    if(!warmedGL && (!dl || dl.timeRemaining()>12)){ warmedGL = true; try{ if(typeof t3dWebGL==="function") t3dWebGL(); }catch(e){} }
    if(warm.length || !warmedGL) idle(step, { timeout:4000 });
  })();
  // manifeste d'installation : seulement servi par un vrai serveur (en fichier local, WebKit refuse de le lire)
  if(/^https?:$/.test(location.protocol) && !document.querySelector('link[rel="manifest"]')){ const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.webmanifest"; document.head.appendChild(l); }
  // hors ligne : service worker (uniquement servi en https, pas en fichier local ni en aperçu)
  try{ if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost") && !/claude\.ai|claudeusercontent/.test(location.hostname)) navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){}
  // une nouvelle version a été téléchargée en arrière-plan : elle servira au prochain lancement
  try{ if("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e=>{ if(e.data && e.data.type==="forge-updated") toast("Mise à jour prête : elle s'appliquera au prochain lancement"); }); }catch(e){}
  idbRecover(); // copie de secours IndexedDB (voir core.js)
  if(LOAD_SKIPPED) setTimeout(()=>toast(`${LOAD_SKIPPED} séance${LOAD_SKIPPED>1?"s":""} illisible${LOAD_SKIPPED>1?"s":""} mise${LOAD_SKIPPED>1?"s":""} de côté, le reste de l'historique est intact`), 1800);
  cleanupStorage();
  // demander un stockage persistant (le navigateur ne l'effacera pas pour libérer de la place)
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p=>{ if(!p) navigator.storage.persist(); }).catch(()=>{}); }catch(e){}

  const fi = qs("#fileImport");
  if(fi){
    fi.addEventListener("change", async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const text = await file.text();
      const res = importProgramJSON(text);
      fi.value = "";
      if(res.ok){
        toast(`Programme importé : ${res.count} séance(s)`);
        changed();
        if(res.warnings && res.warnings.length){
          setTimeout(()=>openModal(`<div style="font-weight:700">Avertissements</div>
            <div class="hr-note" style="margin-top:8px;text-align:left">${res.warnings.map(esc).join("<br>")}</div>
            <button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`), 380);
        }
      } else {
        openModal(`<div style="font-weight:700;color:var(--red)">Import impossible</div>
          <div class="hr-note" style="margin-top:8px">${esc(res.error)}</div>
          <button class="btn secondary" style="margin-top:14px" data-a="closesheet">OK</button>`);
      }
    });
  }
}

init();

// ---------- mise en arrière-plan et retour dans l'app ----------
// iOS garde l'app en mémoire : on la retrouve telle qu'on l'a laissée, parfois le lendemain.
// À la sortie, les gestes en cours sont annulés (feuille, carte, graphique, médaille) ; au
// retour, si le jour a changé, l'écran du jour, le planning et la séance proposée se remettent
// à jour (une séance commencée reste intacte). Son et trophées 3D ont leur propre reprise
// (sfx.js, trophy3d.js).
// état repris d'un autre onglet (voir core.js) : minuteur, thème et écran à jour
function onExternalState(){
  if(!(S.draft && S.draft.startedAt) && typeof stopRestTimer==="function") stopRestTimer();
  applyTheme();
  if(qs("#overlay").classList.contains("open")) dirtyOnClose = true; else renderView(currentTab);
  toast("Données mises à jour depuis un autre onglet");
}
// Taille du texte réglée sur l'iPhone (Réglages › Luminosité et affichage › Taille du texte) :
// Safari expose la taille « corps de texte » via la police système -apple-system-body. Toute
// l'échelle typographique est en rem : elle suit, bornée à 17–21 px pour garder la mise en page.
function applyTextSize(){
  try{
    const p = document.createElement("div"); p.style.font = "-apple-system-body";
    if(!p.style.font) return; // hors Safari : taille par défaut
    p.style.position = "absolute"; p.style.visibility = "hidden"; document.body.appendChild(p);
    const px = parseFloat(getComputedStyle(p).fontSize); p.remove();
    if(px) document.documentElement.style.fontSize = Math.min(21, Math.max(17, Math.round(px)))+"px";
  }catch(e){}
}
applyTextSize();
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) applyTextSize(); });
let appDay = todayISO(), appAway = false;
function appSuspend(){
  document.dispatchEvent(new Event("ascen:suspend"));
  if(document.hidden || !document.hasFocus()) appAway = true;
}
function appResume(){
  if(!appAway) return;
  appAway = false;
  const day = todayISO();
  if(day===appDay) return;
  appDay = day;
  const live = S.draft && S.draft.startedAt;
  if(!live) applyPlannedSession();
  // l'onglet affiché se redessine (les autres le seront en y allant : voir switchTab)
  if(!(live && currentTab==="today")) renderView(currentTab);
}
document.addEventListener("visibilitychange", ()=>{ if(document.hidden) appSuspend(); else appResume(); });
window.addEventListener("pagehide", appSuspend);
window.addEventListener("blur", appSuspend);
window.addEventListener("pageshow", e=>{ if(e.persisted){ appAway = true; appResume(); } });
window.addEventListener("focus", appResume);
