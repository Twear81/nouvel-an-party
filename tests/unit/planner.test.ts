import { describe, expect, it } from "bun:test";
import { buildCatalog, buildPlan, defaultSetup, sanitizeSetup } from "../../src/server/engine/planner";
import type { CatalogEntry, Setup } from "../../src/shared/types";
import { makeFakeGame } from "./helpers/fake-game";
import { seededRng } from "./helpers/rng";

const entry = (id: string, available: number, secondsPerRound: number): CatalogEntry => ({
  id,
  name: id,
  description: "",
  available,
  secondsPerRound,
});

const total = (catalog: CatalogEntry[], s: Setup) => catalog.reduce((sum, c) => sum + s.counts[c.id]! * c.secondsPerRound, 0);

describe("buildCatalog", () => {
  it("ajoute la durée d'intro à l'estimation et compte les manches disponibles", () => {
    const a = makeFakeGame({ id: "a", items: 7, estimate: 40 });
    const catalog = buildCatalog([a.loaded], 4);
    expect(catalog).toEqual([{ id: "a", name: "Jeu a", description: "Description a", available: 7, secondsPerRound: 44 }]);
  });

  it("arrondit les secondes", () => {
    const a = makeFakeGame({ id: "a", estimate: 10.4 });
    expect(buildCatalog([a.loaded], 0.4)[0]!.secondsPerRound).toBe(11);
  });
});

describe("defaultSetup", () => {
  it("joue chaque mini-jeu au moins une fois même si la cible est minuscule", () => {
    const catalog = [entry("a", 5, 60), entry("b", 5, 60)];
    expect(defaultSetup(catalog, 0.01).counts).toEqual({ a: 1, b: 1 });
  });

  it("ajoute des manches à tour de rôle jusqu'à atteindre la cible", () => {
    const catalog = [entry("a", 10, 30), entry("b", 10, 30)];
    const s = defaultSetup(catalog, 2);
    expect(s.counts).toEqual({ a: 2, b: 2 });
    expect(total(catalog, s)).toBe(120);
  });

  it("est plafonné par le contenu disponible", () => {
    const catalog = [entry("a", 2, 30), entry("b", 3, 30)];
    expect(defaultSetup(catalog, 600).counts).toEqual({ a: 2, b: 3 });
  });

  it("un mini-jeu sans contenu reste à 0 et ne bloque pas", () => {
    const catalog = [entry("a", 0, 30), entry("b", 4, 30)];
    expect(defaultSetup(catalog, 600).counts).toEqual({ a: 0, b: 4 });
  });

  it("catalogue vide", () => {
    expect(defaultSetup([], 60).counts).toEqual({});
  });
});

describe("sanitizeSetup", () => {
  const catalog = [entry("a", 5, 30), entry("b", 3, 30)];

  it("borne entre 0 et le disponible, arrondit à l'entier inférieur", () => {
    expect(sanitizeSetup({ counts: { a: -4, b: 99 } }, catalog).counts).toEqual({ a: 0, b: 3 });
    expect(sanitizeSetup({ counts: { a: 2.9, b: 1 } }, catalog).counts).toEqual({ a: 2, b: 1 });
  });

  it("NaN, texte et valeurs manquantes donnent 0", () => {
    const bad = { counts: { a: NaN, b: "abc" } } as unknown as Setup;
    expect(sanitizeSetup(bad, catalog).counts).toEqual({ a: 0, b: 0 });
    expect(sanitizeSetup({} as Setup, catalog).counts).toEqual({ a: 0, b: 0 });
    expect(sanitizeSetup(null as unknown as Setup, catalog).counts).toEqual({ a: 0, b: 0 });
  });

  it("ignore les ids inconnus", () => {
    const res = sanitizeSetup({ counts: { a: 1, zzz: 4 } }, catalog);
    expect(res.counts).toEqual({ a: 1, b: 0 });
    expect("zzz" in res.counts).toBe(false);
  });
});

describe("buildPlan", () => {
  const a = makeFakeGame({ id: "a", items: 6 });
  const b = makeFakeGame({ id: "b", items: 6 });
  const c = makeFakeGame({ id: "c", items: 6 });
  const games = [a.loaded, b.loaded, c.loaded];

  it("respecte le nombre de manches demandé par mini-jeu", () => {
    const plan = buildPlan(games, { counts: { a: 2, b: 0, c: 4 } }, "melange", seededRng(1));
    expect(plan.filter((r) => r.gameId === "a")).toHaveLength(2);
    expect(plan.filter((r) => r.gameId === "b")).toHaveLength(0);
    expect(plan.filter((r) => r.gameId === "c")).toHaveLength(4);
  });

  it("ne tire jamais deux fois le même élément", () => {
    for (const order of ["melange", "groupe"] as const) {
      const plan = buildPlan(games, { counts: { a: 6, b: 6, c: 6 } }, order, seededRng(3));
      const keys = plan.map((r) => `${r.gameId}:${r.item}`);
      expect(new Set(keys).size).toBe(18);
    }
  });

  it("un mini-jeu absent de setup n'est pas joué", () => {
    expect(buildPlan(games, { counts: {} }, "melange", seededRng(1))).toEqual([]);
  });

  it("groupe : les manches d'un même mini-jeu sont contiguës", () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = buildPlan(games, { counts: { a: 3, b: 2, c: 4 } }, "groupe", seededRng(seed));
      const order = plan.map((r) => r.gameId).join("");
      expect(order).toBe("aaabbcccc");
    }
  });

  it("melange : évite le même mini-jeu deux fois de suite quand c'est possible", () => {
    const configs = [
      { a: 3, b: 3, c: 3 },
      { a: 2, b: 1, c: 1 },
      { a: 4, b: 3, c: 0 },
      { a: 1, b: 1, c: 1 },
      { a: 3, b: 2, c: 2 },
      { a: 5, b: 5, c: 1 },
    ];
    for (const counts of configs) {
      for (let seed = 0; seed < 200; seed++) {
        const plan = buildPlan(games, { counts }, "melange", seededRng(seed));
        const ids = plan.map((r) => r.gameId);
        for (let i = 1; i < ids.length; i++) {
          expect(ids[i], `counts=${JSON.stringify(counts)} seed=${seed} : ${ids.join("")}`).not.toBe(ids[i - 1]);
        }
      }
    }
  });

  it("melange : quand c'est impossible, tout est quand même joué", () => {
    const plan = buildPlan(games, { counts: { a: 5, b: 1, c: 0 } }, "melange", seededRng(5));
    expect(plan).toHaveLength(6);
    expect(plan.filter((r) => r.gameId === "a")).toHaveLength(5);
  });

  it("est déterministe pour une même graine", () => {
    const s = { counts: { a: 3, b: 3, c: 3 } };
    expect(buildPlan(games, s, "melange", seededRng(9))).toEqual(buildPlan(games, s, "melange", seededRng(9)));
  });
});
