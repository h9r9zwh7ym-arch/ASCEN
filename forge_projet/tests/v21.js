// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = (OUT_ROOT + '/v21');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', acceptDownloads: true, hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  await page.addInitScript(() => { window.__wl = 0; Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { window.__wl++; return { released: false, release: async () => { window.__wl--; } }; } }, configurable: true }); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  // ---- moteur de progression : scénarios
  const eng = await page.evaluate(() => {
    S.equipment.owned.dumbbells = true; S.equipment.owned.bench = true; S.equipment.weights.dumbbells = [8, 10, 12];
    const iso = k => addDaysISO(todayISO(), -k);
    const mk = (k, id, sets, tr) => ({ id: 'x' + Math.random(), date: iso(k), source: 'custom', exos: [{ exoId: id, targetReps: tr, sets: sets.map(([r, w, e]) => ({ reps: r, weight: w, done: true, effort: e })) }] });
    const run = (sessions, id) => { S.sessions = sessions; save(); const r = suggestForExo(EXO_MAP[id], 3); return `w=${r.weight} reps=${r.reps.join('/')} | ${r.note || '-'}${r.harder ? ' | harder=' + r.harder : ''}`; };
    const tr = [8, 12];
    return {
      premiere: run([], 'dc_haltere'),
      progression_reps: run([mk(3, 'dc_haltere', [[9, 10], [8, 10], [8, 10]], tr)], 'dc_haltere'),
      haut_fourchette: run([mk(3, 'dc_haltere', [[12, 10], [12, 10], [12, 10]], tr)], 'dc_haltere'),
      haut_mais_a_fond: run([mk(3, 'dc_haltere', [[12, 10, 3], [12, 10, 3], [12, 10, 3]], tr)], 'dc_haltere'),
      facile: run([mk(3, 'dc_haltere', [[11, 10, 1], [11, 10, 1], [11, 10, 1]], tr)], 'dc_haltere'),
      charge_max: run([mk(3, 'dc_haltere', [[12, 12], [12, 12], [12, 12]], tr)], 'dc_haltere'),
      echec_deux_fois: run([mk(6, 'dc_haltere', [[6, 12]], tr), mk(3, 'dc_haltere', [[6, 12], [5, 12]], tr)], 'dc_haltere'),
      reprise: run([mk(30, 'dc_haltere', [[10, 12], [10, 12]], tr)], 'dc_haltere'),
      pompes_prog: run([mk(2, 'pompes', [[10], [9], [9]], [8, 15])], 'pompes'),
      pompes_maitrise: run([mk(2, 'pompes', [[15], [15], [15]], [8, 15])], 'pompes'),
      planche: run([mk(2, 'planche', [[30], [30]], [20, 45])], 'planche'),
    };
  });
  for (const [k, v] of Object.entries(eng)) log('ENGINE', k.padEnd(18), v);
  // ---- séance : ressenti + variante
  await page.evaluate(() => { S.sessions = []; const iso = addDaysISO(todayISO(), -2); S.sessions.push({ id: 'p1', date: iso, source: 'custom', exos: [{ exoId: 'pompes', targetReps: [8, 15], sets: [15, 15, 15].map(r => ({ reps: r, done: true })) }] }); S.custom = { exos: [{ exoId: 'pompes', sets: 2 }, { exoId: 'dc_haltere', sets: 2 }], name: 'Test' }; S.settings.todayTab = 'custom'; save(); renderViewAnimated('today'); });
  await wait(300);
  await page.click('.hero-go'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  log('Wake lock active:', await page.evaluate(() => window.__wl));
  log('Harder note:', await page.textContent('.exo-note').catch(() => 'none'));
  await shot('01_harder');
  await page.click('[data-a="validateSet"]'); await wait(300);
  log('Effort chips:', await page.$$eval('.ef-opts button', e => e.map(x => x.textContent)));
  await page.click('.ef-opts button >> nth=0'); await wait(150);
  log('Effort saved:', await page.evaluate(() => S.draft.exos[0].sets[0].effort));
  await shot('02_effort');
  await page.click('.focus-card [data-a="restSkip"]'); await wait(300);
  log('Warm-up hint on dumbbell first set:', await page.$('.warmup') ? 'shown (should not, a set is done)' : 'hidden');
  await page.evaluate(() => { S.draft = null; save(); renderViewAnimated('today'); }); await wait(300);
  log('Wake lock released:', await page.evaluate(() => window.__wl));
  // ---- volume par muscle
  await page.evaluate(() => { const pad = n => String(n).padStart(2, '0'); for (let k = 1; k < 7; k += 2) S.sessions.push({ id: 'v' + k, date: addDaysISO(todayISO(), -k), source: 'custom', exos: [{ exoId: 'dc_haltere', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 10, done: true })) }, { exoId: 'squat_gobelet', sets: [1, 2, 3].map(() => ({ reps: 10, weight: 10, done: true })) }] }); S.sessions.sort((a, b) => a.date < b.date ? -1 : 1); save(); });
  await page.click('.tabbtn[data-id="progress"]'); await wait(900);
  log('Volume card rows:', await page.$$eval('.wv-row', e => e.length), '| pect:', await page.$eval('.wv-row .wv-v', e => e.textContent), '| foot:', await page.textContent('.wv-foot'));
  await shot('03_volume');
  // ---- sauvegarde / restauration
  await page.click('.tabbtn[data-id="profil"]'); await wait(600);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('[data-a="backupData"]')]);
  const file = OUT + '/backup.json'; await dl.saveAs(file);
  const bk = JSON.parse(fs.readFileSync(file, 'utf8'));
  log('Backup file:', dl.suggestedFilename(), '| app:', bk.app, '| sessions:', bk.data.sessions.length, '| status:', await page.textContent('[data-a="backupData"] .s'));
  await page.evaluate(() => { S.sessions = []; save(); });
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-a="restoreData"]')]);
  await fc.setFiles(file); await wait(500);
  await page.click('[data-a="confirmYes"]'); await wait(700);
  log('Restored sessions:', await page.evaluate(() => S.sessions.length), '| safety copy:', await page.evaluate(() => !!localStorage.getItem('forge.v1.avant-restauration')));
  await shot('04_profil_data');
  await page.click('[data-a="openInstall"]'); await wait(400); await shot('05_install'); await page.evaluate(() => closeSheet()); await wait(350);
  // ---- calendrier
  await page.evaluate(() => { S.templates = [{ id: 't1', n: 'Haut, du corps', days: [0, 3], exos: [{ exoId: 'pompes', sets: 3 }], since: todayISO() }]; save(); });
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  await page.$eval('[data-a="openCalendarExport"]', e => e.scrollIntoView({ block: 'center' }));
  await page.click('[data-a="openCalendarExport"]'); await wait(400);
  await shot('06_calendar');
  await page.click('[data-a="calAlarm"][data-v="15"]');
  const [ics] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="calExport"]')]);
  const icsPath = OUT + '/p.ics'; await ics.saveAs(icsPath); const txt = fs.readFileSync(icsPath, 'utf8');
  log('ICS:', txt.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,TH'), txt.includes('TRIGGER:-PT15M'), txt.includes('SUMMARY:Forge · Haut\\, du corps'), txt.includes('\r\n'));
  // ---- texte agrandi (Dynamic Type simulé)
  await page.addStyleTag({ content: 'html{font-size:23px!important}' }); await wait(300);
  const over = await page.evaluate(() => document.documentElement.scrollWidth);
  log('Large text page width:', over);
  await shot('07_large_text');
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
