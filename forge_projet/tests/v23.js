// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = OUT_ROOT + '/v23'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const log = (...a) => console.log(...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  const file = 'file://' + path.resolve(process.argv[2]);
  // 1) migration d'un état v2.1 (banc, barre, élastiques en kg)
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { bench: true, barbell: true, bands: true, dumbbells: true }, weights: { bands: [5, 10, 20], dumbbells: [10] } },
    sessions: [{ id: 'a', date: '2026-07-10', source: 'custom', completedAt: '2026-07-10T10:00:00Z', exos: [{ exoId: 'planche', sets: [{ reps: 60, done: true }] }, { exoId: 'pompes', sets: [{ reps: 10, done: true }] }, { exoId: 'tirage_elastique', sets: [{ reps: 15, weight: 20, done: true }, { reps: 15, weight: 10, done: true }] }] },
               { id: 'b', date: '2026-08-12', source: 'custom', completedAt: '2026-08-12T10:00:00Z', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] },
               { id: 'c', date: '2026-08-20', source: 'custom', completedAt: '2026-08-20T10:00:00Z', exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }] })); });
  await page.goto(file); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await wait(400);
  const mig = await page.evaluate(() => ({ inc: S.equipment.owned.bench_incline, rack: S.equipment.owned.rack, bands: S.equipment.weights.bands, body: S.body, reps: sessionReps(S.sessions[0]), bandSets: S.sessions[0].exos[2].sets.map(x => x.weight) }));
  log('Migration:', JSON.stringify(mig));
  if (!mig.inc || !mig.rack) fail('migration banc/rack'); if (JSON.stringify(mig.bands) !== '[1,3,5]') fail('migration élastiques');
  if (JSON.stringify(mig.bandSets) !== '[5,3]') fail('migration séries élastique');
  if (mig.reps !== 40) fail('sessionReps compte les secondes'); if (!Array.isArray(mig.body)) fail('body');
  // 2) historique : écart mensuel + note
  await page.click('.tab[data-tab="history"], [data-a="tab"][data-v="history"]').catch(() => page.evaluate(() => switchTab('history'))); await wait(500);
  const md = await page.$$eval('.sh-sub .md', els => els.map(e => e.textContent));
  log('Month deltas:', JSON.stringify(md));
  if (!md.some(t => /\+1 vs juil/.test(t))) fail('écart mensuel');
  await page.click('[data-a="openSessionDetail"][data-id="c"]'); await wait(500);
  await page.fill('.sheet-body .note-in', 'Épaule un peu raide, rien de grave'); await page.locator('.sheet-body .note-in').blur(); await wait(200);
  await shot('01_detail_note');
  await page.evaluate(() => ACT.closesheet ? ACT.closesheet() : closeSheet()); await wait(600);
  const note = await page.evaluate(() => { persistNow(); const st = JSON.parse(localStorage.getItem('forge.v1')); return (st.zs ? st.zs.map(unpackSession) : st.sessions).find(s => s.id === 'c').note; });
  log('Note saved:', note); if (!/Épaule/.test(note || '')) fail('note non enregistrée');
  log('Note in list:', await page.$eval('.hn', e => e.textContent).catch(() => null));
  await shot('02_history');
  // 3) poids du corps
  await page.evaluate(() => switchTab('profil')); await wait(500);
  await page.click('[data-a="openBody"]'); await wait(500); await shot('03_body_empty');
  await page.fill('#bodyIn', '72,4'); await page.click('[data-a="bodyAdd"]'); await wait(300); log('after add:', await page.evaluate(() => JSON.stringify(S.body)), await page.$eval('#toast, .toast', e => e.textContent).catch(() => '-'));
  await page.evaluate(() => { const t = todayISO(); S.body = [{ d: addDaysISO(t, -40), kg: 74 }, { d: addDaysISO(t, -33), kg: 73.6 }, { d: addDaysISO(t, -10), kg: 72.9 }].concat(S.body); refreshBody(); });
  await wait(300); await shot('04_body_chart');
  const body = await page.evaluate(() => ({ n: S.body.length, last: S.body[S.body.length - 1].kg, trend: bodyTrend(), chart: !!document.querySelector('#bodyBody .linechart') }));
  log('Body:', JSON.stringify(body));
  if (body.last !== 72.4 || !body.chart || body.trend == null || body.trend >= 0) fail('poids du corps');
  await page.fill('#bodyIn', '999'); await page.click('[data-a="bodyAdd"]'); await wait(200);
  if ((await page.evaluate(() => S.body.length)) !== 4) fail('validation poids');
  await page.click('[data-a="bodyDel"]'); await wait(200);
  if ((await page.evaluate(() => S.body.length)) !== 3) fail('suppression pesée');
  await page.evaluate(() => closeSheet()); await wait(600);
  log('Profil row:', await page.$eval('[data-a="openBody"] .s', e => e.textContent));
  // 4) niveau + nombre d'exercices
  await page.evaluate(() => { S.settings.todayTab = 'engine'; S.goals.level = 'debutant'; S.goals.exoCount = 7; regenerateDraft(); save(); });
  const gen = await page.evaluate(() => ({ n: S.draft.exos.length, lvl3: S.draft.exos.filter(e => EXO_MAP[e.exoId].level === 3).length, noRack: S.draft.exos.every(e => hasEquip(S.equipment, EXO_MAP[e.exoId].equip)) }));
  log('Generation debutant/7:', JSON.stringify(gen));
  if (gen.lvl3 || !gen.noRack) fail('génération niveau/matériel');
  await page.evaluate(() => switchTab('today')); await wait(600); await shot('05_today');
  // 5) célébration avec note
  await page.evaluate(() => { const d = S.draft; d.startedAt = new Date(Date.now() - 600000).toISOString(); d.exos[0].sets.forEach(s => { s.done = true; s.reps = s.reps || 8; }); save(); finalizeSession(); });
  await wait(1500);
  const hasNote = !!(await page.$('.cel [data-a="celNote"]')); await shot('06a_celebration'); await page.click('.cel [data-a="celNote"]'); await wait(350); log('Celebration note field:', hasNote); if (!hasNote) fail('note célébration');
  await page.fill('.cel .note-in', 'Bonne énergie'); await page.locator('.cel .note-in').blur(); await wait(200); await shot('06_celebration');
  const last = await page.evaluate(() => S.sessions[S.sessions.length - 1].note); log('Celebration note:', last); if (last !== 'Bonne énergie') fail('note fin de séance');
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
