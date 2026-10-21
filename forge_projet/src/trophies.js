// ================= GAMIFICATION : médailles à paliers, niveau, célébration =================
const TIERS = [
  null,
  { n:"Bronze",  pts:10 },
  { n:"Argent",  pts:25 },
  { n:"Or",      pts:50 },
  { n:"Diamant", pts:100 },
];

// valeurs calculées à partir des résumés de séance (sessionSummary, core.js)
function sumOf(k){ let n = 0; for(const s of S.sessions) n += sessionSummary(s)[k]; return n; }
function masteredExosCount(){
  const counts = {};
  S.sessions.forEach(s=>sessionSummary(s).exos.forEach(id=>{ counts[id]=(counts[id]||0)+1; }));
  return Object.values(counts).filter(c=>c>=8).length;
}
const countSessions = pred => ()=>S.sessions.filter(pred).length;
// --- valeurs des trophées ajoutés en v2.0 ---
function holdMinutes(){ return sumOf("holdSec")/60; }
function bodyweightReps(){ return sumOf("bwReps"); }
function legDays(){ return S.sessions.filter(s=>sessionSummary(s).legSets>=3).length; }
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
    for(const id of sessionSummary(s).exos){
      const d = EXO_MAP[id];
      if(!d) continue;
      for(const m of d.muscles) if(m!=="cardio") set.add(m);
    }
  }
  let n = 0; per.forEach(ms=>{ if(ms.size>=8) n++; });
  return n;
}
function maxRepsOneSession(){ return S.sessions.reduce((m,s)=>Math.max(m, sessionReps(s)), 0); }
function heaviestSet(){ return S.sessions.reduce((m,s)=>Math.max(m, sessionSummary(s).maxKg), 0); }
// Progression de force sur un exercice chargé : meilleur 1RM estimé comparé à la
// meilleure des 3 premières séances, pour un exercice pratiqué depuis au moins 90 jours
// (évite qu'une progression de débutant de quelques semaines donne le diamant).
function bestStrengthRatio(){
  const hist = {};
  // les séances sont déjà enregistrées dans l'ordre chronologique
  for(const s of S.sessions) for(const [id, e] of sessionSummary(s).e1) (hist[id]=hist[id]||[]).push({ date:s.date, e });
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
  S.sessions.forEach(s=>sessionSummary(s).exos.forEach(id=>{ const d = EXO_MAP[id]; if(d) c.add(exoCategory(d)); }));
  return c.size;
}

