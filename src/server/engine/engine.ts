// Le moteur de partie : une machine à états qui fait autorité.
// Les écrans ne font qu'afficher le snapshot qu'il produit et lui envoyer des actions.
//
//   lobby ──start──► intro ──(intro_secondes)──► playing ──(chrono ou ctx.end)──► results
//                      ▲                                                            │
//                      └──────────── tout le monde a cliqué "Continuer" ◄───────────┘
//   … après la dernière manche : final
import { randomBytes, randomUUID } from "node:crypto";
import type { RoundContext } from "../../minigames/contract";
import { profileSchema } from "../../shared/schemas";
import type { GameSnapshot, Phase, PlayerId, Profile, PublicPlayer, RoundInfo, Setup } from "../../shared/types";
import { realClock, TimerGroup, type Clock } from "./clock";
import { buildCatalog, buildPlan, defaultSetup, sanitizeSetup, type LoadedGame, type PlannedRound } from "./planner";

export class GameError extends Error {}

export interface EngineSettings {
  title: string;
  targetMinutes: number;
  order: "melange" | "groupe";
  introSeconds: number;
}

/** Ce qui est écrit dans data/save.json pour survivre à un crash du PC. */
export interface SaveData {
  version: 1;
  players: { id: PlayerId; token: string; profile: Profile | null; score: number }[];
  setup: Setup;
  plan: PlannedRound[];
  roundIndex: number;
  phase: Phase;
}

export interface Persistence {
  load(): SaveData | null;
  save(data: SaveData): void;
}

export interface EngineOptions {
  games: LoadedGame[];
  settings: EngineSettings;
  joinUrl: string;
  clock?: Clock;
  rng?: () => number;
  /** Appelé après chaque changement d'état (le serveur rediffuse les snapshots). */
  onChange?: () => void;
  persistence?: Persistence;
}

interface PlayerRecord {
  id: PlayerId;
  token: string;
  profile: Profile | null;
  score: number;
  sockets: number; // nombre de connexions ouvertes (un joueur peut avoir 2 onglets)
}

interface CurrentRound {
  loaded: LoadedGame;
  item: unknown;
  state: unknown;
  ctx: RoundContext<any>;
  timers: TimerGroup;
  mainTimer: number | null; // timer de l'intro puis du chrono visible
  timerTotalMs: number | null; // durée totale du chrono visible (pour la barre de progression)
  endRequested: boolean;
  results: unknown;
  deltas: Record<PlayerId, number> | null;
}

export class GameEngine {
  private players = new Map<PlayerId, PlayerRecord>();
  private phase: Phase = "lobby";
  private paused = false;
  private plan: PlannedRound[] = [];
  private roundIndex = -1;
  private current: CurrentRound | null = null;
  private continued = new Set<PlayerId>();
  private setup: Setup;
  private resumable: SaveData | null = null;

  private readonly games: Map<string, LoadedGame>;
  private readonly clock: Clock;
  private readonly rng: () => number;
  readonly catalog;

  constructor(private opts: EngineOptions) {
    this.games = new Map(opts.games.map((g) => [g.game.id, g]));
    this.clock = opts.clock ?? realClock;
    this.rng = opts.rng ?? Math.random;
    this.catalog = buildCatalog(opts.games, opts.settings.introSeconds);
    this.setup = defaultSetup(this.catalog, opts.settings.targetMinutes);
    this.restoreFromSave();
  }

  // ───────────────────────────── Joueurs ─────────────────────────────

  /** Rejoint (ou retrouve avec son jeton) un joueur. */
  join(token: string | null): { playerId: PlayerId; token: string } {
    let p = token ? [...this.players.values()].find((x) => x.token === token) : undefined;
    if (!p) {
      p = { id: randomUUID().slice(0, 8), token: randomBytes(16).toString("hex"), profile: null, score: 0, sockets: 0 };
      this.players.set(p.id, p);
    }
    p.sockets++;
    this.changed();
    return { playerId: p.id, token: p.token };
  }

