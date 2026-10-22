// ================= COACH : fatigue en séance et manière de faire apprise =================
// 1. Fatigue en séance. Un muscle qui a déjà travaillé dans la séance fait moins de répétitions à
//    charge égale : un exercice placé plus tard en donne moins (Simão 2012, revue sur l'ordre des
//    exercices ; Spreuwenberg 2006). Repère retenu : −4 % de répétitions par série dure déjà faite
//    sur le même muscle (une demi-série s'il n'y est que secondaire), 25 % au plus. Quand ton
//    historique le permet, ce taux est appris muscle par muscle (même exercice, même charge, fait
//    frais puis fatigué). Conséquences :
//    · des répétitions en moins expliquées par la fatigue ne comptent pas comme un échec (la charge
//      n'est pas baissée pour ça) ;
//    · la force estimée est ramenée « à frais » (elle ne baisse pas parce qu'un exercice était en fin de séance) ;
//    · l'objectif du jour suit la place de l'exercice dans la séance.
// 2. Manière de faire, apprise sur les 8 dernières semaines (rien n'est demandé) :
//    · tes répétitions habituelles sur les exercices chargés : si tu travailles nettement plus
//      lourd ou plus léger que la fourchette de ton objectif, la fourchette suit ;
//    · ton rythme : si tu montes la charge plus souvent que proposé, la progression accélère ;
//      si tu la gardes plus légère, elle ralentit ;
//    · aller au bout de tes séries (« 0 » en réserve) est-il ta façon de faire ? Si oui, ça ne
//      freine plus la progression.

const FATIGUE = { rate:.04, max:.25, sec:.5, minRate:.015, maxRate:.07 };
const MUSCLE_POSS = { pect:"tes pectoraux", dos:"ton dos", epaules:"tes épaules", biceps:"tes biceps", triceps:"tes triceps",
  avantbras:"tes avant-bras", quadriceps:"tes quadriceps", ischios:"tes ischios", fessiers:"tes fessiers", mollets:"tes mollets",
  abdos:"tes abdos", cardio:"ton cardio" };
const musclePoss = m=>MUSCLE_POSS[m] || "ce muscle";

// part d'un muscle dans un exercice : 1 s'il est principal, ½ s'il est secondaire
function muscleShare(def, m){ return !def || isStretch(def) ? 0 : def.muscles[0]===m ? 1 : def.muscles.includes(m) ? FATIGUE.sec : 0; }
// séries équivalentes déjà faites sur le muscle principal de session.exos[exi], avant lui
// (séance terminée : les exercices sont rangés dans l'ordre où ils ont été faits). planned : séance
// pas encore faite, on compte les séries prévues.
function preFatigue(session, exi, planned){
  const ex0 = session && session.exos[exi], def = ex0 && EXO_MAP[ex0.exoId]; if(!def) return 0;
  const m = def.muscles[0]; let n = 0;
  for(let i=0;i<exi;i++){
    const ex = session.exos[i], k = muscleShare(EXO_MAP[ex.exoId], m); if(!k) continue;
    n += k*(planned ? ex.sets.length : ex.sets.filter(s=>s.done && s.reps>0).length);
  }
  return n;
}
// en séance : ce que le muscle a déjà fait jusqu'ici (les autres exercices, dans n'importe quel ordre)
function livePreFatigue(draft, exi){
  const ex0 = draft && draft.exos[exi], def = ex0 && EXO_MAP[ex0.exoId]; if(!def) return 0;
  const m = def.muscles[0]; let n = 0;
  draft.exos.forEach((ex, i)=>{ if(i===exi) return; const k = muscleShare(EXO_MAP[ex.exoId], m); if(k) n += k*ex.sets.filter(s=>s.done && s.reps>0).length; });
  return n;
}
function fatigueRate(m){ const p = coachProfile(); return (p && p.rates[m]) || FATIGUE.rate; }
// part des répétitions qu'on peut encore faire (1 = frais)
function fatigueFactor(pre, m){ return pre>0 ? 1 - Math.min(FATIGUE.max, fatigueRate(m)*pre) : 1; }
// facteur de fatigue d'un exercice d'une séance terminée
function exoFatigue(session, ex){
  const def = EXO_MAP[ex.exoId], i = session.exos.indexOf(ex);
  return def && i>0 ? fatigueFactor(preFatigue(session, i), def.muscles[0]) : 1;
}

