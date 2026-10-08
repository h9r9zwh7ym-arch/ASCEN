// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v2.5 : stockage compact + copie IndexedDB, emojis, graphiques au doigt, transitions, animations, Rewind
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v26'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  const file = 'file://' + path.resolve(process.argv[2]);
  // historique réaliste : 18 mois, 3 séances par semaine
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const ex = ['pompes', 'dc_haltere', 'squat_gobelet', 'rowing_uni_haltere', 'planche', 'fentes_avant', 'curl_haltere', 'tractions'];
    const ss = []; const start = new Date(2025, 3, 1);
    for (let i = 0; i < 230; i++) { const d = new Date(start); d.setDate(d.getDate() + Math.floor(i * 7 / 3)); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (iso > '2026-09-26') break;
      ss.push({ id: 'h' + i, date: iso, source: i % 3 ? 'engine' : 'custom', type: 'auto', resolvedType: ['full', 'push', 'pull', 'legs'][i % 4], startedAt: iso + 'T0' + (6 + i % 3) + ':15:00.000Z', completedAt: iso + 'T0' + (6 + i % 3) + ':58:00.000Z', durationSec: 2580 + (i % 7) * 60,
        ...(i % 9 === 0 ? { note: 'Bonne séance n°' + i } : {}),
        exos: ex.slice(i % 4, i % 4 + 5).map((e, k) => ({ exoId: e, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: e === 'planche' ? 40 + (i % 20) : 8 + ((i + j) % 5), ...(/haltere|gobelet/.test(e) ? { weight: 10 + Math.floor(i / 12) * 1 } : {}), done: true, ...(j === 0 && k === 1 && i % 5 === 0 ? { pr: true } : {}), effort: 1 + ((i + j) % 3) })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { name: 'Yannick' }, equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true } }, sessions: ss })); });
  await page.goto(file); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(500);

  // ---- 1. stockage compact : aller-retour exact et gain de place
  const st = await page.evaluate(() => {
    const plain = JSON.stringify(S.sessions);
    const round = S.sessions.map(s => compactSession(unpackSession(packSession(s))));
    const same = JSON.stringify(round.map(x => JSON.stringify(x, Object.keys(x).sort()))) === JSON.stringify(S.sessions.map(s => compactSession(s)).map(x => JSON.stringify(x, Object.keys(x).sort())));
    persistNow(); const packed = localStorage.getItem('forge.v1');
    return { n: S.sessions.length, plainKB: Math.round(plain.length / 1024), packedKB: Math.round(packed.length / 1024), same, fmt: JSON.parse(packed).fmt };
  });
  log('Storage:', JSON.stringify(st));
  if (!st.same) fail('aller-retour du format compact');
  if (st.fmt !== 2 || st.packedKB > st.plainKB * 0.55) fail('gain de place insuffisant');
  // rechargement depuis le format compact
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(400);
  const again = await page.evaluate(() => ({ n: S.sessions.length, note: S.sessions.filter(s => s.note).length, pr: S.sessions.reduce((t, s) => t + sessionPRCount(s), 0), eff: S.sessions[5].exos[0].sets[0].effort }));
  log('Reloaded:', JSON.stringify(again)); if (again.n !== st.n || !again.note || !again.eff) fail('rechargement du format compact');
  // copie IndexedDB : localStorage vidé → données reprises
  await wait(600);
  await page.evaluate(() => { persistBlocked = true; localStorage.removeItem('forge.v1'); });
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(1500);
  const rec = await page.evaluate(() => ({ n: S.sessions.length, ls: !!localStorage.getItem('forge.v1') }));
  log('Recovered from IndexedDB:', JSON.stringify(rec)); if (rec.n !== st.n || !rec.ls) fail('reprise depuis IndexedDB');
  // espace affiché dans le Profil
  await page.evaluate(() => switchTab('profil')); await wait(500);
  const usage = await page.$eval('[data-a="openStorage"] .s', e => e.textContent).catch(() => null);
  log('Usage row:', usage); if (!usage || !/Ko|Mo/.test(usage)) fail('indicateur d\'espace');
  await page.click('[data-a="openStorage"]'); await wait(700); await shot('01_storage');
  const sto = await page.$eval('#stoBody', e => e.textContent.replace(/\s+/g, ' ').slice(0, 200)); log('Storage sheet:', sto);
  if (!/ans d'entraînement/.test(sto)) fail('estimation de durée');
  const idbSize = await page.evaluate(async () => { const r = await idbGet(); return { compressed: typeof r.data !== 'string', bytes: typeof r.data === 'string' ? r.data.length * 2 : (r.data.byteLength ?? r.data.size), ls: (localStorage.getItem('forge.v1') || '').length * 2 }; });
  log('Backup copy:', JSON.stringify(idbSize)); if (typeof CompressionStream !== 'undefined' && false) {}
  if (idbSize.bytes > idbSize.ls * 0.5) fail('copie de secours non compressée');
  await page.evaluate(() => closeSheet()); await wait(400);

  // ---- 2. graphiques au doigt
  await page.evaluate(() => { progressTab = 'exos'; switchTab('progress'); }); await wait(700);
  await page.click('[data-a="openExoChart"]'); await wait(1000);
  const box = await page.evaluate(() => { const r = document.querySelector('.sheet .linechart svg').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const tipAt = async fx => { await page.mouse.move(box.x + box.w * fx, box.y + box.h * 0.5); return page.evaluate(() => ({ t: document.querySelector('#charttip').textContent, on: document.querySelector('#charttip').classList.contains('show'), cur: document.querySelector('.sheet .lc-cursor').classList.contains('on') })); };
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.5); await page.mouse.down();
  const a1 = await tipAt(0.25), a2 = await tipAt(0.6), a3 = await tipAt(0.95);
  await shot('02_chart_scrub'); await page.mouse.up();
  log('Scrub:', a1.t, '→', a2.t, '→', a3.t, '| cursor', a3.cur);
  if (!a1.on || a1.t === a3.t || !a3.cur) fail('parcours de courbe');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => switchTab('history')); await wait(700);
  const cb = await page.evaluate(() => { const r = document.querySelector('#histChart .cc-plot').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await page.mouse.move(cb.x + 10, cb.y + cb.h - 10); await page.mouse.down();
  await page.mouse.move(cb.x + cb.w * 0.5, cb.y + cb.h - 10); const c1 = await page.$eval('#charttip', e => e.textContent);
  await page.mouse.move(cb.x + cb.w - 5, cb.y + cb.h - 10); const c2 = await page.$eval('#charttip', e => e.textContent); await page.mouse.up();
  log('Columns scrub:', c1, '→', c2); if (!c1 || c1 === c2) fail('parcours des colonnes');
  // ---- 3. transitions
  const vt = await page.evaluate(() => !!document.startViewTransition);
  await page.click('.tabbtn[data-id="progress"]'); await wait(80); await shot('03_transition_mid'); await wait(500);
  log('View transitions:', vt, '| tab now', await page.evaluate(() => currentTab));
  if (await page.evaluate(() => currentTab) !== 'progress') fail('changement d\'onglet');

  // ---- 4. exercice animé dans la fiche
  await page.evaluate(() => ACT.showExoInfo({ id: 'squat_gobelet' })); await wait(900);
  const an = await page.evaluate(() => { const s = document.querySelector('.sheet .exo-anim'); return s ? { anims: s.querySelectorAll('animate').length, load: !!s.querySelector('.ea-load, .ea-db, .ea-plate, .ea-bar, .ea-band') } : null; });
  log('Exercise animation:', JSON.stringify(an)); if (!an || an.anims < 3 || !an.load) fail('animation de l\'exercice');
  await shot('04_exo_anim'); await page.evaluate(() => closeSheet()); await wait(400);

  // ---- 5. Rewind animé
  await page.evaluate(() => { S.medals = {}; checkMedals(true); switchTab('history'); }); await wait(600);
  await page.click('[data-a="openRecap"]'); await wait(900); await shot('05_rewind_sheet');
  await page.click('.rw-cover'); await wait(700); await shot('06_rw_intro_rewinding');
  const intro = await page.evaluate(() => ({ open: !!document.querySelector('#rewind.show'), slides: rw.slides.length, date: document.querySelector('#rwDate').textContent }));
  log('Rewind:', JSON.stringify(intro)); if (!intro.open || intro.slides < 6) fail('lecteur Rewind');
  await wait(3200);
  const landed = await page.evaluate(() => document.querySelector('#rwDate') ? document.querySelector('#rwDate').textContent : null); log('Landed on:', landed);
  const names = [];
  for (let k = 1; k < 12; k++) {
    await wait(k === 1 ? 300 : 50);
    const st = await page.evaluate(() => rw ? { i: rw.i, bg: rw.el.dataset.bg, label: (document.querySelector('.rw-slide.in .rw-label') || {}).textContent || '' } : null);
    if (!st) break; names.push(st.i + ':' + st.label);
    await wait(1600); await shot('07_rw_' + String(st.i).padStart(2, '0'));
    if (rw_last(st)) break;
    await page.mouse.click(330, 420); await wait(500);
  }
  function rw_last() { return false; }
  log('Slides:', names.join(' | '));
  const end = await page.evaluate(() => rw && rw.slides[rw.i].outro); log('Reached outro:', end); if (!end) fail('fin du Rewind');
  const img = await page.evaluate(() => (document.querySelector('#rwImg') || {}).src || ''); if (!img.startsWith('data:image/png')) fail('image de fin');
  // retour en arrière, pause, fermeture par glissement
  await page.mouse.click(40, 420); await wait(600); const back = await page.evaluate(() => rw.i);
  await page.evaluate(() => rwGo(0)); await wait(300);
  await page.mouse.move(200, 400); await page.mouse.down(); await wait(500); const paused = await page.evaluate(() => rw.paused); await page.mouse.up();
  await page.mouse.move(200, 300); await page.mouse.down(); await page.mouse.move(200, 380); await page.mouse.move(200, 480); await page.mouse.up(); await wait(500);
  const closed = await page.evaluate(() => !rw && !document.querySelector('#rewind'));
  log('Back to', back, '| paused while held', paused, '| swipe closes', closed); if (!paused || !closed) fail('gestes du Rewind');
  // année
  await page.evaluate(() => openRewind('year', '2026')); await wait(4500); await page.mouse.click(330, 420); await wait(1500); await shot('08_rw_year_sessions');
  await page.evaluate(() => closeRewind()); await wait(500);

  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
