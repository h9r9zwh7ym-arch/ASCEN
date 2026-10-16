APP_VERSION 2.2.7 · cache sw.js forge-v63 · mis à jour le 16 octobre 2026. Les anciennes sections « 4.0 » et les versions 2.x forment une seule lignée : 4.0 était un nom de travail, `APP_VERSION` (`src/init.js`) fait foi.

# Passation ASCEN (anciennement Forge)

App web de suivi de musculation à domicile pour iPhone, un seul fichier HTML, pour Yannick Wahler (« YaYa »). Ce document décrit l'état actuel, pas son histoire.

## 1. Propriétaire et règles

- **Langue** : français partout (interface, réponses, commits), tutoiement de l'utilisateur dans l'app et avec YaYa. Réponses courtes : YaYa demande souvent « 2-3 lignes ».
- **Cible** : usage solo sur iPhone, Safari / app installée sur l'écran d'accueil (iOS 18+, iOS 26). Chromium sert au développement, WebKit (Playwright) fait foi pour les tests.
- **100 % local** : pas de backend, pas de compte, aucune requête réseau sortante (CSP `connect-src 'self'`). Données dans localStorage + copie IndexedDB.
- **Véracité des exercices** : consignes d'exécution et de sécurité fondées sur des repères techniques reconnus (dos neutre, alignement, amplitude contrôlée). Jamais de consigne inventée ou risquée ; en cas de doute, rester conservateur. Une anecdote de l'ascension doit être vraie. Les modèles chiffrés (force, stimulus, désentraînement, semaine allégée) citent leurs sources dans les feuilles « Comment c'est calculé ».
- **Copyright** : `COPYRIGHT` (`init.js`).
- **Méthode** :
  - lire le code concerné avant de modifier ; pas de réécriture gratuite ; un changement à la fois ;
  - pour les demandes « tâche minimale » : grep ciblé, ne toucher à rien d'autre, ni doc ni sous-agent ;
  - maquette (Artifact) avant code pour tout changement visuel important ; attendre la validation ;
  - reconstruire, lancer les tests concernés, ne jamais affirmer un rendu non vérifié ;
  - chaque livraison : incrémenter `APP_VERSION` et `CACHE` (sw.js racine), build, commit, push ;

## 2. Cap design de YaYa

