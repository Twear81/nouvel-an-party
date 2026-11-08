import { describe, expect, it } from "bun:test";
import { interludeCounts } from "../../src/shared/interlude";
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

describe("jeux interlude (surprises)", () => {
  const normalA = makeFakeGame({ id: "a", items: 12 });
  const normalB = makeFakeGame({ id: "b", items: 12 });
  const surprise = (items = 6, every = 3, id = "s") => makeFakeGame({ id, items, interlude: every });
  const ids = (plan: { gameId: string }[]) => plan.map((r) => r.gameId).join("");

  it("le catalogue expose N, sans compter l'intro dans la durée", () => {
    const s = makeFakeGame({ id: "s", items: 4, estimate: 20, interlude: 5 });
    expect(buildCatalog([s.loaded], 4)).toEqual([{ id: "s", name: "Jeu s", description: "Description s", available: 4, secondsPerRound: 20, interlude: 5 }]);
  });

  it("un interlude vaut 0 ou 1 (interrupteur), par défaut 1, même avec une grosse durée cible", () => {
    const catalog = buildCatalog([normalA.loaded, surprise().loaded], 4);
    expect(defaultSetup(catalog, 600).counts.s).toBe(1);
    expect(sanitizeSetup({ counts: { a: 1, s: 7 } }, catalog).counts.s).toBe(1);
    expect(sanitizeSetup({ counts: { a: 1, s: -2 } }, catalog).counts.s).toBe(0);
    expect(sanitizeSetup({ counts: { a: 1, s: 0.9 } }, catalog).counts.s).toBe(0);
  });

  it("un interlude sans contenu reste à 0", () => {
    const catalog = buildCatalog([surprise(0).loaded], 4);
    expect(defaultSetup(catalog, 60).counts.s).toBe(0);
    expect(sanitizeSetup({ counts: { s: 1 } }, catalog).counts.s).toBe(0);
  });

  it("insère une manche interlude par bloc complet de N manches normales", () => {
    const s = surprise(6, 3);
    for (const order of ["melange", "groupe"] as const) {
      const plan = buildPlan([normalA.loaded, normalB.loaded, s.loaded], { counts: { a: 4, b: 3, s: 1 } }, order, seededRng(7));
      expect(plan.filter((r) => r.interlude)).toHaveLength(2); // 7 manches normales → 2 blocs complets
      expect(plan.filter((r) => !r.interlude)).toHaveLength(7);
      expect(plan.filter((r) => r.interlude).every((r) => r.gameId === "s")).toBe(true);
    }
  });

  it("jamais en première position, jamais deux de suite, un par bloc", () => {
    const s = surprise(10, 3);
    for (let seed = 0; seed < 300; seed++) {
      const plan = buildPlan([normalA.loaded, normalB.loaded, s.loaded], { counts: { a: 5, b: 4, s: 1 } }, "melange", seededRng(seed));
      expect(plan[0]!.interlude, `seed=${seed}`).toBeFalsy();
      expect(plan.filter((r) => r.interlude)).toHaveLength(3);
      for (let i = 1; i < plan.length; i++) expect(plan[i]!.interlude && plan[i - 1]!.interlude, `seed=${seed}`).toBeFalsy();
      // Le k-ème interlude est dans le bloc k : il suit entre 1 et 3 manches normales du bloc.
      let normals = 0;
      let block = 0;
      for (const r of plan) {
        if (!r.interlude) normals++;
        else {
          expect(normals, `seed=${seed}`).toBeGreaterThan(block * 3);
          expect(normals).toBeLessThanOrEqual(block * 3 + 3);
          block++;
        }
      }
    }
  });

  it("la position varie selon le tirage (pas toujours au même endroit)", () => {
    const s = surprise(10, 5);
    const positions = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
      const plan = buildPlan([normalA.loaded, s.loaded], { counts: { a: 5, s: 1 } }, "melange", seededRng(seed));
      positions.add(plan.findIndex((r) => r.interlude));
    }
    expect(positions.size).toBeGreaterThanOrEqual(4);
  });

  it("épuisement : s'arrête quand il n'y a plus d'éléments, sans répétition", () => {
    const s = surprise(2, 2);
    const plan = buildPlan([normalA.loaded, s.loaded], { counts: { a: 12, s: 1 } }, "melange", seededRng(4));
    const picked = plan.filter((r) => r.interlude);
    expect(picked).toHaveLength(2); // 6 blocs possibles, 2 éléments seulement
    expect(new Set(picked.map((r) => r.item)).size).toBe(2);
  });

  it("moins de N manches normales : pas d'interlude", () => {
    const plan = buildPlan([normalA.loaded, surprise(6, 5).loaded], { counts: { a: 4, s: 1 } }, "melange", seededRng(1));
    expect(plan.some((r) => r.interlude)).toBe(false);
    expect(plan).toHaveLength(4);
  });

  it("interrupteur à 0 : aucun interlude", () => {
    const plan = buildPlan([normalA.loaded, surprise(6, 2).loaded], { counts: { a: 8, s: 0 } }, "melange", seededRng(1));
    expect(plan.some((r) => r.interlude)).toBe(false);
  });

  it("aucune manche normale mais interlude activé : une seule manche interlude", () => {
    const plan = buildPlan([normalA.loaded, surprise(6, 5).loaded], { counts: { a: 0, s: 1 } }, "melange", seededRng(1));
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ gameId: "s", interlude: true });
  });

  it("aucune manche du tout (interlude à 0) : plan vide", () => {
    expect(buildPlan([normalA.loaded, surprise().loaded], { counts: { a: 0, s: 0 } }, "melange", seededRng(1))).toEqual([]);
  });

  it("mode groupe : les manches normales d'un jeu restent groupées, l'interlude s'intercale entre deux manches", () => {
    const s = surprise(6, 3);
    const plan = buildPlan([normalA.loaded, normalB.loaded, s.loaded], { counts: { a: 3, b: 3, s: 1 } }, "groupe", seededRng(2));
    expect(ids(plan.filter((r) => !r.interlude))).toBe("aaabbb");
    expect(plan.filter((r) => r.interlude)).toHaveLength(2);
    expect(plan[0]!.interlude).toBeFalsy();
  });

  it("plusieurs jeux interlude : chacun son rythme, jamais adjacents", () => {
    const s1 = surprise(5, 2, "s1");
    const s2 = surprise(5, 2, "s2");
    for (let seed = 0; seed < 100; seed++) {
      const plan = buildPlan([normalA.loaded, s1.loaded, s2.loaded], { counts: { a: 6, s1: 1, s2: 1 } }, "melange", seededRng(seed));
      expect(plan.filter((r) => r.gameId === "s1")).toHaveLength(3);
      expect(plan.filter((r) => r.gameId === "s2")).toHaveLength(3);
      expect(plan[0]!.interlude).toBeFalsy();
      for (let i = 1; i < plan.length; i++) expect(plan[i]!.interlude && plan[i - 1]!.interlude, `seed=${seed}`).toBeFalsy();
    }
  });

  it("est déterministe pour une même graine, et ne change pas le plan normal", () => {
    const s = surprise(6, 3);
    const setup = { counts: { a: 4, b: 3, s: 1 } };
    const one = buildPlan([normalA.loaded, normalB.loaded, s.loaded], setup, "melange", seededRng(9));
    expect(buildPlan([normalA.loaded, normalB.loaded, s.loaded], setup, "melange", seededRng(9))).toEqual(one);
    const without = buildPlan([normalA.loaded, normalB.loaded], { counts: { a: 4, b: 3 } }, "melange", seededRng(9));
    expect(one.filter((r) => !r.interlude)).toEqual(without);
  });
});

describe("interludeCounts (estimation du lobby)", () => {
  it("compte les blocs complets, plafonne au contenu", () => {
    const src = [{ id: "s", every: 5, available: 3, enabled: true }];
    expect(interludeCounts(4, src).s).toBe(0);
    expect(interludeCounts(5, src).s).toBe(1);
    expect(interludeCounts(14, src).s).toBe(2);
    expect(interludeCounts(40, src).s).toBe(3);
    expect(interludeCounts(40, [{ ...src[0]!, enabled: false }]).s).toBe(0);
  });
});
