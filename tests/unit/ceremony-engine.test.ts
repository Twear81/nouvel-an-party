import { describe, expect, it } from "bun:test";
import { ceremonyElapsed, ceremonyTimeline } from "../../src/shared/ceremony";
import { GameEngine } from "../../src/server/engine/engine";
import { createTestEngine, MemoryPersistence, startRounds } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";
import { DEFAULT_OUTRO } from "../../src/server/engine/awards";

function ceremony() {
  const persistence = new MemoryPersistence();
  const t = createTestEngine({ rounds: 1, settings: { outro: DEFAULT_OUTRO }, persistence });
  startRounds(t.engine);
  t.engine.skip();
  t.engine.input(t.ids[0]!, { v: 100 });
  t.engine.input(t.ids[1]!, { v: 50 });
  t.engine.skip(); // résultats
  t.engine.skip(); // sortie
  t.engine.skip(); // cérémonie
  expect(t.engine.snapshot(null).phase).toBe("ceremony");
  return { ...t, persistence };
}

describe("moteur de cérémonie", () => {
  it("sauvegarde l'historique et ne transmet aucun gagnant futur au téléphone", () => {
    const t = ceremony();
    const tv = t.engine.snapshot(null), phone = t.engine.snapshot(t.ids[0]!);
    expect(tv.ceremony!.awards.length).toBeGreaterThan(0);
    expect(phone.ceremony!.awards).toEqual([]);
    expect(phone.ceremony!.categories).toEqual({});
    expect(phone.ceremony!.souvenirs).toEqual([]);
    expect(t.persistence.data?.history).toHaveLength(1);
    expect(t.persistence.data?.history?.[0]?.deltas).toMatchObject({ [t.ids[0]!]: 100, [t.ids[1]!]: 50 });
    expect(phone.players.map((p) => p.score)).toEqual([100, 50, 0]);
  });
  it("rediffuse le bonus seulement à la frontière gagnant et applique les points une seule fois à la fin", () => {
    const t = ceremony();
    const info = t.engine.snapshot(null).ceremony!;
    const reveal = ceremonyTimeline(info.souvenirs, info.awards).steps.find((s) => s.kind === "gagnant")!.startMs;
    t.clock.advance(reveal - 1);
    expect(t.engine.snapshot(t.ids[0]!).ceremony!.awards).toHaveLength(0);
    const changes = t.changes.count;
    t.clock.advance(1);
    expect(t.changes.count).toBeGreaterThan(changes);
    expect(t.engine.snapshot(t.ids[0]!).ceremony!.awards).toHaveLength(1);
    expect(t.engine.snapshot(t.ids[0]!).players.map((p) => p.score)).toEqual([100, 50, 0]);
    t.clock.advance(1_000_000);
    const final = t.engine.snapshot(null);
    expect(final.phase).toBe("final");
    const expected = { ...info.scoresBefore };
    for (const a of info.awards) for (const id of a.winners) expected[id]! += a.points;
    expect(Object.fromEntries(final.players.map((p) => [p.id, p.score]))).toEqual(expected);
    t.engine.skip(); t.clock.advance(1_000_000);
    expect(t.engine.snapshot(null).players).toEqual(final.players);
  });
  it("fige les étapes en pause, Passer avance d'une étape tout en restant en pause", () => {
    const t = ceremony();
    t.engine.pause();
    const before = ceremonyElapsed(t.engine.snapshot(null).ceremony!, t.clock.now());
    t.clock.advance(60_000);
    expect(ceremonyElapsed(t.engine.snapshot(null).ceremony!, t.clock.now())).toBe(before);
    t.engine.skip();
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "ceremony", paused: true, ceremony: { step: { kind: "provisoire" } } });
    t.engine.resume();
    t.clock.advance(1_000_000);
    expect(t.engine.snapshot(null).phase).toBe("final");
  });
  it("reprend le même tirage et le même instant après un crash en pause", () => {
    const t = ceremony();
    t.engine.skip(); t.engine.skip(); t.engine.pause();
    const saved = structuredClone(t.persistence.data!);
    const clock = new FakeClock(t.clock.now() + 60_000);
    const restoredStore = new MemoryPersistence(); restoredStore.data = saved;
    const engine = new GameEngine({ games: [t.fake.loaded], settings: { title: "T", targetMinutes: 1, order: "melange", introSeconds: 4, outro: DEFAULT_OUTRO }, clock, persistence: restoredStore, joinUrl: "http://test" });
    expect(engine.snapshot(null).resumable).not.toBeNull();
    engine.resumeSave();
    const resumed = engine.snapshot(null).ceremony!;
    expect(resumed.awards).toEqual(saved.ceremony!.awards);
    expect(engine.snapshot(null).paused).toBe(true);
    expect(ceremonyElapsed(resumed, clock.now())).toBe(ceremonyElapsed(saved.ceremony!, t.clock.now()));
    engine.resume(); clock.advance(1_000_000);
    expect(engine.snapshot(null).phase).toBe("final");
    expect(restoredStore.data?.history).toHaveLength(1);
  });
  it("annule les timers et l'historique au retour lobby", () => {
    const t = ceremony();
    t.engine.backToLobby(); t.clock.advance(1_000_000);
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "lobby", ceremony: null });
    expect(t.persistence.data?.history).toEqual([]);
    expect(t.engine.snapshot(null).players.every((p) => p.score === 0)).toBe(true);
  });
  it("un retardataire ne reçoit aucun bonus ni place de participant", () => {
    const t = ceremony();
    const late = t.engine.join(null);
    expect(t.engine.snapshot(late.playerId).ceremony!.playerIds).not.toContain(late.playerId);
  });
});

