// ================= INDICE DE FORCE (modèle 4.0, sourcé) =================
// Ce que fait l'app, et sur quoi elle s'appuie (détails et liens dans la feuille « Comment c'est calculé ») :
// 1. Force par exercice = 1RM estimé de la meilleure série. Moyenne des formules d'Epley et de Brzycki
//    (Brzycki est celle de Fitbod) jusqu'à 10 répétitions ; au-delà, Epley seul et une confiance moindre
//    (LeSuer 1997 ; Mayhew 2008 : précision moindre au-delà de ~10 reps). Les répétitions en réserve
//    déclarées (« 0 », « 1–2 », « 3 ou + ») sont ajoutées aux répétitions faites : échelle RIR de
//    Zourdos/Helms 2016 ; on prend la borne basse, car on sous-estime d'environ 1 rep sa marge (Halperin 2022).
// 2. Pompes : la charge réelle est un pourcentage du poids du corps mesuré au sol (Ebben 2011 : 64 % ;
//    genoux 49 % ; mains surélevées 55 % ; pieds surélevés 70 %). Avec une pesée, elles comptent en kg.
//    Sans pesée, et pour les autres exercices au poids du corps, la même formule s'applique à charge
//    constante (1RM relatif = 1 + reps/30, moyenné avec Brzycki) : la charge s'annule dans le rapport
//    actuel / départ. Passer de 10 à 20 répétitions compte donc +25 %, pas +100 %. Exercices tenus :
//    1 répétition ≈ 3 s sous tension (tempo classique), puis la même formule.
// 3. Indice = moyenne, muscle par muscle, du rapport entre la force actuelle et celle de tes 2 premières
//    séances de l'exercice (100 = ton départ). Le muscle compte, pas l'exercice : 5 curls ne pèsent
//    pas plus que les jambes (même logique que les scores par muscle de Fitbod).
// 4. Désentraînement, muscle par muscle : rien pendant 21 jours sans le travailler (Bosquet 2013 :
//    force max quasi intacte jusqu'à 28 jours ; McMaster 2013 : maintenue jusqu'à 3 semaines ;
//    Ogasawara 2013 : des pauses de 3 semaines ne coûtent rien). Ensuite −3 % par semaine
//    (McMaster 2013 : −14,5 % après 7,2 semaines ; 2 à 3 % par semaine une fois la perte lancée),
//    ×1,5 à partir de 65 ans (Bosquet 2013 : effet plus fort chez les plus âgés), 30 % au plus.
//    Une seule séance qui travaille le muscle (en principal ou en secondaire) remet le compteur à zéro : 1 séance par semaine suffit
//    à maintenir la force tant que l'intensité est là (Spiering 2021). Et la force revient vite à la
//    reprise (Staron 1991 ; Bruusgaard 2010 : les noyaux musculaires restent) : dès que tu refais
//    tes charges, la mesure réelle remplace l'estimation.
// 5. Statut d'entraînement, à la manière de Garmin : charge aiguë (7 jours) et chronique (28 jours) en
//    moyennes à pondération exponentielle (Williams 2017), en séries difficiles. Le rapport des deux
//    décrit l'évolution de ta charge ; il ne prédit pas les blessures (Impellizzeri 2020-2021).

const RIR_OF_EFFORT = { 3:0, 2:1, 1:3 };        // « à fond », « 1–2 », « 3 ou + » : borne basse
const BW_FRACTION = { pompes:.64, pompes_larges:.64, pompes_diamant:.64, pompes_genoux:.49, pompes_surelevees:.55, pompes_mur:.3, pompes_declinees:.70 };
const DETRAIN = { grace:21, perWeek:.03, senior:1.5, maxLoss:.30 };