// ---------- manière de faire apprise ----------
// fourchette de l'objectif, sans ajustement personnel
function goalRange(exo){
  const goal = S.goals.overall, mid = Math.round((exo.repsMin+exo.repsMax)/2);
  if(goal==="force") return [exo.repsMin, mid];
  if(goal==="endurance") return [mid, exo.repsMax+4];
  return [exo.repsMin, exo.repsMax];
}
const median = a=>{ const s = a.slice().sort((x,y)=>x-y), k = s.length>>1; return s.length%2 ? s[k] : (s[k-1]+s[k])/2; };
function coachProfile(){ return memoHist("coach"+S.goals.overall, coachProfile_raw); }
function coachProfile_raw(){
  const from = addDaysISO(todayISO(), -56), recent = S.sessions.filter(s=>s.date>=from);
  const out = { n:recent.length, repShift:0, pace:0, failure:false, rates:{}, learned:{} };
  if(recent.length<4) return out;
  // 1. répétitions habituelles (1re série, la moins fatiguée) face à la fourchette de l'objectif, exercices chargés
  const diffs = [], days = new Set();
  recent.forEach(s=>s.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def) || !kgType(def) || isTimed(def)) return;
    const st = ex.sets.find(x=>x.done && x.reps>0 && x.weight>0); if(!st) return;
    const i = s.exos.indexOf(ex), pre = i>0 ? preFatigue(s, i) : 0;   // taux par défaut ici (le profil se calcule)
    const [a, b] = goalRange(def), r = st.reps/(1 - Math.min(FATIGUE.max, FATIGUE.rate*pre));
    diffs.push(r<a ? r-a : r>b ? r-b : 0); days.add(s.date);
  }));
  if(diffs.length>=8 && days.size>=4){ const md = median(diffs); if(Math.abs(md)>=2) out.repShift = Math.max(-4, Math.min(4, Math.round(md))); }
  // 2. rythme : charge réellement faite face à la charge proposée
  let up = 0, down = 0, same = 0;
  recent.forEach(s=>s.exos.forEach(ex=>{
    if(!(ex.pw>0)) return; const w = Math.max(0, ...ex.sets.filter(x=>x.done).map(x=>x.weight||0)); if(!w) return;
    if(w>ex.pw+.01) up++; else if(w<ex.pw-.01) down++; else same++;
  }));
  const tot = up+down+same;
  if(tot>=6){ if(up/tot>=.5 && up>2*down) out.pace = 1; else if(down/tot>=.5 && down>2*up) out.pace = -1; }
  // 3. aller au bout de ses séries : sa façon de faire, ou un signal ?
  let ef = 0, ef3 = 0; recent.forEach(s=>s.exos.forEach(ex=>ex.sets.forEach(x=>{ if(x.done && x.effort){ ef++; if(x.effort===3) ef3++; } })));
  out.failure = ef>=12 && ef3/ef>=.6;
  // 4. fatigue propre à chaque muscle : même exercice, même charge, 1re série faite frais puis fatiguée
  // (sur tout l'historique, 6 mois au plus)
  const from6 = addDaysISO(todayISO(), -183), pairs = {};
  S.sessions.forEach(s=>{ if(s.date<from6) return; s.exos.forEach((ex, i)=>{
    const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def) || isTimed(def)) return;
    const st = ex.sets.find(x=>x.done && x.reps>0); if(!st) return;
    const key = ex.exoId+"|"+(st.weight||0), pre = preFatigue(s, i);
    (pairs[key] = pairs[key] || { m:def.muscles[0], pts:[] }).pts.push([pre, st.reps]);
  }); });
  const acc = {};
  Object.values(pairs).forEach(({ m, pts })=>{
    const fresh = pts.filter(p=>p[0]<1.5), tired = pts.filter(p=>p[0]>=3);
    if(fresh.length<2 || tired.length<2) return;
    const rf = median(fresh.map(p=>p[1])), rt = median(tired.map(p=>p[1])), dp = median(tired.map(p=>p[0])) - median(fresh.map(p=>p[0]));
    if(rf<=0 || dp<=0) return;
    const a = acc[m] || (acc[m] = { s:0, w:0 }), w = Math.min(fresh.length, tired.length);
    a.s += Math.max(0, 1-rt/rf)/dp * w; a.w += w;
  });
  Object.keys(acc).forEach(m=>{ if(acc[m].w>=3){ const r = acc[m].s/acc[m].w; out.rates[m] = Math.max(FATIGUE.minRate, Math.min(FATIGUE.maxRate, r)); out.learned[m] = true; } });
  return out;
}

