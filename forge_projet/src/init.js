// ================= INITIALISATION =================
const APP_VERSION = "2.14.0";
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
// Barre d'état (heure, batterie) en « black-translucent » : l'app passe dessous, comme une app native.
// Le bandeau #sbar n'est plus qu'un voile (CSS) qui garde l'heure blanche lisible sur les écrans clairs.
// Le fond de page reste écrit en style direct et theme-color mis à jour (iOS plus anciens, Android).
let statusDim = false;
// regroupé sur l'image suivante : lire le style calculé en plein script (fin de séance, ouverture d'une
// feuille) forçait un recalcul complet ; plusieurs appels dans la même image n'en font qu'un
let sbRaf = 0, sbNudge = false;
function syncStatusBar(dim, nudge){
  if(dim!==undefined) statusDim = dim;
  if(nudge) sbNudge = true;
  if(sbRaf) return;
  sbRaf = requestAnimationFrame(()=>{ sbRaf = 0; const n = sbNudge; sbNudge = false; syncStatusBarNow(n); });
}
function syncStatusBarNow(nudge){
  try{
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    let rgb = hexRGB(bg);
    if(!rgb){ const c = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g); if(!c || (c.length>3 && +c[3]===0)) return; rgb = c.slice(0,3).map(Number); }
    const base = "#"+rgb.map(x=>Math.round(x).toString(16).padStart(2,"0")).join("");
    // fond de page en style direct (seul lu en direct par Safari 26)
    if(document.body.style.backgroundColor!==base) document.body.style.backgroundColor = base;
    // iOS 26 (app installée) arrête parfois la page au-dessus du trait d'accueil et remplit ce bas avec le fond
    // de la racine : on lui donne la couleur de la barre d'onglets (sur le fond), qui semble alors descendre
    // jusqu'en bas. Sans barre d'onglets (séance), le fond de la page.
    let under = base;
    const tb = document.querySelector(".tabbar");
    if(tb && !document.body.classList.contains("live-focus")){
      const b = getComputedStyle(document.documentElement).getPropertyValue("--bar").match(/[\d.]+/g);
      if(b && b.length>=4) under = "#"+rgb.map((x,i)=>Math.round(+b[i]*+b[3] + x*(1-+b[3])).toString(16).padStart(2,"0")).join("");
    }
    if(document.documentElement.style.backgroundColor!==under) document.documentElement.style.backgroundColor = under;
    const v = typeof currentTab!=="undefined" && document.getElementById("v-"+currentTab);
    if(v && v.classList.contains("scrolled")){
      const b = getComputedStyle(document.documentElement).getPropertyValue("--bar").match(/[\d.]+/g);
      if(b && b.length>=4) rgb = rgb.map((x,i)=>+b[i]*+b[3] + x*(1-+b[3]));
    }
    // jamais assombrie : si iOS affiche une barre pleine (ancienne icône), elle garde la couleur de la page
    // (assombrie sous une feuille, elle restait grise une fois la feuille fermée)
    const k = 1, hex = "#"+rgb.map(x=>Math.round(x*k).toString(16).padStart(2,"0")).join("");
    let bar = document.getElementById("sbar");
    if(!bar){ bar = document.createElement("div"); bar.id = "sbar"; bar.setAttribute("aria-hidden","true"); document.body.appendChild(bar); }
    // le bandeau n'a plus de couleur pleine : l'app passe sous la barre d'état (voile et flou en CSS)
    let m = document.querySelector('meta[name="theme-color"]:not([media])');
    if(!m){ document.querySelectorAll('meta[name="theme-color"]').forEach(x=>x.remove()); m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
    // app installée avec barre fondue : la barre d'état ne prend plus cette couleur, mais iOS 26 s'en sert pour
    // la bande qu'il laisse sous la page (au-dessus du trait d'accueil) : celle de la barre d'onglets, sauf
    // sous une feuille ouverte (fond de la feuille)
    const inst = window.navigator.standalone===true && !(typeof legacyStatusBar==="function" && legacyStatusBar());
    const tc = inst ? (statusDim ? base : under) : hex;
    if(m.content!==tc) m.content = tc;
  }catch(e){}
}
// iOS 26 (app installée, barre fondue) : la page peut s'arrêter avant le bas de l'écran. On mesure un
// calque fixe plein écran face à la hauteur de l'écran ; l'écart (au plus 80 px) est rattrapé en CSS.
function syncVGap(){
  try{
    let g = 0;
    if(window.navigator.standalone===true && !(typeof legacyStatusBar==="function" && legacyStatusBar())){
      const p = document.createElement("div");
      p.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;visibility:hidden;pointer-events:none";
      document.body.appendChild(p); const h = p.getBoundingClientRect().bottom; p.remove();
      const portrait = innerHeight>=innerWidth, sh = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
      g = Math.round(sh - h); if(g<2 || g>80) g = 0;
    }
    const r = document.documentElement;
    if(r.style.getPropertyValue("--vgap")!==g+"px"){ r.style.setProperty("--vgap", g+"px"); r.classList.toggle("vgap", g>0); }
  }catch(e){}
}
window.addEventListener("resize", ()=>requestAnimationFrame(syncVGap));
window.addEventListener("orientationchange", ()=>setTimeout(syncVGap, 300));
onResume(syncVGap);
function hexRGB(h){ const m = /^#([0-9a-f]{6})$/i.exec(h||""); return m ? [0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)) : null; }
if(window.matchMedia) try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>syncStatusBar()); }catch(e){}

