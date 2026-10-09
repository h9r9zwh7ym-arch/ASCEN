// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (ascension) : l'ascension remplace le niveau XP. Règles du moteur (série, gel, paliers, descente au camp
// précédent, pause, semaine allégée, série requise, dernière ligne droite, étirements), données
// abîmées, pastille d'accueil, carte de Progrès, profil, écran « Mon ascension » (scène chargée à la
// demande, jour et nuit, repli sans le fichier), fin de séance, sommet plein écran, carte de sommet,
// avertissement de descente.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v50'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v50')) return; localStorage.setItem('__seed_v50', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. moteur : scénarios construits semaine par semaine (force neutre pour des chiffres stables)
  const eng = await page.evaluate(() => {
    const realSA = window.strengthAt; window.strengthAt = () => null;
    const W0 = weekKey(todayISO()), wk = n => addDaysISO(W0, -7 * n);
    let id = 0;
    const ses = (n, day, sets, exo) => ({ id: 't' + (++id), date: addDaysISO(wk(n), day), durationSec: 1800, exos: [{ exoId: exo || 'dc_haltere', sets: Array.from({ length: sets || 15 }, () => ({ reps: 10, weight: 12, done: true })) }] });
    const run = (weeks, opts) => { opts = opts || {}; // weeks : { semainesAvant: nbSéances }
      S.goals.daysPerWeek = opts.goal || 3; S.deloadLog = opts.deload || []; S.deload = null; S.ascent = { pauses: opts.pauses || [], seen: null, descSeen: '', intro: 0 };
      const list = []; Object.keys(weeks).map(Number).sort((a, b) => b - a).forEach(n => { for (let i = 0; i < weeks[n]; i++) list.push(ses(n, [0, 2, 4, 5, 6][i], opts.sets)); });
      S.sessions = list.sort((a, b) => a.date < b.date ? -1 : 1); save(); return ascent(); };
    const R = {};
    let a = run({}); R.empty = { key: a.key, alt: a.alt, start: ASC_DATA.moleson.start, wait: a.wait };
    const reg = {}; for (let n = 12; n >= 1; n--) reg[n] = 3;
    a = run(reg); R.regular = { summits: a.summits.map(s => s.key), series: a.series, states: a.weeks.map(w => w.state).join(','), mul: a.mul };
    a = run({ 6: 3, 5: 3, 4: 3, 3: 3, 1: 3 }); R.empty_week = { descents: a.descents.length, w: a.descents[0] && a.descents[0].w, exp: wk(2), series: a.series, to: a.descents[0] && a.descents[0].to,
      camp: a.descents[0] ? (a.descents[0].to === ASC_DATA.moleson.start || ASC_DATA.moleson.camps.some(c => c[0] === a.descents[0].to)) : false, state: (a.weeks.find(w => w.w === wk(2)) || {}).state };
    const fr = {}; for (let n = 10; n >= 3; n--) fr[n] = 3; fr[2] = 1; fr[1] = 1;
    a = run(fr); R.frozen = { series: a.series, states: a.weeks.slice(-3).map(w => w.state).join(','), descents: a.descents.length };
    a = run({ 6: 3, 5: 3, 4: 3, 3: 3, 1: 3 }, { pauses: [wk(2)] }); R.pause = { descents: a.descents.length, state: (a.weeks.find(w => w.w === wk(2)) || {}).state, series: a.series };
    a = run({ 6: 3, 5: 3, 4: 3, 3: 3, 1: 3 }, { deload: [addDaysISO(wk(2), 1)] }); R.deload = { descents: a.descents.length, state: (a.weeks.find(w => w.w === wk(2)) || {}).state };
    // série requise : le Pilatus fermé tant que la série n'y est pas
    const req = ASC_REQ.pilatus; ASC_REQ.pilatus = 99;
    a = run(reg); R.gate = { key: a.key, wait: a.wait, alt: a.alt, top: ASC_DATA.moleson.top, waiting: Object.values(a.log).filter(e => e.waiting).length };
    ASC_REQ.pilatus = req; save(); a = ascent(); R.gate.after = a.key;
    // étirements seuls : ni montée ni séance comptée
    const st = EXOS.find(isStretch).id; S.sessions = [ses(1, 0, 4, st)]; S.ascent = { pauses: [], seen: null, descSeen: '', intro: 0 }; save(); a = ascent();
    R.stretch = { alt: a.alt, weeks: a.weeks.length, log: Object.keys(a.log).length };
    // dernière ligne droite : à mi-vitesse si la force est sous 95 % de son meilleur niveau récent
    const reg2 = {}; for (let n = 16; n >= 1; n--) reg2[n] = 3;
    window.strengthAt = iso => ({ index: iso < wk(8) ? 140 : 110, muscles: [] });
    a = run(reg2, { sets: 10 }); R.push_low = Object.values(a.log).filter(e => e.push).length;
    window.strengthAt = () => ({ index: 120, muscles: [] });
    a = run(reg2, { sets: 10 }); R.push_ok = Object.values(a.log).filter(e => e.push).length; R.force = a.force;
    window.strengthAt = realSA;
    // pauses : 2 par trimestre au plus
    S.ascent.pauses = []; const q0 = '2026-01-05'; R.pz = [ascTogglePause(q0), ascTogglePause('2026-01-12'), ascTogglePause('2026-01-19'), ascTogglePause('2026-04-06')];
    // données abîmées (import)
    const n = normalizeState({ ascent: { pauses: ['x', '2026-01-05', 3], seen: { key: 'nope', alt: 1 }, descSeen: '<b>' } });
    R.norm = { pauses: n.ascent.pauses, seen: n.ascent.seen, desc: n.ascent.descSeen };
    const n2 = normalizeState({});
    R.norm2 = !!(n2.ascent && Array.isArray(n2.ascent.pauses));
    return R;
  });
  log('Engine:', JSON.stringify(eng));
  if (eng.empty.key !== 'moleson' || eng.empty.alt !== eng.empty.start || eng.empty.wait) fail('départ : Moléson, Plan-Francey');
  if (!eng.regular.summits.includes('moleson') || eng.regular.series !== 12 || !/^(ok,){12}cur$/.test(eng.regular.states) || eng.regular.mul !== 2.5) fail('profil régulier : sommet, série, paliers');
  if (eng.empty_week.descents !== 1 || eng.empty_week.w !== eng.empty_week.exp || eng.empty_week.series !== 3 || !eng.empty_week.camp || eng.empty_week.state !== 'empty') fail('semaine sans séance : camp précédent et un palier de moins');
  if (eng.frozen.series !== 4 || eng.frozen.states !== 'frozen,frozen,cur' || eng.frozen.descents) fail('objectif raté : série gelée, puis un palier de moins');
  if (eng.pause.descents || eng.pause.state !== 'pause' || eng.pause.series !== 5) fail('pause déclarée : rien ne se perd');
  if (eng.deload.descents || eng.deload.state !== 'deload') fail('semaine allégée : rien ne se perd');
  if (eng.gate.key !== 'moleson' || !eng.gate.wait || eng.gate.alt !== eng.gate.top || !eng.gate.waiting || eng.gate.after !== 'pilatus') fail('série requise pour la montagne suivante');
  if (eng.stretch.alt !== 1516 || eng.stretch.weeks || eng.stretch.log) fail('étirements seuls : ne comptent pas');
  if (!(eng.push_low > 0) || eng.push_ok !== 0 || Math.abs(eng.force - 1.12) > .001) fail('dernière ligne droite et force amortie');
  if (eng.pz.join() !== 'true,true,false,true') fail('2 pauses par trimestre');
  if (eng.norm.pauses.join() !== '2026-01-05' || eng.norm.seen !== null || eng.norm.desc !== '' || !eng.norm2) fail('données abîmées nettoyées');

  // 2. un historique réel : 14 semaines, 3 séances par semaine
  await page.evaluate(() => {
    const W0 = weekKey(todayISO()); const ss = [];
    for (let n = 14; n >= 1; n--) for (const d of [0, 2, 4]) ss.push({ id: 'h' + n + d, date: addDaysISO(W0, -7 * n + d), durationSec: 2700, exos: ['dc_haltere', 'squat_gobelet', 'rowing_haltere'].map(id => ({ exoId: id, sets: [1, 2, 3, 4, 5].map(() => ({ reps: 10, weight: 12 + Math.floor((14 - n) / 5), done: true })) })) });
    S.sessions = ss; S.goals.daysPerWeek = 3; S.ascent = { pauses: [], seen: null, descSeen: '', intro: 0 }; save(); renderView('today'); });
  await wait(500);
  const home = await page.evaluate(() => { const p = document.querySelector('#v-today .asc-pill'), a = ascent();
    return { pill: !!p, act: p && p.dataset.a, txt: p ? p.textContent.replace(/\s+/g, ' ').trim() : '', key: a.key, alt: Math.round(a.alt), summits: a.summits.length, niv: /niv\./.test(document.querySelector('#v-today').textContent) }; });
  log('Home:', JSON.stringify(home));
  if (!home.pill || home.act !== 'openAscent' || !(home.txt.includes(ASC_NAME(home.key)) || /au sommet/.test(home.txt)) || !/\d m /.test(home.txt + ' ') && !/\dm/.test(home.txt.replace(/\s/g, '')) || home.niv) fail('pastille d\'accueil : altitude et montagne, plus de niveau');
  await shot('01_home');
  function ASC_NAME(k) { return { moleson: 'Moléson', pilatus: 'Pilatus', titlis: 'Titlis', eiger: 'Eiger' }[k] || ''; }
  // Progrès › Objectifs et profil
  await page.click('.tabbtn[data-id="progress"]'); await wait(500); await page.evaluate(() => ACT.progressTab({ v: 'medals' })); await wait(500);
  const prog = await page.evaluate(() => { const c = document.querySelector('#v-progress .asc-card'); return { card: !!c, sky: !!(c && c.querySelector('.ac-svg path')), lv: !!document.querySelector('.level-card') }; });
  await page.click('.tabbtn[data-id="profil"]'); await wait(600);
  const prof = await page.evaluate(() => { const t = document.querySelector('.ph-asc'); return { asc: !!t, txt: t ? t.textContent.trim() : '', badge: !!document.querySelector('.ph-avatar em') }; });
  log('Progress/profil:', JSON.stringify(prog), JSON.stringify(prof));
  if (!prog.card || !prog.sky || prog.lv) fail('carte Mon ascension dans Progrès');
  if (!prof.asc || !/m/.test(prof.txt) || prof.badge) fail('profil : ascension au lieu du niveau');
  await page.click('.tabbtn[data-id="today"]'); await wait(500);

  // 3. l'écran « Mon ascension » : scène chargée à la demande
  await page.evaluate(() => ACT.openAscent()); await wait(300);
  await page.waitForSelector('#ascScene .asc-svg', { timeout: 8000 });
  await wait(wk ? 3500 : 3000);
  const sheet = await page.evaluate(() => { const a = ascent(), h = document.querySelector('#ascScene'), svg = h.querySelector('.asc-svg');
    return { ready: h.classList.contains('ready'), paths: svg.querySelectorAll('path[class^="ak"]').length, camps: svg.querySelectorAll('.asc-camp').length, exp: ASC_DATA[a.key].camps.length,
      hud: h.querySelector('.hud-n').textContent, name: ASC_DATA[a.key].n, cards: [...document.querySelectorAll('.asc-body .card-h h2')].map(x => x.textContent).join('|'),
      stops: document.querySelectorAll('.asc-body .stops li').length, me: !!svg.querySelector('.asc-me[transform]'), seen: S.ascent.seen && S.ascent.seen.key === a.key,
      day: svg.innerHTML.includes('#78A8D6') || svg.innerHTML.includes('#6EA2D2') || svg.innerHTML.includes('#5A8CCD') || svg.innerHTML.includes('#2F62B4') }; });
  log('Sheet:', JSON.stringify(sheet));
  if (!sheet.ready || sheet.paths < 20 || sheet.camps !== sheet.exp || sheet.hud !== sheet.name || sheet.stops !== 13 || !sheet.me || !sheet.seen || !sheet.day) fail('écran Mon ascension : scène, camps, HUD, itinéraire');
  if (sheet.cards !== 'Vitesse de montée|Régularité|Force|Itinéraire|Au sommet') fail('cartes de l\'écran');
  await shot('02_sheet');
  await page.evaluate(() => { document.querySelector('.asc-body').scrollTop = 900; }); await wait(300); await shot('03_sheet_reg');
  // pause : bouton, état, nombre restant
  await page.click('[data-a="ascPause"]'); await wait(300);
  const pz = await page.evaluate(() => ({ p: S.ascent.pauses.slice(), on: !!document.querySelector('[data-a="ascPause"][aria-pressed="true"]'), paused: ascent().paused }));
  await page.click('[data-a="ascPause"][aria-pressed="true"]'); await wait(300);
  const pz2 = await page.evaluate(() => S.ascent.pauses.length);
  log('Pause:', JSON.stringify(pz), pz2);
  if (pz.p.length !== 1 || !pz.on || !pz.paused || pz2 !== 0) fail('pause déclarée puis annulée');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 4. fin de séance : altitude gagnée (plus d'XP) ; puis une séance qui atteint le sommet
  const fin = () => page.evaluate(() => {
    const exos = ['dc_haltere', 'squat_gobelet', 'rowing_haltere'].map(id => ({ exoId: id, sets: [1, 2, 3, 4, 5, 6].map(() => ({ reps: 10, weight: 14, done: true, target: 10 })) }));
    S.draft = { id: 'live' + Date.now(), date: todayISO(), startedAt: new Date(Date.now() - 2400e3).toISOString(), source: 'custom', exos }; finalizeSession(); return S.sessions[S.sessions.length - 1].id; });
  let sid = await fin(); await wait(1600);
  const cel = await page.evaluate(id => { const c = document.querySelector('.cel .cel-asc'), e = ascent().log[id];
    return { asc: !!c, txt: c ? c.textContent.replace(/\s+/g, ' ') : '', gain: e && Math.round(e.gain), xp: /XP/.test(document.querySelector('.cel').textContent), bar: c ? c.querySelector('#celAsc').style.width : '' }; }, sid);
  log('Celebration:', JSON.stringify(cel));
  if (!cel.asc || !(cel.gain > 0) || !cel.txt.includes('+') || cel.xp) fail('fin de séance : altitude gagnée à la place de l\'XP');
  await shot('04_celebration');
  await page.evaluate(() => closeSheet()); await wait(500);
  await page.evaluate(() => { let g = 0; while (g++ < 400) { const a = ascent(); if (a.wait || a.top - a.alt < 12) break;
      S.sessions.push({ id: 'x' + g, date: todayISO(), durationSec: 900, exos: [{ exoId: 'pompes', sets: [1, 2].map(() => ({ reps: 10, done: true })) }] }); save(); } });
  sid = await fin(); await wait(1600);
  const sum = await page.evaluate(id => ({ e: ascent().log[id].summit, btn: !!document.querySelector('.cel [data-a="ascCelSummit"]') }), sid);
  log('Summit session:', JSON.stringify(sum));
  if (!sum.e || !sum.btn) fail('séance qui atteint le sommet : bouton « Voir le sommet »');
  if (sum.btn) {
    await page.click('.cel [data-a="ascCelSummit"]'); await wait(1800);
    const ov = await page.evaluate(() => { const el = document.querySelector('#ascSummit'); return { on: !!(el && el.classList.contains('on')), h2: el ? el.querySelector('h2').textContent : '', gifts: el ? el.querySelectorAll('.gift').length : 0 }; });
    log('Summit overlay:', JSON.stringify(ov));
    if (!ov.on || !/ m$/.test(ov.h2) || ov.gifts !== 3) fail('sommet plein écran');
    await shot('05_summit');
    const card = await page.evaluate(() => { const s = ascent().summits.slice(-1)[0], cv = ascDrawCard(s); return cv.width + 'x' + cv.height; });
    if (card !== '1080x1350') fail('carte de sommet');
    await page.click('#ascSummit .asc-close'); await wait(700);
    if (await page.$('#ascSummit')) fail('fermeture du sommet');
  }

  // 5. nuit : la scène passe en palette de nuit
  await page.emulateMedia({ colorScheme: 'dark' }); await page.evaluate(() => { S.settings.theme = 'auto'; save(); applyTheme(); });
  await page.evaluate(() => ACT.openAscent()); await page.waitForSelector('#ascScene .asc-svg', { timeout: 8000 }); await wait(2500);
  const night = await page.evaluate(() => { const svg = document.querySelector('#ascScene .asc-svg'); return { night: /#0[0-9A-F]{5}/.test(svg.querySelector('#asSky stop').getAttribute('stop-color')), stars: svg.querySelectorAll('.asc-star').length }; });
  log('Night:', JSON.stringify(night)); if (!night.night || night.stars < 20) fail('scène de nuit');
  await shot('06_sheet_dark');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 6. semaine sans séance : prévenu une fois
  const desc = await page.evaluate(() => { const W0 = weekKey(todayISO());
    S.sessions = S.sessions.filter(s => s.date < addDaysISO(W0, -7)); S.ascent.descSeen = ''; save();
    const t = document.querySelector('#toast'); t.textContent = ''; ascDescentNotice(); const t1 = t.textContent; t.textContent = ''; ascDescentNotice(); return { t1, t2: t.textContent, n: ascent().descents.length }; });
  log('Descent notice:', JSON.stringify(desc));
  if (!/Semaine sans séance/.test(desc.t1) || desc.t2 || !desc.n) fail('avertissement de descente, une seule fois');

  // 7. sans le fichier des scènes (hors ligne avant le premier chargement) : silhouette, aucune erreur
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push('PAGEERROR(2): ' + e.message));
  await p2.route('**/ascent-scenes.js', r => r.abort());
  await p2.addInitScript(() => localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() } })));
  await p2.goto(APP); await p2.waitForSelector('#splash', { state: 'detached', timeout: 9000 });
  await p2.evaluate(() => ACT.openAscent()); await p2.waitForTimeout(1500);
  const off = await p2.evaluate(() => { const h = document.querySelector('#ascScene'); return { off: h.classList.contains('offline'), ph: !!h.querySelector('.asc-ph svg path'), hud: !!h.querySelector('.hud-n') }; });
  log('Offline:', JSON.stringify(off)); if (!off.off || !off.ph || !off.hud) fail('repli sans le fichier des scènes');
  await ctx2.close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
