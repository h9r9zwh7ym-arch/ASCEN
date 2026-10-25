// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.5.0 : une app qui comprend. Fatigue en séance (les répétitions en moins d'un exercice placé après
// beaucoup de séries sur le même muscle ne sont pas un échec ; force ramenée « à frais » ; objectif du
// jour selon la place ; « mieux, fatigue comprise »), et manière de faire apprise (aller au bout de ses
// séries, rythme de charge, répétitions habituelles), carte « Ce que l'app a compris ».
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v73'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);

  // 1. le développé couché arrive après 9 séries de pompes : 6 répétitions à 20 kg, « à fond »
  const r = await page.evaluate(() => {
    const t = todayISO(), d = k => addDaysISO(t, -k);
    const pomp = () => ({ exoId: 'pompes', sets: Array.from({ length: 9 }, () => ({ reps: 12, done: true })) });
    const dc = (reps, eff) => ({ exoId: 'dc_haltere', targetReps: [8, 12], sets: Array.from({ length: 3 }, () => ({ reps, weight: 20, done: true, effort: eff })) });
    const run = sessions => { S.sessions = sessions; sessionTouched(); save(); return suggestForExo(EXO_MAP.dc_haltere, 3, false, 0); };
    const late = run([{ id: 'a', date: d(4), exos: [pomp(), dc(6, 3)] }, { id: 'b', date: d(2), exos: [pomp(), dc(6, 3)] }]);
    const fresh = run([{ id: 'a', date: d(4), exos: [dc(6, 3)] }, { id: 'b', date: d(2), exos: [dc(6, 3)] }]);
    // force estimée : la même série vaut plus quand elle vient après 9 séries du muscle
    const sL = (() => { S.sessions = [{ id: 'a', date: d(2), exos: [pomp(), dc(6, 2)] }]; sessionTouched(); save(); return strengthData().exos.dc_haltere[0].v; })();
    const sF = (() => { S.sessions = [{ id: 'a', date: d(2), exos: [dc(6, 2)] }]; sessionTouched(); save(); return strengthData().exos.dc_haltere[0].v; })();
    return { late: { w: late.weight, reps: late.reps, note: late.note }, fresh: { w: fresh.weight, reps: fresh.reps, note: fresh.note }, sL, sF };
  });
  log('Late vs fresh:', JSON.stringify(r));
  if (r.late.w !== 20 || !/fatigue/.test(r.late.note || '')) fail('fin de séance : la charge est gardée, la fatigue est nommée');
  if (!(r.fresh.w < 20)) fail('à frais, le même échec fait baisser la charge');
  if (!(r.sL > r.sF * 1.05)) fail('force ramenée « à frais » pour un exercice fatigué');

  // 2. l'objectif du jour suit la place de l'exercice dans la séance
  const pos = await page.evaluate(() => {
    const t = todayISO();
    S.sessions = [{ id: 'a', date: addDaysISO(t, -3), exos: [{ exoId: 'dc_haltere', targetReps: [8, 12], sets: Array.from({ length: 3 }, () => ({ reps: 10, weight: 20, done: true, effort: 2 })) }] }];
    sessionTouched(); save();
    const first = buildCustomSession([{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 4 }]).exos[0];
    const after = buildCustomSession([{ exoId: 'pompes', sets: 5 }, { exoId: 'dc_haltere', sets: 3 }]).exos[1];
    return { first: { reps: first.sets.map(s => s.reps), pw: first.pw }, after: { reps: after.sets.map(s => s.reps), note: after.note } };
  });
  log('Position:', JSON.stringify(pos));
  if (!(pos.after.reps[0] < pos.first.reps[0]) || !/Placé après 5 séries pour tes pectoraux/.test(pos.after.note || '') || pos.first.pw !== 20) fail('objectif selon la place + charge proposée retenue');

  // 3. en séance : 9 répétitions après 6 séries de pompes battent 10 faites à frais la dernière fois
  const live = await page.evaluate(() => {
    S.custom = { exos: [{ exoId: 'pompes', sets: 6 }, { exoId: 'dc_haltere', sets: 3 }] };
    S.draft = buildCustomSession(S.custom.exos); S.draft.startedAt = new Date().toISOString();
    S.draft.exos[0].sets.forEach((s, i) => { s.done = true; s.reps = 12; }); S.draft.exos[0].first = 1;
    const ex = S.draft.exos[1], st = ex.sets[0]; st.reps = 9; st.weight = 20;
    const ref = beatRef('dc_haltere', 0);
    return { tired: beatTired(EXO_MAP.dc_haltere, st, ref, liveFatigue(S.draft, ex)), line: beatLineHTML(ex, EXO_MAP.dc_haltere, 0, st).replace(/<[^>]+>/g, '') };
  });
  log('Live:', JSON.stringify(live));
  if (!live.tired || !/fatigue comprise/.test(live.line)) fail('« Mieux que la dernière fois, fatigue comprise »');

  // 4. fin de séance : exercices rangés dans l'ordre réel (fatigue lisible), charge proposée gardée
  const fin = await page.evaluate(() => {
    S.draft.exos[1].sets.forEach(s => { s.done = true; s.reps = 9; s.weight = 20; }); S.draft.exos[1].first = 0;   // fait en premier
    finalizeSession(); closeSheet();
    const s = S.sessions[S.sessions.length - 1], packed = unpackSession(JSON.parse(JSON.stringify(packSession(s))));
    return { order: s.exos.map(e => e.exoId).join(','), pw: packed.exos.find(e => e.exoId === 'dc_haltere').pw };
  });
  log('Finish:', JSON.stringify(fin));
  if (fin.order !== 'dc_haltere,pompes' || fin.pw !== 20) fail('ordre réel à l\'enregistrement, charge proposée stockée');

  // 5. manière de faire apprise : toujours « à fond », charge montée plus vite que proposé
  const prof = await page.evaluate(() => {
    const t = todayISO(); S.sessions = [];
    for (let k = 30; k >= 2; k -= 3) S.sessions.push({ id: 's' + k, date: addDaysISO(t, -k), exos: [
      { exoId: 'dc_haltere', targetReps: [8, 12], pw: 18, sets: Array.from({ length: 3 }, () => ({ reps: 12, weight: 20, done: true, effort: 3 })) },
      { exoId: 'pompes', sets: Array.from({ length: 3 }, () => ({ reps: 12, done: true, effort: 3 })) }] });
    sessionTouched(); save();
    const p = coachProfile(), sug = suggestForExo(EXO_MAP.dc_haltere, 3, false, 0);
    S.draft = null; switchTab('progress'); renderView('progress');
    const card = document.querySelector('#v-progress .coach-card');
    return { failure: p.failure, pace: p.pace, w: sug.weight, card: card ? card.textContent.replace(/\s+/g, ' ').trim() : '' };
  });
  log('Profile:', JSON.stringify(prof));
  if (!prof.failure || prof.pace !== 1) fail('profil : va au bout de ses séries, monte plus vite que proposé');
  if (!(prof.w > 20)) fail('« à fond » habituel ne bloque plus la progression');
  // 2.12.3 : l'app s'adapte sans le raconter (plus de carte « Ce que l'app a compris » dans Progrès)
  if (prof.card) fail('plus de carte « Ce que l\'app a compris »');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
