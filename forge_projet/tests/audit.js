// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Audit de mise en page : débordements horizontaux, cibles tactiles trop petites, erreurs.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = (OUT_ROOT + '/audit');
fs.mkdirSync(OUT, { recursive: true });
const W = +(process.env.W || 375), DARK = process.env.DARK === '1', wk = process.env.ENGINE === 'webkit';
(async () => {
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: W, height: 740 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', colorScheme: DARK ? 'dark' : 'light', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  const wait = ms => page.waitForTimeout(ms);
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350);
  // données : matériel complet, historique, séances enregistrées
  await page.evaluate(() => {
    Object.keys(S.equipment.owned).forEach(k => S.equipment.owned[k] = true);
    S.equipment.weights.dumbbells = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22.5]; S.equipment.weights.kettlebell = [8, 12, 16]; S.equipment.weights.bands = ['léger', 'moyen', 'fort'];
    S.settings.name = 'Yannick-Alexandre';
    const wd = weekdayIdx(todayISO());
    S.templates = [
      { id: 't1', n: 'Push haltères lourd du vendredi', days: [wd, (wd + 3) % 7], exos: [{ exoId: 'dc_haltere', sets: 4 }, { exoId: 'squeeze_press', sets: 3 }, { exoId: 'elevations_laterales', sets: 3 }, { exoId: 'extension_triceps_allonge', sets: 3 }] },
      { id: 't2', n: 'Jambes', days: [(wd + 1) % 7], exos: [{ exoId: 'squat_bulgare_halteres', sets: 4 }, { exoId: 'rdl_halteres', sets: 3 }] },
      { id: 't3', n: 'Dos', days: [], exos: [{ exoId: 'tractions_negatives', sets: 4 }, { exoId: 'rowing_appui_banc', sets: 3 }] },
      { id: 't4', n: 'Gainage', days: [], exos: [{ exoId: 'pallof_press', sets: 3 }, { exoId: 'russian_twist', sets: 3 }] },
    ];
    const pad = n => String(n).padStart(2, '0'), iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    for (let k = 60; k >= 1; k -= 2) {
      const d = new Date(); d.setDate(d.getDate() - k); d.setHours(18, 0);
      S.sessions.push({ id: 's' + k, date: iso(d), source: 'custom', name: k % 4 ? 'Push haltères lourd du vendredi' : 'Jambes', type: 'auto', startedAt: d.toISOString(), completedAt: d.toISOString(), durationSec: 3000 + k * 20,
        exos: [{ exoId: 'dc_haltere', targetSets: 3, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: 10, weight: 12 + Math.floor((60 - k) / 10) * 2, done: true, pr: j === 0 && k % 10 === 0 })) },
               { exoId: 'russian_twist', targetSets: 3, targetReps: [12, 20], sets: [0, 1, 2].map(() => ({ reps: 16, weight: null, done: true })) }] });
    }
    S.sessions.sort((a, b) => a.date < b.date ? -1 : 1);
    S.custom = { exos: [{ exoId: 'squat_bulgare_halteres', sets: 3 }, { exoId: 'extension_triceps_allonge', sets: 4 }, { exoId: 'soulevé_elastique', sets: 3 }, { exoId: 'releve_jambes_suspendu', sets: 3 }].filter(e => EXO_MAP[e.exoId]), name: 'Ma séance du soir avec un nom long' };
    save(); persistNow();
  });
  await page.reload(); await page.waitForSelector('#splash', { state: 'detached', timeout: 6000 }); await page.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); persistNow(); }).catch(() => {}); await page.waitForTimeout(350); await wait(1300);
  const issues = [];
  const audit = async (label) => {
    await wait(700);
    const r = await page.evaluate((W) => {
      const out = [];
      const vis = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && +s.opacity > 0.05; };
      const scroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; if (p.id === 'splash') return true; } return false; };
      const clipped = el => { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX === 'hidden' || s.overflow === 'hidden') { const pr = p.getBoundingClientRect(); const r = el.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) return true; } } return false; };
      const name = el => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName) + ' «' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28) + '»';
      const layer = document.querySelector('#overlay.open') || document.querySelector('.view.active');
      if (document.documentElement.scrollWidth > W + 1) out.push('PAGE scrollWidth ' + document.documentElement.scrollWidth);
      layer.querySelectorAll('*').forEach(el => {
        if (!vis(el) || el.closest('svg') || el.closest('.confetti') || el.closest('.ripple')) return;
        const r = el.getBoundingClientRect();
        if ((r.right > W + 1 || r.left < -1) && !scroller(el) && !clipped(el)) out.push('HORS ÉCRAN ' + name(el) + ` [${Math.round(r.left)}→${Math.round(r.right)}]`);
        if (el.matches('button, a, [data-a]') && !el.closest('.wp-day') && (r.height < 28 || r.width < 28) && !scroller(el)) out.push(`PETITE CIBLE ${Math.round(r.width)}×${Math.round(r.height)} ` + name(el) + " " + (el.dataset.a||"") + " in " + (el.parentElement.className||""));
        // texte coupé sans points de suspension
        if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 2) { const s = getComputedStyle(el); if (s.textOverflow !== 'ellipsis' && s.overflow !== 'visible') out.push('TEXTE COUPÉ ' + name(el)); }
      });
      return [...new Set(out)];
    }, W);
    if (r.length) issues.push(`--- ${label}\n  ` + r.slice(0, 14).join('\n  '));
    await page.screenshot({ path: `${OUT}/${W}${DARK ? 'd' : ''}_${label}.png` });
  };
  const close = async () => { if (await page.$('.t3d-full')) { await page.evaluate(() => t3dClose()); await wait(600); return; } const c = await page.$('#overlay.open .sheet-hd [data-a="closesheet"]') || await page.$('#overlay.open .center-modal [data-a="closesheet"]'); if (c) await c.click(); else await page.evaluate(() => closeSheet()); await wait(450); };
  const act = (a, d = {}) => page.evaluate(([a, d]) => ACT[a](d, document.querySelector(`[data-a="${a}"]`)), [a, d]);

  await audit('today_custom');
  await page.evaluate(() => document.querySelector('#v-today').scrollTo(0, 99999)); await audit('today_custom_bottom');
  await page.click('[data-a="todayMode"][data-v="proposal"]'); await audit('today_proposal');
  await page.click('[data-a="todayMode"][data-v="custom"]'); await wait(300);
  await act('customAddOpen'); await audit('picker');
  await close();
  await act('showExoInfo', { id: 'squat_bulgare_halteres' }); await audit('info'); await close();
  await act('planDay', { d: '2' }); await audit('planday'); await close();
  await act('templateMenu', { id: 't1' }); await audit('tplmenu'); await close();
  await act('saveTemplateOpen'); await audit('savetpl'); await close();
  await act('startCustom'); await page.waitForSelector('#launch', { state: 'detached', timeout: 6000 }); await audit('live');
  await page.click('[data-a="validateSet"]'); await audit('live_rest');
  await page.click('.focus-card [data-a="restSkip"]'); await wait(200);
  await act('focusMenu', { idx: '0' }); await audit('live_menu'); await close();
  await act('openOverview'); await audit('live_overview'); await close();
  for (let i = 0; i < 40; i++) { const v = await page.$('[data-a="validateSet"]'); if (!v) break; await v.click(); await wait(60); const sk = await page.$('.focus-card [data-a="restSkip"]'); if (sk) { await sk.click(); await wait(60); } }
  await audit('live_complete');
  await page.click('.complete-card [data-a="finishSession"]'); await wait(1200); await audit('celebration'); await close();
  await audit('today_done');
  await page.click('.tabbtn[data-id="history"]'); await audit('history');
  await page.click('#v-history [data-a="openSessionDetail"]'); await audit('history_detail'); await close();
  await page.click('#v-history [data-a="openSessionDetail"]'); await page.waitForTimeout(400); await page.click('[data-a="histEdit"]'); await audit('history_edit'); await close();
  await page.click('[data-a="openRecap"]'); await audit('recap'); await close();
  await page.click('.tabbtn[data-id="progress"]'); await wait(900); await audit('progress');
  await page.click('[data-a="newTarget"]'); await wait(500); await page.click('.pick-row [data-a="pickerTap"]'); await audit('target_new'); await close();
  await page.evaluate(() => document.querySelector('#v-progress').scrollTo(0, 99999)); await audit('progress_bottom');
  await page.click('[data-a="progressTab"][data-v="exos"]'); await audit('progress_exos');
  await page.click('[data-a="openExoChart"]'); await wait(900); await audit('exochart'); await close();
  await page.click('[data-a="progressTab"][data-v="medals"]'); await audit('medals');
  await page.click('.medal-card'); await page.waitForSelector('.center-modal, .t3d-full.show', { timeout: 20000 }); await audit('medal_modal'); await close();
  await page.click('.tabbtn[data-id="profil"]'); await audit('profil');
  await page.evaluate(() => document.querySelector('#v-profil').scrollTo(0, 99999)); await audit('profil_bottom');
  for (const a of ['openEquip', 'openExoPrefs', 'openGoals', 'openExportImport', 'openAppearance', 'openAbout']) { await act(a); await audit(a); await close(); }
  console.log(issues.join('\n') || 'AUCUN PROBLÈME');
  await browser.close();
  if (errors.length) { console.log('=== ERRORS ==='); errors.forEach(e => console.log(e)); process.exit(1); }
  console.log('=== NO ERRORS ===');
})();
