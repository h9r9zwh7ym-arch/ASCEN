// ================= ÉTAT & STOCKAGE =================
const STORAGE_KEY = "forge.v1";
// sources de séance abrégées dans le format compact (déclarées avant le chargement)
const SRC_CODE = { engine:"e", custom:"c", imported:"i", template:"t" };
const SRC_NAME = { e:"engine", c:"custom", i:"imported", t:"template" };
// séance enregistrée (historique) : marquée pour que ses résumés puissent être gardés en cache
// (voir sessionSummary). Déclaré avant load(), qui marque l'historique au chargement.
const STORED = typeof Symbol==="function" ? Symbol("stored") : "__stored";
function markStored(s){ Object.defineProperty(s, STORED, { value:true, configurable:true }); return s; }

function defaultState(){
  return {
    v:1,
    equipment: defaultEquipment(),
    prefs: { excluded:[], included:[] },
    goals: { overall:"hypertrophie", emphasis:{}, daysPerWeek:3, sessionLength:"moyen", level:"intermediaire", exoCount:0 },
    sessions: [],
    draft: null,
    custom: { exos:[] },   // « Ma séance » : [{exoId, sets}]
    templates: [],         // modèles enregistrés : [{id, n, exos:[{exoId, sets}]}]
    importedProgram: [],
    challenges: [],         // défis [{id, start:"AAAA-MM-JJ", doneAt?, missedAt?}] (challenges.js)
    targets: [],            // objectifs chiffrés [{id, exoId, kind:"reps"|"kg"|"sec", value, start, createdAt, doneAt}]
    body: [],               // pesées facultatives [{d:"AAAA-MM-JJ", kg}]
    medals: {},            // {familleId: {t: palier atteint 0-4, d: {1: iso, 2: iso…}}}
    settings: { theme:"auto", unit:"kg", todayTab:"custom", name:"", why:"", sound:true, stretching:false, rest:"normal" }, // why : « ton pourquoi »
    meta: { createdAt: new Date().toISOString(), prCount:0 },
  };
}

let LOAD_SKIPPED = 0;   // séances illisibles écartées au chargement (signalées une fois, voir init.js)
let S = load();

