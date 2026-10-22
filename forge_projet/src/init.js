// ================= INITIALISATION =================
const APP_VERSION = "2.5.0";
const COPYRIGHT = `© ${new Date().getFullYear()} Yannick Wahler. Tous droits réservés.`;

// séance en sombre (réglage, actif par défaut) : pendant la séance, l'écran passe en sombre quel que
// soit le thème, moins éblouissant pendant l'effort ; il revient au thème choisi en sortant
function liveDarkOn(){ return S.settings.liveDark!==false && document.body.classList.contains("live-focus"); }
function applyTheme(soft){
  const t = liveDarkOn() ? "dark" : S.settings.theme, want = t==="light" || t==="dark" ? t : null;
  const de = document.documentElement;
  let flip = false;
  if(de.getAttribute("data-theme")===want){ if(soft) return; }
  else { flip = true; if(want) de.setAttribute("data-theme", want); else de.removeAttribute("data-theme"); }
  // thème choisi, relu par la page avant tout affichage (build.sh) : pas d'instant aux couleurs de l'iPhone
  try{ const c = S.settings.theme==="light" || S.settings.theme==="dark" ? S.settings.theme : "";
    const k = STORAGE_KEY+".theme"; if(!c) localStorage.removeItem(k); else if(localStorage.getItem(k)!==c) localStorage.setItem(k, c); }catch(e){}
  syncStatusBar();
  // thème changé (séance en sombre forcé, ou retour au thème normal) : le bandeau passe en fondu (0,2 s) et iOS
  // garde la couleur lue au départ ; on la lui fait relire une fois le fondu fini
  if(flip) setTimeout(()=>syncStatusBar(undefined, true), 260);
}
// Barre d'état (heure, batterie). Depuis iOS 26, Safari ignore theme-color : il colore la barre
// d'après l'élément fixe et opaque collé au bord haut de l'écran, à défaut d'après le fond de la
// page (et seulement s'il est écrit en style direct). Avant, l'écran de lancement (noir) et la
// bulle des graphiques (couleur du texte, en haut à gauche même invisible) lui donnaient du noir.
// On lui fournit donc un bandeau fixe (#sbar) toujours à la bonne couleur : le fond de l'app en
// haut de page, la barre de navigation (translucide, composée sur le fond) dès qu'on a défilé,
// assombri comme la page quand une feuille est ouverte. theme-color reste écrit pour les iOS
// plus anciens et Android.
let statusDim = false;
function syncStatusBar(dim, nudge){
  if(dim!==undefined) statusDim = dim;
  try{
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    let rgb = hexRGB(bg);
    if(!rgb){ const c = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g); if(!c || (c.length>3 && +c[3]===0)) return; rgb = c.slice(0,3).map(Number); }
    const base = "#"+rgb.map(x=>Math.round(x).toString(16).padStart(2,"0")).join("");
    // fond de page en style direct (seul lu en direct par Safari 26)
    if(document.body.style.backgroundColor!==base){ document.body.style.backgroundColor = base; document.documentElement.style.backgroundColor = base; }
    const v = typeof currentTab!=="undefined" && document.getElementById("v-"+currentTab);
    if(v && v.classList.contains("scrolled")){
      const b = getComputedStyle(document.documentElement).getPropertyValue("--bar").match(/[\d.]+/g);
      if(b && b.length>=4) rgb = rgb.map((x,i)=>+b[i]*+b[3] + x*(1-+b[3]));
    }
    const k = statusDim ? .6 : 1, hex = "#"+rgb.map(x=>Math.round(x*k).toString(16).padStart(2,"0")).join("");
    let bar = document.getElementById("sbar");
    if(!bar){ bar = document.createElement("div"); bar.id = "sbar"; bar.setAttribute("aria-hidden","true"); document.body.appendChild(bar); }
    // nudge : iOS ne relit la couleur que quand le bandeau change ; on la change d'un cran puis on la remet,
    // pour qu'il la reprenne (fin de l'écran de lancement, retour dans l'app)
    if(nudge){ bar.style.backgroundColor = "#"+rgb.map(x=>Math.max(0, Math.round(x*k)-1).toString(16).padStart(2,"0")).join(""); requestAnimationFrame(()=>requestAnimationFrame(()=>{ bar.style.backgroundColor = hex; })); }
    else if(bar.style.backgroundColor!==hex) bar.style.backgroundColor = hex;
    let m = document.querySelector('meta[name="theme-color"]:not([media])');
    if(!m){ document.querySelectorAll('meta[name="theme-color"]').forEach(x=>x.remove()); m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    if(m.content!==hex) m.content = hex;
  }catch(e){}
}
function hexRGB(h){ const m = /^#([0-9a-f]{6})$/i.exec(h||""); return m ? [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)) : null; }
if(window.matchMedia) try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>syncStatusBar()); }catch(e){}

