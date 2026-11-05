// "Compte à rebours chaotique" : un gros bouton à presser pile à l'heure cible, un joueur après l'autre.
// Le compteur est visible quelques secondes sur la TV, puis il devient fou : il faut finir de compter dans sa tête.
// Le téléphone mesure lui-même le temps (performance.now) : la latence du wifi n'avantage ni ne pénalise personne.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { rankByError } from "./rank";

const variantSchema = z.object({
  titre: z.string().min(1),
  cible: z.number().min(1, "cible : au moins 1 seconde"),
  visible: z.number().nonnegative().default(3),
  decompte: z.boolean().default(false),
});

const configSchema = z.object({
  nom: z.string().default("Compte à rebours chaotique"),
  description: z.string().default("Arrêtez le compteur pile à l'heure… quand il devient fou, comptez dans votre tête !"),
  delai_depart: z.number().positive().default(10),
  duree_revelation: z.number().nonnegative().default(3.5),
  temps_resultats: z.number().nonnegative().default(15),
  points: z.array(z.number()).default([150, 100, 70, 50, 30, 20, 10, 0]),
  variantes: z.array(variantSchema).min(1, "Ajoute au moins une variante"),
});

type Cfg = z.infer<typeof configSchema>;
type Item = z.infer<typeof variantSchema>;
type Ctx = RoundContext<Cfg>;

/** Un passage de joueur. */
export interface Turn {
  id: string;
  status: "pending" | "current" | "done" | "missed";
  /** Temps mesuré (ms) quand il a appuyé sur STOP. */
  elapsedMs: number | null;
  /** Temps mesuré − cible (ms) : négatif = trop tôt. */
  signedMs: number | null;
  /** Pourquoi le tour est raté : pas parti à temps, jamais arrêté, ou déconnecté. */
  reason: "no-start" | "no-stop" | "absent" | null;
}

type Phase = "idle" | "waiting" | "running" | "reveal" | "done";

interface State {
  item: Item;
  phase: Phase;
  turns: Turn[];
  /** Numéro du tour en cours (sert aussi à ignorer les timers d'un tour déjà terminé). */
  turnNo: number;
  /** Joueur du tour en cours ; reste le même pendant la révélation de son résultat. */
  currentId: string | null;
  startedAt: number | null;
}

export interface Pub {
  titre: string;
  cible: number;
  visible: number;
  decompte: boolean;
  phase: Phase;
  /** Joueur dont c'est le tour. */
  currentId: string | null;
  /** Numéro du tour (change à chaque joueur). */
  turnNo: number;
  /** Heure serveur (ms) du départ : la TV en déduit le compteur. */
  startedAt: number | null;
  turns: Turn[];
}
export type Priv = { id: string };
export interface Results {
  titre: string;
  cible: number;
  ranking: { playerId: string; rank: number; elapsedMs: number; signedMs: number }[];
  missed: { playerId: string; reason: NonNullable<Turn["reason"]> }[];
}

const current = (s: State) => s.turns.find((t) => t.id === s.currentId && t.status === "current") ?? null;
/** Sécurité : si personne n'appuie sur STOP avant cible × 3, le tour est raté. */
const CAP_FACTOR = 3;
/** Écart toléré entre le temps du téléphone et celui vu par le serveur (sinon on croit le serveur). */
const TRUST_MS = 2000;

/** Passe au joueur suivant (ou termine la manche). */
function nextTurn(s: State, ctx: Ctx) {
  for (;;) {
    const t = s.turns.find((x) => x.status === "pending");
    if (!t) {
      s.phase = "done";
      s.currentId = null;
      ctx.clearCountdown();
      ctx.end();
      return;
    }
    s.turnNo++;
    s.startedAt = null;
    const here = ctx.players.find((p) => p.id === t.id);
    if (!here || !here.connected) {
      t.status = "missed";
      t.reason = "absent";
      continue;
    }
    t.status = "current";
    s.currentId = t.id;
    s.phase = "waiting";
    const no = s.turnNo;
    ctx.countdown(ctx.cfg.delai_depart, () => {
      if (s.turnNo === no && s.phase === "waiting") miss(s, ctx, "no-start");
    });
    return;
  }
}

