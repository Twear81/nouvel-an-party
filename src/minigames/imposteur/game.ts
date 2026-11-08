// « L'imposteur » : tout le monde reçoit le même mot, sauf un imposteur (tiré au sort) qui reçoit un mot proche
// et ne sait pas qu'il est l'imposteur. Chacun donne des indices, on débat, on vote.
// Étapes d'une manche : mot (chacun lit) → [indice → montre] x tours → débat → vote → résultats.
// Rien ne trahit l'imposteur avant les résultats : même vue privée pour tous, aucune info sur lui dans la vue publique.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone, normalizeAnswer } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("L'imposteur"),
  description: z.string().default("Un seul d'entre vous n'a pas le même mot… et il ne le sait pas"),
  duree_mot: z.number().positive().default(6),
  tours_indices: z.number().int().min(1, "tours_indices : entre 1 et 3").max(3, "tours_indices : entre 1 et 3").default(2),
  duree_indice: z.number().positive().default(20),
  duree_revelation_indices: z.number().positive().default(4),
  duree_debat: z.number().positive().default(40),
  duree_vote: z.number().positive().default(20),
  temps_resultats: z.number().nonnegative().default(25),
  longueur_indice_max: z.number().int().min(8).max(40).default(24),
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
export type Step = "mot" | "indice" | "montre" | "debat" | "vote";

/** Quand tout le monde a répondu (indice, vote), on laisse ce délai (s) pour corriger avant d'enchaîner. */
export const GRACE_SECONDS = 2;

interface State {
  step: Step;
  /** Tour d'indices en cours (1 = premier). */
  tour: number;
  majorityWord: string;
  imposterWord: string;
  imposterId: string | null;
  /** Mot reçu par chaque joueur (secret : seulement dans la vue privée de son propriétaire). */
  words: Map<string, string>;
  /** Un Map par tour : joueur → indice. */
  clues: Map<string, string>[];
  /** Nombre de tours dont les indices sont dévoilés. */
  revealed: number;
  /** Dernier indice refusé de chaque joueur (il contenait son propre mot). */
  rejected: Map<string, string>;
  graceStarted: boolean;
  ready: Set<string>;
  votes: Map<string, string>;
}

export interface Pub {
  step: Step;
  tour: number;
  tours: number;
  maxLength: number;
  /** Joueurs de la manche, toujours dans le même ordre. */
  playerIds: string[];
  /** Étape « indice » : qui a envoyé son indice du tour (jamais lequel). */
  sentIds: string[];
  /** Indices dévoilés : joueur → un élément par tour dévoilé ("" = pas d'indice). */
  clues: Record<string, string[]>;
  /** Débat : qui est prêt à voter. */
  readyIds: string[];
  /** Vote : nombre de votes reçus (anonyme). */
  votedCount: number;
}

/** Même forme pour tous les joueurs : rien ne distingue l'imposteur. */
export interface Priv {
  word: string;
  /** Mon indice du tour en cours. */
  clue: string | null;
  /** Dernier indice refusé (il contient mon mot). */
  rejected: string | null;
  ready: boolean;
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
  playerIds: string[];
  votes: VoteInfo[];
  /** Tous les indices tapés : joueur → un élément par tour. */
  clues: Record<string, string[]>;
  /** Points gagnés par l'imposteur s'il n'est pas démasqué (0 sinon). */
  imposterGain: number;
  /** Points d'un bon vote. */
  rightPoints: number;
}

