// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (progrès et intelligence) : records non confirmés qui s'estompent (un jour sans ne compte pas),
// forme de chaque séance et statut « Fatigue », séance prévue manquée à rattraper, régularité du mois,
// fin de séance qui montre ce qui a progressé, « Toi, il y a 3 mois »
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v48'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // 100 jours de développé couché qui passe de 10 à 14 kg (10 répétitions), une séance tous les 4 jours
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v48')) return; localStorage.setItem('__seed_v48', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; for (let k = 100; k >= 4; k -= 4) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [{ exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 10, weight: 10 + Math.round((100 - k) / 24), done: true })) }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 11, 12, 13, 14, 16] } }, sessions: ss })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. « Toi, il y a 3 mois » : accueil, Progrès, réglage
  const tn = await page.evaluate(() => { const l = thenVsNow(); return { n: l.length, first: l[0] && { id: l[0].def.id, label: l[0].label, then: l[0].then.txt, now: l[0].now.txt, pct: l[0].pct }, card: !!document.querySelector('#v-today .tn-card') }; });
  log('Then vs now:', JSON.stringify(tn));
  if (!tn.first || tn.first.id !== 'dc_haltere' || tn.first.label !== 'Il y a 3 mois' || !/^10 × 1[01] kg$/.test(tn.first.then) || tn.first.now !== '10 × 14 kg' || tn.first.pct < 25 || !tn.card) fail('« Toi, il y a 3 mois »');
  await page.evaluate(() => { const c = document.querySelector('.tn-card'); document.querySelector('#v-today').scrollTop = c.offsetTop - 120; }); await wait(300); await shot('01_then_now');
  await page.click('.tabbtn[data-id="progress"]'); await wait(700);
  const list = await page.evaluate(() => document.querySelectorAll('#v-progress .tn-list .tn-li').length);
  await page.evaluate(() => { S.settings.thenNow = false; save(); renderView('progress'); renderView('today'); });
  const off = await page.evaluate(() => !!document.querySelector('.tn-card, .tn-list'));
  await page.evaluate(() => { S.settings.thenNow = true; save(); renderView('progress'); });
  log('Progress list:', list, '| hidden when off:', !off); if (list < 1 || off) fail('liste dans Progrès et réglage');

  // 2. records non confirmés : un jour sans ne change rien, une baisse qui dure finit par se voir
  const fade = await page.evaluate(() => {
    const saved = S.sessions, sess = (k, w, r, eff) => ({ id: 'f' + k + '_' + w, date: addDaysISO(todayISO(), -k), exos: [{ exoId: 'dc_haltere', sets: [{ reps: r || 10, weight: w, done: true, effort: eff }] }] });
    const idx = list => { S.sessions = list; DATA_VER++; return strengthAt(todayISO()).index; };
    const ramp = [60, 57, 54, 50, 40, 30].map((k, i) => sess(k, [10, 10, 11, 12, 13, 14][i]));
    const a = idx(ramp.concat([sess(20, 14)])), oneBad = idx(ramp.concat([sess(20, 14), sess(3, 11)]));
    const peakThenLower = idx([60, 57, 54].map(k => sess(k, 10)).concat([sess(50, 16)], [30, 20, 10, 3].map(k => sess(k, 13))));
    S.sessions = saved; DATA_VER++;
    return { a, oneBad, peakThenLower, fade: [peakFade(2), Math.round(peakFade(5) * 1000) / 1000, peakFade(30)] };
  });
  log('Peaks:', JSON.stringify(fade));
  if (fade.oneBad !== fade.a || !(fade.peakThenLower > 140 && fade.peakThenLower < 158) || fade.fade.join() !== '1,0.955,0.85') fail('records qui s\'estompent, jour sans ignoré');

  // 3. forme des séances : 3 séances nettement sous la forme habituelle → « Fatigue », semaine allégée conseillée ;
  //    une séance faite exprès plus facilement (« 3 ou + » en réserve) ne compte pas
  const fat = await page.evaluate(() => {
    const saved = S.sessions, sess = (k, r, eff) => ({ id: 'g' + k, date: addDaysISO(todayISO(), -k), exos: [{ exoId: 'dc_haltere', sets: [1, 2, 3, 4].map(() => ({ reps: r, weight: 12, done: true, effort: eff })) }] });
    S.sessions = [33, 30, 27, 24, 21, 18, 15, 12].map(k => sess(k, 10)).concat([9, 6, 3].map(k => sess(k, 7, 3))); DATA_VER++;
    const r = { forms: S.sessions.slice(-3).map(s => Math.round(sessionForm(s).ratio * 100)), trend: formTrend(), status: trainingStatus(), advice: deloadAdvice() };
    S.sessions[S.sessions.length - 1].exos[0].sets.forEach(st => st.effort = 1); DATA_VER++;
    r.easy = sessionForm(S.sessions[S.sessions.length - 1]); r.trendEasy = formTrend();
    S.sessions = saved; DATA_VER++;
    return r;
  });
  log('Form:', JSON.stringify(fat));
  if (fat.forms.some(f => f >= 94) || !fat.trend || fat.status !== 'fatigue' || !fat.advice || fat.advice.kind !== 'fatigue' || fat.easy || fat.trendEasy) fail('forme des séances et fatigue');

  // 4. fin de séance : force estimée record, zone de progrès atteinte, jour sans
  const wins = await page.evaluate(() => {
    const saved = S.sessions, mk = (k, w, r, n) => ({ id: 'w' + k + '_' + w, date: addDaysISO(todayISO(), -k), exos: [{ exoId: 'dc_haltere', sets: Array.from({ length: n || 3 }, () => ({ reps: r || 10, weight: w, done: true })) }] });
    S.sessions = [20, 16, 12].map(k => mk(k, 12)).concat([mk(2, 12, 10, 3)]);
    const today = mk(0, 14, 10, 2); S.sessions.push(today); DATA_VER++;
    const good = sessionWins(today).map(w => w.ic + ':' + w.t);
    S.sessions = [20, 16, 12, 8].map(k => mk(k, 12)); const bad = mk(0, 12, 7, 3); S.sessions.push(bad); DATA_VER++;
    const low = sessionWins(bad).map(w => (w.soft ? 'soft:' : '') + w.t);
    S.sessions = saved; DATA_VER++;
    return { good, low };
  });
  log('Session wins:', JSON.stringify(wins));
  if (!wins.good.some(t => /^bolt:.*force estimée record \(\+\d+ %\)/.test(t)) || !wins.good.some(t => /^target:Pectoraux : zone de progrès atteinte cette semaine \(5 séries\)/.test(t)) || !wins.low.some(t => /^soft:Un peu en dessous de ta forme habituelle \(−\d+ %\)/.test(t)) || wins.good.some(t => /grande forme/.test(t))) fail('ce qui a progressé en fin de séance');

  // 5. séance prévue manquée cette semaine : carte de rattrapage ; régularité du mois
  const wd = await page.evaluate(() => weekdayIdx(todayISO()));
  if (wd > 0) {
    await page.click('.tabbtn[data-id="today"]'); await wait(400);
    const miss = await page.evaluate(wd => { S.templates = [{ id: 'tm', n: 'Haut du corps', days: [wd - 1], exos: [{ exoId: 'dc_haltere', sets: 3 }], since: addDaysISO(todayISO(), -40) }];
      S.sessions = S.sessions.filter(s => s.date !== addDaysISO(todayISO(), -1)); save(); renderView('today');
      return { card: (document.querySelector('.dl-card.miss .dl-t') || {}).textContent, m: missedPlanned() && missedPlanned().t.id, adh: monthPlanAdherence() }; }, wd);
    await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 0; }); await wait(300); await shot('02_missed');
    await page.click('[data-a="missCatchUp"]'); await wait(600);
    const caught = await page.evaluate(() => ({ tpl: S.custom.tplId, mode: S.settings.todayTab, card: !!document.querySelector('.dl-card.miss') }));
    await page.evaluate(() => { S.custom = { exos: [] }; save(); renderView('today'); }); await wait(200);
    await page.click('[data-a="missSkip"]'); await wait(400);
    const skipped = await page.evaluate(() => ({ card: !!document.querySelector('.dl-card.miss'), m: missedPlanned() }));
    log('Missed:', JSON.stringify(miss), '| catch-up:', JSON.stringify(caught), '| skip:', JSON.stringify(skipped));
    if (!/Séance manquée : Haut du corps/.test(miss.card || '') || miss.m !== 'tm' || !miss.adh || !(miss.adh.planned >= 1) || miss.adh.done > miss.adh.planned || caught.tpl !== 'tm' || caught.mode !== 'custom' || skipped.card || skipped.m) fail('rattrapage d\'une séance manquée');
    await page.click('.tabbtn[data-id="progress"]'); await wait(500);
    const reg = await page.evaluate(() => { ACT.progressTab({ v: 'overview' }); return [...document.querySelectorAll('#v-progress .cc-s')].map(e => e.textContent).find(t => /ce mois/.test(t)) || ''; });
    log('Regularity:', reg); if (!/ce mois : \d+ séances? sur \d+ prévues?/.test(reg)) fail('régularité du mois');
  } else log('Monday: missed-session check skipped (nothing earlier this week)');

  // 6. la fin de séance affiche ces lignes (vraie séance)
  await page.evaluate(() => { switchTab('today'); S.templates = []; S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }] }; save(); ACT.startCustom(); }); await wait(4400);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(400);
  await page.evaluate(() => { S.draft.exos.forEach(ex => ex.sets.forEach(s => { s.weight = 16; s.reps = 10; s.done = true; })); stopRestTimer(); finalizeSession(); }); await wait(1600);
  const cel = await page.evaluate(() => [...document.querySelectorAll('.cel .cel-win')].map(e => e.textContent));
  log('Celebration:', JSON.stringify(cel)); if (!cel.some(t => /force estimée record/.test(t))) fail('lignes de progrès à la fin de la séance');
  await shot('03_celebration');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
