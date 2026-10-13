// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Refonte 5 (Progrès, Historique, Profil, Apparence) et chasse aux doublons : Résumé en 4 blocs (Ta force, Muscles,
// Derniers records, Avant et maintenant) + liens vers Exercices, Statistiques, Objectifs et défis ; Historique en
// calendrier du mois ; Profil avec Trophées ; Apparence en vignettes. L'ascension n'est plus que sur l'accueil,
// « Prochain cap » ne répète plus la carte « Cette semaine » (série en jeu, retour en force y sont), la durée
// n'est plus dans « Mes séances ».
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v57'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const wd = (new Date().getDay() + 6) % 7, ss = [];
    for (let k = 100; k >= 1; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 1800 + (k % 4) * 300, name: k % 2 ? 'Haut du corps' : 'Jambes',
        exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(j => ({ reps: 10, weight: 8 + Math.floor((100 - k) / 15) * 2, done: true, pr: k < 20 && j === 0 })) },
          { exoId: 'squat_gobelet', sets: [0, 1, 2].map(() => ({ reps: 12, weight: 10 + Math.floor((100 - k) / 20) * 2, done: true })) },
          { exoId: 'rowing_uni_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 10, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick', why: 'Rando d\'été' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18, 20, 22] } }, sessions: ss,
      targets: [{ id: 't1', exoId: 'pompes', kind: 'reps', value: 20, start: 10, createdAt: ss[0].date }],
      templates: [{ id: 'tp1', n: 'Haut du corps', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'rowing_uni_haltere', sets: 3 }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const ascName = await page.evaluate(() => ASC_DATA[ascent().key].n);

  // 1. accueil : plus de « Toi, il y a 3 mois », plus de durée dans « Mes séances », un « Prochain cap » qui ne répète pas la semaine
  const home = await page.evaluate(() => ({ tn: !!document.querySelector('#v-today .tn-card'), meta: !!document.querySelector('#v-today .tc-meta'),
    goal: (document.querySelector('#v-today .goal-line') || {}).textContent || '', asc: !!document.querySelector('#v-today .wk-asc'), where: document.querySelector('.wk-n small').textContent }));
  log('Home:', JSON.stringify(home)); await shot('01_home');
  if (home.tn || home.meta || !home.asc || /semaine|portée|Retour en force|Camp|sommet|séance de plus/i.test(home.goal)) fail('accueil sans doublon');
  // la série en jeu passe dans la carte de la semaine (samedi, 1 séance manquante sur 3, série de 5 semaines)
  const risk = await page.evaluate(() => { const o = { w: weekdayIdx, s: sessionsThisWeek, k: streakInfo, t: sessionsToday };
    window.weekdayIdx = () => 5; window.sessionsThisWeek = () => 2; window.streakInfo = () => ({ n: 5 }); window.sessionsToday = () => [];
    renderView('today'); const r = (document.querySelector('.wk-risk') || {}).textContent || '', g = (document.querySelector('#v-today .goal-line') || {}).textContent || '';
    Object.assign(window, { weekdayIdx: o.w, sessionsThisWeek: o.s, streakInfo: o.k, sessionsToday: o.t });
    const oa = ascent; window.ascent = () => Object.assign({}, oa(), { comeback: 9000, wait: false }); renderView('today');
    const cb = document.querySelector('.wk-n small').textContent; window.ascent = oa; renderView('today'); return { r, g, cb }; });
  log('Week card:', JSON.stringify(risk));
  if (!/^5 sem\. d'affilée en jeu$/.test(risk.r.trim()) || /en jeu/.test(risk.g)) fail('série en jeu dans la carte de la semaine, pas dans « Prochain cap »');
  if (!/^Retour en force : séance ×2 jusqu'à 9\s?000/.test(risk.cb)) fail('retour en force dans la carte de la semaine');

  // 2. Progrès › Résumé : Ta force, Muscles, Derniers records, Avant et maintenant, 3 liens ; rien d'autre
  await page.evaluate(() => switchTab('progress')); await wait(900);
  const ov = await page.evaluate(() => { const v = document.querySelector('#v-progress');
    return { fs: (v.querySelector('.fs-v') || {}).textContent, fsS: (v.querySelector('.fs-s') || {}).textContent, ms: v.querySelectorAll('.ms-row').length,
      rec: v.querySelectorAll('.rec-group .row').length, tn: v.querySelectorAll('.tn-list .row').length,
      links: [...v.querySelectorAll('.prog-more .row')].map(r => r.querySelector('.t').textContent + (r.querySelector('.val') ? '=' + r.querySelector('.val').textContent : '')),
      kpi: !!v.querySelector('.kpi-grid,.kpi'), heat: !!v.querySelector('.heatmap,.hm-grid'), habits: !!v.querySelector('.habits'), txt: v.textContent }; });
  log('Résumé:', JSON.stringify(Object.assign({}, ov, { txt: undefined }))); await shot('02_resume');
  if (!/^[+−]?\d+ %$/.test(ov.fs || '') || !/^depuis tes débuts, en /.test(ov.fsS || '')) fail('carte « Ta force »');
  if (ov.ms < 1 || ov.ms > 4 || ov.rec < 1 || ov.rec > 3 || ov.tn < 1 || ov.links.join('|') !== 'Tous les exercices|Statistiques|Objectifs et défis=1 en cours') fail('blocs du Résumé');
  if (ov.kpi || ov.heat || ov.habits || ov.txt.includes(ascName)) fail('le Résumé ne répète ni chiffres clés, ni régularité, ni ascension');
  await page.click('.fs-card'); await wait(700);
  const force = await page.evaluate(() => ({ t: document.querySelector('#v-progress .lt').textContent, card: !!document.querySelector('#v-progress .trend-card') }));
  if (force.t !== 'Ta force' || !force.card) fail('« Ta force » ouvre le détail');
  await page.click('#v-progress .back-link'); await wait(600);
  await page.click('.ms-card'); await wait(700);
  const mus = await page.evaluate(() => ({ t: document.querySelector('#v-progress .lt').textContent, map: !!document.querySelector('#v-progress .mm-card') }));
  if (mus.t !== 'Muscles' || !mus.map) fail('les muscles ouvrent l\'écran Muscles');
  await page.evaluate(() => ACT.progressTab({ v: 'exos' })); await wait(500);
  if (await page.evaluate(() => /Derniers records/.test(document.querySelector('#v-progress').textContent))) fail('« Derniers records » n\'est plus répété dans Exercices');
  await page.evaluate(() => ACT.progressTab({ v: 'stats' })); await wait(600);
  const st = await page.evaluate(() => ({ chart: !!document.querySelector('#histChart .cc-bar'), habits: !!document.querySelector('#v-progress .habits') }));
  await page.click('#v-progress [data-a="histMetric"][data-v="volume"]'); await wait(500);
  const vol = await page.evaluate(() => document.querySelector('.hist-kpi b').textContent);
  log('Stats:', JSON.stringify(st), vol); await shot('03_stats');
  if (!st.chart || !st.habits || !/kg|t/.test(vol)) fail('Statistiques : graphique et habitudes');
  await page.evaluate(() => ACT.progressTab({ v: 'medals' })); await wait(600);
  const goals = await page.evaluate(() => { const v = document.querySelector('#v-progress'); return { t: v.querySelector('.lt').textContent, tg: !!v.querySelector('.tg-group'), ch: !!v.querySelector('.ch-group'),
    dup: !!v.querySelector('.asc-card,.t3d-card,.medal-summary,.all-medals-g'), asc: v.textContent.includes(ASC_DATA[ascent().key].n) }; });
  log('Goals:', JSON.stringify(goals));
  if (goals.t !== 'Objectifs et défis' || !goals.tg || !goals.ch || goals.dup || goals.asc) fail('Objectifs et défis sans ascension ni trophées');
  await page.evaluate(() => ACT.progressTab({ v: 'overview' })); await wait(400);

  // 3. Historique : calendrier du mois, Rewind, séances du mois ; mois précédent / suivant ; un jour ouvre sa séance
  await page.evaluate(() => switchTab('history')); await wait(800);
  const hist = await page.evaluate(() => { const key = todayISO().slice(0, 7), mine = S.sessions.filter(s => s.date.startsWith(key));
    return { title: document.querySelector('.hc-title b').textContent, sum: document.querySelector('.hc-title span').textContent, on: document.querySelectorAll('.hc-on').length,
      days: new Set(mine.map(s => s.date)).size, rows: document.querySelectorAll('.hs-row').length, n: mine.length, next: document.querySelector('.hc-nav[data-d="1"]').disabled,
      rw: (document.querySelector('#v-history .rc-entry .t') || {}).textContent || '', chart: !!document.querySelector('#v-history #histChart') }; });
  log('History:', JSON.stringify(hist)); await shot('04_history');
  if (!/^[A-ZÉ][a-zéû]+ \d{4}$/.test(hist.title) || hist.on !== hist.days || hist.rows !== hist.n || !hist.next || !/^Rewind (de |d')/.test(hist.rw) || hist.chart) fail('Historique : calendrier, Rewind, séances du mois');
  if (hist.n && !new RegExp('^' + hist.n + ' séances? · ').test(hist.sum)) fail('Historique : résumé du mois');
  await page.click('.hc-nav[data-d="-1"]'); await wait(500);
  const prev = await page.evaluate(() => ({ title: document.querySelector('.hc-title b').textContent, next: document.querySelector('.hc-nav[data-d="1"]').disabled, rows: document.querySelectorAll('.hs-row').length }));
  log('Previous month:', JSON.stringify(prev));
  if (prev.title === hist.title || prev.next || !prev.rows) fail('mois précédent');
  await page.click('.hc-on >> nth=0'); await wait(600);
  if (!(await page.evaluate(() => document.querySelector('#overlay.open .sheet') && /Modifier/.test(document.querySelector('#overlay').textContent)))) fail('un jour du calendrier ouvre sa séance');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.click('.hc-nav[data-d="1"]'); await wait(500);
  if (await page.evaluate(() => document.querySelector('.hc-title b').textContent) !== hist.title) fail('mois suivant');

  // 4. Profil : identité sans ascension, Trophées, réglages ; Données et sauvegarde ; Motivation avec « Ton pourquoi »
  await page.evaluate(() => switchTab('profil')); await wait(800);
  const prof = await page.evaluate(() => { const v = document.querySelector('#v-profil');
    return { sub: v.querySelector('.ph-sub').textContent, xp: !!v.querySelector('.profile-hero .xpbar,.ph-asc'), tr: v.querySelector('.pt-foot span').textContent, th: v.querySelectorAll('.pt-th').length,
      rows: [...v.querySelectorAll('.group .row .t')].map(t => t.textContent), txt: v.textContent }; });
  log('Profil:', JSON.stringify(Object.assign({}, prof, { txt: undefined }))); await shot('05_profil');
  if (!/^\d+ séances depuis [a-zéû]+/.test(prof.sub) || prof.xp || prof.txt.includes(ascName)) fail('identité sans ascension');
  if (!/^\d+ gagnés? sur \d+$/.test(prof.tr) || prof.th < 1 || prof.th > 4) fail('carte Trophées');
  if (prof.rows.join('|') !== "Objectifs|Réglages des séances|Matériel|Mes exercices|Poids du corps|Sons|Clics de l'interface|Apparence|Motivation|Données et sauvegarde|À propos") fail('réglages du Profil : ' + prof.rows.join('|'));
  await page.click('.pt-card'); await wait(1200);
  const tro = await page.evaluate(() => ({ t: document.querySelector('#overlay .sheet-hd .t').textContent, sum: !!document.querySelector('.trophies-body .medal-summary'), t3d: !!document.querySelector('.trophies-body .t3d-card') }));
  await shot('06_trophies');
  await page.click('.trophies-body [data-a="allMedals"]'); await wait(700);
  const all = await page.evaluate(() => ({ t: document.querySelector('#overlay .sheet-hd .t').textContent, back: !!document.querySelector('#overlay .te-cancel'), n: document.querySelectorAll('.all-medals .medal-card').length }));
  await page.click('#overlay .te-cancel'); await wait(700);
  const back = await page.evaluate(() => document.querySelector('#overlay .sheet-hd .t').textContent);
  log('Trophies:', JSON.stringify(tro), JSON.stringify(all), back);
  if (tro.t !== 'Trophées' || !tro.sum || !tro.t3d || all.t !== 'Tous les trophées' || !all.back || all.n < 20 || back !== 'Trophées') fail('Trophées puis « Tous les trophées » et retour');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.click('#v-profil [data-a="openData"]'); await wait(600);
  const data = await page.evaluate(() => ({ t: document.querySelector('#overlay .sheet-hd .t').textContent, txt: document.querySelector('#overlay .sheet-body').textContent }));
  if (data.t !== 'Données et sauvegarde' || !/Sauvegarder mes données/.test(data.txt) || !/Restaurer une sauvegarde/.test(data.txt) || !/Réinitialiser toutes les données/.test(data.txt)) fail('Données et sauvegarde');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.click('#v-profil [data-a="openMotivation"]'); await wait(600);
  const why = await page.evaluate(() => (document.querySelector('#overlay [data-a="editWhy"]') || {}).textContent || '');
  if (!/Ton pourquoi/.test(why) || !/Rando d'été/.test(why)) fail('« Ton pourquoi » dans Motivation');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 5. Apparence : trois vignettes (radio), « Séance en sombre » à part, verrouillée avec le thème Sombre
  await page.click('#v-profil [data-a="openAppearance"]'); await wait(600);
  const ap = await page.evaluate(() => ({ opts: [...document.querySelectorAll('.tt-opt')].map(b => b.querySelector('.tt-l').textContent + ':' + b.getAttribute('aria-checked')), sw: !document.querySelector('[data-a="toggleLiveDark"]').disabled }));
  await shot('07_appearance');
  await page.click('.tt-opt[data-v="dark"]'); await wait(500);
  const apd = await page.evaluate(() => ({ dark: document.querySelector('.tt-opt[data-v="dark"]').getAttribute('aria-checked'), sw: document.querySelector('[data-a="toggleLiveDark"]').disabled, s: document.querySelector('.tt-group ~ .group .s').textContent, attr: document.documentElement.dataset.theme }));
  await page.click('.tt-opt[data-v="auto"]'); await wait(400);
  log('Appearance:', JSON.stringify(ap), JSON.stringify(apd));
  if (ap.opts.join('|') !== 'Clair:false|Sombre:false|Automatique:true' || !ap.sw || apd.dark !== 'true' || !apd.sw || apd.s !== 'Toujours en sombre avec le thème Sombre' || apd.attr !== 'dark') fail('Apparence');
  await page.evaluate(() => closeSheet()); await wait(400);

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
