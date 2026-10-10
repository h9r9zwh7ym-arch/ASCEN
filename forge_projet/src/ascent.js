// ================= ASCENSION : moteur =================
// Chaque séance fait gravir de vraies montagnes, de la Gruyère à l'Everest (13 expéditions).
// Vitesse d'une séance = effort × régularité × force :
//  - effort : séries difficiles de la séance (une série faite exprès facile compte moitié), plafonnées à 20 ;
//  - régularité : la série de semaines où l'objectif de séances est tenu (paliers 0/2/4/8/12/20 → ×0,5 à ×3) ;
//  - force : l'indice de force (strength.js) par rapport aux débuts, amorti (+10 % de force → +6 % de vitesse),
//    borné entre ×0,85 et ×1,6.
// Une semaine sans séance fait redescendre au camp précédent ; les sommets gagnés restent acquis.
// Tout est recalculé depuis l'historique (aucune donnée dupliquée) : modifier ou supprimer une séance
// corrige l'ascension. Seules les pauses déclarées et les célébrations déjà vues sont enregistrées (S.ascent).
// Réglages choisis avec YaYa : un profil régulier atteint l'Everest en 3 à 4 ans, un profil irrégulier ne
// dépasse pas le Titlis, une séance de temps en temps compte très peu.
const ASC_ORDER = Object.keys(ASC_DATA);
const ASC_REQ = { moleson:0, pilatus:2, titlis:4, eiger:8, monch:8, jungfrau:8, dentblanche:8, cervin:8, montblanc:12, kilimanjaro:12, aconcagua:20, k2:20, everest:20 };
const ASC_TH = [0, 2, 4, 8, 12, 20], ASC_MUL = [.5, 1, 1.5, 2, 2.5, 3];
const ASC_PUSH = .12;          // dernière ligne droite : les 12 derniers % du dénivelé
const ASC_FORM_OK = .95;       // … à pleine vitesse quand la force est à 95 % de son meilleur niveau des 6 derniers mois
const ASC_PAUSE_MAX = 2;       // semaines de pause déclarées par trimestre (vacances, maladie)
const ASC_GROUPS = [["Suisse", ASC_ORDER.slice(0, 8)], ["Le monde", ASC_ORDER.slice(8)]];
// trophées de sommet : métal selon la difficulté
const ASC_TIER_OF = k=>({ moleson:"bronze", pilatus:"bronze", titlis:"silver", eiger:"silver" }[k] || (ASC_ORDER.indexOf(k)<9 ? "gold" : "diamond"));
const ASC_TIERS = { bronze:["#7A4520","#A8672F","#E7B07A","Bronze","Préalpes"], silver:["#5E636B","#9AA0A8","#EEF0F3","Argent","les 3 000"],
  gold:["#8A6206","#BF8A0F","#F6D56A","Or","les 4 000"], diamond:["#5B6FD6","#9FE6FF","#F3E8FF","Diamant","le monde"] };

