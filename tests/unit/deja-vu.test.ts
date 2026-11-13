import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { emptyDejaVu, fingerprint, itemKeys, markPlayed, sanitizeDejaVu } from "../../src/server/engine/deja-vu";
import { GameEngine } from "../../src/server/engine/engine";
import { fileDejaVu } from "../../src/server/persistence";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { FakeClock } from "./helpers/fake-clock";
import { makeFakeGame } from "./helpers/fake-game";
import { seededRng } from "./helpers/rng";

let dir: string;
let warnSpy: ReturnType<typeof spyOn>;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "deja-vu-"));
  warnSpy = spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  warnSpy.mockRestore();
});

describe("empreinte et clés", () => {
  it("l'empreinte ignore l'ordre des champs et change avec le contenu", () => {
    expect(fingerprint({ a: 1, b: { c: 2, d: 3 } })).toBe(fingerprint({ b: { d: 3, c: 2 }, a: 1 }));
    expect(fingerprint({ text: "Une question ?" })).not.toBe(fingerprint({ text: "Une question !" }));
    expect(fingerprint({ text: "Q", duration: undefined })).toBe(fingerprint({ text: "Q" }));
  });

  it("itemInfo.keys remplace l'empreinte ; un itemInfo cassé retombe sur l'empreinte", () => {
    const composite = makeFakeGame({ itemInfo: () => ({ keys: ["m1", "m2"] }) }).game;
    expect(itemKeys(composite, "x")).toEqual(["m1", "m2"]);
    const broken = makeFakeGame({ itemInfo: () => { throw new Error("boum"); } }).game;
    expect(itemKeys(broken, "x")).toEqual([fingerprint("x")]);
  });
});

describe("sanitizeDejaVu", () => {
  it("contenu invalide (null, nombre, texte, tableau, autre version…) : tout est neuf", () => {
    for (const raw of [null, undefined, 42, "texte", [], { version: 2 }, { version: 1, items: "nope", themes: [] }]) {
      expect(sanitizeDejaVu(raw)).toEqual(emptyDejaVu());
    }
  });

  it("garde le valide, ignore le reste et recale le compteur", () => {
    const data = sanitizeDejaVu({ version: 1, counter: 1, items: { a: { k1: 7, k2: "x" }, b: 3 }, themes: { cinema: 9, bad: -1 }, lastGameId: "a" });
    expect(data.items).toEqual({ a: { k1: 7 } });
    expect(data.themes).toEqual({ cinema: 9 });
    expect(data.counter).toBe(9);
    expect(data.lastGameId).toBe("a");
  });
});

describe("fichier data/deja-vu.json", () => {
  it("absent : null ; écrit puis relu à l'identique", () => {
    const store = fileDejaVu(dir);
    expect(store.load()).toBeNull();
    const data = emptyDejaVu();
    markPlayed(data, makeFakeGame({ id: "a" }).game, "a-0");
    store.save(data);
    expect(sanitizeDejaVu(fileDejaVu(dir).load())).toEqual(data);
  });

  it("corrompu : ignoré sans planter", () => {
    writeFileSync(path.join(dir, "deja-vu.json"), "{pas du json");
    expect(fileDejaVu(dir).load()).toBeNull();
    const t = createTestEngine({ rounds: 2 }); // sanity : un moteur sans fichier démarre
    expect(t.engine.catalog[0]!.fresh).toBe(5);
    const engine = new GameEngine({
      games: [t.fake.loaded],
      settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
      joinUrl: "http://test",
      clock: new FakeClock(),
      rng: seededRng(1),
      dejaVu: fileDejaVu(dir),
    });
    expect(engine.catalog[0]!.fresh).toBe(5);
  });
});

describe("moteur", () => {
  it("écrit les éléments au démarrage de chaque manche et survit à un redémarrage", () => {
    const { engine, fake } = createTestEngine({ rounds: 2, dejaVu: fileDejaVu(dir) });
    expect(engine.catalog[0]!.fresh).toBe(5);
    startRounds(engine);
    // Manche 1 démarrée (en intro) : un élément est déjà mémorisé, avant même la fin de la manche.
    const written = JSON.parse(readFileSync(path.join(dir, "deja-vu.json"), "utf8"));
    expect(Object.keys(written.items.fake)).toHaveLength(1);
    expect(written.lastGameId).toBe("fake");
    expect(engine.catalog[0]!.fresh).toBe(4);

    // « Redémarrage de l'exe » : un nouveau moteur relit le fichier.
    const again = new GameEngine({
      games: [fake.loaded],
      settings: { title: "Test", targetMinutes: 1, order: "melange", introSeconds: 4 },
      joinUrl: "http://test",
      clock: new FakeClock(),
      rng: seededRng(8),
      dejaVu: fileDejaVu(dir),
    });
    expect(again.catalog[0]!.fresh).toBe(4);
  });
});
