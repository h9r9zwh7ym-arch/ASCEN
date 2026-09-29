// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// v3.8 : accessibilité (contraste, zones de toucher 44 pt), « Annuler » après une suppression,
// première charge réaliste, barre d'onglets effacée en séance, identifiants piégés neutralisés (XSS), CSP
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v37'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const iso = d => { const x = new Date(); x.setDate(x.getDate() - d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const open = async (state, dark) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message)); page.on('dialog', d => { errors.push('DIALOG: ' + d.message()); d.dismiss(); });
    await page.addInitScript(s => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('forge.v1', s); }, JSON.stringify(state));
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 9000 }); await page.waitForTimeout(500); return page;
  };
  const startLive = p => p.evaluate(async () => { S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'curl_biceps', sets: 3 }, { exoId: 'squat_gobelet', sets: 3 }] }; ACT.startCustom();
    await new Promise(r => setTimeout(r, 4400)); const l = document.querySelector('#launch'); if (l) l.click(); await new Promise(r => setTimeout(r, 700)); });
  const base = { meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [2, 4, 6, 8, 10, 12, 14, 16] } },
    sessions: [{ id: 'a1', date: iso(4), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }, { id: 'a2', date: iso(2), exos: [{ exoId: 'pompes', sets: [{ reps: 12, done: true }] }] }] };

  // 1. séance en cours, mode sombre : compteur de la puce lisible, zones de toucher ≥ 44, barre d'onglets effacée, première charge réaliste
  let p = await open(base, true); await startLive(p);
  const live = await p.evaluate(() => {
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
    const chip = document.querySelector('.ls-chip.current'), sets = chip.querySelector('.ls-sets');
    const a = lum(getComputedStyle(sets).color), b = lum(getComputedStyle(chip).backgroundColor), cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const hit = sel => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(), pb = getComputedStyle(e, '::before');
      const w = Math.max(r.width, pb.content !== 'none' ? parseFloat(pb.width) || 0 : 0), h = Math.max(r.height, pb.content !== 'none' ? parseFloat(pb.height) || 0 : 0); return Math.min(w, h); });
    const small = ['.big-stepper button', '.fc-menu', '.fc-info', '.nb-done', '.live-nav .icon-btn', '.focus-nav .center-link'].flatMap(s => hit(s).filter(v => v < 44).map(v => s + ' ' + v));
    const tb = document.querySelector('.tabbar'), tr = tb.getBoundingClientRect();
    return { cr: +cr.toFixed(2), small, focus: document.body.classList.contains('live-focus'), tabHidden: tr.top >= innerHeight - 2 || getComputedStyle(tb).pointerEvents === 'none',
      w: Object.fromEntries(S.draft.exos.map(e => [e.exoId, e.sets[0].weight])) };
  });
  await p.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_live_dark.png` });
  log('Live:', JSON.stringify(live));
  if (live.cr < 3) fail('compteur de la puce en cours lisible en sombre (' + live.cr + ')');
  if (live.small.length) fail('zones de toucher < 44 : ' + live.small.join(', '));
  if (!live.focus || !live.tabHidden) fail('barre d\'onglets effacée pendant la séance');
  if (live.w.dc_haltere !== 10 || live.w.curl_biceps !== 4 || live.w.squat_gobelet !== 12) fail('première charge réaliste (10 / 4 / 12 kg)');
  // 2. retirer un exercice → « Annuler » le remet à sa place
  await p.evaluate(() => { liveFocusIdx = 0; ACT.removeExoOverview({ idx: '1' }); }); await p.waitForTimeout(250);
  const t1 = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, btn: !!document.querySelector('#toast.has-act .t-undo'), n: S.draft.exos.length }));
  await p.click('#toast .t-undo'); await p.waitForTimeout(250);
  const u1 = await p.evaluate(() => S.draft.exos.map(e => e.exoId).join());
  log('Undo remove:', JSON.stringify(t1), '→', u1); if (!t1.btn || t1.n !== 2 || u1 !== 'dc_haltere,curl_biceps,squat_gobelet') fail('annuler le retrait d\'un exercice');
  // fin de séance : la barre d'onglets revient
  await p.evaluate(() => { S.draft.exos.forEach(e => e.sets.forEach(s => { s.done = true; })); finalizeSession(); }); await p.waitForTimeout(900);
  await p.evaluate(() => closeSheet()); await p.waitForTimeout(400);
  if (await p.evaluate(() => document.body.classList.contains('live-focus'))) fail('barre d\'onglets de retour après la séance');
  await p.context().close();

  // 3. supprimer une séance de l'historique → « Annuler » la rétablit (même identifiant, même place)
  p = await open(base);
  await p.evaluate(() => { switchTab('history'); ACT.deleteSession({ id: 'a1' }); }); await p.waitForTimeout(300);
  await p.click('[data-a="confirmYes"]'); await p.waitForTimeout(400);
  const d1 = await p.evaluate(() => ({ ids: S.sessions.map(s => s.id).join(), toast: document.getElementById('toast').textContent }));
  await p.click('#toast .t-undo'); await p.waitForTimeout(300);
  const d2 = await p.evaluate(() => S.sessions.map(s => s.id).join());
  log('Undo delete session:', JSON.stringify(d1), '→', d2); if (d1.ids !== 'a2' || d2 !== 'a1,a2') fail('annuler la suppression d\'une séance');
  // sans toucher « Annuler », le message disparaît et la suppression reste
  await p.evaluate(() => { ACT.deleteSession({ id: 'a2' }); }); await p.waitForTimeout(300); await p.click('[data-a="confirmYes"]'); await p.waitForTimeout(5600);
  const d3 = await p.evaluate(() => ({ ids: S.sessions.map(s => s.id).join(), shown: document.getElementById('toast').classList.contains('show'), undo: typeof toastUndoFn === 'function' }));
  log('Undo expired:', JSON.stringify(d3)); if (d3.ids !== 'a1' || d3.shown || d3.undo) fail('« Annuler » expire après 5 s');
  // taille du texte : hors Safari, 17 px ; retour haptique sans erreur
  const misc = await p.evaluate(() => { haptic(10); return getComputedStyle(document.documentElement).fontSize; });
  if (!wk && misc !== '17px') fail('taille de base 17 px hors réglage iOS : ' + misc);
  // CSP présente
  if (!(await p.evaluate(() => /connect-src 'self'/.test((document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '')))) fail('politique de sécurité du contenu');
  await p.context().close();

  // 4. sauvegarde piégée : identifiants et réglages ne peuvent rien injecter
  const X = n => `"><img src=x onerror="window.__xss=(window.__xss||'')+'${n};'">`;
  p = await open({ meta: { onboarded: true }, settings: { name: X('name'), theme: X('theme') }, goals: { daysPerWeek: X('days'), level: X('lvl') },
    equipment: { owned: { dumbbells: true }, custom: [{ id: X('cid'), n: X('cname') }] },
    sessions: [{ id: X('sid'), date: iso(1), tplId: X('tpl'), note: X('note'), exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }] }] }],
    templates: [{ id: X('tid'), n: X('tname'), days: [0, 1, 2, 3, 4, 5, 6], exos: [{ exoId: 'pompes', sets: 3 }] }],
    targets: [{ id: X('gid'), exoId: 'pompes', kind: 'reps', value: 30, start: iso(9) }], custom: { exos: [{ exoId: 'pompes', sets: 3 }], tplId: X('ctpl') } });
  const steps = [() => switchTab('today'), () => switchTab('history'), () => ACT.openSessionDetail({ id: S.sessions[0].id }), () => closeSheet(),
    () => { switchTab('progress'); ACT.progressTab({ v: 'overview' }); }, () => ACT.progressTab({ v: 'medals' }), () => switchTab('profil'), () => openEquip(), () => closeSheet(), () => openGoals(), () => closeSheet(), () => switchTab('today')];
  for (const f of steps) { await p.evaluate(f); await p.waitForTimeout(350); }
  const x = await p.evaluate(() => ({ xss: window.__xss || '', ids: [S.sessions[0].id, S.templates[0].id, S.targets[0].id, S.equipment.custom[0].id].every(i => /^[A-Za-z0-9_.:-]+$/.test(i)),
    days: S.goals.daysPerWeek, level: S.goals.level, theme: S.settings.theme }));
  log('Trapped backup:', JSON.stringify(x)); if (x.xss || !x.ids || x.days !== 3 || x.level !== 'intermediaire' || x.theme !== 'auto') fail('sauvegarde piégée neutralisée');
  await p.context().close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
