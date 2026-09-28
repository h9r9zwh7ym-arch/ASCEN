// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const { chromium } = require('playwright'); const __pw = require('playwright');
const path = require('path');
const OUT = (OUT_ROOT + '/v12');
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await (process.env.ENGINE==='webkit' ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });

  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  { const b = await page.$('[data-a="todayMode"][data-v="proposal"]'); if (b) { await b.click(); await page.waitForTimeout(300); } }
  await wait(600);
  await shot('01_proposal');

  // --- type de séance ---
  const before = await page.$$eval('#v-today .row .t', els => els.map(e => e.textContent));
  await page.click('[data-a="setType"][data-v="bas"]');
  await wait(400);
  log('Plan title after "bas":', await page.textContent('.hero-title, .pc-title'));
  await page.click('[data-a="setType"][data-v="core"]');
  await wait(400);
  log('Plan title after "core":', await page.textContent('.hero-title, .pc-title'));
  await page.click('[data-a="setType"][data-v="auto"]');
  await wait(300);
  const a1 = await page.$$eval('#v-today .row .t', els => els.map(e => e.textContent).join('|'));
  await page.click('[data-a="regenSession"]');
  await wait(300);
  const a2 = await page.$$eval('#v-today .row .t', els => els.map(e => e.textContent).join('|'));
  log('Autre proposition changes exercises:', a1 !== a2);

  // --- info exercice depuis la liste ---
  await page.click('#v-today .row-main');
  await wait(400);
  await shot('02_info');
  await page.click('.sheet-hd [data-a="closesheet"]');
  await wait(350);

  // --- Ma séance ---
  await page.click('[data-a="todayMode"][data-v="custom"]');
  await wait(450);
  await shot('03_custom_empty');
  await page.click('[data-a="customAddOpen"]');
  await wait(400);
  await page.fill('#pickerSearch', 'fente');
  await wait(200);
  const found = await page.$$eval('.pick-row', els => els.length);
  log('Picker search "fente" rows:', found);
  await page.click('.pick-row >> nth=0');
  await page.fill('#pickerSearch', '');
  await page.click('[data-a="pickerMuscle"][data-v="abdos"]');
  await wait(200);
  await page.click('.pick-row >> nth=0');
  await page.click('.pick-row >> nth=1');
  await shot('04_picker');
  log('Picker footer:', await page.textContent('#pickerDone'));
  await page.click('#pickerDone');
  await wait(450);
  const customRows = await page.$$eval('#v-today .group .row', els => els.length);
  log('Custom rows:', customRows);
  await page.click('[data-a="customSets"][data-d="1"] >> nth=0');
  await wait(150);
  await page.click('[data-a="saveTemplateOpen"]');
  await wait(300);
  await page.fill('#tplEdName', 'Gainage + jambes');
  await page.click('#tplEdSaveBtn');
  await wait(400);
  log('Templates:', await page.evaluate(() => S.templates.map(t => t.n)));
  await shot('05_custom_built');

  // --- démarrer ma séance et tout valider ---
  await page.click('[data-a="startCustom"]'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  await wait(400);
  await shot('06_live');
  // edit value modal
  await page.click('[data-a="editVal"][data-f="reps"]');
  await wait(300);
  await page.fill('#numInput', '12');
  await page.keyboard.press('Enter');
  await wait(300);
  log('Reps after edit:', await page.textContent('.bs-val'));
  for (let i = 0; i < 30; i++) {
    const v = await page.$('[data-a="validateSet"]');
    if (!v) break;
    await v.click(); await wait(120);
    if (i === 0) await shot('07_rest');
    const sk = await page.$('.focus-card [data-a="restSkip"]');
    if (sk) { await sk.click(); await wait(120); }
  }
  await page.click('[data-a="finishSession"]');
  await wait(900);
  await shot('08_celebration');
  log('Celebration medals:', await page.$$eval('.cel-medal .cm-t', e => e.map(x => x.textContent)));
  await page.click('.center-modal [data-a="closesheet"]');
  await wait(400);
  log('Done-today card:', !!(await page.$('.hero.done')));
  log('Feeling sheet gone:', !(await page.$('[data-a="setFeelingAndFinish"]')));

  // --- historique ---
  await page.click('.tabbtn[data-id="history"]');
  await wait(400);
  await page.click('#v-history .row');
  await wait(400);
  await shot('09_history_detail');
  await page.click('[data-a="redoSession"]');
  await wait(500);
  log('Redo -> custom mode rows:', await page.$$eval('#v-today .group .row', e => e.length));

  // --- données simulées sur 10 semaines pour les graphiques ---
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('forge.v1'));
    st.equipment.owned.dumbbells = true; st.equipment.owned.bench = true;
    st.equipment.weights.dumbbells = [6, 8, 10, 12, 14, 16];
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const exos = [['dc_haltere', 8], ['rowing_uni_haltere', 10], ['squat_gobelet', 12], ['curl_biceps', 6], ['planche', 0], ['pompes', 0]];
    const sessions = [];
    for (let k = 70; k >= 2; k -= (k % 3 === 0 ? 2 : 3)) {
      const d = new Date(); d.setDate(d.getDate() - k); d.setHours(k % 7 === 0 ? 7 : 18, 30);
      const prog = Math.floor((70 - k) / 14);
      const pick = exos.filter((_, i) => (i + k) % 2 === 0 || i < 2);
      sessions.push({
        id: 'seed' + k, date: iso(d), source: k % 4 === 0 ? 'custom' : 'engine', type: 'auto', resolvedType: k % 2 ? 'haut' : 'full',
        startedAt: d.toISOString(), completedAt: d.toISOString(), durationSec: 1800 + (k % 5) * 600,
        exos: pick.map(([id, w]) => ({ exoId: id, targetSets: 3, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: w ? 10 - j : 12 + prog * 2, weight: w ? w + prog * 2 : null, done: true, pr: j === 0 && k % 9 === 0 })) }))
      });
    }
    st.sessions = sessions.concat(st.sessions);
    st.meta.prCount = 8;
    localStorage.setItem('forge.v1', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await wait(600);
  await shot('10_today_seeded');
  await page.click('.tabbtn[data-id="progress"]');
  await wait(1500);
  await shot('11_progress_overview');
  await page.evaluate(() => document.querySelector('#v-progress').scrollTo(0, 600));
  await wait(300);
  await shot('12_progress_charts');
  await page.evaluate(() => document.querySelector('#v-progress').scrollTo(0, 1200));
  await wait(300);
  await shot('13_progress_charts2');
  // tooltip
  const col = await page.$('.cc-col >> nth=-1');
  await col.click(); await wait(200);
  log('Tooltip text:', await page.textContent('#charttip'), 'visible:', await page.$eval('#charttip', e => e.classList.contains('show')));
  await shot('14_tooltip');

  await page.click('[data-a="progressTab"][data-v="exos"]');
  await wait(800);
  await shot('15_exos');
  await page.click('[data-a="openExoChart"][data-id="dc_haltere"]');
  await wait(1400);
  await shot('16_exo_detail');
  await page.click('.sheet-hd [data-a="closesheet"]');
  await wait(350);

  await page.click('[data-a="progressTab"][data-v="medals"]');
  await wait(1000);
  await shot('17_medals');
  log('Medal cards:', await page.$$eval('.medal-card', e => e.length), 'tiers:', await page.$$eval('.ms-n', e => e.map(x => x.textContent)));
  await page.click('.medal-card >> nth=0');
  await wait(600);
  await shot('18_medal_modal');
  await page.click('.center-modal [data-a="closesheet"]');
  await wait(350);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.click('[data-a="progressTab"][data-v="overview"]');
  await wait(1200);
  await shot('19_dark_overview');
  await page.click('[data-a="progressTab"][data-v="medals"]');
  await wait(1000);
  await shot('20_dark_medals');
  await page.click('.tabbtn[data-id="today"]');
  await wait(600);
  await shot('21_dark_today');

  // streak check (timezone Europe/Zurich)
  log('High tiers:', await page.evaluate(() => MEDALS.filter(m => medalTier(m) >= 3).map(m => m.id + ':' + medalTier(m) + ' v=' + m.val()).join(', ')));
  log('Streak weeks:', await page.evaluate(() => currentStreakWeeks()), 'max:', await page.evaluate(() => maxStreakWeeksEver()), 'level:', await page.evaluate(() => JSON.stringify(levelInfo())));

  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
