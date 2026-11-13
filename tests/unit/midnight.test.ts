import { describe, expect, it } from "bun:test";
import { midnightYear, nextOccurrence, parseClockTime } from "../../src/shared/midnight";
import { MIDNIGHT_SFX_INITIAL, midnightStep } from "../../src/web/sound/events";
import { buildBursts } from "../../src/web/ui/Fireworks";
import { formatMmSs } from "../../src/web/ui/Midnight";

describe("heure de minuit", () => {
  it("lit HH:MM et HH:MM:SS, refuse le reste", () => {
    expect(parseClockTime("00:00")).toBe(0);
    expect(parseClockTime("23:59:30")).toBe(23 * 3600 + 59 * 60 + 30);
    for (const bad of ["24:00", "12:60", "minuit", "", "1230"]) expect(parseClockTime(bad)).toBeNull();
  });

  it("prochaine occurrence : aujourd'hui si pas passée, sinon demain (heure locale)", () => {
    const at = (d: number, h: number, m = 0, s = 0) => new Date(2026, 11, d, h, m, s).getTime();
    expect(nextOccurrence(at(31, 23, 0), "23:30")).toBe(at(31, 23, 30));
    expect(nextOccurrence(at(31, 23, 30), "23:30")).toBe(at(32, 23, 30));
    expect(nextOccurrence(at(31, 23, 59, 30), "00:00")).toBe(new Date(2027, 0, 1).getTime());
  });

  it("l'année fêtée est celle de minuit", () => {
    expect(midnightYear(new Date(2027, 0, 1, 0, 0, 0).getTime())).toBe(2027);
    expect(midnightYear(new Date(2026, 11, 31, 23, 59, 0).getTime())).toBe(2027);
  });

  it("formate le temps restant en mm:ss", () => {
    expect(formatMmSs(60)).toBe("01:00");
    expect(formatMmSs(11)).toBe("00:11");
  });
});

describe("sons de minuit", () => {
  const run = (remaining: (number | null)[]) => {
    let state = MIDNIGHT_SFX_INITIAL;
    const out: (string | null)[] = [];
    for (const r of remaining) {
      const step = midnightStep(state, r);
      state = step.state;
      out.push(step.call?.nom ?? null);
    }
    return out;
  };

  it("un tic par seconde sur les 10 dernières, la fête à zéro, rien au premier échantillon", () => {
    expect(run([12_000, 10_500, 9_800, 8_900, 1_200, 400, 0])).toEqual([null, null, "minuit.tic", "minuit.tic", "minuit.tic", "minuit.tic", "minuit.fete"]);
  });

  it("pas de fanfare au rechargement pendant la célébration, ni de doublon", () => {
    expect(run([0, 0, 0])).toEqual([null, null, null]);
    expect(run([1_000, 600, 0, 0])).toEqual([null, null, "minuit.fete", null]);
  });
});

describe("feu d'artifice", () => {
  it("génère toujours les mêmes gerbes, dans l'écran", () => {
    const a = buildBursts(7, 22, 20);
    expect(a).toEqual(buildBursts(7, 22, 20));
    expect(a).toHaveLength(7);
    for (const b of a) {
      expect(b.sparks).toHaveLength(22);
      expect(b.x).toBeGreaterThan(5);
      expect(b.x).toBeLessThan(95);
    }
  });
});
