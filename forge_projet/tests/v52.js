// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (ascension, lot « dopamine » 2) : retour en force (après une semaine sans séance, la séance suivante compte
// double jusqu'à l'altitude perdue : moteur, bande d'altitude, fin de séance, Vitesse), accueil (la série de
// semaines en jeu passe en premier, puis la promesse du jour « Camp 9 est à ta portée »), plus de délai lointain
// dans la frise des étapes.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v52'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v52')) return; localStorage.setItem('__seed_v52', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. moteur : retour en force, promesse du jour, série en jeu, frise sans délai lointain
  const eng = await page.evaluate(() => {
    const realSA = window.strengthAt; window.strengthAt = () => null;
    const W0 = weekKey(todayISO()), wkk = n => addDaysISO(W0, -7 * n);
    let id = 0;
    const ses = (n, day) => ({ id: 'c' + (++id), date: addDaysISO(wkk(n), day), durationSec: 1800, exos: [{ exoId: 'dc_haltere', sets: Array.from({ length: 15 }, () => ({ reps: 10, weight: 12, done: true })) }] });
    const reset = list => { S.goals.daysPerWeek = 3; S.deloadLog = []; S.deload = null; S.ascent = { pauses: [], seen: null, descSeen: '', intro: 0 }; S.sessions = list; save(); return ascent(); };
    const R = {};
    // 2 semaines régulières (en plein Moléson), une semaine sans séance, puis une séance : descente puis retour en force
    const list = []; for (let n = 4; n >= 3; n--) for (const d of [0, 2, 4]) list.push(ses(n, d));
    let a = reset(list.slice()); R.before = a.comeback;
    const back = ses(1, 0); list.push(back); a = reset(list);
    const d = a.descents[a.descents.length - 1], e = a.log[back.id];
    R.back = { descent: !!d, from: d && +d.from.toFixed(1), to: d && +d.to.toFixed(1), eBack: +(e.back || 0).toFixed(2), eTo: +e.to.toFixed(1), after: a.comeback };
    // sans la descente (même séance une semaine plus tôt) : pas de retour en force
    const list2 = []; for (let n = 4; n >= 2; n--) for (const d of [0, 2, 4]) list2.push(ses(n, d));
    a = reset(list2); R.noBack = Object.values(a.log).every(x => !x.back);
    // juste après la descente (avant la séance) : la promesse et le ×2 sont annoncés
    a = reset(list.slice(0, -1).concat([]));
    // promesse du jour : un nouveau venu, le premier camp est à portée de la 1re séance
    a = reset([]); R.promise = (ascTodayPromise(a) || {}).t;
    const realWd = window.weekdayIdx;
    R.newcomer = nextGoal().t;
    // série en jeu : 4 semaines tenues, rien cette semaine, et plus que 3 jours (vendredi)
    const l3 = []; for (let n = 4; n >= 1; n--) for (const d of [0, 2, 4]) l3.push(ses(n, d));
    a = reset(l3); window.weekdayIdx = () => 4; DATA_VER++;
    const g = nextGoal(); R.risk = { t: g.t, warn: !!g.warn, series: a.series };
    window.weekdayIdx = () => 0; DATA_VER++; R.monday = nextGoal().t;
    window.weekdayIdx = realWd; DATA_VER++;
    // frise : pas de délai en mois ou en années, les mètres à gravir
    const a2 = Object.assign({}, ascent(), { key: 'everest', alt: 5200, start: ASC_DATA.everest.start, top: ASC_DATA.everest.top, camps: ascCamps('everest'), passed: 0, campDates: {}, wait: false, done: .01 });
    const html = ascStepsListHTML(a2); R.far = { gravir: /à gravir/.test(html), months: /\bmois\b|\bans\b/.test(html) };
    window.strengthAt = realSA;
    // l'état de test du retour en force, pour la suite (séance en cours)
    reset(list.slice(0, -1));
    return R;
  });
  log('Engine:', JSON.stringify(eng));
  if (!(eng.before > 0) || !eng.back.descent || !(eng.back.eBack > 0) || eng.back.after !== null || eng.back.eTo < eng.back.from) fail('retour en force : double jusqu\'à l\'altitude perdue, puis normal');
  if (!eng.noBack) fail('pas de retour en force sans descente');
  if (!/^Aujourd'hui, Camp 1 est à ta portée/.test(eng.promise || '') || !/^Aujourd'hui, Camp 1 est à ta portée/.test(eng.newcomer)) fail('promesse du jour sur l\'accueil');
  if (!/^Ta série de 4 semaines est en jeu : 3 séances d'ici dimanche/.test(eng.risk.t) || !eng.risk.warn) fail('série en jeu en premier');
  if (/série de \d+ semaines est en jeu/.test(eng.monday)) fail('série en jeu : seulement sans marge');
  if (!eng.far.gravir || eng.far.months) fail('frise : pas de délai lointain');

  // 2. après la descente : accueil, séance en cours (×2), fin de séance (part du retour en force), Vitesse
  await page.evaluate(() => renderView('today')); await wait(500);
  const home = await page.evaluate(() => (document.querySelector('.goal-line') || {}).textContent || '');
  log('Home:', home.replace(/\s+/g, ' ').trim()); if (!/Retour en force : ta prochaine séance compte double/.test(home)) fail('accueil : retour en force annoncé');
  await shot('01_home');
  await page.evaluate(() => ACT.openAscent()); await page.waitForSelector('#ascScene .asc-svg', { timeout: 8000 }); await wait(900);
  await page.evaluate(() => document.querySelector('.asc-row[data-k="speed"]').scrollIntoView({ block: 'center' })); await page.click('.asc-row[data-k="speed"]'); await wait(600);
  const sp = await page.evaluate(() => [...document.querySelectorAll('#ascSec-speed .fx-r')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  log('Speed rows:', JSON.stringify(sp)); if (!sp.some(t => /^Retour en force.*×2/.test(t))) fail('Vitesse : retour en force ×2');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 4 }] }; ACT.startCustom(); }); await wait(2500);
  const strip = await page.evaluate(() => { const b = document.querySelector('#liveAsc'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  log('Strip:', strip); if (!/×2/.test(strip)) fail('bande d\'altitude : ×2 du retour en force');
  await shot('02_live_back');
  await page.evaluate(() => { for (let i = 0; i < 4; i++) { ACT.validateSet({ exi: '0' }); ACT.restSkip && ACT.restSkip(); } finalizeSession(); }); await wait(600);
  const cel = await page.evaluate(() => { const b = document.querySelector('.cel-asc .ca-bonus.back'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
  log('Celebration:', cel); if (!/^Retour en force : \+\d/.test(cel)) fail('fin de séance : part du retour en force');
  await page.evaluate(() => document.querySelector('.cel-asc') && document.querySelector('.cel-asc').scrollIntoView({ block: 'center' })); await wait(2800);
  await shot('03_celebration');
  await page.evaluate(() => closeSheet()); await wait(400);
  // l'avertissement de descente annonce le retour en force
  const notice = await page.evaluate(() => { S.ascent.descSeen = ''; const t = document.querySelector('#toast'); t.textContent = ''; ascDescentNotice(); return t.textContent; });
  log('Notice:', notice); if (!/compte double/.test(notice)) fail('avertissement : la prochaine séance compte double');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
