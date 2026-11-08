// "Simon" : la TV joue une suite de couleurs, chacun la reproduit sur son téléphone ; elle s'allonge d'une note à chaque étape.
// Une manche = une partie de Simon complète. Le dernier joueur debout gagne.
//  - "show"    : la TV joue la suite (animation pilotée par des horodatages serveur), les téléphones attendent.
//  - "play"    : chacun tape la suite ; le serveur valide au fil des touches (une faute élimine tout de suite).
//  - "between" : courte pause pendant laquelle la TV montre qui reste, puis une note est ajoutée.
//  - "over"    : fin de partie (vainqueurs fêtés), puis la manche se termine.
import { z } from "zod";
import { defineMiniGame, type RoundContext } from "../contract";
import { allConnectedDone, playerIds } from "../helpers";

const PADS = 4;
/** Délai avant la 1re note (le temps de lire "Regardez bien !"), puis après la dernière. */
const LEAD_IN_MS = 1600;
const TAIL_MS = 500;
/** Pause entre deux étapes, et fête finale avant les résultats. */
const BETWEEN_MS = 2600;
const OVER_MS = 5000;

const posInt = z.number().int().positive();
const variantSchema = z.union([
  z.string().min(1),
  z.object({
    nom: z.string().min(1),
    vitesse_ms: z.number().min(100).optional(),
    longueur_depart: posInt.optional(),
    longueur_max: posInt.optional(),
    temps_par_note: z.number().positive().optional(),
  }),
]);

const configSchema = z.object({
  nom: z.string().default("Simon"),
  description: z.string().default("Mémorisez la suite de couleurs et reproduisez-la : le dernier debout gagne"),
  temps_resultats: z.number().nonnegative().default(15),
  vitesse_ms: z.number().min(100).default(650),
  longueur_depart: posInt.default(3),
  longueur_max: posInt.default(20),
  temps_par_note: z.number().positive().default(1.2),
  points: z
    .object({
      par_etape: z.number().default(20),
      vainqueur: z.number().default(150),
    })
    .default({ par_etape: 20, vainqueur: 150 }),
  variantes: z.array(variantSchema).min(1, "Ajoute au moins une variante").max(25, "25 variantes maximum").default(["Classique"]),
});

type Cfg = z.infer<typeof configSchema>;
type Item = { name: string; speed: number; start: number; max: number; timePerNote: number };
type Ctx = RoundContext<Cfg>;
type Stage = "wait" | "show" | "play" | "between" | "over";
type OutReason = "wrong" | "time";

interface State {
  item: Item;
  seq: number[];
  stage: Stage;
  /** Joueurs encore en lice. */
  alive: Set<string>;
  /** Joueurs en lice au début de l'étape en cours (si tous échouent ensemble, ils gagnent ensemble). */
  startAlive: string[];
  progress: Map<string, number>;
  done: Set<string>;
  stepsDone: Map<string, number>;
  /** Éliminés, dans l'ordre : longueur de la suite à laquelle ils sont tombés. */
  out: { id: string; length: number; reason: OutReason }[];
  show: { startAt: number; noteMs: number } | null;
  over: boolean;
  winners: string[];
}

export interface Pub {
  stage: Stage;
  /** Longueur de la suite de l'étape en cours. */
  length: number;
  maxLength: number;
  variant: string;
  /** Éliminés, dans l'ordre d'élimination. */
  out: { id: string; length: number }[];
  /** Ont réussi l'étape en cours. */
  doneIds: string[];
  /** Nombre de touches justes de chacun sur l'étape en cours (pas lesquelles). */
  progress: Record<string, number>;
  /** Pendant que la TV joue la suite. `sequence` n'est remplie que pour la TV (tvView). */
  show: { startAt: number; noteMs: number; sequence: number[] } | null;
  winners: string[];
}
export interface Priv {
  status: "watch" | "play" | "done" | "out" | "win";
  progress: number;
  length: number;
  reason: OutReason | null;
}
export interface PlayerResult {
  playerId: string;
  /** Étapes réussies. */
  steps: number;
  /** Plus longue suite reproduite sans faute (0 = aucune). */
  mastered: number;
  /** Longueur à laquelle le joueur est tombé, null s'il est resté debout. */
  outAt: number | null;
  winner: boolean;
}
export interface Results {
  rows: PlayerResult[];
  /** Plus longue suite atteinte par la partie. */
  length: number;
}

