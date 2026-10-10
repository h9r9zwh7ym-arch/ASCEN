// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (réorganisation) : Progrès en 4 onglets (Résumé, Muscles, Exercices, Objectifs), progression de
// force en % depuis 0, stimulus par muscle (séries pondérées, repères 4 et 10), tonnage dans l'historique,
// Profil = identité + réglages, accueil « Ma semaine », exercices favoris, note de séance sans doublon
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v43'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v43')) return; localStorage.setItem('__seed_v43', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; let i = 0;
    for (let k = 60; k >= 2; k -= 3, i++) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [
      { exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 8 + (i % 4), weight: 10 + Math.floor(i / 5) * 2, done: true })) },
      { exoId: 'pompes', sets: [1, 2].map(() => ({ reps: 10 + (i % 3), done: true })) }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } },
      sessions: ss, templates: [{ id: 't1', n: 'Haut', days: [2], exos: [{ exoId: 'dc_haltere', sets: 3 }] }] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. Progrès : quatre onglets, une question chacun
  await page.click('.tabbtn[data-id="progress"]'); await wait(700);
  const tab = async v => { await page.evaluate(v => ACT.progressTab({ v }), v); await wait(400);
    return page.evaluate(() => ({ trend: !!document.querySelector('#v-progress .trend-card'), kpi: document.querySelectorAll('#v-progress .kpi').length, heat: !!document.querySelector('#v-progress .heatmap, #v-progress .hm'), habits: !!document.querySelector('#v-progress .group.habits'),
      level: !!document.querySelector('#v-progress .asc-card'), mm: !!document.querySelector('#v-progress .mm-card'), stim: !!document.querySelector('#v-progress .stim-card'), medals: !!document.querySelector('#v-progress .medal-summary'),
      exos: !!document.querySelector('#v-progress [data-a="openExoChart"]'), titles: [...document.querySelectorAll('#v-progress .sh, #v-progress .cc-t')].map(e => e.textContent.trim()) })); };
  const labels = await page.$$eval('[data-seg="progress"] button', b => b.map(x => x.textContent));
  const ov = await tab('overview'), mu = await tab('muscles'), ex = await tab('exos'), go = await tab('medals');
  log('Tabs:', labels.join('|'), '| overview', JSON.stringify(ov), '| muscles', JSON.stringify({ mm: mu.mm, stim: mu.stim }), '| goals', JSON.stringify({ level: go.level, medals: go.medals, t: go.titles.slice(0, 4) }));
  if (labels.join('|') !== 'Résumé|Muscles|Exercices|Objectifs') fail('quatre onglets');
  if (!ov.trend || ov.kpi !== 4 || !ov.habits || ov.level || ov.mm || ov.titles.some(t => /Séances par semaine|Tonnage par semaine|Mes objectifs|Défis/.test(t))) fail('Résumé recentré');
  if (!mu.mm || !mu.stim || mu.trend) fail('onglet Muscles');
  if (!ex.exos || !ex.titles.includes('Tous mes exercices')) fail('onglet Exercices');
  if (!go.level || !go.medals || !go.titles.includes('Mes objectifs') || !go.titles.includes('Défis')) fail('onglet Objectifs');

  // 2. progression de force en % (0 au départ) ; stimulus : séries pondérées et zones
  const pc = await page.evaluate(() => ({ zero: pctTxt(100), up: pctTxt(124), down: pctTxt(91), z: [0, 3.5, 4, 9.5, 10, 14].map(stimZone) }));
  log('Percent / zones:', JSON.stringify(pc));
  if (pc.zero !== '0 %' || pc.up !== '+24 %' || pc.down !== '−9 %' || pc.z.join() !== 'none,low,ok,ok,high,high') fail('pourcentage et zones de stimulus');
  const vol = await page.evaluate(() => { const b = muscleVolume(7).find(r => r.id === 'triceps').sets;
    S.sessions.push({ id: 'x', date: todayISO(), exos: [{ exoId: 'dc_haltere', sets: [1, 2].map(() => ({ reps: 8, weight: 12, done: true })) }] }); DATA_VER++;
    const a = muscleVolume(7).find(r => r.id === 'triceps').sets, p = muscleVolume(7).find(r => r.id === 'pect').sets; S.sessions.pop(); DATA_VER++; return { delta: a - b, p }; });
  log('Fractional sets:', JSON.stringify(vol)); if (vol.delta !== 1) fail('muscle secondaire = ½ série');
  await tab('muscles'); await page.evaluate(() => { const c = document.querySelector('.stim-card'); document.querySelector('#v-progress').scrollTop = c.offsetTop - 70; }); await wait(300); await shot('01_stimulus');
  await tab('overview'); await shot('02_overview');

  // 3. historique : tonnage par semaine (les graphiques ont quitté Progrès)
  await page.click('.tabbtn[data-id="history"]'); await wait(500);
  await page.click('[data-a="histMetric"][data-v="volume"]'); await wait(400);
  const hv = await page.evaluate(() => document.querySelector('.hist-kpi b').textContent);
  log('History tonnage:', hv); if (!/kg|t$/.test(hv)) fail('tonnage dans l\'historique');

  // 4. Profil : identité et réglages seulement, la réinitialisation en dernier
  await page.click('.tabbtn[data-id="profil"]'); await wait(500);
  const pf = await page.evaluate(() => ({ secs: [...document.querySelectorAll('#v-profil h2.sh')].map(e => e.textContent.trim()), medals: !!document.querySelector('.ph-medals'),
    lastData: (() => { const g = [...document.querySelectorAll('#v-profil h2.sh')].find(h => /Mes données/.test(h.textContent)).nextElementSibling; const rows = g.querySelectorAll('[data-a]'); return rows[rows.length - 1].dataset.a; })(),
    exRow: (document.querySelector('[data-a="openExoPrefs"] .t') || {}).textContent }));
  log('Profile:', JSON.stringify(pf));
  // (loi de Hick : Motivation et les options de données sont regroupées derrière une ligne ; la réinitialisation reste la dernière, dans sa feuille)
  if (pf.secs.join('|') !== 'Entraînement|Mes données|Apparence et sons' || pf.medals || pf.lastData !== 'openDataMore' || pf.exRow !== 'Mes exercices') fail('Profil réorganisé');

  // 5. favoris : étoile dans la fiche, en tête du choix d'exercices, filtre, menu de séance
  await page.evaluate(() => ACT.showExoInfo({ id: 'pompes_diamant' })); await wait(600);
  await page.click('#overlay .fav-toggle'); await wait(300);
  const f1 = await page.evaluate(() => ({ on: S.prefs.included.includes('pompes_diamant'), btn: document.querySelector('#overlay .fav-toggle').classList.contains('on') }));
  await shot('03_fav_sheet');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { switchTab('today'); openPicker({ title: 'Choisir des exercices', multi: true, onDone: () => {} }); }); await wait(600);
  const p1 = await page.evaluate(() => ({ chip: !!document.querySelector('#pickerCats [data-v="fav"]'), firstH: document.querySelector('#pickerList .pick-h').textContent.trim(), first: document.querySelector('#pickerList .pick-row').dataset.id, mark: !!document.querySelector('#pickerList .pick-row .fav-mark') }));
  await page.click('#pickerCats [data-v="fav"]'); await wait(300);
  const p2 = await page.evaluate(() => [...document.querySelectorAll('#pickerList .pick-row')].map(r => r.dataset.id));
  await shot('04_fav_picker');
  log('Favorites:', JSON.stringify(f1), JSON.stringify(p1), JSON.stringify(p2));
  if (!f1.on || !f1.btn || !p1.chip || !/^Favoris/.test(p1.firstH) || p1.first !== 'pompes_diamant' || !p1.mark || p2.join() !== 'pompes_diamant') fail('favoris : fiche, sélecteur, filtre');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { openExoPrefs(); }); await wait(500);
  const pr = await page.evaluate(() => [...document.querySelectorAll('.sheet-body h2.sh')].map(h => h.textContent.trim())[0]);
  log('Prefs first section:', pr); if (!/^Favoris/.test(pr)) fail('Mes exercices : favoris en tête');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 6. accueil : « Ma semaine » d'abord, le programme de la semaine dedans ; séance : pas de note en double
  const home = await page.evaluate(() => { const heads = [...document.querySelectorAll('#v-today .sec-h span')].map(e => e.textContent.trim()).filter(Boolean);
    return { heads, wizardIn: !!document.querySelector('.week-plan [data-a="weekWizard"]') }; });
  log('Home sections:', JSON.stringify(home));
  if (home.heads.indexOf('Ma semaine') < 0 || home.heads.indexOf('Ma semaine') > home.heads.indexOf('Mes séances') || !home.wizardIn) fail('accueil : Ma semaine puis Mes séances');
  const notes = await page.evaluate(() => [{ note: 'Objectif du jour : une répétition de plus par série que la dernière fois.' }, { note: 'Objectif : +1 répétition par série par rapport à la dernière fois.' }, { note: 'Objectif : +5 s par rapport à la dernière fois.' }, { note: 'Reprise après 30 jours : charge un peu allégée.' }].map(noteIsBeat));
  log('Duplicate notes hidden:', JSON.stringify(notes)); if (notes.join() !== 'true,true,true,false') fail('note de progression en double');
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes_diamant', sets: 2 }] }; ACT.startCustom(); }); await wait(4400);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  await page.click('.focus-card [data-a="focusMenu"]'); await wait(400);
  const menu = await page.evaluate(() => (document.querySelector('.menu-list [data-a="favToggle"]') || {}).textContent || '');
  log('Session menu:', menu); if (!/Retirer des favoris/.test(menu)) fail('favori depuis le menu de séance');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
