// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.2.0 : glisser moins sensible, plus de saisie au clavier ; exercice tenu : règle des secondes à la place du − / +
// (chiffre blanc), « S'arrêter » enregistre le temps tenu, rappelé et adapté la fois suivante ; ressenti
// Difficile / Moyen / Facile ; plus de faux « Record » (1RM exact) ; carte d'ascension de fin simplifiée.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v69'); fs.mkdirSync(OUT, { recursive: true });
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
      sessions: [{ id: 'a', date: d(3), exos: [{ exoId: 'extension_triceps_nuque', sets: [{ reps: 10, weight: 10, done: true }] }, { exoId: 'planche', sets: [{ reps: 45, done: true }] }] }] })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(600);

  // 1. faux record : refaire exactement la même série n'est pas un record (13,33 contre 13,3 arrondi)
  const pr = await page.evaluate(() => ({ same: isNewPR('extension_triceps_nuque', 10, 10), more: isNewPR('extension_triceps_nuque', 10, 11) }));
  log('Record :', JSON.stringify(pr)); if (pr.same || !pr.more) fail('record seulement si battu');

  // 2. glisser sur le chiffre : un cran tous les 34 px ; toucher n'ouvre plus de clavier
  await page.evaluate(() => { S.draft = { id: 'd', date: todayISO(), source: 'custom', startedAt: new Date().toISOString(), exos: [{ exoId: 'pompes', sets: [{ reps: 10 }, { reps: 10 }] }, { exoId: 'planche', sets: [{ reps: 45 }, { reps: 45 }] }] }; save(); switchTab('today'); renderView('today'); });
  await page.waitForTimeout(500);
  const b = await page.evaluate(() => { const r = document.querySelector('.sx-steps .bs-val[data-f="reps"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(b.x, b.y); await page.mouse.down(); await page.mouse.move(b.x, b.y - 70, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(300);
  const g = await page.evaluate(() => S.draft.exos[0].sets[0].reps); log('70 px vers le haut :', g); if (g !== 12) fail('2 crans pour 70 px');
  await page.mouse.click(b.x, b.y); await page.waitForTimeout(400);
  if (await page.evaluate(() => !!document.querySelector('#numInput'))) fail('plus de saisie au clavier');

  // 3. exercice tenu : règle à la place du − / +, chiffre blanc
  await page.evaluate(() => { S.draft.exos.reverse(); save(); refreshFocusRegion(); }); await page.waitForTimeout(600);
  const t = await page.evaluate(() => { const n = document.querySelector('.sx-durrow .bs-val b'); return { dial: !!document.querySelector('.sx-durrow .dur-dial canvas'), pm: document.querySelectorAll('.sx-durrow .sx-pm').length, n: n && n.textContent, white: n && getComputedStyle(n).color, label: getComputedStyle(document.body).color }; });
  log('Tenu :', JSON.stringify(t)); if (!t.dial || t.pm || t.n !== '45') fail('règle à la place du − / +');
  if (/224, 122, 85|188, 87, 54/.test(t.white)) fail('chiffre blanc, pas orange');
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_regle.png` });
  const d = await page.evaluate(() => { const r = document.querySelector('.dur-dial').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(d.x, d.y); await page.mouse.down(); await page.mouse.move(d.x + 900, d.y, { steps: 25 }); await page.waitForTimeout(80); await page.mouse.up(); await page.waitForTimeout(1600);
  const mn = await page.evaluate(() => ({ v: S.draft.exos[0].sets.map(s => s.reps), n: document.querySelector('.sx-durrow .bs-val b').textContent, go: (document.querySelector('.hold-go') || {}).textContent }));
  log('Minimum :', JSON.stringify(mn)); if (mn.v.join() !== '15,15' || mn.n !== '15' || !/15 s/.test(mn.go)) fail('15 s minimum, chrono à jour');

  // 4. chrono arrêté avant la fin : « S'arrêter », temps tenu gardé, rappel et adaptation
  await page.evaluate(() => { S.draft.exos[0].sets.forEach(s => s.reps = 45); save(); refreshFocusRegion(); }); await page.waitForTimeout(400);
  await page.evaluate(() => ACT.holdStart({ exi: '0' })); await page.waitForTimeout(300);
  await page.evaluate(() => { hold.phase = 'hold'; hold.t0 = Date.now() - 32200; refreshFocusRegion(); }); await page.waitForTimeout(300);
  const stopTxt = await page.evaluate(() => document.querySelector('[data-a="holdStop"]').textContent.trim());
  await page.evaluate(() => ACT.holdStop()); await page.waitForTimeout(500);
  const st = await page.evaluate(() => { const s = S.draft.exos[0].sets[0]; return { reps: s.reps, goal: s.goal, opts: [...document.querySelectorAll('.ef-opts button')].map(b => b.textContent) }; });
  log('Arrêt :', stopTxt, JSON.stringify(st)); if (stopTxt !== "S'arrêter" || ![32, 33].includes(st.reps) || st.goal !== 45) fail('arrêt avant la fin enregistré');
  if (st.opts.join('/') !== 'Difficile/Moyen/Facile') fail('ressenti Difficile / Moyen / Facile');
  // enregistrement compact : la durée visée survit au rechargement
  const packed = await page.evaluate(() => { const s = { id: 'z', date: todayISO(), exos: [{ exoId: 'planche', sets: [{ reps: 32, goal: 45, done: true }] }] }; return unpackSession(JSON.parse(JSON.stringify(packSession(compactSession(s))))).exos[0].sets[0]; });
  if (packed.goal !== 45) fail('durée visée gardée dans le stockage');
  // séance suivante : on repart du temps tenu (30 s) et la ligne le rappelle
  const next = await page.evaluate(() => { const done = S.draft.exos[0].sets.map(s => Object.assign({}, s, { done: true, reps: 32, goal: 45 }));
    S.sessions.push({ id: 'b', date: addDaysISO(todayISO(), -1), exos: [{ exoId: 'planche', sets: done }] }); save();
    const sug = suggestForExo(EXO_MAP.planche, 2).reps; const ref = beatRef('planche', 0);
    return { sug, ref, line: beatLineHTML({ exoId: 'planche' }, EXO_MAP.planche, 0, { reps: 30 }) }; });
  log('Suite :', JSON.stringify(next.sug), next.line.replace(/<[^>]+>/g, ''));
  if (next.sug[0] !== 30 || !/La dernière fois : 32 s sur 45 s/.test(next.line.replace(/<[^>]+>/g, ''))) fail('rappel et adaptation après un arrêt');

  // 5. carte d'ascension de fin : sans « aujourd'hui », sans « X m sur Y m », sans ligne du prochain camp
  const cel = await page.evaluate(() => { const a = ascent(); const id = Object.keys(a.log).pop(); return id ? ascCelHTML(id) : ''; });
  if (cel && (/aujourd'hui/.test(cel) || / sur \d/.test(cel.replace(/<[^>]+>/g, '')) || /ca-next/.test(cel))) fail('carte d\'ascension simplifiée');
  const css = await page.evaluate(() => [...document.styleSheets].map(s => [...s.cssRules].map(r => r.cssText).join('')).join('').includes('FF9A66'));
  if (css) fail('plus d\'ancien orange vif');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
