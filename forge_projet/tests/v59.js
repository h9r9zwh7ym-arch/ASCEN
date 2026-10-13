// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Harmonisation des écrans secondaires : un seul orange (plus de couleurs de région, d'ancien orange ni de
// teintes iOS), choix exclusifs en encre, champs de texte alignés à gauche, sélections visibles au premier
// lancement (ombre « none » qui invalidait la règle), copie de secours chiffrée (plus de « NaN Mo »),
// étapes d'installation lisibles en entier, Rewind dans la palette de la marque. En clair et en sombre.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v59'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1); const ss = [];
    for (let k = 90; k >= 2; k -= 2) { const d = new Date(); d.setDate(d.getDate() - k);
      ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), startedAt: d.toISOString(), durationSec: 2400, name: 'Haut du corps', tplId: 'tp1',
        exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 8 + Math.floor((90 - k) / 15) * 2, done: true })) }, { exoId: 'rowing_uni_haltere', sets: [0, 1].map(() => ({ reps: 10, weight: 12, done: true })) },
          { exoId: 'squat_gobelet', sets: [0, 1].map(() => ({ reps: 12, weight: 12, done: true })) }, { exoId: 'planche', sets: [{ reps: 45, done: true }] }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, settings: { name: 'Yannick' },
      equipment: { owned: { dumbbells: true, bench: true, pullup_bar: true }, weights: { dumbbells: [8, 10, 12, 14, 16, 18, 20] } }, sessions: ss,
      templates: [{ id: 'tp1', n: 'Haut du corps', days: [1, 4], exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'rowing_uni_haltere', sets: 3 }, { exoId: 'pompes', sets: 2 }] }] })); };
  const open = async (opts, withSeed) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich', hasTouch: wk, isMobile: wk }, opts || {}));
    const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    if (withSeed !== false) await page.addInitScript(seed);
    await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(800);
    return page;
  };
  // couleurs qui ne doivent plus apparaître : régions (clair et sombre), ancien orange, teintes iOS des statuts
  const FORBIDDEN = ['#eb6834', '#2a78d6', '#1baf7a', '#7a55d6', '#d95926', '#3987e5', '#199e70', '#8a63e8', '#b25000', '#ff9f0a', '#30b0c7', '#af52de', '#5856d6', '#7a3fc4', '#bf80ff'];
  const scan = (page, sel) => page.evaluate(([sel, bad]) => {
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(',');
    const B = new Set(bad.map(rgb)), hits = new Set();
    const key = v => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(v || ''); return m && (m[4] === undefined || +m[4] > 0) ? m[1] + ',' + m[2] + ',' + m[3] : null; };
    document.querySelectorAll(sel).forEach(root => [root, ...root.querySelectorAll('*')].forEach(el => {
      if (!el.getClientRects().length) return;
      const cs = getComputedStyle(el);
      for (const p of ['color', 'backgroundColor', 'fill', 'stroke', 'borderLeftColor']) { const k = key(cs[p]); if (k && B.has(k)) hits.add(p + ' ' + k + ' ' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className)); }
      const g = cs.backgroundImage; if (g && g !== 'none') (g.match(/rgba?\([^)]*\)/g) || []).forEach(c => { const k = key(c); if (k && B.has(k)) hits.add('gradient ' + k + ' ' + el.className); });
    }));
    return [...hits];
  }, [sel, FORBIDDEN]);
  const tokenRGB = (page, v) => page.evaluate(v => { const e = document.createElement('i'); e.style.color = `var(${v})`; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; }, v);

  // 1. premier lancement : champs de texte à gauche, matériel et objectif cochés visibles, libellés alignés
  let page = await open(null, false);
  const wait = ms => page.waitForTimeout(ms);
  await wait(500);
  const ob0 = await page.evaluate(() => { const i = document.querySelector('#obName'), s = document.querySelector('#obBody>.te-sec'), f = i.closest('.num-field');
    return { txt: f.classList.contains('txt'), align: getComputedStyle(i).textAlign, fs: parseFloat(getComputedStyle(i).fontSize), label: s.getBoundingClientRect().left - f.getBoundingClientRect().left }; });
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}01_ob_name.png` });
  await page.click('[data-a="obNext"]'); await wait(500);
  await page.click('.ob-eq[data-id="kettlebell"]'); await wait(300);
  const eq = await page.evaluate(() => { const b = document.querySelector('.ob-eq[data-id="kettlebell"]'); return { on: b.classList.contains('on'), aria: b.getAttribute('aria-checked'), ck: getComputedStyle(b.querySelector('.ob-ck')).backgroundColor, ico: getComputedStyle(b.querySelector('.sfi')).color }; });
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}02_ob_equip.png` });
  await page.click('[data-a="obNext"]'); await wait(500);
  await page.click('.ob-goal[data-v="force"]'); await wait(300);
  const goal = await page.evaluate(() => ({ on: [...document.querySelectorAll('.ob-goal.on')].map(b => b.dataset.v), ck: getComputedStyle(document.querySelector('.ob-goal.on .ob-ck')).backgroundColor,
    off: getComputedStyle(document.querySelector('.ob-goal:not(.on) .ob-ck')).backgroundColor, why: getComputedStyle(document.querySelector('#obWhy')).textAlign }));
  await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}03_ob_goal.png` });
  const tint = await tokenRGB(page, '--tint'), tintInk = await tokenRGB(page, '--tint-ink');
  log('Onboarding:', JSON.stringify(ob0), JSON.stringify(eq), JSON.stringify(goal));
  if (!ob0.txt || ob0.align !== 'left' || ob0.fs > 18 || Math.abs(ob0.label - 4) > 1) fail('prénom : champ de texte à gauche, libellé aligné');
  if (!eq.on || eq.aria !== 'true' || eq.ck !== tint || eq.ico !== tintInk) fail('matériel coché visible');
  if (goal.on.join() !== 'force' || goal.ck !== tint || goal.off === tint || goal.why !== 'left') fail('objectif choisi visible');
  const obBad = await scan(page, '#overlay'); if (obBad.length) fail('couleurs hors marque au premier lancement : ' + obBad.join(' | '));
  await page.context().close();

  // 2. écrans secondaires (clair puis sombre) : aucune couleur hors marque
  const screens = [
    ['fiche tirage', () => ACT.showExoInfo({ id: 'rowing_uni_haltere' })], ['fiche jambes', () => ACT.showExoInfo({ id: 'squat_gobelet' })], ['fiche gainage', () => ACT.showExoInfo({ id: 'planche' })],
    ['éditeur', () => ACT.tplOpenEditor({ id: 'tp1' })], ['programme', () => ACT.weekWizard()], ['jour', () => ACT.planDay({ d: '2' })],
    ['force', () => ACT.strengthHow()], ['stockage', () => ACT.openStorage()], ['défis', () => ACT.openChallenges()], ['installer', () => ACT.openInstall()],
  ];
  for (const scheme of ['light', 'dark']) {
    page = await open({ colorScheme: scheme });
    const pre = (scheme === 'dark' ? 'dk_' : '') + (wk ? 'wk_' : '');
    const home = await scan(page, '#v-today'); if (home.length) fail(`accueil (${scheme}) : ` + home.join(' | '));
    const dl = await page.evaluate(() => { const i = document.querySelector('.dl-ic'); return i ? getComputedStyle(i).color : null; });
    if (dl && dl !== await tokenRGB(page, '--tint-ink')) fail('icône de la semaine allégée dans l\'orange de la marque');
    for (const [n, f] of screens) {
      await page.evaluate(f); await page.waitForTimeout(900);
      const bad = await scan(page, '#overlay');
      if (bad.length) fail(`${n} (${scheme}) : ` + bad.join(' | '));
      if (n === 'fiche tirage') {
        const mm = await page.evaluate(() => { const z = document.querySelector('.mm-exo .mm-z.on'); return { fill: z && getComputedStyle(z).fill, dot: getComputedStyle(document.querySelector('.rtag'), '::before').display }; });
        if (mm.fill !== await tokenRGB(page, '--tint') || mm.dot !== 'none') fail('fiche : carte des muscles dans l\'orange, région sans pastille de couleur ' + JSON.stringify(mm));
        await page.screenshot({ path: `${OUT}/${pre}04_fiche.png` });
      }
      if (n === 'éditeur') {
        const ed = await page.evaluate(() => ({ day: getComputedStyle(document.querySelector('.te-days button.on')).backgroundColor, split: (document.querySelector('.te-split') || {}).textContent || '',
          bar: !!document.querySelector('#tplEdBody .region-bar'), name: getComputedStyle(document.querySelector('#tplEdName')).textAlign, del: getComputedStyle(document.querySelector('.te-del')).color }));
        log('Editor:', JSON.stringify(ed));
        if (ed.day !== await tokenRGB(page, '--label') || !/Poussée \d+ · Tirage \d+/.test(ed.split) || ed.bar || ed.name !== 'left' || ed.del !== await tokenRGB(page, '--red')) fail('éditeur : jours en encre, répartition en clair, nom à gauche, suppression en rouge');
        await page.screenshot({ path: `${OUT}/${pre}05_editor.png` });
      }
      if (n === 'programme' && await page.evaluate(() => !!document.querySelector('#wzBody .tc-bar-s'))) fail('programme : barres de couleur');
      if (n === 'stockage') {
        await page.waitForTimeout(600);
        const idb = await page.evaluate(() => document.querySelector('#stoIdb').textContent);
        log('Backup size:', JSON.stringify(idb)); if (!/^\d[\d,]* (o|Ko|Mo)$/.test(idb) || /NaN/.test(idb)) fail('taille de la copie de secours : ' + idb);
      }
      if (n === 'installer') {
        const cut = await page.evaluate(() => [...document.querySelectorAll('.install-steps .s')].filter(s => s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1).length);
        const pad = await page.evaluate(() => { const p = document.querySelector('#overlay .sheet-body > p.body'), g = document.querySelector('.install-steps'); return p.getBoundingClientRect().left - g.getBoundingClientRect().left; });
        if (cut || Math.abs(pad - 4) > 1) fail(`installation : étapes coupées (${cut}) ou texte collé au bord (${pad})`);
        await page.screenshot({ path: `${OUT}/${pre}06_install.png` });
      }
      await page.evaluate(() => { closeSheet(); closeSheet(); }); await page.waitForTimeout(450);
    }
    if (scheme === 'light') {
      // Rewind : la palette de la marque, d'une diapo à l'autre
      await page.evaluate(() => openRewind('month', todayISO().slice(0, 7))); await page.waitForTimeout(1800);
      const bgs = await page.evaluate(async () => { const out = []; for (let i = 0; i < rw.slides.length; i++) { rwGo(i); await new Promise(r => setTimeout(r, 120)); out.push(rw.el.dataset.bg); } return out; });
      await page.evaluate(() => rwGo(3)); await page.waitForTimeout(1200); await page.screenshot({ path: `${OUT}/${wk ? 'wk_' : ''}07_rewind.png` });
      const rwBad = await scan(page, '#rewind');
      log('Rewind:', bgs.join(','));
      if (!bgs.length || bgs.some(b => !['ember', 'night', 'ink', 'rust', 'stone', 'gold'].includes(b)) || rwBad.length) fail('Rewind dans la palette de la marque : ' + bgs.join(',') + ' ' + rwBad.join(' | '));
    }
    await page.context().close();
  }

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
