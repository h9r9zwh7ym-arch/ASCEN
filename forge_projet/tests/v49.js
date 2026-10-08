// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 4.0 (passe qualité) : Rewind sans diapos superposées après des touchers rapides, écrans qui ne
// restent plus en « entrée » (cascade rejouée à chaque rendu), historique qui se transforme d'une
// période à l'autre (total qui défile), graphiques de Progrès dessinés une fois par sous-onglet,
// accueil qui n'anime que le bloc de la séance après une action, séance terminée qui s'éclaire dans
// l'historique (et « Afficher plus » en cascade), exercice disparu sans écran d'erreur, sons
// (réverbération, nappe du Rewind, favori, interrupteurs, « toc » des sélecteurs qui ne se jouait
// pas), accueil recentré sur la séance, curseur des sélecteurs en sombre
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v49'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--autoplay-policy=no-user-gesture-required'] }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // 100 jours, trois séances par semaine (lundi, mercredi, vendredi) : développé qui progresse, squat,
  // et un exercice qui n'existe plus dans le catalogue (renommé depuis)
  await page.addInitScript(() => { if (localStorage.getItem('__seed_v49')) return; localStorage.setItem('__seed_v49', '1');
    const iso = k => { const d = new Date(); d.setDate(d.getDate() - k); return d.toLocaleDateString('sv'); };
    const ss = [];
    for (let k = 100; k >= 1; k--) { const dow = new Date(Date.now() - k * 864e5).getDay(); if (![1, 3, 5].includes(dow)) continue;
      ss.push({ id: 's' + k, date: iso(k), durationSec: 2400 + (k % 5) * 300, exos: [
        { exoId: 'dc_haltere', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 10 + Math.round((100 - k) / 25), done: true })) },
        { exoId: 'squat_gobelet', sets: [1, 2, 3, 4].map(() => ({ reps: 10, weight: 14, done: true })) },
        ...(k > 60 ? [{ exoId: 'exo_disparu', sets: [1, 2, 3, 4, 5].map(() => ({ reps: 12, weight: 8, done: true })) }] : [])] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 11, 12, 13, 14, 16] } }, sessions: ss })); });
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(700);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 1. accueil recentré : la séance avant « Toi, il y a 3 mois », pas de « Prochain cap » qui répète
  //    la pastille de la semaine, « Pourquoi ? » de la semaine allégée dans le coin de la carte
  const home = await page.evaluate(() => { const v = document.querySelector('#v-today'), pane = v.querySelector('.seg-pane'), tn = v.querySelector('.tn-card'), goal = v.querySelector('.goal-line'), dl = v.querySelector('.dl-card');
    return { tnAfter: !!(tn && pane && (pane.compareDocumentPosition(tn) & Node.DOCUMENT_POSITION_FOLLOWING)), goal: goal ? goal.textContent.trim() : '', left: (S.goals.daysPerWeek || 3) - sessionsThisWeek(),
      dl: !!dl, info: !!(dl && dl.querySelector(':scope > .info-btn[data-a="deloadHow"]')), rows: dl ? dl.querySelectorAll('.dl-act button').length : 0 }; });
  log('Home:', JSON.stringify(home));
  if (!home.tnAfter || (home.left > 1 && /pour valider ta semaine/.test(home.goal)) || (home.dl && (!home.info || home.rows !== 2))) fail('accueil recentré sur la séance');
  await shot('01_home');

  // 2. onglets coup sur coup : aucun écran ne reste en « entrée » (sa cascade se rejouerait à chaque rendu)
  await page.click('.tabbtn[data-id="history"]'); await wait(120); await page.click('.tabbtn[data-id="progress"]'); await wait(120); await page.click('.tabbtn[data-id="profil"]'); await wait(1500);
  const stuck = await page.evaluate(() => [...document.querySelectorAll('.view.enter')].map(v => v.id));
  log('Views left in enter:', JSON.stringify(stuck)); if (stuck.length) fail('écran coincé en entrée');

  // 3. historique : changer de période transforme le graphique (pas de repousse depuis zéro), le total défile
  await page.click('.tabbtn[data-id="history"]'); await wait(700);
  const k0 = await page.evaluate(() => document.querySelector('.hist-kpi b').textContent);
  await page.click('[data-a="histRange"][data-v="3m"]'); await wait(90);
  const mid = await page.evaluate(() => { const box = document.querySelector('#histChart'), bars = [...box.querySelectorAll('.cc-bar')];
    const anims = document.getAnimations().filter(a => a.effect && bars.includes(a.effect.target));
    const kf = anims[0] && anims[0].effect.getKeyframes()[0].transform;
    return { cls: box.className, n: anims.length, kf, kpi: box.querySelector('.hist-kpi b').textContent, grow: anims.some(a => a.animationName === 'barGrow') }; });
  await wait(900);
  const end = await page.evaluate(() => ({ cls: document.querySelector('#histChart').className, kpi: document.querySelector('.hist-kpi b').textContent }));
  log('History morph:', k0, '→', JSON.stringify(mid), '→', JSON.stringify(end));
  if (!/morph/.test(mid.cls) || !/tween/.test(mid.cls) || mid.grow || !mid.n || !/scaleY/.test(mid.kf || '') || end.cls !== '' || end.kpi === k0) fail('historique : transformation et total qui défile');
  if (!wk && mid.kpi === end.kpi) fail('le total défile pendant la transformation');
  // l'indicateur du sélecteur s'étire en glissant
  const stretch = await page.evaluate(() => { document.querySelector('[data-a="histRange"][data-v="y"]').click();
    const ind = document.querySelector('[data-seg="histRange"] .seg-ind'), a = ind.getAnimations()[0];
    return a ? a.effect.getKeyframes().map(k => k.transform).join(' | ') : ''; });
  log('Seg stretch:', stretch); if (!/scaleX\(1\.\d+\)/.test(stretch)) fail('indicateur du sélecteur qui s\'étire');
  await wait(800); await shot('02_history');

  // 4. Progrès : la courbe ne se redessine pas à chaque aller-retour entre sous-onglets
  await page.click('.tabbtn[data-id="progress"]'); await wait(1400);
  const err = await page.evaluate(() => !!document.querySelector('#v-progress .view-err'));
  const fav = await page.evaluate(() => { const f = favoriteExercise(); return f && f.def && f.def.id; });
  log('Unknown exercise:', JSON.stringify({ err, fav })); if (err || !fav || fav === 'exo_disparu') fail('exercice disparu : pas d\'écran d\'erreur');
  const wipes = async () => page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'wipe' || a.animationName === 'mmIn' || a.animationName === 'hbGrow').length);
  await page.evaluate(() => ACT.progressTab({ v: 'muscles' })); await wait(60);
  const first = await page.evaluate(() => ({ pin: document.querySelector('#v-progress .seg-pane').classList.contains('pane-in'), n: document.getAnimations().filter(a => a.animationName === 'mmIn' || a.animationName === 'hbGrow').length }));
  await wait(1500);
  await page.evaluate(() => ACT.progressTab({ v: 'overview' })); await wait(60);
  const back = await page.evaluate(() => ({ pin: document.querySelector('#v-progress .seg-pane').classList.contains('pane-in') })); const backN = await wipes();
  await wait(400); await page.evaluate(() => ACT.progressTab({ v: 'muscles' })); await wait(60); const again = await wipes();
  log('Progress panes:', JSON.stringify({ first, back, backN, again }));
  if (!first.pin || !first.n || back.pin || backN || again) fail('graphiques de Progrès dessinés une fois par sous-onglet');
  await wait(400);

  // 5. accueil : « Autre proposition » n'anime que le bloc de la séance (pas de cascade de tout l'écran)
  await page.click('.tabbtn[data-id="today"]'); await wait(500);
  await page.evaluate(() => { S.settings.todayTab = 'proposal'; save(); renderView('today'); }); await wait(300);
  const regen = await page.evaluate(() => { const seen = new Set(document.getAnimations()); ACT.regenSession();
    const v = document.querySelector('#v-today'), news = document.getAnimations().filter(a => !seen.has(a));
    return { enter: v.classList.contains('enter'), pane: news.some(a => a.effect.target.classList && a.effect.target.classList.contains('seg-pane')),
      spin: news.some(a => a.effect.target.closest && a.effect.target.closest('[data-a="regenSession"]')), cascade: news.filter(a => a.animationName === 'fadeUp').length }; });
  log('Regen:', JSON.stringify(regen)); if (regen.enter || !regen.pane || !regen.spin || regen.cascade > 1) fail('nouvelle proposition sans cascade de l\'écran');
  await wait(700);

  // 6. séance terminée : sa ligne s'éclaire à l'arrivée dans l'historique
  await page.evaluate(() => { S.sessions.push({ id: 'fresh1', date: todayISO(), durationSec: 1500, exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }); save(); renderView('today'); });
  await page.click('.tabbtn[data-id="history"]'); await wait(100);
  const fresh = await page.evaluate(() => { const r = document.querySelector('#v-history .row[data-id="fresh1"]'); return r && r.classList.contains('fresh'); });
  log('Fresh row:', fresh); if (!fresh) fail('séance terminée qui s\'éclaire dans l\'historique');
  await wait(1900); await page.click('.tabbtn[data-id="today"]'); await wait(300);
  // une fois l'onglet vu, plus d'éclairage
  await page.click('.tabbtn[data-id="history"]'); await wait(100);
  const fresh2 = await page.evaluate(() => !!document.querySelector('#v-history .row.fresh'));
  if (fresh2) fail('éclairage une seule fois');
  // supprimer la dernière séance n'éclaire pas la précédente
  await page.evaluate(() => { S.sessions = S.sessions.filter(s => s.id !== 'fresh1'); save(); switchTab('today'); }); await wait(300);
  await page.click('.tabbtn[data-id="history"]'); await wait(100);
  const fresh3 = await page.evaluate(() => !!document.querySelector('#v-history .row.fresh'));
  log('Fresh after delete:', fresh3); if (fresh3) fail('pas d\'éclairage après suppression');
  // « Afficher plus » : les séances révélées arrivent en cascade, les premières ne bougent pas
  const more = await page.evaluate(() => { const n0 = document.querySelectorAll('#v-history .row[data-id]').length, first = document.querySelector('#v-history .row[data-id]').dataset.id;
    document.querySelector('[data-a="histMore"]').click();
    const rows = [...document.querySelectorAll('#v-history .row[data-id]')], anim = r => r.getAnimations().length;
    return { n0, n1: rows.length, oldMoved: rows.slice(0, n0).filter(anim).length, newIn: rows.slice(n0).filter(anim).length, same: rows[0].dataset.id === first }; });
  log('Show more:', JSON.stringify(more)); if (!(more.n1 > more.n0) || more.oldMoved || !more.newIn || !more.same) fail('« Afficher plus » en cascade');
  await wait(600);

  // 7. Rewind : des touchers rapides ne superposent jamais deux diapos
  const rwq = await page.evaluate(async () => { openRewind('month', todayISO().slice(0, 7)); const sl = ms => new Promise(r => setTimeout(r, ms)); const counts = [];
    for (const i of [1, 2, 3, 2, 3, 4, 5]) { rwGo(i); await sl(40); counts.push(document.querySelectorAll('#rwStage .rw-slide:not(.out)').length); }
    await sl(600); const left = document.querySelectorAll('#rwStage .rw-slide').length; rwGo(rw.i); await sl(50); const same = document.querySelectorAll('#rwStage .rw-slide').length;
    return { counts, left, same }; });
  log('Rewind quick taps:', JSON.stringify(rwq)); if (rwq.counts.some(n => n !== 1) || rwq.left !== 1 || rwq.same !== 1) fail('diapos du Rewind superposées');
  await shot('03_rewind');

  // 8. sons : réverbération pour les sons musicaux, nappe sous les diapos du Rewind, bus [sec, salle] coupé
  //    à chaque diapo et baissé pendant la pause ; étoile des favoris et interrupteurs ont leur son
  if (!wk) {
    const snd = await page.evaluate(async () => {
      const c = { pad: 0, wet: 0 }; const pf = window.pad; window.pad = (...a) => { c.pad++; return pf(...a); };
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await new Promise(r => setTimeout(r, 100));
      const state = AC && AC.state, wet = !!SFX_WET && SFX_WET.context === AC;
      rwGo(rw.i + 1); await new Promise(r => setTimeout(r, 80));
      const bus = Array.isArray(rw.bus) && rw.bus.length === 2, pads = c.pad;
      rwDuck(true); await new Promise(r => setTimeout(r, 300)); const duck = rw.bus[0].gain.value; rwDuck(false);
      closeRewind();
      const has = { fav: typeof SFX.fav === 'function', toggle: typeof SFX.toggle === 'function' };
      // le « toc » des sélecteurs (il ne se jouait jamais : l'action marquait le segment avant l'écouteur)
      const heard = []; const sf = window.sfx; window.sfx = (n, a) => { heard.push(n); return sf(n, a); };
      switchTab('history'); await new Promise(r => setTimeout(r, 300));
      document.querySelector('[data-a="histRange"]:not(.on)').click(); await new Promise(r => setTimeout(r, 100));
      document.querySelector('[data-a="histMetric"]:not(.on)').click(); window.sfx = sf;
      return { state, wet, bus, pads, duck: +duck.toFixed(2), has, seg: heard.filter(n => n === 'seg').length };
    });
    log('Sounds:', JSON.stringify(snd));
    if (!snd.has.fav || !snd.has.toggle || snd.seg !== 2 || (snd.state === 'running' && (!snd.wet || !snd.bus || snd.pads < 3 || snd.duck > 0.5))) fail('sons : réverbération, nappe, bus, favori, interrupteur, sélecteurs');
  } else await page.evaluate(() => closeRewind());
  await wait(400);

  // 9. sombre : le curseur des sélecteurs est plus clair que son rail
  await page.evaluate(() => { S.settings.theme = 'dark'; save(); applyTheme(); }); await wait(300);
  const seg = await page.evaluate(() => { const ind = document.querySelector('#v-history [data-seg="histRange"] .seg-ind'); const bg = getComputedStyle(ind).backgroundColor; return bg; });
  log('Dark seg thumb:', seg); if (seg !== 'rgb(74, 71, 68)') fail('curseur des sélecteurs en sombre');
  await shot('04_dark_history');

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
