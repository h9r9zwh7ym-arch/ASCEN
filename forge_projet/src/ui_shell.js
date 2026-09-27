// ================= INTERFACE : coquille =================
const TABS = [
  { id:"today",    n:"Aujourd'hui", icon:"home" },
  { id:"history",  n:"Historique",  icon:"clock" },
  { id:"progress", n:"Progrès",     icon:"chart" },
  { id:"profil",   n:"Profil",      icon:"user" },
];

const ICONS = {
  home:'<path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  clock:'<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chart:'<path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  user:'<circle cx="12" cy="8" r="3.6" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  check:'<path d="M5 13l4.5 4.5L19 8" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  chev:'<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  close:'<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus:'<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M12 14v3M9 20h6M9.5 17h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  flame:'<path d="M12 3s4 3.5 4 7.5a4 4 0 1 1-8 0c0-1 .4-1.8 1-2.5-.1 1 .3 1.6.9 1.9C9.6 7 10.5 5 12 3Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  edit:'<path d="M4 20l.9-3.6L16.4 5 19 7.6 7.6 19 4 20Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  timer:'<circle cx="12" cy="13" r="7.5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M12 9.5V13l2.5 1.5M9.5 2.5h5M12 2.5v2.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  swap:'<path d="M6 8h11l-3-3M18 16H7l3 3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  play:'<path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor"/>',
  bookmark:'<path d="M7 4h10v16l-5-3.6L7 20V4Z" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linejoin="round"/>',
  repeat:'<path d="M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1M7 21l-3-3 3-3M4 18h12a4 4 0 0 0 4-4v-1" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  search:'<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  trash:'<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
};

