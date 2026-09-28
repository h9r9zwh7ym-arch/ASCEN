// ================= TROPHÉE 3D (démonstration) =================
// Médaille « Assiduité » rendue en temps réel avec Three.js : métal (couleur du palier),
// émail orange Forge, haltère en relief au centre, reflets issus d'un environnement
// studio généré (aucune image à télécharger). Three.js n'est chargé qu'à l'affichage du
// trophée (vendor/three-forge.js, sous-ensemble construit par esbuild), puis mis en cache
// par le service worker : l'app reste légère au démarrage et fonctionne hors ligne.
// Un seul contexte WebGL : le même canvas passe de la carte à la vue détaillée.

const T3D_ID = "sessions";            // trophée de démonstration
const T3D_METALS = {                  // couleur de base (sRGB), rugosité du champ
  0: { c:"#8C929B", r:.48, name:"Verrouillé" },
  1: { c:"#D08A55", r:.3,  name:"Bronze" },
  2: { c:"#DCE1E7", r:.26, name:"Argent" },
  3: { c:"#F5C451", r:.24, name:"Or" },
  4: { c:"#E3EEF3", r:.2,  name:"Platine" },
};
const T3D = { loading:null, ctx:null, failed:false };

function t3dReduced(){ return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
function t3dWebGL(){
  try{ const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }catch(e){ return false; }
}
function loadThree(){
  if(window.FORGE_THREE) return Promise.resolve(window.FORGE_THREE);
  if(T3D.loading) return T3D.loading;
  T3D.loading = new Promise((ok, ko)=>{
    const s = document.createElement("script");
    s.src = "three-forge.js"; s.async = true;
    s.onload = ()=>window.FORGE_THREE ? ok(window.FORGE_THREE) : ko(new Error("three"));
    s.onerror = ()=>{ T3D.loading = null; ko(new Error("three-forge.js introuvable")); };
    document.head.appendChild(s);
  });
  return T3D.loading;
}

// ---------- construction de la médaille ----------
// Profil de révolution (rayon, hauteur) : champ légèrement creusé, perle, gorge d'émail,
// couronne biseautée, dos plat. Tourné autour de l'axe Y puis couché face caméra.
function t3dProfile(T, pts){ return pts.map(([x,y])=>new T.Vector2(x, y)); }
function t3dBrushed(T){
  // brossage concentrique très fin (carte de rugosité) : lignes le long du profil
  const c = document.createElement("canvas"); c.width = 4; c.height = 512;
  const g = c.getContext("2d");
  for(let y=0; y<512; y++){ const v = 150 + Math.round(40*Math.sin(y*1.7) + 30*Math.random()); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 4, 1); }
  const t = new T.CanvasTexture(c); t.wrapT = 1000; // RepeatWrapping
  return t;
}
function t3dDumbbell(T, mat){
  const g = new T.Group();
  const plate = (r, w)=>{
    const p = new T.LatheGeometry(t3dProfile(T, [[0.05,-w],[r-0.03,-w],[r,-w+0.03],[r,w-0.03],[r-0.03,w],[0.05,w]]), 64);
    const m = new T.Mesh(p, mat); m.rotation.z = Math.PI/2; return m;
  };
  const handle = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.66, 32), mat); handle.rotation.z = Math.PI/2; g.add(handle);
  [[-0.24, 0.23, 0.045],[-0.33, 0.17, 0.038],[0.24, 0.23, 0.045],[0.33, 0.17, 0.038]].forEach(([x, r, w])=>{ const m = plate(r, w); m.position.x = x; g.add(m); });
  [-0.395, 0.395].forEach(x=>{ const cap = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.03, 32), mat); cap.rotation.z = Math.PI/2; cap.position.x = x; g.add(cap); });
  return g;
}
function t3dBuild(T, tier){
  const metal = T3D_METALS[tier]||T3D_METALS[3];
  const brushed = t3dBrushed(T);
  const body = new T.MeshPhysicalMaterial({ color:metal.c, metalness:1, roughness:metal.r, roughnessMap:brushed, clearcoat:.35, clearcoatRoughness:.2 });
  const polish = new T.MeshPhysicalMaterial({ color:metal.c, metalness:1, roughness:.12, clearcoat:.6, clearcoatRoughness:.08 });
  const enamel = new T.MeshPhysicalMaterial({ color:tier ? "#C93A0A" : "#5B6068", metalness:0, roughness:.3, clearcoat:1, clearcoatRoughness:.06 });
  const medal = new T.Group();
  const disc = new T.Mesh(new T.LatheGeometry(t3dProfile(T, [
    [0,.1],[.6,.1],[.63,.125],[.67,.15],[.71,.125],[.73,.11],[.75,.11],[.75,.12],   // champ, perle
    [.86,.12],[.86,.13],[.9,.2],[.95,.215],[.99,.18],[1,.1],[1,-.1],[.97,-.15],[.9,-.17],[0,-.17]   // gorge, couronne, dos
  ]), 128), body);
  // profil de l'émail parcouru de l'extérieur vers l'intérieur : face bombée vers le haut
  const ring = new T.Mesh(new T.LatheGeometry(t3dProfile(T, [[.86,.118],[.83,.136],[.805,.142],[.78,.136],[.75,.118]]), 128), enamel);
  const face = new T.Group(); face.add(disc, ring); face.rotation.x = Math.PI/2; // face vers la caméra (+Z)
  const sym = t3dDumbbell(T, polish); sym.position.z = .15; sym.rotation.z = -.32; sym.scale.setScalar(1.3);
  medal.add(face, sym);
  // anneau de suspension discret en haut
  const loop = new T.Mesh(new T.TorusGeometry(.1, .028, 16, 48), polish); loop.position.set(0, 1.07, 0); medal.add(loop);
  return { medal, mats:{ body, polish, enamel }, tex:[brushed] };
}
function t3dSetTier(ctx, tier){
  const m = T3D_METALS[tier]||T3D_METALS[3];
  ctx.target = { color:new ctx.T.Color(m.c), r:m.r, enamel:new ctx.T.Color(tier ? "#C93A0A" : "#5B6068") };
  ctx.tier = tier;
}
// ---------- particules ----------
function t3dSparkTex(T){
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), r = g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(.25,"rgba(255,228,160,.9)"); r.addColorStop(1,"rgba(255,180,60,0)");
  g.fillStyle = r; g.fillRect(0,0,64,64);
  return new T.CanvasTexture(c);
}
function t3dBurst(ctx){
  const T = ctx.T, n = 90, pos = new Float32Array(n*3), vel = [];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, r = .9+Math.random()*.15, sp = .9+Math.random()*1.6;
    pos[i*3] = Math.cos(a)*r; pos[i*3+1] = Math.sin(a)*r; pos[i*3+2] = (Math.random()-.5)*.3;
    vel.push([Math.cos(a)*sp, Math.sin(a)*sp+.25, (Math.random()-.2)*.8]);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ size:.11, map:ctx.spark, transparent:true, depthWrite:false, blending:T.AdditiveBlending, color:"#FFD27A" });
  const pts = new T.Points(geo, mat); ctx.scene.add(pts);
  ctx.burst = { pts, vel, t:0 };
}

