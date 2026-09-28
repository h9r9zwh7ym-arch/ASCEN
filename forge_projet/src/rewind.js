// ================= REWIND : le bilan animé (mois / année) =================
// Diaporama plein écran façon « story » : on rembobine la période (la date défile à
// l'envers), puis chaque écran raconte un chiffre avec une animation. Toucher à droite
// pour avancer, à gauche pour revenir, maintenir pour mettre en pause, glisser vers le
// bas pour fermer. Le dernier écran propose l'image récapitulative à partager.

const RW_DUR = 5600; // durée d'un écran (ms)
let rw = null;

// ---------- données complémentaires ----------
function rewindData(kind, key){
  const st = recapStats(kind, key);
  const list = S.sessions.filter(s=>s.date.startsWith(key));
  const sets = {}, wd = [0,0,0,0,0,0,0];
  let morning = 0, timed = 0;
  list.forEach(s=>{
    wd[parseISO(s.date).getDay()]++;
    const h = startHour(s); if(h!=null){ timed++; if(h<12) morning++; }
    s.exos.forEach(ex=>{ const c = ex.sets.filter(x=>x.done).length; if(c && EXO_MAP[ex.exoId]) sets[ex.exoId] = (sets[ex.exoId]||0)+c; });
  });
  const top = Object.keys(sets).sort((a,b)=>sets[b]-sets[a]).slice(0,3).map(id=>({ def:EXO_MAP[id], n:sets[id] }));
  // meilleurs records de la période : plus forte charge par exercice
  const prs = {};
  list.forEach(s=>s.exos.forEach(ex=>ex.sets.forEach(x=>{ if(!x.pr) return; const d = EXO_MAP[ex.exoId]; if(!d) return;
    const cur = prs[ex.exoId]; if(!cur || (x.weight||0)>(cur.weight||0) || ((x.weight||0)===(cur.weight||0) && x.reps>cur.reps)) prs[ex.exoId] = { def:d, weight:x.weight, reps:x.reps }; })));
  const bestDay = wd.indexOf(Math.max(...wd));
  const medals = [];
  Object.keys(S.medals||{}).forEach(id=>{ const m = MEDAL_MAP[id]; if(!m) return; Object.entries(S.medals[id].d||{}).forEach(([k, iso])=>{ if(iso && localISO(new Date(iso)).startsWith(key)) medals.push({ m, tier:+k }); }); });
  // un trophée n'apparaît qu'une fois, à son meilleur palier de la période
  const bestOf_ = {}; medals.forEach(x=>{ if(!bestOf_[x.m.id] || x.tier>bestOf_[x.m.id].tier) bestOf_[x.m.id] = x; });
  medals.length = 0; Object.values(bestOf_).forEach(x=>medals.push(x));
  medals.sort((a,b)=>(b.m.secret?9:b.tier)-(a.m.secret?9:a.tier));
  // jours actifs (mois) ou séances par mois (année) pour la frise
  let days = null;
  if(kind==="month"){ const d0 = parseISO(key+"-01"), n = new Date(d0.getFullYear(), d0.getMonth()+1, 0).getDate(), set = new Set(list.map(s=>+s.date.slice(8)));
    days = { first:(d0.getDay()+6)%7, n, on:set }; }
  return Object.assign(st, { list, top, prs:Object.values(prs).sort((a,b)=>(b.weight||0)-(a.weight||0)).slice(0,3), bestDay: list.length ? bestDay : -1,
    morningPct: timed ? Math.round(morning/timed*100) : null, medalList:medals.slice(0,6), days });
}
function tonnageCompare(kg){
  const refs = [[6000,"éléphant","éléphants"],[1200,"voiture","voitures"],[300,"piano à queue","pianos à queue"],[80,"machine à laver","machines à laver"]];
  const r = refs.find(([w])=>kg>=w*1.5) || refs[refs.length-1];
  const n = Math.max(1, Math.round(kg/r[0]));
  return `${n>=2 ? `${fmtNum(n)} ${r[2]}` : `un ${r[1]}`}`;
}
const JOURS_PLURIEL = ["dimanches","lundis","mardis","mercredis","jeudis","vendredis","samedis"];