// ---------- icônes façon Réglages d'iOS : glyphe blanc sur pastille colorée ----------
const IOS_COL = { orange:"#FF9500", red:"#FF3B30", yellow:"#FFCC00", green:"#34C759", mint:"#00C7BE", teal:"#30B0C7", blue:"#007AFF", indigo:"#5856D6", purple:"#AF52DE", pink:"#FF2D55", gray:"#8E8E93", brown:"#A2845E" };
const S_ = 'stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const GLYPHS = {
  dumbbell:`<path d="M6.5 7.5v9M17.5 7.5v9M3.8 10v4M20.2 10v4M6.5 12h11" ${S_} stroke-width="2.4"/>`,
  flame:'<path d="M12 21c-3.4 0-6-2.5-6-5.9 0-3.4 2.4-5.3 3.6-7.8.3 1.7 1.2 2.8 2.2 3.2.2-3 1.4-5.6 3.6-7.5-.2 3.1 3.1 5.3 3.1 9.9 0 4.9-2.6 8.1-6.5 8.1Z" fill="#fff"/>',
  star:'<path d="m12 3.3 2.7 5.4 5.9.9-4.3 4.2 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.3-4.2 5.9-.9Z" fill="#fff"/>',
  calendar:`<rect x="4" y="5.5" width="16" height="14.5" rx="2.5" ${S_}/><path d="M4 10.2h16M8.5 3.5v3.6M15.5 3.5v3.6" ${S_}/>`,
  stopwatch:`<circle cx="12" cy="13.5" r="7" ${S_}/><path d="M12 13.5V9.8M9.8 3h4.4M18 6.8l1.4-1.4" ${S_}/>`,
  trophy:`<path d="M8 4h8v5.2a4 4 0 0 1-8 0Z" fill="#fff"/><path d="M8 6H5.2c0 2.3 1.2 3.8 3 4M16 6h2.8c0 2.3-1.2 3.8-3 4M12 13.3v3.7M8.5 20h7" ${S_}/>`,
  mountain:'<path d="m2.8 19.5 6.6-11.2 4.1 6.6 2.6-3.6 5.1 8.2Z" fill="#fff"/>',
  bolt:'<path d="M13.4 2.5 5 13.6h6.1l-1.1 7.9 8.3-11.2h-6.1Z" fill="#fff"/>',
  toolbox:`<rect x="3.5" y="8.5" width="17" height="11" rx="2" ${S_}/><path d="M9 8.5V6h6v2.5M3.5 13.2h17M12 12v2.5" ${S_}/>`,
  target:`<circle cx="12" cy="12" r="8" ${S_}/><circle cx="12" cy="12" r="4.4" ${S_}/><circle cx="12" cy="12" r="1.4" fill="#fff"/>`,
  list:`<path d="M9.5 7h10M9.5 12h10M9.5 17h10" ${S_}/><circle cx="5.2" cy="7" r="1.3" fill="#fff"/><circle cx="5.2" cy="12" r="1.3" fill="#fff"/><circle cx="5.2" cy="17" r="1.3" fill="#fff"/>`,
  sparkles:'<path d="m10.5 3 1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9Z" fill="#fff"/><path d="m18 13.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z" fill="#fff"/>',
  contrast:`<circle cx="12" cy="12" r="8" ${S_}/><path d="M12 4a8 8 0 0 1 0 16Z" fill="#fff"/>`,
  speaker:`<path d="M4 9.3h3.6L12 5.3v13.4l-4.4-4H4Z" fill="#fff"/><path d="M15.3 9a4.2 4.2 0 0 1 0 6M17.8 6.6a7.6 7.6 0 0 1 0 10.8" ${S_}/>`,
  tap:`<circle cx="12" cy="12" r="3" fill="#fff"/><circle cx="12" cy="12" r="7" ${S_} opacity=".55"/>`,
  trash:`<path d="M4.8 7h14.4M10 4h4M7 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h5.2a1.5 1.5 0 0 0 1.5-1.3L17 7M10.3 10.5v6M13.7 10.5v6" ${S_}/>`,
  info:'<circle cx="12" cy="7" r="1.5" fill="#fff"/><path d="M12 10.8v7" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  person:'<circle cx="12" cy="7.5" r="3.6" fill="#fff"/><path d="M4.8 20.5c.5-4.2 3.4-6.4 7.2-6.4s6.7 2.2 7.2 6.4Z" fill="#fff"/>',
  barbell:`<path d="M2.8 12h18.4M6 7.8v8.4M8.8 9.5v5M15.2 9.5v5M18 7.8v8.4" ${S_}/>`,
  kettlebell:`<path d="M8.8 9a3.2 3.2 0 0 1 6.4 0" ${S_}/><circle cx="12" cy="14.8" r="5.4" fill="#fff"/>`,
  bench:`<path d="M3.5 11h17M6 11v7.5M18 11v7.5M9 11V7.5h6V11" ${S_}/>`,
  bar:`<path d="M3 4.8h18M8.2 4.8l2.4 4.8M15.8 4.8l-2.4 4.8M12 13.2v6.3" ${S_}/><circle cx="12" cy="11.4" r="1.9" fill="#fff"/>`,
  band:`<path d="M3.5 12c2.2-6 6.3-6 8.5 0s6.3 6 8.5 0" ${S_}/>`,
  mat:`<path d="M3.5 16.5h11.5a3.2 3.2 0 0 0 0-6.4H6.5a2 2 0 0 0 0 4h8.2" ${S_}/>`,
  wrench:'<path d="M15.2 3.8a4.6 4.6 0 0 0-4.3 6.3L4.3 16.7a1.9 1.9 0 0 0 2.7 2.7l6.6-6.6a4.6 4.6 0 0 0 6.3-4.3l-2.8 2.8-2.6-.6-.6-2.6Z" fill="#fff"/>',
  medal:`<path d="M8 3.5 10.2 9M16 3.5 13.8 9" ${S_}/><circle cx="12" cy="14.5" r="5.5" fill="#fff"/>`,
  repeat:`<path d="M5 11V9.5A3.5 3.5 0 0 1 8.5 6H19m-3-3 3 3-3 3M19 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5m3 3-3-3 3-3" ${S_}/>`,
  pencil:'<path d="m15.8 4.2 4 4L9 19l-5 1 1-5Z" fill="#fff"/>',
  benchIncline:`<path d="M3.5 17h10M5.5 17v3M11.5 17v3M9.5 17l7-9.5" ${S_}/>`,
  benchPress:`<path d="M3.5 14.5h11M5.5 14.5v5M12.5 14.5v5M18 4.5v15M2.5 8.5h19" ${S_}/>`,
  rack:`<path d="M6 3.5v17M18 3.5v17M3.5 20.5h17M2.5 9h19M4 7v4M20 7v4" ${S_}/>`,
  dips:`<path d="M4.5 20V9.5h5M19.5 20V9.5h-5" ${S_}/><path d="M9.5 9.5v2.5M14.5 9.5v2.5" ${S_}/>`,
  straps:`<path d="M12 3v3.5M12 6.5 7.5 16M12 6.5l4.5 9.5M5 16h5M14 16h5" ${S_}/>`,
  wheel:`<circle cx="12" cy="12" r="5.6" ${S_}/><circle cx="12" cy="12" r="1.7" fill="#fff"/><path d="M2.8 12h3.6M17.6 12h3.6" ${S_}/>`,
  rope:`<path d="M6.5 17c0-10 11-10 11 0" ${S_}/><path d="M6.5 16.5v4M17.5 16.5v4" ${S_} stroke-width="3"/>`,
  download:`<path d="M12 3.8v11M7.6 10.6 12 15l4.4-4.4M5 19.6h14" ${S_}/>`,
  restore:`<path d="M12 20.2v-11M7.6 13.4 12 9l4.4 4.4M5 4.4h14" ${S_}/>`,
  phone:`<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6" ${S_}/><path d="M12 8.6v5.6M9.2 11.4h5.6" ${S_}/>`,
};
function sfIcon(name, color, extra){
  return `<span class="sfi ${extra||""}" style="--c:${IOS_COL[color]||color}" aria-hidden="true"><svg viewBox="0 0 24 24">${GLYPHS[name]||""}</svg></span>`;
}

