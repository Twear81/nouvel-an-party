// Cérémonie de fin de partie (souvenirs, bonus, classement) : types réseau et chronologie.
// Partagé par le moteur ET les écrans : la TV et les téléphones comptent depuis le même départ serveur,
// avec les mêmes constantes (invariant « pas de spoil »).
import type { PlayerId } from "./types";

// ───────────────────────────── Données remontées par les mini-jeux ─────────────────────────────

/**
 * Statistiques d'un joueur sur une manche (catalogue partagé, tout facultatif, nombres finis ≥ 0).
 * Le moteur valide et borne ; une valeur invalide est ignorée.
 */
export interface RoundStats {
  /** Temps de réaction mesurés sur le téléphone (ms). */
  reactionMs?: number[];
  /** Nombre d'actions / appuis. */
  actions?: number;
  /** Nombre de changements de réponse. */
  answerChanges?: number;
  /** Votes reçus dans un jeu de désignation (« Qui est le plus… »). */
  designations?: number;
  /** Votes reçus par les dessins de ce joueur (dessins NON vides seulement). */
  drawingVotes?: number;
  /** Nombre de dessins NON vides de ce joueur. */
  drawings?: number;
}

/** Souvenir candidat d'une manche (le moteur en garde quelques-uns). `score` = intérêt à le revoir. */
export type Keepsake =
  | { kind: "dessin"; tag: "meilleur" | "incompris"; playerId: PlayerId; label: string; strokes: unknown; score: number }
  | { kind: "objet"; emoji: string; label: string; detail: string; score: number }
  | { kind: "post-it"; text: string; detail?: string; score: number };

/** Ce que le moteur retient de chaque manche jouée (sauvegardé dans save.json). */
export interface RoundSummary {
  gameId: string;
  participants: PlayerId[];
  /** Points gagnés pendant la manche. */
  deltas: Record<PlayerId, number>;
  /** Classement cumulé après la manche (meilleur en premier). */
  standingsAfter: PlayerId[];
  /** Scores cumulés après la manche (départage les égalités de rang). */
  scoresAfter: Record<PlayerId, number>;
  stats?: Record<PlayerId, RoundStats>;
  opinions?: Record<PlayerId, string>[];
  keepsakes?: Keepsake[];
}

// ───────────────────────────── Cérémonie ─────────────────────────────

export interface Award {
  /** Id de la catégorie (config/outro.yaml). */
  id: string;
  title: string;
  phrase: string;
  emoji: string;
  winners: PlayerId[];
  /** Points gagnés par CHAQUE gagnant, ajoutés aux scores à la fin de la cérémonie. */
  points: number;
  /** Ex. « 812 ms en moyenne ». */
  statLabel: string;
  /** « Le talent incompris » : le dessin qui revient en grand. */
  keepsake?: Keepsake;
  /** Ids des catégories montrées dans la machine à sous, la dernière étant celle tirée. */
  roulette: string[];
}

export interface CeremonyInfo {
  /**
   * Origine de la chronologie (heure serveur). « Passer » la décale vers le passé : ce n'est donc pas
   * forcément l'instant du vrai début. Le temps écoulé = `ceremonyElapsed(info, now)`.
   */
  startedAt: number;
  /** Étape calculée côté serveur dans les snapshots ; ne contient aucun gagnant futur. */
  step?: CeremonyStep;
  /** Participants au début de la cérémonie : une arrivée tardive ne la change pas. */
  playerIds: PlayerId[];
  /** Scores avant les bonus. L'affichage = scoresBefore + bonus déjà révélés. */
  scoresBefore: Record<PlayerId, number>;
  /** 0 à 3 souvenirs, kinds variés. */
  souvenirs: Keepsake[];
  awards: Award[];
  /** Titre et emoji des catégories citées par `roulette`. */
  categories: Record<string, { title: string; emoji: string }>;
  /** Facteur appliqué aux durées (1 en soirée ; réglable pour les tests). */
  timeScale: number;
  pausedMs: number;
  pausedSince: number | null;
}

export type CeremonyStepKind = "intro" | "souvenir" | "provisoire" | "roulette" | "carte" | "projecteur" | "gagnant" | "fin";

