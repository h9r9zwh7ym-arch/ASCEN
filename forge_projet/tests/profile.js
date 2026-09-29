// Profil CPU d'ASCEN sur un historique réaliste (3 ans, ~470 séances), processeur ralenti ×4
// comme un téléphone. Pour chaque scénario : durée et fonctions les plus coûteuses (temps propre).
// Usage : NO_MINIFY=1 sh build.sh && node tests/profile.js dist/forge.html   (puis sh build.sh)
const { chromium } = require('playwright'); const path = require('path');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null, TOP = +(process.env.TOP || 12);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await page.context().newCDPSession(page);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    if (localStorage.getItem('forge.v1')) return;
    const pad = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes', 'squat_barre', 'deadlift_barre', 'dev_epaules_haltere', 'fentes_halteres'];
    const ss = [];
    for (let k = 3 * 365; k >= 1; k--) {
      if (k % 7 !== 1 && k % 7 !== 3 && k % 7 !== 5) continue;
      const d = new Date(); d.setDate(d.getDate() - k); d.setHours(18, 0);
      const pick = ids.filter((_, i) => (i + k) % 3 !== 0).slice(0, 6);
      ss.push({ id: 's' + k, date: iso(d), source: 'engine', type: 'auto', resolvedType: 'full', startedAt: d.toISOString(), completedAt: d.toISOString(), durationSec: 2700,
        exos: pick.map(id => ({ exoId: id, targetSets: 3, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: 10 - j, weight: 10 + Math.floor((1100 - k) / 60), done: true, pr: j === 0 && k % 40 === 0 })) })) });
    }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, prCount: 30 }, equipment: { owned: { dumbbells: true, bench: true, barbell: true }, weights: { dumbbells: [6, 8, 10, 12, 14, 16, 18, 20] } },
      templates: [{ id: 't1', n: 'Haut', days: [0, 3], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }] }], sessions: ss }));
  });
  const file = 'file://' + path.resolve(process.argv[2]);
  await page.goto(file); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(500);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const summarize = prof => {
    const self = new Map(), byId = new Map(); prof.nodes.forEach(n => byId.set(n.id, n));
    const dt = prof.timeDeltas; const counts = new Map();
    prof.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
    counts.forEach((us, id) => { const n = byId.get(id), cf = n.callFrame; const k = `${cf.functionName || '(anon)'}${cf.url && !/forge\.html/.test(cf.url) ? ' [' + path.basename(cf.url) + ']' : ''}:${cf.lineNumber + 1}`; self.set(k, (self.get(k) || 0) + us); });
    return [...self.entries()].filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k, us]) => `${(us / 1000).toFixed(1).padStart(7)} ms  ${k}`);
  };
  const run = async (name, fn, arg) => {
    if (ONLY && !ONLY.includes(name)) return;
    await cdp.send('Profiler.start');
    const ms = await page.evaluate(fn, arg);
    const { profile } = await cdp.send('Profiler.stop');
    console.log(`\n=== ${name} : ${typeof ms === 'number' ? ms.toFixed(1) + ' ms' : JSON.stringify(ms)}`); summarize(profile).forEach(l => console.log(l));
  };
  // démarrage : rechargement complet jusqu'à la fin de init (analyse + état + premier rendu)
  if (!ONLY || ONLY.includes('startup')) {
    await cdp.send('Profiler.start');
    const t0 = Date.now(); await page.reload(); await page.waitForFunction(() => typeof S !== 'undefined' && document.querySelector('#v-today .lt, #v-today .navbar, #v-today .content'), null, { timeout: 30000 });
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
    const { profile } = await cdp.send('Profiler.stop');
    console.log(`\n=== startup : ${Date.now() - t0} ms (DOMContentLoaded ${nav.dcl} ms, load ${nav.load} ms)`); summarize(profile).forEach(l => console.log(l));
    await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 });
  }
  const med = `const time=(f,n=5)=>{const a=[];for(let i=0;i<n;i++){const t=performance.now();f();a.push(performance.now()-t);}a.sort((x,y)=>x-y);return a[n>>1];};`;
  await run('save', new Function(med + 'return time(()=>{ save(); })'));
  await run('persistNow', new Function(med + 'return time(()=>{ save(); persistNow(); })'));
  for (const t of ['today', 'history', 'progress', 'profil']) await run('cold_' + t, new Function(med + `return time(()=>{ save(); renderView('${t}'); })`));
  await run('cold_medals', new Function(med + `const r=time(()=>{ save(); progressTab='medals'; renderView('progress'); }); progressTab='overview'; return r;`));
  await run('checkMedals', new Function(med + 'return time(()=>{ save(); checkMedals(true); })'));
  await run('generate', new Function(med + 'return time(()=>{ generateEngineSession(); })'));
  await run('validate_set', async () => {
    S.custom = { exos: [{ exoId: 'dc_haltere', sets: 20 }, { exoId: 'pompes', sets: 3 }] }; ACT.startCustom();
    await new Promise(r => setTimeout(r, 3300)); const l = document.querySelector('#launch'); if (l) l.click();
    await new Promise(r => setTimeout(r, 400));
    const a = []; for (let i = 0; i < 6; i++) { const t = performance.now(); ACT.validateSet({ exi: '0' }); document.body.offsetHeight; a.push(performance.now() - t); ACT.restSkip(); }
    a.sort((x, y) => x - y); return a[3];
  });
  await run('finish', async () => { S.draft.exos.forEach(e => e.sets.forEach(s => { s.done = true; })); const t = performance.now(); finalizeSession(); document.body.offsetHeight; const r = performance.now() - t; closeSheet(); return r; });
  console.log('\nerreurs :', errors.length ? errors : 'aucune');
  await b.close();
})();
