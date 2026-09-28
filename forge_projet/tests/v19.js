// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path');
const OUT = (OUT_ROOT + '/v19');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await page.evaluate(() => { S.equipment.owned.dumbbells = true; S.equipment.owned.bench = true; S.equipment.weights.dumbbells = [6, 10, 14]; save(); renderViewAnimated('today'); });
  await wait(500);
  await page.$eval('.tpl-empty', e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await shot('01_empty');
  // --- séance 1 : composée dans Ma séance, puis enregistrée ; l'éditeur complet la modifie
  log('No create button in Mes séances:', !(await page.$('[data-a="tplNew"], .sec-add')));
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 3 }] }; save(); renderView('today'); });
  await page.click('.save-row'); await wait(450);
  log('Save sheet:', await page.textContent('.te-hd .t'), '| no exercise editing:', !(await page.$('[data-a="tplEdAdd"]')));
  await page.fill('#tplEdName', 'Haut A'); await page.click('#tplEdSaveBtn'); await wait(700);
  await page.evaluate(() => { const t = S.templates[0]; openTpls.add(t.id); ACT.tplOpenEditor({ id: t.id }); }); await wait(450);
  log('Editor open:', await page.textContent('.te-hd .t'));
  await page.evaluate(() => { tplEdit.exos = []; refreshTplEditor(); }); await wait(100);
  await page.click('[data-a="tplEdDay"][data-d="0"]'); await page.click('[data-a="tplEdDay"][data-d="3"]'); await wait(150);
  await page.click('[data-a="tplEdAdd"]'); await wait(400);
  await page.fill('#pickerSearch', 'développé'); await wait(200);
  await page.click('.pick-row .pick-check >> nth=0'); await page.click('.pick-row .pick-check >> nth=1'); await wait(100);
  await page.click('#pickerDone'); await wait(450);
  log('Back in editor rows:', await page.$$eval('.te-row', e => e.length), 'name kept:', await page.$eval('#tplEdName', i => i.value));
  await page.click('[data-a="tplEdSets"][data-d="1"] >> nth=0'); await wait(100);
  await page.click('[data-a="tplEdFill"]'); await wait(300);
  await shot('02_editor');
  await page.click('#tplEdSaveBtn'); await wait(700);
  log('Templates:', await page.evaluate(() => S.templates.map(t => t.n + ' [' + t.days + '] ' + t.exos.length + ' exos')));
  // --- séance 2 : prend le lundi
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'squat_pdc', sets: 3 }] }; save(); renderView('today'); });
  await page.click('.save-row'); await wait(450);
  await page.fill('#tplEdName', 'Jambes');
  await page.click('[data-a="tplEdDay"][data-d="0"]'); await wait(150);
  log('Clash hint:', await page.textContent('.te-hint'));
  await page.click('#tplEdSaveBtn'); await wait(700);
  log('After 2nd:', await page.evaluate(() => S.templates.map(t => t.n + ' [' + t.days + ']')));
  // --- annuler avec modifications (éditeur complet)
  await page.evaluate(() => ACT.tplOpenEditor({ id: S.templates[0].id })); await wait(400);
  await page.fill('#tplEdName', 'Brouillon');
  await page.click('[data-a="tplEdCancel"]'); await wait(350);
  log('Discard modal:', !!(await page.$('[data-a="tplEdDiscard"]')));
  await page.click('[data-a="tplEdResume"]'); await wait(350);
  log('Resumed name:', await page.$eval('#tplEdName', i => i.value));
  await page.click('[data-a="tplEdCancel"]'); await wait(300); await page.click('[data-a="tplEdDiscard"]'); await wait(400);
  // --- picker : retour sans ajout
  await page.evaluate(() => ACT.tplOpenEditor({ id: S.templates[0].id })); await wait(400); await page.click('[data-a="tplEdAdd"]'); await wait(400);
  await page.click('[data-a="pickerCancel"]'); await wait(400);
  log('Back from picker -> editor:', !!(await page.$('#tplEdBody')));
  await page.click('[data-a="tplEdCancel"]'); await wait(400);
  if (await page.$('[data-a="tplEdDiscard"]')) { await page.click('[data-a="tplEdDiscard"]'); await wait(400); }
  // --- modifier depuis la carte
  await page.$eval('.tpl-card2 .tc-head', e => e.scrollIntoView({ block: 'center' }));
  await page.click('.tpl-card2 .tc-head'); await wait(500);
  await page.click('.tpl-card2.open [data-a="tplOpenEditor"]'); await wait(450);
  log('Edit existing title:', await page.textContent('.te-hd .t'), 'name:', await page.$eval('#tplEdName', i => i.value));
  await page.click('[data-a="tplEdCancel"]'); await wait(400);
  await shot('03_list');
  // --- programme de la semaine
  await page.click('.tpl-add[data-a="weekWizard"]'); await wait(450);
  await page.click('[data-a="wizardN"][data-v="4"]'); await wait(300);
  await shot('04_wizard');
  await page.click('[data-a="wizardCreate"]'); await wait(900);
  log('After wizard:', await page.evaluate(() => S.templates.map(t => t.n + ' [' + t.days + '] ' + t.exos.length)));
  log('Days covered:', await page.evaluate(() => [0,1,2,3,4,5,6].map(d => (S.templates.find(t => t.days.includes(d)) || {}).n || '—').join(' | ')));
  await shot('05_week');
  await page.evaluate(() => document.querySelector('#v-today').scrollTo(0, 0)); await wait(300);
  await shot('06_home');
  log('Hero next line:', await page.$eval('.hero-next', e => e.textContent).catch(() => 'none'));
  // jour du planning avec séance
  await page.click('.wp-day.has'); await wait(400);
  log('Plan day current card:', !!(await page.$('.pd-cur')));
  await shot('07_planday');
  await page.click('.pd-cur [data-a="tplOpenEditor"]'); await wait(400);
  log('Editor from plan day:', await page.$eval('#tplEdName', i => i.value));
  await page.click('[data-a="tplEdCancel"]'); await wait(400);
  // enregistrer Ma séance via l'éditeur
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 3 }], name: 'Rapide' }; save(); renderView('today'); });
  await page.click('.save-row[data-a="saveTemplateOpen"]'); await wait(400);
  await page.click('#tplEdSaveBtn'); await wait(600);
  log('Custom linked:', await page.evaluate(() => !!S.custom.tplId && S.templates.some(t => t.id === S.custom.tplId && t.n === 'Rapide')));
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
