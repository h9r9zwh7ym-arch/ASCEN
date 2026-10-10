// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const { chromium } = require('playwright'); const __pw = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await (process.env.ENGINE==='webkit' ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  const file = 'file://' + path.resolve(process.argv[2]);
  await page.goto(file);
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await page.waitForTimeout(200);

  // --- Equipment: enable dumbbells, add weights ---
  await page.click('.tabbtn[data-id="profil"]');
  await page.waitForTimeout(150);
  await page.click('[data-a="openEquip"]');
  await page.waitForTimeout(150);
  await page.click('[data-a="toggleEquip"][data-id="dumbbells"]');
  await page.waitForTimeout(100);
  await page.fill('#wadd-dumbbells', '8');
  await page.click('[data-a="addWeight"][data-id="dumbbells"]');
  await page.waitForTimeout(100);
  await page.fill('#wadd-dumbbells', '12');
  await page.click('[data-a="addWeight"][data-id="dumbbells"]');
  await page.waitForTimeout(100);
  const chipCount = await page.$$eval('.chip.on', els => els.length);
  console.log('Dumbbell weight chips:', chipCount);
  await page.click('.sheet-hd [data-a="closesheet"]');
  await page.waitForTimeout(300);

  // --- Exclude an exercise, verify preference persisted ---
  await page.click('[data-a="openExoPrefs"]');
  await page.waitForTimeout(150);
  await page.click('[data-a="toggleExcluded"][data-id="pompes"]');
  await page.waitForTimeout(100);
  const exclChip = await page.$('[data-a="toggleExcluded"][data-id="pompes"].excl');
  console.log('Pompes excluded chip present:', !!exclChip);
  await page.click('.sheet-hd [data-a="closesheet"]');
  await page.waitForTimeout(300);

  // regenerate today session and confirm no "Pompes" exact exercise + dumbbell exos possible
  await page.click('.tabbtn[data-id="today"]');
  await page.waitForTimeout(150);
  const regenBtn = await page.$('[data-a="regenSession"]');
  if (regenBtn) {
    await regenBtn.click();
    await page.waitForTimeout(150);

  }
  const todayText = await page.textContent('#v-today');
  console.log('Contains "Pompes" exact word:', /\bPompes\b/.test(todayText));

  // --- Export prompt sanity ---
  await page.click('.tabbtn[data-id="profil"]');
  await page.waitForTimeout(150);
  await page.click('[data-a="openDataMore"]'); await page.waitForTimeout(400);   // Profil › Restaurer, exporter, stockage
  await page.click('.sheet [data-a="openExportImport"]');
  await page.waitForTimeout(150);
  const promptText = await page.$eval('textarea', el => el.value);
  console.log('Prompt length:', promptText.length, 'contains MATÉRIEL:', promptText.includes('MATÉRIEL'));
  await page.evaluate(() => closeSheet());
  await page.waitForTimeout(300);

  // --- Import JSON program ---
  const sample = {
    sessions: [
      { nom: "Séance test", exercices: [
        { nom: "Squat barre", series: 3, reps: "5-8" },
        { id: "pompes", series: 3, reps: "8-12" },
        { nom: "Exercice Inconnu XYZ", series: 3, reps: "10" }
      ] }
    ]
  };
  const tmpFile = (OUT_ROOT + '/sample.json');
  fs.writeFileSync(tmpFile, JSON.stringify(sample));
  await page.click('[data-a="openDataMore"]'); await page.waitForTimeout(400);
  await page.click('.sheet [data-a="openExportImport"]');
  await page.waitForTimeout(150);
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('[data-a="triggerImport"]'),
  ]);
  await fileChooser.setFiles(tmpFile);
  await page.waitForTimeout(400);
  const toastText = await page.textContent('#toast');
  console.log('Toast after import:', toastText);
  // dismiss any warning modal
  const warnClose = await page.$('.center-modal [data-a="closesheet"]');
  if (warnClose) { await warnClose.click(); await page.waitForTimeout(200); }

  await page.click('.tabbtn[data-id="today"]');
  await page.waitForTimeout(150);
  const todayText2 = await page.textContent('#v-today');
  console.log('Today shows imported chip:', todayText2.includes('Programme importé'));
  console.log('Today mentions Squat barre:', todayText2.includes('Squat barre'));

  // --- dark mode screenshot ---
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(150);
  await page.screenshot({ path: (OUT_ROOT + '/dark.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(150);
  await page.screenshot({ path: (OUT_ROOT + '/light.png') });

  await browser.close();

  if (errors.length) {
    console.log('=== ERRORS ===');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('=== NO ERRORS ===');
  }
})();
