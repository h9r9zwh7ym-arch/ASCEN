// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (moteur) : les propositions visent les muscles sous le seuil de la semaine (sauf s'ils récupèrent),
// l'expliquent, et la carte Stimulus compose une séance pour eux ; semaine allégée conseillée après
// 6 semaines chargées, appliquée aux séances (≈ 40 % de séries en moins, même charge, 2 reps de moins),
// suivie sur l'accueil, en séance et dans le Profil, avec ses sources
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v47'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // 8 semaines régulières (3 séances : jambes, pecs, jambes), la dernière séance (jambes) il y a 3 jours :
  // dos, biceps et épaules sont sous le seuil cette semaine
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v47')) return; localStorage.setItem('__seed_v47', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const legs = { exoId: 'squat_gobelet', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 14, done: true })) }, push = { exoId: 'dc_haltere', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 12, done: true })) };
    const ss = [];
    for (let k = 59; k >= 3; k--) { const dow = (new Date(Date.now() - k * 864e5)).getDay(); if ([1, 3, 5].includes(dow)) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [JSON.parse(JSON.stringify(dow === 3 ? push : legs))] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { todayTab: 'proposal' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } }, sessions: ss })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. moteur : manque de stimulus dans le score, propositions tournées vers les muscles en retard
  const eng = await page.evaluate(() => {
    const d = { dos: stimDeficit('dos'), quad: stimDeficit('quadriceps'), biceps: stimDeficit('biceps') };
    const runs = []; for (let i = 0; i < 6; i++) { const s = generateEngineSession('full'); runs.push(s.exos.filter(e => !isStretch(EXO_MAP[e.exoId])).map(e => EXO_MAP[e.exoId].muscles[0])); }
    const draft = generateEngineSession('auto'); S.draft = draft; save(); renderView('today');
    const add = suggestComplement([], 3).map(e => e.muscles[0]);
    return { d, upper: runs.map(r => r.filter(m => ['dos', 'biceps', 'epaules'].includes(m)).length), stim: draft.stim, add };
  });
  log('Engine:', JSON.stringify(eng));
  if (!(eng.d.dos === 1 && eng.d.biceps === 1 && eng.d.quad <= 0) || eng.upper.some(n => n < 2) || !/^Priorité à/.test(eng.stim || '') || !eng.add.some(m => ['dos', 'biceps', 'epaules'].includes(m))) fail('propositions guidées par le stimulus');
  await wait(300);
  const line = await page.evaluate(() => (document.querySelector('#v-today .pc-stim') || {}).textContent || '');
  log('Proposal line:', line); if (!/en retard cette semaine/.test(line)) fail('ligne d\'explication dans la proposition');
  await shot('01_proposal');

  // 2. carte Stimulus : « Composer une séance pour ces muscles » remplit Ma séance
  await page.click('.tabbtn[data-id="progress"]'); await wait(500);
  await page.evaluate(() => ACT.progressTab({ v: 'muscles' })); await wait(700);
  const btn = await page.evaluate(() => (document.querySelector('[data-a="stimSession"]') || {}).textContent || '');
  await page.click('[data-a="stimSession"]'); await wait(700);
  const comp = await page.evaluate(() => ({ tab: currentTab, mode: S.settings.todayTab, muscles: S.custom.exos.map(e => EXO_MAP[e.exoId].muscles[0]), toast: document.getElementById('toast').textContent }));
  log('Compose for lagging muscles:', btn.trim(), JSON.stringify(comp));
  if (!/Composer une séance/.test(btn) || comp.tab !== 'today' || comp.mode !== 'custom' || !comp.muscles.length || comp.muscles.includes('quadriceps') || comp.muscles.length > 6 || !/dans Ma séance/.test(comp.toast)) fail('séance composée pour les muscles en retard');
  await page.evaluate(() => { S.custom = { exos: [] }; S.settings.todayTab = 'proposal'; save(); renderView('today'); }); await wait(300);

  // 3. semaine allégée : conseillée après 6 semaines chargées, explication sourcée
  const adv = await page.evaluate(() => ({ streak: loadedWeeksStreak(), a: deloadAdvice(), card: (document.querySelector('.dl-card') || {}).textContent || '' }));
  log('Deload advice:', JSON.stringify({ streak: adv.streak, a: adv.a }), adv.card.replace(/\s+/g, ' ').trim().slice(0, 90));
  if (adv.streak < 6 || !adv.a || adv.a.kind !== 'streak' || !/Semaine allégée conseillée/.test(adv.card)) fail('semaine allégée conseillée');
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 0; }); await shot('02_advice');
  await page.click('.dl-card [data-a="deloadHow"]'); await wait(600);
  const how = await page.evaluate(() => ({ h: [...document.querySelectorAll('#overlay .how-body h3')].map(e => e.textContent), src: document.querySelectorAll('#overlay .how-src a[href^="https://"]').length, start: !!document.querySelector('#overlay [data-a="deloadStart"]') }));
  log('Deload sheet:', JSON.stringify(how)); if (how.h.length < 4 || how.src < 4 || !how.start) fail('explication et sources');
  await shot('03_how'); await page.evaluate(() => closeSheet()); await wait(400);

  // 4. on la lance : séances ajustées (séries −40 %, même charge, 2 reps de moins), suivi sur l'accueil
  const before = await page.evaluate(() => { const e = sessionEntryFor(EXO_MAP.dc_haltere); return { n: e.sets.length, w: e.sets[0].weight, r: e.sets[0].reps }; });
  await page.click('.dl-card [data-a="deloadStart"]'); await wait(600);
  const on = await page.evaluate(() => { const e = sessionEntryFor(EXO_MAP.dc_haltere), pl = sessionEntryFor(EXO_MAP.planche);
    return { active: deloadActive(), n: e.sets.length, w: e.sets[0].weight, r: e.sets[0].reps, dl: e.deload, note: e.note, plank: pl.sets.length, draft: S.draft.exos.filter(x => !isStretch(EXO_MAP[x.exoId])).every(x => x.deload),
      card: (document.querySelector('.dl-card.on .dl-t') || {}).textContent, bar: document.querySelectorAll('.dl-card.on .dl-bar i.on').length, advice: deloadAdvice() }; });
  log('Deload on:', JSON.stringify(before), '→', JSON.stringify(on));
  if (!on.active || on.n !== Math.max(2, Math.round(before.n * .6)) || on.w !== before.w || !(on.r <= before.r - 1) || !on.dl || !/Semaine allégée/.test(on.note) || !on.draft || !/jour 1 sur 7/.test(on.card || '') || on.bar !== 1 || on.advice) fail('séances ajustées pendant la semaine allégée');
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 0; }); await wait(300); await shot('04_active');
  // en séance : la ligne « à battre » devient un rappel de marge
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'squat_gobelet', sets: 4 }] }; save(); ACT.startCustom(); }); await wait(4400);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  const live = await page.evaluate(() => ({ beat: (document.querySelector('.fc-beat') || {}).textContent || '', sets: S.draft.exos[0].sets.length }));
  log('Live:', JSON.stringify(live)); if (!/Semaine allégée/.test(live.beat) || live.sets !== 2) fail('séance allégée en cours');
  await shot('05_live');
  await page.evaluate(() => { S.draft = null; S.custom = { exos: [] }; save(); renderView('today'); }); await wait(300);
  // Profil : la ligne montre la semaine en cours ; on l'arrête depuis la feuille
  await page.click('.tabbtn[data-id="profil"]'); await wait(500);
  const prof = await page.evaluate(() => (document.querySelector('[data-a="deloadHow"] .s') || {}).textContent);
  await page.click('#v-profil [data-a="deloadHow"]'); await wait(600);
  await page.click('#overlay [data-a="deloadStop"]'); await wait(500);
  const off = await page.evaluate(() => ({ active: deloadActive(), log: S.deloadLog.length, n: sessionEntryFor(EXO_MAP.dc_haltere).sets.length, advice: deloadAdvice() }));
  log('Profile row:', prof, '| stopped:', JSON.stringify(off));
  if (!/En cours/.test(prof || '') || off.active || off.log !== 1 || off.n !== before.n || off.advice) fail('arrêt et pas de nouveau conseil tout de suite');

  // 5. fin naturelle : mot de reprise sur l'accueil ; « Plus tard » repousse d'une semaine
  const end = await page.evaluate(() => { S.deload = { start: addDaysISO(todayISO(), -8), end: addDaysISO(todayISO(), -1) }; save(); switchTab('today'); renderView('today');
    const done = !!document.querySelector('.dl-card.done'); S.deload = null; S.deloadLog = []; S.meta.deloadSnooze = null; save(); renderView('today');
    const again = !!deloadAdvice(); ACT.deloadLater(); return { done, again, later: deloadAdvice(), snooze: S.meta.deloadSnooze }; });
  log('End / later:', JSON.stringify(end)); if (!end.done || !end.again || end.later || !end.snooze) fail('reprise et « Plus tard »');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
