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
| `v21.js` | Moteur de progression, sauvegarde et restauration, grand texte |
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
| `v28.js` | Pile de feuilles (retour au lieu de tout fermer) et « Ajouter » selon le contexte de la fiche |
| `v29.js` | Robustesse : données abîmées au démarrage, action en échec, double appui |
| `v30.js` | Étirements : réglage, bloc « retour au calme » en fin de proposition, enregistrement à part, historique |
| `v31.js` | Création unique (Ma séance → Enregistrer, facultatif), plus de Calendrier, bulle des graphiques, reprise après arrière-plan (gestes, son, repos, jour suivant), pas de zoom au double appui |
| `v32.js` | Fiabilité et performances : encodage en cache toujours exact, résumés de séance, séance abîmée écartée, écran en échec rattrapé, bornes de saisie, copie de secours regroupée |
| `v33.js` | Un seul « L'app choisit », pictogrammes de la carte du jour touchables, plan de séance (variété, ordre), pictogrammes animés corrigés et zone travaillée plus fine |
| `v34.js` | Pictogrammes sur squelette : longueurs d'os constantes à chaque image, appuis atteints, rien sous le sol, un pictogramme par exercice, vue de face avec épaules |
| `v35.js` | Carte des muscles (fiche, semaine, bulle), défis (lancement, 3 au plus, réussite fêtée et trophée, rechargement, délai dépassé, abandon), états enregistrés abîmés, réinitialisation complète |
| `v36.js` | Deux onglets : chacun reprend ce que l'autre enregistre, changement en attente conservé, feuille ouverte respectée, réinitialisation propagée |
| `profile.js` | Outil : profil CPU par scénario (démarrage, rendus, séance, fin de séance) sur 3 ans d'historique, processeur ×4. `NO_MINIFY=1 sh build.sh` avant pour avoir les noms de fonctions |
| `anim_sheet.js` | Planche de contrôle des animations d'exercices (départ/fin), par famille (`FAMILIES=pushup,plank`) |
| `t3d_perf.js` | Trophées 3D : vignettes, cadence, construction, vue Diamant (`TAG=nom`) |
| `ui_audit.js` | Audit visuel : chaque onglet en pleine hauteur et en bas de défilement, feuilles principales, encoche iPhone simulée (`DARK=1`, `ENGINE=webkit`, `NO_NOTCH=1`, `AUDIT_DIR=nom`) |
| `brand.js` | Captures de l'identité ASCEN : écrans clés en clair, en sombre, à 1280 px et à l'accueil (hors `run.sh`, `BRAND_DIR=nom`) |

Les tests partent d'un état vierge. Ils passent le premier lancement avec `ACT.obSkip()` ou injectent leurs données avec `addInitScript`.
