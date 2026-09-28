// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const { chromium } = require('playwright'); const __pw = require('playwright');
const path = require('path');
const OUT = (OUT_ROOT + '/v13');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await (process.env.ENGINE==='webkit' ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a);
  const wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const file = 'file://' + path.resolve(process.argv[2]);

  // équipement : haltères + banc
  await page.goto(file);
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('forge.v1'));
    st.equipment.owned.dumbbells = true; st.equipment.owned.bench = true; st.equipment.owned.bands = true;
    st.equipment.weights.dumbbells = [4, 6, 8, 10, 12];
    localStorage.setItem('forge.v1', JSON.stringify(st));
  });
  await page.reload();
  await wait(250); await shot('01_splash_a');
  await wait(550); await shot('02_splash_b');
  await wait(500); await shot('03_splash_c');
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await wait(300);
  await shot('04_today_custom_default');
  log('Default tab is Ma séance:', await page.$eval('.seg button.on', e => e.textContent));

  // l'app choisit
  await page.click('.builder-empty [data-a="customFill"]');
  await wait(500);
  log('Rows after app fill:', await page.$$eval('#v-today .group .row', e => e.length), 'app badges:', await page.$$eval('.app-badge', e => e.length));
  await shot('05_filled');

  // sélecteur par matériel
  await page.click('[data-a="customAddOpen"]');
  await wait(450);
  log('Picker groups:', await page.$$eval('.pick-h', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  await page.click('[data-a="pickerCat"][data-v="dumbbells"]');
  await wait(200);
  await page.click('[data-a="pickerMuscle"][data-v="pect"]');
  await wait(200);
  const pect = await page.$$eval('.pick-row .t', e => e.map(x => x.textContent));
  log('Dumbbell chest exercises:', pect.length, pect.join(' | '));
  await shot('06_picker_dumbbells_pect');
  await page.click('.pick-row >> nth=0');
  await page.click('.pick-row >> nth=1');
  await page.click('#pickerDone');
  await wait(600);
  await shot('07_after_add_fresh');
  await page.click('[data-a="customFill"]');
  await wait(400);

  // enregistrer avec le jour d'aujourd'hui
  const wd = await page.evaluate(() => weekdayIdx(todayISO()));
  await page.click('[data-a="saveTemplateOpen"]');
  await wait(300);
  await page.fill('#tplEdName', 'Pecs & dos');
  await page.click(`[data-a="tplEdDay"][data-d="${wd}"]`);
  await page.click(`[data-a="tplEdDay"][data-d="${(wd + 3) % 7}"]`);
  await shot('08_save_modal');
  await page.click('#tplEdSaveBtn');
  await wait(500);
  log('Week plan labels:', await page.$$eval('.wp-t', e => e.map(x => x.textContent)));
  await shot('09_planned');

  // ouverture suivante : la séance prévue s'affiche directement
  await page.evaluate(() => { persistNow(); const st = JSON.parse(localStorage.getItem('forge.v1')); st.custom = { exos: [] }; st.settings.todayTab = 'proposal'; localStorage.setItem('forge.v1', JSON.stringify(st)); });
  await page.reload();
  await wait(1100);
  log('Splash tagline:', await page.textContent('.sp-tag'));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await wait(300);
  log('Plan banner:', await page.$eval('.plan-banner', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => 'NONE'));
  log('Loaded rows:', await page.$$eval('#v-today .group .row', e => e.length));
  await shot('10_open_planned');

  // séance en cours : barre + glisser
  await page.click('[data-a="startCustom"]'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  await wait(500);
  log('Live view scrollTop after start:', await page.$eval('#v-today', e => e.scrollTop));
  await shot('11_live_strip');
  const n0 = await page.$eval('.fc-name', e => e.textContent);
  const box = await page.$eval('.focus-card', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + box.w * 0.8, box.y + box.h * 0.4);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + box.w * 0.8 - i * 22, box.y + box.h * 0.4 + 2); await wait(12); }
  await shot('12_dragging');
  await page.mouse.up();
  await wait(500);
  const n1 = await page.$eval('.fc-name', e => e.textContent);
  log('Swipe changed exercise:', n0, '->', n1, n0 !== n1);
  await page.click('.ls-chip >> nth=3');
  await wait(400);
  log('Chip jump current:', await page.$eval('.ls-chip.current .ls-name', e => e.textContent), '/ card:', await page.$eval('.fc-name', e => e.textContent));
  for (let i = 0; i < 3; i++) { await page.click('[data-a="validateSet"]'); await wait(150); const sk = await page.$('.focus-card [data-a="restSkip"]'); if (sk) { await sk.click(); await wait(120); } }
  await wait(300);
  log('Strip summary:', await page.$eval('.lh-row', e => e.textContent.replace(/\s+/g, ' ').trim()));
  await page.evaluate(() => document.querySelector('#v-today').scrollTo(0, 300));
  await wait(200);
  await shot('13_strip_sticky');
  await page.click('[data-a="finishSession"]');
  await wait(300);
  const cy = await page.$('.center-modal [data-a="confirmYes"]'); if (cy) { await cy.click(); await wait(900); }
  log('Medals:', await page.$$eval('.cel-medal .cm-t', e => e.map(x => x.textContent)));
  await page.click('.center-modal [data-a="closesheet"]');
  await wait(400);
  await shot('14_after_done');

  // profil
  await page.click('.tabbtn[data-id="profil"]');
  await wait(700);
  await page.click('[data-a="editName"] >> nth=0');
  await wait(300);
  await page.fill('#nameInput', 'Yannick');
  await page.keyboard.press('Enter');
  await wait(500);
  await shot('15_profile');
  log('Profile name:', await page.textContent('.ph-name'));
  await page.evaluate(() => document.querySelector('#v-profil').scrollTo(0, 500));
  await wait(200);
  await shot('16_profile_stats');
  await page.click('[data-a="openExoPrefs"]');
  await wait(500);
  log('Prefs groups:', await page.$$eval('.sheet-body h2.sh', e => e.map(x => x.textContent.replace(/\s+/g, ' ').trim())));
  await shot('17_prefs');
  await page.click('.sheet-hd [data-a="closesheet"]');
  await wait(350);

  // médailles
  await page.click('.tabbtn[data-id="progress"]');
  await wait(400);
  await page.click('[data-a="progressTab"][data-v="medals"]');
  await wait(900);
  log('Medal families:', await page.$$eval('.medal-card', e => e.length));
  await shot('18_medals');
  await page.click('.medal-card >> nth=4');
  await page.waitForSelector('.center-modal, .t3d-full.show', { timeout: 20000 }); await wait(500);
  await shot('19_medal_ironyear');
  await page.evaluate(() => { if (qs('.t3d-full')) t3dClose(); else closeSheet(); }); await wait(600);
  await wait(350);

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.click('.tabbtn[data-id="today"]');
  await wait(600);
  await shot('20_dark_today');
  await page.click('.tabbtn[data-id="profil"]');
  await wait(600);
  await shot('21_dark_profile');

  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
