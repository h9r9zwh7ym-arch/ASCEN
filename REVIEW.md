# Review ASCEN — phases 1 et 2 (cartographie et audit)

Branche `review-complete`, point de retour : tag `avant-review` (commit `21ad8bd`, version 2.14.1, cache `forge-v112`).
Consigne complète : [PROMPT-REVIEW.md](PROMPT-REVIEW.md). Aucun fichier de l'app n'a été modifié dans cette session.

## Résumé

L'app est solide : stockage double (localStorage + IndexedDB compressé + 7 copies du jour), chargement qui répare les données abîmées, formules sourcées, aucune injection trouvée, aucune fonction morte, performances correctes même avec 5 ans d'historique. Je n'ai trouvé **aucun problème critique**.

Les écarts principaux sont ailleurs :
1. **Le cap design n'est pas appliqué** : accent orange partout (au lieu de jaune en sombre / vert en clair), accent utilisé pour des données et des textes d'information, 6 à 10 tailles de texte par écran (au lieu de 3), marge latérale de 16 px (au lieu de 20), puces sélectionnées en aplat noir (au lieu d'une bordure d'accent), textes qui disent quoi faire.
2. **Une double touche sur « Valider la série » passe le repos** (reproduit sur Chromium et WebKit, jusqu'à 400 ms d'écart).
3. **Le compteur de records dérive vers le haut** : abandonner une séance ou en supprimer une ne retire pas ses records du compteur (trophée « Records » faussé).
4. **Données illisibles sans copie de secours : l'app repart à zéro sans rien dire** (la copie mise de côté n'est proposée nulle part).
5. **Première ouverture et jours sans séance prévue** : l'accueil affiche « Compose ta séance » vide alors que l'onboarding promet « Une séance prête chaque jour ».

Plusieurs corrections changent l'apparence de toute l'app : elles demandent ta validation (voir « Décisions à valider » en fin de document).

## Phase 1 — Cartographie

1. **Architecture** : PWA mono-fichier. `forge_projet/build.sh` concatène 33 fichiers JS (≈ 15 000 lignes) et `style.css` (3 481 lignes) en `index.html` (1,06 Mo, minifié par esbuild). Scripts globaux partagés, sans modules ni framework. Boutons déclaratifs `data-a="nom"` → `ACT.nom()` via un répartiteur unique (`ui_shell.js`). Service worker « cache d'abord » (`sw.js`). Three.js (trophées 3D) et scènes de montagne chargés à la demande.
2. **Modèle de données** : un objet `S` (`core.js`) : `sessions` (séances terminées → exercices → séries `{reps, weight, done, pr, effort, goal}`), `draft` (séance proposée ou en cours), `custom` / `templates` (Ma séance, Mes séances et leurs jours), `equipment`, `prefs`, `goals`, `settings`, `medals`, `targets`, `challenges`, `body`, `deload`, `ascent`, `meta` (compteurs, sauvegardes).
3. **Stockage** : localStorage `forge.v1` (JSON, historique compacté dans `zs`, écriture 400 ms après chaque `save()` et à la sortie), miroir IndexedDB gzip (`forge/state`, au plus toutes les 3 s), 7 copies du jour (`forge/snap`). `normalizeState` valide et répare chaque chargement et chaque import. Records, séries de semaines, force, ascension et trophées sont **recalculés depuis l'historique** et mémoïsés (`DATA_VER`, `memoHist`, `sessionSummary`).
4. **Écrans** : 3 onglets. Aujourd'hui (carte du jour, Cette semaine / ascension, Mes séances). Progrès (Résumé : force, muscles, records, avant/maintenant, statistiques | Historique : calendrier, séances, Rewind). Profil (trophées, réglages, données). Feuilles : Mon ascension, fiche exercice, sélecteur, éditeurs, onboarding en 4 étapes.
5. **Flux principal** : accueil → séance prévue, composée ou proposée → « Commencer » → carte de l'exercice (− / +, glisser, « Valider la série ») → repos (anneau, ressenti) → … → fin automatique → page de fin (records, ascension, trophées, « Garder cette séance ? ») → Progrès et Historique recalculés.
6. **Moteurs** : `engine.js` / `tailor.js` (propositions, double progression), `strength.js` (indice de force), `ascent.js` (13 montagnes, camps), `trophies.js` (42 familles × 4 paliers), `coach.js` (fatigue en séance).

