# Skins

L'habillage du jeu change au fil de la soirée : chaque **skin** reprend l'interface d'un jeu vidéo (polices, bordures,
couleurs, effets) **sans logo ni élément officiel**. La disposition, les tailles et les zones tactiles ne changent pas :
seule la peau change. Référence visuelle validée : **https://claude.ai/code/artifact/63f8e7a3-35e1-4279-886f-feffba7ec5bc** (fait foi) ; copie locale [maquettes/skins.html](maquettes/skins.html) (ouvrir dans un
navigateur, flèches ← → pour changer de skin). Captures du vrai jeu : [maquettes/references/](maquettes/references/).
Bilan du chantier et validation : [skins-suivi.md](skins-suivi.md).

| id | Jeu | Signature |
|---|---|---|
| `dofus` | Dofus 3 | fenêtres ardoise, barre de titre ardoise (bordeaux à motif pour le classement), jaune citron, cases d'inventaire, cœur de PV qui se vide, kamas ✻ |
| `overwatch` | Overwatch | bandeau marine, fond bleu-gris clair, onglet cyan, cartes ardoise, lignes de tableau claires, grande condensée oblique, hexagones à liseré bleu, bandeaux VS biseautés, bouton orange liseré blanc |
| `league-of-legends` | client LoL | bleu abysse, filet or, bandeaux « ▾ SECTION », tableau de stats (ligne surlignée par barre or), choix en losanges, bouton turquoise en flèche, cadres or |
| `rocket-league` | Rocket League | stade de nuit, barres de menu sombres biseautées, barre active bleu pâle lumineuse, fenêtres marine à liseré bleu, titres fins, boutons bleus en parallélogramme, tableau des scores bleu \| chrono \| orange |
| `mario-odyssey` | Mario Odyssey | rouge sur carte du monde, gothique grasse penchée, barre blanche inclinée, étiquettes rouges/grises à case blanche, carte claire à bandeau or-olive, barre blanche à filet or |
| `plague-tale` | A Plague Tale | brume grise, Cinzel + Barlow Condensed, lin #E0CB7D / perle #E3DBBF, filets dorés à encoche, losanges, lignes sombres, cases brunes |

## Rotation
- Le **serveur** choisit le skin et l'envoie dans `GameSnapshot.skin` : la TV et les téléphones changent ensemble, un
  téléphone qui recharge retrouve le bon skin, la sauvegarde le garde.
- Le lobby utilise le thème de base bleu (`skin: null`). L'ouverture de la pièce mène dans la TV et le premier
  skin, tiré au hasard. Culture gênante et ses résultats gardent l'univers courant ; une fois ces résultats quittés,
  une scène de la pièce couvre la bascule vers le prochain skin. Aucun changement pendant une question.
- `assignRoundSkins` (`src/server/engine/planner.ts`) annote les manches selon les frontières `changeSkinAfter`.
  Le plan complet et les univers sont sauvegardés. Les six skins passent dans un ordre mélangé ; après six univers,
  un nouveau cycle mélangé commence, avec un premier skin différent du précédent.
- Sans Culture gênante, ou si ses questions s'épuisent, le skin courant reste jusqu'à la fin. Une partie courte
  ne force pas la visite de tous les univers. Une surprise en dernière manche mène directement à la sortie.
- **Le début et la fin de partie sont toujours en thème de base** (`skin: null`), quel que soit le dernier univers :
  le lobby avant l'ouverture, puis, après le dernier jeu, la sortie de la TV revient au thème de base pour la
  cérémonie et le classement final (et minuit, qui se déclenche aussi sur le thème de base). Ces écrans n'ont donc
  pas à être habillés par un skin ; la galerie des animations les affiche aussi en thème de base.

L’ambiance musicale suit le même skin, au moment de la bascule serveur dans la scène. Chaque univers possède une
boucle originale embarquée ; elle continue entre intro, jeu et résultats. L’accueil garde le jazz et la sortie
arrête l’ambiance pour la fanfare finale. Sources et écoute : [ambiances-musicales.md](ambiances-musicales.md).

## Architecture front
- `html[data-skin="<id>"]` porte le skin courant (posé par `SkinProvider`, `src/web/theme/skin.tsx`, à partir du
  snapshot). `useSkin()` donne l'id aux composants qui ont une variante de structure (chrono, fond).
