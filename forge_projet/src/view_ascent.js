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
  const D = ASC_DATA[k], mode = ascDark() ? "night" : "day", night = mode==="night", P = ASC_PAL[D.pal][mode], W = sc.W, H = sc.H, VH = Math.min(H, D.vh || H), r = ascRng(ASC_ORDER.indexOf(k)+7);
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
  // vue recadrée sous le point le plus bas de la voie (D.vh) : moins de premier plan vide, la carte des étapes remonte
  const svg = `<svg class="asc-svg" viewBox="0 0 ${W} ${VH}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
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
    <g class="asc-sel"></g><g class="asc-next"></g></svg>`;
  const old = host.querySelector(".asc-svg"); if(old) old.remove();
  host.insertAdjacentHTML("afterbegin", svg);
  const el = host.querySelector(".asc-svg"), rt = { pts, len }, total = len[len.length-1];
  const G = { k, rt, total, el, done:el.querySelector(".asc-done"), me:el.querySelector(".asc-me"), flag:el.querySelector(".asc-flag"), next:el.querySelector(".asc-next"), sel:el.querySelector(".asc-sel"), camps:[], night, W };
  const cg = el.querySelector(".asc-camps");
  // camps : refuges en icône, étapes en petits jalons ; le prochain a un halo qui pulse (dans .asc-next)
  ascCamps(k).forEach(([a, name, real], i)=>{
    const p = ascRouteAt(rt, a), hut = !ASC_GENERIC(k, name);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("transform", `translate(${ascP1(p.x)} ${ascP1(p.y)})`);
    if(p.h===2) g.style.display = "none"; else if(p.h===1) g.style.opacity = ".55";
    g.innerHTML = `<g class="asc-camp ${hut ? "hut" : "pin"}">${hut ? `<path d="M-12 0v-13l12-10 12 10V0Z" stroke-width="2.6"/><rect x="-3.2" y="-8" width="6.4" height="8" fill="rgba(0,0,0,.45)" stroke="none"/>` : `<circle r="7.5" stroke-width="3"/>`}</g>`;
    cg.appendChild(g); G.camps.push({ a, name, real, i, hut, h:p.h, inner:g.firstChild, x:p.x, y:hut ? p.y-11 : p.y });
  });
  G.done.style.strokeDasharray = `0 ${total+20}`;
  G.summit = { x:sc.summit[0], y:sc.summit[1]-20 };
  G.set = (alt, summited)=>{
    const D2 = ASC_DATA[k], a = Math.min(D2.top, Math.max(D2.start, alt)), p = ascRouteAt(rt, a);
    G.alt = a; G.summited = summited; G.meXY = { x:p.x, y:p.y };
    G.done.style.strokeDasharray = `${ascP1(p.L)} ${ascP1(total+20)}`;
    G.me.setAttribute("transform", `translate(${ascP1(p.x)} ${ascP1(p.y)})`); G.me.style.opacity = p.h && !summited ? ".55" : "1";
    const pastN = G.camps.filter(c=>c.a<=a+.5).length;
    if(pastN!==G.pastN){ G.pastN = pastN;
      G.camps.forEach((c, i)=>{ const past = i<pastN;
        c.inner.setAttribute("fill", past ? "#FF6B3D" : (night ? "rgba(17,23,38,.88)" : "rgba(255,255,255,.95)"));
        c.inner.setAttribute("stroke", past ? "#fff" : (night ? "rgba(255,255,255,.75)" : "rgba(15,27,40,.6)")); }); }
    const nx = summited ? null : G.camps.find(c=>c.a>a+.5 && c.h!==2);
    if(nx && nx!==G.nx){
      const tx = `${nx.name} · ${fmtNum(nx.real)} m`, w = tx.length*11.2+30, left = nx.x+w+30>W-10, lx = left ? nx.x-w-22 : nx.x+22;
      G.next.innerHTML = `<g transform="translate(${ascP1(nx.x)} ${ascP1(nx.y)})"><circle class="asc-halo" r="16" fill="none" stroke="#FF6B3D" stroke-width="4"/><circle class="asc-halo h2" r="16" fill="none" stroke="#FF6B3D" stroke-width="3"/></g>
        <g class="asc-pillg" transform="translate(${ascP1(Math.max(6, lx))} ${ascP1(Math.max(6, nx.y-46))})"><rect width="${ascP1(w)}" height="38" rx="19" fill="${night ? "rgba(17,23,38,.86)" : "rgba(255,255,255,.92)"}"/><text x="${ascP1(w/2)}" y="25.5" text-anchor="middle" font-size="21" font-weight="600" font-family="-apple-system,BlinkMacSystemFont,sans-serif" fill="${night ? "#F2F4F8" : "#13202A"}">${esc(tx)}</text></g>`;
    } else if(!nx) G.next.innerHTML = "";
    G.nx = nx;
    G.flag.style.opacity = summited ? 1 : .45; G.flag.querySelector(".asc-cloth").style.animationPlayState = summited ? "running" : "paused";
  };
  // toucher la montagne : le camp (ou le sommet, ou soi) le plus proche ouvre sa bulle
  el.addEventListener("click", e=>{
    const m = el.getScreenCTM(); if(!m) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const cands = G.camps.filter(c=>c.h!==2).map(c=>({ kind:"camp", c, x:c.x, y:c.y }))
      .concat([{ kind:"summit", x:G.summit.x, y:G.summit.y }, { kind:"me", x:G.meXY ? G.meXY.x : -999, y:G.meXY ? G.meXY.y : -999 }]);
    let best = null; cands.forEach(o=>{ const d = Math.hypot(o.x-pt.x, o.y-pt.y); if(d<52 && (!best || d<best.d)) best = Object.assign({ d }, o); });
    if(best){ e.stopPropagation(); ascBubble(best); } else ascBubbleHide();
  });
  return G;
}
// éclat quand un camp est franchi : anneau qui s'ouvre et étincelles (animé image par image, sans CSS dans le SVG)
function ascBurst(G, c){
  if(!G || reducedMotion()) return;
  const ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
  g.setAttribute("transform", `translate(${ascP1(c.x)} ${ascP1(c.y)})`); g.setAttribute("pointer-events", "none");
  const ring = document.createElementNS(ns, "circle"); ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "#FFB36B"); g.appendChild(ring);
  const dots = Array.from({ length:10 }, (_, i)=>{ const d = document.createElementNS(ns, "circle"); d.setAttribute("fill", i%2 ? "#FF6B3D" : "#FFE2B8"); g.appendChild(d); return { d, a:i/10*Math.PI*2 + .3 }; });
  G.el.querySelector(".asc-camps").after(g);
  const t0 = performance.now(), dur = 900;
  const f = now=>{ const t = Math.min(1, (now-t0)/dur), e = 1-Math.pow(1-t, 3);
    ring.setAttribute("r", (10 + 46*e).toFixed(1)); ring.setAttribute("stroke-width", (6*(1-t)+.5).toFixed(1)); ring.setAttribute("opacity", (1-t).toFixed(2));
    dots.forEach(o=>{ o.d.setAttribute("cx", (Math.cos(o.a)*58*e).toFixed(1)); o.d.setAttribute("cy", (Math.sin(o.a)*58*e).toFixed(1)); o.d.setAttribute("r", (5*(1-t)+.5).toFixed(1)); o.d.setAttribute("opacity", (1-t*t).toFixed(2)); });
    if(t<1 && g.isConnected) requestAnimationFrame(f); else g.remove(); };
  requestAnimationFrame(f);
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
      if(to>from) G.camps.forEach(c=>{ if(c.a>prev && c.a<=a && !crossed.has(c.i)){ crossed.add(c.i); c.inner.classList.remove("pop"); void c.inner.getBBox(); c.inner.classList.add("pop"); ascBurst(G, c); sfx("ascCamp"); haptic(12); if(onCamp) onCamp(c); } });
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
  ascCampBig(){ [NT.G5, NT.C6, NT.E6, NT.G6].forEach((f,i)=>bell(f, i*.075, 1.2, .09)); tone(NT.C5, 0, 1.1, { gain:.05, type:"triangle", wet:1 }); tone(NT.G5, .05, 1, { gain:.035, type:"triangle", wet:1 }); bell(NT.C7, .36, 1.5, .07); },
  ascDown(){ [659.25, 587.33, 523.25, 440].forEach((f,i)=>tone(f, i*.11, .28, { gain:.07, type:"triangle" })); },
  ascSummit(){ [NT.C5, NT.E5, NT.G5].forEach((f,i)=>tone(f, i*.09, 2, { gain:.07, type:"triangle", wet:1 })); [NT.C6, NT.E6, NT.G6, NT.C7].forEach((f,i)=>bell(f, .35+i*.11, 1.4, .09)); },
  // le drapeau se plante : un choc sourd, un souffle, puis l'accord du sommet
  ascPlant(){ tone(150, 0, .26, { gain:.18, to:60, att:.002 }); tok(0, 115, 1); whoosh(.03, .5, 500, 2800, .05); SFX.ascSummit(); },
});

// ---------- textes ----------
function ascWhereTxt(a){ // une ligne : où l'on en est
  const D = ASC_DATA[a.key];
  if(!S.sessions.length) return `Ta première séance te met en route vers ${ascLe(a.key)}.`;
  if(a.wait){ const N = ASC_DATA[a.next];
    return a.series>=a.nextReq ? `Au sommet ${ascDu(a.key)}. Ta prochaine séance te lance vers ${ascLe(a.next)}.`
      : `Au sommet ${ascDu(a.key)}. Une série de ${nb(a.nextReq, "semaine")} ouvre ${ascLe(a.next)} (tu en as ${a.series}).`; }
  const nc = a.nextCamp;
  const m = nc ? nc[0]-a.alt : D.top-a.alt, s = ascSessionsFor(m, a);
  return `${nc ? nc[1] : "Sommet"} dans ${ascM(m)} : ${s<=1 ? "ta prochaine séance t'y amène" : `environ ${nb(s, "séance")}`}.`;
}
// La promesse du jour (accueil, « Prochain cap ») : ce que la séance d'aujourd'hui peut faire atteindre.
// Null si rien n'est à portée d'une séance type.
function ascTodayPromise(a){
  a = a || ascent();
  if(a.wait) return a.series>=a.nextReq ? { t:`Aujourd'hui commence ta prochaine expédition : ${ASC_DATA[a.next].n}`, pct:1 } : null;
  const D = ASC_DATA[a.key], nc = a.nextCamp, target = nc ? nc[0] : D.top, back = a.comeback ? ASC_BACK : 1;
  if(ascSessionsFor((target - a.alt)/back, a)>1) return null;
  const c0 = nc ? (a.camps[a.passed-1] || [a.start])[0] : (a.camps[a.camps.length-1] || [a.start])[0];
  return { t:nc ? `Aujourd'hui, ${nc[1]} est à ta portée` : `Aujourd'hui, le sommet ${ascDu(a.key)} est à ta portée`, pct:Math.max(0, Math.min(1, (a.alt-c0)/Math.max(1, target-c0))), summit:!nc };
}
// délai estimé : séances au rythme de montée actuel, durée au rythme des 4 dernières semaines
function ascEta(m, a){
  const s = ascSessionsFor(m, a), w = s/Math.max(.5, a.perWeek || a.goal);
  if(s<=1) return { s, txt:"à ta prochaine séance", time:"" };
  const time = w<1 ? "en quelques jours" : w<8.5 ? `≈ ${nb(Math.round(w), "semaine")}` : w<78 ? `≈ ${Math.round(w/4.35)} mois` : `≈ ${fmtDec(Math.round(w/26)/2)} ans`;
  return { s, txt:`≈ ${nb(s, "séance")}`, time };
}
const ascEtaTxt = (m, a)=>{ const e = ascEta(m, a); return e.time ? `${e.txt} · ${e.time}` : e.txt; };
// date d'arrivée au sommet de l'expédition en cours (en attente de la suivante)
function ascSummitDate(a){ const s = a.summits[a.summits.length-1]; return a.wait && s && s.key===a.key ? s.date : null; }