// ---------- stockage compact (v2.5) ----------
// L'historique représente l'essentiel des données. Il est enregistré sous une forme
// condensée (tableaux, dates en millisecondes) : environ trois fois moins de place,
// soit plusieurs décennies d'entraînement dans les ~5 Mo de localStorage. En mémoire et
// dans les sauvegardes .json, les séances gardent leur forme lisible.
function packSession(s){
  const o = { i:s.id, d:s.date };
  if(s.source) o.o = SRC_CODE[s.source] || s.source;
  if(s.type) o.t = s.type; if(s.resolvedType && s.resolvedType!==s.type) o.r = s.resolvedType;
  if(s.name) o.n = s.name; if(s.tplId) o.p = s.tplId; if(s.planned) o.l = 1; if(s.note) o.m = s.note;
  const a = s.startedAt ? Date.parse(s.startedAt) : NaN; if(!isNaN(a)) o.a = a;
  const c = s.completedAt ? Date.parse(s.completedAt) : NaN; if(!isNaN(c)) o.c = c;
  if(s.durationSec) o.u = s.durationSec;
  o.x = (s.exos||[]).map(ex=>{
    const sets = ex.sets.filter(st=>st.done).map(st=>{
      const f = (st.pr?1:0) | ((st.effort||0)<<1);
      return f ? [st.reps||0, st.weight==null?null:st.weight, f] : st.weight!=null ? [st.reps||0, st.weight] : [st.reps||0];
    });
    return ex.targetReps ? [ex.exoId, sets, ex.targetReps] : [ex.exoId, sets];
  });
  if(s.stretches && s.stretches.length) o.s = s.stretches.map(x=>[x.exoId, x.sec||0]);
  return o;
}
function unpackSession(o){
  const s = { id:o.i, date:o.d };
  if(o.o) s.source = SRC_NAME[o.o] || o.o;
  if(o.t) s.type = o.t; if(o.r || o.t) s.resolvedType = o.r || o.t;
  if(o.n) s.name = o.n; if(o.p) s.tplId = o.p; if(o.l) s.planned = true; if(o.m) s.note = o.m;
  if(o.a) s.startedAt = new Date(o.a).toISOString(); if(o.c) s.completedAt = new Date(o.c).toISOString();
  if(o.u) s.durationSec = o.u;
  s.exos = (o.x||[]).map(([exoId, sets, targetReps])=>{
    const ex = { exoId, sets: sets.map(([reps, weight, f])=>{ const st = { reps:+reps||0, done:true }; if(weight!=null && isFinite(weight)) st.weight = +weight; if(f&1) st.pr = true; if(f>>1) st.effort = f>>1; return st; }) };
    if(targetReps) ex.targetReps = targetReps;
    return ex;
  });
  if(Array.isArray(o.s) && o.s.length) s.stretches = o.s.map(([exoId, sec])=>({ exoId, sec }));
  return s;
}
// Encodage mis en cache par séance : une séance terminée ne change presque jamais, on ne
// réencode que les nouvelles ou celles qu'on vient de modifier. Tout code qui modifie une
// séance déjà enregistrée doit appeler sessionTouched(s) (ou sessionTouched() pour toutes).
let PACK_CACHE = new WeakMap();
function sessionTouched(s){ if(s){ PACK_CACHE.delete(s); SUM_CACHE.delete(s); } else { PACK_CACHE = new WeakMap(); SUM_CACHE = new WeakMap(); } }
function packedJSON(s){
  let j = PACK_CACHE.get(s);
  if(j===undefined){ j = JSON.stringify(packSession(s)); PACK_CACHE.set(s, j); }
  return j;
}
const ZS_MARK = "\u0000zs\u0000", ZS_MARK_JSON = JSON.stringify(ZS_MARK);
function serializeState(savedAt){
  const o = Object.assign({}, S, { sessions:[], zs:ZS_MARK, fmt:2 });
  o.meta = Object.assign({}, S.meta, { savedAt });
  // l'historique (« zs », dernière clé avant fmt) est inséré tel quel, chaînes déjà encodées
  const j = JSON.stringify(o), k = j.lastIndexOf(ZS_MARK_JSON);
  return j.slice(0, k) + "[" + S.sessions.map(packedJSON).join(",") + "]" + j.slice(k + ZS_MARK_JSON.length);
}
// ---------- copie de secours IndexedDB ----------
// Chaque enregistrement est aussi copié dans IndexedDB (quota bien plus large). Si
// localStorage est plein ou vidé, l'app repart de cette copie au lancement suivant.
const IDB_NAME = "forge", IDB_STORE = "state";
function idbOpen(){
  return new Promise((ok, ko)=>{
    if(!("indexedDB" in window)) return ko(new Error("indisponible"));
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = ()=>r.result.createObjectStore(IDB_STORE);
    r.onsuccess = ()=>ok(r.result); r.onerror = ()=>ko(r.error);
  });
}
function idbPut(data, savedAt){
  return idbOpen().then(db=>new Promise((ok, ko)=>{
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ data, savedAt }, "main");
    tx.oncomplete = ()=>{ db.close(); ok(); }; tx.onerror = ()=>{ db.close(); ko(tx.error); };
  }));
}
function idbGet(){
  return idbOpen().then(db=>new Promise((ok, ko)=>{
    const r = db.transaction(IDB_STORE).objectStore(IDB_STORE).get("main");
    r.onsuccess = ()=>{ db.close(); ok(r.result||null); }; r.onerror = ()=>{ db.close(); ko(r.error); };
  }));
}
// la copie de secours est compressée (gzip natif du navigateur) : ~6 à 8 fois plus petite
// Sans Blob : WebKit lit un Blob via une URL interne « blob: », refusée pendant qu'on quitte la
// page (la copie est justement écrite à ce moment-là). Octets bruts en sortie : WebKit refuse
// aussi les Blob dans IndexedDB en navigation privée.
async function gz(str){
  if(typeof CompressionStream==="undefined") return str;
  const cs = new CompressionStream("gzip"), w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(str)).catch(()=>{}); w.close().catch(()=>{});
  return await new Response(cs.readable).arrayBuffer();
}
async function gunz(data){
  if(typeof data==="string") return data;
  const s = new Response(data).body.pipeThrough(new DecompressionStream("gzip"));
  return await new Response(s).text();
}
let idbPending = null, idbWriting = false, idbLast = 0, idbTimer = null;
function idbMirror(str, savedAt, now){
  // une seule écriture à la fois ; la dernière version gagne. Pendant une séance on enregistre
  // souvent : la copie compressée n'est refaite qu'au plus toutes les 3 s (et tout de suite
  // quand l'app passe en arrière-plan), le stockage principal, lui, est écrit à chaque fois
  if(persistBlocked) return;
  idbPending = { str, savedAt };
  const wait = idbLast + 3000 - Date.now();
  if(!now && wait>0){ if(!idbTimer) idbTimer = setTimeout(()=>{ idbTimer = null; if(idbPending) idbMirror(idbPending.str, idbPending.savedAt, true); }, wait); return; }
  clearTimeout(idbTimer); idbTimer = null; idbLast = Date.now();
  if(idbWriting) return;
  idbWriting = true;
  (async ()=>{
    while(idbPending){ const j = idbPending; idbPending = null; try{ await idbPut(await gz(j.str), j.savedAt); }catch(e){ try{ await idbPut(j.str, j.savedAt); }catch(e2){} } }
    idbWriting = false;
  })();
}
// réinitialisation : plus aucune écriture, on attend celle en cours (sinon elle rétablirait
// l'ancienne copie après l'effacement), puis on efface la base, les copies mises de côté et la copie de secours
async function wipeStorage(){
  persistBlocked = true; clearTimeout(persistTimer); persistTimer = null; clearTimeout(idbTimer); idbTimer = null; idbPending = null;
  for(let i=0; idbWriting && i<40; i++) await new Promise(r=>setTimeout(r, 50));
  await idbClear(); // d'abord la copie de secours : un autre onglet rechargé ne peut plus la reprendre
  try{ Object.keys(localStorage).filter(k=>k===STORAGE_KEY || k.startsWith(STORAGE_KEY+".")).forEach(k=>localStorage.removeItem(k)); }catch(e){}
}
function idbClear(){ return idbOpen().then(db=>new Promise(ok=>{ const tx = db.transaction(IDB_STORE, "readwrite"); tx.objectStore(IDB_STORE).clear(); tx.oncomplete = tx.onerror = ()=>{ db.close(); ok(); }; })).catch(()=>{}); }
var loadedFromLS; // var : affecté pendant load(), qui s'exécute avant cette ligne
// au lancement : si la copie IndexedDB est plus récente (localStorage plein, vidé ou
// illisible), on la reprend
function idbRecover(){
  idbGet().then(async rec=>{
    if(!rec || !rec.data) return;
    // copies non compressées (avant v2.7) et compressées
    rec = Object.assign({}, rec, { data: await gunz(rec.data) });
    // localStorage absent, ou plus ancien que la copie (écriture refusée faute de place)
    if(loadedFromLS && !(S.meta.savedAt && rec.savedAt > S.meta.savedAt)) return;
    const st = normalizeState(JSON.parse(rec.data));
    if(!st.sessions.length && S.sessions.length) return;
    S = st; save(); persistNow();
    if(typeof renderView==="function") renderView(currentTab);
    if(typeof toast==="function") toast("Données reprises depuis la copie de secours");
  }).catch(()=>{});
}
function cleanupStorage(){
  try{
    const bad = []; for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); if(k && k.startsWith(STORAGE_KEY+".illisible.")) bad.push(k); }
    bad.sort().slice(0, -1).forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}
function storageUsage(){
  let n = 0;
  try{ for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); n += (k.length + (localStorage.getItem(k)||"").length)*2; } }catch(e){}
  return n; // octets (UTF-16)
}
const STORAGE_QUOTA = 5*1024*1024;

