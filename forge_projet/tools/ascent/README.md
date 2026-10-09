# Scènes de l'ascension

Ces scripts produisent les 13 montagnes de « Mon ascension » :
- `src/data_ascent.js` (embarqué dans l'app) ;
- `vendor/ascent-scenes.js` (chargé à la demande).

Ils ne sont pas nécessaires pour construire l'app : les fichiers générés sont versionnés.

## Chaîne

1. **Relief** (`render.py`). On télécharge :
   - Copernicus GLO-30 : tuiles COG 1° × 1° sur `copernicus-dem-30m.s3.amazonaws.com` ;
   - pour les sommets suisses, swissALTI3D 2 m : tuiles de 1 km, API STAC `data.geo.admin.ch`, collection `ch.swisstopo.swissalti3d`, fichiers `*_2_2056_5728.tif`.

   Les tuiles vont dans un dossier `dem/`, et les tuiles suisses dans `dem/ch/`.
2. **Vue** (`render.py`, réglages dans `cfg.py`).
   - Points de vue validés avec YaYa (`CAM` : cap, distance, altitude de l'œil, champ). Le Kilimandjaro est vu de Moshi pour que la voie Machame soit visible.
   - Lancer de rayons par colonne : courbure terrestre et réfraction, relief fin suisse fondu dans le relief à 30 m.
   - Classes : plan (proche, montagne, lointain) × matière (neige, roche, végétation) × lumière (3 niveaux), soit 27 aplats.
3. **Vectorisation** (`vec.py`) : vtracer en couches empilées, plus une forme « terre » qui sert de découpe (le ciel reste transparent). Écrit `scenes.json` et un `.npz` par montagne (classes, altitudes).
4. **Voies** (`routes.py`, `osm.py`).
   - Données OSM par l'API `api.openstreetmap.org/api/0.6/map?bbox=…` (ou `relation/<id>/full` pour les itinéraires du Kilimandjaro).
   - Plus court chemin sur les sentiers entre des points de passage (refuges, cols). Les tronçons disjoints sont reliés à moins de 70 m.
   - Si la voie n'est pas cartographiée : segments drapés sur le relief, ou arête suivie depuis le sommet (`crest`, cap borné).
   - Projection dans la vue, puis marquage des passages cachés (distance du relief touché) et hors cadre.
   - L'altitude devient une progression monotone : au moins 0,5 m par pixel sur les replats et descentes, pour que le grimpeur avance.
   - Camps : les refuges avec leur altitude officielle (`OFFICIAL`), et des camps génériques entre eux.
5. **Export** (`export_app.py`) :
   - tracés en commandes relatives entières (rendu identique au pixel près, −55 %) ;
   - silhouette compacte pour les vignettes ;
   - écriture des deux fichiers de l'app.

## Relancer

```sh
python -m venv venv && venv/bin/pip install numpy tifffile imagecodecs pillow vtracer
venv/bin/python vec.py <dossier dem> <dossier sortie> [cervin,…]
venv/bin/python routes.py <dossier dem> <dossier osm> <dossier sortie> [cervin,…]
venv/bin/python export_app.py <dossier sortie> <racine forge_projet>
```

## Sources et licences

- swisstopo swissALTI3D : données ouvertes OGD (citer « swisstopo »).
- Copernicus GLO-30 : © DLR e.V. 2010–2014 et © Airbus Defence and Space GmbH 2014–2018, fourni par l'Union européenne et l'ESA dans le cadre du programme Copernicus.
- Voies et refuges : © contributeurs OpenStreetMap (ODbL), mentionné dans l'app sous l'écran « Mon ascension ».
