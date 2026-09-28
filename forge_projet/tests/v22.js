// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = (OUT_ROOT + '/v22'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(500);
  log('Onboarding shown:', !!(await page.$('.ob-body')));
  await shot('01_welcome');
  await page.fill('#obName', 'Yannick'); await page.click('[data-a="obNext"]'); await wait(500);
  await page.click('[data-a="obEquip"][data-id="dumbbells"]'); await page.click('[data-a="obEquip"][data-id="bench"]'); await wait(200);
  await page.fill('#obDb', '6, 8,10 ; 12,5'); await shot('02_equip');
  await page.click('[data-a="obNext"]'); await wait(500);
  log('Dumbbells parsed:', await page.evaluate(() => JSON.stringify(S.equipment.weights.dumbbells)));
  await page.click('[data-a="obGoal"][data-v="force"]'); await page.click('[data-a="obDays"][data-v="4"]'); await page.click('[data-a="obLen"][data-v="court"]');
  await shot('03_goal');
  await page.click('[data-a="obNext"]'); await wait(500); await shot('04_week');
  await page.click('[data-a="obFinish"][data-v="plan"]'); await wait(1200);
  log('After onboarding:', await page.evaluate(() => JSON.stringify({ name: S.settings.name, goal: S.goals.overall, days: S.goals.daysPerWeek, len: S.goals.sessionLength, tpl: S.templates.map(t => t.n + '[' + t.days + ']'), onb: S.meta.onboarded })));
  await page.evaluate(() => document.querySelector('#v-today').scrollTo(0, 0)); await wait(400); await shot('05_home');
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(500);
  log('Not shown again:', !(await page.$('.ob-body')));
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
