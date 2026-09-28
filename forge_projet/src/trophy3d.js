// ================= TROPHÉES 3D =================
// Chaque trophée est construit en temps réel avec Three.js :
// - forme selon la famille (rond, écu, hexagone, octogone, rosace, pierre taillée) ;
// - couronne de métal au palier (étain, bronze, argent, or, diamant irisé) à tranche cannelée ;
// - champ en émail coloré posé sur une gravure guillochée, sous un vernis brillant ;
// - symbole (glyphe de l'app) en métal poli miroir, plus clair, avec ombre de contact,
//   pour qu'il ressorte nettement ;
// - reflets d'un studio généré (aucune image téléchargée).
// Three.js (vendor/three-forge.js) n'est chargé qu'à l'affichage des trophées.
// Un contexte WebGL « vivant » (carte mise en avant + fiche détaillée, même canvas) et un
// contexte hors écran qui dessine les vignettes de la grille, gardées en mémoire seulement
// (rien n'est stocké sur l'appareil).

const T3D_METALS = {        // couleur sRGB, rugosité de la couronne
  0: { c:"#8E949D", r:.55 },
  1: { c:"#CF8752", r:.34 },
  2: { c:"#D5D7DB", r:.3 },
  3: { c:"#F2C04E", r:.28 },
  4: { c:"#F6FBFF", r:.02, diamond:true },   // cristal taillé sur fond platine (voir t3dMats)
  s: { c:"#EDE6FF", r:.14, iris:true },   // secrets découverts
};
const T3D = { loading:null, ctx:null, snap:null, failed:false, cache:new Map(), queue:[], busy:false, geo:new Map(), mats:new Map(), syms:new Map() };
// Géométries, matériaux et symboles partagés entre toutes les médailles (vignettes et rendu vivant) :
// construits une fois par session et jamais libérés. Avant, chaque vignette reconstruisait tout
// puis le détruisait (programmes de rendu recompilés, mémoire qui fait le yo-yo) : c'était le
// coût principal de la grille des trophées.
function t3dGeo(key, make){ if(!T3D.geo.has(key)){ const g = make(); g.userData.keep = true; T3D.geo.set(key, g); } return T3D.geo.get(key); }

