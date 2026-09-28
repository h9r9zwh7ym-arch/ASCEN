// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright');
const path = require('path');
const OUT = (OUT_ROOT + '/v16');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE==='webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
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
  // petite séance de 3 exercices à 2 séries
  await page.evaluate(() => {
    S.custom = { exos:[{exoId:'pompes',sets:2},{exoId:'squat_gobelet',sets:2},{exoId:'planche',sets:2}].filter(e=>EXO_MAP[e.exoId]), name:'Test live' };
    S.settings.todayTab='custom'; save(); renderViewAnimated('today');
  });
  await wait(400);
  await page.click('.hero-go');
  await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  await wait(300);
  await shot('01_live');
  log('Clock:', await page.textContent('#liveClock'), '| pct:', await page.textContent('.lh-pct b'), '| up next:', await page.textContent('.up-next .un-t').catch(()=>null));
  await page.click('[data-a="stepReps"][data-d="1"]'); await wait(80);
  log('Roll class:', await page.$eval('.bs-val', e => e.className));
  await page.click('[data-a="validateSet"]'); await wait(300);
  await shot('02_rest');
  // fin du repos rapide -> animation ready
  await page.evaluate(() => { restState.endAt = Date.now()+2500; });
  await wait(900);
  log('Ring ending class:', await page.$eval('.ring-wrap', e => e.classList.contains('ending')));
  await wait(2200);
  log('Ready pulse:', await page.$eval('.validate', e => e.classList.contains('ready')));
  await page.click('[data-a="validateSet"]'); await wait(400);
  log('After exo 1 done, current:', await page.textContent('.fc-name'), '| float:', await page.$$eval('.float-txt', e=>e.map(x=>x.textContent)));
  await shot('03_after_exo');
  // sauter au 3e, le terminer, le 2e reste à faire
  await page.click('[data-a="restSkip"]').catch(()=>{}); await wait(200);
  await page.click('.ls-chip >> nth=2'); await wait(300);
  for (let i=0;i<2;i++){ await page.click('[data-a="validateSet"]'); await wait(200); const sk = await page.$('.focus-card [data-a="restSkip"]'); if (sk){ await sk.click(); await wait(150);} }
  log('After exo 3 -> goes to undone exo 2:', await page.textContent('.fc-name'));
  await page.click('[data-a="openOverview"]'); await wait(400);
  log('Overview groups:', await page.$$eval('.ov-h', e => e.map(x => x.textContent.trim())));
  await shot('04_overview');
  await page.click('.sheet-hd [data-a="closesheet"]'); await wait(350);
  await page.click('.fc-menu'); await wait(350);
  log('Menu items:', await page.$$eval('.menu-list button', e => e.map(x => x.textContent.trim())));
  await shot('05_menu');
  await page.click('.center-modal [data-a="closesheet"]'); await wait(350);
  for (let i=0;i<2;i++){ await page.click('[data-a="validateSet"]'); await wait(200); const sk = await page.$('.focus-card [data-a="restSkip"]'); if (sk){ await sk.click(); await wait(150);} }
  await wait(600);
  log('Complete card:', !!(await page.$('.complete-card')), '| restbar shown:', await page.$eval('#restbar', e => e.classList.contains('show')));
  await shot('06_complete');
  await page.emulateMedia({ colorScheme: 'dark' }); await wait(300);
  await shot('07_complete_dark');
  await page.click('.complete-card [data-a="finishSession"]'); await wait(1200);
  log('Celebration:', !!(await page.$('.center-modal')));
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
