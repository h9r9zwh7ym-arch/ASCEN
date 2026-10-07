// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v2.3 : modifier une séance enregistrée, objectifs chiffrés, bilan en image
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v24'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const mk = (id, date, w, reps, pr) => ({ id, date, source: 'custom', startedAt: date + 'T08:00:00.000Z', completedAt: date + 'T08:40:00.000Z', durationSec: 2400,
      exos: [{ exoId: 'dc_haltere', sets: [{ reps, weight: w, done: true, ...(pr ? { pr: true } : {}) }, { reps, weight: w, done: true }] }, { exoId: 'pompes', sets: [{ reps: 12, done: true }] }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, prCount: 1 }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [10, 12, 14, 16, 18, 20, 22] } },
      sessions: [mk('s1', '2026-08-03', 20, 10), mk('s2', '2026-08-10', 22, 8, true), mk('s3', '2026-08-17', 22, 9)] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(400);

  // ---- 1. modifier une séance
  await page.evaluate(() => switchTab('history')); await wait(500);
  await page.click('[data-a="openSessionDetail"][data-id="s2"]'); await wait(500);
  await page.click('[data-a="histEdit"]'); await wait(500); await shot('01_edit');
  // s2 : 22 kg → 18 kg sur les deux séries, 8 → 11 répétitions sur la première, suppression des pompes, ajout d'une série
  const w = page.locator('.he-in[data-k="weight"]');
  await w.nth(0).fill('18'); await w.nth(0).blur(); await w.nth(1).fill('18,5'); await w.nth(1).blur();
  const r = page.locator('.he-in[data-k="reps"]'); await r.nth(0).fill('11'); await r.nth(0).blur();
  await page.click('[data-a="heDelExo"][data-i="1"]'); await wait(200);
  await page.click('[data-a="heAddSet"][data-i="0"]'); await wait(200);
  await page.fill('.he-in[data-k="min"]', '52'); await page.locator('.he-in[data-k="min"]').blur();
  await shot('02_edit_changed');
  await page.click('[data-a="heSave"]'); await wait(600); await shot('03_after_save');
  const st = await page.evaluate(() => { persistNow(); const s = S.sessions.find(x => x.id === 's2'), s3 = S.sessions.find(x => x.id === 's3');
    return { sets: s.exos[0].sets.map(x => x.reps + 'x' + x.weight + (x.pr ? '*' : '')), exos: s.exos.length, dur: s.durationSec, s3pr: s3.exos[0].sets.map(x => !!x.pr), prCount: S.meta.prCount }; });
  log('After edit:', JSON.stringify(st));
  if (st.exos !== 1 || st.sets.length !== 3 || st.dur !== 3120) fail('édition non appliquée');
  if (st.sets.some(x => x.endsWith('*'))) fail('record non recalculé (s2 ne bat plus rien)');
  if (!st.s3pr[0]) fail('record non recalculé (s3 bat désormais s1)');
  // changer la date : la séance est reclassée
  await page.click('[data-a="histEdit"]'); await wait(400);
  await page.fill('.he-date', '2026-07-30'); await page.dispatchEvent('.he-date', 'change');
  await page.click('[data-a="heSave"]'); await wait(500);
  const order = await page.evaluate(() => S.sessions.map(s => s.id).join());
  log('Order after date change:', order); if (order !== 's2,s1,s3') fail('tri après changement de date');
  // tout supprimer est refusé
  await page.click('[data-a="histEdit"]'); await wait(400);
  await page.click('[data-a="heDelExo"][data-i="0"]'); await wait(200); await page.click('[data-a="heSave"]'); await wait(300);
  if (!(await page.$('#heBody'))) fail('séance vide acceptée');
  await page.click('[data-a="heCancel"]'); await wait(400);
  if ((await page.evaluate(() => S.sessions.find(x => x.id === 's2').exos.length)) !== 1) fail('annuler a modifié la séance');
  await page.evaluate(() => closeSheet()); await wait(400);

  // ---- 2. objectifs chiffrés
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'medals' }); }); await wait(500);
  await shot('04_progress_targets_empty');
  await page.click('[data-a="newTarget"]'); await wait(500);
  await page.click('[data-a="pickerTap"][data-id="dc_haltere"]'); await wait(500);
  await shot('05_target_new');
  const draft = await page.evaluate(() => JSON.stringify(targetDraft)); log('Target draft:', draft);
  await page.click('[data-a="tgStep"][data-d^="-"]'); await wait(150);
  await page.click('[data-a="tgStep"]:not([data-d^="-"])'); await wait(150);
  await page.click('[data-a="saveTarget"]'); await wait(500);
  // un 2e objectif en répétitions (pompes)
  await page.click('[data-a="newTarget"]'); await wait(500);
  await page.click('[data-a="pickerTap"][data-id="pompes"]'); await wait(400);
  await page.click('[data-a="saveTarget"]'); await wait(500);
  const tg = await page.evaluate(() => S.targets.map(t => t.exoId + ':' + t.kind + ':' + t.value + ':' + t.start));
  log('Targets:', JSON.stringify(tg));
  if (tg.length !== 2 || !/^dc_haltere:kg:24:22$/.test(tg[0]) || !/^pompes:reps:16:12$/.test(tg[1])) fail('objectifs mal créés');
  await page.evaluate(() => document.querySelector('#v-progress').scrollTo(0, 0)); await wait(300); await shot('06_progress_targets');
  // séance qui atteint l'objectif de charge
  await page.evaluate(() => { S.draft = { id: 'live1', date: todayISO(), source: 'custom', startedAt: new Date(Date.now() - 1800000).toISOString(),
    exos: [{ exoId: 'dc_haltere', targetSets: 1, sets: [{ reps: 6, weight: 24, done: true }] }] }; save(); finalizeSession(); });
  await wait(1400); await shot('07_celebration_target');
  const cel = await page.$eval('.cel-target', e => e.textContent).catch(() => null); log('Celebration:', cel);
  if (!cel || !/24 kg/.test(cel)) fail('objectif atteint non célébré');
  const done = await page.evaluate(() => S.targets.filter(t => t.doneAt).length); if (done !== 1) fail('objectif non marqué atteint');
  await page.evaluate(() => closeSheet()); await wait(400);
  // relever la barre d'un objectif atteint le rouvre
  await page.evaluate(() => { progressTab = 'medals'; switchTab('progress'); renderView('progress'); }); await wait(500);
  await page.click('.tg-row.done'); await wait(400);
  await page.click('[data-a="tgStep"]:not([data-d^="-"])'); await wait(150);
  const reopen = await page.evaluate(() => S.targets[0]); log('Raised:', JSON.stringify(reopen));
  if (reopen.doneAt || reopen.value !== 25) fail('relever un objectif atteint');
  await page.click('[data-a="delTarget"]'); await wait(400);
  if ((await page.evaluate(() => S.targets.length)) !== 1) fail('suppression objectif');

  // ---- 3. bilan en image
  await page.evaluate(() => switchTab('history')); await wait(500);
  await page.click('[data-a="openRecap"]'); await wait(900); await shot('08_recap_month');
  const rc1 = await page.evaluate(() => ({ r: recap, src: (document.querySelector('#rcImg') || {}).src || '' }));
  log('Recap month:', JSON.stringify(rc1.r), rc1.src.length);
  if (!rc1.src.startsWith('data:image/png') || rc1.src.length < 20000) fail('image du bilan');
  const stA = await page.evaluate(() => JSON.stringify(recapStats('month', '2026-08')));
  log('Stats août:', stA);
  if (!/"n":2,"prevN":1/.test(stA)) fail('stats du mois');
  await page.click('[data-a="recapStep"][data-d="-1"]'); await wait(400);
  await page.click('[data-a="recapKind"][data-v="year"]'); await wait(700); await shot('09_recap_year');
  const rc2 = await page.evaluate(() => recap); log('Recap year:', JSON.stringify(rc2)); if (rc2.kind !== 'year') fail('bilan annuel');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('[data-a="recapShare"]')]);
  log('Download:', dl ? dl.suggestedFilename() : null); if (!dl) fail('export image');
  await page.evaluate(() => closeSheet()); await wait(400);

  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
