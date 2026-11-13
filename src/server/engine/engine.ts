// Le moteur de partie : une machine à états qui fait autorité.
// Les écrans ne font qu'afficher le snapshot qu'il produit et lui envoyer des actions.
//
//   lobby → ouverture de la pièce → (intro → playing → results) × N → sortie de la pièce → final
// Une frontière d'univers ferme ses résultats par une scène, avant la manche suivante.
// Une manche « interlude » saute uniquement son annonce de manche, jamais l'ouverture de la partie.
import { randomBytes, randomUUID } from "node:crypto";
import type { RoundContext, RoundOutcome } from "../../minigames/contract";
import { ceremonyElapsed, ceremonyTimeline, ceremonyStepAt, revealedAwards, revealedSouvenirs, type Award, type CeremonyInfo, type Keepsake, type RoundSummary } from "../../shared/ceremony";
import { DEFAULT_AWARD_CATEGORIES, type AwardCategoryContent } from "../outro-content";
import { drawAwards, chooseSouvenirs, type OutroSettings } from "./awards";
import { pruneKeepsakes, sanitizeHistory, sanitizeStats, sanitizeOpinions, sanitizeKeepsakes } from "./history";
import { activeNow } from "../../shared/clock";
import { finalRevealElapsed, finalTimelineOf, type FinalRevealInfo } from "../../shared/final-reveal";
import { midnightYear, nextOccurrence, type MidnightInfo } from "../../shared/midnight";
import { profileSchema } from "../../shared/schemas";
import { shuffle } from "../../shared/shuffle";
import { SKINS, isSkinId, type SkinId } from "../../shared/skins";
import { TRANSITION_TIMING, transitionElapsed, type TransitionInfo, type TransitionKind } from "../../shared/transitions";
import type { CatalogEntry, GameSnapshot, Phase, PlayerId, Profile, PublicPlayer, RoundInfo, Setup } from "../../shared/types";
import { realClock, TimerGroup, type Clock } from "./clock";
import { emptyDejaVu, markPlayed, sanitizeDejaVu, type DejaVuData, type DejaVuStore } from "./deja-vu";
import { assignRoundSkins, buildCatalog, buildPlan, defaultSetup, sanitizeSetup, type LoadedGame, type PlannedRound } from "./planner";

export class GameError extends Error {}

export interface SavedTransition extends TransitionInfo {
  elapsedMs: number;
  checkpointAt: number;
  paused: boolean;
}

export interface EngineSettings {
  title: string;
  targetMinutes: number;
  order: "melange" | "groupe";
  introSeconds: number;
  /** Compte à rebours de minuit ; absent = désactivé. */
  midnight?: MidnightSettings;
  outro?: OutroSettings;
}

export interface MidnightSettings {
  /** true = seulement le 1er janvier ; absent/false = chaque nuit (répétitions et anciens appelants). */
  newYearOnly?: boolean;
  /** Heure locale du PC, « HH:MM » ou « HH:MM:SS ». */
  time: string;
  /** Durée du compte à rebours affiché avant l'heure (s). */
  countdownSeconds: number;
  /** Reprise automatique après minuit (s) ; 0 = seulement quand l'hôte clique. */
  autoResumeSeconds: number;
}

/** Minuit en cours (compte à rebours puis célébration). */
interface MidnightState extends MidnightInfo {
  /** Vrai si c'est minuit qui a mis la partie en pause : seule la reprise automatique la relance alors. */
  pausedByMidnight: boolean;
  beganAt: number;
}

/** Ce qui est écrit dans data/save.json pour survivre à un crash du PC. */
export interface SaveData {
  version: 1;
  players: { id: PlayerId; token: string; profile: Profile | null; score: number }[];
  setup: Setup;
  plan: PlannedRound[];
  roundIndex: number;
  phase: Phase;
  finalReveal?: FinalRevealInfo | null;
  history?: RoundSummary[];
  ceremony?: CeremonyInfo | null;
  transition?: SavedTransition | null;
  /** Ordre des skins de la partie (absent des anciennes sauvegardes : un nouvel ordre est tiré). */
  skinOrder?: SkinId[];
  /** Minuit en cours au moment de la sauvegarde (reprise de la célébration après un crash). */
  midnight?: { targetAt: number } | null;
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
  /** Mémoire des éléments déjà joués (data/deja-vu.json). Absente : mémoire seulement le temps du processus. */
  dejaVu?: DejaVuStore;
  awardCategories?: AwardCategoryContent[];
  /** Durées réduites pour les parcours E2E, 1 en soirée. */
  ceremonyTimeScale?: number;
  /** Idem pour le classement final (1 en soirée). */
  finalTimeScale?: number;
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
  interlude: boolean;
  state: unknown;
  ctx: RoundContext<any>;
  timers: TimerGroup;
  mainTimer: number | null; // timer de l'intro puis du chrono visible
  timerTotalMs: number | null; // durée totale du chrono visible (pour la barre de progression)
  endRequested: boolean;
  results: unknown;
  deltas: Record<PlayerId, number> | null;
  resultsAt: number | null;
  pausedMs: number; // durée cumulée des pauses terminées de cette manche
  pausedSince: number | null; // début de la pause en cours
}

