// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Refonte 6 : les 4 animations signatures et l'accessibilité.
// 1. les gros chiffres défilent (animateCounts, data-from) ; 2. la courbe de « Ta force » se trace une fois par
// version des données ; 3. le grimpeur avance sur la carte « Cette semaine » au retour sur l'accueil, seulement
// quand la carte est vue (rien par-dessus) ; 4. la coche franche de la série validée, une vibration.
// Réduction des animations respectée, grands caractères sans débordement, calendrier lisible au lecteur d'écran.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v58'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1'); const ss = [];
    for (let k = 60; k >= 2; k -= 2) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, name: 'Haut du corps', exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 8 + Math.floor((60 - k) / 10) * 2, done: true })) }, { exoId: 'squat_gobelet', sets: [0, 1].map(() => ({ reps: 12, weight: 12, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18, 20, 22] } }, sessions: ss })); };
  const open = async (opts) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk }, opts || {}));
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
    return page;
  };
  let page = await open();
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. compteur : de data-from à data-count, en passant par les valeurs intermédiaires ; relancé proprement
  const cnt = await page.evaluate(async () => { const b = document.createElement('b'); b.dataset.count = '1864'; b.dataset.from = '1840'; b.dataset.unit = 'm'; document.body.appendChild(b);
    const box = document.createElement('div'); box.appendChild(b); document.body.appendChild(box); animateCounts(box);
    const sl = ms => new Promise(r => setTimeout(r, ms)); const first = b.textContent; await sl(250); const mid = b.textContent; animateCounts(box); await sl(950); const end = b.textContent, tab = getComputedStyle(b).fontVariantNumeric; box.remove();
    return { first, mid, end, tab }; });
  log('Count-up:', JSON.stringify(cnt));
  const num = t => +t.replace(/\D/g, '');
  if (!(num(cnt.first) >= 1840 && num(cnt.first) < 1864) || !(num(cnt.mid) > 1840 && num(cnt.mid) < 1864) || num(cnt.end) !== 1864 || !/ m$/.test(cnt.end) || !/tabular-nums/.test(cnt.tab)) fail('chiffres qui défilent de data-from à la valeur');

  // 2. « Ta force » : la courbe se trace à la première vue, pas au retour d'un sous-écran (mêmes données)
  await page.evaluate(() => switchTab('progress')); await wait(300);
  const fs1 = await page.evaluate(() => { const l = document.querySelector('.fs-line'); return { draw: !!document.querySelector('.fs-card.draw'), anim: getComputedStyle(l).animationName }; });
  await wait(1500); await shot('01_force_drawn');
  await page.evaluate(() => ACT.progressTab({ v: 'force' })); await wait(300); await page.evaluate(() => ACT.progressTab({ v: 'overview' })); await wait(300);
  const fs2 = await page.evaluate(() => !!document.querySelector('.fs-card.draw'));
  log('Force curve:', JSON.stringify(fs1), '| redrawn after back:', fs2);
  if (!fs1.draw || fs1.anim !== 'ctDraw' || fs2) fail('courbe de « Ta force » tracée une fois');

  // 4. la coche franche : une vibration à la validation, la coche se trace une fois (pas à chaque rendu du repos)
  await page.evaluate(() => { switchTab('today'); window.__hap = []; const h = window.haptic; window.haptic = ms => { window.__hap.push(ms); return h(ms); };
    S.custom = { exos: [{ exoId: 'squat_gobelet', sets: 3 }] }; ACT.startCustom(); });
  await wait(4600); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(700);
  await page.evaluate(() => { window.__hap = []; }); await page.click('.focus-card [data-a="validateSet"]'); await wait(200);
  const ck = await page.evaluate(() => { const s = document.querySelector('.sx-saved.fresh'), p = s && s.querySelector('.sx-ck path');
    return { fresh: !!s, anim: p ? getComputedStyle(p).animationName : '', dot: s ? getComputedStyle(s.querySelector('.sx-okdot')).animationName : '', hap: window.__hap.slice() }; });
  await wait(500); await shot('02_check');
  await page.evaluate(() => refreshFocusRegion()); const again = await page.evaluate(() => !!document.querySelector('.sx-saved.fresh'));
  log('Check:', JSON.stringify(ck), '| fresh after re-render:', again);
  if (!ck.fresh || ck.anim !== 'ckDraw' || ck.dot !== 'ckPop' || again) fail('coche franche, une fois');
  if (ck.hap.length !== 1 || !(ck.hap[0] === 18 || Array.isArray(ck.hap[0]))) fail('une seule vibration à la validation : ' + JSON.stringify(ck.hap));

  // 3. le grimpeur : terminer la séance, la carte attend que la fin de séance soit fermée, puis avance
  const before = await page.evaluate(() => wkSeen && wkSeen.alt);
  await page.evaluate(() => { S.draft.exos.forEach(e => e.sets.forEach(s => { s.done = true; })); stopRestTimer(); finalizeSession(); }); await wait(2600);
  const under = await page.evaluate(() => { const i = document.querySelector('#v-today .wk-bar i'); return { to: i.dataset.to, w: i.style.width, seen: wkSeen.alt }; });
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { const c = document.querySelector('#v-today .wk-sec'); document.querySelector('#v-today').scrollTop = c.offsetTop - 200; }); await wait(1900);
  const after = await page.evaluate(() => { const i = document.querySelector('#v-today .wk-bar i'); return { w: i.style.width, to: i.dataset.to, alt: document.querySelector('#v-today .wk-alt').textContent, seen: wkSeen.alt, now: wkNow.alt }; });
  log('Climber:', before, JSON.stringify(under), '→', JSON.stringify(after)); await shot('03_week_climbed');
  if (!under.to || under.seen !== before || parseFloat(after.w) !== parseFloat(after.to) || after.seen !== after.now) fail('le grimpeur avance après la fin de séance, une fois la carte visible');
  // l'ascension garde l'orange de la marque (plus l'ancien #FF6B3D)
  await page.evaluate(() => ACT.openAscent()); await wait(1500);
  const oldOrange = await page.evaluate(() => /#FF6B3D|#FF8A57/i.test(document.body.innerHTML));
  if (oldOrange) fail('ancien orange dans la scène de l\'ascension');
  await page.evaluate(() => closeSheet()); await wait(400);

  // calendrier : lecteur d'écran (jours avec séance nommés, les autres masqués)
  await page.evaluate(() => switchTab('history')); await wait(500);
  const cal = await page.evaluate(() => ({ on: [...document.querySelectorAll('.hc-on')].every(b => /séance|Haut du corps/.test(b.getAttribute('aria-label') || '')),
    hidden: [...document.querySelectorAll('.hc-n:not(.today)')].every(s => s.getAttribute('aria-hidden') === 'true'), group: !!document.querySelector('.hc-grid[role="group"][aria-label]') }));
  log('Calendar a11y:', JSON.stringify(cal)); if (!cal.on || !cal.hidden || !cal.group) fail('calendrier au lecteur d\'écran');

  // grands caractères (Dynamic Type) : pas de débordement, chevrons centrés sur leur ligne
  await page.addStyleTag({ content: 'html{font-size:23px!important}' }); await wait(300);
  for (const [n, f] of [['résumé', () => { switchTab('progress'); ACT.progressTab({ v: 'overview' }); }], ['historique', () => switchTab('history')], ['profil', () => switchTab('profil')]]) {
    await page.evaluate(f); await wait(600);
    const r = await page.evaluate(() => { const v = document.querySelector('.view.active');
      const off = [...v.querySelectorAll('.row,.fs-card,.ms-card,.hc-card,.pt-card,.profile-hero')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length;
      const chev = [...v.querySelectorAll('.row>.chev')].map(c => { const a = c.getBoundingClientRect(), b = c.parentElement.getBoundingClientRect(); return Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)); });
      return { wide: document.documentElement.scrollWidth > innerWidth, off, chev: chev.length ? Math.max(...chev) : 0 }; });
    log('Large text', n, JSON.stringify(r));
    if (r.wide || r.off || r.chev > 3) fail('grands caractères : ' + n);
  }
  await shot('04_large_profil');
  await page.context().close();

  // réduction des animations : tout est à sa place tout de suite
  page = await open({ reducedMotion: 'reduce' });
  await page.evaluate(() => switchTab('progress')); await page.waitForTimeout(300);
  const rm = await page.evaluate(() => { const l = document.querySelector('.fs-line'); return { anim: getComputedStyle(l).animationName, dash: getComputedStyle(l).strokeDasharray, v: document.querySelector('.fs-v').textContent }; });
  await page.evaluate(() => { switchTab('today'); wkSeen = Object.assign({}, wkNow, { alt: wkNow.alt - 20, pct: Math.max(0, wkNow.pct - .2) }); renderView('today'); });
  await page.waitForTimeout(900);
  const rmw = await page.evaluate(() => { const i = document.querySelector('#v-today .wk-bar i'); return { w: i.style.width, to: i.dataset.to }; });
  log('Reduced motion:', JSON.stringify(rm), JSON.stringify(rmw));
  if (rm.anim !== 'none' || rm.dash !== 'none' || !/%$/.test(rm.v) || (rmw.to && parseFloat(rmw.w) !== parseFloat(rmw.to))) fail('réduction des animations');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
