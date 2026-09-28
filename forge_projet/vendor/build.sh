#!/bin/sh
# Construit three-forge.js (IIFE, global FORGE_THREE) à partir de three-entry.js.
# Usage : cd forge_projet/vendor && npm install && sh build.sh
cd "$(dirname "$0")" || exit 1
npx esbuild three-entry.js --bundle --minify --format=iife --global-name=FORGE_THREE --target=es2019 \
  --legal-comments=eof --outfile=three-forge.js || exit 1
echo "three-forge.js : $(wc -c < three-forge.js) octets"
