import { describe, expect, it } from "bun:test";
import tierList, { type Pub, type Results } from "../../src/minigames/tier-list/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = tierList;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ questions: ["Qui est le meilleur cuisinier ?"], ...extra });

function round(nPlayers = 3, cfgExtra: Record<string, unknown> = {}) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers));
  const state = game.start({ text: "Qui est le meilleur cuisinier ?" }, ctx);
  const rate = (voter: string, target: unknown, tier: unknown) => game.input(state, voter, { target, tier }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, rate, finish };
}

describe("tier-list : config", () => {
  it("applique les valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree: 60, noter_soi_meme: true, tiers: ["S", "A", "B", "C"], points: { consensus: 25 } });
  });

  it("exige au moins une question", () => {
    expect(game.configSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("refuse moins de 2 ou plus de 6 étages, et les doublons", () => {
    expect(game.configSchema.safeParse({ questions: ["a"], tiers: ["S"] }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], tiers: ["1", "2", "3", "4", "5", "6", "7"] }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], tiers: ["S", "S"] }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], tiers: ["Top", "Nul"] }).success).toBe(true);
  });

  it("une question objet peut surcharger la durée", () => {
    const cfg = parse({ questions: ["a", { texte: "b", duree: 90 }] });
    const items = game.items(cfg);
    expect(game.roundSeconds(cfg, items[0]!)).toBe(60);
    expect(game.roundSeconds(cfg, items[1]!)).toBe(90);
  });
});

describe("tier-list : notes", () => {
  it("ignore les payloads invalides", () => {
    const { ctx, state, rate } = round(3);
    for (const p of [null, undefined, "p2", 3, {}, { target: "p2" }, { tier: 1 }]) game.input(state, "p1", p, ctx);
    rate("p1", "inconnu", 0);
    rate("p1", 2, 0);
    rate("p1", "p2", -1);
    rate("p1", "p2", 4); // 4 étages : 0..3
    rate("p1", "p2", 1.5);
    rate("p1", "p2", "0");
    rate("p1", "p2", null);
    rate("inconnu", "p2", 0);
    expect(state.ratings.size).toBe(0);
    expect(ctx.ended).toBe(false);
  });

  it("on peut changer une note", () => {
    const { state, rate } = round(3);
    rate("p1", "p2", 3);
    rate("p1", "p2", 0);
    expect(state.ratings.get("p1")!.get("p2")).toBe(0);
    expect(state.ratings.get("p1")!.size).toBe(1);
  });

  it("noter_soi_meme: false interdit de se noter", () => {
    const { state, rate, ctx } = round(3, { noter_soi_meme: false });
    rate("p1", "p1", 0);
    expect(state.ratings.size).toBe(0);
    rate("p1", "p2", 0);
    rate("p1", "p3", 0);
    expect((game.publicView(state, ctx) as Pub).progress.p1).toEqual({ done: 2, total: 2 });
  });

  it("la manche se termine quand tout le monde a noté tout le monde, pas avant", () => {
    const { ctx, rate } = round(3);
    for (const v of ["p1", "p2", "p3"]) for (const t of ["p1", "p2", "p3"]) rate(v, t, 0);
    expect(ctx.ended).toBe(true);

    const r = round(3);
    for (const v of ["p1", "p2"]) for (const t of ["p1", "p2", "p3"]) r.rate(v, t, 0);
    r.rate("p3", "p1", 0);
    r.rate("p3", "p2", 0);
    expect(r.ctx.ended).toBe(false);
    r.rate("p3", "p3", 2);
    expect(r.ctx.ended).toBe(true);
  });

  it("présence : seuls les votants connectés doivent avoir fini de noter", () => {
    const { ctx, state, rate } = round(3);
    ctx.setConnected("p3", false);
    for (const v of ["p1", "p2"]) for (const t of ["p1", "p2", "p3"]) rate(v, t, 0);
    expect(ctx.ended).toBe(true);

    const r = round(3);
    for (const v of ["p1", "p2"]) for (const t of ["p1", "p2", "p3"]) r.rate(v, t, 0);
    expect(r.ctx.ended).toBe(false);
    r.ctx.setConnected("p3", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.ended).toBe(true);
    r.rate("p3", "p1", 1); // un absent peut encore noter
    expect(r.state.ratings.get("p3")!.get("p1")).toBe(1);
  });

  it("vues : avancement public sans les notes, notes privées", () => {
    const { ctx, state, rate } = round(3);
    rate("p1", "p2", 1);
    const pub = game.publicView(state, ctx) as Pub;
    expect(pub.progress).toEqual({ p1: { done: 1, total: 3 }, p2: { done: 0, total: 3 }, p3: { done: 0, total: 3 } });
    expect(pub.tiers).toEqual(["S", "A", "B", "C"]);
    expect(JSON.stringify(pub)).not.toContain("tier\":1");
    expect(game.privateView!(state, "p1", ctx)).toEqual({ mine: { p2: 1 } });
    expect(game.privateView!(state, "p3", ctx)).toEqual({ mine: {} });
  });
});

