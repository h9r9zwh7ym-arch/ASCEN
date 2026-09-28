// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.0 : robustesse — données abîmées au démarrage, action qui échoue, double appui
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v29'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  // 1. état abîmé : entrées illisibles, exercices inconnus, types inattendus
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true },
      sessions: [null, { date: 'hier' }, { date: '2026-09-01', exos: 'x' },
        { id: 'ok1', date: '2026-09-02', durationSec: 1800, exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }, null] }, { exoId: 'exercice_disparu', sets: [{ reps: 8, done: true }] }, 7] },
        { id: 'ok2', date: '2026-09-05T08:00:00Z', exos: [{ exoId: 'squat_pdc', sets: [{ reps: 15, done: true }] }] }],
      custom: { exos: [{ exoId: 'exercice_disparu', sets: 3 }, { exoId: 'pompes', sets: 3 }, null] },
      templates: [{ id: 't1', n: 'Haut', days: [1, 9, -2], exos: [{ exoId: 'exercice_disparu', sets: 3 }, { exoId: 'dc_haltere', sets: 3 }] }, { n: 'sans id' }, 'x'],
      draft: { exos: [{ exoId: 'exercice_disparu', sets: [] }] },
      targets: [{ id: 'g1', exoId: 'exercice_disparu', kind: 'reps', value: 10 }, { id: 'g2', exoId: 'pompes', kind: 'reps', value: 30 }],
      medals: [1, 2], prefs: { excluded: 'pompes', included: null } })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);
  const st = await page.evaluate(() => ({ sessions: S.sessions.length, unknownKept: S.sessions.some(s => s.exos.some(e => e.exoId === 'exercice_disparu')), custom: S.custom.exos.map(e => e.exoId).join(','),
    tpl: S.templates.map(t => t.n + ':' + t.exos.length + ':' + t.days.join('')).join('|'), draft: !!(S.draft && S.draft.exos.some(e => !EXO_MAP[e.exoId])), targets: S.targets.length, medals: Array.isArray(S.medals), excl: Array.isArray(S.prefs.excluded) }));
  log('Sanitized:', JSON.stringify(st));
  if (st.sessions !== 2 || !st.unknownKept) fail('séances lisibles gardées (historique intact)');
  if (st.custom !== 'pompes' || st.tpl !== 'Haut:1:1' || st.draft || st.targets !== 1 || st.medals || !st.excl) fail('nettoyage de l\'état');
  for (const t of ['history', 'progress', 'profil', 'today']) { await page.evaluate(t => switchTab(t), t); await wait(500); }
  await page.evaluate(() => { const s = S.sessions.find(x => x.id === 'ok1'); ACT.openSessionDetail({ id: s.id }); }); await wait(700); await shot('01_detail_unknown_exo');
  await page.evaluate(() => closeSheet()); await wait(400);
  // 2. une action qui échoue : message sobre, l'app continue
  await page.evaluate(() => { ACT.boom = () => { throw new Error('test'); }; const b = document.createElement('button'); b.id = 'boom'; b.dataset.a = 'boom'; b.textContent = 'boom'; b.style.cssText = 'position:fixed;top:100px;left:10px;z-index:99'; document.body.appendChild(b); });
  await page.click('#boom'); await wait(500);
  const toastTxt = await page.$eval('#toast', e => e.textContent); const logged = await page.evaluate(() => ERR_LOG.length);
  log('After failing action:', JSON.stringify(toastTxt), 'logged:', logged); if (!/rien n'est perdu/.test(toastTxt) || logged < 1) fail('erreur d\'action contenue');
  await page.evaluate(() => { document.getElementById('boom').remove(); switchTab('history'); }); await wait(400);
  const ok = await page.$eval('#v-history .lt', e => e.textContent).catch(() => null); if (ok !== 'Historique') fail('app utilisable après une erreur');
  // 3. double appui sur « Valider la série » : une seule série validée
  await page.evaluate(() => { switchTab('today'); S.custom.exos = [{ exoId: 'pompes', sets: 3 }]; save(); ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(700);
  await page.evaluate(() => { const b = document.querySelector('[data-a="validateSet"]'); b.click(); b.click(); }); await wait(600);
  const done = await page.evaluate(() => S.draft.exos[0].sets.filter(s => s.done).length);
  log('Sets done after double tap:', done); if (done !== 1) fail('double appui ignoré');
  await shot('02_after_double_tap');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
