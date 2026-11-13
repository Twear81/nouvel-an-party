import { describe, expect, it } from "bun:test";
import { ceremonyElapsed } from "../../src/shared/ceremony";
import { finalRevealElapsed } from "../../src/shared/final-reveal";
import { DEFAULT_OUTRO } from "../../src/server/engine/awards";
import { createTestEngine, MemoryPersistence, startRounds } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";

// Dates locales comme l'heure configurée de minuit : le test reste valable quelle que soit la zone du poste.
const START = new Date(2026, 11, 31, 23, 58, 58).getTime();
const MIDNIGHT = new Date(2027, 0, 1, 0, 0, 0).getTime();
const COUNTDOWN = MIDNIGHT - 60_000;
const AUTO_RESUME = MIDNIGHT + 120_000;

function beforeMidnight(final = false) {
  const persistence = new MemoryPersistence();
  const t = createTestEngine({
    rounds: 1, clock: new FakeClock(START), persistence,
    settings: { outro: DEFAULT_OUTRO, midnight: { time: "00:00", countdownSeconds: 60, autoResumeSeconds: 120 } },
  });
  startRounds(t.engine);
  t.engine.skip();
  t.engine.input(t.ids[0]!, { v: 100 });
  t.engine.input(t.ids[1]!, { v: 50 });
  t.engine.skip(); // résultats
  t.engine.skip(); // sortie de la pièce
  t.engine.skip(); // cérémonie
  expect(t.engine.snapshot(null).phase).toBe("ceremony");
  if (final) while (t.engine.snapshot(null).phase === "ceremony") t.engine.skip();
  return { ...t, persistence };
}

const scores = (t: ReturnType<typeof beforeMidnight>) => Object.fromEntries(t.engine.snapshot(null).players.map((p) => [p.id, p.score]));

describe("minuit pendant la cérémonie et le classement final", () => {
  it("fige la cérémonie, puis reprend exactement le même instant sans nouveau tirage ni double bonus", () => {
    const t = beforeMidnight();
    const original = structuredClone(t.engine.snapshot(null).ceremony!);
    const expectedFinal = { ...original.scoresBefore };
    for (const award of original.awards) for (const id of award.winners) expectedFinal[id]! += award.points;
    t.clock.advance(COUNTDOWN - t.clock.now());
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "ceremony", paused: true, midnight: { phase: "countdown" } });
    const elapsed = ceremonyElapsed(t.engine.snapshot(null).ceremony!, t.clock.now());
    expect(elapsed).toBe(2000);
    const startedAt = t.engine.snapshot(null).ceremony!.startedAt;
    t.engine.pause(); // une seconde demande de pause doit être inoffensive
    t.engine.skip(); // le compte à rebours empêche de passer les étapes
    t.engine.resume(); // seule la célébration autorise la reprise
    expect(t.engine.snapshot(null).paused).toBe(true);
    t.clock.advance(MIDNIGHT - t.clock.now());
    expect(t.engine.snapshot(null).midnight?.phase).toBe("celebrate");
    expect(ceremonyElapsed(t.engine.snapshot(null).ceremony!, t.clock.now())).toBe(elapsed);
    expect(scores(t)).toEqual(original.scoresBefore);
    t.engine.resume();
    const resumed = t.engine.snapshot(null).ceremony!;
    expect(t.engine.snapshot(null)).toMatchObject({ paused: false, midnight: null });
    expect(resumed.startedAt).toBe(startedAt);
    expect(resumed.pausedMs).toBe(60_000);
    expect(resumed.awards).toEqual(original.awards);
    expect(ceremonyElapsed(resumed, t.clock.now())).toBe(elapsed);
    t.engine.resume(); // pas de deuxième décompte de la pause
    t.clock.advance(500);
    expect(ceremonyElapsed(t.engine.snapshot(null).ceremony!, t.clock.now())).toBe(elapsed + 500);
    t.clock.advance(200_000);
    expect(t.engine.snapshot(null).phase).toBe("final");
    expect(scores(t)).toEqual(expectedFinal);
    t.engine.resume(); t.clock.advance(200_000);
    expect(scores(t)).toEqual(expectedFinal);
    expect(t.persistence.data?.history).toHaveLength(1);
  });

  it("fige la révélation finale et reprend automatiquement sans décaler deux fois son origine", () => {
    const t = beforeMidnight(true);
    const awardedScores = scores(t);
    const originalStart = t.engine.snapshot(null).finalReveal!.startedAt;
    t.clock.advance(COUNTDOWN - t.clock.now());
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "final", paused: true, midnight: { phase: "countdown" } });
    const frozen = finalRevealElapsed(t.engine.snapshot(null).finalReveal!, t.clock.now());
    expect(frozen).toBe(2000);
    t.engine.pause();
    t.engine.skip();
    t.clock.advance(MIDNIGHT - t.clock.now());
    expect(finalRevealElapsed(t.engine.snapshot(null).finalReveal!, t.clock.now())).toBe(frozen);
    t.clock.advance(AUTO_RESUME - t.clock.now());
    const resumed = t.engine.snapshot(null).finalReveal!;
    expect(t.engine.snapshot(null)).toMatchObject({ phase: "final", paused: false, midnight: null });
    expect(resumed.startedAt).toBe(originalStart);
    expect(resumed.pausedMs).toBe(180_000);
    expect(finalRevealElapsed(resumed, t.clock.now())).toBe(frozen);
    t.engine.resume();
    t.clock.advance(1000);
    expect(finalRevealElapsed(t.engine.snapshot(null).finalReveal!, t.clock.now())).toBe(frozen + 1000);
    expect(scores(t)).toEqual(awardedScores);
  });

  for (const final of [false, true]) {
    it(`respecte une pause déjà posée par l'hôte pendant ${final ? "le final" : "la cérémonie"}`, () => {
      const t = beforeMidnight(final);
      const readElapsed = () => {
        const snapshot = t.engine.snapshot(null);
        return final ? finalRevealElapsed(snapshot.finalReveal!, t.clock.now()) : ceremonyElapsed(snapshot.ceremony!, t.clock.now());
      };
      const readPause = () => {
        const snapshot = t.engine.snapshot(null);
        return final ? snapshot.finalReveal! : snapshot.ceremony!;
      };
      t.clock.advance(500);
      t.engine.pause();
      const pausedSince = readPause().pausedSince;
      const initialScores = scores(t);
      t.clock.advance(COUNTDOWN - t.clock.now());
      expect(t.engine.snapshot(null).midnight?.phase).toBe("countdown");
      expect(readPause().pausedSince).toBe(pausedSince);
      expect(readElapsed()).toBe(500);
      t.clock.advance(AUTO_RESUME - t.clock.now());
      expect(t.engine.snapshot(null)).toMatchObject({ midnight: null, paused: true });
      expect(readPause().pausedSince).toBe(pausedSince);
      expect(readPause().pausedMs ?? 0).toBe(0);
      expect(readElapsed()).toBe(500);
      expect(scores(t)).toEqual(initialScores);
      t.engine.resume();
      expect(t.engine.snapshot(null).paused).toBe(false);
      expect(readPause().pausedMs).toBe(AUTO_RESUME - pausedSince!);
      expect(readElapsed()).toBe(500);
      t.engine.resume();
      t.clock.advance(750);
      expect(readElapsed()).toBe(1250);
      expect(scores(t)).toEqual(initialScores);
    });
  }
});
