// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (indice de force sourcé) : 1RM estimé (Epley/Brzycki + répétitions en réserve), pompes en part du
// poids du corps, indice par muscle, désentraînement après 21 jours (−3 %/sem, ×1,5 à 65 ans et plus,
// −30 % au plus), reprise, statut d'entraînement, alertes, feuille « Comment c'est calculé »
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v42'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // 10 semaines de haut + bas du corps, puis 41 jours d'arrêt (−3 % × 20/7 ≈ −9 %)
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v42')) return; localStorage.setItem('__seed_v42', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; let i = 0;
    for (let k = 110; k >= 40; k -= 3, i++) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [
      { exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 8 + (i % 4), weight: 10 + Math.floor(i / 6) * 2, done: true })) },
      { exoId: 'squat_gobelet', sets: [1, 2, 3].map(() => ({ reps: 10, weight: 12 + Math.floor(i / 5) * 2, done: true })) }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18, 20, 22] } },
      sessions: ss, custom: { exos: [{ exoId: 'squat_gobelet', sets: 3 }] } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. formules : Epley + Brzycki jusqu'à 10 reps, Epley au-delà ; répétitions en réserve ; pompes en kg
  const f = await page.evaluate(() => {
    const r = x => Math.round(x * 100) / 100, dc = EXO_MAP.dc_haltere, pu = EXO_MAP.pompes;
    const p = eff => sessionPerf(dc, { sets: [{ reps: 8, weight: 20, done: true, effort: eff }] }, todayISO()).v;
    const noBody = sessionPerf(pu, { sets: [{ reps: 15, done: true }] }, todayISO());
    S.body = [{ d: addDaysISO(todayISO(), -5), kg: 80 }]; DATA_VER++;
    const withBody = sessionPerf(pu, { sets: [{ reps: 10, done: true }] }, todayISO());
    S.body = []; DATA_VER++;
    return { one: e1rmOf(10, 1), five: r(e1rmOf(10, 5)), twelve: r(e1rmOf(10, 12)), fail: r(p(3)), rir12: r(p(2)), rir3: r(p(1)), unk: r(p(0)), noBody, withBody: r(withBody.v) };
  });
  log('Formulas:', JSON.stringify(f));
  if (f.one !== 10 || f.five !== 11.46 || f.twelve !== 14 || !(f.rir3 > f.rir12 && f.rir12 > f.fail) || f.unk !== f.fail) fail('1RM estimé et répétitions en réserve');
  if (f.noBody.v !== 1.5 || f.withBody !== Math.round(((51.2 * (1 + 10 / 30)) + 51.2 * 36 / 27) / 2 * 100) / 100) fail('pompes : 1RM relatif sans pesée (1 + 15/30), 64 % du poids du corps avec');

  // 2. désentraînement : rien jusqu'à 21 jours, −3 %/sem ensuite, ×1,5 à 65 ans et plus, −30 % au plus
  const d = await page.evaluate(() => { const r = x => Math.round(x * 1000) / 1000;
    const a = [0, 21, 28, 35, 200].map(x => r(detrainFactor(x))); S.goals.senior = true; const b = r(detrainFactor(28)); S.goals.senior = false; return { a, b }; });
  log('Decay factors:', JSON.stringify(d));
  if (d.a.join() !== '1,1,0.97,0.94,0.7' || d.b !== 0.955) fail('courbe de désentraînement');

  // 3. après 40 jours d'arrêt : indice en baisse, statut « Désentraînement », alertes, accueil
  const st = await page.evaluate(() => { const last = S.sessions[S.sessions.length - 1].date, now = strengthAt(todayISO()), then = strengthAt(last);
    return { then: then.index, now: now.index, days: now.muscles.map(m => m.id + ':' + m.days + ':' + Math.round(m.f * 100)), status: trainingStatus(), alerts: detrainAlerts().map(a => a.label + (a.losing ? ' −' + a.pct + '%' : '')) }; });
  log('After 40 days off:', JSON.stringify(st));
  if (!(st.now < st.then) || Math.abs(st.now / st.then - (1 - 0.03 * (+st.days[0].split(':')[1] - 21) / 7)) > 0.02 || st.status !== 'detraining' || st.alerts.length !== 2 || !/−9%/.test(st.alerts[0])) fail('baisse après 40 jours sans séance');
  const home = await page.evaluate(() => { const g = document.querySelector('.goal-line'); return g ? { t: g.textContent, warn: g.classList.contains('warn') } : null; });
  log('Home alert:', JSON.stringify(home)); if (!home || !home.warn || !/jours sans séance, force estimée −\d+ %/.test(home.t)) fail('alerte sur l\'accueil');
  await shot('01_home_alert');
  await page.evaluate(() => switchTab('progress')); await wait(700);
  const card = await page.evaluate(() => { const c = document.querySelector('.trend-card');
    return { status: c.querySelector('.tr-status').textContent.trim(), regs: [...c.querySelectorAll('.tr-reg')].map(e => e.textContent.trim() + (e.querySelector('em') ? '!' : '')), lines: [...c.querySelectorAll('.tr-line')].map(e => e.textContent.trim()) }; });
  log('Card:', JSON.stringify(card));
  if (!/^Désentraînement · 0 série difficile sur 7 jours/.test(card.status) || card.regs.length !== 2 || !card.regs.every(r => /!$/.test(r)) || !card.lines.some(l => /sans travail, force estimée −\d+ %/.test(l))) fail('carte : statut, régions et alertes');
  await page.evaluate(() => { const c = document.querySelector('.trend-card'); document.querySelector('#v-progress').scrollTop = c.offsetTop - 70; }); await wait(300); await shot('02_card_detraining');
  // la méthode et ses sources
  await page.click('.trend-card .tr-how'); await wait(600);
  const how = await page.evaluate(() => ({ t: (document.querySelector('#overlay .sheet-hd .t') || {}).textContent, src: document.querySelectorAll('.how-src a[href^="https://"]').length, st: (document.querySelector('.how-st b') || {}).textContent }));
  log('How sheet:', JSON.stringify(how)); if (!/Comment/.test(how.t || '') || how.src < 10 || how.st !== 'Désentraînement') fail('feuille « Comment c\'est calculé » et sources');
  await shot('03_how'); await page.evaluate(() => closeSheet()); await wait(400);

  // 4. reprise : « à battre » devient « retrouve tes sensations » ; une séance arrête la baisse du muscle travaillé
  await page.evaluate(() => switchTab('today')); await wait(400);
  await page.click('.hero .hero-go'); await page.waitForSelector('#launch', { state: 'detached', timeout: 7000 }); await wait(500);
  const back = await page.evaluate(() => (document.querySelector('.fc-beat') || {}).textContent || '');
  log('Comeback line:', back); if (!/Reprise après \d+ jours/.test(back)) fail('« à battre » en mode reprise');
  await page.evaluate(() => { S.draft.exos.forEach(ex => ex.sets.forEach(s => { s.done = true; })); stopRestTimer(); finalizeSession(); }); await wait(800);
  await page.evaluate(() => { if (document.querySelector('#overlay.open')) closeSheet(); }); await wait(400);
  const after = await page.evaluate(() => { const s = strengthAt(todayISO()); return { idx: s.index, m: s.muscles.map(m => m.id + ':' + m.days + ':' + Math.round(m.f * 100)) }; });
  log('After a leg session:', JSON.stringify(after));
  const legs = after.m.find(x => x.startsWith('quadriceps')), pec = after.m.find(x => x.startsWith('pect'));
  if (!legs || !/:0:100$/.test(legs) || !pec || /:100$/.test(pec)) fail('une séance arrête la baisse du seul muscle travaillé');
  // âge : plus de 65 ans → baisse plus rapide
  await page.evaluate(() => switchTab('profil')); await wait(300);
  const sen = await page.evaluate(() => { const a = strengthAt(todayISO()).index; S.goals.senior = true; DATA_VER++; const b = strengthAt(todayISO()).index; S.goals.senior = false; DATA_VER++; return { a, b }; });
  log('Senior:', JSON.stringify(sen)); if (!(sen.b < sen.a)) fail('baisse plus rapide à 65 ans et plus');

  // double toucher rapide sur une section repliable : le contenu rouvert n'est pas vidé par la fin du repli
  await page.evaluate(() => switchTab('today')); await wait(400);
  await page.evaluate(() => { S.settings.ui.planOpen = true; renderView('today'); }); await wait(200);
  await page.evaluate(() => { const b = () => document.querySelector('[data-a="toggleSection"][data-k="planOpen"]'); b().click(); setTimeout(() => b().click(), 60); }); await wait(900);
  const plan = await page.evaluate(() => ({ open: S.settings.ui.planOpen, days: document.querySelectorAll('.week-plan .wp-day').length }));
  log('Double tap on section:', JSON.stringify(plan)); if (!plan.open || plan.days !== 7) fail('section rouverte pendant son repli');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
