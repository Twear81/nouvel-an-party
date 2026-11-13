// Historique des manches : validation de ce que renvoient les mini-jeux (jamais de confiance aveugle) et bornage.
// Fonctions pures : le moteur les appelle à la fin de chaque manche et au rechargement d'une sauvegarde.
import { cleanStrokes } from "../../minigames/dessin-rate/shared";
import type { Keepsake, RoundStats, RoundSummary } from "../../shared/ceremony";
import type { PlayerId } from "../../shared/types";

/** Taille maximale (JSON) d'un souvenir. */
export const MAX_KEEPSAKE_BYTES = 24 * 1024;
const MAX_CANDIDATES_PER_ROUND = 20;
const MAX_KEEPSAKES_PER_GAME = 3;
const MAX_KEEPSAKES_TOTAL = 40;
const MAX_REACTIONS = 200;
const MAX_OPINION_TABLES = 60;
const MAX_HISTORY = 200;
// Garde une marge immense pour les vrais jeux, sans permettre les débordements de sommes.
const MAX_STAT_VALUE = 1_000_000_000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const nonNegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_STAT_VALUE;
const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Statistiques d'un joueur : seuls les champs valides sont gardés. */
export function sanitizeStats(raw: unknown, playerIds: ReadonlySet<PlayerId>): Record<PlayerId, RoundStats> | undefined {
  if (!isRecord(raw)) return undefined;
  const out: Record<PlayerId, RoundStats> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!playerIds.has(id) || !isRecord(value)) continue;
    const stats: RoundStats = {};
    if (Array.isArray(value.reactionMs)) {
      const times = value.reactionMs.filter(nonNegative).slice(0, MAX_REACTIONS);
      if (times.length > 0) stats.reactionMs = times;
    }
    for (const key of ["actions", "answerChanges", "designations", "drawingVotes", "drawings"] as const) {
      if (nonNegative(value[key])) stats[key] = value[key];
    }
    if (Object.keys(stats).length > 0) out[id] = stats;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Tables d'avis : une table par question, valeurs = choix opaques (texte). */
export function sanitizeOpinions(raw: unknown, playerIds: ReadonlySet<PlayerId>): Record<PlayerId, string>[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const tables: Record<PlayerId, string>[] = [];
  for (const table of raw.slice(0, MAX_OPINION_TABLES)) {
    if (!isRecord(table)) continue;
    const clean: Record<PlayerId, string> = {};
    for (const [id, choice] of Object.entries(table)) {
      if (!playerIds.has(id)) continue;
      const value = typeof choice === "number" && Number.isFinite(choice) ? String(choice) : text(choice, 80);
      if (value !== null) clean[id] = value;
    }
    if (Object.keys(clean).length >= 2) tables.push(clean);
  }
  return tables.length > 0 ? tables : undefined;
}

function sanitizeKeepsake(raw: unknown, playerIds: ReadonlySet<PlayerId>): Keepsake | null {
  if (!isRecord(raw) || !nonNegative(raw.score)) return null;
  const score = raw.score as number;
  let keepsake: Keepsake | null = null;
  if (raw.kind === "dessin") {
    const label = text(raw.label, 60);
    const strokes = cleanStrokes(raw.strokes);
    if ((raw.tag === "meilleur" || raw.tag === "incompris") && typeof raw.playerId === "string" && playerIds.has(raw.playerId)
      && label !== null && strokes !== null && strokes.length > 0) {
      keepsake = { kind: "dessin", tag: raw.tag, playerId: raw.playerId, label, strokes, score };
    }
  } else if (raw.kind === "objet") {
    const emoji = text(raw.emoji, 16);
    const label = text(raw.label, 60);
    const detail = text(raw.detail, 160);
    if (emoji !== null && label !== null && detail !== null) keepsake = { kind: "objet", emoji, label, detail, score };
  } else if (raw.kind === "post-it") {
    const body = text(raw.text, 200);
    const detail = text(raw.detail, 120);
    if (body !== null) keepsake = { kind: "post-it", text: body, ...(detail === null ? {} : { detail }), score };
  }
  if (!keepsake) return null;
  try {
    if (new TextEncoder().encode(JSON.stringify(keepsake)).byteLength > MAX_KEEPSAKE_BYTES) return null;
  } catch {
    return null;
  }
  return keepsake;
}

