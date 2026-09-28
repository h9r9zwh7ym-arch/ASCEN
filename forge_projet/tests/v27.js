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
  // palier or pour la démonstration
  await page.evaluate(() => { S.medals.sessions = { t: 2, d: { 1: '2026-07-10T08:00:00Z', 2: '2026-08-01T08:00:00Z' } }; S.meta.t3dSeen = 0; save(); progressTab = 'medals'; switchTab('progress'); });
  await page.waitForFunction(() => document.querySelector('#t3dStage.live'), null, { timeout: 15000 }).catch(() => {});
  const live = await page.evaluate(() => ({ live: !!document.querySelector('#t3dStage.live'), three: !!window.FORGE_THREE, rev: window.FORGE_THREE && FORGE_THREE.REVISION, unlock: !!(T3D.ctx && T3D.ctx.unlock), tier: T3D.ctx && T3D.ctx.tier }));
  log('3D card:', JSON.stringify(live), '| loaded once:', threeReq);
  if (!live.live || !live.three) fail('carte 3D non montée');
  if (!live.unlock) fail('animation de déblocage non lancée');
  await wait(450); await shot('01_unlock_mid');
  await wait(2400); await shot('02_card_idle');
  // pixels réellement dessinés dans le canvas (pas une zone vide)
  const drawn = await page.evaluate(() => { const c = T3D.ctx.canvas; T3D.ctx.renderer.render(T3D.ctx.scene, T3D.ctx.camera); const g = T3D.ctx.renderer.getContext(); const w = g.drawingBufferWidth, h = g.drawingBufferHeight; const px = new Uint8Array(4); g.readPixels(w >> 1, h >> 1, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); return { w, h, px: Array.from(px) }; });
  log('Canvas center pixel:', JSON.stringify(drawn)); if (!drawn.px[3]) fail('rien de dessiné au centre du trophée');
  // vue détaillée
  await page.click('.t3d-card'); await wait(900); await shot('03_detail');
  const det = await page.evaluate(() => ({ open: !!document.querySelector('.t3d-full.show'), inBig: !!document.querySelector('#t3dBig canvas'), name: document.querySelector('.t3d-name').textContent }));
  log('Detail:', JSON.stringify(det)); if (!det.open || !det.inBig) fail('vue détaillée');
  // rotation au doigt
  const b = await page.evaluate(() => { const r = document.querySelector('#t3dBig').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  const d0 = await page.evaluate(() => T3D.ctx.drag);
  await page.mouse.move(b.x - 60, b.y); await page.mouse.down(); await page.mouse.move(b.x + 20, b.y, { steps: 6 }); await page.mouse.move(b.x + 90, b.y, { steps: 6 }); await page.mouse.up();
  const d1 = await page.evaluate(() => T3D.ctx.drag); log('Drag rotation:', d0.toFixed(2), '→', d1.toFixed(2)); if (!(d1 > d0 + 0.5)) fail('rotation au doigt');
  // métal or
  await page.click('[data-a="t3dMetal"][data-v="3"]'); await wait(1500); await shot('04_detail_gold');
  const gold = await page.evaluate(() => '#' + T3D.ctx.mats.body.color.getHexString()); log('Gold body color:', gold);
  await page.click('[data-a="t3dReplay"]'); await wait(500); await shot('05_replay_burst');
  const burst = await page.evaluate(() => !!T3D.ctx.burst); log('Particles during replay:', burst); if (!burst) fail('particules');
  await wait(2200);
  await page.click('.t3d-x'); await wait(700);
  const back = await page.evaluate(() => ({ closed: !document.querySelector('.t3d-full'), inCard: !!document.querySelector('#t3dStage canvas') }));
  log('Closed & canvas back:', JSON.stringify(back)); if (!back.closed || !back.inCard) fail('fermeture');
  // hors écran : la boucle s'arrête
  await page.evaluate(() => { document.querySelector('#v-progress').scrollTop = 99999; }); await wait(800);
  const idle = await page.evaluate(() => T3D.ctx.running); log('Render loop running when scrolled away:', idle);
  if (idle) fail('boucle de rendu active hors écran');
  // changement d'onglet et retour : même contexte WebGL réutilisé
  await page.evaluate(() => switchTab('today')); await wait(500); await page.evaluate(() => { progressTab = 'medals'; switchTab('progress'); }); await wait(900);
  const reuse = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas.t3d-canvas').length, live: !!document.querySelector('#t3dStage.live') }));
  log('After tab round-trip:', JSON.stringify(reuse)); if (reuse.canvases !== 1 || !reuse.live) fail('réutilisation du contexte');
  await browser.close();

  // ---- repli sans WebGL : médaille SVG
  const b2 = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-webgl', '--disable-3d-apis'] }));
  const p2 = await (await b2.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p2.on('pageerror', e => errors.push('PAGEERROR (sans WebGL): ' + e.message));
  if (wk) await p2.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/.test(t) ? null : g.call(this, t, ...a); }; });
  await p2.goto(file); await p2.waitForSelector('#splash', { state: 'detached', timeout: 6000 });
  await p2.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); progressTab = 'medals'; switchTab('progress'); }); await p2.waitForTimeout(1200);
  const fb = await p2.evaluate(() => ({ svg: !!document.querySelector('#t3dStage .medal-svg'), live: !!document.querySelector('#t3dStage.live'), three: !!window.FORGE_THREE }));
  console.log('Fallback without WebGL:', JSON.stringify(fb)); if (!fb.svg || fb.live || fb.three) fail('repli sans WebGL');
  await p2.click('.t3d-card'); await p2.waitForTimeout(700);
  if (!(await p2.$('.medal-modal'))) fail('fiche du trophée sans WebGL');
  await b2.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
