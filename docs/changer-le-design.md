# Changer le design

Tout le look du jeu est centralisé dans `src/web/theme/`. Les composants et les mini-jeux n'utilisent **jamais** de couleur écrite en dur :
ils emploient les classes Tailwind issues du thème (`bg-surface`, `text-accent`, `font-display`, `rounded-card`, `shadow-glow`…).

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Couleurs, polices, rayons, ombres, dégradés, animations | `src/web/theme/theme.css` (bloc `@theme static`) |
| Cadres d'avatar (tracés SVG et décor CSS) | `src/web/ui/AvatarFrame.tsx` + `src/web/theme/theme.css` (section « Avatars », classes `.frame-*`) |
| Liste des avatars, cadres proposés, couleurs de profil | `src/web/theme/profile-options.ts` |
| Fonts embarquées | `src/web/main.tsx` (imports `@fontsource…`) + `--font-*` dans `theme.css` |

### Palette
Dans `theme.css`, modifier les variables `--color-*` :
`bg` / `bg-2` / `bg-3` (fonds de nuit), `surface` (verre), `ink` / `ink-muted` (textes), `accent*` (or champagne),
`hot` (rose), `cool`, `good` / `bad` / `warn` (états), `qr-dark` / `qr-light` (QR code, garder un fort contraste).
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
  Pour utiliser des images à la place des emoji, adapter `PlayerAvatar.tsx` (une seule branche à changer).
- `FRAMES` : ajouter `{ id, label, className }` puis écrire la classe `.frame-<nom>` dans `theme.css`
  (`--p` = couleur du joueur ; traits SVG `avatar-frame-outer` / `avatar-frame-inner`, coordonnées sur 100).
  Le skin choisit la silhouette via les jetons `--avatar-*` : voir [le contrat des avatars](skins.md#avatars-et-cadres--contrat-commun).
  Ne pas redessiner le portrait dans le profil : les choix et aperçus réutilisent `PlayerAvatar`.
- `COLORS` : liste de couleurs hex.

## Où est chaque écran

| Écran | Fichier |
|---|---|
| Routage TV (phases, pause, bande du maître) | `src/web/tv/TvApp.tsx` |
| TV lobby (QR, joueurs avec bouton « retirer », réglage des manches) | `src/web/tv/Lobby.tsx` |
| TV annonce de manche | `src/web/tv/IntroScreen.tsx` |
| Pièce : ouverture, changement d'univers et sortie | `src/web/ui/RoomTransition.tsx`, `src/web/ui/RoomSignature.tsx`, `src/web/theme/room.css`, `src/shared/transitions.ts` |
| TV manche en cours (en-tête + chrono) ; un jeu interlude s'affiche en plein écran, sans cadre | `src/web/tv/PlayingScreen.tsx` |
| TV résultats (points gagnés, « Continuer ») | `src/web/tv/ResultsScreen.tsx` |
| TV classement final (révélation, podium, confettis) | `src/web/tv/FinalScreen.tsx` |
| Contrôles du maître du jeu (Pause, Passer, +10 s, Lobby : bande fine toujours visible en bas à droite) | `src/web/tv/HostBar.tsx` |
| Routage téléphone + lobby/intro/résultats/final | `src/web/phone/PhoneApp.tsx` |
| Création / édition du profil | `src/web/phone/ProfileEditor.tsx` |
| Mini-jeu « Qui est le plus… ? » | `src/minigames/qui-est-le-plus/views.tsx` |
| Mini-jeu « Ceci ou Cela » (deux réponses face à face, camps en résultats) | `src/minigames/ceci-ou-cela/views.tsx` |
| Mini-jeu « Culture gênante » (interlude : une scène par fichier, `Accroche`, `Bascule`, `Question`, `Reveal`, `Phone`) | `src/minigames/culture-genante/` |
| Mini-jeu « Dessin raté » (page de dessin tactile, mosaïque, révélation ; couleurs = jetons `--color-paper` et `--color-pen-0…4` du thème) | `src/minigames/dessin-rate/views.tsx`, `drawing.tsx` |

## Skins

Le décor canonique de la pièce est `src/web/theme/assets/piece-reference.png`. La scène reprend ses coordonnées
et les vrais `PlayerAvatar` ; les portraits ne sont pas peints dans l'image. La référence approuvée et sa maquette
autonome sont décrites dans [mise-en-scene.md](mise-en-scene.md). Les signatures des six univers sont des calques
de décor dans `room.css`, joués uniquement pendant les changements, avec un fondu pour le mouvement réduit.
`bun run apercu:transitions` construit une galerie hors ligne dans `captures/transitions/index.html` :
elle réutilise les composants du jeu et propose lecture, pause et déplacement dans les six scènes.

Le jeu change d'habillage au fil de la soirée (6 skins qui imitent des interfaces de jeux vidéo) : tout est dans [skins.md](skins.md). En bref : `SkinProvider` (`src/web/theme/skin.tsx`) pose `html[data-skin]` ; **un fichier CSS par skin** (`src/web/theme/skins/<id>.css`) redéfinit les jetons puis habille les composants via leurs marqueurs `data-ui` (`panel`, `button`, `choice`, `result-bar`, `countdown`, `avatar`, `score-row`…, tableau dans skins.md). Pour qu'un écran soit habillable : n'utiliser que les composants de `src/web/ui` et les classes du thème ; une zone neuve et récurrente reçoit son `data-ui` (et ses `data-*` d'état) dans le composant, jamais de style de skin dans un mini-jeu.

