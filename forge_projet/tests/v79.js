// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.12.4 : Rewind proposé sur l'accueil — sous la séance du jour, avant le rappel de sauvegarde, 10 jours
// pour celui du mois, et celui de l'année écoulée pendant les deux premières semaines de janvier.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v79'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { todayTab: 'proposal' } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);
  // un jour donné : historique de l'année passée (8 séances, dont 3 en décembre), sauvegarde en retard
  const at = (day) => page.evaluate((day) => {
    window.todayISO = () => day; S.meta.recapSeen = null; S.meta.recapSeenY = null;
    S.sessions = ['2026-03-04', '2026-05-12', '2026-07-20', '2026-09-02', '2026-11-15', '2026-12-03', '2026-12-10', '2026-12-17']
      .map((d, i) => ({ id: 'r' + i, date: d, exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }));
    S.meta.lastBackup = '2026-09-01'; S.meta.backupSessions = 0; delete S.meta.backupSnooze;
    sessionTouched(); save(); switchTab('today'); renderView('today'); }, day);
  const state = () => page.evaluate(() => { const n = document.querySelector('#v-today .rc-nudge'), card = document.querySelector('#v-today .hero'), week = document.querySelector('#v-today .week-card, #v-today [class*="week"]');
    return { t: n ? n.querySelector('.t').textContent : '', kind: n ? n.querySelector('[data-a="openRewind"]').dataset.kind : '',
      underHero: !!(n && card && (card.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)), beforeWeek: !!(n && week && (n.compareDocumentPosition(week) & Node.DOCUMENT_POSITION_FOLLOWING)),
      backup: !!document.querySelector('#v-today .backup-nudge:not(.rc-nudge)') }; });

  // 1. 5 janvier : le Rewind de l'année, sous la séance du jour, la sauvegarde attend
  await at('2027-01-05'); await page.waitForTimeout(500);
  const y = await state(); await page.screenshot({ path: path.join(OUT, 'year.png') });
  log('5 janv. :', JSON.stringify(y));
  if (y.kind !== 'year' || !/Rewind 2026 est prêt/.test(y.t) || !y.underHero || y.backup) fail('Rewind de l\'année proposé en janvier, avant la sauvegarde');
  // « Plus tard » : celui de décembre prend la suite
  await page.click('#v-today .rc-nudge .later'); await page.waitForTimeout(600);
  const m = await state(); log('Après « Plus tard » :', JSON.stringify(m));
  if (m.kind !== 'month' || !/Rewind de décembre/.test(m.t)) fail('puis le Rewind du mois');
  // « Lancer » : il disparaît, la sauvegarde revient
  await page.click('#v-today .rc-nudge [data-a="openRewind"]'); await page.waitForTimeout(900);
  await page.evaluate(() => { const x = document.querySelector('#rewind [data-a="rwClose"]'); if (x) x.click(); }); await page.waitForTimeout(700);
  await page.evaluate(() => renderView('today')); await page.waitForTimeout(400);
  const g = await state(); log('Après « Lancer » :', JSON.stringify(g));
  if (g.t || !g.backup) fail('lancé : le Rewind disparaît, la sauvegarde revient');

  // 2. 9 février : le Rewind de janvier (10 jours) ; 11 février : plus rien
  await page.evaluate(() => { S.sessions.push({ id: 'j1', date: '2027-01-08', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }, { id: 'j2', date: '2027-01-20', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }); sessionTouched(); });
  await page.evaluate(() => { window.todayISO = () => '2027-02-09'; S.meta.recapSeen = null; save(); renderView('today'); }); await page.waitForTimeout(400);
  const f9 = await state();
  await page.evaluate(() => { window.todayISO = () => '2027-02-11'; renderView('today'); }); await page.waitForTimeout(400);
  const f11 = await state(); log('9 févr. :', f9.t, '| 11 févr. :', f11.t || '—');
  if (!/Rewind de janvier/.test(f9.t) || f11.t) fail('Rewind du mois proposé pendant 10 jours');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
