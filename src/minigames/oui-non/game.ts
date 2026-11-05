// "Oui ou Non" : deux modes selon la question.
//  - avec {joueur} : un invité tiré au sort répond honnêtement, les autres devinent sa réponse.
//  - sans {joueur} : on gagne si on est dans le camp majoritaire (égalité : tout le monde gagne).
import { z } from "zod";
import { defineMiniGame } from "../contract";
import { fillPlayer, normalizeQuestion, questionSchema } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("Oui ou Non"),
  description: z.string().default("Devinez ce que pense la majorité… ou un invité tiré au sort"),
  duree: z.number().positive().default(20),
  temps_resultats: z.number().nonnegative().default(12),
  points: z
    .object({
      bonne_reponse: z.number().default(100),
      cible: z.number().default(0), // points donnés à l'invité ciblé pour chaque personne qui l'a bien deviné
    })
    .default({ bonne_reponse: 100, cible: 0 }),
  questions: z.array(questionSchema).min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { text: string; duration?: number };
interface State {
  question: string;
  targetId: string | null;
  answers: Map<string, boolean>;
}

export interface Pub {
  question: string;
  /** Joueur ciblé par la question (mode "devine sa réponse"), sinon null. */
  targetId: string | null;
  answeredIds: string[];
}
export interface Priv {
  answer: boolean | null;
  isTarget: boolean;
}
export interface Results {
  question: string;
  targetId: string | null;
  mode: "cible" | "majorite";
  yes: string[];
  no: string[];
  /** La bonne réponse (null si personne n'a répondu ou si la cible n'a pas répondu en mode majorité). */
  truth: boolean | null;
}

export default defineMiniGame<Cfg, Item, State>({
  id: "oui-non",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.questions.map(normalizeQuestion),
  roundSeconds: (cfg, item) => item.duration ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start(item, ctx) {
    const { text, targetId } = fillPlayer(item.text, ctx.players, ctx.rng);
    return { question: text, targetId, answers: new Map() };
  },

  input(state, playerId, payload, ctx) {
    const answer = (payload as { answer?: unknown })?.answer;
    if (typeof answer !== "boolean") return;
    state.answers.set(playerId, answer);
    if (state.answers.size >= ctx.players.length) ctx.end();
  },

  publicView: (state): Pub => ({
    question: state.question,
    targetId: state.targetId,
    answeredIds: [...state.answers.keys()],
  }),

  privateView: (state, playerId): Priv => ({
    answer: state.answers.get(playerId) ?? null,
    isTarget: state.targetId === playerId,
  }),

  finish(state, ctx) {
    const yes = [...state.answers].filter(([, a]) => a).map(([id]) => id);
    const no = [...state.answers].filter(([, a]) => !a).map(([id]) => id);
    const targetAnswer = state.targetId ? state.answers.get(state.targetId) : undefined;
    const mode: Results["mode"] = targetAnswer !== undefined ? "cible" : "majorite";

    const scores: Record<string, number> = {};
    let truth: boolean | null;
    if (mode === "cible") {
      truth = targetAnswer!;
      const right = (truth ? yes : no).filter((id) => id !== state.targetId);
      for (const id of right) scores[id] = ctx.cfg.points.bonne_reponse;
      if (ctx.cfg.points.cible) scores[state.targetId!] = right.length * ctx.cfg.points.cible;
    } else {
      truth = yes.length === no.length ? null : yes.length > no.length;
      // Égalité : les deux camps gagnent (truth = null).
      const winners = truth === null ? [...yes, ...no] : truth ? yes : no;
      for (const id of winners) scores[id] = ctx.cfg.points.bonne_reponse;
    }

    const results: Results = { question: state.question, targetId: state.targetId, mode, yes, no, truth };
    return { results, scores };
  },
});
