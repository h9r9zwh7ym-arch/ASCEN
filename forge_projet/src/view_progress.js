// ================= VUE : PROGRÈS =================
let progressTab = "overview";

function trainedExoIds(){
  const last = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) last[ex.exoId] = s.date; }));
  return Object.keys(last).sort((a,b)=>last[b].localeCompare(last[a]));
}
// Stimulus par muscle : séries « pondérées » (muscle principal = 1 série, muscle secondaire = ½),
// la méthode de comptage de la méta-régression de Pelland et al. (67 études, 2 058 participants).
const VOL_GROUPS = [["pect","Pectoraux"],["dos","Dos"],["epaules","Épaules"],["biceps","Biceps"],["triceps","Triceps"],["quadriceps","Quadriceps"],["ischios","Ischios"],["fessiers","Fessiers"],["mollets","Mollets"],["abdos","Abdos"]];
// repères (Pelland et al.) : ~4 séries pondérées par semaine pour un gain de muscle mesurable ;
// au-delà le gain continue mais ralentit (pas de plafond net) ; la force plafonne vers ~3 séries
const STIM = { min:4, high:10 };
function muscleVolume(days){
  return memo("muscleVol"+days+todayISO(), ()=>{
    const cutoff = addDaysISO(todayISO(), -days), sets = {}, dset = {};
    for(let i=S.sessions.length-1;i>=0;i--){
      const s = S.sessions[i]; if(s.date<=cutoff) break;
      for(const ex of s.exos){
        const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) continue;
        // une série facile (3 répétitions ou plus en réserve) compte ½ : loin de l'échec, elle stimule moins
        const n = ex.sets.reduce((t,st)=>t+(st.done ? (st.effort===1 ? .5 : 1) : 0), 0); if(!n) continue;
        def.muscles.forEach((m,k)=>{ sets[m] = (sets[m]||0) + (k===0 ? n : n/2); (dset[m] = dset[m]||new Set()).add(s.date); });
      }
    }
    return VOL_GROUPS.map(([id,n])=>({ id, n, sets:Math.round((sets[id]||0)*2)/2, freq:dset[id] ? dset[id].size : 0, region:REGION_OF_MUSCLE[id] }));
  });
}
function weekVolume(){ return muscleVolume(7); }
function stimZone(v){ return v>=STIM.high ? "high" : v>=STIM.min ? "ok" : v>0 ? "low" : "none"; }
function recentPRs(n){
  const out = [];
  for(let i=S.sessions.length-1;i>=0 && out.length<n;i--){
    const s = S.sessions[i];
    s.exos.forEach(ex=>ex.sets.forEach(st=>{ if(st.done && st.pr && out.length<n) out.push({ s, def:EXO_MAP[ex.exoId], st }); }));
  }
  return out.filter(x=>x.def);
}

function renderProgress(){
  // quatre onglets, une question chacun : où j'en suis (Résumé), quels muscles je travaille (Muscles),
  // chaque exercice (Exercices), ce que je vise et ce que j'ai gagné (Objectifs : niveau, objectifs, défis, trophées)
  const seg = segHTML("progress", [["overview","Résumé"],["muscles","Muscles"],["exos","Exercices"],["medals","Objectifs"]], progressTab, "progressTab");
  const pane = progressTab==="exos" ? exosPaneHTML() : progressTab==="medals" ? goalsPaneHTML() : progressTab==="muscles" ? musclesPaneHTML() : overviewPaneHTML();
  return `<div class="navbar"><div class="nb-title">Progrès</div></div><div class="content">
    <h1 class="lt">Progrès</h1>${seg}<div class="seg-pane">${pane}</div></div>`;
}

