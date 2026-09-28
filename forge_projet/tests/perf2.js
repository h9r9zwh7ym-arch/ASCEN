// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await page.context().newCDPSession(page);
  await page.goto('file://' + require('path').resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('forge.v1'));
    st.equipment.owned.dumbbells = true; st.equipment.owned.bench = true; st.equipment.owned.barbell = true;
    st.equipment.weights.dumbbells = [6, 8, 10, 12, 14, 16, 18, 20];
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
    st.sessions = ss; st.meta.prCount = 30;
    localStorage.setItem('forge.v1', JSON.stringify(st));
  });
  await page.reload();
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // téléphone ≈ CPU ×4 plus lent
  const r = await page.evaluate(async () => {
    const out = { sessions: S.sessions.length, jsonKB: Math.round(JSON.stringify(S).length / 1024) };
    const time = (fn, n = 8) => { const a = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); fn(); a.push(performance.now() - t0); } a.sort((x, y) => x - y); return +a[Math.floor(n / 2)].toFixed(1); };
    // rendu « à froid » : juste après une modification des données (caches invalidés)
    for (const t of ['today', 'history', 'progress', 'profil']) out['cold_' + t] = time(() => { save(); renderView(t); });
    out.cold_medals = time(() => { save(); progressTab = 'medals'; renderView('progress'); });
    progressTab = 'overview';
    // changement d'onglet complet (rendu + mise en page)
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    const tabs = ['history', 'progress', 'profil', 'today'];
    const ts = [];
    for (let k = 0; k < 2; k++) for (const t of tabs) { await frame(); const t0 = performance.now(); switchTab(t); document.body.offsetHeight; ts.push(performance.now() - t0); }
    ts.sort((a, b) => a - b); out.tab_switch_median = +ts[Math.floor(ts.length / 2)].toFixed(1); out.tab_switch_max = +ts[ts.length - 1].toFixed(1);
    // séance : valider une série
    S.custom = { exos: [{ exoId: 'dc_haltere', sets: 20 }, { exoId: 'pompes', sets: 3 }] }; ACT.startCustom();
    await new Promise(r => setTimeout(r, 3300));
    const vs = [];
    for (let i = 0; i < 6; i++) { await frame(); const t0 = performance.now(); ACT.validateSet({ exi: '0' }); document.body.offsetHeight; vs.push(performance.now() - t0); ACT.restSkip(); }
    vs.sort((a, b) => a - b); out.validate_set = +vs[3].toFixed(1);
    ACT.abandonSession && (S.draft = null, save(), renderView('today'));
    // images perdues pendant l'animation d'entrée de l'accueil
    switchTab('history'); await frame(); switchTab('today');
    let last = performance.now(), long = 0, frames = 0; const tEnd = last + 1200;
    while (performance.now() < tEnd) { await frame(); const n = performance.now(); if (n - last > 34) long++; frames++; last = n; }
    out.home_anim_frames = frames; out.home_anim_long_frames = long;
    return out;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
