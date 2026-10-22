// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Refonte (séance en cours et repos) : écran sombre pendant la séance (réglage « Séance en sombre »), un seul
// écran par état (série, repos, exercice terminé) qui tient sans défiler de l'iPhone SE au Pro Max, séries en
// cases, +/− sans tout redessiner (le mouvement continue), fin du repos en orange un court instant, « Terminer »
// dans une feuille d'actions (enregistrer, abandonner rattrapable, continuer).
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v55'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = settings => () => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const ss = []; for (let k = 30; k >= 3; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 14, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: window.__set || {},
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } }, sessions: ss })); };
  const open = async (vp, settings) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.addInitScript(s => { window.__set = s; }, settings || {}); await page.addInitScript(seed());
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(500);
    return { ctx, page };
  };
  const start = page => page.evaluate(async () => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'squat_gobelet', sets: 3 }, { exoId: 'planche', sets: 2 }] }; ACT.startCustom();
    await new Promise(r => setTimeout(r, 4400)); const l = document.querySelector('#launch'); if (l) l.click(); await new Promise(r => setTimeout(r, 600)); });

  // 1. thème : sombre pendant la séance, retour au thème choisi en sortant ; le réglage le coupe
  let { ctx, page } = await open({ width: 390, height: 844 });
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const t0 = await theme(); await start(page); const t1 = await theme();
  await page.evaluate(() => switchTab('progress')); await wait(400); const t2 = await theme();
  await page.evaluate(() => switchTab('today')); await wait(400); const t3 = await theme();
  log('Theme home → live → Progrès → live:', t0, t1, t2, t3);
  if (t0 !== null || t1 !== 'dark' || t2 !== null || t3 !== 'dark') fail('séance en sombre, et seulement pendant la séance');
  await shot('01_set');

  // 2. écran de la série : une case par série, la charge puis les répétitions, « À suivre », un seul bouton
  const set = await page.evaluate(() => ({ sets: [...document.querySelectorAll('.sx-set')].map(e => e.className.replace('sx-set', '').trim() || 'todo'),
    rows: [...document.querySelectorAll('.sx-row .sx-val small')].map(e => e.textContent), next: (document.querySelector('.sx-next') || {}).textContent,
    btn: document.querySelector('.validate').textContent.trim(), anim: (document.querySelector('.sx-pic svg animate') || {}).getAttribute && document.querySelector('.sx-pic svg animate').getAttribute('repeatCount'),
    focus: !!document.querySelector('.sx-pic .ea-focus') && getComputedStyle(document.querySelector('.sx-pic .ea-focus')).display }));
  log('Set screen:', JSON.stringify(set));
  if (set.sets.join() !== 'cur,todo,todo' || set.rows.join() !== 'Charge,Répétitions' || !/À suivre : Squat gobelet/.test(set.next) || set.btn !== 'Valider la série') fail('écran de la série');
  if (set.anim !== '2' || (set.focus && set.focus !== 'none')) fail('mouvement joué deux fois, sans zone de muscle');

  // 3. +/− : les compteurs et la case changent, le mouvement n'est pas redessiné
  const pm = await page.evaluate(() => { const pic = document.querySelector('.sx-pic svg'), r0 = S.draft.exos[0].sets[0].reps;
    document.querySelector('[data-a="stepReps"][data-d="1"]').click(); document.querySelector('[data-a="stepWeight"][data-d="1"]').click();
    const st = S.draft.exos[0].sets[0]; return { same: pic === document.querySelector('.sx-pic svg'), reps: st.reps - r0, now: String(st.reps), w: st.weight,
      shown: rollVal(document.querySelector('[data-f="reps"] b')), cell: document.querySelector('.sx-set.cur b').textContent }; });
  log('Steppers:', JSON.stringify(pm));
  if (!pm.same || pm.reps !== 1 || pm.shown !== pm.now || pm.cell.trim() !== '') fail('+/− sans re-rendu, case en cours sans valeur (le gros chiffre la donne)');

  // « ••• » et le mouvement s'ouvrent au toucher (le mouvement ne couvre pas le bouton)
  await page.click('.sx-menu'); await wait(450); const menu = await page.evaluate(() => !!document.querySelector('#overlay .menu-list'));
  await page.evaluate(() => closeSheet()); await wait(350);
  await page.click('.sx-pic'); await wait(500); const info = await page.evaluate(() => /Fiche exercice/.test((document.querySelector('#overlay .sheet-hd') || {}).textContent || ''));
  await page.evaluate(() => closeSheet()); await wait(350);
  log('Menu / fiche:', menu, info); if (!menu || !info) fail('« ••• » et fiche au toucher');

  // 4. valider : écran de repos (série enregistrée, anneau, ±15 s, ressenti, à suivre, passer)
  await page.click('[data-a="validateSet"]'); await wait(600);
  const rest = await page.evaluate(() => ({ saved: (document.querySelector('.sx-saved') || {}).textContent, ring: !!document.querySelector('.sx-ring'), sub: document.querySelector('#ringSub').textContent,
    adj: document.querySelectorAll('.sx-adj button').length, eff: document.querySelectorAll('.ef-opts button').length, up: !!document.querySelector('.sx-upcard'), skip: (document.querySelector('.sx-skip') || {}).textContent }));
  log('Rest screen:', JSON.stringify(rest)); await shot('02_rest');
  if (!/Série 1 enregistrée/.test(rest.saved) || !rest.ring || rest.sub !== 'Repos' || rest.adj !== 2 || rest.eff !== 3 || !rest.up || rest.skip !== 'Passer le repos') fail('écran de repos');

  // 5. fin du repos : orange « C'est reparti » un court instant, puis la série suivante
  await page.evaluate(() => { restState.endAt = Date.now() + 300; }); await wait(700);
  const over = await page.evaluate(() => ({ over: !!document.querySelector('.sx-ring.over'), sub: (document.querySelector('#ringSub') || {}).textContent }));
  await shot('03_rest_over'); await wait(1300);
  const after = await page.evaluate(() => ({ rest: !!restState, ring: !!document.querySelector('.sx-ring'), btn: !!document.querySelector('.validate') }));
  log('Rest end:', JSON.stringify(over), '→', JSON.stringify(after));
  if (!over.over || over.sub !== "C'est reparti" || after.rest || after.ring || !after.btn) fail('fin du repos en orange puis série suivante');

  // 6. « Terminer » : feuille d'actions ; « Continuer » referme ; « Abandonner » se rattrape
  await page.click('.sx-end'); await wait(450);
  const sheet = await page.evaluate(() => ({ msg: (document.querySelector('.action-sheet .as-msg') || {}).textContent, acts: [...document.querySelectorAll('.action-sheet .as-btn')].map(b => b.textContent) }));
  log('Finish sheet:', JSON.stringify(sheet)); await shot('04_finish_sheet');
  if (!/1 série sur 8 faite/.test(sheet.msg || '') || sheet.acts.join('|') !== 'Enregistrer et terminer|Abandonner la séance|Reprendre la séance') fail('feuille « Terminer »');
  await page.click('.action-sheet .as-cancel'); await wait(450);
  if (!(await page.evaluate(() => !!S.draft && !document.querySelector('#overlay.open')))) fail('« Continuer » garde la séance');
  await page.click('.sx-end'); await wait(450); await page.click('[data-a="abandonNow"]'); await wait(500);
  const ab = await page.evaluate(() => ({ draft: !!(S.draft && S.draft.startedAt), toast: document.getElementById('toast').textContent, theme: document.documentElement.getAttribute('data-theme') }));
  await page.click('#toast [data-a="toastUndo"]'); await wait(600);
  const back = await page.evaluate(() => ({ draft: !!S.draft, done: S.draft && S.draft.exos[0].sets.filter(s => s.done).length, theme: document.documentElement.getAttribute('data-theme') }));
  log('Abandon:', JSON.stringify(ab), '→ undo:', JSON.stringify(back));
  if (ab.draft || !/Séance abandonnée/.test(ab.toast) || ab.theme === 'dark' || !back.draft || back.done !== 1 || back.theme !== 'dark') fail('abandon rattrapable');

  // 7. exercice terminé : cases faites (toucher = corriger), « Exercice suivant »
  await page.evaluate(() => { S.draft.exos[0].sets.forEach(s => s.done = true); liveFocusIdx = 0; refreshFocusRegion(); }); await wait(400);
  const fin = await page.evaluate(() => ({ done: document.querySelectorAll('.sx-set.done').length, t: (document.querySelector('.sx-done') || {}).textContent, next: (document.querySelector('.next-exo .ne-n') || {}).textContent }));
  await page.click('.sx-set.done >> nth=0'); await wait(450);
  const ds = await page.evaluate(() => !!document.querySelector('#dsBody')); await page.evaluate(() => closeSheet()); await wait(350);
  log('Exercise done:', JSON.stringify(fin), '| correct sheet:', ds); await shot('05_exo_done');
  if (fin.done !== 3 || !/Exercice terminé/.test(fin.t || '') || !/Squat gobelet/.test(fin.next || '') || !ds) fail('exercice terminé');

  // 8. tout est vu sans défiler, sur un iPhone SE (375 × 667) comme sur un grand écran
  await ctx.close();
  for (const vp of [{ width: 375, height: 667 }, { width: 430, height: 932 }]) {
    ({ ctx, page } = await open(vp)); await start(page);
    const fit = async () => page.evaluate(() => { const v = document.querySelector('#v-today'); return v.scrollHeight - v.clientHeight; });
    const a = await fit(); await page.evaluate(() => ACT.validateSet({ exi: String(liveFocusIdx) })); await page.waitForTimeout(500); const b = await fit();
    log(`Overflow ${vp.width}×${vp.height}: set ${a}px, rest ${b}px`);
    if (a > 2 || b > 2) fail(`séance sans défilement en ${vp.width}×${vp.height}`);
    await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}06_rest_${vp.height}.png` });
    await ctx.close();
  }

  // 9. réglage coupé : la séance garde le thème choisi ; thème sombre : le réglage est grisé
  ({ ctx, page } = await open({ width: 390, height: 844 }, { liveDark: false }));
  await start(page); const tl = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await page.evaluate(() => { S.draft = null; save(); renderView('today'); S.settings.theme = 'dark'; applyTheme(); ACT.openAppearance(); }); await page.waitForTimeout(500);
  const ap = await page.evaluate(() => ({ off: !!document.querySelector('.sheet .row.off [data-a="toggleLiveDark"][disabled]') }));
  log('Live dark off → theme:', tl, '| appearance when dark:', JSON.stringify(ap));
  if (tl === 'dark' || !ap.off) fail('réglage « Séance en sombre »');
  await ctx.close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