describe("tier-list : consensus et points", () => {
  it("la moyenne arrondie donne l'étage ; les votants d'accord marquent", () => {
    const { rate, finish } = round(3);
    // p3 reçoit S (0), S (0), C (3) → valeurs 3,3,0 → moyenne 2 → étage index 1 (A)
    rate("p1", "p3", 0);
    rate("p2", "p3", 0);
    rate("p3", "p3", 3);
    // p1 reçoit uniquement B (2) de p2
    rate("p2", "p1", 2);
    const { results, scores } = finish();
    const r = results as Results;
    expect(r.placements).toEqual([
      { playerId: "p3", tier: 1, percent: 67, votes: 3 },
      { playerId: "p1", tier: 2, percent: 33, votes: 1 },
    ]);
    expect(r.unrated).toEqual(["p2"]);
    // p1 et p2 avaient mis p3 en S : pas A. Seul p2 avait mis p1 en B : +25. p3 n'a rien d'aligné.
    expect(scores).toEqual({ p2: 25 });
    expect(r.hits.p2).toEqual({ good: ["p1"], rated: 2 });
    expect(r.ratings.p1).toEqual({ p3: 0 });
  });

  it("une moyenne pile entre deux étages va à l'étage du dessus", () => {
    const { rate, finish } = round(2);
    rate("p1", "p2", 0); // valeur 3
    rate("p2", "p2", 1); // valeur 2 → moyenne 2,5 → arrondi 3 → étage 0 (S)
    const r = finish().results as Results;
    expect(r.placements[0]).toMatchObject({ playerId: "p2", tier: 0 });
  });

  it("chaque votant gagne points.consensus par invité bien placé (notes partielles comptées)", () => {
    const { rate, finish } = round(3, { points: { consensus: 10 } });
    for (const t of ["p1", "p2", "p3"]) rate("p1", t, 0);
    rate("p2", "p1", 0); // p2 n'a noté que p1 (partiel)
    const { scores } = finish();
    // consensus : tout le monde en S (p2 ne note que p1, et ses autres cibles sont notées par p1 en S)
    expect(scores).toEqual({ p1: 30, p2: 10 });
  });

  it("sans aucune note : personne n'est classé, pas de points", () => {
    const { finish } = round(3);
    const { results, scores } = finish();
    expect((results as Results).placements).toEqual([]);
    expect((results as Results).unrated).toEqual(["p1", "p2", "p3"]);
    expect(scores).toEqual({});
  });

  it("fonctionne avec 2 étages et des étages personnalisés", () => {
    const { rate, finish, ctx } = round(2, { tiers: ["Top", "Nul"] });
    rate("p1", "p2", 1);
    rate("p1", "p2", 2); // invalide : seulement 0..1
    const r = finish().results as Results;
    expect(r.tiers).toEqual(["Top", "Nul"]);
    expect(r.placements).toEqual([{ playerId: "p2", tier: 1, percent: 0, votes: 1 }]);
    expect(ctx.ended).toBe(false);
  });
});

describe("tier-list : via le moteur", () => {
  it("tout le monde note tout le monde → fin anticipée, points dans les deltas", () => {
    const cfg = parse();
    const t = createTestEngine({ games: [{ game, cfg }], players: 3 });
    t.engine.setSetup({ counts: { "tier-list": 1 } });
    t.engine.start();
    t.clock.advance(4000);
    const [a, b, c] = t.ids as [string, string, string];
    for (const voter of [a, b, c]) for (const target of [a, b, c]) {
      expect(t.engine.snapshot(null).phase).toBe("playing");
      t.engine.input(voter, { target, tier: 0 });
    }
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [a]: 75, [b]: 75, [c]: 75 });
  });
});
