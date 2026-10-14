// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.2.1 : sons distincts (série, mieux que la dernière fois, exercice terminé, record, fin de séance), glisser et règle
// moins sensibles, prochain camp « Camp 2 – Alpage » avec un délai dit en clair.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v70'); fs.mkdirSync(OUT, { recursive: true });
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
      sessions: [{ id: 'a', date: d(3), exos: [{ exoId: 'curl_biceps', sets: [{ reps: 10, weight: 10, done: true }, { reps: 10, weight: 10, done: true }] }, { exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }] })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(600);

  // 1. les cinq sons existent et se jouent sans erreur (contexte audio réel, après un geste)
  await page.mouse.click(5, 400); await page.waitForTimeout(200);
  const play = await page.evaluate(async () => { const names = ['set', 'beat', 'exo', 'pr', 'complete']; const bad = [];
    for (const n of names) { try { if (typeof SFX[n] !== 'function') bad.push(n); else if (audioReady && audioReady()) SFX[n](); } catch (e) { bad.push(n + ':' + e.message); } }
    const src = names.map(n => SFX[n].toString()); return { bad, distinct: new Set(src).size }; });
  log('Sons :', JSON.stringify(play)); if (play.bad.length || play.distinct !== 5) fail('cinq sons distincts');

  // 2. en séance : le bon son au bon moment
  await page.evaluate(() => { window.__snd = []; window.sfx = (n) => window.__snd.push(n);
    const s = (id, w, r, n) => ({ exoId: id, sets: Array.from({ length: n }, () => ({ reps: r, weight: w })) });
    S.draft = { id: 'd', date: todayISO(), source: 'custom', startedAt: new Date().toISOString(), exos: [s('curl_biceps', 10, 10, 3), s('pompes', 0, 10, 2)] }; save(); switchTab('today'); renderView('today'); });
  await page.waitForTimeout(400);
  const v = async (mut) => page.evaluate(m => { const ex = S.draft.exos.find(e => e.sets.some(s => !s.done)); const st = ex.sets.find(s => !s.done); if (m) Object.assign(st, m);
    ACT.validateSet({ exi: String(S.draft.exos.indexOf(ex)) }); if (typeof stopRestTimer === 'function') stopRestTimer(); return window.__snd[window.__snd.length - 1]; }, mut);
  const seq = [await v({ reps: 9 }), await v({ reps: 12, weight: 12.5 }), await v({ reps: 9 }), await v({ reps: 11 }), await v({ reps: 9 })];
  log('Séance :', seq.join(' → ')); if (seq.join() !== 'set,pr,exo,beat,exo') fail('série / record / exercice terminé / mieux / dernier exercice');

  // 3. fin de séance : le son de fin
  await page.evaluate(() => { window.__snd = []; finalizeSession(); }); await page.waitForTimeout(500);
  const fin = await page.evaluate(() => window.__snd); log('Fin :', fin.join(',')); if (!fin.includes('complete')) fail('son de fin de séance');

  // 4. sensibilités
  const sens = await page.evaluate(() => ({ px: VAL_PX, step: DUR_PX }));
  log('Sensibilité :', JSON.stringify(sens)); if (sens.px < 44 || +sens.step < 20) fail('glisser et règle moins sensibles');

  // 5. prochain camp : tiret à la place du point, délai dit en clair
  const nx = await page.evaluate(() => { const a = ascent(); const h = ascNextHTML(a); return { h, line: ascEtaLine({ txt: '≈ 2 séances', time: '≈ 4 semaines' }) }; });
  log('Délai :', nx.line); if (nx.line !== '≈ 2 séances, soit 4 semaines à ton rythme') fail('délai dit en clair');
  if (/Camp \d · /.test(nx.h)) fail('plus de point entre le camp et son nom');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
