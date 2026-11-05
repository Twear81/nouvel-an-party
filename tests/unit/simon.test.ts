import { describe, expect, it } from "bun:test";
import simon, { noteDuration, playSeconds, type Priv, type Pub, type Results } from "../../src/minigames/simon/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = simon;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ ...extra });

/** rng qui rejoue une liste de valeurs (0.1 → pastille 0, 0.3 → 1, 0.6 → 2, 0.9 → 3). */
const rngOf = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

function setup(nPlayers = 3, cfgExtra: Record<string, unknown> = {}, rng = () => 0.1) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), rng);
  const item = game.items(cfg)[0]!;
  const state = game.start(item, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  const tap = (id: string, pad: unknown) => game.input(state, id, { pad }, ctx);
  const seq = () => state.seq;
  /** Attend la fin de l'animation TV : on passe en "play". */
  const toPlay = () => {
    if (pub().stage === "wait") game.onPlay!(state, ctx);
    for (let guard = 0; pub().stage !== "play" && guard < 100; guard++) ctx.advance(100);
    expect(pub().stage).toBe("play");
  };
  const playAll = (id: string) => {
    for (const p of seq()) tap(id, p);
  };
  const wrong = (id: string) => tap(id, (seq()[priv(id).progress]! + 1) % 4);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, pub, priv, tap, seq, toPlay, playAll, wrong, finish };
}

describe("simon : config", () => {
  it("applique les valeurs par défaut", () => {
    const cfg = parse();
    expect(cfg).toMatchObject({ vitesse_ms: 650, longueur_depart: 3, longueur_max: 20, temps_par_note: 1.2, points: { par_etape: 20, vainqueur: 150 } });
    expect(game.items(cfg)).toEqual([{ name: "Classique", speed: 650, start: 3, max: 20, timePerNote: 1.2 }]);
    expect(game.roundSeconds(cfg, game.items(cfg)[0]!)).toBeNull();
    expect(game.estimateSeconds(cfg)).toBeGreaterThan(30);
  });

  it("une variante surcharge les réglages", () => {
    const cfg = parse({ variantes: ["A", { nom: "Rapide", vitesse_ms: 400 }, { nom: "Longue", longueur_depart: 5, longueur_max: 4 }] });
    const [a, b, c] = game.items(cfg);
    expect(a).toMatchObject({ name: "A", speed: 650, start: 3 });
    expect(b).toMatchObject({ name: "Rapide", speed: 400, start: 3 });
    expect(c).toMatchObject({ name: "Longue", start: 5, max: 5 }); // max jamais sous le départ
  });

  it("refuse les réglages invalides", () => {
    expect(game.configSchema.safeParse({ variantes: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ longueur_depart: 0 }).success).toBe(false);
    expect(game.configSchema.safeParse({ vitesse_ms: 10 }).success).toBe(false);
    expect(game.configSchema.safeParse({ variantes: Array(26).fill("x") }).success).toBe(false);
  });

  it("la suite accélère avec la longueur, sans descendre sous la moitié", () => {
    const item = { speed: 600, start: 3 };
    expect(noteDuration(item, 3)).toBe(600);
    expect(noteDuration(item, 7)).toBeLessThan(600);
    expect(noteDuration(item, 100)).toBe(300);
    expect(playSeconds({ timePerNote: 1.2 }, 5)).toBe(9);
  });
});

