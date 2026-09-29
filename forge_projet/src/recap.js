// ================= BILAN EN IMAGE (mois / année) =================
// Une image 1080 × 1350 dessinée localement (canvas), à garder ou partager depuis le
// menu de partage d'iOS. Aucune donnée ne quitte le téléphone sans action de l'utilisateur.

let recap = null; // { kind:"month"|"year", key:"2026-09"|"2026" }
function recapPrevKey(kind, key){
  if(kind==="year") return String(+key-1);
  const d = parseISO(key+"-01"); d.setMonth(d.getMonth()-1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}
function recapNextKey(kind, key){
  if(kind==="year") return String(+key+1);
  const d = parseISO(key+"-01"); d.setMonth(d.getMonth()+1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
}
function recapTitle(kind, key){
  if(kind==="year") return `Mon année ${key}`;
  const d = parseISO(key+"-01");
  return MOIS_LONG[d.getMonth()].replace(/^./, c=>c.toUpperCase())+" "+d.getFullYear();
}
function recapDefault(kind){
  const t = todayISO();
  if(kind==="year") return t.slice(0,4);
  // en début de mois, le mois précédent est plus parlant que le mois qui commence
  const cur = t.slice(0,7);
  return S.sessions.some(s=>s.date.startsWith(cur)) && +t.slice(8)>7 ? cur : recapPrevKey("month", cur);
}
function recapStats(kind, key){
  const list = S.sessions.filter(s=>s.date.startsWith(key));
  const prevN = S.sessions.filter(s=>s.date.startsWith(recapPrevKey(kind, key))).length;
  const sets = {}, days = {};
  let volume = 0, dur = 0, nSets = 0, prs = 0;
  list.forEach(s=>{
    volume += sessionVolume(s); dur += s.durationSec||0; prs += sessionPRCount(s);
    const n = sessionSetCount(s); nSets += n; days[s.date] = (days[s.date]||0)+n;
    s.exos.forEach(ex=>{ const c = ex.sets.filter(st=>st.done).length; if(c) sets[ex.exoId] = (sets[ex.exoId]||0)+c; });
  });
  const fav = Object.keys(sets).filter(id=>EXO_MAP[id]).sort((a,b)=>sets[b]-sets[a])[0];
  // meilleure série de semaines consécutives dans la période
  const weeks = Array.from(new Set(list.map(s=>weekKey(s.date)))).sort();
  let streak = 0, run = 0, prevW = null;
  weeks.forEach(w=>{ run = prevW && addDaysISO(prevW,7)===w ? run+1 : 1; streak = Math.max(streak, run); prevW = w; });
  let medals = 0;
  Object.values(S.medals||{}).forEach(m=>Object.values(m.d||{}).forEach(iso=>{ if(iso && localISO(new Date(iso)).startsWith(key)) medals++; }));
  const targets = S.targets.filter(t=>t.doneAt && t.doneAt.startsWith(key) && EXO_MAP[t.exoId]);
  // barres : séries par jour (mois) ou séances par mois (année)
  let bars;
  if(kind==="month"){
    const d0 = parseISO(key+"-01"), nDays = new Date(d0.getFullYear(), d0.getMonth()+1, 0).getDate();
    bars = Array.from({ length:nDays }, (_,i)=>({ v: days[key+"-"+String(i+1).padStart(2,"0")]||0, l: [0,7,14,21,28].includes(i) ? String(i+1) : "" }));
  } else {
    bars = Array.from({ length:12 }, (_,i)=>({ v: list.filter(s=>+s.date.slice(5,7)===i+1).length, l: "JFMAMJJASOND"[i] }));
  }
  return { n:list.length, prevN, volume, dur, nSets, prs, fav, favSets: fav ? sets[fav] : 0, activeDays:Object.keys(days).length, streak, medals, targets, bars };
}

// ---------- dessin ----------
// Dessine un glyphe (mêmes tracés que les icônes de l'app) dans le canvas, sans image
// intermédiaire : chemins, cercles, rectangles et ellipses, en trait ou en plein.
function drawGlyph(ctx, name, x, y, size, color){
  const src = GLYPHS[name] || "";
  ctx.save(); ctx.translate(x, y); ctx.scale(size/24, size/24);
  ctx.strokeStyle = ctx.fillStyle = color || "#fff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const attr = (tag, k)=>{ const m = tag.match(new RegExp("\\s"+k+"=\"([^\"]*)\"")); return m ? m[1] : null; };
  (src.match(/<(path|circle|rect|ellipse)\b[^>]*>/g)||[]).forEach(tag=>{
    const kind = tag.match(/^<(\w+)/)[1], p = new Path2D();
    if(kind==="path") p.addPath(new Path2D(attr(tag,"d")));
    else if(kind==="circle") p.arc(+attr(tag,"cx"), +attr(tag,"cy"), +attr(tag,"r"), 0, Math.PI*2);
    else if(kind==="ellipse") p.ellipse(+attr(tag,"cx"), +attr(tag,"cy"), +attr(tag,"rx"), +attr(tag,"ry"), 0, 0, Math.PI*2);
    else { const rx = +(attr(tag,"rx")||0); if(p.roundRect) p.roundRect(+attr(tag,"x"), +attr(tag,"y"), +attr(tag,"width"), +attr(tag,"height"), rx); else p.rect(+attr(tag,"x"), +attr(tag,"y"), +attr(tag,"width"), +attr(tag,"height")); }
    const stroke = attr(tag,"stroke"), fill = attr(tag,"fill");
    if(stroke && stroke!=="none"){ ctx.lineWidth = +(attr(tag,"stroke-width")||2); ctx.stroke(p); }
    if(fill && fill!=="none") ctx.fill(p);
  });
  ctx.restore();
}
function iconTile(ctx, name, x, y, size, color){
  ctx.fillStyle = color; rrect(ctx, x, y, size, size, size*0.26); ctx.fill();
  drawGlyph(ctx, name, x+size*0.17, y+size*0.17, size*0.66, "#fff");
}
// titres en Geist (police de la marque, embarquée), chiffres en Barlow Semi Condensed ; repli système
function recapFont(w, px, display){ return `${w} ${px}px ${display ? '"Geist ASCEN",' : '"ASCEN Num",'}-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif`; }
function recapFit(ctx, txt, max){
  if(ctx.measureText(txt).width<=max) return txt;
  while(txt.length>1 && ctx.measureText(txt+"…").width>max) txt = txt.slice(0,-1);
  return txt.trim()+"…";
}
function rrect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function fmtHours(sec){ const h = Math.floor(sec/3600), m = Math.round((sec%3600)/60); return h ? `${h} h${m?" "+String(m).padStart(2,"0"):""}` : `${m} min`; }
function drawRecap(kind, key){
  const W = 1080, H = 1350, st = recapStats(kind, key);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  // fond : braise sombre, lueur orange en haut
  const bg = ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#1B1815"); bg.addColorStop(1,"#141210");
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  const glow = ctx.createRadialGradient(W*0.78, 90, 20, W*0.78, 90, 720); glow.addColorStop(0,"rgba(255,107,61,.32)"); glow.addColorStop(1,"rgba(255,107,61,0)");
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  const X = 84, orange = "#FF6B3D", white = "#FFFFFF", mute = "rgba(255,255,255,.62)";
  ctx.textBaseline = "alphabetic";
  // en-tête
  // logotype ASCEN au trait (mêmes tracés que ascenMark)
  ctx.save(); ctx.translate(X-2, 86); ctx.scale(.62, .62); ctx.translate(0, -5);
  ctx.lineWidth = 6.5; ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = white; ctx.stroke(new Path2D(ASCEN_LETTERS)); ctx.strokeStyle = orange; ctx.stroke(new Path2D(ASCEN_BAR));
  ctx.restore();
  ctx.fillStyle = white; ctx.font = recapFont(700, 84, true);
  ctx.fillText(recapFit(ctx, recapTitle(kind, key), W-2*X), X, 224);
  ctx.fillStyle = mute; ctx.font = recapFont(500, 34);
  const who = S.settings.name ? `${S.settings.name}, ` : "";
  const sub = (st.n ? `${who}voici ${kind==="year"?"ton année":"ton mois"} d'entraînement.` : `${who}aucune séance sur cette période.`);
  ctx.fillText(recapFit(ctx, who ? sub : sub.replace(/^./, c=>c.toUpperCase()), W-2*X), X, 280);
  // chiffre principal
  ctx.fillStyle = white; ctx.font = recapFont(800, 210);
  ctx.fillText(String(st.n), X-6, 500);
  const nW = ctx.measureText(String(st.n)).width;
  ctx.font = recapFont(700, 46); ctx.fillText(st.n>=2 ? "séances" : "séance", X+nW+22, 440);
  const diff = st.n-st.prevN;
  if(st.prevN){ // pas de comparaison sans période précédente
    const lbl = diff>0 ? `+${diff} vs ${kind==="year"?"l'an dernier":"le mois dernier"}` : diff<0 ? `−${-diff} vs ${kind==="year"?"l'an dernier":"le mois dernier"}` : `autant que ${kind==="year"?"l'an dernier":"le mois dernier"}`;
    ctx.font = recapFont(700, 30); const tw = ctx.measureText(lbl).width;
    ctx.fillStyle = diff>0 ? "rgba(52,199,89,.2)" : "rgba(255,255,255,.1)"; rrect(ctx, X+nW+22, 462, tw+36, 52, 26); ctx.fill();
    ctx.fillStyle = diff>0 ? "#5BE08A" : mute; ctx.fillText(lbl, X+nW+40, 498);
  }
  // quatre tuiles
  const tiles = [["Temps", fmtHours(st.dur)], ["Séries", fmtNum(st.nSets)], ["Tonnage", st.volume>=10000 ? fmtDec(st.volume/1000)+" t" : fmtNum(st.volume)+" kg"], ["Records", fmtNum(st.prs)]];
  const tw2 = (W-2*X-24)/2, th = 150;
  tiles.forEach(([l,v],i)=>{
    const x = X + (i%2)*(tw2+24), y = 560 + Math.floor(i/2)*(th+24);
    ctx.fillStyle = "rgba(255,255,255,.07)"; rrect(ctx, x, y, tw2, th, 30); ctx.fill();
    ctx.fillStyle = mute; ctx.font = recapFont(600, 30); ctx.fillText(l, x+32, y+54);
    ctx.fillStyle = white; ctx.font = recapFont(800, 58); ctx.fillText(recapFit(ctx, v, tw2-64), x+32, y+122);
  });
  // barres d'activité
  const cy = 1024, ch = 96, cw = W-2*X, n = st.bars.length, gap = kind==="year" ? 16 : 6;
  const bw = (cw-gap*(n-1))/n, max = Math.max(1, ...st.bars.map(b=>b.v));
  st.bars.forEach((b,i)=>{
    const x = X + i*(bw+gap), h = b.v ? Math.max(10, b.v/max*ch) : 6;
    const g = ctx.createLinearGradient(0, cy-h, 0, cy); g.addColorStop(0,"#FFB300"); g.addColorStop(1,"#FF6A1A");
    ctx.fillStyle = b.v ? g : "rgba(255,255,255,.12)"; rrect(ctx, x, cy-h, bw, h, Math.min(bw/2, h/2, 8)); ctx.fill();
    if(b.l){ ctx.fillStyle = mute; ctx.font = recapFont(600, 24); ctx.textAlign = kind==="year" ? "center" : "left"; ctx.fillText(b.l, kind==="year" ? x+bw/2 : x, cy+38); ctx.textAlign = "left"; }
  });
  // points forts
  const hl = [];
  const short = id=>EXO_MAP[id].n.replace(/\s*\([^)]*\)/g, "");
  if(st.fav) hl.push(["dumbbell", IOS_COL.orange, `Favori : ${short(st.fav)} · ${nb(st.favSets,"série")}`]);
  if(st.targets.length) hl.push(["target", IOS_COL.red, st.targets.length>1 ? `${st.targets.length} objectifs atteints` : `Objectif atteint : ${short(st.targets[0].exoId)}, ${fmtTarget(st.targets[0].kind, st.targets[0].value)}`]);
  if(st.streak>=2) hl.push(["flame", IOS_COL.red, `${st.streak} semaines d'affilée`]);
  if(st.medals) hl.push(["medal", IOS_COL.yellow, `${nb(st.medals,"trophée")} débloqué${st.medals>=2?"s":""}`]);
  if(hl.length<3 && st.activeDays) hl.push(["calendar", IOS_COL.blue, `${nb(st.activeDays,"jour")} d'entraînement`]);
  ctx.font = recapFont(600, 34); ctx.fillStyle = white;
  hl.slice(0,3).forEach(([g, c, t],i)=>{ const y = 1128+i*54; iconTile(ctx, g, X, y-32, 40, c); ctx.fillStyle = white; ctx.font = recapFont(600, 34); ctx.fillText(recapFit(ctx, t, W-2*X-58), X+58, y); });
  // pied
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = recapFont(500, 26);
  ctx.fillText("ASCEN · musculation à la maison", X, H-50);
  return cv;
}

