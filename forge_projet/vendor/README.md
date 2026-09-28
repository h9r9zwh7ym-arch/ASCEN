# vendor/ : Three.js réduit pour les trophées 3D

`three-forge.js` contient seulement les classes de Three.js dont les trophées 3D ont besoin (liste dans `three-entry.js`). Tout le reste est éliminé à la construction.

- **Format** : un seul fichier IIFE qui expose `window.FORGE_THREE`, soit environ 570 Ko, ou 148 Ko compressé.
- **Chargement** : l'app ne le charge qu'au premier affichage d'un trophée 3D (`loadThree()` dans `src/trophy3d.js`). Le service worker le met en cache pour le hors ligne.
- **Versions** : Three.js 0.186.1 et esbuild 0.28.2, figées dans `package.json`. esbuild ne sert qu'à produire ce fichier et n'est pas embarqué dans l'app.
- **Licence** : MIT, recopiée en fin de fichier.

Pour reconstruire après avoir changé la liste des classes ou la version :

```sh
cd forge_projet/vendor
npm install
sh build.sh      # puis sh ../build.sh pour recopier le fichier à côté de l'app
```
