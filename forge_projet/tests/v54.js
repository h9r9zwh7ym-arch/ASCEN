// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (loi de Hick : moins de choix à la fois) : un seul chemin pour démarrer (plus de bascule Ma séance /
// Proposée, une action forte et une alternative par carte), un message à la fois sur l'accueil, la séance
// proposée en liste simple avec « Ajuster » replié, trois temps forts en fin de séance, les trophées et les
// réglages regroupés derrière une ligne, tes exercices habituels en tête du choix d'exercices. Budgets de
// choix par écran vérifiés avec un historique réaliste (4 mois).
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v54'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes', 'fentes_avant', 'elevations_laterales']; const ss = [];
    for (let k = 120; k >= 2; k -= 2) { if (k % 7 === 0) continue; const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), startedAt: d.toISOString(), durationSec: 2400 + (k % 5) * 300, note: k === 4 ? 'Bonne énergie' : undefined,
        exos: ids.filter((_, i) => (i + k) % 3 !== 0).slice(0, 5).map(id => ({ exoId: id, sets: [0, 1, 2].map(j => ({ reps: id === 'planche' ? 40 + (120 - k) / 4 : 8 + ((k + j) % 4), weight: /haltere|gobelet|curl|fentes|elevations/.test(id) ? 6 + Math.floor((120 - k) / 20) * 2 : undefined, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick', why: 'Être en forme pour la rando d\'été' },
      equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true }, weights: { dumbbells: [4, 6, 8, 10, 12, 14, 16] } }, sessions: ss,
      targets: [{ id: 't1', exoId: 'pompes', kind: 'reps', value: 20, start: ss[0].date }], challenges: [{ id: 'reps1000', start: ss[ss.length - 3].date }],
      templates: [{ id: 'tp1', n: 'Haut du corps', days: [1, 4], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'rowing_uni_haltere', sets: 3 }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(1200);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  // nombre de choix (boutons, interrupteurs, champs) d'un écran entier, défilement compris
  const choices = root => page.evaluate(root => { const R = root ? document.querySelector(root) : document.querySelector('.view.active'); if (!R) return -1;
    const els = [...R.querySelectorAll('button, [data-a], input, select, [role=button], a[href]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden=true]') && !e.closest('[hidden]'); });
    return els.filter(e => !els.some(p => p !== e && p.contains(e))).length; }, root);

  // 1. accueil : pas de bascule, une action forte et une alternative (« Choisir une autre séance »), un seul message
  const home = await page.evaluate(() => ({ seg: !!document.querySelector('#v-today .home-seg, #v-today [data-seg="today"]'), go: document.querySelectorAll('#v-today .hero .hero-go').length,
    alt: [...document.querySelectorAll('#v-today .hero .hero-alt')].map(b => b.textContent.trim()), msgs: document.querySelectorAll('#v-today .dl-card, #v-today .goal-line').length }));
  const cHome = await choices();
  log('Home:', JSON.stringify(home), 'choices', cHome);
  if (home.seg || home.go !== 1 || home.alt.length !== 1 || !/Choisir une autre séance|laisse l'app choisir/.test(home.alt[0]) || home.msgs > 1) fail('accueil : un seul chemin, un seul message');
  if (cHome > 24) fail('accueil : trop de choix (' + cHome + ')');
  await shot('01_home');
  // 2. la séance de l'app (via « Choisir une autre séance ») : la liste dans la carte, réglages fins derrière « Ajuster »,
  // « Autre proposition », l'express et le retour à sa séance dans « Choisir une autre séance »
  // (sans séance prête, la carte « Compose ta séance » mène directement à la séance de l'app)
  if (await page.$('#v-today .hero [data-a="chooseSession"]')) {
    await page.click('#v-today .hero [data-a="chooseSession"]'); await wait(450);
    const sheet = await page.evaluate(() => [...document.querySelectorAll('.cs-row .t')].map(b => b.textContent.trim()));
    log('Choose sheet:', JSON.stringify(sheet));
    if (!sheet.includes("Laisse l'app choisir") || !sheet.some(t => /Séance express/.test(t)) || !sheet.includes('Composer moi-même')) fail('« Choisir une autre séance » : app, express, composer');
    await page.evaluate(t => [...document.querySelectorAll('.cs-row')].find(r => r.textContent.includes(t)).click(), "Laisse l'app choisir"); await wait(900);
  } else { await page.click('#v-today .hero [data-a="todayMode"][data-v="proposal"]'); await wait(900); }
  const prop = await page.evaluate(() => ({ mode: S.settings.todayTab, alts: [...document.querySelectorAll('#v-today .hero .hero-alt')].map(b => b.textContent.trim()),
    chips: document.querySelectorAll('#v-today .type-chip').length, swap: document.querySelectorAll('#v-today [data-a="swapExoOpen"]').length, count: !!document.querySelector('#v-today [data-a="draftCount"]'),
    rows: document.querySelectorAll('#v-today .hero-list .hl-row').length, adj: !!document.querySelector('#v-today [data-a="propAdjust"]'), regen: !!document.querySelector('#v-today .hero [data-a="chooseSession"]') }));
  const cProp = await choices();
  log('Proposal:', JSON.stringify(prop), 'choices', cProp);
  if (prop.mode !== 'proposal' || prop.alts.length !== 1 || !/Choisir une autre séance/.test(prop.alts[0])) fail('séance de l\'app : Commencer et « Choisir une autre séance »');
  if (prop.chips || prop.swap || prop.count || !(prop.rows >= 3) || !prop.adj || !prop.regen) fail('séance de l\'app : liste simple, Ajuster et Autre proposition');
  if (cProp > 30) fail('séance de l\'app : trop de choix (' + cProp + ')');
  await page.evaluate(() => document.querySelector('#v-today [data-a="propAdjust"]').scrollIntoView({ block: 'center' })); await page.click('#v-today [data-a="propAdjust"]'); await wait(700);
  const adj = await page.evaluate(() => ({ chips: document.querySelectorAll('#v-today .type-chip').length, swap: document.querySelectorAll('#v-today [data-a="swapExoOpen"]').length, count: !!document.querySelector('#v-today [data-a="draftCount"]'), add: !!document.querySelector('#v-today [data-a="addExoOpen"]') }));
  await shot('02_adjust');
  await page.click('#v-today [data-a="propAdjust"]'); await wait(600);
  const adj2 = await page.evaluate(() => document.querySelectorAll('#v-today [data-a="swapExoOpen"]').length);
  log('Adjust:', JSON.stringify(adj), adj2);
  if (adj.chips < 5 || adj.swap < 3 || !adj.count || !adj.add || adj2) fail('Ajuster : types, nombre, remplacer, ajouter ; puis replié');
  await page.evaluate(() => document.querySelector('#v-today').scrollTop = 0); await wait(200);
  await page.click('#v-today .hero [data-a="chooseSession"]'); await wait(450);
  const sheet2 = await page.evaluate(() => [...document.querySelectorAll('.cs-row .t')].map(b => b.textContent.trim()));
  log('Choose sheet (app):', JSON.stringify(sheet2));
  const back2 = sheet2.find(t => /^Revenir à/.test(t));
  if (!sheet2.includes('Autre proposition') || !sheet2.some(t => /Séance express/.test(t)) || !(back2 || sheet2.includes('Composer moi-même'))) fail('« Choisir une autre séance » depuis la séance de l\'app : autre proposition, express, revenir');
  await page.evaluate(t => [...document.querySelectorAll('.cs-row')].find(r => r.textContent.includes(t)).click(), back2 || 'Composer moi-même'); await wait(900);
  await page.evaluate(() => closeSheet()); await wait(500);
  if ((await page.evaluate(() => S.settings.todayTab)) !== 'custom' || !(await page.$('#v-today .hero.compose, #v-today .hero.planned, #v-today .hero.custom'))) fail('retour à Ma séance');

  // 3. Profil › Trophées (refonte 5) : les trophées derrière une ligne
  await page.click('.tabbtn[data-id="profil"]'); await wait(600); await page.click('#v-profil .pt-card'); await wait(1200);
  const obj = await page.evaluate(() => ({ grid: document.querySelectorAll('.trophies-body .medal-card').length, next: document.querySelectorAll('.trophies-body [data-a="showMedal"]').length, row: (document.querySelector('.trophies-body [data-a="allMedals"]') || {}).textContent || '' }));
  log('Trophées:', JSON.stringify({ ...obj, row: obj.row.replace(/\s+/g, ' ').trim() }));
  if (obj.grid || obj.next > 3 || !/Tous les trophées/.test(obj.row)) fail('Trophées : 3 prochains paliers et une ligne vers tous les trophées');
  await page.click('.trophies-body [data-a="allMedals"]'); await wait(1200);
  const all = await page.evaluate(() => ({ t: (document.querySelector('.sheet-hd .t') || {}).textContent, cards: document.querySelectorAll('.sheet .medal-card').length, total: MEDALS.length }));
  log('All medals:', JSON.stringify(all)); if (all.t !== 'Tous les trophées' || all.cards !== all.total) fail('feuille : tous les trophées');
  await shot('03_all_medals');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 4. Profil : réglages regroupés, feuilles empilées avec « Retour »
  await page.click('.tabbtn[data-id="profil"]'); await wait(700);
  const cProf = await choices();
  const prof = await page.evaluate(() => ({ motivSwitches: document.querySelectorAll('#v-profil [data-a="toggleMotiv"]').length, rest: document.querySelectorAll('#v-profil [data-a="setRest"]').length, reset: !!document.querySelector('#v-profil [data-a="confirmReset"]'), backup: !!document.querySelector('#v-profil [data-a="openData"]') }));
  log('Profil:', JSON.stringify(prof), 'choices', cProf);
  if (prof.motivSwitches || prof.rest || prof.reset || !prof.backup || cProf > 19) fail('Profil : réglages regroupés, la sauvegarde reste visible');
  await page.click('#v-profil [data-a="openSessionPrefs"]'); await wait(700);
  await page.click('.sheet [data-a="setRest"][data-v="long"]'); await wait(300);
  const rest = await page.evaluate(() => ({ s: S.settings.rest, on: (document.querySelector('.sheet [data-a="setRest"].on') || {}).dataset }));
  await page.click('.sheet [data-a="deloadHow"]'); await wait(700);
  const dl = await page.evaluate(() => ({ t: (document.querySelector('.sheet-hd .t') || {}).textContent, back: !!document.querySelector('.sheet-hd [data-a="sheetBack"]') }));
  await page.click('.sheet-hd [data-a="sheetBack"]'); await wait(800);
  const back = await page.evaluate(() => (document.querySelector('.sheet-hd .t') || {}).textContent);
  await page.click('.sheet [data-a="setRest"][data-v="normal"]'); await wait(200);
  await page.evaluate(() => closeSheet()); await wait(600);
  log('Session prefs:', JSON.stringify(rest), JSON.stringify(dl), back);
  if (rest.s !== 'long' || !rest.on || rest.on.v !== 'long' || dl.t !== 'Semaine allégée' || !dl.back || back !== 'Réglages des séances') fail('Réglages des séances : repos sur place, semaine allégée puis retour');
  await page.click('#v-profil [data-a="openMotivation"]'); await wait(700);
  const mot = await page.evaluate(() => document.querySelectorAll('.sheet [data-a="toggleMotiv"]').length);
  await page.click('.sheet [data-a="toggleMotiv"][data-k="thenNow"]'); await wait(200);
  await page.evaluate(() => closeSheet()); await wait(700);
  const sum = await page.evaluate(() => ({ v: S.settings.thenNow }));
  log('Motivation:', mot, JSON.stringify(sum));
  if (mot !== 4 || sum.v !== false) fail('Motivation : 4 aides');
  await page.evaluate(() => { S.settings.thenNow = true; save(); });
  await page.click('#v-profil [data-a="openData"]'); await wait(700);
  const data = await page.evaluate(() => ['backupData', 'restoreData', 'exportCSV', 'openExportImport', 'openStorage', 'confirmReset'].every(a => document.querySelector(`.sheet [data-a="${a}"]`)));
  await page.click('.sheet [data-a="openStorage"]'); await wait(700);
  const sto = await page.evaluate(() => ({ t: (document.querySelector('.sheet-hd .t') || {}).textContent, back: !!document.querySelector('.sheet-hd [data-a="sheetBack"]') }));
  await page.evaluate(() => closeSheet()); await wait(500);
  log('Data:', data, JSON.stringify(sto)); if (!data || sto.t !== 'Espace de stockage' || !sto.back) fail('Restaurer, exporter, stockage : tout y est, retour');

  // 5. choix d'exercices : tes habituels en tête, une sélection suit sur toutes ses lignes
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  await page.evaluate(() => openPicker({ title: 'Choisir des exercices', multi: true, onDone: () => {} })); await wait(700);
  const pk = await page.evaluate(() => { const h = document.querySelector('#pickerList .pick-h.hab'); const g = h && h.nextElementSibling; const rows = g ? [...g.querySelectorAll('.pick-row')].map(r => r.dataset.id) : [];
    return { h: h ? h.textContent.replace(/\s+/g, ' ').trim() : '', rows, habit: habitualExos().slice(0, 6) }; });
  if (pk.rows.length) { await page.click(`#pickerList .pick-h.hab + .group .pick-row[data-id="${pk.rows[0]}"] [data-a="pickerTap"]`); await wait(200); }
  const both = await page.evaluate(id => [...document.querySelectorAll(`#pickerList .pick-row[data-id="${id}"]`)].map(r => r.classList.contains('on')), pk.rows[0]);
  await page.fill('#pickerSearch', 'pomp'); await wait(300);
  const searched = await page.evaluate(() => !!document.querySelector('#pickerList .pick-h.hab'));
  log('Picker:', JSON.stringify(pk), JSON.stringify(both), searched);
  if (!/Habituels/.test(pk.h) || !pk.rows.length || pk.rows.length > 6 || pk.rows.join() !== pk.habit.filter(id => pk.rows.includes(id)).join() || both.length < 2 || !both.every(Boolean) || searched) fail('choix d\'exercices : habituels en tête, sélection sur toutes les lignes, masqués en recherche');
  await shot('04_picker');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 6. fin de séance : trois temps forts, le reste à un toucher
  await page.evaluate(() => { const s = { id: 'cel54', date: todayISO(), startedAt: new Date().toISOString(), durationSec: 2400,
      exos: ['dc_haltere', 'pompes', 'planche', 'squat_gobelet', 'curl_biceps'].map(id => ({ exoId: id, sets: [0, 1, 2].map(() => ({ reps: id === 'planche' ? 95 : 15, weight: /haltere|gobelet|curl/.test(id) ? 18 : undefined, done: true })) })) };
    s.beats = 6; S.sessions.push(s); save(); DATA_VER++; showCelebration(s, [], [], []); });
  await wait(1500);
  const cel = await page.evaluate(() => ({ vis: [...document.querySelectorAll('.cel .cp-row')].filter(e => !e.closest('[hidden]')).length, hid: document.querySelectorAll('.cel .cel-rest .cp-row').length, more: (document.querySelector('.cel .cp-more') || {}).textContent || '' }));
  if (cel.more) { await page.click('.cel .cp-more'); await wait(600); }
  const cel2 = await page.evaluate(() => ({ vis: [...document.querySelectorAll('.cel .cp-row')].filter(e => !e.closest('[hidden]')).length, more: !!document.querySelector('.cel .cp-more') }));
  log('Celebration:', JSON.stringify(cel), JSON.stringify(cel2));
  if (cel.vis > 3 || (cel.hid && (!/Voir/.test(cel.more) || cel2.vis !== cel.vis + cel.hid || cel2.more))) fail('fin de séance : trois temps forts, le reste à un toucher');
  if (!cel.hid) log('(scénario : pas plus de 3 temps forts, rien de replié)');
  await shot('05_celebration');
  await page.evaluate(() => closeSheet()); await wait(400);

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
