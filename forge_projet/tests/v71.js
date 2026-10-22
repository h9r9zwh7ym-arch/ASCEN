// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.4.0 : regravir une montagne déjà gravie (choix daté, pente accrue, trophée Saphir), reprise de l'expédition
// mise de côté au sommet, arrêt d'une nouvelle ascension, fiche de montagne et itinéraire.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v71'); fs.mkdirSync(OUT, { recursive: true });
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
  const r = await page.evaluate(() => {
    const mk = (d, i) => ({ id: 'x' + i, date: d, exos: [{ exoId: 'pompes', sets: Array.from({ length: 15 }, () => ({ reps: 12, done: true })) }] });
    const ds = []; const t = todayISO(); for (let k = 200; k >= 1; k--) { const d = addDaysISO(t, -k); if ([1, 3, 5].includes(parseISO(d).getDay())) ds.push(d); }
    S.sessions = ds.slice(0, 40).map(mk); save();
    let a = ascent(); const before = { key: a.key, alt: a.alt };
    ACT.ascRegravir({ k: 'moleson' }); S.ascent.re[0].date = ds[39]; save(); a = ascent();   // choix fait le jour de la 40e séance
    const chosen = { key: a.key, re: a.re && a.re.k, nth: a.re && a.re.nth, reF: a.reF, mainKey: a.re && a.re.main.key, mainAlt: a.re && a.re.main.alt, stored: (S.ascent.re || []).length };
    S.sessions = S.sessions.concat(ds.slice(40).map((d, i) => mk(d, 100 + i))); save(); a = ascent();
    const sums = a.summits.map(s => ({ k: s.key, nth: s.nth, re: s.re, n: s.sessions }));
    const after = { key: a.key, re: !!a.re, sums };
    // arrêt : une nouvelle ascension en cours, puis « Arrêter » rend l'expédition intacte
    const keep = a.key, keepAlt = a.alt;
    ascChooseRe('pilatus'); save(); const mid = ascent();
    ascChooseRe(null, true); save(); const back = ascent();
    return { before, chosen, after, mid: { key: mid.key, nth: mid.re && mid.re.nth }, back: { key: back.key, alt: back.alt, re: !!back.re }, keep, keepAlt,
      gem: ascMatName('moleson', 2), plat: ASC_TIERS.diamond[3] };
  });
  log('Re-climb:', JSON.stringify(r));
  if (r.chosen.key !== 'moleson' || r.chosen.re !== 'moleson' || r.chosen.nth !== 2 || Math.abs(r.chosen.reF - .8) > .001 || r.chosen.mainKey !== r.before.key || !(r.chosen.mainAlt >= r.before.alt) || r.chosen.stored !== 1) fail('choix « regravir » : montagne, rang, pente ×1,25, expédition mise de côté');
  const m2 = r.after.sums.find(s => s.k === 'moleson' && s.nth === 2), m1 = r.after.sums.find(s => s.k === 'moleson' && s.nth === 1);
  if (!m2 || !m2.re || !m1 || !(m2.n > m1.n)) fail('2e ascension du Moléson : plus de séances que la 1re');
  if (r.after.re || !r.after.sums.some(s => s.k === r.before.key && s.nth === 1 && !s.re)) fail('au sommet : l\'expédition mise de côté reprend et se termine');
  if (r.mid.key !== 'pilatus' || r.mid.nth !== 2 || r.back.key !== r.keep || Math.abs(r.back.alt - r.keepAlt) > .01 || r.back.re) fail('arrêter : retour à l\'expédition, à la même altitude');
  if (r.gem !== 'Saphir' || r.plat !== 'Platine') fail('matières : Saphir à la 2e ascension, palier « monde » renommé Platine');
  // écrans : itinéraire (13 lignes, montagnes gravies ouvrables) et fiche de montagne
  await page.evaluate(() => ACT.openAscent()); await page.waitForSelector('#ascScene', { timeout: 8000 }); await page.waitForTimeout(700);
  await page.evaluate(() => ACT.ascSub({ k: 'itin' })); await page.waitForTimeout(700);
  const it = await page.evaluate(() => ({ rows: document.querySelectorAll('#ascSub .it-row').length, open: document.querySelectorAll('#ascSub button.it-row[data-a="ascMount"]').length, mol: (document.querySelector('#ascSub [data-k="moleson"] .it-t small') || {}).textContent }));
  await page.screenshot({ path: path.join(OUT, `${wk ? 'wk_' : ''}01_itin.png`) });
  await page.evaluate(() => ACT.ascMount({ k: 'moleson' })); await page.waitForTimeout(700);
  const mt = await page.evaluate(() => ({ mats: [...document.querySelectorAll('.asc-mount .mat')].map(m => m.className.replace('mat ', '') + ':' + m.querySelector('b').textContent), btn: (document.querySelector('.asc-mount [data-a="ascRegravir"]') || {}).textContent || '' }));
  await page.screenshot({ path: path.join(OUT, `${wk ? 'wk_' : ''}02_mount.png`) });
  log('Itinerary:', JSON.stringify(it), 'Mount:', JSON.stringify(mt));
  if (it.rows !== 13 || it.open < 2 || !/gravi 2 fois/.test(it.mol || '')) fail('itinéraire : 13 lignes, montagnes gravies ouvrables, « gravi 2 fois »');
  if (mt.mats.join('|') !== 'got:Bronze|got:Saphir|next:Rubis|lock:Diamant' || !/Regravir le Moléson/.test(mt.btn)) fail('fiche : trophées de matière et « Regravir »');
  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
