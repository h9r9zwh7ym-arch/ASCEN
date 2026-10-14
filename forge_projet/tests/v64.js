// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Retours iPhone (3), version 2.1.2 : en édition la carte du jour et sa liste forment un seul bloc, « OK » seul (et
// « Annuler » d'un toast quand il n'y a pas de modèle à mettre à jour) ; les phrases d'explication retirées ; À propos
// en listes titrées ; le retour (bouton ou glissement) retrouve l'écran d'avant à sa position ; l'échauffement en
// réglage, adapté à la séance, qu'on peut passer ; le chrono de séance un peu plus grand.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v64'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const wd = (new Date().getDay() + 6) % 7, ss = [];
    for (let k = 30; k >= 6; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k); ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'YaYa' },
      equipment: { owned: { dumbbells: true, bench: true, ab_wheel: true } }, sessions: ss,
      templates: [{ id: 'tp', n: 'Pectoraux', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }, { exoId: 'planche', sets: 1 }] },
        { id: 'tb', n: 'Bras', days: [], exos: [{ exoId: 'curl_biceps', sets: 3 }, { exoId: 'pompes', sets: 3 }] }] })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(900);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const tap = sel => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) throw new Error('absent : ' + sel); el.click(); }, sel);

  // 1. « Modifier » : la carte et la liste ne font qu'un bloc ; « OK » seul, pas de titre « Exercices » entre les deux
  await tap('.hero .hero-mod'); await wait(800);
  const blk = await page.evaluate(() => { const h = document.querySelector('.hero.editing'), g = h && h.nextElementSibling, hr = h.getBoundingClientRect(), gr = g.getBoundingClientRect(), cs = getComputedStyle(h), gs = getComputedStyle(g);
    return { group: g.classList.contains('builder'), gap: Math.round(gr.top - hr.bottom), left: Math.round(gr.left - hr.left), right: Math.round(gr.right - hr.right),
      radii: [cs.borderBottomLeftRadius, gs.borderTopLeftRadius].join(','), btns: [...h.querySelectorAll('button')].map(b => b.textContent.trim()).join('|'), title: [...document.querySelectorAll('#v-today .seg-pane .sh')].map(e => e.textContent).join('|') }; });
  log('Bloc:', JSON.stringify(blk)); await shot('01_edit_block');
  if (!blk.group || blk.gap !== 0 || blk.left || blk.right || blk.radii !== '0px,0px' || blk.btns !== 'OK' || /Exercices/.test(blk.title)) fail('carte et liste en un seul bloc, « OK » seul');
  // une modification puis OK : la feuille d'actions, « Annuler les modifications » en bas (rouge)
  await tap('.group.builder [data-a="customSets"][data-d="1"]'); await wait(300);
  await tap('.hero [data-a="heroEdit"]'); await wait(600);
  const as = await page.evaluate(() => { const c = document.querySelector('#overlay .as-cancel'); return { t: c && c.textContent, red: c && c.classList.contains('danger') }; });
  await shot('02_ask');
  await tap('#overlay .as-cancel'); await wait(700);
  const rev = await page.evaluate(() => ({ sets: S.custom.exos[0].sets, edit: customEdit }));
  log('OK → feuille:', JSON.stringify(as), '→', JSON.stringify(rev));
  if (as.t !== 'Annuler les modifications' || !as.red || rev.sets !== 3 || rev.edit) fail('« Annuler les modifications » dans la feuille de OK');
  // séance sans modèle : OK garde les changements, « Annuler » dans le toast les retire
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }] }; save(); renderView('today'); }); await wait(600);
  await tap('.hero .hero-mod'); await wait(600);
  await tap('.group.builder [data-a="customSets"][data-d="1"]'); await wait(300);
  await tap('.hero [data-a="heroEdit"]'); await wait(600);
  const kept = await page.evaluate(() => ({ sheet: !!document.querySelector('#overlay.open'), sets: S.custom.exos[0].sets, toast: document.querySelector('#toast.show') ? document.querySelector('#toast').textContent : '' }));
  await tap('#toast .t-undo'); await wait(600);
  const undone = await page.evaluate(() => S.custom.exos[0].sets);
  log('Sans modèle:', JSON.stringify(kept), '→ annulé', undone);
  if (kept.sheet || kept.sets !== 4 || !/Séance modifiée/.test(kept.toast) || undone !== 3) fail('sans modèle : OK garde, le toast annule');

  // 2. les phrases d'explication ont disparu (profil, réglages, apparence, mes exercices, motivation, données)
  const texts = {};
  for (const [k, f] of [['profil', null], ['prefs', 'openSessionPrefs'], ['appear', 'openAppearance'], ['exos', 'openExoPrefs'], ['motiv', 'openMotivation'], ['data', 'openData']]) {
    if (f) { await page.evaluate(f => ACT[f](), f); await wait(500); texts[k] = await page.evaluate(() => document.querySelector('#overlay .sheet-body').innerText); await page.evaluate(() => closeSheet()); await wait(400); }
    else { await page.click('.tabbtn[data-id="profil"]'); await wait(700); texts[k] = await page.evaluate(() => document.querySelector('#v-profil').innerText); }
  }
  const banned = [/Favori : en tête/, /Exclure : jamais/, /Automatique suit/, /Recommandé/, /chiffres se lisent mieux/, /Appliqué à la durée/, /Ajoutés aux séances/, /Laisse l'app choisir/, /Des aides pour garder/,
    /Fichier de sauvegarde/, /Numbers ou Excel/, /restent stockées localement/, /Ta série de la dernière fois/];
  const left = banned.filter(r => Object.values(texts).some(t => r.test(t))).map(String);
  log('Phrases restantes:', JSON.stringify(left));
  if (left.length) fail('phrases d\'explication retirées : ' + left.join(' '));
  if (!/Échauffement/.test(texts.prefs)) fail('réglage « Échauffement » dans Réglages des séances');

  // 3. À propos : icône, nom, version 2.1.2, listes titrées ; l'avertissement s'ouvre dans son écran
  await page.evaluate(() => ACT.openAbout()); await wait(600);
  const ab = await page.evaluate(() => ({ hd: document.querySelector('.about-hd').innerText.replace(/\s+/g, ' ').trim(), secs: [...document.querySelectorAll('.about-body .sh')].map(h => h.textContent).join('|'), v: APP_VERSION }));
  await shot('03_about');
  await tap('.about-body [data-a="aboutPage"][data-k="health"]'); await wait(800);
  const ab2 = await page.evaluate(() => ({ t: document.querySelector('.sheet-hd .t').textContent, back: !!document.querySelector('.sheet-hd [data-a="sheetBack"]') }));
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(800);
  const ab3 = await page.evaluate(() => document.querySelector('.sheet-hd .t').textContent);
  log('À propos:', JSON.stringify(ab), JSON.stringify(ab2), ab3);
  if (ab.v !== '2.1.2' || ab.hd !== 'ASCEN Version 2.1.2' || ab.secs !== 'Application|Mon ascension|Mentions' || ab2.t !== 'Avertissement santé' || !ab2.back || ab3 !== 'À propos') fail('À propos en listes titrées, version 2.1.2');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 4. retour depuis un sous-écran de l'ascension : l'écran d'avant revient à sa position (bouton, puis glissement)
  await page.evaluate(() => openAscent()); await wait(1800);
  const st0 = await page.evaluate(() => { const b = document.querySelector('#overlay .sheet-body'); b.scrollTop = 900; return b.scrollTop; }); await wait(300);
  await tap('.asc-row[data-k="speed"]'); await wait(900);
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(900);
  const st1 = await page.evaluate(() => document.querySelector('#overlay .sheet-body').scrollTop);
  let st2 = st0, mid = st0;
  if (!wk) {
    await tap('.asc-row[data-k="speed"]'); await wait(900);
    const cdp = await ctx.newCDPSession(page);
    const t = (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 400 }] });
    await t('touchStart', 5); let x = 5;
    for (let i = 0; i < 14; i++) { x += 18; await t('touchMove', x); await wait(30); if (i === 6) mid = await page.evaluate(() => (document.querySelector('#overlay .sheet:not(.nav-ghost):not(.nav-leaving):not(.sheet-kept) .sheet-body') || {}).scrollTop); }
    await t('touchEnd'); await wait(900);
    st2 = await page.evaluate(() => ({ st: document.querySelector('#overlay .sheet-body').scrollTop, main: !!document.querySelector('#overlay #ascScene'), ghosts: document.querySelectorAll('.nav-ghost').length }));
  }
  log('Retour:', st0, '→ bouton', st1, '| glissement (pendant)', mid, '→', JSON.stringify(st2));
  if (st0 < 50 || Math.abs(st1 - st0) > 2) fail('retour par le bouton : même position qu\'avant');
  if (!wk && (Math.abs(mid - st0) > 2 || Math.abs(st2.st - st0) > 2 || !st2.main || st2.ghosts)) fail('retour par glissement : même position, pendant et après le geste');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 5. échauffement : désactivé par défaut ; activé, une séance de bras n'échauffe que le haut du corps
  const plans = await page.evaluate(() => ({ off: S.settings.warmup, legs: warmPlan({ exos: [{ exoId: 'squat_gobelet', sets: [1, 2, 3] }] }).map(m => m[0]), legMoves: WARM_MOVES.legs.map(m => m[0]) }));
  await page.evaluate(() => ACT.openSessionPrefs()); await wait(500);
  await tap('#overlay [data-a="toggleWarmup"]'); await wait(300);
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.click('.tabbtn[data-id="today"]'); await wait(600);
  await page.evaluate(() => ACT.startTemplate({ id: 'tb' })); await wait(3600);
  const w = await page.evaluate(() => ({ on: S.settings.warmup, moves: S.draft.warm && S.draft.warm.moves.map(m => m[0]), card: !!document.querySelector('.sx-warm'), list: document.querySelectorAll('.sx-wl li').length,
    old: !!document.querySelector('.sx-note.warmup'), clock: parseFloat(getComputedStyle(document.querySelector('#liveClock')).fontSize) }));
  await shot('04_warm');
  log('Échauffement:', JSON.stringify(plans), JSON.stringify(w));
  if (plans.off || plans.legs.length !== 4 || plans.legs.some(m => !plans.legMoves.includes(m))) fail('échauffement : désactivé par défaut, jambes pour une séance de jambes');
  if (!w.on || !w.card || w.list !== 4 || !w.moves || w.moves.some(m => plans.legMoves.includes(m)) || w.old) fail('échauffement : écran avant le 1er exercice, sans jambes pour les bras');
  if (!(w.clock >= 19.5)) fail('chrono de séance plus grand (' + w.clock + ' px)');
  // « Lancer » : le chrono guidé passe au mouvement suivant ; « Passer » mène au premier exercice
  await tap('[data-a="warmGo"]'); await wait(400);
  await page.evaluate(() => { S.draft.warm.end = Date.now() + 200; }); await wait(900);
  const w2 = await page.evaluate(() => ({ i: S.draft.warm.i, cur: (document.querySelector('.sx-wl li.cur span') || {}).textContent, go: !!document.querySelector('[data-a="warmGo"]') }));
  await tap('[data-a="warmSkip"]'); await wait(800);
  const w3 = await page.evaluate(() => ({ warm: !!S.draft.warm, card: !!document.querySelector('.sx-warm'), exo: !!document.querySelector('.sx-card[data-exi]') }));
  log('Chrono guidé:', JSON.stringify(w2), '→ passé', JSON.stringify(w3));
  if (w2.i !== 1 || w2.cur !== w.moves[1] || w2.go || w3.warm || w3.card || !w3.exo) fail('échauffement : chrono guidé et « Passer »');
  await shot('05_first_exo');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
