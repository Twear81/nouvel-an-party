// « L'imposteur » : tout le monde reçoit le même mot, sauf un imposteur (tiré au sort) qui reçoit un mot proche
// et ne sait pas qu'il est l'imposteur. Chacun dit un indice À VOIX HAUTE à son tour, puis on vote.
// Étapes d'une manche : mot (chacun lit) → parole (un joueur à la fois) → [décision → parole tour 2] → vote → résultats.
// Rien ne trahit l'imposteur avant les résultats : même vue privée pour tous, aucune info sur lui dans la vue publique.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone, playerIds, shuffle, startGraceOnce } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("L'imposteur"),
  description: z.string().default("Un seul d'entre vous n'a pas le même mot… et il ne le sait pas"),
  duree_mot: z.number().positive().default(6),
  duree_parole: z.number().positive().default(15),
  tours_max: z.number().int().min(1, "tours_max : 1 ou 2").max(2, "tours_max : 1 ou 2").default(2),
  duree_decision: z.number().positive().default(15),
  duree_vote: z.number().positive().default(20),
  temps_resultats: z.number().nonnegative().default(25),
  points: z
    .object({
      bon_vote: z.number().default(100),
      imposteur_survit: z.number().default(300),
    })
    .default({ bon_vote: 100, imposteur_survit: 300 }),
  paires: z
    .array(z.array(z.string().min(1)).length(2, 'Une paire = exactement deux mots, ex : ["Champagne", "Crémant"]'))
    .min(1, "Ajoute au moins une paire de mots"),
});

type Cfg = z.infer<typeof configSchema>;
type Ctx = RoundContext<Cfg>;
type Item = string[];
export type Step = "mot" | "parole" | "decision" | "vote";
export type Choice = "vote" | "tour";

/** Quand tout le monde a répondu (décision, vote), on laisse ce délai (s) pour changer d'avis avant d'enchaîner. */
export const GRACE_SECONDS = 2;

interface State {
  step: Step;
  /** Tour de parole en cours (1 = premier). */
  tour: number;
  majorityWord: string;
  imposterWord: string;
  imposterId: string | null;
  /** Mot reçu par chaque joueur (secret : seulement dans la vue privée de son propriétaire). */
  words: Map<string, string>;
  /** Ordre de parole du tour en cours (tous les joueurs de la manche). */
  order: string[];
  /** Position de l'orateur courant dans `order` (-1 = avant le premier). */
  speaker: number;
  /** Ceux qui ont parlé pendant le tour en cours. */
  spoken: Set<string>;
  /** Décision après le tour 1. */
  choices: Map<string, Choice>;
  graceStarted: boolean;
  votes: Map<string, string>;
}

export interface Pub {
  step: Step;
  tour: number;
  tours: number;
  /** Étape « parole » : ordre de passage, orateur courant (null hors parole) et ceux qui ont déjà parlé. */
  order: string[];
  currentId: string | null;
  spokenIds: string[];
  /** Étape « décision » : compteurs anonymes. */
  wantVote: number;
  wantTour: number;
  /** Vote : nombre de votes reçus (anonyme). */
  votedCount: number;
}

/** Même forme pour tous les joueurs : rien ne distingue l'imposteur. */
export interface Priv {
  word: string;
  choice: Choice | null;
  vote: string | null;
}

export interface VoteInfo {
  voterId: string;
  targetId: string;
}
export interface Results {
  imposterId: string | null;
  majorityWord: string;
  imposterWord: string;
  /** L'imposteur a strictement le plus de votes. */
  unmasked: boolean;
  votes: VoteInfo[];
  /** Points gagnés par l'imposteur s'il n'est pas démasqué (0 sinon). */
  imposterGain: number;
  /** Points d'un bon vote. */
  rightPoints: number;
}


