// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.5 : pictogrammes sur squelette — longueurs d'os constantes à chaque image, appuis atteints
// (pieds au sol, mains sur la barre), rien sous le sol, un pictogramme propre à chaque exercice,
// épaules et hanches écartées en vue de face
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v34'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (!localStorage.getItem('forge.v1')) localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, sessions: [] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 });
  const r = await page.evaluate(() => {
    const B = [['N', 'P', 'trunk'], ['P', 'K', 'thigh', 'Q'], ['K', 'F', 'shin'], ['P', 'K2', 'thigh', 'Q2'], ['K2', 'F2', 'shin'], ['N', 'E', 'uarm', 'S'], ['E', 'W', 'farm'], ['N', 'E2', 'uarm', 'S2'], ['E2', 'W2', 'farm']];
    let worst = 0, missing = [], pins = [], under = [];
    EXOS.forEach(e => {
      if (!RIGS[e.id]) { missing.push(e.id); return; }
      const g = animRig(e);
      g.frames.forEach(f => {
        B.forEach(([a, b, l, root]) => { const A = (root && f[root]) || f[a]; const d = Math.hypot(A[0] - f[b][0], A[1] - f[b][1]); worst = Math.max(worst, Math.abs(d - BONE_L[l])); });
        ['F', 'F2', 'W', 'W2', 'K', 'K2', 'E', 'E2', 'P', 'N'].forEach(k => { if (f[k][1] > 21.4) under.push(e.id); });
      });
      ['A', 'B'].forEach(k => { const s = rigSolve(RIGS[e.id][k]); Object.keys(s.pin).forEach(p => { if (Math.hypot(s[p][0] - s.pin[p][0], s[p][1] - s.pin[p][1]) > .35) pins.push(e.id + ':' + k + p); }); });
    });
    const icons = new Set(EXOS.map(e => exoPicto(e))).size;
    const jj = animRig(EXO_MAP.jumping_jacks).A, front = !!jj.S && Math.abs(jj.S[0] - jj.S2[0]) > 2.5;
    return { worst: +worst.toFixed(3), missing, pins: [...new Set(pins)], under: [...new Set(under)], icons, total: EXOS.length, front };
  });
  log('Skeleton check:', JSON.stringify(r));
  if (r.worst > .01) fail('longueurs d\'os constantes');
  if (r.missing.length) fail('chaque exercice a sa pose : ' + r.missing.join(','));
  if (r.pins.length) fail('appuis atteints : ' + r.pins.join(','));
  if (r.under.length) fail('rien sous le sol : ' + r.under.join(','));
  if (r.icons < r.total * .8) fail('pictogrammes propres à chaque exercice');
  if (!r.front) fail('épaules écartées en vue de face');
  // la fiche d'un exercice anime bien le squelette (plusieurs images intermédiaires)
  await page.evaluate(() => ACT.showExoInfo({ id: 'tractions' })); await page.waitForTimeout(700);
  const frames = await page.$eval('.exo-anim .ea-body animate', a => a.getAttribute('values').split(';').length).catch(() => 0);
  log('Animation frames:', frames); if (frames < 9) fail('images intermédiaires');
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_pullup.png` });
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
