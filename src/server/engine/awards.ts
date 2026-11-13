// Bonus de fin : calcul et tirage purs, indépendants du moteur et du réseau.
import type { Award, Keepsake, RoundSummary } from "../../shared/ceremony";
import type { PlayerId } from "../../shared/types";
import { shuffle } from "../../shared/shuffle";
import { DEFAULT_AWARD_CATEGORIES, type AwardCategoryContent } from "../outro-content";

export interface OutroSettings { active: boolean; bonus: number; pointsBonus: "auto" | number }
export const DEFAULT_OUTRO: OutroSettings = { active: true, bonus: 4, pointsBonus: "auto" };
export interface AwardCandidate { id: string; winners: PlayerId[]; statLabel: string; keepsake?: Keepsake }

export function bonusPoints(history: RoundSummary[], configured: "auto" | number = "auto"): number {
  if (configured !== "auto") return Number.isFinite(configured) ? Math.max(0, Math.round(configured)) : 0;
  if (!history.length) return 10;
  const average = history.reduce((sum, r) => sum + Math.max(0, ...Object.values(r.deltas)), 0) / history.length;
  return Math.max(10, Math.round(average * 0.375 / 10) * 10);
}

/** Une catégorie sans données ou sans valeur positive n'entre pas dans la roulette. */
export function awardCandidates(history: RoundSummary[], playerIds: PlayerId[], rng: () => number): AwardCandidate[] {
  const candidates: AwardCandidate[] = [];
  const ids = new Set(playerIds);
  const totals = () => Object.fromEntries(playerIds.map((id) => [id, 0]));
  const addMax = (id: string, values: Record<string, number>, label: (n: number) => string) => {
    const valid = Object.entries(values).filter(([id, n]) => ids.has(id) && Number.isFinite(n));
    const max = Math.max(0, ...valid.map(([, n]) => n));
    if (max > 0) candidates.push({ id, winners: valid.filter(([, n]) => n === max).map(([id]) => id), statLabel: label(max) });
  };
  const firsts = totals(), lasts = totals(), zeros = totals(), middle = totals(), peaks = totals(), climbs = totals();
  let previous: Record<string, number> = totals();
  for (const round of history) {
    const participants = round.participants.filter((id) => ids.has(id));
    if (!participants.length) continue;
    const values = participants.map((id) => round.deltas[id] ?? 0);
    const best = Math.max(...values), worst = Math.min(...values);
    for (const id of participants) {
      const gain = round.deltas[id] ?? 0;
      if (gain === best) firsts[id]!++;
      if (gain === worst) lasts[id]!++;
      if (gain === 0) zeros[id]!++;
      peaks[id] = Math.max(peaks[id]!, gain);
      // Rang de compétition : un ex æquo n'est pas départagé par l'ordre d'inscription.
      const beforeRank = playerIds.filter((other) => (previous[other] ?? 0) > (previous[id] ?? 0)).length;
      const afterRank = playerIds.filter((other) => (round.scoresAfter[other] ?? 0) > (round.scoresAfter[id] ?? 0)).length;
      climbs[id] = Math.max(climbs[id]!, beforeRank - afterRank);
      const lower = values.filter((v) => v < gain).length;
      const higher = values.filter((v) => v > gain).length;
      if (participants.length >= 3 && lower > 0 && higher > 0 && Math.abs(lower - higher) <= 1) middle[id]!++;
    }
    previous = round.scoresAfter;
  }
  addMax("merci-travaux", lasts, (n) => `${n} dernière${n > 1 ? "s" : ""} place${n > 1 ? "s" : ""}`);
  addMax("roi-manches", firsts, (n) => `${n} manche${n > 1 ? "s" : ""} gagnée${n > 1 ? "s" : ""}`);
  addMax("cuillere-tiramisu", zeros, (n) => `${n} manche${n > 1 ? "s" : ""} à zéro point`);
  addMax("chou-fleur", middle, (n) => `${n} fois au milieu`);
  addMax("manche-de-sa-vie", peaks, (n) => `${n} points en une manche`);
  addMax("craquage-dos", climbs, (n) => `${n} place${n > 1 ? "s" : ""} remontée${n > 1 ? "s" : ""}`);

  for (const [key, category, label] of [
    ["actions", "k-style", (n: number) => `${n} appuis`],
    ["answerChanges", "indecis", (n: number) => `${n} changements d'avis`],
    ["designations", "geass", (n: number) => `${n} votes reçus`],
  ] as const) {
    const values = totals();
    for (const round of history) for (const id of playerIds) values[id]! += round.stats?.[id]?.[key] ?? 0;
    addMax(category, values, label);
  }
  const reactions: Record<string, number> = {};
  for (const id of playerIds) {
    const times = history.flatMap((r) => r.stats?.[id]?.reactionMs ?? []);
    if (times.length) reactions[id] = times.reduce((a, b) => a + b, 0) / times.length;
  }
  addMax("escargot", reactions, (n) => `${Math.round(n)} ms en moyenne`);

  const drawingVotes: Record<string, number> = {};
  for (const id of playerIds) {
    const played = history.filter((r) => (r.stats?.[id]?.drawings ?? 0) > 0);
    if (played.length) drawingVotes[id] = played.reduce((n, r) => n + (r.stats?.[id]?.drawingVotes ?? 0), 0);
  }
  if (Object.keys(drawingVotes).length) {
    const min = Math.min(...Object.values(drawingVotes));
    const winners = Object.keys(drawingVotes).filter((id) => drawingVotes[id] === min);
    const drawing = history.flatMap((r) => r.keepsakes ?? []).filter((k) => k.kind === "dessin" && k.tag === "incompris" && winners.includes(k.playerId))
      .sort((a, b) => a.score - b.score)[0];
    candidates.push({ id: "talent-incompris", winners, statLabel: `${min} vote${min > 1 ? "s" : ""} pour ses dessins`, ...(drawing ? { keepsake: drawing } : {}) });
  }

  const pairs: { winners: string[]; agrees: number; shared: number }[] = [];
  for (let i = 0; i < playerIds.length; i++) for (let j = i + 1; j < playerIds.length; j++) {
    const a = playerIds[i]!, b = playerIds[j]!;
    const shared = history.flatMap((r) => r.opinions ?? []).filter((o) => a in o && b in o);
    if (shared.length) pairs.push({ winners: [a, b], agrees: shared.filter((o) => o[a] === o[b]).length, shared: shared.length });
  }
  if (pairs.length) {
    const minimum = Math.min(...pairs.map((p) => p.agrees / p.shared));
    const tied = pairs.filter((p) => p.agrees / p.shared === minimum);
    const duo = tied[Math.min(tied.length - 1, Math.floor(rng() * tied.length))]!;
    candidates.push({ id: "duo-improbable", winners: duo.winners, statLabel: `${duo.shared - duo.agrees} désaccord${duo.shared - duo.agrees > 1 ? "s" : ""} sur ${duo.shared}` });
  }
  return candidates;
}

