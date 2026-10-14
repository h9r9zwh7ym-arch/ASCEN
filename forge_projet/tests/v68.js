// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.1.9 : saisie en un geste (glisser verticalement sur le chiffre), molette de durée pour les exercices tenus
// (15 s minimum, sans raccourcis), dernière durée reproposée telle quelle à la séance suivante.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v68'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', colorScheme: 'dark' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toLocaleDateString('sv'); };
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true } },
      sessions: [{ id: 'a', date: d(3), exos: [{ exoId: 'planche', sets: [{ reps: 47, done: true }, { reps: 47, done: true }] }, { exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }] })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(600);

  // 1. la dernière durée revient telle quelle (avant : +5 s automatiques)
  const sug = await page.evaluate(() => suggestForExo(EXO_MAP.planche, 2).reps);
  log('Planche proposée :', sug.join(', ')); if (sug[0] !== 47) fail('dernière durée reproposée');

  // séance : pompes puis planche
  await page.evaluate(() => { const s = (id, r) => ({ exoId: id, sets: [{ reps: r }, { reps: r }] }); S.draft = { id: 'd', date: todayISO(), source: 'custom', startedAt: new Date().toISOString(), exos: [s('pompes', 10), s('planche', 47)] }; save(); switchTab('today'); renderView('today'); });
  await page.waitForTimeout(500);
  // 2. glisser vers le haut de 3 crans : 13 répétitions, sans ouvrir le clavier
  const box = await page.evaluate(() => { const r = document.querySelector('.sx-steps [data-a="editVal"][data-f="reps"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x, box.y - 30, { steps: 4 }); await page.mouse.move(box.x, box.y - 56, { steps: 4 });
  const mid = await page.evaluate(() => document.querySelector('.sx-steps [data-a="editVal"][data-f="reps"] b').textContent);
  await page.mouse.up(); await page.waitForTimeout(300);
  const g = await page.evaluate(() => ({ v: S.draft.exos[0].sets.map(s => s.reps), modal: !!document.querySelector('#numInput') }));
  log('Glisser :', mid, '→', JSON.stringify(g)); if (mid !== '13' || g.v.join() !== '13,13' || g.modal) fail('glisser sur le chiffre');
  // vers le bas, sous zéro impossible
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x, box.y + 400, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(300);
  if (await page.evaluate(() => S.draft.exos[0].sets[0].reps) !== 0) fail('pas de valeur négative');
  // toucher sans glisser : la saisie au clavier, comme avant
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(400);
  if (!await page.evaluate(() => !!document.querySelector('#numInput'))) fail('toucher ouvre la saisie');
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(300);
  // aucun texte d'explication ajouté
  if (await page.evaluate(() => /glisse/i.test(document.querySelector('#focusRegion').innerText))) fail('pas de texte d\'explication');

  // 3. exercice tenu : la molette (15 s minimum, sans raccourcis)
  await page.evaluate(() => { S.draft.exos.reverse(); save(); refreshFocusRegion(); }); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.sx-steps [data-a="editVal"][data-f="reps"]').click()); await page.waitForTimeout(500);
  const m = await page.evaluate(() => ({ dial: !!document.querySelector('#durDial canvas'), v: document.querySelector('#durVal').textContent, presets: document.querySelectorAll('.dur-modal .chip, .dur-modal [data-a*="preset"]').length, txt: document.querySelector('.dur-modal').innerText }));
  log('Molette :', JSON.stringify({ dial: m.dial, v: m.v, presets: m.presets })); if (!m.dial || m.v !== '0:45' || m.presets || /glisse|touche/i.test(m.txt)) fail('molette sans raccourcis ni mode d\'emploi');
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_molette.png` });
  const d = await page.evaluate(() => { const r = document.querySelector('#durDial').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  // vers la gauche (valeurs plus grandes), avec l'élan : la valeur monte et tombe sur un cran de 5 s
  await page.mouse.move(d.x, d.y); await page.mouse.down(); await page.mouse.move(d.x - 56, d.y, { steps: 20 }); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(900);
  const v1 = await page.evaluate(() => document.querySelector('#durVal').textContent); log('Après glisser :', v1);
  const sec = (t => +t.split(':')[0] * 60 + +t.split(':')[1])(v1); if (!(sec > 45 && sec % 5 === 0)) fail('la molette avance par crans de 5 s');
  // très loin à droite : jamais sous 15 s
  await page.mouse.move(d.x, d.y); await page.mouse.down(); await page.mouse.move(d.x + 600, d.y, { steps: 20 }); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(1500);
  const v2 = await page.evaluate(() => document.querySelector('#durVal').textContent); log('Minimum :', v2); if (v2 !== '0:15') fail('15 s minimum');
  await page.evaluate(() => document.querySelector('[data-a="durOk"]').click()); await page.waitForTimeout(400);
  const after = await page.evaluate(() => S.draft.exos[0].sets.map(s => s.reps)); log('Planche après Valider :', after.join(','));
  if (after.join() !== '15,15') fail('durée enregistrée sur les séries restantes');
  if (!/15 s/.test(await page.evaluate(() => (document.querySelector('.hold-go') || {}).textContent || ''))) fail('le chrono suit la durée choisie');
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}02_apres.png` });

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
