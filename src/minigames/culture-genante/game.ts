// "Culture gênante" : jeu INTERLUDE. Entre deux jeux, la TV casse l'ambiance :
//   accroche rigolote ──► bascule « sérieuse » ──► une question qui met mal à l'aise ──► résultats.
// Deux types de questions : QCM (2 à 4 choix, la bonne réponse est la 1re du yaml, l'ordre est mélangé à l'écran)
// ou estimation chiffrée (le plus proche gagne). Étapes pilotées par le serveur : accroche → bascule → question.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { tieRanks } from "../../shared/ranking";
import { endWhenAllDone, shuffle } from "../helpers";

/** Plus grand nombre accepté pour une estimation (9 chiffres sur le pavé). */
export const MAX_ESTIMATION = 999_999_999;

/** Fichier du dossier config/medias, sans chemin complet. */
const mediaFile = z
  .string()
  .min(1)
  .refine((f) => !f.includes("..") && !/^([a-z]+:|[\\/])/i.test(f), "Nom de fichier du dossier config/medias, sans chemin complet");

const accrocheSchema = z.object({
  /** Partie festive, qui s'écrit à l'écran. */
  rigolo: z.string().min(1),
  /** La rupture, affichée en mode « sérieux ». */
  serieux: z.string().min(1),
  /** Média optionnel de l'accroche (config/medias) : image affichée à côté du texte, son joué à l'arrivée. */
  image: mediaFile.optional(),
  son: mediaFile.optional(),
});

const questionSchema = z
  .object({
    texte: z.string().min(1),
    /** QCM : 2 à 4 réponses, la BONNE EN PREMIER (l'ordre est mélangé à l'écran). */
    reponses: z.array(z.string().min(1).max(40, "Réponse trop longue (40 caractères max)")).min(2, "Au moins 2 réponses").max(4, "4 réponses maximum").optional(),
    /** Estimation : la valeur exacte (entier). Le plus proche gagne. */
    estimation: z.number().int("L'estimation doit être un nombre entier").min(0).max(MAX_ESTIMATION).optional(),
    /** Estimation : unité affichée après le nombre ("ans", "km", "milliards"…). */
    unite: z.string().max(20).optional(),
    /** Phrase affichée avec la bonne réponse, à la révélation. */
    commentaire: z.string().optional(),
    /** Durée de la question en secondes (sinon `duree_question`). */
    duree: z.number().positive().optional(),
    /** Accroche propre à cette question (sinon tirée au hasard dans `accroches`). */
    accroche: accrocheSchema.optional(),
  })
  .superRefine((q, ctx) => {
    if ((q.reponses === undefined) === (q.estimation === undefined)) {
      ctx.addIssue({ code: "custom", message: `« ${q.texte} » : indique soit "reponses" (QCM), soit "estimation" (nombre), pas les deux ni aucun` });
    }
    if (q.reponses && new Set(q.reponses.map((r) => r.trim().toLowerCase())).size !== q.reponses.length) {
      ctx.addIssue({ code: "custom", path: ["reponses"], message: `« ${q.texte} » : deux réponses identiques` });
    }
  });

