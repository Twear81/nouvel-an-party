import { describe, expect, it } from "bun:test";
import quiEstLePlus, { type Pub, type Results } from "../../src/minigames/qui-est-le-plus/game";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = quiEstLePlus;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ questions: ["Qui est le plus drôle ?"], ...extra });

function round(nPlayers = 3, cfgExtra: Record<string, unknown> = {}) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers));
  const state = game.start({ text: "Qui est le plus drôle ?" }, ctx);
  const vote = (voter: string, target: unknown) => game.input(state, voter, { target }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, vote, finish };
}

describe("qui-est-le-plus : config", () => {
  it("applique les valeurs par défaut", () => {
    const cfg = parse();
    expect(cfg).toMatchObject({ duree: 30, vote_pour_soi: false, points: { majorite: 100, elu: 50 } });
  });

  it("exige au moins une question", () => {
    expect(game.configSchema.safeParse({ questions: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
  });

  it("une question objet peut surcharger la durée", () => {
    const cfg = parse({ questions: ["a", { texte: "b", duree: 45 }] });
    const items = game.items(cfg);
    expect(items).toEqual([{ text: "a" }, { text: "b", duration: 45 }]);
    expect(game.roundSeconds(cfg, items[0]!)).toBe(30);
    expect(game.roundSeconds(cfg, items[1]!)).toBe(45);
  });
});

describe("qui-est-le-plus : votes", () => {
  it("la majorité gagne : points aux votants d'accord + bonus à l'élu", () => {
    const { vote, finish } = round(3);
    vote("p1", "p3");
    vote("p2", "p3");
    vote("p3", "p1");
    const { results, scores } = finish();
    const r = results as Results;
    expect(r.winners).toEqual(["p3"]);
    expect(r.tally[0]).toEqual({ playerId: "p3", votes: 2, voters: ["p1", "p2"] });
    expect(r.tally[1]).toEqual({ playerId: "p1", votes: 1, voters: ["p3"] });
    // p3 a voté pour un perdant : il ne gagne que le bonus d'élu
    expect(scores).toEqual({ p1: 100, p2: 100, p3: 50 });
  });

  it("égalité : tous les ex æquo sont élus, leurs électeurs gagnent", () => {
    const { vote, finish } = round(4);
    vote("p1", "p2");
    vote("p2", "p1");
    vote("p3", "p4");
    vote("p4", "p3");
    const { results, scores } = finish();
    expect((results as Results).winners.sort()).toEqual(["p1", "p2", "p3", "p4"]);
    // chacun a voté pour un élu (100) et est élu (50)
    expect(scores).toEqual({ p1: 150, p2: 150, p3: 150, p4: 150 });
  });

  it("un élu peut aussi avoir voté pour le gagnant (cumul majorité + élu)", () => {
    const { vote, finish } = round(3, { vote_pour_soi: true });
    vote("p1", "p1");
    vote("p2", "p1");
    expect(finish().scores).toEqual({ p1: 150, p2: 100 });
  });

  it("respecte les points configurés", () => {
    const { vote, finish } = round(3, { points: { majorite: 10, elu: 3 } });
    vote("p1", "p2");
    vote("p3", "p2");
    expect(finish().scores).toEqual({ p1: 10, p3: 10, p2: 3 });
  });

  it("sans aucun vote : pas d'élu, pas de points", () => {
    const { finish } = round(3);
    const { results, scores } = finish();
    expect(results).toEqual({ question: "Qui est le plus drôle ?", tally: [], winners: [] });
    expect(scores).toEqual({});
  });

  it("l'auto-vote est refusé par défaut", () => {
    const { vote, state } = round(3);
    vote("p1", "p1");
    expect(state.votes.size).toBe(0);
  });

  it("l'auto-vote est accepté si vote_pour_soi est actif", () => {
    const { vote, state } = round(3, { vote_pour_soi: true });
    vote("p1", "p1");
    expect(state.votes.get("p1")).toBe("p1");
  });

  it("ignore les payloads invalides", () => {
    const { ctx, state, vote } = round(3);
    for (const payload of [null, undefined, "p2", 42, {}, { target: 2 }, { target: null }, { target: "inconnu" }, { target: ["p2"] }]) {
      game.input(state, "p1", payload, ctx);
    }
    vote("p1", "");
    expect(state.votes.size).toBe(0);
    expect(ctx.ended).toBe(false);
  });

  it("on peut changer son vote", () => {
    const { vote, finish } = round(3);
    vote("p1", "p2");
    vote("p1", "p3");
    const r = finish().results as Results;
    expect(r.tally).toEqual([{ playerId: "p3", votes: 1, voters: ["p1"] }]);
  });

  it("termine la manche quand tout le monde a voté, pas avant", () => {
    const { ctx, vote } = round(3);
    vote("p1", "p2");
    vote("p2", "p1");
    expect(ctx.ended).toBe(false);
    vote("p1", "p3"); // changer d'avis ne compte pas comme un nouveau votant
    expect(ctx.ended).toBe(false);
    vote("p3", "p1");
    expect(ctx.ended).toBe(true);
  });

  it("vues publique (qui a voté, pas pour qui) et privée", () => {
    const { ctx, state, vote } = round(3);
    vote("p1", "p2");
    const pub = game.publicView(state, ctx) as Pub;
    expect(pub).toEqual({ question: "Qui est le plus drôle ?", votedIds: ["p1"], allowSelfVote: false });
    expect(JSON.stringify(pub)).not.toContain("p2");
    expect(game.privateView!(state, "p1", ctx)).toEqual({ votedFor: "p2" });
    expect(game.privateView!(state, "p3", ctx)).toEqual({ votedFor: null });
  });
});

describe("qui-est-le-plus : présence", () => {
  it("un déconnecté ne bloque pas la fin anticipée, son vote reste accepté", () => {
    const { ctx, state, vote } = round(3);
    ctx.setConnected("p3", false);
    vote("p1", "p2");
    expect(ctx.ended).toBe(false);
    vote("p2", "p1");
    expect(ctx.ended).toBe(true);
    vote("p3", "p1");
    expect(state.votes.get("p3")).toBe("p1");
  });

  it("la déconnexion du dernier votant manquant termine la manche", () => {
    const { ctx, state, vote } = round(3);
    vote("p1", "p2");
    vote("p2", "p1");
    ctx.setConnected("p3", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(true);
  });
});

describe("qui-est-le-plus : via le moteur", () => {
  it("tout le monde vote → fin anticipée, points visibles dans les deltas", () => {
    const cfg = parse();
    const t = createTestEngine({ games: [{ game, cfg }], players: 3 });
    t.engine.setSetup({ counts: { "qui-est-le-plus": 1 } });
    startRounds(t.engine);
    t.clock.advance(4000);
    const [a, b, c] = t.ids as [string, string, string];
    t.engine.input(a, { target: c });
    t.engine.input(b, { target: c });
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.input(c, { target: a });
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [a]: 100, [b]: 100, [c]: 50 });
  });
});

describe("qui-est-le-plus : progress", () => {
  it("compte les votants (un vote changé compte une fois), déconnectés compris", () => {
    const { ctx, state, vote } = round(3);
    expect(game.progress!(state, ctx)).toEqual({ done: 0, expected: 3 });
    vote("p1", "p2");
    vote("p1", "p3");
    ctx.setConnected("p3", false);
    expect(game.progress!(state, ctx)).toEqual({ done: 1, expected: 3 });
  });
});
