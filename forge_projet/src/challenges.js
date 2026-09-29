// ================= DÉFIS (v3.6) =================
// Un défi = un but chiffré sur une durée courte (7 à 30 jours), à lancer quand on veut depuis
// Progrès. La progression est calculée à partir de l'historique (séances faites depuis le
// lancement) : rien à saisir. Défi réussi : fêté à la fin de la séance et compté dans le trophée
// « Défis relevés » ; délai dépassé : marqué manqué, on peut le relancer.
// État : S.challenges = [{ id, start:"AAAA-MM-JJ", doneAt?, missedAt? }] (au plus CHAL_MAX en cours)
const CHAL_MAX = 3;
const isPushup = def=>def && (pictoKey(def)==="pushup" || /^pompes/.test(def.id));
const CHALLENGES = [
  { id:"pompes100", n:"100 pompes", d:"100 répétitions de pompes (toutes variantes) en 7 jours.", days:7, goal:100, unit:"pompes", g:"bolt", c:"orange",
    val:ss=>ss.reduce((t,s)=>t+s.exos.reduce((a,ex)=>a+(isPushup(EXO_MAP[ex.exoId]) ? ex.sets.reduce((b,st)=>b+(st.done ? st.reps||0 : 0),0) : 0),0),0) },
  { id:"gainage10", n:"10 minutes de gainage", d:"10 minutes cumulées sur les exercices tenus (planche, chaise…) en 7 jours.", days:7, goal:10, unit:"min", g:"shield", c:"teal",
    val:ss=>ss.reduce((t,s)=>t+sessionSummary(s).holdSec,0)/60 },
  { id:"corps7", n:"Tout le corps", d:"Travailler les 11 groupes musculaires en 7 jours.", days:7, goal:11, unit:"groupes", g:"person", c:"purple",
    val:ss=>{ const m = new Set(); ss.forEach(s=>sessionSummary(s).exos.forEach(id=>{ const d = EXO_MAP[id]; if(d) d.muscles.forEach(x=>{ if(x!=="cardio") m.add(x); }); })); return m.size; } },
  { id:"reps1000", n:"1 000 répétitions", d:"1 000 répétitions (hors exercices tenus) en 14 jours.", days:14, goal:1000, unit:"reps", g:"repeat", c:"blue",
    val:ss=>ss.reduce((t,s)=>t+sessionSummary(s).reps,0) },
  { id:"seances12", n:"12 séances en 30 jours", d:"Trois séances par semaine pendant un mois.", days:30, goal:12, unit:"séances", g:"calendar", c:"indigo",
    val:ss=>ss.length },
  { id:"jambes8", n:"Jambes au programme", d:"8 séances avec au moins 3 séries de jambes en 30 jours.", days:30, goal:8, unit:"séances", g:"leg", c:"green",
    val:ss=>ss.filter(s=>sessionSummary(s).legSets>=3).length },
  { id:"records3", n:"3 records", d:"Battre 3 records personnels en 30 jours.", days:30, goal:3, unit:"records", g:"trendUp", c:"pink",
    val:ss=>ss.reduce((t,s)=>t+sessionSummary(s).prs,0) },
  { id:"tonnes10", n:"10 tonnes", d:"Soulever 10 000 kg au total (charges) en 14 jours.", days:14, goal:10, unit:"t", g:"mountain", c:"brown", needsLoad:true,
    val:ss=>ss.reduce((t,s)=>t+sessionSummary(s).vol,0)/1000 },
];
const CHAL_MAP = {}; CHALLENGES.forEach(c=>CHAL_MAP[c.id] = c);

