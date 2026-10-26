// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Audit 2.13 : six mois simulés dans le vrai code (propositions du jour, séances sur mesure, séance composée,
// une pause de 4 semaines, des pesées), avec un pratiquant qui progresse vraiment. On vérifie à chaque
// séance les charges et répétitions proposées, puis tous les calculs (force, stimulus, ascension, trophées,
// bilans) et tous les écrans : aucun NaN, undefined, Infinity ni [object Object] affiché.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v80'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, profile: { name: 'Sim' },
      equipment: { owned: { dumbbells: true, bench: true, kettlebell: true, pullup_bar: true, bands: true }, weights: { dumbbells: [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28], kettlebell: [8, 12, 16, 20, 24] } },
      goals: { level: 'intermediaire', overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }, settings: { todayTab: 'proposal', stretching: true } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(900); if (process.env.TRACE) await page.evaluate(() => { window.__TRACE = 1; });

  // reprise : exercice en pause depuis 30 jours mais muscle travaillé il y a 3 jours → même charge ; muscle au
  // repos depuis 30 jours → un cran plus léger
  const rep = await page.evaluate(() => { const t = todayISO(), dc = k => ({ id: 'r' + k, date: addDaysISO(t, -k), exos: [{ exoId: 'dc_haltere', targetReps: [8, 12], sets: [{ reps: 10, weight: 14, done: true, effort: 2 }] }] });
    S.sessions = [dc(30), { id: 'p3', date: addDaysISO(t, -3), exos: [{ exoId: 'pompes', sets: [{ reps: 15, done: true }] }] }]; sessionTouched(); save();
    const a = suggestForExo(EXO_MAP.dc_haltere, 3, false, 0);
    S.sessions = [dc(30)]; sessionTouched(); save();
    const b = suggestForExo(EXO_MAP.dc_haltere, 3, false, 0);
    S.sessions = []; sessionTouched(); save();
    return { trained: a.weight, tNote: a.note, idle: b.weight, iNote: b.note }; });
  log('Reprise :', JSON.stringify(rep));
  if (rep.trained !== 14 || !/Dernière fois il y a 30 jours/.test(rep.tNote || '') || !(rep.idle < 14) || !/Reprise après 30 jours/.test(rep.iNote || '')) fail('reprise : selon le muscle, pas seulement l\'exercice');

  const sim = await page.evaluate(async () => {
    const bad = []; const flag = (m) => { if (bad.length < 40) bad.push(m); };
    const realToday = todayISO, start = addDaysISO(realToday(), -182);
    showCelebration = () => {}; renderViewAnimated = () => {};
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const truth = {}, owned = S.equipment.weights;
    const oneRM = def => truth[def.id] || (truth[def.id] = (kgType(def) ? START_KG[loadableTypeOf(def)] && START_KG[loadableTypeOf(def)][startKind(def)] || 10 : 1) * (1.25 + rnd() * .3) * (kgType(def) ? 1.35 : 1));
    const bwCap = {};
    let n = 0, tailored = 0, custom = 0;
    // 2ᵉ profil, très différent : débutant de plus de 65 ans, sans matériel, objectif endurance (4 mois)
    const runSim = async (days, startAt) => {
    for (let d = 0; d <= days; d++) {
      const day = addDaysISO(startAt, d); todayISO = () => day;
      if (d % 14 === 3) { S.body.push({ d: day, kg: 75 - d / 60 }); }
      const wd = weekdayIdx(day), pause = d >= 100 && d < 128;
      if (pause || ![0, 2, 4].includes(wd) || rnd() < .12) continue;
      // la séance : proposition du jour, sur mesure (1 fois sur 5), composée (1 fois sur 8)
      let draft;
      const r0 = rnd();
      if (r0 < .2) { draft = await tailorGenerate({ kind: ['renfo', 'renfo', 'mix', 'cardio', 'mobilite'][(rnd() * 5) | 0], zone: ['full', 'haut', 'bas', 'pull', 'bras'][(rnd() * 5) | 0], equip: rnd() < .4 ? 'none' : 'all', len: ['court', 'moyen', 'long'][(rnd() * 3) | 0] }, null, { fast: true }); tailored++; }
      else if (r0 < .32) { draft = buildCustomSession([{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }, { exoId: 'planche', sets: 2 }, { exoId: 'squat_gobelet', sets: 3 }].filter(e => EXO_MAP[e.exoId] && hasEquip(S.equipment, EXO_MAP[e.exoId].equip))); custom++; }
      else draft = generateEngineSession();
      if (!draft || !draft.exos.length) { flag(day + ' : séance vide'); continue; }
      const mins = estimateMinutes(draft); if (!(mins > 0 && mins < 240)) flag(day + ' : durée estimée ' + mins);
      S.draft = draft; const t0 = new Date(day + 'T18:00:00').getTime(); draft.startedAt = new Date(t0).toISOString();
      let seq = 0;
      draft.exos.forEach((ex, xi) => {
        const def = EXO_MAP[ex.exoId]; if (!def) { flag('exercice inconnu ' + ex.exoId); return; }
        if (!Array.isArray(ex.targetReps) || ex.targetReps.some(v => !(v >= 1 && v <= 600))) flag(`${day} ${def.id} : fourchette ${JSON.stringify(ex.targetReps)}`);
        if (ex.sets.length < 1 || ex.sets.length > 6) flag(`${day} ${def.id} : ${ex.sets.length} séries`);
        ex.sets.forEach((st, si) => {
          if (!(st.reps >= 1 && st.reps <= 600 && Number.isInteger(st.reps))) flag(`${day} ${def.id} : répétitions proposées ${st.reps}`);
          if (st.weight != null && !(st.weight >= 0 && isFinite(st.weight))) flag(`${day} ${def.id} : charge ${st.weight}`);
          const tp = loadableTypeOf(def);
          if (tp && tp !== 'bands' && st.weight && (owned[tp] || []).length && !owned[tp].includes(st.weight)) flag(`${day} ${def.id} : charge ${st.weight} kg non possédée`);
          // le pratiquant : ce qu'il peut faire à cette charge (Epley inversée), fatigue de série en série
          let cap;
          if (isStretch(def)) cap = st.reps;
          else if (kgType(def) && st.weight) cap = Math.floor(30 * (oneRM(def) / st.weight - 1) - si * .8 - xi * .3);
          else if (isTimed(def)) cap = Math.round((bwCap[def.id] || (bwCap[def.id] = 30 + rnd() * 30)) - si * 4);
          else cap = Math.floor((bwCap[def.id] || (bwCap[def.id] = 10 + rnd() * 12)) - si * 1.2 - xi * .3);
          const reps = Math.max(1, Math.min(cap, st.reps + (rnd() < .25 ? 1 : 0)));
          if (isTimed(def) && !isStretch(def)) st.goal = st.reps;
          const left = cap - reps;
          if (!isStretch(def)) {
            if (isLivePR(def, ex.sets.filter(s => s.done), st.weight || 0, reps)) { st.pr = true; S.meta.prCount = (S.meta.prCount || 0) + 1; }
          }
          st.reps = reps; st.effort = left >= 3 ? 1 : left >= 1 ? 2 : 3; st.done = true;
          if (ex.first == null) ex.first = draft.seq = ++seq;
        });
      });
      draft.lastSetAt = t0 + 35 * 60e3;
      finalizeSession(); n++;
      // il progresse : ~0,6 % de force par séance, un peu plus de répétitions au poids du corps
      Object.keys(truth).forEach(k => { truth[k] *= 1.006; }); Object.keys(bwCap).forEach(k => { bwCap[k] *= 1.008; });
      if (S.draft) flag(day + ' : séance restée ouverte');
    }
    };
    // 1. débutant senior, sans matériel, endurance, 4 mois (puis on repart à zéro)
    Object.assign(S.goals, { level: 'debutant', senior: true, overall: 'endurance', daysPerWeek: 2, sessionLength: 'court' });
    const ownedSave = S.equipment.owned; S.equipment.owned = { bodyweight: true }; sessionTouched();
    await runSim(120, addDaysISO(realToday(), -300));
    const firstN = S.sessions.length;
    S.sessions.forEach(s => s.exos.forEach(e => { const dd = EXO_MAP[e.exoId]; if (dd && dd.equip.some(q => q !== 'bodyweight' && q !== 'mat')) flag('profil sans matériel : ' + dd.id + ' proposé'); e.sets.forEach(x => { if (!isStretch(dd || {}) && x.reps > 0 && e.sets.length > 3 && !isCardioEx(dd || { muscles: [] })) flag('débutant : ' + e.sets.length + ' séries de ' + e.exoId); }); }));
    if (firstN < 20) flag('profil débutant : ' + firstN + ' séances seulement');
    S.sessions = []; S.medals = {}; S.ascent = {}; S.body = []; S.meta.prCount = 0; S.challenges = []; S.targets = []; sessionTouched(); save();
    // 2. intermédiaire équipé, hypertrophie, 6 mois
    S.equipment.owned = ownedSave; Object.assign(S.goals, { level: 'intermediaire', senior: false, overall: 'hypertrophie', daysPerWeek: 3, sessionLength: 'moyen' }); sessionTouched(); save();
    n = 0; await runSim(182, start);
    todayISO = realToday; save();
    // ---- calculs ----
    const fin = (v, w) => { if (typeof v !== 'number' || !isFinite(v)) flag(w + ' = ' + v); };
    const st = strengthAt(todayISO()); JSON.stringify(st, (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag('force.' + k + ' = ' + v); return v; });
    strengthSeries(26).forEach((p, i) => JSON.stringify(p, (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag(`courbe[${i}].${k}`); return v; }));
    JSON.stringify(trainingStatus(), (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag('statut.' + k); return v; });
    muscleVolume(7).concat(muscleVolume(28)).forEach(r => fin(r.sets, 'volume ' + r.id));
    const a = ascent(); ['alt', 'done'].forEach(k => fin(a[k], 'ascension.' + k)); if (a.alt < 0) flag('altitude négative');
    MEDALS.forEach(m => { const p = medalProgress(m); if (p && p.pct != null && !(p.pct >= 0 && p.pct <= 1.0001)) flag('trophée ' + m.id + ' : ' + p.pct); });
    JSON.stringify(rewindData('month', todayISO().slice(0, 7)), (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag('rewind.' + k); return v; });
    JSON.stringify(recapStats('year', todayISO().slice(0, 4)), (k, v) => { if (typeof v === 'number' && !isFinite(v)) flag('bilan.' + k); return v; });
    // la charge progresse : le développé couché (s'il a été fait souvent) a monté au fil des mois (la dernière séance peut suivre une pause, allégée)
    const dc = S.sessions.filter(s => s.exos.some(e => e.exoId === 'dc_haltere')).map(s => Math.max(...s.exos.find(e => e.exoId === 'dc_haltere').sets.map(x => x.weight || 0)));
    const prs = S.sessions.reduce((t, s) => t + s.exos.reduce((u, e) => u + e.sets.filter(x => x.pr).length, 0), 0);
    // records : le direct et le recalcul donnent les mêmes séries ; il y a des records au poids du corps
    const flags = () => S.sessions.map(s => s.exos.map(e => e.sets.map(x => x.pr ? 1 : 0).join('')).join('|')).join(';');
    const live = flags(); recomputePRFlags(); const again = flags();
    if (live !== again) { const L = live.split(';'), A = again.split(';'), i = L.findIndex((x, k) => x !== A[k]), ss = S.sessions[i];
      flag(`records : le direct et le recalcul ne donnent pas les mêmes séries (${ss.date} ${ss.source}/${ss.type} ${ss.exos.map(e => e.exoId).join(',')} : ${L[i]} ≠ ${A[i]})`);
      const Lx = L[i].split('|'), Ax = A[i].split('|'), j = Lx.findIndex((x, k) => x !== Ax[k]), id = ss.exos[j].exoId;
      flag('historique de ' + id + ' : ' + S.sessions.slice(0, i + 1).filter(x => x.exos.some(e => e.exoId === id)).map(x => x.date.slice(5) + ' ' + x.exos.filter(e => e.exoId === id).map(e => e.sets.map(t => `${t.weight}×${t.reps}${t.done ? '' : '?'}`).join(' ')).join(' + ')).join(' | ')); }
    const bwPR = S.sessions.some(s => s.exos.some(e => !kgType(EXO_MAP[e.exoId] || {}) && e.sets.some(x => x.pr)));
    if (!bwPR) flag('aucun record au poids du corps');
    const trace = window.__TRACE ? S.sessions.filter(s => s.exos.some(e => e.exoId === 'dc_haltere')).map(s => { const e = s.exos.find(e => e.exoId === 'dc_haltere'); return `${s.date} ${s.source || ''}/${s.type || ''} [${e.targetReps}] ` + e.sets.map(x => `${x.weight}×${x.reps}${'·ée!'[x.effort || 0]}`).join(' ') + (e.note ? ' — ' + e.note.slice(0, 70) : ''); }) : undefined;
    return { trace, bad, n, tailored, custom, sessions: S.sessions.length, dcFirst: dc[0], dcLast: dc[dc.length - 1], dcMax: Math.max(0, ...dc), dcN: dc.length, prs, alt: Math.round(a.alt), idx: st && st.index };
  });
  log('Simulation :', JSON.stringify({ ...sim, trace: undefined, bad: sim.bad.length })); (sim.trace || []).forEach(t => log('   ', t));
  sim.bad.forEach(b => log('  ·', b));
  if (sim.bad.length) fail('simulation : valeurs incohérentes');
  if (!(sim.n > 50) || !(sim.dcN < 3 || sim.dcMax > sim.dcFirst) || !(sim.prs > 5)) fail('progression simulée (séances, charges, records)');

  // ---- tous les écrans : aucun NaN / undefined / Infinity / [object Object] ----
  const scan = async (label) => { const t = await page.evaluate(() => { const root = document.querySelector('#overlay.open') || document.querySelector('#rewind') || document.querySelector('#app'); return root ? root.innerText : ''; });
    const m = t.match(/NaN|undefined|Infinity|\[object Object\]|\bnull\b|(?<![\d.:\/v])\d+\.\d+(?![\d.])/); if (m) fail(`${label} : « ${m[0]} » affiché (${t.slice(Math.max(0, t.indexOf(m[0]) - 40), t.indexOf(m[0]) + 30).replace(/\s+/g, ' ')})`); };
  for (const tab of ['today', 'progress', 'profil']) { await page.evaluate(t => { closeSheet(); switchTab(t); renderView(t); }, tab); await page.waitForTimeout(500); await scan(tab); }
  const screens = [['progress', 'progressTab', { v: 'force' }], ['progress', 'progressTab', { v: 'muscles' }], ['progress', 'progressTab', { v: 'stats' }], ['progress', 'progressTab', { v: 'medals' }], ['progress', 'progressTab', { v: 'exos' }],
    ['progress', 'openExoChart', { id: 'dc_haltere' }], ['progress', 'openExoChart', { id: 'pompes' }], ['progress', 'openExoChart', { id: 'planche' }],
    ['profil', 'openData', {}], ['profil', 'openGoals', {}], ['profil', 'openSessionPrefs', {}], ['profil', 'openMotivation', {}], ['profil', 'openEquip', {}], ['profil', 'openExoPrefs', {}], ['profil', 'openBody', {}], ['profil', 'openStorage', {}], ['profil', 'openTrophies', {}], ['profil', 'openAbout', {}],
    ['today', 'chooseSession', {}], ['today', 'tailorOpen', {}], ['today', 'openAscent', {}], ['today', 'openRecap', { kind: 'month' }], ['today', 'openRecap', { kind: 'year' }]];
  for (const [tab, a, d] of screens) {
    await page.evaluate(([tab, a, d]) => { closeSheet(); switchTab(tab); ACT[a](d); }, [tab, a, d]); await page.waitForTimeout(a === 'openAscent' ? 2500 : 600);
    await scan(`${tab} › ${a}${d.v || d.id || d.kind ? ' ' + (d.v || d.id || d.kind) : ''}`);
  }
  await page.evaluate(() => { closeSheet(); ACT.openRewind({ kind: 'month' }); }); await page.waitForTimeout(800);
  for (let i = 0; i < 9; i++) { await scan('rewind ' + i); await page.evaluate(() => { if (typeof rwGo === 'function' && rw) rwGo(rw.i + 1); }); await page.waitForTimeout(350); }
  await page.evaluate(() => { const x = document.querySelector('#rewind [data-a="rwClose"]'); if (x) x.click(); });

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