export default defineMiniGame<Cfg, Item, State>({
  id: "imposteur",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.paires,
  roundSeconds: () => null,
  // Estimation pour ~7 joueurs : on passe souvent la main avant la fin du chrono (~60 % de la durée de parole).
  estimateSeconds: (cfg) => {
    const tour = 7 * (cfg.duree_parole * 0.6 + 1);
    const again = cfg.tours_max >= 2 ? 0.6 : 0;
    return cfg.duree_mot + tour * (1 + again) + (cfg.tours_max >= 2 ? cfg.duree_decision * 0.6 : 0) + cfg.duree_vote * 0.75 + cfg.temps_resultats;
  },

  start(item, ctx) {
    const [a, b] = item as [string, string];
    const aIsMajority = ctx.rng() < 0.5; // lequel des deux mots est celui de la majorité
    const majorityWord = aIsMajority ? a : b;
    const imposterWord = aIsMajority ? b : a;
    const imposter = ctx.players.length > 0 ? ctx.players[Math.floor(ctx.rng() * ctx.players.length)]! : null;
    const words = new Map(ctx.players.map((p) => [p.id, p.id === imposter?.id ? imposterWord : majorityWord]));
    return {
      step: "mot",
      tour: 1,
      majorityWord,
      imposterWord,
      imposterId: imposter?.id ?? null,
      words,
      order: [],
      speaker: -1,
      spoken: new Set(),
      choices: new Map(),
      graceStarted: false,
      votes: new Map(),
    };
  },

  onPlay(state, ctx) {
    ctx.countdown(ctx.cfg.duree_mot, () => beginTour(state, ctx, 1));
  },

  input(state, playerId, payload, ctx) {
    const p = payload as { done?: unknown; choice?: unknown; target?: unknown } | null;

    if (state.step === "parole") {
      // Seul l'orateur courant peut passer la main.
      if (p?.done !== true || state.order[state.speaker] !== playerId) return;
      state.spoken.add(playerId);
      nextSpeaker(state, ctx);
      return;
    }

    if (state.step === "decision") {
      if (p?.choice !== "vote" && p?.choice !== "tour") return;
      state.choices.set(playerId, p.choice); // on peut changer d'avis jusqu'à la fin
      checkDecided(state, ctx);
      return;
    }

    if (state.step === "vote") {
      const target = p?.target;
      if (typeof target !== "string" || target === playerId) return;
      if (!ctx.players.some((pl) => pl.id === target)) return;
      state.votes.set(playerId, target); // on peut changer d'avis jusqu'à la fin
      checkVoted(state, ctx);
    }
  },

  onPresenceChange(state, ctx) {
    // L'orateur qui se déconnecte pendant son tour est sauté.
    if (state.step === "parole") {
      const cur = state.order[state.speaker];
      if (cur !== undefined && !ctx.isConnected(cur)) nextSpeaker(state, ctx);
    }
    checkDecided(state, ctx);
    checkVoted(state, ctx);
  },

  publicView(state, ctx): Pub {
    const speaking = state.step === "parole";
    const tally = (c: Choice) => (state.step === "decision" ? [...state.choices.values()].filter((x) => x === c).length : 0);
    return {
      step: state.step,
      tour: state.tour,
      tours: ctx.cfg.tours_max,
      order: speaking ? state.order : [],
      currentId: speaking ? (state.order[state.speaker] ?? null) : null,
      spokenIds: speaking ? [...state.spoken] : [],
      wantVote: tally("vote"),
      wantTour: tally("tour"),
      votedCount: state.step === "vote" ? state.votes.size : 0,
    };
  },

  privateView(state, playerId): Priv {
    return {
      word: state.words.get(playerId) ?? "",
      choice: state.step === "decision" ? (state.choices.get(playerId) ?? null) : null,
      vote: state.votes.get(playerId) ?? null,
    };
  },

  finish(state, ctx) {
    const tally: Record<string, number> = {};
    for (const t of state.votes.values()) tally[t] = (tally[t] ?? 0) + 1;
    const imp = state.imposterId;
    const impVotes = imp ? (tally[imp] ?? 0) : 0;
    const otherMax = Math.max(0, ...Object.entries(tally).filter(([id]) => id !== imp).map(([, n]) => n));
    const unmasked = imp !== null && impVotes > otherMax; // égalité en tête = il s'en sort
    const scores: Record<string, number> = {};
    if (unmasked) {
      for (const [voter, target] of state.votes) if (target === imp) scores[voter] = ctx.cfg.points.bon_vote;
    } else if (imp) {
      scores[imp] = ctx.cfg.points.imposteur_survit;
    }
    const results: Results = {
      imposterId: imp,
      majorityWord: state.majorityWord,
      imposterWord: state.imposterWord,
      unmasked,
      votes: [...state.votes].map(([voterId, targetId]) => ({ voterId, targetId })),
      imposterGain: !unmasked && imp ? ctx.cfg.points.imposteur_survit : 0,
      rightPoints: ctx.cfg.points.bon_vote,
    };
    return { results, scores };
  },
});

