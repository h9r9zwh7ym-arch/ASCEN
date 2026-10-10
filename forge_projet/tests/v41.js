// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (motivation) : objectif « à battre » en séance, prochain cap sur l'accueil, indice de force
// avec projection dans Progrès ; chacun désactivable dans Profil > Motivation
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v41'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // 10 semaines de développé couché qui progresse (10 → 14 kg), pompes de 8 à 14
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v41')) return; localStorage.setItem('__seed_v41', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; let i = 0;
    for (let k = 70; k >= 2; k -= 4, i++) {
      const w = 10 + Math.floor(i / 4) * 2, r = 8 + (i % 4);
      ss.push({ id: 's' + k, date: iso(k), startedAt: new Date(Date.now() - k * 864e5).toISOString(), durationSec: 2400,
        exos: [{ exoId: 'dc_haltere', sets: [r, r, r - 1].map(x => ({ reps: x, weight: w, done: true })) }, { exoId: 'pompes', sets: [{ reps: 8 + Math.floor(i / 3), done: true }] }] });
    }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, goals: { daysPerWeek: 3 },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } }, sessions: ss,
      custom: { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 2 }] } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. accueil : une ligne « Prochain cap », la plus proche du but
  const goal = await page.evaluate(() => { const g = document.querySelector('.goal-line'); return g ? { t: g.textContent.trim(), a: g.dataset.a, n: document.querySelectorAll('.goal-line').length } : null; });
  log('Next goal:', JSON.stringify(goal));
  if (!goal || goal.n !== 1 || !/Prochain cap|À surveiller/.test(goal.t)) fail('prochain cap sur l\'accueil');
  const cands = await page.evaluate(() => {
    const out = {};
    // l'ascension (série en jeu, camp à portée) passe avant : testée par v52 ; neutralisée ici
    const realAsc = window.ascent, realP = window.ascTodayPromise;
    window.ascent = () => Object.assign({}, realAsc(), { series: 0 }); window.ascTodayPromise = () => null;
    const save0 = JSON.stringify(S.sessions), cust0 = JSON.stringify(S.custom); const wkStart = weekKey(todayISO());
    S.sessions = S.sessions.filter(s => s.date < wkStart); DATA_VER++; out.week3 = nextGoal().t;     // 0/3 : la séance prête porte un record
    S.custom = { exos: [] }; DATA_VER++; out.weekOnly = nextGoal().t;
    // 4.0 (passe qualité) : l'objectif de la semaine n'apparaît qu'à une séance du but (la pastille dit déjà « 0/3 »)
    const g0 = S.goals.daysPerWeek; S.goals.daysPerWeek = sessionsThisWeek() + 1; DATA_VER++; out.oneLeft = nextGoal().t;
    out.daysLeft = 7 - weekdayIdx(todayISO()) - (sessionsToday().length ? 1 : 0); S.goals.daysPerWeek = g0;
    window.ascent = realAsc; window.ascTodayPromise = realP;
    S.sessions = JSON.parse(save0); S.custom = JSON.parse(cust0); DATA_VER++; renderView('today');
    return out;
  });
  log('Goal candidates:', JSON.stringify(cands));
  if (!/Record à battre aujourd'hui · Développé couché haltères : \d+ × 1\d kg/.test(cands.week3)) fail('record à battre de la séance prête');
  if (/semaine/.test(cands.weekOnly) || (cands.daysLeft > 0 && !/Une séance de plus et ta semaine est validée/.test(cands.oneLeft))) fail('objectif de la semaine (seulement à une séance du but)');
  await shot('01_home_goal');

  // 2. en séance : « à battre » face à la même série la dernière fois, puis retour quand c'est dépassé
  await page.click('.hero .hero-go'); await page.waitForSelector('#launch', { state: 'detached', timeout: 7000 }); await wait(500);
  const b0 = await page.evaluate(() => { const ex = S.draft.exos[0], ref = beatRef(ex.exoId, 0); return { ids: S.draft.exos.map(e => e.exoId + ':' + e.sets.map(s => s.weight).join('/')), lp: !!lastPerformance(ex.exoId), ref, st: { r: ex.sets[0].reps, w: ex.sets[0].weight }, line: (document.querySelector('.fc-beat') || {}).textContent }; });
  log('Beat line:', JSON.stringify(b0));
  if (!b0.ref || !/la dernière fois/.test(b0.line || '')) fail('ligne « à battre » en séance');
  await shot('02_beat');
  // saisie au-dessus de la référence : la ligne passe en « Ça bat la dernière fois »
  await page.evaluate(() => { const ex = S.draft.exos[0], ref = beatRef(ex.exoId, 0); ex.sets[0].weight = ref.weight; ex.sets[0].reps = ref.reps; save(); refreshFocusRegion(); });
  await page.click('.focus-card [data-a="stepReps"][data-d="1"]'); await wait(300);
  const b1 = await page.evaluate(() => ({ win: !!document.querySelector('.fc-beat.win'), pop: !!document.querySelector('.fc-beat.win.pop'), t: (document.querySelector('.fc-beat') || {}).textContent }));
  await page.click('.focus-card [data-a="stepWeight"][data-d="1"]'); await wait(300);
  const b2 = await page.evaluate(() => ({ win: !!document.querySelector('.fc-beat.win'), pop: !!document.querySelector('.fc-beat.win.pop') }));
  log('Beat win:', JSON.stringify(b1), '| still win after +kg, no replay:', JSON.stringify(b2));
  if (!b1.win || !b1.pop || !/Ça bat/.test(b1.t)) fail('retour immédiat quand la cible est dépassée');
  if (!b2.win || b2.pop) fail('animation jouée une seule fois');
  await shot('03_beat_win');
  // cibles calculées : même charge = 1 rep de plus ; charge plus lourde = 1RM estimé
  const tg = await page.evaluate(() => { const def = EXO_MAP.dc_haltere, ref = { reps: 10, weight: 12 };
    return [beatTarget(def, 12, ref), beatTarget(def, 14, ref), beatCmp(def, { reps: 9, weight: 14 }, ref), beatCmp(def, { reps: 10, weight: 12 }, ref), beatCmp(EXO_MAP.pompes, { reps: 12 }, { reps: 11, weight: 0 })]; });
  log('Targets:', JSON.stringify(tg)); if (tg.join() !== '11,5,1,0,1') fail('calcul de la cible à battre');
  await page.click('.focus-card [data-a="validateSet"]'); await wait(300);
  const ft = await page.evaluate(() => [...document.querySelectorAll('.float-txt')].map(e => e.textContent).join('|'));
  log('Float after validate:', ft); if (!/Mieux que la dernière fois|Record/.test(ft)) fail('annonce à la validation');
  // fin de séance : le nombre de séries meilleures apparaît dans la fête
  await page.evaluate(() => { S.draft.exos.forEach(ex => ex.sets.forEach(s => { s.done = true; })); stopRestTimer(); finalizeSession(); }); await wait(900);
  const cel = await page.evaluate(() => (document.querySelector('.cel-beat') || {}).textContent || '');
  log('Celebration:', cel); if (!/mieux que la dernière fois/.test(cel)) fail('bilan « mieux que la dernière fois »');
  await shot('04_celebration');
  for (let k = 0; k < 3; k++) { await page.evaluate(() => { if (document.querySelector('#overlay.open')) closeSheet(); }); await wait(450); }

  // 3. Progrès : indice de force, courbe, projection
  await page.evaluate(() => switchTab('progress')); await wait(800);
  const tr = await page.evaluate(() => { const c = document.querySelector('.trend-card'); const pts = strengthSeries(12);
    return c ? { v: c.querySelector('.tr-v') && c.querySelector('.tr-v').textContent, d: (c.querySelector('.tr-d') || {}).textContent, chart: !!c.querySelector('.linechart svg'), lines: [...c.querySelectorAll('.tr-line')].map(e => e.textContent.trim()), pts: pts.length, first: pts[0] && pts[0].v, last: pts[pts.length - 1].v } : null; });
  log('Trend:', JSON.stringify(tr));
  if (!tr || !tr.chart || !/^\+\d+\u202f%$/.test(tr.v || '') || tr.last <= tr.first || !/\+\d+ pts en/.test(tr.d || '')) fail('progression de force en hausse (en %, 0 au départ)');
  if (!tr || !tr.lines.some(l => /dans 2 mois/.test(l)) || !tr.lines.some(l => /Développé couché haltères : de \d+ kg à environ \d+(,\d)? kg/.test(l))) fail('projection de l\'indice et d\'un exercice');
  await page.evaluate(() => { const c = document.querySelector('.trend-card'); document.querySelector('#v-progress').scrollTop = c.offsetTop - 70; }); await wait(300); await shot('05_trend');

  // 4. Profil > Motivation : chaque option se coupe et disparaît de l'app
  await page.evaluate(() => switchTab('profil')); await wait(500);
  for (const k of ['beat', 'nextGoal', 'trend']) { await page.click(`[data-a="toggleMotiv"][data-k="${k}"]`); await wait(150); }
  const off = await page.evaluate(() => ({ s: [S.settings.beat, S.settings.nextGoal, S.settings.trend], stored: JSON.parse(localStorage.getItem('forge.v1') || '{}').settings }));
  await page.evaluate(() => switchTab('today')); await wait(500);
  const offHome = await page.evaluate(() => !!document.querySelector('.goal-line'));
  await page.evaluate(() => switchTab('progress')); await wait(500);
  const offTrend = await page.evaluate(() => !!document.querySelector('.trend-card'));
  const offBeat = await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 2 }] }; ACT.startCustom(); const l = document.querySelector('#launch'); if (l) l.click(); return 0; });
  await wait(4500); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  const offLine = await page.evaluate(() => ({ beat: !!document.querySelector('.fc-beat'), last: !!document.querySelector('.fc-last') }));
  log('Off:', JSON.stringify(off.s), '| home', offHome, '| trend', offTrend, '| session', JSON.stringify(offLine));
  if (off.s.some(v => v !== false) || offHome || offTrend || offLine.beat || !offLine.last) fail('options de motivation désactivables');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