// ---------- contexte de rendu ----------
async function t3dContext(){
  if(T3D.ctx) return T3D.ctx;
  const T = await loadThree();
  const canvas = document.createElement("canvas"); canvas.className = "t3d-canvas";
  const renderer = new T.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:"low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), .035).texture; pmrem.dispose();
  const key = new T.DirectionalLight("#fff4e0", 2.2); key.position.set(-2.5, 3, 4); scene.add(key);
  const rim = new T.DirectionalLight("#ffd9a8", 1.6); rim.position.set(3, -1.5, -2); scene.add(rim);
  scene.add(new T.AmbientLight("#ffffff", .15));
  const glow = new T.PointLight("#ffcc66", 0, 6); glow.position.set(0, 0, 2.2); scene.add(glow);
  const camera = new T.PerspectiveCamera(28, 1, .1, 50); camera.position.set(0, 0, 5.2);
  const tier = medalTier(MEDAL_MAP[T3D_ID]);
  const built = t3dBuild(T, tier);
  scene.add(built.medal);
  const ctx = T3D.ctx = { T, renderer, scene, camera, glow, canvas, medal:built.medal, mats:built.mats, tex:built.tex, tier,
    spark:t3dSparkTex(T), spin:0, drag:0, vel:0, unlock:null, burst:null, running:false, visible:true, t0:performance.now(), last:0 };
  t3dSetTier(ctx, tier);
  const m = T3D_METALS[tier]; ctx.mats.body.color.set(m.c); ctx.mats.polish.color.set(m.c);
  return ctx;
}
function t3dResize(ctx){
  const host = ctx.canvas.parentElement; if(!host) return;
  const w = host.clientWidth, h = host.clientHeight; if(!w || !h) return;
  if(ctx.w===w && ctx.h===h) return;
  ctx.w = w; ctx.h = h;
  ctx.renderer.setSize(w, h, false);
  ctx.camera.aspect = w/h;
  // la médaille garde la même taille apparente quelle que soit la forme du cadre
  ctx.camera.position.z = w/h < 1 ? 5.2/(w/h)*.9 : 5.2;
  ctx.camera.updateProjectionMatrix();
}
const easeOutBack = x=>{ const c1 = 1.5, c3 = c1+1; return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2); };
const easeOutCubic = x=>1-Math.pow(1-x, 3);
function t3dFrame(now){
  const ctx = T3D.ctx; if(!ctx) return;
  if(!ctx.canvas.isConnected || !ctx.visible || document.hidden){ ctx.running = false; return; }
  const dt = Math.min(.05, ctx.last ? (now-ctx.last)/1000 : 0); ctx.last = now;
  const t = (now-ctx.t0)/1000, reduce = t3dReduced(), M = ctx.medal;
  // transition douce de palier (couleur du métal et de l'émail)
  if(ctx.target){
    const k = 1-Math.pow(.001, dt);
    ctx.mats.body.color.lerp(ctx.target.color, k); ctx.mats.polish.color.lerp(ctx.target.color, k); ctx.mats.enamel.color.lerp(ctx.target.enamel, k);
    ctx.mats.body.roughness += (ctx.target.r-ctx.mats.body.roughness)*k;
  }
  // inertie du glisser
  if(!ctx.dragging){ ctx.drag += ctx.vel*dt; ctx.vel *= Math.pow(.04, dt); ctx.drag *= Math.pow(.35, dt); }
  let ry = reduce ? .28 : Math.sin(t*.55)*.38, rx = reduce ? -.06 : Math.sin(t*.42)*.07 - .04, s = 1, lift = reduce ? 0 : Math.sin(t*1.1)*.03;
  if(ctx.unlock){
    const u = (now-ctx.unlock)/1000;
    if(reduce){ s = Math.min(1, u/.4); }
    else {
      s = u<.9 ? Math.max(.001, easeOutBack(Math.min(1, u/.9))) : 1;
      ry += (1-easeOutCubic(Math.min(1, u/1.9)))*Math.PI*4;
      ctx.glow.intensity = u<.5 ? u*16 : Math.max(0, 8-(u-.5)*6);
      if(u>.35 && !ctx.burstDone){ ctx.burstDone = true; t3dBurst(ctx); }
    }
    if(u>2.4){ ctx.unlock = null; ctx.glow.intensity = 0; }
  }
  M.rotation.set(rx, ry + ctx.drag, 0); M.scale.setScalar(s); M.position.y = lift;
  if(ctx.burst){
    const b = ctx.burst; b.t += dt;
    const p = b.pts.geometry.attributes.position;
    for(let i=0;i<b.vel.length;i++){ const v = b.vel[i]; p.array[i*3] += v[0]*dt; p.array[i*3+1] += (v[1]-b.t*.9)*dt; p.array[i*3+2] += v[2]*dt; }
    p.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 1-b.t/1.5); b.pts.material.size = .11*(1-b.t/3);
    if(b.t>1.6){ ctx.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); ctx.burst = null; }
  }
  t3dResize(ctx);
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(t3dFrame);
}
function t3dStart(){ const c = T3D.ctx; if(c && !c.running){ c.running = true; c.last = 0; requestAnimationFrame(t3dFrame); } }
function t3dPlayUnlock(){
  const c = T3D.ctx; if(!c) return;
  c.unlock = performance.now(); c.burstDone = false; c.vel = 0; c.drag = 0;
  if(!t3dReduced()){ haptic([20,40,30]); setTimeout(()=>sfx("medal"), 250); }
  t3dStart();
}