## Méthode de l'audit

- Lecture du code : `core.js` et `init.js` en entier ; `ui_shell.js`, `timer.js`, `fx.js`, sauvegarde/restauration (`view_profil.js`), historique (`view_history.js`), validation et fin de séance (`view_today.js`), formules (`strength.js`), trophées ; recherche ciblée dans le reste (textes affichés, couleurs, tailles, échappement).
- L'app réelle lancée dans Chromium et WebKit headless (390×844 et 375×667, clair et sombre), avec 0 séance, 1 an et 5 ans de séances générées.
- Scripts d'essai : injection de HTML dans tous les champs saisis, données corrompues (5 cas), double touche, cibles tactiles, tailles de texte par écran, contrastes, code mort, actions sans gestionnaire.
- Captures « avant » : [`review/captures/avant/`](review/captures/avant/) (45 écrans).

## Mesures de référence (avant correction)

| Mesure | Valeur |
|---|---|
| `index.html` | 1 085 531 octets (316 901 en gzip) |
| `ascent-scenes.js` / `three-forge.js` (à la demande) | 695 361 / 617 941 octets (143 098 / 159 159 en gzip) |
| Démarrage, Chromium, CPU ×4 (DOMContentLoaded, 3 essais) | 0 séance : 219–396 ms · 1 an (157 séances) : 305–402 ms · 5 ans (783) : 386–515 ms |
| Écriture complète (`persistNow`), CPU ×4 | 1 an : 1,8 ms · 5 ans : 3,7 ms |
| Taille stockée (`forge.v1`) | 1 an : 58 Ko · 5 ans : 274 Ko (limite localStorage ≈ 5 Mo) |
| `tests/perf2.js` (3 ans, 470 séances, CPU ×4) | accueil 21,1 ms · Progrès 19,1 ms · Profil 12,5 ms · changement d'onglet médian 6,3 ms (max 35,7) · valider une série 46,9 ms · 1 image longue sur 69 à l'entrée de l'accueil |
| Lancement d'une séance (toucher → bouton utilisable) | ≈ 2,3 s de transition, dont ≈ 1,3 s où « Valider la série » n'est pas touchable |
| Tests existants (80 suites × 2 moteurs + audits) | voir « État des tests » plus bas |

## Phase 2 — Audit

Gravité : **critique** = perte de données ou fonction principale cassée ; **important** = défaut visible au quotidien, calcul faux ou écart net au cap ; **mineur** = ponctuel, rare ou cosmétique. Tous les statuts sont « à faire » (phase 3).

### 1. UI et ergonomie

