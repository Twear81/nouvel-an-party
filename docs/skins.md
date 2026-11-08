# Skins

L'habillage du jeu change au fil de la soirée : chaque **skin** reprend l'interface d'un jeu vidéo (polices, bordures,
couleurs, effets) **sans logo ni élément officiel**. La disposition, les tailles et les zones tactiles ne changent pas :
seule la peau change. Référence visuelle validée : [maquettes/skins.html](maquettes/skins.html) (ouvrir dans un
navigateur, flèches ← → pour changer de skin).

| id | Jeu | Signature |
|---|---|---|
| `dofus` | Dofus 3 | fenêtres ardoise, barre de titre ardoise (bordeaux à motif pour le classement), jaune citron, cases d'inventaire, cœur de PV qui se vide, kamas ✻ |
| `overwatch` | Overwatch | bandeau marine, fond bleu-gris clair, onglet cyan, cartes ardoise, lignes de tableau claires, grande condensée oblique, hexagones à liseré bleu, bandeaux VS biseautés, bouton orange liseré blanc |
| `league-of-legends` | client LoL | bleu abysse, filet or, bandeaux « ▾ SECTION », tableau de stats (ligne surlignée par barre or), choix en losanges, bouton turquoise en flèche, cadres or |
| `rocket-league` | Rocket League | stade de nuit, barres de menu sombres biseautées, barre active bleu pâle lumineuse, fenêtres marine à liseré bleu, titres fins, boutons bleus en parallélogramme, tableau des scores bleu \| chrono \| orange |
| `gunz` | GunZ | fond noir, bandeau métal à rivets, titre vert lumineux, cadres métal vissés, ligne sélectionnée blanche texte noir, boutons gris en relief, LED rouge |
| `mario-odyssey` | Mario Odyssey | rouge sur carte du monde, gothique grasse penchée, barre blanche inclinée, étiquettes rouges/grises à case blanche, carte claire à bandeau or-olive, barre blanche à filet or |
| `plague-tale` | A Plague Tale | brume grise, Cinzel + Barlow Condensed, lin #E0CB7D / perle #E3DBBF, filets dorés à encoche, losanges, lignes sombres, cases brunes |

## Rotation
- Le **serveur** choisit le skin et l'envoie dans `GameSnapshot.skin` : la TV et les téléphones changent ensemble, un
  téléphone qui recharge retrouve le bon skin, la sauvegarde le garde.
- `config/partie.yaml` : `skins` (liste des skins utilisés, dans l'ordre) et `skins_ordre` (`melange` = ordre tiré au
  hasard au lancement de la partie, `liste` = ordre de la liste).
- Lobby : premier skin de la liste. Au lancement, l'ordre de la partie est fixé (et sauvegardé), puis
  `skinForRound(ordre, indexManche, totalManches)` (`src/shared/skins.ts`) répartit les skins en tranches égales du plan :
  chacun passe une fois. 14 manches → un changement toutes les 2 manches. Moins de manches que de skins → on en voit
  autant que de manches. Classement final : skin de la dernière manche.
- Le skin ne change **qu'à l'annonce d'une manche** (phase `intro`), jamais pendant une question.

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

### Jetons
`--color-bg`, `--color-bg-2`, `--color-bg-3`, `--color-surface`, `--color-surface-strong`, `--color-line`, `--color-ink`,
`--color-ink-muted`, `--color-accent`, `--color-accent-strong`, `--color-accent-deep`, `--color-accent-ink`,
`--color-hot`, `--color-cool`, `--color-good`, `--color-good-deep`, `--color-bad`, `--color-bad-deep`, `--color-warn`,
`--font-display`, `--font-sans`, `--font-num` (chiffres : chrono, scores), `--radius-card`, `--radius-btn`, `--radius-chip`,
`--shadow-card`, `--shadow-glow`, `--shadow-btn`, `--gradient-bg`, `--gradient-gold`, `--gradient-hot`, `--gradient-glass`.
Les jetons de contenu (couleurs du Simon, des étages de tier-list, des feutres, mode « sérieux » de Culture gênante,
QR code) ne changent pas avec le skin.

