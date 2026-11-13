// Chronologie commune du classement final : la TV, les téléphones et le moteur suivent le même départ serveur
// et les mêmes constantes (invariant « pas de spoil »).
//
// Déroulé (scores toujours cachés jusqu'à leur conversion) :
//   intro -> du dernier au 4e : chaque joueur s'avance, son score de base défile, ses étoiles s'envolent une à une
//   vers le score, puis il va se ranger sur le tableau d'honneur -> le podium monte -> 3e puis 2e (même conversion)
//   -> long roulement -> le 1er (même conversion), puis la fête.
// La durée dépend du nombre de joueurs ET du nombre d'étoiles de chacun.
import type { Keepsake } from "./ceremony";

/** Durées (ms) avant application de `timeScale`. */
export const FINAL_TIMING = {
  introMs: 2800,
  /** Le portrait s'avance au centre. */
  advanceMs: 1000,
  /** Le score de base défile. */
  countMs: 1800,
  /** Une étoile s'envole vers le score. */
  starMs: 1100,
  /** Le portrait va se ranger (tableau d'honneur ou podium). */
  settleMs: 1100,
  podiumRiseMs: 3000,
  drumrollMs: 4500,
  /** La fête du 1er : TV allumée, feu d'artifice, confettis, avant l'état final. */
  celebrateMs: 2600,
} as const;

const MIN_STEP_MS = 40;

export interface FinalRevealInfo {
  startedAt: number;
  pausedMs?: number;
  pausedSince?: number | null;
  /** Participants au début de la cérémonie : une arrivée tardive ne modifie pas le podium ni son attente. */
  playerIds: string[];
  /** Souvenirs déjà révélés, conservés dans le décor pendant le classement final. */
  souvenirs?: Keepsake[];
  /** Classement final (meilleur d'abord), fixé par le serveur au début du final. */
  ranking?: string[];
  /** Étoiles de chaque participant : valeur en points de chacune (absent sans cérémonie ou sans étoile). */
  stars?: Record<string, number[]>;
  /** Facteur appliqué aux durées (1 en soirée ; réglable pour les tests). */
  timeScale?: number;
}

export type FinalBeatKind = "intro" | "joueur" | "podium" | "roulement" | "premier";
/** Sous-étape d'un joueur : s'avance, score de base, étoiles, rangement (ou fête pour le 1er). */
export type FinalPhase = "advance" | "count" | "stars" | "settle";

export interface FinalBeat {
  kind: FinalBeatKind;
  /** Rang (0 = 1er) du joueur concerné ; absent pour intro, podium et roulement. */
  rank?: number;
  startMs: number;
  endMs: number;
  /** Instants des sous-étapes d'un joueur. */
  countAtMs?: number;
  starAtMs?: number[];
  settleAtMs?: number;
}

export interface FinalTimeline {
  beats: FinalBeat[];
  durationMs: number;
  /** Instant où le rang `i` (0 = 1er) est révélé : sa conversion est finie, son score est connu. */
  revealedAtMs: number[];
  /** Instant où le podium commence à monter ; null sans joueur. */
  podiumAtMs: number | null;
}

/**
 * `stars[i]` = nombre d'étoiles du joueur de rang `i` (0 = 1er). Seul ce tableau compte.
 */