// ───────────── Déroulé ─────────────

/** Début d'un tour de parole : nouvel ordre au hasard ; au tour 1 l'imposteur ne passe jamais en premier. */
function beginTour(state: State, ctx: Ctx, tour: number) {
  state.step = "parole";
  state.tour = tour;
  state.graceStarted = false;
  state.spoken = new Set();
  state.speaker = -1;
  const order = shuffle(playerIds(ctx), ctx.rng);
  if (tour === 1 && order.length > 1 && order[0] === state.imposterId) {
    const j = 1 + Math.floor(ctx.rng() * (order.length - 1));
    [order[0], order[j]] = [order[j]!, order[0]!];
  }
  state.order = order;
  nextSpeaker(state, ctx);
}

/** Passe au prochain orateur connecté ; plus personne → fin du tour. Chrono propre à chaque orateur. */
function nextSpeaker(state: State, ctx: Ctx) {
  if (state.step !== "parole") return;
  let i = state.speaker + 1;
  while (i < state.order.length && !ctx.isConnected(state.order[i]!)) i++; // absent : sauté pour ce tour
  state.speaker = i;
  if (i >= state.order.length) {
    endTour(state, ctx);
    return;
  }
  ctx.countdown(ctx.cfg.duree_parole, () => nextSpeaker(state, ctx));
}

function endTour(state: State, ctx: Ctx) {
  if (state.tour === 1 && ctx.cfg.tours_max >= 2) {
    state.step = "decision";
    state.graceStarted = false;
    ctx.countdown(ctx.cfg.duree_decision, () => resolveDecision(state, ctx));
  } else {
    beginVote(state, ctx);
  }
}

/** Majorité stricte pour « encore un tour » ; égalité ou personne → on vote. */
function resolveDecision(state: State, ctx: Ctx) {
  if (state.step !== "decision") return;
  const choices = [...state.choices.values()];
  const again = choices.filter((c) => c === "tour").length;
  if (again > choices.length - again) beginTour(state, ctx, 2);
  else beginVote(state, ctx);
}

function beginVote(state: State, ctx: Ctx) {
  state.step = "vote";
  state.graceStarted = false;
  ctx.countdown(ctx.cfg.duree_vote, () => ctx.end());
}

function checkDecided(state: State, ctx: Ctx) {
  if (state.step !== "decision" || !allConnectedDone(ctx, playerIds(ctx), (id) => state.choices.has(id))) return;
  startGraceOnce(state, ctx, GRACE_SECONDS, () => resolveDecision(state, ctx));
}

function checkVoted(state: State, ctx: Ctx) {
  if (state.step !== "vote" || !allConnectedDone(ctx, playerIds(ctx), (id) => state.votes.has(id))) return;
  startGraceOnce(state, ctx, GRACE_SECONDS, () => ctx.end());
}
