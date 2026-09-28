// ================= GAMIFICATION : médailles à paliers, niveau, célébration =================
const TIERS = [
  null,
  { n:"Bronze",  pts:10 },
  { n:"Argent",  pts:25 },
  { n:"Or",      pts:50 },
  { n:"Platine", pts:100 },
];

function masteredExosCount(){
  const counts = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{
    if(ex.sets.some(st=>st.done)) counts[ex.exoId]=(counts[ex.exoId]||0)+1;
  }));
  return Object.values(counts).filter(c=>c>=8).length;
}
const countSessions = pred => ()=>S.sessions.filter(pred).length;
// --- valeurs des trophées ajoutés en v2.0 ---
function doneSetsOf(pred){ let n = 0; S.sessions.forEach(s=>s.exos.forEach(ex=>{ const d = EXO_MAP[ex.exoId]; if(d && pred(d)) ex.sets.forEach(st=>{ if(st.done) n += st.reps||0; }); })); return n; }
const BW_EQUIP = new Set(["bodyweight","bench","mat","pullup_bar"]);
function holdMinutes(){ return doneSetsOf(d=>isTimed(d))/60; }
function bodyweightReps(){ return doneSetsOf(d=>!isTimed(d) && d.equip.every(q=>BW_EQUIP.has(q))); }
function legDays(){ return S.sessions.filter(s=>s.exos.reduce((t,ex)=>{ const d = EXO_MAP[ex.exoId]; return t + (d && regionOf(d)==="legs" ? ex.sets.filter(x=>x.done).length : 0); },0)>=3).length; }
function comebacks(){
  const days = Array.from(new Set(S.sessions.map(s=>s.date))).sort();
  let n = 0; for(let i=1;i<days.length;i++) if(daysBetween(days[i-1], days[i])>=14) n++;
  return n;
}

// ---- valeurs des nouvelles familles (v1.3) ----
function spanDays(){
  const f = firstSessionDate(); if(!f) return 0;
  const last = S.sessions.reduce((m,s)=>s.date>m?s.date:m, f);
  return daysBetween(f, last);
}
function intenseWeeks(){
  const per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=5).length;
}
// semaines où au moins 8 groupes musculaires différents ont été travaillés
function balancedWeeks(){
  const per = new Map();
  for(const s of S.sessions){
    const k = weekKey(s.date);
    let set = per.get(k); if(!set){ set = new Set(); per.set(k, set); }
    if(set.size>=11) continue;
    for(const ex of s.exos){
      const d = EXO_MAP[ex.exoId];
      if(!d || !ex.sets.some(st=>st.done)) continue;
      for(const m of d.muscles) if(m!=="cardio") set.add(m);
    }
  }
  let n = 0; per.forEach(ms=>{ if(ms.size>=8) n++; });
  return n;
}
function maxRepsOneSession(){ return S.sessions.reduce((m,s)=>Math.max(m, sessionReps(s)), 0); }
function heaviestSet(){
  let m = 0;
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(!kgType(EXO_MAP[ex.exoId])) return; ex.sets.forEach(st=>{ if(st.done && st.weight>m) m = st.weight; }); }));
  return m;
}
// Progression de force sur un exercice chargé : meilleur 1RM estimé comparé à la
// meilleure des 3 premières séances, pour un exercice pratiqué depuis au moins 90 jours
// (évite qu'une progression de débutant de quelques semaines donne le platine).
function bestStrengthRatio(){
  const hist = {};
  // les séances sont déjà enregistrées dans l'ordre chronologique
  for(const s of S.sessions) for(const ex of s.exos){
    const def = EXO_MAP[ex.exoId];
    if(!def || !kgType(def)) continue;
    let e = 0;
    for(const st of ex.sets) if(st.done && st.weight){ const v = estimated1RM(st.weight, st.reps); if(v>e) e = v; }
    if(e) (hist[ex.exoId]=hist[ex.exoId]||[]).push({ date:s.date, e });
  }
  let best = 0;
  Object.values(hist).forEach(h=>{
    if(h.length<4 || daysBetween(h[0].date, h[h.length-1].date)<90) return;
    const base = Math.max(...h.slice(0,3).map(x=>x.e));
    const top = Math.max(...h.slice(3).map(x=>x.e));
    best = Math.max(best, top/base);
  });
  return best;
}
function fullMonths(){
  const per = {};
  S.sessions.forEach(s=>{ const k=s.date.slice(0,7); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=12).length;
}
// années civiles avec au moins 48 semaines d'entraînement
function ironYears(){
  const per = {};
  S.sessions.forEach(s=>{ const y=s.date.slice(0,4); (per[y]=per[y]||new Set()).add(weekKey(s.date)); });
  return Object.values(per).filter(w=>w.size>=48).length;
}
function equipCatsTrained(){
  const c = new Set();
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ const d=EXO_MAP[ex.exoId]; if(d && ex.sets.some(st=>st.done)) c.add(exoCategory(d)); }));
  return c.size;
}

