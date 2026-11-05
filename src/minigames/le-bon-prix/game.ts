// "Le bon prix" : un objet s'affiche sur la TV, chacun devine son prix sur son téléphone.
// Les plus proches (écart absolu) gagnent des points par rang ; bonus si on tombe pile sur le prix.
import { z } from "zod";
import { defineMiniGame } from "../contract";
import { MAX_CENTS } from "./amount";

const objetSchema = z.object({
  nom: z.string().min(1),
  /** Prix réel en euros (centimes autorisés : 3.49). */
  prix: z.number().min(0, "Le prix ne peut pas être négatif").max(MAX_CENTS / 100, "Prix trop élevé"),
  /** Fichier du dossier config/medias (ex : "montre.jpg"). Sans image, l'emoji est montré sur le piédestal. */
  image: z
    .string()
    .min(1)
    .refine((f) => !f.includes("..") && !/^([a-z]+:|[\\/])/i.test(f), "Nom de fichier du dossier config/medias, sans chemin complet")
    .optional(),
  emoji: z.string().min(1).optional(),
  /** Indice affiché sous le nom (contenance, taille, année…). */
  details: z.string().optional(),
  duree: z.number().positive().optional(),
});

const configSchema = z.object({
  nom: z.string().default("Le bon prix"),
  description: z.string().default("Devinez le prix de l'objet : le plus proche gagne !"),
  duree: z.number().positive().default(30),
  temps_resultats: z.number().nonnegative().default(20),
  points: z
    .object({
      /** Points par rang d'écart (1er, 2e…). Les suivants gagnent 0. Les ex æquo partagent le même rang. */
      classement: z.array(z.number().nonnegative()).min(1).default([150, 100, 60, 30]),
      bonus_prix_exact: z.number().nonnegative().default(100),
      /** Écart (en centimes) toléré pour compter comme "prix exact". */
      tolerance_centimes: z.number().int().nonnegative().default(0),
    })
    .default({ classement: [150, 100, 60, 30], bonus_prix_exact: 100, tolerance_centimes: 0 }),
  objets: z.array(objetSchema).min(1, "Ajoute au moins un objet"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = z.infer<typeof objetSchema>;
interface State {
  item: Item;
  priceCents: number;
  /** Dernier prix validé par chacun, en centimes. */
  guesses: Map<string, number>;
}

export interface Pub {
  nom: string;
  emoji: string | null;
  image: string | null;
  details: string | null;
  /** Qui a validé (pas les montants !). */
  answeredIds: string[];
}
export interface Priv {
  /** Mon prix validé (centimes), null si pas encore. */
  cents: number | null;
}
export interface GuessResult {
  playerId: string;
  cents: number;
  /** Écart absolu au prix (centimes). */
  gap: number;
  /** Écart signé : > 0 = trop cher, < 0 = pas assez. */
  diff: number;
  /** Rang (1 = le plus proche ; les ex æquo partagent le rang). */
  rank: number;
  exact: boolean;
  points: number;
}
export interface Results {
  nom: string;
  emoji: string | null;
  image: string | null;
  details: string | null;
  priceCents: number;
  /** Du plus proche au plus éloigné. */
  ranking: GuessResult[];
  /** Joueurs de la manche sans réponse. */
  missingIds: string[];
}

export default defineMiniGame<Cfg, Item, State>({
  id: "le-bon-prix",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.objets,
  roundSeconds: (cfg, item) => item.duree ?? cfg.duree,
  estimateSeconds: (cfg) => cfg.duree + cfg.temps_resultats,

  start: (item) => ({ item, priceCents: Math.round(item.prix * 100), guesses: new Map() }),

  input(state, playerId, payload, ctx) {
    if (!ctx.players.some((p) => p.id === playerId)) return;
    const cents = (payload as { cents?: unknown } | null)?.cents;
    if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0 || cents > MAX_CENTS) return;
    state.guesses.set(playerId, cents);
    if (ctx.players.every((p) => state.guesses.has(p.id))) ctx.end();
  },

  publicView: (state): Pub => ({
    nom: state.item.nom,
    emoji: state.item.emoji ?? null,
    image: state.item.image ?? null,
    details: state.item.details ?? null,
    answeredIds: [...state.guesses.keys()],
  }),

  privateView: (state, playerId): Priv => ({ cents: state.guesses.get(playerId) ?? null }),

  finish(state, ctx) {
    const { classement, bonus_prix_exact, tolerance_centimes } = ctx.cfg.points;
    const sorted = [...state.guesses]
      .map(([playerId, cents]) => ({ playerId, cents, gap: Math.abs(cents - state.priceCents), diff: cents - state.priceCents }))
      .sort((a, b) => a.gap - b.gap);

    // Rang "olympique" : 1, 1, 3… (les ex æquo ont les mêmes points)
    const ranking: GuessResult[] = [];
    sorted.forEach((g, i) => {
      const rank = i > 0 && sorted[i - 1]!.gap === g.gap ? ranking[i - 1]!.rank : i + 1;
      const exact = g.gap <= tolerance_centimes;
      ranking.push({ ...g, rank, exact, points: (classement[rank - 1] ?? 0) + (exact ? bonus_prix_exact : 0) });
    });
    const scores: Record<string, number> = {};
    for (const g of ranking) scores[g.playerId] = g.points;

    const { nom, emoji, image, details } = state.item;
    const results: Results = {
      nom,
      emoji: emoji ?? null,
      image: image ?? null,
      details: details ?? null,
      priceCents: state.priceCents,
      ranking,
      missingIds: ctx.players.filter((p) => !state.guesses.has(p.id)).map((p) => p.id),
    };
    return { results, scores };
  },
});