export interface CeremonyStep {
  kind: CeremonyStepKind;
  /** Rang du souvenir ou du bonus concerné ; absent pour les autres étapes. */
  index?: number;
  startMs: number;
  endMs: number;
}

/** Durées (ms) de chaque étape, avant application de `timeScale`. */
export const CEREMONY_TIMING = {
  introMs: 3500,
  souvenirMs: 5000,
  provisoireMs: 8000,
  rouletteMs: 4500,
  carteMs: 3000,
  projecteurMs: 3500,
  gagnantMs: 4500,
  finMs: 2500,
} as const;

const MIN_STEP_MS = 40;

/**
 * Chronologie complète : intro, chaque souvenir, classement provisoire, chaque bonus
 * (roulette → carte → projecteur → gagnant), puis fin. Seul le NOMBRE de souvenirs et de bonus compte.
 */
export function ceremonyTimeline(
  souvenirs: { length: number } | number,
  awards: { length: number } | number,
  timeScale = 1,
): { steps: CeremonyStep[]; durationMs: number } {
  const souvenirCount = typeof souvenirs === "number" ? souvenirs : souvenirs.length;
  const awardCount = typeof awards === "number" ? awards : awards.length;
  const steps: CeremonyStep[] = [];
  let at = 0;
  const add = (kind: CeremonyStepKind, ms: number, index?: number) => {
    const length = Math.max(MIN_STEP_MS, Math.round(ms * timeScale));
    steps.push({ kind, ...(index === undefined ? {} : { index }), startMs: at, endMs: at + length });
    at += length;
  };
  add("intro", CEREMONY_TIMING.introMs);
  for (let i = 0; i < souvenirCount; i++) add("souvenir", CEREMONY_TIMING.souvenirMs, i);
  add("provisoire", CEREMONY_TIMING.provisoireMs);
  for (let i = 0; i < awardCount; i++) {
    add("roulette", CEREMONY_TIMING.rouletteMs, i);
    add("carte", CEREMONY_TIMING.carteMs, i);
    add("projecteur", CEREMONY_TIMING.projecteurMs, i);
    add("gagnant", CEREMONY_TIMING.gagnantMs, i);
  }
  add("fin", CEREMONY_TIMING.finMs);
  return { steps, durationMs: at };
}

/** Temps écoulé depuis le départ de la cérémonie, pauses retirées (borné à sa durée). */
export function ceremonyElapsed(
  info: Pick<CeremonyInfo, "startedAt" | "pausedMs" | "pausedSince" | "souvenirs" | "awards" | "timeScale">,
  now: number,
): number {
  const { durationMs } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
  return Math.max(0, Math.min(durationMs, (info.pausedSince ?? now) - info.pausedMs - info.startedAt));
}

/** Étape en cours à l'instant `elapsedMs` (la dernière étape une fois la durée atteinte). */
export function ceremonyStepAt(steps: CeremonyStep[], elapsedMs: number): CeremonyStep {
  return steps.find((s) => elapsedMs < s.endMs) ?? steps[steps.length - 1]!;
}

/** Nombre de souvenirs déjà posés (leur étape a commencé). */
export function revealedSouvenirs(steps: CeremonyStep[], elapsedMs: number): number {
  return steps.filter((s) => s.kind === "souvenir" && elapsedMs >= s.startMs).length;
}

/** Nombre de bonus dont le gagnant est révélé (l'étape « gagnant » a commencé). Toujours un préfixe de `awards`. */
export function revealedAwards(steps: CeremonyStep[], elapsedMs: number): number {
  return steps.filter((s) => s.kind === "gagnant" && elapsedMs >= s.startMs).length;
}

/** Scores affichés : scores avant bonus + bonus déjà révélés. */
export function ceremonyScores(info: CeremonyInfo, elapsedMs: number): Record<PlayerId, number> {
  const { steps } = ceremonyTimeline(info.souvenirs, info.awards, info.timeScale);
  const scores = { ...info.scoresBefore };
  for (const award of info.awards.slice(0, revealedAwards(steps, elapsedMs))) {
    for (const id of award.winners) if (id in scores) scores[id]! += award.points;
  }
  return scores;
}
