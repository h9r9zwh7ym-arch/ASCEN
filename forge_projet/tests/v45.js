// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (animations et justesse) : barre d'état à la couleur de la barre de navigation, carte de force
// vide sans chevauchement, histogramme qui glisse d'une mesure à l'autre, étoile animée, sons du
// Rewind sur un bus coupé à chaque diapo, 1RM relatif pour le poids du corps, muscle secondaire qui
// arrête le désentraînement, séries faciles comptées ½ dans le stimulus
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v45'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk, colorScheme: 'dark' });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // un seul exercice fait une fois : la carte de force est encore vide
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v45')) return; localStorage.setItem('__seed_v45', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14] } },
      sessions: [{ id: 'a', date: iso(2), durationSec: 1320, exos: [{ exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 10, weight: 12, done: true })) }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. Progrès : la carte de force vide ne colle plus aux chiffres clés, et dit où on en est
  await page.click('.tabbtn[data-id="progress"]'); await wait(800);
  const ov = await page.evaluate(() => { const c = document.querySelector('.trend-card').getBoundingClientRect(), k = document.querySelector('.kpi-grid').getBoundingClientRect();
    return { gap: Math.round(k.top - c.bottom), dots: document.querySelectorAll('.tr-dots i.on').length, txt: document.querySelector('.tr-empty b').textContent }; });
  log('Empty strength card:', JSON.stringify(ov)); if (ov.gap < 10 || ov.dots !== 1 || !/Encore 2 séances/.test(ov.txt)) fail('carte de force vide : écart et progression');
  await shot('01_empty_strength');

  // 2. barre d'état : couleur du fond en haut de page, de la barre de navigation après défilement
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  const top = await page.evaluate(() => document.querySelector('meta[name="theme-color"]:not([media])').content);
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 300; }); await wait(300);
  const scrolled = await page.evaluate(() => document.querySelector('meta[name="theme-color"]:not([media])').content);
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 0; }); await wait(300);
  const back = await page.evaluate(() => document.querySelector('meta[name="theme-color"]:not([media])').content);
  log('Status bar:', top, '→', scrolled, '→', back); if (top !== '#0b0b0a' || scrolled !== '#11100f' || back !== top) fail('barre d\'état assortie à la barre de navigation');

  // 3. justesse : 1RM relatif au poids du corps, muscle secondaire, séries faciles
  const calc = await page.evaluate(() => {
    const iso = k => addDaysISO(todayISO(), -k), saved = S.sessions;
    S.sessions = [10, 10, 20].map((r, i) => ({ id: 'p' + i, date: iso(30 - i * 7), exos: [{ exoId: 'pompes', sets: [{ reps: r, done: true }] }] })); DATA_VER++;
    const pushIdx = strengthAt(todayISO()).index;
    // triceps : exercice principal il y a 40 jours, puis seulement des développés (triceps secondaire)
    S.sessions = [44, 42, 40].map((k, i) => ({ id: 't' + i, date: iso(k), exos: [{ exoId: 'extension_triceps_nuque', sets: [{ reps: 10, weight: 8, done: true }] }] }))
      .concat([{ id: 'b', date: iso(3), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 12, done: true }] }] }]); DATA_VER++;
    const tri = strengthAt(todayISO()).muscles.find(m => m.id === 'triceps');
    S.sessions = [{ id: 'e', date: todayISO(), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 12, done: true, effort: 1 }, { reps: 10, weight: 12, done: true, effort: 3 }] }] }]; DATA_VER++;
    const pect = muscleVolume(7).find(m => m.id === 'pect').sets;
    S.sessions = saved; DATA_VER++;
    return { pushIdx, triDays: tri && tri.days, triF: tri && tri.f, pect };
  });
  log('Formulas:', JSON.stringify(calc));
  if (calc.pushIdx !== 125 || calc.triDays !== 3 || calc.triF !== 1 || calc.pect !== 1.5) fail('1RM relatif, muscle secondaire, séries faciles');

  // 4. historique : en changeant de mesure, les barres glissent (mêmes colonnes, animation en cours)
  await page.click('.tabbtn[data-id="history"]'); await wait(600);
  await page.click('[data-a="histRange"][data-v="3m"]'); await wait(700);
  await page.click('[data-a="histMetric"][data-v="minutes"]'); await wait(60);
  const morph = await page.evaluate(() => ({ cls: document.querySelector('#histChart').className, anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.classList && a.effect.target.classList.contains('cc-bar')).length }));
  log('Bars morph:', JSON.stringify(morph)); if (!/morph/.test(morph.cls) || !morph.anims) fail('barres qui glissent d\'une mesure à l\'autre');
  await wait(600);

  // 5. favoris : l'étoile rebondit avec une auréole
  await page.evaluate(() => ACT.showExoInfo({ id: 'pompes' })); await wait(600);
  await page.click('#overlay .fav-toggle'); await wait(80);
  const pop = await page.evaluate(() => ({ pop: document.querySelector('#overlay .fav-toggle').classList.contains('pop'), anim: getComputedStyle(document.querySelector('#overlay .fav-toggle .ii')).animationName }));
  log('Star pop:', JSON.stringify(pop)); if (!pop.pop || pop.anim !== 'favPop') fail('étoile animée');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 6. Rewind : sons calés sur les animations, sur un bus propre à chaque diapo
  if (!wk) {
    const snd = await page.evaluate(async () => {
      const c = { tone: 0, tok: 0, whoosh: 0, bell: 0 };
      ['tone', 'tok', 'whoosh', 'bell'].forEach(k => { const f = window[k]; window[k] = (...a) => { c[k]++; return f(...a); }; });
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); // geste : contexte audio prêt
      openRewind('month', todayISO().slice(0, 7));
      await new Promise(r => setTimeout(r, 500));
      const intro = { ...c }, bus1 = rw.bus;
      rwGo(1); await new Promise(r => setTimeout(r, 300));
      const bus2 = rw.bus, cut = bus1 && bus1 !== bus2;
      closeRewind();
      return { intro, after: c, cut: !!cut, state: AC && AC.state };
    });
    log('Rewind sounds:', JSON.stringify(snd));
    if (snd.state === 'running' && (snd.intro.tok < 10 || !snd.intro.whoosh || snd.after.tone <= snd.intro.tone || !snd.cut)) fail('sons du Rewind');
  }

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
