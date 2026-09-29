// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.7 : l'app ouverte dans deux onglets — chacun reprend ce que l'autre enregistre (au lieu de
// l'écraser), un onglet avec des changements en attente garde les siens, un effacement fait recharger
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v36'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  await ctx.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); if (localStorage.getItem('forge.v1')) return;
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, savedAt: 1 }, sessions: [{ id: 'a', date: '2026-09-20', exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }] })); });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await p.goto(APP); await p.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await p.waitForTimeout(700); return p; };
  const A = await open(), B = await open();
  // 1. A lance un défi et enregistre : B le voit, sans rien écrire lui-même
  await A.evaluate(() => { ACT.startChallenge({ id: 'pompes100' }); persistNow(); }); await B.waitForTimeout(600);
  const b1 = await B.evaluate(() => ({ ch: S.challenges.map(c => c.id), toast: document.getElementById('toast').textContent, pending: !!persistTimer }));
  log('B after A saved:', JSON.stringify(b1)); if (!b1.ch.includes('pompes100') || !/autre onglet/.test(b1.toast) || b1.pending) fail('B reprend la version de A');
  // 2. B ajoute une séance : A la voit (les deux séances restent)
  await B.evaluate(() => { S.sessions.push({ id: 'b', date: '2026-09-22', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }); save(); persistNow(); }); await A.waitForTimeout(600);
  const a2 = await A.evaluate(() => ({ n: S.sessions.length, ch: S.challenges.length }));
  log('A after B saved:', JSON.stringify(a2)); if (a2.n !== 2 || a2.ch !== 1) fail('A reprend la version de B');
  // 3. A a un changement en attente : il garde le sien, et sa sauvegarde l'emporte
  await A.evaluate(() => { S.settings.name = 'Onglet A'; save(); });
  await B.evaluate(() => { S.settings.name = 'Onglet B'; save(); persistNow(); }); await A.waitForTimeout(150);
  const a3 = await A.evaluate(() => S.settings.name); await A.waitForTimeout(700);
  const b3 = await B.evaluate(() => S.settings.name);
  log('Pending change kept:', a3, '→ B now', b3); if (a3 !== 'Onglet A' || b3 !== 'Onglet A') fail('changement en attente conservé, dernière écriture gagne');
  // 4. une feuille ouverte n'est pas redessinée sous le doigt ; l'écran suit à la fermeture
  await B.evaluate(() => ACT.openChallenges()); await B.waitForTimeout(500);
  await A.evaluate(() => { ACT.startChallenge({ id: 'corps7' }); persistNow(); }); await B.waitForTimeout(600);
  const b4 = await B.evaluate(() => ({ open: document.querySelector('#overlay').classList.contains('open'), n: activeChallenges().length }));
  log('Sheet open in B:', JSON.stringify(b4)); if (!b4.open || b4.n !== 2) fail('feuille ouverte conservée');
  await B.evaluate(() => closeSheet()); await B.waitForTimeout(500);
  // 5. réinitialisation dans A : B recharge et repart à neuf (sans reprendre la copie de secours)
  const reload = B.waitForEvent('load', { timeout: 8000 }).catch(() => fail('B recharge après effacement'));
  await A.evaluate(() => { wipeStorage(); }); await reload;
  await B.waitForSelector('#splash', { state: 'detached', timeout: 8000 }).catch(() => {}); await B.waitForTimeout(1500);
  const b5 = await B.evaluate(() => ({ n: S.sessions.length, ls: localStorage.getItem('forge.v1') })).catch(() => ({ n: -1 }));
  log('B after wipe:', JSON.stringify({ n: b5.n, ls: !!b5.ls && JSON.parse(b5.ls).zs?.length })); if (b5.n !== 0) fail('B repart à neuf après réinitialisation');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