function t3dReduced(){ return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
function t3dWebGL(){
  if(T3D.gl!=null) return T3D.gl;
  try{ const c = document.createElement("canvas"); T3D.gl = !!(c.getContext("webgl2") || c.getContext("webgl")); }catch(e){ T3D.gl = false; }
  return T3D.gl;
}
function t3dUsable(){ return !T3D.failed && t3dWebGL(); }
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

// ---------- textures générées (une fois) ----------
function t3dCanvasTex(T, w, h, draw, repeat){
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = 1000; // RepeatWrapping
  if(repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
function t3dTextures(T){
  if(T3D.tex) return T3D.tex;
  const noise = (g, w, h, base, amp)=>{ const d = g.createImageData(w, h); for(let i=0;i<d.data.length;i+=4){ const v = base + (Math.random()-.5)*amp; d.data[i] = d.data[i+1] = d.data[i+2] = v; d.data[i+3] = 255; } g.putImageData(d, 0, 0); };
  T3D.tex = {
    // tranche cannelée (autour de l'axe de révolution) et fin brossage
    reed: t3dCanvasTex(T, 512, 8, (g, w, h)=>{ for(let x=0;x<w;x++){ const v = 128 + 110*Math.sin(x/w*Math.PI*2*180); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }),
    // satiné / sablé pour les couronnes des formes extrudées
    frost: t3dCanvasTex(T, 256, 256, (g, w, h)=>noise(g, w, h, 150, 90), [3,3]),
    // guilloché en rayons (émail sur face de révolution : u = angle, v = rayon)
    rays: t3dCanvasTex(T, 1024, 32, (g, w, h)=>{ const id = g.createImageData(w, h);
      for(let y=0;y<h;y++){ const ph = Math.sin(y/h*Math.PI*6)*1.6; for(let x=0;x<w;x++){ const v = 128 + 70*Math.sin(x/w*Math.PI*2*72 + ph), i = (y*w+x)*4; id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255; } }
      g.putImageData(id, 0, 0); }),
    // guilloché en soleil (émail des formes extrudées, coordonnées planes)
    sun: t3dCanvasTex(T, 256, 256, (g, w, h)=>{
      const cx = w/2, cy = h/2, id = g.createImageData(w, h);
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const dx = x-cx, dy = y-cy, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
        const v = 128 + 60*Math.sin(a*64 + Math.sin(r*.18)*1.4) + 30*Math.sin(r*.7); const i = (y*w+x)*4; id.data[i] = id.data[i+1] = id.data[i+2] = v; id.data[i+3] = 255; }
      g.putImageData(id, 0, 0); }, [.62,.62]),
    spark: t3dCanvasTex(T, 64, 64, (g)=>{ const r = g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(.25,"rgba(255,228,160,.9)"); r.addColorStop(1,"rgba(255,180,60,0)"); g.fillStyle = r; g.fillRect(0,0,64,64); }),
    star: t3dCanvasTex(T, 64, 64, (g)=>{ g.translate(32,32); const grd = g.createRadialGradient(0,0,0,0,0,30); grd.addColorStop(0,"rgba(255,255,255,1)"); grd.addColorStop(.4,"rgba(215,240,255,.8)"); grd.addColorStop(1,"rgba(160,200,255,0)"); g.fillStyle = grd;
      g.beginPath(); for(let i=0;i<8;i++){ const a = i*Math.PI/4, rr = i%2 ? 5 : 30; g.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); } g.closePath(); g.fill(); }),
  };
  T3D.tex.sun.offset.set(.5, .5); T3D.tex.frost.offset.set(.5, .5);
  return T3D.tex;
}

// ---------- matériaux ----------
function t3dMats(T, m, tier){
  const key = !tier ? 0 : m.secret ? "s" : tier, enamelBase = tier ? (IOS_COL[m.c] || IOS_COL.orange) : "#7A8089";
  const ck = key+"|"+enamelBase;
  if(T3D.mats.has(ck)) return T3D.mats.get(ck);
  const X = t3dTextures(T), M = T3D_METALS[key];
  let mats;
  if(M.diamond){
    // Diamant : un vrai cristal plutôt qu'un métal teinté. Transmission (on voit au travers),
    // indice de réfraction du diamant (2,42) et dispersion : la lumière se décompose en « feu »
    // coloré sur les arêtes des facettes. Posé sur un fond platine miroir, facetté lui aussi,
    // pour que la réfraction ait quelque chose à renvoyer, et un émail nuit qui le fait ressortir.
    const crystal = new T.MeshPhysicalMaterial({ color:"#ffffff", metalness:0, roughness:.02, transmission:1, thickness:.5, ior:2.42, dispersion:6,
      specularIntensity:1, specularColor:"#ffffff", envMapIntensity:2.4, clearcoat:1, clearcoatRoughness:0, attenuationColor:"#d4ecff", attenuationDistance:2.2,
      iridescence:.3, iridescenceIOR:1.9, iridescenceThicknessRange:[180, 520], flatShading:true });
    mats = {
      key, crystal, body:crystal, frame:crystal,
      setting: new T.MeshPhysicalMaterial({ color:"#E6ECF2", metalness:1, roughness:.1, clearcoat:1, clearcoatRoughness:.03, envMapIntensity:1.6, flatShading:true }),
      polish: new T.MeshPhysicalMaterial({ color:"#F5F8FB", metalness:1, roughness:.08, clearcoat:1, clearcoatRoughness:.03, envMapIntensity:1.7 }),
      enamelRays: new T.MeshPhysicalMaterial({ color:hexMix(enamelBase, "#0A1628", .95), metalness:.1, roughness:.35, bumpMap:X.rays, bumpScale:1.4, clearcoat:1, clearcoatRoughness:.04, envMapIntensity:.8 }),
      enamelSun: new T.MeshPhysicalMaterial({ color:hexMix(enamelBase, "#0A1628", .95), metalness:.1, roughness:.35, bumpMap:X.sun, bumpScale:1.4, clearcoat:1, clearcoatRoughness:.04, envMapIntensity:.8 }),
    };
  } else {
    const special = M.iris ? { iridescence:1, iridescenceIOR:1.6, iridescenceThicknessRange:[250, 900], envMapIntensity:1.2 } : {};
    mats = {
      key,
      body: new T.MeshPhysicalMaterial(Object.assign({ color:M.c, metalness:1, roughness:M.r, clearcoat:.3, clearcoatRoughness:.25, bumpMap:X.reed, bumpScale:.6 }, special)),
      frame: new T.MeshPhysicalMaterial(Object.assign({ color:M.c, metalness:1, roughness:M.r+.08, clearcoat:.3, clearcoatRoughness:.3, roughnessMap:X.frost }, special)),
      // symbole : métal poli, plus clair que la couronne, qui capte la lumière (pas un miroir sombre)
      polish: new T.MeshPhysicalMaterial(Object.assign({ color:hexMix(M.c, "#ffffff", tier ? .25 : .1), metalness:1, roughness:tier ? .16 : .32, clearcoat:1, clearcoatRoughness:.05, envMapIntensity:1.45 }, special)),
      // émail : couleur profonde et saturée (moins de reflets) pour que le symbole ressorte
      enamelRays: new T.MeshPhysicalMaterial({ color:hexMix(enamelBase, "#000000", .38), metalness:0, roughness:.55, bumpMap:X.rays, bumpScale:1.4, clearcoat:.9, clearcoatRoughness:.06, envMapIntensity:.55 }),
      enamelSun: new T.MeshPhysicalMaterial({ color:hexMix(enamelBase, "#000000", .38), metalness:0, roughness:.55, bumpMap:X.sun, bumpScale:1.4, clearcoat:.9, clearcoatRoughness:.06, envMapIntensity:.55 }),
    };
  }
  mats.shadow = new T.MeshStandardMaterial({ color:"#000000", transparent:true, opacity:.38, depthWrite:false, roughness:1, metalness:0 });
  mats.ck = ck;
  T3D.mats.set(ck, mats);
  return mats;
}

// ---------- symbole ----------
// Glyphe SVG de l'app (24 × 24) → géométrie : pleins extrudés et biseautés, traits en tubes
// arrondis (avec rotules aux angles et bouts ronds). « dumbbell » a son modèle dédié.
function t3dPolyCurve(T, pts, closed){
  if(!T3D.PolyCurve){
    T3D.PolyCurve = class extends T.Curve {
      constructor(p, c){ super(); this.p = c ? p.concat([p[0]]) : p; this.L = [0]; for(let i=1;i<this.p.length;i++) this.L.push(this.L[i-1] + this.p[i].distanceTo(this.p[i-1])); }
      getPoint(t, out){ out = out || new T.Vector3(); const L = this.L, d = t*L[L.length-1]; let i = 1; while(i<L.length-1 && L[i]<d) i++;
        const a = this.p[i-1], b = this.p[i], k = (d-L[i-1])/Math.max(1e-6, L[i]-L[i-1]); return out.set(a.x+(b.x-a.x)*k, a.y+(b.y-a.y)*k, 0); }
    };
  }
  return new T3D.PolyCurve(pts, closed);
}
function t3dGlyph(T, name, mats){
  const g = new T.Group();
  if(name==="dumbbell") return t3dDumbbell(T, mats.polish);
  // un attribut répété (ex. stroke-width) rend le SVG invalide pour le lecteur XML : on garde le dernier
  const src = (GLYPHS[name] || GLYPHS.medal).replace(/<(\w+)([^>]*?)(\/?)>/g, (all, tag, attrs, end)=>{
    const seen = {}; (attrs.match(/\s[\w-]+="[^"]*"/g)||[]).forEach(a=>{ seen[a.trim().split("=")[0]] = a; });
    return `<${tag}${Object.values(seen).join("")}${end}>`;
  });
  const data = new T.SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${src}</svg>`);
  const joint = t3dGeo("joint", ()=>new T.SphereGeometry(1, 14, 10));
  data.paths.forEach(p=>{
    const st = p.userData.style || {};
    if(st.fill && st.fill!=="none"){
      T.SVGLoader.createShapes(p).forEach(sh=>{
        const geo = new T.ExtrudeGeometry(sh, { depth:.5, bevelEnabled:true, bevelThickness:.45, bevelSize:.32, bevelSegments:3, curveSegments:10 });
        g.add(new T.Mesh(geo, mats.polish));
      });
    }
    if(st.stroke && st.stroke!=="none"){
      const r = (parseFloat(st.strokeWidth)||2)/2;
      p.subPaths.forEach(sp=>{
        const raw = sp.getPoints(10); if(raw.length<2) return;
        const pts = raw.filter((v,i)=>!i || v.distanceTo(raw[i-1])>1e-3).map(v=>new T.Vector3(v.x, v.y, 0));
        if(pts.length<2) return;
        const closed = sp.autoClose || pts[0].distanceTo(pts[pts.length-1])<1e-3;
        const curve = t3dPolyCurve(T, closed && pts[0].distanceTo(pts[pts.length-1])<1e-3 ? pts.slice(0,-1) : pts, closed);
        g.add(new T.Mesh(new T.TubeGeometry(curve, Math.min(96, Math.max(2, pts.length*3)), r, 12, closed), mats.polish));
        // rotules aux angles marqués et bouts arrondis
        pts.forEach((v,i)=>{
          let put = !closed && (i===0 || i===pts.length-1);
          if(!put && i>0 && i<pts.length-1){ const a = pts[i].clone().sub(pts[i-1]).normalize(), b = pts[i+1].clone().sub(pts[i]).normalize(); put = a.dot(b) < .9; }
          if(put){ const s = new T.Mesh(joint, mats.polish); s.position.copy(v); s.scale.setScalar(r); g.add(s); }
        });
      });
    }
  });
  // repère SVG (y vers le bas, 0–24) → repère médaille (centré, y vers le haut)
  const wrap = new T.Group(); wrap.add(g);
  g.position.set(-12, 12, 0); g.scale.set(1, -1, 1);
  return wrap;
}
function t3dTextGlyph(T, text, mats){
  // texte court (« 100 », « 7/7 ») : plaque découpée par le texte, en relief par carte de bosses
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0,0,512,256);
  x.font = `800 ${text.length>2 ? 150 : 190}px -apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
  x.filter = "blur(3px)"; x.fillStyle = "#fff"; x.fillText(text, 256, 136);
  const tex = new T.CanvasTexture(c);
  const mat = mats.polish.clone(); mat.alphaMap = tex; mat.bumpMap = tex; mat.bumpScale = 3; mat.alphaTest = .45; mat.transparent = false; mat.userData.own = true;
  const mesh = new T.Mesh(new T.PlaneGeometry(22, 11), mat);
  const g = new T.Group(); g.add(mesh); g.userData.flat = true;
  return g;
}
function t3dDumbbell(T, mat){
  const g = new T.Group();
  const prof = pts=>pts.map(([x,y])=>new T.Vector2(x, y));
  const plate = (r, w)=>{
    // profil parcouru dans le sens trigonométrique : faces orientées vers l'extérieur
    const p = new T.LatheGeometry(prof([[0.05,-w],[r-0.03,-w],[r,-w+0.03],[r,w-0.03],[r-0.03,w],[0.05,w]]), 64);
    const m = new T.Mesh(p, mat); m.rotation.z = Math.PI/2; return m;
  };
  const handle = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.66, 32), mat); handle.rotation.z = Math.PI/2; g.add(handle);
  [[-0.24, 0.23, 0.045],[-0.33, 0.17, 0.038],[0.24, 0.23, 0.045],[0.33, 0.17, 0.038]].forEach(([x, r, w])=>{ const m = plate(r, w); m.position.x = x; g.add(m); });
  [-0.395, 0.395].forEach(x=>{ const cap = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.03, 32), mat); cap.rotation.z = Math.PI/2; cap.position.x = x; g.add(cap); });
  const wrap = new T.Group(); wrap.add(g); g.rotation.z = -.32; g.scale.setScalar(1.25/.056); // mis à l'échelle des glyphes (unités 24)
  return wrap;
}
function t3dSymbol(T, m, tier, mats){
  const locked = !tier;
  if(m.g && typeof m.g==="object" && !(locked && m.secret)) return t3dTextGlyph(T, m.g.t, mats);
  // glyphe : construit une fois par (glyphe, matériau), puis cloné (géométries partagées)
  const name = locked && m.secret ? "lock" : (m.g || "medal"), k = name+"|"+mats.ck;
  if(!T3D.syms.has(k)){ const tpl = t3dGlyph(T, name, mats); tpl.traverse(o=>{ if(o.geometry) o.geometry.userData.keep = true; }); T3D.syms.set(k, tpl); }
  return T3D.syms.get(k).clone(true);
}

