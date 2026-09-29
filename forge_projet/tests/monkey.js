// Test du singe : touchers aléatoires sur les boutons visibles (feuille ouverte en priorité), avec un
// historique réaliste. Toute erreur JavaScript ou écran en échec (ERR_LOG) est signalée.
// Usage : SEED=1 N=400 node tests/monkey.js dist/forge.html
const __pw = require('playwright'); const path = require('path');
const N = +(process.env.N || 400); let seed = +(process.env.SEED || 1);
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const SKIP = /^(confirmReset|restoreData|triggerImport|backupData|exportCSV|copyPrompt|shareRecap|saveRecap|openInstall|rwShare|t3dShare)$/;
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const b = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: wk, isMobile: wk, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message)); page.on('dialog', d => d.dismiss());
  await page.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    const ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes']; const ss = [];
    for (let k = 90; k >= 2; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k); ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), durationSec: 2400,
      exos: ids.map(id => ({ exoId: id, sets: [0, 1, 2].map(j => ({ reps: id === 'planche' ? 40 : 10 - j, weight: /haltere|gobelet|curl/.test(id) ? 12 : undefined, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { why: 'Tenir' }, equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true } }, sessions: ss,
      templates: [{ id: 't1', n: 'Haut', days: [1, 3], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }] }] })); });
  await page.goto('file://' + path.resolve(process.argv[2])); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const counts = {};
  for (let i = 0; i < N; i++) {
    const cands = await page.evaluate(() => {
      const ov = document.querySelector('#overlay.open'); const launch = document.querySelector('#launch');
      const root = launch || (ov ? ov : document);
      return [...root.querySelectorAll('[data-a]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && !e.disabled && !(e.closest('.view') && !e.closest('.view.active')); })
        .map((e, k) => { e.dataset.mk = k; return e.dataset.a; });
    });
    if (!cands.length) { await page.evaluate(() => { try { closeSheet(); } catch (e) {} }); await page.waitForTimeout(200); continue; }
    // exploration : les actions encore peu essayées sont nettement favorisées
    const w = cands.map(a => SKIP.test(a) ? 0 : 1 / Math.pow(1 + (counts[a] || 0), 2)); const tot = w.reduce((x, y) => x + y, 0);
    if (!tot) { await page.evaluate(() => { try { closeSheet(); } catch (e) {} }); continue; }
    let r = rnd() * tot, k = 0; while (r > w[k]) { r -= w[k]; k++; } if (k >= cands.length) k = cands.length - 1;
    counts[cands[k]] = (counts[cands[k]] || 0) + 1;
    await page.evaluate(k => { const e = document.querySelector(`[data-mk="${k}"]`); if (e) e.click(); }, k).catch(e => errs.push('click: ' + e.message));
    await page.waitForTimeout(40 + Math.floor(rnd() * 160));
    if (rnd() < 0.03) await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
    // toutes les 50 actions : retour à un onglet au hasard (séance en cours abandonnée une fois sur deux)
    if (i % 50 === 49) await page.evaluate(r => { try { closeSheet(); const l = document.querySelector('#launch'); if (l) l.click();
      if (S.draft && S.draft.startedAt && r < .5) { S.draft = null; save(); }
      switchTab(['today', 'history', 'progress', 'profil'][Math.floor(r * 4)]); } catch (e) {} }, rnd());
    const bad = await page.evaluate(() => (window.ERR_LOG || []).length).catch(() => 0);
    if (bad) { const log = await page.evaluate(() => ERR_LOG.splice(0).map(e => e.where + ': ' + e.msg)); log.forEach(l => errs.push(`ERR_LOG après ${cands[k]} (#${i}): ${l}`)); }
  }
  console.log('actions différentes :', Object.keys(counts).length, '| total :', Object.values(counts).reduce((a, b) => a + b, 0));
  console.log(errs.length ? errs.slice(0, 15).join('\n') : '=== NO ERRORS ===');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
