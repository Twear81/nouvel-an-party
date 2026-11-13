// "Ceci ou Cela" : une question, deux réponses au choix (Oui/Non par défaut, ou libres : "Mer" / "Montagne").
// Deux modes selon la question :
//  - avec {joueur} : un invité tiré au sort répond pour de vrai, les autres devinent sa réponse.
//  - sans {joueur} : on gagne si on est dans le camp majoritaire (égalité : tout le monde gagne).
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { fillPlayer, endWhenAllDone, progressOf, themeSchema } from "../helpers";

const choicesSchema = z.tuple([z.string().min(1), z.string().min(1)]);

const configSchema = z.object({
  nom: z.string().default("Ceci ou Cela"),
  description: z.string().default("Deux réponses possibles : suivez la majorité… ou devinez un invité"),
  duree: z.number().positive().default(20),
  temps_resultats: z.number().nonnegative().default(12),
  choix_par_defaut: choicesSchema.default(["Oui", "Non"]),
  points: z
    .object({
      bonne_reponse: z.number().default(100),
      cible: z.number().default(0), // points donnés à l'invité ciblé pour chaque personne qui l'a bien deviné
    })
    .default({ bonne_reponse: 100, cible: 0 }),
  questions: z
    .array(
      z.union([
        z.string().min(1),
        z.object({ texte: z.string().min(1), choix: choicesSchema.optional(), duree: z.number().positive().optional(), theme: themeSchema }),
      ]),
    )
    .min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type Choice = 0 | 1;
type Item = { text: string; choices: [string, string]; duration?: number; theme?: string };
interface State {
  answerChanges: Map<string, number>;
  question: string;
  choices: [string, string];
  targetId: string | null;
  answers: Map<string, Choice>;
}

export interface Pub {
  question: string;
  choices: [string, string];
  /** Joueur ciblé par la question (mode "devine sa réponse"), sinon null. */
  targetId: string | null;
  answeredIds: string[];
}
export interface Priv {
  choice: Choice | null;
  isTarget: boolean;
}
export interface Results {
  question: string;
  choices: [string, string];
  targetId: string | null;
  mode: "cible" | "majorite";
  /** picks[0] = joueurs ayant choisi la 1re réponse, picks[1] = la 2e. */
  picks: [string[], string[]];
  /** La bonne réponse ; null = égalité ou personne n'a répondu. */
  winner: Choice | null;
}

/** Fin anticipée : tous les joueurs connectés ont répondu. */
function checkAllAnswered(state: State, ctx: RoundContext<Cfg>) {
  endWhenAllDone(ctx, (id) => state.answers.has(id));
}

export default defineMiniGame<Cfg, Item, State>({
  id: "ceci-ou-cela",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) =>
    cfg.questions.map((q) =>
      typeof q === "string"
        ? { text: q, choices: cfg.choix_par_defaut }
        : { text: q.texte, choices: q.choix ?? cfg.choix_par_defaut, duration: q.duree, theme: q.theme },
    ),
  itemInfo: (item) => ({ theme: item.theme }),
  roundSeconds: (cfg, item) => item.duration ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start(item, ctx) {
    const { text, targetId } = fillPlayer(item.text, ctx.players, ctx.rng);
    return { question: text, choices: item.choices, targetId, answers: new Map(), answerChanges: new Map() };
  },

  input(state, playerId, payload, ctx) {
    const choice = (payload as { choice?: unknown })?.choice;
    if (choice !== 0 && choice !== 1) return;
    if (state.answers.has(playerId) && state.answers.get(playerId) !== choice) state.answerChanges.set(playerId, (state.answerChanges.get(playerId) ?? 0) + 1);
    state.answers.set(playerId, choice);
    checkAllAnswered(state, ctx);
  },

  onPresenceChange: checkAllAnswered,

  progress: (state, ctx) => progressOf(ctx, (id) => state.answers.has(id)),

  publicView: (state): Pub => ({
    question: state.question,
    choices: state.choices,
    targetId: state.targetId,
    answeredIds: [...state.answers.keys()],
  }),

  privateView: (state, playerId): Priv => ({
    choice: state.answers.get(playerId) ?? null,
    isTarget: state.targetId === playerId,
  }),

  finish(state, ctx) {
    const picks: [string[], string[]] = [[], []];
    for (const [id, c] of state.answers) picks[c].push(id);
    const targetChoice = state.targetId ? state.answers.get(state.targetId) : undefined;
    const mode: Results["mode"] = targetChoice !== undefined ? "cible" : "majorite";

    const scores: Record<string, number> = {};
    let winner: Choice | null;
    if (mode === "cible") {
      winner = targetChoice!;
      const right = picks[winner].filter((id) => id !== state.targetId);
      for (const id of right) scores[id] = ctx.cfg.points.bonne_reponse;
      if (ctx.cfg.points.cible) scores[state.targetId!] = right.length * ctx.cfg.points.cible;
    } else {
      winner = picks[0].length === picks[1].length ? null : picks[0].length > picks[1].length ? 0 : 1;
      // Égalité : les deux camps gagnent.
      const winners = winner === null ? [...picks[0], ...picks[1]] : picks[winner];
      for (const id of winners) scores[id] = ctx.cfg.points.bonne_reponse;
    }

    const results: Results = { question: state.question, choices: state.choices, targetId: state.targetId, mode, picks, winner };
    return { results, scores,
      opinions: [Object.fromEntries([...state.answers].map(([id, choice]) => [id, String(choice)]))],
      stats: Object.fromEntries([...state.answers.keys()].map((id) => [id, { answerChanges: state.answerChanges.get(id) ?? 0 }]))
    };
  },
});
