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
| Routage TV (phases, pause, barre du maître) | `src/web/tv/TvApp.tsx` |
| TV lobby (QR, joueurs, réglage des manches) | `src/web/tv/Lobby.tsx` |
| TV annonce de manche | `src/web/tv/IntroScreen.tsx` |
| TV manche en cours (en-tête + chrono) | `src/web/tv/PlayingScreen.tsx` |
| TV résultats (points gagnés, « Continuer ») | `src/web/tv/ResultsScreen.tsx` |
| TV classement final (révélation, podium, confettis) | `src/web/tv/FinalScreen.tsx` |
| Contrôles du maître du jeu | `src/web/tv/HostBar.tsx` |
| Routage téléphone + lobby/intro/résultats/final | `src/web/phone/PhoneApp.tsx` |
| Création / édition du profil | `src/web/phone/ProfileEditor.tsx`, `CameraCapture.tsx`, `photo.ts` |
| Mini-jeu « Qui est le plus… ? » | `src/minigames/qui-est-le-plus/views.tsx` |
| Mini-jeu « Oui ou Non » | `src/minigames/oui-non/views.tsx` |

## Composants réutilisables (`src/web/ui/`)
`Button`, `Panel` (carte en verre), `PlayerAvatar` / `PlayerChip` (avatar + cadre + couleur, tailles `xs`→`2xl`),
`Countdown` (barre + secondes depuis la deadline serveur), `Backdrop` (fond étoilé), `Stage` (cadres TV 16:9 / téléphone,
bandeau « Reconnexion… », overlay Pause), `fireConfetti`.
Un mini-jeu ne doit utiliser que ces composants + les classes du thème.

## Dimensions
- TV : la page est dessinée en 1920×1080, `1rem` = 16 px à cette taille et tout s'adapte à la fenêtre (`html[data-app="tv"]` dans `theme.css`).
  Penser en `rem`/classes Tailwind : un `text-7xl` est lisible à 4 m.
- Téléphone : portrait, 360 px minimum, zones sûres (`env(safe-area-inset-*)`) gérées dans `PhoneStage`.