describe("simon : déroulé", () => {
  it("montre la suite (sans chrono) puis laisse jouer avec un chrono proportionnel", () => {
    const t = setup(2);
    expect(t.pub().stage).toBe("wait");
    expect(t.seq()).toHaveLength(3);
    game.onPlay!(t.state, t.ctx);
    const p = t.pub();
    expect(p.stage).toBe("show");
    // Les téléphones ne reçoivent pas la suite : seule la TV l'a.
    expect(p.show!.sequence).toEqual([]);
    expect((game.tvView!(t.state, t.ctx) as typeof p).show!.sequence).toEqual(t.seq());
    expect(p.show!.startAt).toBeGreaterThan(t.ctx.now());
    expect(t.ctx.countdownState).toBeNull();
    expect(t.priv("p1").status).toBe("watch");
    // Pendant l'animation, les touches sont ignorées.
    t.tap("p1", 1);
    expect(t.priv("p1").status).toBe("watch");
    t.toPlay();
    expect(t.pub().show).toBeNull(); // la suite n'est plus envoyée une fois le jeu lancé
    expect(t.ctx.countdownState!.seconds).toBe(playSeconds({ timePerNote: 1.2 }, 3));
    expect(t.priv("p1").status).toBe("play");
  });

  it("valide les touches au fil de l'eau ; finir = attendre les autres", () => {
    const t = setup(2);
    t.toPlay();
    t.tap("p1", t.seq()[0]);
    expect(t.priv("p1").progress).toBe(1);
    expect(t.pub().progress).toEqual({ p1: 1, p2: 0 });
    t.tap("p1", t.seq()[1]);
    t.tap("p1", t.seq()[2]);
    expect(t.priv("p1").status).toBe("done");
    expect(t.pub().doneIds).toEqual(["p1"]);
    expect(t.pub().stage).toBe("play");
    // Toucher encore après avoir fini ne change rien.
    t.tap("p1", 3);
    expect(t.priv("p1").status).toBe("done");
    t.playAll("p2");
    expect(t.pub().stage).toBe("between");
    t.ctx.advance(3000);
    expect(t.pub().stage).toBe("show");
    expect(t.seq()).toHaveLength(4);
    expect(t.pub().doneIds).toEqual([]);
  });

  it("ignore les payloads invalides et les joueurs inconnus", () => {
    const t = setup(2);
    t.toPlay();
    for (const bad of [null, undefined, "0", 4, -1, 1.5, NaN, { pad: 0 }]) t.tap("p1", bad);
    game.input(t.state, "p1", null, t.ctx);
    game.input(t.state, "p1", "n'importe quoi", t.ctx);
    t.tap("intrus", t.seq()[0]);
    expect(t.priv("p1")).toMatchObject({ status: "play", progress: 0 });
    expect(t.pub().out).toEqual([]);
    expect(t.pub().progress.intrus).toBeUndefined();
  });

  it("une faute élimine tout de suite ; le dernier debout gagne", () => {
    const t = setup(3);
    t.toPlay();
    t.wrong("p2");
    expect(t.priv("p2")).toMatchObject({ status: "out", reason: "wrong" });
    expect(t.pub().out).toEqual([{ id: "p2", length: 3 }]);
    t.playAll("p1");
    t.playAll("p3");
    t.ctx.advance(3000);
    t.toPlay();
    // Les éliminés ne jouent plus.
    t.tap("p2", t.seq()[0]);
    expect(t.priv("p2").progress).toBe(0);
    t.playAll("p1");
    t.tap("p3", t.seq()[0]);
    t.wrong("p3");
    expect(t.pub().stage).toBe("over");
    expect(t.pub().winners).toEqual(["p1"]);
    expect(t.priv("p1").status).toBe("win");
    t.ctx.advance(6000);
    expect(t.ctx.ended).toBe(true);

    const { results, scores } = t.finish();
    const r = results as Results;
    expect(r.rows.map((x) => x.playerId)).toEqual(["p1", "p3", "p2"]);
    expect(r.rows[0]).toMatchObject({ steps: 2, mastered: 4, winner: true, outAt: null });
    expect(r.rows[1]).toMatchObject({ steps: 1, mastered: 3, outAt: 4 });
    expect(r.rows[2]).toMatchObject({ steps: 0, mastered: 0, outAt: 3 });
    expect(scores).toEqual({ p1: 2 * 20 + 150, p3: 20 });
  });

  it("temps écoulé : ceux qui n'ont pas fini sont éliminés", () => {
    const t = setup(3);
    t.toPlay();
    t.playAll("p1");
    t.tap("p2", t.seq()[0]);
    t.ctx.finishCountdown();
    expect(t.priv("p2")).toMatchObject({ status: "out", reason: "time" });
    expect(t.priv("p3").status).toBe("out");
    expect(t.pub().winners).toEqual(["p1"]);
    expect(t.finish().scores).toEqual({ p1: 170 });
  });

  it("si tous les survivants tombent à la même étape, ils gagnent ensemble", () => {
    const t = setup(4);
    t.toPlay();
    t.wrong("p4"); // tombé avant, à l'étape 1
    for (const id of ["p1", "p2", "p3"]) t.playAll(id);
    t.ctx.advance(3000);
    t.toPlay();
    t.wrong("p1");
    t.tap("p2", t.seq()[0]);
    t.ctx.finishCountdown(); // p2 et p3 trop lents
    expect(t.pub().stage).toBe("over");
    expect(t.pub().winners.sort()).toEqual(["p1", "p2", "p3"]);
    const { results, scores } = t.finish();
    expect((results as Results).rows.filter((r) => r.winner).map((r) => r.playerId).sort()).toEqual(["p1", "p2", "p3"]);
    expect(scores).toEqual({ p1: 170, p2: 170, p3: 170 });
  });

  it("longueur max atteinte : tous les survivants gagnent", () => {
    const t = setup(2, { longueur_depart: 2, longueur_max: 3 });
    t.toPlay();
    t.playAll("p1");
    t.playAll("p2");
    t.ctx.advance(3000);
    t.toPlay();
    expect(t.seq()).toHaveLength(3);
    t.playAll("p1");
    t.playAll("p2");
    expect(t.pub().stage).toBe("over");
    expect(t.pub().winners).toEqual(["p1", "p2"]);
    expect(t.finish().scores).toEqual({ p1: 190, p2: 190 });
  });

  it("joueur seul : continue jusqu'à sa faute", () => {
    const t = setup(1, {}, rngOf([0.1, 0.3, 0.6, 0.9]));
    t.toPlay();
    expect(t.seq()).toEqual([0, 1, 2]);
    t.playAll("p1");
    expect(t.pub().stage).toBe("between");
    t.ctx.advance(3000);
    expect(t.seq()).toEqual([0, 1, 2, 3]);
    t.toPlay();
    t.wrong("p1");
    expect(t.pub().winners).toEqual(["p1"]);
    expect(t.finish().scores).toEqual({ p1: 170 });
  });

  it("manche passée par le maître du jeu : ceux encore debout l'emportent", () => {
    const t = setup(3);
    t.toPlay();
    t.wrong("p3");
    const { scores } = t.finish();
    expect(scores).toEqual({ p1: 150, p2: 150 });
  });
});