function ascTier(series){ let p = 0; ASC_TH.forEach((t,i)=>{ if(series>=t) p = i; }); return p; }
function ascDrop(series){ return ASC_TH[Math.max(0, ascTier(series)-1)]; }
// séries difficiles d'une séance (même règle que la charge d'entraînement, strength.js)
function ascHardSets(s){
  let n = 0;
  for(const ex of s.exos){ const def = EXO_MAP[ex.exoId]; if(def && isStretch(def)) continue;
    for(const st of ex.sets) if(st.done) n += st.effort===1 ? .5 : 1; }
  return n;
}
// 11 m pour une séance de 15 séries difficiles : un profil régulier (3 séances, série au palier maximal,
// force +20 à +40 %) monte ≈ 120 m par semaine, soit l'Everest en ≈ 4 ans (≈ 23 700 m sur 13 expéditions)
function ascEffort(hard){ return 11*Math.min(hard, 20)/15; }
function ascForceMult(index){ return Math.min(1.6, Math.max(.85, 1 + (index/100 - 1)*.6)); }
// Élan de départ (1er tour seulement) : au moins ×3,5 à la 1re séance, qui s'estompe jusqu'à ×1 à la 45ᵉ. La
// régularité part de ×0,5 : sans élan, le premier sommet (Moléson) demandait 31 séances ; avec, ≈ 14
// (≈ 5 semaines à 3 séances), et le rythme vers l'Everest ne bouge presque pas (≈ 4 ans).
const ASC_ELAN = [3.5, 45];
// (0 au-delà : l'élan disparaît, la régularité seule compte ; 0 aussi au 2ᵉ tour)
function ascElan(n, lap){ return lap || !ASC_ELAN[0] || n>ASC_ELAN[1] ? 0 : 1 + (ASC_ELAN[0]-1)*(1 - (n-1)/ASC_ELAN[1]); }
const ascMulEff = (tier, n, lap)=>Math.max(ASC_MUL[tier], ascElan(n, lap));
// Records et séries battues font monter plus haut : un record compte pour 3 séries de plus (3 au plus par
// séance), une série « mieux que la dernière fois » pour 1 de plus (4 au plus). La vraie progression en
// force se voit sur la montagne ; une récompense qui varie d'une séance à l'autre.
const ASC_BONUS = { pr:3, prMax:3, beat:1, beatMax:4 };
function ascPRs(s){ let n = 0; for(const ex of s.exos){ const def = EXO_MAP[ex.exoId]; if(def && isStretch(def)) continue; for(const st of ex.sets) if(st.done && st.pr) n++; } return n; }
// Retour en force : après une semaine sans séance (retour au camp précédent), chaque séance compte double
// jusqu'à retrouver l'altitude perdue. Revenir doit être une récompense, pas une corvée.
const ASC_BACK = 2;
function ascBonusSets(prs, beats){ return ASC_BONUS.pr*Math.min(prs, ASC_BONUS.prMax) + ASC_BONUS.beat*Math.min(beats||0, ASC_BONUS.beatMax); }
// ---------- camps : rapprochés, pour qu'on en atteigne souvent ----------
// On simule un profil régulier (3 séances de 15 séries par semaine, série qui monte, élan de départ, force +12 %
// sur les 400 premières séances) sur tout l'itinéraire, et on pose un camp toutes les 2 séances sur les deux
// premières montagnes (le premier camp du Moléson dès la 1re séance, même courte : une victoire tout de suite),
// puis toutes les 3. Les refuges réels (ASC_DATA) restent à leur
// place ; les camps génériques trop proches d'un refuge sont retirés. Une semaine sans séance ne coûte donc
// que 2 ou 3 séances (retour au camp précédent).
const ASC_GENERIC = (k, n)=>/^Bivouac \d+$/.test(n) || (!/^(k2|everest)$/.test(k) && /^Camp \d+$/.test(n));
const ASC_CAMPS = (()=>{
  const out = {}; let series = 0, n = 0;
  ASC_ORDER.forEach((k, mi)=>{
    const D = ASC_DATA[k], named = D.camps.filter(c=>!ASC_GENERIC(k, c[1]));
    const pos = []; let alt = D.start;
    while(alt<D.top){
      n++; const third = n%3===0;
      alt += ascEffort(15)*ascMulEff(ascTier(series + (third ? 1 : 0)), n, 0)*(1 + .12*Math.min(1, n/400));
      pos.push(Math.min(alt, D.top)); if(third) series++;
    }
    const N = mi<2 ? 2 : 3, step = (D.top - D.start)/pos.length*N, gen = [];
    for(let i=mi ? N : 1; i<pos.length; i+=N) if(D.top - pos[i-1]>step*.5 && named.every(c=>Math.abs(c[0] - pos[i-1])>step*.5)) gen.push(pos[i-1]);
    // tout premier camp aux 3/5 d'une séance type : atteint dès la 1re séance, même courte (≈ 9 séries)
    if(!mi && gen.length) gen[0] = D.start + (gen[0] - D.start)*.6;
    const all = named.map(c=>({ p:c[0], n:c[1], r:c[2] })).concat(gen.map(p=>({ p:Math.round(p), n:null }))).sort((a, b)=>a.p-b.p);
    const numbered = named.some(c=>/^Camp \d/.test(c[1]));
    let g = 0;
    out[k] = all.map((c, i)=>c.n ? [c.p, c.n, c.r] : [c.p, numbered ? `Bivouac ${++g}` : `Camp ${i+1}`, c.p]);
  });
  return out;
})();
function ascCamps(k){ return ASC_CAMPS[k]; }
// carnet de route (data_ascent_story.js) : pour chaque camp, { t: terrain ou lieu, q: ligne du carnet, real, art }.
// Toujours la même carte pour le même camp : les libellés et les lignes d'un terrain passent à tour de rôle,
// à partir d'un point qui dépend de la montagne ; une ligne propre à la montagne remplace celle du camp le plus proche.
const ASC_STORY = {};
function ascStory(k){
  if(ASC_STORY[k]) return ASC_STORY[k];
  const camps = ascCamps(k), zones = ASC_ZONES[k], own = {}, cnt = {}, cur = {};
  let h = 7; for(const ch of k) h = (h*31 + ch.charCodeAt(0))>>>0;
  (ASC_LINES[k] || []).forEach(([alt, q])=>{
    let best = -1; camps.forEach((c, i)=>{ if(!ASC_PLACES[k+"/"+c[1]] && own[i]==null && (best<0 || Math.abs(c[0]-alt)<Math.abs(camps[best][0]-alt))) best = i; });
    if(best>=0) own[best] = q;
  });
  return ASC_STORY[k] = camps.map((c, i)=>{
    const z = zones.find(x=>c[0]<=x[0]) || zones[zones.length-1], T = ASC_TERRAIN[z[1]], p = ASC_PLACES[k+"/"+c[1]];
    if(p) return { t:p[0], q:p[1], real:true, art:T.art };
    const zi = zones.indexOf(z), n = cnt[zi] = (cnt[zi]==null ? -1 : cnt[zi]) + 1, L = z[2] || T.l, t = L[(n + (z[2] ? 0 : h))%L.length];
    if(own[i]) return { t, q:own[i], real:false, art:T.art };
    if(T.f && !n && zi && zones[zi-1][1]!==z[1]) return { t, q:T.f, real:false, art:T.art };   // on entre dans ce terrain
    const m = cur[z[1]] = cur[z[1]]==null ? h%T.q.length : (cur[z[1]] + 1)%T.q.length;
    return { t, q:T.q[m], real:false, art:T.art };
  });
}
// le « de/du/de l' » devant un nom de sommet
function ascDu(k){ const n = ASC_DATA[k].n; return /^[AEIOUÉ]/.test(n) ? `de l'${n}` : /^(Mont|Cervin|Moléson|Pilatus|Titlis|Mönch|K2|Kilimandjaro)/.test(n) ? `du ${n}` : `de la ${n}`; }
function ascLe(k){ const n = ASC_DATA[k].n; return /^[AEIOUÉ]/.test(n) ? `l'${n}` : /^(Mont|Cervin|Moléson|Pilatus|Titlis|Mönch|K2|Kilimandjaro)/.test(n) ? `le ${n}` : `la ${n}`; }
function ascAu(k){ const n = ASC_DATA[k].n; return /^[AEIOUÉ]/.test(n) ? `à l'${n}` : /^(Mont|Cervin|Moléson|Pilatus|Titlis|Mönch|K2|Kilimandjaro)/.test(n) ? `au ${n}` : `à la ${n}`; }
function ascPauses(){ return (S.ascent && Array.isArray(S.ascent.pauses)) ? S.ascent.pauses : []; }
// trimestre civil d'une semaine (lundi) : « 2026-4 »
function ascQuarter(w){ return w.slice(0,4)+"-"+(Math.floor((+w.slice(5,7)-1)/3)+1); }

