# Changer le design

Tout le look du jeu est centralisé dans `src/web/theme/`. Les composants et les mini-jeux n'utilisent **jamais** de couleur écrite en dur :
ils emploient les classes Tailwind issues du thème (`bg-surface`, `text-accent`, `font-display`, `rounded-card`, `shadow-glow`…).

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Couleurs, polices, rayons, ombres, dégradés, animations | `src/web/theme/theme.css` (bloc `@theme static`) |
| Cadres d'avatar (dessin CSS) | `src/web/theme/theme.css` (section « Cadres d'avatar », classes `.frame-*`) |
| Liste des avatars, cadres proposés, couleurs de profil | `src/web/theme/profile-options.ts` |
| Fonts embarquées | `src/web/main.tsx` (imports `@fontsource…`) + `--font-*` dans `theme.css` |

### Palette
Dans `theme.css`, modifier les variables `--color-*` :
`bg` / `bg-2` / `bg-3` (fonds de nuit), `surface` (verre), `ink` / `ink-muted` (textes), `accent*` (or champagne),
`hot` (rose), `cool`, `good` / `bad` / `warn` (états), `qr-dark` / `qr-light` (QR code, garder un fort contraste).
Les dégradés (`--gradient-bg`, `--gradient-gold`…) sont construits à partir de ces couleurs.
Classes disponibles : `bg-bg`, `text-ink`, `text-ink-muted`, `bg-accent`, `text-accent`, `bg-gold`, `bg-night`, `glass`, `text-gold-gradient`…

Le mode « sérieux » de Culture gênante (décor sombre, typo solennelle) a ses propres jetons : `--color-serious-*`, `--font-serious`, `--gradient-serious` (classes `bg-serious`, `text-serious-ink`, `font-serious`…), dans la section `culture-genante` de `theme.css`.

### Polices
Les polices sont installées en local (pas d'internet pendant la soirée).
1. `bun add @fontsource/<nom>` (ou `@fontsource-variable/<nom>`)
2. L'importer dans `src/web/main.tsx`
3. Mettre son nom dans `--font-display` (titres, gros chiffres) ou `--font-sans` (texte) de `theme.css`.

### Avatars, cadres, couleurs
- `AVATARS` : ajouter `{ id, label, emoji }`. L'`id` est enregistré dans le profil : ne pas renommer un id existant en cours de soirée.
  Pour utiliser des images à la place des emoji, adapter `PlayerAvatar.tsx` (une seule branche à changer).
- `FRAMES` : ajouter `{ id, label, className }` puis écrire la classe `.frame-<nom>` dans `theme.css`
  (`--p` = couleur du joueur, `1em` = 1/10 de la taille de l'avatar, donc le cadre suit toutes les tailles).
- `COLORS` : liste de couleurs hex.

## Où est chaque écran

| Écran | Fichier |
|---|---|
| Routage TV (phases, pause, bande du maître) | `src/web/tv/TvApp.tsx` |
| TV lobby (QR, joueurs avec bouton « retirer », réglage des manches) | `src/web/tv/Lobby.tsx` |
| TV annonce de manche | `src/web/tv/IntroScreen.tsx` |
| TV manche en cours (en-tête + chrono) ; un jeu interlude s'affiche en plein écran, sans cadre | `src/web/tv/PlayingScreen.tsx` |
| TV résultats (points gagnés, « Continuer ») | `src/web/tv/ResultsScreen.tsx` |
| TV classement final (révélation, podium, confettis) | `src/web/tv/FinalScreen.tsx` |
| Contrôles du maître du jeu (Pause, Passer, +10 s, Lobby : bande fine toujours visible en bas à droite) | `src/web/tv/HostBar.tsx` |
| Routage téléphone + lobby/intro/résultats/final | `src/web/phone/PhoneApp.tsx` |
| Création / édition du profil | `src/web/phone/ProfileEditor.tsx`, `CameraCapture.tsx`, `photo.ts` |
| Mini-jeu « Qui est le plus… ? » | `src/minigames/qui-est-le-plus/views.tsx` |
| Mini-jeu « Ceci ou Cela » (deux réponses face à face, camps en résultats) | `src/minigames/ceci-ou-cela/views.tsx` |
| Mini-jeu « Culture gênante » (interlude : une scène par fichier, `Accroche`, `Bascule`, `Question`, `Reveal`, `Phone`) | `src/minigames/culture-genante/` |
| Mini-jeu « Dessin raté » (page de dessin tactile, mosaïque, révélation ; couleurs = jetons `--color-paper` et `--color-pen-0…4` du thème) | `src/minigames/dessin-rate/views.tsx`, `drawing.tsx` |

## Composants réutilisables (`src/web/ui/`)
`Button`, `ConfirmDialog` (confirmation dans le style du jeu, jamais `window.confirm`), `Icons` (icônes SVG : pause, passer, accueil…), `Panel` (carte en verre), `PlayerAvatar` / `PlayerChip` (avatar + cadre + couleur, tailles `xs`→`2xl`),
`Countdown` (barre + secondes depuis la deadline serveur), `Backdrop` (fond étoilé), `Stage` (cadres TV 16:9 / téléphone,
bandeau « Reconnexion… », overlay Pause), `fireConfetti`.
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