export class GameEngine {
  private players = new Map<PlayerId, PlayerRecord>();
  private phase: Phase = "lobby";
  private paused = false;
  private finalReveal: FinalRevealInfo | null = null;
  private transition: TransitionInfo | null = null;
  private history: RoundSummary[] = [];
  private ceremony: CeremonyInfo | null = null;
  private ceremonyTimers: TimerGroup | null = null;
  private transitionTimers: TimerGroup | null = null;
  private plan: PlannedRound[] = [];
  private roundIndex = -1;
  /** Premier cycle de skins ; les suivants sont préparés dans le plan et tous restent sauvegardés. */
  private skinOrder: SkinId[] = [];
  private current: CurrentRound | null = null;
  private continued = new Set<PlayerId>();
  private setup: Setup;
  private resumable: SaveData | null = null;
  private midnight: MidnightState | null = null;
  private midnightTimer: unknown = null;
  private savedMidnight: { targetAt: number } | null = null;

  private readonly games: Map<string, LoadedGame>;
  private readonly clock: Clock;
  private readonly rng: () => number;
  /** Recalculé quand la mémoire « déjà vu » change (nombre d'éléments neufs). */
  catalog: CatalogEntry[];
  private dejaVu: DejaVuData;

  constructor(private opts: EngineOptions) {
    this.games = new Map(opts.games.map((g) => [g.game.id, g]));
    this.clock = opts.clock ?? realClock;
    this.rng = opts.rng ?? Math.random;
    this.skinOrder = shuffle([...SKINS], this.rng);
    this.dejaVu = emptyDejaVu();
    try {
      this.dejaVu = sanitizeDejaVu(opts.dejaVu?.load());
    } catch {
      // illisible : tout est neuf
    }
    this.catalog = buildCatalog(opts.games, opts.settings.introSeconds, this.dejaVu);
    this.setup = defaultSetup(this.catalog, opts.settings.targetMinutes);
    this.restoreFromSave();
    this.initMidnight();
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
    if (p.sockets === 1) this.presenceChanged(p.id);
    this.changed();
    return { playerId: p.id, token: p.token };
  }

  disconnect(playerId: PlayerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    const was = p.sockets;
    p.sockets = Math.max(0, p.sockets - 1);
    if (was > 0 && p.sockets === 0) this.presenceChanged(playerId);
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
    const plan = buildPlan(this.opts.games, this.setup, this.opts.settings.order, this.rng, this.dejaVu);
    if (plan.length === 0) throw new GameError("Choisis au moins une manche");
    for (const p of this.players.values()) p.score = 0;
    this.history = [];
    this.ceremony = null;
    this.plan = assignRoundSkins(plan, this.skinOrder, this.rng);
    this.roundIndex = -1;
    this.resumable = null;
    this.beginTransition("opening", null, this.plan[0]!.skin!);
    this.freezeForMidnight();
  }

  /** Reprend la partie sauvegardée (après un crash ou une fermeture). */
  resumeSave() {
    const save = this.resumable;
    if (!save || this.phase !== "lobby") throw new GameError("Rien à reprendre");
    this.skinOrder = validSkinOrder(save.skinOrder) ?? this.skinOrder;
    this.plan = save.plan.filter((r) => this.games.has(r.gameId)).map((r) => {
      const { changeSkinAfter: _previousBoundary, ...round } = r;
      return this.games.get(r.gameId)!.game.changeSkinAfter ? { ...round, changeSkinAfter: true } : round;
    });
    if (!this.plan.every((r) => isSkinId(r.skin))) this.plan = assignRoundSkins(this.plan, this.skinOrder, this.rng);
    this.resumable = null;
    this.history = sanitizeHistory(save.history);
    if (save.phase === "ceremony" && validSavedCeremony(save.ceremony)) {
      this.roundIndex = save.roundIndex;
      this.beginCeremony(save.ceremony.playerIds, structuredClone(save.ceremony));
    } else if (save.phase === "transition" && validSavedTransition(save.transition)) {
      this.roundIndex = save.roundIndex;
      const scene = save.transition;
      const elapsed = scene.elapsedMs + (scene.paused ? 0 : Math.max(0, this.clock.now() - scene.checkpointAt));
      this.beginTransition(scene.kind, scene.fromSkin, scene.toSkin, { ...scene, elapsedMs: elapsed });
    } else {
      // Une manche interrompue avant ses résultats est rejouée ; les points déjà attribués ne le sont jamais deux fois.
      this.roundIndex = save.phase === "results" || save.phase === "transition" ? save.roundIndex : save.roundIndex - 1;
      if (save.phase === "results") this.advanceAfterResults();
      else this.nextRound();
    }
    this.freezeForMidnight();
  }