function load(){
  let raw = null;
  try{
    raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const st = normalizeState(JSON.parse(raw));
    loadedFromLS = true;
    // des séances illisibles ont été écartées : l'original est gardé de côté avant la prochaine écriture
    if(LOAD_SKIPPED) try{ localStorage.setItem(STORAGE_KEY+".illisible."+Date.now(), raw); }catch(e){}
    return st;
  }catch(e){
    // données illisibles : on les met de côté au lieu de les écraser à la prochaine sauvegarde
    try{ if(raw) localStorage.setItem(STORAGE_KEY+".illisible."+Date.now(), raw); }catch(err){}
    return defaultState();
  }
}
// fusion avec l'état par défaut (nouveaux champs entre versions, restauration d'une sauvegarde)
function normalizeState(parsed){
  {
    const d = defaultState();
    // fusion superficielle pour tolérer l'ajout de nouveaux champs entre versions
    const merged = Object.assign({}, d, parsed);
    merged.equipment = Object.assign({}, d.equipment, parsed.equipment||{});
    merged.equipment.owned = Object.assign({}, d.equipment.owned, (parsed.equipment||{}).owned||{});
    merged.equipment.weights = Object.assign({}, d.equipment.weights, (parsed.equipment||{}).weights||{});
    merged.prefs = Object.assign({}, d.prefs, parsed.prefs||{});
    merged.goals = Object.assign({}, d.goals, parsed.goals||{});
    merged.settings = Object.assign({}, d.settings, parsed.settings||{});
    merged.meta = Object.assign({}, d.meta, parsed.meta||{});
    merged.custom = Object.assign({}, d.custom, parsed.custom||{});
    // format compact (v2.5) ; une liste « sessions » non vide (import externe) reste prioritaire
    // format compact : chaque séance est décodée à part ; une entrée abîmée est écartée (et comptée)
    // au lieu de faire échouer tout le chargement, ce qui démarrait l'app sur un historique vide
    let fromZs = false;
    if(Array.isArray(parsed.zs) && !(parsed.sessions && parsed.sessions.length)){
      fromZs = true; parsed.sessions = [];
      for(const o of parsed.zs){ try{ parsed.sessions.push(unpackSession(o)); }catch(e){ LOAD_SKIPPED++; } }
    }
    delete merged.zs; delete merged.fmt;
    // robustesse : une donnée abîmée (import externe, ancienne version, écriture interrompue) ne
    // doit jamais empêcher l'app de démarrer. Les entrées illisibles sont écartées ; l'historique
    // garde ses exercices même inconnus (renommés depuis), il n'est jamais supprimé.
    const okSet = st=>st && typeof st==="object";
    const okExo = ex=>ex && typeof ex==="object" && typeof ex.exoId==="string" && Array.isArray(ex.sets);
    const okSession = ss=>ss && typeof ss.date==="string" && /^\d{4}-\d{2}-\d{2}/.test(ss.date) && Array.isArray(ss.exos);
    const before = Array.isArray(parsed.sessions) ? parsed.sessions.length : 0;
    if(fromZs){
      // notre propre format, déjà compact : pas de recopie (le démarrage lit tout l'historique)
      parsed.sessions = parsed.sessions.filter(okSession);
      parsed.sessions.forEach(ss=>{ if(ss.exos.some(ex=>!okExo(ex) || !ex.sets.length)) ss.exos = ss.exos.filter(ex=>okExo(ex) && ex.sets.length); });
    } else {
      parsed.sessions = (Array.isArray(parsed.sessions)?parsed.sessions:[]).filter(okSession)
        .map(ss=>compactSession(Object.assign({}, ss, { date:ss.date.slice(0,10), exos:ss.exos.filter(okExo).map(ex=>Object.assign({}, ex, { sets:ex.sets.filter(okSet) })) })));
    }
    LOAD_SKIPPED += before - parsed.sessions.length;
    const known = ex=>ex && EXO_MAP[ex.exoId];
    // identifiants : ils sont insérés dans des attributs HTML (data-id). Une sauvegarde importée
    // piégée ne doit rien pouvoir y injecter : un identifiant inattendu est remplacé, un lien retiré.
    const ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/, safeId = x=>typeof x==="string" && ID_RE.test(x);
    parsed.sessions.forEach(ss=>{
      if(!safeId(ss.id)) ss.id = uid();
      if(ss.tplId!=null && !safeId(ss.tplId)) delete ss.tplId;
      ss.exos.forEach(ex=>{ if(!safeId(ex.exoId)) ex.exoId = "inconnu"; });
    });
    merged.sessions = parsed.sessions.map(markStored);
    // ordre chronologique garanti (les statistiques s'appuient dessus) ; déjà trié en général
    if(merged.sessions.some((x,i,a)=>i && a[i-1].date>x.date)) merged.sessions.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    // séances enregistrées, Ma séance, séance en cours : seulement des exercices connus
    merged.templates = (Array.isArray(parsed.templates)?parsed.templates:[]).filter(t=>t && t.id && Array.isArray(t.exos))
      .map(t=>Object.assign({}, t, { n:String(t.n||"Séance"), days:Array.isArray(t.days)?t.days.filter(x=>x>=0 && x<=6):[], exos:t.exos.filter(known) }));
    merged.custom.exos = (Array.isArray(merged.custom.exos)?merged.custom.exos:[]).filter(known);
    if(merged.draft){
      const dr = merged.draft;
      merged.draft = dr && typeof dr==="object" && Array.isArray(dr.exos) ? Object.assign({}, dr, { exos:dr.exos.filter(ex=>okExo(ex) && known(ex)).map(ex=>Object.assign({}, ex, { sets:ex.sets.filter(okSet) })) }) : null;
      if(merged.draft && !merged.draft.exos.length) merged.draft = null;
    }
    merged.medals = parsed.medals && typeof parsed.medals==="object" && !Array.isArray(parsed.medals) ? parsed.medals : {};
    merged.prefs.excluded = Array.isArray(merged.prefs.excluded) ? merged.prefs.excluded.filter(id=>EXO_MAP[id]) : [];
    merged.prefs.included = Array.isArray(merged.prefs.included) ? merged.prefs.included.filter(id=>EXO_MAP[id]) : [];
    merged.importedProgram = parsed.importedProgram||[];
    merged.challenges = (Array.isArray(parsed.challenges)?parsed.challenges:[]).filter(c=>c && typeof c.id==="string" && /^\d{4}-\d{2}-\d{2}$/.test(c.start));
    merged.targets = (Array.isArray(parsed.targets)?parsed.targets:[]).filter(t=>t && t.id && EXO_MAP[t.exoId] && ["reps","kg","sec"].includes(t.kind) && t.value>0);
    merged.body = (Array.isArray(parsed.body)?parsed.body:[]).filter(e=>e && /^\d{4}-\d{2}-\d{2}$/.test(e.d) && e.kg>=20 && e.kg<=400).sort((a,b)=>a.d<b.d?-1:1);
    // réglages : même type que la valeur par défaut ; les textes-codes (thème, niveau…) restent des
    // mots simples (ils finissent dans des classes et attributs) ; seul le prénom est libre (échappé)
    const coerce = (obj, def)=>{ for(const k in obj){ const dv = def[k], v = obj[k]; if(dv===undefined || k==="name" || k==="why") continue;
      if(typeof dv==="number"){ const n = Number(v); obj[k] = isFinite(n) ? n : dv; }
      else if(typeof dv==="boolean") obj[k] = v===true || v===false ? v : dv;
      else if(typeof dv==="string") obj[k] = typeof v==="string" && /^[\w-]{0,40}$/.test(v) ? v : dv;
      else if(dv && typeof dv==="object" && (!v || typeof v!=="object")) obj[k] = dv; } };
    coerce(merged.goals, d.goals); coerce(merged.settings, d.settings);
    merged.goals.daysPerWeek = Math.min(7, Math.max(1, Math.round(merged.goals.daysPerWeek)||3));
    merged.goals.exoCount = Math.min(12, Math.max(0, Math.round(merged.goals.exoCount)||0));
    merged.settings.name = String(merged.settings.name||"").slice(0,40);
    merged.settings.why = String(merged.settings.why||"").slice(0,120);
    merged.templates.forEach(t=>{ if(!safeId(t.id)) t.id = uid(); });
    merged.targets.forEach(t=>{ if(!safeId(t.id)) t.id = uid(); });
    merged.challenges = merged.challenges.filter(c=>safeId(c.id));
    merged.equipment.custom = (Array.isArray(merged.equipment.custom)?merged.equipment.custom:[]).filter(c=>c && typeof c==="object")
      .map(c=>Object.assign({}, c, { id:safeId(c.id) ? c.id : uid(), n:String(c.n||"Équipement").slice(0,60) }));
    if(merged.custom.tplId!=null && !safeId(merged.custom.tplId)) delete merged.custom.tplId;
    if(merged.draft){ if(!safeId(merged.draft.id)) merged.draft.id = uid(); if(merged.draft.tplId!=null && !safeId(merged.draft.tplId)) delete merged.draft.tplId; }
    delete merged.settings.todayMode; // v1.2 : remplacé par todayTab (« Ma séance » en premier)
    // v2.2 : nouveaux équipements. On garde le comportement précédent : un banc servait aussi
    // aux exercices inclinés, et quiconque faisait du squat à la barre avait des supports.
    const po = (parsed.equipment||{}).owned||{};
    if(po.bench && po.bench_incline===undefined) merged.equipment.owned.bench_incline = true;
    if(po.barbell && po.rack===undefined) merged.equipment.owned.rack = true;
    // élastiques : des niveaux de résistance 1 à 5 (et plus des « kilos »)
    // anciennes valeurs en kg (> 5) : converties par rang, du plus léger au plus fort
    let bw = (merged.equipment.weights.bands||[]).map(Number).filter(v=>v>0);
    if(bw.some(v=>v>5)){
      const kg = Array.from(new Set(bw)).sort((a,b)=>a-b);
      bw = kg.map((v,i)=>kg.length>1 ? 1+i*4/(kg.length-1) : 3);
      // séries d'élastique déjà enregistrées en kg : même correspondance (au plus proche)
      const lvl = w=>Math.round(bw[kg.reduce((bi,v,i)=>Math.abs(v-w)<Math.abs(kg[bi]-w)?i:bi, 0)]);
      merged.sessions.forEach(ss=>ss.exos.forEach(ex=>{ const d = EXO_MAP[ex.exoId];
        if(d && loadableTypeOf(d)==="bands") ex.sets.forEach(st=>{ if(st.weight>5) st.weight = lvl(st.weight); }); }));
    }
    bw = bw.filter(v=>v>=1 && v<=5);
    merged.equipment.weights.bands = bw.length ? Array.from(new Set(bw.map(Math.round))).sort((a,b)=>a-b) : [2,3,4];
    delete merged.trophies; // ancien système de trophées (v1.0-1.1), remplacé par les médailles à paliers
    return merged;
  }
}

