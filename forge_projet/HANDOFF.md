# Passation du projet ASCEN (anciennement Forge) — pour Claude Code

Tu reprends **ASCEN** (nom affiché depuis la v2.8 ; « Forge » avant), une app web de suivi de musculation pour iPhone, développée pour **Yannick Wahler** (« YaYa ») selon la même méthode que son autre app, **Zeste** (bar à cocktails). Lis ce document avant de toucher au code.

## 1. Le propriétaire et ses exigences

- Yannick parle **français** : réponds et écris l'interface en français.
- Usage **solo sur iPhone (Safari)**. Cible réelle = Safari/WebKit, même si le développement peut se tester sous Chromium.
- **Véracité des informations d'exercice** : toute consigne d'exécution ou de sécurité ajoutée doit s'appuyer sur des repères techniques reconnus (alignement articulaire, dos neutre, amplitude contrôlée...). Ne jamais inventer une consigne dangereuse. En cas de doute, reste conservateur et renvoie vers un professionnel.
- **100% local** : aucun backend, aucun compte, aucun appel réseau. Tout est stocké dans `localStorage` (clé `forge.v1`).
- **Numérotation des versions** : version actuelle **1.4**. Incrémente `APP_VERSION` (`src/init.js`) à chaque livraison notable.
- Copyright affiché dans « À propos » : `© <année> Yannick Wahler. Tous droits réservés.` (constante `COPYRIGHT`, `src/init.js`).
- Cahier des charges d'origine : voir la conversation initiale (résumé ci-dessous, section 6).

## 2. Démarrage rapide

```sh
cd forge_projet
sh build.sh   # assemble dist/forge.html ET copie vers ../index.html (racine du dépôt)
```

Pas de framework, pas de dépendance npm pour l'app elle-même. Pour tester dans un vrai navigateur : ouvrir `index.html` directement (`file://`), ou le servir avec `python3 -m http.server`.

**WebKit (moteur de Safari) est installé depuis la v1.4** (`npx playwright install webkit`, l'hôte `cdn.playwright.dev` a été autorisé dans les réglages réseau de l'environnement). Lancer chaque test dans les deux moteurs : Chromium via `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`, WebKit via `webkit.launch()` avec `hasTouch:true, isMobile:true`. Attendre la disparition de `#splash` avant d'interagir, et ne pas lire `localStorage` juste après une action : l'écriture est différée de 400 ms (appeler `persistNow()` dans le test si besoin).

Pour un smoke test automatisé (Playwright/Chromium déjà installé dans les environnements Claude Code cloud) : ouvrir la page, cliquer sur chaque onglet, démarrer une séance, cocher une série, terminer la séance, vérifier l'absence d'erreurs console (`page.on('pageerror', ...)`).

## 3. Architecture

**Un seul fichier HTML final** (`index.html` à la racine = `forge_projet/dist/forge.html`), HTML + CSS + JS vanilla assemblés par `build.sh`. Ordre de concaténation (important, voir `build.sh`) :

```
style.css
data_equipment.js data_exercises.js
core.js engine.js
ui_shell.js sfx.js fx.js timer.js charts.js trophies.js
view_today.js tpl_editor.js onboarding.js view_history.js view_progress.js view_profil.js
init.js
```

