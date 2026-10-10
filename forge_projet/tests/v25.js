// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v2.4 : glisser pour fermer, sélecteur avec répétitions, trophées cachés et nouveau rendu
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v25'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  // geste tactile synthétique (TouchEvent) : fonctionne dans Chromium et WebKit
  const swipe = (sel, dy, ms = 220) => page.evaluate(async ([sel, dy, ms]) => {
    const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y0 = r.top + Math.min(20, r.height / 2);
    // WebKit refuse « new Touch() » hors appareil tactile : événement générique avec les mêmes champs
    const mk = (type, y) => { const t = { identifier: 1, target: el, clientX: x, clientY: y }; const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'touches', { value: type === 'touchend' ? [] : [t] }); Object.defineProperty(ev, 'changedTouches', { value: [t] }); el.dispatchEvent(ev); };
    mk('touchstart', y0); const n = 10;
    for (let i = 1; i <= n; i++) { await new Promise(r => setTimeout(r, ms / n)); mk('touchmove', y0 + dy * i / n); }
    mk('touchend', y0 + dy);
  }, [sel, dy, ms]);
  const isOpen = () => page.evaluate(() => document.querySelector('#overlay').classList.contains('open'));
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 });
  await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await wait(500);

  // ---- 1. glisser vers le bas
  await page.evaluate(() => switchTab('progress')); await wait(500);
  await page.evaluate(() => { targetDraft = { exoId: 'pompes', kind: 'reps', value: 12 }; openTargetSheet(); }); await wait(500);
  await swipe('.sheet .sheet-hd', 40, 400); await wait(450);   // petit geste lent : la feuille revient
  log('Small drag keeps sheet:', await isOpen()); if (!(await isOpen())) fail('petit glissement a fermé la feuille');
  await swipe('.sheet .sheet-hd', 320); await wait(500);
  log('Swipe closes target sheet:', !(await isOpen())); if (await isOpen()) fail('glisser ne ferme pas');
  // depuis le contenu, défilé tout en haut
  await page.evaluate(() => switchTab('profil')); await wait(400);
  await page.click('[data-a="openGoals"]'); await wait(500);
  await page.evaluate(() => { document.querySelector('.sheet-body').scrollTop = 200; });
  await swipe('.sheet-body .group', 300); await wait(500);
  log('Scrolled content does not close:', await isOpen()); if (!(await isOpen())) fail('fermé alors que le contenu défilait');
  await page.evaluate(() => { document.querySelector('.sheet-body').scrollTop = 0; });
  await swipe('.sheet-body .chip', 300); await wait(500);
  log('Top content swipe closes:', !(await isOpen())); if (await isOpen()) fail('glisser depuis le contenu en haut');
  // éditeur de séance modifié : confirmation au lieu de fermer
  await page.evaluate(() => { tplEdit = { id: null, n: 'Test', days: [], exos: [{ exoId: 'pompes', sets: 3 }], dirty: true }; renderTplEditor(); }); await wait(500);
  await swipe('.sheet .sheet-hd', 320); await wait(500);
  const guard = await page.evaluate(() => !!document.querySelector('[data-a="tplEdDiscard"]')); log('Dirty editor asks first:', guard); if (!guard) fail('éditeur modifié fermé sans confirmation');
  await page.evaluate(() => { tplEdit = null; closeSheet(); }); await wait(400);

  // ---- 2. sélecteur : dose affichée
  await page.evaluate(() => switchTab('today')); await wait(400);
  await page.evaluate(() => openPicker({ title: 'Choisir des exercices', multi: true, onDone: () => closeSheet() })); await wait(600);
  const doses = await page.$$eval('.pick-row .dose', els => els.slice(0, 40).map(e => e.textContent));
  log('Doses:', doses.slice(0, 4).join(' | '), '… timed:', doses.find(d => / s$/.test(d)));
  if (!doses.length || !doses.every(d => /^\d × \d+–\d+ (s|reps)$/.test(d))) fail('dose absente ou mal formée');
  if (!doses.some(d => / s$/.test(d))) fail('pas de durée pour les exercices chronométrés');
  await shot('01_picker');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { S.settings.todayTab = 'custom'; S.custom = { exos: [] }; S.templates = []; save(); renderView('today'); }); await wait(500);
  await page.evaluate(() => { const b = document.querySelector('.hero.compose, .builder-empty'); if (b) b.scrollIntoView({ block: 'start' }); }); await wait(300);
  await shot('02_today_icons');

  // ---- 3. trophées : rendu 3D, secrets
  await page.evaluate(() => { const now = new Date().toISOString(); const ids = MEDALS.filter(m => !m.secret).map(m => m.id);
    ids.forEach((id, i) => { const t = i % 5; if (t) { S.medals[id] = { t, d: {} }; for (let k = 1; k <= t; k++) S.medals[id].d[k] = now; } });
    S.medals.s_friday13 = { t: 1, d: { 1: now } }; S.medals.s_phoenix = { t: 1, d: { 1: now } }; S.medals.s_week7 = { t: 1, d: { 1: now } }; save();
    progressTab = 'medals'; switchTab('progress'); });
  await wait(900); await shot('03_medals_top');
  await page.evaluate(() => ACT.allMedals()); await wait(1200);   // la collection complète : feuille « Tous les trophées »
  const info = await page.evaluate(() => ({ svgs: document.querySelectorAll('.medal-svg').length, defs: !!document.getElementById('medal-defs'),
    secretCards: document.querySelectorAll('.secret-card').length, found: document.querySelectorAll('.secret-card.found').length, emoji: /[\u{1F300}-\u{1FAFF}]/u.test(document.querySelector('.medal-grid').textContent) }));
  log('Medals:', JSON.stringify(info));
  if (!info.defs || info.svgs < 40 || info.secretCards !== 10 || info.found !== 3 || info.emoji) fail('rendu des trophées');
  await page.evaluate(() => { const g = document.querySelectorAll('.medal-grid')[1]; g.scrollIntoView({ block: 'start' }); }); await wait(500); await shot('04_medals_grid');
  await page.evaluate(() => document.querySelector('.secret-card').scrollIntoView({ block: 'center' })); await wait(500); await shot('05_secrets');
  await page.click('.secret-card:not(.found)'); await page.waitForSelector('.medal-modal .mm-desc, .t3d-full.show .t3d-desc', { timeout: 15000 }); await wait(500); await shot('06_secret_locked');
  const hint = await page.$eval('.medal-modal .mm-desc, .t3d-full .t3d-desc', e => e.textContent); log('Hint:', hint); if (!/^Indice/.test(hint)) fail('indice du secret');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { if (qs('.t3d-full')) t3dClose(); closeSheet(); }); await wait(600);
  await page.evaluate(() => showMedalModal2D('sessions')); await wait(900);
  await page.mouse.move(195 + 40, 330 + 20); await wait(200); await shot('07_medal_modal');
  const tilt = await page.evaluate(() => { const b = document.querySelector('.medal-modal .medal.big'); const r = b.getBoundingClientRect();
    b.dispatchEvent(new PointerEvent('pointermove', { clientX: r.right - 5, clientY: r.top + 5, bubbles: true })); return b.style.transform; });
  log('Tilt:', tilt); if (!/rotateY\(/.test(tilt)) fail('inclinaison 3D');
  await page.evaluate(() => closeSheet()); await wait(400);
  // un secret débloqué par une vraie séance : semainier
  await page.evaluate(() => { S.medals = {}; save(); });
  const sec = await page.evaluate(() => { const base = new Date(2026, 0, 5); for (let i = 0; i < 7; i++) { const d = new Date(base); d.setDate(d.getDate() + i);
      S.sessions.push({ id: 'w' + i, date: localISO(d), source: 'custom', durationSec: 1800, exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }); }
    S.sessions.sort((a, b) => a.date < b.date ? -1 : 1); save(); const ups = checkMedals(); return ups.map(u => u.m.id + ':' + tierLabel(u.m, u.tier)); });
  log('Unlocked:', sec.join(', ')); if (!sec.includes('s_week7:Secret')) fail('secret non débloqué');
  // dark
  await page.emulateMedia({ colorScheme: 'dark' }); await page.evaluate(() => { progressTab = 'medals'; renderView('progress'); }); await wait(700); await shot('08_medals_dark');

  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