/** Sans remise ; aide modérée aux poursuivants, variété et catégories personnalisées. */
export function drawAwards(history: RoundSummary[], scoresBefore: Record<PlayerId, number>, settings: OutroSettings, rng: () => number,
  categories: AwardCategoryContent[] = DEFAULT_AWARD_CATEGORIES): Award[] {
  const content = new Map(categories.map((c) => [c.id, c]));
  const candidates = awardCandidates(history, Object.keys(scoresBefore), rng).filter((c) => content.has(c.id));
  const allIds = candidates.map((c) => c.id);
  const awarded = new Set<string>();
  const scores = { ...scoresBefore };
  const points = bonusPoints(history, settings.pointsBonus);
  const awards: Award[] = [];
  while (candidates.length && awards.length < settings.bonus) {
    const leadScore = Math.max(...Object.values(scores));
    const leaders = Object.keys(scores).filter((id) => scores[id] === leadScore);
    const weights = candidates.map((c) => (c.winners.some((id) => leaders.includes(id)) ? 1 : 1.6)
      * (c.winners.some((id) => awarded.has(id)) ? 0.5 : 1)
      * (["duo-improbable", "merci-travaux", "talent-incompris"].includes(c.id) ? 1.5 : 1));
    let ticket = rng() * weights.reduce((a, b) => a + b, 0);
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) { ticket -= weights[i]!; if (ticket < 0) { index = i; break; } }
    const [candidate] = candidates.splice(index, 1);
    const text = content.get(candidate!.id)!;
    const roulette = [...shuffle(allIds.filter((id) => id !== candidate!.id), rng).slice(0, 5), candidate!.id];
    awards.push({ ...candidate!, title: text.titre, phrase: text.phrase, emoji: text.emoji, points, roulette });
    for (const id of candidate!.winners) { awarded.add(id); scores[id]! += points; }
  }
  return awards;
}

export function chooseSouvenirs(history: RoundSummary[]): Keepsake[] {
  const all = history.flatMap((r) => r.keepsakes ?? []).filter((k) => k.kind !== "dessin" || k.tag === "meilleur").sort((a, b) => b.score - a.score);
  const selected: Keepsake[] = [];
  for (const k of all) if (!selected.some((s) => s.kind === k.kind)) selected.push(k);
  return selected.slice(0, 3);
}
