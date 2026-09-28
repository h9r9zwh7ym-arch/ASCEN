// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright');
const path = require('path');
const OUT = (OUT_ROOT + '/v17');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE==='webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args:['--autoplay-policy=no-user-gesture-required'] }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${wk?'wk_':''}${n}.png` });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  log('Exercises:', await page.evaluate(() => EXOS.length), 'all pictos:', await page.evaluate(() => EXOS.every(e => PICTO_OF[e.id])));
  await page.click('[data-a="todayMode"][data-v="proposal"]'); await wait(400);
  log('Audio ctx:', await page.evaluate(() => AC ? AC.state : 'none'));
  // chaque son se joue sans erreur
  log('All sounds ok:', await page.evaluate(() => { try { Object.keys(SFX).forEach(k => sfx(k, true)); return Object.keys(SFX).length; } catch (e) { return 'ERR ' + e.message; } }));
  await shot('01_proposal');
  log('Primary buttons in view:', await page.$$eval('#v-today .btn.big, #v-today .hero-go', e => e.length));
  // picker nouvelles entrées
  await page.click('[data-a="todayMode"][data-v="custom"]'); await wait(400);
  await page.click('[data-a="customAddOpen"]'); await wait(400);
  await page.fill('#pickerSearch', 'pallof'); await wait(200);
  log('Search pallof (needs bands -> maybe 0):', await page.$$eval('.pick-row', e => e.length));
  await page.fill('#pickerSearch', 'archer'); await wait(200);
  log('Search archer:', await page.$$eval('.pick-row .t', e => e.map(x => x.textContent)));
  await page.fill('#pickerSearch', ''); await wait(200);
  await page.click('[data-a="pickerMuscle"][data-v="abdos"]'); await wait(200);
  await shot('02_picker');
  await page.click('.sheet-hd [data-a="closesheet"]'); await wait(400);
  // info sheet muscles neutres
  await page.evaluate(() => ACT.showExoInfo({ id: 'russian_twist' })); await wait(400);
  await shot('03_info');
  log('Main muscle chip:', await page.textContent('.mchip.main'));
  await page.click('.sheet-hd [data-a="closesheet"]'); await wait(400);
  // réglage son
  await page.click('.tabbtn[data-id="profil"]'); await wait(500);
  await page.$eval('[data-a="toggleSound"]', e => e.scrollIntoView({ block: 'center' }));
  await page.click('[data-a="toggleSound"]'); await wait(200);
  log('Sound setting after toggle:', await page.evaluate(() => S.settings.sound), 'switch on:', await page.$eval('[data-a="toggleSound"]', e => e.classList.contains('on')));
  await shot('04_profile_sound');
  await page.click('[data-a="toggleSound"]'); await wait(200);
  // séance : progression animée
  await page.click('.tabbtn[data-id="today"]'); await wait(400);
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 2 }, { exoId: 'russian_twist', sets: 2 }], name: 'Sons' }; save(); renderViewAnimated('today'); });
  await wait(300);
  await page.click('.hero-go');
  await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  await page.click('[data-a="validateSet"]'); await wait(120);
  log('Seg grew:', await page.$$eval('.lp-seg.grew', e => e.length));
  await wait(600);
  log('Pct:', await page.textContent('.lh-pct b'));
  await shot('05_live');
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
