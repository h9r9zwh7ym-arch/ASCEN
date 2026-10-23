// ================= SÉANCE SUR MESURE =================
// On dit ce qu'on veut (matériel, zone, type, durée) ; l'app réfléchit vraiment : elle relit ta semaine
// (stimulus par muscle, récupération), essaie des dizaines de combinaisons, les note, garde la meilleure,
// puis règle charges et répétitions comme pour toute séance (fatigue selon la place, manière de faire).
// La séance devient la proposition du jour : « Ajuster » permet d'en remplacer ou retirer un exercice.

const TAILOR = {
  equip: [["none","Sans matériel"],["all","Mon matériel"],["loaded","Charges"]],
  zone:  [["full","Tout le corps"],["haut","Haut du corps"],["bas","Bas du corps"],["bras","Bras"],["push","Pecs & épaules"],["pull","Dos"],["core","Abdos"]],
  kind:  [["renfo","Renforcement"],["mix","Renfo + cardio"],["cardio","Cardio"],["mobilite","Mobilité"]],
  len:   [["court","Court"],["moyen","Normal"],["long","Long"]],
};
const TAILOR_MIN = { court:20, moyen:40, long:60 };   // minutes visées
const TAILOR_LEN_TXT = { court:"≈ 20 min", moyen:"≈ 40 min", long:"≈ 60 min" };
const tailorOpt = (k, v)=>(TAILOR[k].find(x=>x[0]===v) || TAILOR[k][0]);
function tailorSpec(){
  const t = S.settings.tailor && typeof S.settings.tailor==="object" ? S.settings.tailor : {}, o = {};
  Object.keys(TAILOR).forEach(k=>{ o[k] = tailorOpt(k, t[k])[0]; });
  if(!t.len) o.len = S.goals.sessionLength==="court" || S.goals.sessionLength==="long" ? S.goals.sessionLength : "moyen";
  if(!t.equip) o.equip = "all";
  return o;
}
const ownsLoad = ()=>availableExos().some(e=>exoKind(e)==="loaded");
function tailorName(spec){
  return spec.kind==="renfo" ? tailorOpt("zone", spec.zone)[1] : spec.kind==="mix" ? tailorOpt("zone", spec.zone)[1]+" + cardio" : tailorOpt("kind", spec.kind)[1];
}
function tailorTag(spec){ return "Sur mesure" + (spec.equip==="none" ? " · sans matériel" : spec.equip==="loaded" ? " · charges" : ""); }

// ---------- les exercices possibles ----------
function tailorPool(spec){
  const lvl = e=>levelOK(e);
  let base = availableExos().filter(lvl);
  if(spec.equip==="none") base = base.filter(e=>e.equip.every(q=>q==="bodyweight"));
  const zoneM = spec.zone==="full" ? null : spec.zone==="core" ? ["abdos"] : SESSION_TYPE_MAP[spec.zone] ? SESSION_TYPE_MAP[spec.zone].muscles : null;
  const inZone = e=>!zoneM || zoneM.includes(e.muscles[0]) || (spec.zone==="core" && e.pattern==="core");
  if(spec.kind==="mobilite"){
    // étirements et Pilates (sol, au poids du corps) des zones demandées
    const st = base.filter(e=>isStretch(e) || (e.pattern==="core" && e.equip.every(q=>q==="bodyweight") && !e.muscles.includes("cardio") && e.level<3));
    const z = st.filter(e=>!zoneM || e.muscles.some(m=>zoneM.includes(m)));
    return z.length>=4 ? z : st;
  }
  base = base.filter(e=>!isStretch(e));
  const cardio = base.filter(e=>e.muscles.includes("cardio"));
  if(spec.kind==="cardio") return cardio.length>=3 ? cardio : base.filter(e=>e.pattern==="core");
  let renfo = base.filter(e=>e.muscles[0]!=="cardio");
  if(spec.equip==="loaded"){ const l = renfo.filter(e=>exoKind(e)==="loaded"); if(l.length>=3) renfo = l.concat(renfo.filter(e=>e.pattern==="core" && exoKind(e)!=="cardio").slice(0,3)); }
  const z = renfo.filter(inZone);
  const pool = z.length>=3 ? z : renfo.filter(e=>!zoneM || e.muscles.some(m=>zoneM.includes(m)));
  return spec.kind==="mix" ? pool.concat(cardio.filter(e=>!pool.includes(e))) : pool;
}

