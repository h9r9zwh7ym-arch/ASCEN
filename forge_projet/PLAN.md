# Plan — retours iPhone (3) · version 2.1.2

Règle qui guide tout le lot : **moins de texte, moins de touches.** Si l'écran est bien
pensé, il n'a pas besoin de s'expliquer. Chaque étape se termine par des captures
(390 px clair/sombre) et le test qui la couvre.

## 1. Modifier la carte du jour (view_today.js, style.css)

- [ ] Retirer « Annuler » de la carte en édition : le seul bouton reste **OK**.
- [ ] OK sans changement : on sort de l'édition directement.
- [ ] OK avec changements → feuille d'actions :
  « Pour aujourd'hui seulement » · « Aussi pour les prochaines fois » ·
  **« Annuler les modifications »** (rouge, restaure `heroSnap`) ;
  le bouton du bas de la feuille devient « Continuer à modifier » → **« Annuler »** n'existe
  plus en double : le bouton du bas ferme la feuille (on reste en édition).
  Séance planifiée (`heroEditPlanned`) et proposition (`propAdjust`) : même logique.
- [ ] Lier visuellement la carte titre et la liste : en édition, la carte du titre et la
  liste des exercices forment **un seul bloc** (même fond, coins arrondis seulement en haut
  et en bas, filet fin entre les deux, plus d'espace vide).
- Test : v12 / v63 adaptés (plus de `heroCancel` sur la carte).

## 2. Chasse aux phrases inutiles (toute l'app)

Retirer les notes qui expliquent ce qu'on voit déjà :
- [ ] Mes exercices : la ligne « ★ Favori : … · Exclure : … » ; la note « Sans ton matériel ».
- [ ] Apparence : « Automatique suit le réglage… », « Recommandé », note sous Séance en sombre.
- [ ] Objectifs : notes sous Pratique, Âge, Groupes musculaires (garder l'estimation
  « ≈ N séries · N min », réduite à ces chiffres).
- [ ] Réglages des séances : sous-titres des lignes (« Appliqué à… », « Ajoutés aux… »,
  « « Laisse l'app choisir »… »).
- [ ] Motivation : « Des aides pour garder l'envie… », sous-titre de « Ton pourquoi » vide.
- [ ] Données : sous-titres descriptifs (« Fichier de sauvegarde ASCEN », « Toutes les séries… »).
- [ ] Profil : la note de pied « ASCEN v… — toutes les données… ».
- [ ] Ascension › Pause : le pied explicatif (voir 3).
- [ ] Astuce « Maintiens un exercice pour changer l'ordre » : gardée une seule fois, puis jamais.
- Garder ce qui informe vraiment (valeurs, états, erreurs, avertissements).

## 3. Pause de l'ascension en boutons (view_ascent.js)

- [ ] Remplacer les interrupteurs par des **boutons d'action** :
  pas de pause → « Mettre cette semaine en pause » / « Mettre la semaine prochaine en pause » ;
  pause active → état affiché (« Cette semaine est en pause ») + « Reprendre » (annule).
- [ ] Une ligne de valeur courte : « N pauses restantes ce trimestre ».
- [ ] Une pause se termine seule à la fin de la semaine : rien à défaire.
- Tests v63 adaptés (plus de `.switch` dans la pause).

## 4. À propos, comme une app pro (view_profil.js, init.js)

- [ ] `APP_VERSION = "2.1.2"`.
- [ ] En-tête : logo, nom, « Version 2.1.2 » centrés.
- [ ] Listes groupées avec titres : **Application** (Version, Données : sur cet appareil),
  **Ascension** (Comment ça marche ›, Sources des reliefs ›),
  **Mentions** (Avertissement santé ›, Droits d'auteur ›). Les textes longs passent dans
  des sous-écrans poussés (retour par glissement).

## 5. Retour par glissement dans l'ascension (ui_shell.js, view_ascent.js)

Symptôme : petit « retour en arrière » au glissement depuis un sous-écran.
Causes probables : la feuille parente est redessinée en haut (position de défilement
perdue), la scène se recharge à vide, la barre des étapes rejoue.
- [ ] Mesurer (captures image par image pendant le geste).
- [ ] La pile de feuilles mémorise la position de défilement du parent et la remet au retour
  (vaut pour toutes les feuilles).
- [ ] Au retour, l'ascension ne rejoue ni la montée ni les transitions (scène posée à l'état final).

## 6. Échauffement en option, chrono plus grand (view_today.js, view_profil.js)

- [ ] Retirer la ligne « Échauffement : 1 série légère… » de la carte d'exercice.
- [ ] Réglage « Échauffement » (Réglages des séances), désactivé par défaut.
- [ ] Activé : au début de la séance, un écran d'échauffement **avant** le 1er exercice,
  adapté aux régions travaillées (haut du corps → épaules, bras, poignets ; bas → hanches,
  genoux, chevilles ; gainage), 4 mouvements × 30 s, chrono guidé ;
  « Passer » toujours visible, enchaîne sur le 1er exercice à la fin.
- [ ] Chrono de séance en haut à gauche légèrement plus grand (`.sx-clock span`).
- Test v64.

## 7. Idées d'amélioration (à proposer, pas à faire d'office)

Ergonomie, motivation, design : liste courte en fin de livraison, classée par valeur.

## Livraison

- [ ] Test v64 (points 1 à 6), tests existants adaptés, suite complète + audits + monkey.
- [ ] HANDOFF.md, cache `forge-v48`, build, commit, push sur `claude/new-session-wotw1c`.
