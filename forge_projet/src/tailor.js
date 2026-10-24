// ================= SÉANCE SUR MESURE =================
// On dit ce qu'on veut (type, zone, matériel, durée) ; l'app réfléchit vraiment : elle relit ta semaine
// (stimulus par muscle, récupération, ce que tu fais d'habitude), tire des dizaines de combinaisons, les
// note, affine la meilleure exercice par exercice, ajuste les séries à la durée visée, puis règle charges et
// répétitions comme pour toute séance (fatigue selon la place, manière de faire). Chaque exercice garde la
// raison de son choix. La séance devient la proposition du jour : « Ajuster » permet d'en changer un.

const TAILOR = {
  equip: [["none","Sans matériel"],["all","Mon matériel"],["loaded","Charges"]],
  zone:  [["full","Tout le corps"],["haut","Haut du corps"],["bas","Bas du corps"],["bras","Bras"],["push","Pecs & épaules"],["pull","Dos"],["core","Abdos"]],
  kind:  [["renfo","Renforcement"],["mix","Renfo + cardio"],["cardio","Cardio"],["mobilite","Mobilité"]],
  len:   [["court","20 min"],["moyen","40 min"],["long","60 min"]],
};
// sous-titre, symbole et couleur des types (tuiles de la feuille)
const TAILOR_KIND_UI = { renfo:["Muscle et force","dumbbell","orange"], mix:["Circuit qui essouffle","bolt","purple"],
  cardio:["Souffle et endurance","heart","pink"], mobilite:["Étirements, gainage doux","leaf","green"] };
const TAILOR_MIN = { court:20, moyen:40, long:60 };   // minutes visées
const TAILOR_LEN_TXT = { court:"≈ 20 min", moyen:"≈ 40 min", long:"≈ 60 min" };
const tailorOpt = (k, v)=>(TAILOR[k].find(x=>x[0]===v) || TAILOR[k][0]);
function tailorSpec(){
  const t = S.settings.tailor && typeof S.settings.tailor==="object" ? S.settings.tailor : {}, o = {};
  Object.keys(TAILOR).forEach(k=>{ o[k] = tailorOpt(k, t[k])[0]; });
  if(!t.len) o.len = S.goals.sessionLength==="court" || S.goals.sessionLength==="long" ? S.goals.sessionLength : "moyen";
  if(!t.equip) o.equip = "all";
  if(o.equip==="loaded" && !ownsLoad()) o.equip = "all";
  return o;
}
const ownsLoad = ()=>availableExos().some(e=>exoKind(e)==="loaded");
const tailorWant = spec=>spec.kind==="cardio" || spec.kind==="mobilite";   // séance qui ne vise pas le muscle
function tailorName(spec){
  return spec.kind==="renfo" ? tailorOpt("zone", spec.zone)[1] : spec.kind==="mix" ? tailorOpt("zone", spec.zone)[1]+" + cardio" : tailorOpt("kind", spec.kind)[1];
}
function tailorTag(spec){ return "Sur mesure" + (spec.equip==="none" ? " · sans matériel" : spec.equip==="loaded" ? " · charges" : ""); }
function tailorCount(spec){ return Math.max(3, Math.min(spec.kind==="mobilite" ? 14 : 10, Math.round(TAILOR_MIN[spec.len]/(spec.kind==="mobilite" ? 3.2 : 7)))); }
const isCardioEx = e=>e.muscles.includes("cardio");
const PUSH_P = new Set(["push"]), PULL_P = new Set(["pull"]), LOW_P = new Set(["squat","lunge","hinge","calf"]);

// ---------- les exercices possibles ----------
function tailorPool(spec){
  let base = availableExos().filter(levelOK);
  if(spec.equip==="none") base = base.filter(e=>e.equip.every(q=>q==="bodyweight"));
  const zoneM = spec.zone==="full" ? null : spec.zone==="core" ? ["abdos"] : SESSION_TYPE_MAP[spec.zone] ? SESSION_TYPE_MAP[spec.zone].muscles : null;
  const inZone = e=>!zoneM || zoneM.includes(e.muscles[0]) || (spec.zone==="core" && e.pattern==="core");
  if(spec.kind==="mobilite"){
    // étirements et Pilates (sol, au poids du corps) des zones demandées
    const st = base.filter(e=>isStretch(e) || (e.pattern==="core" && e.equip.every(q=>q==="bodyweight") && !isCardioEx(e) && e.level<3));
    const z = st.filter(e=>!zoneM || e.muscles.some(m=>zoneM.includes(m)));
    return z.length>=4 ? z : st;
  }
  base = base.filter(e=>!isStretch(e));
  const cardio = base.filter(isCardioEx);
  if(spec.kind==="cardio") return cardio.length>=3 ? cardio : base.filter(e=>e.pattern==="core");
  let renfo = base.filter(e=>e.muscles[0]!=="cardio");
  if(spec.equip==="loaded"){ const l = renfo.filter(e=>exoKind(e)==="loaded"); if(l.length>=3) renfo = l.concat(renfo.filter(e=>e.pattern==="core" && exoKind(e)!=="cardio").slice(0,3)); }
  const z = renfo.filter(inZone);
  const pool = z.length>=3 ? z : renfo.filter(e=>!zoneM || e.muscles.some(m=>zoneM.includes(m)));
  return spec.kind==="mix" ? pool.concat(cardio.filter(e=>!pool.includes(e))) : pool;
}