function icon(name){ return `<svg viewBox="0 0 24 24">${ICONS[name]||""}</svg>`; }

function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function qs(sel,root){ return (root||document).querySelector(sel); }
function qsa(sel,root){ return Array.from((root||document).querySelectorAll(sel)); }

// ---------- tabbar ----------
function buildShell(){
  qs("#app").innerHTML = TABS.map(t=>`<div class="view" id="v-${t.id}"></div>`).join("");
  if(!qs("#charttip")){ const t = document.createElement("div"); t.id = "charttip"; t.setAttribute("role","tooltip"); document.body.appendChild(t); }
  qs(".tabbar").innerHTML = TABS.map(t=>`<button class="tabbtn" data-a="tab" data-id="${t.id}">${icon(t.icon)}<span class="tl">${t.n}</span></button>`).join("");
  // défilement : barre de navigation translucide et grand titre qui se replie façon iOS
  // (une seule écriture par image, uniquement des propriétés composées par le GPU)
  qsa(".view").forEach(v=>{
    let pending = false;
    v.addEventListener("scroll", ()=>{
      if(pending) return; pending = true;
      requestAnimationFrame(()=>{
        pending = false;
        const y = v.scrollTop;
        v.classList.toggle("scrolled", y>4);
        const lt = v.querySelector(".lt");
        if(lt){ const k = Math.max(0, Math.min(1, y/70)); lt.style.opacity = (1-k*0.9).toFixed(2); lt.style.transform = k ? `translateY(${(k*6).toFixed(1)}px) scale(${(1-k*0.06).toFixed(3)})` : ""; }
      });
    }, { passive:true });
  });
}

let currentTab = "today";
const TAB_ORDER = ["today","history","progress","profil"];
function switchTab(id){
  const from = TAB_ORDER.indexOf(currentTab), to = TAB_ORDER.indexOf(id);
  const v = qs("#v-"+id); if(v) v.dataset.dir = from<0||from===to ? "" : to>from ? "r" : "l";
  currentTab = id;
  qsa(".tabbtn").forEach(b=>b.classList.toggle("on", b.dataset.id===id));
  qsa(".view").forEach(v=>v.classList.toggle("active", v.id==="v-"+id));
  renderViewAnimated(id, true);
  if(typeof renderRestBar==="function") renderRestBar();
}