  /** Bouton "Passer" : fait avancer la phase en cours. */
  skip() {
    if (this.midnight) return;
    if (this.phase === "final" && this.finalReveal) {
      const info = this.finalReveal;
      const elapsed = finalRevealElapsed(info, this.clock.now());
      const timeline = finalTimelineOf(info);
      // « Passer » saute à l'étape suivante (un joueur à la fois), pas à la sous-étape.
      const next = [...timeline.beats.map((b) => b.startMs), timeline.durationMs].find((at) => at > elapsed);
      if (next !== undefined) info.startedAt -= next - elapsed;
      this.save(); this.changed();
    } else if (this.phase === "ceremony") this.skipCeremony();
    else if (this.phase === "transition") this.finishTransition();
    else if (this.phase === "intro") this.beginPlaying();
    else if (this.phase === "playing") this.endRound();
    else if (this.phase === "results") this.advanceAfterResults();
  }

  pause() {
    if (this.phase === "final" && this.finalReveal && !this.paused) {
      this.paused = true;
      this.finalReveal.pausedSince = this.clock.now();
      this.save(); this.changed(); return;
    }
    if (this.ceremony && !this.paused) {
      this.paused = true;
      this.ceremony.pausedSince = this.clock.now();
      this.ceremonyTimers?.pause();
      this.save();
      this.changed();
      return;
    }
    if (this.transition && !this.paused) {
      this.paused = true;
      this.transition.pausedSince = this.clock.now();
      this.transitionTimers?.pause();
      this.save();
      this.changed();
      return;
    }
    if (!this.current || this.paused) return;
    this.paused = true;
    this.current.pausedSince = this.clock.now();
    this.current.timers.pause();
    this.changed();
  }

  /**
   * Pendant minuit la partie reste en pause : l'hôte ne peut la relancer qu'une fois la célébration commencée
   * (il relance alors même une pause qu'il avait posée lui-même avant minuit).
   */
  resume() {
    if (this.midnight) {
      if (this.midnight.phase === "celebrate") this.endMidnight(true);
      return;
    }
    this.resumeNow();
  }

  private resumeNow() {
    if (this.phase === "final" && this.finalReveal && this.paused) {
      this.paused = false;
      this.finalReveal.pausedMs = (this.finalReveal.pausedMs ?? 0) + this.clock.now() - this.finalReveal.pausedSince!;
      this.finalReveal.pausedSince = null;
      this.save(); this.changed(); return;
    }
    if (this.ceremony && this.paused) {
      this.paused = false;
      this.ceremony.pausedMs += this.clock.now() - this.ceremony.pausedSince!;
      this.ceremony.pausedSince = null;
      this.ceremonyTimers?.resume();
      this.save();
      this.changed();
      return;
    }
    if (this.transition && this.paused) {
      this.paused = false;
      this.transition.pausedMs += this.clock.now() - this.transition.pausedSince!;
      this.transition.pausedSince = null;
      this.transitionTimers?.resume();
      this.save();
      this.changed();
      return;
    }
    if (!this.current || !this.paused) return;
    this.paused = false;
    if (this.current.pausedSince !== null) this.current.pausedMs += this.clock.now() - this.current.pausedSince;
    this.current.pausedSince = null;
    this.current.timers.resume();
    // Les arrivées/départs survenus pendant la pause n'ont pas été signalés au jeu.
    this.notifyPresence();
    this.changed();
  }

  addTime(seconds: number) {
    const c = this.current;
    if (this.midnight) return;
    if (this.phase !== "playing" || !c || c.mainTimer === null) return;
    const delta = Math.max(-600, Math.min(600, seconds)) * 1000;
    c.timers.shift(c.mainTimer, delta);
    if (c.timerTotalMs !== null) c.timerTotalMs = Math.max(0, c.timerTotalMs + delta);
    this.changed();
  }

