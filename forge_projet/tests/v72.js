// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.4.3 : « Revoir la montée » — le grimpeur rejoue la montée depuis le départ, les camps passés affichent
// leur date, toucher la scène va à la fin ; le bouton se cache pendant la lecture et sous un message.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v72'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true } } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(700);
  // nouvelle venue : rien à revoir
  await page.evaluate(() => openAscent()); await page.waitForTimeout(900);
  if (await page.$('.asc-replay')) fail('pas de « Revoir » sans montée');
  await page.evaluate(() => { closeSheet();
    const ds = []; const t = todayISO(); for (let k = 120; k >= 1; k--) { const d = addDaysISO(t, -k); if ([1, 3, 5].includes(parseISO(d).getDay())) ds.push(d); }
    S.sessions = ds.map((d, i) => ({ id: 'x' + i, date: d, exos: [{ exoId: 'pompes', sets: Array.from({ length: 15 }, () => ({ reps: 12, done: true })) }] }));
    sessionTouched(); S.ascent = { pauses: [], intro: 1 }; save(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => openAscent());
  await page.waitForFunction(() => document.querySelector('#ascScene.ready') && ascG && !ascG.anim && !document.querySelector('.asc-toast.on'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const b0 = await page.evaluate(() => { const b = document.querySelector('.asc-replay'); return b && { t: b.textContent.trim(), op: getComputedStyle(b).opacity }; });
  if (!b0 || b0.t !== 'Revoir' || b0.op !== '1') fail('bouton « Revoir » visible sur la scène');
  const camps = [];
  await page.exposeFunction('__camp', t => camps.push(t));
  await page.evaluate(() => { const t = document.querySelector('.asc-toast'); new MutationObserver(() => { if (t.classList.contains('on')) window.__camp(t.textContent); }).observe(t, { attributes: true, childList: true }); });
  await page.click('.asc-replay'); await page.waitForTimeout(250);
  const mid = await page.evaluate(() => ({ playing: document.querySelector('#ascScene').classList.contains('playing'), op: getComputedStyle(document.querySelector('.asc-replay')).opacity, alt: parseInt(document.querySelector('.asc-alt').textContent.replace(/\D/g, '')), start: ASC_DATA[ascent().key].start }));
  log('Mid:', JSON.stringify(mid));
  if (!mid.playing || mid.alt > mid.start + 200) fail('la lecture repart du départ');
  await page.waitForTimeout(400);
  if (await page.evaluate(() => getComputedStyle(document.querySelector('.asc-replay')).opacity) !== '0') fail('bouton caché pendant la lecture');
  await page.waitForFunction(() => !ascG.playing, null, { timeout: 12000 });
  log('Toasts:', JSON.stringify(camps));
  const a = await page.evaluate(() => { const a = ascent(); return { alt: a.wait ? ASC_DATA[a.key].top : a.alt, shown: parseInt(document.querySelector('.asc-alt').textContent.replace(/\D/g, '')) }; });
  if (!camps.some(t => /\d+ \S+\.?$/.test(t.trim()) && !/Aujourd/.test(t))) fail('chaque camp passé affiche sa date');
  if (!/Aujourd'hui · |Sommet/.test(camps[camps.length - 1] || '') || Math.abs(a.shown - Math.round(a.alt)) > 1) fail('fin de lecture : altitude du jour');
  await page.screenshot({ path: path.join(OUT, '01_end.png') });
  // toucher la scène pendant la lecture : on saute à la fin, sans ouvrir de bulle
  await page.waitForFunction(() => !document.querySelector('.asc-toast.on'), null, { timeout: 8000 }); await page.waitForTimeout(300);
  await page.click('.asc-replay'); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.asc-svg').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 40, clientY: 200 })));
  await page.waitForTimeout(300);
  const skip = await page.evaluate(() => ({ playing: ascG.playing, bub: !!document.querySelector('.asc-bub'), shown: parseInt(document.querySelector('.asc-alt').textContent.replace(/\D/g, '')) }));
  if (skip.playing || skip.bub || Math.abs(skip.shown - Math.round(a.alt)) > 1) fail('toucher la scène pendant la lecture va à la fin');
  // les trophées gardent leur propre « revoir le sommet »
  if (!(await page.evaluate(() => typeof ACT.ascReplay === 'function' && typeof ACT.ascRewatch === 'function'))) fail('deux actions distinctes');
  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
