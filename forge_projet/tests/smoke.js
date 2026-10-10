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
  await page.goto(file);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  { const b = await page.$('[data-a="todayMode"][data-v="proposal"]'); if (b) { await b.click(); await page.waitForTimeout(300); } }
  await page.waitForTimeout(300);

  const tabs = await page.$$eval('.tabbtn', els => els.map(e => e.dataset.id));
  console.log('Tabs found:', tabs);

  for (const t of tabs) {
    await page.click(`.tabbtn[data-id="${t}"]`);
    await page.waitForTimeout(200);
  }

  // Aujourd'hui: check start session flow
  await page.click('.tabbtn[data-id="today"]');
  await page.waitForTimeout(150);
  { const b = await page.$('[data-a="todayMode"][data-v="proposal"]'); if (b) { await b.click(); await page.waitForTimeout(300); } }
  const startBtn = await page.$('[data-a="startSession"]');
  if (startBtn) {
    await startBtn.click();
    await page.waitForTimeout(150);
    const checkBtn = await page.$('[data-a="validateSet"]');
    if (checkBtn) {
      await checkBtn.click();
      await page.waitForTimeout(150);
    }
    const finishBtn = await page.$('[data-a="finishSession"]');
    if (finishBtn) {
      await finishBtn.click();
      await page.waitForTimeout(150);
      const feelBtn = await page.$('.center-modal [data-a="confirmYes"]');
      if (feelBtn) {
        await feelBtn.click();
        await page.waitForTimeout(800);
        const cont = await page.$('.center-modal [data-a="closesheet"]');
        if (cont) { await cont.click(); await page.waitForTimeout(400); }
      }
    }
  } else {
    console.log('No start button found!');
  }

  await page.click('.tabbtn[data-id="history"]');
  await page.waitForTimeout(150);
  await page.click('.tabbtn[data-id="progress"]');
  await page.waitForTimeout(150);
  await page.click('.tabbtn[data-id="profil"]');
  await page.waitForTimeout(150);

  // open a few profil sheets
  for (const sel of ['[data-a="openEquip"]', '[data-a="openGoals"]', '[data-a="openExoPrefs"]', '[data-a="openDataMore"]', '[data-a="openAbout"]']) {
    const el = await page.$(sel);
    if (el) {
      await el.click();
      await page.waitForTimeout(150);
      const closeBtn = await page.$('.sheet-hd [data-a="closesheet"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(250);
    } else {
      errors.push('MISSING SELECTOR: ' + sel);
    }
  }

  const bodyText = await page.textContent('#v-today');
  console.log('Today view text length:', bodyText.length);

  await browser.close();

  if (errors.length) {
    console.log('=== ERRORS ===');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('=== NO ERRORS ===');
  }
})();