// ---------- projection d'un exercice (réglage Motivation, 4.0) ; l'indice de force est dans strength.js ----------
function exoMetric(def, ex, kgOnly){
  let m = 0;
  for(const st of ex.sets){ if(!st.done || !(st.reps>0)) continue;
    const v = kgType(def) ? (st.weight ? (kgOnly ? st.weight : estimated1RM(st.weight, st.reps)) : 0) : st.reps;
    if(v>m) m = v; }
  return m;
}
function exoHistory(kgOnly){
  return memo("exoHist"+(kgOnly?1:0), ()=>{ const h = {};
    for(const s of S.sessions) for(const ex of s.exos){ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) continue;
      const v = exoMetric(def, ex, kgOnly); if(v>0) (h[ex.exoId] = h[ex.exoId] || []).push({ date:s.date, v }); }
    return h; });
}
// pente des moindres carrés (unité de y par unité de x)
function slopeOf(pts){
  const n = pts.length; if(n<2) return 0;
  const mx = pts.reduce((a,p)=>a+p[0],0)/n, my = pts.reduce((a,p)=>a+p[1],0)/n;
  const den = pts.reduce((a,p)=>a+(p[0]-mx)**2,0); return den ? pts.reduce((a,p)=>a+(p[0]-mx)*(p[1]-my),0)/den : 0;
}
// l'exercice le plus pratiqué ces 8 semaines (au moins 4 fois) et où il mène en 8 semaines au même rythme
function exoProjection(){
  return memo("exoProj"+todayISO(), ()=>{
    const since = addDaysISO(todayISO(), -56), hist = exoHistory(true);
    let best = null;
    Object.keys(hist).forEach(id=>{ const win = hist[id].filter(x=>x.date>since); if(win.length>=4 && (!best || win.length>best.win.length)) best = { id, win }; });
    if(!best) return null;
    const def = EXO_MAP[best.id], t0 = best.win[0].date, pts = best.win.map(x=>[daysBetween(t0, x.date), x.v]);
    const slope = slopeOf(pts), cur = Math.max(...best.win.slice(-2).map(x=>x.v));
    if(slope<=0) return { def, cur, flat:true };
    let proj = Math.min(cur*1.25, cur + slope*56);
    const lt = loadableTypeOf(def), owned = lt && (S.equipment.weights[lt]||[]).filter(w=>w>cur && w<=proj+0.01).sort((a,b)=>a-b);
    proj = kgType(def) ? (owned && owned.length ? owned[owned.length-1] : Math.round(proj*2)/2) : Math.round(proj);
    if(proj<=cur) return { def, cur, flat:true };
    return { def, cur, proj, date:addDaysISO(todayISO(), 56) };
  });
}
function levelCardHTML(){
  const lv = levelInfo();
  return `<div class="level-card stagger" style="--i:0">
    <div class="lv-badge"><span>${lv.level}</span></div>
    <div class="grow">
      <div class="lv-title">Niveau ${lv.level} · ${esc(lv.title)}</div>
      <div class="xpbar"><span style="width:${Math.round(lv.pct*100)}%"></span></div>
      <div class="lv-sub"><span data-count="${lv.xp}" data-unit="XP">${fmtNum(lv.xp)} XP</span> · encore ${fmtNum(lv.next-lv.xp)} XP pour le niveau ${lv.level+1}</div>
    </div>
  </div>`;
}

