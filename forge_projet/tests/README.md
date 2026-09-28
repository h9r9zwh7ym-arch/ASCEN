# Tests de Forge

Tests navigateur automatisés (Playwright) qui ouvrent `dist/forge.html` et vérifient l'app. Ils couvrent Chromium et WebKit, le moteur de Safari sur iPhone.

## Lancer

```sh
cd forge_projet/tests
npm install
npx playwright install chromium webkit   # une seule fois
sh run.sh            # tout ; ou : sh run.sh webkit
```

Le script reconstruit l'app avant de lancer les tests. Il affiche ✓ ou ✗ par suite et se termine en erreur si une suite échoue.

Variables utiles :
- `CHROMIUM_PATH` : utiliser un Chromium déjà installé ;
- `OUT_DIR` : dossier des captures d'écran (par défaut `tests/out/`, ignoré par Git).

## Contenu

| Fichier | Vérifie |
|---|---|
| `smoke.js` | Tous les onglets et une séance complète de bout en bout |
| `test2.js` | Import de programme, thèmes clair et sombre |
| `focus.js` | Séance en cours : mode focus, navigation, repos |
| `v12.js` à `v20.js` | Fonctions ajoutées de version en version : trophées, planning, chrono, enchaînement… |
| `v21.js` | Moteur de progression, sauvegarde et restauration, calendrier, grand texte |
| `v22.js` | Premier lancement |
| `v23.js` | Migration v2.2, note de séance, poids du corps, niveau, nombre d'exercices |
| `v24.js` | Modifier une séance, objectifs chiffrés, bilan en image |
| `v25.js` | Glisser vers le bas pour fermer, dose dans le sélecteur, trophées 3D et secrets |
| `v26.js` | Stockage compact et copie IndexedDB, graphiques au doigt, transitions, exercice animé, Rewind |
| `v27.js` | Trophées 3D : chargement à la demande, trophée mis en avant et déblocage, dos opaque, vignettes de la grille, fiche 3D de chaque trophée, diamant, secrets, boucle en pause hors écran, rien de stocké, repli sans WebGL |
| `audit.js` | Chaque écran à une largeur donnée (`W=320`) : débordements, cibles tactiles < 28 px, erreurs |
| `gen_audit.js` | 11 520 séances générées : matériel, niveau, doublons, élastiques, valeurs invalides |
| `offline.js` | Installation PWA et fonctionnement hors ligne (via un serveur local) |
| `perf2.js` | Temps de rendu avec 470 séances (informatif) |

Les tests partent d'un état vierge. Ils passent le premier lancement avec `ACT.obSkip()` ou injectent leurs données avec `addInitScript`.
