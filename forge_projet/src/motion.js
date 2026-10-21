// ================= MOUVEMENT : ressorts physiques et morphings =================
// Chaque propriété animée (position, taille, arrondi, couleur, opacité) est un ressort. Changer sa cible en
// cours de route garde sa vitesse : les étapes s'enchaînent sans arrêt (continuité). Les formes « liquides »
// vivent dans un calque à filtre gooey (#mo .mo-goo) : deux formes qui se touchent fusionnent, comme la
// Dynamic Island. Tout est sauté avec « Réduire les animations » (l'état final s'affiche directement).
// Les scènes travaillent sur des copies figées de l'écran (moSnap) : la vraie interface est déjà à jour
// dessous, rien ne dépend de la fin d'une animation.
const MO = { sims:new Set(), raf:0, last:0, busy:null, flip:null, ringR:null };
function moOn(){ return !(typeof reducedMotion==="function" && reducedMotion()); }
const moClamp = (v, a, b)=>Math.max(a, Math.min(b, v));
const moWait = ms=>new Promise(r=>setTimeout(r, ms));
function moTick(now){
  const dt = Math.min(.034, (now - MO.last)/1000); MO.last = now;
  for(const b of MO.sims){
    try{ b.step(dt); b.render(); }catch(e){ MO.sims.delete(b); continue; }
    if(b.settled()){ MO.sims.delete(b); const r = b._res; b._res = []; r.forEach(f=>f()); }
  }
  MO.raf = MO.sims.size ? requestAnimationFrame(moTick) : 0;
}
function moKick(b){ MO.sims.add(b); if(!MO.raf){ MO.last = performance.now(); MO.raf = requestAnimationFrame(moTick); } }
const moParams = (response, damping)=>({ k:(2*Math.PI/response)**2, c:4*Math.PI*damping/response });
class MoBody{
  constructor(el, init, render){ this.el = el; this.s = {}; this._res = []; this.renderFn = render; for(const k in init) this.s[k] = { v:init[k], t:init[k], vel:0, ...moParams(.5, 1) }; this.render(); }
  to(t, o={}){
    for(const k in t){ const sp = this.s[k] || (this.s[k] = { v:t[k], t:t[k], vel:0 });
      const p = (o.per && o.per[k]) || o; Object.assign(sp, moParams(p.response || o.response || .5, p.damping ?? o.damping ?? 1)); sp.t = t[k]; }
    moKick(this); return this;
  }
  push(k, dv){ if(this.s[k]) this.s[k].vel += dv; moKick(this); return this; }
  get(k){ return this.s[k] ? this.s[k].v : 0; }
  step(dt){ const n = Math.ceil(dt/.004), h = dt/n; for(let i=0;i<n;i++) for(const k in this.s){ const s = this.s[k]; s.vel += (-s.k*(s.v-s.t) - s.c*s.vel)*h; s.v += s.vel*h; } }
  settled(){ for(const k in this.s){ const s = this.s[k], e = Math.max(.002, Math.abs(s.t)*.0015); if(Math.abs(s.v-s.t) > e || Math.abs(s.vel) > e*4) return false; } return true; }
  done(){ return MO.sims.has(this) ? new Promise(r=>this._res.push(r)) : Promise.resolve(); }
  stop(){ MO.sims.delete(this); const r = this._res; this._res = []; r.forEach(f=>f()); }
  render(){ this.renderFn(this); }
}
// couleurs : « #rrggbb » ou « rgb(a)(…) » → [r,g,b]
function moRGB(c){
  if(!c) return [0,0,0];
  const h = /^#([0-9a-f]{6})$/i.exec(c.trim()); if(h) return [0,2,4].map(i=>parseInt(h[1].slice(i,i+2),16));
  const m = c.match(/[\d.]+/g); return m ? m.slice(0,3).map(Number) : [0,0,0];
}
function moMix(a, b, p){ const A = moRGB(a), B = moRGB(b); return `rgb(${A.map((x,i)=>Math.round(x+(B[i]-x)*p)).join(",")})`; }
const moVar = name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function moRect(el){ const r = el.getBoundingClientRect(); return { x:r.left+r.width/2, y:r.top+r.height/2, w:r.width, h:r.height, l:r.left, t:r.top }; }
// calques : #mo (au-dessus de tout, sans toucher) ; .mo-goo dedans pour les formes qui fusionnent
function moLayer(){
  let l = document.getElementById("mo");
  if(!l){
    l = document.createElement("div"); l.id = "mo"; l.setAttribute("aria-hidden", "true");
    l.innerHTML = `<svg width="0" height="0" style="position:absolute"><filter id="moGoo" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"/></filter></svg><div class="mo-goo"></div><div class="mo-fx"></div>`;
    document.body.appendChild(l);
    // copies figées : sous les feuilles (#overlay) mais au-dessus de l'app
    const b = document.createElement("div"); b.id = "moBack"; b.setAttribute("aria-hidden", "true"); document.body.appendChild(b);
  }
  return l;
}
function moClear(){ const l = document.getElementById("mo"); if(l) l.querySelectorAll(".mo-goo,.mo-fx").forEach(x=>x.innerHTML = ""); const b = document.getElementById("moBack"); if(b) b.innerHTML = ""; }
// forme liquide : centre, taille, rayon ; s'étire dans le sens de sa vitesse
function moBlobRender(b){
  const x = b.get("x"), y = b.get("y"), w = Math.max(0, b.get("w")), h = Math.max(0, b.get("h")), vx = b.s.x.vel, vy = b.s.y.vel, st = b.stretch ?? 1;
  const sx = 1 + st*moClamp(Math.abs(vx)/9000 - Math.abs(vy)/18000, -.12, .18), sy = 1 + st*moClamp(Math.abs(vy)/9000 - Math.abs(vx)/18000, -.12, .18);
  if(b.round){ const d = Math.max(0, b.get("w")); b.s.h.v = b.s.w.v; b.s.h.t = b.s.w.t; b.s.h.vel = b.s.w.vel; }
  const e = b.el.style; e.left = (x-w/2)+"px"; e.top = (y-h/2)+"px"; e.width = w+"px"; e.height = h+"px";
  e.borderRadius = Math.max(0, Math.min(b.get("r"), w/2, h/2))+"px"; e.transform = `scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  if(b.colors) e.background = moMix(b.colors[0], b.colors[1], moClamp(b.get("p"), 0, 1));
  if(b.s.o) e.opacity = moClamp(b.get("o"), 0, 1);
}
// forme ronde : une seule taille (w = h toujours), jamais étirée
function moDisc(R, color, extra){ const b = moBlob(R, color, extra); b.stretch = 0; b.round = true; return b; }
function moBlob(R, color, extra){
  const d = document.createElement("div"); d.className = "mo-blob"; d.style.background = color; moLayer().querySelector(".mo-goo").appendChild(d);
  return new MoBody(d, { x:R.x, y:R.y, w:R.w, h:R.h, r:R.r ?? 12, p:0, ...(extra||{}) }, moBlobRender);
}
// transformation d'un élément réel (translation, échelle, opacité) autour de sa place naturelle
function moXform(el, init){
  return new MoBody(el, { x:0, y:0, s:1, sx:1, sy:1, o:1, ...init }, b=>{
    el.style.transform = `translate(${b.get("x").toFixed(2)}px,${b.get("y").toFixed(2)}px) scale(${(b.get("s")*b.get("sx")).toFixed(4)},${(b.get("s")*b.get("sy")).toFixed(4)})`;
    el.style.opacity = moClamp(b.get("o"), 0, 1);
  });
}
function moReset(el){ if(el){ el.style.transform = ""; el.style.opacity = ""; } }
// jetons de couleur figés sur une copie (elle garde ses couleurs si le thème change dessous)
const MO_TOKENS = ["--bg","--bg2","--bg3","--fill","--fill2","--label","--label2","--label3","--sep","--tint","--tint-ink","--tint-bg","--on-tint","--green","--red","--orange","--switch","--bar"];
// copie figée d'un élément, à sa place, dans le calque (back = sous les formes, sinon au-dessus)
function moSnap(el, opts={}){
  const r = el.getBoundingClientRect(), wrap = document.createElement("div");
  wrap.className = "mo-snap " + (opts.cls||"");
  Object.assign(wrap.style, { left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px" });
  const cs = getComputedStyle(document.documentElement); MO_TOKENS.forEach(t=>wrap.style.setProperty(t, cs.getPropertyValue(t)));
  // tailles de la séance (--pic, --row…) et police : sans elles, la photo ronde devient un ovale et tout se décale
  const ce = getComputedStyle(el); ["--pic","--row","--val","--ring","--gutter"].forEach(t=>{ const v = ce.getPropertyValue(t); if(v) wrap.style.setProperty(t, v); });
  wrap.style.font = ce.font; wrap.style.color = ce.color;
  wrap.style.background = opts.bg || "";
  // copie inerte : ni identifiants, ni actions (rien ne doit pouvoir la viser à la place du vrai écran)
  const c = el.cloneNode(true); c.removeAttribute("id"); c.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id"));
  c.classList.remove("enter");   // une copie figée ne rejoue pas les animations d'entrée de l'écran
  c.querySelectorAll("[data-a],[data-c]").forEach(x=>{ x.removeAttribute("data-a"); x.removeAttribute("data-c"); });
  wrap.inert = true;
  c.style.cssText += ";margin:0;width:100%;height:100%;opacity:1;transform:none;pointer-events:none";
  wrap.appendChild(c);
  const L = moLayer(); (opts.front ? L.querySelector(".mo-fx") : document.getElementById("moBack")).appendChild(wrap);
  return wrap;
}
// une scène à la fois : une nouvelle action termine aussitôt la précédente (tout est déjà à jour dessous)
function moBegin(cleanup){
  if(MO.busy) MO.busy();
  let ended = false;
  const end = ()=>{ if(ended) return; ended = true; clearTimeout(t); try{ cleanup && cleanup(); }catch(e){} moClear(); if(MO.busy===end) MO.busy = null; };
  const t = setTimeout(end, 4000);   // filet de sécurité
  MO.busy = end; return end;
}

// ---------- 1 · 2 · 6 : valider une série ----------
// À appeler AVANT de modifier l'état : copie de la carte et mesures. null si rien à animer.
function moCapture(el){
  if(!moOn()) return null;
  if(MO.busy) MO.busy();
  const region = qs("#focusRegion"); if(!region || !qs(".sx-sets", region)) return null;
  const btn = (el && el.closest && el.closest(".validate")) || qs(".validate:not(.hold-go)", region);
  const gain = qs("#liveAsc .la-gain"), alt = qs("#liveAsc .la-alt b");
  return { region, rr:region.getBoundingClientRect(), snap:moSnap(region, { cls:"sx", bg:moVar("--bg") }),
    btnR: btn && btn.offsetParent ? moRect(btn) : null,
    gainR: gain ? moRect(gain) : alt ? moRect(alt) : null, gainFont: gain ? getComputedStyle(gain).fontSize : "13px" };
}
// la case de la série en cours, sur la copie, devient « faite »
function moTileDone(tile, label, val){
  tile.className = "sx-set done"; tile.innerHTML = `<small>${typeof SX_CHECK!=="undefined" ? SX_CHECK : ""}${label}</small><b>${val}</b>`;
}
// kind : "set" (repos sur le même exercice), "exo" (exercice terminé), "end" (dernière série de la séance)
async function moValidate(mo, k){
  if(!mo) return;
  const { region, snap } = mo;
  const tint = moVar("--tint") || "#BC5736", green = "#163A20", card = "#1C1C1E";
  region.style.opacity = "0";
  const rx = moXform(region, { o:0 });
  const end = moBegin(()=>{ MO.sims.delete(rx); moReset(region); region.removeEventListener("pointerdown", end, true); const rg = qs(".ring-wrap", region); moReset(rg); });
  // un toucher pendant l'animation la termine aussitôt : l'écran réel, déjà à jour, répond normalement
  region.addEventListener("pointerdown", end, true);
  try{
    const tile = qs(".sx-set.cur", snap), tiles = [...snap.querySelectorAll(".sx-set")];
    if(!tile){ end(); return; }
    const T = moRect(tile);
    // le bouton : il avale les chiffres, s'écrase, puis plonge en arc dans la case
    const btn = qs(".validate", snap);
    if(mo.btnR && btn){
      const B = mo.btnR; btn.style.visibility = "hidden";
      [".sx-steps", ".fc-beat", ".fc-next", ".sx-note"].forEach(sel=>{ const e = qs(sel, snap); if(!e) return; const r = moRect(e);
        moXform(e).to({ y:B.y - r.y, s:.25, o:0 }, { per:{ y:{ response:.32, damping:.9 }, s:{ response:.3, damping:.9 }, o:{ response:.22 } } }); });
      const b = moBlob({ x:B.x, y:B.y, w:B.w, h:B.h, r:16 }, tint); b.colors = [tint, green];
      b.to({ w:B.w*1.05, h:B.h*.78 }, { response:.18, damping:.55 });
      await moWait(130);
      tile.style.background = "transparent"; tile.style.boxShadow = "none";
      const tb = moBlob({ x:T.x, y:T.y, w:T.w, h:T.h, r:12 }, card); tb.colors = [card, green]; tb.stretch = 0;
      b.push("x", -900).push("y", -500).to({ x:T.x, y:T.y }, { per:{ x:{ response:.56, damping:.78 }, y:{ response:.44, damping:.8 } } }).to({ w:T.w*.9, h:T.h*.9, r:14 }, { response:.38, damping:.7 });
      await moWait(290);
      // impact : la case s'écrase et rebondit, onde de choc, cases voisines bousculées
      tb.to({ w:T.w, h:T.h }, { response:.42, damping:.32 }).push("h", -520).push("w", 560).to({ p:1 }, { response:.22 });
      b.to({ p:1, w:T.w*.6, h:T.h*.6 }, { response:.26, damping:.75 });
      moShock(T);
      tiles.forEach((t, i)=>{ if(t===tile) return; const dir = i < tiles.indexOf(tile) ? -1 : 1; moXform(t).push("x", dir*260).to({ x:0 }, { response:.4, damping:.35 }); });
      moTileDone(tile, k.label, k.val);
      tile.style.background = "transparent";
      setTimeout(()=>{ b.stop(); b.el.remove(); }, 160);
      MO.tileBlob = tb;
    } else {
      moTileDone(tile, k.label, k.val);
      moXform(tile, { s:.88 }).to({ s:1 }, { response:.34, damping:.45 });
      MO.tileBlob = null;
    }
    await moWait(140);
    if(k.kind==="set") await moDrip(mo, tile, T, rx, green, card);
    else if(k.kind==="exo") await moToSegment(mo, tiles, tile, rx, k, green, tint);
    else { MO.endCtx = { mo, tile, T, end }; return; }   // la suite : quand la page de fin s'ouvre (moCelebrate)
  }catch(e){ /* l'interface est déjà juste : on arrête simplement l'animation */ }
  end();
}
// onde de choc qui part d'une case
function moShock(R){
  const d = document.createElement("div"); d.className = "mo-shock";
  Object.assign(d.style, { left:(R.x-R.w/2)+"px", top:(R.y-R.h/2)+"px", width:R.w+"px", height:R.h+"px" });
  moLayer().querySelector(".mo-fx").appendChild(d);
  d.animate([{ transform:"scale(.9)", opacity:.9 }, { transform:"scale(1.9,2.6)", opacity:0 }], { duration:560, easing:"cubic-bezier(.1,.7,.2,1)", fill:"forwards" }).finished.then(()=>d.remove()).catch(()=>{});
}
// 1 · le repos coule de la case comme une goutte, tombe, s'écrase et gonfle en anneau (le vrai anneau)
async function moDrip(mo, tile, T, rx, green, card){
  const ring = qs(".ring-wrap", mo.region);
  // fondu enchaîné court : l'ancienne carte part vite, le repos arrive juste après (pas de superposition)
  moXform(mo.snap).to({ o:0, s:.98 }, { response:.18 });
  rx.s.s.v = .97; setTimeout(()=>rx.to({ o:1, s:1 }, { per:{ o:{ response:.25 }, s:{ response:.4, damping:.8 } } }), 90);
  // la case (forme liquide) s'efface avec la copie : la goutte qui en sort la remplace
  const tb = MO.tileBlob; MO.tileBlob = null;
  if(tb){ if(!tb.s.o) tb.s.o = { v:1, t:1, vel:0, ...moParams(.3, 1) }; tb.push("h", 120); setTimeout(()=>tb.to({ o:0 }, { response:.25 }), 160); }
  if(!ring) return;
  const R = moRect(ring), size = Math.min(R.w, R.h);
  // la goutte : elle s'étire hors de la case (pont liquide), se détache et tombe en restant ronde
  const drop = moBlob({ x:T.x, y:T.y+6, w:26, h:26, r:13 }, green, { o:1 }); drop.colors = [green, moVar("--tint") || "#BC5736"];
  drop.to({ y:T.y+40, h:40 }, { response:.3, damping:.9 });
  // le vrai anneau attend au centre, minuscule et caché
  const rf = moXform(ring, { s:.2, o:0 });
  await moWait(160);
  drop.push("y", 600).to({ x:R.x, y:R.y }, { per:{ x:{ response:.5, damping:.9 }, y:{ response:.42, damping:.82 } } }).to({ w:34, h:34, r:17, p:1 }, { response:.4, damping:.9 });
  await moWait(330);
  // impact : la goutte est absorbée et l'anneau éclot d'elle avec un rebond
  drop.to({ w:0, h:0, o:0 }, { response:.22, damping:.9 });
  rf.to({ o:1 }, { response:.12 }).to({ s:1 }, { response:.42, damping:.5 });
  await Promise.race([rf.done(), moWait(900)]);
  await moWait(80);
}
// 2 · les trois cases se rejoignent en une goutte qui file dans son segment de la barre ; l'exercice suivant arrive
async function moToSegment(mo, tiles, tile, rx, k, green, tint){
  const seg = qsa("#liveHead .lp-seg")[k.exi];
  const R = tiles.map(t=>moRect(t));
  if(MO.tileBlob){ MO.tileBlob.stop(); MO.tileBlob.el.remove(); MO.tileBlob = null; }
  const drops = R.map(r=>{ const d = moBlob({ x:r.x, y:r.y, w:r.w, h:r.h, r:12 }, green); d.colors = [green, tint]; d.stretch = .6; return d; });
  tiles.forEach(t=>{ t.style.background = "transparent"; t.style.boxShadow = "none"; moXform(t).to({ o:0, s:.8 }, { response:.22 }); });
  const C = R[Math.floor(R.length/2)] || moRect(tile);
  // la photo et le nom descendent dans les cases ; le reste s'efface
  [".sx-ex", ".sx-done", ".fc-quiet", ".next-exo", ".sx-grow"].forEach(sel=>{ const e = qs(sel, mo.snap); if(!e) return; const r = moRect(e);
    moXform(e).to({ y:C.y - r.y, s:.3, o:0 }, { per:{ y:{ response:.36, damping:.85 }, s:{ response:.34, damping:.9 }, o:{ response:.26 } } }); });
  drops.forEach(d=>d.to({ x:C.x, w:C.w*.8 }, { response:.34, damping:.72 }));
  const mid = drops[Math.floor(drops.length/2)] || drops[0];
  mid.to({ w:C.w*1.25, h:C.h*.8, y:C.y+6 }, { response:.3, damping:.6 });
  await moWait(250);
  drops.forEach(d=>{ if(d!==mid){ d.stop(); d.el.remove(); } });
  if(!seg){ moXform(mo.snap).to({ o:0 }, { response:.3 }); rx.to({ o:1 }, { response:.3 }); await moWait(300); return; }
  const S = moRect(seg);
  mid.push("y", -1400).push("x", -420).to({ x:S.x, y:S.y }, { per:{ x:{ response:.54, damping:.8 }, y:{ response:.44, damping:.82 } } }).to({ w:44, h:44, r:22 }, { response:.3, damping:.72 }).to({ p:1 }, { response:.4 });
  moXform(mo.snap).to({ o:0 }, { response:.35 });
  // l'exercice suivant entre déjà pendant que la goutte monte (pas de trou noir entre les deux)
  rx.s.o.v = rx.s.o.t = 1; rx.s.x.v = innerWidth*.8; rx.push("x", -900).to({ x:0 }, { response:.5, damping:.7 });
  await moWait(250);
  mid.to({ w:S.w*.85, h:10, r:5 }, { response:.24, damping:.8 });
  await moWait(110);
  // impact dans la barre : le segment s'épaissit et rebondit, ses voisins tressautent
  const sx = moXform(seg); sx.push("sy", 9).to({ sy:1 }, { response:.34, damping:.3 });
  const segs = qsa("#liveHead .lp-seg");
  [segs[k.exi-1], segs[k.exi+1]].forEach((n, i)=>{ if(n) moXform(n).push("y", i ? 140 : -140).to({ y:0 }, { response:.36, damping:.35 }); });
  mid.to({ w:S.w*.5, h:4, r:2 }, { response:.2, damping:.9 });
  setTimeout(()=>{ mid.stop(); mid.el.remove(); }, 160);
  await Promise.race([rx.done(), moWait(1000)]);
  segs.forEach(moReset);
}

// ---------- 6 · fin de séance : la page monte, l'altitude et la dernière série s'envolent jusqu'à leur carte ----------
function moCelebrate(page){
  const ctx = MO.endCtx; MO.endCtx = null;
  if(!ctx || !page || !moOn()){ if(ctx) ctx.end(); return; }
  const { mo, T, end } = ctx;
  if(MO.tileBlob){ MO.tileBlob.stop(); MO.tileBlob.el.remove(); MO.tileBlob = null; }
  // la séance (copie figée) recule pendant que la page monte avec son élan
  // la séance (copie) reste en place derrière la page qui monte : pas d'accueil qui dépasse autour
  const H = innerHeight, py = moXform(page, { y:H });
  py.push("y", -1400).to({ y:0 }, { response:.52, damping:.74 });
  const at = sel=>{ const e = qs(sel, page); if(!e) return null; const r = moRect(e); return { el:e, x:r.x, y:r.y - H, w:r.w, h:r.h }; };
  const gainT = at(".ca-gain b"), dotT = at(".ct-dot"), ton = qs(".cel-ton", page), asc = qs(".cel-asc", page);
  // l'altitude gagnée vole de la ligne d'altitude jusqu'à « Mon ascension »
  if(mo.gainR && gainT){
    gainT.el.style.visibility = "hidden";
    const f = document.createElement("div"); f.className = "mo-num"; f.textContent = gainT.el.textContent; f.style.fontSize = mo.gainFont;
    moLayer().querySelector(".mo-fx").appendChild(f);
    const w = f.offsetWidth, h = f.offsetHeight, k1 = parseFloat(getComputedStyle(gainT.el).fontSize)/parseFloat(mo.gainFont) || 1;
    const from = moVar("--tint-ink"), to = moVar("--label");
    const fb = new MoBody(f, { x:mo.gainR.x, y:mo.gainR.y, z:1, p:0 }, b=>{ f.style.transform = `translate(${(b.get("x")-w/2).toFixed(1)}px,${(b.get("y")-h/2).toFixed(1)}px) scale(${b.get("z").toFixed(4)})`; f.style.color = moMix(from, to, moClamp(b.get("p"), 0, 1)); });
    fb.push("y", -500).push("x", 400).to({ x:gainT.x, y:gainT.y }, { per:{ x:{ response:.62, damping:.78 }, y:{ response:.54, damping:.76 } } }).to({ z:k1, p:1 }, { response:.52, damping:.72 });
    fb.done().then(()=>{ gainT.el.style.visibility = ""; f.remove(); });
  }
  // la dernière série tombe sur la courbe du tonnage : c'est le point d'aujourd'hui
  if(dotT && dotT.w > 2 && dotT.el.getBoundingClientRect().width > 2){
    const green = "#163A20", tint = moVar("--tint");
    dotT.el.style.visibility = "hidden";
    const d = moBlob({ x:T.x, y:T.y, w:T.w, h:T.h, r:12 }, green); d.colors = [green, tint];
      d.push("y", -1100).to({ x:dotT.x, y:dotT.y }, { per:{ x:{ response:.56, damping:.8 }, y:{ response:.5, damping:.74 } } }).to({ w:dotT.w, h:dotT.h, r:dotT.w, p:1 }, { response:.42, damping:.72 });
    const fin = ()=>{ dotT.el.style.visibility = ""; d.stop(); d.el.remove(); };
    d.done().then(fin); setTimeout(fin, 1600);
  }
  // chaque carte encaisse l'arrivée de sa valeur
  const land = el=>{ if(!el) return; el.style.transformOrigin = "50% 100%"; const b = new MoBody(el, { s:1 }, x=>{ const s = x.get("s"); el.style.transform = `scale(${(1 + (1-s)*.3).toFixed(4)},${s.toFixed(4)})`; }); b.push("s", -2).to({ s:1 }, { response:.36, damping:.34 }); return b; };
  setTimeout(()=>land(ton), 470); setTimeout(()=>land(asc), 560);
  py.done().then(()=>moWait(900)).then(()=>{ moReset(page); [ton, asc].forEach(e=>{ if(e) e.style.transform = ""; }); end(); });
}

// ---------- 4 · commencer : la carte du jour s'ouvre en plein écran, la séance apparaît dedans ----------
function moStartCapture(){
  if(!moOn()) return null;
  const hero = qs("#v-today .hero"), view = qs("#v-today"); if(!hero || !view || !hero.offsetParent) return null;
  if(MO.busy) MO.busy();
  return { R:moRect(hero), bg:getComputedStyle(hero).backgroundColor, snap:moSnap(view, { front:true, bg:moVar("--bg") }) };
}
function moStart(cap){
  if(!cap) return false;
  const { R, snap } = cap;
  const end = moBegin();
  const goo = moLayer().querySelector(".mo-goo"); goo.style.zIndex = 4;
  const dark = moVar("--bg") || "#000000";
  const m = moBlob({ x:R.x, y:R.y, w:R.w, h:R.h, r:22 }, cap.bg, { o:1 }); m.colors = [cap.bg, dark]; m.stretch = 0;
  goo.style.filter = "none";   // une seule forme : pas de fusion, rendu plus léger
  moXform(snap).to({ s:.92 }, { response:.5, damping:.9 });
  m.to({ x:innerWidth/2, y:innerHeight/2 }, { response:.48, damping:.84 }).to({ w:innerWidth+2, h:innerHeight+2, r:44 }, { response:.5, damping:.8 });
  // l'écran couvert : la carte passe au noir de la séance, puis s'efface sur la vraie séance
  setTimeout(()=>{ snap.style.display = "none"; m.to({ p:1, r:0 }, { response:.26 }); }, 330);
  setTimeout(()=>m.to({ o:0 }, { response:.22 }), 560);
  m.done().then(()=>{ goo.style.zIndex = ""; goo.style.filter = ""; end(); });
  setTimeout(()=>{ goo.style.zIndex = ""; goo.style.filter = ""; end(); }, 2200);
  return true;
}

// ---------- 4 · terminé : la page de fin se replie dans le jour de la semaine ----------
function moCloseCelebration(){
  const page = qs(".cel-page"), dot = qs("#v-today .wk-day.today");
  if(!moOn() || !page || !dot){ closeSheet(); return; }
  const P = moRect(page), D = moRect(dot), tint = moVar("--tint"), bg = getComputedStyle(page).backgroundColor;
  const end = moBegin(()=>{ moReset(dot); });
  // la page devient une forme de sa couleur, à sa place exacte ; la vraie page part tout de suite
  const goo = moLayer().querySelector(".mo-goo"); goo.style.filter = "none";
  const b = moBlob({ x:P.x, y:P.y, w:P.w, h:P.h, r:0 }, bg); b.colors = [bg, tint]; b.stretch = 0;
  const ov = qs("#overlay"); if(ov) ov.classList.add("mo-noscrim");
  closeSheet();
  setTimeout(()=>{ if(ov) ov.classList.remove("mo-noscrim"); }, 500);
  // elle se contracte en carte, puis tombe en arc vers le jour en s'arrondissant jusqu'au rond
  b.to({ w:P.w*.62, h:P.h*.42, r:32 }, { response:.34, damping:.84 });
  setTimeout(()=>{
    b.push("x", 700).to({ x:D.x, y:D.y }, { per:{ x:{ response:.56, damping:.82 }, y:{ response:.46, damping:.86 } } })
     .to({ w:D.w, h:D.w, r:D.w/2, p:1 }, { response:.42, damping:.86 });
  }, 170);
  setTimeout(()=>{
    // impact : le jour avale la forme et rebondit
    b.to({ w:0, h:0, r:0 }, { response:.18, damping:.9 });
    moXform(dot).push("s", 7).to({ s:1 }, { response:.36, damping:.32 });
    if(typeof sfx==="function") sfx("set");
    setTimeout(()=>{ goo.style.filter = ""; end(); }, 900);
  }, 780);
}

// ---------- 3 · le repos devient une île (Dynamic Island) ----------
// Sur un iPhone à Dynamic Island, la pastille de repos se range dans l'île : une pilule noire collée à l'île réelle,
// qui s'élargit (anneau à gauche, temps à droite). Ailleurs, la pastille d'origine reste en bas.
let moIslandCache = null;
function moIsland(){
  if(moIslandCache!==null) return moIslandCache;
  const p = document.createElement("div"); p.style.cssText = "position:fixed;top:0;left:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden";
  document.body.appendChild(p); const top = parseFloat(getComputedStyle(p).paddingTop) || 0; p.remove();
  moIslandCache = top >= 50;   // 59 pt et plus : iPhone 14 Pro et suivants (île) ; 44–48 : encoche
  return moIslandCache;
}
const MO_ISL = ()=>({ x:innerWidth/2, y:11+18.5, w:126, h:37 });
const MO_ISLW = ()=>({ x:innerWidth/2, y:11+18.5, w:236, h:37 });
// avant de redessiner la carte : retient l'anneau de repos s'il est affiché (point de départ du morphing)
function moRememberRing(){ const r = qs("#focusRegion .ring-wrap"); MO.ringR = r && r.offsetParent ? { R:moRect(r), at:Date.now() } : null; }
function moIslandIn(bar){
  const src = MO.ringR; MO.ringR = null;
  if(!moOn() || !src || Date.now()-src.at > 800) return;
  const end = moBegin(()=>{ moReset(bar); });
  bar.style.opacity = "0";
  const I = MO_ISL(), W = MO_ISLW(), R = src.R, s = Math.min(R.w, R.h);
  const isl = moBlob({ ...I, r:18.5 }, "#000000"); isl.stretch = 0;
  const disc = moBlob({ x:R.x, y:R.y, w:s*.92, h:s*.92, r:s }, "#1C1C1E"); disc.colors = ["#1C1C1E", "#000000"];
  disc.to({ y:I.y+6 }, { response:.5, damping:.8 }).to({ w:46, h:46, r:23 }, { response:.42, damping:.85 });
  setTimeout(()=>{
    isl.to({ w:W.w, h:W.h }, { per:{ w:{ response:.48, damping:.55 }, h:{ response:.36, damping:.5 } } }).push("h", 260);
    disc.to({ w:24, h:24, r:12, y:W.y, p:1 }, { response:.32, damping:.9 });
  }, 230);
  setTimeout(()=>{ moXform(bar, { o:0, s:.9 }).to({ o:1, s:1 }, { per:{ o:{ response:.25 }, s:{ response:.4, damping:.6 } } }); }, 520);
  setTimeout(end, 1300);
}
function moIslandOut(barR){
  const ring = qs("#focusRegion .ring-wrap");
  if(!moOn() || !ring || !barR) return;
  const end = moBegin(()=>{ moReset(ring); });
  const R = moRect(ring), s = Math.min(R.w, R.h), W = MO_ISLW(), I = MO_ISL();
  const isl = moBlob({ ...W, r:18.5 }, "#000000"); isl.stretch = 0;
  isl.to({ w:W.w+18, h:W.h+6 }, { response:.22, damping:.7 });
  const disc = moBlob({ x:W.x - W.w/2 + 22, y:W.y, w:24, h:24, r:12, p:1 }, "#000000"); disc.colors = ["#1C1C1E", "#000000"];
  const rf = moXform(ring, { x:(W.x - W.w/2 + 22) - R.x, y:W.y - R.y, s:24/s });
  setTimeout(()=>{
    isl.to({ w:I.w, h:I.h }, { per:{ w:{ response:.5, damping:.58 }, h:{ response:.4, damping:.55 } } });
    disc.to({ y:R.y }, { response:.58, damping:.72 }).to({ x:R.x, w:s*.92, h:s*.92, r:s, p:0 }, { response:.55, damping:.66 });
    rf.to({ x:0, y:0 }, { response:.6, damping:.74 }).to({ s:1 }, { response:.56, damping:.66 });
  }, 110);
  setTimeout(()=>{ isl.to({ w:0, h:0 }, { response:.3 }); disc.to({ o:0 }, { response:.3 }); }, 900);
  setTimeout(end, 1300);
}

// ---------- 5 · listes : les lignes qui restent glissent à leur nouvelle place, les nouvelles arrivent du bas ----------
const moRowKey = el=>{ const t = el.querySelector(".t"); return t ? t.textContent.trim() : null; };
function moFlipCapture(sel){
  if(!moOn()) return;
  const m = new Map(); qsa(sel).forEach(el=>{ const k = moRowKey(el); if(k && el.offsetParent) m.set(k, el.getBoundingClientRect().top); });
  MO.flip = { sel, m, at:Date.now() };
}
function moFlipPlay(){
  const f = MO.flip; MO.flip = null;
  if(!f || !moOn() || Date.now()-f.at > 2500) return;
  let fresh = 0;
  qsa(f.sel).forEach(el=>{
    const k = moRowKey(el); if(!k || !el.offsetParent) return;
    const top = el.getBoundingClientRect().top;
    if(f.m.has(k)){ const dy = f.m.get(k) - top; if(Math.abs(dy) > 1){ const b = moXform(el, { y:dy }); b.to({ y:0 }, { response:.42, damping:.62 }); b.done().then(()=>moReset(el)); } }
    else { const b = moXform(el, { y:140 + fresh*30, s:.92, o:0 }); const i = fresh++;
      setTimeout(()=>{ b.to({ y:0, s:1, o:1 }, { per:{ y:{ response:.5, damping:.68 }, s:{ response:.45, damping:.55 }, o:{ response:.25 } } }); b.done().then(()=>moReset(el)); }, i*45); }
  });
}

Object.assign(ACT, {
  // l'île : revenir à l'écran du repos (l'anneau ressort de l'île)
  restOpen(){
    if(!restState) return;
    const bar = qs("#restbar"), R = bar && bar.offsetParent ? moRect(bar) : null;
    if(typeof currentTab!=="undefined" && currentTab!=="today") switchTab("today");
    liveFocusIdx = restState.exoIdx; focusAnimDir = null; refreshFocusRegion();
    moIslandOut(R);
  },
});
// page de fin : « Terminé » (closesheet) la replie dans le jour de la semaine
{ const base = ACT.closesheet;
  ACT.closesheet = function(d, el){ if(el && el.closest && el.closest(".cel-ft") && moOn() && qs("#v-today .wk-day.today")) return moCloseCelebration(); return base.apply(this, arguments); }; }
