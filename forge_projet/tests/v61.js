// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Revue « vraie app » (lots A, B, C) : séance lisible sur iPhone SE, noms d'exercices sur deux lignes et nom anglais
// à part, haltères choisis en touchant des charges, matériel et objectif en listes à cocher, corrections
// d'historique protégées (« Ignorer les modifications ? »), et les finitions des lots suivants.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v61'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    const ss = [];
    for (let k = 40; k >= 2; k -= 4) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2100, name: 'Haut du corps',
        exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) },
          { exoId: 'squat_gobelet', sets: [0, 1, 2].map(() => ({ reps: 12, weight: 14, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true }, weights: { dumbbells: [8, 10, 12, 14, 16] } }, sessions: ss })); };

  // 1. premier lancement : matériel et objectif en listes à cocher, haltères en charges à toucher
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(600);
    await page.click('[data-a="obNext"]'); await page.waitForTimeout(500);
    await page.click('[data-a="obEquip"][data-id="dumbbells"]'); await page.waitForTimeout(700);
    const ob = await page.evaluate(() => { const b = document.querySelector('#obBody'), r = b.getBoundingClientRect(), g = document.querySelector('.ob-kg').getBoundingClientRect();
      return { over: b.scrollWidth > b.clientWidth + 1, rows: document.querySelectorAll('.ob-list .ob-eq').length, aria: document.querySelector('.ob-eq[data-id="dumbbells"]').getAttribute('aria-checked'),
        kgVisible: g.top < r.bottom && g.bottom > r.top, chips: document.querySelectorAll('.ob-w').length, text: !!document.querySelector('#obDb') }; });
    for (const v of ['2.5', '10']) await page.click(`[data-a="obDbW"][data-v="${v}"]`);
    await page.fill('#obDbAdd', '11,25'); await page.press('#obDbAdd', 'Enter'); await page.waitForTimeout(250);
    await page.fill('#obDbAdd', 'abc'); await page.click('[data-a="obDbAdd"]'); await page.waitForTimeout(250);
    const kg = await page.evaluate(() => ({ w: S.equipment.weights.dumbbells.join(','), on: [...document.querySelectorAll('.ob-w.on')].map(b => b.textContent).join(' '), toast: document.querySelector('#toast').textContent }));
    await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_ob_kg_320.png` });
    log('Onboarding:', JSON.stringify(ob), JSON.stringify(kg));
    if (ob.over || ob.rows !== 14 || ob.aria !== 'true' || !ob.kgVisible || ob.chips < 20 || ob.text) fail('matériel en liste et charges visibles');
    if (kg.w !== '2.5,10,11.25' || kg.on !== '2,5 10 11,25' || !/entre/.test(kg.toast)) fail('charges des haltères');
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed);
  await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
  const wait = ms => page.waitForTimeout(ms), shot = n => page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}${n}.png` });

  // 2. correction d'une séance passée : quitter avec des changements demande confirmation
  await page.evaluate(() => openSheet(sessionDetailHTML(S.sessions[S.sessions.length - 1]))); await wait(500);
  await page.click('[data-a="histEdit"]'); await wait(500);
  await page.fill('.he-in[data-k="reps"]', '15'); await page.dispatchEvent('.he-in[data-k="reps"]', 'change'); await wait(100);
  await page.click('[data-a="heCancel"]'); await wait(500);
  const ask = await page.evaluate(() => ({ label: (document.querySelector('.as-label, .action-sheet .as-t, #overlay .as-msg') || {}).textContent || document.querySelector('#overlay').textContent.slice(0, 200), btns: [...document.querySelectorAll('#overlay button')].map(b => b.textContent.trim()) }));
  await shot('02_he_ask');
  await page.click('[data-a="heResume"]'); await wait(500);
  const kept = await page.evaluate(() => (document.querySelector('.he-in[data-k="reps"]') || {}).value);
  await page.click('[data-a="heCancel"]'); await wait(400); await page.click('[data-a="heDiscard"]'); await wait(500);
  const after = await page.evaluate(() => ({ reps: S.sessions[S.sessions.length - 1].exos[0].sets[0].reps, detail: !!document.querySelector('#overlay [data-a="histEdit"]') }));
  log('History edit guard:', JSON.stringify(ask.btns), kept, JSON.stringify(after));
  if (!ask.btns.some(t => /Ignorer les modifications/.test(t)) || !ask.btns.some(t => /Continuer à modifier/.test(t)) || kept !== '15' || after.reps !== 10 || !after.detail) fail('corrections d\'historique protégées');
  // sans changement : « Annuler » revient directement au détail
  await page.click('[data-a="histEdit"]'); await wait(400); await page.click('[data-a="heCancel"]'); await wait(400);
  if (!(await page.$('#overlay [data-a="histEdit"]'))) fail('annuler sans changement');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 3. noms longs : deux lignes plutôt qu'une coupure ; nom anglais à part dans la fiche
  const names = await page.evaluate(() => { const e = EXOS_ALL.filter(x => x.aka); return { n: e.length, paren: EXOS_ALL.filter(x => /\(([^)]*\b(press|curl|row|raise|fly|pull|push|lunge|bridge|dip)s?\b[^)]*)\)/i.test(x.n)).map(x => x.n) }; });
  log('Aliases:', JSON.stringify(names));
  if (names.n < 10 || names.paren.length) fail('noms anglais séparés');

  // 4. lot B : feuilles modales (rôle, titre, fond inerte), interrupteurs, Objectifs en liste et steppers compacts
  await page.evaluate(() => { switchTab('profil'); openGoals(); }); await wait(600);
  const goals = await page.evaluate(() => { const d = document.querySelector('#overlay .sheet');
    return { modal: d.getAttribute('aria-modal'), label: (document.getElementById(d.getAttribute('aria-labelledby') || 'x') || {}).textContent, inert: document.querySelector('#app').inert && document.querySelector('.tabbar').inert,
      focus: document.activeElement === d, radios: [...document.querySelectorAll('#overlay .ck-row[role="radio"]')].map(r => r.textContent.trim().split(/\s{2,}|\n/)[0]).length, mini: document.querySelectorAll('#overlay .mini-step').length,
      hd: parseFloat(getComputedStyle(document.querySelector('#overlay .sheet-body h2.sh')).fontSize), title: parseFloat(getComputedStyle(document.querySelector('#overlay .sheet-hd .t')).fontSize) }; });
  await page.click('#overlay .ck-row[data-v="endurance"]'); await wait(300);
  const goal2 = await page.evaluate(() => ({ g: S.goals.overall, on: document.querySelector('#overlay .ck-row.on').dataset.v, aria: document.querySelector('#overlay .ck-row[data-v="endurance"]').getAttribute('aria-checked') }));
  await page.evaluate(() => closeSheet()); await wait(450);
  const freed = await page.evaluate(() => !document.querySelector('#app').inert && !document.querySelector('.tabbar').inert);
  log('Goals sheet:', JSON.stringify(goals), JSON.stringify(goal2), 'freed', freed);
  if (goals.modal !== 'true' || goals.label !== 'Objectifs' || !goals.inert || !goals.focus || !freed) fail('feuille modale : rôle, titre, fond inerte, focus');
  if (goals.radios !== 3 || goals.mini !== 2 || !(goals.hd < goals.title + 0.5) || goal2.g !== 'endurance' || goal2.on !== 'endurance' || goal2.aria !== 'true') fail('Objectifs : liste à cocher, steppers compacts, en-têtes discrets');
  await page.evaluate(() => openAppearance()); await wait(500);
  const sw = await page.evaluate(() => { const b = document.querySelector('#overlay .switch'); return { role: b.getAttribute('role'), before: b.getAttribute('aria-checked'), pressed: b.hasAttribute('aria-pressed') }; });
  await page.click('#overlay .switch'); await wait(200);
  const sw2 = await page.evaluate(() => document.querySelector('#overlay .switch').getAttribute('aria-checked'));
  await page.click('#overlay .switch'); await wait(200);
  log('Switch:', JSON.stringify(sw), sw2);
  if (sw.role !== 'switch' || sw.pressed || sw2 === sw.before) fail('interrupteurs lus comme tels');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 5. suppression d'une séance : feuille d'actions, « Annuler » revient au détail
  await page.evaluate(() => { switchTab('progress'); openSheet(sessionDetailHTML(S.sessions[0])); }); await wait(500);
  await page.click('[data-a="deleteSession"]'); await wait(400);
  const del = await page.evaluate(() => ({ as: !!document.querySelector('.action-sheet'), danger: (document.querySelector('.as-btn.danger') || {}).textContent }));
  await page.click('.as-cancel'); await wait(500);
  const back = await page.evaluate(() => !!document.querySelector('#overlay [data-a="histEdit"]'));
  log('Delete:', JSON.stringify(del), 'cancel → detail', back);
  if (!del.as || del.danger !== 'Supprimer la séance' || !back) fail('suppression : feuille d\'actions et retour au détail');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 6. couleurs et textes : stimulus à l'orange de la marque, pas de « Le plus travaillé » en double, phrase de priorité en clair
  await page.evaluate(() => ACT.progressTab({ v: 'muscles', instant: true })); await wait(800);
  const mus = await page.evaluate(() => { const i = document.querySelector('.wv-row.z-ok .wv-track i, .wv-row.z-high .wv-track i'), t = document.createElement('b'); t.style.color = 'var(--tint)'; document.body.appendChild(t); const tint = getComputedStyle(t).color; t.remove();
    return { bar: i ? getComputedStyle(i).backgroundColor : tint, tint, top: !!document.querySelector('.mm-top'), prio: stimTargetsText([{ id: 'ischios', n: 'Ischios', sets: 1 }, { id: 'biceps', n: 'Biceps', sets: 2.5 }]) }; });
  log('Muscles:', JSON.stringify(mus));
  if (mus.bar !== mus.tint || mus.top || mus.prio !== 'En priorité cette semaine : ischio-jambiers (1 série sur 4), biceps (2,5 séries sur 4).') fail('stimulus à l\'orange, sans doublon, phrase claire');
  await page.evaluate(() => ACT.progressTab({ v: 'overview', instant: true })); await wait(300);

  // 8. lot C : toast en bas (au-dessus des onglets), en haut sur une feuille ; rangées d'action sans chevron ; unités du détail ; « 1er »
  await page.evaluate(() => { switchTab('today'); toast('Retiré : Pompes', null, () => {}); }); await wait(500);
  const tb = await page.evaluate(() => { const r = document.querySelector('#toast').getBoundingClientRect(), t = document.querySelector('.tabbar').getBoundingClientRect(); return { b: r.bottom, tab: t.top, top: r.top }; });
  await page.evaluate(() => { openGoals(); toast('Test'); }); await wait(500);
  const ts = await page.evaluate(() => Math.round(document.querySelector('#toast').getBoundingClientRect().top));
  await page.evaluate(() => closeSheet()); await wait(400);
  await page.evaluate(() => { switchTab('profil'); ACT.openData(); }); await wait(500);
  const rows = await page.evaluate(() => ['backupData', 'restoreData', 'exportCSV', 'confirmReset'].map(a => { const r = document.querySelector(`[data-a="${a}"]`); return r ? !!r.querySelector('.chev') : null; }));
  const red = await page.evaluate(() => { const t = document.querySelector('[data-a="confirmReset"] .t'), e = document.createElement('i'); e.style.color = 'var(--red)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return getComputedStyle(t).color === c; });
  await page.evaluate(() => closeSheet()); await wait(400);
  const det = await page.evaluate(() => { const s = { id: 'x', date: '2026-10-01', durationSec: 600, exos: [{ exoId: 'planche', sets: [{ reps: 45, done: true }] }, { exoId: 'pompes', sets: [{ reps: 15, done: true }, { done: true }] }] };
    openSheet(sessionDetailHTML(s)); const chips = [...document.querySelectorAll('#overlay .set-chips .chip')].map(c => c.textContent); closeSheet(); return { chips, d: fmtDate('2026-10-01', 'long') }; });
  await wait(400);
  log('Toast:', JSON.stringify(tb), 'on sheet top', ts, '| chevrons', JSON.stringify(rows), 'red', red, '| detail', JSON.stringify(det));
  if (!(tb.b <= tb.tab && tb.top > 400) || ts > 120) fail('toast en bas, en haut sur une feuille');
  if (rows.some(x => x !== false) || !red) fail('rangées d\'action sans chevron, réinitialiser en rouge');
  if (det.chips.join('|') !== '45 s|15 rép.|–' || det.d !== 'jeudi 1er oct.') fail('unités du détail et « 1er »');

  // 9. choix d'exercices : glisser vers le bas avec une sélection demande d'abord
  await page.evaluate(() => { switchTab('today'); openPicker({ title: 'x', multi: true, onDone: ids => { window.__picked = ids; closeSheet(); } }); }); await wait(600);
  await page.evaluate(() => [...new Set([...document.querySelectorAll('#pickerList [data-a="pickerTap"]')].map(r => r.dataset.id))].slice(0, 2).forEach(id => document.querySelector(`#pickerList [data-a="pickerTap"][data-id="${id}"]`).click())); await wait(200);
  const sel = await page.evaluate(() => picker.selected.length);
  await page.evaluate(() => dismissSheet()); await wait(400);
  const pAsk = await page.evaluate(() => [...document.querySelectorAll('.action-sheet button')].map(b => b.textContent.trim()));
  await page.click('.as-cancel'); await wait(500);
  const pKept = await page.evaluate(() => ({ list: !!document.querySelector('#pickerList'), n: picker && picker.selected.length }));
  log('Picker guard:', sel, JSON.stringify(pAsk), JSON.stringify(pKept));
  if (!sel || !pAsk.some(t => /^Ajouter/.test(t)) || !pAsk.includes('Ignorer la sélection') || !pAsk.includes('Continuer à choisir') || !pKept.list || pKept.n !== sel) fail('choix d\'exercices : sélection protégée');
  await page.evaluate(() => closeSheet()); await wait(400);

  // 10. séance complète : chrono figé à la dernière série, pas de second « Terminer »
  await page.evaluate(() => { S.draft = { startedAt: new Date(Date.now() - 20 * 60000).toISOString(), lastSetAt: Date.now() - 5 * 60000, source: 'custom', exos: [{ exoId: 'pompes', sets: [{ reps: 10, done: true }, { reps: 10, done: true }] }] }; save(); renderView('today'); }); await wait(1500);
  const done1 = await page.evaluate(() => ({ card: !!document.querySelector('.complete-card'), end: getComputedStyle(document.querySelector('.sx-end')).visibility, clock: document.getElementById('liveClock').textContent }));
  await wait(1200);
  const done2 = await page.evaluate(() => document.getElementById('liveClock').textContent);
  log('Complete:', JSON.stringify(done1), done2);
  if (!done1.card || done1.end !== 'hidden' || done1.clock !== '15:00' || done2 !== '15:00') fail('séance complète : chrono figé, un seul bouton');
  await page.evaluate(() => { S.draft = null; save(); renderView('today'); }); await wait(300);

  // 7. nouvel utilisateur : états vides au même format (symbole gris, titre, texte, une action)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await p2.addInitScript(() => localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true } })));
  await p2.goto(APP); await p2.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await p2.waitForTimeout(500);
  const empties = [];
  for (const v of ['overview', 'force', 'stats', 'muscles', 'exos']) {
    await p2.evaluate(v => { if (currentTab !== 'progress') switchTab('progress'); ACT.progressTab({ v, instant: true }); }, v); await p2.waitForTimeout(400);
    empties.push(await p2.evaluate(() => { const e = document.querySelector('#v-progress .empty-state'); if (!e) return null; const p = e.querySelector('.sfi svg > *'), cs = p && getComputedStyle(p);
      return { t: (e.querySelector('.es-t') || {}).textContent, cta: (e.querySelector('.es-cta') || {}).textContent, stroke: cs ? (cs.stroke !== 'none' ? cs.stroke : cs.fill) : '' }; }));
  }
  const gray = await p2.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--label3)'; document.body.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return c; });
  await p2.evaluate(() => document.querySelector('#v-progress .es-cta').click()); await p2.waitForTimeout(500);
  const went = await p2.evaluate(() => currentTab);
  log('Empty states:', JSON.stringify(empties), '→', went);
  if (empties.some(e => !e || !e.t || e.cta !== 'Commencer une séance' || (e.stroke && e.stroke !== gray)) || went !== 'today') fail('états vides harmonisés');
  await ctx2.close();

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