const MEDAL_CATS = [
  ["regular", "Régularité"], ["force", "Force"], ["volume", "Volume"], ["explore", "Découverte"], ["style", "Style"],
];
// t : seuils bronze / argent / or / diamant. Le diamant vise le très long terme :
// plusieurs années d'entraînement régulier pour la plupart des familles.
const MEDALS = [
  { id:"sessions", g:"dumbbell", c:"orange", cat:"regular", n:"Assiduité", unit:"séances terminées", one:"séance terminée",     t:[1,25,150,500],   val:()=>S.sessions.length },
  { id:"streak", g:"flame", c:"red",   cat:"regular", n:"Régularité", unit:"semaines d'affilée",                          t:[2,8,26,104],     val:maxStreakWeeksEver, desc:"Semaines consécutives avec au moins une séance. Une semaine sans séance par mois est pardonnée." },
  { id:"perfect", g:"target", c:"pink",  cat:"regular", n:"Semaine parfaite", unit:"semaines à l'objectif", one:"semaine à l'objectif", t:[1,8,40,150],   val:perfectWeeksCount },
  { id:"challenges", g:"flag", c:"orange", cat:"regular", n:"Défis relevés", unit:"défis réussis", one:"défi réussi", t:[1,5,15,40], val:()=>challengesDone() },
  { id:"fullmonth", g:"calendar", c:"blue",cat:"regular", n:"Mois complet", unit:"mois à 12 séances ou plus", one:"mois à 12 séances ou plus", t:[1,3,6,12], val:fullMonths },
  { id:"ironyear", g:"anvil", c:"indigo", cat:"regular", n:"Année de fer", unit:"années à 48 semaines actives", one:"année à 48 semaines actives", t:[1,2,3,5], val:ironYears },
  { id:"fidelity", g:"heart", c:"pink", cat:"regular", n:"Fidélité", unit:"jours entre ta première et ta dernière séance", one:"jour entre ta première et ta dernière séance", t:[30,180,365,1095], val:spanDays },
  { id:"planned", g:"calPlan", c:"teal",  cat:"regular", n:"Planificateur", unit:"séances prévues faites le bon jour", one:"séance prévue faite le bon jour", t:[1,10,50,200], val:countSessions(s=>s.planned) },

  { id:"prs", g:"bolt", c:"orange",      cat:"force", n:"Records", unit:"records personnels battus", one:"record personnel battu", t:[1,15,75,300], val:()=>S.meta.prCount||0 },
  { id:"heavy", g:"barbell", c:"indigo",    cat:"force", n:"Poids lourd", unit:"kg sur une seule série",                       t:[20,60,100,150],  val:heaviestSet },
  { id:"doubled", g:"trendUp", c:"green",  cat:"force", n:"Force doublée", unit:"ta force de départ",     t:[1.2,1.5,2,2.5], base:1, val:bestStrengthRatio, fmt:v=>v?"×"+round1(v).toLocaleString("fr-FR",{minimumFractionDigits:1}):"–", desc:"Meilleur 1RM estimé d'un exercice chargé, comparé à tes 3 premières séances de cet exercice (pratiqué depuis 90 jours ou plus)." },
  { id:"mastery", g:"cap", c:"purple",  cat:"force", n:"Maîtrise", unit:"exercices maîtrisés", one:"exercice maîtrisé", t:[1,5,15,30],       val:masteredExosCount, desc:"Un exercice est maîtrisé après 8 séances." },

  { id:"volume", g:"mountain", c:"brown",   cat:"volume", n:"Tonnage", unit:"kg soulevés au total",                         t:[1000,25000,250000,1500000], val:totalVolumeAllTime },
  { id:"bigday", g:"kettlebell", c:"red",   cat:"volume", n:"Grosse séance", unit:"kg en une seule séance",                       t:[1000,4000,8000,15000], val:bestSessionVolume },
  { id:"sets", g:"repeat", c:"blue",     cat:"volume", n:"Séries", unit:"séries validées",                              t:[50,500,3000,12000], val:totalSets },
  { id:"centurion", g:{t:"100"}, c:"red",cat:"volume", n:"Centurion", unit:"répétitions en une séance",                    t:[100,250,500,1000], val:maxRepsOneSession },
  { id:"time", g:"stopwatch", c:"teal",     cat:"volume", n:"Temps sous la barre", unit:"heures d'entraînement", one:"heure d'entraînement", t:[1,20,100,400], val:()=>totalDurationSec()/3600, fmt:v=>v<10?round1(v).toLocaleString("fr-FR"):fmtNum(v) },
  { id:"marathon", g:"hourglass", c:"yellow", cat:"volume", n:"Endurance", unit:"séances de 45 min ou plus", one:"séance de 45 min ou plus", t:[1,10,50,200], val:countSessions(s=>(s.durationSec||0)>=45*60) },

  { id:"variety", g:"compass", c:"teal",  cat:"explore", n:"Polyvalence", unit:"exercices différents",                         t:[5,20,45,80],     val:distinctExosCount },
  { id:"muscles", g:"person", c:"mint",  cat:"explore", n:"Corps complet", unit:"semaines équilibrées", one:"semaine équilibrée", t:[1,10,40,100], val:balancedWeeks, desc:"Au moins 8 groupes musculaires dans la semaine." },
  { id:"equipcats", g:"toolbox", c:"brown",cat:"explore", n:"Touche-à-tout", unit:"types de matériel utilisés", one:"type de matériel utilisé", t:[2,3,4,6], val:equipCatsTrained, desc:"Poids du corps, haltères, barre, kettlebell, élastiques, barre de traction." },
  { id:"intense", g:"gauge", c:"orange",  cat:"regular", n:"Semaine intense", unit:"semaines à 5 séances ou plus", one:"semaine à 5 séances ou plus", t:[1,5,20,52], val:intenseWeeks },

  { id:"early", g:"sunrise", c:"orange",    cat:"style", n:"Lève-tôt", unit:"séances commencées avant 8 h", one:"séance commencée avant 8 h", t:[1,10,50,150], val:countSessions(s=>{ const h=startHour(s); return h!==null && h<8; }) },
  { id:"night", g:"moon", c:"indigo",    cat:"style", n:"Oiseau de nuit", unit:"séances commencées après 21 h", one:"séance commencée après 21 h", t:[1,10,50,150], val:countSessions(s=>startHour(s)>=21) },
  { id:"weekend", g:"sun", c:"yellow",  cat:"style", n:"Guerrier du week-end", unit:"séances le week-end", one:"séance le week-end", t:[1,10,50,150], val:countSessions(s=>{ const g = parseISO(s.date).getDay(); return g===0 || g===6; }) },
  { id:"lunch", g:"history", c:"green",    cat:"style", n:"Pause de midi", unit:"séances commencées entre 11 h et 14 h", one:"séance commencée entre 11 h et 14 h", t:[1,10,40,120], val:countSessions(s=>{ const h=startHour(s); return h!==null && h>=11 && h<14; }) },
  { id:"comeback", g:"restore", c:"blue", cat:"regular", n:"Retour gagnant", unit:"reprises après 2 semaines de pause", one:"reprise après 2 semaines de pause", t:[1,3,6,12], val:comebacks },
  { id:"hold", g:"shield", c:"gray",     cat:"volume", n:"Gainage d'acier", unit:"minutes de maintien", one:"minute de maintien", t:[5,60,300,1200], val:holdMinutes, fmt:v=>v<10?round1(v).toLocaleString("fr-FR"):fmtNum(v), desc:"Exercices chronométrés : planche, chaise, suspension…" },
  { id:"bodyweight", g:"person", c:"green",cat:"volume", n:"Poids du corps", unit:"répétitions au poids du corps", one:"répétition au poids du corps", t:[500,5000,25000,100000], val:bodyweightReps },
  { id:"legs", g:"leg", c:"green",     cat:"explore", n:"Jamais sans les jambes", unit:"séances avec 3 séries de jambes ou plus", one:"séance avec 3 séries de jambes ou plus", t:[1,20,100,300], val:legDays },
  { id:"architect", g:"ruler", c:"purple",cat:"explore", n:"Architecte", unit:"séances dans Mes séances", one:"séance dans Mes séances", t:[1,3,6,10], val:()=>S.templates.length },
  { id:"custom", g:"pencil", c:"orange",   cat:"style", n:"Sur mesure", unit:"séances composées par toi", one:"séance composée par toi", t:[1,10,50,200], val:countSessions(s=>s.source==="custom") },

  // ---- trophées secrets (v2.4) : cachés jusqu'à leur découverte, un seul palier ----
  { id:"s_newyear",  secret:true, cat:"secret", g:"sparkles", c:"purple", n:"Bonne résolution", hint:"Une date que tout le monde connaît.", unit:"séance le 1er janvier", t:[1], val:countSessions(s=>s.date.slice(5)==="01-01") },
  { id:"s_birthday", secret:true, cat:"secret", g:"gift", c:"pink", n:"Joyeux anniversaire", hint:"Reviens le même jour, un an plus tard.", unit:"séance le jour anniversaire de ta première", t:[1], val:()=>{ const f = firstSessionDate(); return f ? S.sessions.filter(s=>s.date.slice(5)===f.slice(5) && s.date.slice(0,4)>f.slice(0,4)).length : 0; } },
  { id:"s_friday13", secret:true, cat:"secret", g:{t:"13"}, c:"gray", n:"Même pas peur", hint:"Certains jours portent malheur… pas à toi.", unit:"séance un vendredi 13", t:[1], val:countSessions(s=>{ const d = parseISO(s.date); return d.getDay()===5 && d.getDate()===13; }) },
  { id:"s_sharp",    secret:true, cat:"secret", g:{t:"60'"}, c:"teal", n:"Pile à l'heure", hint:"Ni une minute de plus, ni une de moins.", unit:"séance d'une heure pile", t:[1], val:countSessions(s=>Math.abs((s.durationSec||0)-3600)<=30) },
  { id:"s_phoenix",  secret:true, cat:"secret", g:"phoenix", c:"orange", n:"Phénix", hint:"Revenir de loin, c'est une victoire.", unit:"reprise après deux mois de pause", t:[1], val:()=>{ const d = Array.from(new Set(S.sessions.map(s=>s.date))).sort(); let n = 0; for(let i=1;i<d.length;i++) if(daysBetween(d[i-1], d[i])>=60) n++; return n; } },
  { id:"s_week7",    secret:true, cat:"secret", g:{t:"7/7"}, c:"blue", n:"Semainier", hint:"Chaque jour a son charme.", unit:"jours de la semaine différents", t:[7], val:()=>new Set(S.sessions.map(s=>parseISO(s.date).getDay())).size },
  { id:"s_seasons",  secret:true, cat:"secret", g:"leaf", c:"green", n:"Quatre saisons", hint:"Printemps, été, automne, hiver.", unit:"saisons dans une même année", t:[4], val:()=>{ const y = {}; S.sessions.forEach(s=>{ const m = +s.date.slice(5,7); (y[s.date.slice(0,4)] = y[s.date.slice(0,4)] || new Set()).add(Math.floor((m%12)/3)); }); return Math.max(0, ...Object.values(y).map(x=>x.size)); } },
  { id:"s_tripr",    secret:true, cat:"secret", g:{t:"×3"}, c:"red", n:"Journée record", hint:"Certains jours, tout s'aligne.", unit:"records dans une même séance", t:[3], val:()=>S.sessions.reduce((m,s)=>Math.max(m, sessionPRCount(s)), 0) },
  { id:"s_writer",   secret:true, cat:"secret", g:"pencil", c:"indigo", n:"Carnet de bord", hint:"Les mots comptent aussi.", unit:"séances annotées", t:[10], val:countSessions(s=>!!s.note) },
  { id:"s_visionary",secret:true, cat:"secret", g:"target", c:"red", n:"Visionnaire", hint:"Se fixer un cap… et l'atteindre.", unit:"objectifs atteints", t:[3], val:()=>S.targets.filter(t=>t.doneAt).length },
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
  let moved = false;
  MEDALS.forEach(m=>{
    const v = medalVal(m);
    const reached = m.t.filter(th=>v>=th).length;
    const cur = S.medals[m.id] || { t:0, d:{} };
    if(reached>cur.t){
      for(let k=cur.t+1;k<=reached;k++){ cur.d[k] = now; if(!silent) ups.push({ m, tier:k }); }
      cur.t = reached;
      S.medals[m.id] = cur; moved = true;
    }
  });
  // save() invalide tous les calculs mis en cache : seulement si un palier a changé
  if(moved) save({ derived:true });
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
// Médaille en SVG : couronne de métal (bronze, argent, or, diamant ; irisé pour les
// secrets), biseau éclairé à l'inverse pour le relief, émail coloré propre à chaque
// trophée, icône gravée, reflet brillant et éclat animé pour l'or et le diamant.
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
// le palier donne le métal et l'émail (mêmes teintes que les trophées 3D, trophy3d.js) ;
// la gravure prend la couleur claire du métal
const MEDAL_METALS = {
  0: ["#F1F2F4","#BCC1C7","#8A9097"],
  1: ["#F7D3B4","#C98A5C","#6A3A1C"],
  2: ["#FFFFFF","#D5DAE0","#78818C"],
  3: ["#FFF3C4","#EBBB52","#8A5A0E"],
  4: ["#FFFFFF","#DDE6EE","#8C9AA8"],
};
const MEDAL_ENAMEL = { 0:"#A5AAB1", 1:"#4A2416", 2:"#2B3139", 3:"#1D1813", 4:"#0F1D31", s:"#2A1A50" };
const MEDAL_ENGRAVE = { 0:"#EEF0F2", 1:"#F2C39E", 2:"#F4F6F9", 3:"#F8D987", 4:"#F4F8FC", s:"#EFE6FF" };
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
  Object.keys(MEDAL_METALS).forEach(k=>{ if(k!=="4") d += metal("mA-"+k, MEDAL_METALS[k]) + metal("mB-"+k, MEDAL_METALS[k], true); });
  d += iris("mA-s") + iris("mB-s", true);
  // diamant : cristal prismatique (reflets arc-en-ciel très clairs)
  const prism = (id, rev)=>`<linearGradient id="${id}" x1="${rev?1:0}" y1="${rev?1:0}" x2="${rev?0:1}" y2="${rev?0:1}">${stops([[0,"#FFFFFF"],[.18,"#C9F4FF"],[.34,"#8FB6FF"],[.5,"#F2E3FF"],[.64,"#7FE6FF"],[.8,"#FFD9F1"],[1,"#FFFFFF"]])}</linearGradient>`;
  d += prism("mA-4") + prism("mB-4", true);
  Object.keys(MEDAL_ENAMEL).forEach(k=>{ const c = MEDAL_ENAMEL[k]; d += `<radialGradient id="mF-${k}" cx=".34" cy=".28" r=".9">${stops([[0,hexMix(c,"#ffffff",k==="0"?.3:.16)],[.55,c],[1,hexMix(c,"#000000",.35)]])}</radialGradient>`; });
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
  const metal = !tier ? 0 : m.secret ? "s" : tier, face = metal;
  const sc = k=>`matrix(${k} 0 0 ${k} ${(50-50*k).toFixed(2)} ${(50-50*k).toFixed(2)})`;
  const raw = medalGlyph(m, !tier), glyph = raw.replace(/#fff/g, MEDAL_ENGRAVE[metal]), dark = raw.replace(/#fff/g, "#000");
  const gy = shape==="force" ? -2.5 : shape==="secret" ? -5 : 0;
  const shine = tier>=3 || (m.secret && tier);
  return `<svg class="medal-svg" viewBox="0 0 100 100" aria-hidden="true">
    <path d="${P}" fill="url(#mA-${metal})"/>
    <path d="${P}" transform="${sc(.89)}" fill="url(#mB-${metal})"/>
    <path d="${P}" transform="${sc(.78)}" fill="url(#mF-${face})"/>
    <path d="${P}" transform="${sc(.78)}" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.8"/>
    <g transform="translate(32 ${32+gy}) scale(1.5)"><g transform="translate(0 .8)" opacity=".32">${dark}</g><g opacity="${tier?1:.9}">${glyph}</g></g>
    <g clip-path="url(#mC-${shape})"><ellipse cx="40" cy="18" rx="48" ry="30" fill="url(#mG)"/></g>
    ${shine ? `<g clip-path="url(#mO-${shape})"><g transform="rotate(22 50 50)"><rect class="m-shine" x="-70" y="-20" width="34" height="140" fill="url(#mS)"/></g></g>` : ""}
    ${tier===4 && !m.secret ? `<g class="m-sparks" fill="#fff">${[[20,26,5.5,0],[80,34,4.2,.7],[70,80,5,1.4],[27,74,3.4,2.1]].map(([x,y,r,dl])=>`<path class="m-spark" style="animation-delay:${dl}s;transform-origin:${x}px ${y}px" d="M${x} ${y-r}Q${x} ${y} ${x+r} ${y}Q${x} ${y} ${x} ${y+r}Q${x} ${y} ${x-r} ${y}Q${x} ${y} ${x} ${y-r}Z"/>`).join("")}</g>` : ""}
    ${big ? `<circle class="m-glare" cx="30" cy="24" r="42" fill="url(#mR)" clip-path="url(#mO-${shape})"/>` : ""}
    <path d="${P}" transform="${sc(.985)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.1"/>
  </svg>`;
}
function medalHTML(m, tier, size, flat){
  // data-mid / data-tier : la vignette 3D remplace le dessin SVG dès qu'elle est prête (trophy3d.js) ;
  // flat : dessin seul (carte Trophées du Profil : ouvrir l'onglet ne charge pas le moteur 3D)
  return `<div class="medal t${tier} ${m.secret?"secret":""} ${size||""}" ${m.id && !flat?`data-mid="${m.id}" data-tier="${tier}"`:""}>${medalSVG(m, tier, size==="big")}</div>`;
}
function pipsHTML(tier){
  return `<div class="pips">${[1,2,3,4].map(k=>`<span class="pip ${k<=tier?"t"+k:""}"></span>`).join("")}</div>`;
}

function medalCardHTML(m, i){
  const p = medalProgress(m);
  if(m.secret) return `<button class="medal-card secret-card ${p.t?"found":""} stagger" style="--i:${i}" data-a="showMedal" data-id="${m.id}">
    ${medalHTML(m, p.t)}
    <div class="mc-name">${p.t ? esc(m.n) : "???"}</div>
  </button>`;
  return `<button class="medal-card stagger" style="--i:${i}" data-a="showMedal" data-id="${m.id}">
    ${medalHTML(m, p.t)}
    <div class="mc-name">${esc(m.n)}</div>
    ${pipsHTML(p.t)}
    ${p.next!=null ? `<div class="mc-bar"><span style="width:${Math.round(p.pct*100)}%"></span></div>` : ""}
  </button>`;
}
// textes de la fiche (2D et 3D) : rien qui répète ce que montrent la barre et la liste des paliers
function medalDay(st, k){ return st.d && st.d[k] ? fmtDate(localISO(new Date(st.d[k]))) : ""; }
function secretRule(m){ return `${fmtMedalVal(m, m.t[0])} ${medalUnit(m, m.t[0])}`; }
function medalProgTxt(m, p){ return `${fmtMedalVal(m,p.v)} / ${fmtMedalVal(m,p.next)} · ${TIERS[p.t+1].n}`; }
// panneau teinté par le palier affiché (s : secret découvert)
function medalTint(m, tier){ return m.secret && tier ? "s" : tier; }

function showMedalModal2D(id){
  const m = MEDAL_MAP[id], p = medalProgress(m), st = S.medals[m.id]||{d:{}};
  if(m.secret){
    openModal(`<div class="medal-modal">
      ${medalHTML(m, p.t, "big")}
      <div class="mm-name">${p.t ? esc(m.n) : "Trophée secret"}</div>
      ${p.t ? `<div class="mm-tier">${medalDay(st, 1)}</div>` : ""}
      <div class="mm-desc">${esc(p.t ? secretRule(m) : "Indice : "+m.hint)}</div>
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
      <span class="tr-date">${got ? medalDay(st, k) || ii("check") : ii("lock")}</span>
    </div>`;
  }).join("");
  openModal(`<div class="medal-modal">
    ${medalHTML(m, p.t, "big")}
    <div class="mm-name">${esc(m.n)}</div>
    ${p.t ? `<div class="mm-tier">${TIERS[p.t].n}</div>` : ""}
    ${m.desc ? `<div class="mm-desc">${esc(m.desc)}</div>` : ""}
    ${p.next!=null ? `<div class="mm-prog"><div class="mc-bar big"><span style="width:${Math.round(p.pct*100)}%"></span></div>
      <div class="mm-prog-txt">${medalProgTxt(m, p)}</div></div>` : ""}
    <div class="tier-list">${rows}</div>
    <button class="btn secondary" style="margin-top:16px" data-a="closesheet">Fermer</button>
  </div>`);
  bindMedalTilt();
}
// la grande médaille se penche sous le doigt, avec un reflet qui suit
let tiltLeave = null;
document.addEventListener("ascen:suspend", ()=>{ if(tiltLeave) tiltLeave(); });
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
  el.addEventListener("touchcancel", leave); el.addEventListener("pointercancel", leave);
  tiltLeave = leave;
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
// Progrès concrets de la séance : pour chaque exercice, comparaison avec la séance d'il y a
// environ un mois (la plus récente datant d'au moins 3 semaines, sinon la toute première si elle
// a 2 semaines ou plus). Charge max, puis répétitions à cette charge ; secondes tenues ; répétitions.
// Les deux plus fortes hausses sont affichées.
function sessionProgressLines(session){
  const best = (ex, def)=>{ const d = ex.sets.filter(s=>s.done && (s.reps||0)>0); if(!d.length) return null;
    if(kgType(def)){ const w = Math.max(...d.map(s=>s.weight||0)); return { w, r:Math.max(...d.filter(s=>(s.weight||0)===w).map(s=>s.reps||0)) }; }
    return { w:0, r:Math.max(...d.map(s=>s.reps||0)) }; };
  const lines = [];
  session.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return;
    const now = best(ex, def); if(!now) return;
    const past = S.sessions.filter(s=>s!==session && s.id!==session.id && s.date<session.date && s.exos.some(e=>e.exoId===ex.exoId && e.sets.some(x=>x.done)));
    if(!past.length) return;
    const old = past.filter(s=>daysBetween(s.date, session.date)>=21).pop() || (daysBetween(past[0].date, session.date)>=14 ? past[0] : null);
    if(!old) return;
    const then = best(old.exos.find(e=>e.exoId===ex.exoId), def); if(!then) return;
    const since = `depuis le ${fmtDate(old.date)}`;
    if(kgType(def) && now.w>then.w+0.01) lines.push({ g:(now.w-then.w)/Math.max(1,then.w), t:`${def.n} : ${fmtDec(now.w)} kg, +${fmtDec(now.w-then.w)} kg ${since}` });
    else if(kgType(def) && Math.abs(now.w-then.w)<0.01 && now.r>then.r) lines.push({ g:(now.r-then.r)/Math.max(1,then.r)*.6, t:`${def.n} : ${fmtNum(now.r)} rép. à ${fmtDec(now.w)} kg, +${fmtNum(now.r-then.r)} ${since}` });
    else if(!kgType(def) && now.r>then.r){ const u = isTimed(def) ? " s" : " rép.";
      lines.push({ g:(now.r-then.r)/Math.max(1,then.r), t:`${def.n} : ${fmtNum(now.r)}${u}, +${fmtDec(now.r-then.r)}${u} ${since}` }); }
  });
  return lines.sort((a,b)=>b.g-a.g).slice(0,2).map(l=>l.t);
}
// Ce qui a progressé pendant la séance, au-delà des records exacts :
// - force estimée record (1RM estimé, répétitions en réserve comprises) sur un exercice déjà fait 2 fois ;
// - muscles qui passent le seuil de 4 séries cette semaine grâce à cette séance ;
// - la forme du jour : un jour sans (sans dramatiser, ça ne change pas la progression) ou une grande forme ;
// - semaine allégée : la séance a fait exactement ce qu'il fallait.
function sessionWins(session){
  const out = [], { exos } = strengthData();
  const recs = [];
  session.exos.forEach(ex=>{
    const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def) || ex.deload) return;
    const p = sessionPerf(def, ex, session.date); if(!p) return;
    const prior = (exos[ex.exoId]||[]).filter(x=>x.date<session.date);
    if(prior.length<2) return;
    const max = Math.max(...prior.map(x=>x.v)), g = Math.round((p.v/max-1)*100);
    if(g>=1) recs.push({ g, t:`${def.n} : force estimée record (+${g} %)` });
  });
  recs.sort((a,b)=>b.g-a.g).slice(0,2).forEach(r=>out.push({ ic:"bolt", t:r.t }));
  // séries de la semaine avant / après cette séance (même comptage que la carte Stimulus)
  try{
    const add = {};
    session.exos.forEach(ex=>{ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return;
      const n = ex.sets.reduce((t,st)=>t+(st.done ? (st.effort===1 ? .5 : 1) : 0), 0); if(!n) return;
      def.muscles.forEach((m,k)=>{ add[m] = (add[m]||0) + (k===0 ? n : n/2); }); });
    const inWeek = daysBetween(session.date, todayISO())<7;
    muscleVolume(7).forEach(r=>{ const before = r.sets-(inWeek ? (add[r.id]||0) : 0);
      if(inWeek && add[r.id] && before<STIM.min && r.sets>=STIM.min) out.push({ ic:"target", t:`${r.n} : zone de progrès atteinte cette semaine (${fmtDec(r.sets)} séries)` }); });
  }catch(e){}
  if(session.exos.some(ex=>ex.deload)) out.push({ ic:"leaf", t:"Semaine allégée : séance faite, c'est exactement ce qu'il fallait." });
  else {
    const f = sessionForm(session);
    if(f && f.ratio<.92) out.push({ ic:"heart", soft:true, t:`Un peu en dessous de ta forme habituelle (−${Math.round((1-f.ratio)*100)} %) : un jour sans, ça arrive. Ça ne change pas ta progression.` });
    else if(f && f.ratio>=1.05 && !recs.length) out.push({ ic:"trendUp", t:`En grande forme : +${Math.round((f.ratio-1)*100)} % par rapport à tes dernières séances` });
  }
  return out;
}
// Refonte (fin de séance) : un écran plein, clair, sans liste d'exercices. En haut « Bien joué » et le résumé
// en une ligne ; la carte Tonnage (valeur, écart avec la même séance la dernière fois, courbe des 8 dernières) ;
// la carte « Nouveau record » seulement s'il y en a un ; l'ascension ; « Terminé ». Les autres progrès
// (records de force, zones atteintes, séries battues…) restent à un toucher.
function celLinesHTML(session){
  const wins = sessionWins(session), L = [];
  // une ligne = un titre court (l'exercice ou le fait) + le détail dessous, plus petit
  const row = (ic, t, cls)=>{ const i = t.indexOf(" : "), h = i>0 ? t.slice(0, i) : t, d = i>0 ? t.slice(i+3) : "";
    return `<div class="cp-row ${cls||""}" data-t="${esc(t)}"><span class="cp-ic">${ii(ic)}</span><span class="cp-txt"><span class="cp-t">${esc(h)}</span>${d ? `<span class="cp-s">${esc(d.charAt(0).toUpperCase()+d.slice(1))}</span>` : ""}</span></div>`; };
  wins.filter(w=>!w.soft).forEach(w=>L.push(row(w.ic, w.t, w.ic==="bolt" ? "win rec" : "win")));
  if(session.beats) L.push(row("trendUp", session.beats>1 ? `${session.beats} séries mieux que la dernière fois` : "1 série mieux que la dernière fois", "beat"));
  sessionProgressLines(session).forEach(t=>L.push(row("chart", t, "prog")));
  wins.filter(w=>w.soft).forEach(w=>L.push(row(w.ic, w.t, "soft")));
  if(!L.length) return "";
  // les deux premiers sont visibles, le reste à un toucher (dans la même carte)
  const more = L.length - 2;
  return `<section class="cel-progs"><h3 class="cel-sh">Progrès de la séance</h3><div class="cp-card">${L.slice(0,2).join("")}${more>0 ? `<div class="cel-rest" hidden>${L.slice(2).join("")}</div><button class="cp-more" data-a="celMore">Voir ${more>1 ? `les ${more} autres` : "l'autre"}</button>` : ""}</div></section>`;
}
// séances comparables : même séance enregistrée, sinon même nom, sinon toutes ; tonnage (ou répétitions sans charge)
function celSeries(session){
  const vol = sessionVolume(session)>0, title = sessionTitle(session), generic = /^(Ma séance|Séance)$/.test(title);
  const same = s=>session.tplId ? s.tplId===session.tplId : !generic ? sessionTitle(s)===title : true;
  const pts = S.sessions.filter(s=>s.id===session.id || (s.date<=session.date && same(s) && (vol ? sessionVolume(s)>0 : sessionReps(s)>0)))
    .slice(-8).map(s=>({ id:s.id, date:s.date, v:vol ? Math.round(sessionVolume(s)) : sessionReps(s) }));
  return { vol, title, generic, pts };
}
function celTonnageHTML(session){
  const { vol, title, generic, pts } = celSeries(session); if(!pts.length) return "";
  const cur = pts[pts.length-1], prev = pts.length>1 ? pts[pts.length-2] : null;
  const unit = vol ? "kg" : "reps", val = vol ? fmtNum(cur.v) : String(cur.v);
  const d = prev && prev.v ? Math.round((cur.v/prev.v-1)*100) : null;
  const chip = d==null ? "" : `<div class="ct-delta"><span class="ct-chip ${d>0 ? "up" : d<0 ? "down" : ""}">${d>0 ? "+" : d<0 ? "−" : ""}${Math.abs(d)} %</span><span>par rapport au ${fmtDate(prev.date)}</span></div>`;
  let chart = "";
  if(pts.length>1){
    const W = 326, H = 96, P = 5, lo = Math.min(...pts.map(p=>p.v)), hi = Math.max(...pts.map(p=>p.v)), span = Math.max(1, hi-lo);
    const xy = pts.map((p,i)=>[P+i*(W-2*P)/(pts.length-1), H-10-(p.v-lo)/span*(H-22)]);
    const path = "M"+xy.map(q=>q[0].toFixed(1)+" "+q[1].toFixed(1)).join("L"), last = xy[xy.length-1];
    chart = `<svg class="ct-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${vol ? "Tonnage" : "Répétitions"} des ${pts.length} dernières séances : de ${fmtNum(pts[0].v)} ${unit} le ${fmtDate(pts[0].date)} à ${fmtNum(cur.v)} ${unit} aujourd'hui">
      <path class="ct-line" d="${path}" pathLength="1"/><circle class="ct-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5"/></svg>
      <div class="ct-x"><span>${fmtDate(pts[0].date)}</span><span>Aujourd'hui</span></div>`;
  }
  const scope = pts.length>1 ? (generic ? `${pts.length} dernières séances` : `${pts.length} dernières « ${esc(title)} »`) : "";
  return `<section class="cel-card cel-ton">
    <div class="ct-hd"><h2>${vol ? "Tonnage" : "Répétitions"}</h2>${scope ? `<span>${scope}</span>` : ""}</div>
    <div class="ct-v"><b class="num" data-count="${cur.v}">${val}</b><span>${unit}</span></div>
    ${chip || (pts.length<2 ? `<div class="ct-delta"><span>${generic ? "Ta courbe commence ici" : `Première « ${esc(title)} » : ta courbe commence ici`}</span></div>` : "")}
    ${chart}
  </section>`;
}
// le meilleur record de la séance (le plus grand saut), ou rien
function celRecord(session){
  let best = null;
  session.exos.forEach(ex=>{ const def = EXO_MAP[ex.exoId]; if(!def || isStretch(def)) return;
    const prs = ex.sets.filter(st=>st.done && st.pr); if(!prs.length) return;
    const sc = st=>kgType(def) && st.weight ? estimated1RM(st.weight, st.reps||0) : (st.reps||0);
    const top = prs.reduce((a,b)=>sc(b)>sc(a) ? b : a);
    let prev = null;
    S.sessions.forEach(x=>{ if(x.id===session.id || x.date>session.date) return; const e = x.exos.find(e=>e.exoId===ex.exoId); if(!e) return;
      e.sets.forEach(st=>{ if(st.done && st.reps>0 && (!prev || sc(st)>sc(prev))) prev = st; }); });
    const gain = prev && sc(prev) ? sc(top)/sc(prev) : 9;
    if(!best || gain>best.gain) best = { def, top, prev, gain };
  });
  return best;
}
function celSetTxt(def, st){ return isTimed(def) ? `${st.reps} s` : kgType(def) && st.weight ? `${st.reps} × ${fmtDec(st.weight)} kg` : `${st.reps} rép.`; }
function celRecordHTML(session){
  const r = celRecord(session); if(!r) return "";
  return `<section class="cel-card cel-rec"><span class="cr-ic">${exoPicto(r.def)}</span>
    <span class="cr-txt"><small>${ii("star")}Nouveau record</small><b>${esc(r.def.n)}</b><span class="num">${celSetTxt(r.def, r.top)}${r.prev ? ` · avant ${celSetTxt(r.def, r.prev)}` : ""}</span></span></section>`;
}
function showCelebration(session, ups, hits, won){
  const sets = sessionSetCount(session);
  if(typeof T3D!=="undefined") T3D.holdUntil = performance.now()+3500;   // vignettes 3D après les animations
  // l'ascension remplace l'XP : altitude gagnée, camps franchis, sommet
  const asc = typeof ascent==="function" ? ascent().log[session.id] : null, summit = asc && asc.summit, moved = !!(asc && (asc.camps.length || asc.summit || asc.started));
  const name = (S.settings.name||"").trim().split(" ")[0];
  const medalsHTML = ups.length ? `<section class="cel-progs"><h3 class="cel-sh">${ups.length>1 ? "Trophées débloqués" : "Trophée débloqué"}</h3><div class="cel-medals">${ups.map((u,i)=>`<div class="cel-medal" style="--i:${i}">${medalHTML(u.m,u.tier)}<div class="cm-t">${esc(u.m.n)}</div><div class="cm-tier">${tierLabel(u.m, u.tier)}</div></div>`).join("")}</div></section>` : "";
  openModal(`<div class="cel">
    <div class="cel-hd"><div class="cel-k">Séance terminée</div><h1 class="cel-title">Bien joué${name ? `, ${esc(name)}` : " !"}</h1>
      <div class="cel-sub">${esc(sessionTitle(session))} · ${fmtDuration(session.durationSec||0)} · ${nb(sets, "série")}</div></div>
    ${celTonnageHTML(session)}
    ${celRecordHTML(session)}
    ${(hits||[]).map((t,i)=>`<div class="cel-target" style="--i:${i}">${ii("target")} Objectif atteint : ${esc(EXO_MAP[t.exoId].n)}, ${fmtTarget(t.kind, t.value)}</div>`).join("")}
    ${(won||[]).map((c,i)=>`<div class="cel-target cel-chal" style="--i:${(hits||[]).length+i}">${ii("star")} Défi réussi : ${esc(CHAL_MAP[c.id].n)}</div>`).join("")}
    ${typeof ascCelHTML==="function" ? ascCelHTML(session.id) : ""}
    ${medalsHTML}
    ${celLinesHTML(session)}
    <button class="cel-note-btn" data-a="celNote" data-id="${esc(session.id)}">${icon("edit")} Ajouter une note</button>
    ${typeof lastDoneForSave!=="undefined" && lastDoneForSave ? `<div class="cel-save">
      <div class="cs-t">Garder cette séance ?</div>
      <div class="cs-s">Enregistre-la pour la refaire ou la placer dans ta semaine.</div>
      <button class="btn secondary" data-a="saveDoneSession">${icon("bookmark")} Ajouter à Mes séances</button>
    </div>` : ""}
    <div class="cel-ft"><button class="btn big" ${summit ? `data-a="ascCelSummit" data-id="${esc(session.id)}"` : 'data-a="closesheet"'}>${summit ? "Voir le sommet" : "Terminé"}</button></div>
  </div>`, "cel-page");
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(typeof ascCelAnimate==="function") ascCelAnimate();
    animateCounts(qs(".cel"));
    const ln = qs(".cel .ct-line"); if(ln) ln.classList.add("draw");
  }));
  if(typeof moCelebrate==="function") moCelebrate(qs(".cel-page"));
  setTimeout(()=>confettiBurst(null, innerHeight*0.3, ups.length||moved||(hits&&hits.length) ? 150 : 90), 150);
  setTimeout(()=>sfx("complete"), 200);
  if(ups.length||moved||(hits&&hits.length)) setTimeout(()=>sfx("medal"), 1900);
}

Object.assign(ACT, {
  celMore(d, el){
    const rest = el && el.previousElementSibling; if(!rest || !rest.classList.contains("cel-rest")) return;
    sfx("open");
    morphHeight(el.parentElement, ()=>{ rest.hidden = false; el.remove(); });
  },
  showMedal(d, el){ showMedalModal(d.id, el); },
  // la note reste repliée : un appui l'ouvre, pour ne pas alourdir l'écran de fin
  celNote(d, el){
    const t = document.createElement("textarea");
    t.className = "note-in pop-in"; t.rows = 2; t.maxLength = 280; t.dataset.c = "saveNote"; t.dataset.id = d.id;
    t.placeholder = "Sensations, douleur, contexte…"; t.setAttribute("aria-label", "Note sur la séance");
    el.replaceWith(t); t.focus();
  },
});
