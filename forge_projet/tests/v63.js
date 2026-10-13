// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Retours iPhone (2) : carte du jour sans « Prête à démarrer » (titre et « Modifier » sur la même ligne), « Annuler » en
// édition, textes alignés ; « Choisir une séance » en trois familles ; maintenir une ligne pour changer l'ordre
// (éditeur et liste du jour) ; éditeur sans textes en trop ; Mon ascension en sous-écrans, pause.
// Retours (3) : en édition, « OK » seul ; « Annuler les modifications » est dans la feuille d'actions de OK ; pause en boutons.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v63'); fs.mkdirSync(OUT, { recursive: true });
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
      templates: [{ id: 'tp', n: 'Pectoraux', days: [wd], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }, { exoId: 'planche', sets: 1 }, { exoId: 'curl_biceps', sets: 3 }] },
        { id: 'tj', n: 'Jambes', days: [(wd + 4) % 7], exos: [{ exoId: 'squat_gobelet', sets: 3 }, { exoId: 'fentes_avant', sets: 3 }, { exoId: 'planche', sets: 1 }] }] })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(900);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const tap = sel => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) throw new Error('absent : ' + sel); el.click(); }, sel);
  // maintenir une ligne puis la glisser (souris : même chemin que le doigt, pointer events)
  const drag = async (rowsSel, from, to) => {
    const r = await page.evaluate(sel => [...document.querySelectorAll(sel)].map(e => { const b = e.getBoundingClientRect(); return [b.left + 110, b.top + b.height / 2]; }), rowsSel);
    const y1 = r[to][1] + (to > from ? 10 : -10);
    await page.mouse.move(r[from][0], r[from][1]); await page.mouse.down(); await wait(400);
    for (let k = 1; k <= 12; k++) { await page.mouse.move(r[from][0], r[from][1] + (y1 - r[from][1]) * k / 12); await wait(20); }
    await page.mouse.up(); await wait(500);
  };

  // 1. carte du jour : pas d'étiquette « Prête à démarrer / Prévu aujourd'hui » ; titre et « Modifier » sur la même ligne ; alignements
  const hero = await page.evaluate(() => { const h = document.querySelector('#v-today .hero'), t = h.querySelector('.hero-title').getBoundingClientRect(), m = h.querySelector('.hero-mod').getBoundingClientRect();
    const x = s => { const e = document.querySelector(s); if (!e) return null; const r = document.createRange(); r.selectNodeContents(e); return Math.round(r.getBoundingClientRect().left); };
    return { eyebrow: !!h.querySelector('.hero-eyebrow'), tag: !!h.querySelector('.hero-tag'), sameLine: Math.abs((t.top + 17) - (m.top + m.height / 2)) < 8, mod: h.querySelector('.hero-mod').textContent,
      date: x('.home-head .eyebrow'), title: x('.home-head .lt'), sec: x('.tpl-section .sec-h span'), name: x('.hero .hl-row .t'), toggle: x('.hero .hl-toggle') }; });
  log('Hero:', JSON.stringify(hero));
  if (hero.eyebrow || hero.tag || !hero.sameLine || hero.mod !== 'Modifier' || hero.date !== hero.sec || hero.title !== hero.sec || hero.toggle !== hero.name) fail('carte du jour : titre et Modifier, textes alignés');
  await shot('01_home');

  // 2. « Modifier » : « OK » à sa place ; glisser une ligne change l'ordre ; OK propose de garder ou d'annuler
  await tap('.hero .hero-mod'); await wait(700);
  const bar = await page.evaluate(() => [...document.querySelectorAll('.hero button.hero-mod, .hero .hero-cancel')].map(b => b.textContent.trim()).join('|'));
  const before = await page.evaluate(() => S.custom.exos.map(e => e.exoId).join(','));
  const hint0 = await page.evaluate(() => (document.querySelector('#v-today .sort-hint') || {}).textContent || '');   // le geste, dit une fois
  await drag('.group.builder > .row', 3, 0);
  const moved = await page.evaluate(() => ({ order: S.custom.exos.map(e => e.exoId).join(','), sheet: !!document.querySelector('#overlay.open'), arrows: document.querySelectorAll('[data-a="customMove"], [data-a="toggleReorder"]').length }));
  await shot('02_dragged');
  await tap('.hero [data-a="heroEdit"]'); await wait(600);
  const ask = await page.evaluate(() => [...document.querySelectorAll('#overlay .as-btn')].map(b => b.textContent.trim()).join('|'));
  await page.evaluate(() => document.querySelector('#overlay .as-cancel').click()); await wait(800);
  const after = await page.evaluate(() => ({ order: S.custom.exos.map(e => e.exoId).join(','), edit: customEdit, go: !!document.querySelector('.hero .hero-go'), tpl: S.templates.find(t => t.id === 'tp').exos.map(e => e.exoId).join(',') }));
  log('Edit:', bar, '| before', before, '→ dragged', JSON.stringify(moved), '| ask', ask, '→', JSON.stringify(after));
  if (hint0) fail('pas d\'astuce à l\'écran pour le geste');
  if (bar !== 'OK' || moved.order !== 'curl_biceps,dc_haltere,pompes,planche' || moved.sheet || moved.arrows) fail('glisser une ligne de la séance du jour');
  if (ask !== "Pour aujourd'hui seulement|Aussi pour les prochaines fois|Annuler les modifications" || after.order !== before || after.edit || !after.go || after.tpl !== before) fail('« Annuler les modifications » revient à la séance d\'avant');
  // sans changement : OK referme sans rien demander
  await tap('.hero .hero-mod'); await wait(600); await tap('.hero [data-a="heroEdit"]'); await wait(600);
  const quiet = await page.evaluate(() => ({ sheet: !!document.querySelector('#overlay.open'), edit: customEdit }));
  if (quiet.sheet || quiet.edit) fail('OK sans changement : pas de question');

  // 3. « Choisir une séance » : trois familles
  await tap('.hero [data-a="chooseSession"]'); await wait(800);
  const cs = await page.evaluate(() => [...document.querySelectorAll('.cs-body .sh')].map(h => h.textContent + ':' + [...h.nextElementSibling.querySelectorAll('.cs-row .t')].map(t => t.textContent).join(',')));
  const sub = await page.evaluate(() => (document.querySelector('.cs-row .s') || {}).textContent);
  log('Choose:', JSON.stringify(cs), sub); await shot('03_choose');
  if (cs.join('|') !== "Mes séances:Jambes|Proposée par l'app:Laisse l'app choisir|Sur le moment:Séance express,Composer moi-même" || !/exercices · ≈ \d+ min/.test(sub || '')) fail('« Choisir une séance » en trois familles');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 4. éditeur de séance : plus de note de planning ni de répartition ; « Ordre » remplacé par le glissement ; l'avertissement de jour pris reste
  await page.evaluate(() => openTplEditor('tj')); await wait(900);
  const ed = await page.evaluate(() => ({ hint: (document.querySelector('#tplEdBody .te-hint') || {}).textContent || '', split: !!document.querySelector('.te-split'), order: !!document.querySelector('[data-a="tplEdOrder"]'),
    sum: (document.querySelector('#tplEdBody .te-sum') || {}).textContent, sortHint: !!document.querySelector('#tplEdBody .sort-hint') }));
  await drag('.te-list > .row', 0, 2);
  const edOrder = await page.evaluate(() => ({ order: tplEdit.exos.map(e => e.exoId).join(','), dirty: tplEdit.dirty, sortHint: !!document.querySelector('#tplEdBody .sort-hint') }));
  await shot('04_editor');
  const taken = await page.evaluate(() => { const wd = (new Date().getDay() + 6) % 7; document.querySelector(`[data-a="tplEdDay"][data-d="${wd}"]`).click(); return (document.querySelector('#tplEdBody .te-hint') || {}).textContent || ''; });
  log('Editor:', JSON.stringify(ed), '→', JSON.stringify(edOrder), '| day taken:', taken);
  if (ed.hint || ed.split || ed.order || !/^3 · 7 séries · ≈ \d+ min$/.test(ed.sum || '') || ed.sortHint) fail('éditeur : seulement le résumé, pas de textes en trop');
  if (edOrder.order !== 'fentes_avant,planche,squat_gobelet' || !edOrder.dirty) fail('éditeur : glisser pour changer l\'ordre');
  if (!/remplacera « Pectoraux »/.test(taken)) fail('éditeur : l\'avertissement d\'un jour déjà pris reste');
  await page.evaluate(() => { tplEdit = null; closeSheet(); }); await wait(500);

  // 5. Mon ascension : la pause a son écran, des boutons (pas d'interrupteurs) ; « Reprendre » l'annule
  await page.evaluate(() => openAscent()); await wait(1500);
  await tap('.asc-row[data-k="pause"]'); await wait(900);
  const pz = await page.evaluate(() => ({ t: document.querySelector('.sheet-hd .t').textContent, sw: [...document.querySelectorAll('#ascSub .switch')].length + ':' + [...document.querySelectorAll('#ascSub .pz-act')].map(b => b.textContent).join(','), foot: (document.querySelector('#ascSub .pz-left') || {}).textContent }));
  await tap('#ascSub .pz-act'); await wait(400);
  const pz2 = await page.evaluate(() => ({ sw: [...document.querySelectorAll('#ascSub .pz-on .t')].map(t => t.textContent).join(','), n: S.ascent.pauses.length }));
  await tap('#ascSub .pz-undo'); await wait(400);
  const pz3 = await page.evaluate(() => S.ascent.pauses.length);
  await shot('05_pause');
  await tap('.sheet-hd [data-a="sheetBack"]'); await wait(1200);
  const row = await page.evaluate(() => document.querySelector('.asc-row[data-k="pause"] .val').textContent);
  log('Pause:', JSON.stringify(pz), JSON.stringify(pz2), pz3, row);
  if (pz.t !== 'Pause' || pz.sw !== '0:Mettre cette semaine en pause,Mettre la semaine prochaine en pause' || pz.foot !== '2 pauses restantes ce trimestre' || pz2.sw !== 'Cette semaine en pause' || pz2.n !== 1 || pz3 !== 0 || row !== 'vacances, maladie') fail('pause : interrupteurs dans son écran');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