// ---------- bulle d'un camp : toucher la montagne (ou une étape de la liste) ----------
let ascBubOn = null;
function ascBubbleHTML(o, a){
  const D = ASC_DATA[a.key], camps = ascCamps(a.key), alt = a.wait ? D.top : a.alt, ni = a.wait ? -1 : camps.findIndex(c=>c[0]>alt+.5);
  const ahead = (m, next)=>`<div class="ab-s ${next ? "next" : ""}">${next ? `<b>Prochaine étape</b> · ` : ""}dans <b class="num">${ascM(m)}</b></div><div class="ab-e">${esc(ascEtaTxt(m, a))}</div>`;
  if(o.kind==="me"){
    const L = a.last && a.last.key===a.key && a.last.gain>0 ? a.last : null;
    return { cls:"me", html:`<div class="ab-k">Tu es ici</div><div class="ab-n"><span>${esc(D.n)}</span><b class="num">${fmtNum(alt)} m</b></div>
      <div class="ab-s">${a.wait ? "Sommet atteint" : `${nb(a.passed, "étape")} sur ${camps.length} franchie${a.passed>1 ? "s" : ""}`}${L ? ` · <b class="num">+${ascM(L.gain)}</b> à ta dernière séance` : ""}</div>` };
  }
  if(o.kind==="summit"){
    const d = ascSummitDate(a);
    return { cls:"summit"+(a.wait ? " past" : ""), html:`<div class="ab-k">Sommet · ${esc(D.region)}</div><div class="ab-n"><span>${esc(D.n)}</span><b class="num">${fmtNum(D.top)} m</b></div>
      ${a.wait ? `<div class="ab-s ok">${ascIc("check")}Atteint${d ? ` le ${fmtDate(d)}` : ""}</div>${ASC_TOPS[a.key] ? `<div class="ab-q">${esc(ASC_TOPS[a.key])}</div>` : ""}` : ahead(D.top-alt, false)}` };
  }
  const i = o.c.i, c = camps[i], past = c[0]<=alt+.5, d = a.campDates[c[1]], st = ascStory(a.key)[i];
  return { cls:past ? "past" : i===ni ? "next" : "", html:`<div class="ab-k">Étape ${i+1} sur ${camps.length} · ${esc(st.t)}</div>
    <div class="ab-n"><span>${esc(c[1])}</span><b class="num">${fmtNum(c[2])} m</b></div>
    ${past ? `<div class="ab-s ok">${ascIc("check")}Atteint${d ? ` le ${fmtDate(d)}` : ""}</div><div class="ab-q">${esc(st.q)}</div>` : ahead(c[0]-alt, i===ni)}` };
}
// o : { kind:"camp", c } | { kind:"summit" } | { kind:"me" } ; ancrée au point de la scène (SVG → écran → scène)
function ascBubble(o){
  const host = qs("#ascScene"); if(!host) return;
  const a = ascent(), G = ascG && ascG.el.isConnected ? ascG : null, b0 = host.querySelector(".asc-bub");
  if(b0) b0.remove();
  const { cls, html } = ascBubbleHTML(o, a);
  const b = document.createElement("div"); b.className = "asc-bub "+cls; b.setAttribute("role", "status");
  b.innerHTML = html+`<i class="ab-arrow"></i>`;
  host.appendChild(b);
  const R = host.getBoundingClientRect(), bw = b.offsetWidth, bh = b.offsetHeight;
  let pt = null;
  if(G){ const p = o.kind==="camp" ? o.c : o.kind==="summit" ? G.summit : G.meXY, m = G.el.getScreenCTM();
    if(p && m && !(o.kind==="camp" && o.c.h===2)){ const s = new DOMPoint(p.x, p.y).matrixTransform(m); pt = { x:s.x-R.left, y:s.y-R.top }; } }
  let left, top, below = false;
  if(pt && pt.x>-4 && pt.x<R.width+4 && pt.y>0 && pt.y<R.height){
    left = Math.max(10, Math.min(R.width-bw-10, pt.x-bw/2)); top = pt.y-bh-18;
    if(top<10){ top = pt.y+18; below = true; }
    b.style.setProperty("--ax", Math.max(18, Math.min(bw-18, pt.x-left))+"px");
  } else { left = (R.width-bw)/2; top = R.height*.42-bh/2; b.classList.add("free"); }
  b.classList.toggle("below", below); b.style.left = left+"px"; b.style.top = Math.max(10, top)+"px";
  b.addEventListener("click", e=>{ e.stopPropagation(); ascBubbleHide(); });
  requestAnimationFrame(()=>b.classList.add("on"));
  // l'étape choisie est cerclée sur la montagne, l'étiquette du prochain camp s'efface
  if(G){
    G.el.classList.add("bub");
    const p = o.kind==="camp" && o.c.h!==2 ? o.c : o.kind==="summit" ? { x:G.summit.x, y:G.summit.y+20 } : null;
    G.sel.innerHTML = p ? `<g transform="translate(${ascP1(p.x)} ${ascP1(p.y)})"><circle class="asc-selc" r="19" fill="none" stroke="#fff" stroke-width="3.5"/></g>` : "";
  }
  ascBubOn = o; sfx("tick"); haptic(8);
}
function ascBubbleHide(){
  const b = qs("#ascScene .asc-bub"); if(!ascBubOn && !b) return;
  ascBubOn = null;
  if(b){ b.classList.remove("on"); setTimeout(()=>b.remove(), 200); }
  if(ascG){ ascG.el.classList.remove("bub"); ascG.sel.innerHTML = ""; }
}
// toucher ailleurs que sur la scène referme la bulle
document.addEventListener("pointerdown", e=>{ if(ascBubOn && !(e.target.closest && e.target.closest("#ascScene, [data-a='ascCamp']"))) ascBubbleHide(); }, { passive:true, capture:true });