function overviewPaneHTML(){
  if(!S.sessions.length){
    return `<div class="empty-state"><span class="em">${sfIcon("chart","orange","lg")}</span>Tes statistiques apparaîtront ici après ta première séance : progression de force, régularité, tonnage, records…</div>`;
  }
  const vol = totalVolumeAllTime(), hours = totalDurationSec()/3600;
  const kpis = `<div class="kpi-grid">
    <div class="kpi stagger" style="--i:2"><div class="kpi-l">Séances</div><div class="kpi-v" data-count="${S.sessions.length}">${S.sessions.length}</div><div class="kpi-s">${sessionsInMonth()} ce mois-ci</div></div>
    <div class="kpi stagger" style="--i:3"><div class="kpi-l">Tonnage total</div><div class="kpi-v" ${vol>=10000?`data-count="${round1(vol/1000)}" data-dec="1" data-unit="t"`:`data-count="${Math.round(vol)}" data-unit="kg"`}>${fmtKg(vol)}</div><div class="kpi-s">record : ${fmtKg(bestSessionVolume())} / séance</div></div>
    <div class="kpi stagger" style="--i:4"><div class="kpi-l">Temps d'entraînement</div><div class="kpi-v" data-count="${round1(hours)}" data-dec="1" data-unit="h">${fmtDec(hours)} h</div><div class="kpi-s">${fmtDuration(Math.round(totalDurationSec()/S.sessions.length))} en moyenne</div></div>
    <div class="kpi stagger" style="--i:5"><div class="kpi-l">Séries validées</div><div class="kpi-v" data-count="${totalSets()}">${fmtNum(totalSets())}</div><div class="kpi-s">${S.meta.prCount||0} records battus</div></div>
  </div>`;
  return `${strengthCardHTML()}${thenNowListHTML()}${kpis}
    <div class="chart-card stagger" style="--i:6">
      <div class="cc-h"><div class="cc-t">Régularité</div><div class="cc-s">18 dernières semaines · ${currentStreakWeeks()} sem. d'affilée, record ${maxStreakWeeksEver()}${(()=>{ const a = monthPlanAdherence(); return a ? ` · ce mois : ${a.done} séance${a.done>1?"s":""} sur ${a.planned} prévue${a.planned>1?"s":""}` : ""; })()}</div></div>
      ${heatmap(18)}
    </div>
    ${habitsHTML()}`;
}
// tes habitudes (anciennement dans Profil) : ce qui te caractérise, sans répéter les chiffres du haut
let habitsOpen = false;
function habitsHTML(){
  const fav = favoriteExercise(), wd = favoriteWeekday(), moment = favoriteMoment(), bw = bestWeek();
  const rows = [
    [["star","yellow"],"Exercice le plus fait", fav?`${fav.n}×`:"–", fav?esc(fav.def.n):""],
    [["calendar","red"],"Jour préféré", wd?JOURS[(wd.i+1)%7]:"–", moment?`plutôt ${moment}`:""],
    [["trophy","yellow"],"Meilleure semaine", bw?`${bw.n} séance${bw.n>1?"s":""}`:"–", bw?`semaine du ${fmtDate(bw.wk)}`:""],
    [["chart","blue"],"Rythme moyen", `${weeklyAverage(8).toLocaleString("fr-FR")} / sem.`, "sur les 8 dernières semaines"],
    [["dumbbell","orange"],"Exercices pratiqués", distinctExosCount(), `${sessionsInYear()} séances cette année`],
  ];
  return `<h2 class="sh">Tes habitudes</h2>
    <div class="group habits">${rows.map((r,i)=>`<div class="row stat-row stagger" style="--i:${i+7}">
      ${sfIcon(r[0][0], r[0][1])}
      <div class="grow"><div class="t">${r[1]}</div>${r[3]?`<div class="s">${r[3]}</div>`:""}</div>
      <div class="val strong">${r[2]}</div>
    </div>`).join("")}</div>`;
}
// Muscles : la carte de la semaine et le stimulus de chaque muscle (séries pondérées, repères sourcés)
function musclesPaneHTML(){
  if(!S.sessions.length) return `<div class="empty-state"><span class="em">${sfIcon("person","orange","lg")}</span>Après ta première séance, tu verras ici quels muscles tu travailles, et assez ou non.</div>`;
  return weekMuscleMapHTML();
}
// Objectifs : niveau, objectifs chiffrés, défis, puis les trophées
function goalsPaneHTML(){ return `${levelCardHTML()}${targetsHTML()}${challengesHTML()}${medalsPaneHTML()}`; }

