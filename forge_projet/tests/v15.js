// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright');
const path = require('path');
const OUT = (OUT_ROOT + '/v15');
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
  await wait(900);
  await shot('01_home_fresh');
  log('Hero kind:', await page.$eval('.hero', e => e.className));
  // seed: template planned today + another, name, history
  await page.evaluate(() => {
    S.settings.name = 'Yannick Wahler';
    const wd = weekdayIdx(todayISO());
    S.templates = [
      { id:'t1', n:'Push haltères', days:[wd], exos:[{exoId:'dc_haltere',sets:4},{exoId:'pompes',sets:3},{exoId:'elevations_laterales',sets:3},{exoId:'extension_triceps',sets:3}] },
      { id:'t2', n:'Jambes', days:[(wd+2)%7], exos:[{exoId:'squat_gobelet',sets:4},{exoId:'fentes',sets:3}] },
      { id:'t3', n:'Dos & biceps', days:[], exos:[{exoId:'rowing_uni_haltere',sets:4},{exoId:'curl_biceps',sets:3}] },
      { id:'t4', n:'Gainage', days:[], exos:[{exoId:'planche',sets:3},{exoId:'crunch',sets:3}] },
    ].map(t=>({ ...t, exos:t.exos.filter(e=>EXO_MAP[e.exoId]) }));
    S.settings.todayTab = 'custom';
    save(); persistNow();
  });
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await wait(900);
  await shot('02_home_planned');
  log('Hero title:', await page.textContent('.hero-title'), '| greeting:', await page.textContent('.home .lt'));
  // chevron size
  log('Chevron box:', JSON.stringify(await page.$eval('.sec-chev svg', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; })));
  // scroll to templates, toggle one: expect animated height
  await page.$eval('.tpl-section', e => e.scrollIntoView({ block: 'center' }));
  await wait(300);
  const head = await page.$('.tpl-card2 .tc-head');
  await head.click();
  await wait(90);
  const midH = await page.$eval('.tpl-card2 .clp', e => e.style.height);
  log('Mid-animation inline height (should be px):', midH);
  await wait(500);
  log('Open card has actions:', !!(await page.$('.tpl-card2.open .tc-actions')), 'inline height cleared:', await page.$eval('.tpl-card2 .clp', e => e.style.height === ''));
  await shot('03_tpl_open');
  await page.click('.tpl-card2.open .tc-head'); await wait(450);
  log('Closed card body empty:', await page.$eval('.tpl-card2 .clp', e => e.innerHTML === ''));
  await page.click('[data-a="tplShowAll"]'); await wait(500);
  log('Cards after show all:', await page.$$eval('.tpl-card2', e => e.length));
  await page.click('[data-a="toggleSection"][data-k="planOpen"]'); await wait(450);
  log('Planning collapsed:', await page.$eval('.week-plan .clp', e => e.innerHTML === ''));
  await page.click('[data-a="toggleSection"][data-k="planOpen"]'); await wait(450);
  log('Planning reopened:', !!(await page.$('.week-plan .wp-days')));
  await shot('04_sections');
  // launch from hero
  await page.$eval('#v-today', e => e.scrollTop = 0);
  await page.click('.hero-go');
  await wait(700);
  await shot('05_launch_count');
  await wait(1300);
  await shot('06_launch_go');
  log('Launch visible:', !!(await page.$('#launch')));
  await page.waitForSelector('#launch', { state: 'detached', timeout: 5000 });
  log('Live after launch:', !!(await page.$('.focus-card')));
  await page.click('[data-a="validateSet"]'); await wait(250);
  log('Float text:', await page.$$eval('.float-txt', e => e.map(x => x.textContent)));
  await shot('07_float');
  // toast position
  await page.evaluate(() => toast('Test du toast'));
  await wait(400);
  log('Toast top:', await page.$eval('#toast', e => Math.round(e.getBoundingClientRect().top)));
  await shot('08_toast');
  // dark
  await page.evaluate(() => { S.draft.startedAt = null; S.draft = null; save(); renderViewAnimated('today'); });
  await page.emulateMedia({ colorScheme: 'dark' });
  await wait(900);
  await shot('09_dark_home');
  await page.click('[data-a="todayMode"][data-v="proposal"]'); await wait(700);
  await shot('10_dark_proposal');
  await page.emulateMedia({ colorScheme: 'light' });
  await wait(300);
  await shot('11_light_proposal');
  await page.click('[data-a="startSession"]');
  await page.waitForSelector('#launch', { state: 'detached', timeout: 5000 });
  log('Proposal launch -> live:', !!(await page.$('.focus-card')));
  // reduced motion launch
  await page.evaluate(() => { S.draft = null; save(); renderViewAnimated('today'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await wait(300);
  await page.click('.hero-go'); await wait(200);
  log('Reduced launch class:', await page.$eval('#launch', e => e.className));
  await page.waitForSelector('#launch', { state: 'detached', timeout: 3000 });
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