const VIEWS = {};
function renderView(id){
  if(id==="today" && typeof syncWakeLock==="function") syncWakeLock();
  const el = qs("#v-"+id);
  if(!el || !VIEWS[id]) return;
  const scrollTop = el.scrollTop;
  hideTip();
  el.innerHTML = VIEWS[id]();
  el._ver = DATA_VER; el._day = todayISO(); // rendu à jour pour ces données
  el.classList.toggle("scrolled", scrollTop>4);
  el.scrollTop = scrollTop;
  settleSegs(el);
}
// rendu avec entrée animée (apparition décalée des éléments .stagger, compteurs)
// — réservé aux changements d'onglet ou de section, pas aux rendus après chaque action.
let enterTimer = null;
function renderViewAnimated(id, reuse){
  const el = qs("#v-"+id);
  if(!el) return;
  el.classList.remove("enter"); void el.offsetWidth; // relance les animations d'entrée
  el.classList.add("enter");
  // changement d'onglet sans modification des données : on réutilise le rendu existant
  // (ni reconstruction du HTML ni nouvelle mise en page complète)
  if(!(reuse && el._ver===DATA_VER && el._day===todayISO() && el.firstChild)) renderView(id);
  else settleSegs(el);
  animateCounts(el);
  clearTimeout(enterTimer);
  enterTimer = setTimeout(()=>{ el.classList.remove("enter"); el.dataset.dir = ""; }, 1200);
}

// ---------- contrôle segmenté avec indicateur glissant ----------
const SEG_PREV = {};
function segHTML(key, options, cur, action){
  const idx = Math.max(0, options.findIndex(o=>o[0]===cur));
  return `<div class="seg" data-seg="${key}" data-cur="${idx}" style="--n:${options.length}" role="tablist">
    <span class="seg-ind"></span>
    ${options.map(([id,label])=>`<button role="tab" aria-selected="${id===cur}" class="${id===cur?"on":""}" data-a="${action}" data-v="${id}">${label}</button>`).join("")}
  </div>`;
}
function settleSegs(root){
  qsa(".seg", root).forEach(sg=>{
    const key = sg.dataset.seg, cur = +sg.dataset.cur, ind = qs(".seg-ind", sg);
    const prev = SEG_PREV[key]==null ? cur : SEG_PREV[key];
    ind.style.transition = "none";
    ind.style.transform = `translateX(${prev*100}%)`;
    void ind.offsetWidth;
    ind.style.transition = "";
    ind.style.transform = `translateX(${cur*100}%)`;
    SEG_PREV[key] = cur;
  });
}

// ---------- compteurs animés ----------
function animateCounts(root){
  const els = qsa("[data-count]", root);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  els.forEach(el=>{
    const target = parseFloat(el.dataset.count), dec = +(el.dataset.dec||0), unit = el.dataset.unit;
    const fmt = v => (dec ? v.toLocaleString("fr-CH",{minimumFractionDigits:dec,maximumFractionDigits:dec}) : fmtNum(v)) + (unit?" "+unit:"");
    if(reduce || !(target>0)){ el.textContent = fmt(target||0); return; }
    const t0 = performance.now(), dur = 800;
    (function step(t){
      const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = fmt(target*e);
      if(p<1) requestAnimationFrame(step);
    })(t0);
  });
}

// ---------- info-bulle des graphiques (appui ou focus clavier) ----------
let tipOn = null;
function showTip(target){
  const tip = qs("#charttip");
  if(!tip) return;
  if(tipOn) tipOn.classList.remove("tip-on");
  tipOn = target; target.classList.add("tip-on");
  tip.textContent = target.dataset.tip;
  tip.classList.add("show");
  const r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = r.left + r.width/2 - tw/2; x = Math.max(8, Math.min(innerWidth-tw-8, x));
  let y = r.top - th - 8; if(y<8) y = r.bottom + 8;
  tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
}
function hideTip(){
  const tip = qs("#charttip");
  if(tip) tip.classList.remove("show");
  if(tipOn){ tipOn.classList.remove("tip-on"); tipOn = null; }
}
document.addEventListener("click", e=>{
  const t = e.target.closest("[data-tip]");
  // pas de bascule : le focus (qui précède le clic) a déjà pu afficher la bulle
  if(t) showTip(t); else hideTip();
});
document.addEventListener("focusin", e=>{ const t = e.target.closest && e.target.closest("[data-tip]"); if(t) showTip(t); });
document.addEventListener("scroll", hideTip, true);