function exoSeries(id){
  const def = EXO_MAP[id], loaded = !!kgType(def), pts = [];
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===id);
    if(!ex) return;
    const done = ex.sets.filter(st=>st.done);
    if(!done.length) return;
    pts.push({
      s, done,
      best: loaded ? round1(Math.max(...done.map(st=>estimated1RM(st.weight||0, st.reps||0)))) : Math.max(...done.map(st=>st.reps||0)),
      maxW: Math.max(...done.map(st=>st.weight||0)),
      vol: done.reduce((t,st)=>t+(st.reps||0)*(st.weight||0),0),
      reps: done.reduce((t,st)=>t+(st.reps||0),0),
    });
  });
  return { def, loaded, pts };
}

function exosPaneHTML(){
  const ids = trainedExoIds();
  if(!ids.length) return `<div class="empty-state"><span class="em">${sfIcon("dumbbell","orange","lg")}</span>Termine des séances pour suivre ta progression exercice par exercice.</div>`;
  const prs = recentPRs(4);
  return `${prs.length?`<h2 class="sh">Derniers records</h2><div class="group">${prs.map((p,i)=>`<button class="row tap stagger" style="--i:${i}" data-a="openExoChart" data-id="${p.def.id}">
      ${sfIcon("bolt","orange")}
      <div class="grow"><div class="t">${esc(p.def.n)}</div><div class="s">${p.st.reps} ${isTimed(p.def)?"s":"reps"}${loadSuffix(p.def, p.st.weight)} · ${fmtRelative(p.s.date)}</div></div>
      <span class="chev">${icon("chev")}</span></button>`).join("")}</div>`:""}
    <h2 class="sh">Tous mes exercices</h2>
    <div class="sh-sub">Courbe : 1RM estimé pour les exercices chargés, meilleure série pour le poids du corps.</div>
    <div class="group">${ids.map((id,i)=>{
    const { def, loaded, pts } = exoSeries(id);
    if(!def) return "";
    const pr = exoPRs(id);
    return `<button class="row tap stagger" style="--i:${Math.min(i,12)}" data-a="openExoChart" data-id="${id}">
      ${exoIcon(def)}
      <div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${pts.length} séance${pts.length>1?"s":""} · ${loaded&&pr.maxWeight?"record "+fmtDec(pr.maxWeight)+" kg":"record "+Math.max(...pts.map(p=>p.best))+(isTimed(def)?" s":" reps")}</div></div>
      ${sparkline(pts.slice(-10).map(p=>p.best))}
      <span class="chev">${icon("chev")}</span>
    </button>`;
  }).join("")}</div>`;
}