- **Un fichier par skin** : `src/web/theme/skins/<id>.css`, importé par `theme.css`. Tout y est préfixé
  `html[data-skin="<id>"]`. Un skin contient, dans cet ordre :
  1. **Jetons** : il redéfinit *tous* les jetons du thème (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`,
     `--gradient-*`, voir « Jetons » ci-dessous) : tout écran qui n'utilise que les classes du thème est alors habillé.
  2. **Composants** : la forme propre au jeu, en ciblant les marqueurs `data-ui` (ci-dessous) et leurs états `data-*`.
  3. **Fond** (`[data-ui="backdrop"]`) et **animations** propres au skin.
- Jamais de règle de skin qui dépend d'un mini-jeu précis : un skin ne connaît que les marqueurs `data-ui`, les titres
  (`h1`, `h2`) et les jetons. Un mini-jeu ne connaît aucun skin.

Pour travailler un skin : ajouter `?skin=<id>` à l'URL de la TV ou du téléphone force ce skin sur cet appareil
(mémorisé ; `?skin=` l'oublie). Outil de dev uniquement.

### Jetons
`--color-bg`, `--color-bg-2`, `--color-bg-3`, `--color-surface`, `--color-surface-strong`, `--color-line`, `--color-ink`,
`--color-ink-muted`, `--color-accent`, `--color-accent-strong`, `--color-accent-deep`, `--color-accent-ink`,
`--color-hot`, `--color-cool`, `--color-good`, `--color-good-deep`, `--color-bad`, `--color-bad-deep`, `--color-warn`,
`--font-display`, `--font-sans`, `--font-num` (chiffres : chrono, scores), `--radius-card`, `--radius-btn`, `--radius-chip`,
`--shadow-card`, `--shadow-glow`, `--shadow-btn`, `--scrim-blur` (flou du voile des dialogues et de la pause), `--gradient-bg`, `--gradient-gold`, `--gradient-hot`, `--gradient-glass`.
Les jetons de contenu (couleurs du Simon, des étages de tier-list, des feutres, QR code) ne changent pas avec le skin.
Le mode « sérieux » de Culture gênante (`--color-serious-*`, `--font-serious`, `--gradient-serious`) et `--color-shade` (ombre
portée des objets du décor) sont **dérivés** des jetons du skin dans `theme.css` (`html[data-skin]`) : un skin ne les
redéfinit pas.

### Marqueurs `data-ui`
| Marqueur | Composant | États / parties |
|---|---|---|
| `stage-tv`, `stage-phone` | `TvStage`, `PhoneStage` | |
| `backdrop` | `Backdrop` | rendu propre au skin |
| `panel` | `Panel` | `panel-title` (prop `title`, facultative) |
| `button` | `Button` | `data-variant` (`primary`, `secondary`, `danger`, `ghost`, `good`, `bad`), `data-size` |
| `choice` | `Choice` (carte de choix cliquable des téléphones et ses reflets TV) | `data-tone` (`glass`, `cool`, `hot`, `good`, `bad`, `plain`, `flat`), `data-selected`, `data-state` (`idle`, `correct`, `wrong`, `faded`), parties `choice-key`, `choice-label`, `choice-check` |
| `result-bar` | `ResultBar` (barre de résultat animée) | `data-highlight`, partie `result-bar-fill` |
| `countdown` | `Countdown` | `data-low`, `data-variant` (voir « Chrono »), `--p` = part restante (0 → 1) |
| `avatar` | `PlayerAvatar` | `data-frame`, `data-dimmed`, parties `avatar-face` (portrait : forme, fond), `avatar-frame` (SVG), `avatar-frame-outer`, `avatar-frame-inner`, `avatar-badge` |
| `avatar-option` | choix de l'avatar du profil | `data-selected` ; les aperçus réutilisent `PlayerAvatar` |
| `frame-summon` | invocation du cadre (gacha) sur le téléphone | `data-phase`, `data-rarity` ; parties `summon-stage`, `summon-card`, `summon-beam`, `summon-rays`, `summon-flash`, `summon-result` (`data-frame`, `data-rarity`), `rarity-tag` |
| `remove-player` | croix de retrait d'un joueur dans le lobby TV | action distincte des cartes de choix ; fond uni rouge vif (Overwatch) ou rouge sombre (LoL) |
| `text-field`, `text-field-shell` | champs de pseudo, mot et phrase ; enveloppe des préfixes et compteurs | `:focus`, `::placeholder` ; garder les bordures d'état (`border-good`…) |
| `animated-number` | grand chiffre animé | le skin peut régler son ombre sans changer le mouvement |
| `roster`, `roster-item` | `AnsweredRoster` | `data-done` |
| `answered-count` | `AnsweredCount` | |
| `selected-badge` | `SelectedBadge` | |
| `numpad`, `numpad-key` | `NumPad` | |
| `duel-gauge` | `DuelGauge` (jauge bilatérale OUI / NON) | parties `duel-gauge-left` (good), `duel-gauge-right` (bad), `duel-gauge-mid` |
| `tool`, `toolbar` | outils de dessin (barre + boutons feutre / épaisseur / annuler / effacer) | `data-selected`, `data-kind` (`pen`, `width`, `action`) ; les feutres (`pen`) gardent leur couleur |
| `tier-row`, `tier-label` | étages d'une tier list (rangée + pastille d'étage, aussi sur le téléphone) | `data-tier` ; la couleur de l'étage est du contenu |
| `pad`, `hub` | pastilles colorées de Simon et disque central | `pad` : couleur et forme fixes, un skin ne les recolore pas |
| `vote-dots` | `VoteDots` | |
| `dialog` | `ConfirmDialog` | |
| `game-frame` | cadre commun de l'écran d'un mini-jeu sur la TV (jeu et résultats, hors interludes) : invisible dans le thème de base, le skin le dessine en fenêtre de son jeu | parties `game-frame-title` (nom du jeu, masqué par défaut : `display` à rétablir), `game-frame-body` |
| `round-header`, `round-tag` | en-tête TV d'une manche (`PlayingScreen`, `IntroScreen`) | `round-game-name` : masqué sous un skin, car le nom est déjà dans `game-frame-title` ; conservé en thème de base |
| `host-bar`, `host-button` | `HostBar` | |
| `score-row` | lignes de classement (résultats, final, téléphone) | `data-rank`, `data-highlight` |
| `podium` | podium du classement final | |
| `paused` | `PausedOverlay` | |
| `room-scene` | scène de la pièce (ouverture, changement, sortie) | `data-kind`, `data-stage`, `data-room-skin` |

### Chrono
`Countdown` a une variante de structure par skin (`data-variant`), qui suit la deadline serveur : il garde le même
encombrement, seule la forme change.
| Skin | Variante |
|---|---|
| `dofus` | `heart` : cœur de PV rouge qui se vide du haut vers le bas, chiffre blanc cerné |
| `overwatch` | `hex` : chiffre marine dans un hexagone blanc |
| `league-of-legends` | `ring` : anneau or qui se vide, cartouche de niveau dessous |
| `rocket-league` | `scoreboard` : bloc bleu \| `0:12` \| bloc orange, chiffres fins |
| `mario-odyssey` | `coin` : rond or façon bouton « A » |
| `plague-tale` | `ring` (fin, or) |
Sur le téléphone, le chrono garde une forme compacte (barre) habillée par le skin.

### Avatars et cadres : contrat commun
Le profil conserve ses identifiants d'avatar et de cadre ; un changement de skin ne les modifie pas.
`PlayerAvatar` affiche le portrait prédéfini et `AvatarFrame` trace le décor, sans connaître les skins.
Pour remplacer les emojis par d'autres portraits, modifier le contenu de `PlayerAvatar` (déjà prévu pour les avatars à image :
`avatar-images.ts`) : les choix du profil, l'invocation des cadres et les écrans de jeu en profitent ensemble.

Le skin définit sa silhouette avec `--avatar-radius`, `--avatar-clip` et les trois commutateurs
`--avatar-circle`, `--avatar-square`, `--avatar-hexagon` (`inline` pour la forme choisie, `none` pour les autres).
Par défaut : cercle, rayon `50%`, aucun découpage. Dofus, Rocket League et Plague Tale emploient le carré
arrondi (`.2em`), Overwatch l'hexagone, LoL et Mario le cercle. Portrait, cadre et boutons du profil suivent ces jetons.
Les tracés SVG normalisés suivent toutes les tailles (`xs` à `2xl`). Les effets `.frame-*` dessinent les traits
extérieur/intérieur : ne pas ajouter de masque radial ni faire tourner la silhouette. Les pointillés épousent le tracé
et les étincelles scintillent en opacité. Le badge reste à l'extérieur du portrait, sans être coupé.

**Cadres à identité** (dix cadres au total : `none`, `dashed`, `double`, `gold`, `neon`, `sparkle` + quatre nouveaux). Les quatre nouveaux
respectent ce contrat : ils s'adaptent aux trois formes (cercle, carré arrondi, hexagone) sans que les skins aient à les redessiner.
- `saiyan` (Aura Super Saiyan) : trait or et flammes dorées fixes de deux hauteurs autour du contour.
- `geass` (Sceau du Geass) : trait rouge pointillé en double et quatre oiseaux rouges stylisés aux diagonales.
- `karmine` (Bleu Karmine) : double filet bleu Karmine, sobre, quatre losanges aux points cardinaux.
- `tournesol` (Pétales de tournesol) : deux couronnes de pétales jaune/orangé, trait brun.
Les ornements sont tracés par `Decor` dans `AvatarFrame.tsx` : un groupe par forme (`data-avatar-shape`), affiché par les mêmes
commutateurs `--avatar-circle|square|hexagon` que les traits ; leurs positions suivent le contour réel de la forme (cercle, carré
ou hexagone), donc le skin qui change de silhouette change aussi leur disposition. L'identité par skin passe par des variables
(`--frame-saiyan-flame|edge|core`, `--frame-karmine`, `--frame-karmine-light`, `--frame-petal`, `--frame-petal-back`, `--frame-petal-edge`,
`--frame-geass`, `--frame-geass-glow`, `--frame-geass-dark`, `--frame-glow` pour l'intensité des halos) : valeurs par défaut dans `theme.css`,
surcharge en fin de chaque `skins/<id>.css` (ex. Dofus : flammes orangées à contour brun, halos réduits ; Plague Tale : teintes ternies ;
LoL : flammes or hextech et filet parchemin ; Rocket League : flammes de boost ; Overwatch : bleu et orange vifs ; Mario : couleurs franches à contour épais).
Un nouveau skin règle ces variables ; s'il ne le fait pas, le thème de base s'applique. Ces ornements restent fixes ; l'invocation
anime des calques CSS en `transform` / `opacity` sans redessiner les tracés SVG.

### Animations
- **Changement de skin** : scène de la pièce synchronisée par le serveur, après les résultats de Culture gênante.
  Le décor et la signature visuelle ne jouent qu'à ce moment. L'ancien rideau automatique est supprimé.
- **Propres au skin** : réaction au toucher des boutons et des choix, mise en avant du choix sélectionné, chrono, fond
  d'ambiance (lent et léger), apparition des panneaux. Chaque skin définit les siennes, dans son fichier.
- Animations toujours jouées, même si l'appareil demande de réduire les animations (`prefers-reduced-motion` ignoré : c'est un jeu de soirée) ; pas de `filter: blur` ni d'animation lourde sur les téléphones.
- Fluidité des scènes de la pièce (TV) : n'animer que `transform`/`opacity`, dessins complexes en images fixes, pas
  de SVG animé ni de `composite: "add"` — règles complètes : [Performance des scènes](mise-en-scene.md#performance-des-scènes).

## Ajouter un skin
1. Ajouter l'id dans `SKINS` (`src/shared/skins.ts`).
2. Créer `src/web/theme/skins/<id>.css` (jetons + composants + fond + animations) et l'importer dans `theme.css`.
3. Ajouter la variante de chrono si besoin (`Countdown`) et les polices (`@fontsource`, importées dans `main.tsx`) ; chaque `--font-*` commence par `"Twemoji"` (emojis embarqués).
4. Vérifier tous les écrans dans le nouveau skin : `CAPTURES_SKIN=<id> bun run captures:skin` (spec `tests/e2e/skins-captures.spec.ts`)
   photographie la TV (1920x1080) et des téléphones 360x640 : lobby, profil, intro/jeu/choix/résultats de chaque
   mini-jeu, pause, confirmation, classement final. PNG dans `test-results/skins/<id>/` (ou `CAPTURES_DIR=<dossier>`),
   nommés `<n°>-<jeu>-<étape>-tv|tel.png`. Le skin est forcé sur tous les appareils ; sans `CAPTURES_SKIN`, le spec est ignoré.

Pour vérifier les téléphones iPhone ou Firefox :
`CAPTURES_SKIN=<id> CAPTURES_DIR=$PWD/captures/<id>/webkit bunx playwright test skins-captures --project=webkit --workers=1`
(remplacer `webkit` par `firefox` selon le moteur). La TV reste un Chromium, forcé sur le même skin.
`13-avatars-skins.spec.ts` invoque chacun des dix cadres (tirage forcé) et vérifie leur conservation après rechargement sur les trois
moteurs ; ses captures des cadres et du profil 360×640 sont dans `test-results/`.

Les sauvegardes antérieures restent utilisables : les skins retirés sont écartés de l'ordre sauvegardé ; un ancien
portrait personnalisé devient l'avatar Renard, en conservant pseudo, cadre, couleur, score et jeton de reconnexion.
