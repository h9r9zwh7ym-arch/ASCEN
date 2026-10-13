// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Revue « vraie app » (lots A, B, C) : séance lisible sur iPhone SE, noms d'exercices sur deux lignes et nom anglais
// à part, haltères choisis en touchant des charges, matériel et objectif en listes à cocher, corrections
// d'historique protégées (« Ignorer les modifications ? »), et les finitions des lots suivants.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v61'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    const ss = [];
    for (let k = 40; k >= 2; k -= 4) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2100, name: 'Haut du corps',
        exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) },
          { exoId: 'squat_gobelet', sets: [0, 1, 2].map(() => ({ reps: 12, weight: 14, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } }, sessions: ss })); };

  // 1. premier lancement : matériel et objectif en listes à cocher, haltères en charges à toucher
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(600);
    await page.click('[data-a="obNext"]'); await page.waitForTimeout(500);
    await page.click('[data-a="obEquip"][data-id="dumbbells"]'); await page.waitForTimeout(700);
    const ob = await page.evaluate(() => { const b = document.querySelector('#obBody'), r = b.getBoundingClientRect(), g = document.querySelector('.ob-kg').getBoundingClientRect();
      return { over: b.scrollWidth > b.clientWidth + 1, rows: document.querySelectorAll('.ob-list .ob-eq').length, aria: document.querySelector('.ob-eq[data-id="dumbbells"]').getAttribute('aria-checked'),
        kgVisible: g.top < r.bottom && g.bottom > r.top, chips: document.querySelectorAll('.ob-w').length, text: !!document.querySelector('#obDb') }; });
    for (const v of ['2.5', '10']) await page.click(`[data-a="obDbW"][data-v="${v}"]`);
    await page.fill('#obDbAdd', '11,25'); await page.press('#obDbAdd', 'Enter'); await page.waitForTimeout(250);
    await page.fill('#obDbAdd', 'abc'); await page.click('[data-a="obDbAdd"]'); await page.waitForTimeout(250);
    const kg = await page.evaluate(() => ({ w: S.equipment.weights.dumbbells.join(','), on: [...document.querySelectorAll('.ob-w.on')].map(b => b.textContent).join(' '), toast: document.querySelector('#toast').textContent }));
    await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_ob_kg_320.png` });
    log('Onboarding:', JSON.stringify(ob), JSON.stringify(kg));
    if (ob.over || ob.rows !== 14 || ob.aria !== 'true' || !ob.kgVisible || ob.chips < 20 || ob.text) fail('matériel en liste et charges visibles');
    if (kg.w !== '2.5,10,11.25' || kg.on !== '2,5 10 11,25' || !/entre/.test(kg.toast)) fail('charges des haltères');
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed);
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 2. correction d'une séance passée : quitter avec des changements demande confirmation
  await page.evaluate(() => openSheet(sessionDetailHTML(S.sessions[S.sessions.length - 1]))); await wait(500);
  await page.click('[data-a="histEdit"]'); await wait(500);
  await page.fill('.he-in[data-k="reps"]', '15'); await page.dispatchEvent('.he-in[data-k="reps"]', 'change'); await wait(100);
  await page.click('[data-a="heCancel"]'); await wait(500);
  const ask = await page.evaluate(() => ({ label: (document.querySelector('.as-label, .action-sheet .as-t, #overlay .as-msg') || {}).textContent || document.querySelector('#overlay').textContent.slice(0, 200), btns: [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim()) }));
  await shot('02_he_ask');
  await page.click('[data-a="heResume"]'); await wait(500);
  const kept = await page.evaluate(() => (document.querySelector('.he-in[data-k="reps"]') || {}).value);
  await page.click('[data-a="heCancel"]'); await wait(400); await page.click('[data-a="heDiscard"]'); await wait(500);
  const after = await page.evaluate(() => ({ reps: S.sessions[S.sessions.length - 1].exos[0].sets[0].reps, detail: !!document.querySelector('#overlay [data-a="histEdit"]') }));
  log('History edit guard:', JSON.stringify(ask.btns), kept, JSON.stringify(after));
  if (!ask.btns.some(t => /Ignorer les modifications/.test(t)) || !ask.btns.some(t => /Continuer à modifier/.test(t)) || kept !== '15' || after.reps !== 10 || !after.detail) fail('corrections d\'historique protégées');
  // sans changement : « Annuler » revient directement au détail
  await page.click('[data-a="histEdit"]'); await wait(400); await page.click('[data-a="heCancel"]'); await wait(400);
  if (!(await page.$('#overlay [data-a="histEdit"]'))) fail('annuler sans changement');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 3. noms longs : deux lignes plutôt qu'une coupure ; nom anglais à part dans la fiche
  const names = await page.evaluate(() => { const e = EXOS_ALL.filter(x => x.aka); return { n: e.length, paren: EXOS_ALL.filter(x => /\(([^)]*\b(press|curl|row|raise|fly|pull|push|lunge|bridge|dip)s?\b[^)]*)\)/i.test(x.n)).map(x => x.n) }; });
  log('Aliases:', JSON.stringify(names));
  if (names.n < 10 || names.paren.length) fail('noms anglais séparés');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
