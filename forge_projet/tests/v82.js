// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.14 : moteur de propositions face à des profils piégeux, simulés semaine après semaine dans le vrai code
// (séance du jour, sur mesure, composée) avec un pratiquant qui suit, rate ou dépasse ce qu'on lui propose.
// Pour chaque séance : exercices possédés et non exclus, nombre de séries, durée estimée selon le réglage
// (20 / 40 / 60 min), charges réellement possédées, répétitions plausibles, reprise prudente après une
// longue pause, rien d'absurde au plafond du matériel, pas le même exercice trois séances de suite.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, profile: { name: 'Sim' }, settings: { todayTab: 'proposal' }, equipment: { owned: { bodyweight: true } }, goals: { level: 'intermediaire', daysPerWeek: 3 } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(900);
  await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); try { closeSheet(); } catch (e) {} });

  const PROFILES = [
    { id: 'court', n: '20 min, haltères', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'court' }, owned: { bodyweight: true, dumbbells: true, bench: true }, weights: { dumbbells: [4, 6, 8, 10, 12, 14, 16, 18, 20] }, days: 63, tailorLen: 'court' },
    { id: 'un-poids', n: 'une seule paire d\'haltères (10 kg), avancé', goals: { level: 'avance', overall: 'force', daysPerWeek: 4, sessionLength: 'moyen' }, owned: { bodyweight: true, dumbbells: true }, weights: { dumbbells: [10] }, days: 70 },
    { id: 'kettlebell', n: 'kettlebell seul (12 et 16 kg)', goals: { level: 'intermediaire', overall: 'endurance', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true, kettlebell: true }, weights: { kettlebell: [12, 16] }, days: 63 },
    { id: 'elastiques', n: 'élastiques seuls', goals: { level: 'debutant', overall: 'tonification', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true, bands: true }, weights: {}, days: 56 },
    { id: 'traction', n: 'barre de traction seule', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'long' }, owned: { bodyweight: true, pullup_bar: true }, weights: {}, days: 56 },
    { id: 'genou', n: 'genou fragile : squats, fentes et sauts exclus', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true, dumbbells: true }, weights: { dumbbells: [6, 8, 10, 12, 14] }, exclude: /squat|fente|saut|jump|burpee|pistol|step_up|montee|bulgare|chaise/, days: 56 },
    { id: 'avance-6j', n: 'très avancé, 6 jours sur 7, séances longues', goals: { level: 'avance', overall: 'hypertrophie', daysPerWeek: 6, sessionLength: 'long' }, owned: { bodyweight: true, dumbbells: true, bench: true, barbell: true, pullup_bar: true }, weights: { dumbbells: [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], barbell: [20, 30, 40, 50, 60, 70, 80, 90, 100] }, days: 42, every: [0, 1, 2, 3, 4, 5] },
    { id: 'reprise', n: 'reprise après 3 mois d\'arrêt', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true, dumbbells: true, bench: true }, weights: { dumbbells: [6, 8, 10, 12, 14, 16, 18, 20, 22] }, days: 150, pause: [42, 132] },
    { id: 'irregulier', n: 'irrégulier : une séance tous les 4 à 12 jours, parfois deux le même jour', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true, dumbbells: true }, weights: { dumbbells: [8, 10, 12, 14, 16] }, days: 120, irregular: true },
    { id: 'senior', n: 'débutant de plus de 65 ans, haltères légers', goals: { level: 'debutant', senior: true, overall: 'endurance', daysPerWeek: 2, sessionLength: 'court' }, owned: { bodyweight: true, dumbbells: true }, weights: { dumbbells: [1, 2, 3, 4, 5] }, days: 70 },
    { id: 'exclusions', n: 'sans matériel, trois quarts des exercices exclus', goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }, owned: { bodyweight: true }, weights: {}, excludeShare: .75, days: 42 },
  ];

  if (process.env.DBG) await page.evaluate(() => { window.__DBG = 1; });
  const res = await page.evaluate(async PROFILES => {
    showCelebration = () => {}; renderViewAnimated = () => {};
    const realToday = todayISO, out = [];
    const MIN = { court: 20, moyen: 40, long: 60 };
    for (const P of PROFILES) {
      const bad = []; const flag = m => { if (bad.length < 12) bad.push(m); };
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      let seed2 = 97; Math.random = () => (seed2 = (seed2 * 48271) % 2147483647) / 2147483647;   // tirages du moteur reproductibles
      // état neuf pour chaque profil
      S.sessions = []; S.medals = {}; S.ascent = {}; S.body = []; S.meta.prCount = 0; S.challenges = []; S.targets = []; S.draft = null;
      S.goals = Object.assign({ overall: 'hypertrophie', emphasis: {}, daysPerWeek: 3, sessionLength: 'moyen', level: 'intermediaire', exoCount: 0, senior: false }, P.goals);
      S.equipment.owned = Object.assign({}, P.owned); S.equipment.weights = Object.assign({}, P.weights);
      S.prefs = { excluded: [], included: [], swapped: {} };
      if (P.exclude) S.prefs.excluded = EXOS.filter(e => new RegExp(P.exclude).test(e.id)).map(e => e.id);
      if (P.excludeShare) { const own = EXOS.filter(e => hasEquip(S.equipment, e.equip)); S.prefs.excluded = own.filter((e, i) => (i * 7919 % 100) / 100 < P.excludeShare).map(e => e.id); }
      sessionTouched(); save();
      const owned = S.equipment.weights, truth = {}, bwCap = {};
      const oneRM = def => truth[def.id] || (truth[def.id] = (kgType(def) ? START_KG[loadableTypeOf(def)] && START_KG[loadableTypeOf(def)][startKind(def)] || 10 : 1) * (1.25 + rnd() * .3) * (kgType(def) ? 1.35 : 1) * (P.goals.level === 'avance' ? 1.6 : P.goals.senior ? .6 : 1));
      const recent = [], types = [];   // exercices et types des dernières séances du jour
      const lastLoad = {};     // charge la plus lourde par exercice
      let n = 0, mins = [], setsPerExo = [], next = 0, before = null, afterPause = null;
      const start = addDaysISO(realToday(), -P.days - 1);
      for (let d = 0; d <= P.days; d++) {
        const day = addDaysISO(start, d); todayISO = () => day;
        if (P.pause && d >= P.pause[0] && d < P.pause[1]) { if (d === P.pause[0]) before = Object.assign({}, lastLoad); continue; }
        if (P.pause && d === P.pause[1]) afterPause = new Set();   // première apparition de chaque exercice après la pause
        let times = 0;
        if (P.irregular) { if (d < next) continue; next = d + 4 + Math.floor(rnd() * 9); times = rnd() < .15 ? 2 : 1; }
        else { const wd = weekdayIdx(day); if (!(P.every || [0, 2, 4, 5].slice(0, P.goals.daysPerWeek)).includes(wd) || rnd() < .1) continue; times = 1; }
        for (let k = 0; k < times; k++) {
          let draft, kind = 'jour';
          const r0 = rnd();
          if (P.tailorLen && r0 < .4) { kind = 'sur mesure'; draft = await tailorGenerate({ kind: 'renfo', zone: ['full', 'haut', 'bas'][(rnd() * 3) | 0], equip: 'all', len: P.tailorLen }, null, { fast: true }); }
          else if (r0 < .15) { kind = 'sur mesure'; draft = await tailorGenerate({ kind: ['renfo', 'mix'][(rnd() * 2) | 0], zone: ['full', 'haut', 'bas', 'pull'][(rnd() * 4) | 0], equip: 'all', len: S.goals.sessionLength }, null, { fast: true }); }
          else draft = generateEngineSession();
          if (!draft || !draft.exos || !draft.exos.length) { flag(day + ' : séance vide (' + kind + ')'); continue; }
          const m = estimateMinutes(draft), target = MIN[kind === 'sur mesure' && P.tailorLen ? P.tailorLen : S.goals.sessionLength];
          mins.push(m);
          if (m > target * 1.35) flag(`${day} ${kind} : ${m} min pour ${target} min visées`);
          // trop courte : seulement si l'app ne l'explique pas (« peu d'exercices disponibles » avec ce matériel)
          if (m < target * .4 && !P.excludeShare && !/peu d'exercices disponibles/i.test(draft.reason || '')) flag(`${day} ${kind} : ${m} min seulement pour ${target} min visées`);
          S.draft = draft; const t0 = new Date(day + 'T18:00:00').getTime(); draft.startedAt = new Date(t0).toISOString();
          let seq = 0;
          draft.exos.forEach((ex, xi) => {
            const def = EXO_MAP[ex.exoId]; if (!def) { flag('exercice inconnu ' + ex.exoId); return; }
            if (!hasEquip(S.equipment, def.equip)) flag(`${day} ${def.id} : matériel non possédé (${def.equip.join(', ')})`);
            if (S.prefs.excluded.includes(def.id)) flag(`${day} ${def.id} : exercice exclu proposé`);
            if (ex.sets.length < 1 || ex.sets.length > 6) flag(`${day} ${def.id} : ${ex.sets.length} séries`);
            if (target <= 20 && ex.sets.length > 4 && !isStretch(def)) flag(`${day} ${def.id} : ${ex.sets.length} séries dans une séance de 20 min`);
            if (!isStretch(def)) setsPerExo.push(ex.sets.length);
            const tp = loadableTypeOf(def);
            ex.sets.forEach((st, si) => {
              if (!(st.reps >= 1 && st.reps <= 600 && Number.isInteger(st.reps))) flag(`${day} ${def.id} : répétitions ${st.reps}`);
              if (st.weight != null && !(st.weight >= 0 && isFinite(st.weight))) flag(`${day} ${def.id} : charge ${st.weight}`);
              if (tp && tp !== 'bands' && st.weight && !(owned[tp] || []).includes(st.weight)) flag(`${day} ${def.id} : ${st.weight} kg non possédés`);
              if (kgType(def) && st.weight && !isTimed(def) && st.reps > 30) flag(`${day} ${def.id} : ${st.reps} répétitions à ${st.weight} kg`);
              if ((S.goals.level === 'debutant' || S.goals.senior) && kgType(def) && st.weight && !isTimed(def) && st.reps < 6) flag(`${day} ${def.id} : ${st.reps} répétitions pour un débutant`);
              // le pratiquant
              let cap;
              if (isStretch(def)) cap = st.reps;
              else if (kgType(def) && st.weight) cap = Math.floor(30 * (oneRM(def) / st.weight - 1) - si * .8 - xi * .3);
              else if (isTimed(def)) cap = Math.round((bwCap[def.id] || (bwCap[def.id] = (P.goals.senior ? 15 : 30) + rnd() * 30)) - si * 4);
              else cap = Math.floor((bwCap[def.id] || (bwCap[def.id] = (P.goals.senior ? 5 : 10) + rnd() * 12)) - si * 1.2 - xi * .3);
              const reps = Math.max(1, Math.min(cap, st.reps + (rnd() < .25 ? 1 : 0)));
              if (isTimed(def) && !isStretch(def)) st.goal = st.reps;
              const left = cap - reps;
              if (!isStretch(def) && isLivePR(def, ex.sets.filter(s => s.done), st.weight || 0, reps)) { st.pr = true; S.meta.prCount = (S.meta.prCount || 0) + 1; }
              st.reps = reps; st.effort = left >= 3 ? 1 : left >= 1 ? 2 : 3; st.done = true;
              if (ex.first == null) ex.first = draft.seq = ++seq;
            });
            if (kgType(def)) { const w = Math.max(0, ...ex.sets.map(s => s.weight || 0)); if (w) { if (afterPause && !afterPause.has(def.id) && before && before[def.id] && w > before[def.id]) flag(`reprise : ${def.id} à ${w} kg au lieu de ${before[def.id]} kg ou moins`); lastLoad[def.id] = w; } }
            if (afterPause) afterPause.add(def.id);
          });
          // monotonie : le même exercice cinq séances du jour de suite alors qu'au moins trois autres travaillent
          // le même muscle principal (refaire un exercice de base d'une séance à l'autre est normal)
          const ids = draft.exos.map(e => e.exoId);
          if (kind === 'jour') {
            const last = recent.slice(-4);
            if (last.length === 4) ids.forEach(id => { const def = EXO_MAP[id]; if (isStretch(def) || !last.every(r => r.includes(id))) return;
              const alt = EXOS.filter(e => e.id !== id && e.muscles[0] === def.muscles[0] && !isStretch(e) && !EXO_RETIRED.has(e.id) && hasEquip(S.equipment, e.equip) && !S.prefs.excluded.includes(e.id)).length;
              if (alt >= 3) { flag(`${day} ${id} : cinq séances de suite (${alt} autres possibles)`);
                if (window.__DBG) flag('    scores : ' + [def].concat(EXOS.filter(e => e.id !== id && e.muscles[0] === def.muscles[0] && !isStretch(e) && hasEquip(S.equipment, e.equip) && !S.prefs.excluded.includes(e.id))).map(e => `${e.id}(${e.pattern}) ${scoreExo(e).toFixed(1)} rec ${recencyPenalty(e.id)} aff ${exoAffinity(e.id).toFixed(1)} goal ${((goalValue(e) - 1) * 2.5).toFixed(1)} lv ${e.level}`).join(' | ')); } });
            recent.push(ids);
          }
          types.push(kind === 'jour' ? draft.resolvedType : '·');
          draft.lastSetAt = t0 + 35 * 60e3;
          finalizeSession(); n++;
          if (S.draft) flag(day + ' : séance restée ouverte');
          Object.keys(truth).forEach(k => { truth[k] *= 1.006; }); Object.keys(bwCap).forEach(k => { bwCap[k] *= 1.008; });
        }
      }
      todayISO = realToday;
      // jamais quatre séances « gainage » d'affilée (le type suit la récupération réelle)
      const tj = types.filter(t => t !== '·').join(','); if (/core,core,core,core/.test(tj)) flag('quatre séances de gainage d\'affilée : ' + tj.slice(0, 80));
      // calculs finis sur l'historique simulé
      JSON.stringify(strengthAt(todayISO()), (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag('force.' + k + ' = ' + v); return v; });
      const a = ascent(); if (!(a.alt >= 0)) flag('ascension ' + a.alt);
      const avg = x => x.length ? Math.round(x.reduce((s, v) => s + v, 0) / x.length * 10) / 10 : 0;
      out.push({ id: P.id, n: P.n, types: tj.replace(/full/g, 'F').replace(/haut/g, 'H').replace(/bas/g, 'B').replace(/core/g, 'G').replace(/,/g, '').slice(0, 40), sessions: n, minutes: avg(mins), maxMin: Math.max(0, ...mins), sets: avg(setsPerExo), maxSets: Math.max(0, ...setsPerExo), bad });
    }
    S.sessions = []; S.draft = null; sessionTouched(); save();
    return out;
  }, PROFILES.map(p => Object.assign({}, p, { exclude: p.exclude ? p.exclude.source : null })));

  for (const r of res) {
    log(`${r.id.padEnd(11)} ${String(r.sessions).padStart(3)} séances [${r.types}] · ${r.minutes} min en moyenne (max ${r.maxMin}) · ${r.sets} séries par exercice (max ${r.maxSets})${r.bad.length ? '\n    ' + r.bad.join('\n    ') : ''}`);
    if (r.sessions < 8) fail(`${r.n} : ${r.sessions} séances seulement`);
    if (r.bad.length) fail(`${r.n} : ${r.bad.length} problème(s), dont « ${r.bad[0]} »`);
  }
  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