// ---------- sauvegarde différée + cache des statistiques ----------
// save() est appelé à chaque interaction (un appui sur +/− par exemple). Réécrire tout
// l'historique (plusieurs centaines de Ko après quelques années) à chaque fois coûtait
// ~70 ms sur téléphone : on invalide le cache tout de suite et on écrit au calme,
// avec écriture forcée quand l'app passe en arrière-plan ou se ferme.
let DATA_VER = 0;
const MEMO = new Map();
function memo(key, fn){
  const hit = MEMO.get(key);
  if(hit && hit.v===DATA_VER) return hit.r;
  const r = fn();
  MEMO.set(key, { v:DATA_VER, r });
  return r;
}
let persistTimer = null, persistBlocked = false, persistFailed = false;
// Une séance terminée n'a plus besoin des champs de travail (notes, cibles de séries,
// ressenti vide, séries non faites) : on les retire pour garder le stockage léger.
function compactSession(s){
  const out = {};
  ["id","date","source","type","resolvedType","name","tplId","planned","startedAt","completedAt","durationSec","note"].forEach(k=>{ if(s[k]!=null && s[k]!==false) out[k] = s[k]; });
  out.exos = (s.exos||[]).map(ex=>({
    exoId: ex.exoId,
    targetReps: ex.targetReps,
    sets: ex.sets.filter(st=>st.done).map(st=>{
      // nombres garantis (sauvegarde restaurée, import) : un texte ferait des totaux faux
      const o = { reps: Math.max(0, +st.reps||0), done: true };
      if(st.weight!=null && st.weight!=="" && isFinite(st.weight)) o.weight = +st.weight;
      if(st.pr) o.pr = true;
      if(st.effort) o.effort = st.effort; // ressenti (répétitions en réserve) pour la progression
      return o;
    })
  })).filter(ex=>ex.sets.length);
  if(Array.isArray(s.stretches) && s.stretches.length) out.stretches = s.stretches.filter(x=>x && x.exoId).map(x=>({ exoId:x.exoId, sec:Math.max(0, Math.round(x.sec||0)) }));
  return out;
}
function save(){
  DATA_VER++;
  if(typeof prerenderStaleViews==="function") prerenderStaleViews();
  if(persistBlocked) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 400);
}
function persistNow(urgent){
  clearTimeout(persistTimer); persistTimer = null;
  if(persistBlocked) return;
  const savedAt = Date.now(), str = serializeState(savedAt);
  S.meta.savedAt = savedAt;
  idbMirror(str, savedAt, urgent===true);
  try{ localStorage.setItem(STORAGE_KEY, str); persistFailed = false; }
  catch(e){
    // localStorage plein ou refusé : la copie IndexedDB prend le relais, on prévient une fois
    if(!persistFailed && typeof toast==="function") toast("Stockage principal plein : tes données sont gardées dans la copie de secours. Pense à faire une sauvegarde.");
    persistFailed = true;
  }
}
// sortie de l'app : écriture immédiate, copie de secours comprise
function flushPersist(){ if(persistTimer) persistNow(true); else if(idbPending) idbMirror(idbPending.str, idbPending.savedAt, true); }
window.addEventListener("pagehide", flushPersist);
// l'app ouverte dans un autre onglet a enregistré : on reprend sa version (la plus récente) au
// lieu de l'écraser à la prochaine sauvegarde. Si nos propres changements partent à l'instant,
// on ne fait rien : la dernière écriture gagne, comme avant.
window.addEventListener("storage", e=>{
  if(e.key!==STORAGE_KEY || persistBlocked) return;
  // données effacées ailleurs : plus d'écriture ici, rechargement une fois la copie de secours effacée aussi
  if(e.newValue==null){ persistBlocked = true; setTimeout(()=>location.reload(), 900); return; }
  if(persistTimer) return;
  let st; try{ st = normalizeState(JSON.parse(e.newValue)); }catch(err){ return; }
  if(S.meta.savedAt && !(st.meta.savedAt > S.meta.savedAt)) return;
  S = st; DATA_VER++;
  if(typeof onExternalState==="function") onExternalState();
});
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="hidden") flushPersist(); });

