#!/bin/sh
# Lance toute la batterie de tests d’ASCEN.
# Usage : sh tests/run.sh [chromium|webkit|all]   (par défaut : all)
# Variables utiles : CHROMIUM_PATH (Chromium déjà installé), OUT_DIR (captures d'écran).
cd "$(dirname "$0")/.." || exit 1
ENGINES="${1:-all}"; [ "$ENGINES" = "all" ] && ENGINES="chromium webkit"
sh build.sh >/dev/null || { echo "Échec de la construction"; exit 1; }
APP="$(pwd)/dist/forge.html"
SUITES="smoke test2 focus v12 v13 v14 v15 v16 v17 v19 v20 v21 v22 v23 v24 v25 v26 v27 v28 v29 v30 v31 v32 v33 v34 v35 v36 v37 v38 v39 v40 v41 v42 v43 v44 v45 v46 v47 v48"
FAIL=0
run(){ # $1 = libellé, reste = commande
  label="$1"; shift
  out=$("$@" 2>&1); code=$?
  if [ $code -eq 0 ] && echo "$out" | grep -q "NO ERRORS"; then echo "✓ $label"
  else echo "✗ $label"; echo "$out" | grep -E "ERROR|ASSERT|Error" | head -5 | sed 's/^/    /'; FAIL=$((FAIL+1)); fi
}
for eng in $ENGINES; do
  for t in $SUITES; do run "$eng $t" env ENGINE="$eng" node "tests/$t.js" "$APP"; done
done
for w in 320 390 430; do run "mise en page $w px" env W="$w" node tests/audit.js "$APP"; done
run "mise en page sombre" env W=390 DARK=1 node tests/audit.js "$APP"
run "génération des séances" node tests/gen_audit.js "$APP"
run "touchers aléatoires (test du singe)" env SEED=3 N=250 node tests/monkey.js "$APP"
# hors ligne : le service worker exige http(s), on sert la racine du dépôt
( cd .. && python3 -m http.server 8765 >/dev/null 2>&1 ) & SRV=$!
i=0; until curl -s --noproxy localhost -o /dev/null http://localhost:8765/ || [ $i -ge 20 ]; do sleep 0.5; i=$((i+1)); done
run "hors ligne (PWA)" node tests/offline.js
kill $SRV 2>/dev/null; pkill -f "http.server 8765" 2>/dev/null
echo "Performances :"; node tests/perf2.js "$APP" 2>&1 | tail -1
[ $FAIL -eq 0 ] && echo "Tout est vert." || echo "$FAIL échec(s)."
exit $FAIL
