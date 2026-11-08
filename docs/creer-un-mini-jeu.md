# Créer un mini-jeu

Un mini-jeu = **une manche** décrite côté serveur (`game.ts`) et côté écrans (`views.tsx`). Le moteur (`src/server/engine`) gère tout le reste : lobby, intro, chrono, pause, reconnexions, points cumulés, classement, sauvegarde.

## 1. Structure
```
src/minigames/<id>/
  game.ts        logique serveur (contrat : src/minigames/contract.ts)
  views.tsx      écrans React (contrat : src/minigames/views-contract.ts)
  README.md      doc pour l'organisateur (écrire ses questions, options, points)
config/minijeux/<id>.yaml      contenu et réglages
tests/unit/<id>.test.ts        tests de la logique
```
`<id>` (ex. `plus-rapide`) = nom du dossier = nom du yaml = `id` dans `game.ts`. Inspirez-vous de `qui-est-le-plus` et `ceci-ou-cela`.

## 2. game.ts : le contrat `MiniGame<Cfg, Item, State>`
- `Cfg` : contenu validé du yaml. `Item` : un élément tirable (une question…). `State` : l'état interne d'une manche, jamais envoyé tel quel.
- Le moteur tire `Item` au hasard parmi `items()`, une fois par manche.

| Membre | Rôle |
|---|---|
| `id` | identifiant, = dossier = yaml |
| `configSchema` | schéma **zod** du yaml (valeurs par défaut avec `.default()`, messages d'erreur clairs). Les champs `actif` et `manches_max` (plafond de manches, entier ≥ 1) sont gérés par le moteur, ne les déclarez pas |
| `name(cfg)`, `description(cfg)` | titre et phrase d'explication affichés à l'annonce |
| `items(cfg)` | liste des manches possibles |
| `roundSeconds(cfg, item)` | durée du chrono en secondes, ou `null` si la manche se termine seule (via `ctx.end()`) |
| `estimateSeconds(cfg)` | durée estimée (jeu + résultats) pour le calcul de durée de soirée ; l'intro est ajoutée par le moteur |
| `start(item, ctx)` | début de manche (pendant l'intro) : renvoie le `State` initial. Ne démarrez pas de timer de jeu ici |
| `onPlay?(state, ctx)` | optionnel : le chrono démarre (fin de l'intro). C'est ici qu'on lance les timers de jeu |
| `input(state, playerId, payload, ctx)` | réponse d'un joueur. **`payload` vient du réseau : validez-le** (type, valeur, joueur existant) et ignorez le reste silencieusement |
| `publicView(state, ctx)` | ce que voient TV et tous les téléphones. **Rien de secret** (les réponses des autres !) |
| `privateView?(state, playerId, ctx)` | ce que voit un seul téléphone (« tu as voté pour X ») |
| `tvView?(state, ctx)` | optionnel : remplace `publicView` pour la TV seulement. Pour ce que les téléphones ne doivent pas recevoir, même caché (ex : la suite de Simon) |
| `onPresenceChange?(state, ctx)` | optionnel : un participant se connecte ou se déconnecte pendant le jeu (voir ci-dessous) |
| `interlude?(cfg)` | optionnel : renvoie N = « une fois toutes les N manches » pour faire de ce jeu une surprise sans annonce (voir « Jeux interlude » plus bas) ; absent ou `null` = jeu normal |
| `finish(state, ctx)` | fin de manche : renvoie `{ results, scores }`. `results` est libre (affiché par `TvResults`), `scores` = points gagnés **dans cette manche** par `playerId` (absents = 0) |

Le moteur envoie `publicView` / `privateView` à chaque changement (après un `input` ou un `ctx.update()`).

### `RoundContext` (le `ctx`)
| Outil | Usage |
|---|---|
| `cfg` | config validée |
| `players` | joueurs de la manche (`PublicPlayer`, profil validé) |
| `rng()` | aléatoire (0..1), déterministe en test. **Jamais `Math.random`** |
| `now()` | heure du serveur en ms |
| `activeNow()` | comme `now()` mais l'horloge **s'arrête pendant les pauses** : pour un compteur affiché (`startedAt = ctx.activeNow()`). Côté écran : `activeNow(round, serverNow())` (`src/shared/clock.ts`) |
| `setTimeout(ms, fn)` | timer annulé en fin de manche, **figé pendant une pause**. Jamais le `setTimeout` global |
| `update()` | à appeler après une modification d'état **faite hors d'un `input`** (typiquement dans un timer), pour renvoyer les vues |
| `end()` | termine la manche tout de suite (ex. tout le monde a répondu) |
| `isConnected(id)` | le joueur a-t-il un écran connecté **maintenant** ? (présence en direct, à lire au moment de décider) |

### Présence : `isConnected` et `onPresenceChange`
`ctx.players` est figé au début de la manche ; un téléphone planté y reste. Pour une règle « tout le monde a répondu → `ctx.end()` » :
- comptez seulement les joueurs connectés avec `allConnectedDone(ctx, ids, (id) => aRépondu(id))` (`helpers.ts`) : vrai si tous les connectés parmi `ids` sont servis, et jamais si personne n'est connecté (le chrono s'en charge) ;
- continuez à **accepter** les réponses de tous (un déconnecté peut revenir) ;
- exportez la même vérification dans `onPresenceChange: (state, ctx) => ...` : le moteur l'appelle quand un participant se connecte/déconnecte pendant `playing` (et à la reprise après une pause), puis renvoie les vues. Dans ce hook, `ctx.end()`, `ctx.countdown` et les timers marchent comme dans `input`. C'est aussi là qu'un jeu au tour par tour passe le tour d'un absent (voir `compte-a-rebours`).
En test, `makeCtx` expose `ctx.setConnected(id, false)` ; appelez ensuite `game.onPresenceChange!(state, ctx)`.

### Aides (`src/minigames/helpers.ts`)
`questionSchema` / `normalizeQuestion` (question en texte ou objet avec `duree`), `fillPlayer` (joker `{joueur}`), `argmaxAll` (vainqueurs ex æquo), `allConnectedDone` (fin anticipée sur les joueurs connectés).

## 3. views.tsx : `MiniGameViews`
```tsx
export default { Tv, Phone, TvResults, PhoneResults, revealSeconds } satisfies MiniGameViews;
```
| Vue | Affichée | Notes |
|---|---|---|
| `Tv` | TV pendant l'intro et le jeu | lisible de loin (grands textes, 16:9) |
| `Phone` | téléphone pendant le jeu | portrait, gros boutons, usage à une main |
| `TvResults` | TV pendant les résultats | |
| `PhoneResults?` | téléphone, au-dessus du bouton « Continuer » | optionnel |
| `revealSeconds?(props)` | durée (s) de l'animation de `TvResults`, 0 par défaut | voir ci-dessous |

### Ne pas spoiler la révélation : `revealSeconds`
Si `TvResults` joue une animation (prix qui arrivent un par un, podium…), déclarez sa durée avec `revealSeconds`. Tant qu'elle dure, la TV cache les « +N » de la bande du bas et les téléphones affichent « Regarde la TV ! » (ni points, ni `PhoneResults`, ni bouton Continuer) ; ensuite tout apparaît. Calculez la durée avec les **constantes réelles** de l'animation (exportées par `views.tsx`, utilisées par l'animation elle-même) pour qu'elles ne divergent pas : `revealSeconds: ({ results }) => results ? revealSeconds(results.ranking.length) : 0`. Le compte part de `round.resultsAt` (heure serveur, `RoundInfo`) : TV et téléphones sont synchronisés, même après un rechargement. Le hook `useRevealed(props)` (`src/web/net/useReveal.ts`) donne l'état « révélation terminée » si une vue en a besoin. Si votre `TvResults` démarre une animation, elle doit aussi se lancer depuis le début au montage (pas depuis `resultsAt`).

Props (`MiniGameViewProps`) : `snapshot`, `round` (infos de la manche), `pub` (= `publicView`), `priv` (= `privateView`, `null` sur la TV), `results` (= `finish().results`, phase résultats seulement), `players`, `playerById(id)`, `sendInput(payload)` (téléphone : appelle `input` côté serveur).

**Règle design** : n'utilisez que les composants de `src/web/ui` (`Button`, `Panel`, `PlayerAvatar`, `Countdown`…, exportés par `src/web/ui/index.ts`) et les tokens de `src/web/theme` (couleurs, tailles, espacements). Pas de couleur, police ou taille en dur : ainsi tout changement de design (voir `docs/changer-le-design.md`) s'applique à tous les jeux. Pas d'état de jeu dans React : tout vient du serveur (un téléphone qui recharge retrouve la manche). Pour lister les joueurs de la manche, filtrez avec `round.participants` (les retardataires n'y sont pas).

## 4. Enregistrer le jeu
Deux listes à compléter, sinon le jeu n'apparaît pas (ou plante) :
```ts
// src/minigames/registry.server.ts
import plusRapide from "./plus-rapide/game";
export const serverGames: MiniGame[] = [quiEstLePlus, ceciOuCela, plusRapide];
```
```ts
// src/minigames/registry.web.ts : même id, vues React
import plusRapide from "./plus-rapide/views";

export const webGames: Record<string, MiniGameViews> = {
  // ...
  "plus-rapide": plusRapide,
};
```
Si `config/minijeux/<id>.yaml` est absent, le jeu est désactivé avec un avertissement. `actif: false` dans le yaml le désactive aussi.

## 5. yaml et README
- Le yaml documente **chaque option en commentaire** (voir `config/minijeux/ceci-ou-cela.yaml`) et commence par `actif: true`, suivi si besoin de `manches_max: N` (plafond de manches, générique : voir [configuration.md](configuration.md)).
- Le README (en français, pour l'organisateur) : principe, déroulé TV / téléphones, points avec exemple, tableau des options, comment écrire du contenu, pièges YAML, `actif: false`, redémarrage de NouvelAn.exe.

## 6. Tests
- **Unit** (`tests/unit/<id>.test.ts`) : testez `game.ts` sans réseau avec un faux `ctx` (`rng` fixe, `setTimeout` qui stocke les callbacks pour les déclencher à la main, `players` factices) : `start` → `onPlay` → `input` → `finish`. Vérifiez surtout la validation des `payload` invalides, les égalités, les joueurs absents et le calcul des points.
- **E2E** (`tests/e2e`) : une partie complète avec plusieurs faux téléphones : lobby, une manche de votre jeu, résultats, classement.

## 7. Exemple complet : « Plus rapide »
Principe : après un délai aléatoire, un gros **GO** apparaît. Le premier à toucher son écran gagne. Le temps est **mesuré sur le téléphone** avec `performance.now()` à partir de l'affichage du GO, puis envoyé : la latence wifi ne favorise personne. Points par rang.

### config/minijeux/plus-rapide.yaml
```yaml
actif: true
nom: "Plus rapide"
description: "Touchez l'écran dès que GO apparaît"
duree: 15            # secondes max de la manche
temps_resultats: 10
points:
  premier: 100
  decroissance: 25   # points perdus par rang suivant
delais:              # attente avant le GO, une manche tirée au hasard
  - { min: 2, max: 5 }
  - { min: 3, max: 7 }
```

### src/minigames/plus-rapide/game.ts
```ts
import { z } from "zod";
import { defineMiniGame } from "../contract";

const configSchema = z.object({
  nom: z.string().default("Plus rapide"),
  description: z.string().default("Touchez l'écran dès que GO apparaît"),
  duree: z.number().positive().default(15),
  temps_resultats: z.number().nonnegative().default(10),
  points: z
    .object({ premier: z.number().default(100), decroissance: z.number().default(25) })
    .default({ premier: 100, decroissance: 25 }),
  delais: z
    .array(z.object({ min: z.number().positive(), max: z.number().positive() }))
    .min(1, "Ajoute au moins un délai"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { min: number; max: number };
interface State {
  item: Item; // le tirage, gardé pour onPlay (qui ne reçoit pas l'item)
  go: boolean;
  /** Temps de réaction en ms, mesuré par chaque téléphone. */
  times: Map<string, number>;
  /** Joueurs partis trop tôt (éliminés de la manche). */
  early: Set<string>;
}

export interface Pub { go: boolean; doneIds: string[] } // qui a joué, pas leur temps
export interface Priv { time: number | null; early: boolean }
export interface Results {
  ranking: { playerId: string; ms: number }[]; // du plus rapide au plus lent
  early: string[];
}

export default defineMiniGame<Cfg, Item, State>({
  id: "plus-rapide",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.delais,
  roundSeconds: (cfg) => cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start: (item) => ({ item, go: false, times: new Map(), early: new Set() }),

  // Le chrono démarre : on programme le GO à un moment aléatoire.
  onPlay(state, ctx) {
    const { min, max } = state.item;
    const delay = (min + ctx.rng() * (max - min)) * 1000;
    ctx.setTimeout(delay, () => {
      state.go = true;
      ctx.update(); // modification hors input : renvoie les vues aux écrans
    });
  },

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    if (state.times.has(playerId) || state.early.has(playerId)) return; // un seul essai
    const p = payload as { early?: unknown; ms?: unknown } | null;
    if (p?.early === true) {
      if (!state.go) state.early.add(playerId); // faux départ
    } else if (typeof p?.ms === "number" && Number.isFinite(p.ms) && state.go) {
      // Borne basse : personne ne réagit en moins de 80 ms (anti-triche grossier).
      state.times.set(playerId, Math.max(80, Math.min(p.ms, 10_000)));
    } else return;
    if (state.times.size + state.early.size >= ctx.players.length) ctx.end();
  },

  publicView: (state): Pub => ({ go: state.go, doneIds: [...state.times.keys(), ...state.early] }),
  privateView: (state, playerId): Priv => ({
    time: state.times.get(playerId) ?? null,
    early: state.early.has(playerId),
  }),

  finish(state, ctx) {
    const ranking = [...state.times]
      .map(([playerId, ms]) => ({ playerId, ms }))
      .sort((a, b) => a.ms - b.ms);
    const scores: Record<string, number> = {};
    ranking.forEach((r, i) => {
      scores[r.playerId] = Math.max(0, ctx.cfg.points.premier - i * ctx.cfg.points.decroissance);
    });
    const results: Results = { ranking, early: [...state.early] };
    return { results, scores };
  },
});
```

**Note** : `onPlay` ne reçoit pas l'`Item` tiré, d'où le champ `item` mémorisé dans l'état par `start`.

### Côté téléphone (extrait de views.tsx)
Le téléphone note l'instant où le GO s'affiche, puis mesure localement :
```tsx
import { useEffect, useRef } from "react";
import type { MiniGameViewProps } from "../views-contract";
// + composants de src/web/ui (bouton plein écran, texte…) : jamais de style en dur

export function Phone({ pub, priv, sendInput }: MiniGameViewProps) {
  const goAt = useRef<number | null>(null);

  // Dès que "go" passe à true, on note l'heure LOCALE d'affichage.
  useEffect(() => {
    if (pub.go && goAt.current === null) goAt.current = performance.now();
  }, [pub.go]);

  const done = priv?.time != null || priv?.early;
  const onTap = () => {
    if (done) return;
    if (goAt.current === null) void sendInput({ early: true });           // faux départ
    else void sendInput({ ms: performance.now() - goAt.current });        // réaction en ms
  };
  // Rendu : grande zone tactile (onTap), "Attends…" tant que !pub.go, "GO !" ensuite,
  // puis le temps (priv.time) ou "Faux départ" (priv.early) une fois joué.
}
```
Comme le temps est mesuré entre l'affichage du GO et le toucher **sur le même appareil**, le délai réseau n'intervient pas (seul l'écart de rendu entre téléphones reste, négligeable). Pour un jeu où le temps compte, ne mesurez jamais l'heure d'arrivée du message côté serveur.

### Enregistrement et suite
Ajoutez le jeu aux deux registres (section 4), créez le README et le yaml, puis les tests : `finish` avec des temps connus (rang, égalités, points planchés à 0), `input` avec des `payload` invalides ou un temps avant le GO.

> Cet exemple est de la documentation : les fichiers du jeu « plus-rapide » n'existent pas dans le dépôt.

## Jeux « interlude » (jeux surprise)
Un jeu qui ne se programme pas comme les autres : il surgit environ une fois toutes les N manches, sans annonce (modèle : `culture-genante`). On le déclare dans `game.ts` :
```ts
interlude: (cfg) => cfg.tous_les,   // N, lu dans le yaml du jeu (entier ≥ 1). null / absent = jeu normal
```
| Aspect | Comportement |
|---|---|
| Lobby TV | pas de compteur de manches : un **interrupteur** Activé / Désactivé (`Setup.counts[id]` = 1 / 0, 1 par défaut si le jeu a du contenu ; `sanitizeSetup` borne à 0/1), libellé « Surprise · ~1 fois tous les N jeux ». La durée estimée inclut les surprises prévues (`interludeCounts`, `src/shared/interlude.ts`, partagé entre lobby et planner) |
| Planner (`buildPlan`) | plan normal d'abord, puis pour chaque bloc **complet** de N manches normales, UNE manche interlude insérée à une position aléatoire du bloc (après la 1re, 2e… ou dernière manche du bloc) : **jamais en première position, jamais deux de suite**. Éléments tirés sans répétition ; on s'arrête quand le jeu n'en a plus. Modes `melange` et `groupe` : même règle (on compte en manches normales) |
| Aucune manche normale | si l'interlude est activé, le plan = une seule manche interlude (démo, tests) ; avec plusieurs jeux interlude, c'est le premier jeu activé du catalogue |
| Plusieurs jeux interlude | chacun a son propre rythme (son N) ; ils se partagent les « trous » entre manches normales, et un jeu renonce à son interlude du bloc s'il n'y a plus de trou libre |
| Déroulé | `RoundInfo.interlude = true` : **pas d'intro** (le moteur passe directement en `playing`, `start` puis `onPlay` à la suite), pas de « Prépare-toi ! » sur les téléphones. Phase résultats normale (sans numéro de manche) |
| Écrans | la TV affiche le `Tv` du jeu **en plein écran**, sans l'en-tête (nom du jeu, numéro), sans le chrono standard : la mise en scène (y compris le chrono) est à la charge du jeu. Le jeu recouvre toute la TV avec `absolute inset-0` s'il veut changer de décor ; la barre de l'hôte (Pause, Passer, +10 s) reste posée par-dessus en bas à droite : laisser ce coin libre (`pb-20`). Pause et `PausedOverlay` fonctionnent. Le téléphone affiche directement `Phone`, sans chrono standard (utiliser `useRemainingMs` / `Countdown` du jeu si besoin) |
| Numérotation | « Manche x / y » **ne compte pas les interludes** (sinon on les verrait venir) : `RoundInfo.number` / `normalTotal` pour l'affichage ; `index` / `total` restent les positions dans le plan, interludes compris |
| Tests E2E | `data-interlude="true"` sur `tv-playing` et `phone-playing` ; `party.setCounts({ id: 1 })` / `startGame({ id: 1 })` actionnent l'interrupteur |
| Sauvegarde | `PlannedRound.interlude` est dans `data/save.json` ; une manche interrompue est rejouée depuis son début à la reprise |

Un interlude choisit lui-même ses étapes (ex. `culture-genante` : accroche → bascule → question, avec `roundSeconds: () => null` et des `ctx.countdown` en cascade) et expose l'étape dans `publicView` (`data-stage`).

## Briques pour les jeux plus riches

| Besoin | Outil |
|---|---|
| Plusieurs étapes dans une manche (écrire puis voter, tour par tour, séquences) | `roundSeconds: () => null`, puis `ctx.countdown(secondes, suite)` dans `onPlay` : chaque étape a son chrono visible ; sans `suite`, la manche se termine. `ctx.clearCountdown()` masque le chrono (ex : pendant une animation). Pause et +10 s s'appliquent. |
| Savoir où on en est côté écrans | mettre l'étape dans `publicView` (ex : `step: "ecrire" \| "voter"`) |
| Comparer des réponses tapées au clavier | `normalizeAnswer()` (`helpers.ts`) : minuscules, sans accents, sans article, sans pluriel |
| Images/sons dans la config | fichiers dans `config/medias/`, servis à l'adresse `/medias/<fichier>` |
| Joueurs de la manche | `ctx.players` côté serveur, `round.participants` côté écrans ; connectés maintenant : `ctx.isConnected` |
| Heure de début des résultats | `round.resultsAt` (heure serveur, `null` avant la phase résultats) ; heure serveur côté écran : `serverNow()` (`src/web/net/socket.ts`) |
| Tester sans moteur | `makeCtx()` (`tests/unit/helpers/minigame-ctx.ts`) : `ctx.advance(ms)` fait avancer le temps, `ctx.finishCountdown()` saute à la fin du chrono |
