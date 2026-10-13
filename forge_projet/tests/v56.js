// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Refonte (accueil, fin de séance) : carte du jour blanche avec la liste (3, puis « Voir les N ») et « Commencer »,
// « Choisir une autre séance » en feuille d'actions, « Modifier » qui ouvre la liste éditable ; carte « Cette semaine »
// (vraie scène de la montagne gardée en image, 7 jours, compte et série) ; fin de séance en page pleine : Tonnage
// et sa courbe, « Nouveau record » seulement s'il y en a un, ascension, « Terminé ».
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v56'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1'); // sessionStorage peut manquer au rechargement (Chromium chargé)
    const wd = (new Date().getDay() + 6) % 7, ss = [];
    for (let k = 40; k >= 3; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, tplId: 'tp1', name: 'Haut du corps',
        exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12 + Math.floor((40 - k) / 12) * 2, done: true })) }, { exoId: 'pompes', sets: [0, 1].map(() => ({ reps: 12, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } }, sessions: ss,
      templates: [{ id: 'tp1', n: 'Haut du corps', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'rowing_uni_haltere', sets: 3 }, { exoId: 'curl_biceps', sets: 3 }, { exoId: 'pompes', sets: 2 }, { exoId: 'elevations_laterales', sets: 3 }] },
        { id: 'tp2', n: 'Jambes', days: [], exos: [{ exoId: 'squat_gobelet', sets: 3 }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. carte du jour : étiquette, titre, durée, 3 exercices puis « Voir les 5 exercices », « Commencer », une alternative
  const hero = await page.evaluate(() => { const h = document.querySelector('#v-today .hero');
    return { k: h.querySelector('.hero-eyebrow').textContent, t: h.querySelector('.hero-title').textContent, rows: [...h.querySelectorAll('.hl-row')].filter(r => r.offsetHeight).length,
      all: h.querySelectorAll('.hl-row').length, more: (h.querySelector('.hl-toggle') || {}).textContent, go: h.querySelector('.hero-go').textContent.trim(), alt: [...h.querySelectorAll('.hero-alt')].map(b => b.textContent.trim()),
      mod: (h.querySelector('.hero-mod') || {}).textContent, pills: !!document.querySelector('#v-today .stat-pills') }; });
  log('Hero:', JSON.stringify(hero)); await shot('01_home');
  if (hero.k !== "Prévu aujourd'hui" || hero.t !== 'Haut du corps' || hero.rows !== 3 || hero.all !== 5 || hero.more !== 'Voir les 5 exercices' || hero.go !== 'Commencer' || hero.alt.join() !== 'Choisir une autre séance' || hero.mod !== 'Modifier' || hero.pills) fail('carte du jour');
  await page.click('.hl-toggle'); await wait(500);
  const all = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.hero .hl-row')].filter(r => r.offsetHeight).length, t: document.querySelector('.hl-toggle').textContent }));
  if (all.rows !== 5 || all.t !== 'Voir moins') fail('« Voir les 5 exercices » sur place');
  await page.click('.hero .hl-row >> nth=0'); await wait(500);
  if (!/Fiche exercice/.test(await page.evaluate(() => (document.querySelector('#overlay .sheet-hd') || {}).textContent || ''))) fail('un exercice de la carte ouvre sa fiche');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 2. « Modifier » : la liste éditable (séries, retrait, ajout, enregistrement) ; « OK » la referme
  await page.click('.hero .hero-mod'); await wait(600);
  const ed = await page.evaluate(() => ({ list: !!document.querySelector('.hero .hero-list'), builder: document.querySelectorAll('.group.builder .row').length, sets: document.querySelectorAll('[data-a="customSets"]').length, save: !!document.querySelector('.save-row'), go: !!document.querySelector('.hero .hero-go'), ok: document.querySelector('.hero .hero-mod').textContent }));
  await shot('02_edit');
  await page.click('.hero .hero-mod'); await wait(600);
  const ed2 = await page.evaluate(() => ({ list: !!document.querySelector('.hero .hero-list'), builder: document.querySelectorAll('.group.builder .row').length, go: !!document.querySelector('.hero .hero-go') }));
  log('Edit:', JSON.stringify(ed), '→', JSON.stringify(ed2));
  // en édition : ni « Commencer » ni ligne d'enregistrement (la séance vient de Mes séances : le choix se fait à « OK », sans changement rien n'est demandé)
  if (ed.list || ed.builder !== 5 || ed.sets !== 10 || ed.save || ed.go || ed.ok !== 'OK' || !ed2.list || ed2.builder || !ed2.go) fail('« Modifier » puis « OK »');

  // 3. « Choisir une autre séance » : tes séances, l'app, l'express, composer ; charger une séance enregistrée
  await page.click('.hero [data-a="chooseSession"]'); await wait(450);
  const acts = await page.evaluate(() => [...document.querySelectorAll('.action-sheet .as-btn')].map(b => b.textContent.trim()));
  log('Choose:', JSON.stringify(acts)); await shot('03_choose');
  if (acts.join('|') !== "Jambes|Laisse l'app choisir|Séance express · 10 min|Composer moi-même|Annuler") fail('« Choisir une autre séance »');
  await page.click('.action-sheet .as-btn >> text=Jambes'); await wait(800);
  const loaded = await page.evaluate(() => ({ t: document.querySelector('.hero .hero-title').textContent, n: document.querySelectorAll('.hero .hl-row').length, tab: S.settings.todayTab }));
  log('Loaded:', JSON.stringify(loaded)); if (loaded.t !== 'Jambes' || loaded.n !== 1 || loaded.tab !== 'custom') fail('séance enregistrée chargée dans la carte du jour');

  // 4. « Cette semaine » : la montagne (image calculée et gardée), le prochain camp, 7 jours, le compte, la série
  await page.waitForFunction(() => !!document.querySelector('#v-today .wk-scene img'), null, { timeout: 15000 }).catch(() => {});
  const wkc = await page.evaluate(() => { const c = document.querySelector('.wk-card'), img = c.querySelector('.wk-scene img'), st = JSON.parse(localStorage.getItem('forge.v1.strip') || 'null');
    return { img: !!img, url: img ? img.src.slice(0, 15) : '', kept: !!(st && /^data:image\/jpeg/.test(st.url)), size: st ? Math.round(st.url.length / 1024) : 0, name: c.querySelector('.wk-n b').textContent,
      days: c.querySelectorAll('.wk-day').length, plan: c.querySelectorAll('.wk-day.plan').length, today: c.querySelectorAll('.wk-day.today').length, foot: c.querySelector('.wk-foot').textContent.replace(/\s+/g, ' ').trim(), act: c.querySelector('.wk-asc').dataset.a }; });
  log('Week card:', JSON.stringify(wkc));
  await page.evaluate(() => { const c = document.querySelector('.wk-card'); document.querySelector('#v-today').scrollTop = c.offsetTop - 120; }); await wait(300); await shot('04_week');
  if (!wkc.img || !wkc.kept || wkc.size > 120 || wkc.days !== 7 || wkc.today !== 1 || !wkc.plan || !/sur 3 séances/.test(wkc.foot) || wkc.act !== 'openAscent') fail('carte « Cette semaine »');
  await page.click('.wk-day >> nth=6'); await wait(500);
  if (!/^Le /.test(await page.evaluate(() => (document.querySelector('#overlay .sheet-hd .t') || {}).textContent || ''))) fail('un jour de la semaine : y placer une séance');
  await page.evaluate(() => closeSheet()); await wait(400);
  // au lancement suivant, la montagne s'affiche tout de suite (image gardée)
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await wait(300);
  if (!(await page.evaluate(() => !!document.querySelector('#v-today .wk-scene img:not(.wk-in)')))) fail('montagne gardée en image au lancement suivant');

  // 5. fin de séance : page pleine, Tonnage et courbe, record seulement s'il y en a un, ascension, « Terminé »
  const fin = async (pr) => page.evaluate(pr => { const tpl = S.templates[0];
    S.draft = { id: 'live' + Date.now(), date: todayISO(), startedAt: new Date(Date.now() - 2280e3).toISOString(), source: 'custom', name: tpl.n, tplId: tpl.id,
      exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(i => ({ reps: 10 + (pr && i === 0 ? 2 : 0), weight: 18, done: true, pr: !!(pr && i === 0) })) }, { exoId: 'pompes', sets: [0, 1].map(() => ({ reps: 12, done: true })) }] };
    finalizeSession(); return S.sessions[S.sessions.length - 1].id; }, pr);
  await fin(true); await wait(2200);
  const cel = await page.evaluate(() => { const c = document.querySelector('.center-modal.cel-page');
    return { page: !!c, full: c ? Math.round(c.getBoundingClientRect().height) : 0, title: (document.querySelector('.cel-title') || {}).textContent, sub: (document.querySelector('.cel-sub') || {}).textContent,
      ton: (document.querySelector('.cel-ton .ct-hd h2') || {}).textContent, scope: (document.querySelector('.cel-ton .ct-hd span') || {}).textContent, chip: (document.querySelector('.ct-chip') || {}).textContent,
      line: !!document.querySelector('.ct-svg .ct-line.draw'), rec: (document.querySelector('.cel-rec .cr-txt b') || {}).textContent, recS: (document.querySelector('.cel-rec .cr-txt > span') || {}).textContent,
      asc: !!document.querySelector('.cel .cel-asc .ca-t'), list: document.querySelectorAll('.cel .cel-prog').length, hidden: !!document.querySelector('.cel .cel-rest[hidden]'), btn: (document.querySelector('.cel-ft .btn') || {}).textContent }; });
  log('End:', JSON.stringify(cel)); await shot('05_end');
  if (!cel.page || cel.full < 800 || cel.title !== 'Bien joué, Yannick' || !/^Haut du corps · \d+ min · 5 séries$/.test(cel.sub || '') || cel.ton !== 'Tonnage' || !/dernières « Haut du corps »/.test(cel.scope || '') || !/%/.test(cel.chip || '') || !cel.line) fail('fin de séance : en-tête et Tonnage');
  if (cel.rec !== 'Développé couché haltères' || !/12 × 18 kg · avant/.test(cel.recS || '') || !cel.asc || (cel.list && !cel.hidden) || !/Terminé|Voir le sommet/.test(cel.btn || '')) fail('fin de séance : record, ascension, le reste replié, Terminé');
  await page.evaluate(() => closeSheet()); await wait(500);
  await fin(false); await wait(1500);
  const nr = await page.evaluate(() => !!document.querySelector('.cel-rec'));
  log('Without record:', nr); if (nr) fail('pas de carte « Nouveau record » sans record');
  await page.evaluate(() => closeSheet()); await wait(400);

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
