// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.1 : étirements — réglage, bloc « retour au calme » en fin de séance proposée, stats et historique
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v30'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png`, fullPage: false });
  const fail = m => errors.push('ASSERT: ' + m);
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, settings: { todayTab: 'proposal' }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: [] })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);
  const cool = () => page.evaluate(() => ({ n: S.draft.exos.length, cool: S.draft.exos.filter(isStretchEntry).map(e => e.exoId), lastIsCool: isStretchEntry(S.draft.exos[S.draft.exos.length - 1]), coolAtEnd: S.draft.exos.findIndex(isStretchEntry) < 0 || S.draft.exos.slice(S.draft.exos.findIndex(isStretchEntry)).every(isStretchEntry) }));
  let c = await cool(); log('Default (off):', JSON.stringify(c)); if (c.cool.length) fail('pas d\'étirement par défaut');
  // 1. activer dans le Profil
  await page.evaluate(() => switchTab('profil')); await wait(500);
  await page.click('[data-a="toggleStretching"]'); await wait(400);
  c = await cool(); log('After enabling:', JSON.stringify(c));
  if (c.cool.length < 2 || c.cool.length > 3 || !c.lastIsCool || !c.coolAtEnd) fail('bloc d\'étirements en fin de séance proposée');
  const main0 = c.n - c.cool.length;
  await page.evaluate(() => switchTab('today')); await wait(700);
  const section = await page.$eval('.cool-h', e => e.textContent.trim()).catch(() => null); log('Section:', section);
  if (!/retour au calme/.test(section || '')) fail('section « retour au calme » affichée');
  const shown = await page.$eval('.exo-count .mini-step span', e => +e.textContent); if (shown !== main0) fail('compteur = exercices de force seulement');
  await page.evaluate(() => { const s = document.querySelector('.cool-h'); if (s) s.scrollIntoView({ block: 'center' }); }); await wait(300); await shot('01_proposal_cool');
  // 2. « + » ajoute un exercice de force AVANT les étirements
  await page.click('.exo-count [data-a="draftCount"][data-d="1"]'); await wait(400);
  c = await cool(); log('After +1:', JSON.stringify(c)); if (c.n - c.cool.length !== main0 + 1 || !c.coolAtEnd) fail('ajout avant le bloc d\'étirements');
  // 3. séance faite : étirements gardés à part, hors séries et volume
  await page.evaluate(() => { S.draft.startedAt = new Date(Date.now() - 1800e3).toISOString(); S.draft.exos.forEach(ex => ex.sets.forEach(s => { s.done = true; })); finalizeSession(); }); await wait(900);
  const saved = await page.evaluate(() => { const s = S.sessions[S.sessions.length - 1]; return { exosHaveStretch: s.exos.some(isStretchEntry), stretches: (s.stretches || []).length, sec: (s.stretches || []).every(x => x.sec > 0), sets: sessionSetCount(s), expected: s.exos.reduce((t, e) => t + e.sets.length, 0) }; });
  log('Saved session:', JSON.stringify(saved)); if (saved.exosHaveStretch || saved.stretches < 2 || !saved.sec || saved.sets !== saved.expected) fail('séance enregistrée : étirements à part');
  await page.evaluate(() => closeSheet()); await wait(300);
  // 4. rechargement (format compact) : les étirements sont toujours là
  await wait(1200); await page.evaluate(() => persistNow()); await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);
  const after = await page.evaluate(() => (S.sessions[S.sessions.length - 1].stretches || []).length); log('After reload:', after); if (after !== saved.stretches) fail('étirements conservés après rechargement');
  await page.evaluate(() => { const s = S.sessions[S.sessions.length - 1]; ACT.openSessionDetail({ id: s.id }); }); await wait(700);
  const detail = await page.$$eval('#overlay .cool-group .row', e => e.length); log('History detail stretch rows:', detail); if (detail !== saved.stretches) fail('étirements dans le détail de la séance');
  await shot('02_history_detail'); await page.evaluate(() => closeSheet()); await wait(400);
  // 5. catégorie « Étirements » dans le sélecteur
  await page.evaluate(() => openPicker({ title: 'Choisir', multi: true, onDone: () => {} })); await wait(700);
  const cat = await page.$$eval('.pick-h', e => e.map(x => x.textContent.trim()).filter(t => /Étirements/.test(t)).length); log('Picker stretch category:', cat); if (!cat) fail('catégorie Étirements dans le sélecteur');
  await page.evaluate(() => closeSheet()); await wait(400);
  // 6. désactiver : plus d'étirements dans la proposition
  await page.evaluate(() => { S.draft = null; switchTab('profil'); }); await wait(400);
  await page.click('[data-a="toggleStretching"]'); await wait(300);
  await page.evaluate(() => { getOrCreateDraft(); }); c = await cool(); log('After disabling:', JSON.stringify(c)); if (c.cool.length) fail('désactivé : pas d\'étirements');
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
