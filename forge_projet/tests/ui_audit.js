// Audit visuel : chaque onglet en entier (fenêtre agrandie à la hauteur du contenu), en haut et en bas de défilement
// (barre d'onglets fixe), et les feuilles principales. Usage : AUDIT_DIR=nom node tests/ui_audit.js dist/forge.html
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, process.env.AUDIT_DIR || 'audit_ui'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const wk = process.env.ENGINE === 'webkit', dark = !!process.env.DARK;
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', colorScheme: dark ? 'dark' : 'light', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  // encoche simulée : les zones de sécurité iOS (47 px en haut, 34 en bas) sont injectées via une variable
  await page.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const ex = ['dc_haltere', 'rowing_uni_haltere', 'pompes', 'elevations_laterales', 'squat_gobelet', 'planche', 'fentes_avant', 'curl_biceps'];
    const ss = []; for (let i = 0; i < 44; i++) { const d = new Date(2026, 5, 1 + i * 2.2); if (d > new Date(2026, 8, 27)) break;
      const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      ss.push({ id: 'a' + i, date: iso, source: 'engine', type: 'auto', resolvedType: ['push', 'pull', 'legs', 'full'][i % 4], startedAt: iso + 'T07:10:00.000Z', completedAt: iso + 'T07:48:00.000Z', durationSec: 2280 + (i % 5) * 120,
        exos: ex.slice(i % 4, i % 4 + 5).map((e, k) => ({ exoId: e, targetReps: [8, 12], sets: [0, 1, 2].map(j => ({ reps: e === 'planche' ? 45 : 8 + ((i + j) % 4), ...(/haltere|gobelet|elevations|curl|fentes|dc_/.test(e) ? { weight: (e === 'elevations_laterales' ? 6 : 14) + Math.floor(i / 8) * 2 } : {}), done: true, ...(j === 2 && k === 0 && i % 6 === 0 ? { pr: true } : {}), effort: 1 + ((i + j) % 3) })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick', weeklyGoal: 3 }, equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true } }, sessions: ss })); });
  // iPhone à Dynamic Island : zones de sécurité simulées (haut 59 px, bas 34 px) via les jetons --sat/--sab
  if (!process.env.NO_NOTCH) await page.addInitScript(() => { const set = () => { document.documentElement.style.setProperty('--sat', '59px'); document.documentElement.style.setProperty('--sab', '34px'); }; if (document.documentElement) set(); document.addEventListener('DOMContentLoaded', set); });
  await page.goto('file://' + path.resolve(process.argv[2]));
  await page.waitForSelector('#splash', { state: 'detached', timeout: 8000 }); await page.waitForTimeout(500);
  const wait = ms => page.waitForTimeout(ms), pre = (wk ? 'wk_' : '') + (dark ? 'dk_' : '');
  const shot = n => page.screenshot({ path: `${OUT}/${pre}${n}.png` });
  // pleine hauteur : on agrandit la fenêtre à la hauteur du contenu de l'onglet
  const full = async n => {
    const h = await page.evaluate(() => { const v = document.querySelector('.view.active'); return v ? v.scrollHeight : 844; });
    await page.setViewportSize({ width: 390, height: Math.min(Math.max(h, 844), 5200) }); await wait(350); await shot(n + '_full');
    await page.setViewportSize({ width: 390, height: 844 }); await wait(250);
  };
  const bottom = async n => { await page.evaluate(() => { const v = document.querySelector('.view.active'); v.scrollTop = v.scrollHeight; }); await wait(450); await shot(n + '_bottom'); await page.evaluate(() => { document.querySelector('.view.active').scrollTop = 0; }); await wait(200); };
  const sheet = async (n, fn, ms = 800) => { try { await page.evaluate(fn); } catch (e) { errors.push(n + ': ' + e.message.split('\n')[0]); return; } await wait(ms); await shot(n); await page.evaluate(() => { try { closeSheet(); } catch (e) {} }); await wait(450); };

  await shot('today'); await full('today'); await bottom('today');
  await page.click('[data-a="todayMode"][data-v="proposal"]').catch(e => errors.push('mode ' + e.message)); await wait(700); await full('today_proposal'); await page.click('[data-a="todayMode"][data-v="custom"]').catch(() => {}); await wait(500);
  await sheet('picker', () => openPicker({ title: 'Choisir des exercices', multi: true, onDone: () => {} }), 900);
  await sheet('exo_info', () => ACT.showExoInfo({ id: 'dc_haltere' }), 900);
  await page.evaluate(() => switchTab('history')); await wait(600); await shot('history'); await full('history');
  await sheet('session_detail', () => { const s = S.sessions[S.sessions.length - 1]; ACT.openSessionDetail({ id: s.id }); }, 900);
  for (const t of ['overview', 'exos', 'medals']) { await page.evaluate(t => { switchTab('progress'); ACT.progressTab({ v: t }); }, t); await wait(1100); await full('progress_' + t); }
  await sheet('exo_chart', () => ACT.openExoChart({ id: 'dc_haltere' }), 1000);
  await page.evaluate(() => switchTab('profil')); await wait(600); await shot('profil'); await full('profil'); await bottom('profil');
  await sheet('goals', () => openGoals()); await sheet('equip', () => openEquip());
  await page.evaluate(() => switchTab('today')); await wait(400);
  await page.evaluate(() => ACT.startSession()); await wait(4400); await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(900);
  await shot('session'); await full('session'); await bottom('session');
  await browser.close();
  errors.forEach(e => console.log(e)); console.log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
})();