it("final : Pause fige la révélation et Passer rejoint l'instant suivant", async () => {
  const { finalRevealElapsed, finalRevealTimeline } = await import("../../src/shared/final-reveal");
  const t = ceremony(); t.clock.advance(1_000_000);
  const reveal = () => t.engine.snapshot(null).finalReveal!;
  t.engine.pause();
  const elapsed = finalRevealElapsed(reveal(), t.clock.now());
  t.clock.advance(5000);
  expect(finalRevealElapsed(reveal(), t.clock.now())).toBe(elapsed);
  // Recréer un final au début pour tester ses frontières (celui-ci est déjà terminé).
  t.engine.backToLobby(); startRounds(t.engine); t.engine.skip(); t.engine.skip(); t.engine.skip(); t.engine.skip();
  while (t.engine.snapshot(null).phase === "ceremony") t.engine.skip();
  expect(finalRevealElapsed(reveal(), t.clock.now())).toBe(0);
  t.engine.pause(); t.clock.advance(5000); t.engine.skip();
  expect(finalRevealElapsed(reveal(), t.clock.now())).toBe(finalRevealTimeline(reveal().playerIds.length).steps[0]!);
  expect(t.engine.snapshot(null).paused).toBe(true);
  t.engine.resume(); t.clock.advance(10);
  expect(finalRevealElapsed(reveal(), t.clock.now())).toBe(finalRevealTimeline(reveal().playerIds.length).steps[0]! + 10);
});

it("un crash après résultats ne recompte ni la manche ni ses gains", () => {
  const persistence = new MemoryPersistence();
  const t = createTestEngine({ rounds: 1, persistence, settings: { outro: DEFAULT_OUTRO } });
  startRounds(t.engine); t.engine.skip(); t.engine.input(t.ids[0]!, { v: 100, end: true });
  const saved = structuredClone(persistence.data!);
  const restoredStore = new MemoryPersistence(); restoredStore.data = saved;
  const clock = new FakeClock(t.clock.now());
  const engine = new GameEngine({ games: [t.fake.loaded], settings: { title: "T", targetMinutes: 1, order: "melange", introSeconds: 4, outro: DEFAULT_OUTRO }, clock, persistence: restoredStore, joinUrl: "http://test" });
  engine.resumeSave(); engine.skip();
  expect(engine.snapshot(null).phase).toBe("ceremony");
  expect(engine.snapshot(null).players.find((p) => p.id === t.ids[0])?.score).toBe(100);
  expect(restoredStore.data?.history).toHaveLength(1);
});

it("une cérémonie achevée pendant l'arrêt rejoint le final sans retirer les bonus au hasard", () => {
  const t = ceremony();
  const saved = structuredClone(t.persistence.data!);
  const restoredStore = new MemoryPersistence(); restoredStore.data = saved;
  const clock = new FakeClock(t.clock.now() + 1_000_000);
  let forbidDraw = false;
  const engine = new GameEngine({ games: [t.fake.loaded], settings: { title: "T", targetMinutes: 1, order: "melange", introSeconds: 4, outro: DEFAULT_OUTRO }, clock, persistence: restoredStore, rng: () => { if (forbidDraw) throw new Error("nouveau tirage interdit"); return 0.5; }, joinUrl: "http://test" });
  forbidDraw = true;
  engine.resumeSave();
  expect(engine.snapshot(null).phase).toBe("final");
  const expected = { ...saved.ceremony!.scoresBefore };
  for (const award of saved.ceremony!.awards) for (const id of award.winners) expected[id]! += award.points;
  expect(Object.fromEntries(engine.snapshot(null).players.map((p) => [p.id, p.score]))).toEqual(expected);
});

it("des métadonnées invalides ne jettent pas les résultats ni les points", () => {
  const persistence = new MemoryPersistence();
  const t = createTestEngine({ rounds: 1, persistence, settings: { outro: DEFAULT_OUTRO } });
  const original = t.fake.game.finish;
  t.fake.game.finish = (state, ctx) => ({ ...original(state, ctx), stats: { [t.ids[0]!]: { actions: -1, reactionMs: [Infinity, -10] } }, keepsakes: [{ kind: "dessin", playerId: t.ids[0]!, tag: "incompris", label: "Invalide", strokes: [null], score: 0 }] });
  startRounds(t.engine); t.engine.skip(); t.engine.input(t.ids[0]!, { v: 100, end: true });
  expect(t.engine.snapshot(null).phase).toBe("results");
  expect(t.engine.snapshot(null).players[0]?.score).toBe(100);
  expect(persistence.data?.history?.[0]?.stats).toBeUndefined();
  expect(persistence.data?.history?.[0]?.keepsakes).toBeUndefined();
});

it("conserve les souvenirs déjà révélés dans le décor du classement final et sa sauvegarde", () => {
  const persistence = new MemoryPersistence();
  const t = createTestEngine({ rounds: 1, persistence, settings: { outro: DEFAULT_OUTRO } });
  const original = t.fake.game.finish;
  t.fake.game.finish = (state, ctx) => ({ ...original(state, ctx), keepsakes: [{ kind: "post-it", text: "Tout faux !", detail: "Le souvenir de la soirée", score: 1 }] });
  startRounds(t.engine); t.engine.skip(); t.engine.input(t.ids[0]!, { v: 100, end: true });
  t.engine.skip(); t.engine.skip();
  const souvenirs = t.engine.snapshot(null).ceremony!.souvenirs;
  expect(souvenirs).toHaveLength(1);
  t.clock.advance(1_000_000);
  expect(t.engine.snapshot(null)).toMatchObject({ phase: "final", ceremony: null, finalReveal: { souvenirs } });
  expect(t.engine.snapshot(t.ids[0]!).finalReveal?.souvenirs).toEqual(souvenirs);
  expect(persistence.data?.finalReveal?.souvenirs).toEqual(souvenirs);
});