  disconnect(playerId: PlayerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.sockets = Math.max(0, p.sockets - 1);
    this.checkAllContinued();
    this.changed();
  }

  setProfile(playerId: PlayerId, profile: unknown) {
    const p = this.mustPlayer(playerId);
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) throw new GameError(parsed.error.issues[0]?.message ?? "Profil invalide");
    p.profile = parsed.data;
    this.save();
    this.changed();
  }

  kick(playerId: PlayerId) {
    this.players.delete(playerId);
    this.continued.delete(playerId);
    this.checkAllContinued();
    this.save();
    this.changed();
  }

  hasPlayer(playerId: PlayerId) {
    return this.players.has(playerId);
  }

  // ───────────────────────────── Maître du jeu ─────────────────────────────

  setSetup(setup: Setup) {
    if (this.phase !== "lobby") throw new GameError("La partie a déjà commencé");
    this.setup = sanitizeSetup(setup, this.catalog);
    this.changed();
  }

  start() {
    if (this.phase !== "lobby") throw new GameError("La partie a déjà commencé");
    if (![...this.players.values()].some((p) => p.profile)) throw new GameError("Aucun joueur prêt");
    const plan = buildPlan(this.opts.games, this.setup, this.opts.settings.order, this.rng);
    if (plan.length === 0) throw new GameError("Choisis au moins une manche");
    for (const p of this.players.values()) p.score = 0;
    this.plan = plan;
    this.roundIndex = -1;
    this.resumable = null;
    this.nextRound();
  }

  /** Reprend la partie sauvegardée (après un crash ou une fermeture). */
  resumeSave() {
    const save = this.resumable;
    if (!save || this.phase !== "lobby") throw new GameError("Rien à reprendre");
    this.plan = save.plan.filter((r) => this.games.has(r.gameId));
    // Une manche interrompue avant ses résultats est rejouée, sinon on passe à la suivante.
    this.roundIndex = save.phase === "results" ? save.roundIndex : save.roundIndex - 1;
    this.resumable = null;
    this.nextRound();
  }

  /** Bouton "Passer" : fait avancer la phase en cours. */
  skip() {
    if (this.phase === "intro") this.beginPlaying();
    else if (this.phase === "playing") this.endRound();
    else if (this.phase === "results") this.nextRound();
  }

  pause() {
    if (!this.current || this.paused) return;
    this.paused = true;
    this.current.timers.pause();
    this.changed();
  }

  resume() {
    if (!this.current || !this.paused) return;
    this.paused = false;
    this.current.timers.resume();
    this.changed();
  }

  addTime(seconds: number) {
    const c = this.current;
    if (this.phase !== "playing" || !c || c.mainTimer === null) return;
    const delta = Math.max(-600, Math.min(600, seconds)) * 1000;
    c.timers.shift(c.mainTimer, delta);
    if (c.timerTotalMs !== null) c.timerTotalMs = Math.max(0, c.timerTotalMs + delta);
    this.changed();
  }

  /** Retour au lobby : on garde les joueurs, on remet les scores à zéro. */
  backToLobby() {
    this.current?.timers.clear();
    this.current = null;
    this.phase = "lobby";
    this.paused = false;
    this.plan = [];
    this.roundIndex = -1;
    this.continued.clear();
    for (const p of this.players.values()) p.score = 0;
    this.save();
    this.changed();
  }

  // ───────────────────────────── Actions des joueurs ─────────────────────────────

  input(playerId: PlayerId, payload: unknown) {
    const c = this.current;
    if (this.phase !== "playing" || !c || this.paused) throw new GameError("Pas maintenant");
    if (!c.ctx.players.some((p) => p.id === playerId)) throw new GameError("Tu joueras à la prochaine manche");
    this.runGame(() => c.loaded.game.input(c.state, playerId, payload, c.ctx));
    this.changed();
  }

  continue(playerId: PlayerId) {
    if (this.phase !== "results") return;
    this.continued.add(playerId);
    this.changed();
    this.checkAllContinued();
  }

  // ───────────────────────────── Déroulé ─────────────────────────────

  private nextRound(): void {
    this.current?.timers.clear();
    this.current = null;
    this.continued.clear();
    this.paused = false;
    this.roundIndex++;

    if (this.roundIndex >= this.plan.length) {
      this.phase = "final";
      this.save();
      this.changed();
      return;
    }

    const planned = this.plan[this.roundIndex]!;
    const loaded = this.games.get(planned.gameId)!;
    const timers = new TimerGroup(this.clock);
    const round: CurrentRound = {
      loaded,
      item: planned.item,
      state: null,
      timers,
      mainTimer: null,
      timerTotalMs: null,
      endRequested: false,
      results: null,
      deltas: null,
      ctx: {
        cfg: loaded.cfg,
        players: this.publicPlayers().filter((p) => p.profile),
        rng: this.rng,
        now: () => this.clock.now(),
        setTimeout: (ms, fn) => {
          timers.add(ms, () => {
            if (this.current !== round) return;
            this.runGame(fn);
            this.changed();
          });
        },
        update: () => this.changed(),
        end: () => {
          round.endRequested = true;
        },
        countdown: (seconds, onEnd) => {
          if (this.current !== round || this.phase !== "playing") {
            throw new Error("ctx.countdown s'utilise pendant le jeu (onPlay, input ou un timer)");
          }
          this.startCountdown(round, seconds * 1000, onEnd);
        },
        clearCountdown: () => {
          if (round.mainTimer !== null && this.phase === "playing") round.timers.cancel(round.mainTimer);
          round.mainTimer = null;
          round.timerTotalMs = null;
        },
      },
    };
    this.current = round;

    try {
      round.state = loaded.game.start(planned.item, round.ctx);
    } catch (err) {
      console.error(`[${loaded.game.id}] erreur au démarrage de la manche, on passe :`, err);
      return this.nextRound();
    }

    this.phase = "intro";
    round.mainTimer = timers.add(this.opts.settings.introSeconds * 1000, () => this.beginPlaying());
    this.save();
    this.changed();
  }

  private beginPlaying() {
    const c = this.current;
    if (!c || this.phase !== "intro") return;
    if (c.mainTimer !== null) c.timers.cancel(c.mainTimer); // si l'intro a été passée
    this.phase = "playing";
    const seconds = c.loaded.game.roundSeconds(c.loaded.cfg, c.item);
    if (seconds !== null) this.startCountdown(c, seconds * 1000);
    if (c.loaded.game.onPlay) this.runGame(() => c.loaded.game.onPlay!(c.state, c.ctx));
    this.changed();
  }

  /** Chrono visible sur les écrans. Sans `onEnd`, la manche se termine à la fin du chrono. */
  private startCountdown(c: CurrentRound, ms: number, onEnd?: () => void) {
    if (c.mainTimer !== null) c.timers.cancel(c.mainTimer);
    c.timerTotalMs = ms;
    c.mainTimer = c.timers.add(ms, () => {
      if (this.current !== c) return;
      c.mainTimer = null;
      c.timerTotalMs = null;
      if (onEnd) this.runGame(onEnd);
      else this.endRound();
      this.changed();
    });
  }

  private endRound() {
    const c = this.current;
    if (!c || this.phase !== "playing") return;
    c.timers.clear();
    c.mainTimer = null;
    this.paused = false;
    try {
      const outcome = c.loaded.game.finish(c.state, c.ctx);
      c.results = outcome.results;
      c.deltas = {};
      for (const [id, pts] of Object.entries(outcome.scores)) {
        const p = this.players.get(id);
        if (!p || !Number.isFinite(pts)) continue;
        p.score += pts;
        c.deltas[id] = pts;
      }
    } catch (err) {
      console.error(`[${c.loaded.game.id}] erreur au calcul des résultats :`, err);
      c.results = null;
      c.deltas = {};
    }
    this.phase = "results";
    this.save();
    this.changed();
  }

  /** Exécute du code de mini-jeu sans laisser un bug faire tomber la soirée. */
  private runGame(fn: () => void) {
    const c = this.current;
    try {
      fn();
    } catch (err) {
      if (err instanceof GameError) throw err;
      console.error(`[${c?.loaded.game.id}] erreur :`, err);
    }
    if (c && c === this.current && c.endRequested && this.phase === "playing") this.endRound();
  }

  private checkAllContinued() {
    if (this.phase !== "results") return;
    const waiting = [...this.players.values()].filter((p) => p.profile && p.sockets > 0);
    if (waiting.length > 0 && waiting.every((p) => this.continued.has(p.id))) this.nextRound();
  }

  // ───────────────────────────── Snapshot ─────────────────────────────

  private publicPlayers(): PublicPlayer[] {
    return [...this.players.values()].map((p) => ({ id: p.id, profile: p.profile, score: p.score, connected: p.sockets > 0 }));
  }

  /** Vue envoyée à un écran. viewer = id du joueur, ou null pour la TV. */
  snapshot(viewer: PlayerId | null): GameSnapshot {
    const c = this.current;
    let round: RoundInfo | null = null;
    let priv: unknown = null;
    if (c) {
      const g = c.loaded.game;
      const fireAt = c.mainTimer !== null && this.phase === "playing" ? c.timers.fireAt(c.mainTimer) : null;
      round = {
        index: this.roundIndex,
        total: this.plan.length,
        gameId: g.id,
        gameName: g.name(c.loaded.cfg),
        participants: c.ctx.players.map((p) => p.id),
        deadline: this.paused ? null : fireAt,
        pausedRemainingMs: this.paused && c.mainTimer !== null ? c.timers.remaining(c.mainTimer) : null,
        timerTotalMs: this.phase === "playing" ? c.timerTotalMs : null,
        public: safe(() => g.publicView(c.state, c.ctx)),
        results: this.phase === "results" ? c.results : null,
        deltas: this.phase === "results" ? c.deltas : null,
      };
      if (viewer && g.privateView) priv = safe(() => g.privateView!(c.state, viewer, c.ctx));
    }
    return {
      title: this.opts.settings.title,
      phase: this.phase,
      paused: this.paused,
      players: this.publicPlayers(),
      round,
      continued: [...this.continued],
      catalog: this.catalog,
      setup: this.setup,
      resumable: this.resumable ? { roundIndex: this.resumable.roundIndex, total: this.resumable.plan.length } : null,
      joinUrl: this.opts.joinUrl,
      me: viewer ? { id: viewer, private: priv, inRound: !!c?.ctx.players.some((p) => p.id === viewer) } : null,
    };
  }

  // ───────────────────────────── Sauvegarde ─────────────────────────────

  private save() {
    this.opts.persistence?.save({
      version: 1,
      players: [...this.players.values()].map(({ id, token, profile, score }) => ({ id, token, profile, score })),
      setup: this.setup,
      plan: this.plan,
      roundIndex: this.roundIndex,
      phase: this.phase,
    });
  }

  private restoreFromSave() {
    const save = this.opts.persistence?.load();
    if (!save || save.version !== 1) return;
    for (const p of save.players) this.players.set(p.id, { ...p, sockets: 0 });
    if (save.setup) this.setup = sanitizeSetup(save.setup, this.catalog);
    const inProgress = save.phase === "intro" || save.phase === "playing" || save.phase === "results";
    if (inProgress && save.plan.length > 0) this.resumable = save;
  }

  private mustPlayer(id: PlayerId) {
    const p = this.players.get(id);
    if (!p) throw new GameError("Joueur inconnu");
    return p;
  }

  private changed() {
    this.opts.onChange?.();
  }
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (err) {
    console.error("erreur de vue de mini-jeu :", err);
    return null;
  }
}