export function finalRevealTimeline(stars: readonly number[], timeScale = 1): FinalTimeline {
  const total = stars.length;
  const beats: FinalBeat[] = [];
  const revealedAtMs: number[] = new Array(total).fill(0);
  let at = 0;
  let podiumAtMs: number | null = null;
  const length = (ms: number) => Math.max(MIN_STEP_MS, Math.round(ms * timeScale));
  const simple = (kind: FinalBeatKind, ms: number) => {
    beats.push({ kind, startMs: at, endMs: at + length(ms) });
    at += length(ms);
  };
  const player = (rank: number) => {
    const startMs = at;
    at += length(FINAL_TIMING.advanceMs);
    const countAtMs = at;
    at += length(FINAL_TIMING.countMs);
    const starAtMs: number[] = [];
    for (let k = 0; k < (stars[rank] ?? 0); k++) { starAtMs.push(at); at += length(FINAL_TIMING.starMs); }
    const settleAtMs = at;
    at += length(rank === 0 ? FINAL_TIMING.celebrateMs : FINAL_TIMING.settleMs);
    revealedAtMs[rank] = settleAtMs;
    beats.push({ kind: rank === 0 ? "premier" : "joueur", rank, startMs, endMs: at, countAtMs, starAtMs, settleAtMs });
  };
  if (total === 0) return { beats, durationMs: 0, revealedAtMs, podiumAtMs };
  simple("intro", FINAL_TIMING.introMs);
  const firstPodiumRank = Math.min(total, 3) - 1;
  for (let rank = total - 1; rank >= 0; rank--) {
    if (rank === firstPodiumRank) { podiumAtMs = at; simple("podium", FINAL_TIMING.podiumRiseMs); }
    if (rank === 0 && total >= 2) simple("roulement", FINAL_TIMING.drumrollMs);
    player(rank);
  }
  return { beats, durationMs: at, revealedAtMs, podiumAtMs };
}

/** Étoiles de chaque rang d'après les infos du serveur (0 partout pour une ancienne sauvegarde sans classement). */
export function finalStarCounts(reveal: Pick<FinalRevealInfo, "playerIds" | "ranking" | "stars">): number[] {
  const order = reveal.ranking ?? reveal.playerIds;
  return order.map((id) => reveal.stars?.[id]?.length ?? 0);
}

export const finalTimelineOf = (reveal: FinalRevealInfo): FinalTimeline => finalRevealTimeline(finalStarCounts(reveal), reveal.timeScale ?? 1);

/** Même horloge active pour le moteur, la TV et les téléphones. */
export function finalRevealElapsed(reveal: FinalRevealInfo, now: number): number {
  return Math.max(0, (reveal.pausedSince ?? now) - (reveal.pausedMs ?? 0) - reveal.startedAt);
}

/** Étape en cours à l'instant `elapsedMs` (la dernière une fois la durée atteinte). */
export function finalBeatAt(timeline: FinalTimeline, elapsedMs: number): FinalBeat | null {
  return timeline.beats.find((b) => elapsedMs < b.endMs) ?? timeline.beats[timeline.beats.length - 1] ?? null;
}

/** Sous-étape d'un joueur à l'instant `elapsedMs` ; `starsDone` = étoiles déjà envolées vers le score. */
export function finalPhaseAt(beat: FinalBeat, elapsedMs: number): { phase: FinalPhase; starsDone: number; starIndex: number | null } {
  const stars = beat.starAtMs ?? [];
  if (elapsedMs >= (beat.settleAtMs ?? Infinity)) return { phase: "settle", starsDone: stars.length, starIndex: null };
  if (stars.length && elapsedMs >= stars[0]!) {
    const index = stars.filter((s) => elapsedMs >= s).length - 1;
    return { phase: "stars", starsDone: index, starIndex: index };
  }
  if (elapsedMs >= (beat.countAtMs ?? Infinity)) return { phase: "count", starsDone: 0, starIndex: null };
  return { phase: "advance", starsDone: 0, starIndex: null };
}

/** Nombre de rangs révélés (conversion terminée) : toujours les derniers rangs d'abord. */
export function finalRevealedCount(timeline: FinalTimeline, elapsedMs: number): number {
  return timeline.revealedAtMs.filter((at) => elapsedMs >= at).length;
}

/** Tous les instants où l'affichage change (sous-étapes comprises), pour programmer les mises à jour. */
export function finalMarks(timeline: FinalTimeline): number[] {
  const marks = new Set<number>([timeline.durationMs]);
  for (const b of timeline.beats) {
    marks.add(b.startMs);
    if (b.countAtMs !== undefined) marks.add(b.countAtMs);
    for (const s of b.starAtMs ?? []) marks.add(s);
    if (b.settleAtMs !== undefined) marks.add(b.settleAtMs);
  }
  return [...marks].sort((a, b) => a - b);
}
