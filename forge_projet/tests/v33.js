// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.4 : un seul « L'app choisit », pictogrammes de la carte du jour touchables, plan de séance
// (variété, ordre), pictogrammes animés corrigés, zone travaillée plus fine
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v33'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { todayTab: 'custom' }, equipment: { owned: { dumbbells: true, bench: true, barbell: true, rack: true, pullup_bar: true } }, sessions: [] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);
  // 1. carte principale « Compose ta séance » : Choisir + L'app choisit, rien d'autre
  const card = await page.$$eval('.hero.compose button', b => b.map(x => x.dataset.a));
  // (loi de Hick : « L'app choisit » ouvre la séance de l'app, une seule voie au lieu de deux)
  log('Compose card buttons:', card.join(',')); if (card.join() !== 'customAddOpen,todayMode') fail('un seul « L\'app choisit »');
  await shot('01_compose');
  // 2. carte du jour : chaque pictogramme ouvre la fiche de l'exercice
  await page.evaluate(() => { S.settings.todayTab = 'proposal'; getOrCreateDraft(); renderView('today'); document.getElementById('v-today').scrollTop = 0; }); await wait(500);
  const hp = await page.$$eval('.hero-picts .hp', b => b.map(x => x.dataset.a + ':' + x.dataset.id));
  log('Hero pictos:', hp.length, hp[0]); if (!hp.length || !hp.every(x => x.startsWith('showExoInfo:'))) fail('pictogrammes touchables');
  await page.click('.hero-picts .hp >> nth=0'); await wait(600);
  const sheet = await page.$eval('#overlay .sheet .t, #overlay .sheet-hd .t', e => e.textContent).catch(() => null);
  log('Sheet after tap:', sheet); if (!/Fiche exercice/.test(sheet || '')) fail('fiche ouverte depuis la carte du jour');
  await shot('02_hero_info'); await page.evaluate(() => closeSheet()); await wait(400);
  // 3. plan de séance : gros mouvements d'abord, gainage/mollets à la fin, pas deux fois la même famille en corps complet
  const plan = await page.evaluate(() => {
    let order = 0, fam = 0, muscle = 0; const N = 80;
    for (let k = 0; k < N; k++) { S.goals.exoCount = 6; const d = generateEngineSession('full').exos.map(e => EXO_MAP[e.exoId]);
      const late = d.findIndex(e => e.pattern === 'core' || e.pattern === 'calf'); if (late >= 0 && d.slice(late).some(e => e.pattern !== 'core' && e.pattern !== 'calf')) order++;
      if (new Set(d.map(exoFamily)).size < d.length) fam++;
      if (new Set(d.map(e => e.muscles[0])).size < d.length) muscle++; }
    const haut = generateEngineSession('haut').exos.map(e => EXO_MAP[e.exoId].muscles[0]);
    return { order, fam, muscle, N, haut };
  });
  log('Plan:', JSON.stringify(plan)); if (plan.order || plan.fam > 2 || plan.muscle > 4 || !plan.haut.includes('epaules') || !plan.haut.includes('dos')) fail('plan de séance équilibré');
  // 4. pictogrammes animés : poses complètes, variantes propres (plus de doublons évidents), zone travaillée fine
  const pic = await page.evaluate(() => {
    let bad = 0; EXOS.forEach(e => { const p = animRig(e); for (const P of [p.A, p.B]) for (const k of ['H', 'N', 'P', 'K', 'F', 'E', 'W']) if (!P[k] || P[k].some(v => isNaN(v))) bad++; });
    const same = (a, b) => JSON.stringify(animRig(EXO_MAP[a]).frames) === JSON.stringify(animRig(EXO_MAP[b]).frames);
    const pairs = [['squat_barre', 'squat_pdc'], ['front_squat_barre', 'squat_barre'], ['rowing_inverse_barre', 'rowing_barre'], ['renegade_row', 'rowing_deux_halteres'], ['kickback_fessier_elastique', 'pont_fessier'], ['kb_sumo_deadlift', 'rdl_halteres'], ['curl_incline', 'curl_biceps'], ['fentes_marchees', 'fentes_halteres']];
    const dups = pairs.filter(([a, b]) => EXO_MAP[a] && EXO_MAP[b] && same(a, b)).map(x => x.join('='));
    const floor = animRig(EXO_MAP.floor_press_haltere).env, incl = animRig(EXO_MAP.dc_incline_haltere).env;
    const benchLeft = /M4\.5 16\.3h13\.5/.test(floor) || /M4\.5 16\.3h13\.5/.test(incl);
    return { bad, dups, benchLeft };
  });
  await page.evaluate(() => ACT.showExoInfo({ id: 'squat_barre' })); await wait(600);
  const sw = await page.$eval('.exo-anim .ea-focus', e => parseFloat(getComputedStyle(e).strokeWidth)).catch(() => 0);
  log('Pictos:', JSON.stringify(pic), '| focus stroke:', sw);
  if (pic.bad || pic.dups.length || pic.benchLeft || !(sw > 1.75 && sw < 2.6)) fail('pictogrammes animés');
  await shot('03_anim_focus');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