// ---------- médaille ----------
function t3dShapePoints(T, key){
  // contour de la forme (repère SVG 100 × 100) → rayon ≈ 1, y vers le haut
  if(!T3D.shapes) T3D.shapes = {};
  if(T3D.shapes[key]) return T3D.shapes[key];
  const data = new T.SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${MEDAL_SHAPES[key]}"/></svg>`);
  const sh = T.SVGLoader.createShapes(data.paths[0])[0];
  return (T3D.shapes[key] = sh.extractPoints(32).shape.map(p=>new T.Vector2((p.x-50)/48, (50-p.y)/48)));
}
function t3dShape(T, pts, k){ return new T.Shape(pts.map(p=>new T.Vector2(p.x*k, p.y*k))); }
function t3dBuildMedal(T, m, tier){
  const mats = t3dMats(T, m, tier), medal = new T.Group();
  const shape = m.secret ? "secret" : (MEDAL_SHAPES[m.cat] ? m.cat : "regular");
  let faceZ;
  if(shape==="regular"){
    // révolution : dos et couronne (cannelée), perle polie, émail bombé guilloché
    const prof = pts=>pts.map(([x,y])=>new T.Vector2(x, y));
    const dia = T3D_METALS[mats.key].diamond;
    const face = new T.Group();
    if(dia){
      // monture platine facettée (16 pans), puis anneau de cristal taillé : table, couronne, rondiste, culasse
      face.add(new T.Mesh(t3dGeo("dia-setting", ()=>new T.LatheGeometry(prof([[0,-.22],[.96,-.22],[1.04,-.18],[1,-.13],[.84,-.11],[.8,.06],[0,.08]]), 16)), mats.setting));
      face.add(new T.Mesh(t3dGeo("dia-ring", ()=>new T.LatheGeometry(prof([[.8,-.1],[.93,-.14],[1.03,-.05],[1.03,.03],[.98,.14],[.91,.21],[.84,.17],[.8,.1],[.8,-.1]]), 16)), mats.crystal));
    } else face.add(new T.Mesh(t3dGeo("body", ()=>new T.LatheGeometry(prof([[0,-.17],[.9,-.17],[.97,-.15],[1,-.1],[1,.1],[.99,.18],[.95,.215],[.9,.2],[.87,.14],[.86,.1],[0,.1]]), 144)), mats.body));
    face.add(new T.Mesh(t3dGeo("bead", ()=>new T.LatheGeometry(prof([[.875,.13],[.862,.152],[.848,.155],[.835,.14]]), 144)), mats.polish));
    face.add(new T.Mesh(t3dGeo("enamel", ()=>new T.LatheGeometry(prof([[.84,.11],[.83,.14],[.7,.148],[.4,.152],[0,.155]]), 144)), mats.enamelRays));
    face.rotation.x = Math.PI/2;
    medal.add(face); faceZ = .155;
  } else {
    // formes extrudées : dos plein, cadre évidé biseauté (satiné) plus haut que l'émail,
    // filet poli au bord intérieur, émail guilloché en soleil posé en creux
    const pts = t3dShapePoints(T, shape);
    const dia = T3D_METALS[mats.key].diamond;
    const back = new T.Mesh(t3dGeo("back:"+shape, ()=>new T.ExtrudeGeometry(t3dShape(T, pts, .97), { depth:.1, bevelEnabled:true, bevelThickness:.04, bevelSize:.03, bevelSegments:3, curveSegments:24 })), dia ? mats.setting : mats.frame);
    back.position.z = -.16;
    const frame = new T.Mesh(t3dGeo("frame:"+shape+(dia?":d":""), ()=>{ const ring = t3dShape(T, pts, 1); ring.holes.push(new T.Path(pts.map(p=>new T.Vector2(p.x*.84, p.y*.84)).reverse()));
      return new T.ExtrudeGeometry(ring, { depth:.22, bevelEnabled:true, bevelThickness:dia ? .08 : .05, bevelSize:dia ? .07 : .045, bevelSegments:dia ? 1 : 5, curveSegments:24 }); }), mats.frame);
    frame.position.z = -.1;
    const enamel = new T.Mesh(t3dGeo("enamel:"+shape, ()=>new T.ExtrudeGeometry(t3dShape(T, pts, .86), { depth:.02, bevelEnabled:true, bevelThickness:.02, bevelSize:.015, bevelSegments:2, curveSegments:24 })), mats.enamelSun);
    enamel.position.z = .06;
    const bead = new T.Mesh(t3dGeo("bead:"+shape, ()=>new T.TubeGeometry(t3dPolyCurve(T, pts.map(p=>new T.Vector3(p.x*.83, p.y*.83, 0)), true), 160, .02, 10, true)), mats.polish);
    bead.position.z = .12;
    medal.add(back, frame, enamel, bead); faceZ = .1;
  }
  // symbole + ombre de contact (décalée vers le bas, sous le relief)
  const k = .056, yOff = shape==="force" ? .04 : shape==="secret" ? .1 : 0;
  const sym = t3dSymbol(T, m, tier, mats);
  sym.scale.set(k, k, sym.userData.flat ? k : k*.9); sym.position.set(0, yOff, faceZ + .02);
  medal.add(sym);
  if(!sym.userData.flat){
    const sh = sym.clone(true); sh.traverse(o=>{ if(o.isMesh) o.material = mats.shadow; });
    sh.position.set(.018, yOff-.03, faceZ+.004); sh.scale.set(k*1.02, k*1.02, k*.05);
    medal.add(sh);
  }
  if(shape==="regular"){ const loop = new T.Mesh(t3dGeo("loop", ()=>new T.TorusGeometry(.1, .028, 16, 48)), mats.polish); loop.position.set(0, 1.07, 0); medal.add(loop); }
  medal.userData = { mats, diamond:T3D_METALS[mats.key].diamond };
  if(medal.userData.diamond) t3dSparkles(T, medal);
  return medal;
}
function t3dDispose(obj){
  // géométries et matériaux partagés (cache) : conservés ; le reste (texte, étincelles) est libéré
  const seen = new Set();
  obj.traverse(o=>{
    if(o.geometry && !o.geometry.userData.keep && !seen.has(o.geometry)){ seen.add(o.geometry); o.geometry.dispose(); }
    if(o.material && (o.isPoints || o.material.userData.own)){ if(o.material.alphaMap && o.material.userData.own) o.material.alphaMap.dispose(); o.material.dispose(); }
  });
}

