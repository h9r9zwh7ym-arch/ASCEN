// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (retours) : roue abdominale debout de retour, rangées de filtres sans rebond vertical, « Retour »
// séparé du titre, carte des muscles contrastée (gainage en violet) avec légende lisible, stimulus épuré
// (légende des chiffres, « À propos »), période du graphique de l'historique, suggestions de l'app
// désactivables, Mes séances et Ma semaine repliées en résumé compact
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v44'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk, colorScheme: 'dark' });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v44')) return; localStorage.setItem('__seed_v44', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = []; let i = 0;
    for (let k = 400; k >= 1; k -= 4, i++) ss.push({ id: 's' + k, date: iso(k), durationSec: 2400, exos: [
      { exoId: 'dc_haltere', sets: [1, 2, 3].map(() => ({ reps: 8 + (i % 4), weight: 10 + Math.floor(i / 8) * 2, done: true })) },
      ...(k < 6 ? [{ exoId: 'crunch', sets: [{ reps: 15, done: true }] }] : [])] });
    const tp = (id, n, days, ex) => ({ id, n, days, exos: [{ exoId: ex, sets: 3 }] });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true, ab_roller: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18] } },
      sessions: ss, templates: [tp('t1', 'Haut du corps', [0], 'dc_haltere'), tp('t2', 'Jambes', [2], 'squat_gobelet'), tp('t3', 'Dos', [4], 'rowing_uni_haltere'), tp('t4', 'Gainage', [5], 'planche'), tp('t5', 'Bras', [], 'curl_biceps')] })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(600);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. catalogue : la roue abdominale debout est de retour, proposée avec une roue
  const wheel = await page.evaluate(() => ({ listed: EXOS.some(e => e.id === 'roue_abdo_debout'), avail: availableExos().some(e => e.id === 'roue_abdo_debout'), retired: EXO_RETIRED.has('roue_abdo_debout') }));
  log('Ab wheel:', JSON.stringify(wheel)); if (!wheel.listed || !wheel.avail || wheel.retired) fail('roue abdominale debout au catalogue');

  // 2. sélecteur : les rangées de filtres défilent à l'horizontale seulement ; fiche : « Retour » détaché du titre
  await page.evaluate(() => openPicker({ title: 'Objectif sur quel exercice ?', onCancel: () => closeSheet(), onPick: () => {} })); await wait(600);
  const chips = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('#pickerCats')); return { oy: c.overflowY, ta: c.touchAction, ob: c.overscrollBehaviorY }; });
  log('Chip rows:', JSON.stringify(chips)); if (chips.oy !== 'hidden' || !/pan-x/.test(chips.ta)) fail('rangées de filtres sans défilement vertical');
  const gapP = await page.evaluate(() => { const b = document.querySelector('#overlay .sheet-hd .te-cancel').getBoundingClientRect(), t = document.querySelector('#overlay .sheet-hd .t').getBoundingClientRect(); return Math.round(t.left - b.right); });
  await page.evaluate(() => { const r = document.querySelector('#pickerList .pick-row'); ACT.showExoInfo({ id: r.dataset.id }); }); await wait(700);
  const gapF = await page.evaluate(() => { const b = document.querySelector('#overlay .sheet-hd .te-cancel'), t = document.querySelector('#overlay .sheet-hd .t'); return b ? Math.round(t.getBoundingClientRect().left - b.getBoundingClientRect().right) : null; });
  await shot('01_fiche_back');
  log('Gap back/title: picker', gapP, '| fiche', gapF); if (!(gapP >= 8) || !(gapF >= 8)) fail('écart entre « Retour » et le titre');
  await page.evaluate(() => { closeSheet(); closeSheet(); }); await wait(500);

  // 3. carte des muscles : un muscle travaillé est bien visible (gainage en violet), légende lisible
  await page.click('.tabbtn[data-id="progress"]'); await wait(600);
  await page.evaluate(() => ACT.progressTab({ v: 'muscles' })); await wait(1300); // zones allumées en fondu
  const mm = await page.evaluate(() => { const z = document.querySelector('.mm-week .mm-z.r-core.on'), cs = z && getComputedStyle(z);
    const off = getComputedStyle(document.querySelector('.mm-week .mm-z:not(.on)')), tint = getComputedStyle(document.documentElement).getPropertyValue('--tint').trim();
    return { abs: !!z, op: z ? +cs.fillOpacity : 0, fill: cs && cs.fill, stroke: off.stroke !== 'none', tint, legend: document.querySelectorAll('.mm-legend').length, scale: document.querySelectorAll('.mm-scale .sc i').length, top: (document.querySelector('.mm-top') || {}).textContent }; });
  log('Muscle map:', JSON.stringify(mm));
  const hex = '#' + ((mm.fill || '').match(/\d+/g) || []).map(x => (+x).toString(16).padStart(2, '0')).join('');
  if (!mm.abs || mm.op < 0.45 || hex.toLowerCase() !== mm.tint.toLowerCase() || !mm.stroke || mm.legend || mm.scale !== 4 || !/^Le plus travaillé/.test(mm.top || '')) fail('carte des muscles contrastée, une seule teinte');
  await shot('02_muscle_map');
  // stimulus : barre grise sous le seuil, verte au-delà, repères 4 et 10, plus de losange ; détails dans « À propos »
  const st = await page.evaluate(() => ({ foot: !!document.querySelector('.wv-foot, .wv-src, .wv-track u'), key: [...document.querySelectorAll('.stim-key span')].map(e => e.textContent.trim()), ticks: [...document.querySelectorAll('.wv-ticks em')].map(e => e.textContent),
    tips: [...document.querySelectorAll('.stim-card .wv-row')].filter(r => r.dataset.tip && /moyenne/.test(r.dataset.tip)).length,
    colors: [...new Set([...document.querySelectorAll('.stim-card .wv-track i')].filter(i => i.offsetWidth).map(i => getComputedStyle(i).backgroundColor))].length, sub: document.querySelector('.stim-card .cc-s').textContent }));
  log('Stimulus:', JSON.stringify(st));
  if (st.foot || st.key.length !== 2 || st.ticks.join() !== '0,4,10' || st.tips !== 10 || st.colors > 2 || st.sub.length > 60) fail('stimulus simple et lisible');
  await page.evaluate(() => { const c = document.querySelector('.stim-card'); document.querySelector('#v-progress').scrollTop = c.offsetTop - 70; }); await wait(300); await shot('03_stimulus');
  await page.click('.stim-card [data-a="stimHow"]'); await wait(600);
  const about = await page.evaluate(() => ({ t: document.querySelector('#overlay .sheet-hd .t').textContent, h: [...document.querySelectorAll('#overlay .how-body h3')].map(e => e.textContent), src: document.querySelectorAll('#overlay .how-src a[href^="https://"]').length }));
  log('About:', JSON.stringify(about)); if (about.h.length < 3 || about.src < 2) fail('« À propos » du stimulus');
  await shot('04_stim_about'); await page.evaluate(() => closeSheet()); await wait(400);

  // 4. historique : 7 j / 1 mois / 3 mois / 6 mois / 1 an / Total (par défaut)
  await page.click('.tabbtn[data-id="history"]'); await wait(600);
  const rg = await page.evaluate(() => ({ labels: [...document.querySelectorAll('[data-seg="histRange"] button')].map(b => b.textContent), on: document.querySelector('[data-seg="histRange"] .on').dataset.v }));
  const bars = {};
  for (const v of ['w', 'm', '3m', '6m', 'y', 'all']) { await page.click(`[data-a="histRange"][data-v="${v}"]`); await wait(350);
    bars[v] = await page.evaluate(() => ({ n: document.querySelectorAll('#histChart .cc-col').length, kpi: document.querySelector('.hist-kpi small').textContent, foot: document.querySelector('.hist-avg').textContent })); }
  log('History ranges:', JSON.stringify(rg), JSON.stringify(bars));
  if (rg.labels.join('|') !== '7 j|1 mois|3 mois|6 mois|1 an|Total' || rg.on !== 'all') fail('périodes, Total par défaut');
  if (bars.w.n !== 7 || bars.m.n !== 30 || bars['3m'].n !== 13 || bars['6m'].n !== 26 || bars.y.n !== 12 || bars.all.n < 13 || bars.all.kpi !== 'au total' || !/sur 7/.test(bars.w.foot) || !/par mois/.test(bars.y.foot)) fail('barres par période');
  await page.click('[data-a="histRange"][data-v="6m"]'); await wait(500); await shot('05_history_6m');
  await page.click('[data-a="histRange"][data-v="all"]'); await wait(300);

  // 5. Mes séances et Ma semaine repliées : les mêmes cartes se resserrent (rien n'est reconstruit), toutes visibles
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  const nodes = await page.evaluate(() => { window.__cards = [...document.querySelectorAll('.tpl-card2')]; return window.__cards.length; });
  await page.click('[data-a="toggleSection"][data-k="tplOpen"]'); await wait(700);
  await page.click('[data-a="toggleSection"][data-k="planOpen"]'); await wait(700);
  const mini = await page.evaluate(() => ({ same: [...document.querySelectorAll('.tpl-card2')].every((c, i) => c === window.__cards[i]), cards: document.querySelectorAll('.tpl-card2').length,
    rows: [...document.querySelectorAll('.tpl-card2')].map(c => c.querySelector('.tc-name').textContent + ':' + c.querySelector('.tc-dmini').textContent), more: Math.max(...[...document.querySelectorAll('.tc-more')].map(e => e.offsetHeight)),
    days: document.querySelectorAll('.week-plan.mini .wp-day').length, names: Math.max(...[...document.querySelectorAll('.week-plan .wp-t')].map(e => e.offsetHeight)), extra: document.querySelector('.wp-extra').offsetHeight, colored: document.querySelectorAll('.week-plan .wp-day.has').length, showMore: !!document.querySelector('[data-a="tplShowAll"]') }));
  log('Collapsed:', nodes, JSON.stringify(mini));
  if (!mini.same || mini.cards !== 5 || mini.rows[0] !== 'Haut du corps:Lun' || mini.rows[4] !== 'Bras:—' || mini.more > 1 || mini.days !== 7 || mini.names > 1 || mini.extra > 1 || mini.colored !== 4 || mini.showMore) fail('sections repliées en résumé, sans re-rendu');
  await page.evaluate(() => { const s = document.querySelector('.week-plan'); document.querySelector('#v-today').scrollTop = s.offsetTop - 80; }); await wait(300); await shot('06_home_collapsed');
  await page.click('.tpl-card2[data-id="t5"] .tc-head'); await wait(800);
  const re = await page.evaluate(() => ({ open: S.settings.ui.tplOpen, mini: document.querySelector('.tpl-section').classList.contains('mini'), t5: !!document.querySelector('.tpl-card2.open[data-id="t5"]') }));
  log('Reopen on a session:', JSON.stringify(re)); if (!re.open || re.mini || !re.t5) fail('toucher une séance repliée rouvre sur elle');
  await page.click('[data-a="toggleSection"][data-k="planOpen"]'); await wait(700);
  if (!(await page.evaluate(() => document.querySelector('.wp-extra').offsetHeight > 10))) fail('semaine rouverte');

  // 6. suggestions de l'app désactivées : plus de « laisse l'app choisir », « Compléter », programme de la semaine
  const SUG = '#v-today [data-a="customFill"], #v-today [data-a="weekWizard"], #v-today [data-a="todayMode"][data-v="proposal"]';
  const before = await page.evaluate(s => document.querySelectorAll(s).length, SUG);
  await page.click('.tabbtn[data-id="profil"]'); await wait(500);
  await page.click('[data-a="openSessionPrefs"]'); await wait(500);   // Profil › Réglages des séances
  await page.click('.sheet [data-a="toggleAppPicks"]'); await wait(300); await page.evaluate(() => closeSheet()); await wait(400);
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  const after = await page.evaluate(s => ({ n: document.querySelectorAll(s).length, set: S.settings.appPicks }), SUG);
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }] }; save(); renderView('today'); }); await wait(400);
  const built = await page.evaluate(() => document.querySelectorAll('#v-today [data-a="customFill"]').length);
  log('App picks:', before, '→', JSON.stringify(after), '| with exercises:', built);
  if (!before || after.n || after.set !== false || built) fail('suggestions de l\'app désactivables');
  await page.evaluate(() => { S.custom = { exos: [] }; save(); renderView('today'); }); await wait(400); await shot('07_home_no_picks');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