## Composants réutilisables (`src/web/ui/`)
- `Button`, `ConfirmDialog` (confirmation dans le style du jeu, jamais `window.confirm`), `Icons` (icônes SVG : pause, passer, accueil…), `Panel` (carte en verre, prop `title` facultative), `PlayerAvatar` (avatar + cadre + couleur, tailles `xs`→`2xl`, `AVATAR_REM` = taille en rem).
- `Choice` : carte de choix cliquable du téléphone (réponse, vote, camp, oui / non). Props `selected`, `state` (`idle` / `correct` / `wrong` / `faded`), `keyLabel` (A, B…), `tone` (`glass` par défaut, `cool` / `hot` / `good` / `bad` pleins, `plain`, `flat` sans relief ni anneau), `radius` (`card` / `btn`), `showCheck` (faux pour les petits boutons serrés), ✓ intégré quand `selected` (taille / position via `checkSize`, `checkTone`, `checkClassName`) ; la mise en page vient de `className`. Marqueurs `choice`, `choice-key`, `choice-label`, `choice-check`. Ne plus écrire de `motion.button` de choix à la main.
- `ResultBar` : barre animée (rail + remplissage) pour votes et progressions : `value` 0→1, `highlight` (gagnant), `tone`, `pill`, `delay` / `duration` / `ease` ou `transition` (les valeurs passées sont exactement celles de l'animation : `revealSeconds` s'y fie), contenu libre dans la barre. Marqueurs `result-bar`, `result-bar-fill`.
- `DuelGauge` : jauge bilatérale (deux camps qui poussent l'un vers l'autre, OUI / NON) : `left` et `right` de 0 à 1, gauche `good`, droite `bad`. Marqueurs `duel-gauge`, `duel-gauge-left`, `duel-gauge-right`, `duel-gauge-mid`.
- `Button` : variantes `primary`, `secondary`, `danger`, `ghost`, `good`, `bad` ; tailles `sm` à `xl`, et `hero` (géant, remplit la place : STOP du compte à rebours). Tout bouton d'action d'un mini-jeu (Valider, Voir mon mot, STOP) passe par lui.
- Éléments propres à un jeu mais habillables : `tool` (outil de dessin, `data-kind` `pen` / `width` / `action`, `data-selected`) dans une `toolbar` ; `tier-row` / `tier-label` (`data-tier`) ; `pad` (pastille de Simon) et `hub` (disque central). Les couleurs de contenu (feutres, étages, pastilles de Simon) ne se redéfinissent pas dans un skin.
- `Countdown` (secondes depuis la deadline serveur ; structure selon le skin : cœur, hexagone, anneau, tableau, pièce ; barre compacte sur téléphone ; `--p` = part restante), `Backdrop` (fond étoilé par défaut, redessiné par chaque skin ; calques `backdrop-layer`), `Stage` (cadres TV 16:9 / téléphone, bandeau « Reconnexion… », overlay Pause), `fireConfetti`.
- `AnsweredRoster` + `AnsweredCount` : barre TV « qui a répondu » (avatars grisés puis ✓, pseudo tronqué, taille selon le nombre de joueurs ; `data-testid` `tv-answered` / `tv-answered-count`, variantes par props : badge, halo, barre de progression, ton « serious »).
- `SelectedBadge` : pastille ✓ animée sur le choix enregistré (tons `ink` / `accent` / `good` / `serious`, tailles `sm` / `md` / `lg`, position par `className`).
- `NumPad` : pavé numérique du téléphone (virgule optionnelle, touches sans effet grisées, ton `serious`) ; la logique de saisie (`pressKey`) reste dans le mini-jeu.
- `VoteDots` : pastilles anonymes de progression d'un vote + compteur.
- `typo`, `fit` (taille de police selon la longueur du texte), `ordinal` (« 1er », « 2e ») : typographie et mise en forme du contenu, dans `typo.ts`.
Un mini-jeu ne doit utiliser que ces composants + les classes du thème.

