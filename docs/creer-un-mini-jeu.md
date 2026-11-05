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
`<id>` (ex. `plus-rapide`) = nom du dossier = nom du yaml = `id` dans `game.ts`. Inspirez-vous de `qui-est-le-plus` et `oui-non`.

## 2. game.ts : le contrat `MiniGame<Cfg, Item, State>`
- `Cfg` : contenu validé du yaml. `Item` : un élément tirable (une question…). `State` : l'état interne d'une manche, jamais envoyé tel quel.
- Le moteur tire `Item` au hasard parmi `items()`, une fois par manche.

| Membre | Rôle |
|---|---|
| `id` | identifiant, = dossier = yaml |
| `configSchema` | schéma **zod** du yaml (valeurs par défaut avec `.default()`, messages d'erreur clairs). Le champ `actif` est géré par le moteur, ne le déclarez pas |
| `name(cfg)`, `description(cfg)` | titre et phrase d'explication affichés à l'annonce |
| `items(cfg)` | liste des manches possibles |
| `roundSeconds(cfg, item)` | durée du chrono en secondes, ou `null` si la manche se termine seule (via `ctx.end()`) |
| `estimateSeconds(cfg)` | durée estimée (jeu + résultats) pour le calcul de durée de soirée ; l'intro est ajoutée par le moteur |
| `start(item, ctx)` | début de manche (pendant l'intro) : renvoie le `State` initial. Ne démarrez pas de timer de jeu ici |
| `onPlay?(state, ctx)` | optionnel : le chrono démarre (fin de l'intro). C'est ici qu'on lance les timers de jeu |
| `input(state, playerId, payload, ctx)` | réponse d'un joueur. **`payload` vient du réseau : validez-le** (type, valeur, joueur existant) et ignorez le reste silencieusement |
| `publicView(state, ctx)` | ce que voient TV et tous les téléphones. **Rien de secret** (les réponses des autres !) |
| `privateView?(state, playerId, ctx)` | ce que voit un seul téléphone (« tu as voté pour X ») |
| `finish(state, ctx)` | fin de manche : renvoie `{ results, scores }`. `results` est libre (affiché par `TvResults`), `scores` = points gagnés **dans cette manche** par `playerId` (absents = 0) |

Le moteur envoie `publicView` / `privateView` à chaque changement (après un `input` ou un `ctx.update()`).

### `RoundContext` (le `ctx`)
| Outil | Usage |
|---|---|
| `cfg` | config validée |
| `players` | joueurs de la manche (`PublicPlayer`, profil validé) |
| `rng()` | aléatoire (0..1), déterministe en test. **Jamais `Math.random`** |
| `now()` | heure du serveur en ms |
| `setTimeout(ms, fn)` | timer annulé en fin de manche, **figé pendant une pause**. Jamais le `setTimeout` global |
| `update()` | à appeler après une modification d'état **faite hors d'un `input`** (typiquement dans un timer), pour renvoyer les vues |
| `end()` | termine la manche tout de suite (ex. tout le monde a répondu) |

### Aides (`src/minigames/helpers.ts`)
`questionSchema` / `normalizeQuestion` (question en texte ou objet avec `duree`), `fillPlayer` (joker `{joueur}`), `argmaxAll` (vainqueurs ex æquo).

## 3. views.tsx : `MiniGameViews`
```tsx
export default { Tv, Phone, TvResults, PhoneResults } satisfies MiniGameViews;
```
| Vue | Affichée | Notes |
|---|---|---|
| `Tv` | TV pendant l'intro et le jeu | lisible de loin (grands textes, 16:9) |
| `Phone` | téléphone pendant le jeu | portrait, gros boutons, usage à une main |
| `TvResults` | TV pendant les résultats | |
| `PhoneResults?` | téléphone, au-dessus du bouton « Continuer » | optionnel |

Props (`MiniGameViewProps`) : `snapshot`, `round` (infos de la manche), `pub` (= `publicView`), `priv` (= `privateView`, `null` sur la TV), `results` (= `finish().results`, phase résultats seulement), `players`, `playerById(id)`, `sendInput(payload)` (téléphone : appelle `input` côté serveur).

**Règle design** : n'utilisez que les composants de `src/web/ui` (`Button`, `Panel`, `PlayerAvatar`, `Countdown`…, exportés par `src/web/ui/index.ts`) et les tokens de `src/web/theme` (couleurs, tailles, espacements). Pas de couleur, police ou taille en dur : ainsi tout changement de design (voir `docs/changer-le-design.md`) s'applique à tous les jeux. Pas d'état de jeu dans React : tout vient du serveur (un téléphone qui recharge retrouve la manche). Pour lister les joueurs de la manche, filtrez avec `round.participants` (les retardataires n'y sont pas).

## 4. Enregistrer le jeu
Deux listes à compléter, sinon le jeu n'apparaît pas (ou plante) :
```ts
// src/minigames/registry.server.ts
import plusRapide from "./plus-rapide/game";
export const serverGames: MiniGame[] = [quiEstLePlus, ouiNon, plusRapide];
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
- Le yaml documente **chaque option en commentaire** (voir `config/minijeux/oui-non.yaml`) et commence par `actif: true`.
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
