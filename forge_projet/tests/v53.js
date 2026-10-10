// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (ascension, lot « dopamine » 3) : le carnet de route (chaque camp a son terrain et sa ligne, les lieux réels
// et les sommets leur anecdote ; une carte postale par camp atteint, révélée en fin de séance, rangée dans le
// carnet) et la cinématique du sommet (les derniers mètres, le drapeau planté, le jour qui se lève, puis le trophée).
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v53'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v53')) return; localStorage.setItem('__seed_v53', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. données du carnet : un terrain et une ligne par camp, les lieux réels et les sommets ont leur anecdote
  const data = await page.evaluate(() => {
    const R = { bad: [], orphans: [], tops: 0, consec: 0, total: 0 };
    ASC_ORDER.forEach(k => { const camps = ascCamps(k), st = ascStory(k);
      if (st.length !== camps.length) R.bad.push(k + ':len');
      st.forEach((x, i) => { R.total++; if (!x.t || !x.q || !ASC_ART[x.art]) R.bad.push(k + ':' + i);
        if (x.real !== !!ASC_PLACES[k + '/' + camps[i][1]]) R.bad.push(k + ':real' + i);
        if (i && st[i - 1].q === x.q) R.consec++; });
      if (ASC_TOPS[k]) R.tops++;
      if (JSON.stringify(st) !== JSON.stringify((delete ASC_STORY[k], ascStory(k)))) R.bad.push(k + ':stable'); });
    Object.keys(ASC_PLACES).forEach(id => { const [k, n] = id.split('/'); if (!ascCamps(k).some(c => c[1] === n)) R.orphans.push(id); });
    R.entry = ascStory('moleson')[2].q;          // premier camp dans la rocaille : « Plus un arbre »
    R.stand = ascStory('titlis')[ascCamps('titlis').findIndex(c => c[1] === 'Stand')];
    R.bosses = ascStory('montblanc').slice(-3).map(x => x.t);
    return R;
  });
  log('Data:', JSON.stringify({ ...data, stand: data.stand && data.stand.t }));
  if (data.bad.length || data.orphans.length || data.tops !== 13 || data.consec || data.total < 200) fail('carnet : un terrain et une ligne par camp, anecdotes complètes');
  if (!/Plus un arbre/.test(data.entry) || !data.stand || !data.stand.real || !/Rotair/.test(data.stand.q) || data.bosses.join() !== 'Arête des Bosses,Arête des Bosses,Arête des Bosses') fail('carnet : terrain de la vraie voie, lieux réels');

  // 2. les cartes viennent de l'historique ; une carte regagnée après une descente ne compte qu'une fois
  const cards = await page.evaluate(() => {
    const realSA = window.strengthAt; window.strengthAt = () => null;
    const W0 = weekKey(todayISO()), wkk = n => addDaysISO(W0, -7 * n); let id = 0;
    const ses = (n, day) => ({ id: 'k' + (++id), date: addDaysISO(wkk(n), day), durationSec: 1800, exos: [{ exoId: 'dc_haltere', sets: Array.from({ length: 15 }, () => ({ reps: 10, weight: 12, done: true })) }] });
    const L = []; for (let n = 5; n >= 4; n--) for (const d of [0, 2, 4]) L.push(ses(n, d));
    for (const d of [0, 2, 4]) L.push(ses(2, d));     // semaine 3 sans séance : descente, puis on remonte
    S.goals.daysPerWeek = 3; S.ascent = { pauses: [], seen: null, descSeen: '', intro: 0 }; S.sessions = L; save(); DATA_VER++;
    const a = ascent(), C = ascCards(a), ids = C.map(c => c.k + '|' + c.i);
    const crossed = new Set(); Object.values(a.log).forEach(e => e.camps.forEach(n => crossed.add(e.key + '|' + n)));
    window.strengthAt = realSA;
    return { n: C.length, uniq: new Set(ids).size === ids.length, crossed: crossed.size, descents: a.descents.length, first: C[0] && C[0].date === L[0].date, sorted: C.every((c, i) => !i || C[i - 1].date <= c.date) };
  });
  log('Cards:', JSON.stringify(cards));
  if (!(cards.n >= 3) || !cards.uniq || cards.n !== cards.crossed || !cards.descents || !cards.first || !cards.sorted) fail('cartes : tirées de l\'historique, sans doublon après une descente');

  // 3. l'écran : la ligne « Carnet de route », les cartes, la prochaine à découvrir, une carte en grand
  await page.evaluate(() => ACT.openAscent()); await page.waitForSelector('#ascScene .asc-svg', { timeout: 8000 }); await wait(3200);
  const steps = await page.evaluate(() => [...document.querySelectorAll('#ascSteps .st-i:not(.top) .st-t small')].map(x => x.textContent));
  await page.evaluate(() => document.querySelector('.asc-row[data-k="carnet"]').scrollIntoView({ block: 'center' })); await page.click('.asc-row[data-k="carnet"]'); await wait(700);
  const car = await page.evaluate(() => ({ val: document.querySelector('.asc-row[data-k="carnet"] .val').textContent, n: document.querySelectorAll('#ascSec-carnet button.pc').length, lock: document.querySelectorAll('#ascSec-carnet .pc.locked').length,
    cards: ascCards(ascent()).length, gh: (document.querySelector('#ascSec-carnet .pc-gh') || {}).textContent, q: !!document.querySelector('#ascSec-carnet .pc-q'), pm: !!document.querySelector('#ascSec-carnet .pc-pm') }));
  log('Steps:', JSON.stringify(steps), 'Carnet:', JSON.stringify(car));
  if (!steps.length || !steps.every(t => / · \d/.test(t))) fail('étapes : le terrain sous chaque camp');
  if (car.val !== `${car.cards} cartes` || car.n !== car.cards || car.lock !== 1 || !/Moléson/.test(car.gh) || !car.q || !car.pm) fail('carnet : les cartes gagnées et la prochaine à découvrir');
  await page.evaluate(() => document.querySelector('#ascSec-carnet .pc-row').scrollIntoView({ block: 'center' })); await wait(300); await shot('01_carnet');
  await page.click('#ascSec-carnet button.pc'); await wait(700);
  const big = await page.evaluate(() => ({ t: (document.querySelector('.sheet-hd .t') || {}).textContent, big: !!document.querySelector('.pc-view .pc.big'), back: !!document.querySelector('.sheet-hd [data-a="sheetBack"]') }));
  await shot('02_card');
  await page.click('.sheet-hd [data-a="sheetBack"]'); await wait(900);
  const back = await page.evaluate(() => !!document.querySelector('#ascScene') && document.querySelector('.asc-row[data-k="carnet"]').getAttribute('aria-expanded'));
  log('Big card:', JSON.stringify(big), back);
  if (big.t !== 'Carte postale' || !big.big || !big.back || back !== 'true') fail('carte en grand, puis retour');
  // la bulle d'un camp atteint : le terrain et la ligne du carnet
  await page.evaluate(() => document.querySelector('.asc-body').scrollTop = 0); await wait(300);
  await page.evaluate(() => ACT.ascCamp({ i: '0' })); await wait(700);
  const bub = await page.evaluate(() => { const b = document.querySelector('#ascScene .asc-bub.on'); return b ? { k: b.querySelector('.ab-k').textContent, q: (b.querySelector('.ab-q') || {}).textContent || '' } : null; });
  log('Bubble:', JSON.stringify(bub));
  const t0 = await page.evaluate(() => ascStory('moleson')[0]);
  if (!bub || !bub.k.includes(t0.t) || bub.q !== t0.q) fail('bulle : terrain et ligne du carnet');
  await shot('03_bubble');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 4. fin de séance : la carte du camp atteint se révèle, « nouvelle carte »
  // (des séances aujourd'hui jusqu'à en avoir une qui franchit un camp)
  const cel = await page.evaluate(() => { let s, e, g = 0;
    do { s = { id: 'cel' + (++g), date: todayISO(), durationSec: 2400, exos: [{ exoId: 'dc_haltere', sets: Array.from({ length: 18 }, () => ({ reps: 10, weight: 14, done: true })) }] };
      S.sessions.push(s); save(); DATA_VER++; e = ascent().log[s.id]; } while (!e.camps.length && !e.summit && g < 8);
    showCelebration(s, [], [], []); return { camps: e.camps, summit: e.summit }; });
  await wait(400); await page.evaluate(() => document.querySelector('#celTrk').scrollIntoView({ block: 'start' })); await wait(3400);
  const pc = await page.evaluate(() => { const b = document.querySelector('#celBadge'); return b ? { on: b.classList.contains('on'), pc: b.classList.contains('ca-pc'), name: (b.querySelector('.pc-n b') || {}).textContent, chip: (b.querySelector('.ca-pc-k b') || {}).textContent || '', k: b.querySelector('.ca-pc-k').textContent, op: getComputedStyle(b.querySelector('.pc')).opacity } : null; });
  log('Celebration:', JSON.stringify(cel), JSON.stringify(pc));
  if (!cel.camps.length) fail('scénario : la séance doit franchir un camp');
  else if (!pc || !pc.on || !pc.pc || pc.name !== cel.camps[cel.camps.length - 1] || !/Nouvelle carte|nouvelles cartes/.test(pc.chip) || !/Camp atteint|camps atteints/.test(pc.k) || +pc.op < .99) fail('fin de séance : la carte postale du camp se révèle');
  await shot('04_celebration');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 5. le sommet : cinématique (les derniers mètres, le drapeau, le trophée), l'anecdote, la carte du sommet
  await page.evaluate(() => ascShowSummit({ key: 'cervin', date: todayISO(), sessions: 41, weeks: 14, series: 12, lap: 0 })); await wait(500);
  const s1 = await page.evaluate(() => { const el = document.querySelector('#ascSummit'); return { cls: el.className, cnt: el.querySelector('.sm-count b').textContent.replace(/\s/g, ' '), main: getComputedStyle(el.querySelector('.sm-main')).pointerEvents }; });
  await shot('05_summit_climb');
  await wait(4000);
  const s2 = await page.evaluate(() => { const el = document.querySelector('#ascSummit'); return { cls: el.className, cnt: el.querySelector('.sm-count b').textContent.replace(/\s/g, ' '), story: (el.querySelector('.story') || {}).textContent, gifts: [...el.querySelectorAll('.gift')].map(g => g.textContent.replace(/\s+/g, ' ').trim()), main: getComputedStyle(el.querySelector('.sm-main')).opacity, focus: document.activeElement && document.activeElement.className }; });
  log('Summit:', JSON.stringify(s1), JSON.stringify(s2));
  if (/planted|reveal/.test(s1.cls) || s1.cnt === '4 478 m' || s1.main !== 'none') fail('sommet : la cinématique commence par les derniers mètres');
  if (!/planted/.test(s2.cls) || !/reveal/.test(s2.cls) || s2.cnt !== '4 478 m' || !/Whymper/.test(s2.story || '') || s2.gifts.length !== 3 || !/Carte postale du sommet/.test(s2.gifts[1]) || +s2.main < .99 || !/asc-close/.test(s2.focus || '')) fail('sommet : drapeau planté, puis trophée, anecdote et cadeaux');
  await shot('06_summit');
  await page.evaluate(() => ACT.ascSummitClose()); await wait(700);
  // toucher l'écran passe la cinématique
  await page.evaluate(() => ascShowSummit({ key: 'moleson', date: todayISO(), sessions: 14, weeks: 5, series: 4, lap: 0 })); await wait(900);
  await page.mouse.click(195, 420); await wait(200);
  const skip = await page.evaluate(() => { const el = document.querySelector('#ascSummit'); return el ? el.className : 'closed'; });
  log('Skip:', skip); if (!/reveal/.test(skip)) fail('sommet : un toucher passe à la fin, sans fermer');
  await page.evaluate(() => ACT.ascSummitClose()); await wait(700);
  if (await page.$('#ascSummit')) fail('sommet : fermeture');
  // petit écran : tout tient sans défiler
  await page.setViewportSize({ width: 375, height: 667 });
  await page.evaluate(() => ascShowSummit({ key: 'everest', date: todayISO(), sessions: 300, weeks: 110, series: 40, lap: 0 })); await page.evaluate(() => document.querySelector('#ascSummit')._reveal()); await wait(900);
  const se = await page.evaluate(() => { const m = document.querySelector('#ascSummit .sm-main'); return { sh: m.scrollHeight, ch: m.clientHeight, sw: m.scrollWidth, page: document.documentElement.scrollWidth }; });
  log('Small screen:', JSON.stringify(se)); if (se.sh > se.ch + 1 || se.sw > 375 || se.page > 375) fail('sommet : tient sur un petit écran');
  await shot('07_summit_se');
  await page.evaluate(() => ACT.ascSummitClose()); await wait(700);
  await page.setViewportSize({ width: 390, height: 844 });
  // sans animations (réglage du système) : la fin tout de suite
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => ascShowSummit({ key: 'pilatus', date: todayISO(), sessions: 20, weeks: 7, series: 6, lap: 0 })); await wait(150);
  const rm = await page.evaluate(() => document.querySelector('#ascSummit').className);
  log('Reduced motion:', rm); if (!/reveal/.test(rm)) fail('sommet sans animation : la fin tout de suite');
  await page.evaluate(() => ACT.ascSummitClose()); await wait(600);

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