// ---------- ce que l'app sait de toi ----------
// stimulus de la semaine (séries utiles par muscle), récupération, et ce que tu fais d'habitude (60 jours)
function tailorContext(){
  const vol = {}; (typeof muscleVolume==="function" ? muscleVolume(7) : []).forEach(r=>{ vol[r.id] = r; });
  const rec = {}; Object.keys(MUSCLE_MAP).forEach(m=>{ rec[m] = daysSinceTrained(m); });
  const low = Object.values(vol).filter(r=>r.sets<STIM.min && S.sessions.length).sort((a,b)=>a.sets-b.sets);
  const tired = Object.keys(rec).filter(m=>rec[m]<2 && m!=="cardio");
  const high = new Set(Object.values(vol).filter(r=>r.sets>=STIM.high).map(r=>r.id));
  const done = {}, today = todayISO();
  for(let i=S.sessions.length-1; i>=0; i--){
    const s = S.sessions[i]; if(daysBetween(s.date, today)>60) break;
    s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) done[ex.exoId] = (done[ex.exoId]||0) + 1; });
  }
  return { vol, rec, low, tired, high, done, fresh:!S.sessions.length, soon:plannedSoonMuscles() };
}
const mName = m=>((MUSCLE_MAP[m]||{ n:m }).n).toLowerCase();
// « le dos », « les pectoraux » : l'article qui va avec le muscle
const leMuscle = m=>(m==="dos" ? "le " : "les ")+mName(m);
// (personne n'est « en retard » avant sa première séance)
const tailorDeficit = (ctx, m)=>{ const r = !ctx.fresh && ctx.vol[m]; return r ? Math.max(0, STIM.min - r.sets)/STIM.min : 0; };

