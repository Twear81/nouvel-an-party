import { describe, expect, it } from "bun:test";
import { centsToDraft, draftToCents, formatCents, formatDraft, pressKey } from "../../src/minigames/le-bon-prix/amount";
import leBonPrix, { type Pub, type Results } from "../../src/minigames/le-bon-prix/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = leBonPrix;
const objet = { nom: "Une baguette", prix: 100, emoji: "🥖" };
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ objets: [objet], ...extra });

function round(nPlayers = 4, cfgExtra: Record<string, unknown> = {}, item = objet) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers));
  const state = game.start(item, ctx);
  const guess = (id: string, cents: unknown) => game.input(state, id, { cents }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, guess, finish };
}

describe("le-bon-prix : config", () => {
  it("applique les valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree: 30, points: { classement: [150, 100, 60, 30], bonus_prix_exact: 100, tolerance_centimes: 0 } });
  });

  it("exige au moins un objet et un prix valide", () => {
    expect(game.configSchema.safeParse({ objets: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
    expect(game.configSchema.safeParse({ objets: [{ nom: "x", prix: -1 }] }).success).toBe(false);
    expect(game.configSchema.safeParse({ objets: [{ nom: "x" }] }).success).toBe(false);
  });

  it("refuse un chemin d'image hors du dossier medias", () => {
    for (const image of ["../secret.png", "/etc/passwd", "C:\\x.png", "https://x/y.png"]) {
      expect(game.configSchema.safeParse({ objets: [{ nom: "x", prix: 1, image }] }).success).toBe(false);
    }
    expect(game.configSchema.safeParse({ objets: [{ nom: "x", prix: 1, image: "objets/montre.jpg" }] }).success).toBe(true);
  });

  it("un objet peut surcharger la durée", () => {
    const cfg = parse({ objets: [objet, { ...objet, duree: 45 }] });
    const items = game.items(cfg);
    expect(game.roundSeconds(cfg, items[0]!)).toBe(30);
    expect(game.roundSeconds(cfg, items[1]!)).toBe(45);
  });
});

describe("le-bon-prix : réponses", () => {
  it("ignore les payloads invalides et les joueurs inconnus", () => {
    const { ctx, state, guess } = round(3);
    for (const payload of [null, undefined, "12", 12, {}, { cents: "1200" }, { cents: 12.5 }, { cents: -1 }, { cents: NaN }, { cents: Infinity }, { cents: 1e12 }, { cents: [1] }]) {
      game.input(state, "p1", payload, ctx);
    }
    guess("inconnu", 100);
    expect(state.guesses.size).toBe(0);
    expect(ctx.ended).toBe(false);
  });

  it("on peut changer son prix ; la manche s'arrête quand tout le monde a validé", () => {
    const { ctx, guess, finish } = round(3);
    guess("p1", 500);
    guess("p1", 120);
    guess("p2", 90);
    expect(ctx.ended).toBe(false);
    guess("p3", 100);
    expect(ctx.ended).toBe(true);
    expect((finish().results as Results).ranking.find((g) => g.playerId === "p1")!.cents).toBe(120);
  });

  it("la vue publique ne révèle ni le prix ni les montants", () => {
    const { ctx, state, guess } = round(3);
    guess("p1", 4242);
    const pub = game.publicView(state, ctx) as Pub;
    expect(pub).toEqual({ nom: "Une baguette", emoji: "🥖", image: null, details: null, answeredIds: ["p1"] });
    expect(JSON.stringify(pub)).not.toContain("4242");
    expect(JSON.stringify(pub)).not.toContain("10000");
    expect(game.privateView!(state, "p1", ctx)).toEqual({ cents: 4242 });
    expect(game.privateView!(state, "p2", ctx)).toEqual({ cents: null });
  });
});

describe("le-bon-prix : présence", () => {
  it("la manche s'arrête quand tous les joueurs connectés ont validé", () => {
    const { ctx, state, guess } = round(3);
    guess("p1", 100);
    ctx.setConnected("p3", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(false);
    guess("p2", 90);
    expect(ctx.ended).toBe(true);
  });

  it("un déconnecté qui a déjà répondu garde sa réponse ; reconnecté, il bloque de nouveau", () => {
    const { ctx, state, guess } = round(3);
    guess("p3", 100);
    ctx.setConnected("p3", false);
    ctx.setConnected("p2", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(false); // p1 (connecté) n'a pas répondu
    ctx.setConnected("p2", true);
    guess("p1", 80);
    expect(ctx.ended).toBe(false); // p2 est revenu et n'a pas répondu
    guess("p2", 90);
    expect(ctx.ended).toBe(true);
  });
});

describe("le-bon-prix : points", () => {
  it("classe par écart absolu (au-dessus ou en dessous), points par rang", () => {
    const { guess, finish } = round(4); // prix = 100 €
    guess("p1", 11_500); // +15 €
    guess("p2", 9_200); // -8 €
    guess("p3", 10_300); // +3 €
    guess("p4", 5_000); // -50 €
    const { results, scores } = finish();
    const r = results as Results;
    expect(r.priceCents).toBe(10_000);
    expect(r.ranking.map((g) => [g.playerId, g.rank, g.diff])).toEqual([
      ["p3", 1, 300],
      ["p2", 2, -800],
      ["p1", 3, 1500],
      ["p4", 4, -5000],
    ]);
    expect(scores).toEqual({ p3: 150, p2: 100, p1: 60, p4: 30 });
  });

  it("égalité d'écart : même rang, mêmes points, le suivant saute un rang", () => {
    const { guess, finish } = round(4);
    guess("p1", 10_500);
    guess("p2", 9_500); // même écart que p1, de l'autre côté
    guess("p3", 10_100);
    guess("p4", 8_000);
    const { results, scores } = finish();
    expect((results as Results).ranking.map((g) => g.rank)).toEqual([1, 2, 2, 4]);
    expect(scores).toEqual({ p3: 150, p1: 100, p2: 100, p4: 30 });
  });

  it("bonus prix exact (en plus des points du rang)", () => {
    const { guess, finish } = round(3);
    guess("p1", 10_000);
    guess("p2", 10_001);
    const { results, scores } = finish();
    expect(scores).toEqual({ p1: 250, p2: 100 });
    expect((results as Results).ranking[0]!.exact).toBe(true);
    expect((results as Results).ranking[1]!.exact).toBe(false);
  });

  it("tolérance configurable en centimes", () => {
    const { guess, finish } = round(2, { points: { tolerance_centimes: 50 } });
    guess("p1", 10_050);
    guess("p2", 10_051);
    expect(finish().scores).toEqual({ p1: 250, p2: 100 });
  });

  it("au-delà de la liste de points : 0 ; sans réponse : 0 et listé dans missingIds", () => {
    const { guess, finish } = round(4, { points: { classement: [10] } });
    guess("p1", 10_000);
    guess("p2", 9_000);
    guess("p3", 1);
    const { results, scores } = finish();
    expect(scores).toEqual({ p1: 110, p2: 0, p3: 0 });
    expect((results as Results).missingIds).toEqual(["p4"]);
  });

  it("les centimes du yaml sont arrondis sans erreur flottante", () => {
    const { guess, finish } = round(1, {}, { nom: "x", prix: 36.1 } as typeof objet);
    guess("p1", 3610);
    const { results, scores } = finish();
    expect((results as Results).priceCents).toBe(3610);
    expect(scores.p1).toBe(250);
  });

  it("personne n'a répondu : aucun point", () => {
    const { finish } = round(3);
    const { results, scores } = finish();
    expect(scores).toEqual({});
    expect((results as Results).ranking).toEqual([]);
    expect((results as Results).missingIds).toEqual(["p1", "p2", "p3"]);
  });
});

describe("le-bon-prix : pavé numérique (amount.ts)", () => {
  const type = (keys: string) => [...keys].reduce((d, k) => pressKey(d, k === "<" ? "back" : k), "");

  it("saisit des chiffres, une seule virgule, 2 décimales max", () => {
    expect(type("1250")).toBe("1250");
    expect(type("12,5")).toBe("12,5");
    expect(type("12,50,")).toBe("12,50");
    expect(type("12,505")).toBe("12,50");
    expect(type(",5")).toBe("0,5");
  });

  it("pas de zéro en tête, 6 chiffres entiers max, effacement", () => {
    expect(type("007")).toBe("7");
    expect(type("1234567")).toBe("123456");
    expect(type("12,5<<")).toBe("12");
    expect(type("<<")).toBe("");
  });

  it("convertit en centimes et inversement", () => {
    expect(draftToCents("")).toBeNull();
    expect(draftToCents("12")).toBe(1200);
    expect(draftToCents("12,5")).toBe(1250);
    expect(draftToCents("12,")).toBe(1200);
    expect(draftToCents("0,07")).toBe(7);
    expect(centsToDraft(1250)).toBe("12,5");
    expect(centsToDraft(1200)).toBe("12");
    expect(centsToDraft(7)).toBe("0,07");
  });

  it("formate en euros", () => {
    expect(formatCents(1250)).toBe("12,50\u00a0€");
    expect(formatCents(1200)).toBe("12\u00a0€");
    expect(formatCents(123456)).toBe("1\u00a0234,56\u00a0€");
    expect(formatDraft("1234,5")).toBe("1\u00a0234,5");
    expect(formatDraft("12,")).toBe("12,");
  });
});

describe("le-bon-prix : via le moteur", () => {
  it("tout le monde valide → fin anticipée, points visibles dans les deltas", () => {
    const cfg = parse();
    const t = createTestEngine({ games: [{ game, cfg }], players: 3 });
    t.engine.setSetup({ counts: { "le-bon-prix": 1 } });
    t.engine.start();
    t.clock.advance(4000);
    const [a, b, c] = t.ids as [string, string, string];
    t.engine.input(a, { cents: 9_000 });
    t.engine.input(b, { cents: 10_000 });
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.input(c, { cents: 12_000 });
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [b]: 250, [a]: 100, [c]: 60 });
  });
});
