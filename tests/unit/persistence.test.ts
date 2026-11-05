import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { GameEngine, GameError } from "../../src/server/engine/engine";
import { MemoryPersistence, createTestEngine } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";
import { seededRng } from "./helpers/rng";

let errSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  errSpy = spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

/** Simule un redémarrage du serveur : un nouveau moteur relit la même sauvegarde. */
function restart(persistence: MemoryPersistence, fake: ReturnType<typeof createTestEngine>["fake"]) {
  const clock = new FakeClock();
  const engine = new GameEngine({
    games: [fake.loaded],
    settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
    joinUrl: "http://test",
    clock,
    rng: seededRng(1),
    persistence,
  });
  return { engine, clock };
}

describe("sauvegarde", () => {
  it("est écrite à chaque étape importante", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    const afterProfiles = persistence.saves.length;
    expect(afterProfiles).toBeGreaterThanOrEqual(3); // un setProfile par joueur
    t.engine.start();
    expect(persistence.data).toMatchObject({ version: 1, phase: "intro", roundIndex: 0 });
    t.clock.advance(14_000);
    expect(persistence.data!.phase).toBe("results");
    expect(persistence.data!.players).toHaveLength(3);
    expect(persistence.data!.plan).toHaveLength(2);
  });

  it("contient les jetons, profils et scores", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    t.clock.advance(4000);
    t.engine.input(t.ids[0]!, { v: 40 });
    t.clock.advance(10_000);
    const saved = persistence.data!.players.find((p) => p.id === t.ids[0])!;
    expect(saved).toMatchObject({ token: t.players[0]!.token, score: 40 });
    expect(saved.profile!.name).toBe("Joueur1");
  });

  it("un nouveau moteur restaure les joueurs (déconnectés) avec leur jeton", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();

    const b = restart(persistence, t.fake);
    const s = b.engine.snapshot(null);
    expect(s.phase).toBe("lobby");
    expect(s.players).toHaveLength(3);
    expect(s.players.every((p) => !p.connected)).toBe(true);
    expect(s.resumable).toEqual({ roundIndex: 0, total: 2 });

    const back = b.engine.join(t.players[1]!.token);
    expect(back.playerId).toBe(t.ids[1]!);
    expect(b.engine.snapshot(null).players.find((p) => p.id === back.playerId)!.connected).toBe(true);
  });

  it("restaure aussi le réglage des manches", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence, rounds: 4 });
    t.engine.start(); // le réglage est sauvegardé au démarrage
    expect(restart(persistence, t.fake).engine.snapshot(null).setup.counts).toEqual({ fake: 4 });
  });

  it("une partie restée au lobby n'est pas reprenable", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.backToLobby();
    const b = restart(persistence, t.fake);
    expect(b.engine.snapshot(null).resumable).toBeNull();
    expect(() => b.engine.resumeSave()).toThrow(GameError);
  });

  it("une partie terminée (final) n'est pas reprenable", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence, rounds: 1 });
    t.engine.start();
    t.engine.skip();
    t.engine.skip();
    t.engine.skip();
    t.engine.skip();
    expect(persistence.data!.phase).toBe("final");
    const b = restart(persistence, t.fake);
    expect(b.engine.snapshot(null).resumable).toBeNull();
    expect(b.engine.snapshot(null).players).toHaveLength(3);
    expect(() => b.engine.resumeSave()).toThrow("Rien à reprendre");
  });
});

describe("reprise", () => {
  it("rejoue la manche interrompue pendant l'intro", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    const firstItem = persistence.data!.plan[0]!.item;
    t.clock.advance(1000);

    const b = restart(persistence, t.fake);
    b.engine.resumeSave();
    const s = b.engine.snapshot(null);
    expect(s).toMatchObject({ phase: "intro", resumable: null, round: { index: 0, total: 2 } });
    expect(s.round!.public).toMatchObject({ item: firstItem });
  });

  it("rejoue la manche interrompue pendant le jeu, en gardant les scores précédents", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    t.clock.advance(4000);
    t.engine.input(t.ids[0]!, { v: 25 });
    t.clock.advance(10_000); // résultats manche 0 (score 25)
    t.engine.skip(); // intro manche 1
    t.clock.advance(4000); // playing manche 1, jamais terminée
    expect(persistence.data!.phase).toBe("intro");
    expect(persistence.data!.roundIndex).toBe(1);

    const b = restart(persistence, t.fake);
    b.engine.resumeSave();
    const s = b.engine.snapshot(null);
    expect(s).toMatchObject({ phase: "intro", round: { index: 1 } });
    expect(s.players.find((p) => p.id === t.ids[0])!.score).toBe(25);
    b.clock.advance(4000 + 10_000);
    expect(b.engine.snapshot(null).phase).toBe("results");
  });

  it("continue vers la manche suivante si la sauvegarde est en phase results", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    t.clock.advance(14_000);
    expect(persistence.data!.phase).toBe("results");

    const b = restart(persistence, t.fake);
    expect(b.engine.snapshot(null).resumable).toEqual({ roundIndex: 0, total: 2 });
    b.engine.resumeSave();
    expect(b.engine.snapshot(null)).toMatchObject({ phase: "intro", round: { index: 1, total: 2 } });
  });

  it("results de la dernière manche : la reprise mène directement au final", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence, rounds: 1 });
    t.engine.start();
    t.clock.advance(14_000);
    const b = restart(persistence, t.fake);
    b.engine.resumeSave();
    expect(b.engine.snapshot(null).phase).toBe("final");
  });

  it("refuse de reprendre deux fois ou depuis une partie en cours", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    const b = restart(persistence, t.fake);
    b.engine.resumeSave();
    expect(() => b.engine.resumeSave()).toThrow(GameError);
  });

  it("lancer une nouvelle partie abandonne la reprise", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    const b = restart(persistence, t.fake);
    b.engine.start();
    expect(b.engine.snapshot(null).resumable).toBeNull();
    expect(b.engine.snapshot(null).round!.index).toBe(0);
  });

  it("ignore une sauvegarde d'une version inconnue", () => {
    const persistence = new MemoryPersistence();
    const t = createTestEngine({ persistence });
    t.engine.start();
    persistence.data = { ...persistence.data!, version: 2 as unknown as 1 };
    const b = restart(persistence, t.fake);
    expect(b.engine.snapshot(null).players).toHaveLength(0);
    expect(b.engine.snapshot(null).resumable).toBeNull();
  });
});