// « Ce que l'app a compris de toi » (Progrès) : seulement ce qui a été appris, en phrases courtes
function coachLines(){
  const p = coachProfile(); if(!p || p.n<4) return [];
  const L = [];
  if(p.repShift) L.push(["target", p.repShift<0 ? "Tu travailles plus lourd que la fourchette de ton objectif : les répétitions proposées suivent." : "Tu fais plus de répétitions que la fourchette de ton objectif : les répétitions proposées suivent."]);
  if(p.pace>0) L.push(["trendUp", "Tu montes souvent la charge plus vite que proposé : la progression suit ton rythme."]);
  else if(p.pace<0) L.push(["leaf", "Tu gardes souvent une charge plus légère que proposé : la progression ralentit d'un cran."]);
  if(p.failure) L.push(["flame", "Tu vas souvent au bout de tes séries : c'est ta façon de faire, ça ne freine plus la progression."]);
  const ms = Object.keys(p.learned).sort((a,b)=>p.rates[b]-p.rates[a]).slice(0, 2);
  if(ms.length) L.push(["repeat", `En fin de séance, ${ms.map(m=>`${musclePoss(m)} perdent ${Math.round(p.rates[m]*100)} %`).join(", ")} de répétitions par série déjà faite : l'app en tient compte.`]);
  else if(p.n>=4) L.push(["repeat", "Les répétitions en moins en fin de séance sont comptées comme de la fatigue, pas comme un manque de force."]);
  return L;
}
function coachCardHTML(){
  const L = coachLines(); if(!L.length) return "";
  const g = typeof GOAL_LABELS!=="undefined" ? GOAL_LABELS[S.goals.overall] : "";
  return `<section class="card coach-card" aria-label="Ce que l'app a compris de toi">
    <div class="co-h"><span class="t">Ce que l'app a compris</span>${g ? `<span class="co-goal">${esc(g)}</span>` : ""}</div>
    ${L.map(([ic, t])=>`<div class="co-l">${ii(ic)}<span>${esc(t)}</span></div>`).join("")}
  </section>`;
}

// ---------- séances construites dans l'ordre : chaque exercice connaît la fatigue de ceux d'avant ----------
// list : [[exo, séries?]]
function entriesInOrder(list){
  const out = [];
  list.forEach(([exo, n])=>{ out.push(entryAt(out, exo, out.length, n)); });
  return out;
}
// entrée pour l'exercice exo placé en position idx parmi exos (séries prévues des précédents)
function entryAt(exos, exo, idx, n){
  const tmp = { exos: exos.slice(0, idx).concat([{ exoId:exo.id, sets:[] }]) };
  return sessionEntryFor(exo, n, isStretch(exo) ? 0 : preFatigue(tmp, idx, true));
}

// « à battre » en séance : plus fatigué que la dernière fois (exercice placé plus tard, muscle déjà
// sollicité), une série un peu en dessous peut valoir mieux. 1 : mieux à fatigue égale.
function liveFatigue(draft, ex){ const i = draft ? draft.exos.indexOf(ex) : -1, def = EXO_MAP[ex.exoId]; return i<0 || !def ? 1 : fatigueFactor(livePreFatigue(draft, i), def.muscles[0]); }
function beatTired(def, st, ref, fN){
  const fR = ref.f || 1; if(!(fN<fR-.04)) return 0;
  return beatCmp(def, { reps:(st.reps||0)/fN, weight:st.weight }, Object.assign({}, ref, { reps:ref.reps/fR })) > 0 ? 1 : 0;
}