// ---------- mises à jour ----------
// Une nouvelle version est téléchargée en arrière-plan (sw.js). Quand son service worker prend la main,
// un bandeau le dit : « Mettre à jour » recharge l'app au même endroit, « Plus tard » attend le prochain
// lancement (qui l'ouvre d'office). Jamais pendant une séance. L'app installée reste parfois en mémoire
// des jours : au retour, elle vérifie s'il y a du nouveau (au plus toutes les 30 min).
let updPending = false, updUpdating = false;
function swWatch(reg){
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", ()=>{ if(had){ updPending = true; updShow(); } });
  let last = Date.now();
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden || Date.now()-last<30*60e3) return;
    last = Date.now(); reg.update().catch(()=>{});
  });
}
function updShow(){
  if(!updPending || qs("#updbar")) return;
  if(S.draft && S.draft.startedAt){ setTimeout(updShow, 30e3); return; }   // après la séance
  const b = document.createElement("div"); b.id = "updbar"; b.setAttribute("role", "status");
  b.innerHTML = `<span class="ub-t">Nouvelle version</span><button class="ub-later" data-a="updLater">Plus tard</button><button class="ub-go" data-a="appUpdate">Mettre à jour</button>`;
  document.body.appendChild(b);
  requestAnimationFrame(()=>requestAnimationFrame(()=>b.classList.add("show")));
}
Object.assign(ACT, {
  appUpdate(){
    updUpdating = true; persistNow(); saveResume();   // on revient sur le même écran
    document.documentElement.classList.add("reloading");
    setTimeout(()=>location.reload(), reducedMotion() ? 0 : 180);
  },
  updLater(){ updPending = false; const b = qs("#updbar"); if(!b) return; b.classList.remove("show"); setTimeout(()=>b.remove(), 400); }
});

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
  syncVGap(); setTimeout(syncVGap, 600);
  // ancienne icône (barre d'état pleine) : on le dit une fois, la marche à suivre est dans Profil
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
  // historique d'avant 2.13 : records recalculés une fois, avant le premier affichage (quelques ms)
  if(upgradeRecords()) save();
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
  // Safari n'a pas requestIdleCallback : petites tranches de 8 ms espacées de 200 ms
  const idle = window.requestIdleCallback || (f=>setTimeout(()=>{ const end = performance.now()+8; f({ timeRemaining:()=>Math.max(0, end-performance.now()) }); }, 200));
  const warm = EXOS.slice(); let warmedGL = false;
  // (jamais pendant le lancement : le premier passage attend lui aussi un temps mort)
  const step = dl=>{
    let n = 0;   // au moins un pictogramme par passage, même quand le navigateur n'a jamais de temps libre
    while(warm.length && (!n++ || dl.timeRemaining()>3)){ const d = warm.shift(); try{ exoIcon(d); exoIcon(d, "sm"); }catch(e){} }
    if(!warmedGL && !warm.length){ warmedGL = true; try{ if(typeof t3dWebGL==="function") t3dWebGL(); }catch(e){} }
    if(warm.length || !warmedGL) idle(step, { timeout:4000 });   // le test WebGL : une fois les pictogrammes faits
  };
  idle(step, { timeout:4000 });
  // manifeste d'installation : seulement servi par un vrai serveur (en fichier local, WebKit refuse de le lire)
  if(/^https?:$/.test(location.protocol) && !document.querySelector('link[rel="manifest"]')){ const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.webmanifest"; document.head.appendChild(l); }
  // hors ligne : service worker (uniquement servi en https, pas en fichier local ni en aperçu)
  try{ if("serviceWorker" in navigator && (location.protocol==="https:" || location.hostname==="localhost") && !/claude\.ai|claudeusercontent/.test(location.hostname)) navigator.serviceWorker.register("sw.js").then(swWatch, ()=>{}); }catch(e){}
  (window.requestIdleCallback || (f=>setTimeout(f, 4000)))(()=>ascPrefetch(), { timeout:8000 });
  // la réverbération des sons, calculée au calme (le premier toucher n'a plus à le faire)
  (window.requestIdleCallback || (f=>setTimeout(f, 3000)))(()=>{ if(soundOn()) reverbData(48000); }, { timeout:6000 });
  // ascension : une semaine sans séance a fait redescendre d'un camp ; dit une fois, après le lancement
  setTimeout(()=>{ try{ if(!LOAD_SKIPPED && !(S.draft && S.draft.startedAt)) ascDescentNotice(); }catch(e){ appError("ascent", e); } }, 2100);
  if(LOAD_SKIPPED) setTimeout(()=>toast(`${LOAD_SKIPPED} séance${LOAD_SKIPPED>1?"s":""} illisible${LOAD_SKIPPED>1?"s":""} ignorée${LOAD_SKIPPED>1?"s":""}. Le reste de l'historique est intact.`), 1800);
  cleanupStorage();
  if(idbBootFailed) setTimeout(()=>toast("Données momentanément illisibles. Rouvre l'app pour les retrouver.", "warn"), 600);
  // copie du jour (7 jours gardés), au calme
  (window.requestIdleCallback || (f=>setTimeout(f, 2500)))(()=>snapDaily().catch(()=>{}), { timeout:6000 });
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

// données dans IndexedDB (trop grandes pour localStorage) : lues d'abord, quelques ms
if(bootFromIDB) idbBoot().then(init); else init();

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
onResume(applyTextSize);
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
  setTimeout(()=>snapDaily().catch(()=>{}), 1500);
  const live = S.draft && S.draft.startedAt;
  if(!live) applyPlannedSession();
  // l'onglet affiché se redessine (les autres le seront en y allant : voir switchTab)
  if(!(live && currentTab==="today")) renderView(currentTab);
}
let appUnloading = false;
document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ if(!appUnloading) saveResume(); appSuspend(); } else appResume(); });
// vrai rechargement ou fermeture (pas une mise en arrière-plan) : on repartira de l'accueil
window.addEventListener("pagehide", e=>{ if(!e.persisted){ appUnloading = true; if(!updUpdating) try{ localStorage.removeItem(RESUME_KEY); }catch(err){} } appSuspend(); });
window.addEventListener("blur", appSuspend);
window.addEventListener("pageshow", e=>{ if(e.persisted){ appAway = true; appResume(); } });
window.addEventListener("focus", appResume);