function challengeEnd(c){ return addDaysISO(c.start, CHAL_MAP[c.id].days-1); }
function challengeValue(c){
  const def = CHAL_MAP[c.id]; if(!def) return 0;
  const end = challengeEnd(c), ss = S.sessions.filter(s=>s.date>=c.start && s.date<=end);
  try{ return def.val(ss) || 0; }catch(e){ return 0; }
}
function activeChallenges(){ return (S.challenges||[]).filter(c=>CHAL_MAP[c.id] && !c.doneAt && !c.missedAt); }
function challengesDone(){ return (S.challenges||[]).filter(c=>c.doneAt).length; }
// après une séance (et au rendu) : réussites et délais dépassés ; renvoie les défis tout juste réussis
function checkChallenges(){
  const today = todayISO(), won = [];
  activeChallenges().forEach(c=>{
    if(challengeValue(c)>=CHAL_MAP[c.id].goal){ c.doneAt = today; won.push(c); }
    else if(today>challengeEnd(c)) c.missedAt = today;
  });
  return won;
}
function fmtChal(def, v){ return def.unit==="t" || def.unit==="min" ? fmtDec(Math.floor(v*10)/10) : fmtNum(Math.floor(v)); }
function challengeRowHTML(c){
  const def = CHAL_MAP[c.id], v = challengeValue(c), pct = Math.min(1, v/def.goal);
  const left = daysBetween(todayISO(), challengeEnd(c));
  return `<div class="row ch-row">
    ${sfIcon(def.g, def.c)}
    <div class="grow"><div class="t">${esc(def.n)}</div>
      <div class="s"><b class="tg-v">${fmtChal(def, v)} / ${fmtChal(def, def.goal)} ${esc(def.unit)}</b> · ${left<=0 ? "dernier jour" : left===1 ? "encore 1 jour" : `encore ${left} jours`}</div>
      <div class="xpbar tg-bar"><span style="width:${Math.round(pct*100)}%"></span></div></div>
    <button class="icon-btn" aria-label="Abandonner le défi" data-a="dropChallenge" data-id="${c.id}">${icon("close")}</button>
  </div>`;
}
function challengesHTML(){
  // délai dépassé depuis la dernière séance (ou réussite après une correction d'historique)
  if(activeChallenges().length){ const k = activeChallenges().length; checkChallenges(); if(activeChallenges().length!==k) save(); }
  const act = activeChallenges(), n = challengesDone();
  const add = act.length<CHAL_MAX ? `<button class="row tap tg-add" style="width:100%" data-a="openChallenges">${sfIcon("flag","orange")}<div class="grow"><div class="t">${act.length ? "Lancer un autre défi" : "Relever un défi"}</div>${act.length ? "" : `<div class="s">Ex. 100 pompes en 7 jours, tout le corps en une semaine</div>`}</div><span class="chev">${icon("chev")}</span></button>` : "";
  return `<h2 class="sh">Défis${n ? `<span class="sh-actions"><span class="ch-count">${n} relevé${n>1?"s":""}</span></span>` : ""}</h2>
    <div class="group ch-group stagger" style="--i:1">${act.map(challengeRowHTML).join("")}${add}</div>`;
}
function openChallengesSheet(){
  const act = new Set(activeChallenges().map(c=>c.id)), hasLoad = availableExos().some(e=>kgType(e));
  const wins = {}; (S.challenges||[]).forEach(c=>{ if(c.doneAt) wins[c.id] = (wins[c.id]||0)+1; });
  const rows = CHALLENGES.filter(c=>!c.needsLoad || hasLoad).map(c=>`<div class="row ch-pick">
      ${sfIcon(c.g, c.c)}
      <div class="grow"><div class="t">${esc(c.n)}${wins[c.id] ? ` <span class="ch-won">${ii("check")} ${wins[c.id]>1 ? "×"+wins[c.id] : "réussi"}</span>` : ""}</div><div class="s">${esc(c.d)}</div></div>
      ${act.has(c.id) ? `<span class="ch-on">en cours</span>` : `<button class="btn secondary sm" data-a="startChallenge" data-id="${c.id}" ${act.size>=CHAL_MAX?"disabled":""}>Lancer</button>`}
    </div>`).join("");
  openSheet(`<div class="sheet-hd"><span class="t">Défis</span><button class="icon-btn" data-a="closesheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body"><p class="body" style="margin:0 20px 12px">Un défi commence aujourd'hui ; ta progression se calcule toute seule à partir de tes séances. ${CHAL_MAX} défis au plus en même temps.</p>
    <div class="group">${rows}</div></div>`, { tall:true });
}
Object.assign(ACT, {
  openChallenges(){ openChallengesSheet(); },
  startChallenge(d){
    if(!CHAL_MAP[d.id] || activeChallenges().length>=CHAL_MAX || activeChallenges().some(c=>c.id===d.id)) return;
    S.challenges = (S.challenges||[]).concat([{ id:d.id, start:todayISO() }]);
    closeSheet(); save(); renderView(currentTab); sfx("open");
    toast(`Défi lancé : ${CHAL_MAP[d.id].n}`, "flag");
  },
  dropChallenge(d){
    const c = activeChallenges().find(x=>x.id===d.id); if(!c) return;
    confirmSheet({ title:`Abandonner « ${CHAL_MAP[c.id].n} » ?`, html:"Tu pourras le relancer quand tu veux.", ok:"Abandonner", danger:true,
      onOk:()=>{ S.challenges = S.challenges.filter(x=>x!==c); save(); changed(); } });
  },
});