function e1rmOf(w, reps){
  if(!w || !reps) return 0;
  if(reps<=1) return w;
  const ep = w*(1+reps/30);
  return reps<=10 ? (ep + w*36/(37-reps))/2 : ep;
}
// pesée la plus proche avant (ou, à défaut, après) une date
function bodyKgAt(iso){
  const b = S.body; if(!b || !b.length) return 0;
  let k = b[0].kg; for(const e of b){ if(e.d<=iso) k = e.kg; else break; } return k;
}
// meilleure performance d'un exercice dans une séance : { v, conf } (v en kg de 1RM estimé, ou en reps / secondes)
// f : fatigue de l'exercice dans sa séance (coach.js) : les répétitions sont ramenées « à frais », un
// exercice placé en fin de séance ne fait pas baisser la force estimée
function sessionPerf(def, ex, date, f){
  let best = 0, conf = 1;
  const bwFrac = BW_FRACTION[def.id], bw = bwFrac ? bodyKgAt(date) : 0, timed = isTimed(def), kg = kgType(def);
  for(const st of ex.sets){
    if(!st.done || !(st.reps>0)) continue;
    const reps = st.reps/(f || 1) + (timed ? 0 : (RIR_OF_EFFORT[st.effort]||0));
    let v, c = 1;
    if(kg){ if(!st.weight) continue; v = e1rmOf(st.weight, reps); c = reps>10 ? .6 : 1; }
    else if(bw){ v = e1rmOf(bw*bwFrac, reps); c = reps>10 ? .6 : 1; }
    // charge constante (poids du corps sans pesée, élastique) : 1RM relatif, la charge s'annule dans le rapport
    else { v = e1rmOf(1, timed ? reps/3 : reps); c = timed ? .8 : reps>10 ? .6 : 1; }
    if(v>best){ best = v; conf = c; }
  }
  return best ? { v:best, conf } : null;
}
// historique utile, calculé une fois par version des données
function strengthData(){
  return memoHist("strengthData", ()=>{
    const exos = {}, muscleDays = {};
    for(const s of S.sessions) for(const ex of s.exos){
      const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) continue;
      // le muscle est « travaillé » ce jour-là, qu'il soit principal ou secondaire (arrête le désentraînement)
      if(ex.sets.some(st=>st.done && st.reps>0)) def.muscles.forEach(m=>{ const a = muscleDays[m] || (muscleDays[m] = []); if(a[a.length-1]!==s.date) a.push(s.date); });
      // le cardio (jumping jacks, corde à sauter…) n'entre pas dans l'indice de force : faire plus de répétitions
      // y mesure le souffle, pas la force
      if(def.muscles[0]==="cardio") continue;
      const p = sessionPerf(def, ex, s.date, exoFatigue(s, ex)); if(!p) continue;
      (exos[ex.exoId] = exos[ex.exoId] || []).push({ date:s.date, v:p.v, conf:p.conf });
    }
    return { exos, muscleDays };
  });
}
// un record non retrouvé s'estompe : 2 séances en dessous ne comptent pas (jour sans, fatigue
// passagère), puis −1,5 % par séance qui ne le retrouve pas (−15 % au plus). Choix de modélisation
// (pas une mesure publiée) : lent, pour ne réagir qu'aux tendances.
function peakFade(misses){ return misses<=2 ? 1 : Math.max(.85, 1-.015*(misses-2)); }
// ---------- forme d'une séance (jour sans, fatigue) ----------
// Chaque exercice est comparé à sa forme habituelle juste avant : la médiane de ses performances des
// 6 dernières semaines (6 au plus, 3 au moins ; 1RM estimé, répétitions en réserve comprises). Assez
// stable pour que deux séances faibles d'affilée ne deviennent pas la nouvelle « normale ». Ne comptent pas : les exercices faits
// exprès plus facilement (« 3 ou + » en réserve), ceux d'une semaine allégée, les reprises après 3
// semaines, ceux qui ont moins de 3 performances. Résultat : rapport médian (1 = forme habituelle).
function sessionForm(session){
  if(!session) return null;
  const { exos } = strengthData(), out = [];
  session.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def) || ex.deload) return;
    const done = ex.sets.filter(st=>st.done && st.reps>0); if(!done.length || done.every(st=>st.effort===1)) return;
    const from = addDaysISO(session.date, -42), prior = (exos[ex.exoId]||[]).filter(x=>x.date<session.date && x.date>=from).slice(-6);
    if(prior.length<3 || daysBetween(prior[prior.length-1].date, session.date)>=21) return;
    const p = sessionPerf(def, ex, session.date, exoFatigue(session, ex)); if(!p) return;
    const sorted = prior.map(x=>x.v).sort((a,b)=>a-b), ref = sorted[sorted.length>>1];
    if(ref>0) out.push(p.v/ref);
  });
  if(!out.length) return null;
  out.sort((a,b)=>a-b);
  return { ratio:out[out.length>>1], n:out.length };
}
// fatigue : les 3 dernières séances mesurables nettement sous la forme habituelle (−6 % ou plus)
function formTrend(){
  return memo("formTrend", ()=>{
    const last = []; for(let i=S.sessions.length-1; i>=0 && last.length<3; i--){ const f = sessionForm(S.sessions[i]); if(f) last.push(f.ratio); }
    return last.length===3 && last.every(r=>r<.94);
  });
}
function lastBefore(dates, iso){ for(let i=dates.length-1;i>=0;i--) if(dates[i]<=iso) return dates[i]; return null; }
function detrainFactor(days){
  if(days==null || days<=DETRAIN.grace) return 1;
  const rate = DETRAIN.perWeek * (S.goals.senior ? DETRAIN.senior : 1);
  return Math.max(1-DETRAIN.maxLoss, 1 - rate*(days-DETRAIN.grace)/7);
}
// état du modèle à une date : indice, muscles (rapport, jours sans travail, perte estimée)
function strengthAt(iso){ return memoHist("strengthAt"+iso+(S.goals.senior?1:0), ()=>strengthAt_raw(iso)); }
function strengthAt_raw(iso){
  const { exos, muscleDays } = strengthData(), byMuscle = {};
  Object.keys(exos).forEach(id=>{
    // historique trié : on remonte depuis la fin (les dates demandées sont récentes), sans copie
    const all = exos[id]; let k = all.length; while(k>0 && all[k-1].date>iso) k--;
    if(k<3) return;
    const def = EXO_MAP[id], m = def.muscles[0], h = all;
    // forme actuelle : la meilleure performance des 12 dernières semaines, mais un record que les séances
    // suivantes ne retrouvent pas s'estompe (peakFade). Un jour sans ne fait rien bouger ; une baisse
    // qui dure finit par se voir.
    const base = Math.max(h[0].v, h[1].v), lastE = h[k-1], from = addDaysISO(lastE.date, -84);
    let best = 0;
    for(let j=k-1; j>=0 && h[j].date>from; j--){
      let miss = 0; for(let q=j+1; q<k; q++) if(h[q].v<.97*h[j].v) miss++;
      const v = h[j].v*peakFade(miss); if(v>best) best = v;
    }
    const lastM = lastBefore(muscleDays[m]||[], iso), days = lastM ? daysBetween(lastM, iso) : null;
    const f = detrainFactor(days), w = Math.min(1, k/6) * (lastE.conf||1);
    (byMuscle[m] = byMuscle[m] || { sum:0, w:0, days, f, n:0 });
    byMuscle[m].sum += Math.min(3, best/base) * f * w; byMuscle[m].w += w; byMuscle[m].n++;
  });
  const muscles = Object.keys(byMuscle).map(m=>({ id:m, ratio:byMuscle[m].sum/byMuscle[m].w, days:byMuscle[m].days, f:byMuscle[m].f, n:byMuscle[m].n }));
  if(!muscles.length) return null;
  return { index:Math.round(100*muscles.reduce((a,m)=>a+m.ratio,0)/muscles.length), muscles };
}
// une valeur par semaine (fin de semaine, ou aujourd'hui pour la semaine en cours)
function strengthSeries(weeks){
  return memoHist("strengthSeries"+weeks+todayISO(), ()=>{
    const out = [], today = todayISO(), end0 = addDaysISO(weekKey(today), 6);
    for(let k=weeks-1;k>=0;k--){
      const end = addDaysISO(end0, -7*k), at = end>today ? today : end, st = strengthAt(at);
      if(st) out.push({ wk:addDaysISO(end, -6), v:st.index, n:st.muscles.length });
    }
    return out;
  });
}
// ---------- charge d'entraînement et statut ----------
// séries « difficiles » du jour : une série faite compte 1, une série avec 3 reps ou plus en réserve 0,5
function dailyHardSets(){
  return memoHist("hardSets", ()=>{ const d = {};
    for(const s of S.sessions){ let n = 0;
      for(const ex of s.exos){ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) continue;
        for(const st of ex.sets) if(st.done) n += st.effort===1 ? .5 : 1; }
      if(n) d[s.date] = (d[s.date]||0) + n; }
    return d; });
}
// moyennes à pondération exponentielle (Williams 2017), λ = 2/(N+1), en séries par semaine
function trainingLoad(iso){
  iso = iso || todayISO();
  return memoHist("load"+iso, ()=>{
    const d = dailyHardSets(), first = S.sessions.length ? S.sessions[0].date : iso;
    const dayN = x=>Math.round(Date.UTC(+x.slice(0,4), +x.slice(5,7)-1, +x.slice(8,10))/864e5), t0 = dayN(first), t1 = dayN(iso);
    const byN = {}; Object.keys(d).forEach(k=>{ byN[dayN(k)] = d[k]; });
    const la = 2/(7+1), lc = 2/(28+1); let a = 0, c = 0;
    // au-delà de 120 jours, le poids d'une séance dans la moyenne est inférieur à 0,03 %
    for(let n = Math.max(t0, t1-120); n<=t1; n++){ const x = byN[n]||0; a = la*x + (1-la)*a; c = lc*x + (1-lc)*c; }
    return { acute:a*7, chronic:c*7, ratio:c>0.01 ? a/c : 0, span:t1-t0 };
  });
}
function lastSessionGap(){ const l = S.sessions[S.sessions.length-1]; return l ? daysBetween(l.date, todayISO()) : null; }
// statut façon Garmin : charge (aiguë / chronique) + tendance de l'indice sur 4 semaines
const STATUS = {
  detraining:{ n:"Désentraînement", c:"red",    d:"Tu t'entraînes beaucoup moins que d'habitude depuis plus d'une semaine. Après 3 semaines sans travailler un muscle, sa force estimée commence à baisser." },
  overreach: { n:"Surcharge",       c:"orange", d:"Ta charge de la semaine dépasse largement ton habitude. Prévois une séance plus légère pour récupérer." },
  productive:{ n:"Productif",       c:"green",  d:"Ta charge est régulière et ta force augmente. Continue ainsi." },
  maintain:  { n:"Maintien",        c:"blue",   d:"Ta charge maintient ta force. Pour progresser, ajoute une répétition ou un peu de charge." },
  recovery:  { n:"Récupération",    c:"teal",   d:"Ta charge est plus légère que d'habitude. C'est utile après des semaines intenses, à condition de reprendre rapidement." },
  unproductive:{ n:"Improductif",   c:"orange", d:"Ta charge est stable, mais ta force diminue. Vérifie ton sommeil et ta récupération, ou varie tes exercices." },
  fatigue:   { n:"Fatigue",         c:"orange", d:"Tes 3 dernières séances sont en dessous de ton niveau habituel. Une semaine plus légère t'aidera à repartir." },
  starting:  { n:"En calibrage",    c:"gray",   d:"Ton statut sera disponible après environ 3 semaines d'entraînement." },
};
function trainingStatus(){
  return memoHist("status"+todayISO(), ()=>{
    const L = trainingLoad(), gap = lastSessionGap();
    if(!S.sessions.length || L.span<21) return "starting";
    if(gap>=7 && L.ratio<0.6) return "detraining";
    if(L.ratio>1.5) return "overreach";
    if(formTrend()) return "fatigue";
    const pts = strengthSeries(12).slice(-5), d = pts.length>=2 ? pts[pts.length-1].v - pts[0].v : 0;
    if(L.ratio<0.8) return "recovery";
    if(d>=2) return "productive";
    if(d<=-3) return "unproductive";
    return "maintain";
  });
}
// muscles en baisse ou sur le point de l'être (pour l'accueil et la carte)
function detrainAlerts(){
  const st = strengthAt(todayISO()); if(!st) return [];
  return st.muscles.filter(m=>m.days!=null && m.days>=14).sort((a,b)=>b.days-a.days)
    .map(m=>({ m, label:(MUSCLE_MAP[m.id]||{ n:m.id }).n, losing:m.days>DETRAIN.grace, left:DETRAIN.grace-m.days, pct:Math.round((1-m.f)*100) }));
}