// ---------- scène (commune au rendu vivant et aux vignettes) ----------
function t3dScene(T, renderer){
  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), .035).texture; pmrem.dispose();
  const key = new T.DirectionalLight("#fff4e0", 2.3); key.position.set(-2.5, 3, 4); scene.add(key);
  const rim = new T.DirectionalLight("#ffd9a8", 1.5); rim.position.set(3, -1.5, -2); scene.add(rim);
  const fill = new T.DirectionalLight("#dfe9ff", .6); fill.position.set(2.5, 1, 3); scene.add(fill);
  scene.add(new T.AmbientLight("#ffffff", .12));
  return scene;
}
function t3dRenderer(T, canvas, keep){
  const r = new T.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:"low-power", preserveDrawingBuffer:!!keep });
  r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  return r;
}

// ---------- vignettes (grille, listes, célébration) ----------
// Rendu hors écran, une médaille par image, file d'attente sans à-coups ; images gardées
// en mémoire (URL d'objet) pendant la session uniquement.
async function t3dSnapCtx(){
  if(T3D.snap) return T3D.snap;
  const T = await loadThree(), S_ = 256;
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = S_;
  const renderer = t3dRenderer(T, canvas, true); renderer.setPixelRatio(1); renderer.setSize(S_, S_, false);
  const scene = t3dScene(T, renderer);
  const camera = new T.PerspectiveCamera(26, 1, .1, 50); camera.position.set(0, 0, 5.4);
  return (T3D.snap = { T, renderer, scene, camera, canvas });
}
function t3dSnapshot(id, tier){
  const k = id+":"+tier;
  if(T3D.cache.has(k)) return T3D.cache.get(k);
  const p = new Promise((ok, ko)=>{ T3D.queue.push({ id, tier, ok, ko }); t3dPump(); });
  T3D.cache.set(k, p);
  return p;
}
function t3dPump(){
  if(T3D.busy || !T3D.queue.length) return;
  T3D.busy = true;
  const job = T3D.queue.shift();
  const idle = window.requestIdleCallback || (f=>setTimeout(f, 16));
  idle(async ()=>{
    try{
      const s = await t3dSnapCtx(), m = MEDAL_MAP[job.id];
      const medal = t3dBuildMedal(s.T, m, job.tier);
      medal.rotation.set(-.12, .42, 0);
      s.scene.add(medal); s.renderer.render(s.scene, s.camera); s.scene.remove(medal);
      t3dDispose(medal);
      s.canvas.toBlob(b=>{ b ? job.ok(URL.createObjectURL(b)) : job.ko(new Error("blob")); T3D.busy = false; t3dPump(); }, "image/webp", .92);
    }catch(e){ T3D.failed = true; job.ko(e); T3D.busy = false; T3D.queue.splice(0).forEach(j=>j.ko(e)); }
  }, { timeout:400 });
}
// remplace le dessin SVG par la vignette 3D quand l'élément devient visible
let t3dSnapIO = null;
function upgradeMedals(root){
  if(!t3dUsable()) return;
  const els = qsa(".medal[data-mid]:not(.m3d):not(.big)", root||document);
  if(!els.length) return;
  if(!t3dSnapIO) t3dSnapIO = "IntersectionObserver" in window ? new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ t3dSnapIO.unobserve(e.target); t3dFill(e.target); } }), { rootMargin:"200px" }) : null;
  els.forEach(el=>{ el.classList.add("m3d"); t3dSnapIO ? t3dSnapIO.observe(el) : t3dFill(el); });
}
function t3dFill(el){
  const id = el.dataset.mid, tier = +el.dataset.tier; if(!MEDAL_MAP[id]) return;
  t3dSnapshot(id, tier).then(url=>{
    if(!el.isConnected) return;
    const img = new Image(); img.className = "medal-3d"; img.alt = ""; img.decoding = "async"; img.src = url;
    img.onload = ()=>{ el.appendChild(img); requestAnimationFrame(()=>el.classList.add("m3d-on")); };
    // vignette illisible (page quittée, mémoire libérée) : on garde le dessin et on la refera
    img.onerror = ()=>{ T3D.cache.delete(id+":"+tier); el.classList.remove("m3d"); };
  }).catch(()=>{});
}
// toute médaille ajoutée au document (onglets, célébration, fiches) est améliorée
new MutationObserver(ms=>{ if(!t3dUsable()) return; for(const m of ms) for(const n of m.addedNodes){ if(n.nodeType===1 && (n.matches && n.matches(".medal[data-mid]") || n.querySelector && n.querySelector(".medal[data-mid]"))){ upgradeMedals(n.parentNode||n); } } })
  .observe(document.documentElement, { childList:true, subtree:true });

