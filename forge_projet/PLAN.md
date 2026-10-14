# Plan — retours iPhone (3) · version 2.1.2

Règle qui guide tout le lot : **moins de texte, moins de touches.** Si l'écran est bien
pensé, il n'a pas besoin de s'expliquer. Chaque étape se termine par des captures
(390 px clair/sombre) et le test qui la couvre.

## 1. Modifier la carte du jour (view_today.js, style.css)

- [x] Retirer « Annuler » de la carte en édition : le seul bouton reste **OK**.
- [x] OK sans changement : on sort de l'édition directement.
- [x] OK avec changements → feuille d'actions :
  « Pour aujourd'hui seulement » · « Aussi pour les prochaines fois » ·
  **« Annuler les modifications »** (rouge, restaure `heroSnap`) ;
  le bouton du bas de la feuille devient « Continuer à modifier » → **« Annuler »** n'existe
  plus en double : le bouton du bas ferme la feuille (on reste en édition).
  Séance planifiée (`heroEditPlanned`) et proposition (`propAdjust`) : même logique.
- [x] Lier visuellement la carte titre et la liste : en édition, la carte du titre et la
  liste des exercices forment **un seul bloc** (même fond, coins arrondis seulement en haut
  et en bas, filet fin entre les deux, plus d'espace vide).
- Test : v12 / v63 adaptés (plus de `heroCancel` sur la carte).

## 2. Chasse aux phrases inutiles (toute l'app)

Retirer les notes qui expliquent ce qu'on voit déjà :
- [x] Mes exercices : la ligne « ★ Favori : … · Exclure : … » ; la note « Sans ton matériel ».
- [x] Apparence : « Automatique suit le réglage… », « Recommandé », note sous Séance en sombre.
- [x] Objectifs : notes sous Pratique, Âge, Groupes musculaires (garder l'estimation
  « ≈ N séries · N min », réduite à ces chiffres).
- [x] Réglages des séances : sous-titres des lignes (« Appliqué à… », « Ajoutés aux… »,
  « « Laisse l'app choisir »… »).
- [x] Motivation : « Des aides pour garder l'envie… », sous-titre de « Ton pourquoi » vide.
- [x] Données : sous-titres descriptifs (« Fichier de sauvegarde ASCEN », « Toutes les séries… »).
- [x] Profil : la note de pied « ASCEN v… — toutes les données… ».
- [x] Ascension › Pause : le pied explicatif (voir 3).
- [x] Astuce « Maintiens un exercice pour changer l'ordre » : gardée une seule fois, puis jamais.
- Garder ce qui informe vraiment (valeurs, états, erreurs, avertissements).

## 3. Pause de l'ascension en boutons (view_ascent.js)

- [x] Remplacer les interrupteurs par des **boutons d'action** :
  pas de pause → « Mettre cette semaine en pause » / « Mettre la semaine prochaine en pause » ;
  pause active → état affiché (« Cette semaine est en pause ») + « Reprendre » (annule).
- [x] Une ligne de valeur courte : « N pauses restantes ce trimestre ».
- [x] Une pause se termine seule à la fin de la semaine : rien à défaire.
- Tests v63 adaptés (plus de `.switch` dans la pause).

## 4. À propos, comme une app pro (view_profil.js, init.js)

- [x] `APP_VERSION = "2.1.2"`.
- [x] En-tête : logo, nom, « Version 2.1.2 » centrés.
- [x] Listes groupées avec titres : **Application** (Version, Données : sur cet appareil),
  **Ascension** (Comment ça marche ›, Sources des reliefs ›),
  **Mentions** (Avertissement santé ›, Droits d'auteur ›). Les textes longs passent dans
  des sous-écrans poussés (retour par glissement).

## 5. Retour par glissement dans l'ascension (ui_shell.js, view_ascent.js)

Symptôme : petit « retour en arrière » au glissement depuis un sous-écran.
Causes probables : la feuille parente est redessinée en haut (position de défilement
perdue), la scène se recharge à vide, la barre des étapes rejoue.
- [x] Mesurer (captures image par image pendant le geste).
- [x] La pile de feuilles mémorise la position de défilement du parent et la remet au retour
  (vaut pour toutes les feuilles).
- [x] Au retour, l'ascension ne rejoue ni la montée ni les transitions (scène posée à l'état final).

## 6. Échauffement en option, chrono plus grand (view_today.js, view_profil.js)

- [x] Retirer la ligne « Échauffement : 1 série légère… » de la carte d'exercice.
- [x] Réglage « Échauffement » (Réglages des séances), désactivé par défaut.
- [x] Activé : au début de la séance, un écran d'échauffement **avant** le 1er exercice,
  adapté aux régions travaillées (haut du corps → épaules, bras, poignets ; bas → hanches,
  genoux, chevilles ; gainage), 4 mouvements × 30 s, chrono guidé ;
  « Passer » toujours visible, enchaîne sur le 1er exercice à la fin.
- [x] Chrono de séance en haut à gauche légèrement plus grand (`.sx-clock span`).
- Test v64.

## 7. Idées d'amélioration (proposées, à valider avant de les faire)

Classées par valeur pour l'usage à la maison :
1. **Saisie en un geste pendant la série** : glisser verticalement sur le chiffre des répétitions ou de la charge
   (comme une molette) au lieu de toucher − / + plusieurs fois.
2. **Repos qui démarre seul à la validation, écran verrouillé compris** : notification locale à la fin du repos
   (la PWA installée le permet sur iOS 16.4+), pour poser le téléphone sans le regarder.
3. **Widget « séance du jour » / raccourci Siri** (« Démarrer ma séance ») via un lien direct `?start=1`.
4. **Fin de séance : une seule image partageable** (l'altitude gagnée + les records), comme la carte de sommet.
5. **Rappel doux le jour prévu** (notification locale à l'heure habituelle de séance, apprise de l'historique).
6. **Mode « une main »** : boutons Valider / Passer le repos regroupés dans le tiers bas, plus grands sur grand écran.
7. **Haptique distincte** : série validée, record, fin de repos (trois motifs reconnaissables sans regarder).
8. **Design** : une icône par mouvement d'échauffement (pictos animés comme les exercices).

## Livraison

- [x] Test v64 (points 1 à 6), tests existants adaptés, suite complète + audits + monkey.
- [x] HANDOFF.md, cache `forge-v48`, build, commit, push sur `claude/new-session-wotw1c`.

---

# Plan — passe finale (2.1.3)

## A. Retour par glissement sans saccade
- [ ] Mesurer image par image (CPU ralenti ×4, comme un iPhone) : durée du premier `touchmove`, images perdues.
- [ ] Garder en mémoire l'écran parent quand on pousse un sous-écran (comme la pile de navigation d'iOS) :
  au retour, il est remis tel quel, sans être reconstruit ni cloné (scène, défilement, état intacts).
  Reconstruction seulement si des données ont changé entre-temps.
- [ ] Calques du geste sur le compositeur (`will-change`, pas d'ombre recalculée), aucune mise en page pendant le geste.

## B. Pictogrammes et animations
- [ ] Planche de toutes les animations (images clés) pour repérer les mouvements faux ou raides.
- [ ] Roue abdominale : vrai déroulé (genoux au sol, roue qui part loin devant, retour), puis les autres défauts repérés.

## C. Passe finale
- [ ] Performance : démarrage, rendu de chaque onglet, longues tâches, mémoire, poids du fichier, CSS mort.
- [ ] Sécurité : échappement de tout texte saisi ou importé, import de sauvegarde et de programme IA (taille, forme,
  `__proto__`), CSP, service worker.
- [ ] Robustesse : stockage plein ou corrompu, minuteries en arrière-plan, données extrêmes, test au hasard prolongé.
- [ ] Polish : captures de tous les écrans (320/390/430, clair/sombre), alignements, textes, états vides.
- [ ] Tests (v65), suite complète, HANDOFF, version 2.1.3, cache, commit, push.