/** Durée d'une note (ms) : accélère légèrement à chaque note ajoutée, sans descendre sous la moitié. */
export function noteDuration(item: Pick<Item, "speed" | "start">, length: number): number {
  return Math.round(Math.max(item.speed * 0.5, item.speed * (1 - 0.025 * Math.max(0, length - item.start))));
}

/** Temps accordé pour reproduire une suite (s). */
export function playSeconds(item: Pick<Item, "timePerNote">, length: number): number {
  return Math.ceil(item.timePerNote * length + 3);
}

const randomPad = (rng: () => number) => Math.min(PADS - 1, Math.floor(rng() * PADS));

function beginShow(state: State, ctx: Ctx) {
  state.stage = "show";
  state.done.clear();
  state.progress = new Map([...state.alive].map((id) => [id, 0]));
  state.startAlive = [...state.alive];
  ctx.clearCountdown();
  const length = state.seq.length;
  const noteMs = noteDuration(state.item, length);
  state.show = { startAt: ctx.now() + LEAD_IN_MS, noteMs };
  ctx.setTimeout(LEAD_IN_MS + length * noteMs + TAIL_MS, () => beginPlay(state, ctx));
}

function beginPlay(state: State, ctx: Ctx) {
  state.stage = "play";
  state.show = null;
  ctx.countdown(playSeconds(state.item, state.seq.length), () => endStep(state, ctx));
}

function eliminate(state: State, id: string, reason: OutReason) {
  if (!state.alive.delete(id)) return;
  state.out.push({ id, length: state.seq.length, reason });
}

/** Étape terminée dès que tous ceux qui restent (et sont connectés) ont fini, ou qu'il ne reste personne. */
function checkStepDone(state: State, ctx: Ctx) {
  if (state.stage !== "play") return;
  if (state.alive.size === 0 || allConnectedDone(ctx, [...state.alive], (id) => state.done.has(id))) endStep(state, ctx);
}

function endStep(state: State, ctx: Ctx) {
  if (state.stage !== "play") return;
  for (const id of [...state.alive]) if (!state.done.has(id)) eliminate(state, id, "time");
  ctx.clearCountdown();
  const length = state.seq.length;
  const survivors = [...state.alive];
  const lastStanding = ctx.players.length > 1 ? 1 : 0; // seul à jouer : on continue jusqu'à la faute

  if (survivors.length === 0) {
    state.winners = state.startAlive; // tous tombés ensemble : ex æquo
  } else if (survivors.length <= lastStanding || length >= state.item.max) {
    state.winners = survivors;
  } else {
    state.stage = "between";
    ctx.setTimeout(BETWEEN_MS, () => {
      state.seq.push(randomPad(ctx.rng));
      beginShow(state, ctx);
    });
    return;
  }
  state.stage = "over";
  state.over = true;
  ctx.setTimeout(OVER_MS, () => ctx.end());
}

function buildItems(cfg: Cfg): Item[] {
  return cfg.variantes.map((v) => {
    const o = typeof v === "string" ? { nom: v } : v;
    const start = ("longueur_depart" in o ? o.longueur_depart : undefined) ?? cfg.longueur_depart;
    return {
      name: o.nom,
      speed: ("vitesse_ms" in o ? o.vitesse_ms : undefined) ?? cfg.vitesse_ms,
      start,
      max: Math.max(start, ("longueur_max" in o ? o.longueur_max : undefined) ?? cfg.longueur_max),
      timePerNote: ("temps_par_note" in o ? o.temps_par_note : undefined) ?? cfg.temps_par_note,
    };
  });
}

