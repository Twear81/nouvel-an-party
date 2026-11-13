// "Dessin raté" : chacun dessine son mot secret en un temps très court, les dessins défilent sur la TV
// (avec leur mot), puis on vote pour le mieux dessiné. Une manche, trois étapes : dessiner, galerie, vote.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { argmaxAll, endWhenAllDone, playerIds, progressOf, shuffle } from "../helpers";
import { cleanStrokes, DIFFICULTIES, isBlank, type Difficulty, type Stroke } from "./shared";

/** Un mot est tiré dans une liste de 8 mots minimum : en dessous, la difficulté n'est pas jouée. */
export const MIN_WORDS = 8;

const wordList = z.array(z.string().trim().min(1)).default([]);

const configSchema = z
  .object({
    nom: z.string().default("Dessin raté"),
    description: z.string().default("Dessine ton mot secret en 20 secondes, votez pour le meilleur"),
    duree_dessin: z.number().positive().default(20),
    duree_galerie: z.number().positive().default(4),
    duree_vote: z.number().positive().default(20),
    temps_resultats: z.number().nonnegative().default(20),
    points: z
      .object({
        par_vote: z.number().default(50),
        gagnant: z.number().default(100),
      })
      .default({ par_vote: 50, gagnant: 100 }),
    mots: z.object({ facile: wordList, moyen: wordList, difficile: wordList }).default({ facile: [], moyen: [], difficile: [] }),
  })
  .refine((cfg) => DIFFICULTIES.some((d) => cfg.mots[d].length >= MIN_WORDS), {
    message: `Ajoute au moins ${MIN_WORDS} mots dans une des listes (mots: facile / moyen / difficile)`,
    path: ["mots"],
  });

type Cfg = z.infer<typeof configSchema>;
type Ctx = RoundContext<Cfg>;
type Step = "draw" | "gallery" | "vote";

/** Une manche = une difficulté et le lot de mots dans lequel chaque joueur en reçoit un différent. */
export interface Item {
  difficulte: Difficulty;
  mots: string[];
}

interface State {
  difficulty: Difficulty;
  step: Step;
  words: Map<string, string>; // joueur → son mot
  drawings: Map<string, Stroke[]>; // joueur → son dessin (mis à jour au fil de l'eau)
  /** Ordre (tiré au hasard) des dessins : galerie (non vides) et vote (tous). */
  order: string[];
  gallery: string[];
  index: number;
  votes: Map<string, string>; // votant → dessin choisi
}

export interface Card {
  playerId: string;
  word: string;
  strokes: Stroke[];
}

/** Ce que reçoivent TV et téléphones. Les mots n'apparaissent qu'à la galerie et au vote. */
export interface Pub {
  step: Step;
  difficulty: Difficulty;
  /** Galerie : le dessin à l'écran. */
  index: number;
  total: number;
  current: Card | null;
  /** Vote : tous les dessins (les vides aussi : « page blanche »). */
  cards: Card[];
  votedCount: number;
  voterCount: number;
}
/** Vue TV : en plus, les dessins en cours (sans les mots), pour la mosaïque en direct. */
export interface TvPub extends Pub {
  live: { playerId: string; strokes: Stroke[] }[];
}

export interface Priv {
  word: string | null;
  strokes: Stroke[];
  vote: string | null;
}

export interface ResultCard extends Card {
  votes: number;
}
export interface Results {
  difficulty: Difficulty;
  /** Dessins non vides, dans l'ordre de passage. */
  cards: ResultCard[];
  /** Plus voté(s) (ex æquo : tous) ; vide si personne n'a reçu de vote. */
  winners: string[];
  /** Le vote a-t-il eu lieu ? */
  voted: boolean;
}

/** Nombre de manches possibles par difficulté : une par lot de 8 mots au moins (30 mots → 3 lots de 10). */
function lots(cfg: Cfg): Item[] {
  const out: Item[] = [];
  for (const d of DIFFICULTIES) {
    const list = cfg.mots[d];
    const n = Math.floor(list.length / MIN_WORDS);
    // Mots répartis en alternance (0, n, 2n… / 1, n+1…) : un lot ne reprend pas des mots voisins du yaml.
    for (let k = 0; k < n; k++) out.push({ difficulte: d, mots: list.filter((_, i) => i % n === k) });
  }
  return out;
}

const isBlankOf = (state: State, id: string) => isBlank(state.drawings.get(id) ?? []);
const votable = (state: State) => state.order.filter((id) => !isBlankOf(state, id));
const cardOf = (state: State, id: string): Card => ({ playerId: id, word: state.words.get(id) ?? "", strokes: state.drawings.get(id) ?? [] });

function tally(state: State): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const target of state.votes.values()) counts[target] = (counts[target] ?? 0) + 1;
  return counts;
}

function publicView(state: State, ctx: Ctx): Pub {
  const inVote = state.step === "vote";
  const cur = state.step === "gallery" ? state.gallery[state.index] : undefined;
  return {
    step: state.step,
    difficulty: state.difficulty,
    index: state.index,
    total: state.gallery.length,
    current: cur ? cardOf(state, cur) : null,
    cards: inVote ? state.order.map((id) => cardOf(state, id)) : [],
    votedCount: state.votes.size,
    voterCount: ctx.players.length,
  };
}