- **`data_equipment.js`** : catalogue du matériel (`EQUIP_TYPES`), poids réellement possédés (`S.equipment.weights`).
- **`data_exercises.js`** : bibliothèque d'exercices (`EXOS`, 124 exercices depuis la v1.3). `isTimed(def)` repère les exercices mesurés en secondes (consigne contenant « en secondes »). Les catégories d'affichage par matériel sont dans `data_equipment.js` (`EXO_CATS`, `exoCategory(e)` : l'équipement principal, le banc n'étant qu'un accessoire). Chaque exercice a un `pattern` (squat/hinge/push/pull/lunge/core/calf), des `muscles`, un `equip` requis, des `cues` et une consigne `safety`.
- **`core.js`** : état global `S` (persisté via `save()`/`load()` dans `localStorage`), utilitaires de date, agrégats d'historique (PR, volume, streaks).
- **`engine.js`** : moteur de suggestion 100% local. `getOrCreateDraft()` génère ou récupère la séance du jour. `generateEngineSession()` fait la rotation des groupes musculaires + progression de charge. `buildExportPrompt()` / `importProgramJSON()` gèrent l'aller-retour avec une IA externe (voir section 5).
- **`ui_shell.js`** : tabbar, sheets/modals, toast, délégation d'actions par `data-a="nom"` → `ACT.nom(dataset, élément)` (clic) et `data-c="nom"` (changement d'un input).
- **Vues** (`view_*.js`) : chacune expose une fonction assignée à `VIEWS.<id>` et ajoute ses handlers à `ACT` via `Object.assign(ACT, {...})`. **Convention importante, comme dans Zeste** : si tu ajoutes un module après un autre, tu peux enrichir `ACT` par `Object.assign`, ou redéfinir une fonction existante (la déclaration la plus tardive gagne, hissage JS). Avant de modifier une fonction, vérifie qu'elle n'est pas redéfinie ailleurs.
- **État** (`S`, voir `core.js: defaultState()`) : `equipment`, `prefs` (exclus/privilégiés), `goals`, `sessions` (historique complet), `draft` (séance du jour, éditable), `custom` (« Ma séance » en cours de composition : `{exos:[{exoId,sets}], name}`), `templates` (modèles enregistrés), `importedProgram` (file d'attente de séances importées), `medals` (`{famille: {t: palier 0-4, d: {palier: date ISO}}}`), `settings` (dont `todayTab` : `custom`/`proposal`, et `name`, le prénom affiché dans le profil), `meta` (dont `prCount`). L'ancien champ `trophies` (v1.0-1.1) est supprimé au chargement.
- **Rendu** : `renderView(id)` régénère tout le HTML de l'onglet actif. `changed()` sauvegarde et redessine, sauf si une sheet est ouverte (elle sera redessinée à la fermeture via `dirtyOnClose`). Les inputs texte (reps/poids) utilisent l'événement `change` (pas `input`) pour ne pas perdre le focus à chaque frappe — ils ne déclenchent qu'un `save()`, pas un `changed()` complet.

### Piège déjà rencontré

- **Dates en heure locale, jamais `toISOString()`** : `toISOString()` convertit en UTC ; en Suisse (UTC+1/+2) un minuit local devient la veille. Avant la v1.2, `weekKey()` renvoyait un dimanche et la boucle des semaines consécutives dérivait d'un jour par semaine, cassant les séries de plus d'une semaine. Toujours passer par `localISO(d)`, `todayISO()`, `addDaysISO()` (`core.js`). Les horodatages complets (`startedAt`, `completedAt`) restent en ISO UTC, c'est voulu.
- **Info-bulles des graphiques** : un point de graphique est focusable (`tabindex`) ; le `focusin` se déclenche avant le `click`. Un clic ne doit donc pas « basculer » la bulle, sinon elle s'ouvre au focus puis se ferme au clic (bug trouvé par test). Un appui sur un point affiche toujours sa bulle, un appui ailleurs la masque.
- **Fermeture différée de `#overlay`** : `closeSheet()` nettoie l'overlay 300 ms plus tard. Depuis la v1.2 un compteur (`overlayGen`) empêche ce nettoyage d'effacer une sheet ou une modale ouverte entre-temps (ex. confirmation → célébration). Toujours passer par `openSheet`/`openModal`.

- **`#restbar` (barre de repos) chevauchant le contenu au scroll** : `#restbar` est positionné en `position:absolute` par rapport au viewport (hors du conteneur scrollable `.view`), donc il reste visuellement fixe pendant que le contenu défile en dessous. Le bouton « Terminer la séance » pouvait se retrouver caché derrière au mauvais moment. Fix appliqué : `padding-bottom` généreux (`180px`) sur `.view` pour garantir qu'on peut toujours faire défiler les boutons au-dessus de la zone occupée par la barre de repos. Si tu ajoutes d'autres éléments fixes en bas d'écran, vérifie ce chevauchement.
- **Sélecteurs ambigus `data-a="closesheet"`** : le `scrim` (fond assombri) ET les boutons de fermeture partagent `data-a="closesheet"`. Si tu écris un test Playwright, cible précisément le bouton (`.sheet-hd [data-a="closesheet"]` ou `.center-modal [data-a="closesheet"]`), sinon le clic peut atterrir sur le scrim et être intercepté par la sheet/modal elle-même.
- **Un seul `#overlay`** : ouvrir une sheet ou une modale remplace le contenu de `#overlay`. Si tu ouvres une modale (ex. avertissements d'import) pendant qu'une sheet est affichée, elle la remplace plutôt que de s'empiler. C'est voulu pour rester simple, mais attention si tu enchaînes plusieurs `openSheet`/`openModal` avec des `setTimeout`.
- **Import d'un programme alors qu'une séance du jour existe déjà** : `getOrCreateDraft()` ne régénère la séance que si aucun brouillon n'existe pour aujourd'hui. `importProgramJSON()` doit donc explicitement remplacer `S.draft` si celui-ci n'a pas encore été démarré (`!S.draft.startedAt`), sinon l'import importé silencieusement ne s'affiche jamais. Ce cas est couvert par un test Playwright dédié — ne pas régresser.
- **`<svg>` sans taille par défaut** : le helper `icon(name)` (`ui_shell.js`) renvoie un `<svg viewBox="0 0 24 24">` sans attribut `width`/`height`. Sans règle CSS qui le contraint, un navigateur lui donne sa taille de remplacement par défaut (300×150 px), ce qui casse le layout et intercepte les clics des éléments voisins (bug réel trouvé par un test Playwright : le bouton « Série validée » débordait sur les steppers au-dessus). Fix : règle globale `svg{width:20px;height:20px;...}` dans `style.css`, que les règles plus spécifiques (`.icon-btn svg`, `.tabbtn svg`, `.chev`, etc.) continuent de surcharger normalement. **Si tu ajoutes un nouvel endroit qui utilise `icon(...)` sans classe englobante déjà stylée, vérifie qu'il hérite bien d'une taille raisonnable** (soit la règle globale, soit une règle dédiée).

## 4. Bibliothèque d'exercices

65 exercices couvrant poids du corps, haltères, barre, kettlebell, élastiques, banc, barre de traction. Chaque fiche a des consignes d'exécution et une note de sécurité rédigées à partir de repères techniques standards et largement consensuels (alignement du dos, amplitude contrôlée, etc.), **pas** de recherche de sources spécifiques par exercice (contrairement à Zeste où chaque recette doit être vérifiée auprès d'une source nommée). Si YaYa demande une vérification plus poussée d'un exercice en particulier (ex. comparaison avec NSCA/ACSM/NASM), traite-la comme pour Zeste : cite la source utilisée.

## 5. Moteur de suggestion et IA externe

- Rotation musculaire par « ancienneté » (`daysSinceTrained`) pondérée par l'objectif (`S.goals.emphasis`), avec forte pénalité si un groupe a été travaillé il y a moins de 2 jours (récupération).
- Progression de charge simple : si toutes les séries de la dernière séance ont atteint le haut de la fourchette de reps avec un ressenti raisonnable (RPE ≤ 7,5), le poids suggéré grimpe au palier suivant possédé (`S.equipment.weights`) ou par défaut (`DEFAULT_INCREMENT`).
- Export/import façon Zeste : `buildExportPrompt()` génère un texte à copier-coller dans une IA externe ; la réponse attendue est un JSON `{ "sessions": [...] }` que l'utilisateur importe via le champ fichier cachpe `#fileImport` (attaché en dur dans le HTML — nécessaire pour que la sélection de fichier fonctionne sur iOS, même piège que dans Zeste).

## 6. Mode focus de la séance en cours (v1.1)

YaYa a demandé, après la v1.0, une expérience proche du « mode barman » de Zeste pour la séance en cours : un exercice à la fois plutôt qu'une longue liste de cartes, moins d'info affichée d'un coup, plus d'animations, et un anneau de repos plus lisible. C'est implémenté dans `view_today.js` :

- **État module-local** `liveFocusIdx` (index de l'exercice affiché) et `focusAnimDir` (`"r"`/`"l"` pour l'animation d'entrée de carte) — volontairement hors de `S` car c'est un état d'affichage éphémère, pas une donnée à persister.
- `renderFocusRegionInner(draft)` régénère les points de progression + la carte + la nav ; `refreshFocusRegion()` ne remplace que `#focusRegion` (et l'eyebrow + la pastille de repos globale) plutôt que toute la vue, pour des interactions rapides sans perdre le scroll.
- La carte (`renderFocusCard`) a 3 états exclusifs pour un même exercice : **repos** (anneau SVG animé, voir `ringSVG`/`updateFocusRing`), **terminé** (badge + récap des séries), **actif** (gros steppers +/- pour reps et charge, plus de saisie clavier). `updateFocusRing()` est appelée à chaque tick par `timer.js` pour animer l'anneau sans tout redessiner.
- Navigation : flèches précédent/suivant, points cliquables en haut, ou la sheet « Voir la séance complète » (`openOverview`) qui liste tous les exercices avec leur progression et permet d'ajouter/remplacer/retirer — l'ajout/retrait/remplacement d'exercice a été déplacé hors de la carte principale pour ne garder que l'essentiel visible pendant l'effort.
- Avance automatique : valider la dernière série d'un exercice fait passer `liveFocusIdx` à l'exercice suivant ; le repos continue en tâche de fond (petite pastille `#restbar` globale) sans bloquer la navigation.
- La fiche détail d'un exercice (`showExoInfo`) a été enrichie : gros pictogramme, consignes numérotées avec animation d'apparition décalée (`.cue-item`, `animation-delay`), encart sécurité mis en évidence (`.safety-box`).
- Motivation : `motivRowHTML()` sur l'écran « avant de commencer » affiche un anneau des séances de la semaine (objectif = `S.goals.daysPerWeek`) et un badge de streak. Fonctions ajoutées dans `core.js` : `sessionsThisWeek()`.

## 7. Séances au choix, statistiques et médailles (v1.2)

Demande de YaYa : pouvoir dire quelle séance on veut faire, séparer la proposition de « notre » séance, retirer « Comment te sens-tu ? », plus de statistiques et de graphiques, des trophées à paliers, plus d'animations.

- **Onglet Aujourd'hui** : contrôle segmenté **Proposée / Ma séance** (`S.settings.todayMode`).
  - *Proposée* : puces de **type de séance** (`SESSION_TYPES` dans `engine.js` : Auto, Corps complet, Haut, Bas, Poussée, Tirage, Bras, Gainage & cardio). `generateEngineSession(type, avoid)` restreint le vivier par muscle principal (`poolForType`). « Auto » choisit selon la récupération (`resolveAutoType`) et l'explique dans `draft.reason`. « Autre proposition » pénalise les exercices de la proposition précédente et ajoute un léger aléa, pour que la proposition change vraiment.
  - *Ma séance* : composition libre (`S.custom`), nombre de séries par exercice, **modèles** réutilisables (`S.templates`), « Partir de la séance proposée », et « Refaire cette séance » depuis l'historique. `buildCustomSession()` calcule charges et répétitions avec le même moteur de progression.
  - Sélecteur d'exercices commun (`openPicker`) : recherche, filtre par muscle, multi-sélection avec bouton en pied de sheet (`openSheet(html,{tall, footer})`).
- **Fin de séance** : plus de question de ressenti. `finishSession` demande confirmation seulement s'il reste des séries non validées ; les exercices sans série validée ne sont pas enregistrés. Célébration : confettis (canvas, `confettiBurst`), XP gagnée, montée de niveau, médailles débloquées.
- **Séance en cours** : rappel « la dernière fois », saisie directe d'une valeur en touchant le nombre (`promptNumber`), report d'une modification de charge/reps sur les séries suivantes, séries record marquées `st.pr` (un record doit battre l'historique **et** les séries déjà validées de la séance, sinon il compterait deux fois). `isNewPR` ne compte plus la toute première séance d'un exercice.
- **Médailles** (`trophies.js`) : 15 familles × 4 paliers (bronze, argent, or, platine), seuils dans `MEDALS[].t`, valeur courante via `val()`. `checkMedals(silent)` est appelé à l'initialisation en mode silencieux (rattrapage après mise à jour) puis à chaque fin de séance. Unité au singulier via `one`.
- **Niveau** (`core.js`) : XP = 50/séance + 2/série + 10/record + points de médailles (10/25/50/100). Niveau L atteint à 125·L·(L−1) XP. Titres de « Apprenti·e » à « Légende de la forge ».
- **Progrès** : sections Vue d'ensemble (niveau, chiffres clés, calendrier de régularité sur 18 semaines, séances et tonnage par semaine avec objectif, répartition musculaire sur 30 jours, derniers records), Exercices (mini-courbes, fiche avec 1RM estimé ou meilleure série, tonnage par séance, dernières séances), Médailles (bilan par palier, prochains paliers, grille).
- **Graphiques** (`charts.js`) : suivi des règles du skill *dataviz* — une seule série par graphique, couleur d'accent, période en cours mise en valeur, étiquettes sélectives, lignes de grille fines, info-bulle au toucher, tableau « Voir les données » sous chaque graphique. Colonnes et calendrier en **HTML** (piège Safari de Zeste : les animations CSS à l'intérieur d'un SVG bouclent quand un parent anime) ; courbes en SVG révélées par un `clip-path` animé sur leur conteneur HTML.
- **Animations** : `renderViewAnimated(id)` ajoute la classe `.enter` le temps d'une entrée d'onglet/de section (apparition décalée des éléments `.stagger`, barres qui poussent, compteurs `data-count` animés par `animateCounts`). Les rendus après une simple action (`changed()`) ne rejouent pas ces animations. Indicateur glissant des contrôles segmentés : `segHTML` + `settleSegs`. Tout est coupé sous `prefers-reduced-motion`.

## 8. Planning, profil et médailles au long cours (v1.3)

Demande de YaYa : trier les exercices par matériel, en ajouter (pectoraux aux haltères notamment), mettre « Ma séance » en premier avec la possibilité de la compléter par l'app, mémoriser des séances et leur assigner des jours pour qu'elles s'affichent à l'ouverture, une animation de lancement, plus d'animations, plus d'infos dans le profil, plus de trophées dont les plus durs demandent des années, et en séance une vue d'ensemble discrète en haut avec navigation par glissement et par appui.

- **Exercices** : +33 exercices (dont 8 pour les pectoraux aux haltères, avec des variantes sans banc : développé et écarté au sol). Sélecteur et réglages « inclus / exclus » groupés par matériel puis par muscle principal, filtre par matériel dans le sélecteur.
- **Ma séance en premier** (`S.settings.todayTab`, défaut `custom`). « ✨ Compléter » / « Laisser l'app choisir » : `suggestComplement(existingIds, n)` (`engine.js`) vise les muscles et mouvements pas encore couverts ; les exercices ajoutés ainsi portent `app:true` (badge ✨).
- **Planning hebdomadaire** : chaque séance enregistrée (`S.templates[]`) a `days` (0 = lundi … 6 = dimanche), un jour ne porte qu'une séance. Bandeau « Mon planning » (touche un jour → `openPlanDaySheet`). À l'initialisation, `applyPlannedSession()` charge la séance du jour dans « Ma séance » (une seule fois par jour : `S.custom.planDate`, pour ne pas écraser des modifications) et l'animation de lancement l'annonce. Une séance faite le jour prévu est marquée `planned` (médaille « Planificateur »). Après un import de programme IA, l'onglet bascule sur « Proposée » où le programme s'affiche.
- **Séance en cours** : barre collante en haut (`liveStripHTML`) — exercices terminés, séries restantes, temps estimé, puces cliquables par exercice avec anneau de progression (`conic-gradient`, en HTML). Glisser la carte d'exercice (événements pointer, `touch-action: pan-y` pour garder le défilement vertical natif) ; après un glissement, `suppressClicksUntil` empêche le clic parasite sur le bouton sous le doigt. Démarrer ou terminer une séance remet la vue en haut (`scrollTodayTop`) — bug trouvé en test : la vue gardait le défilement de l'aperçu et cachait le haut de la carte.
- **Lancement** (`showSplash` dans `init.js`) : marteau, enclume, étincelles, lueur, puis le mot « Forge » ; un appui la passe ; ~2 s, réduite sous `prefers-reduced-motion`. Les tests Playwright doivent attendre `#splash` détaché avant d'interagir.
- **Profil** : carte d'identité (prénom modifiable, niveau, ancienneté), bilan des médailles par palier, « Mes habitudes » (exercice favori, jour et moment préférés, durée moyenne, meilleure semaine…), « Mes records » (5 charges les plus lourdes). Fonctions dans `core.js` (`favoriteExercise`, `favoriteWeekday`, `favoriteMoment`, `bestWeek`, `topLifts`).
- **Médailles** : 24 familles en 5 catégories (`MEDAL_CATS`). Les platines visent plusieurs années (500 séances, 104 semaines d'affilée, 5 « années de fer » à 48 semaines actives, 1,5 million de kg…). Vérifié sur 10 semaines de données simulées régulières : aucun or ni platine. « Deux fois plus fort » compare au meilleur des 3 premières séances d'un exercice pratiqué depuis 90 jours au moins (sinon une progression de débutant donnait le platine en quelques semaines). Les paliers déjà obtenus sous d'anciens seuils sont conservés (`checkMedals` ne fait que monter).

## 9. Pictogrammes, couleurs, séances enregistrées, optimisation (v1.4)

- **Pictogrammes** (`data_pictos.js`) : 19 silhouettes au trait (squat, fente, soulevé de terre, développé couché, écarté, pompe, dips, développé militaire, élévations, rowing, traction, curl, triceps, pont, gainage, crunch, mollets, cardio, port de charges), attribuées à chaque exercice par `PICTO_OF` (tous les 124 exercices ont une entrée ; vérifié par script). `exoIcon(def, taille)` rend la tuile ; tailles `xs/sm/(défaut)/lg/xl`. Les emojis de flèches ont disparu.
- **Code couleur par zone** (`REGIONS`, `regionOf(def)` d'après le muscle principal) : poussée = magenta, tirage = bleu, jambes = vert, gainage & cardio = jaune (**remplacé en v1.5**, voir §9 bis). Teintes tirées de la palette documentée du skill *dataviz* et validées avec son script (`validate_palette.js --pairs all`, clair et sombre) : toutes les vérifications passent ; la séparation daltonisme (ΔE 6,9) est dans la zone tolérée **à condition d'un encodage secondaire** — la couleur est donc toujours accompagnée du pictogramme et/ou du libellé. Le trait du pictogramme est foncé sur le magenta et le jaune clairs (contraste insuffisant avec le blanc), blanc ailleurs (`--r-*-ink`). L'orange reste réservé aux actions et le rouge au danger. Les variables CSS : `--r-push`, `--r-pull`, `--r-legs`, `--r-core` (+ `-ink`), activées par les classes `.r-push` … qui posent `--rc`/`--ri`. **Piège rencontré** : une valeur par défaut `--rc` posée sur `.xico` (même spécificité, déclarée après) écrasait les classes de zone ; les défauts passent désormais par `var(--rc, var(--tint))`.
- **Bouton « i »** partout : lignes de « Ma séance » et de la proposition, cartes de séances enregistrées, sélecteur (la fiche ouverte depuis le sélecteur a un bouton « Retour à la liste » qui conserve la recherche, les filtres et la sélection : `renderPickerSheet()`), carte de la séance en cours (`.fc-info`). Fiche enrichie : zone, matériel, faits clés (séries × reps, repos, unilatéral), exercices du même muscle principal avec « Remplacer » (en séance) ou « + Ajouter ».
- **Séances enregistrées** : liste verticale de cartes repliables (`openTpls`), 3 visibles puis « Afficher les N autres » (`showAllTpls`), sections « Mon planning » et « Mes séances enregistrées » repliables (état mémorisé dans `S.settings.ui`). Chaque carte : barre de la couleur de zone dominante, jours, mini-pictos ; dépliée : exercices, « Commencer » (démarre directement, `startTemplate`), « Modifier », menu (jours et nom, dupliquer, supprimer). « Ma séance » : mode « Réorganiser » (↑/↓), barre d'équilibre par zone avec légende.
- **Planning** : jours colorés par la zone de la séance prévue, pastille rouge pour une séance prévue non faite plus tôt dans la semaine, résumé « Prochaine : jeu. · Jambes », bandeau du jour avec bouton ▶ pour démarrer, et depuis un jour vide « Composer une nouvelle séance pour le … » (le jour est pré-coché à l'enregistrement : `S.custom.pendingDays`).
- **Optimisation**, mesurée sur 3 ans simulés (470 séances), processeur ralenti ×4 : Historique 64 → 6 ms (affichage par paquets de 25, `histLimit`), Médailles 75 → 4 ms, Profil 19 → 6 ms, appui sur +/− 59 → 0 ms (85 → 12 ms avec rendu). Moyens : `memo(clé, fn)` invalidé par `DATA_VER` à chaque `save()` (statistiques, records, valeurs des médailles), écriture `localStorage` différée (`persistNow()` forcé sur `pagehide`/`visibilitychange` ; `persistBlocked` pendant la réinitialisation), séances terminées compactées (`compactSession` : −20 % de stockage). **Règle** : toute modification de `S.sessions` doit passer par `save()`, sinon le cache sert des valeurs périmées.

## 9 bis. Accueil, animations et orange (v1.5)

- **Couleurs** : le rose disparaît. Poussée = orange (`#eb6834` clair / `#d95926` sombre), tirage = bleu, jambes = vert d'eau (`#1baf7a`, trait foncé `#06291c` en clair car le blanc n'y contraste qu'à 2,7), gainage & cardio = graphite neutre. Orange/bleu/vert d'eau validés par `validate_palette.js --pairs all` (clair et sombre). Dégradé d'accent « orange cosmique » `--grad` et halo `--glow` pour les éléments héros.
- **Accueil** (`renderTodayPreview`) : salutation selon l'heure et le prénom, 3 pastilles compactes (objectif de la semaine en anneau, semaines d'affilée, niveau avec barre d'XP ; compteurs animés), puis la **carte « action du jour »** (`heroHTML`) dont le contenu suit une priorité : séance faite aujourd'hui (carte verte → détail) > séance planifiée du jour (`startTemplate`) > « Ma séance » prête (`startCustom`) > proposition de l'app (`startSession`). Pictos blancs, gros bouton « C'est parti », reflet animé limité à 3 passages. En dessous, séparateur « Préparer une séance » et les deux volets ; « Ma séance » affiche d'abord le constructeur (état vide compact), puis les séances enregistrées, puis le planning. L'ancienne ligne de motivation, la carte « séance faite » et le bandeau du jour sont absorbés par la carte héros. Quand la carte héros montre déjà la proposition, le volet « Proposée » n'en répète que la raison.
- **`fx.js`** (nouveau, après `ui_shell.js`) : onde au toucher sur les boutons (`RIPPLE_SEL`), `floatText()` (« ✓ Série n », « 💥 Record ! » à la validation), `morphHeight(el, mutate)` et `animateCollapse(el, ouvert, html)` pour déplier/replier **sans re-rendu complet** (cartes de séances enregistrées, sections repliables, « Afficher les N autres » : les corps vivent dans un `.clp`), `showLaunch(séance)` : écran de lancement plein écran (décompte 3-2-1, ondes, gerbe d'étincelles, « C'est parti ! », nom, pictos qui arrivent, phrase de motivation, vibrations), ≈ 3 s, touche pour passer, variante courte si « réduire les animations ». Appelé par `startSession` et `startCustom` (donc aussi `startTemplate`). **Tests** : attendre `#launch` détaché après un démarrage.
- **Divers** : chevrons corrigés (le tracé était dessiné pour 8×13 dans une boîte 24×24, d'où des chevrons minuscules), toast en haut en pilule qui tombe, glissement directionnel entre onglets (`TAB_ORDER`, `data-dir`) et entre volets (`paneDir`), bouton « i » en badge sur l'icône de l'exercice (libère la place du nom), rebond de la pastille du bandeau de séance après une série validée (`stripBump`).

## 9 ter. Séance en cours repensée, simplification (v1.6)

- **En-tête de séance** (`liveHeadHTML`) : chronomètre qui tourne (`#liveClock`, mis à jour une fois par seconde par un `setInterval` global), pourcentage de séries faites, « N séries à faire », barre segmentée par exercice (largeur = nombre de séries, segment courant cerclé, vert quand fini). La barre de navigation porte « ✕ » (abandonner) et « Terminer » ; le grand titre et le bouton du bas ont disparu.
- **Bandeau** : les exercices finis se réduisent à une pastille verte cochée, ceux à faire gardent leur nom ; l'exercice courant est en dégradé orange. On comprend d'un coup d'œil ce qui reste.
- **Enchaînement** : `nextUndone(from)` donne le prochain exercice non terminé (en bouclant). Quand un exercice est fini, on saute à celui-là (pas simplement au suivant) et le repos s'affiche directement sur sa carte. Carte « À suivre » sous la carte focus (touche → saut), « Dernier exercice » quand il n'en reste qu'un, bouton « Exercice suivant : X » sur un exercice terminé. Navigation « 2 sur 6 · Tout voir ». Quand tout est validé : carte **« Séance complète ! »** (trophée, rayons tournants, confettis une seule fois via `completeShown`, stats, « Enregistrer la séance »).
- **Vue d'ensemble** : groupée en « À faire » / « Terminés » avec anneaux de progression. Menu « ••• » de la carte (fiche, remplacer, ajouter une série, retirer) : remplace les liens « Remplacer / Retirer ».
- **Animations en séance** : chiffre qui défile vers le haut/bas sur +/− (`valRoll`), anneau de repos qui « respire » et bat pendant les 3 dernières secondes avec vibration (`timer.js`), bouton « Valider » qui pulse et brille quand le repos se termine (`restReady`), badge vert qui tourne à la fin d'un exercice, texte « 🔥 Exercice terminé ! ».
- **Simplification** : puces de type sans emoji (sélection en noir/blanc, façon iOS), eyebrows sans emoji, icônes secondaires des lignes en gris (l'orange est réservé à l'action principale), « Mes habitudes » limitées à 4 lignes avec « Plus / Moins » animé, indice de glissement affiché seulement au tout début.
- **Tests** : `v16.js` (séance en cours de bout en bout) ; les sélecteurs `.ls-sum`, `#todayEyebrow` et `h1.lt` (en séance) n'existent plus.

## 9 quater. Sons, exercices et cohérence (v1.7)

- **Sons** (`sfx.js`, avant `fx.js`) : tout est synthétisé avec Web Audio (aucun fichier), notes de la gamme de do majeur pour que les sons s'accordent. `sfx(nom)` : `tick`, `seg` (puces, segments, onglets, bandeau — branché par une délégation de clic globale), `step` (+/−, montant ou descendant), `open`/`close` (dépliage), `swipe`, `set` (série validée), `exo` (exercice terminé), `pr` (record), `complete` (séance complète), `medal`, `count`/`go` (lancement), `restTick` (3 dernières secondes)/`restEnd`, `remove`. Niveaux vérifiés par rendu hors ligne (`OfflineAudioContext`) : clics ≈ 0,05 de crête, événements 0,16–0,3, aucune saturation (compresseur en sortie). Le contexte audio est créé et déverrouillé au premier geste (règle iOS) ; réglage **Profil › Réglages › Sons** (`S.settings.sound`, activé par défaut).
- **Exercices** : 26 ajouts (124 au total), tous avec consignes, sécurité et pictogramme : pompes archer, planche commando, russian twist, ciseaux, montées de genoux, fentes sautées, Y-T-W, marche de l'ours, rowing appui banc, squat bulgare haltères, curl Zottman, mollets assis, bûcheron, front squat, fente arrière barre, shrugs barre, good morning, halo, fente goblet KB, swing à une main, tirage vertical élastique, Pallof press, soulevé élastique, kickback fessier, tractions négatives, relevé de jambes tendues suspendu.
- **Cohérence visuelle** : une seule action principale orange par écran (les boutons « Commencer » du bas deviennent secondaires quand la carte du jour propose déjà la même séance), sélection des filtres en noir/blanc partout (types de séance, matériel, muscles), bouton fermer des feuilles en rond gris façon iOS, muscles de la fiche neutres (principal en gras), boutons « i » gris, pastille de fin de séance en dégradé. Historique : plus de « 0 kg » ni « 0 records » pour les séances au poids du corps (répétitions à la place).
- **Animations** : en séance, la barre de progression et le pourcentage partent de l'ancienne valeur (le segment qui avance brille, le % compte), puces qui rebondissent à l'appui, lignes qui s'éclairent au toucher.
- **Tests** : `v17.js` (sons sans erreur, contexte audio actif, nouveaux exercices, réglage Sons, progression animée) ; `sndcheck.js` rend chaque son hors ligne et affiche crête/RMS/durée.

## 9 quinquies. Clics feutrés, petits écrans, débogage (v1.8)

- **Clics de l'interface refaits** : les « bips » (ondes triangulaires aiguës) sont remplacés par un « toc » feutré façon clavier iOS (`tok()` : souffle filtré de 14 ms + corps grave de 45 ms, hauteur légèrement variable pour ne pas lasser). Ils ne sonnent plus que lorsqu'on **change une sélection** (segment, type, filtre, interrupteur, jours) et sur +/− ; plus rien sur les onglets, le bandeau ou la navigation. Anti-rafale 60 ms. Nouveau réglage **Clics de l'interface** (`S.settings.uiSound`), indépendant de **Sons** (séries, records, repos, lancement) ; il se grise quand les sons sont coupés.
- **Audit automatique** (`audit.js`, paramètres `W`, `DARK`, `ENGINE`) : parcourt ~35 écrans et feuilles avec des données « pires cas » (noms longs, 124 exercices, matériel complet) et signale débordements hors écran, textes coupés sans points de suspension, cibles tactiles < 28 px, erreurs. Passé à 320, 375, 390 et 430 px, clair et sombre, Chromium et WebKit.
- **Corrigé grâce à l'audit et aux captures 320 px** : steppers « Répétitions / Charge » qui dépassaient de la carte, titre de la barre de navigation qui passait sous « ✕ » et « Terminer », pastilles de l'accueil tronquées (désormais icône / valeur / libellé en colonne), salutation trop grande avec un prénom long, titre de « Ma séance » écrasé par « Réorganiser / Vider » (remplacés par **Modifier** → « Vider » + « OK », façon iOS), segment « Vue d'ensemble » sur deux lignes (→ « Résumé »), « Exercice favori » tronqué (le nom passe en sous-titre), dates longues de l'historique (→ « ven. 25 sept. »), noms coupés dans l'aperçu de séance (deux lignes), icônes 📋 du planning remplacées par le picto et la couleur de la séance, bouton « Composer une nouvelle séance… » sur deux lignes, zones tactiles des liens texte agrandies à 44 px.
- **Séance** : les textes flottants partent des points de série et sont posés sur une pastille lisible ; le toast « Nouveau record » (doublon du texte flottant) est supprimé ; quand tout est validé, plus aucun exercice n'apparaît « en cours » dans le bandeau.

## 9 sexies. Plusieurs séances perso et programme de la semaine (v1.9)

- **Éditeur de séances enregistrées** (`tpl_editor.js`, après `view_today.js`) : une feuille dédiée « Nouvelle séance / Modifier la séance » (Annuler · titre · « Enregistrer la séance » en pied) avec nom, jours de la semaine (les jours déjà pris affichent le nom de la séance qui les occupe et un avertissement de remplacement), exercices (séries +/−, retirer, « Ordre » ↑/↓), « Ajouter » (sélecteur avec bouton « Retour » vers l'éditeur : option `onCancel` de `openPicker`) et « ✨ Compléter ». État `tplEdit` ; « Annuler » avec des changements propose « Abandonner / Continuer l'édition ». Indépendant de « Ma séance » : on crée autant de séances qu'on veut sans toucher au constructeur. *(v3.2 : la création passe désormais uniquement par Ma séance, voir § 9 novodecies.)* Points d'entrée d'origine : bouton **+** dans l'en-tête « Mes séances », rangée « Nouvelle séance / Programme de la semaine » sous la liste, état vide dédié, « Modifier » des cartes et du menu •••, jour vide du planning (« Nouvelle séance pour le … », jour pré-coché), feuille d'un jour planifié (carte « Prévu le … » + Modifier), et « Enregistrer » de Ma séance (éditeur pré-rempli, `fromCustom`). L'ancien `openTemplateModal`/`saveTemplateOk` est supprimé.
- **Programme de la semaine** (`openWeekWizard`, `WEEK_SPLITS`) : choisir 2 à 6 jours → répartition (2-3 : corps complet A/B/C ; 4 : haut/bas ×2 ; 5 : poussée, tirage, jambes, haut, bas ; 6 : PPL ×2), aperçu jour par jour, puis création des séances par le moteur (`generateEngineSession(type, déjà_utilisés)` pour varier A/B) et placement dans la semaine ; les séances qui occupaient ces jours sont gardées mais libérées. Met aussi à jour l'objectif de jours par semaine.
- **Planning** : `since` (date de planification) sur chaque séance ; un jour passé n'est marqué « manqué » que si la séance y était déjà prévue (un programme créé en milieu de semaine ne produit plus de fausses pastilles rouges). Carte du jour : ligne « Ensuite le lundi · Haut du corps A » (`nextPlannedLine`).
- **Tests** : `v19.js` (création de plusieurs séances, jours en conflit, annulation, retour du sélecteur, modification, programme 4 jours, jour planifié, enregistrement de Ma séance) ; `v12`/`v13`/`v14` adaptés au nouvel éditeur.

## 9 septies. Version 2.0

- **Historique** : carte « 12 dernières semaines » en tête (`histChartHTML`, segment Séances / Durée / Séries → `histMetric`, mise à jour partielle `#histChart` avec barres qui repoussent), valeur de la semaine, écart avec la semaine passée, moyenne.
- **Trophées** : l'onglet « Médailles » devient **Trophées** ; la phrase « points de médailles… paliers platine » est retirée ; 7 trophées ajoutés (31 au total) : Guerrier du week-end, Pause de midi, Retour gagnant (reprises après ≥ 14 jours), Gainage d'acier (minutes sur les exercices en secondes), Poids du corps (répétitions), Jamais sans les jambes, Architecte (séances enregistrées).
- **Navigation en boucle** en séance (glisser, flèches) : après le dernier exercice on revient au premier, et inversement.
- **Enchaînement** (`S.settings.flow`, défaut « circuit ») : à la fin du repos (décompte ou « Passer »), `endRest()` → `restAdvance()` amène l'exercice suivant qui reste à faire ; la carte de repos annonce « Ensuite : <exercice> ». Mode classique (toutes les séries d'un exercice d'abord) dans le menu ••• de la carte. `restState.arrived` : quand un exercice vient de se terminer, le repos s'affiche déjà sur le suivant et n'avance pas une seconde fois.
- **Chronomètre des exercices en secondes** (`hold`, `holdCardHTML`) : « Lancer le chrono », 3-2-1, décompte avec anneau, bips des 3 dernières secondes, **validation automatique** à zéro (mains libres), « Arrêter et valider » enregistre le temps réellement tenu ; « Valider sans chrono » reste possible.
- **Fin de séance** : le constructeur « Ma séance » est vidé ; si la séance ne correspond à aucune séance enregistrée, la célébration propose « Enregistrer cette séance » (éditeur pré-rempli).
- **Son** : `navigator.audioSession.type = "ambient"` (les sons se mélangent à la musique au lieu d'être coupés), contexte relancé au retour dans l'app et à chaque geste, recréé s'il reste bloqué (« interrupted » sur iOS), sons joués après relance au lieu d'être perdus.
- **Profil façon iOS** : `sfIcon(glyphe, couleur)` + `GLYPHS` (ui_shell.js) — glyphes blancs sur pastilles aux couleurs système iOS, aussi pour le matériel, les catégories d'exercices et le sélecteur.
- **Performances** (3 ans simulés, CPU ×4, `perf2.js`) : changement d'onglet médiane ≈ 78 → 27 ms, pire cas ≈ 270 → 82 ms ; trophées à froid ≈ 60 → 37 ms. Moyens : onglets masqués en `content-visibility:hidden` (mise en page gardée en cache) au lieu de `display:none`, rendu réutilisé si les données n'ont pas changé (`el._ver === DATA_VER`), `content-visibility:auto` sur les blocs hors écran, `contain:layout style` sur les cartes, caches de `weekKey`, `regionOf`, `isTimed`, `loadableTypeOf`, tuiles d'exercice, trophées réécrits en une passe, séances triées au chargement, pastille de repos mise à jour sans reconstruire son HTML, écran de démarrage 2 → 1,5 s.
- **Animations** : plus aucune animation de `box-shadow` (pulsations du bouton de lancement et de « Valider », segment de progression, carte mise en avant → `transform`/`opacity` sur pseudo-éléments), flou retiré des étiquettes de la carte du jour ; ajouts : grand titre qui se replie au défilement façon iOS, feuilles avec léger ressort, interrupteurs à ressort, retour tactile sur lignes, onglets, trophées et icônes.
- **Tests** : `v20.js` (tout ce qui précède), `perf2.js`/`perf3.js`/`prof.js` (mesures).

## 9 octies. Audit v2.1 : fiabilité, progression, installation

Audit complet de l'app ; améliorations classées par impact, sources vérifiées :
- ACSM, *Progression models in resistance training* (2009) et mise à jour 2026 : +2 à 10 % de charge quand on dépasse la fourchette de répétitions ; ~10 séries par muscle et par semaine pour l'hypertrophie ; chaque groupe ≥ 2 fois par semaine ; bandes, poids du corps et entraînement à domicile efficaces ; l'adhésion prime.
- Helms/Zourdos (2016) : échelle RPE fondée sur les répétitions en réserve (RIR).
- Schoenfeld et al. (2017) : relation dose-réponse volume/hypertrophie. Singer et al. (2024) : repos > 60–90 s, bénéfice faible au-delà.
- Lally et al. (2010) : ~66 jours (18–254) d'automatisation ; rater une occasion ne compromet pas l'habitude → série hebdomadaire (pas quotidienne), pas de culpabilisation.
- WebKit, *Tracking Prevention* : stockage des sites effacé après 7 jours sans visite dans Safari, sauf app installée sur l'écran d'accueil.
- web.dev : Screen Wake Lock disponible dans Safari iOS 16.4+ (et en app installée depuis iOS 18.4).
- Apple HIG : cibles ≥ 44 pt, contraste ≥ 4,5:1, Dynamic Type.

Changements :
- **Moteur de progression** (`suggestForExo`, engine.js) : vraie double progression (on repart des répétitions réellement faites, +1 par série ; au-delà du haut de fourchette → charge suivante et retour en bas), modulée par le ressenti (`set.effort` : 1 = 3+ en réserve, 2 = 1–2, 3 = 0) ; charge maximale atteinte → répétitions supplémentaires ou tempo au lieu d'une fausse « augmentation » ; deux échecs (ou échec « à fond ») → charge allégée d'un cran ; reprise après ≥ 21 jours → un cran plus léger ; poids du corps +1 rep, exercices en secondes +5 s ; variante plus difficile quand l'exercice est maîtrisé (`HARDER`, bouton « Essayer maintenant », `swapHarder`). Avant : les séries étaient toujours pré-remplies au milieu de la fourchette et le RPE n'était jamais saisi.
- **Ressenti facultatif** pendant le repos (répétitions en réserve : 0 / 1–2 / 3+ ; pour les exercices en secondes : à fond / encore un peu / large marge), conservé par `compactSession`.
- **Données** : sauvegarde complète (`backupData`, feuille de partage iOS ou téléchargement), restauration avec copie de secours (`restoreData`, `normalizeState`), rappel discret de sauvegarde à l'accueil (`backupDue`, « Plus tard » = 14 jours), `navigator.storage.persist()`, données illisibles mises de côté au lieu d'être écrasées, avertissement si l'enregistrement échoue.
- **Installation / hors ligne** (racine du dépôt) : `manifest.webmanifest`, icônes (`icon-180/192/512`, `icon-maskable-512`), `sw.js` (réseau d'abord, cache hors ligne ; enregistré seulement en https hors aperçu), feuille « Installer sur l'écran d'accueil ». `build.sh` recopie ces fichiers dans `dist/`.
- **Écran allumé** pendant la séance (`keepAwake`/`syncWakeLock`, fx.js).
- **Premier lancement** (`onboarding.js`) : prénom, matériel (avec saisie des haltères, virgule décimale gérée par `parseWeightList`), objectif, séances par semaine, durée, puis création du programme de la semaine. Montré une seule fois, « Passer » à tout moment.
- **Volume par muscle** (Progrès › Résumé, `weekVolume`) : séries des 7 derniers jours (principal = 1, secondaires = ½), repère ≈ 10 (6 en force), fréquence « × ».
- ~~**Planning → Calendrier** (`buildICS`)~~ : retiré en v3.2.
- **Échauffement** conseillé avant la première série chargée ; message « Bon retour ! » après ≥ 10 jours ; point « séance manquée » en orange (informatif, pas culpabilisant).
- **Accessibilité** : Dynamic Type (`font: -apple-system-body`), textes secondaires plus contrastés, onglets inactifs en gris système, boutons qui passent à la ligne quand le texte est grand.
- **Tests** : `v21.js` (11 scénarios du moteur, ressenti, variante, écran allumé simulé, volume, sauvegarde/restauration, calendrier, grand texte), `v22.js` (premier lancement) ; les autres tests passent l'accueil via `ACT.obSkip()`.

## 9 nonies. Version 2.2 : matériel, niveau, taille des séances, suivi long terme

- **Matériel étendu** (`data_equipment.js`) : banc plat / banc inclinable / banc de développé couché, rack (supports de squat), barres parallèles, sangles de suspension, roue abdominale, corde à sauter. `EQUIP_IMPLIES` : un banc inclinable ou de développé couché compte comme banc plat. `hasEquip` accepte des alternatives (`"rack|bench_press"`).
- **Sécurité des exercices à la barre** : squat, front squat, fente et good morning à la barre demandent un rack. Le développé couché à la barre demande un rack ou un banc de développé couché. Les exercices inclinés demandent un banc inclinable.
- **13 nouveaux exercices** (137 au total) : roue abdominale (genoux/debout), dips, relevés de genoux, L-sit, 5 exercices aux sangles, rowing inversé à la barre, tractions scapulaires, corde à sauter.
- **Niveau** (`S.goals.level`, `EXO_LEVEL1`/`EXO_LEVEL3`) : un·e débutant·e ne reçoit pas d'exercices de niveau 3 (repli sur tout le catalogue si le choix devient trop maigre), et le score favorise les exercices adaptés au niveau.
- **Nombre d'exercices** (`S.goals.exoCount`, `sessionSize()`) : 0 = automatique selon la durée. Réglable dans Objectifs et directement sur la séance proposée (stepper « − n + »). Une séance non commencée est regénérée quand le matériel, le niveau ou la durée changent (`regenerateDraftIfIdle`).
- **Variété** (`exoFamily`) : deux variantes du même mouvement (ex. deux pompes) sont pénalisées dans une même séance. Sur 11 520 séances simulées, les doublons de famille passent de 42 % à 30 % ; ceux qui restent viennent de petits choix de matériel.
- **Élastiques = niveaux de résistance** (1 à 5, `bandLabel`) et non plus des kg. Ils sont exclus du tonnage et des trophées de force. Affichage via `fmtLoad`/`loadSuffix`. Migration : les anciennes valeurs en kg sont converties par rang, historique compris.
- **Suivi long terme** :
  - note facultative par séance (fin de séance repliée derrière « Ajouter une note », éditable dans le détail de l'historique, visible dans la liste) ;
  - poids du corps (Profil › Poids du corps, `S.body`) : une pesée par jour au plus, courbe sur 12 mois, tendance calculée sur des moyennes de 14 jours, sans jugement ;
  - écart de séances avec le mois précédent dans l'historique.
- **Corrections** :
  - `sessionReps` ne compte plus les secondes des exercices chronométrés ;
  - accords au singulier/pluriel (`nb()`) ;
  - moyenne hebdomadaire à une décimale (« 0,3 séance » au lieu de « 0 séance ») ;
  - champs de charge en `type="text" inputmode="decimal"` (virgule acceptée), Entrée pour valider ;
  - bouton « Ajouter » qui débordait de la feuille Matériel ;
  - élastiques par défaut [2,3,4] dès la création.
- **Tests** :
  - `v23.js` : migration, écart mensuel, note, poids du corps, niveau et taille, note de fin de séance ;
  - `gen_audit.js` : 8 configurations de matériel × 3 niveaux × 3 tailles × 8 types × 20 tirages ; vérifie matériel, niveau, doublons, élastiques, NaN.

## 9 decies. Version 2.3 : édition, objectifs, bilan, tests versionnés

- **Modifier une séance enregistrée** (Historique › séance › Modifier, `histEdit` dans `view_history.js`).
  - On peut changer la date, la durée, les répétitions ou secondes et la charge de chaque série (le niveau pour un élastique). On peut aussi ajouter ou retirer une série ou un exercice.
  - Tout se fait sur une copie : « Annuler » ne change rien.
  - À l'enregistrement, les séances sont triées à nouveau et `recomputePRFlags()` (`core.js`) recalcule les records avec la même règle qu'en direct. `S.meta.prCount` est ajusté de l'écart.
  - Les paliers de trophées atteints grâce à la correction sont notés sans célébration (`checkMedals(true)`).
- **Objectifs chiffrés** (Progrès › Résumé, `S.targets`, `view_progress.js`).
  - Trois types : répétitions sur une série, charge sur une série, secondes pour un exercice chronométré.
  - La valeur proposée est un peu au-dessus du record. `bestOf()` est mis en cache par `memo`.
  - 6 objectifs actifs au maximum. Un objectif atteint (`checkTargets()` en fin de séance et après une modification) est célébré, puis reste visible. Le relever le rouvre.
- **Bilan en image** (`recap.js`, nouveau fichier ajouté à `build.sh`).
  - Image canvas 1080 × 1350, par mois ou par année : séances et écart avec la période précédente, temps, séries, tonnage, records, activité par jour ou par mois, exercice favori, objectifs atteints, meilleure série de semaines, trophées débloqués.
  - Accessible depuis l'Historique. Suggéré discrètement sur l'accueil pendant la première semaine d'un nouveau mois, si le mois précédent compte au moins 2 séances (`S.meta.recapSeen`).
  - Partage par le menu d'iOS (`navigator.share`), sinon téléchargement.
- **Cibles tactiles** : les liens d'en-tête (« Modifier », « Plus ») et les ronds de sélection du sélecteur d'exercices font 44 pt, avec des marges négatives pour ne pas changer la mise en page.
- **Tests versionnés** (`tests/`) :
  - `sh tests/run.sh` reconstruit l'app puis lance les suites dans Chromium et WebKit, l'audit de mise en page (320, 390, 430 px et mode sombre), l'audit de génération, le test hors ligne et la mesure de performance ;
  - `tests/README.md` décrit chaque fichier ;
  - `v24.js` couvre la v2.3.

## 9 undecies. Version 2.4 : trophées en relief, secrets, glisser pour fermer

- **Médailles en SVG** (`medalSVG`, `trophies.js`).
  - Chaque médaille est faite de plusieurs couches :
    - une couronne de métal (dégradé bronze, argent, or ou platine ; irisé pour les secrets ; étain pour un trophée non débloqué) ;
    - un biseau éclairé à l'inverse, pour le relief ;
    - un émail coloré propre à chaque trophée (`c`) ;
    - une icône gravée (`g`, glyphe de `GLYPHS` ou texte court comme « 100 »), avec une ombre portée ;
    - un reflet brillant, et un éclat animé pour l'or, le platine et les secrets.
  - La forme dépend de la famille : rond (régularité), écu (force), hexagone (volume), octogone (découverte), rosace (style), pierre taillée (secrets).
  - Les dégradés et masques sont définis une seule fois (`ensureMedalDefs`, `#medal-defs`).
  - Dans la fiche, la grande médaille flotte en 3D et se penche sous le doigt, avec un reflet qui suit (`bindMedalTilt`).
  - La carte « séance terminée » utilise une coupe en or du même style.
  - Il ne reste plus d'emoji dans les trophées (le champ `em` n'est plus affiché).
- **10 trophées secrets** (`secret:true`, un seul palier, `SECRETS`) : 1er janvier, anniversaire de la première séance, vendredi 13, séance d'une heure pile, reprise après 60 jours, les 7 jours de la semaine, 4 saisons dans l'année, 3 records dans une séance, 10 séances annotées, 3 objectifs atteints.
  - Tant qu'ils ne sont pas découverts, ils s'affichent en « ??? » avec un cadenas et un indice.
  - Chacun vaut 50 XP. Ils sont exclus des compteurs de paliers.
- **Glisser vers le bas pour fermer** toutes les feuilles (`ui_shell.js`).
  - Le geste part de la poignée ou de l'en-tête, ou du contenu quand il est tout en haut.
  - Un petit geste lent laisse la feuille en place.
  - Un éditeur de séance modifié demande confirmation (`sheetDismissGuard`). Le fond (`dismisssheet`) suit la même règle.
- **Icônes dessinées** à la place des emojis : planning, « Compose ta séance », états vides, drapeau « dernier exercice », boutons ✨ (icône `sparkle`), derniers records.
- **Sélecteur d'exercices** : chaque ligne affiche la dose conseillée selon l'objectif (« 3 × 8–12 reps » ou « 3 × 20–45 s », `exoDose`).
- **Tests** : `v25.js`.

## 9 duodecies. Version 2.5 : Rewind animé, stockage, démarrage hors ligne, interactions

- **Démarrage hors ligne fiable** (`sw.js`, cache `forge-v2`).
  - La page s'ouvre depuis la copie locale, sans attendre le réseau, et la nouvelle version se télécharge en arrière-plan.
  - Un message discret (`forge-updated`) annonce qu'elle s'appliquera au prochain lancement.
  - Avant, le réseau passait d'abord : un signal faible pouvait bloquer l'ouverture.
- **Stockage** (`core.js`).
  - L'historique est enregistré sous une forme compacte (`packSession`/`unpackSession`, `fmt:2`, clé `zs`) : environ 2,5 fois plus léger, par exemple 244 Ko → 95 Ko pour 230 séances.
  - En mémoire et dans les sauvegardes .json, les séances restent lisibles. Une liste `sessions` non vide (import externe) reste prioritaire.
  - Chaque enregistrement est aussi copié dans IndexedDB (`idbMirror`, `S.meta.savedAt`). Au lancement, `idbRecover()` reprend cette copie si localStorage est vide ou plus ancien, par exemple après un refus faute de place.
  - « Tout effacer » vide aussi IndexedDB.
  - Profil › Espace de stockage : place utilisée, estimation des années restantes, état de la protection.
- **Emojis** : il n'en reste plus nulle part.
  - Icônes de trait en ligne (`ii()`), avec un paramètre icône pour `toast(msg, ic)` et `floatText(..., ic)`.
  - Dans l'image du bilan, les glyphes sont dessinés au canvas (`drawGlyph`, Path2D).
  - Les champs `em` inutilisés ont été supprimés.
- **Graphiques parcourables au doigt** (`charts.js`).
  - Glisser horizontalement sur une courbe ou des colonnes fait suivre la bulle, avec un curseur et un point sur les courbes et un léger retour haptique.
  - `touch-action: pan-y` laisse le défilement vertical libre.
- **Transitions** : View Transitions API quand disponible (`withTransition`). Les onglets glissent selon leur ordre et la barre d'onglets reste fixe ; les sous-onglets de Progrès passent en fondu. Sinon, les animations CSS habituelles s'appliquent.
- **Exercices animés** (`exoAnimSVG`, `ANIM_POSES` dans `data_pictos.js`).
  - Chaque famille de mouvement (19) est décrite par deux poses d'une silhouette articulée, animées en SVG natif (SMIL), avec un disque aux mains si l'exercice est chargé.
  - Visible dans la fiche technique et dans le Rewind. Image fixe si « réduire les animations » est activé.
- **Rewind** (`rewind.js`).
  - Diaporama plein écran façon « story » : barre de progression, toucher à droite ou à gauche, maintenir pour la pause, glisser vers le bas pour fermer, flèches et Échap au clavier.
  - Les écrans :
    - rembobinage (la date recule jusqu'au début de la période, effet bande vidéo) ;
    - séances, avec le calendrier du mois ou les barres de l'année ;
    - temps en anneau, avec une équivalence en matchs de foot ;
    - tonnage, avec une équivalence en objets ;
    - exercice favori animé et top 3 ;
    - records et objectifs ;
    - habitudes : série, jour préféré, matin ou soir ;
    - trophées ;
    - image finale à partager.
  - Accessible par la carte Rewind (Historique) et suggéré sur l'accueil en début de mois.
- **Tests** : `v26.js`.

## 9 terdecies. Version 2.6 : premier trophée 3D (Three.js)

- **Démonstration** : un seul trophée, « Assiduité », en tête de Progrès › Trophées (`src/trophy3d.js`). La collection complète viendra ensuite.
- **Three.js** (`vendor/`) :
  - sous-ensemble construit par esbuild (`three-forge.js`, voir `vendor/README.md`) ;
  - copié à côté de la page par `build.sh` et chargé à la demande (`loadThree`), jamais au démarrage ;
  - précaché par le service worker (`forge-v3`) pour le hors ligne.
- **Médaille** :
  - disque par révolution (`LatheGeometry`) : champ creusé au brossage concentrique (`roughnessMap` générée), perle, couronne biseautée ;
  - anneau d'émail orange Forge à vernis (`clearcoat`) ;
  - haltère en relief poli au centre ;
  - anneau de suspension.
  - Le métal suit le palier réel : étain si verrouillé, puis bronze, argent, or, platine. Dans la vue détaillée, on peut prévisualiser chaque métal avec une transition douce.
- **Lumière** : environnement studio généré (`RoomEnvironment` + `PMREMGenerator`, aucune image téléchargée), une lumière principale et un contre-jour, tonalité ACES.
- **Animations** :
  - au repos : balancement lent et flottement ;
  - au déblocage (premier affichage après un nouveau palier, `S.meta.t3dSeen`, ou « Revoir le déblocage ») : apparition avec rebond, deux tours qui ralentissent, lueur, 90 particules dorées, haptique et son ;
  - « réduire les animations » : médaille fixe, simple fondu.
- **Interaction** : un toucher sur la carte ouvre la vue détaillée. Le même canvas grandit jusqu'à sa place (technique FLIP) et affiche le palier, la description, la progression et l'aperçu des métaux. On peut faire tourner la médaille au doigt, avec inertie. Glisser vers le bas, la croix, le fond ou Échap referment.
- **Performances** :
  - un seul contexte WebGL, réutilisé entre la carte et la vue détaillée et entre les rendus d'onglet (`afterRenderView`) ;
  - résolution plafonnée à 2× ;
  - boucle de rendu arrêtée hors écran (`IntersectionObserver`) et quand l'app est en arrière-plan.
- **Repli** : sans WebGL ou si le fichier ne se charge pas, la médaille SVG existante s'affiche et le toucher ouvre la fiche habituelle.
- **Tests** : `v27.js`.

## 9 quaterdecies. Version 2.7 : tous les trophées en 3D, palier Diamant, volume réduit

- **Transparence corrigée.** Les profils de révolution étaient parcourus dans le mauvais sens : les faces avant étaient éliminées et l'on voyait l'intérieur de la pièce, d'où l'impression de transparence de dos.
  - Règle : parcourir le profil dans le sens trigonométrique (le dessus de l'extérieur vers le centre).
  - Le test `v27` vérifie qu'un pixel vu de dos est opaque.
- **Tous les trophées en 3D** (`src/trophy3d.js`).
  - `t3dBuildMedal(T, m, tier)` construit n'importe quel trophée :
    - révolution pour les ronds (dos, couronne cannelée, filet poli, émail bombé guilloché) ;
    - extrusion pour les autres formes (dos plein, cadre évidé biseauté satiné, filet poli, émail guilloché en soleil en creux).
  - Le symbole vient du glyphe de l'app (`GLYPHS`) via `SVGLoader` : pleins extrudés et biseautés ; traits en tubes arrondis avec rotules et bouts ronds.
    - Les textes courts (« 100 », « 7/7 ») sont en relief par carte de bosses.
    - « dumbbell » garde son modèle dédié.
    - Attributs SVG en double nettoyés avant lecture.
  - **Contraste des matières** : symbole en métal poli plus clair, avec une ombre de contact ; émail profond et peu réfléchissant sous vernis ; couronne cannelée ou satinée.
  - **Vignettes** de la grille, des listes et de la célébration : rendu hors écran (second contexte), une par une pendant les temps morts, seulement pour les médailles visibles.
    - Gardées en mémoire (URL d'objet), jamais stockées sur l'appareil.
    - Le dessin SVG reste en dessous jusqu'à l'arrivée de l'image.
  - **Fiche 3D pour chaque trophée** (`showMedalModal`, qui passe par `showMedalModal2D` sans WebGL) : paliers avec dates, aperçu de chaque palier (rotation de transition), rotation au doigt, « Revoir le déblocage ». Secrets non découverts : cadenas et indice.
  - La carte en tête de Progrès › Trophées montre le dernier palier gagné, avec l'animation de déblocage au premier affichage (`S.meta.t3dSeen = "id:palier"`).
- **Palier Diamant** (remplace Platine).
  - 2D : dégradé prismatique et étoiles scintillantes (`.m-spark`). Pastilles et étiquettes en dégradé.
  - 3D : métal glacé irisé (`iridescence`), couronne taillée en facettes (`flatShading`) et étoiles qui scintillent.
- **Volume réduit** :
  - le build minifie JS et CSS si esbuild est installé dans `vendor/` : 606 → 511 Ko ;
  - la copie de secours IndexedDB est compressée en gzip (`CompressionStream`) : 190 → 11 Ko pour 230 séances ;
  - le service worker (`forge-v4`) ne garde d'office que la page et les petites icônes ; Three.js et les grandes icônes sont mis en cache à la première utilisation ;
  - les copies « illisibles » en trop sont supprimées (on garde la plus récente) ;
  - Profil › Espace de stockage détaille les données, la copie compressée et le total sur l'appareil.

## 9 quindecies. Version 2.8 : nouvelle identité ASCEN

YaYa a renommé l'app **ASCEN** et choisi, parmi trois pistes présentées sur une planche de comparaison, la direction **C « Barre relevée »**, adoucie (il aimait aussi la douceur de la piste A et la lisibilité de la piste B).

- **Logo** : le mot ASCEN dessiné au trait, une seule épaisseur, bouts arrondis ; la barre du A est remontée près du sommet (« relever la barre ») et c'est le seul trait orange. Tracés dans `ui_shell.js` : `ASCEN_LETTERS`, `ASCEN_BAR`, `ascenMark()` (SVG inline, `currentColor`). Le A seul sert de monogramme : `favicon.svg` et `icon-*.png` à la racine (tuile orange, A encre). Les PNG ont été rendus depuis le SVG avec Chromium (script jetable, non versionné ; tracés dans `favicon.svg`).
- **Couleurs** (`:root` de `style.css`, seul endroit à modifier) : fond craie `#F4F3F1`, encre `#141210`, orange `--tint` `#FF6B3D` pour les aplats (texte **encre** dessus, `--on-tint`), `--tint-ink` `#C2461B` pour le texte et les pictos orange sur fond clair (contraste AA). Mode sombre : `#0B0B0A`, orange `#FF7A4D`. `--ink`/`--on-ink` : cartes encre (carte du jour, bannière). Plus de dégradés décoratifs ni de reflets animés sur les boutons ; les médailles gardent leurs métaux.
- **Typographie** : `--display` = Geist (titres, graisse 700, approche serrée), `--num` = Barlow Semi Condensed (chiffres façon tableau d'affichage), `--sans` = police système (texte courant, lisibilité). Les deux polices sont des **sous-ensembles** (`src/fonts/*.woff2`, ~13 Ko + 5 Ko, licence OFL) que `build.sh` embarque en base64 : aucune requête réseau, marche hors ligne. `ASCEN Num` ne couvre que chiffres et ponctuation (`unicode-range`) : les lettres retombent sur la police système.
- **Écrans touchés** : lancement (le mot apparaît, puis la barre monte de mi-hauteur à sa place), carte du jour en encre avec bouton orange, décompte de séance sobre, couverture Rewind, image de bilan (logotype tracé au canvas avec `Path2D`), accueil, « À propos ».
- **Renommage** : tous les textes visibles, niveaux (« Régulier·e », « Confirmé·e », « Au sommet » remplacent les titres « forgeron »), export agenda, sauvegarde (`app:"ASCEN"` ; les anciens fichiers Forge restent acceptés).
- **Gardé volontairement** : les identifiants internes (`forge.v1` dans localStorage, base IndexedDB `forge`, cache `forge-v5`, `window.FORGE_THREE`, `dist/forge.html`, `three-forge.js`). Les changer ferait perdre les données déjà enregistrées sur l'iPhone ; ils ne sont jamais montrés.
- **Vérification visuelle** : `tests/brand.js` capture les écrans clés en clair, en sombre, sur ordinateur (1280 px) et à l'accueil (`BRAND_DIR=… node tests/brand.js dist/forge.html`, images dans `tests/out/`).
- Correctif livré juste avant : la copie de secours IndexedDB est enregistrée en octets bruts (`ArrayBuffer`) et non plus en `Blob`, que WebKit refuse en navigation privée (v26 échouait sous WebKit).

## 9 sexdecies. Version 2.9 : audit UX/UI et système de design

YaYa trouvait l'interface moins aboutie que Zeste sans savoir pourquoi. Diagnostic chiffré sur `style.css` avant correction :
- 15 sections de versions empilées, 248 sélecteurs redéfinis ;
- 77 tailles de texte (dont 12,5 / 13,5 / 14,5), 30 rayons, 61 ombres, graisses jusqu'à 900 : tout « criait » ;
- l'orange partout : 4 boutons pleins sur Aujourd'hui, dosages, titres de groupe, barres de graphique roses ;
- un arc-en-ciel d'icônes iOS dans le contenu ;
- des lignes d'historique qui tronquaient les chiffres ;
- des boîtes dans des boîtes et un conseil répété sur la carte de séance ;
- 13 appels `env(safe-area-…)` épars et un `padding-top` sur `:root` qui rendait la page plus haute que l'écran.

**Règles du système (à respecter pour toute évolution)** — jetons dans `:root`, composants dans la section « SYSTÈME ASCEN (v2.9) », en fin de `style.css`, qui fait référence :
- **Texte** : uniquement l'échelle iOS `--fs-lt` 34 · `--fs-t1` 28 · `--fs-t2` 22 · `--fs-t3` 20 · `--fs-body` 17 · `--fs-callout` 16 · `--fs-sub` 15 · `--fs-foot` 13 · `--fs-cap` 12 · `--fs-cap2` 11. Graisses 400/500/600/700, jamais au-delà. Titres en `--display` (Geist), chiffres en `--num` (Barlow), le reste en système.
- **Espacements** : multiples de 4 (`--sp-*`), marge latérale unique `--gutter` (16).
- **Rayons** : `--r-ctl` 10 (contrôles), `--r-card` 16 (toutes les cartes), `--r-hero` 22 (carte du jour, carte de séance, feuilles), `--r-pill`. Pas d'ombre sur les cartes.
- **Boutons** : `.btn` = primaire (aplat orange, texte encre), **un seul par écran** ; `.btn.secondary` = teinté orange ; `.btn.tertiary` = gris ; `.btn.ghost` = texte.
- **Couleur** : l'orange sert aux actions et à la progression. Une sélection s'affiche en encre (puces, exercice courant). Les dosages et étiquettes sont neutres.
- **Icônes** : pictos d'exercice sur fond teinté de la couleur de la région (plus d'aplats) ; icônes de contenu en orange teinté. Seuls les réglages du Profil gardent le code couleur iOS.
- **Zones de sécurité** : uniquement `var(--sat)` / `var(--sab)` (+ `--tabbar-h`). Le haut des vues commence sous l'encoche, la barre d'onglets couvre l'indicateur d'accueil, et les feuilles ne dépassent jamais sous la barre d'état (`calc(100% - var(--sat) - 10px)` au lieu de `88vh`).

**Composants repensés** :
- résumé de semaine en une carte à trois colonnes identiques (valeur, libellé, jauge) ;
- méta de la carte du jour en une ligne ;
- rappels avec les actions sous le texte ;
- cartes « composer » et « séances de la semaine » compactes ;
- historique avec la durée sur la ligne du titre ;
- barres de graphique pleines ;
- sélecteur d'exercices allégé ;
- carte de séance sans boîte grise ni conseil en double.

**Vérifier** : `tests/ui_audit.js` capture chaque onglet en pleine hauteur, en bas de défilement et les feuilles principales, **avec une encoche simulée** (haut 59 px, bas 34 px, via `--sat`/`--sab`) ; `DARK=1`, `ENGINE=webkit`, `NO_NOTCH=1`.

Note tests : `v14` peut dépasser son délai quand d'autres scripts Playwright tournent en parallèle. Seul, il passe.

## 9 septdecies. Version 3.0 : ergonomie, animations, exercices maison, trophées, robustesse

- **Pile de feuilles** (`ui_shell.js` : `sheetStack`, `sheetBack`, options `restore` / `child` / `onBack` d'`openSheet`).
  - Une fiche d'exercice ouverte depuis la liste (elle-même ouverte depuis l'éditeur de séance) revient à la feuille précédente quand on glisse vers le bas, touche le fond ou ✕.
  - Avant, tout se fermait et l'édition était perdue.
  - La liste retrouve sa position de défilement.
  - Les confirmations (`openModal`) vident la pile : « Annuler » ferme tout, comme avant.
- **« Ajouter » selon le contexte** (`infoContext`, `infoAddButton`, `ACT.infoAdd` dans `view_today.js`). Depuis la liste, l'exercice rejoint la sélection et on revient à la liste. Sinon, il va à :
  - la séance en cours ;
  - ou la séance proposée ;
  - ou Ma séance.
- **Animations distinctes** (`data_pictos.js` : `ANIM_VARIANT`, `animPose`, `FOCUS_SEG`).
  - 84 variantes partent des ~20 poses de base et remplacent les articulations qui changent vraiment : genoux au sol, pieds ou mains surélevés, bras tendu (archer), mains jointes (diamant), sauts, appui sur chaise, mur, table ou banc incliné.
  - Chacune a son décor et son tempo.
  - Le muscle principal est surligné sur le segment qui travaille.
  - `tests/anim_sheet.js` dessine départ et fin de chaque exercice par famille : à regarder après toute retouche.
- **Exercices maison** (sans matériel) : dips sur chaise (« pompes inversées »), extension triceps au sol (sphinx), pompes hindoues, rowing sous une table, montées sur chaise, nordic curl. Noms alternatifs pour la recherche : `EXO_ALIAS`. Progressions ajoutées dans `HARDER`.
- **Trophées 3D** : géométries, matériaux et symboles mis en cache pour la session (`t3dGeo`, `T3D.mats`, `T3D.syms`, jamais libérés). Textures calculées plus légèrement. Boucle de rendu à ~30 images/s au repos, 60 pendant un geste ou un déblocage. Vignettes en WebP quand c'est possible. Mesures en rendu logiciel (`tests/t3d_perf.js`) : construction CPU de 24 médailles 122 → 60 ms, grille 15,8 → 11,9 s.
- **Diamant** : cristal taillé (16 pans) en transmission, indice 2,42, dispersion (le « feu »), posé sur une monture platine facettée, émail nuit, symbole platine. Fiche 3D sur fond encre (plus de halo brun), teinte froide pour le diamant.
- **Robustesse** :
  - `normalizeState` écarte au démarrage les entrées illisibles et retire les exercices inconnus de Ma séance, des séances enregistrées, de la séance en cours, des objectifs et des préférences. L'historique garde tout.
  - Toutes les actions passent par `runAction` : une erreur est notée (`ERR_LOG`, 20 dernières), un message sobre s'affiche et la vue est redessinée.
  - Les actions qui enregistrent sont protégées du double appui (`ONCE_ACTS`).
  - Les erreurs globales et les promesses rejetées sont captées.
- **Tests** : `v28` (pile de feuilles, ajout selon le contexte), `v29` (données abîmées, action en échec, double appui).

## 9 octodecies. Version 3.1 : étirements

- **Catalogue** (`data_exercises.js`) : 12 étirements (motif `stretch`, catégorie « Étirements » du sélecteur) couvrant ischios, quadriceps, fessiers, mollets, pectoraux, dos (posture de l'enfant, chat-vache, cobra), épaules, triceps, avant-bras et psoas. Tenus en secondes (30 à 45 s). Deux passages (un par côté) pour les étirements unilatéraux. `isStretch(def)`.
- **Réglage** (Profil → « Étirements en fin de séance », `S.settings.stretching`, désactivé par défaut).
  - Activé, le moteur ajoute 2 à 3 étirements à la fin de la séance proposée, choisis selon les muscles travaillés (`stretchBlock`, `engine.js`).
  - `applyStretchSetting()` met à jour une proposition pas encore commencée.
  - Le moteur ne propose jamais d'étirement comme exercice de force (`engineExos`).
- **Aujourd'hui** : bloc « Étirements · retour au calme » sous les exercices. Le compteur « Exercices » et le « + / − » ne portent que sur les exercices de force ; un ajout se place avant le bloc. Un étirement peut être remplacé par un autre étirement.
- **Enregistrement** : à la fin de la séance, les étirements faits vont dans `session.stretches = [{exoId, sec}]`, hors séries, volume, records et trophées. Format compact : champ `s`. Le détail de la séance (Historique) les affiche avec leur durée. Une séance faite uniquement d'étirements s'appelle « Étirements ».
- **Vignettes 3D** : une vignette qui ne se charge pas (page quittée pendant le rendu) est oubliée et le dessin SVG reste affiché.
- **Test** : `v30` (réglage, bloc en fin de proposition, compteur, enregistrement à part, rechargement, historique, sélecteur, désactivation).

## 9 novodecies. Version 3.2 : une seule façon de créer une séance, reprise de l'app

- **Créer une séance** : un seul chemin, la carte « Compose ta séance » de Ma séance (Choisir · L'app choisit · Partir de la séance proposée).
  - Le « + » de « Mes séances », « Nouvelle séance » et `ACT.tplNew` sont supprimés. Il reste « Programme de la semaine » (création automatique de plusieurs séances).
  - Sous une séance composée, la ligne « Enregistrer cette séance » (facultatif, `saveRowHTML`) ouvre une feuille légère `tplEdit.lite` : nom et jours seulement. Choisir des jours l'ajoute au planning. « Annuler » ne perd rien.
  - Une fois enregistrée, la ligne indique « Enregistrée dans Mes séances · Planifiée : … », ou « Modifiée : touche pour mettre à jour ».
  - Le planning (« Composer une séance pour le … ») passe aussi par Ma séance, avec le jour retenu (`S.custom.pendingDays`) et pré-coché à l'enregistrement.
  - L'éditeur complet sert uniquement à modifier une séance déjà enregistrée.
- **Export Calendrier (.ics) retiré** : `openCalendarExport`, `buildICS` et le bouton de « Mon planning ».
- **Bulle des graphiques** (`showTip`) : elle se pose en haut du graphique, au-dessus de la colonne ou du point touché (avant, elle montait au-dessus de toute la colonne et recouvrait le titre et les onglets). Elle se décale sur le côté si la barre monte jusque-là.
- **Arrière-plan et retour** (fin d'`init.js`) :
  - `appSuspend` diffuse `ascen:suspend` (sortie, `pagehide`, perte de focus). Les gestes en cours reviennent en place : feuille glissée (jamais fermée par une interruption), carte d'exercice (même exercice), bulle et parcours des graphiques, inclinaison de la médaille. `touchcancel` et `pointercancel` sont traités comme une annulation.
  - `appResume` : si le jour a changé pendant l'absence, la séance prévue du jour se charge et l'onglet affiché se redessine (une séance commencée reste intacte).
- **Son** (`sfx.js`) :
  - Contexte audio suspendu en arrière-plan.
  - Après plus de 20 s d'absence, un contexte neuf est créé au premier geste : iOS rend parfois un contexte « en marche » mais muet.
  - Aucun son n'est joué tant que l'app est cachée.
- **Repos terminé pendant l'absence** : on passe à la suite sans sonnerie ni vibration en retard (« Repos terminé : série suivante »).
- **Exercices tenus** : le chronomètre suit l'horloge murale (`Date.now()`), il reste juste après un verrouillage de l'écran.
- **Trophées 3D** : un contexte WebGL perdu en arrière-plan (fréquent sur iOS) est reconstruit au retour (`t3dRevive`). La carte mise en avant et la fiche détaillée se remontent.
- **Pas de zoom au double appui** : `:where(*){touch-action:manipulation}` (spécificité nulle, les gestes dédiés gardent `pan-y` ou `none`) et `maximum-scale=1` (pas de zoom au focus d'un champ). Le pincement reste possible pour l'accessibilité.
- **Test** : `v31`.

## 9 vicies. Version 3.3 : fiabilité et performances

Mesures : `tests/profile.js`, profil CPU par scénario sur 3 ans d'historique (≈ 470 séances), processeur ralenti ×4. Build non minifié pour avoir les noms : `NO_MINIFY=1 sh build.sh && node tests/profile.js dist/forge.html`, puis `sh build.sh`.

- **Performances**
  - **Mises en page forcées supprimées.**
    - L'indicateur des contrôles segmentés (`settleSegs`) lisait `offsetWidth` après chaque rendu pour relancer sa transition. Il passe à Web Animations.
    - `renderView` ne rétablit la position de défilement que si elle n'est pas nulle.
    - En séance, la barre de progression est animée avec Web Animations, et le bandeau d'exercices est centré à l'image suivante.
    - Gain sur un téléphone : environ 20 ms par rendu d'écran.
  - **Enregistrement.**
    - Chaque séance de l'historique est encodée une fois (`packedJSON`, cache `PACK_CACHE`) : 30 ms → 1 ms pour 470 séances.
    - Tout code qui modifie une séance déjà enregistrée doit appeler `sessionTouched(s)` (fait dans la note, l'édition et `recomputePRFlags`).
    - La copie de secours IndexedDB est regroupée : au plus une écriture toutes les 3 s, et tout de suite à la sortie (`flushPersist`).
  - **Résumé de séance** (`sessionSummary`, core.js).
    - Séries, répétitions, tonnage, records, séries de jambes, secondes de gainage, répétitions au poids du corps, charge max et 1RM estimés sont calculés une fois par séance enregistrée.
    - Les séances de l'historique sont marquées (`markStored`, symbole non sérialisé) ; les autres (séance en cours, édition) sont toujours recalculées.
    - `sessionVolume`, `sessionSetCount`, `sessionReps`, `sessionPRCount` et une douzaine de trophées s'en servent. Trophées : ≈ 110 → 65 ms.
  - **`checkMedals`** n'enregistre (et n'invalide les statistiques) que si un palier change. Au démarrage, il est fait au calme (`requestIdleCallback`).
  - **Dates** : `parseISO` sans tableau intermédiaire, `daysBetween` par numéro de jour mis en cache (`dayNum`), heure de début mise en cache par séance (`startHour`), catégorie d'exercice mise en cache (`exoCategory`).
  - **Démarrage.**
    - L'historique au format compact n'est plus recopié deux fois.
    - Le test WebGL n'a lieu que s'il y a une médaille à améliorer, au calme, et son contexte est libéré tout de suite : iOS limite le nombre de contextes.
  - **Recherche d'exercice** : une seule reconstruction de la liste par image.
- **Fiabilité**
  - **Séance illisible au chargement.**
    - Avant, elle faisait échouer tout le chargement : l'app repartait sur un historique vide, les données mises de côté.
    - Maintenant, chaque séance est décodée à part et une entrée abîmée est écartée (`LOAD_SKIPPED`).
    - L'original est gardé (`forge.v1.illisible.*`) et un message le signale.
  - **Valeurs numériques garanties** (sauvegarde restaurée, import) : un texte dans les répétitions faisait des totaux faux.
  - **Écran en échec** : `renderView` rattrape l'erreur, affiche « Cet écran n'a pas pu s'afficher » avec un bouton « Réessayer » (`retryView`) et la note dans `ERR_LOG`. Les autres onglets restent utilisables. `afterRenderView` est protégé de même.
  - **Bornes de saisie** en séance : charge ≤ 500 kg (élastique : niveau ≤ 5), répétitions et secondes ≤ 9999, comme dans l'édition de l'historique.
  - **Compression de la copie de secours sans Blob** (`gz`/`gunz`) : WebKit lit un Blob via une URL interne `blob:`, refusée pendant qu'on quitte la page, justement quand la copie est écrite.
  - **Transitions entre onglets** : deux changements rapprochés interrompent la transition précédente. Ses promesses rejetées sont maintenant traitées (plus d'erreur non gérée), et une erreur de l'écran lui-même est notée.
- **Tests** : `v32` ; outil `profile.js`.

## 9 unvicies. Version 3.4 : proposition d'exercices, pictogrammes

- **Compose ta séance** : deux boutons seulement, « Choisir » et « L'app choisit ». « Partir de la séance proposée » (`customFromProposal`) est retiré.
- **Carte du jour** : chaque pictogramme ouvre la fiche de l'exercice ; « +N » descend à la liste (`heroShowAll`). Les lignes de la séance proposée ouvraient déjà la fiche.
- **Moteur de proposition** (`pickExosForSession`, engine.js).
  - Un plan d'emplacements par type de séance (`SESSION_PLANS`) remplace le cycle fixe de mouvements. Chaque emplacement donne des mouvements acceptés et des muscles visés.
  - Pénalités de variété : même famille −4,5 par occurrence, même muscle principal −2,2, même mouvement −0,6. Petit bonus aux exercices polyarticulaires en tête de séance.
  - Ordre : gros mouvements d'abord, gainage puis mollets à la fin (`PATTERN_LATE`).
  - Niveau intermédiaire : versions allégées (pompes sur les genoux…) légèrement écartées.
  - Mesuré sur 60 séances par cas (`tests/v33.js` pour l'essentiel) : 0 doublon de muscle en corps complet à 6 exercices (1 avant), ordre toujours respecté (60/60 fautif avant en haut du corps).
- **Pictogrammes animés.**
  - Zone travaillée plus fine : trait 2,3 au lieu de 3.
  - Variantes : `like` (reprendre une autre variante) et `envOnly` (le décor remplace celui de la base). Plus de banc plat dessiné sous le développé incliné ou au sol.
  - Corrigés : squat barre (barre sur le dos), front squat (coudes hauts), squat élastique, marche latérale (vue de face, élastique aux genoux), squat assisté aux sangles (une jambe), fentes marchées (on avance), fente arrière barre / goblet, squat bulgare haltères (banc), kickback fessier (à quatre pattes), soulevé de terre sumo (pieds écartés), rowing renegade (en planche), rowing inversé à la barre, rowing et curl aux sangles (corps incliné), rowing appui banc incliné, curl incliné (assis), thruster (de profil jusqu'aux bras tendus), pompes déclinées (pieds plus hauts que les épaules).
  - Pictogrammes de liste « row » et « crunch » redessinés, plus lisibles.
  - `tests/anim_sheet.js` (FAMILIES, NAME) : planche de contrôle à regarder après toute retouche.
- **Test** : `v33`.

## 9 duovicies. Version 3.5 : pictogrammes sur squelette

Constat : les poses étaient des positions d'articulations animées en ligne droite. 103 exercices sur 155 avaient un membre ou le tronc qui changeait de longueur (membres « désarticulés »). Plusieurs dessins étaient faits avec des proportions impossibles : bras de 7 unités dans la planche, jambes 1,6× trop longues dans la pompe pike.

- **Squelette** (`data_pictos.js`).
  - Longueurs d'os fixes (`BONE_L` : tronc 5,6, cuisse et tibia 4,2, bras 3,0, avant-bras 3,1, cou 2,75).
  - Chaque image est reconstruite à partir d'angles (cinématique directe) ; l'animation interpole les angles sur 8 images aller + retour (`rigFromData`, SMIL `values` / `keyTimes`). Plus aucun membre ne s'étire au milieu du mouvement.
  - Les extrémités posées (`pin` : pieds au sol, mains sur la barre, au sol ou sur le banc) sont résolues en cinématique inverse à deux segments (`ik2`), pliées du côté de l'angle donné.
  - Vue de face (`front:true`) : épaules et hanches écartées (`frontRoots`, `S`/`S2`/`Q`/`Q2`) ; avant, bras et jambes partaient d'un seul point.
  - `nk` : cou raccourci pour les haussements d'épaules.
- **Poses** (`src/data_rigs.js`, chargé après `data_pictos.js`).
  - Les 155 exercices sont réécrits : bassin `P`, angle du tronc `t`, de la tête `h`, des membres `K F E W` (et `K2 F2 E2 W2`), appuis `pin`, décor `env`, durée `dur`, pictogramme `icon` (A, B ou mid).
  - Aides : `stand`, `FRONT`, `HANG`, `bodyLine` (corps gainé des pieds aux épaules), `supine`, `quad`, `BENCH_LIE`, `INCL_LIE`, `rot`.
  - Repère : 0° à droite, 90° en bas ; sol y = 20,8.
  - L'ancien système (`ANIM_POSES`, `ANIM_VARIANT`) sert de repli pour un exercice sans pose.
- **Pictogrammes de liste** : `exoPicto(def)` dessine la pose de fin (ou `icon`) du squelette, trait plus épais. Chaque exercice a son pictogramme (134 dessins différents pour 155 exercices) au lieu d'une vingtaine de familles.
- **Contrôle** :
  - `tests/anim_sheet.js` affiche départ, milieu et fin de chaque exercice (FAMILIES, NAME).
  - `tests/v34.js` vérifie, pour chaque exercice et chaque image : longueurs d'os constantes (écart 0), appuis atteints, rien sous le sol, épaules écartées en vue de face.

## 9 tervicies. Version 3.6 : carte des muscles, défis, audit de robustesse

- **Carte des muscles** (`src/musclemap.js`) : deux silhouettes stylisées (face, dos) en SVG ; chaque muscle est une zone colorée selon sa région, avec une intensité de 0 à 1 (`muscleMapSVG(levels, tips, opts)`).
  - Fiche d'exercice : muscle principal plein, secondaires à 42 % (`exoMuscleMap`). Pas de carte pour un exercice uniquement cardio.
  - Progrès, Résumé : « Muscles de la semaine » (`weekMuscleMapHTML`), séries des 7 derniers jours par muscle. La couleur est pleine au repère de 6 séries (force) ou 10 séries (autres objectifs). Toucher un muscle affiche sa bulle (même mécanisme `data-tip` que les graphiques). Liste « À renforcer ».
- **Défis** (`src/challenges.js`) : 8 défis courts (7 à 30 jours) lancés depuis Progrès, 3 au plus en même temps.
  - Défis : 100 pompes, 10 min de gainage, tout le corps, 1 000 répétitions, 12 séances, jambes, 3 records, 10 tonnes (masqué sans matériel chargeable).
  - La progression se calcule depuis l'historique (séances datées du lancement à la fin du délai) : rien à saisir.
  - État : `S.challenges = [{id, start, doneAt?, missedAt?}]`, filtré par forme dans `normalizeState`. Un identifiant inconnu est gardé mais ignoré.
  - `checkChallenges()` : appelé à la fin d'une séance (avant `checkMedals`), après une correction d'historique et à l'affichage de la section (délais dépassés).
  - Réussite : ligne « Défi réussi » dans la fête de fin de séance, nouveau trophée « Défis relevés » (1 / 5 / 15 / 40).
  - Abandon avec confirmation. Un défi manqué ou réussi peut être relancé.
- **Audit de robustesse** :
  - État enregistré abîmé (valeurs nulles, types faux, éléments nuls ou inconnus, séance en cours cassée) : l'app démarre et tous les écrans s'affichent (vérifié par `tests/v35.js`).
  - Réinitialisation : efface aussi les copies illisibles mises de côté. Elle recharge même si IndexedDB est bloquée (délai de 2,5 s).
  - Restauration : accepte aussi le format compact (`zs`) ; un fichier illisible ne change rien (message) ; le minuteur de repos d'une séance en cours est arrêté.
- **Tests** : `tests/v35.js` couvre la carte (fiche et semaine, bulle), le cycle de vie des défis (lancement, plafond, réussite fêtée et trophée, rechargement, délai dépassé, abandon, relance, défi en tonnes masqué sans charges), les états abîmés et la réinitialisation.

## 9 quatervicies. Version 3.7 : nettoyage, robustesse, performances

- **Dépôt** :
  - `forge_projet/dist/` n'est plus suivi par Git (`forge_projet/.gitignore`). C'était une copie exacte des fichiers de la racine, avec Three.js en double. `build.sh` le génère toujours pour les tests.
  - Nouveau `README.md` à la racine : utilisation, organisation du dépôt, construction et tests.
- **Code mort retiré** :
  - Fonctions `miniRingSVG`, `liveEyebrow`, `heTime`, `setVolume` et `PATTERN_LABEL`.
  - Actions `backToPicker`, `editTemplateDays`, `tplDayToggle`.
  - 83 règles CSS dont les classes n'existent plus (anneau de motivation, bannière de planning, « séance faite aujourd'hui », anciens badges) : environ 6 Ko de moins.
- **Plusieurs onglets** :
  - L'app ouverte deux fois (deux onglets, ou Safari et un ordinateur) reprend ce que l'autre instance enregistre, via l'événement `storage` (`core.js`) et `onExternalState` (`init.js`). Avant, la dernière sauvegarde écrasait silencieusement le travail de l'autre onglet.
  - Si des changements sont en attente d'écriture, l'onglet les garde et sa sauvegarde l'emporte.
  - Si une feuille est ouverte, l'écran se met à jour à sa fermeture.
  - Une réinitialisation dans un onglet fait recharger les autres. `wipeStorage` efface maintenant la copie de secours avant le stockage principal, pour qu'un autre onglet ne puisse pas la reprendre.
- **Mesures** (`tests/profile.js`, 3 ans d'historique, processeur ralenti ×4) :
  - Démarrage : environ 1 s.
  - Validation d'une série : environ 30 ms, surtout la mise en page.
  - Onglets : 20 à 45 ms. Trophées : environ 120 ms au premier affichage, à cause du test WebGL.
  - Rien de prioritaire à optimiser.
  - Une fusion du CSS dupliqué (csso) ne ferait gagner que 6 %, au prix de réordonner la cascade : écartée.
- **Tests** : `tests/v36.js` (synchronisation entre onglets, changement en attente conservé, feuille ouverte, réinitialisation propagée).

## 9 quinvicies. Version 3.7.1 : relecture des textes

- Relecture de tous les textes affichés : environ 1 850 fragments (interface, fiches d'exercices, trophées, Rewind).
- Corrections :
  - Kettlebell toujours au féminin (« la kettlebell », « tenue »).
  - Tutoiement partout : « Touche pour passer », « vers toi », « devant toi », « Prévois ».
  - Accords : « Mollets unilatéraux », trophée « Pas encore débloqué ».
  - Espaces typographiques : « 100 % », « ≈ 20 min ».
  - Tournures : « tricher en fin de série », « monte et descends », « redescends lentement, sans à-coups », phrases nominales complétées dans trois consignes.

## 10. Cahier des charges d'origine (résumé)

Voir le fichier `4a3df5ee-cahier-des-charges-forge.md` fourni au lancement du projet pour le texte complet. Points clés déjà couverts en v1.0 : matériel personnalisable et extensible, bibliothèque d'exercices filtrée, inclusion/exclusion d'exercices, objectifs personnalisés, suivi détaillé de séance (éditable, timer de repos, coche rapide), moteur de suggestion 100% local avec export/import IA, graphiques de progression, PR, streaks/régularité, trophées, écran d'accueil = séance du jour, thème clair/sombre automatique, page À propos avec copyright.

## 11. Chantiers proposés pour la suite

1. ~~Historique modifiable a posteriori~~ fait en v2.3 (éditer les séries d'une séance déjà enregistrée ; la suppression existe depuis la v1.2).
2. ~~Récap en image~~ fait en v2.3 (bilan mensuel et annuel).
3. ~~Tests versionnés~~ fait en v2.3 (`tests/`, `sh tests/run.sh`).
4. Vérification de chaque exercice avec une source nommée (NSCA/ACSM/NASM) si YaYa souhaite le même niveau de rigueur que les recettes de Zeste.
5. ~~Test WebKit~~ fait depuis la v1.4 (WebKit 26 via Playwright). Reste : un essai sur un vrai iPhone (gestes, retour haptique, safe areas). Historique de la note : WebKit était **bloqué dans cet environnement cloud** — `playwright install webkit` télécharge le binaire depuis `cdn.playwright.dev` / `playwright.download.prss.microsoft.com`, tous deux refusés par la politique réseau de l'environnement (403 « request blocked »). Les dépendances système WebKitGTK, elles, s'installent sans problème. Pour débloquer : ajouter l'un de ces deux hôtes à la liste des domaines autorisés dans les réglages réseau de l'environnement (menu de l'environnement cloud → Modifier), puis relancer `playwright install webkit`.
6. Geste de balayage (swipe) pour naviguer entre exercices en mode focus, en plus des flèches actuelles — nécessiterait de gérer `touchstart`/`touchend` proprement sans casser le scroll vertical.

## 12. Aperçu en artifact Claude

En plus du dépôt Git (source de vérité), l'app peut être publiée comme Artifact claude.ai pour un aperçu rapide sans avoir à cloner/ouvrir le fichier : extraire le `<title>`, le `<style>` et le contenu de `<body>` de `dist/forge.html` (sans les balises `<!doctype>`/`<html>`/`<head>`/`<body>`, qu'un Artifact fournit lui-même), puis publier ce fragment avec l'outil Artifact. L'app n'utilise aucune ressource externe (polices de la marque embarquées, pas de script CDN), donc elle passe telle quelle la politique de sécurité des Artifacts. Ce n'est qu'un aperçu de confort : le livrable réel reste le fichier unique du dépôt.

## 13. Méthode de travail attendue

- Lire le code concerné avant de modifier, ne pas réécrire inutilement.
- Un changement à la fois, reconstruire (`sh build.sh`), tester (au minimum un smoke test navigateur : tous les onglets, démarrer/terminer une séance en mode focus, naviguer entre exercices, ouvrir les sheets du Profil).
- À la fin de chaque livraison : incrémenter `APP_VERSION` et expliquer à YaYa ce qui a changé.
