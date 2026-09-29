// Fluidité des changements d'onglet : processeur ralenti ×4, historique de 3 ans. Pour chaque
// changement : durée du traitement du toucher et images longues (> 20 ms) pendant 600 ms.
// Usage : node tests/tab_perf.js dist/forge.html
const __pw = require('playwright'); const path = require('path');
(async () => {
  const b = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  await page.addInitScript(() => { if (localStorage.getItem('forge.v1')) return; const ss = [], ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes'];
    for (let k = 3 * 365; k >= 1; k--) { if (k % 7 !== 1 && k % 7 !== 3 && k % 7 !== 5) continue; const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), durationSec: 2700, exos: ids.map(id => ({ exoId: id, sets: [0, 1, 2].map(j => ({ reps: 10 - j, weight: 10, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: ss })); });
  await page.goto('file://' + path.resolve(process.argv[2])); await page.waitForSelector('#splash', { state: 'detached', timeout: 20000 }); await page.waitForTimeout(1500);
  // première visite de chaque onglet (non mesurée)
  for (const t of ['history', 'progress', 'profil', 'today']) { await page.click(`.tabbtn[data-id="${t}"]`); await page.waitForTimeout(900); }
  const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const res = [];
  for (const t of ['history', 'progress', 'profil', 'today', 'progress', 'today', 'today']) {
    await page.evaluate(() => { window.__f = []; let last = performance.now(); const loop = t => { window.__f.push(t - last); last = t; if (window.__f.length < 60) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
    const t0 = Date.now(); await page.click(`.tabbtn[data-id="${t}"]`); const click = Date.now() - t0;
    await page.waitForTimeout(700);
    const f = await page.evaluate(() => window.__f.slice(1)); res.push({ t, click, long: f.filter(x => x > 20).length, worst: Math.round(Math.max(...f)) });
  }
  console.log(JSON.stringify(res));
  console.log('total long frames:', res.reduce((a, r) => a + r.long, 0), '| worst frame:', Math.max(...res.map(r => r.worst)), 'ms');
  await b.close();
})();
