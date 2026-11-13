import { describe, expect, test } from "bun:test";
import { AVATARS, drawFrame, FRAMES, RARITY_RATES } from "../../src/web/theme/profile-options";

describe("profil : avatars, cadres et invocation", () => {
  test("les ids d'avatars et de cadres sont uniques, chaque avatar a un emoji (repli des avatars à image)", () => {
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(AVATARS.length);
    expect(new Set(FRAMES.map((f) => f.id)).size).toBe(FRAMES.length);
    for (const a of AVATARS) expect(a.emoji.length).toBeGreaterThan(0);
  });

  test("« aucun » est un tirage possible (rareté R) et chaque rareté a au moins un cadre", () => {
    expect(FRAMES.find((f) => f.id === "none")?.rarity).toBe("R");
    for (const r of ["R", "SR", "SSR"] as const) expect(FRAMES.some((f) => f.rarity === r)).toBe(true);
    expect(Object.values(RARITY_RATES).reduce((s, n) => s + n, 0)).toBe(100);
  });

  test("le tirage respecte les raretés : ~10 % de SSR, tous les cadres atteignables", () => {
    // Générateur déterministe (LCG) : le test ne dépend pas du hasard.
    let seed = 12345;
    const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const counts = new Map<string, number>();
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const f = drawFrame(rng);
      counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
    }
    const ssr = FRAMES.filter((f) => f.rarity === "SSR").reduce((s, f) => s + (counts.get(f.id) ?? 0), 0) / N;
    expect(ssr).toBeGreaterThan(0.08);
    expect(ssr).toBeLessThan(0.12);
    for (const f of FRAMES) expect(counts.get(f.id) ?? 0).toBeGreaterThan(0);
  });

  test("rng aux bornes : jamais de cadre indéfini", () => {
    expect(drawFrame(() => 0)).toBeDefined();
    expect(drawFrame(() => 0.999999)).toBeDefined();
  });
});
