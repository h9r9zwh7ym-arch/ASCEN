// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.14 : copies du jour (7 gardées, restauration et annulation), stockage IndexedDB quand localStorage est
// plein (relancement, puis retour à localStorage), bandeau « Nouvelle version » (jamais pendant une séance,
// « Mettre à jour » rouvre le même écran), transition partagée Résumé → Ta force, unités plus petites,
// chiffres à chasse fixe, file des tâches au retour dans l'app.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v81'); fs.mkdirSync(OUT, { recursive: true });
// servi en http (127.0.0.1 : pas de service worker) : en file://, Chromium relit parfois un localStorage ancien
// d'un onglet à l'autre, ce qui fausse les relances testées ici
const PORT = 8790 + Math.floor(Math.random() * 200);
const srv = require('child_process').spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', path.dirname(path.resolve(process.argv[2]))], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
const APP = `http://127.0.0.1:${PORT}/${path.basename(process.argv[2])}`;
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, profile: { name: 'T' }, settings: {},
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [6, 8, 10, 12, 14, 16, 18, 20] } }, goals: { level: 'intermediaire', daysPerWeek: 3 } })); });
  for (let i = 0; i < 40; i++) { try { await new Promise((ok, ko) => require('http').get(APP, r => { r.resume(); ok(); }).on('error', ko)); break; } catch (e) { await new Promise(r => setTimeout(r, 150)); } }
  let page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const reopen = async () => { await page.waitForTimeout(300); await page.reload(); await boot(); };
  const boot = async () => { await page.waitForFunction(() => !!document.querySelector('.tabbar .tabbtn'), null, { timeout: 8000 }); await page.waitForTimeout(900); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); try { closeSheet(); } catch (e) {} }); await page.waitForTimeout(300); };
  await page.goto(APP); await boot();
  const N = await page.evaluate(() => { const t = todayISO(), ids = ['dc_haltere', 'pompes', 'squat_gobelet', 'rowing_uni_haltere'];
    for (let k = 60; k >= 2; k -= 2) { const st = new Date(addDaysISO(t, -k) + 'T18:00:00').getTime();
      S.sessions.push({ id: 's' + k, date: addDaysISO(t, -k), startedAt: new Date(st).toISOString(), completedAt: new Date(st + 40 * 60e3).toISOString(), durationSec: 2400,
        exos: ids.map(id => ({ exoId: id, targetReps: [8, 12], sets: [1, 2, 3].map(() => ({ reps: 8 + ((60 - k) >> 3), weight: EXO_MAP[id].equip.includes('dumbbells') ? 8 + ((60 - k) >> 4) * 2 : 0, done: true, effort: 2 })) })) }); }
    recomputePRFlags(); sessionTouched(); save(); persistNow(true); return S.sessions.length; });

  // chiffres : chasse fixe, unité plus petite
  const ty = await page.evaluate(() => ({ tab: getComputedStyle(document.body).fontVariantNumeric, a: uHTML('+92 %'), b: uHTML('2 045 m'), c: uHTML('<b>'), d: uHTML('12 kg') }));
  if (!/tabular-nums/.test(ty.tab)) fail('chiffres à chasse fixe : ' + ty.tab);
  if (ty.a !== '+92 <span class="u">%</span>' || ty.b !== '2 045 <span class="u">m</span>' || ty.c !== '&lt;b&gt;' || !/class="u">kg</.test(ty.d)) fail('uHTML : ' + JSON.stringify(ty));

  // copies du jour : une seule par jour, 7 gardées
  await page.waitForTimeout(400);
  const sn = await page.evaluate(async () => {
    const a = await snapDaily(), b = await snapDaily(), l1 = await snapList();
    const t = todayISO(), old = JSON.stringify(Object.assign({}, S, { sessions: S.sessions.slice(0, 3), meta: Object.assign({}, S.meta) }));
    await idbTx(IDB_SNAP, 'readwrite', st => { for (let k = 1; k <= 8; k++) st.put({ data: old, savedAt: Date.now() - k * 864e5, at: Date.now() - k * 864e5, n: 3 }, addDaysISO(t, -k)); st.delete(t); });
    const c = await snapDaily(), l2 = await snapList();
    return { a, b, n1: l1.length, nn: l1[0] && l1[0].n, c, n2: l2.length, first: l2[0].day === t, last: l2[l2.length - 1].day, keep: addDaysISO(t, -6) };
  });
  if (!sn.a || sn.b || sn.n1 !== 1 || sn.nn !== N) fail('copie du jour : ' + JSON.stringify(sn));
  if (!sn.c || sn.n2 !== 7 || !sn.first || sn.last !== sn.keep) fail('7 copies gardées : ' + JSON.stringify(sn));

  // restauration depuis Profil › Données › Copies automatiques, puis « Annuler »
  await page.evaluate(() => { switchTab('profil'); ACT.openData(); }); await page.waitForTimeout(500);
  if (!(await page.$('#overlay [data-a="openSnaps"]'))) fail('ligne « Copies automatiques » absente');
  await page.click('#overlay [data-a="openSnaps"]'); await page.waitForTimeout(700);
  const rows = await page.$$eval('#snapList [data-a="snapRestore"]', b => b.map(x => x.dataset.d));
  const lab = await page.$eval('#snapList', e => e.textContent);
  if (rows.length !== 7 || !/Aujourd'hui/.test(lab) || !/Hier/.test(lab) || /undefined|NaN/.test(lab)) fail('liste des copies : ' + rows.length + ' ' + lab.slice(0, 120));
  await page.screenshot({ path: path.join(OUT, 'snaps.png') });
  await page.click(`#snapList [data-a="snapRestore"][data-d="${rows[1]}"]`); await page.waitForTimeout(500);
  await page.click('#overlay [data-a="confirmYes"]'); await page.waitForTimeout(600);
  const r1 = await page.evaluate(() => S.sessions.length);
  if (r1 !== 3) fail('copie restaurée : ' + r1);
  await page.click('#toast .t-undo'); await page.waitForTimeout(400);
  const r2 = await page.evaluate(() => S.sessions.length);
  if (r2 !== N) fail('annulation de la restauration : ' + r2);

  // localStorage plein : IndexedDB devient le stockage principal, relu au lancement
  await page.evaluate(async () => {
    const o = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) { if (k === STORAGE_KEY && String(v).length > 2000) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } return o.call(this, k, v); };
    S.sessions[S.sessions.length - 1].note = 'gros'; sessionTouched(); save(); persistNow(true);
  });
  await page.waitForTimeout(900);
  const big = await page.evaluate(() => ({ ls: localStorage.getItem(STORAGE_KEY), mark: !!localStorage.getItem(BIG_KEY), toast: document.querySelector('#toast').textContent }));
  if (big.ls !== null || !big.mark) fail('bascule vers IndexedDB : ' + JSON.stringify({ ls: big.ls && big.ls.length, mark: big.mark }));
  if (/Stockage plein/.test(big.toast)) fail('message « Stockage plein » encore affiché');
  await reopen();
  const b2 = await page.evaluate(() => ({ n: S.sessions.length, note: S.sessions[S.sessions.length - 1].note, boot: bootFromIDB, failed: persistFailed, row: storageRowText() }));
  if (b2.n !== N || b2.note !== 'gros' || !b2.boot || (b2.failed && b2.row !== 'Stockage étendu')) fail('relance depuis IndexedDB : ' + JSON.stringify(b2));
  // de la place à nouveau (ici : setItem normal) → retour à localStorage (parfois dès un recalcul au lancement)
  await page.evaluate(() => { S.sessions[S.sessions.length - 1].note = 'retour'; sessionTouched(); save(); persistNow(true); });
  await page.waitForTimeout(500);
  await reopen();
  const b3 = await page.evaluate(() => ({ n: S.sessions.length, note: S.sessions[S.sessions.length - 1].note, boot: bootFromIDB, mark: localStorage.getItem(BIG_KEY) }));
  if (b3.n !== N || b3.note !== 'retour' || b3.boot || b3.mark) fail('retour à localStorage : ' + JSON.stringify(b3));

  // bandeau de mise à jour : « Plus tard », jamais pendant une séance, « Mettre à jour » rouvre le même écran
  await page.evaluate(() => { updPending = true; updShow(); }); await page.waitForTimeout(500);
  if (!(await page.$('#updbar.show [data-a="appUpdate"]'))) fail('bandeau « Nouvelle version » absent');
  await page.screenshot({ path: path.join(OUT, 'update.png') });
  await page.click('#updbar [data-a="updLater"]'); await page.waitForTimeout(600);
  if (await page.$('#updbar')) fail('« Plus tard » ne ferme pas le bandeau');
  const live = await page.evaluate(() => { S.draft = { startedAt: new Date().toISOString(), exos: [] }; updPending = true; updShow(); const on = !!document.querySelector('#updbar'); S.draft = null; return on; });
  if (live) fail('bandeau affiché pendant une séance');
  await page.evaluate(() => { switchTab('progress'); updShow(); }); await page.waitForTimeout(400);
  await page.evaluate(() => { window.__old = 1; }); await page.click('#updbar [data-a="appUpdate"]');
  await page.waitForFunction(() => !window.__old && !!document.querySelector('.tabbar .tabbtn'), null, { timeout: 8000 }); await boot();
  const back = await page.evaluate(() => currentTab);
  if (back !== 'progress') fail('après la mise à jour, écran rouvert : ' + back);

  // transition partagée Résumé → Ta force → Résumé
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'overview', instant: true }); }); await page.waitForTimeout(1200);
  await page.click('.fs-card'); await page.waitForTimeout(800);
  const vt1 = await page.evaluate(() => ({ t: progressTab, hero: !!document.querySelector('.tr-v .u'), named: [...document.querySelectorAll('*')].filter(x => x.style && x.style.viewTransitionName).length, cls: document.documentElement.className }));
  if (vt1.t !== 'force' || !vt1.hero || vt1.named || /vt-/.test(vt1.cls)) fail('Résumé → Ta force : ' + JSON.stringify(vt1));
  await page.click('.back-link'); await page.waitForTimeout(800);
  const vt2 = await page.evaluate(() => ({ t: progressTab, card: !!document.querySelector('.fs-card .fs-v .u'), named: [...document.querySelectorAll('*')].filter(x => x.style && x.style.viewTransitionName).length }));
  if (vt2.t !== 'overview' || !vt2.card || vt2.named) fail('retour au Résumé : ' + JSON.stringify(vt2));

  // retour dans l'app : les tâches passent après les premières images, une à une
  const rq = await page.evaluate(async () => { const seen = []; onResume(() => seen.push(performance.now())); onResume(() => seen.push(performance.now()));
    const t0 = performance.now(); document.dispatchEvent(new Event('visibilitychange')); const sync = seen.length;
    await new Promise(r => setTimeout(r, 600)); return { sync, n: seen.length, first: seen[0] - t0 }; });
  if (rq.sync !== 0 || rq.n !== 2 || !(rq.first > 8)) fail('file au retour : ' + JSON.stringify(rq));

  await browser.close(); srv.kill();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
