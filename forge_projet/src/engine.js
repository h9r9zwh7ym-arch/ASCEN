// ================= MOTEUR DE SUGGESTION (100% local, aucun appel réseau) =================
const PATTERN_CYCLE = ["squat","hinge","push","pull","lunge","core","calf"];
const SESSION_SIZE = { court:4, moyen:6, long:8 };

function normName(s){
  return (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
}

// score d'un groupe musculaire : plus il a été délaissé récemment, plus il est prioritaire
function muscleScore(muscleId){
  const days = daysSinceTrained(muscleId);
  const emph = S.goals.emphasis[muscleId] || "normal";
  let w = emph==="prioriser" ? 1.6 : emph==="eviter" ? 0.25 : 1;
  let score = Math.min(days,10) * w;
  if(days<2) score *= 0.2; // récupération : fortement déprioritisé si travaillé hier ou aujourd'hui
  return score;
}

function recencyPenalty(exoId){
  // pénalise un exercice utilisé dans les 2 dernières séances, pour varier
  let penalty = 0;
  for(let i=S.sessions.length-1, n=0; i>=0 && n<2; i--, n++){
    if(S.sessions[i].exos.some(e=>e.exoId===exoId)) penalty += 2.5;
  }
  return penalty;
}

function scoreExo(exo){
  const primary = exo.muscles[0];
  let score = muscleScore(primary);
  exo.muscles.slice(1).forEach(m=>score += muscleScore(m)*0.3);
  if(isIncluded(exo.id)) score += 3;
  score -= recencyPenalty(exo.id);
  return score;
}

function repRangeForGoal(exo){
  const goal = S.goals.overall;
  const mid = Math.round((exo.repsMin+exo.repsMax)/2);
  if(goal==="force") return [exo.repsMin, mid];
  if(goal==="endurance") return [mid, exo.repsMax+4];
  return [exo.repsMin, exo.repsMax];
}

function loadableTypeOf(exo){
  if(exo._load!==undefined) return exo._load;
  return (exo._load = exo.equip.find(id=>EQUIP_MAP[id] && EQUIP_MAP[id].loadable) || null);
}

function nextWeight(exo, current){
  const type = loadableTypeOf(exo);
  if(!type) return null;
  const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
  if(owned.length){
    const higher = owned.find(w=>w>current+0.001);
    return higher!==undefined ? higher : owned[owned.length-1];
  }
  const inc = DEFAULT_INCREMENT[type]||2.5;
  return round1(current+inc);
}

// ---------- progression : « double progression » guidée par le ressenti ----------
// Repères (ACSM 2009, confirmés par la mise à jour 2026) : on progresse d'abord en
// répétitions dans la fourchette, puis on augmente la charge (2 à 10 %) quand on dépasse
// le haut de la fourchette ; les répétitions en réserve (RIR, Helms/Zourdos 2016)
// servent à moduler : « 0 en réserve » = on consolide, « 3+ en réserve » = on accélère.
// Variante plus difficile pour les exercices au poids du corps (pas de charge à ajouter).
const HARDER = {
  pompes_genoux:["pompes"], pompes_surelevees:["pompes"], pompes:["pompes_declinees","pompes_archer"],
  pompes_larges:["pompes_declinees","pompes_archer"], pompes_declinees:["pompes_archer"], pompes_diamant:["pompes_archer"],
  squat_pdc:["squat_bulgare_pdc","squat_saute"], fentes_avant:["fentes_sautees"], fentes_arriere:["squat_bulgare_pdc","fentes_sautees"],
  pont_fessier:["pont_fessier_uni"], tractions_negatives:["tractions"], releve_genoux_suspendu:["releve_jambes_suspendu"],
  mollets_pdc:["mollets_uni_pdc"], crunch:["releve_jambes"], planche:["planche_commando"],
};
function harderVariant(exo){
  const list = HARDER[exo.id]; if(!list) return null;
  const id = list.find(x=>EXO_MAP[x] && hasEquip(S.equipment, EXO_MAP[x].equip) && !S.prefs.excluded.includes(x));
  return id ? EXO_MAP[id] : null;
}
// ressenti d'une performance : 1 = facile (3+ en réserve), 2 = correct, 3 = à fond ; 0 = non renseigné
function perfEffort(ex){ const d = ex.sets.filter(s=>s.done); for(let i=d.length-1;i>=0;i--) if(d[i].effort) return d[i].effort; return 0; }
function recentPerformances(exoId, n){
  return memo("rp:"+exoId+":"+n, ()=>{
    const out = [];
    for(let i=S.sessions.length-1;i>=0 && out.length<n;i--){
      const ex = S.sessions[i].exos.find(x=>x.exoId===exoId);
      if(ex && ex.sets.some(st=>st.done)) out.push({ session:S.sessions[i], exo:ex });
    }
    return out;
  });
}
function lowerWeight(exo, current){
  const type = loadableTypeOf(exo); if(!type) return current;
  const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
  if(owned.length){ const lower = owned.slice().reverse().find(w=>w<current-0.001); return lower!==undefined ? lower : current; }
  return Math.max(0, round1(current-(DEFAULT_INCREMENT[type]||2.5)));
}
function suggestForExo(exo, setsN){
  const [rMin,rMax] = repRangeForGoal(exo);
  const n = setsN || exo.sets, timed = isTimed(exo);
  const type = loadableTypeOf(exo);
  let weight = null;
  if(type){
    const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
    weight = owned.length ? owned[0] : (DEFAULT_INCREMENT[type]||2.5);
  }
  const mid = Math.round((rMin+rMax)/2);
  let reps = new Array(n).fill(timed ? rMin : mid), note = null, harder = null;
  const [last, prev] = recentPerformances(exo.id, 2);
  if(!last) return { targetReps:[rMin,rMax], weight, reps, note: type ? "Première fois : choisis une charge qui te laisse 2 à 3 répétitions en réserve." : null };

  const done = last.exo.sets.filter(st=>st.done);
  const lastReps = i => (done[Math.min(i, done.length-1)]||{}).reps || mid;
  const top = last.exo.targetReps ? last.exo.targetReps[1] : rMax, bottom = last.exo.targetReps ? last.exo.targetReps[0] : rMin;
  const effort = perfEffort(last.exo);
  const hitTop = done.every(st=>(st.reps||0)>=top);
  const missed = done.some(st=>(st.reps||0) < bottom);
  const prevMissed = prev && prev.exo.sets.filter(st=>st.done).some(st=>(st.reps||0) < (prev.exo.targetReps ? prev.exo.targetReps[0] : rMin));

  const gap = daysBetween(last.session.date, todayISO());
  if(type){
    const lastW = Math.max(0, ...done.map(st=>st.weight||0)) || weight;
    weight = lastW;
    if(gap>=21){
      // après 3 semaines sans cet exercice : on repart un cran plus léger, sans pression
      weight = lowerWeight(exo, lastW); reps = new Array(n).fill(mid);
      note = `Reprise après ${gap} jours : charge un peu allégée pour retrouver tes sensations.`;
    } else if((hitTop && effort!==3) || (effort===1 && done.every(st=>(st.reps||0)>=top-1))){
      const nw = nextWeight(exo, lastW);
      if(nw>lastW+0.001){
        weight = nw; reps = new Array(n).fill(rMin);
        note = `Charge augmentée à ${fmtDec(nw)} kg : tu as dépassé la fourchette. Reprends en bas (${rMin} reps) et remonte.`;
      } else {
        reps = reps.map((_,i)=>Math.min(rMax+4, lastReps(i)+1));
        note = "Tu es à ta charge maximale : ajoute une répétition ou ralentis la descente (3 s).";
      }
    } else if(missed && (effort===3 || prevMissed)){
      const lw = lowerWeight(exo, lastW);
      weight = lw; reps = new Array(n).fill(rMin);
      note = lw<lastW ? `Charge allégée à ${fmtDec(lw)} kg pour retrouver une exécution propre, puis on remonte.` : "On garde la charge : vise une exécution propre avant tout.";
    } else if(missed){
      reps = new Array(n).fill(rMin);
      note = "Même charge : consolide les répétitions avant d'aller plus loin.";
    } else {
      const add = effort===3 ? 0 : 1;
      reps = reps.map((_,i)=>Math.max(rMin, Math.min(rMax, lastReps(i)+add)));
      if(add && reps.some((r,i)=>r>lastReps(i))) note = "Objectif du jour : une répétition de plus par série que la dernière fois.";
      else if(effort===3) note = "Dernière fois à fond : on refait pareil, en soignant l'exécution.";
    }
  } else {
    // poids du corps et exercices chronométrés : progression par les répétitions / les secondes
    const step = timed ? 5 : 1, cap = timed ? rMax+30 : rMax+6;
    const add = gap>=21 ? -step : effort===3 ? 0 : effort===1 ? step*2 : step;
    reps = reps.map((_,i)=>Math.max(rMin, Math.min(cap, lastReps(i)+add)));
    if(gap>=21){
      note = `Reprise après ${gap} jours : un peu moins que la dernière fois, on remonte vite.`;
    } else if(hitTop && effort!==3){
      const h = harderVariant(exo);
      if(h){ harder = h.id; note = `Tu maîtrises cet exercice : passe à « ${h.n} » pour continuer à progresser.`; }
      else if(add) note = timed ? `Objectif : ${step} secondes de plus par série.` : "Objectif : une répétition de plus par série.";
    } else if(add){
      note = timed ? `Objectif : +${add} s par rapport à la dernière fois.` : `Objectif : +${add} répétition${add>1?"s":""} par série par rapport à la dernière fois.`;
    }
  }
  return { targetReps:[rMin,rMax], weight, reps, note, harder };
}

function buildSetsFor(exo, suggestion){
  const midReps = Math.round((suggestion.targetReps[0]+suggestion.targetReps[1])/2);
  const sets = [];
  for(let i=0;i<exo.sets;i++){
    const r = suggestion.reps ? suggestion.reps[Math.min(i, suggestion.reps.length-1)] : midReps;
    sets.push({ reps:r, weight:suggestion.weight, done:false });
  }
  return sets;
}

function stepWeightValue(exo, current, dir){
  const type = loadableTypeOf(exo);
  if(!type) return current;
  const owned = (S.equipment.weights[type]||[]).slice().sort((a,b)=>a-b);
  if(owned.length){
    const idx = owned.findIndex(w=>Math.abs(w-current)<0.001);
    if(idx>=0){ const ni=idx+dir; return (ni>=0&&ni<owned.length) ? owned[ni] : current; }
    if(dir>0){ const higher = owned.find(w=>w>current); return higher!==undefined?higher:current; }
    const lower = owned.slice().reverse().find(w=>w<current);
    return lower!==undefined?lower:current;
  }
  const inc = DEFAULT_INCREMENT[type]||2.5;
  return Math.max(0, round1(current+dir*inc));
}

// ---------- types de séance ----------
const UPPER = ["pect","dos","epaules","biceps","triceps","avantbras"];
const LOWER = ["quadriceps","ischios","fessiers","mollets"];
const SESSION_TYPES = [
  { id:"auto", n:"Auto",           em:"✨", muscles:null },
  { id:"full", n:"Corps complet",  em:"🧍", muscles:null },
  { id:"haut", n:"Haut du corps",  em:"💪", muscles:UPPER },
  { id:"bas",  n:"Bas du corps",   em:"🦵", muscles:LOWER },
  { id:"push", n:"Poussée",        em:"⬆️", muscles:["pect","epaules","triceps"] },
  { id:"pull", n:"Tirage",         em:"⬇️", muscles:["dos","biceps","avantbras"] },
  { id:"bras", n:"Bras",           em:"🦾", muscles:["biceps","triceps","avantbras"] },
  { id:"core", n:"Gainage & cardio", em:"🔥", muscles:["abdos","cardio"] },
];
const SESSION_TYPE_MAP = {}; SESSION_TYPES.forEach(t=>SESSION_TYPE_MAP[t.id]=t);

// « Auto » choisit un type selon la récupération : on évite de retravailler une
// zone sollicitée il y a moins de 2 jours.
function resolveAutoType(){
  const recent = ms => ms.some(m=>daysSinceTrained(m)<2);
  const upRecent = recent(UPPER), lowRecent = recent(LOWER);
  if(lowRecent && !upRecent) return { type:"haut", reason:"Tes jambes ont travaillé récemment : on cible le haut du corps." };
  if(upRecent && !lowRecent) return { type:"bas", reason:"Le haut du corps a travaillé récemment : on cible les jambes." };
  if(upRecent && lowRecent) return { type:"core", reason:"Tout le corps a travaillé récemment : séance plus légère de gainage." };
  return { type:"full", reason:"Tu es bien récupéré·e : séance corps complet, en priorité les groupes les moins travaillés." };
}

function poolForType(typeId){
  const t = SESSION_TYPE_MAP[typeId];
  const base = availableExos();
  if(!t || !t.muscles) return base;
  const primary = base.filter(e=>t.muscles.includes(e.muscles[0]));
  if(primary.length>=3) return primary;
  return base.filter(e=>e.muscles.some(m=>t.muscles.includes(m)));
}

// avoid : exercices de la proposition précédente, fortement pénalisés pour que
// « Autre proposition » change vraiment. Le léger aléa départage les ex æquo.
function pickExosForSession(n, pool, avoid){
  pool = pool || availableExos();
  avoid = avoid || new Set();
  const score = {};
  pool.forEach(e=>{ score[e.id] = scoreExo(e) + Math.random()*1.2 - (avoid.has(e.id)?6:0); });
  const byScore = (a,b)=>score[b.id]-score[a.id];
  const chosen = [];
  const usedIds = new Set();
  for(let bucketI=0; chosen.length<n && bucketI<PATTERN_CYCLE.length*3; bucketI++){
    const pattern = PATTERN_CYCLE[bucketI % PATTERN_CYCLE.length];
    const candidates = pool.filter(e=>e.pattern===pattern && !usedIds.has(e.id)).sort(byScore);
    if(candidates.length){ chosen.push(candidates[0]); usedIds.add(candidates[0].id); }
  }
  if(chosen.length<n){
    const rest = pool.filter(e=>!usedIds.has(e.id)).sort(byScore);
    for(const e of rest){ if(chosen.length>=n) break; chosen.push(e); usedIds.add(e.id); }
  }
  return chosen;
}

function sessionEntryFor(exo, setsN){
  const n = setsN || exo.sets;
  const sug = suggestForExo(exo, n);
  const e = { exoId:exo.id, targetSets:n, targetReps:sug.targetReps, note:sug.note, sets:buildSetsFor(Object.assign({},exo,{sets:n}),sug) };
  if(sug.harder) e.harder = sug.harder;
  return e;
}

function generateEngineSession(typeId, avoid){
  typeId = typeId || "auto";
  let resolved = typeId, reason = null;
  if(typeId==="auto"){ const r = resolveAutoType(); resolved = r.type; reason = r.reason; }
  const n = SESSION_SIZE[S.goals.sessionLength] || 6;
  const exos = pickExosForSession(resolved==="core" ? Math.min(n,5) : n, poolForType(resolved), avoid);
  return {
    id: uid(), date: todayISO(), source:"engine", type:typeId, resolvedType:resolved, reason,
    startedAt:null, completedAt:null,
    exos: exos.map(exo=>sessionEntryFor(exo))
  };
}

function buildCustomSession(entries, name){
  return {
    id: uid(), date: todayISO(), source:"custom", name: name||null, startedAt:null, completedAt:null,
    exos: entries.filter(e=>EXO_MAP[e.exoId]).map(e=>sessionEntryFor(EXO_MAP[e.exoId], e.sets))
  };
}

// durée estimée : ~40 s d'effort par série + le repos prévu
function estimateMinutes(session){
  const sec = session.exos.reduce((t,ex)=>{
    const def = EXO_MAP[ex.exoId]; if(!def) return t;
    return t + ex.sets.length*(40+def.restSec);
  },0);
  return Math.max(5, Math.round(sec/60/5)*5);
}
function focusMuscles(session){
  const count = {};
  session.exos.forEach(ex=>{ const d=EXO_MAP[ex.exoId]; if(d) count[d.muscles[0]]=(count[d.muscles[0]]||0)+ex.sets.length; });
  return Object.keys(count).sort((a,b)=>count[b]-count[a]);
}

function resolveExoRef(ref){
  if(ref.id && EXO_MAP[ref.id]) return EXO_MAP[ref.id];
  const target = normName(ref.nom||ref.name||ref.id||"");
  if(!target) return null;
  let found = EXOS.find(e=>normName(e.n)===target || normName(e.id)===target);
  if(found) return found;
  found = EXOS.find(e=>normName(e.n).includes(target) || target.includes(normName(e.n)));
  return found||null;
}

function buildSessionFromImported(prog){
  const warnings = [];
  const exos = [];
  (prog.exercices||prog.exercises||[]).forEach(ref=>{
    const exo = resolveExoRef(ref);
    if(!exo){ warnings.push(`Exercice non reconnu : "${ref.nom||ref.name||ref.id||"?"}" (ignoré).`); return; }
    const setsN = ref.series||ref.sets||exo.sets;
    let reps = [exo.repsMin, exo.repsMax];
    if(typeof ref.reps==="string" && ref.reps.includes("-")){
      const [a,b] = ref.reps.split("-").map(x=>parseInt(x,10));
      if(!isNaN(a)&&!isNaN(b)) reps=[a,b];
    } else if(typeof ref.reps==="number"){ reps=[ref.reps,ref.reps]; }
    const weight = (ref.poids!=null?ref.poids:ref.weight!=null?ref.weight:null);
    const mid = Math.round((reps[0]+reps[1])/2);
    const sets = [];
    for(let i=0;i<setsN;i++) sets.push({reps:mid,weight,done:false,rpe:null});
    exos.push({ exoId:exo.id, targetSets:setsN, targetReps:reps, note:null, sets });
  });
  return { id:uid(), date:todayISO(), source:"imported", startedAt:null, completedAt:null,
    name: prog.nom||prog.name||null, exos, warnings };
}

function getOrCreateDraft(){
  // une séance démarrée reste active même si minuit passe pendant l'entraînement
  if(S.draft && (S.draft.date===todayISO() || S.draft.startedAt)) return S.draft;
  if(S.importedProgram && S.importedProgram.length){
    S.draft = buildSessionFromImported(S.importedProgram[0]);
  } else {
    S.draft = generateEngineSession();
  }
  save();
  return S.draft;
}

// typeId : type de séance voulu ; sans typeId on garde le type actuel et on varie les exercices
function regenerateDraft(typeId){
  const prev = S.draft;
  const avoid = !typeId && prev ? new Set(prev.exos.map(e=>e.exoId)) : null;
  S.draft = generateEngineSession(typeId || (prev&&prev.type) || "auto", avoid);
  save();
  return S.draft;
}

// ---------- export / import IA externe ----------
function buildExportPrompt(){
  const eq = S.equipment;
  const ownedList = EQUIP_TYPES.filter(e=>e.always||eq.owned[e.id]).map(e=>{
    if(e.loadable && (eq.weights[e.id]||[]).length) return `${e.n} (${eq.weights[e.id].join(", ")} ${e.unit})`;
    return e.n;
  });
  const emphasisLines = Object.entries(S.goals.emphasis).filter(([,v])=>v!=="normal")
    .map(([m,v])=>`${MUSCLE_MAP[m]?.n||m} : ${v==="prioriser"?"à prioriser":"à éviter/limiter"}`);
  const excluded = S.prefs.excluded.map(id=>EXO_MAP[id]?.n).filter(Boolean);
  const included = S.prefs.included.map(id=>EXO_MAP[id]?.n).filter(Boolean);
  const recent = S.sessions.slice(-8).map(s=>{
    const lines = s.exos.map(ex=>{
      const def = EXO_MAP[ex.exoId]; if(!def) return null;
      const done = ex.sets.filter(st=>st.done);
      if(!done.length) return null;
      const detail = done.map(st=>`${st.reps||"?"}x${st.weight!=null?st.weight+"kg":"pdc"}`).join(", ");
      return `  - ${def.n} : ${detail}`;
    }).filter(Boolean).join("\n");
    return `${fmtDate(s.date)}${s.durationSec?" ("+Math.round(s.durationSec/60)+" min)":""}\n${lines}`;
  }).join("\n");

  return `Voici mon profil d'entraînement (app Forge). Peux-tu me proposer un programme de musculation adapté ?

MATÉRIEL DISPONIBLE :
${ownedList.map(x=>"- "+x).join("\n")||"- (aucun renseigné)"}

OBJECTIF PRINCIPAL : ${S.goals.overall}
FRÉQUENCE VISÉE : ${S.goals.daysPerWeek} séances / semaine
${emphasisLines.length? "GROUPES MUSCULAIRES CIBLÉS :\n"+emphasisLines.map(x=>"- "+x).join("\n") : ""}
${excluded.length? "EXERCICES EXCLUS (blessure, préférence) :\n"+excluded.map(x=>"- "+x).join("\n") : ""}
${included.length? "EXERCICES À PRIVILÉGIER :\n"+included.map(x=>"- "+x).join("\n") : ""}

HISTORIQUE RÉCENT :
${recent||"(aucune séance enregistrée pour l'instant)"}

RÉPONSE ATTENDUE : réponds UNIQUEMENT avec un fichier JSON respectant exactement ce format (les noms d'exercices doivent être en français, proches de la terminologie usuelle) :
{
  "sessions": [
    { "nom": "Séance 1", "exercices": [
      { "nom": "Squat barre", "series": 4, "reps": "6-8", "poids": 60 },
      { "nom": "Développé couché haltères", "series": 3, "reps": "8-12" }
    ] }
  ]
}
Le champ "poids" est facultatif (Forge peut le calculer automatiquement). Propose entre 2 et 4 séances.`;
}

function importProgramJSON(text){
  let data;
  try{ data = JSON.parse(text); }catch(e){ return { ok:false, error:"Le fichier n'est pas un JSON valide." }; }
  const sessions = data.sessions || (Array.isArray(data)?data:null);
  if(!sessions || !Array.isArray(sessions) || !sessions.length){
    return { ok:false, error:"Format inattendu : aucune clé \"sessions\" trouvée." };
  }
  const warnings = [];
  sessions.forEach(s=>{
    const built = buildSessionFromImported(s);
    if(built.warnings) warnings.push(...built.warnings);
  });
  S.importedProgram = sessions;
  S.settings.todayTab = "proposal"; // le programme importé s'affiche dans « Proposée »
  if(S.draft && S.draft.date===todayISO() && !S.draft.startedAt){
    S.draft = buildSessionFromImported(S.importedProgram[0]);
  }
  save();
  return { ok:true, count:sessions.length, warnings };
}

// « Compléter avec l'app » : ajoute des exercices à une séance composée à la main,
// en visant les muscles et les mouvements que la séance ne couvre pas encore.
function suggestComplement(existingIds, n){
  const have = existingIds.map(id=>EXO_MAP[id]).filter(Boolean);
  const coveredMuscles = new Set(have.map(e=>e.muscles[0]));
  const coveredPatterns = new Set(have.map(e=>e.pattern));
  const pool = availableExos().filter(e=>!existingIds.includes(e.id));
  const jitter = {}; pool.forEach(e=>jitter[e.id]=Math.random()*1.2);
  const out = [];
  while(out.length<n && pool.length){
    let best=null, bestScore=-Infinity;
    pool.forEach(e=>{
      if(out.includes(e)) return;
      const sc = scoreExo(e) + jitter[e.id] - (coveredMuscles.has(e.muscles[0])?5:0) - (coveredPatterns.has(e.pattern)?2:0);
      if(sc>bestScore){ bestScore=sc; best=e; }
    });
    if(!best) break;
    out.push(best);
    coveredMuscles.add(best.muscles[0]); coveredPatterns.add(best.pattern);
  }
  return out;
}