// ---------- carte dans Progrès › Trophées ----------
function trophy3dCardHTML(){
  const m = MEDAL_MAP[T3D_ID]; if(!m) return "";
  const p = medalProgress(m);
  return `<button class="t3d-card stagger" style="--i:0" data-a="t3dOpen" aria-label="${esc(m.n)} en 3D : voir le détail">
    <div class="t3d-stage" id="t3dStage"><div class="t3d-fallback">${medalHTML(m, p.t, "big")}</div></div>
    <div class="t3d-info"><span class="t3d-k">Trophée 3D · aperçu</span><b>${esc(m.n)}</b><span>${p.t ? TIERS[p.t].n : "Pas encore débloqué"}</span></div>
  </button>`;
}
// monte le canvas WebGL dans la carte (appelé après chaque rendu de l'onglet Progrès)
async function mountTrophy3D(root){
  const stage = qs("#t3dStage", root); if(!stage || stage.dataset.mounted) return;
  stage.dataset.mounted = "1";
  if(T3D.failed || !t3dWebGL()) return;         // repli : médaille SVG déjà affichée
  let ctx;
  try{ ctx = await t3dContext(); }catch(e){ T3D.failed = true; return; }
  if(!stage.isConnected || qs(".t3d-full")) return;
  stage.appendChild(ctx.canvas); stage.classList.add("live");
  ctx.w = 0; t3dResize(ctx);
  t3dWatch(stage);
  const tier = medalTier(MEDAL_MAP[T3D_ID]);
  if(tier!==ctx.tier) t3dSetTier(ctx, tier);
  // premier affichage depuis le déblocage d'un palier : animation de déblocage
  const seen = S.meta.t3dSeen||0;
  if(tier>seen){ S.meta.t3dSeen = tier; save(); t3dPlayUnlock(); }
  else t3dStart();
}
let t3dIO = null;
function t3dWatch(el){
  if(!("IntersectionObserver" in window)) return;
  if(t3dIO) t3dIO.disconnect();
  t3dIO = new IntersectionObserver(es=>{ const c = T3D.ctx; if(!c) return; c.visible = es[0].isIntersecting; if(c.visible) t3dStart(); });
  t3dIO.observe(el);
}
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) t3dStart(); });