// ---------- saisie d'une valeur numérique ----------
function promptNumber({title, value, unit, step, onOk}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:12px">${esc(title)}</div>
    <div class="num-field"><input id="numInput" type="number" inputmode="decimal" step="${step||"any"}" value="${value??""}"><span>${esc(unit||"")}</span></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
      <button class="btn" data-a="numOk">Valider</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onNum = onOk;
  setTimeout(()=>{ const i=qs("#numInput"); if(i){ i.focus(); i.select(); } }, 80);
}
function changed(){
  save();
  const sheetOpen = qs("#overlay").classList.contains("open");
  if(!sheetOpen) renderView(currentTab);
  else dirtyOnClose = true;
}
let dirtyOnClose = false;

// ---------- sheets / overlay ----------
// _gen : chaque ouverture incrémente le compteur, pour qu'une fermeture en cours
// (nettoyage différé de 300 ms) n'efface pas une sheet ouverte entre-temps.
let overlayGen = 0;
function showOverlay(inner, kind){
  const ov = qs("#overlay");
  const gen = ++overlayGen;
  hideTip();
  ov.innerHTML = `<div class="scrim" data-a="closesheet"></div>${inner}`;
  ov.classList.add("open");
  ov.dataset.kind = kind;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(gen===overlayGen) ov.classList.add("show"); }));
}
function openSheet(html, opts){
  opts = opts||{};
  showOverlay(`<div class="sheet ${opts.tall?"tall":""}" role="dialog">${opts.noGrab?"":'<div class="sheet-grab"></div>'}${html}${opts.footer?`<div class="sheet-ft">${opts.footer}</div>`:""}</div>`, "sheet");
}
function openModal(html){
  showOverlay(`<div class="center-modal" role="dialog">${html}</div>`, "modal");
}
function closeSheet(){
  const ov = qs("#overlay");
  if(!ov.classList.contains("open")) return;
  ov.classList.remove("show");
  const gen = overlayGen;
  setTimeout(()=>{
    if(gen!==overlayGen) return;
    ov.classList.remove("open"); ov.innerHTML="";
    if(dirtyOnClose){ dirtyOnClose=false; renderView(currentTab); }
  },300);
}
function confirmSheet({title,html,ok,onOk,danger}){
  openModal(`<div style="font-weight:700;font-size:calc(17rem/17);margin-bottom:6px">${esc(title)}</div>
    <div style="color:var(--label2);font-size:calc(14.5rem/17);line-height:1.4;margin-bottom:18px">${html||""}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn ${danger?"danger":""}" data-a="confirmYes">${esc(ok||"OK")}</button>
      <button class="btn ghost" data-a="closesheet" style="height:40px">Annuler</button>
    </div>`);
  qs("#overlay")._onYes = onOk;
}

// ---------- toast ----------
let toastTimer=null;
function toast(msg){
  const t = qs("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove("show"), 2200);
}

// ---------- délégation d'actions ----------
const ACT = {
  tab(d){ switchTab(d.id); },
  closesheet(){ closeSheet(); },
  confirmYes(){ const fn = qs("#overlay")._onYes; closeSheet(); if(fn) fn(); },
  numOk(){
    const fn = qs("#overlay")._onNum, v = parseFloat((qs("#numInput")||{}).value);
    closeSheet();
    if(fn && !isNaN(v) && v>=0) fn(v);
  },
  noop(){},
};

document.addEventListener("click", e=>{
  // un glissement de carte ne doit pas déclencher le bouton sous le doigt
  if(typeof suppressClicksUntil!=="undefined" && Date.now()<suppressClicksUntil){ e.preventDefault(); return; }
  const el = e.target.closest("[data-a]");
  if(!el) return;
  const name = el.dataset.a;
  if(ACT[name]) ACT[name](el.dataset, el);
});
document.addEventListener("keydown", e=>{
  if(e.key==="Enter" && e.target && e.target.id==="numInput"){ e.preventDefault(); ACT.numOk(); }
  if(e.key==="Enter" && e.target && e.target.id==="tplEdName"){ e.preventDefault(); e.target.blur(); }
  if(e.key==="Enter" && e.target && (e.target.id==="nameInput" || e.target.id==="tplName")){
    e.preventDefault(); const b = qs('.center-modal [data-a^="save"]'); if(b) b.click();
  }
});
document.addEventListener("change", e=>{
  const el = e.target.closest("[data-c]");
  if(!el) return;
  const name = el.dataset.c;
  if(ACT[name]) ACT[name](el.dataset, el);
});