const MEDAL_CATS = [
  ["regular", "Régularité"], ["force", "Force"], ["volume", "Volume"], ["explore", "Découverte"], ["style", "Style"],
];
// t : seuils bronze / argent / or / platine. Le platine vise le très long terme :
// plusieurs années d'entraînement régulier pour la plupart des familles.
const MEDALS = [
  { id:"sessions", g:"dumbbell", c:"orange", cat:"regular", n:"Assiduité", unit:"séances terminées", one:"séance terminée",     t:[1,25,150,500],   val:()=>S.sessions.length, desc:"Le platine représente environ trois ans à trois séances par semaine." },
  { id:"streak", g:"flame", c:"red",   cat:"regular", n:"Régularité", unit:"semaines d'affilée",                          t:[2,8,26,104],     val:maxStreakWeeksEver, desc:"Semaines consécutives avec au moins une séance. Le platine demande deux ans sans interruption." },
  { id:"perfect", g:"target", c:"pink",  cat:"regular", n:"Semaine parfaite", unit:"semaines à l'objectif", one:"semaine à l'objectif", t:[1,8,40,150],   val:perfectWeeksCount, desc:"Semaines où tu atteins ton objectif de séances hebdomadaires." },
  { id:"fullmonth", g:"calendar", c:"blue",cat:"regular", n:"Mois complet", unit:"mois à 12 séances ou plus", one:"mois à 12 séances ou plus", t:[1,3,6,12], val:fullMonths },
  { id:"ironyear", g:"anvil", c:"indigo", cat:"regular", n:"Année de fer", unit:"années à 48 semaines actives", one:"année à 48 semaines actives", t:[1,2,3,5], val:ironYears, desc:"Une année civile où tu t'entraînes au moins 48 semaines sur 52. Le platine demande cinq années de ce niveau." },
  { id:"fidelity", g:"heart", c:"pink", cat:"regular", n:"Fidélité", unit:"jours entre ta première et ta dernière séance", one:"jour entre ta première et ta dernière séance", t:[30,180,365,1095], val:spanDays, desc:"L'ancienneté de ta pratique. Le platine correspond à trois ans." },
  { id:"planned", g:"calPlan", c:"teal",  cat:"regular", n:"Planificateur", unit:"séances prévues faites le bon jour", one:"séance prévue faite le bon jour", t:[1,10,50,200], val:countSessions(s=>s.planned), desc:"Séances de ton planning hebdomadaire faites le jour prévu." },

  { id:"prs", g:"bolt", c:"orange",      cat:"force", n:"Records", unit:"records personnels battus", one:"record personnel battu", t:[1,15,75,300], val:()=>S.meta.prCount||0 },
  { id:"heavy", g:"barbell", c:"indigo",    cat:"force", n:"Poids lourd", unit:"kg sur une seule série",                       t:[20,60,100,150],  val:heaviestSet, desc:"La charge la plus lourde que tu as déplacée sur une série." },
  { id:"doubled", g:"trendUp", c:"green",  cat:"force", n:"Deux fois plus fort", unit:"ta force de départ",     t:[1.2,1.5,2,2.5], base:1, val:bestStrengthRatio, fmt:v=>v?"×"+round1(v).toLocaleString("fr-CH",{minimumFractionDigits:1}):"–", desc:"Ton meilleur 1RM estimé sur un exercice chargé, comparé à tes 3 premières séances de cet exercice (pratiqué depuis au moins 90 jours). Le platine demande ×2,5." },
  { id:"mastery", g:"cap", c:"purple",  cat:"force", n:"Maîtrise", unit:"exercices maîtrisés", one:"exercice maîtrisé", t:[1,5,15,30],       val:masteredExosCount, desc:"Un exercice est maîtrisé quand tu l'as pratiqué dans 8 séances." },

  { id:"volume", g:"mountain", c:"brown",   cat:"volume", n:"Tonnage", unit:"kg soulevés au total",                         t:[1000,25000,250000,1500000], val:totalVolumeAllTime },
  { id:"bigday", g:"kettlebell", c:"red",   cat:"volume", n:"Grosse séance", unit:"kg en une seule séance",                       t:[1000,4000,8000,15000], val:bestSessionVolume },
  { id:"sets", g:"repeat", c:"blue",     cat:"volume", n:"Séries", unit:"séries validées",                              t:[50,500,3000,12000], val:totalSets },
  { id:"centurion", g:{t:"100"}, c:"red",cat:"volume", n:"Centurion", unit:"répétitions en une séance",                    t:[100,250,500,1000], val:maxRepsOneSession },
  { id:"time", g:"stopwatch", c:"teal",     cat:"volume", n:"Temps sous la barre", unit:"heures d'entraînement", one:"heure d'entraînement", t:[1,20,100,400], val:()=>totalDurationSec()/3600, fmt:v=>v<10?round1(v).toLocaleString("fr-CH"):fmtNum(v) },
  { id:"marathon", g:"hourglass", c:"yellow", cat:"volume", n:"Endurance", unit:"séances de 45 min ou plus", one:"séance de 45 min ou plus", t:[1,10,50,200], val:countSessions(s=>(s.durationSec||0)>=45*60) },

  { id:"variety", g:"compass", c:"teal",  cat:"explore", n:"Polyvalence", unit:"exercices différents",                         t:[5,20,45,80],     val:distinctExosCount },
  { id:"muscles", g:"person", c:"mint",  cat:"explore", n:"Corps complet", unit:"semaines équilibrées", one:"semaine équilibrée", t:[1,10,40,100], val:balancedWeeks, desc:"Semaines où tu travailles au moins 8 groupes musculaires différents." },
  { id:"equipcats", g:"toolbox", c:"brown",cat:"explore", n:"Touche-à-tout", unit:"types de matériel utilisés", one:"type de matériel utilisé", t:[2,3,4,6], val:equipCatsTrained, desc:"Poids du corps, haltères, barre, kettlebell, élastiques, barre de traction." },
  { id:"intense", g:"gauge", c:"orange",  cat:"regular", n:"Semaine intense", unit:"semaines à 5 séances ou plus", one:"semaine à 5 séances ou plus", t:[1,5,20,52], val:intenseWeeks, desc:"Semaines d'au moins 5 séances. Le platine en demande 52." },

  { id:"early", g:"sunrise", c:"orange",    cat:"style", n:"Lève-tôt", unit:"séances commencées avant 8 h", one:"séance commencée avant 8 h", t:[1,10,50,150], val:countSessions(s=>{ const h=startHour(s); return h!==null && h<8; }) },
  { id:"night", g:"moon", c:"indigo",    cat:"style", n:"Oiseau de nuit", unit:"séances commencées après 21 h", one:"séance commencée après 21 h", t:[1,10,50,150], val:countSessions(s=>startHour(s)>=21) },
  { id:"weekend", g:"sun", c:"yellow",  cat:"style", n:"Guerrier du week-end", unit:"séances le week-end", one:"séance le week-end", t:[1,10,50,150], val:countSessions(s=>{ const g = parseISO(s.date).getDay(); return g===0 || g===6; }) },
  { id:"lunch", g:"history", c:"green",    cat:"style", n:"Pause de midi", unit:"séances commencées entre 11 h et 14 h", one:"séance commencée entre 11 h et 14 h", t:[1,10,40,120], val:countSessions(s=>{ const h=startHour(s); return h!==null && h>=11 && h<14; }) },
  { id:"comeback", g:"restore", c:"blue", cat:"regular", n:"Retour gagnant", unit:"reprises après 2 semaines de pause", one:"reprise après 2 semaines de pause", t:[1,3,6,12], val:comebacks, desc:"Chaque fois que tu reprends après au moins 14 jours sans séance. Revenir, c'est déjà gagner." },
  { id:"hold", g:"shield", c:"gray",     cat:"volume", n:"Gainage d'acier", unit:"minutes de maintien", one:"minute de maintien", t:[5,60,300,1200], val:holdMinutes, fmt:v=>v<10?round1(v).toLocaleString("fr-CH"):fmtNum(v), desc:"Temps total passé sur les exercices chronométrés (planche, chaise, suspension…). Le platine représente 20 heures." },
  { id:"bodyweight", g:"person", c:"green",cat:"volume", n:"Poids du corps", unit:"répétitions au poids du corps", one:"répétition au poids du corps", t:[500,5000,25000,100000], val:bodyweightReps },
  { id:"legs", g:"leg", c:"green",     cat:"explore", n:"Jamais sans les jambes", unit:"séances avec 3 séries de jambes ou plus", one:"séance avec 3 séries de jambes ou plus", t:[1,20,100,300], val:legDays },
  { id:"architect", g:"ruler", c:"purple",cat:"explore", n:"Architecte", unit:"séances enregistrées", one:"séance enregistrée", t:[1,3,6,10], val:()=>S.templates.length, desc:"Construis ta bibliothèque de séances et place-les dans ta semaine." },
  { id:"custom", g:"pencil", c:"orange",   cat:"style", n:"Sur mesure", unit:"séances composées par toi", one:"séance composée par toi", t:[1,10,50,200], val:countSessions(s=>s.source==="custom") },

  // ---- trophées secrets (v2.4) : cachés jusqu'à leur découverte, un seul palier ----
  { id:"s_newyear",  secret:true, cat:"secret", g:"sparkles", c:"purple", n:"Bonne résolution", hint:"Une date que tout le monde connaît.", unit:"séance le 1er janvier", t:[1], val:countSessions(s=>s.date.slice(5)==="01-01"), desc:"Une séance le 1er janvier : l'année commence bien." },
  { id:"s_birthday", secret:true, cat:"secret", g:"gift", c:"pink", n:"Joyeux anniversaire", hint:"Reviens le même jour, un an plus tard.", unit:"séance le jour anniversaire de ta première", t:[1], val:()=>{ const f = firstSessionDate(); return f ? S.sessions.filter(s=>s.date.slice(5)===f.slice(5) && s.date.slice(0,4)>f.slice(0,4)).length : 0; }, desc:"Une séance le jour anniversaire de ta toute première séance." },
  { id:"s_friday13", secret:true, cat:"secret", g:{t:"13"}, c:"gray", n:"Même pas peur", hint:"Certains jours portent malheur… pas à toi.", unit:"séance un vendredi 13", t:[1], val:countSessions(s=>{ const d = parseISO(s.date); return d.getDay()===5 && d.getDate()===13; }), desc:"Une séance un vendredi 13." },
  { id:"s_sharp",    secret:true, cat:"secret", g:{t:"60'"}, c:"teal", n:"Pile à l'heure", hint:"Ni une minute de plus, ni une de moins.", unit:"séance d'une heure pile", t:[1], val:countSessions(s=>Math.abs((s.durationSec||0)-3600)<=30), desc:"Une séance d'exactement une heure, à 30 secondes près." },
  { id:"s_phoenix",  secret:true, cat:"secret", g:"phoenix", c:"orange", n:"Phénix", hint:"Revenir de loin, c'est une victoire.", unit:"reprise après deux mois de pause", t:[1], val:()=>{ const d = Array.from(new Set(S.sessions.map(s=>s.date))).sort(); let n = 0; for(let i=1;i<d.length;i++) if(daysBetween(d[i-1], d[i])>=60) n++; return n; }, desc:"Tu as repris après au moins 60 jours sans séance. Le plus dur, c'est de revenir : c'est fait." },
  { id:"s_week7",    secret:true, cat:"secret", g:{t:"7/7"}, c:"blue", n:"Semainier", hint:"Chaque jour a son charme.", unit:"jours de la semaine différents", t:[7], val:()=>new Set(S.sessions.map(s=>parseISO(s.date).getDay())).size, desc:"Tu t'es entraîné·e au moins une fois chaque jour de la semaine, du lundi au dimanche." },
  { id:"s_seasons",  secret:true, cat:"secret", g:"leaf", c:"green", n:"Quatre saisons", hint:"Printemps, été, automne, hiver.", unit:"saisons dans une même année", t:[4], val:()=>{ const y = {}; S.sessions.forEach(s=>{ const m = +s.date.slice(5,7); (y[s.date.slice(0,4)] = y[s.date.slice(0,4)] || new Set()).add(Math.floor((m%12)/3)); }); return Math.max(0, ...Object.values(y).map(x=>x.size)); }, desc:"Des séances à chaque saison d'une même année civile." },
  { id:"s_tripr",    secret:true, cat:"secret", g:{t:"×3"}, c:"red", n:"Journée record", hint:"Certains jours, tout s'aligne.", unit:"records dans une même séance", t:[3], val:()=>S.sessions.reduce((m,s)=>Math.max(m, sessionPRCount(s)), 0), desc:"Trois records personnels battus dans une seule séance." },
  { id:"s_writer",   secret:true, cat:"secret", g:"pencil", c:"indigo", n:"Carnet de bord", hint:"Les mots comptent aussi.", unit:"séances annotées", t:[10], val:countSessions(s=>!!s.note), desc:"Dix séances accompagnées d'une note : ton carnet d'entraînement prend forme." },
  { id:"s_visionary",secret:true, cat:"secret", g:"target", c:"red", n:"Visionnaire", hint:"Se fixer un cap… et l'atteindre.", unit:"objectifs atteints", t:[3], val:()=>S.targets.filter(t=>t.doneAt).length, desc:"Trois objectifs chiffrés atteints." },
];
const MEDAL_MAP = {}; MEDALS.forEach(m=>MEDAL_MAP[m.id]=m);

