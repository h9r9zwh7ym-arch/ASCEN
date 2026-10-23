// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.9.1 : propositions selon le profil (séries par muscle selon objectif, niveau, âge, fréquence et durée ;
// première charge selon ta force réelle ; exercices sautés ou remplacés évités ; séries jamais très lourdes
// pour un débutant), barre d'état jamais assombrie, orbe liquide au cœur de l'animation.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v76'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } }, settings: { todayTab: 'proposal' } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);

  // 1. séries selon le profil, durée tenue
  const p = await page.evaluate(() => {
    const run = (level, senior, days, len) => { Object.assign(S.goals, { level, senior, daysPerWeek: days, sessionLength: len });
      const s = generateEngineSession('full'); return { sets: s.exos.map(e => e.targetSets), min: estimateMinutes(s), reps: s.exos.map(e => e.targetReps[0]) }; };
    const out = { deb: run('debutant', false, 3, 'moyen'), mid: run('intermediaire', false, 3, 'moyen'), adv: run('avance', false, 2, 'long'), sen: run('intermediaire', true, 4, 'court') };
    S.goals.overall = 'force'; out.debForce = run('debutant', false, 3, 'moyen'); S.goals.overall = 'hypertrophie';
    Object.assign(S.goals, { level: 'intermediaire', senior: false, daysPerWeek: 3, sessionLength: 'moyen' });
    return out;
  });
  log('Profile sets:', JSON.stringify(p));
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  if (!(Math.max(...p.deb.sets) <= 3 && avg(p.adv.sets) > avg(p.mid.sets) && Math.max(...p.sen.sets) <= 4)) fail('séries selon le niveau, l\'âge et la fréquence');
  if (!(p.sen.min <= 30 && p.adv.min >= 50 && p.mid.min >= 30 && p.mid.min <= 50)) fail('durée de séance tenue');
  if (Math.min(...p.debForce.reps) < 6) fail('débutant : jamais moins de 6 répétitions en charge');

  // 2. première charge selon ta force réelle ; exercice remplacé deux fois : moins proposé
  const f = await page.evaluate(() => {
    const def = EXO_MAP.dc_incline_haltere || EXOS.find(e => kgType(e) === 'dumbbells' && startKind(e) === 'press' && e.id !== 'dc_haltere');
    const before = startWeight(def, 'dumbbells'), t = todayISO();
    S.sessions = [{ id: 'a', date: addDaysISO(t, -2), exos: [{ exoId: 'dc_haltere', sets: [{ reps: 8, weight: 24, done: true }] }, { exoId: 'squat_gobelet', sets: [{ reps: 10, weight: 24, done: true }] }] }]; sessionTouched(); save();
    const after = startWeight(def, 'dumbbells'), fac = strengthFactor('press');
    const s0 = scoreExo(EXO_MAP.dc_haltere); S.prefs.swapped = { dc_haltere: 2 }; const s1 = scoreExo(EXO_MAP.dc_haltere);
    // sauté deux fois (présent sans série faite)
    S.sessions.push(...[1, 2].map(k => ({ id: 'k' + k, date: addDaysISO(t, -k - 3), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }, { exoId: 'curl_biceps', sets: [{ reps: 10, weight: 8, done: false }] }] })));
    sessionTouched(); const aff = exoAffinity('curl_biceps');
    S.sessions = []; S.prefs.swapped = {}; sessionTouched(); save();
    return { before, after, fac, s0, s1, aff };
  });
  log('Strength/affinity:', JSON.stringify(f));
  if (!(f.fac > 1.5 && f.after > f.before)) fail('première charge selon la force réelle');
  if (!(f.s1 < f.s0 - 1)) fail('exercice remplacé deux fois : moins proposé');
  if (!(f.aff <= -2)) fail('exercice souvent sauté : moins proposé');

  // 3. remplacer un exercice d'une proposition est retenu
  const sw = await page.evaluate(() => { S.draft = generateEngineSession('full'); save(); switchTab('today'); renderView('today'); const id = S.draft.exos[0].exoId;
    ACT.swapExoOpen({ idx: 0 }); const alt = picker && [...document.querySelectorAll('#pickerList [data-a="pickerTap"]')].map(b => b.dataset.id).find(x => x !== id);
    if (alt) ACT.pickerTap({ id: alt }); return { id, n: (S.prefs.swapped || {})[id] || 0, alt: !!alt }; });
  log('Swap:', JSON.stringify(sw));
  if (sw.alt && sw.n !== 1) fail('remplacement retenu');

  // 4. barre d'état : couleur de la page, jamais assombrie par une feuille (elle restait grise)
  const sb = await page.evaluate(async () => { ACT.chooseSession(); await new Promise(r => setTimeout(r, 400)); const m1 = document.querySelector('meta[name="theme-color"]:not([media])').content;
    closeSheet(); await new Promise(r => setTimeout(r, 400)); const m2 = document.querySelector('meta[name="theme-color"]:not([media])').content;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase(); return { m1: m1.toLowerCase(), m2: m2.toLowerCase(), bg, legacy: legacyStatusBar() }; });
  log('Status bar:', JSON.stringify(sb));
  if (sb.m1 !== sb.bg || sb.m2 !== sb.bg || sb.legacy) fail('barre d\'état de la couleur de la page');

  // 5. l'orbe : trois nappes animées, l'heure reste au-dessus de l'animation
  await page.evaluate(() => ACT.tailorOpen()); await page.waitForTimeout(600);
  await page.click('#overlay [data-a="tailorGo"]'); await page.waitForTimeout(1400);
  const orb = await page.evaluate(() => { const c = document.querySelector('.tl-core'), is = c ? [...c.querySelectorAll('i')] : [];
    return { n: is.length, anim: is.map(i => getComputedStyle(i).animationName), on: document.body.classList.contains('tl-on'), sbz: +getComputedStyle(document.querySelector('#sbar')).zIndex }; });
  await page.screenshot({ path: path.join(OUT, '01_orb.png') });
  await page.waitForFunction(() => !document.querySelector('.tl-host'), null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ on: document.body.classList.contains('tl-on'), host: !!document.querySelector('.tl-host') }));
  log('Orb:', JSON.stringify(orb), JSON.stringify(after));
  if (orb.n !== 3 || orb.anim.join() !== 'tlRipple,tlBlob,tlRipple' || !orb.on || !(orb.sbz > 2100)) fail('cœur (teinte, ondes), heure lisible au-dessus');
  if (after.on || after.host) fail('fin de l\'animation : tout est rangé');

  // 5b. 2.9.6 : prédictions — muscles de la séance prévue demain laissés au repos, durée à ton rythme réel,
  //     un jour sans ne fait pas baisser la charge ; voile de la barre d'état limité à sa hauteur
  const pr = await page.evaluate(() => { const t = todayISO(), out = {}, wd = weekdayIdx(addDaysISO(t, 1));
    const pecs = () => { let n = 0; for (let k = 0; k < 6; k++) n += generateEngineSession('full').exos.filter(e => EXO_MAP[e.exoId].muscles[0] === 'pect').length; return n; };
    S.templates = [{ id: 'tp', n: 'Pectoraux', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }] }]; save(); out.pect = pecs(); S.templates = []; save(); out.pect0 = pecs();
    S.sessions = [1, 2, 3, 4].map(k => { const st = new Date(Date.now() - k * 864e5 * 2), exos = [{ exoId: 'dc_haltere', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 20, done: true })) }];
      const est = exos.reduce((a, ex) => a + ex.sets.length * (40 + EXO_MAP[ex.exoId].restSec), 0); return { id: 's' + k, date: addDaysISO(t, -k * 2), startedAt: st.toISOString(), completedAt: new Date(st.getTime() + est * 1400).toISOString(), exos }; });
    sessionTouched(); save(); out.pace = paceFactor();
    S.sessions = [{ id: 'a', date: addDaysISO(t, -6), exos: [{ exoId: 'dc_haltere', targetReps: [8, 12], sets: [1, 2, 3].map(() => ({ reps: 10, weight: 20, done: true, effort: 2 })) }] },
      { id: 'b', date: addDaysISO(t, -3), exos: [{ exoId: 'dc_haltere', targetReps: [8, 12], sets: [1, 2, 3].map(() => ({ reps: 6, weight: 20, done: true, effort: 3 })) }] }]; sessionTouched(); save();
    out.off = suggestForExo(EXO_MAP.dc_haltere, 3).weight; S.sessions = []; sessionTouched(); save();
    const sb = document.querySelector('#sbar'); out.sbH = sb ? getComputedStyle(sb).height : ''; return out; });
  log('Predictions:', JSON.stringify(pr));
  if (!(pr.pect0 > 0 && pr.pect === 0)) fail('muscles de la séance de demain laissés au repos');
  if (Math.abs(pr.pace - 1.4) > .01) fail('rythme réel appris');
  if (pr.off !== 20) fail('jour sans : charge gardée');

  // 6. iOS 26 installée : la page s'arrête 34 px avant le bas de l'écran → la barre d'onglets et les calques
  //    plein écran descendent jusqu'en bas (écart mesuré), la marge basse le compte
  const c2 = await browser.newContext({ viewport: { width: 390, height: 810 }, screen: { width: 390, height: 844 } });
  await c2.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { get: () => true });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true } })); });
  const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p2.goto(APP); await p2.waitForTimeout(800);
  const vg = await p2.evaluate(() => { legacyStatusBar = () => false; syncVGap();
    const tb = document.querySelector('.tabbar').getBoundingClientRect(), app = document.querySelector('#app').getBoundingClientRect();
    return { cls: document.documentElement.classList.contains('vgap'), gap: getComputedStyle(document.documentElement).getPropertyValue('--vgap').trim(), tb: Math.round(tb.bottom), app: Math.round(app.bottom), pad: parseFloat(getComputedStyle(document.querySelector('.tabbar')).paddingBottom) }; });
  log('Viewport gap:', JSON.stringify(vg));
  if (!vg.cls || vg.gap !== '34px' || vg.tb !== 844 || vg.app !== 844 || vg.pad < 34) fail('bandeau vide sous la barre d\'onglets (iOS 26)');
  const vg0 = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('vgap') }));
  if (vg0.cls) fail('pas de compensation hors app installée');
  await c2.close();

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