// ---------- carnet de route : une carte postale par camp atteint (et par sommet) ----------
// Les cartes viennent de l'historique (le journal du moteur) : rien n'est enregistré à part. Une carte gagnée
// le reste, même après une descente ou au 2ᵉ tour (on garde la date de la première fois).
function ascCards(a){
  if(a._cards) return a._cards;
  const seen = new Set(), list = [];
  for(const e of Object.values(a.log)){
    const camps = ascCamps(e.key), add = (k, i)=>{ const id = k+"|"+i; if(seen.has(id)) return; seen.add(id); list.push({ k, i, date:e.date, sid:e.id }); };
    e.camps.forEach(nm=>{ const i = camps.findIndex(c=>c[1]===nm); if(i>=0) add(e.key, i); });
    if(e.summit) add(e.summit, -1);
  }
  return a._cards = list.sort((x, y)=>x.date<y.date ? -1 : x.date>y.date ? 1 : 0);
}
// le dessin : couleurs fixes, comme une carte imprimée (même rendu de jour et de nuit), tiré au sort une fois pour
// toutes par camp ; la montagne grandit à mesure qu'on s'en approche
const ASC_ART = {
  pre:{ sky:["#8EC6EA","#EAF3E6"], far:"#A9B9CB", mid:"#86AE6C", fg:"#5F8C4C" },
  roc:{ sky:["#94BFE3","#EEF0EB"], far:"#AEB8C4", mid:"#A69D90", fg:"#80766B" },
  mor:{ sky:["#88B9E2","#EBF2F6"], far:"#BAC7D4", mid:"#C3CAD0", fg:"#99A2AA" },
  nev:{ sky:["#6EA4DA","#EEF5FB"], far:"#C2D1E2", mid:"#F4F7FB", fg:"#D6E1EC" },
  are:{ sky:["#35508F","#F3B78B"], far:"#6E7898", mid:"#A9B3C6", fg:"#E6EBF2" },
  des:{ sky:["#7EB2DF","#F1E4C8"], far:"#BCAB93", mid:"#B19774", fg:"#8D7558" },
  cen:{ sky:["#5C8FD0","#EADCC6"], far:"#A99F98", mid:"#7E7068", fg:"#5E524C" },
  high:{ sky:["#0D1A44","#5372B4"], far:"#8C9CC0", mid:"#C9D3E6", fg:"#EEF2F8" },
  top:{ sky:["#2B3F7A","#F6C08F"], far:"#F6ECE2", mid:"#B4BFD6", fg:"#93A0BD" },
  lock:{ sky:["#D5DAE1","#EEF0F3"], far:"#C3C9D2", mid:"#D2D7DE", fg:"#C0C6CF" },
};
let ascPcN = 0;
function ascPcArt(k, i, locked){
  const top = i<0, kind = locked ? "lock" : top ? "top" : ascStory(k)[i].art, A = ASC_ART[kind], D = ASC_DATA[k], P = ascP1;
  let h = 9; for(const ch of k) h = (h*31 + ch.charCodeAt(0))>>>0;
  const rs = ascRng(h + (i+2)*7919), id = "pc"+(++ascPcN), rnd = (a, b)=>a + rs()*(b-a);
  const rel = top ? 1 : Math.max(0, Math.min(1, (ascCamps(k)[i][0]-D.start)/(D.top-D.start)));
  const sc = top ? 1.05 : .72 + .38*rel, sx = top ? 80 : rnd(64, 96), sy = top ? 26 : 20, sk = ascSky(k);
  const far = sk.map(([x, y])=>`${P(sx + (x-D.sx)*sc)} ${P(sy + (y-D.sy)*sc)}`);
  const midY = kind==="are" || kind==="high" || kind==="top" ? 70 : 63, ys = [-6, 22, 50, 80, 110, 138, 166].map(x=>[x, midY + rnd(-6, 6)]);
  const f0 = rnd(80, 86), f1 = rnd(76, 84), f2 = rnd(80, 88), fy = x=>x<80 ? f0 + (f1-f0)*x/80 : f1 + (f2-f1)*(x-80)/80;
  let deco = "", sky = "";
  if(kind==="high") for(let n=0;n<16;n++) sky += `<circle cx="${P(rnd(2, 158))}" cy="${P(rnd(2, 34))}" r="${P(rnd(.35, .9))}" fill="#fff" opacity="${P(rnd(.4, .95))}"/>`;
  else if(kind==="are" || kind==="top") sky += `<circle cx="${P(top ? sx : rnd(22, 100))}" cy="${top ? 34 : 48}" r="${top ? 30 : 15}" fill="url(#${id}g)"/>`;
  else if(kind!=="lock") sky += `<circle cx="${P(rnd(14, 54))}" cy="${P(rnd(12, 20))}" r="6.5" fill="#FFF6DA" opacity=".95"/>`;   // à gauche : le cachet est à droite
  if(kind==="pre") for(let n=0, m = 3 + Math.floor(rs()*4); n<m; n++){ const x = rnd(4, 156), y = midY + rnd(1, 9), s = rnd(3, 5.5);
    deco += `<path d="M${P(x)} ${P(y-s*2.4)}L${P(x+s)} ${P(y)}H${P(x-s)}Z" fill="#3E6A3C"/>`; }
  if(kind==="roc" || kind==="des" || kind==="cen") for(let n=0, m = 4 + Math.floor(rs()*4); n<m; n++){ const x = rnd(4, 156), y = fy(x) + rnd(4, 14), s = rnd(1.6, 3.6);
    deco += `<path d="M${P(x-s)} ${P(y)}L${P(x-s*.4)} ${P(y-s)}L${P(x+s*.6)} ${P(y-s*.8)}L${P(x+s)} ${P(y)}Z" fill="#000" opacity=".16"/>`; }
  if(kind==="mor") deco += `<ellipse cx="${P(rnd(40, 120))}" cy="${P(midY + 7)}" rx="${P(rnd(14, 22))}" ry="2.6" fill="#5CC3C8"/>`;
  if(kind==="nev" || kind==="high") for(let n=0;n<3;n++){ const x = rnd(10, 140), y = fy(x) + rnd(5, 13);
    deco += `<path d="M${P(x)} ${P(y)}l${P(rnd(6, 12))} ${P(rnd(-1, 1))}" stroke="#9DB7D4" stroke-width="1.1" stroke-linecap="round"/>`; }
  if(kind==="are" || kind==="top") deco += `<path d="M-4 ${midY+3}q20 -3 40 0t40 0 40 0 40 0V${midY+7}H-4Z" fill="#fff" opacity=".55"/>`;
  // le camp : tente (ou refuge pour un lieu réel), le drapeau pour le sommet
  let glyph = "";
  if(top) glyph = `<g transform="translate(${P(sx)} ${sy})"><path d="M0 0V-13" stroke="#F7F4EE" stroke-width="1.3" stroke-linecap="round"/><path d="M0 -13h9l-2.2 2.6L9 -7.8H0Z" fill="#FF6B3D"/></g>`;
  else if(!locked){ const x = rs()<.5 ? rnd(20, 50) : rnd(110, 140), y = fy(x) + 3;
    glyph = ascStory(k)[i].real ? `<path d="M${P(x-7)} ${P(y)}V${P(y-6)}L${P(x)} ${P(y-11.5)}L${P(x+7)} ${P(y-6)}V${P(y)}Z" fill="#C2703F"/><path d="M${P(x-8.5)} ${P(y-5.2)}L${P(x)} ${P(y-12.6)}L${P(x+8.5)} ${P(y-5.2)}" fill="none" stroke="#6B3A22" stroke-width="1.8" stroke-linejoin="round"/><rect x="${P(x-1.6)}" y="${P(y-4.6)}" width="3.2" height="4.6" fill="#4A2A18"/>`
      : `<path d="M${P(x-7.5)} ${P(y)}L${P(x)} ${P(y-11)}L${P(x+7.5)} ${P(y)}Z" fill="#FF6B3D"/><path d="M${P(x)} ${P(y-11)}L${P(x-2.2)} ${P(y)}H${P(x+2.2)}Z" fill="#9E3412"/>`; }
  return `<svg class="pc-svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${A.sky[0]}"/><stop offset="1" stop-color="${A.sky[1]}"/></linearGradient>
      <radialGradient id="${id}g"><stop offset="0" stop-color="#FFE9C2"/><stop offset=".45" stop-color="#FFC98A" stop-opacity=".85"/><stop offset="1" stop-color="#FFB070" stop-opacity="0"/></radialGradient></defs>
    <rect width="160" height="100" fill="url(#${id}s)"/>${sky}
    <path d="M-12 ${far[0].split(" ")[1]}L${far.join("L")}L172 ${far[far.length-1].split(" ")[1]}V100H-12Z" fill="${A.far}"/>
    <path d="M${ys.map(p=>P(p[0])+" "+P(p[1])).join("L")}V100H-6Z" fill="${A.mid}"/>
    <path d="M-6 ${P(f0)}Q40 ${P(f0-6)} 80 ${P(f1)}T166 ${P(f2)}V100H-6Z" fill="${A.fg}"/>${deco}${glyph}</svg>`;
}
// une carte : o.date (gagnée ce jour-là), o.locked (la prochaine, à découvrir), o.big, o.btn (ouvrir en grand)
function ascPostcardHTML(k, i, o){
  o = o || {};
  const D = ASC_DATA[k], top = i<0, c = top ? null : ascCamps(k)[i], st = top ? null : ascStory(k)[i], lock = !!o.locked;
  const name = top ? D.n : c[1], alt = top ? D.top : c[2];
  const sub = lock ? (top ? "Sommet · à découvrir" : `Étape ${i+1} · à découvrir`) : top ? `Sommet · ${D.region}` : `${st.t} · ${D.n}`;
  const q = lock ? "" : top ? ASC_TOPS[k] || "" : st.q, tag = o.btn ? "button" : "span";
  return `<${tag} class="pc${o.big ? " big" : ""}${lock ? " locked" : ""}${top ? " top" : ""}${st && st.real ? " real" : ""}"${o.btn ? ` data-a="ascCard" data-k="${k}" data-i="${i}" aria-label="Carte postale : ${esc(name)}, ${fmtNum(alt)} mètres"` : ""}>
    <span class="pc-art">${ascPcArt(k, i, lock)}${o.date && !lock ? `<span class="pc-pm" aria-hidden="true"><b>${esc(fmtDate(o.date))}</b><i>${o.date.slice(0, 4)}</i></span>` : ""}${lock ? `<span class="pc-lock">${ascIc("lock")}</span>` : ""}</span>
    <span class="pc-b"><span class="pc-n"><b>${esc(name)}</b><span class="num">${fmtNum(alt)} m</span></span><span class="pc-l">${esc(sub)}</span>${q ? `<span class="pc-q">${esc(q)}</span>` : ""}</span>
  </${tag}>`;
}
// le carnet (une ligne repliable de l'écran) : la montagne en cours d'abord, avec la prochaine carte à découvrir ;
// les deux plus récentes dépliées, les plus anciennes se déplient au toucher (des années de cartes restent légères)
let ascCarnetOpen = new Set();
function ascCarnetRow(a, k){
  const L = ascCards(a).filter(c=>c.k===k).sort((x, y)=>(x.i<0 ? 1e3 : x.i) - (y.i<0 ? 1e3 : y.i));
  const nx = k===a.key && !a.wait ? (a.nextCamp ? ascCamps(k).indexOf(a.nextCamp) : -1) : null, lock = nx!=null && !L.some(c=>c.i===nx);
  return `<div class="pc-row">${L.map(c=>ascPostcardHTML(k, c.i, { date:c.date, btn:true })).join("")}${lock ? ascPostcardHTML(k, nx, { locked:true }) : ""}</div>`;
}
function ascCarnetHTML(a){
  const cards = ascCards(a), last = {}, n = {}, cur = a.wait ? null : a.key;
  cards.forEach(c=>{ last[c.k] = c.date; n[c.k] = (n[c.k] || 0) + 1; });
  const keys = Object.keys(last).sort((x, y)=>last[x]<last[y] ? 1 : last[x]>last[y] ? -1 : 0).filter(k=>k!==cur);
  if(cur) keys.unshift(cur);
  return `<p class="sub">Une carte à chaque camp atteint : le terrain, une ligne du carnet, et l'histoire des lieux réels.</p>
    ${keys.map((k, gi)=>{
      const N = ascCamps(k).length + 1, cnt = `<span class="num">${n[k] || 0}/${N}</span>`, open = gi<2 || ascCarnetOpen.has(k);
      if(gi<2) return `<div class="pc-grp"><div class="pc-gh"><b>${esc(ASC_DATA[k].n)}</b>${cnt}</div>${ascCarnetRow(a, k)}</div>`;
      return `<div class="pc-grp"><button class="pc-gh tap${open ? " on" : ""}" data-a="ascCarnetGrp" data-k="${k}" aria-expanded="${open}"><b>${esc(ASC_DATA[k].n)}</b>${cnt}<span class="chev">${icon("chev")}</span></button>
        <div class="clp" id="ascCg-${k}">${open ? ascCarnetRow(a, k) : ""}</div></div>`;
    }).join("")}`;
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
// ---------- les étapes : barre de l'expédition, prochain camp mis en avant, quelques suivants, le sommet ----------
let ascStepsAll = false;
function ascStepsListHTML(a){
  const k = a.key, D = ASC_DATA[k], camps = ascCamps(k), N = camps.length, alt = a.wait ? D.top : a.alt;
  const f = camps.findIndex(c=>c[0]>alt+.5), nI = a.wait || f<0 ? N : f;
  const item = i=>{
    const top = i===N, c = top ? [D.top, D.n, D.top] : camps[i], past = top ? a.wait : c[0]<=alt+.5, nx = !a.wait && i===nI;
    const d = top ? ascSummitDate(a) : a.campDates[c[1]];
    let node = "", r;
    if(past){ node = ascIc("check"); r = `<span class="st-r"><small>${d ? `le ${fmtDate(d)}` : "atteint"}</small></span>`; }
    else { const m = c[0]-alt, e = ascEta(m, a);
      if(nx){ const p0 = i ? camps[i-1][0] : D.start; node = `<i class="st-ring" style="--p:${Math.round(Math.max(0, Math.min(1, (alt-p0)/Math.max(1, c[0]-p0)))*100)}"></i>`;
        r = `<span class="st-r"><b class="num">dans ${ascM(m)}</b><small>${esc(e.time ? `${e.txt} · ${e.time}` : e.txt)}</small></span>`; }
      else if(/\b(mois|ans)\b/.test(e.time)) r = `<span class="st-r"><b class="num">${ascM(m)}</b><small>à gravir</small></span>`;
      else r = `<span class="st-r"><b>${esc(e.txt)}</b>${e.time ? `<small>${esc(e.time)}</small>` : ""}</span>`;
      if(top) node = ascIc("flag"); }
    return `<button class="st-i${past ? " past" : ""}${nx ? " next" : ""}${top ? " top" : ""}" data-a="ascCamp" data-i="${i}">
      <span class="st-node">${node}</span><span class="st-t">${top ? "Sommet" : esc(c[1])}<small>${top ? "" : esc(ascStory(k)[i].t)+" · "}<span class="num">${fmtNum(c[2])} m</span></small></span>${r}</button>`;
  };
  let idx;
  if(ascStepsAll) idx = Array.from({ length:N+1 }, (_, i)=>i);
  else if(a.wait) idx = [N-2, N-1, N].filter(i=>i>=0);
  else idx = [nI-1, nI, nI+1].filter(i=>i>=0 && i<N).concat([N]);
  idx = [...new Set(idx)];
  let html = "", prev = null;
  idx.forEach(i=>{ const gap = prev!=null ? i-prev-1 : 0;
    if(gap>0) html += `<div class="st-gap"><span>${gap} étape${gap>1 ? "s" : ""}</span></div>`;
    html += item(i); prev = i; });
  if(a.wait){
    const X = ASC_DATA[a.next], ok = a.series>=a.nextReq;
    html += `<div class="st-gap"></div><div class="st-i exp-next-i ${ok ? "open" : "locked"}"><span class="st-node">${ascIc(ok ? "flag" : "lock")}</span>
      <span class="st-t">Prochaine expédition<small>${esc(X.n)} · <span class="num">${fmtNum(X.top)} m</span></small></span>
      <span class="st-r">${ok ? `<b>à ta prochaine séance</b>` : `<b>série de ${a.nextReq} sem.</b><small>tu en as ${a.series}</small>`}</span></div>`;
  }
  return html;
}
const ascPos = (k, v)=>{ const D = ASC_DATA[k]; return Math.max(0, Math.min(100, (v-D.start)/(D.top-D.start)*100)); };
function ascStepsHTML(a){
  const D = ASC_DATA[a.key], camps = ascCamps(a.key), N = camps.length, alt = a.wait ? D.top : a.alt, P = v=>v.toFixed(1);
  const ni = a.wait ? -1 : camps.findIndex(c=>c[0]>alt+.5);
  return `<section class="card asc-steps" id="ascSteps" aria-label="Étapes de l'expédition">
    <div class="st-hd"><h2>Étapes</h2><span class="st-n">${a.wait ? "Sommet atteint" : `<b class="num">${a.passed}</b> sur ${N}`}</span></div>
    <div class="exp-track" aria-hidden="true"><div class="exp-push" style="width:${ASC_PUSH*100}%"></div><div class="exp-fill" style="width:${P(ascPos(a.key, alt))}%"></div>${camps.map((c, i)=>`<i class="exp-tick${c[0]<=alt+.5 ? " past" : ""}${i===ni ? " next" : ""}" style="left:${P(ascPos(a.key, c[0]))}%"></i>`).join("")}<i class="exp-me" style="left:${P(ascPos(a.key, alt))}%"></i></div>
    <div class="st-list">${ascStepsListHTML(a)}</div>
    <button class="st-more" data-a="ascAllSteps" aria-expanded="${ascStepsAll}"><span>${ascStepsAll ? "Réduire" : "Toutes les étapes"}</span>${icon("chev")}</button>
  </section>`;
}
function ascHudHTML(a){
  const D = ASC_DATA[a.key];
  return `<div class="asc-hud"><div class="hud-l"><div class="hud-k">${esc(D.region)} · ${a.idx+1}/13${a.lap ? ` · ${a.lap+1}ᵉ tour` : ""}</div><div class="hud-n">${esc(D.n)}</div></div>
    <div class="hud-r"><b class="asc-alt">${fmtNum(a.wait ? D.top : a.alt)} m</b><span>${a.wait ? "sommet atteint" : `sur ${fmtNum(D.top)} m`}</span></div></div>`;
}
// vitesse d'une séance type maintenant (séries des 6 dernières séances en moyenne, palier et force actuels)
function ascSpeedNow(a){ return (a.effAvg || ascEffort(15))*a.mul*a.force/(1 + .25*a.lap); }
// ---------- « Cette semaine » : la seule chose à faire ; la pause, repliée derrière un lien ----------
let ascPauseOpen = false;
function ascPauseBoxHTML(a){
  const thisW = weekKey(todayISO()), pz = ascPauses();
  const btn = (w, lbl)=>{ const on = pz.includes(w); return `<button class="btn ${on ? "secondary on" : "tertiary"} sm" data-a="ascPause" data-w="${w}" aria-pressed="${on}" ${!on && !a.pausesLeft ? "disabled" : ""}>${on ? icon("check")+" " : ""}${lbl}</button>`; };
  return `<div class="asc-pause"><p>La semaine ne compte pas : ta série et ton altitude restent où elles sont. ${a.pausesLeft ? `Encore ${nb(a.pausesLeft, "pause")} ce trimestre.` : "Plus de pause disponible ce trimestre."}</p>
    <div class="ap-b">${btn(thisW, "Cette semaine")}${btn(addDaysISO(thisW, 7), "La suivante")}</div></div>`;
}
function ascWeekHTML(a){
  const thisW = weekKey(todayISO()), W = a.weeks[a.weeks.length-1], n = W && W.w===thisW ? W.n : 0, g = a.goal, left = Math.max(0, g-n);
  const daysLeft = 7 - weekdayIdx(todayISO()), held = left===0, pz = ascPauses(), pzThis = pz.includes(thisW), pzNext = pz.includes(addDaysISO(thisW, 7));
  let msg;
  if(pzThis && !held) msg = "Semaine en pause : elle ne compte pas, rien ne se perd.";
  else if(held) msg = `Objectif tenu : ta série passe à <b>${nb(a.series, "semaine")}</b>.`;
  else if(left>daysLeft) msg = n ? "Plus assez de jours pour tenir l'objectif : chaque séance fait quand même monter, et la série reste gelée." : `Fais au moins une séance d'ici dimanche : sans séance, tu redescendrais au camp précédent.`;
  else if(n===0 && !a.wait) msg = `${nb(left, "séance")} d'ici dimanche pour tenir ton objectif. Sans séance, tu redescendrais au camp précédent.`;
  else msg = `Encore ${nb(left, "séance")} d'ici dimanche : ta série passera à <b>${nb(a.series+1, "semaine")}</b>.`;
  const lbl = pzThis ? "Cette semaine est en pause" : pzNext ? "La semaine prochaine est en pause" : "Vacances ou malade ? Mettre en pause";
  return `<section class="card asc-week" id="ascWeek">
    <div class="aw-hd"><h2>Cette semaine</h2><span class="aw-n"><b class="num">${n}</b>/${g} séance${g>1 ? "s" : ""}</span></div>
    <div class="aw-dots" aria-hidden="true">${Array.from({ length:g }, (_,i)=>`<i class="${i<n ? "on" : ""}"></i>`).join("")}</div>
    <p class="aw-msg">${msg}</p>
    <button class="aw-pause${pzThis || pzNext ? " on" : ""}${ascPauseOpen ? " open" : ""}" data-a="ascPauseMenu" aria-expanded="${ascPauseOpen}" aria-controls="ascPauseBox">${ascIc("pause")}<span>${lbl}</span>${icon("chev")}</button>
    <div class="clp" id="ascPauseBox">${ascPauseOpen ? ascPauseBoxHTML(a) : ""}</div>
  </section>`;
}
// ---------- le détail, replié : une ligne par sujet ----------
const ASC_SECS = [
  ["speed", "gauge", "orange", "Vitesse", a=>`+${ascM(ascSpeedNow(a))} / séance`],
  ["reg", "calendar", "green", "Régularité", a=>`${a.series} sem. · ${ascX(a.reg)}`],
  ["itin", "compass", "teal", "Itinéraire", a=>`${new Set(a.summits.filter(s=>s.lap===a.lap).map(s=>s.key)).size} sur 13`],
  ["carnet", "postcard", "indigo", "Carnet de route", a=>{ const n = ascCards(a).length; return n ? nb(n, "carte") : ""; }],
  ["rw", "trophy", "yellow", "Trophées", a=>a.summits.length ? String(a.summits.length) : ""],
];
let ascOpen = new Set();
function ascRowsHTML(a){
  return `<div class="group asc-rows">${ASC_SECS.map(([k, g, c, t, v])=>{ const on = ascOpen.has(k);
    return `<button class="row tap asc-row ${on ? "on" : ""}" data-a="ascSec" data-k="${k}" aria-expanded="${on}">${sfIcon(g, c)}<div class="grow"><div class="t">${t}</div></div><span class="val">${v(a)}</span><span class="chev">${icon("chev")}</span></button>
      <div class="clp asc-clp" id="ascSec-${k}">${on ? `<div class="asc-sec">${ascSecBody(k, a)}</div>` : ""}</div>`; }).join("")}</div>`;
}
const ascList = x=>x.length>2 ? x.slice(0,-1).join(", ")+" et "+x.slice(-1) : x.join(" et ");
function ascSecBody(k, a){
  if(k==="speed"){
    // une séance type (6 dernières en moyenne), facteur par facteur : la même que pour les délais estimés
    const hard = S.sessions.length ? a.hardAvg : 15, eff = ascEffort(hard), lapF = 1/(1+.25*a.lap), pct = a.index==null ? null : Math.round(a.index-100);
    const row = (t, sub, v, cls)=>`<div class="fx-r${cls ? " "+cls : ""}"><span>${t}${sub ? `<small>${sub}</small>` : ""}</span><b class="num">${v}</b></div>`;
    const near = !a.wait && a.index!=null && a.done>.7, L = a.last, elan = a.elan>a.reg+.005;
    return `<div class="fx">
        ${row("Effort", `${fmtDec(Math.round(hard*2)/2)} séries difficiles${S.sessions.length>1 ? " en moyenne" : ""}`, ascM(eff))}
        ${a.bonusAvg>.05 ? row("Records et progrès", `+${fmtDec(Math.round(a.bonusAvg*2)/2)} série${a.bonusAvg>=2 ? "s" : ""} en moyenne`, "+"+ascM(ascEffort(a.bonusAvg))) : ""}
        ${elan ? row("Élan de départ", `s'estompe d'ici ta ${ASC_ELAN[1]}ᵉ séance`, ascX(Math.round(a.elan*10)/10)) : ""}
        ${row("Régularité", (a.series ? `série de ${nb(a.series, "semaine")}` : "pas encore de série")+(elan ? " · l'élan compte à sa place" : ""), ascX(a.reg), elan ? "off" : "")}
        ${row("Force", pct==null ? "pas encore mesurée" : `${pct>=0 ? "+" : "−"}${Math.abs(pct)} % depuis tes débuts`, ascX(Math.round(a.force*100)/100))}
        ${lapF<.999 ? row(`${a.lap+1}ᵉ tour`, "plus exigeant", ascX(Math.round(lapF*100)/100)) : ""}
        ${a.comeback ? row("Retour en force", `jusqu'à ${ascM(a.comeback)}, l'altitude perdue`, ascX(ASC_BACK)) : ""}
        ${row("Par séance", "", "+"+ascM(ascSpeedNow(a)*(a.comeback ? ASC_BACK : 1)), "tot")}
      </div>
      <p class="note">${L && L.waiting ? "Ta dernière séance n'a pas fait monter : l'expédition suivante attend ta série. " : ""}Un record compte pour 3 séries de plus, une série mieux que la dernière fois pour 1 de plus.</p>
      ${near ? `<div class="wx ${a.pushOK ? "" : "warn"}">${ascIc("pulse", a.pushOK ? "" : "warn")}<span><b>Dernière ligne droite : ${a.pushOK ? "pleine vitesse" : "mi-vitesse"}</b><span>Ta force est à ${Math.round(a.form*100)} % de ton meilleur niveau récent${a.pushOK ? "." : ` (il faut ${Math.round(ASC_FORM_OK*100)} %).`}</span></span></div>` : ""}`;
  }
  if(k==="reg"){
    const p = a.tier, nextP = p<ASC_TH.length-1 ? p+1 : null, opens = nextP==null ? [] : ASC_ORDER.filter(x=>ASC_REQ[x]===ASC_TH[nextP]).map(ascLe);
    const weeks = a.weeks.slice(-13);
    return `<p class="sub">Les semaines d'affilée où tu fais tes ${nb(a.goal, "séance")}. Plus la série est longue, plus tu montes vite.</p>
      <div class="pal">${ASC_TH.map((t,i)=>`<div class="${i<=p ? "on" : ""} ${i===p ? "cur" : ""}"><b class="num">${ascX(ASC_MUL[i])}</b><i></i><small>${t ? t+" sem." : "départ"}</small></div>`).join("")}</div>
      <p class="note">${nextP==null ? `Palier maximal : tu montes <b>3 fois</b> plus vite qu'au départ.`
        : `Prochain palier dans <b class="num">${nb(ASC_TH[nextP]-a.series, "semaine")}</b> : <b>${ascX(ASC_MUL[nextP])}</b>${opens.length ? `. Il ouvre ${esc(ascList(opens))}.` : "."}`}</p>
      ${ascGoalHint(a)}
      ${weeks.length ? `<div class="asc-wk-h">Tes dernières semaines</div>
      <div class="weeks" aria-label="Dernières semaines">${weeks.map(w=>`<i class="wk ${w.state}" title="${ASC_WK_LABEL[w.state]}"></i>`).join("")}</div>
      <div class="legend"><span><i class="wk ok"></i>tenue</span><span><i class="wk frozen"></i>gelée</span><span><i class="wk deload"></i>pause</span><span><i class="wk empty"></i>sans séance</span></div>` : ""}`;
  }
  if(k==="itin"){
    const done = new Set(a.summits.filter(s=>s.lap===a.lap).map(s=>s.key)), any = new Set(a.summits.map(s=>s.key));
    return `${a.lap ? `<p class="sub">${a.lap+1}ᵉ tour de l'itinéraire.</p>` : ""}${ASC_GROUPS.map(([stage, keys])=>`<div class="stage">${stage}</div><ol class="stops">${keys.map(x=>{
      const n = ASC_ORDER.indexOf(x), D = ASC_DATA[x], isDone = done.has(x), cur = n===a.idx && !a.wait, locked = !isDone && !cur && ASC_REQ[x]>a.series;
      const right = isDone ? "atteint" : cur ? `en cours · ${Math.round(Math.max(0, Math.min(1, a.done))*100)} %` : locked ? `série de ${ASC_REQ[x]} sem.` : any.has(x) ? "déjà gravi" : "";
      return `<li class="${isDone ? "done" : cur ? "cur" : locked ? "locked" : ""}"><span class="node">${isDone ? ascIc("check") : locked ? ascIc("lock") : ""}</span><span class="stop-t">${esc(D.n)}<small>${esc(D.region)}</small></span><span class="stop-r"><b class="num">${fmtNum(D.top)} m</b>${right}</span></li>`; }).join("")}</ol>`).join("")}`;
  }
  if(k==="carnet") return ascCarnetHTML(a);
  // trophées de sommet : ceux gagnés (touche pour revoir le sommet), puis celui à gagner
  const x = a.wait ? a.next : a.key, t = ASC_TIERS[ASC_TIER_OF(x)], mine = a.summits.slice().reverse();
  return `${mine.length ? `<div class="asc-trophies">${mine.map((s,i)=>`<button class="asc-tr" data-a="ascReplay" data-i="${a.summits.length-1-i}" aria-label="${esc(ASC_DATA[s.key].n)}, atteint le ${fmtDate(s.date)}">${ascMedalSVG(s.key, 56, true)}<b>${esc(ASC_DATA[s.key].n)}</b><small>${fmtDate(s.date)} ${s.date.slice(0,4)}</small></button>`).join("")}</div>` : ""}
    <div class="rw-row"><span class="rw-ic">${ascMedalSVG(x, 44, true)}</span><span><span class="t">À gagner : trophée ${ascDu(x)}</span><span class="s">${t[3]}, gravé de sa vraie silhouette, avec sa carte de sommet</span></span></div>`;
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
// ---------- comment ça marche (bouton « i » de l'écran, et À propos) ----------
function ascHowHTML(){
  const byReq = {}; ASC_ORDER.forEach(k=>{ if(ASC_REQ[k]) (byReq[ASC_REQ[k]] = byReq[ASC_REQ[k]] || []).push(ASC_DATA[k].n); });
  return `<h3>Ce qui fait monter</h3>
    <p>Chaque séance : <b>effort × régularité × force</b>.</p>
    <ul class="how-list">
      <li><b>Effort</b> : tes séries difficiles, 20 au plus. Une série faite exprès facile compte moitié.</li>
      <li><b>Régularité</b> : ta série de semaines où tu tiens ton objectif, de ×0,5 au départ à ×3 après 20 semaines.</li>
      <li><b>Force</b> : ton indice de force. 10 % de force en plus, 6 % de vitesse en plus.</li>
      <li><b>Records et progrès</b> : un record compte pour ${ASC_BONUS.pr} séries de plus (${ASC_BONUS.prMax} au plus par séance), une série mieux que la dernière fois pour ${ASC_BONUS.beat} de plus (${ASC_BONUS.beatMax} au plus).</li>
      <li><b>Élan de départ</b> : tes premières séances montent au moins à ${ascX(ASC_ELAN[0])} ; l'élan s'estompe jusqu'à ta ${ASC_ELAN[1]}ᵉ séance, la régularité prend le relais.</li>
    </ul>
    <h3>Chaque semaine</h3>
    <ul class="how-list">
      <li><b>Objectif tenu</b> : la série avance.</li>
      <li><b>Raté une fois</b> : la série est gelée ; une 2ᵉ fois en 4 semaines, un palier de moins.</li>
      <li><b>Aucune séance</b> : un palier de moins et retour au camp précédent. Les sommets gagnés restent acquis, et la séance suivante compte double jusqu'à l'altitude perdue (retour en force).</li>
      <li><b>Pause ou semaine allégée</b> : rien ne se perd (${ASC_PAUSE_MAX} pauses par trimestre).</li>
    </ul>
    <h3>Les grandes montagnes</h3>
    <p>Pour partir, il faut une série :</p>
    <ul class="how-req">${Object.keys(byReq).map(Number).sort((x, y)=>x-y).map(r=>`<li><b class="num">${r} sem.</b><span>${esc(ascList(byReq[r]))}</span></li>`).join("")}</ul>
    <p>La dernière ligne droite (les 12 derniers %, hachurés sur la barre) se fait à pleine vitesse si ta force est à ${Math.round(ASC_FORM_OK*100)} % de son meilleur niveau des 6 derniers mois, sinon à mi-vitesse.</p>
    <h3>La montagne</h3>
    <p>La voie tracée est la vraie voie d'ascension ; en pointillé estompé, les passages cachés derrière un relief. Touche un camp, le sommet ou ton grimpeur pour voir son altitude et le temps qu'il te reste.</p>
    <h3>Tout part de ton historique</h3>
    <p>Corriger ou supprimer une séance corrige l'ascension. Sources des montagnes : voir À propos.</p>`;
}
function ascBodyHTML(a){
  const D = ASC_DATA[a.key];
  return `<section class="asc-scene" id="ascScene" style="aspect-ratio:780/${D.vh || 940}" aria-label="${esc(D.n)}, ${fmtNum(a.alt)} mètres">
      <div class="asc-ph">${ascSkySVG(a.key, "asc-ph-svg", true)}</div>
      ${ascHudHTML(a)}
      <div class="asc-toast" role="status" aria-live="polite"></div>
    </section>
    ${ascStepsHTML(a)}
    ${S.sessions.length ? ascWeekHTML(a) : `<section class="card asc-week"><p class="aw-msg">Chaque séance te fait monter. Ta régularité et ta force décident de la vitesse : commence par ta première séance.</p></section>`}
    ${ascRowsHTML(a)}`;
}
function ascSceneToast(icn, html, ms){
  const t = qs("#ascScene .asc-toast"); if(!t) return;
  t.innerHTML = `<span class="ic">${ascIc(icn)}</span><span>${html}</span>`; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("on"), ms || 3200);
}
function openAscent(){
  const a = ascent(), intro = !!(S.ascent && !S.ascent.intro && a.summitCount);
  openSheet(`<div class="sheet-hd"><span class="t">Mon ascension</span><span class="hd-acts"><button class="tr-how" data-a="ascHow" aria-label="Comment fonctionne l'ascension">i</button><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></span></div>
    <div class="sheet-body asc-body">${ascBodyHTML(a)}</div>`, { tall:true, restore:openAscent });
  if(intro){ S.ascent.intro = 1; save(); }
  ascMountScene(a, intro);
}
// la barre des étapes suit le grimpeur pendant qu'il rejoue la montée (nœuds lus une fois, repères mis à jour au passage d'un camp)
function ascStepsBar(k){
  const fill = qs("#ascSteps .exp-fill"), me = qs("#ascSteps .exp-me"), ticks = qsa("#ascSteps .exp-tick"), camps = ascCamps(k);
  let n = -1;
  return v=>{ if(!fill || !fill.isConnected) return;
    const p = ascPos(k, v).toFixed(1)+"%"; fill.style.width = p; me.style.left = p;
    const m = camps.filter(c=>c[0]<=v+.5).length;
    if(m!==n){ n = m; ticks.forEach((t, i)=>t.classList.toggle("past", i<m)); } };
}
// scène de l'écran : chargée à la demande ; le grimpeur rejoue la montée (ou la descente) depuis la dernière visite
function ascMountScene(a, intro){
  const introToast = ()=>{ if(intro) setTimeout(()=>ascSceneToast("flag", `Ton historique compte déjà : <b>${nb(a.summitCount, "sommet")}</b>, jusqu'${esc(ascAu(a.summits[a.summits.length-1].key))}.`, 4200), 300); };
  ascLoadScenes().then(()=>{
    const host = qs("#ascScene"); if(!host || !host.isConnected) return;
    const G = ascBuildScene(host, a.key); if(!G) return;
    ascG = G; host.classList.add("ready");
    const seen = (S.ascent && S.ascent.seen) || null, altEl = host.querySelector(".asc-alt"), D = ASC_DATA[a.key], end = a.wait ? D.top : a.alt;
    const same = seen && seen.key===a.key && seen.lap===a.lap && !seen.wait;
    const from = same ? Math.max(D.start, Math.min(seen.alt, D.top)) : end;
    G.set(from, a.wait && !same);
    const remember = ()=>{ S.ascent = S.ascent || { pauses:[] }; S.ascent.seen = { key:a.key, lap:a.lap, alt:a.alt, wait:a.wait }; save(); };
    if(Math.abs(end-from)<1){ G.set(end, a.wait); remember(); introToast(); return; }
    const bar = ascStepsBar(a.key); bar(from); if(altEl) altEl.textContent = fmtNum(from)+" m";
    setTimeout(()=>{
      if(!G.el.isConnected) return;
      const up = end>from, dur = Math.min(2600, 900+Math.abs(end-from)*6);
      sfx(up ? "ascClimb" : "ascDown", dur/1000);
      ascAnimate(G, from, end, dur, c=>ascSceneToast(c.hut ? "hut" : "tent", `<b>${esc(c.name)}</b> atteint · ${fmtNum(c.real)} m`),
        v=>{ if(altEl) altEl.textContent = fmtNum(v)+" m"; bar(v); })
        .then(()=>{ G.set(end, a.wait); bar(end); if(altEl) altEl.textContent = fmtNum(end)+" m"; remember();
          if(!up){ const d = a.descents[a.descents.length-1]; ascSceneToast("tent", `Semaine sans séance : retour ${d && d.camp ? `à <b>${esc(d.camp)}</b>` : "au départ"}. Ta prochaine séance compte <b>double</b> pour remonter.`, 4200); }
          introToast(); });
    }, reducedMotion() ? 0 : 450);
  }).catch(()=>{ const host = qs("#ascScene"); if(host){ host.classList.add("offline"); introToast(); } });
}
// après une pause : la carte de la semaine, les étapes, les valeurs des lignes et le détail ouvert se mettent à jour sur place
function ascRefreshSheet(){
  const a = ascent(), wk = qs("#ascWeek"), sl = qs("#ascSteps .st-list"); if(wk) wk.outerHTML = ascWeekHTML(a);
  if(sl) sl.innerHTML = ascStepsListHTML(a);
  ASC_SECS.forEach(([k, , , , v])=>{ const r = qs(`.asc-row[data-k="${k}"] .val`); if(r) r.textContent = v(a);
    const b = qs(`#ascSec-${k} .asc-sec`); if(b) b.innerHTML = ascSecBody(k, a); });
}

