// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.1.8 : deux onglets (une écriture en attente qui ne contient que des trophées recalculés n'empêche plus de reprendre
// la version de l'autre onglet) ; thème choisi appliqué avant tout affichage ; bulles de séance visibles 2,2 s ;
// durée d'un exercice tenu saisie en secondes ; chaque mouvement d'échauffement animé.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v67'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', colorScheme: 'light' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, savedAt: 1 }, settings: { theme: 'dark', warmup: true }, equipment: { owned: { dumbbells: true } },
      sessions: [{ id: 'a', date: '2026-09-20', exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }] })); });
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); await p.goto(APP); await p.waitForTimeout(500); return p; };
  const A = await open();

  // 1. thème : retenu à part et appliqué par la page avant le script de l'app
  const th = await A.evaluate(() => ({ key: localStorage.getItem('forge.v1.theme'), head: [...document.head.querySelectorAll('script')].some(s => /forge\.v1\.theme/.test(s.textContent)), attr: document.documentElement.dataset.theme }));
  log('Thème :', JSON.stringify(th)); if (th.key !== 'dark' || !th.head || th.attr !== 'dark') fail('thème choisi retenu et appliqué au premier affichage');
  const early = await (async () => { const p = await ctx.newPage(); await p.route('**/*', r => r.continue());
    await p.goto(APP, { waitUntil: 'commit' }); const v = await p.evaluate(() => new Promise(ok => { const t = () => document.head && document.querySelector('style') ? ok(document.documentElement.dataset.theme || '') : setTimeout(t, 1); t(); })); await p.close(); return v; })();
  log('Thème dès le premier affichage :', early); if (early !== 'dark') fail('thème appliqué avant le rendu');

  // 2. deux onglets : B enregistre pendant que A n'a en attente que des trophées recalculés
  const B = await open();
  await A.evaluate(() => { persistNow(); S.medals.sessions = { t: 0, d: {} }; checkMedals(true); });
  const pend = await A.evaluate(() => ({ t: !!persistTimer, derived: persistDerived }));
  await B.evaluate(() => { S.sessions.push({ id: 'b', date: '2026-09-22', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }); save(); persistNow(); });
  await A.waitForFunction(() => S.sessions.length === 2, null, { timeout: 5000 }).catch(() => {});
  const a2 = await A.evaluate(() => ({ n: S.sessions.length, medal: medalTier(MEDAL_MAP.sessions) }));
  log('Attente de A :', JSON.stringify(pend), '→ A voit', JSON.stringify(a2));
  if (!pend.t || !pend.derived || a2.n !== 2 || a2.medal < 1) fail('A reprend la séance de B et recalcule ses trophées');
  // une vraie modification en attente garde la priorité (comportement voulu)
  await A.evaluate(() => { S.settings.name = 'A'; save(); });
  await B.evaluate(() => { S.settings.name = 'B'; save(); persistNow(); });
  await A.waitForTimeout(500);
  if (await A.evaluate(() => S.settings.name) !== 'A') fail('modification réelle en attente gardée');
  await B.close();

  // 3. bulles de séance : visibles plus longtemps
  const ft = await A.evaluate(() => { floatText(100, 300, 'Record !', 'pr', 'bolt'); const el = document.querySelector('.float-txt'); const cs = getComputedStyle(el); return { dur: cs.animationDuration }; });
  await A.waitForTimeout(1800);
  const still = await A.evaluate(() => !!document.querySelector('.float-txt'));
  log('Bulle :', ft.dur, '· encore là à 1,8 s :', still); if (ft.dur !== '2.2s' || !still) fail('bulle visible 2,2 s');

  // 4. séance : échauffement animé, puis durée d'un exercice tenu en secondes
  await A.evaluate(() => { S.custom = { exos: [{ exoId: 'planche', sets: 2 }] }; save(); });
  await A.evaluate(() => { const d = { id: 'd1', date: todayISO(), source: 'custom', exos: [{ exoId: 'planche', sets: [{ reps: 40 }, { reps: 40 }] }] }; S.draft = d; d.startedAt = new Date().toISOString(); warmStart(d); save(); switchTab('today'); renderView('today'); });
  await A.waitForTimeout(500);
  const wm = await A.evaluate(() => ({ card: !!document.querySelector('.sx-warm'), anim: !!document.querySelector('.sx-wanim svg.exo-anim, .sx-wanim svg'), all: Object.keys(WARM_ANIM).length,
    moves: [].concat(...Object.values(WARM_MOVES)).map(m => m[0]).filter(n => !warmDef(n)) }));
  log('Échauffement :', JSON.stringify(wm)); if (!wm.card || !wm.anim || wm.moves.length) fail('chaque mouvement d\'échauffement animé');
  await A.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_echauffement.png` });
  await A.evaluate(() => { delete S.draft.warm; save(); renderView('today'); }); await A.waitForTimeout(400);
  const pn = await A.evaluate(() => ({ title: document.querySelector('.sx-steps').innerText, dial: !!document.querySelector('.sx-durrow .dur-dial') }));
  log('Saisie :', pn.title.replace(/\s+/g, ' ').slice(0, 60)); if (!/Secondes/.test(pn.title) || /reps/i.test(pn.title) || !pn.dial) fail('durée en secondes (règle), pas en « reps »');
  await A.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}02_duree.png` });

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
