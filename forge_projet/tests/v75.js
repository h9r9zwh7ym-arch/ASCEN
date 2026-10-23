// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.8.0 : séance sur mesure (critères, vraie réflexion, résultat modifiable) et valeur d'une série selon
// l'objectif (stimulus, ascension, choix des exercices ; le cardio sort de l'indice de force).
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v75'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true, kettlebell: true } } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);

  // 1. les critères sont respectés
  const g = await page.evaluate(async () => {
    const run = async sp => { const s = await tailorGenerate(sp, null, { fast: true }); return s.exos.map(e => EXO_MAP[e.exoId]); };
    const UP = ['pect', 'dos', 'epaules', 'biceps', 'triceps', 'avantbras'];
    const a = await run({ kind: 'renfo', zone: 'haut', equip: 'none', len: 'moyen' });
    const c = await run({ kind: 'cardio', zone: 'full', equip: 'all', len: 'court' });
    const m = await run({ kind: 'mobilite', zone: 'full', equip: 'none', len: 'moyen' });
    const l = await run({ kind: 'renfo', zone: 'full', equip: 'loaded', len: 'long' });
    const s = await tailorGenerate({ kind: 'renfo', zone: 'full', equip: 'all', len: 'moyen' }, null, { fast: true });
    return { upBW: a.every(e => e.equip.every(q => q === 'bodyweight')) && a.filter(e => UP.includes(e.muscles[0])).length >= a.length - 1, n: a.length,
      cardio: c.every(e => e.muscles.includes('cardio')), mob: m.filter(e => isStretch(e)).length / m.length,
      loaded: l.filter(e => exoKind(e) === 'loaded').length / l.length, tries: s.tries, min: estimateMinutes(s),
      fam: s.exos.length === new Set(s.exos.map(e => tailorFams(EXO_MAP[e.exoId]).join('|'))).size };
  });
  log('Generated:', JSON.stringify(g));
  if (!g.upBW || g.n < 4) fail('haut du corps sans matériel');
  if (!g.cardio) fail('cardio');
  if (!(g.mob >= .6)) fail('mobilité : surtout des étirements');
  if (!(g.loaded >= .7)) fail('charges seulement');
  if (g.tries < 40 || !(g.min >= 28 && g.min <= 52) || !g.fam) fail('réflexion : combinaisons essayées, durée visée, pas de doublon');

  // 2. ce que vaut une série selon l'objectif
  const v = await page.evaluate(() => {
    const t = todayISO(), mk = (id, n) => ({ exoId: id, sets: Array.from({ length: n }, () => ({ reps: 12, weight: 10, done: true, effort: 2 })) });
    S.sessions = [{ id: 'a', date: t, exos: [mk('dc_haltere', 3), mk('planche', 3), mk('jumping_jacks', 3)] }]; S.goals.overall = 'hypertrophie'; sessionTouched(); save();
    const pect = muscleVolume(7).find(r => r.id === 'pect').sets, abd = muscleVolume(7).find(r => r.id === 'abdos').sets, hard = ascHardSets(S.sessions[0]);
    S.goals.overall = 'endurance'; save(); const hardE = ascHardSets(S.sessions[0]), abdE = muscleVolume(7).find(r => r.id === 'abdos').sets;
    S.goals.overall = 'hypertrophie'; save();
    const old = ascHardSets({ date: '2026-01-01', exos: S.sessions[0].exos });
    return { pect, abd, abdE, hard, hardE, old, txt: goalValueText(), sc: scoreExo(EXO_MAP.jumping_jacks) < scoreExo(EXO_MAP.dc_haltere) };
  });
  log('Goal value:', JSON.stringify(v));
  if (v.pect !== 3 || !(v.abd < v.abdE) || !(v.hard < v.hardE) || Math.abs(v.hardE - 8.7) > .01 || v.old !== 9) fail('série pondérée par l\'objectif (stimulus, ascension), séances d\'avant inchangées');
  if (!/cardio 0,35/.test(v.txt) || !v.sc) fail('règle expliquée, cardio moins proposé pour prendre du muscle');

  // 3. le cardio n'entre pas dans l'indice de force
  const f = await page.evaluate(() => { const t = todayISO(); S.sessions = [1, 2, 3, 4].map(k => ({ id: 'j' + k, date: addDaysISO(t, -k * 3), exos: [{ exoId: 'jumping_jacks', sets: [{ reps: 20 + k * 5, done: true }] }] })); sessionTouched(); save();
    return !strengthData().exos.jumping_jacks; });
  if (!f) fail('cardio hors de l\'indice de force');

  // 4. parcours : lien discret → critères → réflexion → séance du jour, modifiable
  await page.evaluate(() => { S.sessions = []; S.draft = null; S.settings.todayTab = 'custom'; save(); switchTab('today'); renderView('today'); });
  await page.waitForTimeout(400);
  await page.click('#v-today [data-a="tailorOpen"]'); await page.waitForTimeout(500);
  await page.click('#overlay [data-a="tailorSet"][data-k="zone"][data-v="bas"]'); await page.waitForTimeout(100);
  await page.click('#overlay [data-a="tailorGo"]'); await page.waitForTimeout(700);
  const mid = await page.evaluate(() => ({ host: !!document.querySelector('.tl-host'), steps: document.querySelectorAll('.tl-steps li.done, .tl-steps li.on').length, ics: document.querySelectorAll('.tl-ic .xico').length }));
  await page.screenshot({ path: path.join(OUT, '01_think.png') });
  await page.waitForTimeout(3200);
  const end = await page.evaluate(() => ({ host: !!document.querySelector('.tl-host'), tailored: !!(S.draft && S.draft.tailored), tab: S.settings.todayTab,
    title: (document.querySelector('#v-today .hero-title') || {}).textContent, tag: (document.querySelector('#v-today .hero-tag') || {}).textContent, adjust: !!document.querySelector('#v-today [data-a="propAdjust"]') }));
  await page.screenshot({ path: path.join(OUT, '02_result.png') });
  log('Flow:', JSON.stringify(mid), '→', JSON.stringify(end));
  if (!mid.host || mid.steps < 1 || mid.ics < 4) fail('animation de réflexion');
  if (end.host || !end.tailored || end.tab !== 'proposal' || end.title !== 'Bas du corps' || !/Sur mesure/.test(end.tag || '') || !end.adjust) fail('séance sur mesure à l\'accueil, ajustable');
  // garde la séance sur mesure quand les réglages changent
  const kept = await page.evaluate(() => { regenerateDraftIfIdle(); return !!S.draft.tailored; });
  if (!kept) fail('séance sur mesure gardée');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