// ---------- sommet atteint : plein écran ----------
// Une courte cinématique : la montagne monte, le grimpeur fait les derniers mètres sur l'arête (l'altitude défile),
// le drapeau se plante (son, vibration, confettis) et le jour se lève derrière le sommet ; puis la montagne passe
// en fond et le trophée arrive avec ses cadeaux. Toucher l'écran passe à la fin ; sans animations (réglage du
// système) : la fin tout de suite.
function ascPanoSVG(k){
  const D = ASC_DATA[k], sk = ascSky(k), P = ascP1, line = sk.map(([x, y])=>`${x} ${y}`).join("L");
  // les derniers mètres : l'arête de gauche jusqu'au sommet
  const ridge = sk.filter(([x])=>x>=D.sx-40 && x<D.sx).concat([[D.sx, D.sy]]), rd = ridge.map(([x, y], i)=>`${i ? "L" : "M"}${x} ${P(y+.5)}`).join("");
  return `<svg class="sm-svg" viewBox="0 30 156 158" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>
      <linearGradient id="smM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B7C3DC"/><stop offset=".28" stop-color="#4A5677"/><stop offset="1" stop-color="#121729"/></linearGradient>
      <linearGradient id="smL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE6C8"/><stop offset=".3" stop-color="#B98580"/><stop offset="1" stop-color="#1E1C33" stop-opacity="0"/></linearGradient>
      <radialGradient id="smG"><stop offset="0" stop-color="#FFE9C0"/><stop offset=".35" stop-color="#FFB47A" stop-opacity=".6"/><stop offset="1" stop-color="#FF8A5C" stop-opacity="0"/></radialGradient></defs>
    <circle class="sm-glow" cx="${D.sx}" cy="${D.sy}" r="74" fill="url(#smG)"/>
    <path d="M${line}V188H0Z" fill="url(#smM)"/><path class="sm-lit" d="M${line}V188H0Z" fill="url(#smL)"/>
    <path class="sm-rt" d="${rd}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".7" stroke-dasharray="1.4 1.6"/>
    <path class="sm-done" d="${rd}" pathLength="1" fill="none" stroke="#FF6B3D" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="1 1" stroke-dashoffset="1"/>
    <g transform="translate(${D.sx} ${D.sy})"><g class="sm-fl"><path d="M0 0V-15" stroke="#F7F4EE" stroke-width="1.1" stroke-linecap="round"/><path class="sm-cloth" d="M0 -15h9.5l-2.3 2.8 2.3 2.8H0Z" fill="#FF6B3D"/></g></g>
    <circle class="sm-me" r="2.2" cx="${ridge[0][0]}" cy="${P(ridge[0][1]+.5)}" fill="#FF6B3D" stroke="#fff" stroke-width=".8"/></svg>`;
}
function ascShowSummit(s){
  if(!s) return;
  const D = ASC_DATA[s.key], t = ASC_TIERS[ASC_TIER_OF(s.key)], ni = (ASC_ORDER.indexOf(s.key)+1)%13, nk = ASC_ORDER[ni];
  const gifts = [[ascMedalSVG(s.key, 26, false), `Trophée ${t[3].toLowerCase()} ${ascDu(s.key)}`, "Gravé de sa vraie silhouette"], [ascIc("card"), "Carte postale du sommet", "Dans ton carnet de route"],
    [ascIc("flag"), ni===0 ? "Deuxième tour" : `Prochaine expédition : ${ASC_DATA[nk].n}`, ni===0 ? "L'itinéraire recommence, plus exigeant" : `${fmtNum(ASC_DATA[nk].top)} m · ${ASC_DATA[nk].region}${ASC_REQ[nk] ? ` · série de ${ASC_REQ[nk]} sem.` : ""}`]];
  let fl = ""; const rs = ascRng(3);
  for(let i=0;i<34;i++) fl += `<i class="flake" style="left:${(rs()*100).toFixed(1)}%;--dx:${((rs()-.5)*80).toFixed(0)}px;animation-duration:${(5+rs()*6).toFixed(1)}s;animation-delay:-${(rs()*8).toFixed(1)}s;width:${(2+rs()*4).toFixed(1)}px;height:${(2+rs()*4).toFixed(1)}px;opacity:${(.35+rs()*.5).toFixed(2)}"></i>`;
  let el = qs("#ascSummit"); if(el) el.remove();
  el = document.createElement("div"); el.id = "ascSummit"; el.className = "asc-summit"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", `Sommet ${ascDu(s.key)} atteint`);
  const a0 = Math.round(D.top - .1*(D.top - D.start));
  el.innerHTML = `<div class="flakes">${fl}</div><div class="sm-stage">${ascPanoSVG(s.key)}</div><div class="rays"></div>
    <div class="sm-count" aria-hidden="true"><small>${esc(D.n)}</small><b class="num">${fmtNum(a0)} m</b></div>
    <div class="sm-main">
      <div class="medal-wrap"><div class="medal">${ascMedalSVG(s.key, 176, true)}</div></div>
      <div class="k">Sommet atteint</div><h2>${esc(D.n)} · ${fmtNum(D.top)} m</h2>
      ${ASC_TOPS[s.key] ? `<p class="story">${esc(ASC_TOPS[s.key])}</p>` : ""}
      <div class="facts"><b>${nb(s.weeks, "semaine")}</b> · <b>${nb(s.sessions, "séance")}</b> · série de <b>${nb(s.series, "semaine")}</b></div>
      <div class="gifts">${gifts.map(([i, x, y], n)=>`<div class="gift" style="animation-delay:${(.45+n*.12).toFixed(2)}s"><span class="gi">${i}</span><span>${esc(x)}<small>${esc(y)}</small></span></div>`).join("")}</div>
      <button class="btn asc-share" data-a="ascShare" data-i="${S.sessions.length ? ascent().summits.indexOf(s) : -1}">${ascIc("card")} Partager la carte de sommet</button>
      <button class="btn asc-close" data-a="ascSummitClose">Continuer</button>
    </div>`;
  document.body.appendChild(el);
  const rt = el.querySelector(".sm-rt"), done = el.querySelector(".sm-done"), me = el.querySelector(".sm-me"), num = el.querySelector(".sm-count b"), timers = [];
  let stage = 0;   // 1 : drapeau planté, 2 : la fin
  const at = (f, ms)=>timers.push(setTimeout(f, ms));
  const top = ()=>{ const L = rt.getTotalLength(), p = rt.getPointAtLength(L); me.setAttribute("cx", ascP1(p.x)); me.setAttribute("cy", ascP1(p.y)); done.style.strokeDashoffset = 0; num.textContent = fmtNum(D.top)+" m"; };
  const plant = quiet=>{ if(stage>=1) return; stage = 1; top(); el.classList.add("planted");
    if(quiet) return;
    sfx("ascPlant"); haptic([30, 60, 30]);
    const m = el.querySelector(".sm-svg").getScreenCTM();
    if(m){ const p = new DOMPoint(D.sx, D.sy-8).matrixTransform(m); confettiBurst(p.x, p.y, 130); const cv = document.body.lastElementChild; if(cv && cv.classList.contains("confetti")) cv.style.zIndex = 320; } };
  // les rayons tournent derrière le trophée, hors du contenu (qui défile sur un petit écran)
  const reveal = ()=>{ if(stage>=2) return; plant(true); stage = 2; timers.forEach(clearTimeout);
    const w = el.querySelector(".medal-wrap").getBoundingClientRect(); el.style.setProperty("--ry", Math.round(w.top + w.height/2)+"px"); el.classList.add("reveal");
    setTimeout(()=>{ const b = el.querySelector(".asc-close"); if(b && el.isConnected) b.focus({ preventScroll:true }); }, 500); };
  el._reveal = reveal;
  if(reducedMotion()){ el.classList.add("on"); reveal(); sfx("ascSummit"); return; }
  requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("on")));
  // toucher pendant la cinématique : on passe à la fin (sans déclencher un bouton)
  el.addEventListener("pointerdown", e=>{ if(stage<2){ e.preventDefault(); e.stopPropagation(); reveal(); } }, true);
  at(()=>{
    const L = rt.getTotalLength(), t0 = performance.now(), dur = 1500, ease = x=>x<.5 ? 2*x*x : 1-Math.pow(-2*x+2, 2)/2;
    sfx("ascClimb", 1.3);
    const f = now=>{ if(stage || !el.isConnected) return;
      const k = Math.min(1, (now-t0)/dur), e = ease(k), p = rt.getPointAtLength(L*e);
      me.setAttribute("cx", ascP1(p.x)); me.setAttribute("cy", ascP1(p.y)); done.style.strokeDashoffset = (1-e).toFixed(3);
      num.textContent = fmtNum(Math.round(a0 + (D.top-a0)*e))+" m";
      if(k<1) requestAnimationFrame(f); else { plant(); at(reveal, 1300); } };
    requestAnimationFrame(f);
  }, 750);
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

