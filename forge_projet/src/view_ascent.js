// ================= ASCENSION : écran « Mon ascension », vignettes, fin de séance, sommet =================
// La scène est la vraie montagne : silhouette calculée depuis le relief (swisstopo, Copernicus), vraie voie
// d'ascension (OpenStreetMap), refuges à leur place. Les 13 scènes (≈ 680 Ko) sont dans ascent-scenes.js,
// chargé à la première ouverture comme Three.js ; la silhouette embarquée (ASC_DATA.sky) sert en attendant
// et pour les vignettes.

// ---------- couleurs des scènes : matières éclairées en 3 niveaux, voilées selon le plan ----------
const ASC_PAL = {
  alps:{ day:{ sky:["#78A8D6","#D6E4EE"], snow:[246,248,251], rock:[126,120,116], veg:[86,118,74], haze:[198,214,228] },
         night:{ sky:["#050A18","#1C2A4A"], snow:[176,190,216], rock:[64,73,95], veg:[42,62,70], haze:[34,46,76] } },
  afr:{ day:{ sky:["#6EA2D2","#E6E0CE"], snow:[246,248,251], rock:[116,106,98], veg:[156,142,94], haze:[214,214,206] },
        night:{ sky:["#060A16","#24263C"], snow:[176,190,216], rock:[70,70,87], veg:[64,64,73], haze:[38,42,66] } },
  and:{ day:{ sky:["#5A8CCD","#D8DEE6"], snow:[246,248,251], rock:[140,112,92], veg:[166,138,104], haze:[208,212,218] },
        night:{ sky:["#05091A","#202848"], snow:[176,190,216], rock:[81,70,81], veg:[84,73,81], haze:[36,42,72] } },
  hima:{ day:{ sky:["#2F62B4","#C8DAEE"], snow:[247,249,252], rock:[110,102,98], veg:[140,126,106], haze:[190,206,228] },
         night:{ sky:["#020410","#141C3C"], snow:[180,194,220], rock:[62,64,84], veg:[64,64,81], haze:[30,38,70] } },
};
const ASC_LIGHT = { day:[.58,.82,1], night:[.5,.78,1] }, ASC_SHADE = { day:[.86,.9,1.08], night:[.82,.9,1.14] }, ASC_HAZE = { day:[.03,.14,.42], night:[.08,.22,.5] };
function ascClassColor(pal, mode, k){
  const P = ASC_PAL[pal][mode], b = Math.floor(k/9), m = Math.floor(k/3)%3, q = k%3, base = [P.snow, P.rock, P.veg][m];
  const f = ASC_HAZE[mode][b], l = ASC_LIGHT[mode][q], t = q===0 ? ASC_SHADE[mode] : [1,1,1];
  return `rgb(${base.map((v,i)=>Math.round(Math.max(0, Math.min(255, v*l*t[i]*(1-f) + P.haze[i]*f)))).join(",")})`;
}
function ascDark(){ const t = document.documentElement.dataset.theme; return t==="dark" || (t!=="light" && !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches)); }
const ascP1 = n=>n.toFixed(1);
function ascRng(seed){ let a = seed>>>0; return ()=>{ a = a+0x6D2B79F5|0; let t = Math.imul(a^a>>>15, 1|a); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const ASC_IC = {
  tent:'<path d="M3 20 12 4l9 16Z" fill="currentColor"/>',
  hut:'<path d="M4 20v-9l8-7 8 7v9Z" fill="currentColor"/>',
  flag:'<path d="M5 21V4m0 1h11l-2.5 4L16 13H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  pulse:'<path d="M3 12h4l2.5-6 4 12 2.5-6H21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  card:'<rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="m7 16 3.5-5 2.5 3 1.5-2 2.5 4Z" fill="currentColor"/>',
  peak:'<path d="m2.5 19 7-11.5 3.5 5.5 2.5-3.5 6 9.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  pause:'<path d="M9 6v12M15 6v12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
};
function ascIc(n, cls){ return `<svg viewBox="0 0 24 24" class="asc-ic ${cls||""}" aria-hidden="true">${ASC_IC[n]}</svg>`; }
const ascM = n=>fmtNum(n)+" m";
const ascX = n=>"×"+n.toLocaleString("fr-FR", { maximumFractionDigits:2 });

// ---------- chargement des scènes (à la demande, mis en cache par le service worker) ----------
let ascScenesP = null;
function ascLoadScenes(){
  if(window.ASC_SCENES) return Promise.resolve(window.ASC_SCENES);
  if(ascScenesP) return ascScenesP;
  ascScenesP = new Promise((ok, ko)=>{
    const s = document.createElement("script"); s.src = "ascent-scenes.js"; s.async = true;
    s.onload = ()=>window.ASC_SCENES ? ok(window.ASC_SCENES) : (ascScenesP = null, ko(new Error("scènes")));
    s.onerror = ()=>{ ascScenesP = null; ko(new Error("ascent-scenes.js introuvable")); };
    document.head.appendChild(s);
  });
  return ascScenesP;
}

// mis en cache dès qu'on est en ligne (sans être lu) : l'écran marche ensuite hors ligne dès la première ouverture
function ascPrefetch(){
  try{ if(!/^https?:/.test(location.protocol) || !window.caches || !navigator.onLine) return;
    caches.match("ascent-scenes.js").then(r=>{ if(!r) fetch("ascent-scenes.js").catch(()=>{}); }).catch(()=>{}); }catch(e){}
}

// ---------- silhouettes (embarquées) ----------
const ASC_SKY = {};
function ascSky(k){ return ASC_SKY[k] || (ASC_SKY[k] = (()=>{ const v = ASC_DATA[k].sky.split(" ").map(Number), p = []; for(let i=0;i<v.length;i+=2) p.push([v[i], v[i+1]]); return p; })()); }
// vignette : la silhouette pleine, recadrée sous le sommet (vue 156 × 188 → hauteur utile)
function ascSkySVG(k, cls, flag){
  const p = ascSky(k), D = ASC_DATA[k], y0 = Math.max(0, D.sy-14), y1 = Math.min(188, Math.max(...p.map(q=>q[1]))+30);
  const d = "M"+p.map(q=>q[0]+" "+q[1]).join("L")+`L156 ${y1}L0 ${y1}Z`;
  return `<svg class="${cls||""}" viewBox="0 ${y0} 156 ${y1-y0}" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="${d}" fill="currentColor"/>${flag ? `<path d="M${D.sx} ${D.sy}v-11h8l-2 3 2 3h-8" fill="var(--tint)" stroke="var(--tint)" stroke-width="1.6" stroke-linejoin="round"/>` : ""}</svg>`;
}
// la crête autour du sommet, normalisée dans un cadre (médailles)
function ascSkyline(k, x0, y0, w, h, span){
  const p = ascSky(k), sx = ASC_DATA[k].sx, seg = p.filter(q=>Math.abs(q[0]-sx)<=156*span);
  if(seg.length<2) return [];
  const xs = seg.map(q=>q[0]), mnx = Math.min(...xs), mxx = Math.max(...xs), ys = seg.map(q=>q[1]), mn = Math.min(...ys), mx = Math.min(Math.max(...ys), mn+188*.45);
  return seg.map(q=>[x0+(q[0]-mnx)/Math.max(1, mxx-mnx)*w, y0+(Math.min(q[1], mx)-mn)/Math.max(1, mx-mn)*h]);
}
// trophée de sommet : médaille gravée de la vraie silhouette, métal selon la difficulté
let ascMedalN = 0;
function ascMedalSVG(k, size, engrave, cols){
  const [dk, md, lt] = cols || ASC_TIERS[ASC_TIER_OF(k)].slice(0,3), id = "am"+(++ascMedalN);
  const sh = k ? ascSkyline(k, 24, 32, 52, 24, .32) : [], lp = pts=>pts.map((q,i)=>(i?"L":"M")+ascP1(q[0])+" "+ascP1(q[1])).join("");
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="asc-medal" aria-hidden="true"><defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".5" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <linearGradient id="${id}b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".55" stop-color="${md}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
    <clipPath id="${id}c"><circle cx="50" cy="50" r="36"/></clipPath></defs>
    <circle cx="50" cy="50" r="46" fill="url(#${id}a)"/><circle cx="50" cy="50" r="37" fill="url(#${id}b)"/>
    <circle cx="50" cy="50" r="37" fill="none" stroke="${dk}" stroke-opacity=".35" stroke-width="1.2"/>
    ${sh.length ? `<g clip-path="url(#${id}c)"><path d="${lp(sh)}L76 64L24 64Z" fill="${dk}" fill-opacity=".42"/><path d="${lp(sh)}" fill="none" stroke="${lt}" stroke-width="1.4" stroke-linejoin="round" stroke-opacity=".95"/></g>` : ""}
    ${engrave && k ? `<text x="50" y="76" text-anchor="middle" font-family="ASCEN Num,-apple-system,sans-serif" font-weight="700" font-size="10" fill="${dk}" fill-opacity=".8">${fmtNum(ASC_DATA[k].top)} m</text>` : ""}
    <path d="M18 34A36 36 0 0 1 60 14" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}

// ---------- la scène : relief, voie, camps, grimpeur ----------
function ascRouteAt(rt, a){ // position sur la voie pour une altitude ; h : 0 visible, 1 derrière un relief, 2 hors cadre
  const P = rt.pts;
  if(a<=P[0][2]) return { x:P[0][0], y:P[0][1], L:0, h:P[1] ? P[1][3] : 0 };
  for(let i=1;i<P.length;i++){ const p = P[i-1], q = P[i];
    if(a<=q[2]){ const t = q[2]-p[2]>0 ? (a-p[2])/(q[2]-p[2]) : 1; return { x:p[0]+(q[0]-p[0])*t, y:p[1]+(q[1]-p[1])*t, L:rt.len[i-1]+(rt.len[i]-rt.len[i-1])*t, h:q[3] }; } }
  const e = P[P.length-1]; return { x:e[0], y:e[1], L:rt.len[rt.len.length-1], h:e[3] };
}
function ascRoutePaths(P){ // parties visibles / cachées (relief ou hors cadre) tracées à part
  let vis = "", hid = "", prev = -1;
  for(let i=1;i<P.length;i++){ const h = P[i][3] ? 1 : 0, a = P[i-1], b = P[i], seg = (h!==prev ? `M${a[0]} ${a[1]}` : "")+`L${b[0]} ${b[1]}`;
    if(h) hid += seg; else vis += seg; prev = h; }
  return { vis, hid };
}
// construit la scène dans host ; renvoie un contrôleur { set(alt, summited) }
function ascBuildScene(host, k){
  const sc = window.ASC_SCENES && ASC_SCENES[k]; if(!sc || !host) return null;
  const D = ASC_DATA[k], mode = ascDark() ? "night" : "day", night = mode==="night", P = ASC_PAL[D.pal][mode], W = sc.W, H = sc.H, r = ascRng(ASC_ORDER.indexOf(k)+7);
  const fills = Array.from({ length:27 }, (_,i)=>`.ak${i}{fill:${ascClassColor(D.pal, mode, i)}}`).join("");
  let stars = ""; if(night) for(let i=0;i<60;i++) stars += `<circle class="asc-star" cx="${ascP1(r()*W)}" cy="${ascP1(r()*H*.5)}" r="${(1+r()*1.8).toFixed(2)}" fill="#fff" style="animation-delay:${(r()*3).toFixed(2)}s"/>`;
  const ox = W*.8, oy = H*.3;
  const orb = night ? `<circle cx="${ox}" cy="${oy}" r="120" fill="url(#asGlow)"/><circle cx="${ox}" cy="${oy}" r="28" fill="#EEF2FA"/><circle cx="${ox+11}" cy="${oy-8}" r="25" fill="${P.sky[0]}" opacity=".9"/>`
                    : `<circle cx="${ox}" cy="${oy}" r="160" fill="url(#asGlow)"/><circle cx="${ox}" cy="${oy}" r="36" fill="#FFF6DD"/>`;
  const cl = night ? "rgba(150,168,205,.12)" : "rgba(255,255,255,.75)";
  const cloud = (x, y, s, dur, del)=>`<g class="asc-cloud" style="animation-duration:${dur}s;animation-delay:-${del}s"><g transform="translate(${x} ${y}) scale(${s})" fill="${cl}"><ellipse cx="0" cy="0" rx="68" ry="22"/><ellipse cx="-28" cy="-14" rx="32" ry="22"/><ellipse cx="18" cy="-20" rx="36" ry="26"/><ellipse cx="52" cy="-6" rx="26" ry="16"/></g></g>`;
  const terrain = sc.paths.map(([c, d])=>`<path class="ak${c}" d="${d}"/>`).join("");
  const land = sc.land.map(d=>`<path d="${d}"/>`).join("");
  const pts = sc.route, len = [0]; for(let i=1;i<pts.length;i++) len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
  const rd = "M"+pts.map(p=>p[0]+" "+p[1]).join("L"), rp = ascRoutePaths(pts);
  const route = night ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.95)", ghost = night ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.62)";
  const hud = night || D.pal==="hima" ? "#F4F6FA" : "#0F1B28";
  host.style.setProperty("--hud", hud); host.style.setProperty("--hud2", night || D.pal==="hima" ? "rgba(244,246,250,.74)" : "rgba(15,27,40,.7)");
  host.style.setProperty("--pill", night ? "rgba(17,23,38,.86)" : "rgba(255,255,255,.9)"); host.style.setProperty("--pill-ink", night ? "#F2F4F8" : "#13202A");
  const svg = `<svg class="asc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="asSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[1]}"/></linearGradient>
      <radialGradient id="asGlow"><stop offset="0" stop-color="${night ? "rgba(170,195,240,.35)" : "rgba(255,224,160,.6)"}"/><stop offset="1" stop-color="${night ? "rgba(170,195,240,0)" : "rgba(255,224,160,0)"}"/></radialGradient>
      <radialGradient id="asMe"><stop offset="0" stop-color="#FF8A57" stop-opacity=".6"/><stop offset="1" stop-color="#FF8A57" stop-opacity="0"/></radialGradient>
      <radialGradient id="asLamp"><stop offset="0" stop-color="#FFE2B8" stop-opacity=".4"/><stop offset="1" stop-color="#FFE2B8" stop-opacity="0"/></radialGradient>
      <clipPath id="asLand">${land}</clipPath>
      <mask id="asHid" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><path d="${rp.hid}" fill="none" stroke="#5a5a5a" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>
    <style>${fills}</style>
    <rect width="${W}" height="${H}" fill="url(#asSky)"/>${stars}${orb}
    <g opacity=".95">${cloud(80, H*.42, 1, 110, 20)}${cloud(500, H*.36, .75, 140, 80)}</g>
    <g clip-path="url(#asLand)">${terrain}</g>
    ${rp.hid ? `<path d="${rp.hid}" fill="none" stroke="${ghost}" stroke-width="2.2" stroke-dasharray="1.5 8" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <path d="${rp.vis}" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${rp.vis}" fill="none" stroke="${route}" stroke-width="3.2" stroke-dasharray="3 9" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="asc-done" d="${rd}" fill="none" stroke="#FF6B3D" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" mask="url(#asHid)"/>
    <g class="asc-camps"></g>
    <g transform="translate(${sc.summit[0]} ${sc.summit[1]})"><g class="asc-flag"><line x1="0" y1="0" x2="0" y2="-46" stroke="${hud}" stroke-width="3" stroke-linecap="round"/><path class="asc-cloth" d="M0 -46h30l-7 9 7 9H0Z" fill="#FF6B3D"/></g></g>
    <g class="asc-me">${night ? `<circle r="80" fill="url(#asLamp)"/>` : ""}<circle r="34" fill="url(#asMe)"/><circle class="asc-ring" r="11" fill="none" stroke="#FF6B3D" stroke-width="3.5"/><circle r="11" fill="#FF6B3D" stroke="#fff" stroke-width="4"/></g>
    <g class="asc-next"></g></svg>`;
  const old = host.querySelector(".asc-svg"); if(old) old.remove();
  host.insertAdjacentHTML("afterbegin", svg);
  const el = host.querySelector(".asc-svg"), rt = { pts, len }, total = len[len.length-1];
  const G = { k, rt, total, el, done:el.querySelector(".asc-done"), me:el.querySelector(".asc-me"), flag:el.querySelector(".asc-flag"), next:el.querySelector(".asc-next"), camps:[], night, W };
  const cg = el.querySelector(".asc-camps");
  D.camps.forEach(([a, name, real], i)=>{
    const p = ascRouteAt(rt, a), hut = !/^(Camp|Bivouac) \d/.test(name);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("transform", `translate(${ascP1(p.x)} ${ascP1(p.y)})`);
    if(p.h===2) g.style.display = "none"; else if(p.h===1) g.style.opacity = ".5";
    g.innerHTML = `<g class="asc-camp">${hut ? `<path d="M-12 0v-13l12-10 12 10V0Z" stroke-width="2.6"/><rect x="-3.2" y="-8" width="6.4" height="8" fill="rgba(0,0,0,.45)" stroke="none"/>` : `<path d="M-13 0 0 -20 13 0Z" stroke-width="2.6"/><path d="M0 -20V0" stroke-width="2"/>`}</g>`;
    cg.appendChild(g); G.camps.push({ a, name, real, i, inner:g.firstChild, x:p.x, y:p.y });
  });
  G.done.style.strokeDasharray = `0 ${total+20}`;
  G.set = (alt, summited)=>{
    const D2 = ASC_DATA[k], a = Math.min(D2.top, Math.max(D2.start, alt)), p = ascRouteAt(rt, a);
    G.done.style.strokeDasharray = `${ascP1(p.L)} ${ascP1(total+20)}`;
    G.me.setAttribute("transform", `translate(${ascP1(p.x)} ${ascP1(p.y)})`); G.me.style.opacity = p.h && !summited ? ".55" : "1";
    G.camps.forEach(c=>{ const past = c.a<=a+.5;
      c.inner.setAttribute("fill", past ? "#FF6B3D" : (night ? "rgba(17,23,38,.85)" : "rgba(255,255,255,.92)"));
      c.inner.setAttribute("stroke", past ? "#fff" : (night ? "rgba(255,255,255,.7)" : "rgba(15,27,40,.6)")); });
    const nx = summited ? null : G.camps.find(c=>c.a>a+.5);
    if(nx){ const tx = `${nx.name} · ${fmtNum(nx.real)} m`, w = tx.length*11.2+30, left = nx.x+w+30>W-10, lx = left ? nx.x-w-22 : nx.x+22;
      G.next.innerHTML = `<g transform="translate(${ascP1(Math.max(6, lx))} ${ascP1(Math.max(6, nx.y-46))})"><rect width="${ascP1(w)}" height="38" rx="19" fill="${night ? "rgba(17,23,38,.86)" : "rgba(255,255,255,.9)"}"/><text x="${ascP1(w/2)}" y="25.5" text-anchor="middle" font-size="21" font-weight="600" font-family="-apple-system,BlinkMacSystemFont,sans-serif" fill="${night ? "#F2F4F8" : "#13202A"}">${esc(tx)}</text></g>`; }
    else G.next.innerHTML = "";
    G.flag.style.opacity = summited ? 1 : .45; G.flag.querySelector(".asc-cloth").style.animationPlayState = summited ? "running" : "paused";
  };
  return G;
}
// montée (ou descente) animée du grimpeur ; onCamp(camp) à chaque camp franchi en montant
function ascAnimate(G, from, to, dur, onCamp, onStep){
  return new Promise(res=>{
    if(!G || reducedMotion() || Math.abs(to-from)<1){ if(G) G.set(to); if(onStep) onStep(to); res(); return; }
    const t0 = performance.now(), crossed = new Set(), ease = t=>t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2, 3)/2;
    let prev = from;
    const step = now=>{
      if(!G.el.isConnected){ res(); return; }
      const t = Math.min(1, (now-t0)/dur), a = from+(to-from)*ease(t);
      G.set(a); if(onStep) onStep(a);
      if(to>from) G.camps.forEach(c=>{ if(c.a>prev && c.a<=a && !crossed.has(c.i)){ crossed.add(c.i); c.inner.classList.remove("pop"); void c.inner.getBBox(); c.inner.classList.add("pop"); sfx("ascCamp"); if(onCamp) onCamp(c); } });
      prev = a;
      if(t<1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}

// ---------- sons (synthétisés, gamme de do comme le reste de l'app) ----------
Object.assign(SFX, {
  ascClimb(dur){ const n = Math.max(4, Math.round((dur||1.5)*6)); for(let k=0;k<n;k++){ const p = k/n; tone(392*Math.pow(2, p*1.2), p*(dur||1.5), .09, { gain:.05, type:"triangle" }); } },
  ascCamp(){ bell(NT.E6, 0, .7, .1); bell(NT.A6, .09, .8, .08); },
  ascDown(){ [659.25, 587.33, 523.25, 440].forEach((f,i)=>tone(f, i*.11, .28, { gain:.07, type:"triangle" })); },
  ascSummit(){ [NT.C5, NT.E5, NT.G5].forEach((f,i)=>tone(f, i*.09, 2, { gain:.07, type:"triangle", wet:1 })); [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, .35+i*.11, 1.4, .09)); },
});

// ---------- textes ----------
function ascWhereTxt(a){ // une ligne : où l'on en est
  const D = ASC_DATA[a.key];
  if(!S.sessions.length) return `Ta première séance te met en route vers ${ascLe(a.key)}.`;
  if(a.wait){ const N = ASC_DATA[a.next];
    return a.series>=a.nextReq ? `Au sommet ${ascDu(a.key)}. Ta prochaine séance te lance vers ${ascLe(a.next)}.`
      : `Au sommet ${ascDu(a.key)}. Une série de ${nb(a.nextReq, "semaine")} ouvre ${ascLe(a.next)} (tu en as ${a.series}).`; }
  const nc = a.nextCamp;
  return nc ? `${nc[1]} dans ${ascM(nc[0]-a.alt)}, environ ${nb(ascSessionsFor(nc[0]-a.alt, a), "séance")}.` : `Sommet dans ${ascM(D.top-a.alt)}.`;
}

// ---------- vignettes : pastille d'accueil, carte de Progrès, profil ----------
function ascPillHTML(){
  const a = ascent(), D = ASC_DATA[a.key], pct = Math.round(Math.max(0, Math.min(1, a.done))*100);
  return `<button class="spill asc-pill" data-a="openAscent" aria-label="Mon ascension : ${esc(D.n)}, ${fmtNum(a.alt)} mètres sur ${fmtNum(D.top)}">
      <span class="sp-v"><b data-count="${Math.round(a.alt)}">${fmtNum(a.alt)}</b><i>m</i></span>
      <span class="sp-l">${esc(a.wait ? "au sommet" : D.n)}</span>
      <span class="spg"><i style="width:${pct}%"></i></span>
    </button>`;
}
function ascCardHTML(){
  const a = ascent(), D = ASC_DATA[a.key], pct = Math.round(Math.max(0, Math.min(1, a.done))*100);
  return `<button class="card asc-card stagger" style="--i:0" data-a="openAscent">
    <div class="ac-sky">${ascSkySVG(a.key, "ac-svg", true)}</div>
    <div class="ac-main">
      <div class="ac-k">Mon ascension · ${a.idx+1} sur 13${a.lap ? ` · ${a.lap+1}ᵉ tour` : ""}</div>
      <div class="ac-n">${esc(D.n)} <span class="num">${fmtNum(a.alt)} m</span></div>
      <div class="xpbar"><span style="width:${pct}%"></span></div>
      <div class="ac-s">${esc(ascWhereTxt(a))}</div>
    </div><span class="chev">${icon("chev")}</span>
  </button>`;
}

// ---------- l'écran « Mon ascension » ----------
let ascG = null;
// où l'on en est : barre de l'expédition et UNE phrase sur la prochaine étape
function ascExpHTML(a){
  const D = ASC_DATA[a.key], prog = Math.max(0, Math.min(1, a.done))*100, P = v=>v.toFixed(1), N = ASC_DATA[a.next];
  const next = a.wait
    ? (a.series>=a.nextReq ? `Prochaine expédition : <b>${esc(N.n)}</b>, dès ta prochaine séance.` : `Prochaine expédition : <b>${esc(N.n)}</b>, avec une série de ${nb(a.nextReq, "semaine")} (tu en as ${a.series}).`)
    : a.nextCamp ? `Prochain camp : <b>${esc(a.nextCamp[1])}</b> dans <b class="num">${ascM(a.nextCamp[0]-a.alt)}</b>, environ ${nb(ascSessionsFor(a.nextCamp[0]-a.alt, a), "séance")}.`
    : `Sommet dans <b class="num">${ascM(D.top-a.alt)}</b>, environ ${nb(ascSessionsFor(D.top-a.alt, a), "séance")}.`;
  return `<div class="exp-row"><span>${a.wait ? "<b>Sommet atteint</b>" : `<b>Camp ${a.passed}</b> sur ${D.camps.length}`}</span><span>sommet <b class="num">${fmtNum(D.top)} m</b></span></div>
    <div class="exp-track"><div class="exp-push" style="width:${ASC_PUSH*100}%"></div><div class="exp-fill" style="width:${P(prog)}%"></div>${D.camps.map(c=>`<i class="exp-tick ${c[0]<=a.alt+.5 ? "past" : ""}" style="left:${P((c[0]-D.start)/(D.top-D.start)*100)}%"></i>`).join("")}<i class="exp-me" style="left:${P(prog)}%"></i></div>
    <p class="exp-next">${next}</p>`;
}
function ascHudHTML(a){
  const D = ASC_DATA[a.key];
  return `<div class="asc-hud"><div class="hud-l"><div class="hud-k">Expédition ${a.idx+1} sur 13 · ${esc(D.region)}</div><div class="hud-n">${esc(D.n)}</div></div>
    <div class="hud-r"><b class="asc-alt">${fmtNum(a.wait ? D.top : a.alt)} m</b><span>${a.wait ? "sommet atteint" : `sur ${fmtNum(D.top)} m`}</span></div></div>`;
}
// vitesse d'une séance type maintenant (séries de la dernière séance, palier et force actuels)
function ascSpeedNow(a){ const eff = a.last ? a.last.eff : ascEffort(15); return eff*a.mul*a.force/(1 + .25*a.lap); }
// ---------- « Cette semaine » : la seule chose à faire pour monter plus vite ----------
function ascWeekHTML(a){
  const thisW = weekKey(todayISO()), W = a.weeks[a.weeks.length-1], n = W && W.w===thisW ? W.n : 0, g = a.goal, left = Math.max(0, g-n);
  const daysLeft = 7 - weekdayIdx(todayISO()), held = left===0, paused = a.paused && !held;
  const nextP = a.tier<ASC_TH.length-1 ? a.tier+1 : null, toNext = nextP==null ? 0 : ASC_TH[nextP] - a.series;
  let msg;
  if(paused) msg = "Semaine en pause : elle ne compte pas, rien ne se perd.";
  else if(held) msg = `Objectif tenu : ta série passe à <b>${nb(a.series, "semaine")}</b>.`;
  else if(left>daysLeft) msg = n ? "Plus assez de jours pour tenir l'objectif : chaque séance fait quand même monter, et la série reste gelée." : `Fais au moins une séance d'ici dimanche : sans séance, tu redescendrais au camp précédent.`;
  else if(n===0 && !a.wait) msg = `${nb(left, "séance")} d'ici dimanche pour tenir ton objectif. Sans séance, tu redescendrais au camp précédent.`;
  else msg = `Encore ${nb(left, "séance")} d'ici dimanche : ta série passera à <b>${nb(a.series+1, "semaine")}</b>.`;
  const speed = `Ta vitesse : <b class="num">+${ascM(ascSpeedNow(a))}</b> par séance${nextP==null ? ", la plus rapide" : `, <b>${ascX(ASC_MUL[nextP])}</b> après ${nb(toNext, "semaine")} tenue${toNext>1 ? "s" : ""} de plus`}.`;
  const pz = ascPauses().includes(thisW);
  return `<section class="card asc-week" id="ascWeek">
    <div class="aw-hd"><h2>Cette semaine</h2><span class="aw-n"><b class="num">${n}</b>/${g} séance${g>1 ? "s" : ""}</span></div>
    <div class="aw-dots" aria-hidden="true">${Array.from({ length:g }, (_,i)=>`<i class="${i<n ? "on" : ""}"></i>`).join("")}</div>
    <p class="aw-msg">${msg}</p>
    <div class="aw-speed">${ascIc("peak")}<span>${speed}</span></div>
    ${held ? "" : `<button class="aw-pause" data-a="ascPause" data-w="${thisW}" aria-pressed="${pz}" ${!pz && !a.pausesLeft ? "disabled" : ""}>${pz ? "Annuler la pause de cette semaine" : a.pausesLeft ? "Vacances ou malade ? Mettre la semaine en pause" : "Plus de pause disponible ce trimestre"}</button>`}
  </section>`;
}
// ---------- le détail, replié : une ligne par sujet ----------
const ASC_SECS = [
  ["speed", "gauge", "orange", "Vitesse de montée", a=>`+${ascM(ascSpeedNow(a))} / séance`],
  ["reg", "calendar", "green", "Régularité", a=>`${a.series} sem. · ${ascX(a.mul)}`],
  ["force", "barbell", "blue", "Force", a=>ascX(Math.round(a.force*100)/100)],
  ["itin", "compass", "teal", "Itinéraire", a=>`${new Set(a.summits.filter(s=>s.lap===a.lap).map(s=>s.key)).size} sur 13`],
  ["rw", "trophy", "yellow", "Trophées de sommet", a=>a.summits.length ? String(a.summits.length) : ""],
  ["how", "info", "gray", "Comment ça marche", ()=>""],
];
let ascOpen = new Set();
function ascRowsHTML(a){
  return `<div class="group asc-rows">${ASC_SECS.map(([k, g, c, t, v])=>{ const on = ascOpen.has(k);
    return `<button class="row tap asc-row ${on ? "on" : ""}" data-a="ascSec" data-k="${k}" aria-expanded="${on}">${sfIcon(g, c)}<div class="grow"><div class="t">${t}</div></div><span class="val">${v(a)}</span><span class="chev">${icon("chev")}</span></button>
      <div class="clp asc-clp" id="ascSec-${k}">${on ? `<div class="asc-sec">${ascSecBody(k, a)}</div>` : ""}</div>`; }).join("")}</div>`;
}
function ascSecBody(k, a){
  if(k==="speed"){
    const L = a.last, eff = L ? L.eff : ascEffort(15), hard = L ? L.hard : 15, mul = L ? L.mul : a.mul, f = L ? L.force : a.force, res = eff*mul*f*(L ? L.lapF : 1/(1+.25*a.lap));
    return `<p class="sub">${L ? "Ta dernière séance" : "Une séance type de 15 séries"} :</p>
      <div class="formula">
        <div class="f-term"><b class="num">${ascM(eff)}</b><span>effort · ${fmtDec(hard)} série${hard>=2 ? "s" : ""} difficile${hard>=2 ? "s" : ""}</span></div>
        <div class="f-term"><b class="num">${ascX(mul)}</b><span>régularité</span></div>
        <div class="f-term"><b class="num">${ascX(Math.round(f*100)/100)}</b><span>force</span></div><span class="f-op">=</span>
        <div class="f-term res"><b class="num">+${ascM(res)}</b><span>par séance</span></div>
      </div>
      <p class="note">Sans série en cours et sans progrès de force, la même séance ne vaudrait que <b class="num">+${ascM(eff*ASC_MUL[0])}</b> : une séance de temps en temps compte très peu.${L && L.waiting ? " Elle n'a pas fait monter : l'expédition suivante attend ta série." : ""}</p>`;
  }
  if(k==="reg"){
    const p = a.tier, nextP = p<ASC_TH.length-1 ? p+1 : null, opens = nextP==null ? [] : ASC_ORDER.filter(x=>ASC_REQ[x]===ASC_TH[nextP]).map(x=>ASC_DATA[x].n);
    const list = x=>x.length>2 ? x.slice(0,-1).join(", ")+" et "+x.slice(-1) : x.join(" et ");
    const weeks = a.weeks.slice(-13), thisW = weekKey(todayISO()), nextW = addDaysISO(thisW, 7), pz = ascPauses();
    const pauseBtn = (w, lbl)=>{ const on = pz.includes(w); return `<button class="btn ${on ? "secondary on" : "tertiary"} sm" data-a="ascPause" data-w="${w}" aria-pressed="${on}" aria-label="${on ? `Annuler la pause (${lbl.toLowerCase()})` : `Pause : ${lbl.toLowerCase()}`}" ${!on && !a.pausesLeft ? "disabled" : ""}>${on ? icon("check")+" " : ""}${lbl}</button>`; };
    return `<p class="sub">Ta série : les semaines d'affilée où tu fais tes ${nb(a.goal, "séance")}. Plus elle est longue, plus tu montes vite.</p>
      <div class="pal">${ASC_TH.map((t,i)=>`<div class="${i<=p ? "on" : ""} ${i===p ? "cur" : ""}"><b class="num">${ascX(ASC_MUL[i])}</b><i></i><small>${t ? t+" sem." : "départ"}</small></div>`).join("")}</div>
      <p class="note">${nextP==null ? `Palier maximal : tu montes <b>3 fois</b> plus vite qu'au départ. Garde la série.`
        : `Prochain palier dans <b class="num">${nb(ASC_TH[nextP]-a.series, "semaine")}</b> : <b>${ascX(ASC_MUL[nextP])}</b>${opens.length ? `. Il ouvre ${esc(list(opens))}.` : "."}`}</p>
      ${ascGoalHint(a)}
      <div class="asc-wk-h">Tes dernières semaines</div>
      <div class="weeks" aria-label="Dernières semaines">${weeks.map(w=>`<i class="wk ${w.state}" title="${ASC_WK_LABEL[w.state]}"></i>`).join("")}</div>
      <div class="legend"><span><i class="wk ok"></i>objectif tenu</span><span><i class="wk frozen"></i>raté : série gelée</span><span><i class="wk deload"></i>allégée ou pause</span><span><i class="wk empty"></i>sans séance</span></div>
      <div class="asc-pause"><div class="ap-t">${ascIc("pause")}<span><b>Pause</b><span>Vacances, maladie : la semaine ne compte pas, rien ne se perd. ${a.pausesLeft ? `Encore ${nb(a.pausesLeft, "semaine")} ce trimestre.` : "Plus de pause disponible ce trimestre."}</span></span></div>
        <div class="ap-b">${pauseBtn(thisW, "Cette semaine")}${pauseBtn(nextW, "La suivante")}</div></div>`;
  }
  if(k==="force"){
    const pct = a.index==null ? null : a.index-100;
    const wx = a.index==null ? `${ascIc("pulse")}<span><b>Dernière ligne droite possible</b><span>Ta force sera mesurée après quelques séances d'un même exercice.</span></span>`
      : a.pushOK ? `${ascIc("pulse")}<span><b>Dernière ligne droite possible</b><span>Ta force est à ${Math.round(a.form*100)} % de ton meilleur niveau : tu peux viser le sommet à pleine vitesse.</span></span>`
      : `${ascIc("pulse", "warn")}<span><b>Dernière ligne droite à mi-vitesse</b><span>Ta force est à ${Math.round(a.form*100)} % de ton meilleur niveau des 6 derniers mois (il faut ${Math.round(ASC_FORM_OK*100)} %).</span></span>`;
    return `<div class="cond"><span class="cond-x num">${ascX(Math.round(a.force*100)/100)}</span><span class="sub">${pct==null ? "Pas encore d'indice de force : ×1 en attendant." : `Ton indice de force a ${pct>=0 ? "gagné" : "perdu"} ${Math.abs(pct)} % depuis tes débuts. Chaque 10 % de force en plus fait monter 6 % plus vite.`}</span></div>
      <div class="wx ${a.pushOK || a.index==null ? "" : "warn"}">${wx}</div>`;
  }
  if(k==="itin"){
    const done = new Set(a.summits.filter(s=>s.lap===a.lap).map(s=>s.key)), any = new Set(a.summits.map(s=>s.key));
    return `${a.lap ? `<p class="sub">${a.lap+1}ᵉ tour de l'itinéraire.</p>` : ""}${ASC_GROUPS.map(([stage, keys])=>`<div class="stage">${stage}</div><ol class="stops">${keys.map(x=>{
      const n = ASC_ORDER.indexOf(x), D = ASC_DATA[x], isDone = done.has(x), cur = n===a.idx && !a.wait, locked = !isDone && !cur && ASC_REQ[x]>a.series;
      const prog = cur ? Math.round(Math.max(0, Math.min(1, a.done))*100) : 0;
      const right = isDone ? `<b class="num">${fmtNum(D.top)} m</b>atteint` : cur ? `<b class="num">${fmtNum(D.top)} m</b>en cours · ${prog} %` : locked ? `<b class="num">${fmtNum(D.top)} m</b>série de ${ASC_REQ[x]} sem.` : `<b class="num">${fmtNum(D.top)} m</b>${any.has(x) ? "déjà gravi" : "ouvert"}`;
      return `<li class="${isDone ? "done" : cur ? "cur" : locked ? "locked" : ""}"><span class="node">${isDone ? ascIc("check") : locked ? ascIc("lock") : ""}</span><span class="stop-t">${esc(D.n)}<small>${esc(D.region)}</small></span><span class="stop-r">${right}</span></li>`; }).join("")}</ol>`).join("")}`;
  }
  if(k==="rw"){
    const x = a.wait ? a.next : a.key, t = ASC_TIERS[ASC_TIER_OF(x)], mine = a.summits.slice().reverse();
    return `${mine.length ? `<div class="asc-trophies">${mine.map((s,i)=>`<button class="asc-tr" data-a="ascReplay" data-i="${a.summits.length-1-i}" aria-label="${esc(ASC_DATA[s.key].n)}, atteint le ${fmtDate(s.date)}">${ascMedalSVG(s.key, 56, true)}<b>${esc(ASC_DATA[s.key].n)}</b><small>${fmtDate(s.date)} ${s.date.slice(0,4)}</small></button>`).join("")}</div>` : ""}
      <div class="rw-row"><span class="rw-ic">${ascMedalSVG(x, 44, true)}</span><span><span class="t">À gagner : trophée ${ascDu(x)}</span><span class="s">${t[3]}, gravé de sa vraie silhouette, avec sa carte de sommet à partager</span></span></div>
      <div class="tiers">${Object.values(ASC_TIERS).map(([d, m, l, nm, what])=>`<div class="tier">${ascMedalSVG(null, 38, false, [d, m, l])}<b>${nm}</b>${what}</div>`).join("")}</div>`;
  }
  return `<ul class="asc-rules">
      <li><b>Chaque séance fait monter</b> : effort × régularité × force. Les séries faites exprès faciles comptent moitié, 20 séries au plus.</li>
      <li><b>Une semaine sans séance</b> fait redescendre au camp précédent. Les sommets gagnés restent acquis.</li>
      <li><b>Objectif raté une fois</b> : la série est gelée. Une 2ᵉ fois en 4 semaines, ou une semaine sans séance : un palier de moins.</li>
      <li><b>Pause ou semaine allégée</b> : rien ne se perd (${ASC_PAUSE_MAX} semaines de pause par trimestre).</li>
      <li><b>Les grandes montagnes demandent une série</b> : 4 semaines pour le Titlis, 8 pour l'Eiger et le Cervin, 12 pour le Mont Blanc et le Kilimandjaro, 20 pour l'Aconcagua, le K2 et l'Everest.</li>
      <li><b>La dernière ligne droite</b> (hachurée sur la barre, les 12 derniers %) : pleine vitesse si ta force est à ${Math.round(ASC_FORM_OK*100)} % de ton meilleur niveau, sinon mi-vitesse.</li>
      <li><b>Tout part de ton historique</b> : corriger ou supprimer une séance corrige l'ascension.</li>
    </ul>
    <p class="asc-credit">Montagnes calculées depuis le relief réel (swisstopo swissALTI3D en Suisse, Copernicus GLO-30 ailleurs). Voies d'ascension réelles (© contributeurs OpenStreetMap), refuges à leur place ; en pointillé estompé, les passages cachés derrière un relief.</p>`;
}
const ASC_WK_LABEL = { ok:"objectif tenu", frozen:"objectif raté : série gelée", deload:"semaine allégée", pause:"pause déclarée", empty:"sans séance", cur:"semaine en cours" };
// objectif souvent manqué d'une seule séance : il vaut mieux un objectif tenable qu'une série qui ne démarre jamais
function ascGoalHint(a){
  const g = a.goal, done = a.weeks.filter(w=>w.state!=="cur").slice(-8);
  if(g<2 || done.length<6 || a.tier>=2) return "";
  const short = done.filter(w=>w.state==="frozen" && w.n===g-1).length;
  if(short<4) return "";
  return `<div class="note asc-hint">Tu fais souvent ${nb(g-1, "séance")} par semaine. Avec un objectif de ${g-1}, ta série avancerait et tu monterais plus vite. <button class="link" data-a="openGoals">Changer mon objectif</button></div>`;
}
function ascBodyHTML(a){
  const D = ASC_DATA[a.key], intro = !(S.ascent && S.ascent.intro) && a.summitCount;
  return `${intro ? `<div class="asc-intro">${ascIc("flag")}<span>Ton historique compte déjà : ${nb(a.summitCount, "sommet")} gravi${a.summitCount>1 ? "s" : ""}, jusqu'${ascAu(a.summits[a.summits.length-1].key)}.</span></div>` : ""}
    <section class="asc-scene" id="ascScene" aria-label="${esc(D.n)}, ${fmtNum(a.alt)} mètres">
      <div class="asc-ph">${ascSkySVG(a.key, "asc-ph-svg", true)}</div>
      ${ascHudHTML(a)}
      <div class="asc-toast" role="status" aria-live="polite"></div>
    </section>
    <section class="asc-exp" id="ascExp" aria-label="Avancement de l'expédition">${ascExpHTML(a)}</section>
    ${S.sessions.length ? ascWeekHTML(a) : `<section class="card asc-week"><p class="aw-msg">Chaque séance te fait monter. Ta régularité et ta force décident de la vitesse : commence par ta première séance.</p></section>`}
    ${ascRowsHTML(a)}`;
}
function ascSceneToast(icn, html){
  const t = qs("#ascScene .asc-toast"); if(!t) return;
  t.innerHTML = `<span class="ic">${ascIc(icn)}</span><span>${html}</span>`; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("on"), 3200);
}
function openAscent(){
  const a = ascent();
  openSheet(`<div class="sheet-hd"><span class="t">Mon ascension</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body asc-body">${ascBodyHTML(a)}</div>`, { tall:true, restore:openAscent });
  if(S.ascent && !S.ascent.intro && a.summitCount){ S.ascent.intro = 1; save(); }
  ascMountScene(a);
}
// scène de l'écran : chargée à la demande ; le grimpeur rejoue la montée (ou la descente) depuis la dernière visite
function ascMountScene(a){
  ascLoadScenes().then(()=>{
    const host = qs("#ascScene"); if(!host || !host.isConnected) return;
    const G = ascBuildScene(host, a.key); if(!G) return;
    ascG = G; host.classList.add("ready");
    const seen = (S.ascent && S.ascent.seen) || null, altEl = host.querySelector(".asc-alt");
    const same = seen && seen.key===a.key && seen.lap===a.lap && !seen.wait;
    const from = same ? Math.max(ASC_DATA[a.key].start, Math.min(seen.alt, ASC_DATA[a.key].top)) : a.alt;
    G.set(from, a.wait && !same);
    const remember = ()=>{ S.ascent = S.ascent || { pauses:[] }; S.ascent.seen = { key:a.key, lap:a.lap, alt:a.alt, wait:a.wait }; save(); };
    if(Math.abs(a.alt-from)<1){ G.set(a.alt, a.wait); remember(); return; }
    setTimeout(()=>{
      if(!G.el.isConnected) return;
      const up = a.alt>from, dur = Math.min(2600, 900+Math.abs(a.alt-from)*6);
      sfx(up ? "ascClimb" : "ascDown", dur/1000);
      ascAnimate(G, from, a.alt, dur, c=>ascSceneToast(/^(Camp|Bivouac) \d/.test(c.name) ? "tent" : "hut", `<b>${esc(c.name)}</b> atteint · ${fmtNum(c.real)} m`),
        v=>{ if(altEl) altEl.textContent = fmtNum(v)+" m"; })
        .then(()=>{ G.set(a.alt, a.wait); remember();
          if(!up){ const d = a.descents[a.descents.length-1]; ascSceneToast("tent", d && d.camp ? `Semaine sans séance : retour à <b>${esc(d.camp)}</b>. Les sommets restent acquis.` : "Semaine sans séance : retour au départ. Les sommets restent acquis."); } });
    }, reducedMotion() ? 0 : 450);
  }).catch(()=>{ const host = qs("#ascScene"); if(host) host.classList.add("offline"); });
}
// après une pause : la carte de la semaine, les valeurs des lignes et le détail ouvert se mettent à jour sur place
function ascRefreshSheet(){
  const a = ascent(), wk = qs("#ascWeek"); if(wk) wk.outerHTML = ascWeekHTML(a);
  ASC_SECS.forEach(([k, , , , v])=>{ const r = qs(`.asc-row[data-k="${k}"] .val`); if(r) r.textContent = v(a);
    const b = qs(`#ascSec-${k} .asc-sec`); if(b) b.innerHTML = ascSecBody(k, a); });
}