### Marqueurs `data-ui`
| Marqueur | Composant | États / parties |
|---|---|---|
| `stage-tv`, `stage-phone` | `TvStage`, `PhoneStage` | |
| `backdrop` | `Backdrop` | rendu propre au skin |
| `panel` | `Panel` | `panel-title` (prop `title`, facultative) |
| `button` | `Button` | `data-variant` (`primary`, `secondary`, `danger`, `ghost`, `good`, `bad`), `data-size` |
| `choice` | `Choice` (carte de choix cliquable des téléphones et ses reflets TV) | `data-selected`, `data-state` (`idle`, `correct`, `wrong`, `faded`), parties `choice-key`, `choice-label`, `choice-check` |
| `result-bar` | `ResultBar` (barre de résultat animée) | `data-highlight`, partie `result-bar-fill` |
| `countdown` | `Countdown` | `data-low`, `data-variant` (voir « Chrono »), `--p` = part restante (0 → 1) |
| `avatar` | `PlayerAvatar` | `data-dimmed`, partie `avatar-badge` |
| `roster`, `roster-item` | `AnsweredRoster` | `data-done` |
| `answered-count` | `AnsweredCount` | |
| `selected-badge` | `SelectedBadge` | |
| `numpad`, `numpad-key` | `NumPad` | |
| `vote-dots` | `VoteDots` | |
| `dialog` | `ConfirmDialog` | |
| `round-header`, `round-tag` | en-tête TV d'une manche (`PlayingScreen`, `IntroScreen`) | |
| `host-bar`, `host-button` | `HostBar` | |
| `score-row` | lignes de classement (résultats, final, téléphone) | `data-rank`, `data-highlight` |
| `podium` | podium du classement final | |
| `paused` | `PausedOverlay` | |
| `skin-transition` | rideau de changement de skin | |

### Chrono
`Countdown` a une variante de structure par skin (`data-variant`), qui suit la deadline serveur : il garde le même
encombrement, seule la forme change.
| Skin | Variante |
|---|---|
| `dofus` | `heart` : cœur de PV rouge qui se vide du haut vers le bas, chiffre blanc cerné |
| `overwatch` | `hex` : chiffre marine dans un hexagone blanc |
| `league-of-legends` | `ring` : anneau or qui se vide, cartouche de niveau dessous |
| `rocket-league` | `scoreboard` : bloc bleu \| `0:12` \| bloc orange, chiffres fins |
| `gunz` | `led` : afficheur LED rouge dans un cadre arrondi |
| `mario-odyssey` | `coin` : rond or façon bouton « A » |
| `plague-tale` | `ring` (fin, or) |
Sur le téléphone, le chrono garde une forme compacte (barre) habillée par le skin.

### Animations
- **Changement de skin** : rideau neutre (6 volets qui balaient l'écran, ~0,6 s), le skin bascule au milieu.
  Pas d'annonce ni de texte.
- **Propres au skin** : réaction au toucher des boutons et des choix, mise en avant du choix sélectionné, chrono, fond
  d'ambiance (lent et léger), apparition des panneaux. Chaque skin définit les siennes, dans son fichier.
- Tout respecte `prefers-reduced-motion` ; pas de `filter: blur` ni d'animation lourde sur les téléphones.

## Ajouter un skin
1. Ajouter l'id dans `SKINS` (`src/shared/skins.ts`).
2. Créer `src/web/theme/skins/<id>.css` (jetons + composants + fond + animations) et l'importer dans `theme.css`.
3. Ajouter la variante de chrono si besoin (`Countdown`) et les polices (`@fontsource`, importées dans `main.tsx`).
4. Vérifier tous les écrans dans le nouveau skin (`tests/e2e/zz-skins.spec.ts` prend les captures).