// ---------- séance en cours : la montagne monte à chaque série ----------
// La séance en cours est comptée comme une séance de plus, aujourd'hui, par le même moteur (ascent_raw) :
// l'altitude affichée pendant la séance est exactement celle de la fin de séance. Mémorisé par l'état des séries
// validées (les +/− sur une série à faire ne recalculent rien).
let ascLiveMemo = null, liveAscPrev = null;
function ascLive(draft){
  if(!draft || !draft.startedAt || typeof ascent_raw!=="function") return null;
  const sig = DATA_VER+"|"+draft.exos.map(ex=>ex.exoId+":"+ex.sets.map(s=>s.done ? `${s.reps||0}x${s.weight||0}${s.pr ? "p" : ""}${s.effort===1 ? "e" : ""}` : "-").join(",")).join(";");
  if(ascLiveMemo && ascLiveMemo.sig===sig) return ascLiveMemo.v;
  const a = ascent_raw({ id:"__live", date:todayISO(), exos:draft.exos, beats:typeof draftBeats==="function" ? draftBeats(draft) : 0 });
  const e = a.log.__live || null, k = a.key, D = ASC_DATA[k], camps = ascCamps(k), alt = a.wait ? D.top : a.alt;
  const v = { k, alt, e, wait:a.wait, next:a.next, nextReq:a.nextReq, series:a.series };
  if(e && e.waiting) v.waiting = true;
  else if(!a.wait){
    const nc = camps.find(c=>c[0]>alt+.5) || null, prev = camps.filter(c=>c[0]<=alt+.5).pop(), p0 = prev ? prev[0] : D.start;
    v.target = nc || [D.top, "Sommet", D.top];
    v.rest = Math.max(0, v.target[0]-alt); v.pct = Math.max(0, Math.min(1, (alt-p0)/Math.max(1, v.target[0]-p0)));
    // mètres d'une série difficile de plus (0 au-delà de 20 séries : le plafond de l'effort)
    const m = e ? e.mul*e.force*e.lapF : a.mul*a.force/(1+.25*a.lap);
    v.perSet = (e && e.hard>=20) ? 0 : ascEffort(1)*m*(a.comeback ? ASC_BACK : 1);
    v.back = !!(a.comeback || (e && e.back>0));
  }
  ascLiveMemo = { sig, v }; return v;
}
function liveSetsLeft(draft){ return draft.exos.reduce((t, ex)=>{ const def = EXO_MAP[ex.exoId]; return def && isStretch(def) ? t : t + ex.sets.filter(s=>!s.done).length; }, 0); }
function liveAscHTML(draft){
  const L = ascLive(draft); if(!L) return "";
  // point de départ des « +X m » : l'état au premier affichage de cette séance (ou après un rechargement)
  if(!liveAscPrev || liveAscPrev.id!==draft.id) liveAscPrev = { id:draft.id, gain:L.e ? L.e.gain : 0, alt:L.alt, camps:L.e ? L.e.camps.slice() : [], summit:!!(L.e && L.e.summit), key:L.k, pct:L.pct };
  if(L.waiting) return `<div class="lv-asc wait" id="liveAsc">${ascIc("peak")}<span class="la-next">Au sommet ${esc(ascDu(L.k))} · la série de ${L.nextReq} sem. ouvre ${esc(ascLe(L.next))}</span></div>`;
  const e = L.e, gain = e ? e.gain : 0;
  let next;
  if(L.wait) next = `<b>Sommet ${esc(ascDu(L.k))} atteint !</b>`;
  else { const need = L.perSet ? Math.max(1, Math.ceil(L.rest/L.perSet)) : 0, left = liveSetsLeft(draft);
    next = need && need<=left ? `${esc(L.target[1])} · plus que <b>${nb(need, "série")}</b>` : `${esc(L.target[1])} dans <b class="num">${ascM(L.rest)}</b>`; }
  return `<div class="lv-asc${L.wait ? " top" : ""}" id="liveAsc" aria-label="Altitude ${fmtNum(L.alt)} mètres">
      <span class="la-ic">${ascIc("peak")}</span>
      <span class="la-alt"><b class="num">${fmtNum(L.alt)}</b> m</span>
      ${gain>=.5 ? `<span class="la-gain num">+${ascM(gain)}</span>` : ""}${L.back ? `<span class="la-boost" title="Retour en force : la séance compte double jusqu'à l'altitude perdue">×2</span>` : ""}
      <span class="la-next">${next}</span>
      ${L.wait ? "" : `<i class="la-bar"><i style="width:${(L.pct*100).toFixed(1)}%"></i></i>`}
    </div>`;
}
// après chaque série : +X m qui s'envole, l'altitude qui compte, et le camp atteint fêté sur-le-champ
function liveAscAfter(head){
  const d = S.draft, L = d && ascLive(d); if(!L) return;
  const cur = { id:d.id, gain:L.e ? L.e.gain : 0, alt:L.alt, camps:L.e ? L.e.camps.slice() : [], summit:!!(L.e && L.e.summit), key:L.k, pct:L.pct };
  const prev = liveAscPrev; liveAscPrev = cur;
  if(!prev || prev.id!==cur.id || prev.key!==cur.key || cur.gain<=prev.gain+.05) return;
  const box = qs("#liveAsc", head), num = box && qs(".la-alt b", box); if(!box) return;
  const r = box.getBoundingClientRect(), x = r.left+r.width/2, y = r.top+4;
  const fresh = cur.camps.filter(c=>!prev.camps.includes(c)), top = cur.summit && !prev.summit;
  if(!reducedMotion()){
    floatText(x, y, `+${fmtDec(Math.round((cur.gain-prev.gain)*10)/10)} m`, "asc", "trendUp");
    // l'altitude compte jusqu'à la nouvelle valeur
    const a0 = prev.alt, a1 = cur.alt, t0 = performance.now();
    if(num) (function step(t){ const p = Math.min(1, (t-t0)/700), k = 1-Math.pow(1-p, 3); if(!num.isConnected) return;
      num.textContent = fmtNum(a0+(a1-a0)*k); if(p<1) requestAnimationFrame(step); })(t0);
    box.classList.remove("up"); void box.offsetWidth; box.classList.add("up");
    // la jauge vers le prochain camp part de l'ancienne valeur (sauf quand un camp vient d'être passé)
    const bar = qs(".la-bar i", box);
    if(bar && bar.animate && prev.pct!=null && cur.pct!=null && cur.pct>prev.pct) try{ bar.animate([{ width:(prev.pct*100).toFixed(1)+"%" }, { width:(cur.pct*100).toFixed(1)+"%" }], { duration:700, easing:"cubic-bezier(.32,.72,0,1)" }); }catch(e){}
  }
  if(fresh.length || top){
    const name = top ? `Sommet ${ascDu(cur.key)}` : fresh[fresh.length-1], c = ascCamps(cur.key).find(x=>x[1]===name);
    const nx = qs(".la-next", box); if(nx) nx.innerHTML = `<b>${esc(name)} atteint !</b>${c ? ` <span class="num">${fmtNum(c[2])} m</span>` : ""}`;
    box.classList.add("camp");
    setTimeout(()=>{ sfx("ascCampBig"); haptic([20, 40, 30]); const b = qs("#liveAsc"); if(b){ const rr = b.getBoundingClientRect(); confettiBurst(rr.left+40, rr.top+rr.height/2, top ? 120 : 60); } }, 250);
    // l'annonce reste un moment, puis la bande repart vers l'étape suivante
    clearTimeout(liveAscAfter._t);
    liveAscAfter._t = setTimeout(()=>{ const h = qs("#liveHead"), b = qs("#liveAsc"); if(h && b && S.draft && S.draft.startedAt){ b.outerHTML = liveAscHTML(S.draft); } }, 2800);
  }
}

