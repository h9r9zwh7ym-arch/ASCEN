// Captures de l'identité visuelle (ASCEN) : écrans clés en clair et en sombre, mobile et ordinateur.
// Usage : ENGINE=chromium|webkit node tests/brand.js dist/forge.html   (images dans tests/out/brand)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, process.env.BRAND_DIR || 'brand'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }));
  const file = 'file://' + path.resolve(process.argv[2]);
  const errors = [];
  const seed = () => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const ex = ['dc_haltere', 'rowing_uni_haltere', 'pompes', 'elevations_laterales', 'squat_gobelet', 'planche'];
    const ss = []; for (let i = 0; i < 40; i++) { const d = new Date(2026, 5, 1 + i * 2.5); if (d > new Date(2026, 8, 26)) break;
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      ss.push({ id: 'b' + i, date: iso, source: 'engine', type: 'auto', resolvedType: ['push', 'pull', 'legs', 'full'][i % 4], startedAt: iso + 'T07:10:00.000Z', completedAt: iso + 'T07:48:00.000Z', durationSec: 2280 + (i % 5) * 120,
        exos: ex.slice(i % 3, i % 3 + 4).map((e, k) => ({ exoId: e, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: e === 'planche' ? 45 : 8 + ((i + j) % 4), ...(/haltere|gobelet|elevations/.test(e) ? { weight: (e === 'elevations_laterales' ? 6 : 16) + Math.floor(i / 8) * 2 } : {}), done: true, ...(j === 2 && k === 0 && i % 6 === 0 ? { pr: true } : {}), effort: 1 + ((i + j) % 3) })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { name: 'Yannick', weeklyGoal: 3 }, equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true } }, sessions: ss })); };
  async function run(label, opts, steps) {
    const ctx = await browser.newContext({ viewport: opts.vp || { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', colorScheme: opts.dark ? 'dark' : 'light', hasTouch: wk && !opts.desktop, isMobile: wk && !opts.desktop });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(label + ' PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/GPU stall|WebGL|swiftshader|fonts\.g/i.test(m.text())) errors.push(label + ' CONSOLE: ' + m.text()); });
    await page.clock.install({ time: new Date('2026-09-28T09:30:00+02:00') }).catch(() => {});
    if (!opts.fresh) await page.addInitScript(seed);
    await page.goto(file);
    const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${label}_${n}.png` });
    if (opts.splash) { await wait(450); await shot('splash_a'); await wait(850); await shot('splash_b'); }
    await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(600);
    await steps(page, wait, shot);
    await ctx.close();
  }
  const tabs = async (page, wait, shot) => {
    await shot('today');
    await page.evaluate(() => { const v = document.querySelector('.view.active'); v.scrollTop = 520; }); await wait(300); await shot('today_scrolled');
    await page.evaluate(() => switchTab('history')); await wait(600); await shot('history');
    await page.evaluate(() => { progressTab = 'overview'; switchTab('progress'); }); await wait(700); await shot('progress');
    await page.evaluate(() => { progressTab = 'medals'; switchTab('progress'); }); await wait(900); await shot('medals');
    await page.evaluate(() => switchTab('profil')); await wait(600); await shot('profil');
    await page.evaluate(() => ACT.openAbout ? ACT.openAbout() : openAbout()); await wait(700); await shot('about'); await page.evaluate(() => closeSheet()); await wait(400);
    await page.evaluate(() => { progressTab = 'overview'; switchTab('progress'); }); await wait(500); await page.evaluate(() => openRecap()); await wait(1500); await shot('recap'); await page.evaluate(() => closeSheet()); await wait(400);
    await page.evaluate(() => switchTab('today')); await wait(500);
    await page.evaluate(() => ACT.startSession()); await wait(900); await shot('launch'); await wait(1500); await shot('launch_go');
    await wait(2500); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(900); await shot('session');
    await page.evaluate(() => { const v = document.querySelector('.view.active'); if (v) v.scrollTop = 400; }); await wait(300); await shot('session_scrolled');
  };
  await run('light', { splash: true }, tabs);
  await run('dark', { dark: true }, tabs);
  await run('desk', { desktop: true, vp: { width: 1280, height: 860 } }, async (page, wait, shot) => { await shot('today'); await page.evaluate(() => ACT.startSession()); await wait(4500); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(900); await shot('session'); });
  await run('onb', { fresh: true }, async (page, wait, shot) => { await shot('onboarding'); });
  await browser.close();
  errors.forEach(e => console.log(e));
  console.log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
