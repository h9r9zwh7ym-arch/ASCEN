// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Passe de vérification : contraste AA du texte orange et gris, vraies cibles de 44 pt (contrôles segmentés,
// calendrier, boutons − / +, puces défilantes), derniers records sans doublon, claviers des champs, import de
// programme borné (fichier « null », 1 000 000 000 séries), fin de séance protégée (double appui, séance
// oubliée ouverte), vignettes 3D après les animations de fin de séance, CSS mort retiré.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v60'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1); const ss = [];
    for (let k = 60; k >= 2; k -= 2) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, name: 'Haut du corps', exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(j => ({ reps: 10, weight: 8 + Math.floor((60 - k) / 10) * 2, done: true, pr: k <= 6 && !j })) }, { exoId: 'squat_gobelet', sets: [0, 1].map(j => ({ reps: 12, weight: 12 + (k <= 4 ? 2 : 0), done: true, pr: k === 4 && !j })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18, 20, 22] } }, sessions: ss })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });
  // contraste (WCAG) entre deux couleurs CSS calculées
  await page.evaluate(() => { window.__cr = (a, b) => { const L = c => { const m = c.match(/[\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * m[0] + .7152 * m[1] + .0722 * m[2]; };
    const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    window.__hit = (el, dy, dx) => { const r = el.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2 + (dx || 0), r.top + r.height / 2 + dy); return !!h && (h === el || el.contains(h)); }; });

  // 1. contraste : texte orange et gris secondaire sur le fond gris de l'app (≥ 4,5:1)
  const cr = await page.evaluate(() => { const bg = getComputedStyle(document.body).backgroundColor, t = document.createElement('i'); document.body.appendChild(t);
    t.style.color = 'var(--tint-ink)'; const ink = getComputedStyle(t).color; t.style.color = 'var(--label2)'; const l2 = getComputedStyle(t).color; t.remove(); return { ink: __cr(ink, bg), label2: __cr(l2, bg) }; });
  log('Contrast on page background:', JSON.stringify(cr)); if (cr.ink < 4.5 || cr.label2 < 4.5) fail('contraste du texte orange / gris secondaire');

  // 2. cibles de 44 pt réelles : contrôle segmenté (petit, Statistiques), cases du calendrier, boutons − / +
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'stats' }); }); await wait(700);
  const seg = await page.evaluate(() => { const b = document.querySelector('[data-seg="histRange"] button:not(.on)'), r = b.getBoundingClientRect(), all = document.querySelector('[data-seg="histMetric"] button:not(.on)');
    return { h: Math.round(r.height), up: __hit(b, -19), down: __hit(b, 19), span: !!b.querySelector('span'), color: __cr(getComputedStyle(all).color, getComputedStyle(all.parentElement).backgroundColor === 'rgba(0, 0, 0, 0)' ? '#fff' : getComputedStyle(document.querySelector('.chart-card')).backgroundColor) }; });
  log('Segmented:', JSON.stringify(seg)); if (!seg.up || !seg.down || !seg.span) fail('contrôle segmenté : cible de 44 pt');
  await page.evaluate(() => switchTab('history')); await wait(600);
  const cal = await page.evaluate(() => { const b = document.querySelector('.hc-on'); return { up: __hit(b, -21), side: __hit(b, 0, 21) }; });
  log('Calendar day:', JSON.stringify(cal)); if (!cal.up || !cal.side) fail('jour du calendrier : cible de 44 pt');
  await page.evaluate(() => openGoals()); await wait(600);
  const step = await page.evaluate(() => { const b = document.querySelector('.stepper button'); return { up: __hit(b, -21), down: __hit(b, 21) }; });
  log('Stepper:', JSON.stringify(step)); if (!step.up || !step.down) fail('boutons − / + : cible de 44 pt');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { switchTab('today'); openPicker({ title: 'x', multi: true, onDone: () => {} }); }); await wait(800);
  const chip = await page.evaluate(() => { const c = document.querySelector('#pickerCats .chip:not(.on)'); return { up: __hit(c, -19), down: __hit(c, 19) }; });
  log('Picker chip:', JSON.stringify(chip)); if (!chip.up || !chip.down) fail('puces défilantes : cible de 44 pt');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 3. derniers records : un exercice n'apparaît qu'une fois
  await page.evaluate(() => { switchTab('progress'); ACT.progressTab({ v: 'overview' }); }); await wait(700);
  const rec = await page.evaluate(() => [...document.querySelectorAll('.rec-group .row .t')].map(e => e.textContent));
  log('Recent records:', rec.join(' | ')); if (!rec.length || new Set(rec).size !== rec.length) fail('derniers records sans doublon');

  // 4. saisie : clavier du prénom, équipement perso borné et sans doublon, Entrée qui ajoute
  await page.evaluate(() => ACT.editName()); await wait(500);
  const nm = await page.evaluate(() => { const i = document.querySelector('#nameInput'); return { cap: i.getAttribute('autocapitalize'), key: i.getAttribute('enterkeyhint'), corr: i.getAttribute('autocorrect'), align: getComputedStyle(i).textAlign }; });
  log('Name field:', JSON.stringify(nm)); if (nm.cap !== 'words' || nm.key !== 'done' || nm.corr !== 'off' || nm.align !== 'left') fail('champ du prénom');
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => openEquip()); await wait(600);
  await page.fill('#customEquipName', '  Gilet   lesté  ' + 'x'.repeat(60)); await page.press('#customEquipName', 'Enter'); await wait(300);
  await page.fill('#customEquipName', 'GILET LESTÉ ' + 'X'.repeat(60)); await page.evaluate(() => ACT.addCustomEquip()); await wait(300);
  const eq = await page.evaluate(() => ({ n: S.equipment.custom.length, name: (S.equipment.custom[0] || {}).n || '', max: document.querySelector('#customEquipName').maxLength }));
  log('Custom equipment:', JSON.stringify({ n: eq.n, len: eq.name.length, start: eq.name.slice(0, 12), max: eq.max }));
  if (eq.n !== 1 || eq.name.length > 40 || !eq.name.startsWith('Gilet lesté') || eq.max !== 40) fail('équipement perso : Entrée, longueur, doublon');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 5. import de programme : fichiers abîmés refusés sans erreur, tailles bornées, nettoyé au chargement
  const imp = await page.evaluate(() => { const r1 = importProgramJSON('null'), r2 = importProgramJSON('[1,2]');
    const t0 = performance.now(); const r3 = importProgramJSON(JSON.stringify({ sessions: [{ nom: { x: 1 }, exercices: [{ nom: 'Pompes', series: 1e9, reps: '8-12', poids: '12,5' }, null, { name: 'Squat gobelet', sets: '4' }] }] }));
    const ms = performance.now() - t0, d = buildSessionFromImported(S.importedProgram[0]);
    const st = normalizeState({ sessions: [], importedProgram: { a: 1 } }), st2 = normalizeState({ sessions: [], importedProgram: [{ name: 'A', exercises: [{ name: 'Pompes', sets: 99 }] }] });
    const out = { r1: r1.ok, r2: r2.ok, r3: r3.ok, ms: Math.round(ms), sets: d.exos.map(e => e.sets.length), w: d.exos[0] && d.exos[0].sets[0].weight, name: typeof S.importedProgram[0].nom,
      obj: st.importedProgram.length, old: st2.importedProgram[0] && st2.importedProgram[0].exercices[0].series };
    S.importedProgram = []; save(); return out; });
  log('Import:', JSON.stringify(imp));
  if (imp.r1 || imp.r2 || !imp.r3 || imp.ms > 500 || imp.sets.join() !== '10,4' || imp.w !== 12.5 || imp.name !== 'string' || imp.obj !== 0 || imp.old !== 10) fail('import de programme borné');

  // 6. fin de séance : double appui sans erreur, séance oubliée arrêtée à la dernière série
  await page.evaluate(() => { switchTab('today'); S.custom = { exos: [{ exoId: 'squat_gobelet', sets: 2 }] }; ACT.startCustom(); }); await wait(4600);
  await page.evaluate(() => { const l = document.querySelector('#launch'); if (l) l.click(); }); await wait(600);
  await page.click('.focus-card [data-a="validateSet"]'); await wait(400);
  const fin = await page.evaluate(async () => { const h = Date.now() - 10 * 3600e3; S.draft.startedAt = new Date(h).toISOString(); S.draft.lastSetAt = h + 3600e3;
    S.draft.exos.forEach(e => e.sets.forEach(s => { s.done = true; })); stopRestTimer();
    const id = S.draft.id; ACT.finishSession(); ACT.finishSession(); finalizeSession(); ACT.validateSet({ exi: '0' });
    await new Promise(r => setTimeout(r, 300)); const s = S.sessions.find(x => x.id === id);
    return { n: S.sessions.filter(x => x.id === id).length, dur: s && s.durationSec, hold: T3D.holdUntil > performance.now() }; });
  log('Finish:', JSON.stringify(fin));
  if (fin.n !== 1 || !(fin.dur >= 3600 && fin.dur <= 3700) || !fin.hold) fail('fin de séance : double appui, séance oubliée, vignettes 3D après les animations');
  await wait(2500); await shot('01_finish');
  await page.evaluate(() => closeSheet()); await wait(500);

  // 7. CSS mort retiré (anciennes barres de séance, planning de semaine, pastilles d'accueil)
  const css = await page.evaluate(() => [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
  const dead = ['.ls-chip', '.week-plan', '.hero-picts', '.set-dots', '.celebrate-ring', '.focus-nav', '.stat-pills', '.region-bar'].filter(c => css.includes(c));
  log('Dead CSS left:', dead.join(' ') || 'none'); if (dead.length) fail('CSS mort : ' + dead.join(' '));

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