// ---------- une combinaison, et sa note ----------
// deux variantes d'un même mouvement font doublon : même famille (« squat_… ») ou même nom de départ
// (« Marche du fermier » et « Marche du fermier kettlebell ») ; chaque étirement est le sien
function tailorFams(e){ if(isStretch(e)) return [e.id]; return [exoFamily(e), normName(e.n).split(" ").slice(0, 2).join(" ")]; }
// intérêt d'un exercice seul : ce qu'il apporte à l'objectif, le retard du muscle, sa récupération, tes
// habitudes (un exercice connu a des charges justes ; un peu de nouveauté reste bienvenue)
function tailorExoScore(spec, e, ctx){
  const want = tailorWant(spec), m = e.muscles[0];
  let s = (want ? 1 : goalValue(e))*3 + (isIncluded(e.id) ? 1.5 : 0) - recencyPenalty(e.id)*.6;
  if(!want){
    s += 1.6*tailorDeficit(ctx, m);
    if(ctx.rec[m]<2) s -= 2.5;
    if(ctx.high.has(m)) s -= 1.5;
    if(ctx.soon.has(m)) s -= 1.5;   // prévu demain dans Mes séances
  }
  const n = ctx.done[e.id]||0;
  s += n>=2 ? .8 : n ? .4 : .25;
  return s + exoAffinity(e.id);   // souvent sauté ou remplacé : l'app l'évite
}
// tirage glouton pondéré : à chaque emplacement du plan, un exercice parmi les meilleurs, au hasard selon
// leur score (les combinaisons varient d'un essai à l'autre, les bons exercices reviennent plus souvent)
function tailorDraw(spec, pool, n, ctx, base){
  const scores = new Map(pool.map(e=>[e, (base ? base.get(e) : tailorExoScore(spec, e, ctx)) + Math.random()*1.4]));
  const out = [], fam = new Set(), mN = {};
  const dup = e=>tailorFams(e).some(f=>fam.has(f));
  const plan = spec.kind==="renfo" || spec.kind==="mix" ? (SESSION_PLANS[spec.zone==="core" ? "core" : spec.zone] || SESSION_PLANS.full) : null;
  const pick = cand=>{
    if(!cand.length) return null;
    const adj = e=>scores.get(e) - (dup(e) ? 4 : 0) - (mN[e.muscles[0]]||0)*1.8;
    const top = cand.map(e=>[e, adj(e)]).sort((a,b)=>b[1]-a[1]).slice(0, 4);
    const w = top.map(([,v])=>Math.exp(v - top[0][1])), tot = w.reduce((a,b)=>a+b, 0);
    let r = Math.random()*tot; for(let k=0;k<top.length;k++){ r -= w[k]; if(r<=0) return top[k][0]; }
    return top[0][0];
  };
  const take = e=>{ out.push(e); tailorFams(e).forEach(f=>fam.add(f)); mN[e.muscles[0]] = (mN[e.muscles[0]]||0)+1; };
  for(let i=0; out.length<n && i<n*3; i++){
    let cand = pool.filter(e=>!out.includes(e));
    if(spec.kind==="mix"){ const c = cand.filter(e=>(out.length%3===2) === isCardioEx(e)); if(c.length) cand = c; }
    if(spec.kind==="mobilite"){ const s = cand.filter(e=>isStretch(e) === (out.length%3!==2)); if(s.length) cand = s; }
    const slot = plan && spec.kind==="renfo" ? plan[out.length] : null;
    // l'emplacement du plan est suivi, sauf si tous ses candidats visent un muscle pas encore récupéré
    if(slot){ const s = cand.filter(e=>(!slot.p || slot.p.includes(e.pattern)) && (!slot.m || slot.m.includes(e.muscles[0]))); if(s.length && !s.every(e=>ctx.rec[e.muscles[0]]<2)) cand = s; }
    const e = pick(cand); if(!e) break; take(e);
  }
  return out;
}
// séries de départ : le cardio se fait en tours ; le renforcement suit ton profil (ce qui manque cette
// semaine à chaque muscle, ta fréquence, ton niveau, ton âge : profileBase, coach.js)
function tailorSets(spec, e){
  if(spec.kind==="mobilite") return isStretch(e) ? 1 : 2;
  if(spec.kind==="cardio" || (spec.kind==="mix" && isCardioEx(e))) return spec.len==="long" ? 4 : 3;
  return profileBase([e])[0];
}
function tailorBase(spec, exos){
  const str = exos.map(e=>!(spec.kind==="mobilite" || spec.kind==="cardio" || (spec.kind==="mix" && isCardioEx(e))));
  const pb = profileBase(exos.filter((_, i)=>str[i]));
  let j = 0; return exos.map((e, i)=>str[i] ? pb[j++] : tailorSets(spec, e));
}
const tailorSec = (e, n)=>n*(40 + e.restSec);
// la durée visée tenue en jouant sur les séries : on retire d'abord sur les exercices d'appoint (fin de
// séance), on ajoute d'abord sur les gros mouvements (début de séance), entre 2 et 5 séries
function tailorFit(spec, exos){
  const sets = tailorBase(spec, exos), goal = TAILOR_MIN[spec.len]*60/paceFactor();   // à ton rythme réel
  if(spec.kind==="mobilite") return sets;
  const tot = ()=>exos.reduce((t,e,i)=>t + tailorSec(e, sets[i]), 0);
  const cap = S.goals.level==="debutant" || S.goals.senior ? 4 : 5;
  for(let k=0; k<30 && tot()>goal*1.06; k++){
    let i = exos.length-1; while(i>=0 && sets[i]<=2) i--; if(i<0) break;
    // le dernier exercice qui a encore le plus de séries
    let best = i; for(let j=i; j>=0; j--) if(sets[j]>sets[best]) best = j;
    sets[best]--;
  }
  for(let k=0; k<30 && tot()<goal*.94; k++){
    let best = -1; for(let j=0; j<exos.length; j++) if(sets[j]<cap && (best<0 || sets[j]<sets[best])) best = j;
    if(best<0) break; sets[best]++;
  }
  return sets;
}
function tailorScore(spec, exos, ctx){
  if(!exos.length) return { v:-1e9 };
  const want = tailorWant(spec);
  const prim = exos.map(e=>e.muscles[0]), distinct = new Set(prim).size;
  const strength = exos.filter(e=>!isCardioEx(e) || spec.kind!=="mix");
  const value = strength.reduce((t,e)=>t + (want ? 1 : goalValue(e)), 0)/Math.max(1, strength.length);   // ce que la séance apporte à l'objectif
  const need = want ? 0 : exos.reduce((t,e)=>t + tailorDeficit(ctx, e.muscles[0]), 0);                // muscles en retard cette semaine
  const tired = want ? 0 : prim.filter(m=>ctx.rec[m]<2).length;                                           // muscles pas encore récupérés
  const over = want ? 0 : prim.filter(m=>ctx.high.has(m)).length;                                        // déjà bien servis cette semaine
  const fams = exos.length - new Set(exos.map(e=>tailorFams(e).join("|"))).size;
  const sets = tailorFit(spec, exos), sec = exos.reduce((t,e,i)=>t + tailorSec(e, sets[i]), 0);
  // séries tirées loin de l'habitude pour tenir la durée : mieux vaut un exercice de plus
  const base = tailorBase(spec, exos), stretch = exos.reduce((t,e,i)=>t + Math.abs(sets[i] - base[i]), 0);
  const min = Math.round(sec*paceFactor()/60), gap = Math.abs(min - TAILOR_MIN[spec.len]);
  const multi = exos.slice(0, 3).filter(e=>e.muscles.length>=3).length;                                  // polyarticulaires en tête
  // équilibre : autant de poussées que de tirages ; tout le corps = haut ET bas
  let bal = 0;
  if(!want && (spec.zone==="full" || spec.zone==="haut")){
    const pu = exos.filter(e=>PUSH_P.has(e.pattern)).length, pl = exos.filter(e=>PULL_P.has(e.pattern)).length;
    bal -= Math.max(0, Math.abs(pu - pl) - 1)*1.4;
    if(spec.zone==="full"){ const lo = exos.filter(e=>LOW_P.has(e.pattern)).length, up = pu + pl; if(!lo || !up) bal -= 3; }
  }
  // tes habitudes : des exercices connus (charges justes), au plus deux nouveaux
  const fresh = exos.filter(e=>!ctx.done[e.id]).length, known = exos.length - fresh;
  const habit = ctx.fresh ? 0 : Math.min(known, 4)*.3 - Math.max(0, fresh - 2);
  // bas du corps complet : un mouvement « genou » (squat, fente) ET un mouvement « hanche » (charnière)
  let legs = 0;
  if(!want && (spec.zone==="full" || spec.zone==="bas")){
    const knee = exos.some(e=>e.pattern==="squat" || e.pattern==="lunge"), hip = exos.some(e=>e.pattern==="hinge");
    legs = knee && hip ? .8 : knee || hip ? -.4 : 0;
  }
  // à la maison : peu de changements de matériel d'un exercice à l'autre (dans l'ordre de la séance)
  const ord = tailorOrder(spec, exos); let gear = 0;
  for(let i=1; i<ord.length; i++) if(gearOf(ord[i])!==gearOf(ord[i-1])) gear++;
  // exercices à laisser de côté (« Autre proposition ») : la séance doit vraiment changer
  const av = ctx.avoid ? exos.filter(e=>ctx.avoid.has(e.id)).length : 0;
  const v = value*6 + need*1.2 - tired*2.2 - over*1.2 + distinct*.7 - fams*2.5 - gap/4 + multi*.4 + bal + habit - stretch*.5 + legs - gear*.2 - av*2.5;
  return { v, value, need, tired, over, distinct, min, sets, bal, fresh, gear };
}
// le matériel à installer pour un exercice (haltères, kettlebell, barre, élastique ; banc en plus)
function gearOf(e){ return (loadableTypeOf(e) || (e.equip.find(q=>q!=="bodyweight" && q!=="mat") || "pdc")) + (e.equip.includes("bench") ? "+banc" : ""); }
// ordre fin, par paliers (gros mouvements, isolations, gainage/mollets, cardio) : dans un palier, on évite
// deux exercices de suite pour le même muscle (il récupère pendant l'autre), puis on garde le même
// matériel quand c'est possible (moins d'installation), sinon l'ordre d'importance
function smoothOrder(list, tier){
  const out = [], rest = list.slice();
  while(rest.length){
    const prev = out[out.length-1], t = Math.min(...rest.map(tier)), same = rest.filter(e=>tier(e)===t);
    const okM = e=>!prev || e.muscles[0]!==prev.muscles[0], okG = e=>prev && gearOf(e)===gearOf(prev);
    const pick = same.find(e=>okM(e) && okG(e) && same.indexOf(e)<=1) || same.find(okM) || same[0];
    out.push(pick); rest.splice(rest.indexOf(pick), 1);
  }
  return out;
}
// ordre : gros mouvements d'abord, gainage, mollets et cardio à la fin (étirements tout à la fin)
function tailorOrder(spec, exos){
  if(spec.kind==="mobilite") return exos.slice().sort((a,b)=>(isStretch(a)?1:0)-(isStretch(b)?1:0));
  if(spec.kind==="cardio") return exos;
  const late = e=>(isCardioEx(e) && spec.kind!=="mix" ? 3 : 0) + (PATTERN_LATE[e.pattern]||0);
  // les isolations (bras) passent après les polyarticulaires, quel que soit le nombre de muscles listés
  const iso = e=>["biceps","triceps","avantbras"].includes(e.muscles[0]) ? 50 : 0;
  const sorted = exos.map((e,i)=>({ e, k:late(e)*100 + iso(e) - e.muscles.length + i*.01 })).sort((a,b)=>a.k-b.k).map(x=>x.e);
  return smoothOrder(sorted, e=>late(e)*2 + (iso(e) ? 1 : 0));
}
// affiner : chaque exercice est confronté aux meilleurs remplaçants du même rôle (même mouvement ou même
// muscle, même nature : cardio, étirement) ; un échange n'est gardé que s'il améliore la note
function tailorRefine(spec, pool, best, ctx, base){
  let exos = best.exos.slice(), s = best.s, tested = 0, kept = 0;
  for(let pass=0; pass<2; pass++){
    let better = false;
    for(let i=0; i<exos.length; i++){
      const cur = exos[i], others = exos.filter((_, j)=>j!==i), fam = new Set(others.flatMap(tailorFams));
      const alts = pool.filter(e=>!exos.includes(e) && isCardioEx(e)===isCardioEx(cur) && isStretch(e)===isStretch(cur)
          && (e.pattern===cur.pattern || e.muscles[0]===cur.muscles[0]) && !tailorFams(e).some(f=>fam.has(f)))
        .sort((a,b)=>base.get(b) - base.get(a)).slice(0, 5);
      for(const a of alts){
        tested++;
        const t = exos.slice(); t[i] = a;
        const ts = tailorScore(spec, t, ctx);
        if(ts.v > s.v + .05){ exos = t; s = ts; kept++; better = true; break; }
      }
    }
    if(!better) break;
  }
  return { exos, s, tested, kept };
}
// la raison du choix, en quelques mots (affichée sous l'exercice dans la séance du jour)
function tailorWhy(spec, e, i, exos, ctx){
  const m = e.muscles[0], n = ctx.done[e.id]||0;
  if(spec.kind==="mobilite") return isStretch(e) ? `Étire ${(MUSCLE_MAP[m] ? leMuscle(m) : "en douceur")}` : "Gainage doux, au sol";
  if(spec.kind==="cardio") return i===0 ? "Pour monter en rythme" : "Fait travailler le souffle";
  if(spec.kind==="mix" && isCardioEx(e)) return "Garde le cœur haut entre deux blocs";
  if(tailorDeficit(ctx, m)>=.5) return `${MUSCLE_MAP[m] ? MUSCLE_MAP[m].n : m} en retard cette semaine`;
  if(i===0 && e.muscles.length>=3) return "Gros mouvement, en premier";
  if((spec.zone==="full" || spec.zone==="haut") && PULL_P.has(e.pattern) && exos.some(x=>PUSH_P.has(x.pattern))) return "Équilibre les poussées";
  if(n>=2) return "Ton habituel : charges connues";
  if(!n && !ctx.fresh) return "Nouveau pour toi";
  if(goalValue(e)>=1 && S.goals.overall!=="endurance") return "Chargé : compte pleinement";
  return `Cible ${leMuscle(m)}`;
}
const tailorWait = ms=>new Promise(r=>setTimeout(r, ms));
// la réflexion, en vrai et par étapes (onStep(i, texte) à chaque étape, pour l'animation) ; renvoie la séance
async function tailorGenerate(spec, onStep, opts){
  opts = opts || {}; const pace = opts.fast ? 0 : 1, t0 = performance.now();
  // temps de calcul réel (hors pauses d'affichage) : il est montré à la fin, en toute transparence
  let cpu = 0, c0 = performance.now();
  const pause = async ms=>{ cpu += performance.now() - c0; if(pace) await tailorWait(ms); c0 = performance.now(); };
  const step = async (i, txt, ms)=>{ if(onStep) onStep(i, txt); await pause(ms); };
  const want = tailorWant(spec);
  // 1. ta semaine : ce qui est en retard, ce qui doit récupérer
  const ctx = tailorContext(), facts = [];
  if(ctx.fresh) facts.push("première séance : on reste simple");
  else {
    if(!want && ctx.low.length) facts.push(`${ctx.low.slice(0,2).map(r=>r.n.toLowerCase()).join(" et ")} en retard`);
    const yest = ctx.tired.filter(m=>MUSCLE_MAP[m]).slice(0, 1);
    if(!want && yest.length) facts.push(`${mName(yest[0])} à ménager`);
    const tm = typeof plannedTemplate==="function" && plannedTemplate(addDaysISO(todayISO(), 1));
    if(!want && tm && ctx.soon.size) facts.push(`« ${tm.n} » demain`);
    if(!facts.length) facts.push("semaine équilibrée");
  }
  await step(0, facts.join(" · ").replace(/^./, c=>c.toUpperCase()), 560);
  // 2. combinaisons tirées au sort parmi les meilleures, notées une à une
  // « Autre séance sur mesure » : les exercices de la séance précédente passent derrière
  const pool = tailorPool(spec), base = new Map(pool.map(e=>[e, tailorExoScore(spec, e, ctx) - (opts.avoid && opts.avoid.has(e.id) ? 3 : 0)]));
  const n = tailorCount(spec), tries = [];
  for(let batch=0; batch<8; batch++){
    for(let k=0;k<10;k++){
      // la taille varie un peu autour de la cible : la durée visée départage
      const exos = tailorDraw(spec, pool, Math.max(2, n + (k%3) - 1), ctx, base);
      tries.push({ exos, s:tailorScore(spec, exos, ctx) });
    }
    if(onStep) onStep(1, `${tries.length} combinaisons · ${pool.length} exercices possibles`);
    await pause(95);
  }
  // 3. la meilleure, affinée exercice par exercice
  tries.sort((a,b)=>b.s.v - a.s.v);
  if(onStep) onStep(2, "J'échange un exercice à la fois…");
  const ref = tailorRefine(spec, pool, tries[0], ctx, base);
  const best = { exos:ref.exos, s:tailorScore(spec, ref.exos, ctx) };
  const exos = tailorOrder(spec, best.exos), sets = tailorFit(spec, exos);
  const min = Math.round(exos.reduce((t,e,i)=>t + tailorSec(e, sets[i]), 0)*paceFactor()/60);
  await step(2, `${ref.tested} échanges testés${ref.kept ? `, ${ref.kept} gardé${ref.kept>1 ? "s" : ""}` : ""} · ${exos.length} exercices, ≈ ${min} min`, 620);
  // 4. charges et répétitions (fatigue selon la place, ta manière de faire)
  const entries = entriesInOrder(exos.map((e, i)=>[e, sets[i]]));
  // une raison par exercice, sans répéter la même : sinon on dit ce qu'il cible
  const usedWhy = new Set();
  entries.forEach((x, i)=>{ let w = tailorWhy(spec, exos[i], i, exos, ctx);
    if(usedWhy.has(w)) w = isStretch(exos[i]) || isCardioEx(exos[i]) ? w : `Cible ${leMuscle(exos[i].muscles[0])}`;
    usedWhy.add(w); x.why = w; });
  const shown = entries.find(x=>x.sets[0] && x.sets[0].weight) || entries[0];
  const sd = shown && EXO_MAP[shown.exoId];
  await step(3, sd && typeof propDose==="function" ? `${sd.n} : ${propDose(shown)}` : "charges et répétitions réglées", 520);
  // au moins 2 s de réflexion visible (moins si l'animation est réduite)
  cpu += performance.now() - c0;
  if(pace){ const left = (opts.minMs ?? 2100) - (performance.now() - t0); if(left>0) await tailorWait(left); }
  const why = [];
  if(!want && best.s.need>0.5 && ctx.low.length) why.push(`priorité : ${ctx.low.slice(0,2).map(r=>r.n.toLowerCase()).join(" et ")}`);
  if(!want && ctx.tired.length) why.push(`on ménage ${ctx.tired.slice(0,2).map(mName).join(" et ")} (travaillés il y a moins de 48 h)`);
  if(!want && S.goals.overall!=="endurance" && best.s.value<.8) why.push("ce type de séance compte moins pour ton objectif");
  return { id:uid(), date:todayISO(), source:"engine", type:"tailored", tailored:spec, name:tailorName(spec),
    reason:why.length ? why.join(" ; ").replace(/^./, c=>c.toUpperCase())+"." : null, stim:null, startedAt:null, completedAt:null,
    exos:entries, tries:tries.length, refined:ref.tested, cpuMs:Math.max(1, Math.round(cpu)) };
}