// ---------- utilitaires ----------
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
function round1(x){ return Math.round(x*10)/10; }

// Dates au format AAAA-MM-JJ en heure LOCALE : toISOString() convertit en UTC et
// décale d'un jour les minuits locaux en Suisse (UTC+1/+2).
function localISO(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayISO(){ return localISO(new Date()); }
// appelées des milliers de fois par les statistiques : pas de tableau intermédiaire
function parseISO(s){
  if(s.length===10) return new Date(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10));
  const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d);
}
function addDaysISO(iso,n){ const d=parseISO(iso); d.setDate(d.getDate()+n); return localISO(d); }
// numéro de jour (UTC, donc sans décalage d'heure d'été), mis en cache : une date ne change pas
const DAYNUM = new Map();
function dayNum(iso){
  let n = DAYNUM.get(iso);
  if(n===undefined){ const d = parseISO(iso); n = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/86400000); if(DAYNUM.size>20000) DAYNUM.clear(); DAYNUM.set(iso, n); }
  return n;
}
function daysBetween(a,b){ return dayNum(b)-dayNum(a); }
// durée de repos : réglage global (Profil) appliqué à la durée conseillée de chaque exercice
const REST_SCALE = { court:.7, normal:1, long:1.35 };
function restFor(def){ return Math.max(20, Math.round((def.restSec||90)*(REST_SCALE[S.settings.rest]||1)/5)*5); }
function daysSinceLastSession(){ const s = S.sessions[S.sessions.length-1]; return s ? daysBetween(s.date, todayISO()) : null; }
// « ton pourquoi » rappelé quand on revient après quelques jours sans séance
const WHY_AFTER_DAYS = 4;
function whyReminder(){ const w = (S.settings.why||"").trim(), g = daysSinceLastSession(); return w && g!=null && g>=WHY_AFTER_DAYS && !(S.draft && S.draft.startedAt) ? w : ""; }
// une date ne change jamais de semaine : résultat mis en cache (appelé des milliers de fois
// par les statistiques et les trophées)
const WEEK_CACHE = new Map();
function weekKey(iso){
  let w = WEEK_CACHE.get(iso);
  if(w) return w;
  const d = parseISO(iso);
  d.setDate(d.getDate()-(d.getDay()+6)%7); // lundi
  w = localISO(d); WEEK_CACHE.set(iso, w);
  return w;
}
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const MOIS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
function fmtDate(iso, opt){
  const d = parseISO(iso);
  if(opt==="long") return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  if(opt==="short") return `${JOURS[d.getDay()].slice(0,3)}. ${d.getDate()} ${MOIS[d.getMonth()]}`;
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}
function fmtRelative(iso){
  const n = daysBetween(iso, todayISO());
  if(n===0) return "aujourd'hui";
  if(n===1) return "hier";
  if(n<7) return `il y a ${n} j`;
  if(n<14) return "il y a 1 sem.";
  if(n<31) return `il y a ${Math.floor(n/7)} sem.`;
  return fmtDate(iso);
}
// « 1 série », « 2 séries » (en français, 0 et 1 sont au singulier)
function nb(n, w){ return `${n} ${w}${Math.abs(n)>=2?"s":""}`; }
function fmtNum(n){ return Math.round(n).toLocaleString("fr-CH"); }
function fmtDec(n){ return round1(n).toLocaleString("fr-CH"); }
function fmtKg(kg){
  if(kg>=10000) return `${round1(kg/1000).toLocaleString("fr-CH")} t`;
  return `${fmtNum(kg)} kg`;
}