// ---------- écrans ----------
function rwSlides(kind, key){
  const d = rewindData(kind, key), per = kind==="year" ? "cette année" : "ce mois-ci";
  const prevLbl = kind==="year" ? `${+key-1}` : MOIS_LONG[parseISO(recapPrevKey("month", key)+"-01").getMonth()];
  const slides = [];
  slides.push({ bg:"ember", html:`<div class="rw-kicker">Forge Rewind</div>
    <div class="rw-tape" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M22 12 6 24l16 12Z"/><path d="M42 12 26 24l16 12Z"/></svg></div>
    <div class="rw-date" id="rwDate">${esc(fmtDate(todayISO(),"long"))}</div>
    <div class="rw-sub rw-d2" id="rwSub">On rembobine…</div>`, intro:true });
  if(!d.n){
    slides.push({ bg:"night", html:`<div class="rw-label">${esc(recapTitle(kind, key))}</div><div class="rw-big">0</div><div class="rw-unit">séance</div>
      <p class="rw-note rw-d2">Pas de séance sur cette période. La prochaine compte déjà pour le Rewind suivant.</p>` });
    return { slides, d };
  }
  // séances
  const diff = d.n-d.prevN;
  const cal = kind==="month" && d.days
    ? `<div class="rw-cal">${Array.from({ length:d.days.first }, ()=>`<i class="pad"></i>`).join("")}${Array.from({ length:d.days.n }, (_,i)=>`<i class="${d.days.on.has(i+1)?"on":""}" style="--k:${i}"></i>`).join("")}</div>`
    : `<div class="rw-bars">${d.bars.map((b,i)=>`<div><span style="--h:${Math.round(b.v/Math.max(1,...d.bars.map(x=>x.v))*100)}%;--k:${i}"></span><small>${b.l}</small></div>`).join("")}</div>`;
  slides.push({ bg:"ember", html:`<div class="rw-label">${kind==="year"?"Cette année":"Ce mois-ci"}, tu as fait</div>
    <div class="rw-big" data-to="${d.n}">0</div><div class="rw-unit">séance${d.n>=2?"s":""}</div>
    ${d.prevN ? `<div class="rw-chip ${diff>0?"up":""} rw-d2">${diff>0?`+${diff}`:diff<0?`−${-diff}`:"Autant"} par rapport à ${esc(prevLbl)}</div>` : ""}
    ${cal}` });
  // temps
  if(d.dur){
    const h = d.dur/3600, matches = Math.round(d.dur/5400);
    slides.push({ bg:"teal", html:`<div class="rw-label">Temps passé à t'entraîner</div>
      <div class="rw-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><circle class="p" cx="60" cy="60" r="52" style="--p:${Math.min(1, h/(kind==="year"?100:12)).toFixed(3)}"/></svg>
        <div><div class="rw-big sm" data-to="${round1(h)}" data-dec="${h<10?1:0}">0</div><div class="rw-unit">heures</div></div></div>
      ${matches>=1 ? `<p class="rw-note rw-d2">Soit la durée de <b>${nb(matches,"match")}</b> de foot.</p>` : `<p class="rw-note rw-d2">Chaque minute compte.</p>`}` });
  }
  // tonnage
  if(d.volume>=50){
    slides.push({ bg:"violet", html:`<div class="rw-label">Au total, tu as soulevé</div>
      <div class="rw-big" data-to="${Math.round(d.volume)}">0</div><div class="rw-unit">kilos</div>
      <div class="rw-plates" aria-hidden="true">${Array.from({ length:Math.min(8, Math.max(3, Math.round(Math.log10(d.volume)*2))) }, (_,i)=>`<i style="--k:${i}"></i>`).join("")}</div>
      <p class="rw-note rw-d2">Autant que <b>${tonnageCompare(d.volume)}</b>.</p>` });
  }
  // exercice favori
  if(d.top.length){
    const f = d.top[0];
    slides.push({ bg:"green", html:`<div class="rw-label">Ton exercice favori</div>
      <div class="rw-stage r-${regionOf(f.def)}">${exoAnimSVG(f.def)}</div>
      <div class="rw-title">${esc(f.def.n.replace(/\s*\([^)]*\)/g,""))}</div>
      <div class="rw-unit">${nb(f.n,"série")}</div>
      ${d.top.length>1 ? `<div class="rw-list rw-d3">${d.top.slice(1).map((t,i)=>`<div style="--k:${i}"><b>${i+2}</b>${esc(t.def.n.replace(/\s*\([^)]*\)/g,""))}<span>${nb(t.n,"série")}</span></div>`).join("")}</div>` : ""}` });
  }
  // records & objectifs
  if(sessionsPRs(d.list) || d.targets.length){
    slides.push({ bg:"ember", html:`<div class="rw-label">Records personnels</div>
      <div class="rw-bolt" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS.bolt}</svg></div>
      <div class="rw-big sm" data-to="${sessionsPRs(d.list)}">0</div><div class="rw-unit">record${sessionsPRs(d.list)>=2?"s":""} battu${sessionsPRs(d.list)>=2?"s":""}</div>
      ${d.prs.length ? `<div class="rw-list rw-d3">${d.prs.map((p,i)=>`<div style="--k:${i}">${exoIcon(p.def,"sm")}${esc(p.def.n.replace(/\s*\([^)]*\)/g,""))}<span>${p.reps}${loadSuffix(p.def, p.weight)}</span></div>`).join("")}</div>` : ""}
      ${d.targets.length ? `<div class="rw-chip up rw-d3">${ii("target")} ${d.targets.length>1 ? `${d.targets.length} objectifs atteints` : "1 objectif atteint"}</div>` : ""}` });
  }
  // habitudes
  const habits = [];
  if(d.streak>=2) habits.push([ "flame", `<b>${d.streak} semaines</b> d'affilée`]);
  if(d.bestDay>=0) habits.push([ "calendar", `Ton jour préféré : les <b>${JOURS_PLURIEL[d.bestDay]}</b>`]);
  if(d.morningPct!=null) habits.push([ d.morningPct>=50 ? "sunrise" : "moon", d.morningPct>=50 ? `Plutôt du matin : <b>${d.morningPct} %</b> avant midi` : `Plutôt l'après-midi ou le soir : <b>${100-d.morningPct} %</b>`]);
  habits.push([ "person", `<b>${nb(d.activeDays,"jour")}</b> d'entraînement`]);
  slides.push({ bg:"blue", html:`<div class="rw-label">Tes habitudes</div>
    <div class="rw-habits">${habits.map(([g,t],i)=>`<div style="--k:${i}">${sfIcon(g, ["red","blue","orange","green"][i%4])}<span>${t}</span></div>`).join("")}</div>` });
  // trophées
  if(d.medalList.length){
    slides.push({ bg:"gold", html:`<div class="rw-label">Trophées débloqués</div>
      <div class="rw-big sm" data-to="${d.medals}">0</div><div class="rw-unit">${d.medals>=2?"paliers gagnés":"palier gagné"}</div>
      <div class="rw-medals">${d.medalList.map((x,i)=>`<div style="--k:${i}">${medalHTML(x.m, x.tier)}<small>${esc(x.m.secret?x.m.n:x.m.n)}</small></div>`).join("")}</div>` });
  }
  // fin
  slides.push({ bg:"ember", outro:true, html:`<div class="rw-label">${esc(recapTitle(kind, key))}</div>
    <div class="rw-card"><img id="rwImg" alt="Résumé ${esc(recapTitle(kind, key))}"></div>
    <div class="rw-actions">
      <button class="btn" data-a="rwShare">Partager l'image</button>
      <button class="btn secondary" data-a="rwReplay">${icon("repeat")} Revoir</button>
    </div>` });
  return { slides, d };
}
function sessionsPRs(list){ return list.reduce((t,s)=>t+sessionPRCount(s), 0); }