function ascent(){ return memo("ascent:"+todayISO(), ascent_raw); }
// extra : une séance de plus, aujourd'hui (la séance en cours, pour l'altitude en direct : même calcul exactement)
function ascent_raw(extra){
  const goal = S.goals.daysPerWeek||3, today = todayISO(), thisWeek = weekKey(today);
  const pauses = new Set(ascPauses());
  // semaines allégées : celles du journal, la semaine en cours si elle l'est, et les séances marquées
  const deloads = new Set((S.deloadLog||[]).map(weekKey));
  if(S.deload) deloads.add(weekKey(S.deload.start));
  const byWeek = new Map(); let firstWeek = null;
  for(const s of extra ? S.sessions.concat([extra]) : S.sessions){
    const hard = ascHardSets(s); if(!hard) continue;   // étirements seuls : ni montée ni séance comptée
    const w = weekKey(s.date); if(!firstWeek) firstWeek = w;
    (byWeek.get(w) || byWeek.set(w, []).get(w)).push({ s, hard });
    if(s.exos.some(ex=>ex.deload)) deloads.add(w);
  }
  const k0 = ASC_ORDER[0];
  const st = { lap:0, i:0, alt:ASC_DATA[k0].start, wait:false, series:0, expFrom:null, expN:0, campDates:{}, n:0 };
  const out = { weeks:[], summits:[], descents:[], log:{}, last:null }, effs = [], bons = [];
  // force : indice à la fin de la semaine précédente, recalculé toutes les 4 semaines ; forme = indice
  // rapporté à son meilleur niveau des 6 derniers mois (la dernière ligne droite la demande)
  // (blocs fixes de 4 semaines depuis la première : la valeur affichée est celle qu'utilisera la prochaine séance)
  const blocks = []; let blockN = null, force = { mult:1, form:1, index:null };
  const forceFor = wi=>{
    const b = Math.floor(wi/4); if(b===blockN) return force;
    blockN = b;
    const sAt = typeof strengthAt==="function" ? strengthAt(addDaysISO(firstWeek, 28*b - 1)) : null;
    if(!sAt){ force = { mult:1, form:1, index:null }; return force; }
    blocks.push({ b, v:sAt.index });
    const best = Math.max(...blocks.filter(x=>b-x.b<=6).map(x=>x.v));
    force = { mult:ascForceMult(sAt.index), form:best>0 ? sAt.index/best : 1, index:sAt.index };
    return force;
  };
  const key = ()=>ASC_ORDER[st.i], nextIdx = ()=>(st.i+1)%ASC_ORDER.length;
  const misses = [];
  if(firstWeek) for(let w = firstWeek, wi = 0; w<=thisWeek; w = addDaysISO(w, 7), wi++){
    const list = byWeek.get(w) || [];
    let n = 0;
    for(const { s, hard } of list){
      n++; st.n++;
      const series = st.series + (n>=goal ? 1 : 0), tier = ascTier(series), f = forceFor(wi);
      const prs = ascPRs(s), beats = s.beats||0, bonus = ascEffort(ascBonusSets(prs, beats));
      let lapF = 1/(1 + .25*st.lap), mul = ascMulEff(tier, st.n, st.lap);
      let gain = (ascEffort(hard) + bonus)*mul*f.mult*lapF;
      effs.push(hard); bons.push(ascBonusSets(prs, beats));
      const e = { id:s.id, date:s.date, hard, eff:ascEffort(hard), bonus, prs, beats, mul, reg:ASC_MUL[tier], elan:ascElan(st.n, st.lap), series, force:f.mult, lapF, gain:0, from:st.alt, to:st.alt, camps:[], summit:null, started:null, key:key(), push:false, waiting:false };
      if(st.wait){
        const ni = nextIdx(), nk = ASC_ORDER[ni];
        if(series>=ASC_REQ[nk]){
          if(ni===0) st.lap++;
          st.i = ni; st.alt = ASC_DATA[nk].start; st.wait = false; st.expFrom = s.date; st.expN = 0; st.campDates = {}; st.comeback = null;
          e.started = nk; e.key = nk; e.from = e.to = st.alt;
          e.lapF = lapF = 1/(1 + .25*st.lap); e.mul = mul = ascMulEff(tier, st.n, st.lap); e.elan = ascElan(st.n, st.lap); gain = (ascEffort(hard) + bonus)*mul*f.mult*lapF;
        } else { e.waiting = true; out.log[s.id] = e; out.last = e; continue; }
      }
      const D = ASC_DATA[key()], pushFrom = D.top - ASC_PUSH*(D.top - D.start);
      // retour en force : double jusqu'à l'altitude perdue, puis vitesse normale pour le reste de la séance
      if(st.comeback && st.alt<st.comeback-.01){
        const need = st.comeback - st.alt, dbl = gain*ASC_BACK;
        const g = dbl<=need ? dbl : need + gain*(1 - need/dbl);
        e.back = g - gain; gain = g;
        if(dbl>=need) st.comeback = null;
      } else st.comeback = null;
      let to = st.alt + gain;
      if(f.form<ASC_FORM_OK && to>pushFrom){ const before = Math.max(0, pushFrom - st.alt); to = st.alt + before + (gain - before)*.5; e.push = true; }
      if(!st.expFrom) st.expFrom = s.date;
      st.expN++;
      e.camps = ascCamps(key()).filter(c=>c[0]>st.alt+.5 && c[0]<=to+.5).map(c=>c[1]);   // même tolérance que « passed »
      e.camps.forEach(nm=>{ st.campDates[nm] = s.date; });
      if(to>=D.top){
        to = D.top; e.summit = key(); st.wait = true; st.comeback = null;
        out.summits.push({ key:key(), lap:st.lap, date:s.date, sessions:st.expN, weeks:Math.max(1, Math.round(daysBetween(weekKey(st.expFrom), w)/7)+1), series });
      }
      e.gain = to - st.alt; e.to = to; st.alt = to;
      out.log[s.id] = e; out.last = e;
    }
    if(w===thisWeek){ out.weeks.push({ w, n, state:n>=goal ? "ok" : pauses.has(w) ? "pause" : "cur" }); break; }
    // semaine terminée : on tient compte de l'objectif
    let state;
    if(n>=goal){ st.series++; state = "ok"; }
    else if(pauses.has(w)) state = "pause";
    else if(deloads.has(w)) state = "deload";
    else {
      const again = misses.some(x=>wi-x<4);
      misses.push(wi);
      if(n>0){ state = "frozen"; if(again) st.series = ascDrop(st.series); }
      else {
        state = "empty"; st.series = ascDrop(st.series);
        if(!st.wait){
          const D = ASC_DATA[key()], below = ascCamps(key()).filter(c=>c[0]<st.alt-.5), c = below[below.length-1];
          const to = c ? c[0] : D.start;
          if(to<st.alt){ out.descents.push({ w, key:key(), from:st.alt, to, camp:c ? c[1] : null, real:c ? c[2] : D.fromAlt }); st.comeback = Math.max(st.comeback || 0, st.alt); }
          st.alt = to;
        }
      }
    }
    out.weeks.push({ w, n, state });
  }
  const k = key(), D = ASC_DATA[k], ni = nextIdx(), nk = ASC_ORDER[ni];
  const sNow = st.series + ((out.weeks.length && out.weeks[out.weeks.length-1].w===thisWeek && out.weeks[out.weeks.length-1].state==="ok") ? 1 : 0);
  const fNow = firstWeek ? forceFor(Math.round(daysBetween(firstWeek, thisWeek)/7)) : force;
  const done = st.wait ? 1 : (st.alt - D.start)/(D.top - D.start);
  const camps = ascCamps(k), passed = camps.filter(c=>c[0]<=st.alt+.5).length, nextCamp = camps.find(c=>c[0]>st.alt+.5) || null;
  // rythme récent (séances par semaine sur les 4 dernières semaines terminées) : pour les délais estimés
  const recent = out.weeks.filter(w=>w.state!=="cur" && w.state!=="pause").slice(-4);
  const perWeek = recent.length ? Math.max(.5, recent.reduce((t, w)=>t + w.n, 0)/recent.length) : goal;
  // séance type : séries difficiles en moyenne sur les 6 dernières séances (une séance courte ne fausse pas les délais)
  const last6 = effs.slice(-6), hardAvg = last6.length ? last6.reduce((t, h)=>t + h, 0)/last6.length : 15;
  const b6 = bons.slice(-6), bonusAvg = b6.length ? b6.reduce((t, h)=>t + h, 0)/b6.length : 0;
  // la prochaine séance : élan (1er tour) ou régularité, le plus fort des deux
  const elanNow = ascElan(st.n + 1, st.lap), regNow = ASC_MUL[ascTier(sNow)];
  // pauses du trimestre en cours (la semaine en cours et la suivante peuvent être déclarées)
  const q = ascQuarter(thisWeek), pausesQ = ascPauses().filter(w=>ascQuarter(w)===q).length;
  return Object.assign(out, {
    key:k, idx:st.i, lap:st.lap, alt:st.alt, start:D.start, top:D.top, wait:st.wait, done, passed, nextCamp,
    next:nk, nextReq:ASC_REQ[nk], nextLap:ni===0 ? st.lap+1 : st.lap,
    series:sNow, tier:ascTier(sNow), mul:Math.max(regNow, elanNow), reg:regNow, elan:elanNow, sessN:st.n, force:fNow.mult, form:fNow.form, index:fNow.index,
    pushOK:fNow.form>=ASC_FORM_OK, pushFrom:D.top - ASC_PUSH*(D.top - D.start),
    expFrom:st.expFrom, expN:st.expN, paused:pauses.has(thisWeek), pausesLeft:Math.max(0, ASC_PAUSE_MAX - pausesQ),
    camps, campDates:st.campDates, comeback:!st.wait && st.comeback && st.alt<st.comeback-.01 ? st.comeback : null, perWeek, hardAvg, bonusAvg, effAvg:ascEffort(hardAvg) + ascEffort(bonusAvg),
    summitCount:out.summits.length, goal,
  });
}
// séances pour un dénivelé donné, avec une séance type au palier et à la force actuels (estimation affichée)
function ascSessionsFor(m, a){
  a = a || ascent();
  const per = (a.effAvg || ascEffort(15))*a.mul*a.force/(1 + .25*a.lap);
  return Math.max(1, Math.ceil(m/Math.max(1, per)));
}
// pauses : la semaine en cours ou la suivante, dans la limite du trimestre
function ascTogglePause(w){
  S.ascent = S.ascent || { pauses:[], seen:0 };
  const p = ascPauses().slice(), i = p.indexOf(w);
  if(i>=0) p.splice(i, 1);
  else {
    const q = ascQuarter(w);
    if(p.filter(x=>ascQuarter(x)===q).length>=ASC_PAUSE_MAX) return false;
    p.push(w);
  }
  S.ascent.pauses = p.sort().slice(-40);
  return true;
}
