// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.9 : motivation — joker de série (une semaine vide par mois pardonnée), progrès concrets en fin
// de séance (comparés à il y a un mois), « ton pourquoi » (inscription, Profil, rappel après 4 jours)
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v38'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(500);
  const shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` }), wait = ms => page.waitForTimeout(ms);

  // 1. joker : semaines relatives à aujourd'hui (0 = cette semaine, 1 = la précédente…)
  const streak = await page.evaluate(() => {
    const mk = weeksAgo => weeksAgo.map((w, i) => { const d = addDaysISO(weekKey(todayISO()), -7 * w + 1); return { id: 'w' + w + '_' + i, date: d, exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }; });
    const run = weeksAgo => { S.sessions = mk(weeksAgo).sort((a, b) => a.date < b.date ? -1 : 1); save(); return { n: currentStreakWeeks(), max: maxStreakWeeksEver(), recent: !!streakInfo().recent }; };
    return {
      plain: run([0, 1, 2, 3]),            // 4 semaines pleines
      oneGap: run([0, 1, 3, 4]),           // 1 trou : pardonné → 4
      twoGaps: run([0, 2, 4, 5]),          // 2 trous à moins d'un mois : le 2e casse → 2 (0 + joker 1 + 2)
      farGaps: run([0, 2, 3, 4, 5, 7, 8]), // trous espacés de 5 semaines : 2 jokers → 7
      double: run([0, 3, 4]),              // 2 semaines vides d'affilée : cassé → 1
      lastWeekEmpty: run([2, 3]),          // semaine en cours vide, précédente vide, joker → 2 (en danger)
    };
  });
  log('Streaks:', JSON.stringify(streak));
  const exp = { plain: 4, oneGap: 4, twoGaps: 2, farGaps: 7, double: 1, lastWeekEmpty: 2 };
  for (const k in exp) if (streak[k].n !== exp[k]) fail(`série ${k} : ${streak[k].n} au lieu de ${exp[k]}`);
  if (streak.plain.recent || !streak.oneGap.recent) fail('joker récent signalé');
  if (streak.double.max < 2) fail('record de série');
  await page.evaluate(() => { S.sessions = []; renderView('today'); });
  const pill = await page.evaluate(() => { const mk = w => ({ id: 'p' + w, date: addDaysISO(weekKey(todayISO()), -7 * w + 1), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] });
    S.sessions = [mk(3), mk(2), mk(0)]; save(); renderView('today'); return document.querySelector('.spill.hot .sp-l').textContent; });
  log('Pill:', pill); if (pill !== 'joker utilisé') fail('pastille « joker utilisé »');

  // 2. progrès concrets en fin de séance
  await page.evaluate(() => {
    const d = n => addDaysISO(todayISO(), -n);
    S.sessions = [
      { id: 'o1', date: d(30), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 10, done: true }] }, { exoId: 'pompes', sets: [{ reps: 12, done: true }] }, { exoId: 'planche', sets: [{ reps: 40, done: true }] }] },
      { id: 'o2', date: d(6), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 12, done: true }] }] }];
    save(); switchTab('today');
    S.custom = { exos: [{ exoId: 'dc_haltere', sets: 1 }, { exoId: 'pompes', sets: 1 }, { exoId: 'planche', sets: 1 }] }; ACT.startCustom();
  }); await wait(4400);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  await page.evaluate(() => { const e = S.draft.exos; e[0].sets[0].weight = 14; e[0].sets[0].reps = 10; e[1].sets[0].reps = 15; e[2].sets[0].reps = 40;
    e.forEach(x => x.sets.forEach(s => { s.done = true; })); finalizeSession(); }); await wait(1600);
  const prog = await page.evaluate(() => [...document.querySelectorAll('.cel-prog')].map(e => e.textContent.trim()));
  await shot('01_celebration');
  log('Progress lines:', JSON.stringify(prog));
  if (prog.length !== 2 || !/Développé couché haltères : 14 kg, \+4 kg depuis le/.test(prog.join('|')) || !/Pompes : 15 reps, \+3 reps/.test(prog.join('|'))) fail('lignes de progrès (charge +4 kg, pompes +3)');
  if (prog.some(t => /Planche/.test(t))) fail('pas de ligne sans progrès');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 3. « ton pourquoi » : Profil → enregistré ; rappel après 4 jours sans séance ; lancement
  await page.evaluate(() => { switchTab('profil'); }); await wait(500);
  await page.click('[data-a="editWhy"]'); await wait(300);
  await page.fill('#whyInput', 'Être en forme pour la rando <b>d\'été</b>'); await page.click('[data-a="saveWhy"]'); await wait(400);
  const prof = await page.evaluate(() => ({ why: S.settings.why, shown: document.querySelector('.ph-why').textContent.trim(), html: document.querySelector('.ph-why').innerHTML.includes('<b>') }));
  log('Why in profile:', JSON.stringify(prof)); if (!/Être en forme/.test(prof.why) || !/« Être en forme/.test(prof.shown) || prof.html) fail('pourquoi enregistré et échappé');
  const card = await page.evaluate(() => { S.sessions.forEach((s, i) => { s.date = addDaysISO(todayISO(), -5 - i); }); S.sessions.sort((a, b) => a.date < b.date ? -1 : 1); save(); switchTab('today'); renderView('today');
    return { card: !!document.querySelector('.why-card'), text: (document.querySelector('.why-card .why-t') || {}).textContent, tag: splashTagline() }; });
  await wait(400); await shot('02_why_card');
  log('Why reminder:', JSON.stringify(card)); if (!card.card || !/Être en forme/.test(card.text) || !/Être en forme/.test(card.tag)) fail('rappel du pourquoi après 4 jours');
  const noCard = await page.evaluate(() => { S.sessions[S.sessions.length - 1].date = addDaysISO(todayISO(), -1); save(); renderView('today'); return !!document.querySelector('.why-card'); });
  if (noCard) fail('pas de rappel si séance récente');
  // persistance + limite de longueur
  await page.evaluate(() => { S.settings.why = 'x'.repeat(300); persistNow(true); }); await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 });
  const len = await page.evaluate(() => S.settings.why.length); if (len !== 120) fail('pourquoi limité à 120 caractères : ' + len);

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
