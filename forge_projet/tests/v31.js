// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.2 : une seule façon de créer une séance (Ma séance → Enregistrer, facultatif), plus d'export
// Calendrier, bulle des graphiques dans le graphique, reprise après arrière-plan, pas de zoom au double appui
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v31'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: true, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const d = new Date(); d.setDate(d.getDate() - 30); const iso = d.toISOString().slice(0, 10);
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { todayTab: 'custom' }, equipment: { owned: { dumbbells: true, bench: true } },
      sessions: [{ id: 's1', date: iso, durationSec: 1500, exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }, { reps: 10, done: true }] }] }] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);

  // 1. un seul point de création : la carte « Compose ta séance »
  const create = await page.$$eval('#v-today [data-a="tplNew"], #v-today .sec-add', e => e.length);
  const wizardOnly = await page.$$eval('#v-today .tpl-add, #v-today .tpl-empty .btn', e => e.map(x => x.dataset.a));
  log('Create buttons besides compose:', create, '| other actions:', wizardOnly.join(','));
  if (create || wizardOnly.some(a => a !== 'weekWizard')) fail('une seule façon de créer une séance');
  await shot('01_compose');
  // 2. composer, puis choisir de l'enregistrer (facultatif) avec un jour → planning
  await page.click('[data-a="customFill"]'); await wait(500);
  const row = await page.$eval('.save-row', e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null); log('Save row:', row);
  if (!/Enregistrer cette séance/.test(row || '') || !/Facultatif/.test(row || '')) fail('ligne « Enregistrer cette séance » facultative');
  await page.$eval('.save-row', e => e.scrollIntoView({ block: 'center' })); await wait(200); await shot('02_composed');
  await page.click('.save-row'); await wait(500);
  const title = await page.textContent('.te-hd .t'); const editable = !!(await page.$('[data-a="tplEdAdd"]'));
  log('Save sheet:', title, '| exercise editing:', editable); if (title !== 'Enregistrer la séance' || editable) fail('feuille d\'enregistrement légère');
  await page.fill('#tplEdName', 'Haut rapide'); await page.click('[data-a="tplEdDay"][data-d="2"]'); await wait(150);
  await shot('03_save_sheet');
  await page.click('#tplEdSaveBtn'); await wait(700);
  const saved = await page.evaluate(() => ({ t: S.templates.map(t => t.n + ':' + t.days.join('')), linked: !!S.custom.tplId }));
  const row2 = await page.$eval('.save-row', e => e.textContent.replace(/\s+/g, ' ').trim()); log('Saved:', JSON.stringify(saved), '| row:', row2);
  if (saved.t.join() !== 'Haut rapide:2' || !saved.linked || !/Enregistrée/.test(row2) || !/Mer/.test(row2)) fail('séance enregistrée et planifiée');
  // 3. sans l'enregistrer : on peut commencer directement, rien n'est ajouté à Mes séances
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 3 }] }; save(); renderView('today'); }); await wait(300);
  await page.click('.save-row'); await wait(400); await page.click('[data-a="tplEdCancel"]'); await wait(400);
  const noModal = !(await page.$('[data-a="tplEdDiscard"]')); const still = await page.evaluate(() => S.templates.length + ':' + S.custom.exos.length);
  log('Cancel save sheet: no modal', noModal, '| templates:exos', still); if (!noModal || still !== '1:1') fail('ne pas enregistrer : rien ne change');
  // 4. planning : « Composer une séance pour le … » passe par Ma séance, jour retenu
  await page.evaluate(() => { S.custom = { exos: [] }; save(); renderView('today'); const b = document.querySelector('.wp-day[data-d="5"]'); b.scrollIntoView({ block: 'center' }); b.click(); }); await wait(500);
  const planBtn = await page.textContent('[data-a="planNew"]'); log('Plan day button:', planBtn.trim());
  await page.click('[data-a="planNew"]'); await wait(700);
  const pend = await page.evaluate(() => ({ days: S.custom.pendingDays, tab: S.settings.todayTab, n: S.custom.exos.length }));
  const be = await page.$eval('.hero.compose .hero-sub, .be-s', e => e.textContent).catch(() => ''); log('Plan new:', JSON.stringify(pend), '|', be);
  if (!/Composer/.test(planBtn) || String(pend.days) !== '5' || !/samedi/.test(be)) fail('composer pour un jour');
  await page.click('[data-a="customFill"]'); await wait(500);
  const row3 = await page.$eval('.save-row', e => e.textContent); await page.click('.save-row'); await wait(500);
  const pre = await page.$$eval('[data-a="tplEdDay"].on', e => e.map(x => x.dataset.d).join()); log('Pending row:', /samedi/.test(row3), '| pre-checked:', pre);
  if (!/samedi/.test(row3) || pre !== '5') fail('jour pré-coché à l\'enregistrement');
  await page.click('#tplEdSaveBtn'); await wait(700);
  // 5. plus d'export Calendrier
  const cal = await page.evaluate(() => !!document.querySelector('[data-a="openCalendarExport"]') || typeof buildICS !== 'undefined');
  log('Calendar export present:', cal); if (cal) fail('export Calendrier retiré');
  // 6. bulle des graphiques : dans le graphique, jamais sur le titre et les onglets au-dessus
  await page.evaluate(() => switchTab('history')); await wait(700);
  const tips = [];
  for (const i of [0, 7, 11]) {
    await page.evaluate(i => { const c = document.querySelectorAll('#v-history .cc-col')[i]; c.scrollIntoView({ block: 'center' }); }, i); await wait(450);
    const b = await page.evaluate(i => { const c = document.querySelectorAll('#v-history .cc-col')[i]; const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.bottom - 6]; }, i);
    await page.touchscreen.tap(b[0], b[1]); await wait(250);
    tips.push(await page.evaluate(() => { const t = document.getElementById('charttip').getBoundingClientRect(), p = document.querySelector('#v-history .cc-plot').getBoundingClientRect(); return { top: Math.round(t.top), plot: Math.round(p.top), inPlot: t.top >= p.top - 5 && t.bottom <= p.bottom + 5 }; }));
    if (i === 0) await shot('04_chart_tip');
  }
  log('Chart tips:', JSON.stringify(tips)); if (tips.some(t => !t.inPlot)) fail('bulle dans le graphique');
  // 7. pas de zoom au double appui
  const zoom = await page.evaluate(() => ({ btn: getComputedStyle(document.querySelector('.tabbtn')).touchAction, vp: document.querySelector('meta[name=viewport]').content }));
  log('Double-tap zoom:', JSON.stringify(zoom)); if (zoom.btn !== 'manipulation' || !/maximum-scale=1/.test(zoom.vp)) fail('pas de zoom au double appui');
  // 8. arrière-plan → retour : feuille en cours de glissé remise en place (jamais fermée)
  await page.evaluate(() => switchTab('today')); await wait(400);
  await page.evaluate(() => ACT.tplOpenEditor({ id: S.templates[0].id }));
  await page.waitForSelector('#overlay.show .sheet', { timeout: 5000 }); await wait(900); // feuille ouverte et posée
  const sheetKept = await page.evaluate(async () => {
    const g = document.querySelector('.sheet .sheet-grab') || document.querySelector('.sheet .sheet-hd'); const r = g.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 5;
    let touch = true; try { new Touch({ identifier: 1, target: g, clientX: x, clientY: y }); } catch (e) { touch = false; } // WebKit : pas de constructeur Touch → souris
    const T = (yy) => new Touch({ identifier: 1, target: g, clientX: x, clientY: yy });
    if (touch) g.dispatchEvent(new TouchEvent('touchstart', { touches: [T(y)], changedTouches: [T(y)], bubbles: true }));
    else g.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true }));
    for (const dy of [20, 120, 320]) touch ? g.dispatchEvent(new TouchEvent('touchmove', { touches: [T(y + dy)], changedTouches: [T(y + dy)], bubbles: true, cancelable: true }))
      : document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y + dy, bubbles: true, cancelable: true }));
    const moved = document.querySelector('.sheet').style.transform;
    document.dispatchEvent(new Event('visibilitychange')); appSuspend();
    await new Promise(r => setTimeout(r, 400));
    return { moved, open: document.querySelector('#overlay').classList.contains('show'), transform: document.querySelector('.sheet').style.transform };
  });
  log('Sheet drag interrupted:', JSON.stringify(sheetKept)); if (!/translateY/.test(sheetKept.moved) || !sheetKept.open || sheetKept.transform) fail('feuille remise en place après interruption ' + JSON.stringify(sheetKept));
  await page.evaluate(() => closeSheet()); await wait(400);
  // 9. carte d'exercice glissée puis interrompue : même exercice
  await page.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 2 }, { exoId: 'squat_pdc', sets: 2 }] }; ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(700);
  const swipe = await page.evaluate(async () => {
    const c = document.querySelector('.focus-card'), r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 60, idx = liveFocusIdx;
    const P = (t, xx) => c.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: xx, clientY: y, bubbles: true, isPrimary: true, pointerType: 'touch' }));
    P('pointerdown', x); P('pointermove', x - 40); P('pointermove', x - 160);
    const moved = c.style.transform; appSuspend();
    await new Promise(r => setTimeout(r, 500));
    return { moved: !!moved, same: liveFocusIdx === idx, transform: (document.querySelector('.focus-card') || {}).style.transform };
  });
  log('Card swipe interrupted:', JSON.stringify(swipe)); if (!swipe.moved || !swipe.same || swipe.transform) fail('carte remise en place après interruption');
  // 10. repos terminé pendant l'absence : on avance, sans sonnerie en retard
  const rest = await page.evaluate(() => { const played = []; const o = SFX.restEnd; SFX.restEnd = () => played.push(1);
    startRestTimer(30, 'Repos', liveFocusIdx); restState.endAt = Date.now() - 20000; tickRest(); SFX.restEnd = o;
    return { toast: document.getElementById('toast').textContent, played: played.length, over: !restState }; });
  log('Late rest end:', JSON.stringify(rest)); if (!/Repos terminé/.test(rest.toast) || rest.played || !rest.over) fail('fin de repos en retard silencieuse');
  // 11. son : contexte suspendu en arrière-plan, neuf au premier geste après une longue absence
  const audio = await page.evaluate(async () => {
    if (!AC) { document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
    if (!AC) return { skipped: true };
    const before = AC;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 150));
    const hiddenState = AC.state; let silent = true; const o = SFX.set; SFX.set = () => { silent = false; }; sfx('set'); SFX.set = o;
    audioHiddenAt = Date.now() - 60000;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return { hiddenState, silent, fresh: AC !== before };
  });
  log('Audio across background:', JSON.stringify(audio));
  if (!audio.skipped && (audio.hiddenState === 'running' || !audio.silent || !audio.fresh)) fail('audio repris proprement');
  await page.evaluate(() => { S.draft = null; stopRestTimer(); save(); renderView('today'); }); await wait(300);
  // 12. retour le lendemain : la séance prévue du jour s'affiche, l'écran est redessiné
  const day = await page.evaluate(() => {
    const wd = weekdayIdx(todayISO()); S.templates.forEach(t => { t.days = t.days.filter(d => d !== wd); });
    S.templates.push({ id: 'tomorrow', n: 'Prévue aujourd\'hui', days: [wd], exos: [{ exoId: 'pompes', sets: 3 }], since: todayISO() });
    S.custom = { exos: [], planDate: '2000-01-01' }; save();
    appDay = '2000-01-01'; appAway = true; appResume();
    return { custom: S.custom.tplId, shown: (document.querySelector('#v-today .hero-title') || {}).textContent };
  });
  log('Next-day resume:', JSON.stringify(day)); if (day.custom !== 'tomorrow' || !/Prévue/.test(day.shown || '')) fail('écran du jour à jour au retour');
  await shot('05_next_day');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
