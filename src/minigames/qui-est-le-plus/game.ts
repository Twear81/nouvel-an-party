// "Qui est le plus… ?" : chacun vote pour l'invité qui correspond le mieux à la question.
// Points : ceux qui ont voté comme la majorité + bonus pour la/les personne(s) élue(s).
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { argmaxAll, normalizeQuestion, questionSchema, endWhenAllDone } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("Qui est le plus… ?"),
  description: z.string().default("Votez pour l'invité qui correspond le mieux à la question"),
  duree: z.number().positive().default(30),
  temps_resultats: z.number().nonnegative().default(15),
  vote_pour_soi: z.boolean().default(false),
  points: z
    .object({
      majorite: z.number().default(100),
      elu: z.number().default(50),
    })
    .default({ majorite: 100, elu: 50 }),
  questions: z.array(questionSchema).min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { text: string; duration?: number };
interface State {
  question: string;
  votes: Map<string, string>; // votant → personne choisie
}

/** Ce que reçoivent les écrans (voir views.tsx). */
export interface Pub {
  question: string;
  votedIds: string[]; // qui a déjà voté (pas pour qui !)
  allowSelfVote: boolean;
}
export interface Priv {
  votedFor: string | null;
}
export interface Results {
  question: string;
  /** Classement des personnes ayant reçu au moins un vote. */
  tally: { playerId: string; votes: number; voters: string[] }[];
  winners: string[];
}

/** Fin anticipée : tous les joueurs connectés ont voté. */
function checkAllVoted(state: State, ctx: RoundContext<Cfg>) {
  endWhenAllDone(ctx, (id) => state.votes.has(id));
}

export default defineMiniGame<Cfg, Item, State>({
  id: "qui-est-le-plus",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.questions.map(normalizeQuestion),
  roundSeconds: (cfg, item) => item.duration ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start: (item) => ({ question: item.text, votes: new Map() }),

  input(state, playerId, payload, ctx) {
    const target = (payload as { target?: unknown })?.target;
    if (typeof target !== "string" || !ctx.players.some((p) => p.id === target)) return;
    if (!ctx.cfg.vote_pour_soi && target === playerId) return;
    state.votes.set(playerId, target); // on peut changer d'avis tant que la manche n'est pas finie
    checkAllVoted(state, ctx);
  },

  onPresenceChange: checkAllVoted,

  publicView: (state, ctx): Pub => ({
    question: state.question,
    votedIds: [...state.votes.keys()],
    allowSelfVote: ctx.cfg.vote_pour_soi,
  }),

  privateView: (state, playerId): Priv => ({ votedFor: state.votes.get(playerId) ?? null }),

  finish(state, ctx) {
    const counts: Record<string, number> = {};
    const voters: Record<string, string[]> = {};
    for (const [voter, target] of state.votes) {
      counts[target] = (counts[target] ?? 0) + 1;
      (voters[target] ??= []).push(voter);
    }
    const winners = argmaxAll(counts);

    const scores: Record<string, number> = {};
    for (const [voter, target] of state.votes) {
      if (winners.includes(target)) scores[voter] = (scores[voter] ?? 0) + ctx.cfg.points.majorite;
    }
    for (const w of winners) scores[w] = (scores[w] ?? 0) + ctx.cfg.points.elu;

    const tally = Object.entries(counts)
      .map(([playerId, votes]) => ({ playerId, votes, voters: voters[playerId]! }))
      .sort((a, b) => b.votes - a.votes);

    const results: Results = { question: state.question, tally, winners };
    return { results, scores };
  },
});