Règles voulues, et l'écart éventuel avec le code actuel (« Écart : »).
- **Sobre, proche des apps Apple** (Forme, Réglages, Santé). Écart : aucun majeur ; quelques écrans riches (Mon ascension, Rewind, trophées 3D) restent plus démonstratifs.
- **Pas de textes d'instruction** (« Touche pour… », « Glisse pour… »). Écart : les feuilles « Comment ça marche » et l'onboarding gardent du texte, voulu ; à surveiller à chaque ajout.
- **Jamais de doublon d'information** : une info à un seul endroit. Écart : aucun connu (chasse aux doublons faite sur accueil, Progrès, Profil).
- **Accent réservé** à l'action principale et à l'état actif ; vert = validation / réussite ; orange/rouge = alerte. Écart : l'orange sert aussi aux records, favoris et à l'encadré Sécurité (`--orange` = `--tint-ink`) ; à arbitrer.
- **3 tailles de texte**. Écart : le code a une échelle iOS de 10 tailles (`--fs-lt` à `--fs-cap2`) et ~30 tailles en px dans des blocs spécifiques (scène, séance, médailles).
- **Multiples de 8 px**. Écart : les jetons sont en multiples de 4 (`--sp-1` 4 … `--sp-8` 32) ; beaucoup de 10/12/14 px en dur.
- **Marge latérale 20 px**. Écart : `--gutter` vaut 16 px.
- **Contrôles segmentés iOS** : `segHTML` + `settleSegs` (curseur glissant). Conforme.
- **Chips et tuiles à bordure d'accent quand sélectionnées**. Écart : sélection en aplat (`.chip.on` = `--tint` plein ; puces de type et filtres du sélecteur en encre `--label`) ; listes cochées en orange.
- **Pas de swipe entre onglets**. Conforme (seuls gestes : carte d'exercice, retour par le bord, glisser pour fermer).
- **Rebond léger uniquement sur la barre d'onglets** (`tabPop`). Écart : ~55 courbes à dépassement ailleurs (`favPop`, `ckPop`, `badgePop`, ressort des feuilles et interrupteurs, `caLand`, `ascPop`…).
- **Glisser-déposer des exercices intouchable** (`[data-sort]`, `SORTS`, ui_shell.js ; éditeur et liste du jour). Conforme.

## 3. Build, tests, livraison

```sh
cd forge_projet
sh build.sh            # dist/forge.html + copie ../index.html (racine), three-forge.js et ascent-scenes.js copiés à côté
NO_MINIFY=1 sh build.sh  # sans minification (profilage, noms lisibles)
sh tests/run.sh        # tout : chromium + webkit, audits de mise en page, génération, hors ligne, perf, singe
sh tests/run.sh webkit # un seul moteur
```
- Un test seul : `CHROMIUM_PATH=/opt/pw-browsers/chromium NODE_PATH=tests/node_modules node tests/v57.js $PWD/dist/forge.html` ; WebKit : `ENGINE=webkit PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers …`.
- Suites (`SUITES` de run.sh) : smoke, test2, focus, v12 → v70 (sans v18, v68 ; `tests/README.md` les décrit). Utiles : v16 séance, v35 états abîmés, v54 budget de choix, v57 liste du Profil, v59 couleurs interdites, v60 robustesse, v69-v70 saisie au geste et gainage. Outils : `audit.js`, `gen_audit.js`, `offline.js`, `perf2.js`, `monkey.js`.
- Écriture 400 ms après `save()` : `persistNow()` avant de lire localStorage en test.
- Livrer : `APP_VERSION` (`src/init.js`) et `CACHE` (`/sw.js` à la racine, `forge-vNN`) incrémentés à chaque livraison, puis build, commit, push sur la branche de travail.
- GitHub Pages sert la racine du dépôt ; `forge_projet/dist/` n'est pas versionné.

## 4. Architecture

**Ordre de concaténation** (build.sh, ne pas changer à la légère) : `style.css`, puis `data_equipment.js data_exercises.js data_pictos.js data_rigs.js data_ascent.js data_ascent_story.js core.js engine.js ui_shell.js sfx.js fx.js timer.js charts.js musclemap.js trophies.js view_today.js tpl_editor.js onboarding.js view_history.js recap.js rewind.js view_progress.js strength.js challenges.js ascent.js view_ascent.js trophy3d.js view_profil.js init.js`. `data_ascent.js` avant `core.js` (le chargement lit `ASC_DATA`). En-tête de page (CSP, script de thème) écrit dans build.sh entre apostrophes shell : les `'self'` y sont écrits `'\''self'\''`.

**Fichiers clés** : `core.js` (état, stockage, dates, agrégats mémoïsés), `engine.js` (propositions, double progression `suggestForExo`, `startWeight`), `ui_shell.js` (onglets, feuilles, dispatcher, glisser-déposer, navigation poussée), `sfx.js`, `fx.js`, `timer.js` (repos, chrono), vues `view_*.js`, `tpl_editor.js`, `onboarding.js` ; logique `strength.js`, `challenges.js`, `ascent.js`, `trophies.js`, `trophy3d.js`, `recap.js`, `rewind.js`, `musclemap.js`, `charts.js`.

**Conventions**
- Actions : `data-a="nom"` → `ACT.nom(dataset, élément, event)` via `runAction` (erreurs notées dans `ERR_LOG`, 20 dernières ; vue redessinée). `data-c` pour `change` d'un input. Chaque module enrichit `ACT` par `Object.assign`. Une fonction déclarée plus tard l'emporte (hissage) : vérifier qu'elle n'est pas redéfinie ailleurs avant de la modifier. `ONCE_ACTS` protège du double appui les actions qui enregistrent.
- État `S` : `equipment`, `prefs` (favoris = `included`, exclus), `goals` (`daysPerWeek`, `level`, `exoCount`, `senior`…), `sessions`, `draft` (séance du jour / en cours, `warm`, `beats`), `custom` (Ma séance, `planDate`, `pendingDays`, `oneOff`), `templates` (Mes séances, `days`, `since`), `importedProgram`, `medals`, `targets`, `challenges`, `body`, `deload`, `deloadLog`, `ascent` (`pauses`, `seen`, `descSeen`, `intro`), `settings`, `meta`.
- Réglages (`S.settings`) : `theme` (auto/light/dark), `unit`, `todayTab`, `name`, `why`, `sound`, `uiSound`, `haptic`, `stretching`, `warmup`, `rest` (court/normal/long), `flow`, `liveDark`, `beat`, `nextGoal`, `trend`, `appPicks`, `deloadTips`, `thenNow`, `ui`. Booléens actifs par défaut testés en `!== false` ; `normalizeState` garde les clés inconnues.
- Rendu : `renderView(id)` reconstruit l'onglet (réutilisé si `el._ver === DATA_VER`) ; `changed()` = save + rendu (différé si une feuille est ouverte) ; `renderViewAnimated` pour les vrais changements d'écran ; `renderTodaySoft` pour l'accueil après une action ; `afterRenderView` (dessin de la courbe de force, grimpeur de la carte semaine) ; `prerenderStaleViews` au calme. En séance, `refreshFocusRegion` / `patchFocusSteps` ne touchent que la carte.
- Mémoïsation : `memo(clé, fn)` invalidé par `DATA_VER` (incrémenté par `save()`), `sessionSummary` par séance marquée `markStored`, `PACK_CACHE` du format compact.

**Règles à ne pas casser**
- Toute modification de `S` passe par `save()` (sinon caches périmés) ; `save({derived:true})` pour un recalcul (paliers de trophées).
- Modifier une séance déjà enregistrée : appeler `sessionTouched(s)`.
- Dates en heure locale : `localISO`, `todayISO`, `addDaysISO`, `parseISO`, jamais `toISOString()` pour une date (UTC décale d'un jour en Suisse). Seuls `startedAt`/`completedAt` sont en ISO UTC.
- Ouvrir feuilles et modales par `openSheet` / `openModal` / `actionSheet` (un seul `#overlay`, compteur `overlayGen`, pile `sheetStack`). Cibler les boutons de fermeture précisément dans les tests (le voile partage `closesheet`).
- Identifiants insérés dans `data-id` : validés par `normalizeState` (`/^[A-Za-z0-9_.:-]{1,64}$/`). Textes saisis : toujours échappés. Fichiers importés : `parseUntrusted`.

## 5. Stockage et renommage Forge → ASCEN

Seul le nom affiché a changé. **Aucune migration n'existe** : tous les identifiants internes gardent « forge ». Les changer ferait perdre les données de l'iPhone (localStorage et IndexedDB sont lus par nom) et casserait le cache hors ligne.

| Identifiant | Nom actuel | Exposé à l'utilisateur ? | Migré ? |
|---|---|---|---|
| État principal (localStorage) | `forge.v1` (`STORAGE_KEY`) | non | non |
| Image de la scène de la carte semaine | `forge.v1.strip` (`ASC_STRIP_KEY`, JPEG ~30 Ko) | non | non |
| Thème avant premier rendu | `forge.v1.theme` (absent si thème auto) | non | non |
| Données illisibles mises de côté | `forge.v1.illisible.<horodatage>` (la plus récente gardée) | non (message seulement) | non |
| Copie avant restauration | `forge.v1.avant-restauration` | non | non |
| Base IndexedDB | base `forge`, magasin `state`, clé `main` (gzip `ArrayBuffer`, `savedAt`) | non | non |
| Cache du service worker | `forge-v63` (`CACHE`, sw.js ; les autres caches sont supprimés à l'activation) | non | non |
| Bundle Three.js | `three-forge.js` (vendor → racine), `window.FORGE_THREE` | non | non |
| Scènes de l'ascension | `ascent-scenes.js`, `window.ASC_SCENES` | non | — |
| Build | `forge_projet/`, `dist/forge.html` → `../index.html` | non | non |
| Sauvegarde | `ascen-sauvegarde-<date>.json`, `{app:"ASCEN", format:1, version, exportedAt, data}` | oui | — |
| Export tableur | `ascen-historique-<date>.csv` | oui | — |
| Images partagées | `ascen-bilan-<clé>.png`, `ascen-sommet-<clé>.png` | oui | — |

- La réinitialisation efface toutes les clés `forge.v1` et `forge.v1.*`, puis IndexedDB (copie de secours d'abord, pour qu'un autre onglet ne la reprenne pas).
- Les anciennes sauvegardes (Forge, `app:"FORGE"` ou JSON brut) sont lues : la restauration ne vérifie pas `app`. Elle accepte `{data:…}` ou l'état direct, du moment qu'il contient `sessions` (lisible) ou `zs` (compact) ; puis `normalizeState`.
- Format compact : `fmt:2`, historique dans `zs` (`packSession` / `unpackSession`, ~2,5× plus léger ; `st.goal` en 4e champ d'une série, `o.b` = séries battues). Une liste `sessions` non vide reste prioritaire.
- Risque d'un changement de clé : historique vide au lancement (ancienne clé orpheline), copie IDB ignorée. Si voulu un jour : lire l'ancienne, écrire la nouvelle, ne supprimer qu'après relecture, idem pour IndexedDB.

## 6. Design system actuel (`:root` de style.css)

Toutes les couleurs, polices et rayons partent de `:root` (clair), redéfinis sous `@media (prefers-color-scheme:dark) :root:not([data-theme="light"])` et `:root[data-theme="dark"]`.

- **Fonds et textes** : clair `--bg #F2F2F7`, `--bg2 #FFFFFF` (cartes), `--bg3 #F7F7FA`, `--label #1C1C1E`, `--label2 #636366`, `--label3 #8E8E93`, `--sep rgba(60,60,67,.16)`, `--fill rgba(118,118,128,.12)`. Sombre `--bg #000000`, `--bg2 #1C1C1E`, `--bg3 #2C2C2E`, `--label #FFFFFF`, `--label2 #A1A1A6`, `--sep rgba(84,84,88,.6)`.
- **Accent unique** : `--tint #BC5736` (aplats, texte blanc dessus `--on-tint`), `--tint-ink #A64A29` clair / `#E07A55` sombre (texte et pictos orange, AA ≥ 4,5:1), `--tint-bg` (fond doux). `--orange` = `--tint-ink`.
- **Système** : `--green #1E7A35` / `#30D158`, `--red #D70015` / `#FF453A`, `--blue #0066CC` / `#409CFF`, `--purple`, `--switch #34C759` / `#30D158` (interrupteurs, convention iOS).
- **Métaux** : `--bronze`, `--silver`, `--gold`, `--plat`, `--diam` (trophées).
- **Régions** (`--r-push/pull/legs/core`) : encore définies, mais `.r-push`… pointent sur `--tint` : les régions ne colorent plus rien.
- **Polices** : système uniquement. `--display`/`--sans` = SF Pro, `--num` = SF Pro Rounded (`ui-rounded`). Aucune police embarquée.
- **Texte** : échelle iOS en rem (base 17 px, jusqu'à 21 px avec Dynamic Type via `applyTextSize`) : `--fs-lt` 34, `--fs-t1` 28, `--fs-t2` 22, `--fs-t3` 20, `--fs-body` 17, `--fs-callout` 16, `--fs-sub` 15, `--fs-foot` 13, `--fs-cap` 12, `--fs-cap2` 11. Graisses 400–700. Texte des graphiques ≥ 11 px.
- **Espacements** : `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 20, `--sp-6` 24, `--sp-8` 32 ; `--gutter` 16.
- **Rayons** : `--r-ctl` 12, `--r-btn` 16, `--r-card` 20, `--r-hero` 22 (carte du jour, feuilles), `--r-pill`. Pas d'ombre sur les cartes (`--shadow:none`).
- **Boutons** : `.btn` 56 px de haut, aplat `--tint`, texte blanc, un seul primaire par écran ; `.secondary` (teinté), `.tertiary` (gris), `.ghost` (texte). Lignes de liste `.row` 52 px min.
- **Zones de sécurité** : uniquement `var(--sat)` / `var(--sab)` et `--tabbar-h` 50 px. Feuilles limitées à `calc(100% - var(--sat) - 10px)`. Barre d'état : bandeau fixe `#sbar` (`syncStatusBar`).
- **Cibles 44 pt** : zone agrandie par `::before` centré (attention : `overflow:hidden` la coupe). − / + de séance 40 px (zone 44).
- **Usage de l'orange** : action principale, progression, état actif d'une liste cochée, prochain camp, records et alertes de force. Un choix exclusif (puces, nombres, jours) s'affiche en encre. Le vert reste pour « fait / réussi » et les interrupteurs ; le rouge pour la suppression et le désentraînement.

## 7. Écrans

**Onglets** : Aujourd'hui, Progrès, Profil (`TABS`). Historique est une vue sans onglet (`bar:false`), atteinte par le sélecteur Résumé | Historique de Progrès (`progView`, `tabOf`). Toucher l'onglet actif remonte en haut (Progrès revient au Résumé). En séance (`body.live-focus`), la barre d'onglets s'efface.

**Aujourd'hui, accueil** (`renderTodayPreview`)
- En-tête (date, titre), **un seul message** : semaine allégée, séance manquée (`missCatchUp`/`missSkip`) ou « Prochain cap » (`nextGoal` : alerte de force, record à battre, trophée presque gagné).
- **Carte du jour** (`heroHTML`) : titre et « Modifier » sur une ligne, durée, 3 exercices puis « Voir les N exercices » (`heroMore`), « Commencer », « Choisir une autre séance » (`chooseSession` : Mes séances, Proposée par l'app, Sur le moment : express, composer). Priorité : séance faite aujourd'hui > prévue (planning) > composée (Ma séance) > proposition de l'app. Modifier (`heroEdit`, instantané `heroSnap`) → « OK » ; pour une séance de Mes séances modifiée : « Pour aujourd'hui seulement » / « Aussi pour les prochaines fois » / « Annuler les modifications ». Séance de l'app : « Ajuster » (`propAdjust` : type, nombre, remplacer, ajouter), « Autre proposition ».
- **État vide** : carte « Compose ta séance » (« Choisir mes exercices » / « Ou laisse l'app choisir »), états vides iOS (`emptyHTML`).
- **Cette semaine** (`weekCardHTML`) : scène réelle de la montagne (`ascStripHTML`), prochain camp ou « Retour en force », jauge, 7 jours (toucher = placer une séance, `planDay`), compte et série de semaines ; toucher le haut ouvre Mon ascension.
- **Mes séances** (cartes : nom, jours, pictos, détail au toucher) et « Programme de la semaine » (`openWeekWizard`). Rappel de sauvegarde en bas. Carte « Ton pourquoi » après ≥ 4 jours sans séance.

**Séance prête → en cours** (`view_today.js`, préfixe CSS `sx-`, thème sombre forcé sauf `liveDark === false`)
- Échauffement facultatif avant (`warmPlan`, `WARM_MOVES`, animations `WARM_ANIM`).
- En haut : nom, chrono, « Terminer » (feuille d'actions : Enregistrer et terminer / Abandonner, rattrapable 5 s / Continuer) ; barre segmentée par exercice (ouvre la liste) ; ligne d'altitude (`liveAscHTML`).
- Carte : animation du mouvement (toucher = fiche), nom, « ••• » (fiche, remplacer, ajouter une série, corriger les séries faites, favori, mode classique), cases de séries (faite = corriger, `openDoneSets`), charge et répétitions en gros (glisser vertical sur le chiffre, `VAL_PX` 46 px/cran, ou − / +, plus de clavier), ligne « à battre » (`beatLineHTML`), « À suivre », « Valider la série ». Changer d'exercice en glissant la carte.
- Exercice tenu : règle des secondes en ligne (`mountDurDial`, `DUR_PX` 22 px par 5 s, 15 s minimum), « Lancer le chrono · N s », 3-2-1, décompte, validation automatique, « S'arrêter » garde le temps tenu et `st.goal` ; ressenti Difficile / Moyen / Facile ; « Valider sans chrono ».
- **Repos** : « ✓ Série N enregistrée », anneau (`ringSVG`), −15 / +15 s, ressenti facultatif (réserve 0 / 1–2 / 3+), « Passer le repos » ; à zéro « C'est reparti » puis série suivante (enchaînement circuit par défaut, `restAdvance`). Durée selon `restFor` et le réglage.
- Toutes les séries validées : carte « Séance complète », chrono figé.

**Fin de séance** (`showCelebration`, trophies.js, page `cel-page`) : « Séance terminée », ligne résumé, Tonnage (courbe des séances comparables), « Nouveau record » s'il y en a un, objectifs et défis atteints, carte Mon ascension (piste zoomée, camps franchis, badge, carte postale), trophées gagnés, au plus 3 temps forts puis « Voir les N progrès », note, « Garder cette séance ? » (Ajouter à Mes séances), « Terminé ».

**Progrès**
- Résumé (`overviewPaneHTML`) : « Ta force » (→ écran Ta force : statut, régions, alertes, projections, « Comment c'est calculé »), « Muscles · 7 derniers jours » (→ écran Muscles : carte du corps mono-teinte, stimulus par muscle, `stimSession`), Derniers records, Avant et maintenant (`thenNowListHTML`), puis lignes Tous les exercices, Statistiques (graphique séances / durée / séries / tonnage par période, habitudes), Objectifs et défis.
- Écrans poussés (`navGo`, glisser depuis le bord gauche pour revenir, position du Résumé conservée).
- **Historique** (`renderHistory`) : un mois à la fois, calendrier ‹ › (`histNav`), pastilles des jours (toucher = séance), « Rewind de <mois> », liste des séances ; détail avec note, Modifier (`histEdit`, copie, « Ignorer les modifications ? »), supprimer (annulable).

**Profil** (`renderProfil`) : carte d'identité (initiale, prénom, « N séances depuis <mois> »), carte Trophées (3 derniers + prochain → feuille avec carte 3D et « Tous les trophées »), Réglages : Objectifs, Réglages des séances (repos, échauffement, étirements, semaine allégée, suggestions de l'app), Matériel, Mes exercices (favoris, exclus, « Sans ton matériel »), Poids du corps / Sons, Clics de l'interface, Retour haptique, Apparence (Clair / Sombre / Automatique, séance en sombre), Motivation (pourquoi, à battre, prochain cap, tendance, avant/maintenant), Données et sauvegarde (sauvegarder, installer, restaurer, exporter CSV, programme IA, stockage, réinitialiser en rouge), À propos (version, sources de l'ascension, avertissement santé). La liste exacte des lignes est vérifiée par v57.

**Mon ascension** (`openAscent`, feuille haute) : scène réelle recadrée sous la voie, HUD, carte « prochain objectif » (nom, distance, délai `ascEtaLine`), « Cette semaine », liste Vitesse, Étapes, Itinéraire, Carnet de route, Trophées, Pause (chaque ligne pousse son écran), bouton ⓘ « Comment ça marche ». Toucher la montagne ouvre une bulle (`ascBubble`). Le grimpeur rejoue la montée depuis la dernière visite. Moteur `ascent()` recalculé depuis l'historique : 13 montagnes (Moléson → Everest, puis 2e tour), vitesse = effort × régularité × force, camps toutes les 2–3 séances, semaine sans séance = camp précédent puis « Retour en force » ×2, 2 pauses par trimestre.

**Feuilles communes** : fiche exercice (`showExoInfo`, étoile favori, « Ajouter » selon le contexte), choix d'exercices (`openPicker` : recherche avec alias, Tes habituels, Favoris ; `pickerAsk`), éditeur de séance, programme de la semaine, onboarding, Rewind, bilan image, trophée 3D, toasts avec « Annuler » 5 s.

**Choix actés** : l'éditeur complet ne sert qu'à modifier une séance enregistrée ; trophées dans le Profil ; 158 exercices proposés (`EXOS`), 18 retirés gardés dans `EXOS_ALL`, fusions `EXO_MERGED`.

## 8. Haptique, sons, animations

**Haptique** (fx.js)
- Safari iOS ignore `navigator.vibrate` ; seule la bascule d'un `<input type="checkbox" switch>` natif par un vrai toucher fait vibrer (iOS 18+). Un `.click()` en JavaScript est bloqué.
- Motif : `hxBtn(cls, attrs, html)` rend `<label class=… role="button" tabindex="0" data-a=…>html<input type="checkbox" switch class="hx" tabindex="-1" aria-hidden="true"></label>`. Le dispatcher ignore le clic relayé dont la cible est `.hx` (pas de double déclenchement) ; Entrée / Espace sur un label `role=button|switch` lance l'action. CSS : `.hx` hors écran, `label.btn` non sélectionnable.
- Branché sur : Valider la série (×2), Valider sans chrono, Lancer le chrono (`holdStart`, le bouton remet son input après mise à jour du texte), S'arrêter (pas « Annuler » de la préparation), Ajouter un exercice (×2). Pas sur la barre d'onglets, ni sur la navigation, la fermeture ou « Passer le repos » (règle : la vibration confirme une validation importante).
- Réglage Profil « Retour haptique » (`S.settings.haptic`, actif par défaut, `hapticOn()`). Désactivé, `hxBtn` rend un `<button>` normal. L'interrupteur du réglage lui-même (`hapticSwitch()`) porte l'input natif quand il est coupé, donc l'activer vibre ; le couper ne vibre pas.
- `haptic(ms)` est un no-op (`USE_LEGACY_VIBRATE = false`) gardé pour Android ; appelé à de nombreux endroits (glisser, chiffres, camps, lancement).
- `navigator.vibrate` direct restant : `timer.js` (fin du repos `[120,60,120]`, 3 dernières secondes `10`), hors du drapeau.

**Sons** (sfx.js, Web Audio synthétisé, gamme de do majeur, compresseur en sortie, réverbération partagée `buildReverb` pour les sons musicaux, contexte créé au lâcher du doigt, recréé après > 20 s d'absence, `audioSession.type = "ambient"`)
- Réglages : `sound` (tout) et `uiSound` (clics d'interface, liste `UI_SOUNDS`), anti-rafale.
- Interface (`pop` : glissé de sinus + « toc » feutré `tok`, même famille que l'ouverture des menus) : `tick`, `step` (+/−, molettes), `seg` (segments, puces : écouteur en phase de capture), `toggle` (monte à l'activation avec un reflet de marimba, descend à la coupure), `open` / `close` (dépliage, à ne pas toucher : YaYa les aime), `swipe`, `remove`, `fav`.
- Séance : `set` (marimba « tic-ding »), `beat`, `exo`, `pr` (souffle, cuivres `brass`, `thump`, `sparkle`), `restTick`, `restEnd`, `count`/`go`, `complete` (fanfare de cors `horn` « ta-ta-DAAAM », timbale `timpani`, nappe, cloches ; tenue avec vibrato de 1,25 s), `medal` 1,9 s après si trophée. Ascension : `ascClimb`, `ascCamp`, `ascCampBig`, `ascDown`, `ascSummit`, `ascPlant`. Rewind : bus par diapo (`SFX_BUS`, `rwMute`, `rwDuck`, `rwPad`).
- Contrôle : rendu `OfflineAudioContext` (remplacer `AC`, `SFX_OUT`, `SFX_BUS`) ; crêtes ≈ 0,1–0,16 interface, ≈ 0,48 fin de séance.

**Animations** (langage : départ vif, arrivée `cubic-bezier(.2,.8,.2,1)`)
- Signatures : chiffres qui défilent (`animateCounts`, `data-count`, `data-from`), courbes qui se tracent (`fsDraw`, Tonnage), grimpeur qui avance (`caStep`, `wkClimb`/`wkSeen`), coche de série (`ckPop`/`ckDraw`, `savedFresh`).
- Navigation : fondu + 12 px entre onglets (cascade `.enter` à la première visite seulement), écrans poussés (`navSlide`, `.sheet-kept`), feuilles à ressort, `sh-in`, `morphHeight`/`animateCollapse`, `settleSegs`, `pane-in`.
- Rebonds : `tabPop` (onglet actif), `favPop`, `ckPop`, `badgePop`, `tgBump`, `readyBump`, toast, `ascPop`, `caLand`, `caBadge`, `smPop`, confettis.
- Séance : `valRoll`, `ringBeat`/`breathe`, `sxOver`, `floatText` 2,2 s, « +2,6 m », barre en `scaleX`.
- Autres : exercices en SMIL (`exoAnimSVG`, `data_rigs.js`), Rewind, sommet (`ascShowSummit`), déblocage 3D.
- **Réduire les animations** : `reducedMotion()` (fx.js) et blocs `@media (prefers-reduced-motion:reduce)` dans style.css ; images fixes pour les exercices, Rewind et sommet abrégés, barre « Cette semaine » posée directement, trophée 3D fixe en fondu. Toute nouvelle animation doit avoir sa coupure.

## 9. Décisions prises à ne pas rouvrir

- 100 % local, aucune requête sortante, pas de compte ni de synchronisation.
- Identifiants internes « forge » conservés (voir § 5).
- Trois onglets ; Historique sous Progrès ; pas de swipe entre onglets.
- Pas d'écran de lancement (`startApp` direct) ; mises à jour du service worker silencieuses (pas de « Mise à jour prête »).
- Pas de niveau XP : l'ascension le remplace. Pas de « Bilan de la semaine » ni de bouton Partager en fin de séance (refusés).
- Pas de saisie au clavier des répétitions et de la charge en séance : glisser ou − / +. Gainage : 15 s minimum, la dernière durée est reproposée, pas de raccourcis.
- Un seul orange (régions non colorées) ; police système ; pas de capitales décoratives.
- Une seule façon de créer une séance ; « Programme de la semaine » reste.
- Pas de mode une main, pas de Siri, pas d'export Calendrier.
- Retour haptique seulement sur les validations ; jamais déclenché par un événement automatique.
- Paliers de trophées non gagnés verrouillés (pas d'aperçu).
- Budget de choix par écran (v54) : avant d'ajouter un bouton, dire ce qu'il remplace.

## 10. Bugs connus et « pas fait »

- `timer.js` appelle `navigator.vibrate` directement (fin de repos, 3 dernières secondes), sans passer par `USE_LEGACY_VIBRATE` ni le réglage « Retour haptique » : sans effet sur iPhone, mais vibre sur Android même réglage coupé. À confirmer puis faire passer par `haptic()`.
- Le réglage « Retour haptique » ne coupe pas `haptic()` (déjà no-op) ; il ne concerne que les boutons à switch.
- Tests en échec indépendants des dernières versions : v27 WebKit (retour à la carte 3D mise en avant), v38 (joker selon la date du jour), v39 WebKit (retour sur un onglet sans reconstruction), v47 (propositions guidées par le stimulus). v46 et v14 peuvent dépasser leur délai quand d'autres scripts tournent en parallèle.
- Écarts avec le cap design (§ 2) : échelle de texte, multiples de 8, marge 20 px, sélections à bordure, rebonds hors barre d'onglets.
- Pas fait : espaces insécables automatiques avant « : ; ! ? » ; trophées 2D et 3D tout à fait homogènes ; redessin de la carte des muscles ; vérification de chaque exercice auprès d'une source nommée (NSCA/ACSM) ; essai systématique sur un vrai iPhone (gestes, haptique, zones de sécurité).

## 11. Pièges rencontrés

- `toISOString()` pour une date locale décale d'un jour (UTC) : utiliser `localISO`.
- `closeSheet()` nettoie l'overlay 300 ms plus tard : `overlayGen` évite d'effacer la feuille suivante.
- Voile et boutons partagent `data-a="closesheet"` : cibler `.sheet-hd [data-a="closesheet"]` dans les tests.
- `icon()` sans règle CSS = SVG de 300×150 qui intercepte les clics.
- `box-shadow: inset …, var(--shadow)` avec `--shadow:none` rend la règle invalide.
- `overflow:hidden` coupe aussi la zone de toucher agrandie par `::before`.
- Chromium fige le premier cycle SMIL inséré dans une feuille masquée : `smilKick`.
- Blob refusé par WebKit en navigation privée et pendant `pagehide` : IndexedDB en `ArrayBuffer`, compression sans Blob (`gz`/`gunz`).
- Tout nouveau champ de séance doit entrer dans le format compact (`packSession`), sinon il se perd.
- iOS 26 colore la barre d'état d'après l'élément fixe en haut : bandeau `#sbar`, bulle cachée à `top:-400px`, `syncStatusBar(undefined, true)` pour forcer la relecture.
- Geste qui s'échappe d'une feuille : document décalé ; `position:fixed`, `overscroll-behavior:none`, `resetDocScroll()`.
- `.asc-body` en colonne flexible écrasait un enfant `overflow:hidden` à 0 px : `flex-shrink:0`.
- Un minuteur d'entrée par écran (`markEnter`), sinon cascade rejouée.
- Pas de `requestIdleCallback` sur Safari : différer Three.js (`t3dQuiet`).
- Safari écrit « 0.5 » en `fr-CH` : formater en `fr-FR`.
- Deux onglets ouverts : écoute de `storage` ; un recalcul dérivé ne doit pas écraser l'écriture de l'autre (`persistDerived`, `adoptNewerStored`).
- GitHub Pages renvoie des etag différents d'un serveur à l'autre : ne pas s'en servir pour annoncer une mise à jour.
- `isNewPR` comparait un 1RM arrondi : faux records ; comparer `e1rm` exact.
- Remplacer un bouton haptique pendant son clic : différer (`setTimeout 0`).
- Chemin Chromium non fourni à `tests/run.sh` : toute la partie Chromium échoue avec « Error ».

Ancienne version complète de ce document : commit 8ffd2ac (`git show 8ffd2ac:forge_projet/HANDOFF.md`).
