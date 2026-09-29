// Fluidité des interactions courantes (processeur ralenti ×4, 3 ans d'historique) : images longues
// (> 20 ms) et pire image pendant l'animation qui suit chaque geste. Usage : node tests/ui_perf.js dist/forge.html
const __pw = require('playwright'); const path = require('path');
(async () => {
  const b = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (localStorage.getItem('forge.v1')) return; const ss = [], ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes'];
    for (let k = 3 * 365; k >= 1; k--) { if (k % 7 !== 1 && k % 7 !== 3 && k % 7 !== 5) continue; const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), durationSec: 2700, exos: ids.map(id => ({ exoId: id, sets: [0, 1, 2].map(j => ({ reps: 10 - j, weight: 10, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: ss })); });
  await page.goto('file://' + path.resolve(process.argv[2])); await page.waitForSelector('#splash', { state: 'detached', timeout: 20000 }); await page.waitForTimeout(1500);
  for (const t of ['history', 'progress', 'profil', 'today']) { await page.click(`.tabbtn[data-id="${t}"]`); await page.waitForTimeout(900); }
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const measure = async (name, fn, ms = 800) => {
    await page.evaluate(() => { window.__f = []; let last = performance.now(); const loop = t => { window.__f.push(t - last); last = t; if (window.__f.length < 70) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    const t0 = Date.now(); await page.evaluate(fn).catch(e => errs.push(name + ': ' + e.message)); const dt = Date.now() - t0; await page.waitForTimeout(ms);
    const f = await page.evaluate(() => window.__f.slice(1)); const r = { name, js: dt, long: f.filter(x => x > 20).length, worst: Math.round(Math.max(...f)) }; console.log(JSON.stringify(r)); return r;
  };
  await measure('ouvrir fiche exercice', () => ACT.showExoInfo({ id: 'dc_haltere' }));
  await measure('fermer feuille', () => closeSheet());
  await measure('ouvrir choix exercices', () => openPicker({ title: 'Choisir', multi: true, onDone: () => {} }));
  await measure('fermer feuille', () => closeSheet());
  await measure('Ma séance ↔ Proposée', () => document.querySelector('[data-a="todayMode"][data-v="proposal"]').click());
  await measure('Proposée ↔ Ma séance', () => document.querySelector('[data-a="todayMode"][data-v="custom"]').click());
  await measure('Progrès → Exercices', () => { switchTab('progress'); }, 500);
  await measure('sous-onglet Exercices', () => ACT.progressTab({ v: 'exos' }));
  await measure('sous-onglet Trophées', () => ACT.progressTab({ v: 'medals' }), 1200);
  await measure('sous-onglet Résumé', () => ACT.progressTab({ v: 'overview' }));
  await measure('Historique : détail séance', () => { switchTab('history'); ACT.openSessionDetail({ id: S.sessions[S.sessions.length - 1].id }); });
  await measure('fermer feuille', () => closeSheet());
  await page.evaluate(async () => { switchTab('today'); S.custom = { exos: [{ exoId: 'dc_haltere', sets: 4 }, { exoId: 'pompes', sets: 3 }] }; ACT.startCustom(); await new Promise(r => setTimeout(r, 5200)); const l = document.querySelector('#launch'); l && l.click(); });
  await page.waitForTimeout(1500);
  await measure('valider une série', () => ACT.validateSet({ exi: '0' }));
  await measure('passer le repos', () => ACT.restSkip());
  await measure('exercice suivant', () => ACT.focusNext());
  await measure('+ répétition', () => document.querySelector('.big-stepper button').click(), 400);
  console.log('erreurs:', errs.length ? errs : 'aucune');
  await b.close();
})();