/** Souvenirs valides, ≤ 24 Ko chacun : trois généraux et un incompris par auteur. */
export function sanitizeKeepsakes(raw: unknown, playerIds: ReadonlySet<PlayerId>): Keepsake[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw.slice(0, MAX_CANDIDATES_PER_ROUND).map((k) => sanitizeKeepsake(k, playerIds)).filter((k): k is Keepsake => k !== null);
  list.sort((a, b) => b.score - a.score);
  const general = list.filter((k) => k.kind !== "dessin" || k.tag !== "incompris").slice(0, MAX_KEEPSAKES_PER_GAME);
  const incompris = list.filter((k): k is Extract<Keepsake, { kind: "dessin" }> => k.kind === "dessin" && k.tag === "incompris").sort((a, b) => a.score - b.score);
  const kept: Keepsake[] = [...general];
  const seen = new Set<string>();
  for (const k of incompris) if (!seen.has(k.playerId)) { seen.add(k.playerId); kept.push(k); }
  return kept.length > 0 ? kept : undefined;
}

/**
 * Borne la mémoire de la partie : un seul dessin « incompris » par joueur (le moins voté, puis le plus récent), au plus 3 souvenirs par jeu
 * (les plus intéressants, à égalité les plus récents), 40 au total. Renvoie un nouvel historique, l'original est intact.
 */
export function pruneKeepsakes(history: RoundSummary[]): RoundSummary[] {
  type Ref = { round: number; index: number; keepsake: Keepsake };
  const refs: Ref[] = [];
  history.forEach((summary, round) => summary.keepsakes?.forEach((keepsake, index) => refs.push({ round, index, keepsake })));
  const dropped = new Set<Ref>();
  const newestFirst = [...refs].reverse();

  const incomprisRefs = newestFirst.filter((r) => r.keepsake.kind === "dessin" && r.keepsake.tag === "incompris")
    .sort((a, b) => a.keepsake.score - b.keepsake.score);
  const seenIncompris = new Set<PlayerId>();
  for (const ref of incomprisRefs) {
    const k = ref.keepsake;
    if (k.kind !== "dessin") continue;
    if (seenIncompris.has(k.playerId)) dropped.add(ref);
    else seenIncompris.add(k.playerId);
  }

  const byScore = (a: Ref, b: Ref) => b.keepsake.score - a.keepsake.score;
  const perGame = new Map<string, Ref[]>();
  for (const ref of newestFirst) {
    if (dropped.has(ref) || (ref.keepsake.kind === "dessin" && ref.keepsake.tag === "incompris")) continue;
    const gameId = history[ref.round]!.gameId;
    perGame.set(gameId, [...(perGame.get(gameId) ?? []), ref]);
  }
  for (const list of perGame.values()) list.sort(byScore).slice(MAX_KEEPSAKES_PER_GAME).forEach((ref) => dropped.add(ref));

  const alive = newestFirst.filter((ref) => !dropped.has(ref)).sort((a, b) => {
    const protectedA = a.keepsake.kind === "dessin" && a.keepsake.tag === "incompris" ? 1 : 0;
    const protectedB = b.keepsake.kind === "dessin" && b.keepsake.tag === "incompris" ? 1 : 0;
    return protectedB - protectedA || byScore(a, b);
  });
  alive.slice(MAX_KEEPSAKES_TOTAL).forEach((ref) => dropped.add(ref));

  if (dropped.size === 0) return history;
  return history.map((summary, round) => {
    if (!summary.keepsakes) return summary;
    const keepsakes = summary.keepsakes.filter((_, index) => !refs.some((r) => r.round === round && r.index === index && dropped.has(r)));
    const { keepsakes: _old, ...rest } = summary;
    return keepsakes.length > 0 ? { ...rest, keepsakes } : rest;
  });
}

/** Historique relu d'une sauvegarde : entrées illisibles ignorées, taille bornée. */
export function sanitizeHistory(raw: unknown): RoundSummary[] {
  if (!Array.isArray(raw)) return [];
  const out: RoundSummary[] = [];
  for (const entry of raw.slice(0, MAX_HISTORY)) {
    if (!isRecord(entry) || typeof entry.gameId !== "string" || !Array.isArray(entry.participants) || !isRecord(entry.deltas)) continue;
    const participants = entry.participants.filter((id): id is string => typeof id === "string");
    const ids = new Set(participants);
    const standingsAfter = Array.isArray(entry.standingsAfter) ? entry.standingsAfter.filter((id): id is string => typeof id === "string") : [];
    for (const id of standingsAfter) ids.add(id);
    const numbers = (o: unknown) => Object.fromEntries(Object.entries(isRecord(o) ? o : {}).filter(([, v]) => typeof v === "number" && Number.isFinite(v))) as Record<string, number>;
    const stats = sanitizeStats(entry.stats, ids);
    const opinions = sanitizeOpinions(entry.opinions, ids);
    const keepsakes = sanitizeKeepsakes(entry.keepsakes, ids);
    out.push({
      gameId: entry.gameId,
      participants,
      deltas: numbers(entry.deltas),
      standingsAfter,
      scoresAfter: numbers(entry.scoresAfter),
      ...(stats ? { stats } : {}),
      ...(opinions ? { opinions } : {}),
      ...(keepsakes ? { keepsakes } : {}),
    });
  }
  return out;
}