// ---------- lancement ----------
// Pas d'écran de lancement : l'app s'affiche directement. Premier lancement : l'accueil s'ouvre, sauf si la
// copie de secours (stockage vidé) rend les données ; on l'attend donc quand rien n'a été lu (au plus 0,6 s).
function startApp(recovered){
  if(typeof needsOnboarding==="function" && needsOnboarding()){
    const wait = loadedFromLS ? null : Promise.race([recovered, new Promise(ok=>setTimeout(ok, 600))]);
    Promise.resolve(wait).catch(()=>{}).then(()=>{ if(needsOnboarding()) openOnboarding(); });
  }
  // iOS relit la couleur de la barre d'état au premier changement en haut de la page
  requestAnimationFrame(()=>requestAnimationFrame(()=>syncStatusBar(undefined, true)));
}

// iOS ferme parfois l'app en arrière-plan pour libérer de la mémoire (après la musique, l'appareil photo…) :
// au retour elle redémarre. On rouvre alors le même onglet, à la même position, si on l'a quittée il y a
// moins de 30 min ; sinon (ou pendant une séance) l'app s'ouvre sur Aujourd'hui, comme d'habitude.
const RESUME_KEY = STORAGE_KEY+".resume", RESUME_MS = 30*60*1000;
function saveResume(){
  try{ const v = qs("#v-"+currentTab);
    localStorage.setItem(RESUME_KEY, JSON.stringify({ tab:currentTab, st:v ? Math.round(v.scrollTop) : 0, pt:typeof progressTab!=="undefined" ? progressTab : null, at:Date.now() })); }catch(e){}
}
let resumeState = null;
function resumeTab(){
  try{
    const r = JSON.parse(localStorage.getItem(RESUME_KEY)||"null");
    if(!r || !(Date.now()-r.at < RESUME_MS) || (S.draft && S.draft.startedAt) || (typeof needsOnboarding==="function" && needsOnboarding())) return null;
    resumeState = r;
    if(r.pt && typeof progressTab!=="undefined" && typeof r.pt==="string") progressTab = r.pt;
    return r.tab && qs("#v-"+r.tab) ? r.tab : null;
  }catch(e){ return null; }
}
function resumeScroll(){
  const r = resumeState; resumeState = null; if(!r || !r.st) return;
  const v = qs("#v-"+currentTab); if(v) requestAnimationFrame(()=>{ v.scrollTop = r.st; });
}
function init(){
  buildShell();
  applyTheme();
  applyPlannedSession(); // la séance prévue aujourd'hui s'affiche directement
  switchTab(resumeTab() || "today");
  resumeScroll();
  startApp(idbRecover()); // copie de secours IndexedDB (voir core.js)
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
  (window.requestIdleCallback || (f=>setTimeout(f, 4000)))(()=>ascPrefetch(), { timeout:8000 });
  // la réverbération des sons, calculée au calme (le premier toucher n'a plus à le faire)
  (window.requestIdleCallback || (f=>setTimeout(f, 3000)))(()=>{ if(soundOn()) reverbData(48000); }, { timeout:6000 });
  // ascension : une semaine sans séance a fait redescendre d'un camp ; dit une fois, après le lancement
  setTimeout(()=>{ try{ if(!LOAD_SKIPPED && !(S.draft && S.draft.startedAt)) ascDescentNotice(); }catch(e){ reportError("ascent", e); } }, 2100);
  if(LOAD_SKIPPED) setTimeout(()=>toast(`${LOAD_SKIPPED} séance${LOAD_SKIPPED>1?"s":""} illisible${LOAD_SKIPPED>1?"s":""} mise${LOAD_SKIPPED>1?"s":""} de côté, le reste de l'historique est intact`), 1800);
  cleanupStorage();
  // demander un stockage persistant (le navigateur ne l'effacera pas pour libérer de la place)
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(p=>{ if(!p) navigator.storage.persist(); }).catch(()=>{}); }catch(e){}

  const fi = qs("#fileImport");
  if(fi){
    fi.addEventListener("change", async (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      // un programme tient en quelques Ko : au-delà de 2 Mo, ce n'est pas le bon fichier
      const res = file.size>2e6 ? { ok:false, error:"Fichier trop volumineux pour un programme." } : importProgramJSON(await file.text());
      fi.value = "";
      if(res.ok){
        toast(`Programme importé : ${nb(res.count, "séance")}`);
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
  toast("Données mises à jour");
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
  syncStatusBar(undefined, true);   // au retour dans l'app, iOS reprend la couleur de la barre d'état
  const day = todayISO();
  if(day===appDay) return;
  appDay = day;
  const live = S.draft && S.draft.startedAt;
  if(!live) applyPlannedSession();
  // l'onglet affiché se redessine (les autres le seront en y allant : voir switchTab)
  if(!(live && currentTab==="today")) renderView(currentTab);
}
let appUnloading = false;
document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ if(!appUnloading) saveResume(); appSuspend(); } else appResume(); });
// vrai rechargement ou fermeture (pas une mise en arrière-plan) : on repartira de l'accueil
window.addEventListener("pagehide", e=>{ if(!e.persisted){ appUnloading = true; try{ localStorage.removeItem(RESUME_KEY); }catch(err){} } appSuspend(); });
window.addEventListener("blur", appSuspend);
window.addEventListener("pageshow", e=>{ if(e.persisted){ appAway = true; appResume(); } });
window.addEventListener("focus", appResume);
