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

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
