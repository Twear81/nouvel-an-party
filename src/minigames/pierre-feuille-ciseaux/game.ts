// "Pierre-feuille-ciseaux : le tournoi" : une manche = un tournoi à élimination directe entre tous les joueurs.
// Les duels d'un même tour se jouent en même temps, chacun sur son téléphone ; l'égalité se rejoue.
// Logique de l'arbre dans bracket.ts (pure, testée à part) ; ici : étapes, chronos, vues publiques/privées, points.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone, playerIds } from "../helpers";
import {
  advanceWinners,
  applyThrow,
  buildBracket,
  championOf,
  completeBracket,
  isChoice,
  isRoundDone,
  pendingDuels,
  reachedRounds,
  tournamentScores,
  type Bracket,
  type Choice,
  type ThrowRecord,
} from "./bracket";

const variantSchema = z.object({
  nom: z.string().min(1),
  manches_gagnantes: z.number().int().min(1).max(5).optional(),
  duree: z.number().positive().optional(),
});

const configSchema = z.object({
  nom: z.string().default("Pierre-feuille-ciseaux : le tournoi"),
  description: z.string().default("Tournoi à élimination directe : ✊ ✋ ✌️ en duel, un seul champion"),
  duree: z.number().positive().default(10),
  duree_rejouer: z.number().positive().default(6),
  rejouer_max: z.number().int().min(0).default(3),
  manches_gagnantes: z.number().int().min(1).max(5).default(1),
  temps_resultats: z.number().nonnegative().default(15),
  points: z
    .object({
      vainqueur: z.number().default(300),
      suivants: z.array(z.number()).default([150, 75, 25]),
    })
    .default({ vainqueur: 300, suivants: [150, 75, 25] }),
  variantes: z
    .array(variantSchema)
    .min(1, "Ajoute au moins une variante")
    .default([{ nom: "Tournoi classique" }, { nom: "Tournoi en 2 manches gagnantes", manches_gagnantes: 2 }]),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { title: string; winsNeeded: number; duration: number };
type Ctx = RoundContext<Cfg>;

/** Étapes d'une manche, dans l'ordre : tirage → (lancer → révélation)* → avancée → … → champion. */
export type Step = "draw" | "pick" | "reveal" | "advance" | "done";

/** Durées des étapes sans chrono visible (ms). */
export const TIMINGS = { draw: 5000, reveal: 4500, revealFinal: 6500, advance: 2800, champion: 4000 };

interface State {
  item: Item;
  bracket: Bracket;
  step: Step;
  round: number;
  /** Lancers déjà joués dans ce tour (0 = premier lancer, > 0 = rejeu). */
  throwNo: number;
  /** Duels du tour qui lancent en ce moment (index dans le tour). */
  active: Set<number>;
  picks: Map<string, Choice>;
  /** Dernier lancer de chaque duel actif, pendant la révélation. */
  last: Map<number, ThrowRecord>;
  /** Passe tout de suite à la révélation (défini dans onPlay). */
  revealNow?: () => void;
}

export interface MatchView {
  a: string | null;
  b: string | null;
  bye: boolean;
  winner: string | null;
  wins: [number, number];
  ties: number;
  byChance: boolean;
  /** Ce duel lance en ce moment. */
  active: boolean;
  /** a / b ont choisi (sans dire quoi). */
  picked: [boolean, boolean];
  /** Révélation du dernier lancer (étape "reveal" seulement). */
  last: ThrowRecord | null;
}

export interface Pub {
  variant: string;
  step: Step;
  /** Nombre de tours de l'arbre (3 = quarts, demies, finale). 0 s'il n'y a pas assez de joueurs. */
  roundCount: number;
  round: number;
  throwNo: number;
  winsNeeded: number;
  bracket: MatchView[][];
  champion: string | null;
}

export type PrivStatus = "duel" | "through" | "out" | "champion" | "none";
export interface Priv {
  status: PrivStatus;
  /** Adversaire du duel en cours (status "duel"). */
  opponent: string | null;
  /** Mon camp dans le duel : 0 = a, 1 = b. */
  side: 0 | 1 | null;
  myPick: Choice | null;
  /** Qualifié d'office au 1er tour (status "through"). */
  bye: boolean;
  /** Tour où j'ai été battu (status "out"). */
  outRound: number | null;
}

export interface Results {
  variant: string;
  roundCount: number;
  winsNeeded: number;
  bracket: MatchView[][];
  champion: string | null;
  /** Tour atteint par chaque joueur (= roundCount pour le champion). */
  reached: Record<string, number>;
}

const rulesOf = (s: State, cfg: Cfg) => ({ winsNeeded: s.item.winsNeeded, maxReplays: cfg.rejouer_max });

function view(s: State, withLast: boolean): MatchView[][] {
  return s.bracket.map((round, r) =>
    round.map((d, i) => {
      const live = r === s.round && s.active.has(i) && (s.step === "pick" || s.step === "reveal");
      return {
        a: d.a,
        b: d.b,
        bye: d.bye,
        winner: d.winner,
        wins: [...d.wins] as [number, number],
        ties: d.ties,
        byChance: d.byChance,
        active: live,
        picked: [d.a !== null && live && s.picks.has(d.a), d.b !== null && live && s.picks.has(d.b)] as [boolean, boolean],
        last: withLast && r === s.round && s.step === "reveal" ? (s.last.get(i) ?? null) : null,
      };
    }),
  );
}

/** Où en est ce joueur dans l'arbre ? */
function statusOf(s: State, playerId: string): Priv {
  const out: Priv = { status: "none", opponent: null, side: null, myPick: null, bye: false, outRound: null };
  // Tours futurs ignorés : deux exempts déjà placés face à face au tour 2 attendent encore la fin du tour 1.
  for (let r = Math.min(s.round, s.bracket.length - 1); r >= 0; r--) {
    const i = s.bracket[r]!.findIndex((d) => d.a === playerId || d.b === playerId);
    if (i < 0) continue;
    const d = s.bracket[r]![i]!;
    const side = d.a === playerId ? 0 : 1;
    if (d.winner !== null) {
      if (d.winner !== playerId) return { ...out, status: "out", outRound: r };
      return { ...out, status: r === s.bracket.length - 1 ? "champion" : "through", bye: d.bye };
    }
    return { ...out, status: "duel", side, opponent: side === 0 ? d.b : d.a, myPick: s.picks.get(playerId) ?? null };
  }
  return out;
}

/** Tous les joueurs connectés des duels actifs ont choisi : inutile d'attendre la fin du chrono. */
function checkAllPicked(s: State, ctx: Ctx) {
  if (s.step !== "pick") return;
  const ids = pendingDuels(s.bracket, s.round)
    .filter(({ index }) => s.active.has(index))
    .flatMap(({ duel: d }) => [d.a!, d.b!]);
  if (allConnectedDone(ctx, ids, (id) => s.picks.has(id))) s.revealNow?.();
}

export default defineMiniGame<Cfg, Item, State>({
  id: "pierre-feuille-ciseaux",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: (cfg) =>
    cfg.variantes.map((v) => ({ title: v.nom, winsNeeded: v.manches_gagnantes ?? cfg.manches_gagnantes, duration: v.duree ?? cfg.duree })),
  // Chronos gérés par étapes (ctx.countdown pendant les lancers seulement).
  roundSeconds: () => null,
  // Pour 8 joueurs : 3 tours, chacun = lancer + révélation + avancée, un peu de rejeux.
  estimateSeconds: (cfg) => {
    const perRound = Math.min(cfg.duree, 6) + (TIMINGS.reveal + TIMINGS.advance) / 1000;
    return Math.round((TIMINGS.draw + TIMINGS.champion) / 1000 + 3 * perRound + 6 + cfg.temps_resultats);
  },

  start(item, ctx) {
    const bracket = buildBracket(
      playerIds(ctx),
      ctx.rng,
    );
    return { item, bracket, step: "draw", round: 0, throwNo: 0, active: new Set(), picks: new Map(), last: new Map() };
  },

  onPlay(s, ctx) {
    const startPick = () => {
      const pending = pendingDuels(s.bracket, s.round);
      if (pending.length === 0) return endRound();
      s.step = "pick";
      s.active = new Set(pending.map((p) => p.index));
      s.picks = new Map();
      s.last = new Map();
      ctx.countdown(s.throwNo === 0 ? s.item.duration : ctx.cfg.duree_rejouer, reveal);
      ctx.update();
    };

    const reveal = () => {
      ctx.clearCountdown();
      for (const { duel, index } of pendingDuels(s.bracket, s.round)) {
        if (!s.active.has(index)) continue;
        const rec = applyThrow(duel, s.picks.get(duel.a!) ?? null, s.picks.get(duel.b!) ?? null, rulesOf(s, ctx.cfg), ctx.rng);
        s.last.set(index, rec);
      }
      s.step = "reveal";
      ctx.update();
      const isFinal = s.round === s.bracket.length - 1;
      ctx.setTimeout(isFinal ? TIMINGS.revealFinal : TIMINGS.reveal, afterReveal);
    };

    const afterReveal = () => {
      if (!isRoundDone(s.bracket, s.round)) {
        // Égalité ou match en plusieurs manches : seuls les duels non décidés rejouent, les autres attendent.
        s.throwNo++;
        return startPick();
      }
      endRound();
    };

    const endRound = () => {
      advanceWinners(s.bracket, s.round);
      s.last = new Map();
      s.active = new Set();
      s.picks = new Map();
      if (s.round >= s.bracket.length - 1) {
        s.step = "done";
        ctx.update();
        ctx.setTimeout(TIMINGS.champion, () => ctx.end());
        return;
      }
      s.step = "advance";
      ctx.update();
      ctx.setTimeout(TIMINGS.advance, () => {
        s.round++;
        s.throwNo = 0;
        startPick();
      });
    };

    // Pas assez de joueurs pour un tournoi : on termine sans rien faire.
    if (s.bracket.length === 0) {
      s.step = "done";
      ctx.setTimeout(1500, () => ctx.end());
      return;
    }
    ctx.setTimeout(TIMINGS.draw, startPick);
    // Gardé dans l'état pour que `input` puisse déclencher la révélation anticipée.
    s.revealNow = reveal;
  },

  input(s, playerId, payload, ctx) {
    if (s.step !== "pick") return;
    const choice = (payload as { choice?: unknown } | null)?.choice;
    if (!isChoice(choice) || s.picks.has(playerId)) return;
    const duel = pendingDuels(s.bracket, s.round).find(({ index, duel: d }) => s.active.has(index) && (d.a === playerId || d.b === playerId));
    if (!duel) return;
    s.picks.set(playerId, choice);
    checkAllPicked(s, ctx);
  },

  onPresenceChange: checkAllPicked,

  publicView: (s): Pub => ({
    variant: s.item.title,
    step: s.step,
    roundCount: s.bracket.length,
    round: s.round,
    throwNo: s.throwNo,
    winsNeeded: s.item.winsNeeded,
    bracket: view(s, true),
    champion: championOf(s.bracket),
  }),

  privateView: (s, playerId): Priv => statusOf(s, playerId),

  finish(s, ctx) {
    // Manche interrompue (« Passer ») : on termine l'arbre au hasard pour avoir un champion et des points cohérents.
    if (championOf(s.bracket) === null && s.bracket.length > 0) completeBracket(s.bracket, ctx.rng);
    s.step = "done";
    s.active = new Set();
    const results: Results = {
      variant: s.item.title,
      roundCount: s.bracket.length,
      winsNeeded: s.item.winsNeeded,
      bracket: view(s, false),
      champion: championOf(s.bracket),
      reached: reachedRounds(s.bracket),
    };
    return { results, scores: tournamentScores(s.bracket, ctx.cfg.points.vainqueur, ctx.cfg.points.suivants) };
  },
});
