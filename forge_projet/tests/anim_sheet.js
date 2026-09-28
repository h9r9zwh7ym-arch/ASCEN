// Planche de contrôle des animations d'exercices : pose de départ et pose de fin de chaque
// exercice, groupés par animation de base, pour repérer d'un coup d'œil les silhouettes cassées
// ou deux exercices qui se ressemblent trop. Usage : node tests/anim_sheet.js dist/forge.html
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path');
(async () => {
  const browser = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 });
  await page.addInitScript(() => localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, sessions: [] })));
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 });
  const groups = (process.env.FAMILIES || '').split(',').filter(Boolean);
  await page.evaluate(groups => {
    const frame = (def, P, pose) => { const seg = FOCUS_SEG[def.muscles[0]];
      return `<svg viewBox="0 0 24 24" style="width:84px;height:84px;background:#fff;border-radius:10px"><path d="${pose.env || FLOOR}" fill="none" stroke="#bbb" stroke-width="1.1" stroke-linecap="round"/><path d="${animPath(P)}" fill="none" stroke="#E0663A" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>${seg ? `<path d="${focusPath(P, seg)}" stroke="#7a2f14" stroke-width="3" stroke-linecap="round"/>` : ''}<circle cx="${P.H[0]}" cy="${P.H[1]}" r="2.15" fill="#E0663A"/></svg>`; };
    const by = {}; EXOS.forEach(e => { const k = (ANIM_VARIANT[e.id] && ANIM_VARIANT[e.id].base) || pictoKey(e); (by[k] = by[k] || []).push(e); });
    document.body.innerHTML = '<div id="sheet" style="padding:16px;background:#F4F3F1;font:12px system-ui;display:flex;flex-wrap:wrap;gap:10px"></div>';
    const root = document.getElementById('sheet');
    Object.keys(by).filter(k => !groups.length || groups.includes(k)).forEach(k => by[k].forEach(e => { const pose = animPose(e);
      root.insertAdjacentHTML('beforeend', `<div style="width:176px"><div style="display:flex;gap:4px">${frame(e, pose.A, pose)}${frame(e, pose.B, pose)}</div><div style="margin-top:3px;height:30px;overflow:hidden"><b>${k}</b>${ANIM_VARIANT[e.id] ? ' ✦' : ''} · ${e.n}</div></div>`); }));
  }, groups);
  const h = await page.evaluate(() => document.getElementById('sheet').scrollHeight);
  await page.setViewportSize({ width: 1400, height: h + 20 });
  await page.screenshot({ path: path.join(OUT_ROOT, 'anim_sheet' + (process.env.NAME ? '_' + process.env.NAME : '') + '.png') });
  await browser.close(); console.log('=== NO ERRORS ===');
})();