// ---------- fin de séance : le gain d'altitude (remplace l'XP) ----------
// Une piste zoomée sur le tronçon de la séance : du dernier camp sous le départ au premier camp au-dessus de
// l'arrivée. Le grimpeur y avance franchement ; chaque camp franchi s'allume (son, vibration), puis le badge
// du camp atteint se révèle. Sinon, la ligne du prochain camp entretient l'envie de revenir.
function ascCelHTML(sessionId){
  const a = ascent(), e = a.log[sessionId]; if(!e) return "";
  if(e.waiting) return `<div class="cel-asc wait"><div class="ca-hd">${ascIc("peak")}<span>Au sommet ${ascDu(e.key)}</span></div>
    <div class="ca-sub">Une série de ${nb(ASC_REQ[a.next], "semaine")} ouvre ${ascLe(a.next)} (tu en as ${a.series}). Cette séance la fait avancer.</div></div>`;
  const k = e.key, D = ASC_DATA[k], camps = ascCamps(k), P = v=>v.toFixed(1);
  const below = camps.filter(c=>c[0]<=e.from+.5), lo = below[below.length-1] || null;
  const hi = e.summit ? null : camps.find(c=>c[0]>e.to+.5) || null;
  const L = lo ? lo[0] : D.start, H = hi ? hi[0] : D.top, x = v=>P(Math.max(0, Math.min(1, (v-L)/Math.max(1, H-L)))*100);
  const inner = camps.filter(c=>c[0]>L+.5 && c[0]<H-.5);
  const crossed = camps.filter(c=>e.camps.includes(c[1])), last = crossed[crossed.length-1];
  const end = (c, top)=>`<span class="ca-end ${top ? "r" : "l"}${top && e.summit ? " goal" : ""}" ${top ? `data-p="100"` : ""}>${top ? ascIc(hi ? (ASC_GENERIC(k, hi[1]) ? "tent" : "hut") : "flag") : ""}</span>`;
  // camp ou sommet atteint : sa carte postale se révèle (nouvelle si c'est la première fois) ; nouvelle expédition : un badge
  let badge = "", pc = "";
  if(e.summit || last){
    const mine = ascCards(a).filter(c=>c.sid===sessionId).length;
    const kick = e.summit ? "Sommet atteint" : crossed.length>1 ? `${crossed.length} camps atteints` : "Camp atteint";
    pc = `<div class="ca-badge ca-pc" id="celBadge"><div class="ca-pc-k"><span>${ascIc(e.summit ? "flag" : "tent")}${kick}</span>${mine ? `<b>${ascIc("card")}${mine>1 ? `${mine} nouvelles cartes` : "Nouvelle carte"}</b>` : ""}</div>${ascPostcardHTML(k, e.summit ? -1 : camps.indexOf(last), { date:e.date, big:true })}</div>`;
  }
  else if(e.started) badge = ["peak", "Nouvelle expédition", D.n, `${fmtNum(D.top)} m · ${D.region}`];
  // ce qui vient ensuite : le prochain camp, ou le sommet s'il n'en reste plus
  const nc = e.summit ? null : hi || [D.top, "Sommet", D.top], rest = nc ? nc[0]-e.to : 0;
  return `<button class="cel-asc" data-a="ascFromCel" aria-label="Mon ascension : ${esc(D.n)}, +${fmtNum(e.gain)} mètres">
    <div class="ca-hd">${ascIc("peak")}<span>${esc(D.n)}<small class="num">${fmtNum(e.to)} m sur ${fmtNum(D.top)} m</small></span><b class="num" data-count="${Math.round(e.gain)}" data-unit="m" data-thin="1" data-pre="+">+${ascM(e.gain)}</b></div>
    ${e.bonus>.05 || e.back>.05 ? `<div class="ca-chips">${e.back>.05 ? `<div class="ca-bonus back">${ii("repeat")}<span>Retour en force : <b class="num">+${ascM(e.back)}</b></span></div>` : ""}${e.bonus>.05 ? `<div class="ca-bonus">${ii("bolt")}<span>Records et séries battues : <b class="num">+${ascM(e.bonus*e.mul*e.force*e.lapF)}</b></span></div>` : ""}</div>` : ""}
    <div class="ca-trk" id="celTrk" data-from="${x(e.from)}" data-to="${x(e.to)}" aria-hidden="true">
      <div class="ca-line"><i class="ca-fill" style="width:${x(e.from)}%"></i>
        ${inner.map(c=>`<i class="ca-tick" style="left:${x(c[0])}%" data-p="${x(c[0])}"><span>${esc(c[1])}</span></i>`).join("")}
        ${end(lo, false)}${end(hi, true)}<i class="ca-me" style="left:${x(e.from)}%"></i></div>
      <div class="ca-ends"><span>${esc(lo ? lo[1] : D.from || "Départ")}<b class="num">${fmtNum(lo ? lo[2] : D.fromAlt || D.start)} m</b></span><span>${esc(hi ? hi[1] : "Sommet")}<b class="num">${fmtNum(hi ? hi[2] : D.top)} m</b></span></div>
    </div>
    ${pc}${badge ? `<div class="ca-badge" id="celBadge"><span class="cb-ic"><i class="cb-rays"></i>${ascIc(badge[0])}</span><span class="cb-t"><small>${esc(badge[1])}</small><b>${esc(badge[2])}</b><span>${esc(badge[3])}</span></span></div>` : ""}
    ${nc ? `<div class="ca-next">${ascIc(!hi ? "flag" : ASC_GENERIC(k, nc[1]) ? "tent" : "hut")}<span><b>${esc(nc[1])}</b> dans <b class="num">${ascM(rest)}</b>${ascSessionsFor(rest, a)<=1 ? " : ta prochaine séance t'y amène." : ` · ${esc(ascEtaTxt(rest, a))}`}</span></div>` : ""}
  </button>`;
}
// lancée quand la piste est visible (la fenêtre de fin de séance peut défiler)
function ascCelAnimate(){
  const trk = qs("#celTrk"); if(!trk) return;
  const from = +trk.dataset.from, to = +trk.dataset.to, fill = trk.querySelector(".ca-fill"), me = trk.querySelector(".ca-me"), badge = qs("#celBadge");
  const marks = qsa(".ca-tick, .ca-end.r", trk).map(t=>({ t, p:+(t.dataset.p||0) })).filter(m=>m.p>from+.01 && m.p<=to+.01);
  const set = p=>{ fill.style.width = p+"%"; me.style.left = p+"%"; };
  const reveal = ()=>{
    trk.classList.remove("go"); me.classList.add("land");
    if(!badge) return;
    badge.classList.add("on"); sfx("ascCampBig"); haptic([20, 40, 30]);
    const r = badge.getBoundingClientRect(); if(r.top<innerHeight && r.bottom>0) confettiBurst(r.left+28, r.top+r.height/2, 60);
  };
  if(reducedMotion()){ set(to); marks.forEach(m=>m.t.classList.add("hit")); if(badge) badge.classList.add("on"); return; }
  const run = ()=>{
    const dur = 900+Math.min(900, (to-from)*14), t0 = performance.now(), ease = t=>1-Math.pow(1-t, 3);
    trk.classList.add("go"); sfx("ascClimb", dur/1000*.8);
    const f = now=>{ if(!trk.isConnected) return;
      const t = Math.min(1, (now-t0)/dur), p = from+(to-from)*ease(t); set(p);
      marks.forEach(m=>{ if(!m.done && p>=m.p-.01){ m.done = true; m.t.classList.add("hit"); sfx("ascCamp"); haptic(12); } });
      if(t<1) requestAnimationFrame(f); else setTimeout(reveal, 120); };
    requestAnimationFrame(f);
  };
  // démarre quand la piste est bien visible (sinon dès qu'on y arrive en faisant défiler)
  if(!window.IntersectionObserver){ setTimeout(run, 500); return; }
  const io = new IntersectionObserver(es=>{ if(es.some(x=>x.isIntersecting)){ io.disconnect(); setTimeout(run, 450); } }, { threshold:.9 });
  io.observe(trk);
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
  toast(`Semaine sans séance : retour ${d.camp ? `à ${d.camp} (${fmtNum(d.real)} m)` : "au départ de l'expédition"}. Ta prochaine séance compte double pour remonter.`, "repeat");
}