// ---------- feuille ----------
function recapBodyHTML(){
  const { kind, key } = recap;
  const next = recapNextKey(kind, key), canNext = next<=todayISO().slice(0, kind==="year"?4:7);
  const first = S.sessions.length ? S.sessions[0].date.slice(0, kind==="year"?4:7) : key;
  const canPrev = recapPrevKey(kind, key)>=first;
  return `${segHTML("recap", [["month","Mois"],["year","Année"]], kind, "recapKind")}
    <div class="rc-nav"><button class="icon-btn" data-a="recapStep" data-d="-1" aria-label="Période précédente" ${canPrev?"":"disabled"}>${icon("chev")}</button>
      <b>${esc(recapTitle(kind, key))}</b>
      <button class="icon-btn" data-a="recapStep" data-d="1" aria-label="Période suivante" ${canNext?"":"disabled"}>${icon("chev")}</button></div>
    ${rwCoverHTML(kind, key)}
    <div class="te-sec rc-sec">Image à partager</div>
    <div class="rc-img"><img id="rcImg" alt="Bilan ${esc(recapTitle(kind, key))}"></div>`;
}
function rwCoverHTML(kind, key){
  const st = recapStats(kind, key);
  return `<button class="rw-cover" data-a="openRewind" data-kind="${kind}" data-key="${key}" ${st.n?"":"disabled"}>
    <span class="rwc-bg"></span>
    <span class="rwc-k">ASCEN Rewind</span>
    <span class="rwc-t">${esc(recapTitle(kind, key))}</span>
    <span class="rwc-s">${st.n ? `${nb(st.n,"séance")} · ${fmtHours(st.dur)}` : "Aucune séance sur cette période"}</span>
    <span class="rwc-play">${icon("play")}</span>
  </button>`;
}
function paintRecap(){
  const img = qs("#rcImg"); if(!img) return;
  const cv = drawRecap(recap.kind, recap.key);
  img.src = cv.toDataURL("image/png");
  img.classList.remove("in"); void img.offsetWidth; img.classList.add("in");
}
function openRecap(kind, key){
  recap = { kind: kind||"month", key: key || recapDefault(kind||"month") };
  if(recap.kind==="month") S.meta.recapSeen = recap.key; // la suggestion de l'accueil disparaît
  save();
  openSheet(`<div class="sheet-hd"><span class="t">Rewind</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body" id="rcBody">${recapBodyHTML()}</div>`,
    { tall:true, footer:`<button class="btn secondary" data-a="recapShare">Enregistrer ou partager l'image</button>` });
  settleSegs(qs("#rcBody"));
  requestAnimationFrame(paintRecap);
}
function refreshRecap(){ const b = qs("#rcBody"); if(b){ b.innerHTML = recapBodyHTML(); settleSegs(b); paintRecap(); } }
// suggestion discrète sur l'accueil pendant la première semaine d'un nouveau mois
function recapNudgeKey(){
  const t = todayISO(); if(+t.slice(8)>7) return null;
  const prev = recapPrevKey("month", t.slice(0,7));
  if(S.meta.recapSeen===prev || S.sessions.filter(s=>s.date.startsWith(prev)).length<2) return null;
  return prev;
}
Object.assign(ACT, {
  openRecap(d){ openRecap(d && d.kind, d && d.key); },
  recapKind(d){ if(recap.kind===d.v) return; recap = { kind:d.v, key:recapDefault(d.v) }; refreshRecap(); },
  recapStep(d){ recap.key = +d.d>0 ? recapNextKey(recap.kind, recap.key) : recapPrevKey(recap.kind, recap.key); refreshRecap(); sfx("seg"); },
  recapLater(){ S.meta.recapSeen = recapNudgeKey(); changed(); },
  async recapShare(){
    const cv = drawRecap(recap.kind, recap.key);
    const name = `ascen-bilan-${recap.key}.png`;
    const blob = await new Promise(r=>cv.toBlob(r, "image/png"));
    if(!blob) return toast("Impossible de créer l'image");
    try{
      const file = new File([blob], name, { type:"image/png" });
      if(navigator.canShare && navigator.canShare({ files:[file] })){ await navigator.share({ files:[file], title:recapTitle(recap.kind, recap.key) }); return; }
    }catch(e){ if(e && e.name==="AbortError") return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    toast("Image enregistrée");
  },
});
