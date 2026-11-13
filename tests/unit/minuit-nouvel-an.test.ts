import { describe, expect, it } from "bun:test";
import { nextOccurrence } from "../../src/shared/midnight";
import { createTestEngine, MemoryPersistence } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";

// Dates LOCALES, comme la configuration du PC serveur : les assertions ne dépendent pas d'un décalage UTC donné.
const at = (year: number, month: number, day: number, h = 0, m = 0, s = 0) => new Date(year, month - 1, day, h, m, s).getTime();
const settings = { midnight: { time: "00:00", countdownSeconds: 60, autoResumeSeconds: 120, newYearOnly: true } };
const engineAt = (now: number, persistence?: MemoryPersistence) => createTestEngine({ clock: new FakeClock(now), settings, players: 0, persistence });

describe("minuit réservé au passage au 1er janvier", () => {
  it("vise le prochain 1er janvier depuis une nuit ordinaire ou une année bissextile", () => {
    for (const now of [at(2026, 11, 13, 23, 59), at(2026, 12, 30, 23, 59), at(2026, 12, 31, 23, 59, 59)]) {
      expect(nextOccurrence(now, "00:00", true)).toBe(at(2027, 1, 1));
    }
    expect(nextOccurrence(at(2028, 2, 29, 23, 59), "00:00", true)).toBe(at(2029, 1, 1));
  });

  it("ne rattrape pas le minuit déjà passé et conserve l'heure locale configurée", () => {
    expect(nextOccurrence(at(2027, 1, 1), "00:00", true)).toBe(at(2028, 1, 1));
    expect(nextOccurrence(at(2027, 1, 1, 0, 0, 1), "00:00", true)).toBe(at(2028, 1, 1));
    expect(nextOccurrence(at(2026, 12, 31, 23, 59, 59), "00:00:30", true)).toBe(at(2027, 1, 1, 0, 0, 30));
    expect(nextOccurrence(at(2027, 1, 1, 0, 0, 20), "00:00:30", true)).toBe(at(2027, 1, 1, 0, 0, 30));
  });

  it("le moteur reste silencieux au passage de minuit une nuit ordinaire", () => {
    const t = engineAt(at(2026, 11, 13, 23, 58));
    t.clock.advance(5 * 60_000);
    expect(t.engine.snapshot(null).midnight).toBeNull();
    expect(t.engine.snapshot(null).paused).toBe(false);
  });

  it("commence le 31 décembre, célèbre le 1er janvier et ne recommence pas la nuit suivante", () => {
    const t = engineAt(at(2026, 12, 31, 23, 58));
    t.clock.advance(59_999);
    expect(t.engine.snapshot(null).midnight).toBeNull();
    t.clock.advance(1);
    expect(t.engine.snapshot(null).midnight).toEqual({ targetAt: at(2027, 1, 1), phase: "countdown", year: 2027 });
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).midnight?.phase).toBe("celebrate");
    t.clock.advance(120_000);
    expect(t.engine.snapshot(null).midnight).toBeNull();
    t.clock.advance(24 * 3600_000);
    expect(t.engine.snapshot(null).midnight).toBeNull();
  });

  it("un démarrage dans la fenêtre reprend le restant ; après minuit sans sauvegarde, il attend l'an prochain", () => {
    expect(engineAt(at(2026, 12, 31, 23, 59, 40)).engine.snapshot(null).midnight)
      .toMatchObject({ targetAt: at(2027, 1, 1), phase: "countdown" });
    const late = engineAt(at(2027, 1, 1, 0, 0, 10));
    expect(late.engine.snapshot(null).midnight).toBeNull();
    late.clock.advance(24 * 3600_000);
    expect(late.engine.snapshot(null).midnight).toBeNull();
  });

  it("après crash, reprend une célébration du Nouvel An sauvegardée", () => {
    const persistence = new MemoryPersistence();
    const first = engineAt(at(2026, 12, 31, 23, 59, 40), persistence);
    expect(first.engine.snapshot(null).midnight?.phase).toBe("countdown");
    const restored = engineAt(at(2027, 1, 1, 0, 0, 10), persistence);
    expect(restored.engine.snapshot(null).midnight).toEqual({ targetAt: at(2027, 1, 1), phase: "celebrate", year: 2027 });
  });

  it("ignore une ancienne célébration quotidienne sauvegardée à une autre date", () => {
    const persistence = new MemoryPersistence();
    const now = at(2026, 11, 13, 23, 59, 40);
    const first = createTestEngine({ clock: new FakeClock(now), players: 0, persistence,
      settings: { midnight: { ...settings.midnight, newYearOnly: false } } });
    expect(first.engine.snapshot(null).midnight?.phase).toBe("countdown");
    const restored = engineAt(at(2026, 11, 14, 0, 0, 10), persistence);
    expect(restored.engine.snapshot(null).midnight).toBeNull();
  });

  it("le mode répétition reste quotidien lorsqu'il est explicitement désactivé", () => {
    expect(nextOccurrence(at(2026, 11, 13, 23, 59, 40), "00:00", false)).toBe(at(2026, 11, 14));
    expect(nextOccurrence(at(2026, 11, 14, 0, 0, 10), "00:00", false)).toBe(at(2026, 11, 15));
  });
});