  /** Retour au lobby : on garde les joueurs, on remet les scores à zéro. */
  backToLobby() {
    this.ceremonyTimers?.clear();
    this.ceremonyTimers = null;
    this.ceremony = null;
    this.history = [];
    this.transitionTimers?.clear();
    this.transitionTimers = null;
    this.transition = null;
    this.current?.timers.clear();
    this.current = null;
    this.phase = "lobby";
    this.paused = false;
    if (this.midnight) this.midnight.pausedByMidnight = false;
    this.finalReveal = null;
    this.plan = [];
    this.skinOrder = shuffle([...SKINS], this.rng);
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

  /** Vedette d'une scène d'univers : un des meilleurs gains de la dernière manche, sinon un participant au hasard. */
  private pickSpotlight(kind: TransitionKind, playerIds: string[]): string | null {
    if (kind !== "skin" || playerIds.length === 0) return null;
    const deltas = this.current?.deltas ?? {};
    const best = Math.max(0, ...playerIds.map((id) => deltas[id] ?? 0));
    const pool = best > 0 ? playerIds.filter((id) => (deltas[id] ?? 0) === best) : playerIds;
    return pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))]!;
  }

  private beginTransition(kind: TransitionKind, fromSkin: SkinId | null, toSkin: SkinId | null, restored?: SavedTransition) {
    // Les gains de la dernière manche sont lus avant d'effacer `current` (une reprise réutilise la vedette sauvegardée).
    const playerIds = restored ? [...new Set(restored.playerIds)].filter((id) => this.players.get(id)?.profile)
      : this.publicPlayers().filter((p) => p.profile).map((p) => p.id);
    const spotlightPlayerId = restored
      ? (restored.spotlightPlayerId && playerIds.includes(restored.spotlightPlayerId) ? restored.spotlightPlayerId : null)
      : this.pickSpotlight(kind, playerIds);
    this.current?.timers.clear();
    this.current = null;
    this.transitionTimers?.clear();
    this.continued.clear();
    this.finalReveal = null;
    this.phase = "transition";
    this.paused = restored?.paused === true;
    const now = this.clock.now();
    const timing = TRANSITION_TIMING[kind];
    const elapsed = Math.max(0, Math.min(timing.durationMs, restored?.elapsedMs ?? 0));
    const scene: TransitionInfo = {
      kind, fromSkin, toSkin,
      startedAt: now - elapsed,
      durationMs: timing.durationMs,
      pausedMs: 0,
      pausedSince: this.paused ? now : null,
      playerIds, spotlightPlayerId,
    };
    this.transition = scene;
    const timers = new TimerGroup(this.clock);
    this.transitionTimers = timers;
    if (this.paused) timers.pause();
    if (elapsed < timing.swapAtMs) timers.add(timing.swapAtMs - elapsed, () => {
      if (this.transition !== scene) return;
      this.save();
      this.changed();
    });
    if (elapsed >= timing.durationMs) {
      this.finishTransition();
      return;
    }
    timers.add(timing.durationMs - elapsed, () => this.finishTransition());
    this.save();
    this.changed();
  }

  private finishTransition() {
    const scene = this.transition;
    if (!scene) return;
    this.transitionTimers?.clear();
    this.transitionTimers = null;
    this.transition = null;
    this.paused = false;
    if (scene.kind === "closing") {
      if (this.opts.settings.outro?.active) this.beginCeremony(scene.playerIds);
      else this.beginFinal(scene.playerIds);
    } else this.nextRound();
  }

  private beginFinal(playerIds: PlayerId[], souvenirs: Keepsake[] = [], awards: Award[] = []) {
    this.phase = "final";
    this.paused = false;
    // Classement figé ici : la TV, les téléphones et la chronologie partagée s'appuient sur le même ordre.
    const ranking = playerIds.filter((id) => this.players.has(id))
      .sort((a, b) => this.players.get(b)!.score - this.players.get(a)!.score
        || (this.players.get(a)!.profile?.name ?? "").localeCompare(this.players.get(b)!.profile?.name ?? ""));
    const stars: Record<PlayerId, number[]> = {};
    for (const award of awards) for (const id of award.winners) if (ranking.includes(id) && award.points > 0) (stars[id] ??= []).push(award.points);
    const configuredScale = this.opts.finalTimeScale ?? 1;
    this.finalReveal = {
      startedAt: this.clock.now(), playerIds, ranking,
      ...(Object.keys(stars).length ? { stars } : {}),
      ...(configuredScale !== 1 && Number.isFinite(configuredScale) && configuredScale > 0 ? { timeScale: Math.max(0.01, configuredScale) } : {}),
      ...(souvenirs.length ? { souvenirs } : {}),
    };
    this.freezeForMidnight();
    this.save();
    this.changed();
  }

  private beginCeremony(playerIds: PlayerId[], restored?: CeremonyInfo) {
    this.current?.timers.clear();
    this.current = null;
    this.phase = "ceremony";
    const scoresBefore = Object.fromEntries(playerIds.map((id) => [id, this.players.get(id)?.score ?? 0]));
    const categories = this.opts.awardCategories ?? DEFAULT_AWARD_CATEGORIES;
    const configuredScale = this.opts.ceremonyTimeScale ?? 1;
    this.ceremony = restored ?? {
      startedAt: this.clock.now(), playerIds, scoresBefore,
      souvenirs: chooseSouvenirs(this.history),
      awards: drawAwards(this.history, scoresBefore, this.opts.settings.outro!, this.rng, categories),
      categories: Object.fromEntries(categories.map((c) => [c.id, { title: c.titre, emoji: c.emoji }])),
      timeScale: Number.isFinite(configuredScale) && configuredScale > 0 ? Math.max(0.01, configuredScale) : 1,
      pausedMs: 0, pausedSince: null,
    };
    this.paused = this.ceremony.pausedSince !== null;
    this.freezeForMidnight();
    this.scheduleCeremony();
  }

  /** Un timer par frontière : les téléphones reçoivent le préfixe révélé même sans action réseau. */
  private scheduleCeremony() {
    this.ceremonyTimers?.clear();
    const info = this.ceremony;
    if (!info) return;
    const elapsed = ceremonyElapsed(info, this.clock.now());
    const { steps, durationMs } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
    if (elapsed >= durationMs) { this.finishCeremony(); return; }
    const timers = new TimerGroup(this.clock);
    this.ceremonyTimers = timers;
    if (this.paused) timers.pause();
    for (const step of steps) if (step.startMs > elapsed) timers.add(step.startMs - elapsed, () => {
      if (this.ceremony !== info) return;
      this.save();
      this.changed();
    });
    timers.add(durationMs - elapsed, () => this.finishCeremony());
    this.save();
    this.changed();
  }

  private skipCeremony() {
    const info = this.ceremony;
    if (!info) return;
    const elapsed = ceremonyElapsed(info, this.clock.now());
    const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
    const next = steps.find((s) => s.startMs > elapsed);
    if (!next) { this.finishCeremony(); return; }
    // Décaler l'origine conserve une chronologie unique, y compris en pause et au rechargement.
    info.startedAt -= next.startMs - elapsed;
    this.scheduleCeremony();
  }

  private finishCeremony() {
    const info = this.ceremony;
    if (!info) return;
    this.ceremonyTimers?.clear();
    this.ceremonyTimers = null;
    const finalScores = { ...info.scoresBefore };
    for (const award of info.awards) for (const id of award.winners) finalScores[id] = (finalScores[id] ?? 0) + award.points;
    // Affectation depuis les scores initiaux, jamais d'addition rejouable après un crash.
    for (const id of info.playerIds) { const p = this.players.get(id); if (p) p.score = finalScores[id] ?? p.score; }
    this.ceremony = null;
    this.beginFinal(info.playerIds, info.souvenirs, info.awards);
  }

  private ceremonyView(viewer: PlayerId | null): CeremonyInfo | null {
    const info = this.ceremony;
    if (!info) return null;
    const elapsed = ceremonyElapsed(info, this.clock.now());
    const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
    const step = ceremonyStepAt(steps, elapsed);
    if (viewer === null) return { ...info, step };
    return {
      ...info, step,
      souvenirs: info.souvenirs.slice(0, revealedSouvenirs(steps, elapsed)),
      awards: info.awards.slice(0, revealedAwards(steps, elapsed)),
      categories: {},
    };
  }

  private advanceAfterResults() {
    const previous = this.plan[this.roundIndex];
    const next = this.plan[this.roundIndex + 1];
    if (previous?.changeSkinAfter && next) this.beginTransition("skin", previous.skin!, next.skin!);
    else this.nextRound();
  }

  private nextRound(): void {
    this.current?.timers.clear();
    this.current = null;
    this.continued.clear();
    this.paused = false;
    this.roundIndex++;

    if (this.roundIndex >= this.plan.length) {
      this.beginTransition("closing", this.plan.at(-1)?.skin ?? null, null);
      return;
    }

    const planned = this.plan[this.roundIndex]!;
    const loaded = this.games.get(planned.gameId)!;
    this.rememberItem(loaded, planned.item);
    const timers = new TimerGroup(this.clock);
    const round: CurrentRound = {
      loaded,
      item: planned.item,
      interlude: planned.interlude === true,
      state: null,
      timers,
      mainTimer: null,
      timerTotalMs: null,
      endRequested: false,
      results: null,
      deltas: null,
      resultsAt: null,
      pausedMs: 0,
      pausedSince: null,
      ctx: {
        cfg: loaded.cfg,
        players: this.publicPlayers().filter((p) => p.profile),
        isConnected: (id) => (this.players.get(id)?.sockets ?? 0) > 0,
        rng: this.rng,
        now: () => this.clock.now(),
        activeNow: () => activeNow(round, this.clock.now()),
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
    if (round.interlude) {
      // Surprise : pas d'annonce, on passe directement au jeu.
      this.beginPlaying();
      this.save();
      return;
    }
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
    let outcome: RoundOutcome | null = null;
    try {
      outcome = c.loaded.game.finish(c.state, c.ctx);
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
    const participants = c.ctx.players.map((p) => p.id);
    const ids = new Set(participants);
    // Les métadonnées sont facultatives : une donnée défectueuse ne doit pas jeter les points de la manche.
    const stats = safe(() => sanitizeStats(outcome?.stats, ids));
    const opinions = safe(() => sanitizeOpinions(outcome?.opinions, ids));
    const keepsakes = safe(() => sanitizeKeepsakes(outcome?.keepsakes, ids));
    const ranked = this.publicPlayers().filter((p) => p.profile).sort((a, b) => b.score - a.score);
    this.history = pruneKeepsakes([...this.history, {
      gameId: c.loaded.game.id, participants, deltas: c.deltas ?? {},
      standingsAfter: ranked.map((p) => p.id), scoresAfter: Object.fromEntries(ranked.map((p) => [p.id, p.score])),
      ...(stats ? { stats } : {}), ...(opinions ? { opinions } : {}), ...(keepsakes ? { keepsakes } : {}),
    }]).slice(-200);
    c.resultsAt = this.clock.now();
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

  /** Un participant de la manche en cours se (dé)connecte : le jeu peut rejouer ses règles de fin anticipée. */
  private presenceChanged(playerId: PlayerId) {
    const c = this.current;
    if (!c || this.phase !== "playing" || this.paused) return;
    if (!c.ctx.players.some((p) => p.id === playerId)) return;
    this.notifyPresence();
  }

  private notifyPresence() {
    const c = this.current;
    if (!c || this.phase !== "playing" || !c.loaded.game.onPresenceChange) return;
    this.runGame(() => c.loaded.game.onPresenceChange!(c.state, c.ctx));
  }

  private checkAllContinued() {
    if (this.phase !== "results" || this.midnight) return;
    const waiting = [...this.players.values()].filter((p) => p.profile && p.sockets > 0);
    if (waiting.length > 0 && waiting.every((p) => this.continued.has(p.id))) this.advanceAfterResults();
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
        number: normalCount(this.plan, this.roundIndex),
        normalTotal: normalCount(this.plan, this.plan.length - 1),
        interlude: c.interlude,
        gameId: g.id,
        gameName: g.name(c.loaded.cfg),
        participants: c.ctx.players.map((p) => p.id),
        deadline: this.paused ? null : fireAt,
        pausedRemainingMs: this.paused && c.mainTimer !== null ? c.timers.remaining(c.mainTimer) : null,
        timerTotalMs: this.phase === "playing" ? c.timerTotalMs : null,
        progress: this.phase === "playing" && g.progress ? safe(() => g.progress!(c.state, c.ctx)) : null,
        public: safe(() => (viewer === null && g.tvView ? g.tvView(c.state, c.ctx) : g.publicView(c.state, c.ctx))),
        results: this.phase === "results" ? c.results : null,
        deltas: this.phase === "results" ? c.deltas : null,
        resultsAt: this.phase === "results" ? c.resultsAt : null,
        pausedMs: c.pausedMs,
        pausedSince: this.paused ? c.pausedSince : null,
      };
      if (viewer && g.privateView) priv = safe(() => g.privateView!(c.state, viewer, c.ctx));
    }
    return {
      title: this.opts.settings.title,
      phase: this.phase,
      paused: this.paused,
      finalReveal: this.finalReveal,
      midnight: this.midnight ? { targetAt: this.midnight.targetAt, phase: this.midnight.phase, year: this.midnight.year } : null,
      ceremony: this.ceremonyView(viewer),
      transition: this.transition ? { ...this.transition, playerIds: [...this.transition.playerIds] } : null,
      players: this.publicPlayers(),
      round,
      continued: [...this.continued],
      catalog: this.catalog,
      setup: this.setup,
      resumable: this.resumable
        ? {
            // Numérotation affichée (interludes non comptés) : l'index d'une manche normale est son rang - 1.
            roundIndex: Math.max(0, normalCount(this.resumable.plan, this.resumable.roundIndex) - 1),
            total: normalCount(this.resumable.plan, this.resumable.plan.length - 1),
          }
        : null,
      joinUrl: this.opts.joinUrl,
      skin: this.currentSkin(),
      me: viewer ? { id: viewer, private: priv, inRound: !!c?.ctx.players.some((p) => p.id === viewer) } : null,
    };
  }

  // ───────────────────────────── Skins ─────────────────────────────

  /** Le lobby et le final reviennent au thème de base ; une scène couvre chaque bascule. */
  private currentSkin(): SkinId | null {
    if (this.midnight) return null; // minuit : toujours le thème de base
    if (this.transition) {
      const scene = this.transition;
      return transitionElapsed(scene, this.clock.now()) >= TRANSITION_TIMING[scene.kind].swapAtMs ? scene.toSkin : scene.fromSkin;
    }
    if (this.phase === "lobby" || this.phase === "ceremony" || this.phase === "final") return null;
    return this.plan[this.roundIndex]?.skin ?? this.skinOrder[0]!;
  }

  // ───────────────────────────── Sauvegarde ─────────────────────────────

  /**
   * Mémorise un élément au DÉBUT de sa manche : les invités l'ont vu même si la manche est interrompue, et un plan
   * abandonné (retour au lobby sans jouer) ne « brûle » rien. Un souci d'écriture ne bloque jamais la partie.
   */
  private rememberItem(loaded: LoadedGame, item: unknown) {
    markPlayed(this.dejaVu, loaded.game, item);
    this.catalog = buildCatalog(this.opts.games, this.opts.settings.introSeconds, this.dejaVu);
    try {
      this.opts.dejaVu?.save(this.dejaVu);
    } catch (e) {
      console.error("Écriture de deja-vu.json impossible", e);
    }
  }

  private save() {
    this.opts.persistence?.save({
      version: 1,
      players: [...this.players.values()].map(({ id, token, profile, score }) => ({ id, token, profile, score })),
      setup: this.setup,
      plan: this.plan,
      roundIndex: this.roundIndex,
      phase: this.phase,
      history: this.history,
      ceremony: this.ceremony,
      skinOrder: this.skinOrder,
      midnight: this.midnight ? { targetAt: this.midnight.targetAt } : null,
      finalReveal: this.finalReveal,
      transition: this.transition ? {
        ...this.transition,
        elapsedMs: transitionElapsed(this.transition, this.clock.now()),
        checkpointAt: this.clock.now(),
        paused: this.paused,
      } : null,
    });
  }

  private restoreFromSave() {
    const save = this.opts.persistence?.load();
    if (!save || save.version !== 1) return;
    for (const p of save.players) {
      // Les anciens portraits personnalisés deviennent un avatar prédéfini, sans perdre identité ni score.
      const parsed = p.profile ? profileSchema.safeParse({
        ...p.profile,
        avatar: p.profile.avatar?.kind === "preset" ? p.profile.avatar : { kind: "preset", id: "renard" },
      }) : null;
      this.players.set(p.id, { ...p, profile: parsed?.success ? parsed.data : null, sockets: 0 });
    }
    if (save.setup) this.setup = sanitizeSetup(save.setup, this.catalog);
    const inProgress = save.phase === "ceremony" || save.phase === "transition" || save.phase === "intro" || save.phase === "playing" || save.phase === "results";
    if (inProgress && save.plan.length > 0) this.resumable = save;
    if (typeof save.midnight?.targetAt === "number") this.savedMidnight = { targetAt: save.midnight.targetAt };
  }

  // ───────────────────────────── Minuit ─────────────────────────────
  // Générique : à `heure - duree`, la partie se met en pause (même mécanisme que la pause de l'hôte) et les écrans
  // affichent le compte à rebours ; à l'heure, phase « celebrate » ; l'hôte (Reprendre) ou `reprise_auto` relance.
  // Règle de déclenchement : on vise la PROCHAINE occurrence de l'heure ; le compte à rebours démarre dès qu'on est dans
  // sa fenêtre (un serveur lancé 20 s avant minuit affiche 0:20). Par défaut, l'occurrence est le prochain 1er janvier ;
  // les répétitions peuvent autoriser chaque nuit. Lancé après minuit, aucun rattrapage hors sauvegarde valide.
  // Après un crash, la célébration en cours est reprise tant que `max(reprise_auto, 60 s)` ne s'est pas écoulé.

  private initMidnight() {
    const cfg = this.opts.settings.midnight;
    if (!cfg) return;
    const saved = this.savedMidnight;
    this.savedMidnight = null;
    const now = this.clock.now();
    const savedDate = saved ? new Date(saved.targetAt) : null;
    const allowedDate = !cfg.newYearOnly || (savedDate !== null && savedDate.getMonth() === 0 && savedDate.getDate() === 1);
    if (saved && allowedDate && now < saved.targetAt + Math.max(cfg.autoResumeSeconds, 60) * 1000) {
      this.beginMidnight(saved.targetAt);
      return;
    }
    this.checkMidnightStart();
  }

  private checkMidnightStart() {
    const cfg = this.opts.settings.midnight;
    if (!cfg || this.midnight) return;
    const now = this.clock.now();
    const targetAt = nextOccurrence(now, cfg.time, cfg.newYearOnly);
    if (now >= targetAt - cfg.countdownSeconds * 1000) this.beginMidnight(targetAt);
    else this.scheduleMidnight();
  }

  private beginMidnight(targetAt: number) {
    const now = this.clock.now();
    this.midnight = {
      targetAt,
      phase: now < targetAt ? "countdown" : "celebrate",
      year: midnightYear(targetAt),
      pausedByMidnight: false,
      beganAt: now,
    };
    this.freezeForMidnight();
    this.scheduleMidnight();
    this.saveMidnight();
    this.changed();
  }

  /** Met en pause ce qui tourne ; si l'hôte avait déjà mis en pause, on ne touche à rien (il reprendra lui-même). */
  private freezeForMidnight() {
    const m = this.midnight;
    if (!m || this.paused || !(this.current || this.transition || this.ceremony || (this.phase === "final" && this.finalReveal))) return;
    this.pause();
    m.pausedByMidnight = true;
  }

  private scheduleMidnight() {
    const cfg = this.opts.settings.midnight;
    if (this.midnightTimer !== null) this.clock.clearTimeout(this.midnightTimer);
    this.midnightTimer = null;
    if (!cfg) return;
    const now = this.clock.now();
    const m = this.midnight;
    let delay: number;
    if (!m) {
      // En attente : on revérifie au plus toutes les 30 s (veille du PC, changement d'heure).
      delay = Math.min(30_000, nextOccurrence(now, cfg.time, cfg.newYearOnly) - cfg.countdownSeconds * 1000 - now);
    } else if (m.phase === "countdown") delay = m.targetAt - now;
    else if (cfg.autoResumeSeconds > 0) delay = m.targetAt + cfg.autoResumeSeconds * 1000 - now;
    else return;
    this.midnightTimer = this.clock.setTimeout(() => this.midnightTick(), Math.max(1, delay));
  }

  private midnightTick() {
    this.midnightTimer = null;
    const cfg = this.opts.settings.midnight;
    const m = this.midnight;
    if (!cfg) return;
    if (!m) return this.checkMidnightStart();
    const now = this.clock.now();
    if (m.phase === "countdown") {
      if (now >= m.targetAt) {
        m.phase = "celebrate";
        this.saveMidnight();
        this.changed();
      }
    } else if (cfg.autoResumeSeconds > 0 && now >= m.targetAt + cfg.autoResumeSeconds * 1000) {
      this.endMidnight(false);
      return;
    }
    this.scheduleMidnight();
  }

  /** Fin de la célébration. `byHost` : l'hôte a cliqué, on relance même une pause qu'il avait posée avant minuit. */
  private endMidnight(byHost: boolean) {
    const m = this.midnight;
    if (!m) return;
    this.midnight = null;
    if (this.paused && (byHost || m.pausedByMidnight)) this.resumeNow();
    this.scheduleMidnight();
    this.saveMidnight();
    this.checkAllContinued();
    this.changed();
  }

  /** Sauvegarde sans écraser une partie interrompue qui attend sa reprise au lobby. */
  private saveMidnight() {
    if (this.phase === "lobby" && this.resumable) return;
    this.save();
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

/** Nombre de manches normales (hors interludes) du plan jusqu'à l'index `upTo` inclus : la numérotation affichée. */
function normalCount(plan: PlannedRound[], upTo: number): number {
  return plan.slice(0, upTo + 1).filter((r) => !r.interlude).length;
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (err) {
    console.error("erreur de vue de mini-jeu :", err);
    return null;
  }
}

/** Ordre sauvegardé complet, après retrait des habillages qui n'existent plus. */
function validSkinOrder(o: unknown): SkinId[] | null {
  if (!Array.isArray(o)) return null;
  const order = o.filter(isSkinId);
  return order.length === SKINS.length && new Set(order).size === SKINS.length ? order : null;
}

function validSavedTransition(scene: SavedTransition | null | undefined): scene is SavedTransition {
  if (!scene || !["opening", "skin", "closing"].includes(scene.kind)) return false;
  // Les anciennes sauvegardes n'ont pas de vedette : elles restent valides.
  if (scene.spotlightPlayerId === undefined) scene.spotlightPlayerId = null;
  if (scene.spotlightPlayerId !== null && typeof scene.spotlightPlayerId !== "string") return false;
  if (scene.fromSkin !== null && !isSkinId(scene.fromSkin)) return false;
  if (scene.toSkin !== null && !isSkinId(scene.toSkin)) return false;
  return Number.isFinite(scene.elapsedMs) && Number.isFinite(scene.checkpointAt) && typeof scene.paused === "boolean"
    && Array.isArray(scene.playerIds) && scene.playerIds.every((id) => typeof id === "string");
}

/** Une sauvegarde incomplète ne doit pas bloquer le retour au lobby. */
function validSavedCeremony(info: CeremonyInfo | null | undefined): info is CeremonyInfo {
  return !!info && Number.isFinite(info.startedAt) && Number.isFinite(info.pausedMs)
    && (info.pausedSince === null || Number.isFinite(info.pausedSince))
    && Number.isFinite(info.timeScale) && info.timeScale > 0
    && Array.isArray(info.playerIds) && info.playerIds.every((id) => typeof id === "string")
    && !!info.scoresBefore && Object.values(info.scoresBefore).every(Number.isFinite)
    && Array.isArray(info.souvenirs) && info.souvenirs.length <= 3
    && Array.isArray(info.awards) && info.awards.length <= 12 && info.awards.every((a) => a && typeof a.id === "string"
      && Number.isFinite(a.points) && a.points >= 0 && Array.isArray(a.winners) && a.winners.every((id) => info.playerIds.includes(id)));
}