function exoChartSheet(id){
  const { def, loaded, pts } = exoSeries(id);
  const pr = exoPRs(id);
  const lbl = p => fmtDate(p.s.date);
  const main = lineChart(pts.map(p=>({ label:lbl(p), v:p.best, tip:`${fmtDate(p.s.date,"long")} : ${loaded?fmtDec(p.best)+" kg (1RM estimé)":p.best+" reps"}` })),
    { fmt: v=> loaded ? fmtDec(v)+" kg" : v+" reps", aria: loaded?"1RM estimé par séance":"Meilleure série par séance" });
  const last12 = pts.slice(-12);
  const cols = columnChart(last12.map(p=>({ label:lbl(p), v: loaded?Math.round(p.vol):p.reps, tip:`${fmtDate(p.s.date,"long")} : ${loaded?fmtKg(p.vol):p.reps+" reps"}` })), { fmt: v=> loaded?fmtKg(v):v+" reps" });
  const hist = pts.slice(-8).reverse().map(p=>`<div class="row" style="align-items:flex-start">
      <div class="grow"><div class="t" style="font-size:calc(15rem/17)">${esc(fmtDate(p.s.date,"long"))}</div>
      <div class="set-chips">${p.done.map(st=>`<span class="chip ${st.pr?"pr":""}">${st.pr?ii("bolt"):""}${st.reps}${loadSuffix(def, st.weight)}</span>`).join("")}</div></div>
    </div>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">${esc(def.n)}</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
    <div class="stat-strip">
      <div class="stat-box"><div class="num">${pts.length}</div><div class="lbl">séances</div></div>
      ${loaded?`<div class="stat-box"><div class="num">${pr.maxWeight||"–"}</div><div class="lbl">record (kg)</div></div>
      <div class="stat-box"><div class="num">${pr.best1rm?fmtDec(pr.best1rm):"–"}</div><div class="lbl">1RM estimé</div></div>`
      :`<div class="stat-box"><div class="num">${Math.max(...pts.map(p=>p.best))}${isTimed(def)?" s":""}</div><div class="lbl">meilleure série</div></div>
      <div class="stat-box"><div class="num">${isTimed(def) ? fmtDuration(pts.reduce((t,p)=>t+p.reps,0)) : fmtNum(pts.reduce((t,p)=>t+p.reps,0))}</div><div class="lbl">${isTimed(def)?"tenus au total":"reps au total"}</div></div>`}
    </div>
    <div class="chart-card">
      <div class="cc-h"><div class="cc-t">${loaded?"1RM estimé":"Meilleure série"}</div><div class="cc-s">${loaded?"formule d'Epley, meilleure série de chaque séance":(isTimed(def) ? "secondes tenues sur ta meilleure série" : "répétitions de ta meilleure série")}</div></div>
      ${main}
    </div>
    <div class="chart-card">
      <div class="cc-h"><div class="cc-t">${loaded?"Tonnage par séance":"Répétitions par séance"}</div><div class="cc-s">${last12.length} dernières séances</div></div>
      ${cols}
      ${dataTable(["Date", loaded?"1RM estimé":"Meilleure série", loaded?"Tonnage":"Reps totales"], pts.map(p=>[fmtDate(p.s.date), loaded?fmtDec(p.best)+" kg":p.best, loaded?fmtKg(p.vol):p.reps]))}
    </div>
    <h2 class="sh">Dernières séances</h2>
    <div class="group">${hist}</div>
    <div class="btnrow"><button class="btn secondary" data-a="showExoInfo" data-id="${id}">Voir la technique</button></div>
    </div>`);
}

function medalsPaneHTML(){
  const c = tierCounts();
  const next = MEDALS.filter(m=>!m.secret).map(m=>({ m, p:medalProgress(m) })).filter(x=>x.p.next!=null).sort((a,b)=>b.p.pct-a.p.pct).slice(0,3);
  return `${trophy3dCardHTML()}<div class="medal-summary stagger" style="--i:0">
      ${[1,2,3,4].map(k=>`<div class="ms-cell"><span class="pip big t${k}"></span><div class="ms-n" data-count="${c[k]}">${c[k]}</div><div class="ms-l">${TIERS[k].n}</div></div>`).join("")}
    </div>
    ${next.length?`<h2 class="sh">Prochains paliers</h2><div class="group">${next.map((x,i)=>`<button class="row tap stagger" style="--i:${i+1}" data-a="showMedal" data-id="${x.m.id}">
      ${medalHTML(x.m, x.p.t, "sm")}
      <div class="grow"><div class="t">${esc(x.m.n)} <span class="tier-tag t${x.p.t+1}">${TIERS[x.p.t+1].n}</span></div>
      <div class="mc-bar" style="margin-top:6px"><span style="width:${Math.round(x.p.pct*100)}%"></span></div>
      <div class="s" style="margin-top:4px">${fmtMedalVal(x.m,x.p.v)} / ${fmtMedalVal(x.m,x.p.next)} ${esc(medalUnit(x.m,x.p.next))}</div></div>
    </button>`).join("")}</div>`:""}
    ${MEDAL_CATS.map(([cat,label])=>{
      const list = MEDALS.filter(m=>m.cat===cat);
      const done = list.reduce((t,m)=>t+medalTier(m),0);
      return `<h2 class="sh">${label}<span class="more" style="color:var(--label2)">${done}/${list.length*4}</span></h2>
        <div class="medal-grid">${list.map((m,i)=>medalCardHTML(m,i+4)).join("")}</div>`;
    }).join("")}
    <h2 class="sh">Trophées secrets<span class="more" style="color:var(--label2)">${SECRETS.filter(m=>medalTier(m)).length}/${SECRETS.length}</span></h2>
    <p class="hr-note" style="margin:-4px 20px 10px">Ils se dévoilent quand tu les découvres. Touche-en un pour un indice.</p>
    <div class="medal-grid">${SECRETS.slice().sort((a,b)=>medalTier(b)-medalTier(a)).map((m,i)=>medalCardHTML(m,i+4)).join("")}</div>`;
}

