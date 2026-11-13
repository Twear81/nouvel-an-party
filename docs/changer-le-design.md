# Changer le design

Tout le look du jeu est centralisé dans `src/web/theme/`. Les composants et les mini-jeux n'utilisent **jamais** de couleur écrite en dur :
ils emploient les classes Tailwind issues du thème (`bg-surface`, `text-accent`, `font-display`, `rounded-card`, `shadow-glow`…).

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Couleurs, polices, rayons, ombres, dégradés, animations | `src/web/theme/theme.css` (bloc `@theme static`) |
| Cadres d'avatar (tracés SVG et décor CSS) | `src/web/ui/AvatarFrame.tsx` + `src/web/theme/theme.css` (section « Avatars », classes `.frame-*`) |
| Liste des avatars, cadres proposés, couleurs de profil | `src/web/theme/profile-options.ts` |
| Formes des confettis (tournesol, chou-fleur, boule de cristal, balle de ping-pong, patte…) | `src/web/theme/confetti-shapes.ts` |
| Boules de cristal du lobby, Shenron, bandes de cinéma de la pause, couleurs des temps intermédiaires | `theme.css` (`--color-dragonball*`, `--color-shenron*`, `--color-cinema*`, `--color-split-*`), `src/web/theme/assets/shenron.svg` |
| Fonts embarquées | `src/web/main.tsx` (imports `@fontsource…`) + `--font-*` dans `theme.css` |

### Palette
Dans `theme.css`, modifier les variables `--color-*` :
`bg` / `bg-2` / `bg-3` (fonds de nuit), `surface` (verre), `ink` / `ink-muted` (textes), `accent*` (or champagne),
`hot` (bleu électrique dans le thème de base), `cool`, `good` / `bad` / `warn` (états), `qr-dark` / `qr-light` (QR code, garder un fort contraste).
Les dégradés (`--gradient-bg`, `--gradient-gold`…) sont construits à partir de ces couleurs.
Classes disponibles : `bg-bg`, `text-ink`, `text-ink-muted`, `bg-accent`, `text-accent`, `bg-gold`, `bg-night`, `glass`, `text-gold-gradient`…

Le mode « sérieux » de Culture gênante (décor sombre, typo solennelle) a ses propres jetons : `--color-serious-*`, `--font-serious`, `--gradient-serious` (classes `bg-serious`, `text-serious-ink`, `font-serious`…), dans la section `culture-genante` de `theme.css`. Sous un skin, ces jetons sont **dérivés** de ceux du skin (fond plus sombre et désaturé, texte et accent éclaircis pour rester lisibles même si le skin est clair, police `--font-sans`) par la règle `html[data-skin]` de la même section : le mode sérieux reste dans l'univers du skin. `--color-shade` (ombre portée d'un objet posé sur le décor) suit la même logique.

### Polices
Les polices sont installées en local (pas d'internet pendant la soirée).
1. `bun add @fontsource/<nom>` (ou `@fontsource-variable/<nom>`)
2. L'importer dans `src/web/main.tsx`
3. Mettre son nom dans `--font-display` (titres, gros chiffres) ou `--font-sans` (texte) de `theme.css`.

**Emojis** : embarqués aussi (police Twemoji en couleur, paquet `twemoji-colr-font`, `@font-face` en tête de
`theme.css`), pour qu'ils soient identiques sur la TV, les iPhone et les Android, sans police système. Toute pile
`--font-*` (thème de base comme skins) **commence par `"Twemoji"`** : l'`unicode-range` de la police la réserve aux
emojis, le texte passe à la police suivante. Un nouveau skin doit garder ce premier élément.

### Avatars, cadres, couleurs
- `AVATARS` : ajouter `{ id, label, emoji }`. L'`id` est enregistré dans le profil : ne pas renommer un id existant en cours de soirée.
  Vérifier que l'emoji existe dans Twemoji 15 (police embarquée : un emoji plus récent s'afficherait en carré).
  **Avatar à image** (ce qui n'a pas d'emoji : chou-fleur, tiramisu, boule à 4 étoiles) : déposer un SVG statique carré
  (viewBox 128, sans animation) dans `src/web/theme/assets/avatars/`, le déclarer dans `src/web/theme/avatar-images.ts`
  (clé = id) et mettre `image: true` sur l'entrée de `AVATARS` ; `emoji` reste obligatoire (repli des textes et de la
  signature Overwatch). `PlayerAvatar` affiche l'image à la place de l'emoji (même encombrement) : choix, aperçus,
  TV et skins en profitent. Les images sont dans un module à part pour que les tests (qui importent `profile-options.ts`) ne chargent pas de SVG.