| # | Gravité | Où | Problème (et pourquoi) | Correction prévue | Statut |
|---|---|---|---|---|---|
| U1 | important | `style.css:6`, `:33`, `:44` (`--tint`), 272 usages de `var(--tint…)` | Accent orange `#BC5736` dans les deux thèmes. Ton cap : jaune en sombre, vert en clair. Attention : un texte blanc sur le vert iOS `#34C759` n'a que 2,2:1 de contraste (illisible). | Redéfinir les jetons `--tint`, `--tint-ink`, `--tint-bg`, `--on-tint` par thème. Sombre : jaune `#FFD60A`, texte noir dessus (14,9:1). Clair : vert foncé `#1E7A35`, texte blanc (5,4:1), ou vert iOS avec texte noir. **À valider (D1).** | corrigé |
| U2 | important | jours faits `style.css:2608` et calendrier de l'Historique ; courbes `:343-352` ; barres des muscles `:391` ; « +18 % » d'Avant et maintenant ; « Camp 15 à ta portée aujourd'hui » (`view_today.js:313`) ; « Proposée par l'app », « Exercice principal, en premier », « Voir les 6 exercices » | L'accent sert aussi aux données, aux états « fait » et à des textes d'information. Ton cap le réserve à l'action principale et à l'état actif ; « fait / réussi » doit être vert. | « Fait » et coches en vert de validation. Courbes et barres en encre neutre (`--label` / `--label2`). Textes d'information en `--label2`. L'accent reste sur le bouton principal, l'onglet actif et la sélection. | corrigé |
| U3 | important | `style.css:20-21` (10 tailles), 544 déclarations `font-size` dont ≈ 50 valeurs en dur | Mesuré : 6 à 10 tailles de texte différentes par écran (Mon ascension : 10). Ton cap : 3 tailles. | 3 jetons (titre, corps, légende) et remplacement de toutes les déclarations. Exception documentée pour les grands chiffres de séance (chrono, répétitions, repos), qui sont des affichages et non du texte. **À valider (D2).** | corrigé (chiffres d'affichage en exception) |
| U4 | important | `style.css:23` (`--gutter:16px`) | Marge latérale de 16 px. Mesuré : titres à 20 px, cartes et contrôles segmentés à 16 px, donc deux alignements sur le même écran. | `--gutter:20px`, tout aligné sur 20 px. | corrigé |
| U5 | important | `style.css:766`, `:774`, `:874`, `:1503` (`.chip.on`, `.type-chip.on`, `.wz-n button.on`) ; `:288-289` (lignes cochées) | Puces et tuiles sélectionnées en aplat noir (onboarding, sélecteur, types de séance) ; lignes cochées sur fond orange. Ton cap : bordure d'accent quand c'est sélectionné. | Sélection = fond neutre et bordure d'accent de 2 px, partout, via une seule règle. | corrigé |
| U6 | important | `view_today.js:930` (« Passer le repos ») et `:959` (« Valider la série »), même emplacement ; garde anti-double appui `ui_shell.js:995` liée à l'élément | **Double touche** : le 2e toucher tombe sur « Passer le repos », qui remplace le bouton au même endroit. Reproduit sur Chromium et WebKit avec 120, 250 et 400 ms d'écart : la série est validée et le repos sauté. | Ignorer « Passer le repos » pendant 600 ms après le début du repos (garde dans `restSkip`, `timer.js:89`). | corrigé |
| U7 | important | `view_today.js:413`, `:1296`, `:1441`, `:1545` ; `view_ascent.js:718`, `:800`, `:861` ; `view_profil.js:114`, `:402-404` ; `onboarding.js:21` ; `tpl_editor.js:44` ; `trophies.js:538` ; `strength.js:226` | Textes qui disent quoi faire (« Planifie une séance dans Mes séances… », « Touche une montagne gravie pour la regravir », « Coche ce que tu as à la maison », « Touche le bouton Partager », « Enregistre-la pour la refaire… », « Choisis le type, la zone et la durée »…). | Supprimer, ou remplacer par l'élément visuel lui-même : bouton direct, icône Partager dessinée, état vide avec une seule action. Les messages d'erreur gardent une phrase factuelle. | corrigé (les feuilles « Comment ça marche » gardent leurs explications) |
| U8 | mineur | `timer.js:40`, `:54` | `navigator.vibrate` à la fin du repos et pendant les 3 dernières secondes : événements automatiques, hors du réglage « Retour haptique ». Sans effet sur iPhone (Safari l'ignore), mais contraire à la règle. | Supprimer ces deux appels. | corrigé |
| U9 | mineur | `view_today.js:649`, `:774` (« Ajouter un exercice ») et `:957` (« Lancer le chrono ») | Haptique sur des actions qui ne sont pas des validations : ouvrir le sélecteur (navigation), démarrer un chrono. Ta règle : un seul « tac », sur les validations. Le réglage « Retour haptique » existe et fonctionne (`fx.js:16-26`). | Bouton normal pour ces trois actions. Le « tac » reste sur Valider la série, Valider sans chrono et S'arrêter (qui valide la série tenue). | corrigé |
| U10 | mineur | `motion.js:339` (`moStart`) | Transition de lancement d'environ 2,3 s. Pendant ≈ 1,3 s, la copie animée affiche le bouton sans libellé et le vrai bouton n'est pas touchable (mesuré). | Ramener la transition sous 600 ms et rendre le bouton actif dès son affichage. | partiel : ≈ 1,2 s au lieu de 2,3 s, bouton touchable dès ≈ 0,5 s (objectif de 600 ms non atteint) |
| U11 | mineur | jours de « Cette semaine » `style.css:2602-2603` (43×60 px) ; Mon ascension : ⓘ 42×42, « Revoir » 95×36, « Bouger la montagne » 36×36 | Cibles tactiles sous 44 px (tous les autres écrans mesurés sont conformes). | Zone de toucher agrandie à 44 px (même procédé `::before` que le reste de l'app). | corrigé |
| U12 | mineur | `style.css:240` (`.seg-ind`) | Contrôle segmenté : la pastille a un liseré de 0,5 px en plus de l'ombre. Ton cap : pastille claire, sans bordure. | Retirer le liseré, garder une ombre douce. | corrigé |
| U13 | mineur | `style.css:23` (`--sp-1` 4, `--sp-3` 12…) et ≈ 300 marges en dur (10, 12, 14 px) | Espacements en multiples de 4, pas de 8. | Jetons 8 / 16 / 24 / 32 ; remplacement écran par écran, captures avant/après pour chaque écran. | corrigé (4 px gardé en demi-pas dans les composants) |
| U14 | mineur | `style.css:5` (`--label3 #8E8E93`, 75 usages) | Texte tertiaire à 2,9:1 sur le fond clair (seuil lisible : 4,5:1). | `#6E6E73` en mode clair (4,5:1 sur le fond, 5,1:1 sur les cartes). Sombre inchangé (5,2:1). | corrigé |
| U15 | mineur | ≈ 55 courbes à rebond (`favPop`, `ckPop`, `badgePop`, ressorts des feuilles…) | Animations qui rebondissent : moins discrètes que ton cap. « Réduire les animations » est bien respecté (vérifié dans `fx.js`, `motion.js`, `view_ascent.js`, confettis, 34 blocs CSS). | Courbes sans dépassement, sauf l'onglet actif. | partiel : courbes sans dépassement ; quelques « pops » par images clés restent |
| U16 | mineur | `trophies.js:477`, `view_today.js:2031` | « reps » (anglais) alors que le reste de l'app écrit « rép. ». | « rép. » partout. | corrigé |
| U17 | mineur | feuilles avec champs (modifier une séance `view_history.js:299-307`, onboarding), aucun usage de `visualViewport` | Clavier ouvert : rien ne garantit que le bouton du bas de la feuille reste visible. Non vérifiable sans vrai clavier. | Mesure de `visualViewport` pour remonter le pied de feuille, à confirmer sur iPhone. | corrigé, à vérifier sur iPhone |

### 2. Fiabilité des données

| # | Gravité | Où | Problème (et pourquoi) | Correction prévue | Statut |
|---|---|---|---|---|---|
| D1 | important | `view_today.js:2004-2008` (abandon), `view_history.js:252-261` (suppression), `core.js:822` ; lu par le trophée « Records » `trophies.js:105` | `S.meta.prCount` est un compteur tenu à la main. Abandonner une séance qui contenait un record, ou supprimer une séance de l'historique, ne le décrémente pas (`recomputePRFlags` ne compte que les séances restantes). Le nombre de records ne fait que monter et peut débloquer un trophée non mérité. Reproduit : 9 records réels, compteur à 10 après un abandon, puis 10 pour 8 records réels après une suppression. | Compter les records directement dans l'historique (somme des séries marquées `pr`, mémoïsée) ; `prCount` recalé une fois au chargement, sans changer le format. | corrigé |
| D2 | important | `core.js:272-276`, `init.js:200-204` | Données principales illisibles et pas de copie IndexedDB : la copie est mise de côté (`forge.v1.illisible.*`), mais l'app repart sur l'onboarding **sans aucun message**, et rien ne permet de récupérer cette copie ni de proposer une copie du jour. | Message au lancement (« Tes données n'ont pas pu être lues… ») avec deux choix : revenir à la dernière copie du jour, ou garder la copie illisible de côté pour l'envoyer. | corrigé |
| D3 | important | `core.js:228-230` (`idbRecover`) | Un état lisible mais vide (par exemple `sessions` qui n'est pas une liste) est accepté sans date d'enregistrement ; la copie IndexedDB, qui contient l'historique, est ignorée puis écrasée par l'état vide dès le lancement (reproduit : 15 séances dans la copie, 0 après 2,5 s). Scénario rare (il faut un état mal formé, par exemple après un bug), conséquence lourde : seules les copies du jour restent. | Si l'état chargé n'a ni séance ni `savedAt` alors que la copie IndexedDB a des séances, reprendre la copie. | corrigé |
| D4 | important | `core.js:13` (`v:1` jamais incrémenté), `core.js:279-408` | Pas de version de schéma ni de migrations ordonnées : les conversions d'anciennes versions (élastiques en kg, `todayMode`, anciens trophées, règle des records) sont mêlées à la validation dans `normalizeState` (131 lignes). Ta règle 3 exige des migrations versionnées et testées. | `S.v` = numéro de schéma, liste ordonnée `MIGRATIONS` (les conversions existantes y passent, sans changer le format actuel), test sur des données d'exemple de chaque ancien format (JSON brut v1, compact `fmt:2`, élastiques en kg, sauvegarde « FORGE »). | corrigé |
| D5 | mineur | `core.js:475-481` | localStorage plein : la copie principale est effacée **avant** que l'écriture IndexedDB soit confirmée. Si IndexedDB échoue aussi, il ne reste que la copie de la veille. Rare (plusieurs décennies de séances avant 5 Mo). | N'effacer la copie principale qu'après l'écriture IndexedDB réussie. | corrigé |
| D6 | mineur | `view_profil.js:363` | La copie « avant restauration » est écrite non compressée dans localStorage et n'est jamais supprimée : elle occupe autant que l'historique et rapproche du plafond de 5 Mo. | La ranger dans IndexedDB (copie du jour) ou la supprimer après 7 jours. | corrigé |
| D7 | mineur | `view_profil.js:354-357` | La restauration ne lit ni `format` ni `version` : une sauvegarde d'une version plus récente de l'app est acceptée sans avertissement. Les fichiers invalides et anciens sont bien gérés (`parseUntrusted`, taille, `normalizeState`). | Avertir si `format` est plus récent que celui de l'app ; garder la lecture des anciens formats. | corrigé |
| D8 | mineur | `view_history.js:273`, `:332` | Modifier une séance passée arrondit la charge au dixième (11,25 kg devient 11,3 kg) et l'affiche avec une seule décimale. | Deux décimales, comme partout ailleurs (`fmtW`). | corrigé |
| D9 | mineur | `timer.js:2-12` | Le repos en cours n'est pas enregistré : si iOS ferme l'app pendant un repos, on revient sans décompte. La séance elle-même est bien conservée. | Enregistrer la fin prévue du repos dans la séance en cours et la reprendre au retour. | corrigé |
| D10 | mineur | `core.js:175-184`, `view_profil.js:784-790` | « Réinitialiser » efface aussi les 7 copies du jour, c'est-à-dire le dernier filet de sécurité. Confirmation unique. | Garder la copie du jour la plus récente, ou proposer « Faire une sauvegarde d'abord » dans la confirmation. | corrigé (sauvegarde proposée ; les copies du jour restent effacées, comme demandé par « tout supprimer ») |

**Vérifié sans problème** :
- **1RM** : moyenne d'Epley (`w × (1 + r/30)`, 1985) et de Brzycki (`w × 36 / (37 − r)`, 1993) jusqu'à 10 répétitions, Epley seul au-delà, la charge elle-même à 1 répétition (`strength.js:34-39`).
- **Volume** : Σ répétitions × charge, élastiques exclus (`core.js:684-706`).
- **Records** : même règle en direct et après coup (`prBeats`), jamais à la 1re fois.
- **Indice de force, désentraînement, statut** : sources citées dans `strength.js:1-30` (LeSuer 1997, Mayhew 2008, Zourdos/Helms 2016, Ebben 2011, Bosquet 2013, McMaster 2013, Williams 2017).
- **Séries de semaines** : semaines avec au moins une séance, la semaine en cours ne casse pas la série, un joker par mois (`core.js:830-863`).
- **Dates** : toujours en heure locale, numéros de jour en UTC, donc pas de décalage au changement d'heure ni à minuit.
- **Deux onglets ouverts** : gérés (`storage`, `adoptNewerStored`).
- **Séance oubliée** : arrêtée à la dernière série (+1 min) après 30 min sans validation.
- **Valeurs** : négatives bornées à 0 ; poids décimaux gardés (`fmtW`).
- **Exercice retiré** : l'historique le garde.
- **Export / import** : export complet et versionné (`{app, format:1, version, exportedAt, data}`) ; import protégé (`parseUntrusted`, 50 Mo max, `normalizeState`) ; CSV protégé contre les formules.

### 3. Performance

| # | Gravité | Où | Problème (et pourquoi) | Correction prévue | Statut |
|---|---|---|---|---|---|
| P1 | mineur | `motion.js:339` (voir U10) | La transition de lancement est le seul vrai temps d'attente mesuré (≈ 2,3 s). | Voir U10. | corrigé (voir U10) |
| P2 | mineur | `view_today.js:1857-1910` (`validateSet`) | Valider une série coûte 46,9 ms à CPU ×4, soit environ une image perdue sur un iPhone ancien : rendu de la carte, recherche des records et « à battre », son, effets. | Profiler et différer ce qui n'est pas visible tout de suite (calcul « à battre » de la série suivante, préparation du repos). Objectif : moins de 30 ms. | corrigé (≈ 63 → 44 ms) |
| P3 | mineur | `style.css` (273 Ko non minifié, 315 sélecteurs redéfinis hors `@media`, 58 `!important`) | Feuille de style analysée à chaque lancement et difficile à faire évoluer. Les règles redéfinies se contredisent (exemple : `.seg button` défini 4 fois). | Dédoublonner les zones touchées par U1-U5 (même passe, pas de chantier séparé). | non fait : les règles touchées ont été remplacées sur place, sans dédoublonnage global (risque sans gain mesurable) |
| P4 | mineur | `index.html` (1,06 Mo) | Tout le code est analysé au lancement, y compris des écrans rares (Mon ascension 120 Ko, Rewind, bilan image, trophées 3D). Le démarrage reste correct (300 à 500 ms à CPU ×4 avec 1 à 5 ans d'historique). | Aucune correction en phase 3 (gain trop faible pour le risque) ; voir Recommandations. | non fait (recommandation) |

**Vérifié sans problème** :
- **Écritures** : différées et regroupées ; copie compressée au plus toutes les 3 s.
- **Démarrage** : aucune écriture pendant la lecture d'IndexedDB ; préchauffage et dessins au calme.
- **Calculs** : mémoïsés par version de données ; aucune fuite d'écouteurs repérée à la lecture (écouteurs globaux posés une fois, feuilles reconstruites).
- **Hors ligne** : le service worker met tout en cache après la première utilisation, scènes et Three.js compris.

### 4. Qualité du code

| # | Gravité | Où | Problème (et pourquoi) | Correction prévue | Statut |
|---|---|---|---|---|---|
| C1 | important | `core.js:822`, `view_today.js:1876`, `:2027`, `:2059` | Cause de D1 : un compteur dérivé (`prCount`) est tenu à la main à 4 endroits au lieu d'être calculé. | Voir D1 : une seule fonction de calcul, les 4 mises à jour manuelles retirées. | corrigé |
| C2 | important | `core.js:279-408` | Validation, réparation et migrations mêlées dans une fonction de 131 lignes (voir D4). | Séparer en `migrate(state)` (versions) et `normalizeState` (validation). Gain concret : chaque futur changement de format aura sa migration et son test. | corrigé (migrations séparées ; la validation reste dans normalizeState) |
| C3 | mineur | `forge_projet/HANDOFF.md:1`, `§9` | Documentation en retard : « APP_VERSION 2.2.7 · forge-v63 » au lieu de 2.14.1 / v112 ; §9 dit « pas de bandeau de mise à jour » alors que la 2.14.0 en a ajouté un. | Mettre à jour l'en-tête et les sections concernées à la fin de la phase 3. | corrigé |
| C4 | mineur | `build.sh:10` (CSP `script-src 'self' 'unsafe-inline'`) | Le code n'utilise aucun gestionnaire en ligne (`onclick=`…). Le script principal pourrait être autorisé par son empreinte, ce qui bloquerait toute injection future, même si un `esc()` était oublié. | CSP avec empreintes `sha256` des deux scripts en ligne, calculées par `build.sh`. | corrigé |
| C5 | mineur | `ascBuildScene` (112 lignes, 12,5 Ko), `ascent_raw` (152 lignes), `suggestForExo` (119 lignes), `moStart` (107 lignes) ; 102 lignes de plus de 200 caractères dans `view_ascent.js`, 77 dans `view_today.js` | Fonctions longues et lignes très denses : relecture difficile. | Pas de refonte gratuite : découper seulement les fonctions que la phase 3 modifie (`moStart`, `normalizeState`). | non fait : aucune fonction découpée, pas de gain concret |

**Vérifié sans problème** :
- **XSS** : HTML injecté dans le prénom, le pourquoi, les noms de séance, les notes, le matériel perso et Mes séances, puis tous les écrans et 10 feuilles ouverts : aucune exécution.
- **Code mort** : 955 fonctions, aucune jamais appelée, aucune définie deux fois. Tous les `data-a` ont leur action.
- **Erreurs** : erreurs globales et promesses rejetées journalisées (`ERR_LOG`) ; un écran qui échoue affiche « Réessayer » sans bloquer l'app.
- **Tests** : 80 suites Playwright couvrent l'app, voir « État des tests ».

### 5. Motivation de l'utilisateur

| # | Gravité | Où | Problème (et pourquoi) | Correction prévue | Statut |
|---|---|---|---|---|---|
| M1 | important | `view_today.js:135-138`, réglage par défaut `todayTab:"custom"` (`core.js:29`) | Première ouverture et tout jour sans séance prévue : l'accueil affiche une carte « Compose ta séance » vide. L'onboarding promet « Une séance prête chaque jour ». Lancer une séance demande 2 touches (« Ou laisse l'app choisir », puis « Commencer ») et un choix à faire. | Quand Ma séance est vide et que rien n'est prévu, afficher directement la séance proposée par l'app (« Commencer » en 1 touche, « Choisir mes exercices » en lien secondaire). Changement de comportement : noté au journal. **À valider (D4).** | corrigé |
| M2 | mineur | `view_ascent.js:718` | « Fais au moins une séance d'ici dimanche pour ne pas redescendre. » : formulation qui met la pression. | Formulation neutre tournée vers le prochain camp. Le mécanisme de descente lui-même est traité dans les Recommandations. | corrigé |
| M3 | mineur | `trophies.js:96-131` | 1re séance, même une seule série de 13 s : 2 à 4 trophées bronze d'un coup (Assiduité, Guerrier du week-end, Lève-tôt…, seuils à 1). Les trophées perdent de la valeur, et une séance d'une série compte pleinement pour la série de semaines et l'ascension. | Rien en phase 3 (règle de jeu) ; voir Recommandations. | non fait (recommandation) |
| M4 | mineur | `view_progress.js:117-127` (carte « Ta force ») | « +127 % depuis tes débuts, en novembre 2025 », mais la courbe est limitée à 26 semaines et commence le 25 mai : les deux repères ne correspondent pas. | Courbe sur toute la période (points regroupés au-delà de 26 semaines), ou date de départ de la courbe dans le texte. | corrigé |
| M5 | mineur | voir U6 et U10 | Repos sauté par erreur et lancement lent : deux frictions au cœur de la séance. | Voir U6 et U10. | corrigé (voir U6 et U10) |

**Vérifié sans problème** :
- **Validation d'une série** : son, coche animée, haptique, « Mieux que la dernière fois », « Record ! ».
- **Progression visible** : force, records, avant/maintenant, calendrier, Rewind.
- **Absence sans culpabilité** : joker mensuel, 2 pauses par trimestre, « Retour en force ».
- **Fin de séance** : complète et gratifiante (tonnage, ascension, trophées, « Garder cette séance ? »).

## État des tests (avant correction)

Batterie complète (80 suites × Chromium et WebKit, audits de mise en page, génération, test du singe) lancée sur le build de référence ; résultats ajoutés ici à la fin de l'exécution.

## Décisions à valider avant la phase 3

- **D1. Accent.** Sombre : jaune `#FFD60A`, texte noir dessus. Clair : vert foncé `#1E7A35` avec texte blanc (lisible), ou vert iOS `#34C759` avec texte noir. Le vert de validation et l'accent seraient alors de la même famille en mode clair : je propose de garder la coche comme marque de « fait ».
- **D2. Trois tailles de texte.** Proposition : titre 28 px, corps 17 px, légende 13 px, plus une exception pour les grands chiffres de séance (chrono, répétitions, repos). Ou alors 34 / 17 / 13 si tu veux garder les grands titres iOS.
- **D3. Marge de 20 px et espacements en multiples de 8.** Tous les écrans bougent légèrement. Je le fais écran par écran, avec captures avant/après.
- **D4. Accueil sans séance prévue** : afficher directement la proposition de l'app (M1) ?

## Plan de la phase 3 (un commit par thème, par gravité)

1. **Données** : D1/C1 (records calculés), D2, D3, D4/C2 (schéma versionné et migrations testées), puis D5 à D10.
2. **UI** : U6 (double touche), U8-U9 (haptique), U7 (textes), U11-U12, U14, U16-U17, puis U1-U5 et U13 (cap design, après tes réponses D1 à D3), U15.
3. **Performance** : U10/P1 (lancement), P2 (valider une série), P3 (dédoublonnage CSS des zones touchées).
4. **Code** : C4 (CSP), C5 (fonctions touchées), C3 (documentation).
5. **Motivation** : M1 (après D4), M2, M4.

Chaque changement de comportement sera noté dans un journal des changements, en fin de ce fichier.

## Recommandations (non prévues en phase 3)

- **Ascension** : une semaine sans séance pourrait geler l'altitude au lieu de faire redescendre d'un camp, avec le même bonus au retour.
- **Trophées** : relever les seuils bronze à 1 des familles « style » (week-end, lève-tôt, midi…), et compter une séance seulement à partir de 3 séries validées.
- **Démarrage** : charger à la demande les modules d'écrans rares (Rewind, bilan image, Mon ascension), comme Three.js aujourd'hui. Gain estimé : 20 à 30 % de code analysé en moins au lancement.

## À tester sur ton iPhone (liste provisoire)

1. Le « tac » sur « Valider la série », et aucun sur la navigation, la fermeture ou la fin du repos.
2. Le réglage « Retour haptique » coupé : plus aucun « tac ».
3. Le clavier ouvert dans « Modifier la séance » et l'onboarding : le bouton du bas reste visible.
4. Les zones de sécurité (encoche, Dynamic Island, barre d'accueil) dans l'app installée, en séance et sur les feuilles.
5. La double touche rapide sur « Valider la série » (après correction).
6. Le contraste du nouvel accent au soleil, en clair et en sombre.
7. Le retour dans l'app après un verrouillage pendant un repos.
8. La sauvegarde vers Fichiers / iCloud et la restauration depuis Fichiers.
9. « Réduire les animations » activé dans Réglages › Accessibilité.
10. Le mode hors ligne (mode Avion) après une mise à jour.
