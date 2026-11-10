// Fabrique un moteur prêt à jouer : horloge simulée, N joueurs avec profil, mini-jeu factice.
import { GameEngine, type EngineSettings, type Persistence, type SaveData } from "../../../src/server/engine/engine";
import type { LoadedGame } from "../../../src/server/engine/planner";
import { FakeClock } from "./fake-clock";
import { makeFakeGame, type FakeGameOptions } from "./fake-game";
import { seededRng } from "./rng";

export const validProfile = (name = "Alice") => ({
  name,
  avatar: { kind: "preset" as const, id: "x" },
  frame: "none",
  color: "#ff0000",
});

export class MemoryPersistence implements Persistence {
  data: SaveData | null = null;
  saves: SaveData[] = [];
  load() {
    return this.data;
  }
  save(d: SaveData) {
    this.data = structuredClone(d);
    this.saves.push(this.data);
  }
}

export interface TestEngineOptions {
  players?: number;
  /** Nombre de manches du mini-jeu factice (par défaut 2). */
  rounds?: number;
  game?: FakeGameOptions;
  games?: LoadedGame[];
  settings?: Partial<EngineSettings>;
  persistence?: Persistence;
  clock?: FakeClock;
  seed?: number;
}

export function createTestEngine(o: TestEngineOptions = {}) {
  const clock = o.clock ?? new FakeClock();
  const fake = makeFakeGame({ items: 5, ...o.game });
  const games = o.games ?? [fake.loaded];
  const changes = { count: 0 };
  const engine = new GameEngine({
    games,
    settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4, ...o.settings },
    joinUrl: "http://test",
    clock,
    rng: seededRng(o.seed ?? 42),
    onChange: () => void changes.count++,
    persistence: o.persistence,
  });
  if (!o.games) engine.setSetup({ counts: { [fake.game.id]: o.rounds ?? 2 } });
  const players = addPlayers(engine, o.players ?? 3);
  return { engine, clock, fake, players, ids: players.map((p) => p.playerId), changes };
}

/** Ajoute N joueurs connectés avec un profil valide. */
export function addPlayers(engine: GameEngine, n: number) {
  const out: { playerId: string; token: string }[] = [];
  for (let i = 0; i < n; i++) {
    const j = engine.join(null);
    engine.setProfile(j.playerId, validProfile(`Joueur${i + 1}`));
    out.push(j);
  }
  return out;
}

/** Lance les manches après avoir passé explicitement la scène d’ouverture. */
export function startRounds(engine: GameEngine) {
  engine.start();
  if (engine.snapshot(null).transition?.kind === "opening") engine.skip();
}