## Dimensions
- TV : la page est dessinée en 1920×1080, `1rem` = 16 px à cette taille et tout s'adapte à la fenêtre (`html[data-app="tv"]` dans `theme.css`).
  Penser en `rem`/classes Tailwind : un `text-7xl` est lisible à 4 m.
- Téléphone : portrait, 360 px minimum, zones sûres (`env(safe-area-inset-*)`) gérées dans `PhoneStage`.

## Règles d'ergonomie (à garder en ajoutant un écran)
- **Rien à deviner** : une action se voit à son apparence (bouton plein, icône + mot), pas à une phrase d'aide ni à un survol. Un état se lit sur l'élément lui-même (✓ sur le choix enregistré, avatars grisés tant qu'on n'a pas répondu, bouton qui dit pourquoi il est inactif). On garde les textes qui portent du contenu (la question, « Anne-Sophie répond pour de vrai »), pas ceux qui expliquent l'interface.
- **Zone du geste « accueil »** : sur iPhone et Android en navigateur, le bas de l'écran porte la barre de geste qui renvoie à l'écran d'accueil ; un bouton collé en bas provoque des faux gestes qui sortent du jeu. `PhoneStage` (`src/web/ui/Stage.tsx`) garde donc une marge basse de `env(safe-area-inset-bottom)` + 1,5 rem pour **tous** les écrans téléphone : un écran n'a rien à faire pour en profiter, mais ne doit pas la contourner (`position: fixed; bottom: 0`, marge négative, bouton minuscule en fin de page). Les gros boutons d'action (Continuer, OUI/NON) peuvent rester en bas de l'écran, simplement décollés du bord. Le test `tests/e2e/09-ergonomie.spec.ts` vérifie qu'aucun contrôle visible n'est à moins de 24 px du bas.
- **8 invités, pseudos de 16 caractères** : tout écran TV doit tenir sans rien couper (lobby, vote, 8 barres de résultats, bande des points, classement). Les téléphones tiennent sur 360×640 sans défiler pour 7 choix ; pour davantage, la liste défile et la question reste visible. Le test `tests/e2e/10-affichage-8-joueurs.spec.ts` le vérifie.
- **Téléphones (Safari iOS 16.4+, Firefox et Chrome Android)** : champs à 16 px minimum (sinon iOS zoome), `touch-action: manipulation` et pas de sélection/menu de copie sur les boutons, pas de « tirer pour rafraîchir » (`overscroll-behavior`), `-webkit-backdrop-filter` (ajouté automatiquement au build), `h-app` à la place de `h-screen` (barre d'URL mobile), pas de `filter: blur` géant (lourd sur iPhone). Ces réglages sont dans `theme.css` (couche `base`).
