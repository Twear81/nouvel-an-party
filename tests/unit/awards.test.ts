import { describe, expect, it } from "bun:test";
import { awardCandidates, bonusPoints, drawAwards, chooseSouvenirs, DEFAULT_OUTRO } from "../../src/server/engine/awards";
import { ceremonyTimeline, ceremonyScores, revealedAwards, type RoundSummary, type CeremonyInfo } from "../../src/shared/ceremony";
import { DEFAULT_AWARD_CATEGORIES, outroContentSchema, resolveAwardCategories } from "../../src/server/outro-content";
import { seededRng } from "./helpers/rng";

const ids = ["a", "b", "c", "d", "e", "f", "g"];
function round(deltas: Record<string, number>, extra: Partial<RoundSummary> = {}): RoundSummary {
  return { gameId: "fake", participants: Object.keys(deltas), deltas, standingsAfter: Object.keys(deltas).sort((a, b) => deltas[b]! - deltas[a]!), scoresAfter: deltas, ...extra };
}

function simulationHistory(seed: number): RoundSummary[] {
  const rng = seededRng(seed);
  const cumulative = Object.fromEntries(ids.map((id) => [id, 0]));
  return Array.from({ length: 16 }, (_, index) => {
    const deltas = Object.fromEntries(ids.map((id) => [id, Math.floor(rng() * 6) * 20]));
    for (const id of ids) cumulative[id]! += deltas[id]!;
    return round(deltas, {
      gameId: `jeu-${index % 4}`, scoresAfter: { ...cumulative },
      stats: Object.fromEntries(ids.map((id) => [id, { reactionMs: [100 + Math.floor(rng() * 1000)], actions: Math.floor(rng() * 80), answerChanges: Math.floor(rng() * 5), designations: Math.floor(rng() * 4), drawings: 1, drawingVotes: Math.floor(rng() * 4) }])),
      opinions: [Object.fromEntries(ids.map((id) => [id, String(Math.floor(rng() * 2))]))],
    });
  });
}