// l'indice vaut 100 au départ (rapport ×100) ; affiché en % de progression : 0 % au départ
function pctTxt(v){ const p = Math.round(v-100); return (p>0?"+":p<0?"−":"")+Math.abs(p)+"\u202f%"; }
function strengthCardHTML(){
  if(S.settings.trend===false || !S.sessions.length) return "";
  const pts = strengthSeries(12);
  const head = `<div class="cc-h tr-h"><div><div class="cc-t">Progression de force</div><div class="cc-s">depuis tes débuts</div></div>
    <button class="tr-how" data-a="strengthHow" aria-label="Comment la progression est calculée">i</button></div>`;
  if(pts.length<2){
    // avant la courbe : où on en est (3 séances du même exercice), en trois pastilles qui se remplissent
    const cnt = {}; S.sessions.forEach(s=>new Set(s.exos.filter(e=>e.sets.some(x=>x.done)).map(e=>e.exoId)).forEach(id=>cnt[id]=(cnt[id]||0)+1));
    const n = Math.min(2, Math.max(0, ...Object.values(cnt)));
    return `<div class="chart-card trend-card stagger" style="--i:1">${head}<div class="tr-empty">
      <div class="tr-dots" aria-hidden="true">${[0,1,2].map(i=>`<i class="${i<n?"on":""}" style="--k:${i}"></i>`).join("")}</div>
      <div><b>${n ? `Encore ${nb(3-n,"séance")} avec un même exercice` : "Fais 3 séances avec un même exercice"}</b><span>et ta courbe de force apparaît.</span></div>
    </div></div>`;
  }
  const last = pts[pts.length-1], ref = pts[Math.max(0, pts.length-5)], d = last.v-ref.v, wk = Math.round(daysBetween(ref.wk, last.wk)/7);
  const status = STATUS[trainingStatus()], L = trainingLoad(), acute = Math.round(L.acute), chronic = Math.round(L.chronic);
  // 1. le chiffre : progression depuis les débuts, et son évolution sur les dernières semaines
  const p0 = Math.round(last.v-100);
  const delta = wk>0 ? `<span class="tr-d ${d>0?"up":d<0?"down":""}">${d ? `${d>0?"+":"−"}${Math.abs(d)}\u202f% en ${wk}\u00a0sem.` : `stable sur ${wk}\u00a0sem.`}</span>` : "";
  const hero = `<div class="chart-card trend-card stagger" style="--i:1">
    <div class="tr-h"><span class="tr-k">Depuis tes débuts</span><button class="tr-how" data-a="strengthHow" aria-label="Comment la progression est calculée">i</button></div>
    <div class="tr-hero"><span class="tr-v" data-count="${Math.abs(p0)}" data-pre="${p0>0?"+":p0<0?"−":""}" data-unit="%" data-thin="1">${pctTxt(last.v)}</span>${delta}</div>
    ${pts.length>=3 ? lineChart(pts.map(p=>({ label:fmtDate(p.wk), v:p.v-100, tip:`Semaine du ${fmtDate(p.wk)} : ${pctTxt(p.v)}` })), { aria:"Progression de force par semaine", zero:pts.every(p=>p.v>=100), fmt:v=>pctTxt(v+100), tickFmt:v=>(v>0?"+":v<0?"−":"")+fmtDec(Math.abs(v))+"\u202f%" }) : ""}
    <button class="tr-status st-${status.c}" data-a="strengthHow" aria-label="Statut : ${status.n}. Voir comment il est calculé"><span class="tr-dot"></span><span class="tr-st"><b>${status.n}</b><small>${trainingStatus()==="starting" ? "ton habitude s'établit sur 3 semaines" : `${nb(acute, "série")} difficile${acute>=2?"s":""} cette semaine<br>${chronic} d'habitude`}</small></span><span class="chev">${icon("chev")}</span></button>
  </div>`;
  // 2. par zone : chaque région, de la plus forte à la plus faible
  const st = strengthAt(todayISO()), reg = {};
  if(st) st.muscles.forEach(m=>{ const r = REGION_OF_MUSCLE[m.id]||"core"; (reg[r] = reg[r] || []).push(m); });
  const rows = Object.keys(REGIONS).filter(r=>reg[r]).map(r=>{ const l = reg[r]; return { r, v:Math.round(100*l.reduce((a,m)=>a+m.ratio,0)/l.length), down:l.some(m=>m.f<1) }; }).sort((a,b)=>b.v-a.v);
  const maxAbs = Math.max(1, ...rows.map(x=>Math.abs(x.v-100)));
  const zones = rows.length ? `<h2 class="sh">Par zone</h2><div class="group tr-regs stagger" style="--i:2">${rows.map(x=>`<div class="row tr-reg">
      <div class="grow"><div class="t">${x.r==="core" ? "Gainage" : REGIONS[x.r].n}${x.down ? `<em aria-label="en baisse">${ii("warn")}</em>` : ""}</div>
        <span class="tr-bar${x.v<100 ? " neg" : ""}"><i style="width:${(Math.abs(x.v-100)/maxAbs*100).toFixed(0)}%"></i></span></div>
      <b class="val strong">${pctTxt(x.v)}</b></div>`).join("")}</div>` : "";
  // 3. à surveiller, puis à venir : seulement ce qui apporte une information (rien sinon)
  const lines = [];
  detrainAlerts().slice(0,2).forEach(a=>lines.push(a.losing
    ? `${ii("warn")}<span><b>${esc(a.label)}</b> : ${a.m.days} jours sans travail · −${a.pct}\u202f%</span>`
    : `${ii("clock")}<span><b>${esc(a.label)}</b> : ${a.m.days} jours sans travail · baisse dans ${nb(a.left,"jour")}</span>`));
  const recent = pts.slice(-8), slope = slopeOf(recent.map((p,i)=>[i, p.v]));
  if(slope>0.2) lines.push(`${ii("trendUp")}<span>À ce rythme : <b>${pctTxt(Math.round(Math.min(last.v+slope*8, last.v*1.15)))}</b> dans 2 mois</span>`); // estimation prudente : indice ×1,15 au plus
  const pj = exoProjection();
  if(pj && !pj.flat){ const u = v=>kgType(pj.def) ? `${fmtDec(v)}\u00a0kg` : `${fmtNum(v)}${isTimed(pj.def) ? "\u00a0s" : "\u00a0rép."}`;
    lines.push(`${ii("target")}<span>${esc(pj.def.n)} : ${u(pj.cur)} → <b>${u(pj.proj)}</b> vers le ${fmtDate(pj.date)}</span>`); }
  const next = lines.length ? `<h2 class="sh">À venir</h2><div class="card tr-lines stagger" style="--i:3">${lines.map(l=>`<div class="tr-line">${l}</div>`).join("")}</div>` : "";
  return hero + zones + next;
}
// la méthode, en clair, avec ses sources
const STRENGTH_SOURCES = [
  ["Bosquet et al. 2013, Scand J Med Sci Sports : arrêt de l'entraînement et force (méta-analyse)", "https://onlinelibrary.wiley.com/doi/10.1111/sms.12047"],
  ["McMaster et al. 2013, Sports Medicine : développement, maintien et perte de la force", "https://link.springer.com/article/10.1007/s40279-013-0031-3"],
  ["Spiering et al. 2021, J Strength Cond Res : la dose minimale pour maintenir sa force", "https://pubmed.ncbi.nlm.nih.gov/33629972/"],
  ["Ogasawara et al. 2013, Eur J Appl Physiol : entraînement continu ou avec pauses de 3 semaines", "https://paulogentil.com/pdf/Comparison%20of%20muscle%20hypertrophy%20following%206-month%20of%20continuous%20and%20periodic%20strength%20training.pdf"],
  ["Staron et al. 1991, J Appl Physiol : désentraînement puis reprise", "https://pubmed.ncbi.nlm.nih.gov/1827108/"],
  ["Zourdos et al. 2016, J Strength Cond Res : échelle des répétitions en réserve (RIR)", "https://openrepository.aut.ac.nz/items/efef3b25-6701-4fb5-bb82-55fcd2a26027/full"],
  ["Halperin et al. 2022, Sports Medicine : précision des répétitions en réserve", "https://cris.iucc.ac.il/en/publications/accuracy-in-predicting-repetitions-to-task-failure-in-resistance-/"],
  ["LeSuer et al. 1997, J Strength Cond Res : précision des formules de 1RM", "https://pubmed.ncbi.nlm.nih.gov/?term=LeSuer+accuracy+of+prediction+equations+for+predicting+1-RM+performance"],
  ["Ebben et al. 2011, J Strength Cond Res : part du poids du corps dans les pompes", "https://pubmed.ncbi.nlm.nih.gov/?term=Ebben+kinetic+analysis+of+several+variations+of+push-ups"],
  ["Williams et al. 2017, Br J Sports Med : charge aiguë et chronique en moyennes exponentielles", "https://research.usq.edu.au/item/q4385/calculating-acute-chronic-workload-ratios-using-exponentially-weighted-moving-averages-provides-a-more-sensitive-indicator-of-injury-likelihood-than-rolling-averages"],
  ["Impellizzeri et al. 2021, Sports Medicine : limites du rapport charge aiguë / chronique", "https://iris.univr.it/retrieve/e34cfb98-e922-4c2f-aab5-18583ab7e31b/Impellizzeri_What%20Role%20Do%20Chronic%20Workloads%20Play_SportMed_2021.pdf"],
];
Object.assign(ACT, {
  strengthHow(){
    const st = STATUS[trainingStatus()], L = trainingLoad();
    openSheet(`<div class="sheet-hd"><span class="t">Comment c'est calculé</span></div><div class="sheet-body how-body">
      <div class="how-st st-${st.c}"><span class="tr-dot"></span><div><b>${st.n}</b><p>${st.d}</p></div></div>
      <h3>Ta force sur un exercice</h3>
      <p>On part de ta meilleure série de la séance et on estime ton 1RM, la charge maximale que tu pourrais soulever une fois. Le calcul combine les formules d'Epley et de Brzycki, fiables jusqu'à 10 répétitions. Les répétitions que tu gardes en réserve sont prises en compte.</p>
      <p>Au poids du corps, seules les répétitions changent. Passer de 10 à 20 pompes représente donc +25 % de force, pas +100 %. Avec ton poids renseigné dans Profil, les pompes sont comptées en kilos. En gainage, 3 secondes valent une répétition.</p>
      <h3>Ta progression</h3>
      <p>Pour chaque muscle, on compare ton niveau actuel à celui de tes deux premières séances. Ton niveau actuel correspond à ta meilleure performance des 12 dernières semaines.</p>
      <p>Une mauvaise séance ne fait pas baisser la courbe. En revanche, un record que tu ne retrouves plus perd 1,5 % par séance à partir de la troisième. Le résultat final est la moyenne de tous tes muscles : 0 % correspond à ton niveau de départ.</p>
      <h3>Quand tu fais une pause</h3>
      <p>La force se maintient environ 3 semaines sans entraînement. Au-delà, l'estimation baisse de ${S.goals.senior ? "4,5" : "3"}&nbsp;% par semaine, jusqu'à −30&nbsp;% au maximum. Dès que tu retravailles le muscle, la baisse s'arrête et tes nouvelles performances prennent le relais.</p>
      <h3>Ton statut</h3>
      <p>Il compare tes séries difficiles des 7 derniers jours (${Math.round(L.acute)}) à ta moyenne sur 4 semaines (${Math.round(L.chronic)}), en tenant compte de l'évolution de ta force. Il décrit ta charge d'entraînement. Il ne prédit pas les blessures.</p>
      <h3>Sources</h3>
      <ul class="how-src">${STRENGTH_SOURCES.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
      <p class="hr-note">Ces valeurs sont des estimations. Elles ne remplacent ni un test de 1RM ni un avis médical.</p>
    </div>`, { tall:true });
  },
});

// ---------- semaine allégée (deload) ----------
// Une semaine plus légère après plusieurs semaines chargées, pour récupérer sans perdre en force.
// - Consensus Delphi de 21 entraîneurs experts (Bell 2023) : réduire le nombre de séries et de
//   répétitions fait l'unanimité ; garder ou baisser l'intensité est moins consensuel.
// - Pratique courante : environ 1 semaine toutes les 4 à 8 semaines (Bell 2024, enquête auprès de
//   246 athlètes : 6,4 jours toutes les 5,6 semaines en moyenne).
// - Une semaine d'ARRÊT complet a légèrement réduit la force des jambes (Coleman 2024) : ici on continue
//   à s'entraîner, avec ~40 % de séries en moins, la même charge et 2 répétitions de réserve.
// Déclencheurs : 6 semaines chargées d'affilée ; une charge qui s'emballe (statut « Surcharge ») après
// 3 semaines ; ou un indice qui baisse alors qu'on s'entraîne autant (« Improductif ») après 4 semaines.
// Jamais deux semaines allégées à moins de 4 semaines d'écart ; « Plus tard » repousse d'une semaine.
const DELOAD = { every:6, gap:28, days:7, snooze:7 };
function deloadActive(){ const d = S.deload, t = todayISO(); return !!(d && d.start<=t && t<=d.end); }
function deloadDay(){ return S.deload ? daysBetween(S.deload.start, todayISO())+1 : 0; }
// semaine allégée finie depuis 2 jours au plus : un mot de reprise sur l'accueil
function deloadJustEnded(){ const d = S.deload, t = todayISO(); return !!(d && t>d.end && daysBetween(d.end, t)<=2); }
// semaines pleines d'affilée (semaine en cours exclue) : au moins 2 séances et 8 séries difficiles,
// et pas nettement plus légère (moins de 60 %) que la moyenne des 4 semaines d'avant
function loadedWeeksStreak(){
  return memo("dlStreak"+todayISO(), ()=>{
    const d = dailyHardSets(), cur = weekKey(todayISO()), last = (S.deloadLog||[]).slice(-1)[0] || "";
    const days = {}; S.sessions.forEach(s=>{ days[s.date] = 1; });
    const weeks = [];
    for(let k=1;k<=20;k++){
      const wk = addDaysISO(cur, -7*k); let sets = 0, n = 0;
      for(let i=0;i<7;i++){ const iso = addDaysISO(wk, i); sets += d[iso]||0; n += days[iso]||0; }
      weeks.push({ wk, sets, n });
    }
    let streak = 0;
    for(let i=0;i<weeks.length;i++){
      const w = weeks[i]; if(last && w.wk<=last) break;   // une semaine allégée remet le compteur à zéro
      const prev = weeks.slice(i+1, i+5).filter(x=>x.sets>0), mean = prev.length ? prev.reduce((a,x)=>a+x.sets,0)/prev.length : 0;
      if(w.n>=2 && w.sets>=8 && (!mean || w.sets>=.6*mean)) streak++; else break;
    }
    return streak;
  });
}
function deloadAdvice(){
  if(S.settings.deloadTips===false || deloadActive() || !S.sessions.length) return null;
  const t = todayISO(), last = (S.deloadLog||[]).slice(-1)[0];
  if(S.meta.deloadSnooze && t<S.meta.deloadSnooze) return null;
  if(last && daysBetween(last, t)<DELOAD.gap) return null;
  const st = trainingStatus(), streak = loadedWeeksStreak();
  if(st==="overreach" && streak>=3) return { kind:"overreach", txt:"Ta charge de la semaine dépasse largement ton habitude." };
  if(st==="fatigue" && streak>=2) return { kind:"fatigue", txt:"Tes 3 dernières séances sont en dessous de ton niveau habituel." };
  if(st==="unproductive" && streak>=4) return { kind:"stall", txt:"Ta force baisse depuis quelques semaines, malgré un entraînement régulier." };
  if(streak>=DELOAD.every) return { kind:"streak", txt:`${streak} semaines intenses d'affilée.` };
  return null;
}
// accueil : conseil, semaine en cours (jour X sur 7) ou mot de reprise
function deloadCardHTML(){
  if(deloadActive()){
    const day = Math.min(DELOAD.days, deloadDay());
    return `<div class="dl-card on stagger" style="--i:1">
      <span class="dl-ic">${ii("leaf")}</span>
      <div class="dl-main"><div class="dl-t">Semaine allégée · jour ${day} sur ${DELOAD.days}</div>
        <div class="dl-s">Moins de séries, même charge, aucune série à fond. Tes séances sont déjà ajustées.</div>
        <div class="dl-bar" aria-hidden="true">${Array.from({ length:DELOAD.days }, (_,i)=>`<i class="${i<day?"on":""}" style="--k:${i}"></i>`).join("")}</div>
        <div class="dl-act"><button class="dl-link" data-a="deloadHow">Pourquoi ?</button><button class="dl-link" data-a="deloadStop">Arrêter</button></div></div>
    </div>`;
  }
  if(deloadJustEnded()) return `<div class="dl-card done stagger" style="--i:1">
      <span class="dl-ic">${ii("bolt")}</span>
      <div class="dl-main"><div class="dl-t">Semaine allégée terminée</div><div class="dl-s">Tes séances retrouvent leur volume habituel. C'est le bon moment pour viser un record.</div></div>
      <button class="icon-btn dl-x" data-a="deloadDismiss" aria-label="Masquer">${icon("close")}</button>
    </div>`;
  const a = deloadAdvice(); if(!a) return "";
  // « Pourquoi ? » dans le coin (comme les fiches) : une ligne de boutons en moins avant la séance
  return `<div class="dl-card stagger" style="--i:1">
    <span class="dl-ic">${ii("leaf")}</span>
    <div class="dl-main"><div class="dl-t">Semaine allégée conseillée</div>
      <div class="dl-s">${esc(a.txt)}</div>
      <div class="dl-act"><button class="btn sm" data-a="deloadStart">Alléger cette semaine</button><button class="btn tertiary sm" data-a="deloadLater">Plus tard</button></div></div>
    <button class="info-btn dl-x" data-a="deloadHow" aria-label="Pourquoi une semaine allégée ?">i</button>
  </div>`;
}
const DELOAD_SOURCES = [
  ["Bell et al. 2023, Sports Medicine – Open : intégrer les semaines allégées (consensus Delphi d'entraîneurs experts)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/"],
  ["Bell et al. 2024, Sports Medicine – Open : pratiques de semaine allégée de 246 athlètes de force", "https://pmc.ncbi.nlm.nih.gov/articles/PMC10948666/"],
  ["Coleman et al. 2024, PeerJ : une semaine d'arrêt au milieu de 9 semaines d'entraînement", "https://peerj.com/articles/16777"],
  ["Bell et al. 2025, Strength & Conditioning Journal : approche pratique de la semaine allégée", "https://shura.shu.ac.uk/35313/"],
];
// la séance proposée (non commencée) suit le changement : séries réduites ou rétablies
function deloadRefresh(){ if(typeof regenerateDraftIfIdle==="function") regenerateDraftIfIdle(); save(); changed(); }
Object.assign(ACT, {
  deloadStart(){
    const t = todayISO();
    S.deload = { start:t, end:addDaysISO(t, DELOAD.days-1) };
    S.deloadLog = (S.deloadLog||[]).concat(t).slice(-50);
    if(qs("#overlay.open")) closeSheet();
    deloadRefresh(); haptic(15); sfx("open");
    toast("Semaine allégée activée pour 7 jours", "leaf");
  },
  deloadLater(){ S.meta.deloadSnooze = addDaysISO(todayISO(), DELOAD.snooze); save(); changed(); toast("Rappel dans une semaine"); },
  deloadStop(){
    if(!S.deload) return;
    // arrêtée avant la fin : elle compte quand même (pas de nouveau conseil tout de suite)
    S.deload = null; if(qs("#overlay.open")) closeSheet();
    deloadRefresh(); toast("Semaine allégée arrêtée");
  },
  deloadDismiss(){ S.deload = null; save(); changed(); },
  deloadToggleTips(d, el){ S.settings.deloadTips = S.settings.deloadTips===false; el.classList.toggle("on", S.settings.deloadTips); el.setAttribute("aria-pressed", S.settings.deloadTips); save(); changed(); },
  deloadHow(){
    const a = deloadAdvice(), on = deloadActive(), streak = loadedWeeksStreak(), last = (S.deloadLog||[]).slice(-1)[0];
    openSheet(`<div class="sheet-hd"><span class="t">Semaine allégée</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div><div class="sheet-body how-body">
      <div class="how-st"><span class="dl-ic">${ii("leaf")}</span><div><b>${on ? `En cours · jour ${Math.min(DELOAD.days, deloadDay())} sur ${DELOAD.days}` : a ? "Conseillée maintenant" : "Pas nécessaire pour l'instant"}</b>
        <p>${on ? "Tes séances comptent environ 40 % de séries en moins, avec la même charge et 2 répétitions en réserve." : a ? esc(a.txt) : `${streak} semaine${streak>1?"s":""} intense${streak>1?"s":""} d'affilée${last ? `. Dernière semaine allégée : ${fmtDate(last)}` : ""}. Tu seras prévenu au bon moment.`}</p></div></div>
      <h3>Pourquoi alléger ?</h3>
      <p>Après plusieurs semaines intenses, la fatigue s'accumule. Une semaine plus légère permet de récupérer et de mieux progresser ensuite. Les entraîneurs en prévoient généralement une toutes les 4 à 8 semaines.</p>
      <h3>Comment ça fonctionne</h3>
      <p>Tu continues à t'entraîner, avec <b>environ 40 % de séries en moins</b>, <b>la même charge</b> et <b>2 répétitions de moins</b>, sans aller à l'échec. Un arrêt complet est moins efficace : il peut faire baisser légèrement la force.</p>
      <h3>Quand l'app la propose</h3>
      <p>Elle est proposée après ${DELOAD.every} semaines intenses d'affilée (2 séances ou plus par semaine), en cas de surcharge, ou si ta force baisse alors que tu t'entraînes autant. Jamais deux fois en moins de 4 semaines.</p>
      <div class="group" style="margin-top:16px"><div class="row">
        <div class="grow"><div class="t">Me la proposer automatiquement</div><div class="s">Une carte s'affiche sur l'accueil</div></div>
        <button class="switch ${S.settings.deloadTips!==false?"on":""}" role="switch" aria-checked="${!!(S.settings.deloadTips!==false)}" aria-label="Proposer automatiquement les semaines allégées" data-a="deloadToggleTips"></button>
      </div></div>
      <div class="btnrow">${on ? `<button class="btn secondary" data-a="deloadStop">Arrêter la semaine allégée</button>` : `<button class="btn" data-a="deloadStart">${icon("play")} Commencer maintenant</button>`}</div>
      <h3>Sources</h3>
      <ul class="how-src">${DELOAD_SOURCES.map(([t,u])=>`<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join("")}</ul>
      <p class="hr-note">Ces repères viennent de la recherche et de l'expérience d'entraîneurs. Écoute aussi tes sensations.</p>
    </div>`, { tall:true, child:true, restore:()=>ACT.deloadHow() });
    sheetBackHead();
  },
});

// ---------- « Toi, il y a 3 mois » ----------
// Comparaisons concrètes, en vraies séries (« 10 × 14 kg »), classées par progression du 1RM estimé :
// ta meilleure série des 3 dernières semaines face à celle d'il y a environ 3 mois (entre 2 et 4 mois),
// à défaut ta toute première fois si elle date d'au moins 4 semaines. Seules les hausses de 5 % et plus.
function setTxt(def, st){ return isTimed(def) ? `${st.reps} s` : `${st.reps}${kgType(def) ? "" : " rép."}${loadSuffix(def, st.weight)}`; }
function bestSetOf(def, ex, date){
  let best = null;
  ex.sets.forEach(st=>{ if(!st.done || !(st.reps>0)) return; const p = sessionPerf(def, { sets:[st] }, date); if(p && (!best || p.v>best.v)) best = { v:p.v, txt:setTxt(def, st) }; });
  return best;
}
function thenVsNow(){
  return memo("thenNow"+todayISO(), ()=>{
    const t0 = todayISO(), recent = addDaysISO(t0, -21), target = addDaysISO(t0, -90), per = {};
    S.sessions.forEach(s=>s.exos.forEach(ex=>{ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return;
      const b = bestSetOf(def, ex, s.date); if(b) (per[ex.exoId] = per[ex.exoId] || []).push(Object.assign({ date:s.date }, b)); }));
    const out = [];
    Object.keys(per).forEach(id=>{
      const h = per[id]; if(h.length<3) return;
      const cur = h.filter(x=>x.date>=recent); if(!cur.length) return;
      const now = cur.reduce((a,b)=>b.v>=a.v ? b : a);
      let then = h.filter(x=>{ const d = daysBetween(x.date, t0); return d>=60 && d<=120; })
        .sort((a,b)=>Math.abs(daysBetween(a.date, target))-Math.abs(daysBetween(b.date, target)))[0], label;
      if(then) label = "Il y a 3 mois";
      else { then = h[0]; const d = daysBetween(then.date, t0); if(d<28) return;
        label = d>=50 ? `Il y a ${Math.round(d/30.4)} mois` : `Il y a ${Math.round(d/7)} semaines`; }
      const pct = Math.round((now.v/then.v-1)*100);
      if(pct>=5) out.push({ def:EXO_MAP[id], then, now, pct, label });
    });
    return out.sort((a,b)=>b.pct-a.pct);
  });
}
Object.assign(ACT, { tnOpen(d){ exoChartSheet(d.id); } });
// Progrès > Résumé : les 3 plus belles progressions (la seule place où elles apparaissent)
function thenNowListHTML(){
  if(S.settings.thenNow===false) return "";
  const list = thenVsNow().slice(0, 3); if(!list.length) return "";
  return `<h2 class="sh">Avant et maintenant</h2><div class="group tn-list stagger" style="--i:4">
    ${list.map((c,i)=>`<button class="row tap tn-li" style="--k:${i}" data-a="tnOpen" data-id="${c.def.id}" aria-label="${esc(c.def.n)} : ${esc(c.label.toLowerCase())} ${esc(c.then.txt)}, maintenant ${esc(c.now.txt)}, plus ${c.pct} %">
      ${exoIcon(c.def)}
      <div class="grow"><div class="t">${esc(c.def.n)}</div><div class="s">${esc(c.label)} ${esc(c.then.txt)} → <b>${esc(c.now.txt)}</b></div></div>
      <span class="tn-pct">+${c.pct}&#8239;%</span>
    </button>`).join("")}
  </div>`;
}
