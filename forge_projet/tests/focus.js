// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const { chromium } = require('playwright'); const __pw = require('playwright');
const path = require('path');

(async () => {
  const browser = await (process.env.ENGINE==='webkit' ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  const file = 'file://' + path.resolve(process.argv[2]);
  const shotDir = path.dirname(process.argv[2]) ? (OUT_ROOT + '') : '.';

  await page.goto(file);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  { const b = await page.$('[data-a="todayMode"][data-v="proposal"]'); if (b) { await b.click(); await page.waitForTimeout(300); } }
  await page.waitForTimeout(200);

  await page.click('[data-a="startSession"]'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/focus1_sets.png` });

  // exercise info sheet
  await page.click('[data-a="showExoInfo"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/focus2_info.png` });
  await page.click('.sheet-hd [data-a="closesheet"]');
  await page.waitForTimeout(300);

  // step reps/weight
  const repsBefore = await page.$eval('.big-stepper .bs-val', el => el.textContent);
  await page.click('[data-a="stepReps"][data-d="1"]');
  await page.waitForTimeout(100);
  const repsAfter = await page.$$eval('.big-stepper .bs-val', els => els[0].textContent);
  console.log('Reps before/after +1:', repsBefore, repsAfter);

  // validate set -> should show rest ring
  await page.click('[data-a="validateSet"]');
  await page.waitForTimeout(300);
  const hasRing = await page.$('.ring-wrap');
  console.log('Rest ring shown after validating set:', !!hasRing);
  await page.screenshot({ path: `${shotDir}/focus3_rest.png` });

  // skip rest
  await page.click('[data-a="restSkip"]');
  await page.waitForTimeout(200);
  const ringGoneAfterSkip = await page.$('.ring-wrap');
  console.log('Ring gone after skip:', !ringGoneAfterSkip);

  // validate remaining sets of exercise 1 to trigger auto-advance
  for (let i = 0; i < 4; i++) {
    const btn = await page.$('[data-a="validateSet"]');
    if (!btn) break;
    await btn.click();
    await page.waitForTimeout(150);
    const skip = await page.$('[data-a="restSkip"]');
    if (skip) { await skip.click(); await page.waitForTimeout(150); }
  }
  const nameAfterAdvance = await page.$eval('.fc-name', el => el.textContent);
  console.log('Exercise name after auto-advance (should differ from first):', nameAfterAdvance);

  // navigation
  await page.click('[data-a="focusPrev"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/focus4_prev.png` });

  // overview sheet
  await page.click('[data-a="openOverview"]');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shotDir}/focus5_overview.png` });
  const overviewRows = await page.$$eval('.sheet-body .row', els => els.length);
  console.log('Overview rows:', overviewRows);
  await page.click('.sheet-hd [data-a="closesheet"]');
  await page.waitForTimeout(300);

  // dark mode
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${shotDir}/focus6_dark.png` });

  // reduced motion
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'light' });
  await page.click('[data-a="focusNext"]');
  await page.waitForTimeout(200);

  await browser.close();

  if (errors.length) {
    console.log('=== ERRORS ===');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('=== NO ERRORS ===');
  }
})();