Object.assign(ACT, {
  openAscent(){ ascOpen = new Set(); ascStepsAll = false; ascPauseOpen = false; ascBubOn = null; ascCarnetOpen = new Set(); openAscent(); },
  ascCarnetGrp(d, el){
    const k = d.k, on = !ascCarnetOpen.has(k), box = qs("#ascCg-"+k); if(!box || !ASC_DATA[k]) return;
    on ? ascCarnetOpen.add(k) : ascCarnetOpen.delete(k);
    el.classList.toggle("on", on); el.setAttribute("aria-expanded", on); sfx(on ? "open" : "close");
    animateCollapse(box, on, on ? ascCarnetRow(ascent(), k) : "");
  },
  // comment ça marche : feuille empilée (retour vers l'écran ou vers À propos)
  ascHow(){
    openSheet(`<div class="sheet-hd"></div><div class="sheet-body how-body asc-how">${ascHowHTML()}</div>`, { child:true, restore:()=>ACT.ascHow() });
    const hd = qs(".sheet .sheet-hd"), back = sheetCanGoBack(); if(!hd) return;
    hd.classList.toggle("te-hd", back);
    hd.innerHTML = back ? `<button class="te-cancel" data-a="sheetBack">${icon("chev")}<span>Retour</span></button><span class="t">Comment ça marche</span><span class="te-spacer"></span>`
      : `<span class="t">Comment ça marche</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button>`;
  },
  // une carte du carnet, en grand (feuille empilée, retour vers l'écran)
  ascCard(d){
    const k = d.k, i = +d.i, c = ascCards(ascent()).find(x=>x.k===k && x.i===i); if(!c || !ASC_DATA[k]) return;
    openSheet(`<div class="sheet-hd te-hd"><button class="te-cancel" data-a="sheetBack">${icon("chev")}<span>Retour</span></button><span class="t">Carte postale</span><span class="te-spacer"></span></div>
      <div class="sheet-body pc-view">${ascPostcardHTML(k, i, { date:c.date, big:true })}</div>`, { child:true, restore:()=>ACT.ascCard(d) });
    if(!sheetCanGoBack()){ const hd = qs(".sheet .sheet-hd"); if(hd){ hd.classList.remove("te-hd"); hd.innerHTML = `<span class="t">Carte postale</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button>`; } }
  },
  ascPauseMenu(d, el){
    const box = qs("#ascPauseBox"); if(!box) return;
    ascPauseOpen = !ascPauseOpen; el.classList.toggle("open", ascPauseOpen); el.setAttribute("aria-expanded", ascPauseOpen);
    animateCollapse(box, ascPauseOpen, ascPauseOpen ? ascPauseBoxHTML(ascent()) : "");
  },
  // une étape de la liste : on remonte à la montagne et sa bulle s'ouvre
  ascCamp(d){
    const i = +d.i, a = ascent(), N = ascCamps(a.key).length, body = qs(".asc-body"), host = qs("#ascScene"); if(!host) return;
    const G = ascG && ascG.el.isConnected ? ascG : null;
    const o = i>=N ? { kind:"summit" } : { kind:"camp", c:G ? G.camps[i] : { i, h:2 } };
    const far = body && body.scrollTop>4;   // la scène entière en vue : la bulle peut s'ouvrir n'importe où
    if(far) body.scrollTo({ top:0, behavior:reducedMotion() ? "auto" : "smooth" });
    setTimeout(()=>ascBubble(o), far && !reducedMotion() ? 420 : 0);
  },
  ascAllSteps(d, el){
    const box = qs("#ascSteps .st-list"); if(!box) return;
    ascStepsAll = !ascStepsAll; sfx(ascStepsAll ? "open" : "close");
    el.setAttribute("aria-expanded", ascStepsAll); el.firstChild.textContent = ascStepsAll ? "Réduire" : "Toutes les étapes";
    morphHeight(box, ()=>{ box.innerHTML = ascStepsListHTML(ascent()); });
  },
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
  ascSummitClose(){ const el = qs("#ascSummit"); if(!el) return; if(el._reveal) el._reveal(); el.classList.remove("on"); setTimeout(()=>el.remove(), 450); },
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
try{ matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{ const h = qs("#ascScene"); if(h && ascG){ ascBubbleHide(); const a = ascent(); const G = ascBuildScene(h, a.key); if(G){ ascG = G; G.set(a.alt, a.wait); } } }); }catch(e){}
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && qs("#ascSummit")) ACT.ascSummitClose(); });
