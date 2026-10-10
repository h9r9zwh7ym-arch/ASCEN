// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (ascension, lot « dopamine » 1) : la montagne monte pendant la séance (bande d'altitude, +X m à chaque
// série, « plus que N séries », camp atteint en pleine séance), même calcul qu'à la fin de séance ; élan de
// départ (premier sommet en ≈ 5 semaines) ; records et séries battues font monter plus haut ; le compte des
// séries battues est gardé dans l'historique.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v51'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v51')) return; localStorage.setItem('__seed_v51', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. moteur : élan de départ, premier camp dès la 1re séance, bonus des records et des séries battues
  const eng = await page.evaluate(() => {
    const realSA = window.strengthAt; window.strengthAt = () => null;
    const W0 = weekKey(todayISO()), wkk = n => addDaysISO(W0, -7 * n);
    let id = 0;
    const ses = (n, day, sets, o) => Object.assign({ id: 'u' + (++id), date: addDaysISO(wkk(n), day), durationSec: 1800, exos: [{ exoId: 'dc_haltere', sets: Array.from({ length: sets || 15 }, () => ({ reps: 10, weight: 12, done: true })) }] }, o || {});
    const reset = list => { S.goals.daysPerWeek = 3; S.deloadLog = []; S.deload = null; S.ascent = { pauses: [], seen: null, descSeen: '', intro: 0 }; S.sessions = list; save(); return ascent(); };
    const R = {};
    let a = reset([]); R.start = { mul: a.mul, elan: a.elan, reg: a.reg };
    // un profil régulier, 3 séances de 15 séries : le Moléson en ≈ 14 séances
    const list = []; for (let n = 12; n >= 1; n--) for (const d of [0, 2, 4]) list.push(ses(n, d));
    a = reset(list); const sm = a.summits[0]; R.summit = sm ? { key: sm.key, sessions: sm.sessions } : null;
    // l'élan disparaît après 45 séances (régularité seule)
    R.elanEnd = [ascElan(45, 0) > 1, ascElan(46, 0), ascElan(3, 1)];
    // une seule séance de 10 séries franchit déjà le premier camp
    a = reset([ses(1, 0, 10)]); R.first = { camps: a.log[S.sessions[0].id].camps, c1: ascCamps('moleson')[0][0] - ASC_DATA.moleson.start };
    // bonus : même séance, avec 2 records et 3 séries battues
    a = reset([ses(1, 0, 12)]); const g0 = a.log[S.sessions[0].id].gain;
    const withPR = ses(1, 0, 12, { beats: 3 }); withPR.exos[0].sets[0].pr = true; withPR.exos[0].sets[1].pr = true;
    a = reset([withPR]); const e1 = a.log[S.sessions[0].id];
    R.bonus = { g0, g1: e1.gain, prs: e1.prs, beats: e1.beats, expect: ascEffort(3 * 2 + 3) * e1.mul * e1.force * e1.lapF };
    // plafonds : 3 records, 4 séries battues
    R.cap = ascBonusSets(9, 9) === 3 * 3 + 4;
    // le compte des séries battues survit au stockage compact
    const pk = unpackSession(JSON.parse(JSON.stringify(packSession(withPR)))), cs = compactSession(Object.assign({}, withPR));
    R.store = { unpacked: pk.beats, compact: cs.beats, junk: compactSession({ id: 'x', date: '2026-01-01', beats: 'abc', exos: [] }).beats === undefined };
    window.strengthAt = realSA;
    reset([]);
    return R;
  });
  log('Engine:', JSON.stringify(eng));
  if (Math.abs(eng.start.mul - 3.5) > .01 || eng.start.reg !== .5) fail('élan de départ ×3,5 à la première séance');
  if (!eng.summit || eng.summit.key !== 'moleson' || eng.summit.sessions > 16) fail('premier sommet en ≈ 14 séances');
  if (!eng.elanEnd[0] || eng.elanEnd[1] !== 0 || eng.elanEnd[2] !== 0) fail('élan : disparaît après 45 séances et au 2e tour');
  if (eng.first.camps.length < 1 || eng.first.c1 > 25) fail('premier camp dès la première séance');
  if (eng.bonus.prs !== 2 || eng.bonus.beats !== 3 || Math.abs(eng.bonus.g1 - eng.bonus.g0 - eng.bonus.expect) > .01) fail('records et séries battues : mètres en plus');
  if (!eng.cap) fail('plafonds du bonus');
  if (eng.store.unpacked !== 3 || eng.store.compact !== 3 || !eng.store.junk) fail('séries battues gardées dans l\'historique');

  // 2. séance en cours : un débutant, deux exercices
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 5 }, { exoId: 'squat_gobelet', sets: 5 }] }; ACT.startCustom(); });
  await wait(2600);
  const s0 = await page.evaluate(() => { const b = document.querySelector('#liveAsc'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  log('Strip at start:', s0);
  if (!/1\s?516 m/.test(s0) || !/Camp 1 · plus que \d+ séries/.test(s0)) fail('bande d\'altitude au départ : altitude et compte à rebours');
  await shot('01_live_start');
  const steps = []; let campAt = -1;
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => ACT.validateSet({ exi: String(liveFocusIdx) })); await wait(320);
    const r = await page.evaluate(() => { const b = document.querySelector('#liveAsc'); return { t: b ? b.textContent.replace(/\s+/g, ' ').trim() : '', camp: !!(b && b.classList.contains('camp')), fl: [...document.querySelectorAll('.float-txt.asc')].length }; });
    steps.push(r); if (r.camp && campAt < 0) { campAt = i + 1; await wait(300); await shot('02_live_camp'); }
    await page.evaluate(() => ACT.restSkip && ACT.restSkip()); await wait(150);
  }
  steps.forEach((r, i) => log(`  série ${i + 1}${r.camp ? ' CAMP' : ''}: ${r.t}${r.fl ? ' (+m)' : ''}`));
  const counts = steps.map(r => (r.t.match(/plus que (\d+) série/) || [])[1]).filter(Boolean).map(Number);
  if (steps.some((r, i) => i < campAt - 1 && !r.fl) || !steps[0].fl) fail('+X m à chaque série');
  if (counts.length < 3 || counts.some((c, i) => i && c > counts[i - 1])) fail('« plus que N séries » qui décompte');
  if (campAt < 1 || !/Camp 1 atteint/.test(steps[campAt - 1].t)) fail('camp atteint en pleine séance');
  const live = await page.evaluate(() => { const L = ascLive(S.draft); return { gain: +L.e.gain.toFixed(3), camps: L.e.camps }; });
  const fin = await page.evaluate(() => { finalizeSession(); const s = S.sessions[S.sessions.length - 1], e = ascent().log[s.id]; return { gain: +e.gain.toFixed(3), camps: e.camps }; });
  log('Live vs final:', JSON.stringify(live), JSON.stringify(fin));
  if (live.gain !== fin.gain || live.camps.join() !== fin.camps.join()) fail('altitude en direct = fin de séance');
  await wait(400); await page.evaluate(() => { const t = document.querySelector('#celTrk'); if (t) t.scrollIntoView({ block: 'center' }); }); await wait(3200);
  const cel = await page.evaluate(() => ({ badge: !!document.querySelector('#celBadge.on'), bonus: !!document.querySelector('.cel-asc .ca-bonus') }));
  log('Celebration:', JSON.stringify(cel)); if (!cel.badge || cel.bonus) fail('fin de séance : camp atteint, pas de bonus sans record');
  await shot('03_celebration');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 3. une séance avec un record : bonus en direct, puis dans la fin de séance ; Vitesse montre l'élan et les records
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }] }; ACT.startCustom(); });
  await wait(2400);
  const pr = await page.evaluate(() => { const ex = S.draft.exos[0], st = ex.sets[0]; st.weight = 30; st.reps = 12;
    const g0 = ascLive(S.draft) && ascLive(S.draft).e ? ascLive(S.draft).e.gain : 0; ACT.validateSet({ exi: '0' }); const L = ascLive(S.draft); return { g0, g1: L.e.gain, prs: L.e.prs, pr: !!st.pr, bonus: L.e.bonus }; });
  await wait(300); await page.evaluate(() => ACT.restSkip && ACT.restSkip());
  log('Record live:', JSON.stringify(pr));
  if (!pr.pr || pr.prs !== 1 || !(pr.bonus > 0)) fail('record en séance : bonus compté en direct');
  await page.evaluate(() => { finalizeSession(); }); await wait(500);
  const cel2 = await page.evaluate(() => { const b = document.querySelector('.cel-asc .ca-bonus'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  log('Celebration bonus:', cel2); if (!/Records et séries battues : \+\d/.test(cel2)) fail('fin de séance : part des records');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => ACT.openAscent()); await page.waitForSelector('#ascScene .asc-svg', { timeout: 8000 }); await wait(800);
  await page.evaluate(() => document.querySelector('.asc-row[data-k="speed"]').scrollIntoView({ block: 'center' })); await page.click('.asc-row[data-k="speed"]'); await wait(600);
  const sp = await page.evaluate(() => [...document.querySelectorAll('#ascSec-speed .fx-r')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  log('Speed rows:', JSON.stringify(sp));
  if (!sp.some(t => /^Élan de départ/.test(t)) || !sp.some(t => /^Records et progrès/.test(t)) || !sp.some(t => /^Régularité.*l'élan compte à sa place/.test(t))) fail('Vitesse : élan de départ et records');
  await shot('04_speed');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 4. mouvement réduit : rien ne casse, pas de +X m flottant
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich', reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push('PAGEERROR(2): ' + e.message));
  await p2.addInitScript(() => localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12] } } })));
  await p2.goto(APP); await p2.waitForSelector('#splash', { state: 'detached', timeout: 9000 });
  await p2.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 10 }] }; ACT.startCustom(); }); await p2.waitForTimeout(800);
  const rm = await p2.evaluate(() => { for (let i = 0; i < 10; i++){ ACT.validateSet({ exi: '0' }); ACT.restSkip && ACT.restSkip(); } const b = document.querySelector('#liveAsc'); return { t: b ? b.textContent.replace(/\s+/g, ' ').trim() : '', fl: document.querySelectorAll('.float-txt').length }; });
  log('Reduced motion:', JSON.stringify(rm)); if (!rm.t || rm.fl) fail('mouvement réduit : bande à jour, sans animation');
  await ctx2.close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