// ---------- interface ----------
// ce que donneront les critères, avant même de générer : taille, durée, et ce que ça vaut pour l'objectif
function tailorSummary(spec){
  const pool = tailorPool(spec), n = Math.min(tailorCount(spec), pool.length);
  if(n<2) return { t:"Pas assez d'exercices pour ces critères", note:"Change de zone ou de matériel.", warn:true };
  const g = S.goals.overall, goalTxt = g==="force" ? "gagner en force" : "prendre du muscle";
  let note = "";
  if(g!=="endurance"){
    if(spec.kind==="cardio") note = `Bon pour le souffle, compte peu pour ${goalTxt}`;
    else if(spec.kind==="mobilite") note = "Récupération : ne compte pas dans le stimulus";
    else {
      const vals = pool.filter(e=>!isCardioEx(e)).map(e=>goalValue(e)).sort((a,b)=>b-a).slice(0, n);
      const v = vals.length ? vals.reduce((a,b)=>a+b, 0)/vals.length : 1;
      if(v<.95) note = `Compte ≈ ${Math.round(v*100)} % pour ${goalTxt} (moins qu'avec charges)`;
    }
  }
  return { t:`≈ ${n} exercices · ${TAILOR_MIN[spec.len]} min`, note };
}
function tailorSumHTML(spec){ const s = tailorSummary(spec); return `<span class="tl-sum-t${s.warn ? " warn" : ""}">${s.t}</span>${s.note ? `<span class="tl-sum-n">${s.note}</span>` : ""}`; }
function tailorSheetHTML(){
  const spec = tailorSpec();
  const kinds = TAILOR.kind.map(([v, n])=>{ const [sub, ic, col] = TAILOR_KIND_UI[v], on = spec.kind===v;
    return `<button class="tl-kind${on ? " on" : ""}" data-a="tailorSet" data-k="kind" data-v="${v}" role="radio" aria-checked="${on}">${sfIcon(ic, col)}<span class="tl-kt">${n}</span><span class="tl-ks">${sub}</span></button>`; }).join("");
  // trois lignes : tout le corps ; haut, bas, bras ; pecs & épaules, dos, abdos (largeur selon le texte)
  const zones = TAILOR.zone.map(([v, n])=>{ const on = spec.zone===v;
    return `<button class="tl-zone${on ? " on" : ""}${v==="full" ? " wide" : ""}" data-a="tailorSet" data-k="zone" data-v="${v}" role="radio" aria-checked="${on}">${n}</button>${v==="bras" ? `<i class="tl-br"></i>` : ""}`; }).join("");
  const equip = TAILOR.equip.filter(o=>o[0]!=="loaded" || ownsLoad());
  const zoneOff = spec.kind==="cardio";
  return `<div class="sheet-hd"><span class="t" id="ovTitle">Séance sur mesure</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body tl-body">
      <p class="tl-intro">Composée selon ta semaine et ton objectif.</p>
      <h2 class="sh">Type</h2>
      <div class="tl-kinds" role="radiogroup" aria-label="Type">${kinds}</div>
      <section class="tl-zsec${zoneOff ? " off" : ""}"${zoneOff ? ` aria-disabled="true"` : ""}>
        <h2 class="sh"><span class="sh-t">Zone</span><span class="tl-zoff">Tout le corps en cardio</span></h2>
        <div class="tl-zones" role="radiogroup" aria-label="Zone">${zones}</div>
      </section>
      <h2 class="sh">Matériel</h2>${segHTML("tlEquip", equip, spec.equip, "tailorEquip")}
      <h2 class="sh">Durée</h2>${segHTML("tlLen", TAILOR.len, spec.len, "tailorLen")}
    </div>`;
}
function tailorFootHTML(){
  return `<div class="tl-sum" id="tlSum" aria-live="polite">${tailorSumHTML(tailorSpec())}</div><button class="btn tl-go" data-a="tailorGo"><span class="tl-go-t">${ii("sparkle")}Générer la séance</span></button>`;
}
// l'animation : le bouton devient le cœur, les exercices possibles défilent autour, chaque étape se
// coche ; à la fin, les exercices retenus rejoignent leur place sur la carte du jour
function tailorThinkHTML(spec){
  const steps = ["Je regarde ta semaine", "J'essaie des combinaisons", "J'affine la meilleure", "Je règle charges et répétitions"];
  return `<div class="tl-bg"></div><div class="tl-think" role="status" aria-live="polite" aria-label="L'app compose ta séance">
    <div class="tl-stage"><div class="tl-core"><i></i><i></i><i></i>${ii("sparkle", "tl-spk")}</div><div class="tl-ring">${Array.from({ length:8 }, (_, i)=>`<span class="tl-ic" style="--a:${i*45}deg;--d:${i*40}ms"></span>`).join("")}</div></div>
    <div class="tl-title">${esc(tailorName(spec))}</div>
    <ol class="tl-steps">${steps.map((t, i)=>`<li data-i="${i}" style="--d:${i*60}ms"><span class="tl-dot"></span><span class="tl-t">${t}<small></small></span></li>`).join("")}</ol>
  </div>`;
}
function tailorRefresh(spec){
  const ov = qs("#overlay"); if(!ov) return;
  qsa(".tl-kind, .tl-zone", ov).forEach(b=>{ const on = spec[b.dataset.k]===b.dataset.v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
  const z = qs(".tl-zsec", ov); if(z){ const off = spec.kind==="cardio"; z.classList.toggle("off", off); off ? z.setAttribute("aria-disabled", "true") : z.removeAttribute("aria-disabled"); }
  [["tlEquip", "equip"], ["tlLen", "len"]].forEach(([key, k])=>{
    const sg = qs(`.seg[data-seg="${key}"]`, ov); if(!sg) return;
    const bs = qsa("button", sg), i = bs.findIndex(b=>b.dataset.v===spec[k]); if(i<0 || +sg.dataset.cur===i) return;
    sg.dataset.cur = i; bs.forEach(b=>{ const on = b.dataset.v===spec[k]; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    settleSegs(sg.parentElement);
  });
  const sum = qs("#tlSum", ov); if(sum) sum.innerHTML = tailorSumHTML(spec);
}
function tailorSave(k, v){
  const t = Object.assign({}, tailorSpec()); if(t[k]===v) return; t[k] = v; S.settings.tailor = t; save();
  tailorRefresh(t); sfx("toggle"); haptic(6);
}
let tailorBusy = false;
// change l'exercice d'une vignette en gardant la même pastille : sa contre-rotation continue, synchrone
// avec l'anneau (une pastille neuve repartirait de zéro et resterait penchée)
function tailorIc(el, e, flip){
  const t = document.createElement("div"); t.innerHTML = exoIcon(e);
  const n = t.firstElementChild, x = el.firstElementChild;
  if(!x || !n){ el.innerHTML = exoIcon(e); return; }
  x.className = n.className; x.innerHTML = n.innerHTML;
  if(flip && x.firstElementChild && x.firstElementChild.animate) x.firstElementChild.animate([{ opacity:.2, transform:"scale(.7)" }, { opacity:1, transform:"none" }], { duration:280, easing:"ease-out" });
}
// le bouton « Générer » devient le cœur de l'animation : même couleur, il se resserre jusqu'au rond
function tailorMorph(host, btn){
  const core = qs(".tl-core", host), r = btn.getBoundingClientRect(), c = core.getBoundingClientRect();
  const m = document.createElement("div"); m.className = "tl-morph";
  m.innerHTML = `<span>${btn.innerHTML}</span>`;
  const br = getComputedStyle(btn).borderRadius || "14px";
  Object.assign(m.style, { left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px", borderRadius:br });
  host.appendChild(m); btn.style.visibility = "hidden";
  const ease = "cubic-bezier(.32,.72,0,1)", D = 620;
  qs("span", m).animate([{ opacity:1, transform:"none" }, { opacity:0, transform:"scale(.85)" }], { duration:160, fill:"forwards", easing:"ease-out" });
  const a = m.animate([
    { left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px", borderRadius:br },
    { left:c.left+"px", top:c.top+"px", width:c.width+"px", height:c.height+"px", borderRadius:c.width/2+"px" },
  ], { duration:D, easing:ease, fill:"forwards" });
  qs(".tl-bg", host).animate([{ opacity:0 }, { opacity:1 }], { duration:440, delay:60, easing:"ease-out", fill:"forwards" });
  return a.finished.catch(()=>{}).then(()=>{ host.classList.add("ready"); m.animate([{ opacity:1 }, { opacity:0 }], { duration:260, fill:"forwards" }).finished.catch(()=>{}).then(()=>m.remove()); });
}
// le grand plan : la roue s'efface, les exercices retenus s'affichent en grand, un par un, avec la raison de
// leur choix et le vrai temps de calcul ; puis chacun glisse à sa ligne sur la carte du jour
function tailorRevealHTML(session){
  const N = 6, rows = session.exos.slice(0, N).map((x, i)=>{ const d = EXO_MAP[x.exoId]; if(!d) return "";
    return `<div class="tl-rv" style="--i:${i}">${exoIcon(d)}<span class="tl-rv-t"><b>${esc(d.n)}</b><small>${esc(propDose(x))}</small>${x.why ? `<small class="w">${esc(x.why)}</small>` : ""}</span></div>`; }).join("");
  const more = session.exos.length>N ? `<div class="tl-rv-more" style="--i:${N}">+ ${nb(session.exos.length - N, "exercice")}</div>` : "";
  const calc = session.tries ? `${session.tries} combinaisons et ${session.refined||0} échanges comparés en ${session.cpuMs||1} ms` : "";
  return `<div class="tl-reveal" aria-hidden="true"><div class="tl-rv-h"><b>${esc(session.name)}</b><small>${nb(session.exos.length, "exercice")} · ≈ ${estimateMinutes(session)} min${calc ? ` · ${calc}` : ""}</small></div>${rows}${more}</div>`;
}
async function tailorReveal(host, session){
  host.insertAdjacentHTML("beforeend", tailorRevealHTML(session));
  host.classList.add("reveal");
  const n = Math.min(6, session.exos.length);
  await tailorWait(520 + n*90 + 900);   // apparition échelonnée, puis le temps de lire
}
// chaque exercice du grand plan glisse à sa ligne de la carte du jour pendant que le fond s'efface
function tailorLandRows(host){
  const targets = qsa("#v-today .hero .hl-row:not(.more)").filter(t=>{ const b = t.getBoundingClientRect(); return b.top>0 && b.bottom<innerHeight; });
  const rows = qsa(".tl-rv", host);
  const layer = document.createElement("div"); layer.className = "tl-fly"; document.body.appendChild(layer);
  const ease = "cubic-bezier(.32,.72,0,1)", runs = [];
  rows.forEach((r, i)=>{
    const t = targets[i];
    if(!t){ r.animate([{ opacity:1 }, { opacity:0, transform:"translateY(12px) scale(.96)" }], { duration:260, delay:i*30, easing:"ease-in", fill:"forwards" }); return; }
    const s = r.getBoundingClientRect(), tb = t.getBoundingClientRect(), cl = r.cloneNode(true);
    cl.style.animation = "none";
    Object.assign(cl.style, { left:s.left+"px", top:s.top+"px", width:s.width+"px", height:s.height+"px" });
    layer.appendChild(cl); r.style.visibility = "hidden"; t.style.visibility = "hidden";
    const k = tb.width/s.width;
    runs.push(cl.animate([{ transform:"none" }, { transform:`translate(${tb.left-s.left}px,${tb.top-s.top}px) scale(${k})` }],
      { duration:620, delay:i*70, easing:ease, fill:"forwards" }).finished.catch(()=>{}).then(()=>{ t.style.visibility = ""; }));
  });
  qsa(".tl-rv-h, .tl-rv-more", host).forEach(el=>el.animate([{ opacity:1 }, { opacity:0 }], { duration:240, easing:"ease-out", fill:"forwards" }));
  runs.push(qs(".tl-bg", host).animate([{ opacity:1 }, { opacity:0 }], { duration:520, delay:120, easing:"ease-in-out", fill:"forwards" }).finished.catch(()=>{}));
  return Promise.all(runs).then(()=>{ layer.remove(); targets.forEach(t=>{ t.style.visibility = ""; }); });
}
// (ancien atterrissage, depuis l'anneau : gardé pour l'animation réduite)
function tailorLand(host){
  const targets = qsa("#v-today .hero .hl-row:not(.more) .xico").filter(t=>{ const b = t.getBoundingClientRect(); return b.top>0 && b.bottom<innerHeight; });
  const srcs = qsa(".tl-ic.keep .xico", host).slice(0, targets.length);
  const layer = document.createElement("div"); layer.className = "tl-fly"; document.body.appendChild(layer);
  const ease = "cubic-bezier(.32,.72,0,1)", runs = [];
  srcs.forEach((sx, i)=>{
    const s = sx.getBoundingClientRect(), t = targets[i].getBoundingClientRect(), cl = sx.cloneNode(true);
    Object.assign(cl.style, { left:s.left+"px", top:s.top+"px", width:s.width+"px", height:s.height+"px" });
    layer.appendChild(cl); sx.style.visibility = "hidden"; targets[i].style.visibility = "hidden";
    const k = t.width/s.width;
    runs.push(cl.animate([{ transform:"none" }, { transform:`translate(${t.left-s.left}px,${t.top-s.top}px) scale(${k})` }],
      { duration:560, delay:i*55, easing:ease, fill:"forwards" }).finished.catch(()=>{}).then(()=>{ targets[i].style.visibility = ""; }));
  });
  qs(".tl-think", host).animate([{ opacity:1 }, { opacity:0 }], { duration:220, easing:"ease-out", fill:"forwards" });
  runs.push(qs(".tl-bg", host).animate([{ opacity:1 }, { opacity:0 }], { duration:480, delay:80, easing:"ease-in-out", fill:"forwards" }).finished.catch(()=>{}));
  return Promise.all(runs).then(()=>{ layer.remove(); targets.forEach(t=>{ t.style.visibility = ""; }); });
}
Object.assign(ACT, {
  // ouverte depuis « Choisir une séance » : un sous-écran (« Retour » y ramène)
  tailorOpen(d){
    sfx("open");
    openSheet(tailorSheetHTML(), { child:!!(d && d.child), footer:tailorFootHTML() });
    sheetBackHead();
    settleSegs(qs("#overlay"));
  },
  tailorSet(d){ tailorSave(d.k, d.v); },
  tailorEquip(d){ tailorSave("equip", d.v); },
  tailorLen(d){ tailorSave("len", d.v); },
  // d.spec : relancer la réflexion sur les mêmes critères (« Autre séance sur mesure »), d.avoid : exercices à
  // laisser de côté (ceux de la séance précédente)
  async tailorGo(d){
    if(tailorBusy) return; tailorBusy = true;
    const spec = d && d.spec && typeof d.spec==="object" ? d.spec : tailorSpec(), fast = reducedMotion();
    if(tailorSummary(spec).warn){ tailorBusy = false; toast("Pas assez d'exercices pour ces critères avec ton matériel", "info"); return; }
    const btn = qs('#overlay .sheet-ft [data-a="tailorGo"]');
    const host = document.createElement("div"); host.className = "tl-host" + (fast ? " fast" : ""); host.innerHTML = tailorThinkHTML(spec); document.body.appendChild(host);
    document.body.classList.add("tl-on");   // l'heure et la batterie restent lisibles au-dessus de l'animation
    sfx("go"); haptic(10);
    // les vignettes : de vrais candidats de la sélection ; pendant les combinaisons, elles changent
    const pool = tailorPool(spec), ics = qsa(".tl-ic", host);
    ics.forEach((el, i)=>{ const e = pool[i % Math.max(1, pool.length)]; if(e) el.innerHTML = exoIcon(e); });
    // le bouton se détache de la feuille qui descend, et devient le cœur
    const morph = btn && !fast && btn.getBoundingClientRect().width ? tailorMorph(host, btn) : (host.classList.add("ready"), null);
    closeSheet();
    if(morph) await morph;
    const shuffle = ()=>ics.forEach(el=>{ if(Math.random()<.4){ const e = pool[(Math.random()*pool.length)|0]; if(e) tailorIc(el, e, true); } });
    let spin = 0;
    const onStep = (i, txt)=>{
      qsa(".tl-steps li", host).forEach(li=>{ const k = +li.dataset.i; li.classList.toggle("done", k<i); li.classList.toggle("on", k===i); });
      const sm = qs(`.tl-steps li[data-i="${i}"] small`, host); if(sm && txt) sm.textContent = txt;
      if(i===1 && !spin && !fast) spin = setInterval(shuffle, 150);
      if(i>=2 && spin){ clearInterval(spin); spin = 0; }
      if(i>0 && sm && !sm._tk){ sm._tk = 1; sfx("tick"); }
    };
    if(!fast) await tailorWait(380);   // les vignettes sortent du cœur avant la première étape
    let session;
    try{ session = await tailorGenerate(spec, onStep, { fast, minMs:1900, avoid:d && d.avoid }); }
    catch(e){ if(typeof reportError==="function") reportError("tailor", e); }
    if(spin) clearInterval(spin);
    if(!session || !session.exos.length){
      host.classList.add("gone"); setTimeout(()=>{ host.remove(); document.body.classList.remove("tl-on"); }, 320); tailorBusy = false;
      toast("Pas assez d'exercices pour ces critères avec ton matériel", "info"); return;
    }
    // les exercices retenus prennent place dans l'anneau
    qsa(".tl-steps li", host).forEach(li=>{ li.classList.add("done"); li.classList.remove("on"); });
    const chosen = session.exos.map(x=>EXO_MAP[x.exoId]).filter(Boolean);
    ics.forEach((el, i)=>{ const e = chosen[i]; el.classList.toggle("keep", !!e); if(e) tailorIc(el, e); });
    host.classList.add("found"); sfx("set"); haptic(16);
    if(!fast) await tailorWait(600);
    // grand plan des exercices retenus
    if(!fast){ await tailorReveal(host, session); sfx("swipe"); }
    // la carte du jour se construit sous le voile (sans animation d'entrée), puis les exercices y glissent
    S.draft = session; S.settings.todayTab = "proposal"; propAdjust = false; heroAll = false; save();
    if(currentTab!=="today") switchTab("today");
    scrollTodayTop(); renderView("today");
    if(fast){ host.remove(); document.body.classList.remove("tl-on"); tailorBusy = false; return; }
    try{ await tailorLandRows(host); } finally{ host.remove(); document.body.classList.remove("tl-on"); tailorBusy = false; }
  },
});
