// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.3 : fiabilité et performances — encodage de l'historique mis en cache (et toujours juste
// après une modification), résumés de séance, séance abîmée écartée sans perdre le reste,
// écran en échec rattrapé, bornes de saisie, copie de secours regroupée, trophées sans écriture inutile
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v32'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a), wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  const fail = m => errors.push('ASSERT: ' + m);
  // historique au format compact, dont une séance abîmée (liste d'exercices illisible)
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const zs = []; for (let i = 0; i < 40; i++) { const d = new Date(2026, 0, 2 + i * 3), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      zs.push({ i: 'z' + i, d: iso, o: 'c', a: d.getTime() + 18 * 3600e3, u: 1800, x: [['pompes', [[12], [10], ['11']]], ['dc_haltere', [[10, 20], [8, 22.5, 1]]], ['planche', [[45]]]] }); }
    zs.splice(7, 0, { i: 'bad', d: '2026-02-01', x: 'illisible' });
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } }, zs, fmt: 2 })); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(2200);
  // 1. une séance abîmée est écartée, les autres sont là, l'original est gardé de côté, message
  const load = await page.evaluate(() => ({ n: S.sessions.length, skipped: LOAD_SKIPPED, aside: Object.keys(localStorage).some(k => k.startsWith('forge.v1.illisible.')), toast: document.getElementById('toast').textContent, reps: S.sessions[0].exos[0].sets[2].reps }));
  log('Load with a damaged session:', JSON.stringify(load));
  if (load.n !== 40 || load.skipped !== 1 || !load.aside || !/illisible/.test(load.toast) || load.reps !== 11) fail('séance abîmée écartée sans perte du reste');
  // 2. l'encodage mis en cache donne exactement l'encodage complet, et suit les modifications
  const enc = await page.evaluate(() => {
    const full = () => { const o = JSON.parse(serializeState(1)); return JSON.stringify(o.zs); };
    const ref = () => JSON.stringify(S.sessions.map(packSession));
    const a = full() === ref();
    const s = S.sessions[5]; ACT.saveNote({ id: s.id }, { value: 'Bonne séance' });
    const b = full() === ref() && JSON.parse(serializeState(1)).zs[5].m === 'Bonne séance';
    // modification d'une séance passée (même chemin que l'éditeur) : séries et records recalculés
    s.exos = [{ exoId: 'dc_haltere', sets: [{ reps: 12, weight: 40, done: true }] }]; sessionTouched(s); recomputePRFlags();
    const c = full() === ref();
    return { a, b, c };
  });
  log('Cached encoding matches full encoding:', JSON.stringify(enc)); if (!enc.a || !enc.b || !enc.c) fail('encodage en cache toujours exact');
  await page.evaluate(() => persistNow(true)); await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(400);
  const kept = await page.evaluate(() => ({ note: S.sessions[5].note, w: S.sessions[5].exos[0].sets[0].weight, n: S.sessions.length }));
  log('After reload:', JSON.stringify(kept)); if (kept.note !== 'Bonne séance' || kept.w !== 40 || kept.n !== 40) fail('modifications conservées au rechargement');
  // 3. résumés de séance : identiques au calcul direct, recalculés après modification
  const sum = await page.evaluate(() => {
    const s = S.sessions[3], direct = x => x.exos.reduce((t, ex) => t + ex.sets.filter(st => st.done).length, 0);
    const a = sessionSetCount(s) === direct(s) && sessionSummary(s) === sessionSummary(s);
    s.exos[0].sets.push({ reps: 5, done: true }); sessionTouched(s);
    const b = sessionSetCount(s) === direct(s);
    const vol = sessionVolume(s) === s.exos.reduce((t, ex) => t + ex.sets.reduce((a, st) => a + (st.reps || 0) * (st.weight || 0), 0), 0);
    const hold = holdMinutes() * 60 === S.sessions.reduce((t, x) => t + x.exos.filter(e => e.exoId === 'planche').reduce((a, e) => a + e.sets.reduce((b, st) => b + st.reps, 0), 0), 0);
    return { a, b, vol, hold };
  });
  log('Session summaries:', JSON.stringify(sum)); if (!sum.a || !sum.b || !sum.vol || !sum.hold) fail('résumés de séance justes');
  // 4. trophées : pas d'écriture (ni d'invalidation des statistiques) quand rien ne change
  const med = await page.evaluate(() => { checkMedals(true); const v = DATA_VER; checkMedals(true); return DATA_VER === v; });
  log('checkMedals without change keeps caches:', med); if (!med) fail('trophées : pas de save() inutile');
  // 5. copie de secours regroupée : plusieurs enregistrements rapprochés, peu d'écritures IndexedDB, la dernière gagne
  const idb = await page.evaluate(async () => {
    let n = 0, last = null; const o = window.idbPut; window.idbPut = (data, at) => { n++; last = at; return o(data, at); };
    await new Promise(r => setTimeout(r, 3200));
    n = 0; for (let i = 0; i < 6; i++) { save(); persistNow(); await new Promise(r => setTimeout(r, 120)); }
    const during = n; flushPersist(); await new Promise(r => setTimeout(r, 600));
    window.idbPut = o; return { during, after: n, latest: last === S.meta.savedAt };
  });
  log('IndexedDB mirror writes:', JSON.stringify(idb)); if (idb.during > 2 || !idb.latest) fail('copie de secours regroupée, dernière version écrite');
  // 6. un écran qui échoue : message et « Réessayer », l'app reste utilisable
  await page.evaluate(() => { window.__h = VIEWS.history; VIEWS.history = () => { throw new Error('boom'); }; switchTab('history'); }); await wait(500);
  const err = await page.evaluate(() => ({ box: !!document.querySelector('#v-history .view-err'), logged: ERR_LOG.some(e => /écran history/.test(e.where)) }));
  await shot('01_view_error');
  await page.evaluate(() => { VIEWS.history = window.__h; }); await page.click('#v-history [data-a="retryView"]'); await wait(500);
  const back = await page.$eval('#v-history .lt', e => e.textContent).catch(() => null);
  log('Failing view:', JSON.stringify(err), '| after retry:', back); if (!err.box || !err.logged || back !== 'Historique') fail('écran en échec rattrapé');
  // 7. bornes de saisie : une faute de frappe ne gonfle pas les statistiques
  await page.evaluate(() => { switchTab('today'); S.custom = { exos: [{ exoId: 'dc_haltere', sets: 2 }, { exoId: 'pompes', sets: 2 }] }; ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(600);
  const clamp = await page.evaluate(() => {
    ACT.editVal({ exi: '0', si: '0', f: 'weight' }); document.getElementById('numInput').value = '25000'; ACT.numOk();
    ACT.editVal({ exi: '0', si: '0', f: 'reps' }); document.getElementById('numInput').value = '1e7'; ACT.numOk();
    const st = S.draft.exos[0].sets[0]; return { w: st.weight, r: st.reps };
  });
  log('Clamped entries:', JSON.stringify(clamp)); if (clamp.w !== 500 || clamp.r !== 9999) fail('bornes de saisie');
  await page.evaluate(() => { S.draft = null; save(); renderView('today'); });
  // 8. recherche d'exercice : une seule reconstruction par image, résultat final juste
  await page.evaluate(() => openPicker({ title: 'Choisir', multi: true, onDone: () => {} })); await wait(600);
  await page.type('#pickerSearch', 'pompes', { delay: 5 }); await wait(250);
  const found = await page.$$eval('#pickerList .pick-row .t', e => e.map(x => x.textContent));
  // même règle que l'app : nom, noms alternatifs (« pompes inversées » = dips) ou muscle
  const expected = await page.evaluate(() => { const q = normName('pompes'); return availableExos().filter(e => normName(e.n + ' ' + (EXO_ALIAS[e.id] || '')).includes(q) || e.muscles.some(m => normName(MUSCLE_MAP[m].n).includes(q))).length; });
  log('Search results:', found.length, '/ expected', expected, '|', found.slice(0, 3).join(' / ')); if (!found.length || found.length !== expected || found[0] !== 'Pompes') fail('recherche juste après frappe rapide');
  await page.evaluate(() => closeSheet()); await wait(300);
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
