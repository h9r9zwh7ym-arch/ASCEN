Tu es chargé de faire une review COMPLÈTE de l'app ASCEN et de corriger directement ce que tu trouves. ASCEN est mon app web de musculation à la maison (haltères, suivi de séances, progression, records, streaks, trophées, suggestions d'exercices, ascension de la montagne). Elle tourne sur iPhone (Safari / écran d'accueil), les données restent 100 % locales, aucune API, et ça doit rester comme ça.

## Règles de sécurité
1. Travaille sur la branche `review-complete`, avec le tag `avant-review` comme point de retour.
2. Un commit par thème (UI, données, perf, code, motivation), message clair en français.
3. Ne casse jamais les données déjà stockées sur mon iPhone : toute modification du format de stockage doit inclure une migration versionnée et testée sur des données d'exemple de l'ancien format.
4. Pas de nouvelle dépendance ni de framework, sauf justification écrite et validée dans le rapport. Pas de requête réseau.
5. Si une correction change le comportement d'une fonctionnalité existante (pas juste son apparence ou sa fiabilité), note-le dans le journal des changements.

## Méthode
Phase 1 : Cartographie. Lis tout le code. Décris en 10 lignes max l'architecture, le modèle de données, les écrans et les flux principaux. Ne modifie rien.
Phase 2 : Audit. Pour chaque axe ci-dessous, liste les problèmes trouvés avec : gravité (critique / important / mineur), où (fichier, ligne), pourquoi c'est un problème, comment tu le corriges.
Phase 3 : Corrections. Applique les corrections par ordre de gravité, axe par axe. Corrige tout ce qui est critique et important, et le mineur quand le risque est faible.
Phase 4 : Vérification. Lance l'app dans un navigateur headless à la taille d'un iPhone (390×844, puis 375×667 pour un petit écran), prends des captures de chaque écran avant et après, teste les parcours complets (créer une séance, enregistrer des séries, voir la progression, débloquer un trophée, éditer une séance proposée, exporter/importer). Teste aussi : état vide, première ouverture, beaucoup de données (simule 1 an de séances), clavier ouvert, données corrompues ou absentes. Mesure avant/après quand tu touches à la performance.
Phase 5 : Rapport final dans REVIEW.md : ce qui a été corrigé, ce qui reste, ce que tu recommandes pour plus tard (grosses évolutions non faites), avec les mesures.

## Axes de la review

### 1. UI et ergonomie
- Usage à une main sur iPhone : zones tactiles ≥ 44 px, actions principales atteignables au pouce, safe areas (encoche, barre d'accueil), comportement avec le clavier, pas de zoom involontaire dans les champs.
- États vides, chargement, erreurs, annulation : chaque écran doit avoir un état propre, et chaque action destructive doit être annulable ou confirmée.
- Cohérence visuelle entre tous les écrans : mêmes composants, mêmes espacements, mêmes comportements.
- Mon cap de design, à faire respecter partout : rendu sobre proche des apps Apple ; ne jamais répéter une information à l'écran ; accent (jaune en mode sombre, vert en mode clair) réservé à l'action principale et à l'état actif ; vert = validation, orange/rouge = alerte ; 3 tailles de texte seulement ; espacements en multiples de 8 px ; marge latérale de 20 px ; contrôles segmentés style iOS (pastille claire, sans bordure) ; chips et tuiles avec bordure d'accent quand elles sont sélectionnées ; pas de swipe entre onglets.
- Supprime tout texte qui dit quoi faire (« touche… », « fais glisser… ») : l'interface doit le montrer visuellement, pas le dire.
- Haptique : un seul « tac » sur les validations, jamais sur la navigation, les fermetures ou les événements automatiques ; le réglage « Retour haptique » doit exister et fonctionner.
- Mode clair et sombre complets, contrastes lisibles, animations fluides et discrètes, respect de « réduire les animations ».

### 2. Fiabilité des données
- Comment les séances, records, streaks et réglages sont stockés (localStorage / IndexedDB) : risques de perte, de corruption, de dépassement de quota, d'écritures concurrentes, de fuseau horaire ou changement d'heure qui casse les streaks.
- Validité des calculs : records personnels, volume, progression, streaks, 1RM estimé. Vérifie chaque formule et dis d'où elle vient.
- Export / import : doit être complet, versionné, et résister à un fichier invalide ou d'une ancienne version.
- Cas limites : séance interrompue, app fermée en pleine séance, valeurs vides ou négatives, poids décimaux, suppression d'un exercice utilisé dans l'historique.

### 3. Performance
- Temps de chargement, taille du code et des assets, travail inutile au démarrage.
- Fluidité des listes, graphiques et historiques avec beaucoup de données : re-rendus inutiles, calculs répétés, fuites d'écouteurs, animations trop coûteuses sur iPhone.
- Lectures/écritures de stockage trop fréquentes ou bloquantes.
- Fonctionnement hors ligne et comportement de la mise en cache.

### 4. Qualité du code
- Structure, nommage, duplication, fonctions trop longues, état global mal maîtrisé, code mort.
- Robustesse : erreurs non gérées, hypothèses fragiles, XSS ou injection via des noms d'exercices saisis.
- Rends le code plus facile à faire évoluer sans tout réécrire. Pas de refonte gratuite : chaque refactor doit être justifié par un gain concret.

### 5. Motivation de l'utilisateur
- Évalue si l'app donne vraiment envie de revenir : lancement d'une séance en 2 touches maximum, feedback immédiat et satisfaisant à la validation d'une série, visibilité de la progression (records, courbes, streaks), trophées bien dosés et lisibles, ascension de la montagne claire et gratifiante, gestion du streak sans culpabiliser en cas d'absence, première ouverture engageante.
- Repère les frictions qui font abandonner (trop de saisie, trop d'écrans, retours trop discrets, objectifs flous).
- Corrige ce qui est une friction ou un défaut. Pour les nouvelles idées de gamification ou de rétention, mets-les dans la section « Recommandations » du rapport au lieu de les implémenter, sauf si c'est petit et évident.

## Livrables
- Branche `review-complete` avec tous les commits.
- REVIEW.md : résumé, tableau des problèmes (gravité, statut), mesures avant/après, captures avant/après, recommandations.
- Une courte liste « à tester sur mon iPhone » : les 10 points que tu ne peux pas vérifier toi-même (haptique, vrai clavier, safe areas réelles, etc.).

Ne t'arrête pas à un premier tour : à la fin de la phase 3, relis ton propre travail, cherche les régressions que tu as pu introduire, et corrige-les avant le rapport.