/** Indice nettoyé : espaces réduits, coupé à la longueur max. Chaîne vide = pas d'indice. */
export function cleanClue(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** L'indice est-il (ou contient-il) le mot du joueur ? Comparaison sans accents, majuscules, articles ni pluriel. */
export function containsOwnWord(clue: string, word: string): boolean {
  const c = normalizeAnswer(clue);
  const w = normalizeAnswer(word);
  if (!w || !c) return false;
  return ` ${c} `.includes(` ${w} `);
}

const idsOf = (ctx: Ctx) => ctx.players.map((p) => p.id);

const cluesOf = (state: State, upTo: number, ids: string[]): Record<string, string[]> =>
  Object.fromEntries(ids.map((id) => [id, Array.from({ length: upTo }, (_, t) => state.clues[t]?.get(id) ?? "")]));

export default defineMiniGame<Cfg, Item, State>({
  id: "imposteur",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.paires,
  roundSeconds: () => null,
  estimateSeconds: (cfg) =>
    cfg.duree_mot + cfg.tours_indices * (cfg.duree_indice * 0.8 + cfg.duree_revelation_indices) + cfg.duree_debat * 0.9 + cfg.duree_vote * 0.75 + cfg.temps_resultats,

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
      clues: [],
      revealed: 0,
      rejected: new Map(),
      graceStarted: false,
      ready: new Set(),
      votes: new Map(),
    };
  },

  onPlay(state, ctx) {
    ctx.countdown(ctx.cfg.duree_mot, () => beginTour(state, ctx, 1));
  },

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    const p = payload as { clue?: unknown; ready?: unknown; target?: unknown } | null;

    if (state.step === "indice") {
      if (typeof p?.clue !== "string") return;
      const clue = cleanClue(p.clue, ctx.cfg.longueur_indice_max);
      const mine = state.clues[state.tour - 1]!;
      if (!clue) {
        mine.delete(playerId); // vide = retirer son indice
        state.rejected.delete(playerId);
      } else if (containsOwnWord(clue, state.words.get(playerId) ?? "")) {
        state.rejected.set(playerId, clue); // refusé : le téléphone l'explique (l'indice précédent reste valable)
        return;
      } else {
        mine.set(playerId, clue);
        state.rejected.delete(playerId);
      }
      checkClues(state, ctx);
      return;
    }

    if (state.step === "debat") {
      if (typeof p?.ready !== "boolean") return;
      if (p.ready) state.ready.add(playerId);
      else state.ready.delete(playerId);
      checkReady(state, ctx);
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
    checkClues(state, ctx);
    checkReady(state, ctx);
    checkVoted(state, ctx);
  },

  publicView(state, ctx): Pub {
    return {
      step: state.step,
      tour: state.tour,
      tours: ctx.cfg.tours_indices,
      maxLength: ctx.cfg.longueur_indice_max,
      playerIds: idsOf(ctx),
      sentIds: state.step === "indice" ? [...(state.clues[state.tour - 1]?.keys() ?? [])] : [],
      clues: cluesOf(state, state.revealed, idsOf(ctx)),
      readyIds: state.step === "debat" ? [...state.ready] : [],
      votedCount: state.step === "vote" ? state.votes.size : 0,
    };
  },

  privateView(state, playerId): Priv {
    return {
      word: state.words.get(playerId) ?? "",
      clue: state.step === "indice" ? (state.clues[state.tour - 1]?.get(playerId) ?? null) : null,
      rejected: state.step === "indice" ? (state.rejected.get(playerId) ?? null) : null,
      ready: state.ready.has(playerId),
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
      playerIds: idsOf(ctx),
      votes: [...state.votes].map(([voterId, targetId]) => ({ voterId, targetId })),
      clues: cluesOf(state, ctx.cfg.tours_indices, idsOf(ctx)),
      imposterGain: !unmasked && imp ? ctx.cfg.points.imposteur_survit : 0,
      rightPoints: ctx.cfg.points.bon_vote,
    };
    return { results, scores };
  },
});

// ───────────── Déroulé ─────────────

function beginTour(state: State, ctx: Ctx, tour: number) {
  state.step = "indice";
  state.tour = tour;
  state.graceStarted = false;
  state.rejected.clear();
  state.clues[tour - 1] = new Map();
  ctx.countdown(ctx.cfg.duree_indice, () => endTour(state, ctx));
}

/** Fin d'un tour d'indices (chrono ou tout le monde a répondu) : la TV les dévoile d'un coup. */
function endTour(state: State, ctx: Ctx) {
  if (state.step !== "indice") return;
  state.step = "montre";
  state.revealed = state.tour;
  const next = state.tour + 1;
  ctx.countdown(ctx.cfg.duree_revelation_indices, () => (next <= ctx.cfg.tours_indices ? beginTour(state, ctx, next) : beginDebat(state, ctx)));
}

function beginDebat(state: State, ctx: Ctx) {
  state.step = "debat";
  ctx.countdown(ctx.cfg.duree_debat, () => beginVote(state, ctx));
}

function beginVote(state: State, ctx: Ctx) {
  if (state.step !== "debat") return;
  state.step = "vote";
  state.graceStarted = false;
  ctx.countdown(ctx.cfg.duree_vote, () => ctx.end());
}

function checkClues(state: State, ctx: Ctx) {
  if (state.step !== "indice" || state.graceStarted) return;
  const mine = state.clues[state.tour - 1]!;
  if (!allConnectedDone(ctx, idsOf(ctx), (id) => mine.has(id))) return;
  state.graceStarted = true;
  ctx.countdown(GRACE_SECONDS, () => endTour(state, ctx));
}

function checkReady(state: State, ctx: Ctx) {
  if (state.step !== "debat") return;
  if (allConnectedDone(ctx, idsOf(ctx), (id) => state.ready.has(id))) beginVote(state, ctx);
}

function checkVoted(state: State, ctx: Ctx) {
  if (state.step !== "vote" || state.graceStarted) return;
  if (!allConnectedDone(ctx, idsOf(ctx), (id) => state.votes.has(id))) return;
  state.graceStarted = true;
  ctx.countdown(GRACE_SECONDS, () => ctx.end());
}
