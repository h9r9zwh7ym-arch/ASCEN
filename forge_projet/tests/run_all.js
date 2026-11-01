// Lance les suites de tests en parallèle (appelé par run.sh).
// Usage : node tests/run_all.js <app.html> <moteurs…> -- <suites…>
// JOBS : nombre de suites simultanées (par défaut : nombre de cœurs). Les plus longues partent en premier
// (durées de la dernière fois, gardées dans tests/out/durations.json). Les résultats s'affichent dans l'ordre.
const { spawn } = require('child_process'), os = require('os'), fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), sep = argv.indexOf('--');
const APP = argv[0], ENGINES = argv.slice(1, sep), SUITES = argv.slice(sep + 1);
const JOBS = Math.max(1, +process.env.JOBS || os.cpus().length);
const DUR = path.join(__dirname, 'out', 'durations.json');
let dur = {}; try { dur = JSON.parse(fs.readFileSync(DUR, 'utf8')); } catch (e) {}

const jobs = [];
for (const eng of ENGINES) for (const t of SUITES) jobs.push({ label: `${eng} ${t}`, env: { ENGINE: eng }, args: [`tests/${t}.js`, APP] });
for (const w of [320, 390, 430]) jobs.push({ label: `mise en page ${w} px`, env: { W: String(w) }, args: ['tests/audit.js', APP] });
jobs.push({ label: 'mise en page sombre', env: { W: '390', DARK: '1' }, args: ['tests/audit.js', APP] });
jobs.push({ label: 'génération des séances', env: {}, args: ['tests/gen_audit.js', APP] });
jobs.push({ label: 'touchers aléatoires (test du singe)', env: { SEED: '3', N: '250' }, args: ['tests/monkey.js', APP] });
jobs.forEach((j, i) => { j.i = i; });

const queue = jobs.slice().sort((a, b) => (dur[b.label] || 60) - (dur[a.label] || 60));
const done = new Array(jobs.length);
let next = 0, shown = 0, fail = 0, finished = 0;
const t0 = Date.now();
function show() {
  while (shown < jobs.length && done[shown]) {
    const r = done[shown++];
    if (r.ok) console.log(`✓ ${r.label}`);
    else { fail++; console.log(`✗ ${r.label}`); r.out.split('\n').filter(l => /ERROR|ASSERT|Error/.test(l)).slice(0, 5).forEach(l => console.log('    ' + l)); }
  }
}
function start() {
  if (next >= queue.length) return;
  const j = queue[next++], s = Date.now();
  const p = spawn('node', j.args, { env: Object.assign({}, process.env, j.env), cwd: path.join(__dirname, '..') });
  let out = '';
  p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  // une suite bloquée ne bloque pas tout : 8 min au plus
  const kill = setTimeout(() => { out += '\nError: plus de 8 min, arrêtée'; p.kill('SIGKILL'); }, 8 * 60e3);
  p.on('close', code => {
    clearTimeout(kill);
    dur[j.label] = Math.round((Date.now() - s) / 1000);
    done[j.i] = { label: j.label, ok: code === 0 && /NO ERRORS/.test(out), out };
    show(); start();
    if (++finished === jobs.length) finish();
  });
}
function finish() {
  try { fs.mkdirSync(path.dirname(DUR), { recursive: true }); fs.writeFileSync(DUR, JSON.stringify(dur, null, 1)); } catch (e) {}
  console.log(`(${jobs.length} suites en ${Math.round((Date.now() - t0) / 60e3 * 10) / 10} min, ${JOBS} à la fois)`);
  process.exit(fail ? 1 : 0);
}
for (let k = 0; k < JOBS; k++) start();
