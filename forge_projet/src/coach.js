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
  if(ms.length) L.push(["repeat", `Fatigue en fin de séance : ${ms.map(m=>`−${Math.round(p.rates[m]*100)} % de répétitions par série déjà faite pour ${musclePoss(m)}`).join(", ")}. L'app en tient compte.`]);
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

// ================= PROFIL D'ENTRAÎNEMENT =================
// Ce que l'app sait de toi au-delà des réglages, pour choisir les exercices, les séries et les charges :
// tes habitudes (exercices faits, sautés, remplacés), ta force réelle (première charge d'un exercice
// nouveau) et le volume visé par muscle selon ton objectif, ton niveau, ton âge et ta fréquence.

// habitudes sur 90 jours : séances où l'exercice a été fait, ou laissé sans aucune série (sauté)
function exoHabits(){
  return memoHist("habits", ()=>{
    const from = addDaysISO(todayISO(), -90), out = {};
    S.sessions.forEach(s=>{
      if(s.date<from || !s.exos.some(ex=>ex.sets.some(st=>st.done))) return;
      s.exos.forEach(ex=>{ const o = out[ex.exoId] || (out[ex.exoId] = { done:0, skip:0 }); if(ex.sets.some(st=>st.done)) o.done++; else o.skip++; });
    });
    return out;
  });
}
// bonus d'un exercice fait souvent (tu connais les charges), malus d'un exercice souvent sauté ou
// remplacé dans les propositions : l'app finit par comprendre ce que tu n'aimes pas
function exoAffinity(id){
  const a = exoHabits()[id], sw = ((S.prefs && S.prefs.swapped) || {})[id] || 0;
  let s = 0;
  if(a){
    if(a.done>=3) s += .6;
    if(a.skip>=2) s -= a.skip>=a.done ? 2.5 : 1;
  }
  if(sw>=2) s -= Math.min(3, sw*.8);
  return s;
}
// force réelle : tes meilleures séries récentes (1RM estimé) face au point de départ d'un pratiquant
// moyen (START_KG), par type de mouvement ; 1 = moyen. Au moins deux exercices pour un repère global.
function strengthFactor(kind){
  const r = memoHist("sfac", ()=>{
    const by = {}, all = [], seen = new Set(), from = addDaysISO(todayISO(), -180);
    for(let i=S.sessions.length-1; i>=0; i--){
      const s = S.sessions[i]; if(s.date<from) break;
      s.exos.forEach(ex=>{
        if(seen.has(ex.exoId)) return;
        const def = EXO_MAP[ex.exoId], t = def && kgType(def); if(!t || isTimed(def) || !START_KG[t]) return;
        const d = ex.sets.filter(st=>st.done && st.weight>0 && st.reps>0); if(!d.length) return;
        seen.add(ex.exoId);
        const k = startKind(def), mid = Math.round((def.repsMin+def.repsMax)/2);
        const f = Math.max(...d.map(st=>estimated1RM(st.weight, st.reps)))/estimated1RM(START_KG[t][k], mid);
        (by[k] = by[k] || []).push(f); all.push(f);
      });
    }
    const out = { all:all.length>=2 ? median(all) : null };
    Object.keys(by).forEach(k=>{ out[k] = median(by[k]); });
    return out;
  });
  const f = r[kind] ?? r.all;
  return f ? Math.max(.4, Math.min(3, f)) : null;
}
// séries visées par muscle et par semaine (repères : ~10 pour prendre du muscle, moins pour débuter,
// plus pour un avancé ; Schoenfeld 2017, Pelland 2024), selon tes priorités par muscle
function weeklySetTarget(m){
  const g = S.goals, base = g.overall==="hypertrophie" ? 10 : 8;
  const e = (g.emphasis || {})[m];
  return base*(g.level==="debutant" ? .7 : g.level==="avance" ? 1.3 : 1)*(g.senior ? .85 : 1)*(e==="prioriser" ? 1.3 : e==="eviter" ? .5 : 1);
}
const SESSION_MIN = { court:25, moyen:40, long:60 };
// séries de chaque exercice d'une séance : ce qui manque cette semaine à son muscle, réparti sur les
// séances qui restent (ta fréquence) et sur les exercices du même muscle ; 2 à 5 séries (4 pour un
// débutant, après 65 ans ou en isolation) ; puis la durée de séance choisie est tenue
function profileSets(exos, minutes){
  const cap = S.goals.level==="debutant" || S.goals.senior ? 4 : 5;
  return fitSetsToTime(exos, profileBase(exos), (minutes || SESSION_MIN[S.goals.sessionLength] || 40)*60, cap, isoExo);
}
const isoExo = e=>["biceps","triceps","avantbras","mollets"].includes(e.muscles[0]) || e.pattern==="core";
function profileBase(exos){
  const vol = {}; try{ muscleVolume(7).forEach(r=>{ vol[r.id] = r.sets; }); }catch(e){}
  const d = Math.max(1, Math.min(7, S.goals.daysPerWeek || 3)), today = todayISO();
  const done7 = S.sessions.filter(s=>daysBetween(s.date, today)<7 && s.exos.some(ex=>ex.sets.some(st=>st.done))).length;
  const left = Math.max(1, d - done7), k = {};
  exos.forEach(e=>{ k[e.muscles[0]] = (k[e.muscles[0]] || 0) + 1; });
  const cap = S.goals.level==="debutant" || S.goals.senior ? 4 : 5, iso = isoExo;
  return exos.map(e=>{
    if(isStretch(e) || e.muscles[0]==="cardio") return e.sets;
    const m = e.muscles[0], t = weeklySetTarget(m), per = t/d;
    const want = Math.max(per*.6, Math.min(per*1.5, Math.max(0, t - (vol[m] || 0))/left));
    return Math.max(2, Math.min(iso(e) ? Math.min(cap, 4) : cap, Math.round(want/k[m])));
  });
}
// tenir une durée : on retire d'abord sur la fin de séance (exercices d'appoint), on ajoute d'abord sur
// les gros mouvements du début (une série de plus au plus que ce que vise ton profil) ; seulement si
// l'écart est net (±15 %)
function fitSetsToTime(exos, sets, goalSec, cap, iso){
  const base = sets; sets = sets.slice();
  const sec = ()=>exos.reduce((t,e,i)=>t + sets[i]*(40 + e.restSec), 0), free = i=>!isStretch(exos[i]);
  if(sec()>goalSec*1.15){
    for(let n=0; n<40 && sec()>goalSec*1.05; n++){
      let b = -1; for(let j=exos.length-1; j>=0; j--) if(free(j) && sets[j]>2 && (b<0 || sets[j]>sets[b])) b = j;
      if(b<0) break; sets[b]--;
    }
  } else if(sec()<goalSec*.85){
    for(let n=0; n<40 && sec()<goalSec*.95; n++){
      let b = -1; for(let j=0; j<exos.length; j++) if(free(j) && sets[j]<Math.min(base[j]+1, iso && iso(exos[j]) ? Math.min(cap, 4) : cap) && (b<0 || sets[j]<sets[b])) b = j;
      if(b<0) break; sets[b]++;
    }
  }
  return sets;
}