// ---------- vue détaillée ----------
function t3dDetailHTML(){
  const m = MEDAL_MAP[T3D_ID], p = medalProgress(m), st = S.medals[m.id]||{ d:{} }, cur = T3D.ctx ? T3D.ctx.tier : p.t;
  return `<div class="t3d-name">${esc(m.n)}</div>
    <div class="t3d-tier">${p.t ? `Palier ${TIERS[p.t].n.toLowerCase()}${st.d[p.t] ? " · "+fmtDate(localISO(new Date(st.d[p.t]))) : ""}` : "Pas encore débloqué"}</div>
    <p class="t3d-desc">${esc(m.desc||"")}</p>
    ${p.next!=null ? `<div class="mc-bar big"><span style="width:${Math.round(p.pct*100)}%"></span></div>
      <div class="t3d-prog">${fmtMedalVal(m,p.v)} / ${fmtMedalVal(m,p.next)} ${esc(medalUnit(m,p.next))} pour le palier ${TIERS[p.t+1].n.toLowerCase()}</div>` : `<div class="t3d-prog">Palier platine atteint</div>`}
    <div class="t3d-sec">Aperçu des métaux</div>
    <div class="t3d-metals">${[1,2,3,4].map(k=>`<button class="chip ${cur===k?"on":""}" data-a="t3dMetal" data-v="${k}">${TIERS[k].n}${p.t>=k?"":` ${ii("lock")}`}</button>`).join("")}</div>
    <div class="t3d-actions"><button class="btn secondary" data-a="t3dReplay">${icon("repeat")} Revoir le déblocage</button></div>`;
}
function t3dOpen(){
  const ctx = T3D.ctx, card = qs(".t3d-card"), stage = qs("#t3dStage");
  if(!ctx || !stage || !stage.contains(ctx.canvas)){ if(typeof showMedalModal==="function") showMedalModal(T3D_ID); return; }
  const from = stage.getBoundingClientRect();
  const full = document.createElement("div"); full.className = "t3d-full";
  full.innerHTML = `<div class="t3d-scrim" data-a="t3dClose"></div>
    <div class="t3d-panel" role="dialog" aria-label="Détail du trophée">
      <button class="t3d-x" data-a="t3dClose" aria-label="Fermer">${icon("close")}</button>
      <div class="t3d-big" id="t3dBig"></div>
      <div class="t3d-body">${t3dDetailHTML()}</div>
    </div>`;
  document.body.appendChild(full);
  const big = qs("#t3dBig", full);
  big.appendChild(ctx.canvas); ctx.w = 0; t3dResize(ctx);
  // FLIP : le médaillon part de la carte et grandit jusqu'à sa place
  const to = big.getBoundingClientRect();
  const sx = from.width/to.width, sy = from.height/to.height;
  big.style.transform = `translate(${from.left-to.left + (from.width-to.width)/2}px, ${from.top-to.top + (from.height-to.height)/2}px) scale(${Math.min(sx, sy)})`;
  big.style.transition = "none";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ full.classList.add("show"); big.style.transition = ""; big.style.transform = ""; }));
  if(card) card.classList.add("lifted");
  t3dBindDrag(big);
  ctx.visible = true; t3dStart();
  sfx("seg");
}
function t3dClose(){
  const full = qs(".t3d-full"), ctx = T3D.ctx; if(!full) return;
  const big = qs("#t3dBig", full), stage = qs("#t3dStage");
  if(stage && big){
    const to = stage.getBoundingClientRect(), from = big.getBoundingClientRect();
    big.style.transform = `translate(${to.left-from.left + (to.width-from.width)/2}px, ${to.top-from.top + (to.height-from.height)/2}px) scale(${Math.min(to.width/from.width, to.height/from.height)})`;
  }
  full.classList.remove("show"); full.classList.add("closing");
  setTimeout(()=>{
    if(ctx && stage && stage.isConnected){ stage.appendChild(ctx.canvas); ctx.w = 0; t3dResize(ctx); t3dSetTier(ctx, medalTier(MEDAL_MAP[T3D_ID])); }
    full.remove(); const card = qs(".t3d-card"); if(card) card.classList.remove("lifted");
    if(ctx){ ctx.visible = true; t3dStart(); }
  }, 380);
}
// faire tourner la médaille au doigt, avec inertie ; glisser vers le bas pour fermer
function t3dBindDrag(el){
  let d = null;
  el.addEventListener("pointerdown", e=>{ const c = T3D.ctx; if(!c) return; d = { x:e.clientX, y:e.clientY, lx:e.clientX, lt:performance.now() }; c.dragging = true; c.vel = 0; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
  el.addEventListener("pointermove", e=>{
    const c = T3D.ctx; if(!d || !c) return;
    const now = performance.now(), dx = e.clientX-d.lx;
    c.drag += dx*.012; c.vel = dx*.012/Math.max(.008, (now-d.lt)/1000);
    d.lx = e.clientX; d.lt = now;
  });
  const up = e=>{ const c = T3D.ctx; if(!d) return; const dy = e.clientY-d.y, dx = e.clientX-d.x; d = null; if(c) c.dragging = false; if(dy>120 && Math.abs(dy)>Math.abs(dx)*1.5) t3dClose(); };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
}
Object.assign(ACT, {
  t3dOpen(){ t3dOpen(); },
  t3dClose(){ t3dClose(); },
  t3dReplay(){ t3dPlayUnlock(); },
  t3dMetal(d, el){
    const c = T3D.ctx; if(!c) return;
    t3dSetTier(c, +d.v);
    qsa('.t3d-metals .chip').forEach(b=>b.classList.toggle("on", b===el));
    sfx("seg");
  },
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && qs(".t3d-full")) t3dClose(); });

// après chaque rendu d'onglet : la carte 3D de Progrès › Trophées reçoit son canvas
function afterRenderView(id, el){ if(id==="progress") mountTrophy3D(el); }