const configSchema = z.object({
  nom: z.string().default("Culture gênante"),
  description: z.string().default("La TV casse l'ambiance : une question qui met mal à l'aise"),
  /** Interlude : environ une fois toutes les N manches normales. */
  tous_les: z.number().int().min(1, "tous_les doit valoir au moins 1").default(5),
  duree_accroche: z.number().nonnegative().default(4),
  duree_bascule: z.number().nonnegative().default(2),
  duree_question: z.number().positive().default(15),
  temps_resultats: z.number().nonnegative().default(8),
  points: z
    .object({
      bonne_reponse: z.number().nonnegative().default(100),
      /** QCM : bonus de rapidité maximal, décroissant avec le temps de réponse mesuré sur le téléphone. */
      bonus_rapidite: z.number().nonnegative().default(50),
      /** Estimation : points du plus proche. */
      estimation_premier: z.number().nonnegative().default(150),
      /** Estimation : points perdus à chaque rang suivant (ex æquo = même rang). */
      estimation_decroissance: z.number().nonnegative().default(50),
    })
    .default({ bonne_reponse: 100, bonus_rapidite: 50, estimation_premier: 150, estimation_decroissance: 50 }),
  accroches: z.array(accrocheSchema).min(1, "Ajoute au moins une accroche"),
  questions: z.array(questionSchema).min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type AccrocheCfg = z.infer<typeof accrocheSchema>;
type Item = z.infer<typeof questionSchema>;

export type Stage = "accroche" | "bascule" | "question";
export type Kind = "qcm" | "estimation";

interface Answer {
  choice: number | null;
  value: number | null;
  /** Temps de réaction mesuré sur le téléphone (ms) ; QCM seulement. */
  ms: number | null;
}
interface State {
  item: Item;
  kind: Kind;
  accroche: AccrocheCfg;
  stage: Stage;
  /** QCM : réponses dans l'ordre affiché. */
  choices: string[];
  /** QCM : index de la bonne réponse dans `choices`. */
  correctIndex: number | null;
  durationS: number;
  answers: Map<string, Answer>;
}

export interface Pub {
  stage: Stage;
  kind: Kind;
  /** null tant qu'on n'est pas à l'étape « question » : rien ne fuit pendant l'accroche. */
  question: string | null;
  choices: string[] | null;
  unit: string | null;
  /** Qui a répondu (pas quoi). */
  answeredIds: string[];
}
/** Vue de la TV : en plus, les textes de la mise en scène (les téléphones n'en ont pas besoin). */
export interface TvPub extends Pub {
  accroche: { rigolo: string; serieux: string; image: string | null; son: string | null };
  accrocheS: number;
  basculeS: number;
}
export interface Priv {
  answered: boolean;
  choice: number | null;
  value: number | null;
}
export interface ResultAnswer {
  playerId: string;
  choice: number | null;
  value: number | null;
  ms: number | null;
  /** QCM : bonne réponse. Estimation : le plus proche (rang 1). */
  correct: boolean;
  /** Estimation : écart absolu à la valeur exacte. */
  gap: number | null;
  rank: number | null;
  points: number;
}
export interface Results {
  kind: Kind;
  question: string;
  choices: string[];
  correctIndex: number | null;
  value: number | null;
  unit: string;
  comment: string | null;
  /** QCM : bonnes réponses d'abord (les plus rapides en tête). Estimation : du plus proche au plus éloigné. */
  answers: ResultAnswer[];
  /** Joueurs de la manche sans réponse. */
  missingIds: string[];
  /** QCM : nombre de bonnes réponses. */
  right: number;
  /** Nombre de joueurs de la manche. */
  total: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Fin anticipée : tous les joueurs connectés ont répondu (seulement pendant la question). */
function checkAllAnswered(state: State, ctx: RoundContext<Cfg>) {
  if (state.stage !== "question") return;
  endWhenAllDone(ctx, (id) => state.answers.has(id));
}

function publicOf(state: State): Pub {
  const asked = state.stage === "question";
  return {
    stage: state.stage,
    kind: state.kind,
    question: asked ? state.item.texte : null,
    choices: asked && state.kind === "qcm" ? state.choices : null,
    unit: asked ? (state.item.unite ?? null) : null,
    answeredIds: [...state.answers.keys()],
  };
}

export default defineMiniGame<Cfg, Item, State>({
  id: "culture-genante",
  configSchema,
  interlude: (cfg) => cfg.tous_les,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.questions,
  // Les étapes enchaînent leurs propres chronos (ctx.countdown) : pas de chrono global.
  roundSeconds: () => null,
  estimateSeconds: (cfg) => cfg.duree_accroche + cfg.duree_bascule + cfg.duree_question + cfg.temps_resultats,

  start(item, ctx) {
    const kind: Kind = item.reponses ? "qcm" : "estimation";
    const accroche = item.accroche ?? ctx.cfg.accroches[Math.floor(ctx.rng() * ctx.cfg.accroches.length)]!;
    let choices: string[] = [];
    let correctIndex: number | null = null;
    if (item.reponses) {
      const order = shuffle(item.reponses.map((_, i) => i), ctx.rng);
      choices = order.map((i) => item.reponses![i]!);
      correctIndex = order.indexOf(0); // la bonne réponse est la 1re du yaml
    }
    return { item, kind, accroche, stage: "accroche", choices, correctIndex, durationS: item.duree ?? ctx.cfg.duree_question, answers: new Map() };
  },

  onPlay(state, ctx) {
    // accroche → bascule → question → fin de manche (chaque étape = un ctx.countdown : pause et +10 s s'appliquent).
    state.stage = "accroche";
    ctx.countdown(ctx.cfg.duree_accroche, () => {
      state.stage = "bascule";
      ctx.countdown(ctx.cfg.duree_bascule, () => {
        state.stage = "question";
        ctx.countdown(state.durationS);
      });
    });
  },

  input(state, playerId, payload, ctx) {
    if (state.stage !== "question") return;
    if (state.answers.has(playerId)) return; // une seule réponse, définitive
    const p = payload as { choice?: unknown; ms?: unknown; value?: unknown } | null;
    if (state.kind === "qcm") {
      if (typeof p?.choice !== "number" || !Number.isInteger(p.choice) || p.choice < 0 || p.choice >= state.choices.length) return;
      if (typeof p.ms !== "number" || !Number.isFinite(p.ms)) return;
      // Temps mesuré sur le téléphone depuis l'affichage des choix, borné à la durée de la question.
      state.answers.set(playerId, { choice: p.choice, value: null, ms: clamp(p.ms, 0, state.durationS * 1000) });
    } else {
      if (typeof p?.value !== "number" || !Number.isInteger(p.value) || p.value < 0 || p.value > MAX_ESTIMATION) return;
      state.answers.set(playerId, { choice: null, value: p.value, ms: null });
    }
    checkAllAnswered(state, ctx);
  },

  onPresenceChange: checkAllAnswered,

  publicView: publicOf,

  tvView: (state, ctx): TvPub => ({
    ...publicOf(state),
    accroche: { rigolo: state.accroche.rigolo, serieux: state.accroche.serieux, image: state.accroche.image ?? null, son: state.accroche.son ?? null },
    accrocheS: ctx.cfg.duree_accroche,
    basculeS: ctx.cfg.duree_bascule,
  }),

  privateView: (state, playerId): Priv => {
    const a = state.answers.get(playerId);
    return { answered: !!a, choice: a?.choice ?? null, value: a?.value ?? null };
  },

  finish(state, ctx) {
    const { bonne_reponse, bonus_rapidite, estimation_premier, estimation_decroissance } = ctx.cfg.points;
    const durationMs = state.durationS * 1000;
    const scores: Record<string, number> = {};
    let answers: ResultAnswer[];

    if (state.kind === "qcm") {
      answers = [...state.answers].map(([playerId, a]) => {
        const correct = a.choice === state.correctIndex;
        const speed = a.ms === null ? 0 : clamp(1 - a.ms / durationMs, 0, 1);
        const points = correct ? Math.round(bonne_reponse + bonus_rapidite * speed) : 0;
        return { playerId, choice: a.choice, value: null, ms: a.ms, correct, gap: null, rank: null, points };
      });
      answers.sort((x, y) => Number(y.correct) - Number(x.correct) || (x.ms ?? Infinity) - (y.ms ?? Infinity));
    } else {
      const exact = state.item.estimation!;
      const sorted = [...state.answers]
        .map(([playerId, a]) => ({ playerId, value: a.value!, gap: Math.abs(a.value! - exact) }))
        .sort((x, y) => x.gap - y.gap);
      const ranks = tieRanks(sorted, (g) => g.gap); // ex æquo : même rang
      answers = sorted.map((g, i) => {
        const rank = ranks[i]!;
        const points = Math.max(0, estimation_premier - (rank - 1) * estimation_decroissance);
        return { playerId: g.playerId, choice: null, value: g.value, ms: null, correct: rank === 1, gap: g.gap, rank, points };
      });
    }
    for (const a of answers) scores[a.playerId] = a.points;

    const results: Results = {
      kind: state.kind,
      question: state.item.texte,
      choices: state.choices,
      correctIndex: state.correctIndex,
      value: state.item.estimation ?? null,
      unit: state.item.unite ?? "",
      comment: state.item.commentaire ?? null,
      answers,
      missingIds: ctx.players.filter((p) => !state.answers.has(p.id)).map((p) => p.id),
      right: answers.filter((a) => a.correct).length,
      total: ctx.players.length,
    };
    return { results, scores };
  },
});