- `FRAMES` : ajouter `{ id, label, className, rarity }` puis écrire la classe `.frame-<nom>` dans `theme.css`
  (`--p` = couleur du joueur ; traits SVG `avatar-frame-outer` / `avatar-frame-inner`, coordonnées sur 100).
  Le skin choisit la silhouette via les jetons `--avatar-*` : voir [le contrat des avatars](skins.md#avatars-et-cadres--contrat-commun).
  Ne pas redessiner le portrait dans le profil : les choix et aperçus réutilisent `PlayerAvatar`.
  Un cadre à ornements (flammes, pétales, sceaux) les déclare dans `Decor` d'`AvatarFrame.tsx` : ils sont posés le long du
  contour de chaque forme (cercle, carré, hexagone) et colorés par des variables `--frame-*` que chaque skin peut régler
  (voir [skins.md](skins.md#avatars-et-cadres--contrat-commun)). Ces ornements sont fixes : l'invocation anime ses calques CSS
  en `transform` / `opacity`, sans redessiner le SVG du portrait.
- **Invocation (gacha)** : le téléphone ne propose pas de liste de cadres. `FrameSummon` (`src/web/ui/FrameSummon.tsx`)
  tire un cadre : « Invoquer » puis « Relancer », animation d'environ 1,5 s (lumière et carte, couleur par rareté), puis le
  cadre apparaît sur l'avatar. Rareté de chaque cadre = champ `rarity` de `FRAMES` (`R` : aucun, pointillés, double ;
  `SR` : or, néon, Bleu Karmine, pétales de tournesol ; `SSR` : étincelles, Aura Super Saiyan, Sceau du Geass). Chances
  `RARITY_RATES` = 60 % R, 30 % SR, 10 % SSR (puis cadre au hasard dans la rareté) ; étoiles `RARITY_STARS` (3 / 4 / 5).
  Les couleurs de rareté sont `--rarity-r|sr|ssr` dans `theme.css`. Le tirage utilise `Math.random` côté téléphone (choix de
  profil, validé par le schéma côté serveur) ; vibration courte au SR/SSR sur Android.
  **Tests** : `localStorage["summon-force"] = "<id du cadre>"` impose le prochain tirage ; l'E2E utilise
  `summonFrame(page, id)` (`tests/e2e/helpers/party.ts`). `data-testid` : `frame-summon` (`data-phase` = idle | summoning | done),
  `frame-summon-button`, `frame-result` (`data-frame`, `data-rarity`), `frame-name`. `frame-summon` porte aussi `data-frame`.
- `COLORS` : liste de couleurs hex.

## Où est chaque écran

| Écran | Fichier |
|---|---|
| Routage TV (phases, pause, bande du maître) | `src/web/tv/TvApp.tsx` |
| Minuit : compte à rebours + « Bonne année » (TV et téléphones, thème de base) et feu d'artifice | `src/web/ui/Midnight.tsx`, `src/web/ui/Fireworks.tsx` (keyframes `firework-spark` dans `theme.css`) |
| TV lobby (QR, joueurs avec bouton « retirer », 7 boules de cristal, réglage des manches) | `src/web/tv/Lobby.tsx`, `src/web/ui/DragonBalls.tsx` |
| TV annonce de manche | `src/web/tv/IntroScreen.tsx` |
| Pièce : ouverture, changement d'univers et sortie | `src/web/ui/RoomTransition.tsx`, `src/web/ui/RoomSignature.tsx`, `src/web/theme/room.css`, `src/shared/transitions.ts` |
| TV manche en cours (en-tête + chrono) ; un jeu interlude s'affiche en plein écran, sans cadre | `src/web/tv/PlayingScreen.tsx` |
| TV résultats (points gagnés, « Continuer ») | `src/web/tv/ResultsScreen.tsx` |
| TV cérémonie (souvenirs, bonus, étoiles) | `src/web/tv/CeremonyScreen.tsx`, `src/web/tv/scene/`, `src/web/theme/ceremonie.css`, `src/web/theme/ceremonie-assets.ts` (images et points d'ancrage) |
| TV classement final (conversion des étoiles, tableau d'honneur, podium, confettis) | `src/web/tv/FinalScreen.tsx`, `src/web/ui/HonorBoard.tsx`, `src/web/ui/Podium.tsx` |
| Contrôles du maître du jeu (Pause, Passer, +10 s, Lobby : bande fine toujours visible en bas à droite) | `src/web/tv/HostBar.tsx` |
| Routage téléphone + lobby/intro/résultats/final | `src/web/phone/PhoneApp.tsx` |
| Création / édition du profil (avatar, couleur, invocation du cadre) | `src/web/phone/ProfileEditor.tsx`, `src/web/ui/FrameSummon.tsx` |
| Mini-jeu « Qui est le plus… ? » | `src/minigames/qui-est-le-plus/views.tsx` |
| Mini-jeu « Ceci ou Cela » (deux réponses face à face, camps en résultats) | `src/minigames/ceci-ou-cela/views.tsx` |
| Mini-jeu « Culture gênante » (interlude : une scène par fichier, `Accroche`, `Bascule`, `Question`, `Reveal`, `Phone`) | `src/minigames/culture-genante/` |
| Mini-jeu « Dessin raté » (page de dessin tactile, mosaïque, révélation ; couleurs = jetons `--color-paper` et `--color-pen-0…4` du thème) | `src/minigames/dessin-rate/views.tsx`, `drawing.tsx` |

## Skins

Le décor canonique de la pièce est `src/web/theme/assets/piece-reference.png`. La scène reprend ses coordonnées
et les vrais `PlayerAvatar` ; les portraits ne sont pas peints dans l'image. La référence approuvée et sa maquette
autonome sont décrites dans [mise-en-scene.md](mise-en-scene.md). Les signatures des six univers sont des calques
de décor dans `room.css`, joués uniquement pendant les changements.
`bun run apercu:transitions` construit une galerie hors ligne dans `captures/transitions/index.html` :
elle réutilise les composants du jeu et propose lecture, pause et déplacement dans les six scènes.

Le jeu change d'habillage au fil de la soirée (6 skins qui imitent des interfaces de jeux vidéo) : tout est dans [skins.md](skins.md). En bref : `SkinProvider` (`src/web/theme/skin.tsx`) pose `html[data-skin]` ; **un fichier CSS par skin** (`src/web/theme/skins/<id>.css`) redéfinit les jetons puis habille les composants via leurs marqueurs `data-ui` (`panel`, `button`, `choice`, `result-bar`, `countdown`, `avatar`, `score-row`…, tableau dans skins.md). Pour qu'un écran soit habillable : n'utiliser que les composants de `src/web/ui` et les classes du thème ; une zone neuve et récurrente reçoit son `data-ui` (et ses `data-*` d'état) dans le composant, jamais de style de skin dans un mini-jeu.

## Galerie des animations

`bun run apercu:animations` construit `captures/animations/index.html` (non commité) : un fichier autonome, ouvrable depuis
le disque, sans serveur ni réseau. Il rejoue **chaque animation et son son** isolément, avec les vrais écrans du jeu
(`TvScreens`, `PhoneScreen`, vues `Tv` / `TvResults` / `Phone` des mini-jeux) et une horloge locale qui remplace `serverNow`
(`imposerHorloge`, `src/web/net/socket.ts`). Menu à gauche (Composants, Chrono, Écrans TV, Mini-jeux), barre de contrôle en
haut : Pause / Rejouer, curseur de temps sur les scènes chronométrées (révélations calées sur `resultsAt`), habillage (thème
de base + 6 skins), 3 ou 8 joueurs (pseudos de 16 caractères), taille du téléphone, bouton son (le premier clic déverrouille
l'audio). Un lien `#scene=jeu/imposteur/vote&skin=dofus&n=8` ouvre une scène précise. La pause fige l'horloge et les
animations CSS ; les ressorts `motion` finissent leur course (utiliser le curseur pour examiner un instant).

Liens de revue à ajouter à l’adresse de `captures/animations/index.html` (fonctionnent aussi sans recharger le fichier) :

- `#scene=ecrans/minuit&n=8&tel=360x640` : 15 secondes jusqu’au passage au 1er janvier 2027, puis « Bonne année », sur la
  vraie TV et un téléphone de 360 × 640. Le curseur permet de revoir les dernières secondes ; Continuer reprend le lobby.
  Cet aperçu reprend le thème de base, comme le déclenchement réel de minuit.
- `#scene=ecrans/cadres&n=8&tel=360x640` : les dix cadres réels, sélectionnables, puis le vrai composant d’invocation et
  l’éditeur complet du profil sur téléphone. Les tirages se relancent librement ; Habillage permet de comparer les six skins.
- `#scene=ecrans/clins-doeil&n=8` : temps intermédiaires, pause « À suivre… » et tirs de confettis personnalisés de 32 px.
- `#scene=ecrans/lobby&n=8&tel=360x640` : le lobby commence à deux invités ; Faire arriver un joueur allume les boules.
  La septième lance Shenron, la huitième ajoute la boule bonus. Rejouer recommence à deux.

Les manches de démonstration sont **jouées par la vraie logique du jeu** (`game.ts` dans le faux contexte de
`tests/unit/helpers/minigame-ctx.ts`, config réelle de `config/minijeux/`) : elles restent justes si le jeu change.
Pour ajouter un mini-jeu : une entrée dans `DEMOS` (`scripts/apercu-animations/demos.ts`) = des étapes cumulatives
(`intro`, `jeu`, `resultats`…) dont les `agir(s)` font `s.input(joueur, payload)` / `s.advance(ms)` ; `repondre` alimente le bouton
« Faire répondre le suivant ». Le code de la galerie est dans `scripts/apercu-animations/`.

## Composants réutilisables (`src/web/ui/`)
- `Button`, `ConfirmDialog` (confirmation dans le style du jeu, jamais `window.confirm`), `Icons` (icônes SVG : pause, passer, accueil…), `Panel` (carte en verre, prop `title` facultative), `PlayerAvatar` (avatar + cadre + couleur, tailles `xs`→`2xl`, `AVATAR_REM` = taille en rem).
- `Choice` : carte de choix cliquable du téléphone (réponse, vote, camp, oui / non). Props `selected`, `state` (`idle` / `correct` / `wrong` / `faded`), `keyLabel` (A, B…), `tone` (`glass` par défaut, `cool` / `hot` / `good` / `bad` pleins, `plain`, `flat` sans relief ni anneau), `radius` (`card` / `btn`), `showCheck` (faux pour les petits boutons serrés), ✓ intégré quand `selected` (taille / position via `checkSize`, `checkTone`, `checkClassName`) ; la mise en page vient de `className`. Marqueurs `choice`, `choice-key`, `choice-label`, `choice-check`. Ne plus écrire de `motion.button` de choix à la main.
- `ResultBar` : barre animée (rail + remplissage) pour votes et progressions : `value` 0→1, `highlight` (gagnant), `tone`, `pill`, `delay` / `duration` / `ease` ou `transition` (les valeurs passées sont exactement celles de l'animation : `revealSeconds` s'y fie), contenu libre dans la barre. Marqueurs `result-bar`, `result-bar-fill`.
- `DuelGauge` : jauge bilatérale (deux camps qui poussent l'un vers l'autre, OUI / NON) : `left` et `right` de 0 à 1, gauche `good`, droite `bad`. Marqueurs `duel-gauge`, `duel-gauge-left`, `duel-gauge-right`, `duel-gauge-mid`.
- `Button` : variantes `primary`, `secondary`, `danger`, `ghost`, `good`, `bad` ; tailles `sm` à `xl`, et `hero` (géant, remplit la place : STOP du compte à rebours). Tout bouton d'action d'un mini-jeu (Valider, Voir mon mot, STOP) passe par lui.
- Éléments propres à un jeu mais habillables : `tool` (outil de dessin, `data-kind` `pen` / `width` / `action`, `data-selected`) dans une `toolbar` ; `tier-row` / `tier-label` (`data-tier`) ; `pad` (pastille de Simon) et `hub` (disque central). Les couleurs de contenu (feutres, étages, pastilles de Simon) ne se redéfinissent pas dans un skin.
- `Countdown` (secondes depuis la deadline serveur ; structure selon le skin : cœur, hexagone, anneau, tableau, pièce ; barre compacte sur téléphone ; `--p` = part restante), `Backdrop` (fond étoilé par défaut, redessiné par chaque skin ; calques `backdrop-layer`), `Stage` (cadres TV 16:9 / téléphone, bandeau « Reconnexion… », overlay Pause, `PauseZoom`), `fireConfetti`, `DragonBalls` / `Shenron`, `SplitTime` (voir « Clins d'œil aux invités »).
- `AnsweredRoster` + `AnsweredCount` : barre TV « qui a répondu » (avatars grisés puis ✓, pseudo tronqué, taille selon le nombre de joueurs ; `data-testid` `tv-answered` / `tv-answered-count`, variantes par props : badge, halo, barre de progression, ton « serious »).
- `SelectedBadge` : pastille ✓ animée sur le choix enregistré (tons `ink` / `accent` / `good` / `serious`, tailles `sm` / `md` / `lg`, position par `className`).
- `NumPad` : pavé numérique du téléphone (virgule optionnelle, touches sans effet grisées, ton `serious`) ; la logique de saisie (`pressKey`) reste dans le mini-jeu.
- `VoteDots` : pastilles anonymes de progression d'un vote + compteur.
- `typo`, `fit` (taille de police selon la longueur du texte), `ordinal` (« 1er », « 2e ») : typographie et mise en forme du contenu, dans `typo.ts`.
- **Vie et feedbacks** (`Pop.tsx`, `haptique.ts`) : `Pop` (`value` : petit rebond à chaque changement, `appear` : rebond à l'apparition, `scale`), `CountUp` (`value`, `duration`, `prefix` : nombre qui défile depuis 0), `FlyingPoints` (`value`, `delay` : « +N » fantôme qui jaillit et s'envole, dans un parent `relative`, ne pas le mettre dans un élément lu par les E2E), `WaitingDots` (trois points qui rebondissent : attente), `WatchingEyes` (👀 « regarde la TV »), `useChanged(valeur)` (vrai quand une valeur du snapshot vient de changer, jamais au montage : base de tout effet « ça vient d'arriver » qui ne doit pas se rejouer au rechargement), `haptique(ms)` (vibration Android, ignorée ailleurs ; déjà appelée par `Button` et `Choice`). Tout en `transform` / `opacity`.
- Feedbacks intégrés : `Button` s'enfonce au toucher (ressort) et fait un pop quand il passe de grisé à actif ; `Choice` fait un pop à la sélection et `SelectedBadge` arrive en tournant ; `AnsweredRoster` saute avec un anneau d'éclat quand un joueur répond ; `ResultBar` et `DuelGauge` glissent (`translateX`, jamais `width`) ; `Panel` entre en fondu (`animate-rise`, classe de thème) ; `Countdown` fait battre le **chiffre seul** (`Digits`, marqueur `countdown-digits`, amplitude ≤ 1,15, tremblement à 3-2-1) dans sa boîte fixe : ne jamais animer la boîte du chrono. Classes de thème : `animate-rise`, `animate-breathe`. `prefers-reduced-motion` reste ignoré (voir `docs/skins.md`).
Un mini-jeu ne doit utiliser que ces composants + les classes du thème.

## Clins d'œil aux invités (TV)
Jamais liés à un pseudo (le jeu ne sait pas qui est qui) : ils vivent dans le thème et se retirent sans toucher aux mini-jeux.
- **Lobby, les 7 boules de cristal** (`DragonBalls`, `src/web/ui/DragonBalls.tsx`) : une boule s'allume par joueur prêt (profil validé et connecté ; `data-testid="dragon-balls"`, `data-lit="<n>"`, chaque boule `dragon-ball-<1..8>` avec `data-lit`). Une 8e boule « bonus » apparaît au 8e joueur. L'état vient du snapshot ; l'éclat d'allumage ne se rejoue jamais au rechargement. À 7 joueurs prêts, `Shenron` traverse le décor une fois (`src/web/theme/assets/shenron.svg`, `transform` seulement) et le bouton `start-game` affiche « Faire un vœu » (même bouton, mêmes règles). Pour changer de clin d'œil : retoucher les couleurs `--color-dragonball*` / remplacer `shenron.svg`, ou remplacer `DragonBalls` dans `Lobby.tsx` (il ne reçoit qu'un nombre).
- **Pause en cliffhanger de K-drama** (`PausedOverlay` + `PauseZoom`, `src/web/ui/Stage.tsx`) : l'écran de jeu reste en place sous un voile, zoome en 3 à-coups (`transform: scale`), deux bandes de cinéma se ferment et « À suivre… » s'affiche. Sur la TV, `data-ui="paused-cliffhanger"` : **volontairement indépendant des skins** (couleurs `--color-cinema` / `--color-cinema-ink`), donc lisible partout. Le téléphone garde son « PAUSE » (`data-ui="paused"`). Son : `pause` (accord de piano `pause-piano.wav`, synthétisé ; déposer `pause.mp3` dans `config/medias/sons/` pour un vrai piano).
- **Confettis maison** (`fireConfetti`, `src/web/ui/confetti.ts`) : formes peintes une fois dans un canvas, listées dans `src/web/theme/confetti-shapes.ts` (`CONFETTI_SHAPES` : ajouter / retirer une ligne ; `CONFETTI_CUSTOM_SHARE` = part des formes maison face aux carrés / cercles / étoiles ; `CONFETTI_SCALAR` = taille des formes maison, tirées à part). Même API (`fireConfetti("small" | "big")`), mêmes quantités de particules.
- **Temps intermédiaires façon Trackmania** (`SplitTime`, `src/web/ui/SplitTime.tsx`) : `ms` du joueur + `bestMs` de la manche ; le meilleur affiche son temps, les autres leur retard « +0,42 » (rouge `--color-split-behind`), un temps en avance s'affiche « −0,42 » (bleu `--color-split-ahead`), avec un flash à l'apparition. `data-split="ahead|behind"`, `data-gap-ms`. Utilisé par les résultats du Compte à rebours (classement de droite, `cabr-split-<id>`).

## Dimensions
- TV : la page est dessinée en 1920×1080, `1rem` = 16 px à cette taille et tout s'adapte à la fenêtre (`html[data-app="tv"]` dans `theme.css`).
  Penser en `rem`/classes Tailwind : un `text-7xl` est lisible à 4 m.
- Téléphone : portrait, 360 px minimum, zones sûres (`env(safe-area-inset-*)`) gérées dans `PhoneStage`.

## Règles d'ergonomie (à garder en ajoutant un écran)
- **Rien à deviner** : une action se voit à son apparence (bouton plein, icône + mot), pas à une phrase d'aide ni à un survol. Un état se lit sur l'élément lui-même (✓ sur le choix enregistré, avatars grisés tant qu'on n'a pas répondu, bouton qui dit pourquoi il est inactif). On garde les textes qui portent du contenu (la question, « Anne-Sophie répond pour de vrai »), pas ceux qui expliquent l'interface.
- **Zone du geste « accueil »** : sur iPhone et Android en navigateur, le bas de l'écran porte la barre de geste qui renvoie à l'écran d'accueil ; un bouton collé en bas provoque des faux gestes qui sortent du jeu. `PhoneStage` (`src/web/ui/Stage.tsx`) garde donc une marge basse de `env(safe-area-inset-bottom)` + 1,5 rem pour **tous** les écrans téléphone : un écran n'a rien à faire pour en profiter, mais ne doit pas la contourner (`position: fixed; bottom: 0`, marge négative, bouton minuscule en fin de page). Les gros boutons d'action (Continuer, OUI/NON) peuvent rester en bas de l'écran, simplement décollés du bord. Le test `tests/e2e/09-ergonomie.spec.ts` vérifie qu'aucun contrôle visible n'est à moins de 24 px du bas.
- **8 invités, pseudos de 16 caractères** : tout écran TV doit tenir sans rien couper (lobby, vote, 8 barres de résultats, bande des points, classement). Les téléphones tiennent sur 360×640 sans défiler pour 7 choix ; pour davantage, la liste défile et la question reste visible. Le test `tests/e2e/10-affichage-8-joueurs.spec.ts` le vérifie.
- **Téléphones (Safari iOS 16.4+, Firefox et Chrome Android)** : champs à 16 px minimum (sinon iOS zoome), `touch-action: manipulation` et pas de sélection/menu de copie sur les boutons, pas de « tirer pour rafraîchir » (`overscroll-behavior`), `-webkit-backdrop-filter` (ajouté automatiquement au build), `h-app` à la place de `h-screen` (barre d'URL mobile), pas de `filter: blur` géant (lourd sur iPhone). Ces réglages sont dans `theme.css` (couche `base`).
- **Animations fluides** (TV comme téléphones) : n'animer que `transform` et `opacity` ; pas de propriété SVG ou de peinture animée (`stroke-dashoffset`, `width`, `box-shadow`…), pas de `filter`/`mix-blend-mode` sur un grand calque, pas de recalage d'animation à chaque image. Détails et mesure : [Performance des scènes](mise-en-scene.md#performance-des-scènes).
- **Téléphones modestes (ex. iPhone XR à la batterie usée)** : jamais de flou (`glass`, `backdrop-filter`) au-dessus d'un élément animé — le flou serait recalculé à chaque image ; le fond par défaut est donc figé sur téléphone (`<Backdrop still />` dans `PhoneStage`), et un skin qui anime son fond n'utilise pas de flou. Pas d'animation infinie de `stroke-dashoffset`, `box-shadow` ou `filter` sur un élément toujours visible (cadres d'avatar : scintillement en `opacity`).
- **Temps de réaction** : prendre l'instant du toucher avec `eventTime(e.timeStamp, performance.now())` (`src/shared/clock.ts`), pas `performance.now()` dans le gestionnaire : un téléphone lent à traiter l'événement ne doit pas être pénalisé.

Les textes à dégradé / ellipse qui contiennent des jambages réservent leur encre via `glyph-safe`.
`PlayerAvatar` accepte `crowned` et `crownDelay` : la couronne est ancrée et proportionnelle au portrait, pour les
résultats et le podium. La couronne du dessin gagnant est au-dessus du carré réel, avec une place réservée pour laisser la feuille entièrement visible.
Les règles de camps des skins excluent `selected-badge` et `choice-check` : une pastille de validation reste pleine.

Les écrans TV partagent `--spacing-tv-gutter` (marge extérieure) et `--spacing-tv-panel` (retrait intérieur).
Cadre de jeu, en-tête, bande des points et titres suivent cette grille, même sous un skin.
Les champs texte envoyés de Comme les autres et Split the Room sont réellement désactivés et leur enveloppe porte
`data-sent="true"` : fond atténué, texte grisé et coche de validation conservée.
