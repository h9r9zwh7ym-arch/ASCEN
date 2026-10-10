// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (finitions) : Ma séance ↔ Proposée sans reconstruire l'accueil, barre d'état iOS 26 (bandeau
// fixe à la couleur de l'app, thème de l'app différent du système), carte des muscles en une teinte,
// matériel dans les pictogrammes et animations (haltère, barre, kettlebell, élastique), rythme de
// répétition, fantôme et ombre, cascade des feuilles, compteur de la progression de force
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v46'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  // téléphone en mode sombre, app réglée en clair : le cas de la barre d'état noire
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk, colorScheme: 'dark' });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v46')) return; localStorage.setItem('__seed_v46', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; let i = 0;
    for (let k = 50; k >= 2; k -= 4, i++) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [{ exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 8 + (i % 3), weight: 10 + Math.floor(i / 3) * 2, done: true })) }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { theme: 'light' }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } },
      sessions: ss, templates: [{ id: 't1', n: 'Haut', days: [1], exos: [{ exoId: 'dc_haltere', sets: 3 }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. barre d'état : bandeau fixe en haut à la couleur du fond de l'app (clair), même système sombre
  const sb = async () => page.evaluate(() => { const b = document.getElementById('sbar'), r = b.getBoundingClientRect();
    return { bg: b.style.backgroundColor, top: r.top, w: Math.round(r.width), pos: getComputedStyle(b).position, body: document.body.style.backgroundColor, meta: document.querySelector('meta[name="theme-color"]:not([media])').content, tipTop: getComputedStyle(document.getElementById('charttip')).top }; });
  const s0 = await sb();
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 300; }); await wait(300);
  const s1 = await sb();
  await page.evaluate(() => { document.querySelector('#v-today').scrollTop = 0; }); await wait(300);
  log('Status strip:', JSON.stringify(s0), '→ scrolled', s1.bg);
  if (s0.bg !== 'rgb(244, 243, 241)' || s0.top !== 0 || s0.w !== 390 || s0.pos !== 'fixed' || s0.body !== 'rgb(244, 243, 241)' || s0.meta !== '#f4f3f1' || s1.bg !== 'rgb(247, 246, 244)' || s0.tipTop !== '-400px') fail('barre d\'état à la couleur de l\'app (bandeau fixe, fond en style direct)');

  // 2. Ma séance ↔ séance de l'app (liens de la carte principale) : seul le bloc de la séance change, sans cascade de tout l'écran
  const before = await page.evaluate(() => { window.__head = document.querySelector('#v-today .home-head'); window.__seg = null; return document.querySelector('#v-today .seg-pane').className; });
  await page.click('[data-a="todayMode"][data-v="proposal"]'); await wait(80);
  const mid = await page.evaluate(() => ({ same: document.querySelector('#v-today .home-head') === window.__head && !document.querySelector('#v-today .home-seg'), enter: document.querySelector('#v-today').classList.contains('enter'),
    pane: document.querySelector('#v-today .seg-pane').className, start: !!document.querySelector('#v-today .seg-pane [data-a="startSession"]'), on: S.settings.todayTab }));
  await wait(500); await shot('01_proposal');
  await page.click('[data-a="todayMode"][data-v="custom"]'); await wait(500);
  const back = await page.evaluate(() => ({ same: document.querySelector('#v-today .home-head') === window.__head, pane: document.querySelector('#v-today .seg-pane').className }));
  log('Mode switch:', before, '→', JSON.stringify(mid), '→', JSON.stringify(back));
  if (!mid.same || mid.enter || !/proposal/.test(mid.pane) || !mid.start || mid.on !== 'proposal' || !back.same || !/custom/.test(back.pane)) fail('bascule sans reconstruire l\'accueil');

  // 3. pictogrammes : le matériel se voit (et rien pour une barre fixe)
  const pic = await page.evaluate(() => { const p = id => exoPicto(EXO_MAP[id]);
    return { db: (p('curl_biceps').match(/M-1.45 -1.25V1.25/g) || []).length / 2, bar: /r="2.1"/.test(p('dc_barre')), front: /stroke-linecap="round"/.test(p('militaire_barre')) && (p('militaire_barre').match(/class="pk"/g) || []).length,
      kb: /class="pkf"/.test(p('kb_fermier')), band: /opacity=".7"/.test(p('curl_biceps_elastique')), fixed: /r="2.1"|class="pk"/.test(p('rowing_inverse_barre')), one: (p('woodchopper_haltere').match(/M-1.45 -1.25V1.25/g) || []).length / 2,
      nan: EXOS.filter(e => /NaN|undefined/.test(exoPicto(e))).map(e => e.id) }; });
  log('Pictos:', JSON.stringify(pic));
  if (pic.db < 1 || !pic.bar || pic.front !== 1 || !pic.kb || !pic.band || pic.fixed || pic.one !== 1 || pic.nan.length) fail('matériel dans les pictogrammes');

  // 4. animations : rythme (temps d'arrêt), fantôme, ombre, matériel qui suit la main
  const an = await page.evaluate(() => { const a = id => exoAnimSVG(EXO_MAP[id]);
    const c = a('curl_biceps'), kt = (c.match(/keyTimes="([^"]+)"/) || [])[1] || '';
    return { hold: /0\.400;0\.500/.test(kt) && /0\.900;1\.000$/.test(kt), ghost: /ea-ghost/.test(c), shadow: /ea-shadow/.test(c), db: /ea-db/.test(c) && /type="rotate"/.test(c), bar: /ea-bar/.test(a('militaire_barre')), kb: /ea-handle/.test(a('swing_kb')), band: /ea-band/.test(a('tirage_elastique')),
      nan: EXOS.filter(e => /NaN|undefined/.test(exoAnimSVG(e))).map(e => e.id) }; });
  log('Animations:', JSON.stringify(an));
  if (!an.hold || !an.ghost || !an.shadow || !an.db || !an.bar || !an.kb || !an.band || an.nan.length) fail('animations : rythme, fantôme, ombre, matériel');
  await page.evaluate(() => ACT.showExoInfo({ id: 'curl_biceps' })); await wait(150);
  const casc = await page.evaluate(() => document.querySelector('#overlay .sheet').classList.contains('sh-in'));
  await wait(1400); await shot('02_fiche_anim');
  const after = await page.evaluate(() => document.querySelector('#overlay .sheet').classList.contains('sh-in'));
  log('Sheet cascade:', casc, '→', after); if (!casc || after) fail('cascade à l\'ouverture d\'une feuille');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 5. Progrès : compteur de la progression, carte des muscles en une teinte, stimulus sans losange
  await page.click('.tabbtn[data-id="progress"]'); await wait(200);
  const tv = await page.evaluate(() => { const e = document.querySelector('.tr-v'); return { count: e.dataset.count, pre: e.dataset.pre }; });
  await wait(1200);
  const tvEnd = await page.evaluate(() => document.querySelector('.tr-v').textContent);
  await page.evaluate(() => ACT.progressTab({ v: 'muscles' })); await wait(1200);
  const mm = await page.evaluate(() => ({ legend: !!document.querySelector('.mm-legend'), fills: [...new Set([...document.querySelectorAll('.mm-week .mm-z.on')].map(z => getComputedStyle(z).fill))].length, diamond: !!document.querySelector('.wv-track u') }));
  log('Progress:', JSON.stringify(tv), tvEnd, JSON.stringify(mm));
  if (!(+tv.count > 0) || tv.pre !== '+' || !/^\+\d+ %$/.test(tvEnd) || mm.legend || mm.fills !== 1 || mm.diamond) fail('compteur, carte en une teinte, stimulus simple');
  await shot('03_muscles');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
