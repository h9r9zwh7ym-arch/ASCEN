// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const pw = require('playwright');
const path = require('path');
const ENGINE = process.argv[3] || process.env.ENGINE || 'chromium';
const OUT = `${OUT_ROOT}/v14_${ENGINE}`;
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: ENGINE === 'webkit', isMobile: ENGINE === 'webkit' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(`[${ENGINE}]`, ...a);
  const wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const tap = async sel => { if (ENGINE === 'webkit') await page.tap(sel); else await page.click(sel); };
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 7000 });
  // matériel + 4 séances enregistrées dont une prévue hier (manquée)
  await page.evaluate(() => {
    S.equipment.owned.dumbbells = true; S.equipment.owned.bench = true; S.equipment.weights.dumbbells = [6, 8, 10, 12];
    const wd = weekdayIdx(todayISO());
    const mk = (n, ids, days) => ({ id: uid(), n, days, exos: ids.map(id => ({ exoId: id, sets: 3 })) });
    S.templates = [
      mk('Haut A', ['dc_haltere', 'rowing_uni_haltere', 'dev_epaules_haltere', 'curl_biceps'], wd > 0 ? [wd - 1] : []),
      mk('Jambes', ['squat_gobelet', 'fentes_halteres', 'rdl_halteres', 'mollets_halteres'], [(wd + 2) % 7]),
      mk('Gainage', ['planche', 'dead_bug', 'crunch'], []),
      mk('Full body', ['pompes', 'squat_pdc', 'rowing_deux_halteres', 'planche'], []),
    ];
    persistNow();
  });
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 7000 });
  await wait(300);
  await shot('01_today');
  log('Emoji arrows left in UI:', await page.evaluate(() => /[⬆⬇⚙🔲]/.test(document.body.innerText)));
  log('Plan summary:', await page.$eval('.week-plan .sec-sum', e => e.textContent).catch(() => '-'));
  log('Missed markers:', await page.$$eval('.wp-miss', e => e.length));
  log('Saved cards shown / total:', await page.$$eval('.tpl-card2', e => e.length), '/ 4');
  await tap('[data-a="tplShowAll"]'); await wait(250);
  log('After "afficher les autres":', await page.$$eval('.tpl-card2', e => e.length));
  await tap('.tpl-card2 >> nth=0 >> .tc-head'); await wait(350);
  log('Expanded list rows:', await page.$$eval('.tpl-card2.open .tc-exo', e => e.length));
  await shot('02_tpl_open');
  await tap('.tpl-card2.open [data-a="templateMenu"]'); await wait(350);
  await shot('03_tpl_menu');
  await tap('.center-modal [data-a="duplicateTemplate"]'); await wait(500);
  log('Templates after duplicate:', await page.evaluate(() => S.templates.map(t => t.n).join(' | ')));
  // section repliée
  await tap('[data-a="toggleSection"][data-k="tplOpen"]'); await wait(250);
  log('Collapsed cards:', await page.$$eval('.tpl-card2', e => e.length), 'persisted:', await page.evaluate(() => S.settings.ui.tplOpen));
  await tap('[data-a="toggleSection"][data-k="tplOpen"]'); await wait(250);

  // Ma séance : charger, réorganiser, info
  await tap('.tpl-card2 >> nth=1 >> .tc-head'); await wait(300);
  await tap('.tpl-card2.open [data-a="templateMenu"] >> nth=0'); await wait(350);
  await tap('.center-modal [data-a="loadTemplate"]'); await wait(700);
  log('Builder rows:', await page.$$eval('.group.builder .row', e => e.length), 'region legend:', await page.$$eval('.region-legend span', e => e.map(x => x.textContent).join(', ')));
  const first = await page.$eval('.group.builder .row .t', e => e.textContent);
  await tap('[data-a="toggleReorder"]'); await wait(300);
  await tap('.group.builder [data-a="customMove"][data-d="1"] >> nth=0'); await wait(300);
  log('Reorder moved first down:', first, '->', await page.$eval('.group.builder .row:nth-child(2) .t', e => e.textContent));
  await shot('04_reorder');
  await tap('[data-a="toggleReorder"]'); await wait(300);
  await tap('.group.builder .row-main >> nth=0'); await wait(500);
  log('Info sheet title:', await page.$eval('.exo-hero .nm', e => e.textContent), 'similar:', await page.$$eval('.sheet-body .group .row', e => e.length));
  await shot('05_info');
  await tap('.sheet-hd [data-a="closesheet"]'); await wait(350);

  // sélecteur : info puis retour sans perdre la sélection
  await tap('[data-a="customAddOpen"]'); await wait(450);
  await tap('.pick-row >> nth=0 >> .row-main'); await wait(150);
  await tap('.pick-row >> nth=2 >> .info-btn'); await wait(450);
  await shot('06_picker_info');
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(450); // v3.0 : retour dans l'en-tête de la fiche
  log('Selection kept after info:', await page.$$eval('.pick-row.on', e => e.length), 'footer:', await page.textContent('#pickerDone'));
  await tap('.sheet-hd [data-a="closesheet"]'); await wait(350);

  // démarrer directement une séance enregistrée
  if (!(await page.$('.tpl-card2.open'))) { await tap('.tpl-card2 >> nth=0 >> .tc-head'); await wait(300); }
  await tap('.tpl-card2.open [data-a="startTemplate"] >> nth=0'); await wait(700); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  log('Live started:', await page.evaluate(() => !!(S.draft && S.draft.startedAt)), 'name:', await page.textContent('.lh-clock small'));
  await shot('07_live');
  await tap('.fc-info'); await wait(450);
  const hasSwap = await page.$('[data-a="swapFromInfo"]');
  log('Swap from info available:', !!hasSwap);
  if (hasSwap) { const before = await page.evaluate(() => S.draft.exos[liveFocusIdx].exoId); await hasSwap.click(); await wait(500); log('Swapped:', before, '->', await page.evaluate(() => S.draft.exos[liveFocusIdx].exoId)); }
  await shot('08_live_after_swap');

  // planning : composer une séance pour un jour
  await page.evaluate(() => { S.draft = null; save(); renderViewAnimated('today'); });
  await wait(400);
  await tap('.wp-day >> nth=5'); await wait(400);
  await tap('[data-a="planNew"]'); await wait(700);
  await page.evaluate(() => { S.custom.exos = [{ exoId: 'pompes', sets: 3 }]; save(); renderView('today'); }); await wait(300);
  await tap('.save-row'); await wait(600);
  log('Save sheet for new day:', !!(await page.$('#tplEdBody')), 'pre-checked day:', await page.$$eval('[data-a="tplEdDay"].on', e => e.map(x => x.dataset.d)));
  await shot('09_save_prechecked');
  await tap('[data-a="tplEdCancel"]'); await wait(350);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => { S.custom = { exos: [] }; openTpls = new Set([S.templates[0].id]); save(); renderViewAnimated('today'); });
  await wait(500);
  await shot('10_dark_today');
  await tap('.tabbtn[data-id="history"]'); await wait(400);
  await shot('11_dark_history');
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log(`[${ENGINE}] === NO ERRORS ===`);
})();