function medalTier(m){ return (S.medals[m.id]||{}).t||0; }
function medalVal(m){ return memo("mv:"+m.id, m.val); }
function medalProgress(m){
  const v = medalVal(m), t = medalTier(m);
  const next = t<m.t.length ? m.t[t] : null, prev = t>0 ? m.t[t-1] : (m.base||0);
  return { v, t, next, pct: next==null ? 1 : Math.max(0,Math.min(1,(v-prev)/(next-prev))) };
}
function medalUnit(m, v){ return v<=1 && m.one ? m.one : m.unit; }
function fmtMedalVal(m, v){
  if(m.fmt) return m.fmt(v);
  return fmtNum(Math.floor(v));
}

function checkMedals(silent){
  const ups = [];
  const now = new Date().toISOString();
  MEDALS.forEach(m=>{
    const v = medalVal(m);
    const reached = m.t.filter(th=>v>=th).length;
    const cur = S.medals[m.id] || { t:0, d:{} };
    if(reached>cur.t){
      for(let k=cur.t+1;k<=reached;k++){ cur.d[k] = now; if(!silent) ups.push({ m, tier:k }); }
      cur.t = reached;
      S.medals[m.id] = cur;
    }
  });
  save();
  return ups;
}
function tierCounts(){
  const c = [0,0,0,0,0];
  MEDALS.forEach(m=>{ if(!m.secret) for(let k=1;k<=medalTier(m);k++) c[k]++; });
  return c;
}
function tierLabel(m, k){ return m.secret ? "Secret" : TIERS[k].n; }
const SECRETS = MEDALS.filter(m=>m.secret);

