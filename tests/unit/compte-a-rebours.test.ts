import { describe, expect, it } from "bun:test";
import { counterFrame } from "../../src/minigames/compte-a-rebours/chaos";
import compte, { type Pub, type Results } from "../../src/minigames/compte-a-rebours/game";
import { fmtSeconds, fmtSigned, rankByError } from "../../src/minigames/compte-a-rebours/rank";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = compte;
const VARIANT = { titre: "Pile à minuit", cible: 10, visible: 3, decompte: false };
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ variantes: [VARIANT], ...extra });

/** Une manche à `n` joueurs ; rng fixe donc ordre de passage déterministe (lu dans la vue publique). */
function round(n = 3, extra: Record<string, unknown> = {}, players = makePlayers(n)) {
  const cfg = parse(extra);
  const ctx = makeCtx(cfg, players);
  const state = game.start(game.items(cfg)[0]!, ctx);
  game.onPlay!(state, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const order = pub().turns.map((t) => t.id);
  const start = (id = pub().currentId!) => game.input(state, id, { action: "start" }, ctx);
  const stop = (ms: unknown, id = pub().currentId!) => game.input(state, id, { action: "stop", ms }, ctx);
  /** Joue un tour complet : START, `ms` plus tard STOP. */
  const play = (ms: number) => {
    start();
    ctx.advance(ms);
    stop(ms);
    ctx.advance(cfg.duree_revelation * 1000);
  };
  return { cfg, ctx, state, pub, order, start, stop, play, finish: () => game.finish(state, ctx) };
}

describe("compte-a-rebours : config", () => {
  it("applique les valeurs par défaut", () => {
    const cfg = parse();
    expect(cfg).toMatchObject({ delai_depart: 10, points: [150, 100, 70, 50, 30, 20, 10, 0] });
    expect(cfg.variantes[0]).toMatchObject({ visible: 3, decompte: false });
    expect(game.roundSeconds(cfg, cfg.variantes[0]!)).toBeNull();
  });
  it("exige au moins une variante et une cible d'au moins 1 s", () => {
    expect(game.configSchema.safeParse({ variantes: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ variantes: [{ titre: "x", cible: 0.5 }] }).success).toBe(false);
  });
});

describe("compte-a-rebours : déroulé d'un tour", () => {
  it("un seul joueur à la fois, START puis STOP", () => {
    const r = round(3);
    expect(r.pub().phase).toBe("waiting");
    const cur = r.pub().currentId!;
    const other = r.order.find((id) => id !== cur)!;
    r.start(other); // pas son tour : ignoré
    expect(r.pub().phase).toBe("waiting");
    r.stop(5000, cur); // STOP avant START : ignoré
    expect(r.pub().phase).toBe("waiting");
    r.start();
    expect(r.pub()).toMatchObject({ phase: "running", startedAt: 0 });
    expect(r.ctx.countdownState).toBeNull(); // pas de chrono visible qui trahirait le temps
    r.ctx.advance(10_230);
    r.stop(10_230);
    const turn = r.pub().turns.find((t) => t.id === cur)!;
    expect(turn).toMatchObject({ status: "done", elapsedMs: 10_230, signedMs: 230 });
    expect(r.pub().phase).toBe("reveal");
    expect(r.pub().currentId).toBe(cur); // la TV montre encore son résultat
    r.ctx.advance(r.cfg.duree_revelation * 1000);
    expect(r.pub().currentId).toBe(r.order[1]!);
    expect(r.pub().phase).toBe("waiting");
  });

  it("le temps mesuré par le téléphone fait foi, sauf valeur absurde", () => {
    const r = round(2);
    r.start();
    r.ctx.advance(10_100);
    r.stop(10_000); // le téléphone avait démarré 100 ms avant le serveur : on le croit
    expect(r.pub().turns.find((t) => t.status === "done")!.elapsedMs).toBe(10_000);

    const r2 = round(2);
    r2.start();
    r2.ctx.advance(10_100);
    r2.stop(1); // triche : trop loin du temps serveur → temps serveur
    expect(r2.pub().turns.find((t) => t.status === "done")!.elapsedMs).toBe(10_100);
  });

  it("ignore les payloads invalides", () => {
    const r = round(2);
    r.start();
    r.ctx.advance(5000);
    for (const bad of [null, "stop", 42, { action: "stop", ms: "5" }, { action: "x" }]) game.input(r.state, r.pub().currentId!, bad, r.ctx);
    expect(r.pub().phase === "running" || r.pub().phase === "reveal").toBe(true);
    // ms non numérique : le STOP est accepté avec le temps serveur
    expect(r.pub().turns.find((t) => t.status === "done")?.elapsedMs ?? 5000).toBe(5000);
  });

  it("pas de START dans le délai : tour sauté sans point", () => {
    const r = round(3);
    const first = r.pub().currentId!;
    r.ctx.advance(10_000);
    expect(r.pub().turns.find((t) => t.id === first)).toMatchObject({ status: "missed", reason: "no-start" });
    r.ctx.advance(r.cfg.duree_revelation * 1000);
    expect(r.pub().currentId).toBe(r.order[1]!);
  });

  it("pas de STOP avant cible × 3 : tour raté", () => {
    const r = round(2);
    r.start();
    r.ctx.advance(29_999);
    expect(r.pub().phase).toBe("running");
    r.ctx.advance(1);
    expect(r.pub().turns[0]).toMatchObject({ status: "missed", reason: "no-stop" });
  });

  it("un joueur déconnecté est sauté, et la manche s'arrête si plus personne ne joue", () => {
    const players = makePlayers(3);
    players[0]!.connected = false;
    const r = round(3, {}, players);
    expect(r.pub().turns.find((t) => t.id === "p1")).toMatchObject({ status: "missed", reason: "absent" });
    expect(r.pub().currentId).not.toBe("p1");

    const all = makePlayers(2).map((p) => ({ ...p, connected: false }));
    const r2 = round(2, {}, all);
    expect(r2.ctx.ended).toBe(true);
  });

  it("la manche se termine après le dernier tour", () => {
    const r = round(2);
    r.play(10_000);
    expect(r.ctx.ended).toBe(false);
    r.play(9_000);
    expect(r.ctx.ended).toBe(true);
  });
});

describe("compte-a-rebours : classement et points", () => {
  it("points par place, écart absolu (trop tôt ou trop tard)", () => {
    const r = round(3);
    const [a, b, c] = r.order as [string, string, string];
    r.play(10_300); // a : +0,30
    r.play(9_900); //  b : −0,10 → meilleur
    r.play(10_050); // c : +0,05 → meilleur encore
    const { results, scores } = r.finish();
    expect((results as Results).ranking.map((x) => x.playerId)).toEqual([c, b, a]);
    expect(scores).toEqual({ [c]: 150, [b]: 100, [a]: 70 });
  });

  it("égalité : même place, et la suivante saute", () => {
    const r = round(3);
    const [a, b, c] = r.order as [string, string, string];
    r.play(10_100);
    r.play(9_900); // même écart au centième : égalité
    r.play(10_500);
    const { scores, results } = r.finish();
    expect(scores).toEqual({ [a]: 150, [b]: 150, [c]: 70 });
    expect((results as Results).ranking.map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it("place absente de la liste = 0, tour raté = pas de ligne de score", () => {
    const r = round(3, { points: [100] });
    const [a, b, c] = r.order as [string, string, string];
    r.play(10_000);
    r.play(10_400);
    r.ctx.advance(10_000); // c ne démarre pas
    const { scores, results } = r.finish();
    expect(scores).toEqual({ [a]: 100, [b]: 0 });
    expect(scores[c]).toBeUndefined();
    expect((results as Results).missed).toEqual([{ playerId: c, reason: "no-start" }]);
  });

  it("rankByError et formats", () => {
    expect(rankByError([3, -1, 1], (x) => x * 10).map((r) => [r.item, r.rank])).toEqual([[-1, 1], [1, 1], [3, 3]]);
    expect(fmtSeconds(7340)).toBe("7,34");
    expect(fmtSigned(-80)).toBe("−0,08");
    expect(fmtSigned(230)).toBe("+0,23");
  });
});

describe("compte-a-rebours : compteur chaotique", () => {
  const v = { cible: 10, visible: 3, decompte: false };
  it("montre la vraie valeur pendant la phase visible, en montée ou en décompte", () => {
    expect(counterFrame(2340, v)).toMatchObject({ kind: "clear", text: "02,34" });
    expect(counterFrame(2340, { ...v, decompte: true })).toMatchObject({ kind: "clear", text: "07,66" });
  });
  it("devient chaotique ensuite, sans jamais afficher la vraie valeur, et de façon reproductible", () => {
    let leaked = 0;
    for (let t = 3500; t < 12_000; t += 37) {
      const f = counterFrame(t, v);
      expect(f.kind).not.toBe("clear");
      expect(counterFrame(t, v)).toEqual(f);
      if (f.kind !== "glitch" && f.text === (t / 1000).toFixed(2).replace(".", ",").padStart(5, "0")) leaked++;
    }
    expect(leaked).toBeLessThan(3); // une coïncidence au centième près est possible, pas un affichage systématique
  });
});

describe("compte-a-rebours : à travers le moteur", () => {
  it("deux joueurs jouent chacun leur tour, les points arrivent dans les deltas", () => {
    const cfg = parse({ delai_depart: 5, duree_revelation: 1 });
    const t = createTestEngine({ games: [{ game, cfg }], players: 2 });
    t.engine.setSetup({ counts: { "compte-a-rebours": 1 } });
    t.engine.start();
    t.clock.advance(4000); // intro
    const pub = () => t.engine.snapshot(null).round!.public as Pub;
    expect(pub().phase).toBe("waiting");
    expect(t.engine.snapshot(null).round!.timerTotalMs).toBe(5000);

    const first = pub().currentId!;
    t.engine.input(first, { action: "start" });
    expect(t.engine.snapshot(null).round!.timerTotalMs).toBeNull();
    t.clock.advance(10_200);
    t.engine.input(first, { action: "stop", ms: 10_200 });
    expect(pub().phase).toBe("reveal");
    t.clock.advance(1000);
    const second = pub().currentId!;
    expect(second).not.toBe(first);
    t.engine.input(second, { action: "start" });
    t.clock.advance(10_050);
    t.engine.input(second, { action: "stop", ms: 10_050 });
    t.clock.advance(1000);

    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [second]: 150, [first]: 100 });
  });
});
