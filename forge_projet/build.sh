#!/bin/sh
# Assemble ASCEN (anciennement Forge) en un seul fichier HTML autonome. À lancer depuis la racine du projet (forge_projet/).
cd "$(dirname "$0")"
mkdir -p dist
# Minification (esbuild, installé par vendor/) : ~16 % de moins à télécharger et à garder en
# cache sur l'appareil. Sans esbuild, le fichier est assemblé tel quel.
ESB="$(pwd)/vendor/node_modules/.bin/esbuild"
if [ -x "$ESB" ] && [ -z "$NO_MINIFY" ]; then JS="$ESB --minify --loader=js --target=es2019 --log-level=error"; CSS="$ESB --minify --loader=css --log-level=error"; else JS="cat"; CSS="cat"; fi
{
echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: blob:; font-src '\''self'\'' data:; media-src '\''self'\'' data: blob:; connect-src '\''self'\''; worker-src '\''self'\''; manifest-src '\''self'\''; object-src '\''none'\''; base-uri '\''none'\''; form-action '\''none'\''"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="theme-color" content="#F4F3F1" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#0B0B0A" media="(prefers-color-scheme: dark)"><meta name="apple-mobile-web-app-title" content="ASCEN"><meta name="description" content="Séances de musculation à domicile, progression et suivi, 100 % sur l’appareil."><link rel="apple-touch-icon" href="icon-180.png"><link rel="icon" href="icon-192.png"><link rel="icon" type="image/svg+xml" href="favicon.svg"><title>ASCEN</title><style>'
# polices de la marque ASCEN, en sous-ensembles (Geist pour les titres, Barlow Semi Condensed pour les chiffres) : ~25 Ko, embarquées pour marcher hors ligne
b64(){ base64 < "$1" | tr -d '\n'; }
printf "@font-face{font-family:'Geist ASCEN';src:url(data:font/woff2;base64,%s) format('woff2');font-weight:560 720;font-display:swap}@font-face{font-family:'ASCEN Num';src:url(data:font/woff2;base64,%s) format('woff2');font-weight:100 900;font-display:swap;unicode-range:U+20,U+25,U+2B-2F,U+30-3A,U+A0,U+D7,U+2013,U+2212,U+202F}" "$(b64 src/fonts/geist-ascen.woff2)" "$(b64 src/fonts/barlow-num.woff2)"
$CSS < src/style.css
echo '</style></head><body><div id="app"></div><nav class="tabbar" aria-label="Onglets"></nav><div id="restbar"></div><div id="overlay" role="dialog"></div><div id="toast" role="status" aria-live="polite"></div><input type="file" id="fileImport" accept="application/json,.json" style="display:none"><script>'
cd src; cat data_equipment.js data_exercises.js data_pictos.js data_rigs.js core.js engine.js ui_shell.js sfx.js fx.js timer.js charts.js musclemap.js trophies.js view_today.js tpl_editor.js onboarding.js view_history.js recap.js rewind.js view_progress.js strength.js challenges.js trophy3d.js view_profil.js init.js | $JS; cd ..
echo '</script></body></html>'
} > dist/forge.html
cp dist/forge.html ../index.html
# fichiers d'installation (manifeste, icônes, hors ligne) : à la racine du dépôt, recopiés à côté du build
# Three.js réduit (trophées 3D), chargé à la demande : à côté de la page
cp vendor/three-forge.js dist/ && cp vendor/three-forge.js ../three-forge.js
for f in manifest.webmanifest sw.js favicon.svg icon-180.png icon-192.png icon-512.png icon-maskable-512.png; do [ -f "../$f" ] && cp "../$f" dist/; done
echo "dist/forge.html : $(wc -c < dist/forge.html) octets"
