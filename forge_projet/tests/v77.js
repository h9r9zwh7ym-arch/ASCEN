// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.11.0 : remplacement intelligent (meilleurs équivalents en tête, charge convertie), records sobres d'un
// exercice (meilleure série, paliers par charge, prochaine cible), sauvegarde sous un nom fixe (remplace la
// précédente), rappel plus fréquent, et sauvegarde automatique là où le navigateur le permet.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v77'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true, kettlebell: true } }, settings: { todayTab: 'proposal' } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);

  // 1. remplacement intelligent : 3 suggestions du même muscle, même nature en tête, dose calculée,
  //    charge convertie depuis l'exercice remplacé (jamais fait)
  const r = await page.evaluate(() => {
    S.sessions = []; sessionTouched();
    S.draft = generateEngineSession('full'); const i = S.draft.exos.findIndex(e => kgType(EXO_MAP[e.exoId]));
    const cur = EXO_MAP[S.draft.exos[i].exoId]; S.draft.exos[i].sets.forEach(st => { st.weight = 20; }); S.draft.exos[i].pw = 20; save();
    const sug = smartReplacements(S.draft, i);
    const kg = sug.find(x => kgType(x.e));
    const conv = kg ? replacementEntry(S.draft, i, kg.e).pw : null;
    ACT.swapExoOpen({ idx: i }); const block = !!document.querySelector('#pickerList .pick-h.sug');
    const first = (document.querySelector('#pickerList .pick-h.sug + .group .pick-row') || {}).dataset;
    closeSheet();
    return { n: sug.length, same: sug.every(x => x.e.muscles[0] === cur.muscles[0]), kind: exoKind(sug[0].e) === exoKind(cur), dose: sug.every(x => /\d/.test(x.dose)), conv, block, first: first && first.id === sug[0].e.id };
  });
  log('Replace:', JSON.stringify(r));
  if (r.n !== 3 || !r.same || !r.kind || !r.dose || !r.block || !r.first) fail('remplacement intelligent : suggestions en tête');
  if (r.conv != null && !(r.conv > 0)) fail('charge convertie');
  await page.waitForTimeout(400);

  // 2. records d'un exercice : meilleure série, paliers par charge, prochaine cible
  const rec = await page.evaluate(async () => {
    const t = todayISO();
    S.sessions = [3, 6, 9].map((k, j) => ({ id: 's' + k, date: addDaysISO(t, -k), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 8 + j, weight: 20, done: true }, { reps: 6, weight: 22 + j * 2, done: true }] }] }));
    sessionTouched(); save(); ACT.openExoChart({ id: 'dc_haltere' }); await new Promise(x => setTimeout(x, 600));
    const g = document.querySelector('#overlay .exo-rec'); const out = { rows: g ? [...g.querySelectorAll('.rec-row .t')].map(x => x.textContent) : [], tiers: g ? g.querySelectorAll('.rec-tiers span').length : 0 };
    closeSheet(); return out;
  });
  log('Records:', JSON.stringify(rec));
  if (!rec.rows.includes('Meilleure série') || !rec.rows.includes('Prochaine cible') || rec.tiers < 2) fail('records sobres d\'un exercice');
  await page.waitForTimeout(400);

  // 3. sauvegarde : nom fixe (remplace la précédente), rappel après une semaine et trois séances
  const bk = await page.evaluate(async () => {
    let name = null; navigator.canShare = () => true; navigator.share = async d => { name = d.files[0].name; };
    S.settings.autoBackup = false; await backupData();
    const t = todayISO(); S.meta.lastBackup = addDaysISO(t, -8); S.meta.backupSessions = 0; delete S.meta.backupSnooze;
    S.sessions = [1, 2, 3].map(k => ({ id: 'b' + k, date: addDaysISO(t, -k), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] })); sessionTouched();
    const due = backupDue(); S.meta.backupSessions = 2; const notYet = backupDue();
    return { name, due, notYet, auto: typeof autoBackup === 'function' };
  });
  log('Backup:', JSON.stringify(bk));
  if (bk.name !== 'ASCEN-sauvegarde.json' || !bk.due || bk.notYet || !bk.auto) fail('sauvegarde : nom fixe, rappel');

  // 4. sauvegarde automatique (navigateur qui sait écrire dans un fichier) : réécrite après une séance
  if (!wk) {
    const au = await page.evaluate(async () => {
      let written = ''; const h = { queryPermission: async () => 'granted', createWritable: async () => ({ write: async s => { written = s; }, close: async () => {} }) };
      window.showSaveFilePicker = async () => h; fsHandle = async set => (set === undefined ? h : null);
      S.settings.autoBackup = true; const ok = await autoBackup(); S.settings.autoBackup = false;
      return { ok, json: written.startsWith('{"app":"ASCEN"') };
    });
    log('Auto backup:', JSON.stringify(au));
    if (!au.ok || !au.json) fail('sauvegarde automatique');
  }

  // 5. 2.12.0 : montagne en profondeur — plans séparés, le glissé incline la scène (sans ouvrir de bulle),
  //    plans déplacés à des vitesses différentes, bouton « mouvement du téléphone »
  await page.evaluate(() => { const t = todayISO(); S.sessions = [2, 4, 6].map(k => ({ id: 'p' + k, date: addDaysISO(t, -k), exos: [{ exoId: 'pompes', sets: [1, 2, 3].map(() => ({ reps: 12, done: true })) }] })); sessionTouched(); save(); ACT.openAscent(); });
  await page.waitForSelector('#ascScene.ready .asc-l-main', { timeout: 8000 }); await page.waitForTimeout(2600);
  const b0 = await page.evaluate(() => { const r = document.querySelector('#ascScene').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height,
    layers: ['asc-l-sky', 'asc-l-far', 'asc-l-main', 'asc-l-fog'].map(c => !!document.querySelector('#ascScene .' + c)), gyro: !!document.querySelector('#ascScene .asc-gyro') }; });
  await page.mouse.move(b0.x + b0.w * .25, b0.y + b0.h * .55); await page.mouse.down(); await page.mouse.move(b0.x + b0.w * .8, b0.y + b0.h * .55, { steps: 8 }); await page.waitForTimeout(500);
  const mv = await page.evaluate(() => { const tx = c => { const m = new DOMMatrix(getComputedStyle(document.querySelector('#ascScene .' + c)).transform); return m.m41; };
    return { sky: tx('asc-l-sky'), main: tx('asc-l-main') }; });
  await page.mouse.up(); await page.waitForTimeout(200);
  const bub = await page.evaluate(() => !!document.querySelector('#ascScene .asc-bub.on, #ascScene .asc-bub:not([hidden])'));
  log('Depth:', JSON.stringify(b0.layers), 'gyro', b0.gyro, JSON.stringify(mv), 'bubble after drag', bub);
  if (!b0.layers.every(Boolean) || !(mv.main > mv.sky + 2) || !(mv.main > 3)) fail('montagne en profondeur : plans et glissé');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
