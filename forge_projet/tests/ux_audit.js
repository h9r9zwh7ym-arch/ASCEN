// Audit UX mesuré (règles publiées) : cibles tactiles (Apple HIG 44 pt, WCAG 2.2 2.5.8 24 px),
// contraste du texte (WCAG 1.4.3 : 4,5:1, 3:1 grand texte), texte trop petit (< 11 pt), champs
// < 16 px (zoom automatique d'iOS), boutons sans nom accessible. Usage : node tests/ux_audit.js dist/forge.html
const __pw = require('playwright'); const path = require('path');
(async () => {
  const dark = !!process.env.DARK;
  const b = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light', hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', 1);
    const ex = ['dc_haltere', 'rowing_uni_haltere', 'pompes', 'squat_gobelet', 'planche']; const ss = [];
    for (let i = 0; i < 30; i++) { const d = new Date(); d.setDate(d.getDate() - 1 - i * 3); const iso = d.toISOString().slice(0, 10);
      ss.push({ id: 's' + i, date: iso, startedAt: iso + 'T07:00:00Z', completedAt: iso + 'T07:40:00Z', durationSec: 2400, exos: ex.map(e => ({ exoId: e, sets: [1, 2, 3].map(j => ({ reps: e === 'planche' ? 40 : 10, weight: /haltere|gobelet/.test(e) ? 12 : undefined, done: true })) })) }); }
    localStorage.setItem('forge.v1', JSON.stringify({ meta: { onboarded: true, backupNudgeAt: Date.now() }, equipment: { owned: { dumbbells: true, bench: true } }, sessions: ss, targets: [{ id: 't', exoId: 'pompes', kind: 'reps', value: 20, start: '2026-09-01' }] })); });
  await page.goto('file://' + path.resolve(process.argv[2])); await page.waitForSelector('#splash', { state: 'detached' }); await page.waitForTimeout(800);
  const audit = () => page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight; };
    const name = e => (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) || ('.' + [...e.classList].join('.'));
    const small = [], tiny = [], noName = [];
    document.querySelectorAll('button, a[href], [data-a], input, select, [role=button], [data-tip][tabindex]').forEach(e => {
      if (!vis(e) || e.closest('[aria-hidden=true]')) return; const r = e.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height), id = `${name(e)} (${w}×${h})`;
      if (w < 24 || h < 24) tiny.push(id); else if (w < 44 || h < 44) small.push(id);
      if ((e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && !(e.getAttribute('aria-label') || e.textContent.trim() || e.title)) noName.push('.' + [...e.classList].join('.'));
    });
    const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return { L: .2126 * r + .7152 * g + .0722 * b, a: m[3] == null ? 1 : +m[3], rgb: m.slice(0, 3).map(Number) }; };
    const bgOf = e => { let layers = []; for (let x = e; x; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.backgroundImage !== 'none') return null; const c = lum(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= .99) break; } } 
      let rgb = [255, 255, 255]; if (document.documentElement.matches('[data-theme=dark]') || matchMedia('(prefers-color-scheme: dark)').matches) rgb = lum(getComputedStyle(document.body).backgroundColor).rgb;
      for (const l of layers.reverse()) rgb = rgb.map((v, i) => v * (1 - l.a) + l.rgb[i] * l.a); return rgb; };
    const Lrgb = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
    const lowC = [], tinyText = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) { const t = walker.currentNode; if (!t.textContent.trim()) continue; const e = t.parentElement; if (!e || seen.has(e) || !vis(e) || e.closest('svg,[aria-hidden=true]')) continue; seen.add(e);
      const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, txt = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 30);
      if (fs < 11) tinyText.push(`${txt} (${fs}px)`);
      const fg = lum(cs.color), bg = bgOf(e); if (!fg || !bg) continue;
      const fgRgb = fg.rgb.map((v, i) => v * fg.a * (+cs.opacity) + bg[i] * (1 - fg.a * (+cs.opacity)));
      const L1 = Lrgb(fgRgb), L2 = Lrgb(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700), need = large ? 3 : 4.5;
      if (ratio < need) lowC.push(`${txt} ${ratio.toFixed(2)}:1 (${fs}px)`); }
    const inputs = [...document.querySelectorAll('input:not([type=file]):not([type=checkbox]),select,textarea')].filter(vis).filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => `${e.id || e.name || e.type} ${getComputedStyle(e).fontSize}`);
    return { small, tiny, noName, lowC, tinyText, inputs };
  });
  const screens = [
    ['Aujourd\'hui', () => switchTab('today')], ['Aujourd\'hui (proposée)', () => { switchTab('today'); const b = document.querySelector('[data-a="todayMode"][data-v="proposal"]'); b && b.click(); }],
    ['Historique', () => switchTab('history')], ['Progrès', () => { switchTab('progress'); ACT.progressTab({ v: 'overview' }); }], ['Progrès/exercices', () => ACT.progressTab({ v: 'exos' })], ['Trophées', () => ACT.progressTab({ v: 'medals' })],
    ['Profil', () => switchTab('profil')], ['Fiche exercice', () => ACT.showExoInfo({ id: 'dc_haltere' })], ['Choix d\'exercices', () => { closeSheet(); openPicker({ title: 'Choisir', multi: true, onDone: () => {} }); }],
    ['Séance en cours', async () => { closeSheet(); switchTab('today'); S.custom = { exos: [{ exoId: 'dc_haltere', sets: 3 }, { exoId: 'pompes', sets: 3 }] }; ACT.startCustom(); await new Promise(r => setTimeout(r, 4200)); const l = document.querySelector('#launch'); l && l.click(); }],
    ['Repos', () => ACT.validateSet({ exi: '0' })],
  ];
  const all = {};
  for (const [n, fn] of screens) { await page.evaluate(fn); await page.waitForTimeout(1300);
    // tout l'écran défilé : on mesure par tranches
    const res = { small: new Set(), tiny: new Set(), noName: new Set(), lowC: new Set(), tinyText: new Set(), inputs: new Set() };
    for (let k = 0; k < 6; k++) { const r = await audit(); for (const key in r) r[key].forEach(x => res[key].add(x));
      const more = await page.evaluate(() => { const o = document.querySelector('#overlay.open .sheet-body') || document.querySelector('.view.active'); if (!o || o.scrollTop + o.clientHeight >= o.scrollHeight - 2) return false; o.scrollTop += o.clientHeight * .8; return true; });
      if (!more) break; await page.waitForTimeout(350); }
    await page.evaluate(() => { const o = document.querySelector('.view.active'); if (o) o.scrollTop = 0; });
    all[n] = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, [...v]])); }
  for (const [n, r] of Object.entries(all)) { console.log(`\n### ${n}`); for (const [k, v] of Object.entries(r)) if (v.length) console.log(`  ${k} (${v.length}): ${v.slice(0, 12).join(' | ')}`); }
  await b.close();
})();
