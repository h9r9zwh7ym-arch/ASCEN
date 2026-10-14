// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// Trophées (2.1.4) : moins de texte (plus de descriptions qui répètent l'unité, ni de phrases sur le diamant, ni
// « Complet » / « Secret » sous les vignettes) ; paliers à venir verrouillés (plus d'« Aperçu des paliers » : seul un
// palier gagné se revoit) ; le palier donne le métal et l'émail (plus d'arc-en-ciel de couleurs par trophée).
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v66'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const seed = () => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    const ss = []; for (let k = 120; k >= 1; k -= 3) { const d = new Date(); d.setDate(d.getDate() - k); ss.push({ id: 's' + k, date: d.toLocaleDateString('sv'), durationSec: 2400, source: 'custom', exos: [{ exoId: 'dc_haltere', sets: [0, 1, 2].map(() => ({ reps: 10, weight: 12, done: true })) }] }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now(), lastBackup: new Date().toLocaleDateString('sv') }, equipment: { owned: { dumbbells: true } }, sessions: ss })); };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'Europe/Zurich' });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(seed); await page.goto(APP); await page.waitForSelector('#splash', { state: 'detached', timeout: 15000 }); await page.waitForTimeout(600);
  await page.evaluate(() => checkMedals(true));

  // 1. textes : fiches sans phrase qui répète l'unité ni phrase sur le diamant
  const tx = await page.evaluate(() => {
    const s = MEDAL_MAP.sessions, t = medalTier(s);
    const det = t3dDetailHTML('sessions'), lockd = t3dDetailHTML('prs');
    const descs = MEDALS.filter(m => m.desc).map(m => m.desc);
    return { t, det, lockd, descs, secretDescs: MEDALS.filter(m => m.secret && m.desc).length, all: allMedalsRowHTML(), cards: allMedalsHTML() };
  });
  log('Assiduité palier', tx.t, '·', tx.descs.length, 'descriptions gardées');
  if (tx.t !== 2) fail('jeu de données : Assiduité en argent');
  if (/Nombre de|Aperçu des paliers|Palier diamant atteint|pour le palier/.test(tx.det + tx.lockd)) fail('phrases inutiles de la fiche');
  if (tx.descs.some(d => /diamant/i.test(d)) || tx.secretDescs) fail('descriptions : rien sur le diamant, secrets décrits par leur règle');
  if (!/\d+ \/ \d+ · Or/.test(tx.det)) fail('progression courte « N / M · Or »');
  if (/t3d-tier|t3d-desc/.test(tx.lockd)) fail('trophée pas encore gagné : ni palier ni description');
  if (/à découvrir/.test(tx.all) || !/\d+ sur \d+/.test(tx.all)) fail('ligne « Tous les trophées » : N sur M');
  if (/mc-done|>Complet<|>Secret<|>Découvert</.test(tx.cards)) fail('vignettes sans « Complet » / « Secret » / « Découvert »');

  // 2. paliers verrouillés : seuls les paliers gagnés se revoient, les autres portent un cadenas
  const lk = await page.evaluate(() => {
    const d = document.createElement('div'); d.innerHTML = t3dDetailHTML('sessions');
    const btn = [...d.querySelectorAll('[data-a="t3dMetal"]')].map(b => +b.dataset.v);
    const locked = [...d.querySelectorAll('.t3d-row.locked')].map(r => !!r.querySelector('em .ii'));
    const one = document.createElement('div'); one.innerHTML = t3dDetailHTML('perfect');
    return { btn, locked, on: d.querySelector('.t3d-row.on') && d.querySelector('.t3d-row.on').dataset.v, chips: !!d.querySelector('.t3d-metals,.chip'), perfectBtns: one.querySelectorAll('[data-a="t3dMetal"]').length, perfectTier: medalTier(MEDAL_MAP.perfect) };
  });
  log('Paliers touchables', lk.btn.join(','), '· verrouillés', lk.locked.length, '· actif', lk.on);
  if (lk.btn.join() !== '1,2' || lk.locked.length !== 2 || lk.locked.some(x => !x) || lk.on !== '2' || lk.chips) fail('aperçu limité aux paliers gagnés');
  if (lk.perfectTier <= 1 && lk.perfectBtns) fail('un seul palier gagné : rien à choisir');
  // garde de l'action : un palier non gagné ne s'affiche jamais, même appelé directement
  const guard = await page.evaluate(() => { const was = T3D.ctx; let set = 0; const real = window.t3dSetMedal;
    T3D.ctx = { detail: 'sessions', tier: 2 }; window.t3dSetMedal = () => { set++; };
    try { ACT.t3dMetal({ v: 4 }, null); ACT.t3dMetal({ v: 3 }, null); ACT.t3dMetal({ v: 0 }, null); } finally { T3D.ctx = was; window.t3dSetMedal = real; } return set; });
  if (guard) fail('palier à venir : action refusée');

  // 3. le palier donne le métal et l'émail (2D et 3D), plus de couleur propre au trophée
  const mt = await page.evaluate(() => {
    const a = medalSVG(MEDAL_MAP.sessions, 3), b = medalSVG(MEDAL_MAP.streak, 3), z = medalSVG(MEDAL_MAP.prs, 0);
    const faces = [...document.querySelectorAll('#medal-defs radialGradient[id^="mF-"]')].map(g => g.id);
    const en = Object.values(T3D_METALS).map(m => m.e);
    return { same: a.match(/mF-\w+/)[0] === b.match(/mF-\w+/)[0], face: a.match(/mF-\w+/)[0], locked: z.match(/mF-\w+/)[0], gold: a.includes(MEDAL_ENGRAVE[3]), faces, en,
      pip: getComputedStyle(Object.assign(document.body.appendChild(document.createElement('span')), { className: 'pip t3' })).backgroundImage };
  });
  log('Émail or :', mt.face, '· verrouillé :', mt.locked, '· dégradés d\'émail :', mt.faces.join(' '));
  if (!mt.same || mt.face !== 'mF-3' || mt.locked !== 'mF-0' || !mt.gold) fail('2D : émail et gravure du palier');
  if (mt.faces.some(f => /orange|pink|blue|teal|green/.test(f)) || mt.faces.length !== 6) fail('2D : plus d\'émail par couleur de trophée');
  if (mt.en.length !== 6 || new Set(mt.en).size !== 6 || mt.en.some(e => !/^#[0-9A-F]{6}$/i.test(e))) fail('3D : un émail par palier');
  if (!/gradient/.test(mt.pip)) fail('pastilles de palier en métal');

  // 4. écrans : feuille Trophées et fiche 2D teintées et verrouillées
  await page.evaluate(() => ACT.openTrophies()); await page.waitForTimeout(900);
  const card = await page.evaluate(() => { const c = document.querySelector('.t3d-card'); return c && c.dataset.tier; });
  log('Carte mise en avant, palier', card);
  if (!card || !/^[0-4s]$/.test(card)) fail('carte du dernier trophée teintée par son palier');
  await page.screenshot({ path: path.join(OUT, '01_trophees.png') });
  await page.evaluate(() => { document.querySelector('[data-a="closesheet"]').click(); });
  await page.waitForTimeout(500);
  await page.evaluate(() => showMedalModal2D('sessions')); await page.waitForTimeout(700);
  const m2 = await page.evaluate(() => { const r = [...document.querySelectorAll('.medal-modal .tier-row')]; return { rows: r.length, locks: r.filter(x => !x.classList.contains('got') && x.querySelector('.tr-date .ii')).length, txt: document.querySelector('.medal-modal').innerText }; });
  log('Fiche 2D :', m2.rows, 'paliers,', m2.locks, 'cadenas');
  if (m2.rows !== 4 || m2.locks !== 2 || /Nombre de|pour le palier|Pas encore/.test(m2.txt)) fail('fiche 2D : cadenas et texte court');
  await page.screenshot({ path: path.join(OUT, '02_fiche_2d.png') });

  await browser.close();
  errors.forEach(e => log(e)); log(errors.length ? 'ERRORS: ' + errors.length : '=== NO ERRORS ===');
  process.exit(errors.length ? 1 : 0);
})();
