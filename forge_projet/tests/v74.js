// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
// 2.6.0 : chiffres qui roulent sur − / +, nombre de séries réglable (menu de l'exercice, exercices ajoutés),
// images de profil, pictogrammes en volume (membres du fond en retrait), montagnes plus riches.
// 2.6.3 : une fiche ouverte depuis un écran (Mes exercices…) ramène à cet écran.
// 2.6.4 : barre d'état — les calques d'animation n'existent à l'écran que pendant une animation.
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(OUT_ROOT, 'v74'); fs.mkdirSync(OUT, { recursive: true });
const APP = 'file://' + path.resolve(process.argv[2]);
(async () => {
  const wk = process.env.ENGINE === 'webkit';
  const browser = await (wk ? __pw.webkit.launch() : __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }));
  const errors = []; const fail = m => errors.push('ASSERT: ' + m);
  const log = (...a) => console.log(`[${wk ? 'webkit' : 'chromium'}]`, ...a);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Zurich' });
  await ctx.addInitScript(() => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true }, equipment: { owned: { dumbbells: true, bench: true } } })); });
  const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(APP); await page.waitForTimeout(800);

  // 1. le compteur roule : pendant l'animation, la valeur lue reste la bonne
  const roll = await page.evaluate(() => { const el = document.createElement('b'); el.textContent = '19'; document.body.appendChild(el);
    rollText(el, '19', '20', 1); const mid = { v: rollVal(el), cols: el.querySelectorAll('.rl-col').length, hidden: !!el.querySelector('.rl-o[aria-hidden="true"]') };
    rollText(el, rollVal(el), '21', 1); return { ...mid, v2: rollVal(el) }; });
  log('Roll:', JSON.stringify(roll));
  if (roll.v !== '20' || roll.cols !== 2 || !roll.hidden || roll.v2 !== '21') fail('compteur qui roule (valeur lue juste, ancien chiffre caché aux lecteurs d\'écran)');

  // 2. séries réglables en séance : + / − dans le menu, jamais sous les séries faites
  const sets = await page.evaluate(() => {
    S.draft = buildCustomSession([{ exoId: 'dc_haltere', sets: 3 }]); S.draft.startedAt = new Date().toISOString();
    S.draft.exos[0].sets[0].done = true; save(); switchTab('today'); renderView('today');
    ACT.focusSets({ exi: '0', d: '1' }); const up = S.draft.exos[0].sets.length;
    for (let k = 0; k < 6; k++) ACT.focusSets({ exi: '0', d: '-1' }); const down = S.draft.exos[0].sets.length;
    return { up, down };
  });
  log('Sets:', JSON.stringify(sets));
  if (sets.up !== 4 || sets.down !== 1) fail('séries + / − (minimum : les séries déjà faites)');

  // 3. exercices ajoutés : le nombre de séries choisi est appliqué
  const add = await page.evaluate(() => { const e = entryAt(S.draft.exos, EXO_MAP.pompes, S.draft.exos.length, 5); return e && e.sets.length; });
  log('Added sets:', add);
  if (add !== 5) fail('exercice ajouté avec le nombre de séries choisi');
  await page.evaluate(() => { S.draft = null; save(); renderView('today'); });

  // 4. image de profil : choisie, gardée, refusée si inconnue
  const av = await page.evaluate(() => { switchTab('profil'); ACT.setAvatar({ v: 'sommet' });
    const ok = S.settings.avatar, pic = !!document.querySelector('.profile-hero .pic svg');
    const n = normalizeState(JSON.parse(JSON.stringify({ ...S, settings: { ...S.settings, avatar: '<x>' } })));
    return { ok, pic, bad: n.settings.avatar, size: Object.keys(AVATARS).map(avatarSVG).join('').length };
  });
  log('Avatar:', JSON.stringify(av));
  if (av.ok !== 'sommet' || !av.pic || (av.bad && av.bad !== '')) fail('image de profil');
  if (av.size > 8000) fail('images de profil légères');
  await page.screenshot({ path: path.join(OUT, '01_profile.png') });

  // 5. pictogrammes en volume, montagnes avec lumière et brume
  const pic = await page.evaluate(() => { const s = exoAnimSVG(EXO_MAP.fentes_halteres) || '', c = exoAnimSVG(EXO_MAP.curl_biceps) || ''; return { far: /ea-far/.test(s), torso: /ea-torso/.test(s), mask: /<mask /.test(c) && !/ea-far/.test(c), ids: new Set([...document.body.innerHTML.matchAll(/mask id="([^"]+)"/g)].map(m => m[1])).size }; });
  log('Picto:', JSON.stringify(pic));
  if (!pic.far || !pic.torso || !pic.mask) fail('pictogramme animé en calques (jambe du fond, bras confondus retirés, liseré)');

  // 6. une fiche ouverte depuis « Mes exercices » ramène à « Mes exercices » (pas au Profil)
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(600);
  await page.evaluate(() => { switchTab('profil'); openExoPrefs(); }); await page.waitForTimeout(500);
  await page.click('#overlay [data-a="showExoInfo"]'); await page.waitForTimeout(700);
  const top = () => page.evaluate(() => { const s = [...document.querySelectorAll('#overlay .sheet')].filter(x => !x.classList.contains('sheet-kept') && !x.classList.contains('nav-leaving')).pop(); return s ? s.querySelector('.sheet-hd .t').textContent : ''; });
  const back = await page.$('#overlay .sheet:not(.sheet-kept) [data-a="sheetBack"]');
  if (back) await back.click(); await page.waitForTimeout(800);
  const nav = { back: !!back, title: await top() };
  log('Back from exercise sheet:', JSON.stringify(nav));
  if (!nav.back || nav.title !== 'Mes exercices') fail('retour à « Mes exercices » après la fiche');

  // 7. barre d'état : hors animation, rien d'invisible ne couvre le bandeau du haut (iOS y lit la couleur)
  const sb = await page.evaluate(() => { closeSheet(); return [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); if (c.position !== 'fixed' || c.display === 'none') return false; const r = e.getBoundingClientRect(); return r.top <= 0 && r.bottom > 0 && r.width > 300 && +c.zIndex > 45; }).map(e => e.id || e.className); });
  log('Above status band:', JSON.stringify(sb));
  if (sb.some(x => /^mo/.test(x))) fail('calques d\'animation au-dessus du bandeau de la barre d\'état');

  await browser.close();
  if (errors.length) { errors.forEach(e => log(e)); log(`ERRORS: ${errors.length}`); process.exit(1); }
  log('=== NO ERRORS ===');
})();