/** Le joueur courant rate son tour : court affichage puis suite. */
function miss(s: State, ctx: Ctx, reason: "no-start" | "no-stop") {
  const t = current(s);
  if (!t) return;
  t.status = "missed";
  t.reason = reason;
  reveal(s, ctx);
}

function reveal(s: State, ctx: Ctx) {
  s.phase = "reveal";
  const no = s.turnNo;
  ctx.clearCountdown();
  ctx.setTimeout(ctx.cfg.duree_revelation * 1000, () => {
    if (s.turnNo === no && s.phase === "reveal") nextTurn(s, ctx);
  });
}

export default defineMiniGame<Cfg, Item, State>({
  id: "compte-a-rebours",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) => cfg.variantes,
  roundSeconds: () => null,
  // Estimation pour 8 joueurs : départ ~3 s + cible moyenne + révélation, puis les résultats.
  estimateSeconds: (cfg) => {
    const avg = cfg.variantes.reduce((a, v) => a + v.cible, 0) / cfg.variantes.length;
    return Math.round(8 * (3 + avg + cfg.duree_revelation) + cfg.temps_resultats);
  },

  start(item, ctx) {
    // Ordre de passage aléatoire (mélange de Fisher-Yates avec le rng du moteur).
    const ids = ctx.players.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(ctx.rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    const turns: Turn[] = ids.map((id) => ({ id, status: "pending", elapsedMs: null, signedMs: null, reason: null }));
    return { item, phase: "idle", turns, turnNo: 0, currentId: null, startedAt: null };
  },

  onPlay: (s, ctx) => nextTurn(s, ctx),

  input(s, playerId, payload, ctx) {
    const who = current(s);
    if (!who || who.id !== playerId || typeof payload !== "object" || payload === null) return;
    const p = payload as { action?: unknown; ms?: unknown };

    if (p.action === "start" && s.phase === "waiting") {
      s.phase = "running";
      s.startedAt = ctx.now();
      ctx.clearCountdown();
      const no = s.turnNo;
      ctx.setTimeout(s.item.cible * CAP_FACTOR * 1000, () => {
        if (s.turnNo === no && s.phase === "running") miss(s, ctx, "no-stop");
      });
    } else if (p.action === "stop" && s.phase === "running" && s.startedAt !== null) {
      const serverMs = ctx.now() - s.startedAt;
      let ms = serverMs;
      if (typeof p.ms === "number" && Number.isFinite(p.ms) && p.ms >= 0 && Math.abs(p.ms - serverMs) <= TRUST_MS) ms = p.ms;
      who.status = "done";
      who.elapsedMs = Math.round(ms);
      who.signedMs = Math.round(ms - s.item.cible * 1000);
      reveal(s, ctx);
    }
  },

  publicView: (s): Pub => ({
    titre: s.item.titre,
    cible: s.item.cible,
    visible: s.item.visible,
    decompte: s.item.decompte,
    phase: s.phase,
    currentId: s.currentId,
    turnNo: s.turnNo,
    startedAt: s.startedAt,
    turns: s.turns,
  }),

  privateView: (_s, playerId): Priv => ({ id: playerId }),

  finish(s, ctx) {
    const done = s.turns.filter((t) => t.status === "done");
    const ranked = rankByError(done, (t) => t.signedMs!);
    const scores: Record<string, number> = {};
    for (const r of ranked) scores[r.item.id] = ctx.cfg.points[r.rank - 1] ?? 0;
    const results: Results = {
      titre: s.item.titre,
      cible: s.item.cible,
      ranking: ranked.map((r) => ({ playerId: r.item.id, rank: r.rank, elapsedMs: r.item.elapsedMs!, signedMs: r.item.signedMs! })),
      missed: s.turns.filter((t) => t.status !== "done").map((t) => ({ playerId: t.id, reason: t.reason ?? "no-start" })),
    };
    return { results, scores };
  },
});
