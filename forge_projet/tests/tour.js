// Tour visuel : captures de tous les écrans principaux (clair ou DARK=1), rassemblées dans OUT_DIR/tour
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(process.env.OUT_DIR || path.join(__dirname, 'out'), 'tour' + (process.env.DARK ? '_dark' : '')); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: process.env.DARK ? 'dark' : 'light', hasTouch: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    const ids = ['dc_haltere', 'rowing_uni_haltere', 'squat_gobelet', 'curl_biceps', 'planche', 'pompes', 'fentes_avant', 'elevations_laterales']; const ss = [];
    for (let k = 120; k >= 2; k -= 2) { if (k % 7 === 0) continue; const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toISOString().slice(0, 10), startedAt: d.toISOString(), durationSec: 2400 + (k % 5) * 300, note: k === 4 ? 'Bonne énergie' : undefined,
        exos: ids.filter((_, i) => (i + k) % 3 !== 0).slice(0, 5).map(id => ({ exoId: id, sets: [0, 1, 2].map(j => ({ reps: id === 'planche' ? 40 + (120 - k) / 4 : 8 + ((k + j) % 4), weight: /haltere|gobelet|curl|fentes|elevations/.test(id) ? 6 + Math.floor((120 - k) / 20) * 2 : undefined, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick', why: 'Être en forme pour la rando d\'été' },
      equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true }, weights: { dumbbells: [4, 6, 8, 10, 12, 14, 16] } }, sessions: ss,
      targets: [{ id: 't1', exoId: 'pompes', kind: 'reps', value: 20, start: ss[0].date }], challenges: [{ id: 'reps1000', start: ss[ss.length - 3].date }],
      templates: [{ id: 'tp1', n: 'Haut du corps', days: [1, 4], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'rowing_uni_haltere', sets: 3 }] }] })); });
  await page.goto('file://' + path.resolve(process.argv[2])); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(1200);
  let n = 0; const shot = async (name, full) => { n++; await page.waitForTimeout(700); await page.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}_${name}.png`, fullPage: false }); };
  const scroll = async y => { await page.evaluate(y => { const v = document.querySelector('.view.active'); v.scrollTop = y; }, y); await page.waitForTimeout(350); };
  const ev = f => page.evaluate(f);
  await shot('today'); await scroll(700); await shot('today_2'); await scroll(1400); await shot('today_3'); await scroll(0);
  await ev(() => { const b = document.querySelector('[data-a="todayMode"][data-v="proposal"]'); b && b.click(); }); await scroll(560); await shot('today_proposal'); await scroll(0);
  await ev(() => ACT.showExoInfo({ id: 'dc_haltere' })); await shot('exo_sheet'); await ev(() => { const s = document.querySelector('.sheet-body'); s.scrollTop = 600; }); await shot('exo_sheet_2'); await ev(() => closeSheet());
  await ev(() => openPicker({ title: 'Choisir des exercices', multi: true, onDone: () => {} })); await shot('picker'); await ev(() => closeSheet());
  await page.click('.tabbtn[data-id="history"]'); await shot('history'); await scroll(700); await shot('history_2'); await scroll(0);
  await ev(() => ACT.openSessionDetail({ id: S.sessions[S.sessions.length - 1].id })); await shot('session_detail'); await ev(() => closeSheet());
  await page.click('.tabbtn[data-id="progress"]'); await shot('progress'); await scroll(750); await shot('progress_2'); await scroll(1500); await shot('progress_3'); await scroll(2300); await shot('progress_4'); await scroll(0);
  await ev(() => ACT.progressTab({ v: 'exos' })); await shot('progress_exos');
  await ev(() => ACT.openExoChart({ id: 'dc_haltere' })); await shot('exo_chart'); await ev(() => closeSheet());
  await ev(() => ACT.progressTab({ v: 'medals' })); await page.waitForTimeout(1500); await shot('medals'); await ev(() => ACT.progressTab({ v: 'overview' }));
  await page.click('.tabbtn[data-id="profil"]'); await shot('profil'); await scroll(700); await shot('profil_2'); await scroll(1400); await shot('profil_3'); await scroll(0);
  await page.click('.tabbtn[data-id="today"]');
  await ev(async () => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }, { exoId: 'planche', sets: 2 }] }; ACT.startCustom(); await new Promise(r => setTimeout(r, 4800)); const l = document.querySelector('#launch'); l && l.click(); });
  await shot('live'); await ev(() => ACT.validateSet({ exi: '0' })); await shot('live_rest'); await ev(() => ACT.restSkip()); await shot('live_after');
  await ev(() => ACT.editDoneSets({ exi: '0' })); await shot('done_sets'); await ev(() => closeSheet());
  await ev(() => ACT.openOverview()); await shot('overview'); await ev(() => closeSheet());
  await ev(() => ACT.focusJump({ idx: '2' })); await shot('live_hold');
  await ev(() => { S.draft.exos.forEach(e => e.sets.forEach(s => { s.done = true; })); finalizeSession(); }); await page.waitForTimeout(1800); await shot('celebration'); await ev(() => closeSheet());
  console.log('captures:', n, '| erreurs:', errs.length ? errs : 'aucune');
  await b.close();
})();