// ---------- rendu des médailles (v2.4) ----------
// Médaille en SVG : couronne de métal (bronze, argent, or, platine ; irisé pour les
// secrets), biseau éclairé à l'inverse pour le relief, émail coloré propre à chaque
// trophée, icône gravée, reflet brillant et éclat animé pour l'or et le platine.
// La forme dépend de la famille : rond (régularité), écu (force), hexagone (volume),
// octogone (découverte), rosace (style), pierre taillée (secrets).
function polyPath(n, r1, r2, rot){
  const pts = [];
  for(let i=0;i<n*(r2?2:1);i++){ const r = r2 && i%2 ? r2 : r1, a = (rot||0) + i*Math.PI*2/(n*(r2?2:1)); pts.push((50+r*Math.sin(a)).toFixed(1)+" "+(50-r*Math.cos(a)).toFixed(1)); }
  return "M"+pts.join("L")+"Z";
}
const MEDAL_SHAPES = {
  regular: "M50 4a46 46 0 1 1 0 92a46 46 0 1 1 0-92Z",
  force: "M50 3 89 15.5v30C89 71 71 87.5 50 97 29 87.5 11 71 11 45.5v-30Z",
  volume: "M50 3 91 26.5v47L50 97 9 73.5v-47Z",
  explore: polyPath(8, 48, 0, Math.PI/8),
  style: polyPath(12, 48, 43.2, 0),
  secret: "M28 6h44l23 30-45 60L5 36Z",
};
const MEDAL_METALS = {
  0: ["#F4F5F7","#C4C8CF","#8E949D"],
  1: ["#FFDDB8","#C98242","#6B3812"],
  2: ["#FFFFFF","#CED4DB","#6C7581"],
  3: ["#FFF7C8","#E9B524","#7F5000"],
  4: ["#F3FEFF","#A8DFEC","#2C6A80"],
};
function hexMix(a, b, t){
  const p = h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const x = p(a), y = p(b);
  return "#"+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,"0")).join("");
}
function ensureMedalDefs(){
  if(document.getElementById("medal-defs")) return;
  const stops = (arr)=>arr.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join("");
  const metal = (id, [l,m,d], rev)=>`<linearGradient id="${id}" x1="${rev?1:0}" y1="${rev?1:0}" x2="${rev?0:1}" y2="${rev?0:1}">${stops([[0,l],[.32,m],[.55,d],[.78,m],[1,l]])}</linearGradient>`;
  const iris = (id, rev)=>`<linearGradient id="${id}" x1="${rev?1:0}" y1="${rev?1:0}" x2="${rev?0:1}" y2="${rev?0:1}">${stops([[0,"#FFE0F7"],[.25,"#B7CCFF"],[.5,"#6C4DDB"],[.72,"#5FE3D2"],[1,"#FFEBB0"]])}</linearGradient>`;
  let d = "";
  Object.keys(MEDAL_METALS).forEach(k=>{ d += metal("mA-"+k, MEDAL_METALS[k]) + metal("mB-"+k, MEDAL_METALS[k], true); });
  d += iris("mA-s") + iris("mB-s", true);
  const faces = Object.assign({ locked:"#9AA0A8" }, IOS_COL);
  Object.keys(faces).forEach(k=>{ const c = faces[k]; d += `<radialGradient id="mF-${k}" cx=".34" cy=".28" r=".9">${stops([[0,hexMix(c,"#ffffff",.42)],[.5,c],[1,hexMix(c,"#000000",.38)]])}</radialGradient>`; });
  d += `<linearGradient id="mG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".55" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  d += `<linearGradient id="mS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  d += `<radialGradient id="mR"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  Object.keys(MEDAL_SHAPES).forEach(k=>{ const P = MEDAL_SHAPES[k];
    d += `<clipPath id="mC-${k}"><path d="${P}" transform="matrix(.78 0 0 .78 11 11)"/></clipPath><clipPath id="mO-${k}"><path d="${P}"/></clipPath>`; });
  const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sv.id = "medal-defs"; sv.setAttribute("width","0"); sv.setAttribute("height","0"); sv.setAttribute("aria-hidden","true");
  sv.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  sv.innerHTML = `<defs>${d}</defs>`;
  document.body.appendChild(sv);
}
function medalGlyph(m, locked){
  if(locked && m.secret) return GLYPHS.lock;
  const g = m.g;
  if(g && typeof g==="object") return `<text x="12" y="16.2" text-anchor="middle" font-size="${g.t.length>2?8.6:10.5}" font-weight="800" font-family="-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif" letter-spacing="-.3" fill="#fff">${esc(g.t)}</text>`;
  return GLYPHS[g] || GLYPHS.medal;
}
function medalSVG(m, tier, big){
  ensureMedalDefs();
  const shape = m.secret ? "secret" : (MEDAL_SHAPES[m.cat] ? m.cat : "regular"), P = MEDAL_SHAPES[shape];
  const metal = !tier ? 0 : m.secret ? "s" : tier, face = tier ? (m.c||"orange") : "locked";
  const sc = k=>`matrix(${k} 0 0 ${k} ${(50-50*k).toFixed(2)} ${(50-50*k).toFixed(2)})`;
  const glyph = medalGlyph(m, !tier), dark = glyph.replace(/#fff/g, "#000");
  const gy = shape==="force" ? -2.5 : shape==="secret" ? -5 : 0;
  const shine = tier>=3 || (m.secret && tier);
  return `<svg class="medal-svg" viewBox="0 0 100 100" aria-hidden="true">
    <path d="${P}" fill="url(#mA-${metal})"/>
    <path d="${P}" transform="${sc(.89)}" fill="url(#mB-${metal})"/>
    <path d="${P}" transform="${sc(.78)}" fill="url(#mF-${face})"/>
    <path d="${P}" transform="${sc(.78)}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.8"/>
    <g transform="translate(32 ${32+gy}) scale(1.5)"><g transform="translate(0 .8)" opacity=".32">${dark}</g><g opacity="${tier?1:.8}">${glyph}</g></g>
    <g clip-path="url(#mC-${shape})"><ellipse cx="40" cy="18" rx="48" ry="30" fill="url(#mG)"/></g>
    ${shine ? `<g clip-path="url(#mO-${shape})"><g transform="rotate(22 50 50)"><rect class="m-shine" x="-70" y="-20" width="34" height="140" fill="url(#mS)"/></g></g>` : ""}
    ${big ? `<circle class="m-glare" cx="30" cy="24" r="42" fill="url(#mR)" clip-path="url(#mO-${shape})"/>` : ""}
    <path d="${P}" transform="${sc(.985)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1"/>
  </svg>`;
}
function medalHTML(m, tier, size){
  return `<div class="medal t${tier} ${m.secret?"secret":""} ${size||""}">${medalSVG(m, tier, size==="big")}</div>`;
}
function pipsHTML(tier){
  return `<div class="pips">${[1,2,3,4].map(k=>`<span class="pip ${k<=tier?"t"+k:""}"></span>`).join("")}</div>`;
}

function medalCardHTML(m, i){
  const p = medalProgress(m);
  if(m.secret) return `<button class="medal-card secret-card ${p.t?"found":""} stagger" style="--i:${i}" data-a="showMedal" data-id="${m.id}">
    ${medalHTML(m, p.t)}
    <div class="mc-name">${p.t ? esc(m.n) : "???"}</div>
    <div class="mc-done">${p.t ? "Découvert" : "Secret"}</div>
  </button>`;
  return `<button class="medal-card stagger" style="--i:${i}" data-a="showMedal" data-id="${m.id}">
    ${medalHTML(m, p.t)}
    <div class="mc-name">${esc(m.n)}</div>
    ${pipsHTML(p.t)}
    ${p.next!=null ? `<div class="mc-bar"><span style="width:${Math.round(p.pct*100)}%"></span></div>` : `<div class="mc-done">Complet</div>`}
  </button>`;
}

function showMedalModal(id){
  const m = MEDAL_MAP[id], p = medalProgress(m), st = S.medals[m.id]||{d:{}};
  if(m.secret){
    openModal(`<div class="medal-modal">
      ${medalHTML(m, p.t, "big")}
      <div class="mm-name">${p.t ? esc(m.n) : "Trophée secret"}</div>
      <div class="mm-tier">${p.t ? `Découvert le ${fmtDate(localISO(new Date(st.d[1]||Date.now())))}` : "Pas encore découvert"}</div>
      <div class="mm-desc">${esc(p.t ? m.desc : "Indice : "+m.hint)}</div>
      <button class="btn secondary" style="margin-top:16px" data-a="closesheet">Fermer</button>
    </div>`);
    bindMedalTilt();
    return;
  }
  const rows = [1,2,3,4].map(k=>{
    const got = p.t>=k;
    return `<div class="tier-row ${got?"got":""}">
      <span class="pip t${k}"></span>
      <span class="tr-name">${TIERS[k].n}</span>
      <span class="tr-th">${fmtMedalVal(m, m.t[k-1])} ${esc(medalUnit(m, m.t[k-1]))}</span>
      <span class="tr-date">${got && st.d[k] ? fmtDate(localISO(new Date(st.d[k]))) : got?ii("check"):""}</span>
    </div>`;
  }).join("");
  openModal(`<div class="medal-modal">
    ${medalHTML(m, p.t, "big")}
    <div class="mm-name">${esc(m.n)}</div>
    <div class="mm-tier">${p.t ? "Palier "+TIERS[p.t].n.toLowerCase() : "Pas encore débloquée"}</div>
    <div class="mm-desc">${esc(m.desc || ("Nombre de "+m.unit+"."))}</div>
    ${p.next!=null ? `<div class="mm-prog"><div class="mc-bar big"><span style="width:${Math.round(p.pct*100)}%"></span></div>
      <div class="mm-prog-txt">${fmtMedalVal(m,p.v)} / ${fmtMedalVal(m,p.next)} ${esc(medalUnit(m,p.next))} pour le palier ${TIERS[p.t+1].n.toLowerCase()}</div></div>` : `<div class="mm-prog-txt">Palier platine atteint : bravo !</div>`}
    <div class="tier-list">${rows}</div>
    <button class="btn secondary" style="margin-top:16px" data-a="closesheet">Fermer</button>
  </div>`);
  bindMedalTilt();
}
// la grande médaille se penche sous le doigt, avec un reflet qui suit
function bindMedalTilt(){
  const el = qs(".medal-modal .medal.big"); if(!el) return;
  const glare = qs(".m-glare", el);
  const move = e=>{
    const r = el.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e;
    const x = Math.max(-1, Math.min(1, (pt.clientX-r.left)/r.width*2-1)), y = Math.max(-1, Math.min(1, (pt.clientY-r.top)/r.height*2-1));
    el.classList.add("tilting");
    el.style.transform = `perspective(520px) rotateY(${(x*22).toFixed(1)}deg) rotateX(${(-y*22).toFixed(1)}deg) scale(1.04)`;
    if(glare){ glare.setAttribute("cx", (50+x*38).toFixed(1)); glare.setAttribute("cy", (50+y*38).toFixed(1)); }
  };
  const leave = ()=>{ el.classList.remove("tilting"); el.style.transform = ""; if(glare){ glare.setAttribute("cx","30"); glare.setAttribute("cy","24"); } };
  el.addEventListener("pointermove", move); el.addEventListener("pointerleave", leave); el.addEventListener("pointerup", leave);
  el.addEventListener("touchmove", e=>{ e.preventDefault(); move(e); }, { passive:false }); el.addEventListener("touchend", leave);
}

// ---------- confettis (canvas, sans dépendance) ----------
function confettiBurst(x, y, count){
  if(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  const dpr = window.devicePixelRatio||1;
  cv.width = innerWidth*dpr; cv.height = innerHeight*dpr;
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d"); ctx.scale(dpr,dpr);
  const css = getComputedStyle(document.documentElement);
  const cols = [css.getPropertyValue("--tint"), css.getPropertyValue("--ember2"), css.getPropertyValue("--green"), "#D4A017", "#6FB7C9"].map(c=>c.trim()).filter(Boolean);
  x = x==null ? innerWidth/2 : x; y = y==null ? innerHeight*0.35 : y;
  const parts = [];
  for(let i=0;i<(count||90);i++){
    const a = Math.random()*Math.PI*2, v = 4+Math.random()*7;
    parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-4, r:Math.random()*Math.PI, vr:(Math.random()-.5)*.35,
      w:5+Math.random()*5, h:8+Math.random()*6, c:cols[i%cols.length] });
  }
  const t0 = performance.now();
  (function frame(t){
    const el = t-t0;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    parts.forEach(p=>{
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1-el/1800);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)));
      ctx.restore();
    });
    if(el<1800) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// ---------- fin de séance ----------
