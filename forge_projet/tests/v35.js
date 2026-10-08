// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.6 : carte des muscles (fiche d'exercice, semaine dans Progrès), défis (lancement, suivi,
// réussite fêtée et comptée dans un trophée, délai dépassé, abandon, persistance) et robustesse
// face à un état enregistré abîmé (types faux, éléments nuls ou inconnus)
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v35'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const open = async (state) => {
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    // une seule fois par page, même si le navigateur perd sessionStorage au rechargement (marqueur hors des clés de l'app)
    const tok = Math.random().toString(36).slice(2);
    await page.addInitScript(([s, tok]) => { if (sessionStorage.getItem('seeded') || localStorage.getItem('__seed_' + tok)) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('__seed_' + tok, '1'); localStorage.setItem('forge.v1', s); }, [JSON.stringify(state), tok]);
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await page.waitForTimeout(600);
    return page;
  };
  const iso = d => { const x = new Date(); x.setDate(x.getDate() - d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const done = (exoId, n, reps) => ({ exoId, sets: Array.from({ length: n }, () => ({ reps, done: true })) });
  let page = await open({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: [
    { id: 'a', date: iso(1), exos: [done('pompes', 3, 10), done('squat_pdc', 2, 15)] },
    { id: 'b', date: iso(3), exos: [done('rowing_uni_haltere', 4, 10), done('pompes', 3, 10)] }] });
  const shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` }), wait = ms => page.waitForTimeout(ms);

  // 1. carte des muscles dans la fiche : principal plein, secondaires atténués, rien pour le cardio seul
  await page.evaluate(() => ACT.showExoInfo({ id: 'dc_haltere' })); await wait(700);
  const mm = await page.evaluate(() => {
    const def = EXO_MAP.dc_haltere, z = id => document.querySelector(`.exo-mm .mm-z[data-tip^="${MUSCLE_MAP[id].n}"]`);
    const main = z(def.muscles[0]), sec = def.muscles[1] && z(def.muscles[1]);
    return { main: main && main.classList.contains('on') && main.style.getPropertyValue('--v') === '1.00',
      sec: !sec || sec.style.getPropertyValue('--v') === '0.42' };
  });
  await page.evaluate(() => document.querySelector('.exo-mm').scrollIntoView({ block: 'center' })); await wait(250); await shot('01_exo_map');
  // toutes les fiches : une carte bien formée, au moins une zone allumée
  const all = await page.evaluate(() => EXOS.filter(e => e.muscles.some(m => m !== 'cardio')).filter(e => { const h = exoMuscleMap(e); return !/class="mm-z r-\w+ on"/.test(h) || /NaN|undefined/.test(h); }).map(e => e.id));
  log('Exercise map:', JSON.stringify(mm), '| broken maps:', all.length); if (!mm.main || !mm.sec || all.length) fail('carte des muscles de la fiche');
  await page.evaluate(() => closeSheet()); await wait(300);
  // 2. carte de la semaine : séries de la semaine, bulle au toucher
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'muscles' }); }); await wait(800);
  const week = await page.evaluate(() => { const rows = weekVolume(), pec = rows.find(r => r.id === 'pect'), z = document.querySelector(`.mm-week .mm-z[data-tip^="${MUSCLE_MAP.pect.n}"]`);
    z.querySelector('ellipse,path').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { on: z.classList.contains('on'), sets: pec.sets, tip: z.dataset.tip, legend: !!document.querySelector('.mm-card .mm-scale') }; });
  await wait(300); const tipShown = await page.evaluate(() => !!document.querySelector('.mm-week .mm-z.tip-on'));
  log('Week map:', JSON.stringify(week), '| tip:', tipShown); if (!week.on || !tipShown || !(week.sets > 0) || !week.legend || !/série/.test(week.tip)) fail('carte des muscles de la semaine');

  // 3. défis : lancer depuis la feuille, trois au plus
  await page.evaluate(() => ACT.progressTab({ v: 'medals' })); await wait(500);
  await page.click('[data-a="openChallenges"]'); await wait(700); await shot('02_catalog');
  await page.click('[data-a="startChallenge"][data-id="pompes100"]'); await wait(600);
  const started = await page.evaluate(() => ({ n: S.challenges.length, start: S.challenges[0].start === todayISO(), row: !!document.querySelector('.ch-row'), toast: document.getElementById('toast').textContent }));
  await page.evaluate(() => { ACT.startChallenge({ id: 'corps7' }); ACT.startChallenge({ id: 'reps1000' }); ACT.startChallenge({ id: 'records3' }); ACT.startChallenge({ id: 'nope' }); ACT.startChallenge({ id: 'pompes100' }); }); await wait(500);
  const capped = await page.evaluate(() => ({ n: activeChallenges().length, add: !!document.querySelector('[data-a="openChallenges"]') }));
  log('Start:', JSON.stringify(started), '| capped:', JSON.stringify(capped)); if (started.n !== 1 || !started.start || !started.row || !/Défi lancé/.test(started.toast) || capped.n !== 3 || capped.add) fail('lancement des défis (3 au plus)');
  await shot('03_active');
  // la progression ne compte que les séances depuis le lancement
  const prog = await page.evaluate(() => challengeValue(S.challenges[0])); if (prog !== 0) fail('progression depuis le lancement seulement : ' + prog);
  // 4. réussite : séance terminée avec 100 pompes → fête, trophée « Défis relevés », défi réussi
  await page.evaluate(() => { switchTab('today'); S.custom = { exos: [{ exoId: 'pompes', sets: 4 }] }; ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(500);
  await page.evaluate(() => { S.draft.exos[0].sets.forEach(s => { s.reps = 25; s.done = true; }); finalizeSession(); }); await wait(1800);
  const won = await page.evaluate(() => ({ cel: [...document.querySelectorAll('.cel-chal')].map(e => e.textContent.trim()), c: S.challenges.find(c => c.id === 'pompes100'),
    medal: (S.medals.challenges || {}).t, others: activeChallenges().map(c => c.id) }));
  await shot('04_celebration');
  log('Won:', JSON.stringify(won)); if (!won.cel.some(t => /Défi réussi : 100 pompes/.test(t)) || won.c.doneAt !== await page.evaluate(() => todayISO()) || won.medal !== 1 || won.others.includes('pompes100')) fail('défi réussi fêté et compté');
  await page.evaluate(() => closeSheet()); await wait(500);
  // 5. persistance au rechargement
  await page.evaluate(() => persistNow(true)); await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await wait(500);
  const kept = await page.evaluate(() => ({ n: S.challenges.length, done: challengesDone(), act: activeChallenges().length }));
  log('After reload:', JSON.stringify(kept)); if (kept.n !== 3 || kept.done !== 1 || kept.act !== 2) fail('défis conservés au rechargement');
  // 6. délai dépassé : marqué manqué à l'affichage, plus en cours, relançable
  await page.evaluate(() => { const c = S.challenges.find(x => x.id === 'corps7'); c.start = addDaysISO(todayISO(), -9); progressTab = 'medals'; switchTab('progress'); renderView('progress'); }); await wait(600);
  const missed = await page.evaluate(() => ({ m: S.challenges.find(x => x.id === 'corps7').missedAt === todayISO(), act: activeChallenges().map(c => c.id), rows: document.querySelectorAll('.ch-row').length }));
  log('Expired:', JSON.stringify(missed)); if (!missed.m || missed.act.includes('corps7') || missed.rows !== 1) fail('défi expiré');
  // 7. abandon (confirmation) : retiré, feuille relançable
  await page.click('.ch-row [data-a="dropChallenge"]'); await wait(500); await page.click('[data-a="confirmYes"]'); await wait(600);
  const dropped = await page.evaluate(() => ({ act: activeChallenges().length, rows: document.querySelectorAll('.ch-row').length }));
  await page.click('[data-a="openChallenges"]'); await wait(600);
  const sheet = await page.evaluate(() => ({ won: !!document.querySelector('.ch-pick .ch-won'), relaunch: !!document.querySelector('[data-a="startChallenge"][data-id="corps7"]:not([disabled])'), tonnes: !!document.querySelector('[data-id="tonnes10"]') }));
  log('Dropped:', JSON.stringify(dropped), '| sheet:', JSON.stringify(sheet)); if (dropped.act !== 0 || dropped.rows !== 0 || !sheet.won || !sheet.relaunch || !sheet.tonnes) fail('abandon et relance');
  await page.evaluate(() => closeSheet()); await wait(300);
  // corps nu : pas de défi en kilos
  await page.evaluate(() => { S.equipment.owned = {}; save(); openChallengesSheet(); }); await wait(500);
  if (await page.evaluate(() => !!document.querySelector('[data-id="tonnes10"]'))) fail('défi en tonnes caché sans charges');
  await page.close();

  // 8. robustesse : état enregistré abîmé → l'app démarre et tous les écrans s'affichent
  const bad = {
    nulls: { meta: null, equipment: null, goals: null, sessions: null, targets: null, medals: null, challenges: null, templates: null, body: null, custom: null, draft: null },
    wrongTypes: { meta: { onboarded: true }, equipment: { owned: 'x', weights: 5 }, goals: 'x', sessions: {}, targets: 'x', medals: [], challenges: { a: 1 }, templates: 'x', body: 'x', custom: 5, draft: 'x' },
    badItems: { meta: { onboarded: true }, sessions: [null, 5, {}, { id: 'a' }, { id: 'b', date: iso(9), exos: null }, { id: 'c', date: 'x', exos: [null, { exoId: 'nope', sets: [null] }] },
      { id: 'd', date: iso(2), exos: [{ exoId: 'pompes', sets: [{ reps: '12', done: 1 }, { reps: 'abc' }, { reps: -5, weight: 'abc', done: true }] }] }],
      targets: [null, { id: 't', exoId: 'pompes', kind: 'reps', value: 20 }], challenges: [null, 7, { id: 'nope', start: iso(3) }, { id: 'pompes100', start: 'bad' }, { id: 'pompes100', start: iso(3) }],
      templates: [null, { id: 't1' }, { id: 't2', n: 'X', exos: [{ exoId: 'nope' }, { exoId: 'pompes', sets: '3' }], days: 'x' }], body: [null, { d: 'x', kg: 'y' }], medals: { sessions: null, x: { t: 9 } } },
    draftBroken: { meta: { onboarded: true }, draft: { id: 'dr', exos: [{ exoId: 'nope', sets: [] }, { exoId: 'pompes', sets: null }], startedAt: 'x' } },
  };
  for (const [name, st] of Object.entries(bad)) {
    const p = await open(st);
    const r = await p.evaluate(async () => { const out = [], w = ms => new Promise(r => setTimeout(r, ms));
      for (const t of ['today', 'history', 'progress', 'profil']) { switchTab(t); await w(300); if (document.querySelector(`#v-${t} .view-err`)) out.push(t); }
      for (const v of ['muscles', 'exos', 'medals']) { ACT.progressTab({ v }); await w(300); if (document.querySelector('.view-err')) out.push(v); }
      ACT.openChallenges(); await w(300); closeSheet();
      return { out, ch: S.challenges.every(c => c && typeof c.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.start)) }; });
    log('Damaged state', name + ':', JSON.stringify(r)); if (r.out.length || !r.ch) fail('état abîmé ' + name + ' : ' + r.out.join());
    await p.close();
  }
  // 9. réinitialisation : tout est effacé (copies illisibles comprises) et l'app redémarre à neuf
  const pr = await open({ meta: { onboarded: true }, sessions: [{ id: 'a', date: iso(1), exos: [done('pompes', 3, 10)] }] });
  await pr.evaluate(() => { localStorage.setItem('forge.v1.illisible.1', '{'); ACT.confirmReset(); }); await pr.waitForTimeout(400);
  await Promise.all([pr.waitForNavigation({ timeout: 8000 }), pr.click('[data-a="confirmYes"]')]);
  await pr.waitForSelector('#obBody', { timeout: 8000 }).catch(() => {}); await pr.waitForTimeout(300);
  const reset = await pr.evaluate(() => ({ n: S.sessions.length, keys: Object.keys(localStorage).filter(k => k.startsWith('forge.v1.')).length, onb: !!document.querySelector('#obBody') }));
  log('Reset:', JSON.stringify(reset)); if (reset.n !== 0 || reset.keys || !reset.onb) fail('réinitialisation complète');
  await pr.close();
  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