// ---------- exercices disponibles ----------
function isExcluded(id){ return S.prefs.excluded.includes(id); }
function isIncluded(id){ return S.prefs.included.includes(id); }
function availableExos(){
  return EXOS.filter(e=>hasEquip(S.equipment, e.equip) && !isExcluded(e.id));
}

// ---------- historique : agrégats ----------
function lastPerformance(exoId){ return memo("lp:"+exoId, ()=>lastPerformance_raw(exoId)); }
function lastPerformance_raw(exoId){
  for(let i=S.sessions.length-1;i>=0;i--){
    const s = S.sessions[i];
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(ex && ex.sets.some(st=>st.done)) return {session:s, exo:ex};
  }
  return null;
}
function daysSinceTrained(muscleId){ return memo("dst:"+muscleId+todayISO(), ()=>daysSinceTrained_raw(muscleId)); }
function daysSinceTrained_raw(muscleId){
  for(let i=S.sessions.length-1;i>=0;i--){
    const s = S.sessions[i];
    const trained = s.exos.some(ex=>{
      const def = EXO_MAP[ex.exoId];
      return def && def.muscles.includes(muscleId) && ex.sets.some(st=>st.done);
    });
    if(trained) return daysBetween(s.date, todayISO());
  }
  return 999;
}

// ---------- résumé d'une séance (v3.3) ----------
// Les statistiques et les trophées parcouraient chaque série de tout l'historique, une fois par
// indicateur (une quarantaine). Une séance enregistrée ne change plus : on la résume une fois
// (séries, répétitions, tonnage, records, jambes, gainage, charge max, 1RM estimés…) et le
// résumé est gardé tant que l'objet n'est pas modifié (sessionTouched). Les séances « vivantes »
// (séance en cours, édition) ne sont pas marquées et sont toujours recalculées.
let SUM_CACHE = new WeakMap();
const BW_ONLY = new Set(["bodyweight","bench","mat","pullup_bar"]);
function sessionSummary(s){
  const stored = !!s[STORED];
  let r = stored ? SUM_CACHE.get(s) : undefined;
  if(r) return r;
  r = { sets:0, reps:0, vol:0, prs:0, legSets:0, holdSec:0, bwReps:0, maxKg:0, exos:[], e1:[] };
  for(const ex of s.exos){
    const d = EXO_MAP[ex.exoId];
    let n = 0, reps = 0, vol = 0, prs = 0, mx = 0, e1 = 0;
    for(const st of ex.sets){
      if(!st.done) continue;
      n++; const rp = st.reps||0, w = st.weight||0;
      reps += rp; vol += rp*w; if(st.pr) prs++;
      if(st.weight>mx) mx = st.weight;
      if(w){ const v = estimated1RM(w, st.reps); if(v>e1) e1 = v; }
    }
    r.sets += n; r.prs += prs;
    if(!d || loadableTypeOf(d)!=="bands") r.vol += vol;     // tonnage en kg : sans les élastiques
    const timed = d && isTimed(d);
    if(!timed) r.reps += reps;                             // les exercices tenus comptent des secondes
    if(!n || !d) { if(n) r.exos.push(ex.exoId); continue; }
    r.exos.push(ex.exoId);
    if(timed) r.holdSec += reps;
    else if(d.equip.every(q=>BW_ONLY.has(q))) r.bwReps += reps;
    if(regionOf(d)==="legs") r.legSets += n;
    if(kgType(d)){ if(mx>r.maxKg) r.maxKg = mx; if(e1) r.e1.push([ex.exoId, e1]); }
  }
  if(stored) SUM_CACHE.set(s, r);
  return r;
}
function sessionVolume(s){ return sessionSummary(s).vol; }
function sessionSetCount(s){ return sessionSummary(s).sets; }
function sessionReps(s){ return sessionSummary(s).reps; }
function sessionPRCount(s){ return sessionSummary(s).prs; }
function totalVolumeAllTime(){ return memo("totalVolumeAllTime", totalVolumeAllTime_raw); }
function totalVolumeAllTime_raw(){ return S.sessions.reduce((t,s)=>t+sessionVolume(s),0); }
function totalSets(){ return memo("totalSets", totalSets_raw); }
function totalSets_raw(){ return S.sessions.reduce((t,s)=>t+sessionSetCount(s),0); }
function totalDurationSec(){ return memo("totalDurationSec", totalDurationSec_raw); }
function totalDurationSec_raw(){ return S.sessions.reduce((t,s)=>t+(s.durationSec||0),0); }
function bestSessionVolume(){ return memo("bestSessionVolume", bestSessionVolume_raw); }
function bestSessionVolume_raw(){ return S.sessions.reduce((m,s)=>Math.max(m,sessionVolume(s)),0); }
function distinctExosCount(){ return memo("distinctExosCount", distinctExosCount_raw); }
function distinctExosCount_raw(){
  const ids = new Set();
  S.sessions.forEach(s=>sessionSummary(s).exos.forEach(id=>ids.add(id)));
  return ids.size;
}
function distinctMusclesCount(){ return memo("distinctMusclesCount", distinctMusclesCount_raw); }
function distinctMusclesCount_raw(){
  const ms = new Set();
  S.sessions.forEach(s=>sessionSummary(s).exos.forEach(id=>{
    const def = EXO_MAP[id];
    if(def) def.muscles.forEach(m=>{ if(m!=="cardio") ms.add(m); });
  }));
  return ms.size;
}
// heure de début (heure locale) : l'analyse d'une date ISO complète coûte, on la garde par séance
const HOUR_CACHE = new WeakMap();
function startHour(s){
  if(!s.startedAt) return null;
  const c = HOUR_CACHE.get(s); if(c && c.a===s.startedAt) return c.h;
  const h = new Date(s.startedAt).getHours(); HOUR_CACHE.set(s, { a:s.startedAt, h }); return h;
}