export default defineMiniGame<Cfg, Item, State>({
  id: "dessin-rate",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: lots,
  // Un lot regroupe plusieurs mots : la clé utile est chaque mot (un lot est moins prioritaire s'il en contient de déjà vus).
  itemInfo: (item) => ({ keys: item.mots.map((m) => `${item.difficulte}:${m}`) }),
  roundSeconds: () => null,
  // Estimation à 7 joueurs : dessin + galerie + vote (souvent écourté) + révélation et lecture des résultats.
  estimateSeconds: (cfg) => cfg.duree_dessin + 7 * cfg.duree_galerie + cfg.duree_vote * 0.75 + cfg.temps_resultats,

  start(item, ctx) {
    const words = shuffle(item.mots, ctx.rng);
    const state: State = {
      difficulty: item.difficulte,
      step: "draw",
      words: new Map(),
      drawings: new Map(),
      order: [],
      gallery: [],
      index: 0,
      votes: new Map(),
    };
    ctx.players.forEach((p, i) => {
      state.words.set(p.id, words[i % words.length]!); // un mot différent par joueur
      state.drawings.set(p.id, []);
    });
    return state;
  },

  onPlay(state, ctx) {
    ctx.countdown(ctx.cfg.duree_dessin, () => startGallery(state, ctx));
  },

  input(state, playerId, payload, ctx) {
    const p = payload as { strokes?: unknown; target?: unknown } | null;

    if (state.step === "draw") {
      const strokes = cleanStrokes(p?.strokes);
      if (strokes) state.drawings.set(playerId, strokes); // le dessin complet remplace le précédent
      return;
    }

    if (state.step === "vote") {
      const target = p?.target;
      if (typeof target !== "string" || target === playerId) return; // pas de vote pour soi
      if (!votable(state).includes(target)) return; // dessin vide ou inconnu
      state.votes.set(playerId, target); // on peut changer d'avis jusqu'à la fin du chrono
      checkVoted(state, ctx);
    }
  },

  onPresenceChange(state, ctx) {
    checkVoted(state, ctx);
  },

  // Dessin et galerie : pas d'étape de réponse (on dessine jusqu'au bout) ; seul le vote est compté.
  progress: (state, ctx) => (state.step === "vote" ? progressOf(ctx, (id) => state.votes.has(id)) : null),

  publicView,

  tvView(state, ctx): TvPub {
    const pub = publicView(state, ctx);
    const live = state.step === "draw" ? ctx.players.map((p) => ({ playerId: p.id, strokes: state.drawings.get(p.id) ?? [] })) : [];
    return { ...pub, live };
  },

  privateView(state, playerId): Priv {
    return {
      word: state.words.get(playerId) ?? null,
      strokes: state.step === "draw" ? (state.drawings.get(playerId) ?? []) : [],
      vote: state.votes.get(playerId) ?? null,
    };
  },

  finish(state, ctx) {
    const counts = tally(state);
    const ids = playerIds(ctx);
    const shown = (state.order.length ? state.order : ids).filter((id) => !isBlankOf(state, id));
    const cards: ResultCard[] = shown.map((id) => ({ ...cardOf(state, id), votes: counts[id] ?? 0 }));
    const winners = argmaxAll(counts);
    const scores: Record<string, number> = {};
    for (const id of ids) {
      const n = counts[id] ?? 0;
      if (n > 0) scores[id] = n * ctx.cfg.points.par_vote + (winners.includes(id) ? ctx.cfg.points.gagnant : 0);
    }
    const results: Results = { difficulty: state.difficulty, cards, winners, voted: state.votes.size > 0 };
    return { results, scores };
  },
});

/** Fin du dessin : les dessins sont figés, on les montre un par un (les pages blanches sont sautées). */
function startGallery(state: State, ctx: Ctx) {
  state.order = shuffle(
    playerIds(ctx),
    ctx.rng,
  );
  state.gallery = state.order.filter((id) => !isBlankOf(state, id));
  if (state.gallery.length === 0) return ctx.end(); // personne n'a dessiné : direct aux résultats
  state.step = "gallery";
  state.index = 0;
  showCurrent(state, ctx);
}

function showCurrent(state: State, ctx: Ctx) {
  ctx.countdown(ctx.cfg.duree_galerie, () => {
    state.index++;
    if (state.index < state.gallery.length) return showCurrent(state, ctx);
    startVote(state, ctx);
  });
}

function startVote(state: State, ctx: Ctx) {
  if (votable(state).length < 2) return ctx.end(); // un seul dessin : rien à départager
  state.step = "vote";
  ctx.countdown(ctx.cfg.duree_vote, () => ctx.end());
}

/** Tous les votants connectés ont voté : on termine sans attendre le chrono. */
function checkVoted(state: State, ctx: Ctx) {
  if (state.step !== "vote") return;
  endWhenAllDone(ctx, (id) => state.votes.has(id));
}