// ---------- ce que l'app sait de ta semaine ----------
function tailorContext(){
  const vol = {}; (typeof muscleVolume==="function" ? muscleVolume(7) : []).forEach(r=>{ vol[r.id] = r; });
  const rec = {}; Object.keys(MUSCLE_MAP).forEach(m=>{ rec[m] = daysSinceTrained(m); });
  const low = Object.values(vol).filter(r=>r.sets<STIM.min && S.sessions.length).sort((a,b)=>a.sets-b.sets);
  const tired = Object.keys(rec).filter(m=>rec[m]<2 && m!=="cardio");
  return { vol, rec, low, tired };
}

// ---------- une combinaison, et sa note ----------
// deux variantes d'un même mouvement font doublon : même famille (« squat_… ») ou même nom de départ
// (« Marche du fermier » et « Marche du fermier kettlebell ») ; chaque étirement est le sien
function tailorFams(e){ if(isStretch(e)) return [e.id]; return [exoFamily(e), normName(e.n).split(" ").slice(0, 2).join(" ")]; }
// tirage glouton pondéré : à chaque emplacement du plan, un exercice parmi les meilleurs, au hasard selon
// leur score (les combinaisons varient d'un essai à l'autre, les bons exercices reviennent plus souvent)
function tailorDraw(spec, pool, n, ctx){
  const want = spec.kind==="cardio" || spec.kind==="mobilite";
  const sc = e=>{
    let s = (want ? 1 : goalValue(e))*3 + (isIncluded(e.id) ? 1.5 : 0) - recencyPenalty(e.id)*.6;
    if(!want){ const r = ctx.vol[e.muscles[0]]; if(r) s += 1.6*Math.max(0, STIM.min - r.sets)/STIM.min; if(ctx.rec[e.muscles[0]]<2) s -= 2.5; }
    return s + Math.random()*1.4;
  };
  const scores = new Map(pool.map(e=>[e, sc(e)])), out = [], fam = new Set(), mN = {};
  const dup = e=>tailorFams(e).some(f=>fam.has(f));
  const plan = spec.kind==="renfo" || spec.kind==="mix" ? (SESSION_PLANS[spec.zone==="core" ? "core" : spec.zone] || SESSION_PLANS.full) : null;
  const pick = (cand, i)=>{
    if(!cand.length) return null;
    const adj = e=>scores.get(e) - (dup(e) ? 4 : 0) - (mN[e.muscles[0]]||0)*1.8;
    const top = cand.map(e=>[e, adj(e)]).sort((a,b)=>b[1]-a[1]).slice(0, 4);
    const w = top.map(([,v])=>Math.exp(v - top[0][1])), tot = w.reduce((a,b)=>a+b, 0);
    let r = Math.random()*tot; for(let k=0;k<top.length;k++){ r -= w[k]; if(r<=0) return top[k][0]; }
    return top[0][0];
  };
  const take = e=>{ out.push(e); tailorFams(e).forEach(f=>fam.add(f)); mN[e.muscles[0]] = (mN[e.muscles[0]]||0)+1; };
  const isC = e=>e.muscles.includes("cardio");
  for(let i=0; out.length<n && i<n*3; i++){
    let cand = pool.filter(e=>!out.includes(e));
    if(spec.kind==="mix") cand = cand.filter(e=>(i%3===2) === isC(e)).length ? cand.filter(e=>(i%3===2) === isC(e)) : cand;
    if(spec.kind==="mobilite"){ const s = cand.filter(e=>isStretch(e) === (out.length%3!==2)); if(s.length) cand = s; }
    const slot = plan && spec.kind==="renfo" ? plan[out.length] : null;
    if(slot){ const s = cand.filter(e=>(!slot.p || slot.p.includes(e.pattern)) && (!slot.m || slot.m.includes(e.muscles[0]))); if(s.length) cand = s; }
    const e = pick(cand, i); if(!e) break; take(e);
  }
  return out;
}
function tailorSets(spec, e){
  if(spec.kind==="mobilite") return isStretch(e) ? 1 : 2;
  if(spec.kind==="cardio" || (spec.kind==="mix" && e.muscles.includes("cardio"))) return spec.len==="long" ? 4 : 3;
  return spec.len==="court" ? Math.min(3, e.sets) : e.sets;
}
function tailorMinutes(spec, exos){ return estimateMinutes({ exos:exos.map(e=>({ exoId:e.id, sets:new Array(tailorSets(spec, e)).fill(0) })) }); }
function tailorScore(spec, exos, ctx){
  if(!exos.length) return { v:-1e9 };
  const want = spec.kind==="cardio" || spec.kind==="mobilite";
  const prim = exos.map(e=>e.muscles[0]), distinct = new Set(prim).size;
  const value = exos.reduce((t,e)=>t + (want ? 1 : goalValue(e)), 0)/exos.length;          // ce que la séance apporte à l'objectif
  const need = want ? 0 : exos.reduce((t,e)=>{ const r = ctx.vol[e.muscles[0]]; return t + (r ? Math.max(0, STIM.min - r.sets)/STIM.min : 0); }, 0);   // muscles en retard cette semaine
  const tired = want ? 0 : prim.filter(m=>ctx.rec[m]<2).length;                               // muscles pas encore récupérés
  const fams = exos.length - new Set(exos.map(e=>tailorFams(e).join("|"))).size;
  const min = tailorMinutes(spec, exos), gap = Math.abs(min - TAILOR_MIN[spec.len]);
  const multi = exos.slice(0, 3).filter(e=>e.muscles.length>=3).length;                       // polyarticulaires en tête
  const v = value*6 + need*1.2 - tired*2.2 + distinct*.7 - fams*2.5 - gap/4 + multi*.4;
  return { v, value, need, tired, distinct, min };
}
// ordre : gros mouvements d'abord, gainage, mollets et cardio à la fin (étirements tout à la fin)
function tailorOrder(spec, exos){
  if(spec.kind==="mobilite") return exos.slice().sort((a,b)=>(isStretch(a)?1:0)-(isStretch(b)?1:0));
  if(spec.kind==="cardio") return exos;
  const late = e=>(e.muscles.includes("cardio") && spec.kind!=="mix" ? 3 : 0) + (PATTERN_LATE[e.pattern]||0);
  return exos.map((e,i)=>({ e, k:late(e)*100 - e.muscles.length + i*.01 })).sort((a,b)=>a.k-b.k).map(x=>x.e);
}
const tailorWait = ms=>new Promise(r=>setTimeout(r, ms));
// la réflexion, en vrai et par étapes (onStep(i, texte) à chaque étape, pour l'animation) ; renvoie la séance
async function tailorGenerate(spec, onStep, opts){
  opts = opts || {}; const pace = opts.fast ? 0 : 1, t0 = performance.now();
  const step = async (i, txt, ms)=>{ if(onStep) onStep(i, txt); if(pace) await tailorWait(ms); };
  // 1. ta semaine
  const ctx = tailorContext();
  const lowTxt = ctx.low.length ? `${ctx.low.slice(0,2).map(r=>r.n.toLowerCase()).join(" et ")} en retard cette semaine` : S.sessions.length ? "ta semaine est équilibrée" : "première séance : on part en douceur";
  await step(0, lowTxt, 520);
  // 2. combinaisons
  const pool = tailorPool(spec);
  let n = Math.max(3, Math.min(spec.kind==="mobilite" ? 14 : 10, Math.round(TAILOR_MIN[spec.len]/(spec.kind==="mobilite" ? 3.2 : 7))));
  const tries = [];
  for(let batch=0; batch<6; batch++){
    for(let k=0;k<8;k++){
      // la taille varie un peu autour de la cible : la durée visée départage
      const exos = tailorDraw(spec, pool, Math.max(2, n + (k%3) - 1), ctx);
      tries.push({ exos, s:tailorScore(spec, exos, ctx) });
    }
    if(onStep) onStep(1, `${tries.length} combinaisons essayées`);
    if(pace) await tailorWait(110);
  }
  // 3. la meilleure
  tries.sort((a,b)=>b.s.v - a.s.v);
  const best = tries[0], exos = tailorOrder(spec, best.exos);
  await step(2, `${exos.length} exercices · ≈ ${best.s.min} min`, 480);
  // 4. charges et répétitions (fatigue selon la place, ta manière de faire)
  const entries = entriesInOrder(exos.map(e=>[e, tailorSets(spec, e)]));
  await step(3, "charges et répétitions réglées", 420);
  // au moins 2 s de réflexion visible (moins si l'animation est réduite)
  if(pace){ const left = (opts.minMs ?? 2100) - (performance.now() - t0); if(left>0) await tailorWait(left); }
  const why = [];
  if(best.s.need>0.5 && ctx.low.length) why.push(`priorité aux ${ctx.low.slice(0,2).map(r=>r.n.toLowerCase()).join(" et ")}`);
  if(ctx.tired.length && spec.kind!=="cardio" && spec.kind!=="mobilite") why.push(`on ménage ${ctx.tired.slice(0,2).map(m=>(MUSCLE_MAP[m]||{n:m}).n.toLowerCase()).join(" et ")} (travaillés il y a moins de 48 h)`);
  if(spec.kind!=="cardio" && spec.kind!=="mobilite" && S.goals.overall!=="endurance" && best.s.value<.8) why.push("ce type de séance compte moins pour ton objectif");
  return { id:uid(), date:todayISO(), source:"engine", type:"tailored", tailored:spec, name:tailorName(spec),
    reason:why.length ? why.join(" ; ").replace(/^./, c=>c.toUpperCase())+"." : null, stim:null, startedAt:null, completedAt:null,
    exos:entries, tries:tries.length };
}

