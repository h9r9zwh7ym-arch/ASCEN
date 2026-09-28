// Trophées 3D : temps de génération des vignettes, cadence du rendu vivant et vue du palier Diamant.
// Usage : node tests/t3d_perf.js dist/forge.html   (images dans tests/out/t3d_perf)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out');
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 't3d_perf' + (process.env.TAG ? '_' + process.env.TAG : '')); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { const ss = []; for (let i = 0; i < 160; i++) { const d = new Date(2025, 0, 1 + i * 3); const iso = d.toISOString().slice(0, 10);
      ss.push({ id: 'p' + i, date: iso, source: 'custom', durationSec: 2400, exos: [{ exoId: 'pompes', sets: [{ reps: 15, done: true }, { reps: 15, done: true }, { reps: 15, done: true }] }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, sessions: ss })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 });
  // grille des trophées : temps jusqu'à ce que toutes les vignettes visibles soient en 3D
  const t0 = Date.now();
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'medals' }); });
  await page.waitForFunction(() => { const v = [...document.querySelectorAll('#v-progress .medal[data-mid]')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }); return v.length && v.every(e => e.classList.contains('m3d-on')); }, null, { timeout: 60000 });
  const gridMs = Date.now() - t0;
  const snaps = await page.evaluate(() => T3D.cache.size);
  // coût processeur : construire 24 médailles (formes, paliers et symboles variés), sans rendu
  const buildMs = await page.evaluate(async () => { const s = await t3dSnapCtx(); const list = MEDALS.slice(0, 12); const t = performance.now();
    for (let r = 0; r < 2; r++) list.forEach((m, i) => { const md = t3dBuildMedal(s.T, m, 1 + (i + r) % 4); t3dDispose(md); }); return Math.round(performance.now() - t); });
  // rendu vivant : images par seconde sur 3 s (carte mise en avant)
  const fps = await page.evaluate(() => new Promise(ok => { let n = 0; const t = performance.now(); const f = () => { n++; performance.now() - t < 3000 ? requestAnimationFrame(f) : ok(n / 3); }; requestAnimationFrame(f); }));
  const renders = await page.evaluate(() => new Promise(ok => { const r = T3D.ctx && T3D.ctx.renderer; if (!r) return ok(-1); const a = r.info.render.frame; setTimeout(() => ok((r.info.render.frame - a) / 3), 3000); }));
  // vue détaillée du palier Diamant
  const d0 = Date.now();
  await page.evaluate(() => { const m = MEDALS.find(x => !x.secret); S.medals[m.id] = { t: 4, d: { 4: '2026-09-01' } }; showMedalModal(m.id); });
  await page.waitForSelector('.t3d-full.show', { timeout: 30000 }); await page.waitForTimeout(1600);
  const detailMs = Date.now() - d0;
  await page.screenshot({ path: path.join(OUT, 'diamond_detail.png') });
  const info = await page.evaluate(() => { const r = T3D.ctx.renderer.info; return { programs: r.programs.length, geometries: r.memory.geometries, textures: r.memory.textures }; });
  console.log(JSON.stringify({ gridMs, buildMs, snaps, fps: Math.round(fps), renderedPerSec: Math.round(renders), detailMs, ...info, errors: errors.length }));
  await browser.close();
})();
