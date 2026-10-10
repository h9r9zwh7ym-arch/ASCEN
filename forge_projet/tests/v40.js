// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (retouches) : Rewind sur le mois en cours, légende des muscles aux couleurs des régions et
// décimales à virgule, accueil centré sur « Ma séance », catalogue (doublons fusionnés, exotiques
// retirés mais gardés pour l'historique, Pilates, poids du corps, étirements)
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v40'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // une séance enregistrée et « Ma séance » qui contiennent des exercices fusionnés depuis
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v40')) return; localStorage.setItem('__seed_v40', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = [3, 6, 9].map(k => ({ id: 's' + k, date: iso(k), exos: [{ exoId: 'dips_banc', sets: [{ reps: 10, done: true }] }, { exoId: 'pompes', sets: [{ reps: 12, done: true }, { reps: 10, done: true }] }] }));
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true }, weights: { dumbbells: [4, 6, 8, 10] } }, sessions: ss,
      templates: [{ id: 'tm', n: 'Mélange', days: [], exos: [{ exoId: 'dips_banc', sets: 3 }, { exoId: 'dips_chaise', sets: 2 }, { exoId: 'swing_kb_uni', sets: 3 }, { exoId: 'pompes', sets: 3 }] }],
      custom: { exos: [] } })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. Rewind : la période en cours, même en début de mois ; la précédente seulement si elle est vide
  const rw = await page.evaluate(() => {
    const cur = todayISO().slice(0, 7), keep = S.sessions.slice();
    S.sessions.push({ id: 'cur', date: todayISO(), exos: [{ exoId: 'pompes', sets: [{ reps: 8, done: true }] }] });
    const withCur = recapDefault('month'), year = recapDefault('year');
    S.sessions = keep.filter(s => !s.date.startsWith(cur));
    const empty = recapDefault('month'); S.sessions = keep;
    return { cur, withCur, year, empty, prev: recapPrevKey('month', cur) };
  });
  log('Rewind default:', JSON.stringify(rw));
  if (rw.withCur !== rw.cur || rw.year !== rw.cur.slice(0, 4)) fail('Rewind ouvert sur la période en cours');
  if (rw.empty !== rw.prev && rw.empty !== rw.cur) fail('Rewind : mois précédent si le mois en cours est vide');

  // 2. décimales à la française (Safari écrit « 0.5 » en fr-CH) ; carte des muscles unique, légende = régions
  const dec = await page.evaluate(() => [fmtDec(0.5), fmtDec(3.5), fmtDec(12), fmtNum(12345).replace(/\s/g, ' ')]);
  log('Decimals:', JSON.stringify(dec)); if (dec[0] !== '0,5' || dec[1] !== '3,5' || dec[2] !== '12' || !/^12.345$/.test(dec[3])) fail('décimales à virgule');
  await page.click('.tabbtn[data-id="progress"]'); await wait(500); await page.click('[data-a="progressTab"][data-v="muscles"]'); await wait(600);
  const mm = await page.evaluate(() => {
    const card = document.querySelector('.mm-card'), legend = [...card.querySelectorAll('.mm-legend span')];
    const swatch = legend.map(s => ({ cls: s.className, c: getComputedStyle(s.querySelector('i')).backgroundColor }));
    const zones = {}; card.querySelectorAll('.mm-z.on').forEach(z => { zones[z.getAttribute('class').match(/r-(\w+)/)[1]] = getComputedStyle(z).fill; });
    return { cards: document.querySelectorAll('.mm-card').length, rows: card.querySelectorAll('.wv-row').length, stimRows: document.querySelectorAll('.stim-card .wv-row').length, head: !!document.querySelector('.stim-card .wv-axis'), swatch, zones,
      vals: [...document.querySelectorAll('.stim-card .wv-v, .stim-card .wv-f')].map(e => e.textContent), titles: [...document.querySelectorAll('#v-progress .cc-t')].map(e => e.textContent) };
  });
  log('Muscle card:', JSON.stringify({ cards: mm.cards, rows: mm.rows, head: mm.head, legend: mm.swatch.map(s => s.cls), vals: mm.vals.slice(0, 5) }));
  if (mm.cards !== 1 || mm.rows || !mm.stimRows || !mm.head || mm.titles.includes('Volume par muscle')) fail('carte des muscles puis stimulus par muscle');
  // 4.0 : une seule teinte (l'intensité dit combien), plus de légende qui mêle mouvements et muscles
  if (mm.swatch.length || new Set(Object.values(mm.zones)).size > 1 || !Object.keys(mm.zones).length) fail('carte des muscles en une seule teinte');
  if (mm.vals.some(v => /\./.test(v))) fail('séries avec une virgule');
  await page.evaluate(() => { const c = document.querySelector('.mm-card'); document.querySelector('#v-progress').scrollTop = c.offsetTop - 60; }); await wait(300); await shot('01_muscles');

  // 3. accueil : « Ma séance » d'abord, une seule action forte, plus de « Ensuite … »
  await page.click('.tabbtn[data-id="today"]'); await wait(600);
  const home = await page.evaluate(() => ({
    hero: (document.querySelector('#v-today .hero') || {}).className, title: (document.querySelector('.hero-title') || {}).textContent,
    acts: [...document.querySelectorAll('.hero.compose button')].map(b => b.dataset.a), propose: !!document.querySelector('#v-today [data-a="startSession"]'),
    next: !!document.querySelector('.hero-next'), sep: !!document.querySelector('.home-sep'), nudges: document.querySelectorAll('#v-today .backup-nudge').length, tab: S.settings.todayTab }));
  log('Home (empty):', JSON.stringify(home));
  // (loi de Hick : la séance de l'app s'ouvre depuis la carte, « Ou laisse l'app choisir »)
  if (!/compose/.test(home.hero || '') || home.acts.join() !== 'customAddOpen,todayMode' || home.propose) fail('accueil : composer sa séance en premier');
  if (home.next || home.sep || home.nudges > 1) fail('accueil allégé (pas de « Ensuite », un seul rappel)');
  await shot('02_home_compose');
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 3 }, { exoId: 'squat_pdc', sets: 3 }], name: 'Ma routine' }; save(); renderView('today'); }); await wait(400);
  const filled = await page.evaluate(() => ({ title: document.querySelector('.hero-title').textContent, go: document.querySelector('.hero .hero-go').dataset.a,
    starts: document.querySelectorAll('#v-today [data-a="startCustom"]').length, list: document.querySelectorAll('.group.builder .row').length, head: document.querySelector('#v-today .sh-t').textContent }));
  log('Home (filled):', JSON.stringify(filled));
  if (filled.title !== 'Ma routine' || filled.go !== 'startCustom' || filled.starts !== 1 || filled.list !== 2) fail('« Ma séance » en carte principale, un seul « C\'est parti »');
  await shot('03_home_custom');
  await page.click('[data-a="todayMode"][data-v="proposal"]'); await wait(500);
  await page.evaluate(() => { if (!document.querySelector('.type-chip')) ACT.propAdjust(); }); await wait(500);   // types : derrière « Ajuster »
  const prop = await page.evaluate(() => ({ hero: document.querySelector('#v-today .hero').className, express: !!document.querySelector('.hero [data-a="startExpress"]'),
    starts: document.querySelectorAll('#v-today [data-a="startSession"]').length, chips: [...document.querySelectorAll('.type-chip')].map(b => b.dataset.v) }));
  log('Proposal:', JSON.stringify(prop));
  if (!/proposal/.test(prop.hero) || !prop.express || prop.starts !== 1 || !prop.chips.includes('pilates')) fail('proposition de l\'app en second choix');

  // 4. catalogue : retirés absents des listes mais lisibles dans l'historique ; doublons fusionnés
  const cat = await page.evaluate(() => {
    const retired = [...EXO_RETIRED];
    const listed = availableExos().map(e => e.id), all = EXOS.map(e => e.id);
    return { n: EXOS.length, retiredListed: retired.filter(id => all.includes(id) || listed.includes(id)), retiredKnown: retired.every(id => EXO_MAP[id] && RIGS[id]),
      tpl: S.templates[0].exos.map(e => e.exoId + ':' + e.sets).join(','), hist: S.sessions.some(s => s.exos.some(e => e.exoId === 'dips_banc')),
      harder: EXOS.map(e => harderVariant(e)).filter(Boolean).filter(d => EXO_RETIRED.has(d.id)).map(d => d.id) };
  });
  log('Catalog:', JSON.stringify(cat));
  if (cat.retiredListed.length || !cat.retiredKnown) fail('exercices retirés : hors des listes, connus pour l\'historique');
  if (cat.tpl !== 'dips_chaise:3,swing_kb:3,pompes:3' || !cat.hist) fail('doublons fusionnés dans les séances enregistrées, historique intact');
  if (cat.harder.length) fail('jamais proposé en progression : ' + cat.harder.join());
  // nouveaux exercices : au poids du corps, chacun animé, durée en secondes pour les étirements
  const fresh = await page.evaluate(() => {
    const ids = ['pilates_cent', 'enroule_pilates', 'cercles_jambe', 'teaser_pilates', 'nage_pilates', 'coquillage', 'elevation_jambe_cote', 'kickback_quadrupedie', 'crunch_velo', 'fente_croisee', 'pompes_mur', 'planche_touches',
      'etir_pigeon', 'etir_papillon', 'etir_cou', 'etir_torsion', 'etir_chien', 'etir_dorsaux', 'etir_lateral', 'etir_biceps', 'etir_livre'];
    const avail = new Set(availableExos().map(e => e.id));
    return { missing: ids.filter(id => !EXO_MAP[id] || !avail.has(id) || !RIGS[id] || !/<path/.test(exoPicto(EXO_MAP[id]))),
      stretchUntimed: ids.filter(id => isStretch(EXO_MAP[id]) && !isTimed(EXO_MAP[id])), stretches: EXOS.filter(isStretch).length };
  });
  log('New exercises:', JSON.stringify(fresh));
  if (fresh.missing.length || fresh.stretchUntimed.length || fresh.stretches < 20) fail('nouveaux exercices complets : ' + fresh.missing.concat(fresh.stretchUntimed).join());
  // séance « Pilates & sol » : au sol, sans matériel ni cardio, alternance abdos / fessiers / dos
  const pil = await page.evaluate(() => { const s = generateEngineSession('pilates'); const defs = s.exos.map(e => EXO_MAP[e.exoId]).filter(d => !isStretch(d));
    return { n: defs.length, ids: defs.map(d => d.id), bad: defs.filter(d => d.equip.some(q => q !== 'bodyweight') || d.muscles.includes('cardio')).map(d => d.id), muscles: [...new Set(defs.map(d => d.muscles[0]))] }; });
  log('Pilates session:', JSON.stringify(pil));
  if (pil.n < 4 || pil.bad.length || !pil.muscles.includes('abdos') || !pil.muscles.includes('fessiers')) fail('séance Pilates & sol');
  // recherche : « pilates » trouve les exercices de Pilates
  await page.click('[data-a="todayMode"][data-v="custom"]'); await wait(400);
  await page.click('[data-a="customAddOpen"]'); await wait(500);
  await page.fill('#pickerSearch', 'pilates'); await wait(300);
  const found = await page.$$eval('#overlay .pick-row, #overlay .row', r => r.map(x => x.textContent));
  log('Search "pilates":', found.length); if (found.length < 6 || !found.some(t => /Cent/.test(t))) fail('recherche « pilates »');
  await shot('04_search_pilates');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