// ---------- sommet atteint : plein écran ----------
function ascShowSummit(s){
  if(!s) return;
  const D = ASC_DATA[s.key], t = ASC_TIERS[ASC_TIER_OF(s.key)], ni = (ASC_ORDER.indexOf(s.key)+1)%13, nk = ASC_ORDER[ni];
  const gifts = [[ascMedalSVG(s.key, 26, false), `Trophée ${t[3].toLowerCase()} ${ascDu(s.key)}`, "Gravé de sa vraie silhouette"], [ascIc("card"), "Carte de sommet", "À garder ou à partager"],
    [ascIc("flag"), ni===0 ? "Deuxième tour" : `Prochaine expédition : ${ASC_DATA[nk].n}`, ni===0 ? "L'itinéraire recommence, plus exigeant" : `${fmtNum(ASC_DATA[nk].top)} m · ${ASC_DATA[nk].region}${ASC_REQ[nk] ? ` · série de ${ASC_REQ[nk]} sem.` : ""}`]];
  let fl = ""; const rs = ascRng(3);
  for(let i=0;i<34;i++) fl += `<i class="flake" style="left:${(rs()*100).toFixed(1)}%;--dx:${((rs()-.5)*80).toFixed(0)}px;animation-duration:${(5+rs()*6).toFixed(1)}s;animation-delay:-${(rs()*8).toFixed(1)}s;width:${(2+rs()*4).toFixed(1)}px;height:${(2+rs()*4).toFixed(1)}px;opacity:${(.35+rs()*.5).toFixed(2)}"></i>`;
  let el = qs("#ascSummit"); if(el) el.remove();
  el = document.createElement("div"); el.id = "ascSummit"; el.className = "asc-summit"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Sommet ${ascDu(s.key)} atteint`);
  el.innerHTML = `<div class="flakes">${fl}</div>
    <div class="medal-wrap"><div class="rays"></div><div class="medal">${ascMedalSVG(s.key, 176, true)}</div></div>
    <div class="k">Sommet atteint</div><h2>${esc(D.n)} · ${fmtNum(D.top)} m</h2>
    <div class="facts"><b>${nb(s.weeks, "semaine")}</b> · <b>${nb(s.sessions, "séance")}</b> · série de <b>${nb(s.series, "semaine")}</b></div>
    <div class="gifts">${gifts.map(([i, x, y], n)=>`<div class="gift" style="animation-delay:${(.7+n*.12).toFixed(2)}s"><span class="gi">${i}</span><span>${esc(x)}<small>${esc(y)}</small></span></div>`).join("")}</div>
    <button class="btn asc-share" data-a="ascShare" data-i="${S.sessions.length ? ascent().summits.indexOf(s) : -1}">${ascIc("card")} Partager la carte de sommet</button>
    <button class="btn asc-close" data-a="ascSummitClose">Continuer</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("on")));
  sfx("ascSummit"); haptic([30, 60, 30]);
  setTimeout(()=>{ const b = el.querySelector(".asc-close"); if(b) b.focus({ preventScroll:true }); }, 400);
}
// carte de sommet en image (1080 × 1350), partagée par le menu d'iOS ou téléchargée
function ascDrawCard(s){
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"), D = ASC_DATA[s.key], P = ASC_PAL[D.pal].night;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, P.sky[0]); bg.addColorStop(1, P.sky[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const rs = ascRng(11); ctx.fillStyle = "#fff"; for(let i=0;i<90;i++){ ctx.globalAlpha = .25+rs()*.6; ctx.beginPath(); ctx.arc(rs()*W, rs()*H*.5, 1+rs()*2.4, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  // la vraie silhouette, en bas
  const p = ascSky(s.key), k = W/156, y0 = H*.42 - D.sy*k*.55;
  ctx.beginPath(); p.forEach((q,i)=>{ const x = q[0]*k, y = y0 + q[1]*k*.9; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const mg = ctx.createLinearGradient(0, y0+D.sy*k*.9, 0, H); mg.addColorStop(0, "rgb(176,190,216)"); mg.addColorStop(.35, "rgb(60,70,96)"); mg.addColorStop(1, "rgb(20,26,44)"); ctx.fillStyle = mg; ctx.fill();
  const fx = D.sx*k, fy = y0 + D.sy*k*.9; ctx.strokeStyle = "#F4F6FA"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy-120); ctx.stroke();
  ctx.fillStyle = "#FF6B3D"; ctx.beginPath(); ctx.moveTo(fx, fy-120); ctx.lineTo(fx+74, fy-120); ctx.lineTo(fx+56, fy-98); ctx.lineTo(fx+74, fy-76); ctx.lineTo(fx, fy-76); ctx.closePath(); ctx.fill();
  // textes
  const X = 84, white = "#FFFFFF", mute = "rgba(255,255,255,.7)";
  ctx.save(); ctx.translate(X-2, 86); ctx.scale(.62, .62); ctx.translate(0, -5); ctx.lineWidth = 6.5; ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = white; ctx.stroke(new Path2D(ASCEN_LETTERS)); ctx.strokeStyle = "#FF6B3D"; ctx.stroke(new Path2D(ASCEN_BAR)); ctx.restore();
  ctx.fillStyle = "#FFB48F"; ctx.font = recapFont(700, 30, true); ctx.fillText("SOMMET ATTEINT", X, 210);
  ctx.fillStyle = white; ctx.font = recapFont(700, 96, true); ctx.fillText(recapFit(ctx, D.n, W-2*X), X, 310);
  ctx.font = recapFont(700, 72); ctx.fillText(`${fmtNum(D.top)} m`, X, 392);
  ctx.fillStyle = mute; ctx.font = recapFont(500, 34, true);
  const who = (S.settings.name||"").trim().split(" ")[0];
  ctx.fillText(recapFit(ctx, `${who ? who+", le " : "Le "}${fmtDate(s.date)} ${s.date.slice(0,4)} · ${D.region}`, W-2*X), X, 448);
  ctx.fillStyle = white; ctx.font = recapFont(700, 40, true);
  ctx.fillText(`${nb(s.weeks, "semaine")} · ${nb(s.sessions, "séance")} · série de ${s.series}`, X, H-96);
  return cv;
}

// ---------- fin de séance : le gain d'altitude (remplace l'XP) ----------
function ascCelHTML(sessionId){
  const a = ascent(), e = a.log[sessionId]; if(!e) return "";
  const D = ASC_DATA[e.key], k0 = e.started ? e.started : e.key, D0 = ASC_DATA[k0];
  const pFrom = Math.max(0, Math.min(1, (e.from-D0.start)/(D0.top-D0.start))), pTo = Math.max(0, Math.min(1, (e.to-D0.start)/(D0.top-D0.start)));
  if(e.waiting) return `<div class="cel-asc wait"><div class="ca-hd">${ascIc("peak")}<span>Au sommet ${ascDu(e.key)}</span></div>
    <div class="ca-sub">Une série de ${nb(ASC_REQ[a.next], "semaine")} ouvre ${ascLe(a.next)} (tu en as ${a.series}). Cette séance la fait avancer.</div></div>`;
  return `<button class="cel-asc" data-a="ascFromCel">
    <div class="ca-hd">${ascIc("peak")}<span>${e.started ? `Nouvelle expédition : ${esc(D.n)}` : esc(D.n)}</span><b class="num" data-count="${Math.round(e.gain)}" data-unit="m" data-thin="1" data-pre="+">+${ascM(e.gain)}</b></div>
    <div class="xpbar"><span id="celAsc" style="width:${(pFrom*100).toFixed(1)}%" data-to="${(pTo*100).toFixed(1)}"></span></div>
    <div class="ca-sub">${e.summit ? `<b>Sommet atteint !</b> ${fmtNum(D.top)} m` : `${fmtNum(e.to)} m sur ${fmtNum(D.top)} m`} · régularité ${ascX(e.mul)} · force ${ascX(Math.round(e.force*100)/100)}</div>
    ${e.camps.length ? `<div class="ca-camps">${e.camps.map(c=>`<span class="ca-chip">${ascIc(/^(Camp|Bivouac) \d/.test(c) ? "tent" : "hut")} ${esc(c)}</span>`).join("")}</div>` : ""}
  </button>`;
}
function ascCelAnimate(){
  const bar = qs("#celAsc"); if(bar) bar.style.width = bar.dataset.to+"%";
}
function ascCelSummit(sessionId){ const a = ascent(), e = a.log[sessionId]; return e && e.summit ? a.summits.find(s=>s.date===e.date && s.key===e.summit) : null; }

// ---------- semaine sans séance : prévenir une fois ----------
function ascDescentNotice(){
  if(!S.sessions.length) return;
  const a = ascent(), d = a.descents[a.descents.length-1]; if(!d) return;
  S.ascent = S.ascent || { pauses:[] };
  if(S.ascent.descSeen && S.ascent.descSeen>=d.w) return;
  S.ascent.descSeen = d.w; save();
  if(daysBetween(d.w, todayISO())>21) return; // vieux souvenir : pas de message
  toast(d.camp ? `Semaine sans séance : retour à ${d.camp} (${fmtNum(d.real)} m). Ta prochaine séance te remet en route.` : "Semaine sans séance : retour au départ de l'expédition. Ta prochaine séance te remet en route.", "repeat");
}

Object.assign(ACT, {
  openAscent(){ ascOpen = new Set(); openAscent(); },
  ascSec(d, el){
    const k = d.k, on = !ascOpen.has(k), box = qs("#ascSec-"+k); if(!box) return;
    on ? ascOpen.add(k) : ascOpen.delete(k);
    el.classList.toggle("on", on); el.setAttribute("aria-expanded", on);
    animateCollapse(box, on, on ? `<div class="asc-sec">${ascSecBody(k, ascent())}</div>` : "");
  },
  ascFromCel(){ closeSheet(); setTimeout(openAscent, 320); },
  ascPause(d){
    if(!ascTogglePause(d.w)) return toast(`Déjà ${ASC_PAUSE_MAX} semaines de pause ce trimestre`);
    const on = ascPauses().includes(d.w);
    save(); ascRefreshSheet(); sfx("toggle", on);
    toast(on ? (d.w===weekKey(todayISO()) ? "Semaine en pause : rien ne se perd" : "Semaine prochaine en pause") : "Pause annulée", on ? "check" : "undo");
  },
  ascReplay(d){ const s = ascent().summits[+d.i]; if(s) ascShowSummit(s); },
  ascSummitClose(){ const el = qs("#ascSummit"); if(!el) return; el.classList.remove("on"); setTimeout(()=>el.remove(), 450); },
  ascCelSummit(d){ closeSheet(); const s = ascCelSummit(d.id); if(s) setTimeout(()=>ascShowSummit(s), 320); },
  async ascShare(d){
    const a = ascent(), s = a.summits[+d.i] || a.summits[a.summits.length-1]; if(!s) return;
    const cv = ascDrawCard(s), blob = await new Promise(r=>cv.toBlob(r, "image/png"));
    if(!blob) return toast("Impossible de créer l'image");
    const ok = await shareOrDownload(blob, `ascen-sommet-${s.key}.png`, "image/png", `Sommet ${ascDu(s.key)}`);
    if(ok && !(navigator.canShare)) toast("Image enregistrée");
  },
});
// le thème change : la scène passe du jour à la nuit
try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{ const h = qs("#ascScene"); if(h && ascG){ const a = ascent(); const G = ascBuildScene(h, a.key); if(G){ ascG = G; G.set(a.alt, a.wait); } } }); }catch(e){}
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && qs("#ascSummit")) ACT.ascSummitClose(); });
