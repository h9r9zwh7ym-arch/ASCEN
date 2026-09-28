// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path');
const OUT = (OUT_ROOT + '/v20');
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms);
  const shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  // historique simulé
  await page.evaluate(() => {
    const pad = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    for (let k = 80; k >= 2; k -= (k % 3 ? 2 : 3)) {
      const d = new Date(); d.setDate(d.getDate() - k); d.setHours(k % 5 ? 18 : 12, 0);
      S.sessions.push({ id: 'h' + k, date: iso(d), source: 'custom', name: 'Test', type: 'auto', startedAt: d.toISOString(), completedAt: d.toISOString(), durationSec: 1800 + k * 30,
        exos: [{ exoId: 'pompes', targetSets: 3, targetReps: [8, 12], sets: [0, 1, 2].map(() => ({ reps: 12, weight: null, done: true })) }, { exoId: 'planche', targetSets: 2, targetReps: [30, 45], sets: [0, 1].map(() => ({ reps: 40, weight: null, done: true })) }] });
    }
    save(); persistNow();
  });
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  // 1. graphique de l'historique
  await page.click('.tabbtn[data-id="history"]'); await wait(900);
  log('History chart bars:', await page.$$eval('#histChart .cc-bar', e => e.length));
  await shot('01_history');
  await page.click('[data-a="histMetric"][data-v="minutes"]'); await wait(700);
  log('Metric minutes KPI:', await page.textContent('.hist-kpi b'), '| seg on:', await page.$eval('[data-seg="histMetric"] .on', e => e.textContent));
  await shot('02_history_minutes');
  // 2 + 7. trophées
  await page.click('.tabbtn[data-id="progress"]'); await wait(500);
  log('Progress tabs:', await page.$$eval('[data-seg="progress"] button', e => e.map(x => x.textContent)));
  await page.click('[data-a="progressTab"][data-v="medals"]'); await wait(900);
  log('Trophies:', await page.evaluate(() => MEDALS.length), '| sentence gone:', !(await page.evaluate(() => document.body.textContent.includes('paliers platine demandent'))));
  log('New trophy values:', await page.evaluate(() => ['weekend','lunch','comeback','hold','bodyweight','legs','architect'].map(id => id + '=' + Math.round(MEDALS.find(m => m.id === id).val())).join(' ')));
  await shot('03_trophies');
  // 11. profil
  await page.click('.tabbtn[data-id="profil"]'); await wait(700);
  log('Profile iOS icons:', await page.$$eval('#v-profil .sfi', e => e.length), '| emoji icons left:', await page.$$eval('#v-profil .ico', e => e.length));
  await shot('04_profil');
  await page.evaluate(() => document.querySelector('#v-profil').scrollTo(0, 99999)); await wait(400);
  await shot('05_profil_bottom');
  // séance : 3 exercices dont un chronométré
  await page.click('.tabbtn[data-id="today"]'); await wait(400);
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 2 }, { exoId: 'planche', sets: 1 }, { exoId: 'squat_pdc', sets: 1 }], name: 'Mix' }; S.settings.todayTab = 'custom'; save(); renderViewAnimated('today'); });
  await wait(300);
  await page.click('.hero-go'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 });
  // 3. navigation en boucle
  await page.click('[data-a="focusPrev"]'); await wait(300);
  log('Prev from first -> last:', await page.textContent('.fc-name'));
  await page.click('[data-a="focusNext"]'); await wait(300);
  log('Next from last -> first:', await page.textContent('.fc-name'));
  // 9. mode circuit : repos puis exercice suivant
  log('Flow default:', await page.evaluate(() => circuitMode() ? 'circuit' : 'classic'));
  await page.click('[data-a="validateSet"]'); await wait(300);
  log('Rest card next text:', await page.textContent('.fc-next'));
  await shot('06_rest_next');
  await page.click('.focus-card [data-a="restSkip"]'); await wait(400);
  log('After skip ->', await page.textContent('.fc-name'));
  // 10. chrono de la planche
  log('Hold button:', await page.textContent('[data-a="holdStart"]'));
  await page.evaluate(() => { S.draft.exos[1].sets[0].reps = 5; renderView('today'); });
  await page.click('[data-a="holdStart"]'); await wait(1200);
  await shot('07_hold_prep');
  log('Prep phase:', await page.evaluate(() => hold && hold.phase));
  await wait(3200);
  await shot('08_hold');
  log('Hold phase:', await page.evaluate(() => hold && hold.phase), '| time:', await page.textContent('#holdTime'));
  await wait(3500);
  log('Auto-validated plank:', await page.evaluate(() => S.draft.exos[1].sets[0].done + ' reps=' + S.draft.exos[1].sets[0].reps));
  // fin du repos auto -> exercice suivant
  await page.evaluate(() => { if (restState) restState.endAt = Date.now() + 300; });
  await wait(1200);
  log('After rest end ->', await page.textContent('.fc-name').catch(() => 'complete'));
  // terminer tout
  for (let i = 0; i < 10; i++) { const v = await page.$('[data-a="validateSet"]'); if (!v) break; await v.click(); await wait(150); const sk = await page.$('.focus-card [data-a="restSkip"]'); if (sk) { await sk.click(); await wait(150); } }
  await wait(500);
  await page.click('.complete-card [data-a="finishSession"]'); await wait(1300);
  log('Save offer:', !!(await page.$('[data-a="saveDoneSession"]')), '| custom cleared:', await page.evaluate(() => S.custom.exos.length === 0));
  await shot('09_celebration_save');
  await page.click('[data-a="saveDoneSession"]'); await wait(500);
  log('Editor prefilled:', await page.$eval('#tplEdName', i => i.value), await page.$$eval('.te-row', e => e.length));
  await page.click('#tplEdSaveBtn'); await wait(600);
  log('Saved template:', await page.evaluate(() => S.templates.map(t => t.n).join('|')));
  await page.evaluate(() => document.querySelector('#v-today').scrollTo(0, 0)); await wait(300);
  await shot('10_today_after');
  // 8. audio : contexte suspendu puis relancé
  const audio = await page.evaluate(async () => {
    if (!AC) return 'no ctx';
    await AC.suspend(); const before = AC.state;
    sfx('set'); await new Promise(r => setTimeout(r, 400));
    const after = AC.state;
    await AC.close(); sfx('set'); await new Promise(r => setTimeout(r, 300));
    return before + ' -> ' + after + ' | after close: ' + AC.state;
  });
  log('Audio revive:', audio);
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
