// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.12.2 : « Autre séance sur mesure » depuis « Choisir une autre séance » couvre l'écran (plus de
// superposition), séries plafonnées par exercice et par muscle (le temps se remplit avec des exercices),
// situations délicates (reprise, muscles fatigués, peu d'exercices) dites franchement.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v78'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich', colorScheme: 'dark' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } }, settings: { todayTab: 'proposal' } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);
  const hist = (days, ids, fast) => page.evaluate(([days, ids, fast]) => { const t = todayISO();
    S.sessions = days.slice().sort((a, b) => b - a).map(k => { const st = new Date(addDaysISO(t, -k) + 'T18:00:00').getTime();
      return { id: 's' + k, date: addDaysISO(t, -k), startedAt: new Date(st).toISOString(), completedAt: new Date(st + (fast ? 14 : 24) * 60000).toISOString(),
        exos: ids.map(id => ({ exoId: id, sets: [1, 2, 3, 4].map(() => ({ reps: 12, done: true })) })) }; });
    sessionTouched(); save(); }, [days, ids, fast]);

  // 1. séance sur mesure, puis « Choisir une autre séance » › « Autre séance sur mesure » : le voile couvre
  await hist([3, 5, 8, 10], ['pompes', 'squat_pdc'], false);
  await page.evaluate(async () => { S.draft = await tailorGenerate({ kind: 'renfo', zone: 'full', equip: 'none', len: 'court' }, null, { fast: true }); S.settings.todayTab = 'proposal'; save(); renderView('today'); });
  await page.waitForTimeout(400);
  await page.click('[data-a="chooseSession"]'); await page.waitForTimeout(700);
  await page.click('#overlay [data-a="csRegen"]'); await page.waitForTimeout(900);
  const veil = await page.evaluate(() => { const b = document.querySelector('.tl-host .tl-bg'); return b ? +getComputedStyle(b).opacity : -1; });
  await page.screenshot({ path: path.join(OUT, 'regen.png') });
  await page.waitForFunction(() => !document.querySelector('.tl-host'), null, { timeout: 15000 });
  const after = await page.evaluate(() => ({ tailored: !!(S.draft && S.draft.tailored), rows: document.querySelectorAll('#v-today .hero .hl-row').length }));
  log('Veil:', veil, JSON.stringify(after));
  if (!(veil > .95) || !after.tailored) fail('relance depuis « Choisir une autre séance » : voile opaque, séance sur mesure');

  // 2. séries plafonnées : intermédiaire rapide, 20 min → au moins 3 exercices, jamais 5 séries
  await page.evaluate(() => { S.goals.level = 'intermediaire'; S.goals.overall = 'hypertrophie'; S.goals.senior = false; });
  await hist([2, 4, 6, 9, 11, 13], ['pompes', 'squat_pdc', 'rowing_haltere'], true);
  const caps = await page.evaluate(async () => { const r = [];
    for (const equip of ['none', 'all']) for (let k = 0; k < 6; k++) { const s = await tailorGenerate({ kind: 'renfo', zone: 'full', equip, len: 'court' }, null, { fast: true });
      const by = {}; s.exos.forEach(x => { const m = EXO_MAP[x.exoId].muscles[0]; by[m] = (by[m] || 0) + x.sets.length; });
      r.push({ n: s.exos.length, max: Math.max(...s.exos.map(x => x.sets.length)), mus: Math.max(...Object.values(by)) }); }
    S.goals.level = 'debutant'; const d = generateEngineSession('full'); S.goals.level = 'intermediaire';
    return { r, deb: Math.max(...d.exos.map(x => x.targetSets)) }; });
  log('Caps:', JSON.stringify(caps));
  if (caps.r.some(x => x.n < 3 || x.max > 4 || x.mus > 8) || caps.deb > 3) fail('séries plafonnées, le temps rempli par des exercices');

  // 3. situations délicates : reprise après 3 semaines, jambes travaillées hier (séance bas du corps)
  await hist([20, 23, 26], ['pompes', 'squat_pdc'], false);
  const back = await page.evaluate(async () => { const s = await tailorGenerate({ kind: 'renfo', zone: 'full', equip: 'all', len: 'moyen' }, null, { fast: true }); return { reason: s.reason || '', max: Math.max(...s.exos.map(x => x.sets.length)) }; });
  await hist([1, 4, 6, 9], ['squat_pdc', 'fentes_marchees', 'pont_fessier'], false);
  const legs = await page.evaluate(async () => { const s = await tailorGenerate({ kind: 'renfo', zone: 'bas', equip: 'all', len: 'moyen' }, null, { fast: true });
    return { reason: s.reason || '', quad: s.exos.filter(x => EXO_MAP[x.exoId].muscles[0] === 'quadriceps').map(x => x.sets.length) }; });
  log('Comeback:', JSON.stringify(back), '| Tired legs:', JSON.stringify(legs));
  if (!/reprise après 20 jours/.test(back.reason) || back.max > 3) fail('reprise : une série de moins, dit franchement');
  if (/pectoraux|dos/.test(legs.reason) || !/moins de 48 h/.test(legs.reason) || legs.quad.some(n => n > 3)) fail('muscles fatigués : séance plus légère, raison sur la bonne zone');

  // 4. peu d'exercices possibles (dos sans matériel) : pas de séries gonflées, durée dite franchement
  const thin = await page.evaluate(async () => { const s = await tailorGenerate({ kind: 'renfo', zone: 'pull', equip: 'none', len: 'long' }, null, { fast: true });
    return { n: s.exos.length, max: Math.max(...s.exos.map(x => x.sets.length)), reason: s.reason || '' }; });
  log('Thin pool:', JSON.stringify(thin));
  if (thin.max > 4 || thin.n < 4 || !/au lieu de 60/.test(thin.reason)) fail('peu d\'exercices : pas de séries gonflées, durée annoncée');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
