// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.15 (review) : fiabilité des données
// · migrations versionnées (S.v) testées sur des données d'exemple de chaque ancien format : JSON lisible des
//   versions 1.x (élastiques en kg, todayMode, anciens trophées, banc sans banc incliné), format compact de la 2.14
//   (zs, prCount), sauvegarde « FORGE », état déjà à jour (aucune étape rejouée), version plus récente (jamais abaissée) ;
// · nombre de records compté dans l'historique (abandon et suppression ne le faussent plus) ;
// · données illisibles sans copie de secours : message et reprise d'une copie du jour, rien n'est écrasé ;
// · état lisible mais vide : la copie IndexedDB l'emporte au lieu d'être écrasée ;
// · repos en cours repris après une fermeture de l'app ; double touche « Valider » + « Passer le repos » ;
// · modification d'une séance passée : 11,25 kg reste 11,25 kg.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v83'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const iso = d => { const x = new Date(); x.setDate(x.getDate() - d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  // une page neuve dans un contexte neuf (localStorage et IndexedDB vides), avec un contenu brut pour forge.v1
  const open = async (raw) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    if (raw != null) await page.addInitScript(r => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('forge.v1', r); }, typeof raw === 'string' ? raw : JSON.stringify(raw));
    await page.goto(APP); await page.waitForTimeout(900);
    return page;
  };
  const sets = (n, reps, weight, pr) => Array.from({ length: n }, (_, i) => Object.assign({ reps, done: true }, weight != null ? { weight } : {}, pr && i === 0 ? { pr: true } : {}));

  // ---------- 1. JSON lisible des versions 1.x ----------
  const legacy = { v: 1, settings: { todayMode: 'proposal', theme: 'dark' }, trophies: { old: 1 }, meta: { onboarded: true, prCount: 99 },
    equipment: { owned: { dumbbells: true, bench: true, barbell: true, bands: true }, weights: { dumbbells: [10, 12.5], bands: [5, 10, 20] } },
    sessions: [
      { id: 'a', date: iso(30), exos: [{ exoId: 'dc_haltere', sets: sets(3, 10, 10) }, { exoId: 'tirage_elastique', sets: sets(2, 15, 10) }] },
      { id: 'b', date: iso(20), exos: [{ exoId: 'dc_haltere', sets: sets(3, 12, 10) }, { exoId: 'tirage_elastique', sets: sets(2, 15, 20) }] },
      { id: 'c', date: iso(10), exos: [{ exoId: 'dc_haltere', sets: sets(3, 10, 12.5) }] }] };
  let p = await open(legacy);
  let r = await p.evaluate(() => { persistNow(); const st = JSON.parse(localStorage.getItem('forge.v1'));
    return { v: S.v, stored: st.v, todayMode: 'todayMode' in S.settings, trophies: 'trophies' in S, incline: S.equipment.owned.bench_incline, rack: S.equipment.owned.rack,
      bands: S.equipment.weights.bands, bandSets: S.sessions.flatMap(s => s.exos.filter(e => e.exoId === 'tirage_elastique').flatMap(e => e.sets.map(x => x.weight))),
      prCount: 'prCount' in S.meta, prTotal: prTotal(), flags: S.sessions.reduce((t, s) => t + s.exos.reduce((u, e) => u + e.sets.filter(x => x.pr).length, 0), 0), n: S.sessions.length, theme: S.settings.theme }; });
  log('1.x :', JSON.stringify(r));
  if (r.v !== 2 || r.stored !== 2) fail('version de schéma 2 après migration');
  if (r.todayMode || r.trophies) fail('anciens champs retirés');
  if (!r.incline || !r.rack) fail('banc incliné et supports déduits (2.2)');
  if (JSON.stringify(r.bands) !== '[1,3,5]') fail('élastiques en kg convertis en niveaux : ' + JSON.stringify(r.bands));
  if (JSON.stringify(r.bandSets) !== '[3,3,5,5]') fail('séries d\'élastique converties : ' + JSON.stringify(r.bandSets));
  if (r.prCount) fail('ancien compteur de records retiré');
  if (r.prTotal !== r.flags || r.prTotal < 1) fail('records comptés dans l\'historique : ' + r.prTotal + ' / ' + r.flags);
  if (r.n !== 3 || r.theme !== 'dark') fail('historique et réglages gardés');
  // rechargé : rien n'est rejoué (les séries d'élastique restent des niveaux)
  await p.reload(); await p.waitForTimeout(800);
  r = await p.evaluate(() => ({ v: S.v, bandSets: S.sessions.flatMap(s => s.exos.filter(e => e.exoId === 'tirage_elastique').flatMap(e => e.sets.map(x => x.weight))) }));
  if (r.v !== 2 || JSON.stringify(r.bandSets) !== '[3,3,5,5]') fail('rechargement : migration non rejouée ' + JSON.stringify(r));
  await p.context().close();

  // ---------- 2. format compact de la 2.14 (zs, prCount) ----------
  p = await open(null);
  const compact = await p.evaluate(({ iso }) => {
    // données écrites comme la 2.14 : historique compact, v:1, compteur de records gonflé
    const ss = [0, 1, 2, 3].map(k => ({ id: 'z' + k, date: iso[k], exos: [{ exoId: 'pompes', sets: [{ reps: 10 + k * 2, done: true }] }] }));
    return JSON.stringify({ v: 1, fmt: 2, meta: { onboarded: true, prCount: 50, savedAt: Date.now() - 1000 }, settings: { name: 'Yannick' }, zs: ss.map(packSession) });
  }, { iso: [iso(40), iso(30), iso(20), iso(10)] });
  await p.context().close();
  p = await open(compact);
  r = await p.evaluate(() => ({ v: S.v, n: S.sessions.length, name: S.settings.name, prTotal: prTotal(), prCount: 'prCount' in S.meta, medal: medalVal(MEDALS.find(m => m.id === 'prs')) }));
  log('compact 2.14 :', JSON.stringify(r));
  if (r.v !== 2 || r.n !== 4 || r.name !== 'Yannick' || r.prCount) fail('format compact 2.14 migré');
  if (r.prTotal !== 3 || r.medal !== 3) fail('trophée « Records » lu dans l\'historique (3 attendus) : ' + r.prTotal + ' / ' + r.medal);

  // ---------- 3. sauvegarde « FORGE » (format 1) restaurée ----------
  r = await p.evaluate((legacy) => { applyRestore({ ...legacy }, legacy.sessions.length, 'Sauvegarde restaurée'); return { v: S.v, bands: S.equipment.weights.bands, n: S.sessions.length, incline: S.equipment.owned.bench_incline }; }, legacy);
  if (r.v !== 2 || JSON.stringify(r.bands) !== '[1,3,5]' || r.n !== 3 || !r.incline) fail('restauration d\'une ancienne sauvegarde migrée : ' + JSON.stringify(r));
  await p.waitForTimeout(400);
  const pre = await p.evaluate(async () => { const rec = await idbTx('state', 'readonly', st => st.get('pre')); return rec ? JSON.parse(await gunz(rec.data)).zs.length : -1; });
  if (pre !== 4) fail('copie d\'avant restauration rangée dans IndexedDB : ' + pre);
  if (await p.evaluate(() => localStorage.getItem('forge.v1.avant-restauration') !== null)) fail('plus de copie non compressée dans localStorage');
  await p.context().close();

  // ---------- 4. état déjà en version 2, et version plus récente ----------
  p = await open({ v: 2, meta: { onboarded: true }, equipment: { owned: { bands: true }, weights: { bands: [2, 3] } }, settings: { todayMode: 'x' },
    sessions: [{ id: 'q', date: iso(3), exos: [{ exoId: 'tirage_elastique', sets: sets(1, 12, 7) }] }] });
  r = await p.evaluate(() => ({ v: S.v, w: S.sessions[0].exos[0].sets[0].weight, tm: 'todayMode' in S.settings }));
  if (r.v !== 2 || r.w !== 7) fail('version 2 : aucune étape rejouée ' + JSON.stringify(r));
  await p.context().close();
  p = await open({ v: 99, meta: { onboarded: true }, sessions: [{ id: 'q', date: iso(3), exos: [{ exoId: 'pompes', sets: sets(1, 12) }] }] });
  r = await p.evaluate(() => ({ v: S.v, n: S.sessions.length }));
  if (r.v !== 99 || r.n !== 1) fail('version plus récente jamais abaissée ' + JSON.stringify(r));
  await p.context().close();

  // ---------- 5. records : abandon et suppression ----------
  p = await open({ v: 2, meta: { onboarded: true }, sessions: [2, 4, 6, 8].map((k, i) => ({ id: 'r' + k, date: iso(k * 2), exos: [{ exoId: 'pompes', sets: sets(1, 10 + (3 - i) * 2) }] })).reverse() });
  r = await p.evaluate(() => { S.meta.prRule = 0; upgradeRecords(); save(); return prTotal(); });
  const base = r;
  await p.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 2 }] }; S.settings.todayTab = 'custom'; save(); renderView('today'); ACT.startCustom(); });
  await p.waitForTimeout(3300);
  await p.evaluate(() => { S.draft.exos[0].sets[0].reps = 80; runAction('validateSet', document.querySelector('[data-a="validateSet"]')); });
  await p.waitForTimeout(1000);
  await p.evaluate(() => ACT.abandonNow()); await p.waitForTimeout(400);
  r = await p.evaluate(() => prTotal());
  if (r !== base) fail(`abandon : records inchangés (${base} attendu, ${r})`);
  await p.evaluate(() => { const s = S.sessions.find(x => x.exos.some(e => e.sets.some(t => t.pr))); ACT.deleteSession({ id: s.id }); runAction('asRun', document.querySelector('#overlay [data-a="asRun"]')); });
  await p.waitForTimeout(600);
  r = await p.evaluate(() => ({ total: prTotal(), flags: S.sessions.reduce((t, s) => t + s.exos.reduce((u, e) => u + e.sets.filter(x => x.pr).length, 0), 0) }));
  log('records :', base, JSON.stringify(r));
  if (r.total !== r.flags) fail('suppression : records recomptés ' + JSON.stringify(r));

  // ---------- 6. repos repris après fermeture de l'app ----------
  await p.evaluate(() => { S.custom = { exos: [{ exoId: 'pompes', sets: 3 }] }; save(); renderView('today'); ACT.startCustom(); });
  await p.waitForTimeout(3300);
  await p.evaluate(() => runAction('validateSet', document.querySelector('[data-a="validateSet"]'))); await p.waitForTimeout(800);
  const left0 = await p.evaluate(() => { persistNow(); return Math.round((restState.endAt - Date.now()) / 1000); });
  await p.reload(); await p.waitForTimeout(1200);
  r = await p.evaluate(() => ({ rest: !!restState, left: restState ? Math.round((restState.endAt - Date.now()) / 1000) : null, ring: !!document.querySelector('.sx-ring, .ring-wrap'), live: !!(S.draft && S.draft.startedAt) }));
  log('repos repris :', left0, JSON.stringify(r));
  if (!r.live || !r.rest || !(r.left > left0 - 6 && r.left <= left0) || !r.ring) fail('repos repris au retour ' + JSON.stringify(r));
  await p.evaluate(() => ACT.restSkip()); await p.waitForTimeout(300);
  if (await p.evaluate(() => !!(S.draft.rest || restState))) fail('repos passé : retiré de la séance');
  // la séance enregistrée ne garde pas le repos
  await p.evaluate(() => { S.draft.exos[0].sets.forEach(s => { s.done = true; }); finalizeSession(); }); await p.waitForTimeout(600);
  if (await p.evaluate(() => 'rest' in S.sessions[S.sessions.length - 1])) fail('séance enregistrée sans champ de repos');

  // ---------- 7. modifier une séance passée : deux décimales ----------
  r = await p.evaluate(() => {
    const s = S.sessions[0]; s.exos = [{ exoId: 'dc_haltere', sets: [{ reps: 10, weight: 11.25, done: true }] }]; sessionTouched(s); save();
    ACT.histEdit({ id: s.id }); const inp = document.querySelector('.he-in[data-k="weight"]'); const shown = inp.value;
    inp.value = '11,75'; ACT.heVal(inp.dataset, inp); ACT.heSave(); return { shown, w: S.sessions.find(x => x.id === s.id).exos[0].sets[0].weight };
  });
  log('2 décimales :', JSON.stringify(r));
  if (r.shown !== '11,25' || r.w !== 11.75) fail('charge à deux décimales dans la modification ' + JSON.stringify(r));
  await p.context().close();

  // ---------- 8. données illisibles, copie IndexedDB vide : message, reprise d'une copie du jour ----------
  p = await open(null);
  const snapState = await p.evaluate(async (d) => {
    S.meta.onboarded = true; for (let k = 0; k < 5; k++) S.sessions.push(markStored({ id: 'k' + k, date: d[k], exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }));
    sessionTouched(); save(); persistNow(true);
    // copie d'un jour passé (comme si elle datait d'hier), puis la copie de secours principale effacée
    const data = await gz(serializeState(Date.now())); await idbTx('snap', 'readwrite', st => st.put({ data, savedAt: Date.now(), at: Date.now(), n: 5, t: 0 }, d[5]));
    await new Promise(r => setTimeout(r, 3500)); await idbTx('state', 'readwrite', st => st.delete('main'));
    localStorage.setItem('forge.v1', '{"zs":[{"i":"k0",'); return true;
  }, [iso(9), iso(7), iso(5), iso(3), iso(2), iso(1)]);
  await p.reload(); await p.waitForTimeout(1800);
  r = await p.evaluate(() => ({ n: S.sessions.length, sheet: !!document.querySelector('#overlay.open .as-group'), msg: (document.querySelector('#overlay .as-msg') || {}).textContent || '', onb: !!document.querySelector('.ob-body'),
    acts: [...document.querySelectorAll('#overlay .as-btn')].map(b => b.textContent.trim()), kept: Object.keys(localStorage).filter(k => k.startsWith('forge.v1.illisible.')).length }));
  log('illisible :', JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_illisible.png` });
  if (!r.sheet || !/n'ont pas pu être lues/.test(r.msg) || r.onb) fail('données illisibles : message au lieu de l\'accueil des nouveaux venus');
  if (!r.acts.some(t => /^Reprendre la copie/.test(t)) || r.kept !== 1) fail('copie du jour proposée, fichier illisible gardé');
  await p.evaluate(() => runAction('asRun', document.querySelector('#overlay [data-a="asRun"]'))); await p.waitForTimeout(500);
  await p.evaluate(() => runAction('confirmYes', document.querySelector('#overlay [data-a="confirmYes"]'))); await p.waitForTimeout(600);
  r = await p.evaluate(() => S.sessions.length);
  if (r !== 5) fail('copie du jour reprise : ' + r);
  await p.context().close();

  // ---------- 9. état lisible mais vide : la copie IndexedDB l'emporte ----------
  p = await open(null);
  await p.evaluate(() => { S.meta.onboarded = true; for (let k = 0; k < 6; k++) S.sessions.push(markStored({ id: 'e' + k, date: '2026-01-0' + (k + 1), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] })); sessionTouched(); save(); persistNow(true); });
  await p.waitForTimeout(3500);
  await p.evaluate(() => localStorage.setItem('forge.v1', JSON.stringify({ sessions: 'x' })));
  await p.reload(); await p.waitForTimeout(2500);
  r = await p.evaluate(async () => { const rec = await idbGet(); return { n: S.sessions.length, idb: rec ? JSON.parse(await gunz(rec.data)).zs.length : -1 }; });
  log('état vide :', JSON.stringify(r));
  if (r.n !== 6 || r.idb !== 6) fail('état vide : copie de secours reprise, pas écrasée ' + JSON.stringify(r));
  await p.context().close();

  // ---------- 10. localStorage plein : la copie principale ne part qu'après l'écriture IndexedDB ----------
  p = await open(null);
  r = await p.evaluate(async () => {
    S.meta.onboarded = true; S.sessions.push(markStored({ id: 'f1', date: '2026-02-01', exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] })); sessionTouched(); save(); persistNow(true);
    await new Promise(r => setTimeout(r, 3300));
    const set0 = Storage.prototype.setItem, full = function (k, v) { if (k === 'forge.v1') { const e = new Error('plein'); e.name = 'QuotaExceededError'; throw e; } return set0.call(this, k, v); };
    // IndexedDB en panne : la copie principale (plus ancienne) reste lisible
    const put0 = window.idbPut; Storage.prototype.setItem = full; idbPut = () => Promise.reject(new Error('panne'));
    S.settings.name = 'Plein'; save(); persistNow();
    await new Promise(r => setTimeout(r, 400));
    const kept = localStorage.getItem('forge.v1') !== null && !localStorage.getItem('forge.v1.idb');
    // IndexedDB disponible : écrite, puis la copie principale cède la place au repère
    idbPut = put0; S.settings.name = 'Plein2'; save(); persistNow();
    await new Promise(r => setTimeout(r, 600));
    Storage.prototype.setItem = set0;
    const rec = await idbGet(), idbName = rec ? JSON.parse(await gunz(rec.data)).settings.name : null;
    return { kept, moved: localStorage.getItem('forge.v1') === null && !!localStorage.getItem('forge.v1.idb'), idbName };
  });
  log('plein :', JSON.stringify(r));
  if (!r.kept) fail('localStorage plein et IndexedDB en panne : copie principale gardée');
  if (!r.moved || r.idbName !== 'Plein2') fail('localStorage plein : IndexedDB écrite puis repère posé ' + JSON.stringify(r));
  await p.reload(); await p.waitForTimeout(1200);
  r = await p.evaluate(() => ({ n: S.sessions.length, name: S.settings.name }));
  if (r.n !== 1 || r.name !== 'Plein2') fail('relancement depuis IndexedDB ' + JSON.stringify(r));
  await p.context().close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