const paneSeen = {}; // sous-onglet de Progrès → version des données déjà affichée
Object.assign(ACT, {
  progressTab(d){
    if(progressTab===d.v) return;
    // v4.0 : plus de capture de toute la page (View Transitions) ni de cascade rejouée : le
    // sélecteur glisse (settleSegs), le contenu est reconstruit et apparaît en fondu court
    // les graphiques (courbe, carte des muscles, barres) ne se redessinent qu'à la première visite
    // de chaque sous-onglet pour ces données : aller-retour Résumé ↔ Muscles sans tout rejouer
    paneSeen[progressTab] = DATA_VER;
    progressTab = d.v; const v = qs("#v-progress"), first = paneSeen[d.v]!==DATA_VER;
    if(v.scrollTop) v.scrollTop = 0; // avant le rendu : pas de seconde mise en page forcée
    renderView("progress");
    const pane = v.querySelector(".seg-pane");
    if(pane && first){ pane.classList.add("pane-in"); setTimeout(()=>pane.classList.remove("pane-in"), 2400); }
    if(pane && pane.animate && !reducedMotion()) try{ pane.animate([{ opacity:0, transform:"translateY(6px)" }, { opacity:1, transform:"none" }], { duration:200, easing:"cubic-bezier(.2,.8,.2,1)" }); }catch(e){}
  },
  openExoChart(d){ exoChartSheet(d.id); },
});
// ---------- objectifs personnels chiffrés ----------
// Un objectif précis et un peu ambitieux (« 10 tractions ») motive davantage qu'un vague
// « progresser » (Locke & Latham). On en garde peu d'actifs à la fois pour rester lisible.
const TARGET_MAX = 6;
function targetKindsFor(def){ return isTimed(def) ? ["sec"] : kgType(def) ? ["kg","reps"] : ["reps"]; }
function fmtTarget(kind, v, short){ return kind==="kg" ? fmtDec(v)+" kg" : kind==="sec" ? `${Math.round(v)} s` : short ? `${Math.round(v)} reps` : nb(Math.round(v), "répétition"); }
// meilleure valeur sur une série : répétitions, charge (au moins 1 répétition) ou secondes
function bestOf(exoId, kind){
  return memo("best:"+exoId+":"+kind, ()=>{
    let b = 0;
    S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.exoId!==exoId) return;
      ex.sets.forEach(st=>{ if(!st.done || !(st.reps>0)) return; b = Math.max(b, kind==="kg" ? (st.weight||0) : st.reps); }); }));
    return b;
  });
}
function targetPct(t){ const cur = bestOf(t.exoId, t.kind); return t.doneAt ? 1 : Math.max(0, Math.min(1, (cur-t.start)/Math.max(0.001, t.value-t.start))); }
// objectifs atteints depuis la dernière vérification (fin de séance, séance modifiée)
function checkTargets(){
  const hit = [];
  S.targets.forEach(t=>{ if(!t.doneAt && EXO_MAP[t.exoId] && bestOf(t.exoId, t.kind)>=t.value){ t.doneAt = todayISO(); hit.push(t); } });
  return hit;
}
function targetRowHTML(t){
  const def = EXO_MAP[t.exoId]; if(!def) return "";
  const cur = bestOf(t.exoId, t.kind), pct = targetPct(t);
  return `<button class="row tap tg-row ${t.doneAt?"done":""}" style="width:100%" data-a="openTarget" data-id="${t.id}">
    ${exoIcon(def)}
    <div class="grow"><div class="t">${esc(def.n)}</div>
      ${t.doneAt ? `<div class="s">${ii("target","tgt")} <b class="tg-v">${fmtTarget(t.kind, t.value)}</b> · atteint ${esc(fmtRelative(t.doneAt))}</div>`
        : `<div class="s">Objectif <b class="tg-v">${fmtTarget(t.kind, t.value, 1)}</b> · ${cur ? `record ${fmtTarget(t.kind, cur, 1)}` : "pas encore pratiqué"}</div><div class="xpbar tg-bar"><span style="width:${Math.round(pct*100)}%"></span></div>`}</div>
    <span class="chev">${icon("chev")}</span></button>`;
}
function targetsHTML(){
  const active = S.targets.filter(t=>!t.doneAt), done = S.targets.filter(t=>t.doneAt).slice(-3).reverse();
  const add = active.length<TARGET_MAX ? `<button class="row tap tg-add" style="width:100%" data-a="newTarget">${sfIcon("target","red")}<div class="grow"><div class="t">${S.targets.length ? "Ajouter un objectif" : "Te fixer un objectif"}</div>${S.targets.length ? "" : `<div class="s">Ex. 10 tractions, 24 kg au développé, 90 s de gainage</div>`}</div><span class="chev">${icon("chev")}</span></button>` : "";
  return `<h2 class="sh">Mes objectifs</h2><div class="group tg-group stagger" style="--i:1">${active.map(targetRowHTML).join("")}${add}${done.map(targetRowHTML).join("")}</div>`;
}
let targetDraft = null;
function targetSheetHTML(){
  const t = targetDraft, def = EXO_MAP[t.exoId], kinds = targetKindsFor(def);
  const cur = bestOf(t.exoId, t.kind);
  const step = t.kind==="kg" ? (DEFAULT_INCREMENT[kgType(def)]||2) : t.kind==="sec" ? 5 : 1;
  return `<div class="sheet-hd te-hd"><button class="te-cancel" data-a="${t.id?"closesheet":"newTarget"}">${t.id?"Fermer":"Retour"}</button><span class="t">${t.id?"Objectif":"Nouvel objectif"}</span><span class="te-spacer"></span></div>
    <div class="sheet-body" id="tgBody">
      <div class="group"><div class="row">${exoIcon(def)}<div class="grow"><div class="t">${esc(def.n)}</div><div class="s">${cur ? `Ton record : ${fmtTarget(t.kind, cur)}` : "Pas encore pratiqué"}</div></div></div></div>
      ${kinds.length>1 && !t.id ? `<div class="tg-seg">${segHTML("tgKind", [["kg","Charge"],["reps","Répétitions"]], t.kind, "tgKind")}</div>` : ""}
      <div class="te-sec">${t.kind==="kg" ? "Charge à atteindre (sur une série)" : t.kind==="sec" ? "Durée à tenir (sur une série)" : "Répétitions en une série"}</div>
      <div class="tg-step"><button data-a="tgStep" data-d="-${step}" aria-label="Moins">−</button><div class="tg-val" id="tgVal">${fmtTarget(t.kind, t.value)}</div><button data-a="tgStep" data-d="${step}" aria-label="Plus">+</button></div>
      <p class="hr-note tg-hint">${t.value<=cur ? "Déjà atteint : vise un peu plus haut." : "Un objectif atteignable en quelques semaines motive le plus : ni trop facile, ni hors de portée."}</p>
      ${t.id ? `<button class="btn ghost te-del" data-a="delTarget" data-id="${t.id}">Supprimer l'objectif</button>` : ""}
    </div>`;
}
function openTargetSheet(){
  const t = targetDraft;
  openSheet(targetSheetHTML(), { footer: t.id ? null : `<button class="btn" id="tgSave" data-a="saveTarget" ${t.value>bestOf(t.exoId,t.kind)?"":"disabled"}>Enregistrer l'objectif</button>` });
  settleSegs(qs("#tgBody"));
}
function suggestTarget(exoId, kind){
  const def = EXO_MAP[exoId], cur = bestOf(exoId, kind);
  if(kind==="kg"){
    if(!cur) return 10;
    const v = nextWeight(def, nextWeight(def, cur)) || 0;
    return v>cur ? v : round1(cur + 2*(DEFAULT_INCREMENT[kgType(def)]||2)); // au-delà des charges possédées
  }
  if(kind==="sec") return Math.max(30, Math.ceil(cur*1.25/5)*5);
  return Math.max(def.repsMin||5, Math.ceil(cur*1.3) || def.repsMax || 10);
}
Object.assign(ACT, {
  newTarget(){
    openPicker({ title:"Objectif sur quel exercice ?", exclude:new Set(S.targets.filter(t=>!t.doneAt).map(t=>t.exoId)),
      onDone:ids=>{ const def = EXO_MAP[ids[0]]; if(!def) return; const kind = targetKindsFor(def)[0];
        targetDraft = { exoId:def.id, kind, value:suggestTarget(def.id, kind) }; openTargetSheet(); } });
  },
  tgKind(d, el){
    if(!targetDraft || targetDraft.kind===d.v) return;
    targetDraft.kind = d.v; targetDraft.value = suggestTarget(targetDraft.exoId, d.v); openTargetSheet();
  },
  tgStep(d){
    const t = targetDraft; if(!t) return;
    t.value = Math.max(t.kind==="kg" ? 0.5 : 1, round1(t.value + parseFloat(d.d)));
    const v = qs("#tgVal"); if(v){ v.textContent = fmtTarget(t.kind, t.value); v.classList.remove("bump"); void v.offsetWidth; v.classList.add("bump"); }
    const cur = bestOf(t.exoId, t.kind), b = qs("#tgSave"); if(b) b.disabled = t.value<=cur;
    const h = qs(".tg-hint"); if(h) h.textContent = t.value<=cur ? "Déjà atteint : vise un peu plus haut." : "Un objectif atteignable en quelques semaines motive le plus : ni trop facile, ni hors de portée.";
    if(t.id){ const real = S.targets.find(x=>x.id===t.id); if(real && t.value>cur){ real.value = t.value; delete real.doneAt; changed(); } }
    sfx("seg");
  },
  saveTarget(){
    const t = targetDraft; if(!t || t.value<=bestOf(t.exoId, t.kind)) return;
    S.targets.push({ id:uid(), exoId:t.exoId, kind:t.kind, value:t.value, start:bestOf(t.exoId, t.kind), createdAt:todayISO() });
    targetDraft = null; closeSheet(); changed(); toast("Objectif enregistré", "target");
  },
  openTarget(d){
    const t = S.targets.find(x=>x.id===d.id); if(!t) return;
    targetDraft = Object.assign({}, t); openTargetSheet();
  },
  delTarget(d){ S.targets = S.targets.filter(x=>x.id!==d.id); targetDraft = null; closeSheet(); changed(); },
});
VIEWS.progress = renderProgress;

// bulle de la série : la règle du joker, et quand il redevient disponible
function jokerTip(){
  const si = streakInfo();
  if(si.recent) return `Joker utilisé (semaine du ${fmtDate(si.recent)}) : la série continue. Prochain joker dans ${si.nextJokerIn} semaine${si.nextJokerIn>1?"s":""}.`;
  return "Joker disponible : une semaine sans séance par mois ne casse pas la série.";
}
