// Généré pour le dépôt : dossiers de sortie et navigateur configurables (voir tests/README.md)
const OUT_ROOT = process.env.OUT_DIR || require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT_ROOT, { recursive: true });
const pw = require('playwright'); const path = require('path');
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.waitForSelector('#splash', { state: 'detached', timeout: 6000 });
  await p.evaluate(() => { if (document.querySelector('.ob-body')) ACT.obSkip(); });
  const r = await p.evaluate(() => {
    const configs = {
      rien: [], halteres: ['dumbbells'], halteres_banc: ['dumbbells', 'bench'], barre_sans_rack: ['barbell', 'bench'],
      barre_rack: ['barbell', 'rack', 'bench'], station_dc: ['barbell', 'bench_press'], sangles_roue: ['suspension', 'ab_roller', 'dip_bars', 'pullup_bar'],
      complet: EQUIP_TYPES.filter(e => !e.always).map(e => e.id),
    };
    const issues = []; const stats = {};
    for (const [name, list] of Object.entries(configs)) {
      Object.keys(S.equipment.owned).forEach(k => S.equipment.owned[k] = k === 'bodyweight');
      list.forEach(k => S.equipment.owned[k] = true);
      S.equipment.weights = { dumbbells: [4, 6, 8, 10], barbell: [20, 30, 40], kettlebell: [8, 12], bands: [2, 3, 4] };
      for (const level of ['debutant', 'intermediaire', 'avance']) {
        S.goals.level = level;
        for (const size of [3, 6, 9]) {
          S.goals.exoCount = size; save();
          for (const t of SESSION_TYPES.map(x => x.id)) for (let k = 0; k < 20; k++) {
            const s = generateEngineSession(t);
            const ids = s.exos.map(e => e.exoId);
            if (new Set(ids).size !== ids.length) issues.push(`${name}/${t}: doublon`);
            { const fam = ids.map(id => id.split('_')[0]); stats.__famTot = (stats.__famTot||0)+1; if (new Set(fam).size !== fam.length) stats.__famDup = (stats.__famDup||0)+1; }
            s.exos.forEach(e => {
              const d = EXO_MAP[e.exoId];
              if (!hasEquip(S.equipment, d.equip)) issues.push(`${name}/${t}: ${d.id} matériel manquant`);
              if (level === 'debutant' && d.level === 3 && availableExos().filter(levelOK).length >= 4) issues.push(`${name}/${t}: ${d.id} trop avancé pour débutant`);
              e.sets.forEach(st => { if (!(st.reps > 0)) issues.push(`${d.id}: reps ${st.reps}`); if (st.weight != null && isNaN(st.weight)) issues.push(`${d.id}: charge NaN`); if (loadableTypeOf(d) === 'bands' && !(st.weight >= 1 && st.weight <= 5)) issues.push(`${d.id}: niveau élastique ${st.weight}`); });
            });
            const want = t === 'core' ? Math.min(size, 5) : size;
            if (s.exos.length < want) { const key = `${name}/${t}/${size}`; stats[key] = Math.min(stats[key] ?? 99, s.exos.length); }
          }
        }
      }
    }
    // racks : aucun squat à la barre sans supports
    Object.keys(S.equipment.owned).forEach(k => S.equipment.owned[k] = k === 'bodyweight'); S.equipment.owned.barbell = true; S.equipment.owned.bench = true;
    const noRack = availableExos().map(e => e.id).filter(id => /squat_barre|front_squat|dc_barre|fente_arriere_barre|good_morning/.test(id));
    return { issues: Array.from(new Set(issues)).slice(0, 30), nIssues: issues.length, short: stats, noRack };
  });
  console.log('Issues:', r.nIssues, r.issues);
  console.log('Barre sans rack → exercices interdits proposés :', r.noRack);
  console.log('Séances plus courtes que demandé (pool trop petit) :', JSON.stringify(r.short).slice(0, 900));
  const bad = errs.length || r.nIssues || r.noRack.length;
  console.log(bad ? '=== ERRORS === ' + errs.join(' | ') : '=== NO ERRORS ===');
  await b.close();
  if (bad) process.exit(1);
})();
