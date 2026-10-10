// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v4.0 : onglet re-touché (remonte, pas de reconstruction), changement d'onglet sans rendu inutile,
// séries faites corrigeables, repos réglable, séance express, export CSV, unités des exercices tenus
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v39'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const ss = []; for (let k = 60; k >= 3; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), note: k === 3 ? 'Dos; "raide"' : undefined, exos: [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 12, done: true }, { reps: 8, weight: 12, done: true }] }, { exoId: 'planche', sets: [{ reps: 45, done: true }] }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [4, 6, 8, 10, 12, 14] } }, sessions: ss })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. onglet re-touché : remonte en haut, sans reconstruire la page ; autre onglet : rendu réutilisé
  await page.click('.tabbtn[data-id="history"]'); await wait(500);
  const h1 = await page.evaluate(() => { const v = document.querySelector('#v-history'); v.scrollTop = 600; v._mark = 1; v.firstElementChild.dataset.keep = '1'; return v.scrollTop; });
  await page.click('.tabbtn[data-id="history"]'); await wait(900);
  const h2 = await page.evaluate(() => { const v = document.querySelector('#v-history'); return { top: v.scrollTop, same: v.firstElementChild.dataset.keep === '1', enter: v.classList.contains('enter') }; });
  log('Re-tap:', h1, '→', JSON.stringify(h2)); if (!(h1 > 0) || h2.top > 4 || !h2.same || h2.enter) fail('onglet re-touché : remonte sans reconstruire');
  await page.click('.tabbtn[data-id="progress"]'); await wait(500); await page.click('.tabbtn[data-id="history"]'); await wait(400);
  const h3 = await page.evaluate(() => ({ same: document.querySelector('#v-history').firstElementChild.dataset.keep === '1', active: currentTab, aria: document.querySelector('.tabbtn.on').getAttribute('aria-current') }));
  log('Tab back:', JSON.stringify(h3)); if (!h3.same || h3.active !== 'history' || h3.aria !== 'page') fail('retour sur un onglet sans reconstruction');
  // Progrès : sous-onglets, re-toucher Progrès en haut ramène au résumé
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'exos' }); }); await wait(400);
  const recTxt = await page.evaluate(() => [...document.querySelectorAll('#v-progress .row .s')].map(e => e.textContent).find(t => /record \d+ s$/.test(t.trim())) || '');
  await page.click('.tabbtn[data-id="progress"]'); await wait(400);
  const sub = await page.evaluate(() => progressTab);
  log('Timed record:', recTxt, '| subtab after re-tap:', sub); if (!/record 45 s/.test(recTxt)) fail('record en secondes pour un exercice tenu'); if (sub !== 'overview') fail('re-toucher Progrès : retour au résumé');

  // 2. repos réglable
  await page.evaluate(() => switchTab('profil')); await wait(300);
  await page.click('[data-a="openSessionPrefs"]'); await wait(500);   // Profil › Réglages des séances
  await page.click('[data-a="setRest"][data-v="long"]'); await wait(300);
  const rest = await page.evaluate(() => ({ s: S.settings.rest, v: restFor(EXO_MAP.dc_haltere), base: EXO_MAP.dc_haltere.restSec, on: document.querySelector('[data-a="setRest"].on').dataset.v }));
  log('Rest:', JSON.stringify(rest)); if (rest.s !== 'long' || rest.on !== 'long' || rest.v !== Math.max(20, Math.round(rest.base * 1.35 / 5) * 5)) fail('repos plus long');
  await page.evaluate(() => closeSheet()); await wait(300);

  // 3. séance en cours : corriger une série validée (reps, charge, annulation)
  await page.evaluate(async () => { switchTab('today'); S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 2 }] }; ACT.startCustom();
    await new Promise(r => setTimeout(r, 4500)); const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(600);
  await page.evaluate(() => { const st = S.draft.exos[0].sets[0]; st.reps = 10; st.weight = 12; ACT.validateSet({ exi: '0' }); }); await wait(500);
  const restSec = await page.evaluate(() => restState && restState.totalSec);
  await page.evaluate(() => { ACT.restSkip(); liveFocusIdx = 0; refreshFocusRegion(); }); await wait(300);
  await page.click('.focus-card button.set-dots'); await wait(500);
  await shot('01_done_sets');
  await page.click('#dsBody [data-f="reps"][data-d="1"]'); await page.click('#dsBody [data-f="weight"][data-d="1"]'); await wait(200);
  const ed = await page.evaluate(() => { const s = S.draft.exos[0].sets[0]; return { reps: s.reps, w: s.weight, done: s.done }; });
  await page.click('#dsBody [data-a="dsUndo"]'); await wait(400);
  const un = await page.evaluate(() => ({ done: S.draft.exos[0].sets[0].done, sheet: document.querySelector('#overlay').classList.contains('open'), phase: document.querySelector('.fc-phase').textContent, toast: document.getElementById('toast').textContent }));
  log('Rest used:', restSec, '| edit:', JSON.stringify(ed), '| undo:', JSON.stringify(un));
  if (restSec !== rest.v) fail('durée de repos appliquée en séance');
  if (ed.reps !== 11 || ed.w !== 14 || !ed.done) fail('correction reps / charge d\'une série faite');
  if (un.done || un.sheet || !/Série 1 \/ 3/.test(un.phase) || !/à refaire/.test(un.toast)) fail('annuler la validation d\'une série');
  await page.evaluate(() => { S.draft = null; save(); renderView('today'); }); await wait(300);

  // 4. séance express
  await page.evaluate(() => { S.settings.todayTab = 'proposal'; renderView('today'); }); await wait(300);
  const hasBtn = await page.evaluate(() => !!document.querySelector('.hero [data-a="startExpress"]'));
  await page.click('.hero [data-a="startExpress"]'); await wait(4500); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  const ex = await page.evaluate(() => ({ n: S.draft.exos.length, sets: S.draft.exos.map(e => e.sets.length), name: S.draft.name, express: S.draft.express, live: !!S.draft.startedAt, uniq: new Set(S.draft.exos.map(e => e.exoId)).size }));
  await page.evaluate(() => ACT.validateSet({ exi: '0' })); await wait(300);
  const exRest = await page.evaluate(() => restState && restState.totalSec);
  log('Express:', JSON.stringify(ex), '| rest', exRest);
  if (!hasBtn || ex.n !== 3 || ex.sets.some(s => s !== 2) || ex.name !== 'Séance express' || !ex.express || !ex.live || ex.uniq !== 3) fail('séance express : 3 exercices × 2 séries');
  if (!(exRest <= 45)) fail('séance express : repos de 45 s au plus');
  await page.evaluate(() => { stopRestTimer(); S.draft = null; save(); renderView('today'); });

  // 5. export CSV : une ligne par série, séparateur « ; », guillemets échappés, secondes pour la planche
  const csv = await page.evaluate(() => historyCSV());
  const lines = csv.replace(/^﻿/, '').split('\r\n');
  const setsTotal = await page.evaluate(() => S.sessions.reduce((t, s) => t + s.exos.reduce((a, e) => a + e.sets.length, 0), 0));
  const plank = lines.find(l => /Planche/.test(l)) || '', note = lines.find(l => /raide/.test(l)) || '';
  log('CSV:', lines.length - 1, 'lines /', setsTotal, 'sets |', plank, '|', note);
  if (!csv.startsWith('﻿') || lines.length - 1 !== setsTotal || !/;;45;;/.test(plank) || !/"Dos; ""raide"""/.test(note) || !/;12;/.test(lines[1])) fail('export CSV');
  const dl = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await page.evaluate(() => { navigator.canShare = () => false; exportCSV(); });
  const file = await dl; log('Download:', file ? file.suggestedFilename() : 'none'); if (!file || !/^ascen-historique-\d{4}-\d{2}-\d{2}\.csv$/.test(file.suggestedFilename())) fail('fichier CSV téléchargé');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
