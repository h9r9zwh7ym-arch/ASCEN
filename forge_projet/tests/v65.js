// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Passe finale (2.1.3) : pile de feuilles « vivante » (l'écran d'avant reste dans la page sous le sous-écran, révélé tel
// quel au retour, sans copie pendant le geste) ; son créé au lâcher, pas au contact ; roue abdominale qui roule (mains
// sur la poignée, bras tendus) ; animations relancées à l'affichage ; export tableur sans formules ; fichiers importés
// sans « __proto__ » ; Mes exercices mis à jour sur place ; phrases d'exemple retirées ; lancement en ≈ 0,9 s.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v65'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const ss = []; for (let k = 40; k >= 2; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k); ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, source: 'custom', name: k === 40 ? '=1+1' : undefined, note: k === 37 ? '@SUM(A1)' : undefined, exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'YaYa' },
      equipment: { owned: { dumbbells: true, bench: true, ab_roller: true } }, sessions: ss })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(900);
  // lancement (2.1.6) : aucun écran de lancement, l'app s'affiche directement
  if (await page.evaluate(() => !!document.getElementById('splash') || /id="splash"/.test(document.documentElement.outerHTML))) fail('pas d\'écran de lancement');
  const bgs = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).backgroundColor, document.getElementById('sbar') && getComputedStyle(document.getElementById('sbar')).backgroundColor]);
  log('Lancement : fond', bgs.join(' / '));
  // 2.7.0 : la barre d'état est fondue (voile transparent, pas de couleur pleine)
  if (!bgs[0] || bgs[0] !== bgs[1] || !/rgba\(0, 0, 0, 0\)|transparent/.test(bgs[2] || 'transparent')) fail('écran de lancement aux couleurs de l\'app, barre d\'état fondue');
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const tap = sel => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) throw new Error('absent : ' + sel); el.click(); }, sel);
  const sheets = () => page.evaluate(() => [...document.querySelectorAll('#overlay .sheet')].map(s => (s.classList.contains('sheet-kept') ? 'K' : s.classList.contains('nav-leaving') ? 'L' : s.classList.contains('nav-ghost') ? 'G' : 'A') + ':' + ((s.querySelector('.sheet-hd .t') || {}).textContent || '')).join('|'));

  // 1. son : rien n'est créé au simple contact (un geste ne commence jamais par ce calcul) ; au lâcher, si
  const au0 = await page.evaluate(() => { document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return typeof AC === 'undefined' || AC === null; });
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const au1 = await page.evaluate(() => !!(typeof AC !== 'undefined' && AC));
  log('Son : rien au contact', au0, '· créé au lâcher', au1);
  if (!au0 || !au1) fail('le contexte audio se crée au lâcher, pas au contact');

  // 2. pile vivante : l'écran d'avant reste dans la page (caché, inerte) ; le retour le révèle tel quel
  await page.evaluate(() => openAscent()); await wait(1600);
  const mainId = await page.evaluate(() => { const s = sheetActive(); s.dataset.probe = 'main'; const b = s.querySelector('.sheet-body'); b.scrollTop = 400; return b.scrollTop; });
  await tap('.asc-row[data-k="speed"]'); await wait(900);
  const pushed = await page.evaluate(() => { const k = document.querySelector('#overlay .sheet-kept'); return { sheets: [...document.querySelectorAll('#overlay .sheet')].length, kept: !!k && k.dataset.probe === 'main', inert: !!k && k.inert, hidden: !!k && k.getAttribute('aria-hidden') === 'true', active: sheetActive().querySelector('.sheet-hd .t').textContent }; });
  await shot('01_sub');
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(900);
  const back = await page.evaluate(() => { const s = sheetActive(); return { same: s.dataset.probe === 'main', st: s.querySelector('.sheet-body').scrollTop, n: document.querySelectorAll('#overlay .sheet').length, inert: s.inert }; });
  log('Pile :', JSON.stringify(pushed), '→ retour', JSON.stringify(back), 'défilement d\'avant', mainId);
  if (pushed.sheets !== 2 || !pushed.kept || !pushed.inert || !pushed.hidden || pushed.active !== 'Vitesse de montée') fail('le parent est gardé, caché et inerte sous le sous-écran');
  if (!back.same || back.n !== 1 || back.inert || Math.abs(back.st - mainId) > 2) fail('retour : le même écran, à la même position, seul');

  // 3. geste depuis le bord : le sous-écran glisse lui-même (aucune copie) ; annulé, il reste ; mené au bout, il part
  if (!wk) {
    const cdp = await ctx.newCDPSession(page);
    const swipe = async (dx, probe) => { const t = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 420 }] });
      let ghosts = 0; await t('touchStart', 5); let x = 5;
      for (let i = 0; i < 10; i++) { x += dx / 10; await t('touchMove', x); await wait(35); if (i === 5) ghosts = await page.evaluate(() => document.querySelectorAll('#overlay .nav-ghost').length); }
      await t('touchEnd'); await wait(900); return ghosts; };
    await tap('.asc-row[data-k="itin"]'); await wait(900);
    await page.evaluate(() => { sheetActive().dataset.probe = 'child'; });
    const g1 = await swipe(60);
    const cancel = await page.evaluate(() => ({ probe: sheetActive().dataset.probe, list: [...document.querySelectorAll('#overlay .sheet')].map(s => s.classList.contains('sheet-kept') ? 'K' : 'A').join('') }));
    const g2 = await swipe(320);
    const done = await page.evaluate(() => ({ probe: sheetActive().dataset.probe, n: document.querySelectorAll('#overlay .sheet').length }));
    log('Geste : copies', g1, g2, '· annulé', JSON.stringify(cancel), '· mené au bout', JSON.stringify(done));
    if (g1 || g2) fail('pendant le geste, aucune copie de l\'écran');
    if (cancel.probe !== 'child' || cancel.list !== 'AK') fail('geste annulé : le sous-écran reste, le parent gardé dessous');
    if (done.probe !== 'main' || done.n !== 1) fail('geste mené au bout : retour au même écran, sous-écran retiré');
  }
  // un sous-écran au contenu court garde la hauteur de l'écran d'avant (pas de feuille qui rétrécit en glissant)
  await page.evaluate(() => closeSheet()); await wait(500);
  await page.evaluate(() => ACT.openAbout()); await wait(600);
  await tap('.about-body [data-a="aboutPage"][data-k="health"]'); await wait(900);
  const off = await page.evaluate(() => { const k = document.querySelector('#overlay .sheet-kept'), c = sheetActive(); return !!k && !!c && c.offsetHeight >= k.offsetHeight - 1; });
  await page.evaluate(() => closeSheet()); await wait(500);
  if (!off) fail('sous-écran court : même hauteur que l\'écran d\'avant');

  // 4. roue abdominale : mains sur la poignée (à hauteur de l'axe), bras tendus, la roue roule, elle est dessinée
  const wheel = await page.evaluate(() => {
    const out = {};
    ['roue_abdo_genoux', 'roue_abdo_debout'].forEach(id => { const r = animRig(EXO_MAP[id]), L = BONE_L.uarm + BONE_L.farm;
      out[id] = { wheel: r.wheel, y: Math.max(...r.frames.map(f => Math.abs(f.W[1] - WH))).toFixed(3), arms: Math.min(...r.frames.map(f => Math.hypot(f.W[0] - f.N[0], f.W[1] - f.N[1]) / L)).toFixed(3), roll: (r.frames[0].W[0] - r.frames[r.frames.length - 1].W[0]).toFixed(1),
        anim: /ea-wheel/.test(exoAnimSVG(EXO_MAP[id])) && /ea-spokes/.test(exoAnimSVG(EXO_MAP[id])), icon: (exoPicto(EXO_MAP[id]).match(/<circle/g) || []).length }; });
    return out; });
  log('Roue :', JSON.stringify(wheel));
  Object.entries(wheel).forEach(([id, w]) => { if (!w.wheel || +w.y > .02 || +w.arms < .97 || +w.roll < 6 || !w.anim || w.icon < 3) fail('roue abdominale (' + id + ') : mains sur la roue, bras tendus, roule, dessinée'); });
  // l'animation de la fiche tourne dès l'ouverture (Chromium figeait le premier cycle d'un SVG inséré caché)
  await page.evaluate(() => ACT.showExoInfo({ id: 'roue_abdo_genoux' })); await wait(400);
  const x0 = await page.evaluate(() => document.querySelector('#overlay .exo-anim .ea-wheel').getBoundingClientRect().x);
  await wait(900);
  const x1 = await page.evaluate(() => document.querySelector('#overlay .exo-anim .ea-wheel').getBoundingClientRect().x);
  await shot('02_wheel');
  await page.evaluate(() => closeSheet()); await wait(500);
  log('Roue dans la fiche :', x0.toFixed(1), '→', x1.toFixed(1));
  if (Math.abs(x1 - x0) < 4) fail('l\'animation de la fiche tourne dès l\'ouverture');

  // 5. sécurité : export tableur sans formule exécutable ; fichier importé sans clé « __proto__ »
  const sec = await page.evaluate(() => { const csv = historyCSV(); const o = parseUntrusted('{"a":1,"__proto__":{"x":1},"b":{"constructor":{"y":2}}}');
    return { f1: csv.includes(";'=1+1;") || csv.includes(";\"'=1+1\";"), f2: csv.includes("'@SUM(A1)"), raw: /;=1\+1;|;@SUM/.test(csv), proto: Object.getPrototypeOf(o) === Object.prototype && !('x' in o) && !Object.prototype.hasOwnProperty.call(o.b, 'constructor') }; });
  log('Sécurité :', JSON.stringify(sec));
  if (!sec.f1 || !sec.f2 || sec.raw) fail('export tableur : une cellule qui commence par = ou @ est neutralisée');
  if (!sec.proto) fail('fichier importé : « __proto__ » et « constructor » écartés');

  // 6. Mes exercices : ★ et « Exclure » ne reconstruisent pas la liste ; la section Favoris suit
  await page.evaluate(() => ACT.openExoPrefs()); await wait(800);
  const ep = await page.evaluate(() => { const row = document.querySelector('.ep-body .group:not(#epFavs .group) [data-a="toggleIncluded"][data-id="dc_haltere"]').closest('.row'); row.dataset.probe = '1';
    document.querySelector('.ep-body [data-a="toggleIncluded"][data-id="dc_haltere"]').click();
    const favs = [...document.querySelectorAll('#epFavs .row .t')].map(t => t.textContent).join(',');
    document.querySelector('.ep-body .group [data-a="toggleExcluded"][data-id="pompes"]').click();
    return { same: !!document.querySelector('.ep-body [data-probe="1"]'), favs, fav: S.prefs.included.includes('dc_haltere'), excl: S.prefs.excluded.includes('pompes'),
      chip: document.querySelector('.ep-body [data-a="toggleExcluded"][data-id="pompes"]').classList.contains('excl'), cv: getComputedStyle(document.querySelector('.ep-body > .group')).contentVisibility }; });
  await page.evaluate(() => closeSheet()); await wait(400);
  log('Mes exercices :', JSON.stringify(ep));
  if (!ep.same || !/Développé couché haltères/.test(ep.favs) || !ep.fav || !ep.excl || !ep.chip) fail('Mes exercices : mise à jour sur place');
  if (!wk && ep.cv !== 'auto') fail('longues listes : groupes hors écran non dessinés (content-visibility)');

  // 7. phrases d'exemple et notes retirées
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'medals', instant: true }); }); await wait(900);
  const txt = await page.evaluate(() => document.querySelector('#v-progress').innerText);
  await page.evaluate(() => ACT.progressTab({ v: 'overview', instant: true })); await wait(700);
  const sum = await page.evaluate(() => document.querySelector('#v-progress').innerText);
  log('Textes :', /Ex\. 10 tractions|Ex\. 100 pompes/.test(txt), /Repère :/.test(sum));
  if (/Ex\. 10 tractions|Ex\. 100 pompes/.test(txt) || /Repère :/.test(sum)) fail('phrases d\'exemple et notes de repère retirées');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
