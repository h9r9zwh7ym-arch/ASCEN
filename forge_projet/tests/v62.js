// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Retours sur iPhone : « Mes séances » sans faux repli ; la séance du jour se modifie, puis « OK », puis
// « Commencer » (à « OK », « pour aujourd'hui seulement » ou « aussi pour les prochaines fois ») ; « Mon ascension »
// (bouton i en simple cercle, titres au-dessus des cartes, séparateurs) ; régularité lisible (escalier des paliers,
// semaines datées et nommées) ; fiche exercice en une seule carte à filets.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v62'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  // aujourd'hui : « Pectoraux » est prévue ; historique avec une semaine gelée et une semaine sans séance
  const seed = () => { if (sessionStorage.getItem('s') || localStorage.getItem('__seeded')) return; sessionStorage.setItem('s', 1); localStorage.setItem('__seeded', '1');
    const wd = (new Date().getDay() + 6) % 7, ss = [];
    const add = (k, id) => { const d = new Date(); d.setDate(d.getDate() - k); ss.push({ id, date: d.toLocaleDateString('sv'), durationSec: 2400,
      exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) }, { exoId: 'pompes', sets: [0, 1, 2].map(() => ({ reps: 12, done: true })) }] }); };
    add(22, 'a'); add(20, 'b'); add(8, 'c'); add(6, 'd');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'Yannick' },
      goals: { daysPerWeek: 3 }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: ss,
      templates: [{ id: 'tb', n: 'Bras', days: [(wd + 2) % 7], exos: [{ exoId: 'curl_biceps', sets: 3 }, { exoId: 'pompes', sets: 3 }] },
        { id: 'tp', n: 'Pectoraux', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }, { exoId: 'planche', sets: 1 }] },
        { id: 'tf', n: 'Full body', days: [], exos: [{ exoId: 'squat_gobelet', sets: 3 }] }] })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const tap = sel => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) throw new Error('absent : ' + sel); el.click(); }, sel);
  const tapText = (sel, t) => page.evaluate(([sel, t]) => { const el = [...document.querySelectorAll(sel)].find(e => e.textContent.includes(t)); if (!el) throw new Error('absent : ' + t); el.click(); }, [sel, t]);

  // 1. Mes séances : plus de chevron de section (il ne réduisait rien) ; toutes les cartes détaillées
  const ms = await page.evaluate(() => ({ toggle: document.querySelectorAll('[data-a="toggleSection"]').length, head: (document.querySelector('.tpl-section .sec-h') || {}).textContent,
    cards: document.querySelectorAll('.tpl-card2').length, days: [...document.querySelectorAll('.tpl-card2 .tc-days')].map(e => e.textContent.trim()) }));
  log('Mes séances:', JSON.stringify(ms));
  if (ms.toggle || !/Mes séances\s*3/.test(ms.head || '') || ms.cards !== 3 || ms.days[2] !== 'pas de jour fixe') fail('Mes séances : en-tête simple, cartes détaillées');

  // 2. séance du jour : « Modifier » → ni « Commencer » ni autre choix ; « OK » sans changement → rien n'est demandé
  await tap('.hero .hero-mod'); await wait(600);
  const ed = await page.evaluate(() => ({ ok: document.querySelector('.hero .hero-mod').textContent, go: !!document.querySelector('.hero .hero-go'), alt: !!document.querySelector('.hero .hero-alt'),
    rows: document.querySelectorAll('.group.builder .row').length, save: !!document.querySelector('.save-row') }));
  await shot('01_editing');
  await tap('.hero .hero-mod'); await wait(600);
  const noAsk = await page.evaluate(() => ({ sheet: !!document.querySelector('#overlay.open .as-btn'), go: !!document.querySelector('.hero .hero-go') }));
  log('Edit:', JSON.stringify(ed), '| OK unchanged:', JSON.stringify(noAsk));
  if (ed.ok !== 'OK' || ed.go || ed.alt || ed.rows !== 3 || ed.save || noAsk.sheet || !noAsk.go) fail('en édition : modifier, « OK », puis « Commencer »');
  // retirer un exercice, « OK » → la question ; « Pour aujourd'hui seulement » : Mes séances inchangée
  await tap('.hero .hero-mod'); await wait(600);
  await tap('.group.builder .row:nth-child(3) [data-a="customRemove"]'); await wait(500);
  await tap('.hero .hero-mod'); await wait(600);
  const ask = await page.evaluate(() => ({ btns: [...document.querySelectorAll('#overlay .as-btn')].map(b => b.textContent.trim()), msg: (document.querySelector('#overlay .as-msg') || {}).textContent }));
  await shot('02_ask');
  await tapText('#overlay .as-btn', "Pour aujourd'hui"); await wait(700);
  const today = await page.evaluate(() => ({ eyebrow: (document.querySelector('.hero .hero-tag') || {}).textContent || '', go: !!document.querySelector('.hero .hero-go'),
    tpl: S.templates.find(t => t.id === 'tp').exos.length, custom: S.custom.exos.length }));
  log('Ask:', JSON.stringify(ask), '→', JSON.stringify(today));
  if (ask.btns.join('|') !== "Pour aujourd'hui seulement|Aussi pour les prochaines fois|Continuer à modifier" || !/Pectoraux/.test(ask.msg || '')
    || today.eyebrow !== "Modifiée pour aujourd'hui" || !today.go || today.tpl !== 3 || today.custom !== 2) fail('« Pour aujourd\'hui seulement » ne touche pas Mes séances');
  // la même modification n'est pas redemandée ; un nouveau changement, si : « Aussi pour les prochaines fois » met à jour la séance
  await tap('.hero .hero-mod'); await wait(500); await tap('.hero .hero-mod'); await wait(600);
  const again = await page.evaluate(() => !!document.querySelector('#overlay.open .as-btn'));
  await tap('.hero .hero-mod'); await wait(500);
  await tap('.group.builder [data-a="customSets"][data-d="1"]'); await wait(300);
  await tap('.hero .hero-mod'); await wait(600);
  await tapText('#overlay .as-btn', 'Aussi pour'); await wait(800);
  const saved = await page.evaluate(() => ({ tpl: JSON.stringify(S.templates.find(t => t.id === 'tp').exos.map(e => [e.exoId, e.sets])), eyebrow: (document.querySelector('.hero .hero-tag') || {}).textContent || '',
    picts: document.querySelectorAll('.tpl-card2[data-id="tp"] .tc-picts > *').length }));
  log('Asked again without change:', again, '| saved:', JSON.stringify(saved));
  if (again || saved.tpl !== '[["dc_haltere",4],["pompes",3]]' || saved.eyebrow === "Modifiée pour aujourd'hui" || saved.picts !== 2) fail('« Aussi pour les prochaines fois » met à jour Mes séances');

  // 3. Mon ascension, épurée : bouton i en simple cercle ; la scène, le prochain objectif, cette semaine, une liste
  await page.evaluate(() => openAscent()); await wait(1500);
  const asc = await page.evaluate(() => { const how = document.querySelector('#overlay .tr-how'), cs = getComputedStyle(how);
    const seps = [...document.querySelectorAll('.asc-rows .asc-row + .asc-row')].map(r => getComputedStyle(r, '::before').height);
    return { bg: cs.backgroundColor, ring: cs.boxShadow, next: (document.querySelector('#ascSteps .an-row') || {}).textContent, bar: !!document.querySelector('#ascSteps .exp-track'),
      weekHead: !!document.querySelector('.asc-week > .aw-hd'), weekCard: !!document.querySelector('.asc-week > .asc-card .aw-msg'), pauseInWeek: !!document.querySelector('#ascWeek [data-a="ascPause"], #ascWeek .aw-pause'),
      rows: [...document.querySelectorAll('.asc-row .t')].map(t => t.textContent).join('|'), seps: seps.length, sepH: seps[0], accordions: document.querySelectorAll('.asc-clp, .st-list').length }; });
  log('Ascent:', JSON.stringify(asc));
  if (!/rgba\(0, 0, 0, 0\)|transparent/.test(asc.bg) || !/inset/.test(asc.ring) || !/Camp 2 · .*58 m|Camp 2 · .*m/.test(asc.next || '') || !asc.bar || !asc.weekHead || !asc.weekCard || asc.pauseInWeek
    || asc.rows !== 'Vitesse|Étapes|Itinéraire|Carnet de route|Trophées|Pause' || asc.seps !== 5 || asc.sepH !== '0.5px' || asc.accordions) fail('Mon ascension épurée : objectif, semaine, liste');
  await shot('03_ascent');

  // 4. Vitesse (sous-écran) : un chiffre, les facteurs, puis la régularité (escalier, prochain palier, semaines datées)
  await tap('.asc-row[data-k="speed"]'); await wait(900);
  const rg = await page.evaluate(() => { const steps = [...document.querySelectorAll('#ascSub .rg-step')];
    return { title: document.querySelector('.sheet-hd .t').textContent, back: !!document.querySelector('.sheet-hd [data-a="sheetBack"]'), hero: (document.querySelector('#ascSub .sp-hero b') || {}).textContent,
      factors: [...document.querySelectorAll('#ascSub .fx-r > span')].map(e => e.firstChild.textContent.trim()), steps: steps.length, cur: steps.findIndex(s => s.classList.contains('cur')),
      rising: steps.every((s, i) => !i || s.querySelector('i').offsetHeight > steps[i - 1].querySelector('i').offsetHeight), cap: (document.querySelector('#ascSub .rg-cap') || {}).textContent,
      note: (document.querySelector('#ascSub .note') || {}).textContent, weeks: [...document.querySelectorAll('#ascSub .rg-weeks .rg-w')].map(w => w.className.replace('rg-w ', '') + ':' + w.querySelector('small').textContent),
      icons: [...document.querySelectorAll('#ascSub .rg-weeks .rg-w:not(.cur) i svg')].length, legend: [...document.querySelectorAll('#ascSub .rg-legend .rg-w')].map(w => w.className.replace('rg-w ', '')) }; });
  log('Vitesse:', JSON.stringify(rg));
  const lastW = rg.weeks[rg.weeks.length - 1] || '';
  if (rg.title !== 'Vitesse de montée' || !rg.back || !/^\+\d+\s?m$/.test(rg.hero || '') || rg.factors[0] !== 'Effort' || !rg.factors.includes('Régularité') || rg.factors.includes('Par séance')
    || rg.steps !== 6 || rg.cur !== 0 || !rg.rising || !/×1 = vitesse normale/.test(rg.cap || '') || !/Encore 2 semaines à 3 séances pour passer à ×1/.test(rg.note || '')
    || lastW !== 'cur:en cours' || !rg.weeks.some(w => /^frozen:\d+ \S+/.test(w)) || rg.icons !== rg.weeks.length - 1 || rg.legend.join() !== 'frozen,empty') fail('vitesse et régularité lisibles');
  await shot('04_speed');
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(1200);
  const backOk = await page.evaluate(() => !!document.querySelector('#ascScene') && !document.querySelector('#ascSub'));
  if (!backOk) fail('retour à Mon ascension');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 5. fiche exercice : une seule carte (conseil, puis historique ou « Première fois »)
  const fiche = async id => { await page.evaluate(id => { closeSheet(); ACT.showExoInfo({ id }); }, id); await wait(900);
    return page.evaluate(() => { const f = document.querySelector('#overlay .exo-facts');
      return { rows: f ? f.querySelectorAll('.ef-row').length : 0, first: [...(f ? f.querySelectorAll('.ef-row:first-child b') : [])].map(b => b.textContent),
        note: f && f.querySelector('.ef-note') ? f.querySelector('.ef-note').textContent.trim() : '', old: document.querySelectorAll('#overlay .first-time, #overlay .stat-strip').length,
        cards: f ? [...f.querySelectorAll('.ef-row > div')].filter(d => getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)').length : -1 }; }); };
  const done = await fiche('dc_haltere'); await shot('05_fiche_done');
  const fresh = await fiche('ecarte_couche'); await shot('06_fiche_new');
  log('Fiche:', JSON.stringify(done), JSON.stringify(fresh));
  if (done.rows !== 2 || done.first[2] !== '2 côtés' || done.note || done.old || done.cards || fresh.rows !== 1 || !/^Première fois/.test(fresh.note) || fresh.old) fail('fiche : une seule carte à filets');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