describe("simon : avec le moteur", () => {
  it("une partie complète jusqu'aux résultats", () => {
    const cfg = parse({ longueur_depart: 2 });
    const t = createTestEngine({ games: [{ game, cfg }], players: 2, settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { simon: 1 } });
    t.engine.start();
    t.clock.advance(1000);
    const [a, b] = t.ids as [string, string];
    const pub = () => t.engine.snapshot(null).round!.public as Pub;
    expect(pub().stage).toBe("show");
    const sequence = pub().show!.sequence;
    expect(t.engine.snapshot(null).round!.deadline).toBeNull();
    for (let i = 0; i < 50 && pub().stage !== "play"; i++) t.clock.advance(100);
    expect(pub().stage).toBe("play");
    expect(t.engine.snapshot(null).round!.deadline).not.toBeNull();
    for (const p of sequence) t.engine.input(a, { pad: p });
    t.engine.input(b, { pad: (sequence[0]! + 1) % 4 });
    expect((t.engine.snapshot(b).me!.private as Priv).status).toBe("out");
    expect(pub().stage).toBe("over");
    t.clock.advance(6000);
    const snap = t.engine.snapshot(null);
    expect(snap.phase).toBe("results");
    expect(snap.round!.deltas).toEqual({ [a]: 170 });
    expect((snap.round!.results as Results).rows[0]!.playerId).toBe(a);
  });
});
