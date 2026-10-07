// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v2.6 : trophée 3D (Three.js chargé à la demande), déblocage, vue détaillée, repli sans WebGL
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v27'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/GPU stall|WebGL|swiftshader/i.test(m.text())) errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const ss = []; for (let i = 0; i < 30; i++) { const d = new Date(2026, 6, 1 + i * 2); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      ss.push({ id: 's' + i, date: iso, source: 'custom', durationSec: 2400, exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }, { reps: 12, done: true }] }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, sessions: ss })); });
  const file = 'file://' + path.resolve(process.argv[2]);
  // la page réelle est à côté de three-forge.js (dist/)
  const t0 = Date.now(); let threeReq = 0;
  page.on('request', r => { if (/three-forge\.js/.test(r.url())) threeReq++; });
  await page.goto(file); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(400);
  log('Three.js loaded at startup:', threeReq > 0); if (threeReq) fail('Three.js chargé au démarrage');
  // paliers variés, dernier gagné : Assiduité argent
  await page.evaluate(() => { S.medals = { streak: { t: 1, d: { 1: '2026-07-05T08:00:00Z' } }, prs: { t: 3, d: { 1: '2026-07-01T08:00:00Z', 2: '2026-07-10T08:00:00Z', 3: '2026-07-20T08:00:00Z' } },
      sessions: { t: 2, d: { 1: '2026-07-10T08:00:00Z', 2: '2026-08-01T08:00:00Z' } }, s_week7: { t: 1, d: { 1: '2026-07-15T08:00:00Z' } } }; S.meta.t3dSeen = ''; save(); progressTab = 'medals'; switchTab('progress'); });
  await page.waitForFunction(() => document.querySelector('#t3dStage.live'), null, { timeout: 20000 }).catch(() => {});
  const live = await page.evaluate(() => ({ live: !!document.querySelector('#t3dStage.live'), three: !!window.FORGE_THREE, rev: window.FORGE_THREE && FORGE_THREE.REVISION, unlock: !!(T3D.ctx && T3D.ctx.unlock), id: T3D.ctx && T3D.ctx.id, tier: T3D.ctx && T3D.ctx.tier }));
  log('Featured card:', JSON.stringify(live), '| loaded once:', threeReq);
  if (!live.live || !live.three) fail('carte 3D non montée');
  if (live.id !== 'sessions' || live.tier !== 2) fail('trophée mis en avant = dernier palier gagné');
  if (!live.unlock) fail('animation de déblocage non lancée');
  await wait(450); await shot('01_unlock_mid');
  await wait(2400); await shot('02_card_idle');
  // opacité : vue de dos, le centre est plein (pas de transparence)
  const backPx = await page.evaluate(() => { const c = T3D.ctx; c.running = false; c.medal.rotation.set(0, Math.PI, 0); c.renderer.render(c.scene, c.camera); const g = c.renderer.getContext(); const px = new Uint8Array(4); g.readPixels(g.drawingBufferWidth >> 1, g.drawingBufferHeight >> 1, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); t3dStart(); return Array.from(px); });
  log('Back center pixel:', JSON.stringify(backPx)); if (backPx[3] < 250) fail('dos transparent');
  // vignettes 3D de la grille (dessinées quand elles approchent de l'écran ; la grille est sous les objectifs et les défis)
  await page.evaluate(() => { const g = document.querySelector('.medal-grid'); if (g) g.scrollIntoView({ block: 'start' }); });
  await page.waitForFunction(() => document.querySelectorAll('.medal.m3d-on img.medal-3d').length >= 5, null, { timeout: 60000 }).catch(() => {});
  const thumbs = await page.evaluate(() => document.querySelectorAll('.medal.m3d-on img.medal-3d').length); log('3D thumbnails shown:', thumbs);
  if (thumbs < 5) fail('vignettes 3D');
  await page.evaluate(() => document.querySelectorAll('.medal-grid')[0].scrollIntoView({ block: 'start' })); await wait(2500); await shot('03_grid_3d');
  // fiche détaillée depuis la grille (Records, or)
  await page.click('.medal-card[data-id="prs"]'); await page.waitForSelector('.t3d-full.show', { timeout: 15000 }); await wait(700); await shot('04_detail_prs');
  const det = await page.evaluate(() => ({ name: document.querySelector('.t3d-name').textContent, id: T3D.ctx.id, tier: T3D.ctx.tier, rows: document.querySelectorAll('.t3d-row').length, inBig: !!document.querySelector('#t3dBig canvas') }));
  log('Detail:', JSON.stringify(det)); if (det.id !== 'prs' || det.tier !== 3 || det.rows !== 4 || !det.inBig) fail('fiche 3D du trophée');
  // rotation au doigt
  const b = await page.evaluate(() => { const r = document.querySelector('#t3dBig').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const d0 = await page.evaluate(() => T3D.ctx.drag);
  await page.mouse.move(b.x - 60, b.y); await page.mouse.down(); await page.mouse.move(b.x + 20, b.y, { steps: 6 }); await page.mouse.move(b.x + 90, b.y, { steps: 6 }); await page.mouse.up();
  const d1 = await page.evaluate(() => T3D.ctx.drag); log('Drag rotation:', d0.toFixed(2), '→', d1.toFixed(2)); if (!(d1 > d0 + 0.5)) fail('rotation au doigt');
  // aperçu diamant : couronne facettée et scintillements
  await page.click('[data-a="t3dMetal"][data-v="4"]'); await wait(1400); await shot('05_detail_diamond');
  const dia = await page.evaluate(() => ({ tier: T3D.ctx.tier, sparks: T3D.ctx.sparks.length, flat: T3D.ctx.medal.userData.mats.frame.flatShading || T3D.ctx.medal.userData.mats.body.flatShading }));
  log('Diamond preview:', JSON.stringify(dia)); if (dia.tier !== 4 || dia.sparks < 4 || !dia.flat) fail('palier diamant');
  await page.click('[data-a="t3dReplay"]'); await wait(500); await shot('06_replay_burst');
  const burst = await page.evaluate(() => !!T3D.ctx.burst); log('Particles during replay:', burst); if (!burst) fail('particules');
  await wait(2200);
  await page.click('.t3d-x'); await wait(700);
  const back = await page.evaluate(() => ({ closed: !document.querySelector('.t3d-full'), inCard: !!document.querySelector('#t3dStage canvas'), id: T3D.ctx.id }));
  log('Closed & canvas back on featured:', JSON.stringify(back)); if (!back.closed || !back.inCard || back.id !== 'sessions') fail('fermeture');
  // secret non découvert : indice
  await page.evaluate(() => document.querySelector('.secret-card:not(.found)').scrollIntoView({ block: 'center' })); await wait(600);
  await page.click('.secret-card:not(.found)'); await page.waitForSelector('.t3d-full.show', { timeout: 15000 }); await wait(700); await shot('07_secret_locked');
  const hint = await page.$eval('.t3d-desc', e => e.textContent); log('Secret hint:', hint); if (!/^Indice/.test(hint)) fail('indice du secret');
  await page.keyboard.press('Escape'); await wait(700);
  // hors écran : la boucle s'arrête
  await page.evaluate(() => { document.querySelector('#v-progress').scrollTop = 99999; }); await wait(800);
  const idle = await page.evaluate(() => T3D.ctx.running); log('Render loop running when scrolled away:', idle);
  if (idle) fail('boucle de rendu active hors écran');
  // changement d'onglet et retour : un seul canvas vivant
  await page.evaluate(() => switchTab('today')); await wait(500); await page.evaluate(() => { progressTab = 'medals'; switchTab('progress'); }); await wait(900);
  const reuse = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas.t3d-canvas').length, live: !!document.querySelector('#t3dStage.live') }));
  log('After tab round-trip:', JSON.stringify(reuse)); if (reuse.canvases !== 1 || !reuse.live) fail('réutilisation du contexte');
  // rien de stocké : vignettes en mémoire seulement
  const stored = await page.evaluate(() => { persistNow(); return { ls: localStorage.length, big: Object.keys(localStorage).filter(k => (localStorage.getItem(k) || '').length > 300000) }; });
  log('localStorage keys:', stored.ls, '| oversized:', stored.big.length); if (stored.big.length) fail('images stockées');
  await browser.close();

  // ---- repli sans WebGL : médaille SVG
  const b2 = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-webgl', '--disable-3d-apis'] }));
  const p2 = await (await b2.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p2.on('pageerror', e => errors.push('PAGEERROR (sans WebGL): ' + e.message));
  if (wk) await p2.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
  await p2.goto(file); await p2.waitForSelector('#splash', { state: 'detached', timeout: 6000 });
  await p2.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); progressTab = 'medals'; switchTab('progress'); }); await p2.waitForTimeout(1200);
  const fb = await p2.evaluate(() => ({ svg: !!document.querySelector('#t3dStage .medal-svg'), live: !!document.querySelector('#t3dStage.live'), three: !!window.FORGE_THREE, imgs: document.querySelectorAll('img.medal-3d').length }));
  console.log('Fallback without WebGL:', JSON.stringify(fb)); if (!fb.svg || fb.live || fb.three || fb.imgs) fail('repli sans WebGL');
  await p2.click('.t3d-card'); await p2.waitForTimeout(900);
  if (!(await p2.$('.medal-modal'))) fail('fiche du trophée sans WebGL');
  await b2.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