function showCelebration(session, ups, xpBefore, xpAfter, hits){
  const vol = Math.round(sessionVolume(session));
  const sets = sessionSetCount(session);
  const prs = sessionPRCount(session);
  const reps = sessionReps(session);
  const before = levelInfo(xpBefore), after = levelInfo(xpAfter);
  const levelUp = after.level>before.level;
  const medalsHTML = ups.length ? `<div class="cel-medals">${ups.map((u,i)=>`<div class="cel-medal" style="--i:${i}">${medalHTML(u.m,u.tier)}<div class="cm-t">${esc(u.m.n)}</div><div class="cm-tier">${tierLabel(u.m, u.tier)}</div></div>`).join("")}</div>` : "";
  openModal(`<div class="cel">
    <div class="celebrate-ring">${icon("check")}</div>
    <div class="cel-title">Séance terminée !</div>
    <div class="cel-stats">
      <div><div class="n">${fmtDuration(session.durationSec||0)}</div><div class="l">durée</div></div>
      <div><div class="n" data-count="${sets}">${sets}</div><div class="l">série${sets>=2?"s":""}</div></div>
      ${vol ? `<div><div class="n" data-count="${vol}" data-unit="kg">${fmtNum(vol)} kg</div><div class="l">soulevés</div></div>`
            : `<div><div class="n" data-count="${reps}">${reps}</div><div class="l">répétitions</div></div>`}
    </div>
    ${prs?`<div class="cel-pr">${ii("bolt")} ${prs} record${prs>1?"s":""} battu${prs>1?"s":""}</div>`:""}
    ${(hits||[]).map((t,i)=>`<div class="cel-target" style="--i:${i}">${ii("target")} Objectif atteint : ${esc(EXO_MAP[t.exoId].n)}, ${fmtTarget(t.kind, t.value)}</div>`).join("")}
    <div class="cel-xp">
      <div class="cel-xp-hd"><span>${levelUp?`Niveau ${after.level} atteint !`:`Niveau ${after.level}`}</span><span class="xpg">+${xpAfter-xpBefore} XP</span></div>
      <div class="xpbar"><span id="celXp" style="width:${Math.round((levelUp?0:before.pct)*100)}%"></span></div>
      <div class="cel-xp-sub">${esc(after.title)}</div>
    </div>
    ${medalsHTML}
    <button class="cel-note-btn" data-a="celNote" data-id="${esc(session.id)}">${icon("edit")} Ajouter une note</button>
    ${typeof lastDoneForSave!=="undefined" && lastDoneForSave ? `<div class="cel-save">
      <div class="cs-t">Garder cette séance ?</div>
      <div class="cs-s">Enregistre-la pour la refaire ou la placer dans ta semaine.</div>
      <button class="btn secondary" data-a="saveDoneSession">${icon("bookmark")} Enregistrer cette séance</button>
    </div>` : ""}
    <button class="btn" style="margin-top:14px" data-a="closesheet">Continuer</button>
  </div>`);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const bar = qs("#celXp"); if(bar) bar.style.width = Math.round(after.pct*100)+"%";
    animateCounts(qs(".cel"));
  }));
  setTimeout(()=>confettiBurst(null, innerHeight*0.3, ups.length||levelUp||(hits&&hits.length) ? 150 : 90), 150);
  setTimeout(()=>sfx(ups.length||levelUp||(hits&&hits.length) ? "medal" : "exo"), 200);
}

Object.assign(ACT, {
  showMedal(d){ showMedalModal(d.id); },
  // la note reste repliée : un appui l'ouvre, pour ne pas alourdir l'écran de fin
  celNote(d, el){
    const t = document.createElement("textarea");
    t.className = "note-in pop-in"; t.rows = 2; t.maxLength = 280; t.dataset.c = "saveNote"; t.dataset.id = d.id;
    t.placeholder = "Sensations, douleur, contexte…"; t.setAttribute("aria-label", "Note sur la séance");
    el.replaceWith(t); t.focus();
  },
});