const game = defineMiniGame<Cfg, Item, State>({
  id: "simon",
  configSchema,
  name: (cfg) => cfg.nom,
  description: (cfg) => cfg.description,
  items: buildItems,
  roundSeconds: () => null, // le jeu gère ses étapes avec ctx.countdown
  estimateSeconds(cfg) {
    // Une partie type dure environ 6 étapes à partir de la longueur de départ.
    const item = buildItems(cfg)[0]!;
    let total = 0;
    for (let length = item.start; length < Math.min(item.max, item.start + 6); length++) {
      total += (LEAD_IN_MS + length * noteDuration(item, length) + TAIL_MS + BETWEEN_MS) / 1000 + length * 0.9 + 2;
    }
    return Math.round(total + OVER_MS / 1000 + cfg.temps_resultats);
  },

  start(item, ctx) {
    const alive = new Set(playerIds(ctx));
    return {
      item,
      seq: Array.from({ length: item.start }, () => randomPad(ctx.rng)),
      stage: "wait",
      alive,
      startAlive: [...alive],
      progress: new Map(),
      done: new Set(),
      stepsDone: new Map(),
      out: [],
      show: null,
      over: false,
      winners: [],
    };
  },

  onPlay(state, ctx) {
    beginShow(state, ctx);
  },

  input(state, playerId, payload, ctx) {
    const pad = (payload as { pad?: unknown } | null)?.pad;
    if (typeof pad !== "number" || !Number.isInteger(pad) || pad < 0 || pad >= PADS) return;
    if (state.stage !== "play" || !state.alive.has(playerId) || state.done.has(playerId)) return;

    const index = state.progress.get(playerId) ?? 0;
    if (state.seq[index] !== pad) {
      eliminate(state, playerId, "wrong");
    } else {
      state.progress.set(playerId, index + 1);
      if (index + 1 === state.seq.length) {
        state.done.add(playerId);
        state.stepsDone.set(playerId, (state.stepsDone.get(playerId) ?? 0) + 1);
      }
    }
    checkStepDone(state, ctx);
  },

  onPresenceChange: checkStepDone,

  publicView(state): Pub {
    return {
      stage: state.stage,
      length: state.seq.length,
      maxLength: state.item.max,
      variant: state.item.name,
      out: state.out.map(({ id, length }) => ({ id, length })),
      doneIds: [...state.done],
      progress: Object.fromEntries(state.progress),
      // La suite elle-même n'est envoyée qu'à la TV (voir tvView) : un téléphone ne peut pas la lire.
      show: state.stage === "show" && state.show ? { ...state.show, sequence: [] } : null,
      winners: state.over ? state.winners : [],
    };
  },

  tvView(state, ctx): Pub {
    const pub = this.publicView(state, ctx) as Pub;
    return pub.show ? { ...pub, show: { ...pub.show, sequence: [...state.seq] } } : pub;
  },

  privateView(state, playerId): Priv {
    let status: Priv["status"];
    if (state.over && state.winners.includes(playerId)) status = "win";
    else if (!state.alive.has(playerId)) status = "out";
    else if (state.stage === "play") status = state.done.has(playerId) ? "done" : "play";
    else if (state.stage === "between" || state.over) status = "done";
    else status = "watch";
    return {
      status,
      progress: state.progress.get(playerId) ?? 0,
      length: state.seq.length,
      reason: state.out.find((o) => o.id === playerId)?.reason ?? null,
    };
  },

  finish(state, ctx) {
    // Si le maître du jeu passe la manche avant la fin, ceux qui sont encore debout l'emportent.
    const winners = state.over ? state.winners : [...state.alive];
    const base = state.item.start - 1;
    const rows: PlayerResult[] = ctx.players.map((p) => {
      const steps = state.stepsDone.get(p.id) ?? 0;
      return {
        playerId: p.id,
        steps,
        mastered: steps > 0 ? base + steps : 0,
        outAt: state.out.find((o) => o.id === p.id)?.length ?? null,
        winner: winners.includes(p.id),
      };
    });
    rows.sort(
      (a, b) =>
        Number(b.winner) - Number(a.winner) ||
        (b.outAt ?? Infinity) - (a.outAt ?? Infinity) ||
        b.steps - a.steps,
    );
    const scores: Record<string, number> = {};
    for (const r of rows) {
      const pts = r.steps * ctx.cfg.points.par_etape + (r.winner ? ctx.cfg.points.vainqueur : 0);
      if (pts > 0) scores[r.playerId] = pts;
    }
    const results: Results = { rows, length: state.seq.length };
    return { results, scores };
  },
});

export default game;