describe("catégories de cérémonie", () => {
  it("ne propose aucun bonus sans données", () => expect(awardCandidates([], ids, seededRng(1))).toEqual([]));
  it("garde les ex æquo et ignore les absents", () => {
    const candidates = awardCandidates([round({ a: 100, b: 0, c: 0 })], ["a", "b", "c", "absent"], seededRng(1));
    expect(candidates.find((c) => c.id === "merci-travaux")?.winners).toEqual(["b", "c"]);
    expect(candidates.find((c) => c.id === "roi-manches")?.winners).toEqual(["a"]);
  });
  it("compare les avis seulement lorsque les deux joueurs ont répondu ; le Duo gagne à deux", () => {
    const c = awardCandidates([round({ a: 0, b: 0, c: 0 }, { opinions: [{ a: "oui", b: "non", c: "oui" }, { a: "0", b: "1" }, { a: "x", b: "y", c: "x" }, { a: "1", b: "2" }] })], ["a", "b", "c"], seededRng(1)).find((c) => c.id === "duo-improbable")!;
    expect(c.winners).toEqual(["a", "b"]);
    expect(c.statLabel).toContain("désaccord");
  });
  it("ignore une paire avec moins de 3 avis communs", () => {
    const c = awardCandidates([round({ a: 0, b: 0 }, { opinions: [{ a: "oui", b: "non" }, { a: "0", b: "1" }] })], ["a", "b"], seededRng(1));
    expect(c.find((c) => c.id === "duo-improbable")).toBeUndefined();
  });
  it("ne donne le talent incompris qu'aux auteurs de dessins non vides et retient le moins voté", () => {
    const strokes = [{ c: 0, w: 0, p: [0, 0, 50, 50] }];
    const c = awardCandidates([round({ a: 0, b: 0, c: 0 }, {
      stats: { a: { drawings: 1, drawingVotes: 0 }, b: { drawings: 1, drawingVotes: 2 }, c: { drawings: 0, drawingVotes: 0 } },
      keepsakes: [{ kind: "dessin", tag: "incompris", playerId: "a", label: "Étoile", strokes, score: 0 }],
    })], ["a", "b", "c"], seededRng(2)).find((c) => c.id === "talent-incompris")!;
    expect(c.winners).toEqual(["a"]);
    expect(c.keepsake?.kind).toBe("dessin");
  });
  it("n'utilise pas l'ordre des ex æquo comme remontée de classement", () => {
    const c = awardCandidates([round({ a: 100, b: 100 }), round({ b: 100, a: 100 })], ["a", "b"], seededRng(1));
    expect(c.some((c) => c.id === "craquage-dos")).toBe(false);
  });
  it("calcule B sur les gains des manches, arrondi à 10 et borné", () => {
    expect(bonusPoints([round({ a: 100, b: 50 }), round({ a: 200, b: 0 })])).toBe(60);
    expect(bonusPoints([])).toBe(10);
    expect(bonusPoints([], -10)).toBe(0);
    expect(bonusPoints([], 85)).toBe(85);
  });
  it("tire sans remise et finit chaque roulette par sa catégorie", () => {
    const history = simulationHistory(4);
    const awards = drawAwards(history, { a: 1000, b: 900, c: 800, d: 700, e: 600, f: 500, g: 400 }, DEFAULT_OUTRO, seededRng(8));
    expect(awards).toHaveLength(4);
    expect(new Set(awards.map((a) => a.id)).size).toBe(4);
    for (const award of awards) { expect(award.roulette.at(-1)).toBe(award.id); expect(award.points).toBeGreaterThan(0); }
  });
  it("respecte activation et textes organisateur", () => {
    const categories = resolveAwardCategories(outroContentSchema.parse({ categories: { "merci-travaux": { actif: false }, "roi-manches": { titre: "Notre champion" } } }));
    const awards = drawAwards([round({ a: 100, b: 0 })], { a: 100, b: 0 }, { ...DEFAULT_OUTRO, bonus: 12 }, seededRng(1), categories);
    expect(awards.some((a) => a.id === "merci-travaux")).toBe(false);
    expect(awards.find((a) => a.id === "roi-manches")?.title).toBe("Notre champion");
    expect(outroContentSchema.safeParse({ categories: { inconnue: {} } }).success).toBe(false);
    expect(categories.length).toBe(DEFAULT_AWARD_CATEGORIES.length - 1);
  });
  it("choisit jusqu'à trois souvenirs de types différents", () => {
    const souvenirs = chooseSouvenirs([round({ a: 0 }, { keepsakes: [
      { kind: "objet", emoji: "🥔", label: "Patate", detail: "50 €", score: 20 },
      { kind: "objet", emoji: "🏎️", label: "Voiture", detail: "500 €", score: 40 },
      { kind: "post-it", text: "Tout faux !", score: 2 },
    ] })]);
    expect(souvenirs.map((s) => s.kind)).toEqual(["objet", "post-it"]);
    expect(souvenirs[0]).toHaveProperty("label", "Voiture");
  });
  it("partage la chronologie et n'affiche des points qu'à la révélation du gagnant", () => {
    const award = drawAwards([round({ a: 100, b: 0 })], { a: 100, b: 0 }, { ...DEFAULT_OUTRO, bonus: 1 }, seededRng(3))[0]!;
    const info: CeremonyInfo = { startedAt: 0, playerIds: ["a", "b"], scoresBefore: { a: 100, b: 0 }, souvenirs: [], awards: [award], categories: {}, timeScale: 1, pausedMs: 0, pausedSince: null };
    const timeline = ceremonyTimeline([], [award]);
    const reveal = timeline.steps.find((s) => s.kind === "gagnant")!.startMs;
    expect(revealedAwards(timeline.steps, reveal - 1)).toBe(0);
    expect(ceremonyScores(info, reveal - 1)).toEqual(info.scoresBefore);
    expect(revealedAwards(timeline.steps, reveal)).toBe(1);
    for (const id of award.winners) expect(ceremonyScores(info, reveal)[id]).toBe(info.scoresBefore[id]! + award.points);
  });
  it("simulation déterministe : dominant ≥25 % d'avance protégé ; partie serrée parfois renversée", () => {
    let dominantWins = 0, closeChanges = 0;
    const simulations = 2500;
    for (let seed = 1; seed <= simulations; seed++) {
      const history = simulationHistory(seed);
      for (const dominant of [true, false]) {
        const scores = dominant ? { a: 2000, b: 1500, c: 1300, d: 1100, e: 1000, f: 900, g: 800 }
          : { a: 1000, b: 980, c: 960, d: 800, e: 700, f: 600, g: 500 };
        const awards = drawAwards(history, scores, DEFAULT_OUTRO, seededRng(seed + 9000));
        const final = { ...scores } as Record<string, number>;
        for (const award of awards) for (const id of award.winners) final[id]! += award.points;
        const leaderWins = final.a! >= Math.max(...Object.values(final));
        if (dominant && leaderWins) dominantWins++;
        if (!dominant && !leaderWins) closeChanges++;
      }
    }
    expect(dominantWins / simulations).toBeGreaterThanOrEqual(0.95);
    expect(closeChanges / simulations).toBeGreaterThanOrEqual(0.20);
    expect(closeChanges / simulations).toBeLessThanOrEqual(0.60);
  });
});
