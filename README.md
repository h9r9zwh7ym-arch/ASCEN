# ASCEN

App de musculation à domicile pour iPhone (PWA) : séances proposées selon ton matériel, suivi des séries, progression, trophées et défis. Tout reste sur l'appareil : pas de compte, pas de serveur.

## Utiliser l'app

Ouvrir `index.html` dans Safari (idéalement servi en https, par exemple GitHub Pages), puis **Partager → Sur l'écran d'accueil**. Une fois installée, l'app fonctionne hors ligne.

## Organisation du dépôt

| Chemin | Rôle |
|---|---|
| `index.html` | L'app complète en un seul fichier (générée, ne pas modifier à la main) |
| `sw.js`, `manifest.webmanifest`, icônes | Installation et fonctionnement hors ligne |
| `three-forge.js` | Sous-ensemble de Three.js, chargé seulement pour les trophées 3D |
| `forge_projet/src/` | Code source (JS, CSS, polices) |
| `forge_projet/build.sh` | Assemble `index.html` à partir des sources |
| `forge_projet/tests/` | Tests navigateur (Playwright, Chromium et WebKit) |
| `forge_projet/vendor/` | Outils de construction (esbuild, Three.js) |
| `forge_projet/HANDOFF.md` | Documentation technique détaillée et historique des versions |

## Construire et tester

```sh
cd forge_projet
(cd vendor && npm install)   # une fois : esbuild pour la minification
sh build.sh                  # génère ../index.html (et dist/ pour les tests)
(cd tests && npm install)    # une fois : Playwright
sh tests/run.sh              # toute la batterie de tests
```
