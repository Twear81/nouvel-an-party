// "Compte à rebours chaotique" : tout le monde joue en même temps. La TV annonce une cible (ex. 8,0 s), puis « 3… 2… 1… GO »
// lance un compteur qui devient fou après quelques secondes. Chacun appuie sur STOP quand il pense que la cible est atteinte.
// Le téléphone mesure lui-même le temps (performance.now) : la latence du wifi n'avantage ni ne pénalise personne.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone } from "../helpers";
import { rankByError } from "./rank";

export const DESIGN_IDS = ["digital", "horloge", "meche", "coupe", "minuit"] as const;
export type DesignId = (typeof DESIGN_IDS)[number];

const configSchema = z
  .object({
    nom: z.string().default("Compte à rebours chaotique"),
    description: z.string().default("Tout le monde appuie sur STOP quand le compteur fou atteint la cible : le plus proche gagne !"),
    annonce: z.number().positive().default(6),
    cible_min: z.number().min(1, "cible_min : au moins 1 seconde").default(6),
    cible_max: z.number().min(1, "cible_max : au moins 1 seconde").default(12),
    visible_min: z.number().nonnegative().default(2),
    visible_max: z.number().nonnegative().default(3),
    marge_max: z.number().nonnegative().default(4),
    temps_resultats: z.number().nonnegative().default(25),
    points: z.array(z.number()).default([150, 100, 70, 50, 30, 20, 10, 0]),
    designs: z.array(z.enum(DESIGN_IDS)).min(1, "Ajoute au moins un design").default([...DESIGN_IDS]),
  })
  .refine((c) => c.cible_max >= c.cible_min, { message: "cible_max doit être ≥ cible_min", path: ["cible_max"] })
  .refine((c) => c.visible_max >= c.visible_min, { message: "visible_max doit être ≥ visible_min", path: ["visible_max"] });

type Cfg = z.infer<typeof configSchema>;
type Item = { design: DesignId };
type Ctx = RoundContext<Cfg>;
type Phase = "announce" | "ready" | "running";

interface State {
  design: DesignId;
  /** Cible en secondes (au demi-seconde). */
  cible: number;
  /** Secondes pendant lesquelles le compteur est lisible. */
  visible: number;
  /** Graine du chaos : le même compteur est rejoué à l'identique après un rechargement. */
  seed: number;
  phase: Phase;
  /** Heure serveur (ms) du GO, annoncée pendant le « 3… 2… 1… ». */
  goAt: number | null;
  startedAt: number | null;
  /** Temps mesuré par chaque téléphone (ms). Jamais publié avant les résultats. */
  stops: Map<string, number>;
}

export interface Pub {
  design: DesignId;
  seed: number;
  cible: number;
  visible: number;
  phase: Phase;
  goAt: number | null;
  startedAt: number | null;
  /** Qui a stoppé (sans le temps). */
  stoppedIds: string[];
}
export type Priv = { id: string };
export interface Results {
  design: DesignId;
  cible: number;
  ranking: { playerId: string; rank: number; elapsedMs: number; signedMs: number }[];
  missed: { playerId: string }[];
}

/** Délai entre l'affichage du « 3 » et le GO. */
export const GO_LEAD_MS = 3000;
/** Un téléphone ne peut pas avoir mesuré plus longtemps que le serveur (plus cette tolérance de latence). */
const TRUST_MS = 1500;

const everyoneStopped = (s: State, ctx: Ctx) =>
  allConnectedDone(ctx, ctx.players.map((p) => p.id), (id) => s.stops.has(id));

function go(s: State, ctx: Ctx) {
  s.phase = "running";
  s.startedAt = ctx.now();
  ctx.setTimeout((s.cible + ctx.cfg.marge_max) * 1000, () => ctx.end());
  ctx.update();
}

export default defineMiniGame<Cfg, Item, State>({
  id: "compte-a-rebours",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => [...new Set(cfg.designs)].map((design) => ({ design })),
  roundSeconds: () => null,
  // Annonce + « 3 2 1 » + cible moyenne + retardataires, puis la révélation et les résultats.
  estimateSeconds: (cfg) => Math.round(cfg.annonce + GO_LEAD_MS / 1000 + (cfg.cible_min + cfg.cible_max) / 2 + 2 + cfg.temps_resultats),

  start(item, ctx) {
    const { cfg } = ctx;
    // Cible au demi-seconde, durée de lisibilité au dixième, graine du chaos : tout est tiré ici, côté serveur.
    const halves = Math.round((cfg.cible_max - cfg.cible_min) * 2);
    const cible = cfg.cible_min + Math.floor(ctx.rng() * (halves + 1)) / 2;
    const visible = Math.round((cfg.visible_min + ctx.rng() * (cfg.visible_max - cfg.visible_min)) * 10) / 10;
    const seed = Math.floor(ctx.rng() * 1_000_000);
    return { design: item.design, cible, visible, seed, phase: "announce", goAt: null, startedAt: null, stops: new Map() };
  },

  onPlay(s, ctx) {
    ctx.countdown(ctx.cfg.annonce, () => {
      s.phase = "ready";
      s.goAt = ctx.now() + GO_LEAD_MS;
      ctx.clearCountdown();
      ctx.setTimeout(GO_LEAD_MS, () => go(s, ctx));
      ctx.update();
    });
  },

  // Un téléphone qui plante ne bloque pas la manche.
  onPresenceChange(s, ctx) {
    if (s.phase === "running" && everyoneStopped(s, ctx)) ctx.end();
  },

  input(s, playerId, payload, ctx) {
    if (s.phase !== "running" || s.startedAt === null) return;
    if (!ctx.players.some((p) => p.id === playerId) || s.stops.has(playerId)) return;
    if (typeof payload !== "object" || payload === null) return;
    const ms = (payload as { ms?: unknown }).ms;
    if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return;
    const serverMs = ctx.now() - s.startedAt;
    if (ms > serverMs + TRUST_MS || ms > (s.cible + ctx.cfg.marge_max) * 1000 + TRUST_MS) return;
    s.stops.set(playerId, Math.round(ms));
    if (everyoneStopped(s, ctx)) ctx.end();
  },

  publicView: (s): Pub => ({
    design: s.design,
    seed: s.seed,
    cible: s.cible,
    visible: s.visible,
    phase: s.phase,
    goAt: s.goAt,
    startedAt: s.startedAt,
    stoppedIds: [...s.stops.keys()],
  }),

  privateView: (_s, playerId): Priv => ({ id: playerId }),

  finish(s, ctx) {
    const entries = [...s.stops].map(([playerId, elapsedMs]) => ({ playerId, elapsedMs, signedMs: elapsedMs - s.cible * 1000 }));
    const ranked = rankByError(entries, (e) => e.signedMs);
    const scores: Record<string, number> = {};
    for (const r of ranked) scores[r.item.playerId] = ctx.cfg.points[r.rank - 1] ?? 0;
    const results: Results = {
      design: s.design,
      cible: s.cible,
      ranking: ranked.map((r) => ({ ...r.item, rank: r.rank })),
      missed: ctx.players.filter((p) => !s.stops.has(p.id)).map((p) => ({ playerId: p.id })),
    };
    return { results, scores };
  },
});