// ---------- lecteur ----------
function openRewind(kind, key){
  kind = kind||"month"; key = key||recapDefault(kind);
  closeSheet();
  const { slides } = rwSlides(kind, key);
  let el = qs("#rewind"); if(el) el.remove();
  el = document.createElement("div"); el.id = "rewind"; el.setAttribute("role","dialog"); el.setAttribute("aria-label","Rewind");
  el.innerHTML = `<div class="rw-bgs"><i></i><i></i><i></i></div>
    <div class="rw-top"><div class="rw-prog">${slides.map(()=>`<span><i></i></span>`).join("")}</div>
      <button class="rw-x" data-a="rwClose" aria-label="Fermer">${icon("close")}</button></div>
    <div class="rw-stage-wrap" id="rwStage"></div>`;
  document.body.appendChild(el);
  rw = { kind, key, slides, i:-1, t:0, last:0, paused:false, raf:0, el };
  requestAnimationFrame(()=>el.classList.add("show"));
  if(kind==="month") { S.meta.recapSeen = key; save(); }
  rwGo(0);
  rw.raf = requestAnimationFrame(rwTick);
  bindRewindGestures(el);
}
function rwGo(i){
  if(!rw) return;
  i = Math.max(0, Math.min(rw.slides.length-1, i));
  const sl = rw.slides[i], stage = qs("#rwStage", rw.el);
  const old = qs(".rw-slide", stage);
  if(old){ old.classList.add("out", i<rw.i ? "back" : "fwd"); setTimeout(()=>old.remove(), 380); }
  const n = document.createElement("div");
  n.className = "rw-slide" + (i<rw.i ? " from-back" : "");
  n.innerHTML = `<div class="rw-in">${sl.html}</div>`;
  stage.appendChild(n);
  rw.el.dataset.bg = sl.bg;
  rw.i = i; rw.t = 0;
  qsa(".rw-prog span", rw.el).forEach((s,k)=>{ s.classList.toggle("done", k<i); s.classList.toggle("cur", k===i); qs("i", s).style.transform = `scaleX(${k<i?1:0})`; });
  requestAnimationFrame(()=>n.classList.add("in"));
  rwCounts(n);
  if(sl.intro) rwRewindDate(n);
  if(sl.outro){ const img = qs("#rwImg", n); if(img){ img.src = drawRecap(rw.kind, rw.key).toDataURL("image/png"); } sfx("medal"); confettiBurst(null, innerHeight*0.25, 90); }
  if(i>0 && !sl.outro) sfx("seg");
}
function rwTick(now){
  if(!rw) return;
  const dt = rw.last ? Math.min(100, now-rw.last) : 0; rw.last = now;
  const sl = rw.slides[rw.i];
  if(!rw.paused && !sl.outro){
    rw.t += dt;
    const dur = sl.intro ? 3400 : RW_DUR;
    const bar = qs(`.rw-prog span:nth-child(${rw.i+1}) i`, rw.el);
    if(bar) bar.style.transform = `scaleX(${Math.min(1, rw.t/dur).toFixed(4)})`;
    if(rw.t>=dur) rwGo(rw.i+1);
  }
  rw.raf = requestAnimationFrame(rwTick);
}
function closeRewind(){
  if(!rw) return;
  cancelAnimationFrame(rw.raf);
  const el = rw.el; rw = null;
  el.classList.remove("show"); el.classList.add("closing");
  setTimeout(()=>el.remove(), 350);
}
// compteurs animés (data-to, data-dec)
function rwCounts(root){
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  qsa("[data-to]", root).forEach(el=>{
    const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec||0);
    const f = v=>dec ? v.toLocaleString("fr-CH",{ minimumFractionDigits:dec, maximumFractionDigits:dec }) : fmtNum(v);
    if(reduce){ el.textContent = f(to); return; }
    const t0 = performance.now()+260, dur = 1300;
    (function step(t){ const p = Math.max(0, Math.min(1, (t-t0)/dur)), e = 1-Math.pow(1-p, 4); el.textContent = f(to*e); if(p<1 && el.isConnected) requestAnimationFrame(step); })(performance.now());
  });
}
// le « rembobinage » : la date recule jour par jour jusqu'au début de la période
function rwRewindDate(root){
  const dateEl = qs("#rwDate", root), sub = qs("#rwSub", root);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const end = rw.kind==="year" ? rw.key+"-01-01" : rw.key+"-01", start = todayISO() < end ? end : todayISO();
  const total = Math.max(1, daysBetween(end, start)), t0 = performance.now()+350, dur = reduce ? 0 : Math.min(2200, 900+total*6);
  const kind = rw.kind, key = rw.key, name = S.settings.name;
  root.classList.add("rewinding");
  (function step(t){
    if(!dateEl.isConnected) return;
    const p = dur ? Math.max(0, Math.min(1, (t-t0)/dur)) : 1, e = p<.5 ? 2*p*p : 1-Math.pow(-2*p+2, 2)/2;
    dateEl.textContent = fmtDate(addDaysISO(start, -Math.round(total*e)), "long");
    if(p<1){ requestAnimationFrame(step); return; }
    root.classList.remove("rewinding"); root.classList.add("landed");
    dateEl.textContent = recapTitle(kind, key);
    if(sub) sub.textContent = name ? `${name}, voici ce que tu as accompli.` : "Voici ce que tu as accompli.";
    haptic(20);
  })(performance.now());
}
function bindRewindGestures(el){
  let down = null, holdT = 0;
  el.addEventListener("pointerdown", e=>{
    if(e.target.closest("button,a")) return;
    down = { x:e.clientX, y:e.clientY, t:performance.now() };
    holdT = setTimeout(()=>{ if(rw){ rw.paused = true; el.classList.add("paused"); } }, 220);
  });
  el.addEventListener("pointermove", e=>{
    if(!down) return;
    const dy = e.clientY-down.y;
    if(dy>12){ clearTimeout(holdT); el.style.transform = `translateY(${dy}px) scale(${1-Math.min(dy,300)/2400})`; el.style.transition = "none"; }
  });
  const up = e=>{
    if(!down || !rw) return; clearTimeout(holdT);
    const dy = e.clientY-down.y, dx = e.clientX-down.x, held = performance.now()-down.t > 220;
    el.style.transition = ""; el.style.transform = "";
    const was = rw.paused; rw.paused = false; el.classList.remove("paused");
    down = null;
    if(dy>110){ closeRewind(); return; }
    if(held && was) return; // on relâche après une pause
    if(Math.abs(dx)>60){ rwGo(rw.i + (dx<0 ? 1 : -1)); return; }
    if(e.clientX < innerWidth*0.3) rwGo(rw.i-1); else if(!rw.slides[rw.i].outro) rwGo(rw.i+1);
  };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", ()=>{ clearTimeout(holdT); down = null; if(rw){ rw.paused = false; el.classList.remove("paused"); } el.style.transform = ""; });
}
document.addEventListener("keydown", e=>{
  if(!rw) return;
  if(e.key==="Escape") closeRewind();
  else if(e.key==="ArrowRight") rwGo(rw.i+1);
  else if(e.key==="ArrowLeft") rwGo(rw.i-1);
});
Object.assign(ACT, {
  openRewind(d){ openRewind((d && d.kind) || (typeof recap!=="undefined" && recap ? recap.kind : "month"), (d && d.key) || (typeof recap!=="undefined" && recap ? recap.key : undefined)); },
  rwClose(){ closeRewind(); },
  rwReplay(){ if(rw) rwGo(0); },
  rwShare(){ if(!rw) return; recap = { kind:rw.kind, key:rw.key }; ACT.recapShare(); },
});
