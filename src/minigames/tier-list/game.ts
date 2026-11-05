// "Tier list" : chacun range chaque invité dans un étage (S / A / B / C…) selon la question.
// L'étage "consensus" d'un invité = moyenne des notes reçues, arrondie. Chaque votant gagne des points
// pour chaque invité qu'il a placé dans son étage consensus.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone, normalizeQuestion, questionSchema } from "../helpers";

const configSchema = z.object({
  nom: z.string().default("Tier list"),
  description: z.string().default("Rangez chaque invité de S à C : gagnez en pensant comme les autres"),
  duree: z.number().positive().default(60),
  temps_resultats: z.number().nonnegative().default(30),
  noter_soi_meme: z.boolean().default(true),
  tiers: z
    .array(z.string().min(1).max(6, "Un étage fait 6 caractères au maximum"))
    .min(2, "Il faut au moins 2 étages")
    .max(6, "6 étages au maximum")
    .refine((l) => new Set(l).size === l.length, "Les étages doivent avoir des noms différents")
    .default(["S", "A", "B", "C"]),
  points: z.object({ consensus: z.number().default(25) }).default({ consensus: 25 }),
  questions: z.array(questionSchema).min(1, "Ajoute au moins une question"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { text: string; duration?: number };
interface State {
  question: string;
  /** votant → (invité noté → index d'étage, 0 = le plus haut) */
  ratings: Map<string, Map<string, number>>;
}

/** Ce que reçoivent les écrans (voir views.tsx). Jamais les notes : seulement l'avancement. */
export interface Pub {
  question: string;
  tiers: string[];
  allowSelf: boolean;
  /** Pour chaque votant : combien d'invités il a déjà notés, sur combien. */
  progress: Record<string, { done: number; total: number }>;
}
export interface Priv {
  /** Mes notes : invité → index d'étage. */
  mine: Record<string, number>;
}
export interface Placement {
  playerId: string;
  /** Index de l'étage consensus (0 = le plus haut). */
  tier: number;
  /** Moyenne des notes reçues, de 0 (étage le plus bas) à 100 (étage le plus haut). */
  percent: number;
  votes: number;
}
export interface Results {
  question: string;
  tiers: string[];
  /** Invités classés, du mieux au moins bien classé. */
  placements: Placement[];
  /** Invités que personne n'a notés. */
  unrated: string[];
  /** Toutes les notes, révélées en fin de manche : votant → invité → étage. */
  ratings: Record<string, Record<string, number>>;
  /** Pour chaque votant : invités placés dans le bon étage, et nombre d'invités notés. */
  hits: Record<string, { good: string[]; rated: number }>;
}

/** Invités que ce votant peut noter. */
const targetsOf = (voter: string, ctx: { players: { id: string }[]; cfg: Cfg }) =>
  ctx.players.filter((p) => ctx.cfg.noter_soi_meme || p.id !== voter).map((p) => p.id);

const isComplete = (state: State, voter: string, ctx: { players: { id: string }[]; cfg: Cfg }) =>
  state.ratings.get(voter)?.size === targetsOf(voter, ctx).length;

/** Fin anticipée : tous les joueurs connectés ont fini de noter. */
function checkAllRated(state: State, ctx: RoundContext<Cfg>) {
  if (allConnectedDone(ctx, ctx.players.map((p) => p.id), (id) => isComplete(state, id, ctx))) ctx.end();
}

export default defineMiniGame<Cfg, Item, State>({
  id: "tier-list",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.questions.map(normalizeQuestion),
  roundSeconds: (cfg, item) => item.duration ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start: (item) => ({ question: item.text, ratings: new Map() }),

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    const { target, tier } = (payload ?? {}) as { target?: unknown; tier?: unknown };
    if (typeof target !== "string" || !targetsOf(playerId, ctx).includes(target)) return;
    if (typeof tier !== "number" || !Number.isInteger(tier) || tier < 0 || tier >= ctx.cfg.tiers.length) return;
    let mine = state.ratings.get(playerId);
    if (!mine) state.ratings.set(playerId, (mine = new Map()));
    mine.set(target, tier); // on peut changer d'avis tant que la manche n'est pas finie
    checkAllRated(state, ctx);
  },

  onPresenceChange: checkAllRated,

  publicView: (state, ctx): Pub => ({
    question: state.question,
    tiers: ctx.cfg.tiers,
    allowSelf: ctx.cfg.noter_soi_meme,
    progress: Object.fromEntries(
      ctx.players.map((p) => [p.id, { done: state.ratings.get(p.id)?.size ?? 0, total: targetsOf(p.id, ctx).length }]),
    ),
  }),

  privateView: (state, playerId): Priv => ({ mine: Object.fromEntries(state.ratings.get(playerId) ?? []) }),

  finish(state, ctx) {
    const top = ctx.cfg.tiers.length - 1;
    // Valeur d'une note : S (index 0) vaut le plus, pour que "moyenne haute = étage haut".
    const received = new Map<string, number[]>();
    for (const mine of state.ratings.values())
      for (const [target, tier] of mine) {
        const list = received.get(target) ?? [];
        list.push(top - tier);
        received.set(target, list);
      }

    const placements: Placement[] = [];
    for (const p of ctx.players) {
      const values = received.get(p.id);
      if (!values?.length) continue;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      // Arrondi à l'entier le plus proche ; une moyenne pile entre deux étages va à l'étage du dessus.
      placements.push({ playerId: p.id, tier: top - Math.round(avg), percent: Math.round((avg / top) * 100), votes: values.length });
    }
    placements.sort((a, b) => a.tier - b.tier || b.percent - a.percent);

    const tierOf = new Map(placements.map((p) => [p.playerId, p.tier]));
    const scores: Record<string, number> = {};
    const hits: Results["hits"] = {};
    const ratings: Results["ratings"] = {};
    for (const [voter, mine] of state.ratings) {
      const good = [...mine].filter(([target, tier]) => tierOf.get(target) === tier).map(([target]) => target);
      hits[voter] = { good, rated: mine.size };
      ratings[voter] = Object.fromEntries(mine);
      if (good.length) scores[voter] = good.length * ctx.cfg.points.consensus;
    }

    const results: Results = {
      question: state.question,
      tiers: ctx.cfg.tiers,
      placements,
      unrated: ctx.players.filter((p) => !tierOf.has(p.id)).map((p) => p.id),
      ratings,
      hits,
    };
    return { results, scores };
  },
});