// ---------- rendu vivant (carte mise en avant + fiche détaillée) ----------
async function t3dContext(){
  if(T3D.ctx) return T3D.ctx;
  const T = await loadThree();
  const canvas = document.createElement("canvas"); canvas.className = "t3d-canvas";
  const renderer = t3dRenderer(T, canvas); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  const scene = t3dScene(T, renderer);
  const glow = new T.PointLight("#ffcc66", 0, 6); glow.position.set(0, 0, 2.2); scene.add(glow);
  const camera = new T.PerspectiveCamera(28, 1, .1, 50); camera.position.set(0, 0, 5.2);
  return (T3D.ctx = { T, renderer, scene, camera, glow, canvas, medal:null, id:null, tier:0, drag:0, vel:0, unlock:null, burst:null, sparks:[], flip:0, running:false, visible:true, t0:performance.now(), last:0 });
}
function t3dSetMedal(ctx, id, tier, animate){
  if(ctx.medal && ctx.id===id && ctx.tier===tier) return;
  if(ctx.medal){ ctx.scene.remove(ctx.medal); t3dDispose(ctx.medal); }
  ctx.id = id; ctx.tier = tier;
  ctx.medal = t3dBuildMedal(ctx.T, MEDAL_MAP[id], tier);
  ctx.scene.add(ctx.medal);
  ctx.sparks = ctx.medal.userData.sparks || [];
  if(animate && !t3dReduced()) ctx.flip = performance.now();
}
// scintillements du palier diamant : étoiles posées sur la médaille, animées en direct
function t3dSparkles(T, medal){
  const X = t3dTextures(T), list = [];
  [[-.62,.58,.3,.24],[.7,.35,.28,.16],[.45,-.66,.3,.22],[-.5,-.52,.26,.12],[.05,.86,.28,.1],[-.86,.02,.27,.18]].forEach(([x,y,z,sz],i)=>{
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute([x,y,z], 3));
    const mat = new T.PointsMaterial({ size:sz, map:X.star, transparent:true, depthWrite:false, blending:T.AdditiveBlending, color:"#EAF6FF" });
    const pt = new T.Points(geo, mat); pt.userData.phase = i*1.13; medal.add(pt); list.push(pt);
  });
  medal.userData.sparks = list;
}
function t3dResize(ctx){
  const host = ctx.canvas.parentElement; if(!host) return;
  const w = host.clientWidth, h = host.clientHeight; if(!w || !h) return;
  if(ctx.w===w && ctx.h===h) return;
  ctx.w = w; ctx.h = h;
  ctx.renderer.setSize(w, h, false);
  ctx.camera.aspect = w/h;
  ctx.camera.position.z = w/h < 1 ? 5.2/(w/h)*.9 : 5.2;
  ctx.camera.updateProjectionMatrix();
}
const easeOutBack = x=>{ const c1 = 1.5, c3 = c1+1; return 1 + c3*Math.pow(x-1,3) + c1*Math.pow(x-1,2); };
const easeOutCubic = x=>1-Math.pow(1-x, 3);
function t3dBurst(ctx){
  const T = ctx.T, n = 90, pos = new Float32Array(n*3), vel = [];
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2, r = .9+Math.random()*.15, sp = .9+Math.random()*1.6;
    pos[i*3] = Math.cos(a)*r; pos[i*3+1] = Math.sin(a)*r; pos[i*3+2] = (Math.random()-.5)*.3;
    vel.push([Math.cos(a)*sp, Math.sin(a)*sp+.25, (Math.random()-.2)*.8]);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const mat = new T.PointsMaterial({ size:.11, map:t3dTextures(T).spark, transparent:true, depthWrite:false, blending:T.AdditiveBlending, color:ctx.tier===4 ? "#DDF3FF" : "#FFD27A" });
  const pts = new T.Points(geo, mat); ctx.scene.add(pts);
  ctx.burst = { pts, vel, t:0 };
}
function t3dFrame(now){
  const ctx = T3D.ctx; if(!ctx) return;
  if(!ctx.canvas.isConnected || !ctx.visible || document.hidden || !ctx.medal){ ctx.running = false; return; }
  const lively = ctx.dragging || ctx.unlock || ctx.flip || ctx.burst || Math.abs(ctx.vel)>.02;
  if(!lively && ctx.last && now-ctx.last < 30){ requestAnimationFrame(t3dFrame); return; }
  const dt = Math.min(.05, ctx.last ? (now-ctx.last)/1000 : 0); ctx.last = now;
  const t = (now-ctx.t0)/1000, reduce = t3dReduced(), M = ctx.medal;
  if(!ctx.dragging){ ctx.drag += ctx.vel*dt; ctx.vel *= Math.pow(.04, dt); ctx.drag *= Math.pow(.35, dt); }
  let ry = reduce ? .28 : Math.sin(t*.55)*.38, rx = reduce ? -.06 : Math.sin(t*.42)*.07 - .04, s = 1, lift = reduce ? 0 : Math.sin(t*1.1)*.03;
  if(ctx.flip){ const u = Math.min(1, (now-ctx.flip)/700); ry += (1-easeOutCubic(u))*Math.PI*2; if(u>=1) ctx.flip = 0; }
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
  ctx.sparks.forEach(p=>{ const v = Math.max(0, Math.sin(t*2.2 + p.userData.phase*2.4)); p.material.size = reduce ? .12 : .02 + .26*Math.pow(v, 6); });
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

// ---------- carte « trophée mis en avant » (Progrès › Trophées) ----------
// le dernier palier gagné (sinon Assiduité)
function t3dFeatured(){
  let best = null;
  Object.keys(S.medals||{}).forEach(id=>{ const m = MEDAL_MAP[id], st = S.medals[id]; if(!m || !st.t) return; const d = (st.d||{})[st.t] || "";
    if(!best || d>best.d) best = { id, tier:st.t, d }; });
  return best || { id:"sessions", tier:medalTier(MEDAL_MAP.sessions), d:"" };
}
function trophy3dCardHTML(){
  const f = t3dFeatured(), m = MEDAL_MAP[f.id]; if(!m) return "";
  return `<button class="t3d-card stagger" style="--i:0" data-a="t3dOpen" data-id="${f.id}" aria-label="${esc(m.n)} : voir le détail">
    <div class="t3d-stage" id="t3dStage"><div class="t3d-fallback">${medalSVG(m, f.tier, true)}</div></div>
    <div class="t3d-info"><span class="t3d-k">${f.d ? "Dernier trophée" : "Ton premier trophée"}</span><b>${esc(m.n)}</b><span>${f.tier ? tierLabel(m, f.tier) : "Pas encore débloqué"}</span></div>
  </button>`;
}
async function mountTrophy3D(root){
  const stage = qs("#t3dStage", root); if(!stage || stage.dataset.mounted) return;
  stage.dataset.mounted = "1";
  if(!t3dUsable()) return;         // repli : médaille SVG déjà affichée
  let ctx;
  try{ ctx = await t3dContext(); }catch(e){ T3D.failed = true; return; }
  if(!stage.isConnected || qs(".t3d-full")) return;
  const f = t3dFeatured();
  t3dSetMedal(ctx, f.id, f.tier);
  stage.appendChild(ctx.canvas); stage.classList.add("live");
  ctx.w = 0; t3dResize(ctx);
  t3dWatch(stage);
  // premier affichage depuis ce palier : animation de déblocage
  const key = f.id+":"+f.tier;
  if(f.tier && S.meta.t3dSeen!==key){ S.meta.t3dSeen = key; save(); t3dPlayUnlock(); }
  else t3dStart();
}
let t3dIO = null;
function t3dWatch(el){
  if(!("IntersectionObserver" in window)) return;
  if(t3dIO) t3dIO.disconnect();
  t3dIO = new IntersectionObserver(es=>{ const c = T3D.ctx; if(!c || qs(".t3d-full")) return; c.visible = es[0].isIntersecting; if(c.visible) t3dStart(); });
  t3dIO.observe(el);
}
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) t3dStart(); });

