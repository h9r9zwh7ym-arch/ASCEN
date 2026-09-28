// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const pw = require('playwright');
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/');
  await p.waitForSelector('#splash', { state: 'detached', timeout: 6000 });
  const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  const man = await p.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); if (!l) return 'none'; const m = await (await fetch(l.href)).json(); return m.name + ' | icons ' + m.icons.length; });
  console.log('SW active:', reg, '| manifest:', man);
  await p.reload(); await p.waitForTimeout(800);
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('#splash', { state: 'detached', timeout: 8000 });
  console.log('Offline reload renders app:', await p.evaluate(() => !!document.querySelector('.tabbar .tabbtn') && typeof S === 'object'), '| title:', await p.title());
  const icon = await p.evaluate(async () => { try { const r = await fetch('icon-180.png'); return r.ok; } catch (e) { return false; } });
  console.log('Icon from cache offline:', icon);
  await b.close();
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : '=== NO ERRORS ===');
})();
