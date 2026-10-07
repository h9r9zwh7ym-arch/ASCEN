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
| `v37.js` | Accessibilité (compteur lisible en sombre, zones de toucher ≥ 44 en séance), « Annuler » après une suppression, première charge réaliste, barre d'onglets effacée en séance, sauvegarde piégée neutralisée (XSS), CSP |
| `v38.js` | Motivation : joker de série (6 cas), pastille « joker utilisé », progrès concrets en fin de séance, « ton pourquoi » (Profil, rappel après 4 jours, échappé, 120 caractères) |
| `v39.js` | v4.0 : onglet re-touché (remonte sans reconstruire), retour sur un onglet sans nouveau rendu, record en secondes, repos réglable appliqué, correction et annulation d'une série faite, séance express, export CSV (lignes, échappement, téléchargement) |
| `v40.js` | 4.0 (2e passe) : Rewind sur le mois en cours, décimales à virgule, carte des muscles unique avec légende aux couleurs des régions, accueil centré sur « Ma séance », exercices retirés et fusionnés, nouveaux exercices (Pilates, poids du corps, étirements), séance « Pilates & sol », recherche « pilates » |
| `v41.js` | 4.0 (motivation) : prochain cap sur l'accueil (record de la séance prête, semaine), ligne « à battre » en séance (cible, passage au vert sans animation répétée, calcul des cibles), annonce et bilan de fin de séance, indice de force et projections, chaque option désactivable |
| `v42.js` | 4.0 (indice de force sourcé) : 1RM estimé Epley/Brzycki et répétitions en réserve, pompes en part du poids du corps, désentraînement par muscle (21 jours sans perte, −3 %/sem, ×1,5 à 65 ans et plus, −30 % au plus), statut « Désentraînement », alertes accueil et carte, feuille des sources, reprise, une séance arrête la baisse du seul muscle travaillé |
| `v43.js` | 4.0 (réorganisation) : Progrès en 4 onglets (Résumé, Muscles, Exercices, Objectifs), progression en % depuis 0, zones de stimulus et séries pondérées, tonnage dans l'Historique, Profil réorganisé, accueil « Ma semaine », favoris (fiche, sélecteur, filtre, menu de séance, Mes exercices), note de séance sans doublon |
| `monkey.js` | Test du singe (aussi dans `run.sh`) : touchers aléatoires pondérés vers les boutons peu essayés, avec changement d'onglet régulier. Toute erreur ou écran en échec est signalé. `SEED`, `N`, `ENGINE=webkit` |
| `tab_perf.js`, `ui_perf.js` | Outils : fluidité des changements d'onglet et des gestes courants (processeur ×4, 3 ans d'historique), images longues et pire image |
| `tour.js` + `montage.js` | Outils : captures de tous les écrans (`DARK=1` pour le sombre), assemblées en planches de 8 pour la revue visuelle |
| `ux_audit.js` | Outil (hors suite) : mesure par écran les cibles tactiles < 44 pt (Apple) et < 24 px (WCAG 2.5.8), le contraste du texte (WCAG 1.4.3), le texte < 11 px, les champs < 16 px et les boutons sans nom. `DARK=1` pour le mode sombre |
| `profile.js` | Outil : profil CPU par scénario (démarrage, rendus, séance, fin de séance) sur 3 ans d'historique, processeur ×4. `NO_MINIFY=1 sh build.sh` avant pour avoir les noms de fonctions |
| `anim_sheet.js` | Planche de contrôle des animations d'exercices (départ/fin), par famille (`FAMILIES=pushup,plank`) ou par exercice (`IDS=coquillage,etir_pigeon`) |
| `t3d_perf.js` | Trophées 3D : vignettes, cadence, construction, vue Diamant (`TAG=nom`) |
| `ui_audit.js` | Audit visuel : chaque onglet en pleine hauteur et en bas de défilement, feuilles principales, encoche iPhone simulée (`DARK=1`, `ENGINE=webkit`, `NO_NOTCH=1`, `AUDIT_DIR=nom`) |
| `brand.js` | Captures de l'identité ASCEN : écrans clés en clair, en sombre, à 1280 px et à l'accueil (hors `run.sh`, `BRAND_DIR=nom`) |

Les tests partent d'un état vierge. Ils passent le premier lancement avec `ACT.obSkip()` ou injectent leurs données avec `addInitScript`.