// ---------- fiche détaillée (tous les trophées) ----------
function t3dDetailHTML(id){
  const m = MEDAL_MAP[id], p = medalProgress(m), st = S.medals[m.id]||{ d:{} }, cur = T3D.ctx ? T3D.ctx.tier : p.t;
  if(m.secret){
    return `<div class="t3d-name">${p.t ? esc(m.n) : "Trophée secret"}</div>
      <div class="t3d-tier">${p.t ? `Découvert le ${fmtDate(localISO(new Date(st.d[1]||Date.now())))}` : "Pas encore découvert"}</div>
      <p class="t3d-desc">${esc(p.t ? m.desc : "Indice : "+m.hint)}</p>
      ${p.t ? `<div class="t3d-actions"><button class="btn secondary" data-a="t3dReplay">${icon("repeat")} Revoir le déblocage</button></div>` : ""}`;
  }
  const rows = m.t.map((th,i)=>{ const k = i+1, got = p.t>=k;
    return `<div class="t3d-row ${got?"got":""}"><span class="pip t${k}"></span><b>${TIERS[k].n}</b><span>${fmtMedalVal(m, th)} ${esc(medalUnit(m, th))}</span><em>${got && st.d[k] ? fmtDate(localISO(new Date(st.d[k]))) : got ? ii("check") : ""}</em></div>`; }).join("");
  return `<div class="t3d-name">${esc(m.n)}</div>
    <div class="t3d-tier">${p.t ? `Palier ${TIERS[p.t].n.toLowerCase()}${st.d[p.t] ? " · "+fmtDate(localISO(new Date(st.d[p.t]))) : ""}` : "Pas encore débloqué"}</div>
    <p class="t3d-desc">${esc(m.desc || ("Nombre de "+m.unit+"."))}</p>
    ${p.next!=null ? `<div class="mc-bar big"><span style="width:${Math.round(p.pct*100)}%"></span></div>
      <div class="t3d-prog">${fmtMedalVal(m,p.v)} / ${fmtMedalVal(m,p.next)} ${esc(medalUnit(m,p.next))} pour le palier ${TIERS[p.t+1].n.toLowerCase()}</div>` : `<div class="t3d-prog">Palier diamant atteint</div>`}
    <div class="t3d-rows">${rows}</div>
    <div class="t3d-sec">Aperçu des paliers</div>
    <div class="t3d-metals">${[1,2,3,4].map(k=>`<button class="chip ${cur===k?"on":""}" data-a="t3dMetal" data-v="${k}">${TIERS[k].n}${p.t>=k?"":` ${ii("lock")}`}</button>`).join("")}</div>
    ${p.t ? `<div class="t3d-actions"><button class="btn secondary" data-a="t3dReplay">${icon("repeat")} Revoir le déblocage</button></div>` : ""}`;
}
async function showMedalModal(id, fromEl){
  if(!t3dUsable()) return showMedalModal2D(id);
  let ctx;
  try{ ctx = await t3dContext(); }catch(e){ T3D.failed = true; return showMedalModal2D(id); }
  const m = MEDAL_MAP[id]; if(!m) return;
  const stage = qs("#t3dStage");
  const src = (fromEl && (fromEl.querySelector(".medal") || fromEl)) || (stage && stage.contains(ctx.canvas) ? stage : null);
  const from = src ? src.getBoundingClientRect() : null;
  if(qs(".t3d-full")) qs(".t3d-full").remove();
  t3dSetMedal(ctx, id, medalTier(m));
  ctx.detail = id;
  const full = document.createElement("div"); full.className = "t3d-full";
  full.innerHTML = `<div class="t3d-scrim" data-a="t3dClose"></div>
    <div class="t3d-panel" role="dialog" aria-label="Détail du trophée" data-tier="${medalTier(m)}">
      <button class="t3d-x" data-a="t3dClose" aria-label="Fermer">${icon("close")}</button>
      <div class="t3d-big" id="t3dBig"></div>
      <div class="t3d-body">${t3dDetailHTML(id)}</div>
    </div>`;
  document.body.appendChild(full);
  const big = qs("#t3dBig", full);
  big.appendChild(ctx.canvas); ctx.w = 0; t3dResize(ctx);
  // FLIP : la médaille part de là où on l'a touchée et grandit jusqu'à sa place
  if(from){
    const to = big.getBoundingClientRect();
    big.style.transition = "none";
    big.style.transform = `translate(${from.left-to.left + (from.width-to.width)/2}px, ${from.top-to.top + (from.height-to.height)/2}px) scale(${Math.max(.15, Math.min(from.width/to.width, from.height/to.height))})`;
    T3D.from = src;
  } else T3D.from = null;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ full.classList.add("show"); big.style.transition = ""; big.style.transform = ""; }));
  const card = qs(".t3d-card"); if(card) card.classList.add("lifted");
  t3dBindDrag(big);
  ctx.visible = true; ctx.t0 = performance.now(); t3dStart();
  sfx("seg");
}
function t3dClose(){
  const full = qs(".t3d-full"), ctx = T3D.ctx; if(!full) return;
  const big = qs("#t3dBig", full), stage = qs("#t3dStage"), back = T3D.from && T3D.from.isConnected ? T3D.from : stage;
  if(back && big){
    const to = back.getBoundingClientRect(), from = big.getBoundingClientRect();
    big.style.transform = `translate(${to.left-from.left + (to.width-from.width)/2}px, ${to.top-from.top + (to.height-from.height)/2}px) scale(${Math.max(.15, Math.min(to.width/from.width, to.height/from.height))})`;
  }
  full.classList.remove("show"); full.classList.add("closing");
  setTimeout(()=>{
    full.remove(); const card = qs(".t3d-card"); if(card) card.classList.remove("lifted");
    if(ctx){
      ctx.detail = null;
      const st = qs("#t3dStage");
      if(st && st.isConnected){
        const f = t3dFeatured(); t3dSetMedal(ctx, f.id, f.tier); st.appendChild(ctx.canvas); ctx.w = 0; t3dResize(ctx);
        // la carte peut être hors de l'écran (fiche ouverte depuis le bas de la liste)
        const r = st.getBoundingClientRect(); ctx.visible = r.bottom>0 && r.top<innerHeight;
        if(ctx.visible) t3dStart(); else ctx.renderer.render(ctx.scene, ctx.camera);
      }
    }
  }, 380);
}
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
  t3dOpen(d, el){ showMedalModal(d.id || t3dFeatured().id, el); },
  t3dClose(){ t3dClose(); },
  t3dReplay(){ t3dPlayUnlock(); },
  t3dMetal(d, el){
    const c = T3D.ctx; if(!c || !c.detail) return;
    t3dSetMedal(c, c.detail, +d.v, true); t3dStart();
    qsa('.t3d-metals .chip').forEach(b=>b.classList.toggle("on", b===el));
    sfx("seg");
  },
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && qs(".t3d-full")) t3dClose(); });

// après chaque rendu d'onglet : carte mise en avant + vignettes 3D
function afterRenderView(id, el){ if(id==="progress") mountTrophy3D(el); upgradeMedals(el); }
