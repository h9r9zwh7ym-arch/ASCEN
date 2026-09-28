// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.0 : pile de feuilles (retour au lieu de tout fermer) et « Ajouter » selon le contexte de la fiche
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v28'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: [] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(400);
  const state = () => page.evaluate(() => ({ editor: !!document.querySelector('#tplEdBody'), picker: !!document.querySelector('#pickerList'), info: !!document.querySelector('#overlay .exo-hero'), open: document.querySelector('#overlay').classList.contains('open') }));
  // glisser la feuille vers le bas depuis l'en-tête (souris : même code que le toucher)
  const swipeDown = async () => { const b = await page.evaluate(() => { const r = document.querySelector('#overlay .sheet .sheet-hd').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(b.x, b.y); await page.mouse.down(); for (let i = 1; i <= 8; i++) await page.mouse.move(b.x, b.y + i * 40); await page.mouse.up(); await wait(700); };

  // 1. éditeur de séance → liste → fiche : glisser ramène à la liste, puis à l'éditeur (plus d'édition perdue)
  await page.evaluate(() => openTplEditor(null)); await wait(600);
  await page.evaluate(() => { const i = document.querySelector('#tplEdBody input'); if (i) { i.value = 'Test pile'; i.dispatchEvent(new Event('input', { bubbles: true })); } });
  await page.click('[data-a="tplEdAdd"]'); await wait(700);
  let st = await state(); log('Picker from editor:', JSON.stringify(st)); if (!st.picker) fail('liste depuis l\'éditeur');
  await page.evaluate(() => { const l = document.querySelector('#pickerList'); l.scrollTop = 300; });
  await page.evaluate(() => { const l = document.querySelector('#pickerList'), r = l.getBoundingClientRect(); const b = [...l.querySelectorAll('[data-a="pickerInfo"]')].find(x => { const q = x.getBoundingClientRect(); return q.top > r.top + 20 && q.bottom < r.bottom - 20; }); b.click(); }); await wait(800);
  st = await state(); log('Info from picker:', JSON.stringify(st)); if (!st.info) fail('fiche depuis la liste');
  const hasBack = await page.$('#overlay .sheet-hd [data-a="sheetBack"]'); if (!hasBack) fail('bouton retour dans la fiche');
  await shot('01_info_from_picker');
  const addLbl = await page.$eval('#overlay [data-a="infoAdd"].btn', e => e.textContent.trim()).catch(() => null);
  log('Add button in picker context:', addLbl); if (addLbl !== 'Ajouter à la sélection') fail('libellé ajout (liste)');
  await swipeDown();
  st = await state(); const scroll = await page.evaluate(() => document.querySelector('#pickerList') && document.querySelector('#pickerList').scrollTop);
  log('After swipe on info:', JSON.stringify(st), 'list scroll kept:', scroll); if (!st.picker || st.info) fail('glisser la fiche → retour à la liste'); if (!(scroll > 100)) fail('position de la liste gardée');
  // ajout depuis la fiche → retour à la liste, sélection à jour
  await page.click('.pick-row [data-a="pickerInfo"] >> nth=0'); await wait(700);
  await page.click('#overlay [data-a="infoAdd"].btn'); await wait(700);
  st = await state(); const foot = await page.$eval('#pickerDone', e => e.textContent.trim() + (e.disabled ? ' (off)' : '')).catch(() => '-');
  log('After add from info:', JSON.stringify(st), 'footer:', foot); if (!st.picker || !/1/.test(foot) || /off/.test(foot)) fail('ajout depuis la fiche → sélection');
  await swipeDown();
  st = await state(); log('After swipe on picker:', JSON.stringify(st)); if (!st.editor) fail('glisser la liste → retour à l\'éditeur');
  const kept = await page.evaluate(() => tplEdit && tplEdit.n); log('Editor name kept:', kept);
  await shot('02_back_to_editor');
  await page.evaluate(() => { tplEdit.dirty = false; closeSheet(); }); await wait(500);

  // 2. fiche ouverte depuis une autre fiche (exercices similaires) : ✕/retour revient à la première
  await page.evaluate(() => ACT.showExoInfo({ id: 'pompes' })); await wait(600);
  await page.click('#overlay .group [data-a="showExoInfo"] >> nth=0'); await wait(600);
  await page.click('#overlay [data-a="sheetBack"]'); await wait(500);
  const title = await page.$eval('#overlay .exo-hero .nm', e => e.textContent); log('Back to first info:', title); if (title !== 'Pompes') fail('retour à la fiche précédente');
  await page.click('#overlay .sheet-hd [data-a="closesheet"]'); await wait(500);
  st = await state(); if (st.open) fail('✕ ferme la fiche seule');

  // 3. séance en cours : « Ajouter » va dans la séance en cours
  await page.evaluate(() => { S.settings.todayTab = 'custom'; S.custom.exos = [{ exoId: 'pompes', sets: 3 }]; save(); ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(700);
  const before = await page.evaluate(() => S.draft && S.draft.exos.length);
  await page.evaluate(() => ACT.showExoInfo({ id: 'squat_pdc' })); await wait(600);
  const liveLbl = await page.$eval('#overlay [data-a="infoAdd"].btn', e => e.textContent.trim()).catch(() => null);
  await page.click('#overlay [data-a="infoAdd"].btn'); await wait(600);
  const after = await page.evaluate(() => ({ n: S.draft.exos.length, has: S.draft.exos.some(x => x.exoId === 'squat_pdc'), custom: S.custom.exos.length }));
  log('Live add:', liveLbl, before, '→', JSON.stringify(after)); if (liveLbl !== 'Ajouter à la séance en cours' || after.n !== before + 1 || !after.has || after.custom !== 1) fail('ajout à la séance en cours');
  await shot('03_live_added');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
