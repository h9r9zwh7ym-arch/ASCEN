# ASCEN

Suivi de musculation à domicile pour iPhone, en application web installable (PWA).
Séances proposées selon le matériel disponible, suivi des séries, progression, trophées.
L'app apprend ta manière de t'entraîner : fatigue en séance, rythme de charge, répétitions habituelles.
Les données restent sur l'appareil : pas de compte, pas de serveur.

## Installation

Ouvrir la page dans Safari, puis **Partager → Sur l'écran d'accueil**. Fonctionne ensuite hors ligne.

## Développement

```sh
cd forge_projet
(cd vendor && npm install)   # esbuild, une fois
sh build.sh                  # génère ../index.html
(cd tests && npm install)    # Playwright, une fois
sh tests/run.sh              # suite complète (Chromium et WebKit)
```

| Chemin | Contenu |
|---|---|
| `index.html` | L'app en un seul fichier, générée par `build.sh` |
| `sw.js`, `manifest.webmanifest`, icônes | Installation et hors ligne |
| `three-forge.js`, `ascent-scenes.js` | Chargés à la demande (trophées 3D, montagnes) |
| `forge_projet/src/` | Sources JS et CSS |
| `forge_projet/tests/` | Tests navigateur |
| `forge_projet/tools/ascent/` | Génération des montagnes (Python) |
| `forge_projet/HANDOFF.md` | Documentation technique et historique |
| `forge_projet/PLAN.md` | Pistes ouvertes |