function estimated1RM(weight,reps){
  if(!weight||!reps) return weight||0;
  return weight*(1+reps/30); // formule d'Epley
}
function exoPRs(exoId){ return memo("pr:"+exoId, ()=>exoPRs_raw(exoId)); }
function exoPRs_raw(exoId){
  let maxWeight=0, maxVolumeSession=0, best1rm=0, count=0;
  S.sessions.forEach(s=>{
    const ex = s.exos.find(x=>x.exoId===exoId);
    if(!ex || !ex.sets.some(st=>st.done)) return;
    count++;
    let vol=0;
    ex.sets.forEach(st=>{
      if(!st.done) return;
      vol += (st.reps||0)*(st.weight||0);
      if((st.weight||0)>maxWeight) maxWeight=st.weight;
      const e = estimated1RM(st.weight,st.reps);
      if(e>best1rm) best1rm=e;
    });
    if(vol>maxVolumeSession) maxVolumeSession=vol;
  });
  return { maxWeight, maxVolumeSession, best1rm:round1(best1rm), count };
}
function isNewPR(exoId, weight, reps){
  const pr = exoPRs(exoId);
  if(!pr.count) return false; // la toute première fois n'est pas un « record battu »
  return weight>pr.maxWeight || estimated1RM(weight,reps)>pr.best1rm+0.01;
}

// Records recalculés après la modification d'une séance passée : même règle qu'en direct
// (battre l'historique ET les séries précédentes de la séance, jamais à la 1re fois).
function recomputePRFlags(){
  const best = {}; let before = 0, after = 0;
  S.sessions.forEach(s=>{
    const cur = {};
    s.exos.forEach(ex=>{
      const b = best[ex.exoId], c = cur[ex.exoId] || (cur[ex.exoId] = { w:b?b.w:0, r:b?b.r:0 });
      ex.sets.forEach(st=>{
        if(!st.done) return;
        if(st.pr) before++;
        const w = st.weight||0, r = st.reps||0, e = estimated1RM(w,r);
        const was = !!st.pr;
        if(b && (w||r) && (w>c.w || e>c.r+0.01)){ st.pr = true; after++; } else delete st.pr;
        if(was!==!!st.pr) sessionTouched(s);
        c.w = Math.max(c.w,w); c.r = Math.max(c.r,e);
      });
    });
    Object.keys(cur).forEach(id=>{ best[id] = cur[id]; });
  });
  S.meta.prCount = Math.max(0, (S.meta.prCount||0) + after - before);
}

// ---------- régularité ----------
// Semaines consécutives avec au moins une séance. La semaine en cours pas encore entamée ne
// casse pas la série. Joker : une semaine sans séance est pardonnée si aucun autre joker n'a
// servi dans les 4 semaines précédentes (≈ une par mois : vacances, maladie). Deux semaines
// vides d'affilée cassent la série. Une semaine « joker » ne compte pas dans la longueur.
const JOKER_GAP = 4;
function streakInfo(){ return memo("streakInfo:"+todayISO(), streakInfo_raw); }
function streakInfo_raw(){
  const weeks = new Set(S.sessions.map(s=>weekKey(s.date)));
  const thisWeek = weekKey(todayISO());
  let cursor = weeks.has(thisWeek) ? thisWeek : addDaysISO(thisWeek,-7);
  // à rebours : jokers espacés d'au moins JOKER_GAP semaines
  let n = 0, jokers = [], lastJokerIdx = -Infinity, i = 0;
  for(;;){
    if(weeks.has(cursor)) n++;
    else if(weeks.has(addDaysISO(cursor,-7)) && i-lastJokerIdx>=JOKER_GAP){
      jokers.push(cursor); lastJokerIdx = i;
    } else break;
    cursor = addDaysISO(cursor,-7); i++;
  }
  if(!n) jokers = [];
  // joker récent (dans les 4 dernières semaines) : affiché, et pas de nouveau joker avant qu'il expire
  const recent = jokers.find(w=>daysBetween(w, thisWeek)<JOKER_GAP*7) || null;
  return { n, jokers, recent, nextJokerIn: recent ? JOKER_GAP - Math.round(daysBetween(recent, thisWeek)/7) : 0 };
}
function currentStreakWeeks(){ return streakInfo().n; }
function maxStreakWeeksEver(){ return memo("maxStreakWeeksEver", maxStreakWeeksEver_raw); }
function maxStreakWeeksEver_raw(){
  const weeks = Array.from(new Set(S.sessions.map(s=>weekKey(s.date)))).sort();
  if(!weeks.length) return 0;
  const has = new Set(weeks);
  let best = 0, cur = 0, lastJoker = -Infinity, i = 0;
  for(let w = weeks[0]; w<=weeks[weeks.length-1]; w = addDaysISO(w,7), i++){
    if(has.has(w)){ cur++; best = Math.max(best, cur); }
    else if(cur>0 && has.has(addDaysISO(w,7)) && i-lastJoker>=JOKER_GAP) lastJoker = i;
    else { cur = 0; lastJoker = -Infinity; }
  }
  return Math.max(best, currentStreakWeeks());
}
function perfectWeeksCount(){ return memo("perfectWeeksCount", perfectWeeksCount_raw); }
function perfectWeeksCount_raw(){
  const goal = S.goals.daysPerWeek||3, per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  return Object.values(per).filter(n=>n>=goal).length;
}
function sessionsInMonth(){
  const ym = todayISO().slice(0,7);
  return S.sessions.filter(s=>s.date.slice(0,7)===ym).length;
}
function sessionsInYear(){
  const y = todayISO().slice(0,4);
  return S.sessions.filter(s=>s.date.slice(0,4)===y).length;
}
function sessionsThisWeek(){
  const wk = weekKey(todayISO());
  return S.sessions.filter(s=>weekKey(s.date)===wk).length;
}
function weeklyAverage(weeks){
  const cutoff = addDaysISO(todayISO(), -weeks*7);
  return round1(S.sessions.filter(s=>s.date>cutoff).length/weeks);
}
function sessionsToday(){ return S.sessions.filter(s=>s.date===todayISO()); }