// ---------- interface ----------
function tailorBtnHTML(){ return `<span class="ha-dot" aria-hidden="true">·</span><button class="hero-alt hero-tailor" data-a="tailorOpen" aria-label="Créer une séance sur mesure">${ii("sparkle")}Sur mesure</button>`; }
function tailorGroupHTML(k, label, spec){
  let opts = TAILOR[k];
  if(k==="equip" && !ownsLoad()) opts = opts.filter(o=>o[0]!=="loaded");
  return `<div class="tl-grp" data-k="${k}"${k==="zone" && (spec.kind==="cardio") ? " hidden" : ""}><div class="tl-lab">${label}</div><div class="tl-chips" role="radiogroup" aria-label="${label}">${opts.map(([v, n])=>
    `<button class="type-chip${spec[k]===v ? " on" : ""}" data-a="tailorSet" data-k="${k}" data-v="${v}" role="radio" aria-checked="${spec[k]===v}">${n}${k==="len" ? `<small>${TAILOR_LEN_TXT[v]}</small>` : ""}</button>`).join("")}</div></div>`;
}
function tailorSheetHTML(){
  const spec = tailorSpec();
  return `<div class="sheet-hd"><span class="t">Séance sur mesure</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body tl-body">
      <p class="tl-intro">Dis ce que tu veux : l'app compose la séance avec ta semaine, ta récupération et ton objectif.</p>
      ${tailorGroupHTML("kind", "Type", spec)}${tailorGroupHTML("zone", "Zone", spec)}${tailorGroupHTML("equip", "Matériel", spec)}${tailorGroupHTML("len", "Durée", spec)}
    </div>`;
}
// l'animation : les exercices possibles défilent autour d'un cœur qui respire, chaque étape se coche ;
// à la fin, les exercices retenus restent et rejoignent la carte du jour
function tailorThinkHTML(spec){
  const steps = ["Je regarde ta semaine", "J'essaie des combinaisons", "Je garde la meilleure", "Je règle charges et répétitions"];
  return `<div class="tl-think" role="status" aria-live="polite" aria-label="L'app compose ta séance">
    <div class="tl-stage"><div class="tl-core"></div><div class="tl-ring">${Array.from({ length:8 }, (_, i)=>`<span class="tl-ic" style="--a:${i*45}deg"></span>`).join("")}</div></div>
    <div class="tl-title">${esc(tailorName(spec))}</div>
    <ol class="tl-steps">${steps.map((t, i)=>`<li data-i="${i}"><span class="tl-dot"></span><span class="tl-t">${t}<small></small></span></li>`).join("")}</ol>
  </div>`;
}
let tailorBusy = false;
Object.assign(ACT, {
  tailorOpen(){ sfx("open"); openSheet(tailorSheetHTML(), { footer:`<button class="btn" data-a="tailorGo">${ii("sparkle")} Générer la séance</button>` }); },
  tailorSet(d){
    const t = Object.assign({}, tailorSpec()); t[d.k] = d.v; S.settings.tailor = t; save();
    qsa(`#overlay .tl-grp[data-k="${d.k}"] .type-chip`).forEach(b=>{ const on = b.dataset.v===d.v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    const z = qs('#overlay .tl-grp[data-k="zone"]'); if(z) z.hidden = t.kind==="cardio";
    sfx("toggle"); haptic(6);
  },
  async tailorGo(){
    if(tailorBusy) return; tailorBusy = true;
    const spec = tailorSpec(), fast = reducedMotion();
    closeSheet();
    const host = document.createElement("div"); host.className = "tl-host"; host.innerHTML = tailorThinkHTML(spec); document.body.appendChild(host);
    requestAnimationFrame(()=>host.classList.add("on"));
    sfx("open"); haptic(10);
    // pendant les combinaisons, les vignettes changent d'exercice (de vrais candidats de la sélection)
    const pool = tailorPool(spec), ics = qsa(".tl-ic", host);
    const shuffle = ()=>ics.forEach((el, i)=>{ if(Math.random()<.45){ const e = pool[(Math.random()*pool.length)|0]; if(e){ el.innerHTML = exoIcon(e); el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); } } });
    ics.forEach((el, i)=>{ const e = pool[i % Math.max(1, pool.length)]; if(e) el.innerHTML = exoIcon(e); });
    let spin = 0;
    const onStep = (i, txt)=>{
      qsa(".tl-steps li", host).forEach(li=>{ const k = +li.dataset.i; li.classList.toggle("done", k<i); li.classList.toggle("on", k===i); });
      const sm = qs(`.tl-steps li[data-i="${i}"] small`, host); if(sm && txt) sm.textContent = txt;
      if(i===1 && !spin && !fast) spin = setInterval(shuffle, 140);
      if(i>=2 && spin){ clearInterval(spin); spin = 0; }
      if(i>0) sfx("tick");
    };
    let session;
    try{ session = await tailorGenerate(spec, onStep, { fast }); }
    catch(e){ reportError && reportError("tailor", e); }
    if(spin) clearInterval(spin);
    if(!session || !session.exos.length){
      host.classList.remove("on"); setTimeout(()=>host.remove(), 300); tailorBusy = false;
      toast("Pas assez d'exercices pour ces critères avec ton matériel", "info"); return;
    }
    // les exercices retenus prennent place dans l'anneau, puis tout rejoint la carte du jour
    qsa(".tl-steps li", host).forEach(li=>{ li.classList.add("done"); li.classList.remove("on"); });
    const chosen = session.exos.map(x=>EXO_MAP[x.exoId]).filter(Boolean);
    ics.forEach((el, i)=>{ const e = chosen[i]; el.classList.toggle("keep", !!e); if(e){ el.innerHTML = exoIcon(e); } });
    host.classList.add("found"); sfx("set"); haptic(16);
    if(!fast) await tailorWait(650);
    S.draft = session; S.settings.todayTab = "proposal"; propAdjust = false; save();
    host.classList.add("out");
    if(currentTab!=="today") switchTab("today");
    scrollTodayTop(); renderViewAnimated("today");
    setTimeout(()=>{ host.remove(); tailorBusy = false; }, fast ? 0 : 420);
  },
});