// n dernières semaines (la plus ancienne d'abord)
function weeklyBuckets(n){
  const cur = weekKey(todayISO()), out = [];
  for(let i=n-1;i>=0;i--){
    const wk = addDaysISO(cur,-7*i);
    out.push({ wk, sessions:0, volume:0, sets:0, minutes:0 });
  }
  const idx = {}; out.forEach((b,i)=>idx[b.wk]=i);
  S.sessions.forEach(s=>{
    const i = idx[weekKey(s.date)];
    if(i===undefined) return;
    const b = out[i];
    b.sessions++; b.volume += sessionVolume(s); b.sets += sessionSetCount(s); b.minutes += (s.durationSec||0)/60;
  });
  return out;
}
function dayMap(){ return memo("dayMap", dayMap_raw); }
function dayMap_raw(){
  const m = {};
  S.sessions.forEach(s=>{
    const e = m[s.date] || (m[s.date]={sessions:0,volume:0,sets:0});
    e.sessions++; e.volume += sessionVolume(s); e.sets += sessionSetCount(s);
  });
  return m;
}

// ---------- niveau (XP) ----------
const LEVEL_TITLES = [[15,"Au sommet"],[10,"Confirmé·e"],[6,"Régulier·e"],[3,"Compagnon·ne"],[1,"Apprenti·e"]];
function totalXP(){ return memo("totalXP", totalXP_raw); }
function totalXP_raw(){
  // un trophée secret vaut autant qu'un palier or
  const medalPts = Object.keys(S.medals).reduce((t,id)=>{ const m = S.medals[id]; if(typeof MEDAL_MAP!=="undefined" && MEDAL_MAP[id] && MEDAL_MAP[id].secret) return t+(m.t?50:0); return t+[0,10,25,50,100].slice(1,(m.t||0)+1).reduce((a,b)=>a+b,0); },0);
  return S.sessions.length*50 + totalSets()*2 + (S.meta.prCount||0)*10 + medalPts;
}
// niveau L atteint à 125·L·(L−1) XP : 0, 250, 750, 1500, 2500…
function levelInfo(xp){
  if(xp==null) xp = totalXP();
  let L=1;
  while(125*(L+1)*L <= xp) L++;
  const base = 125*L*(L-1), next = 125*(L+1)*L;
  return { level:L, xp, base, next, pct:(xp-base)/(next-base), title:LEVEL_TITLES.find(([min])=>L>=min)[1] };
}

// ---------- planning hebdomadaire ----------
const JOURS_COURTS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
function weekdayIdx(iso){ return (parseISO(iso).getDay()+6)%7; } // lundi = 0
function plannedTemplate(iso){
  const wd = weekdayIdx(iso||todayISO());
  return S.templates.find(t=>(t.days||[]).includes(wd)) || null;
}

// ---------- statistiques du profil ----------
function favoriteExercise(){ return memo("favoriteExercise", favoriteExercise_raw); }
function favoriteExercise_raw(){
  const c = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>{ if(ex.sets.some(st=>st.done)) c[ex.exoId]=(c[ex.exoId]||0)+1; }));
  const id = Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  return id ? { def:EXO_MAP[id], n:c[id] } : null;
}
function favoriteWeekday(){ return memo("favoriteWeekday", favoriteWeekday_raw); }
function favoriteWeekday_raw(){
  const c = [0,0,0,0,0,0,0];
  S.sessions.forEach(s=>c[weekdayIdx(s.date)]++);
  const max = Math.max(...c);
  return max ? { i:c.indexOf(max), n:max } : null;
}
function favoriteMoment(){ return memo("favoriteMoment", favoriteMoment_raw); }
function favoriteMoment_raw(){
  const c = { "le matin":0, "à midi":0, "l'après-midi":0, "le soir":0 };
  S.sessions.forEach(s=>{
    const h = startHour(s); if(h===null) return;
    c[h<11?"le matin":h<14?"à midi":h<18?"l'après-midi":"le soir"]++;
  });
  const k = Object.keys(c).sort((a,b)=>c[b]-c[a])[0];
  return c[k] ? k : null;
}
function bestWeek(){ return memo("bestWeek", bestWeek_raw); }
function bestWeek_raw(){
  const per = {};
  S.sessions.forEach(s=>{ const k=weekKey(s.date); per[k]=(per[k]||0)+1; });
  const k = Object.keys(per).sort((a,b)=>per[b]-per[a])[0];
  return k ? { wk:k, n:per[k] } : null;
}
function topLifts(n){ return memo("tl:"+n, ()=>topLifts_raw(n)); }
function topLifts_raw(n){
  const best = {};
  S.sessions.forEach(s=>s.exos.forEach(ex=>ex.sets.forEach(st=>{
    if(!st.done || !st.weight) return;
    const b = best[ex.exoId];
    if(!b || st.weight>b.w || (st.weight===b.w && st.reps>b.r)) best[ex.exoId] = { w:st.weight, r:st.reps, date:s.date };
  })));
  return Object.keys(best).filter(id=>EXO_MAP[id]).map(id=>Object.assign({ def:EXO_MAP[id] }, best[id])).sort((a,b)=>b.w-a.w).slice(0,n);
}
function firstSessionDate(){ return memo("firstSessionDate", firstSessionDate_raw); }
function firstSessionDate_raw(){ return S.sessions.length ? S.sessions.reduce((m,s)=>s.date<m?s.date:m, S.sessions[0].date) : null; }
