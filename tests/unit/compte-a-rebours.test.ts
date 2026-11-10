import { describe, expect, it } from "bun:test";
import { chaosAt, shownMs } from "../../src/minigames/compte-a-rebours/chaos";
import compte, { DESIGN_IDS, GO_LEAD_MS, type Pub, type Results } from "../../src/minigames/compte-a-rebours/game";
import { fmtCible, fmtSeconds, fmtSigned, rankByError } from "../../src/minigames/compte-a-rebours/rank";
import { revealSeconds } from "../../src/minigames/compte-a-rebours/Results";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = compte;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ cible_min: 10, cible_max: 10, ...extra });

/** Une manche à `n` joueurs, jusqu'au GO (cible 10 s par défaut). */
function round(n = 3, extra: Record<string, unknown> = {}, rng: () => number = () => 0.5, offline: string[] = []) {
  const cfg = parse(extra);
  const ctx = makeCtx(cfg, makePlayers(n), rng);
  for (const id of offline) ctx.setConnected(id, false);
  const state = game.start(game.items(cfg)[0]!, ctx);
  game.onPlay!(state, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  /** Annonce puis « 3 2 1 » : le GO part. */
  const goNow = () => {
    ctx.advance(cfg.annonce * 1000);
    ctx.advance(GO_LEAD_MS);
  };
  const stop = (id: string, ms: unknown) => game.input(state, id, { ms }, ctx);
  return { cfg, ctx, state, pub, goNow, stop, finish: () => game.finish(state, ctx) };
}

describe("compte-a-rebours : config et tirage", () => {
  it("valeurs par défaut : cible 6–12, 5 designs", () => {
    const cfg = game.configSchema.parse({});
    expect(cfg).toMatchObject({ cible_min: 6, cible_max: 12, visible_min: 2, visible_max: 3, marge_max: 4 });
    expect(cfg.designs).toEqual([...DESIGN_IDS]);
    expect(game.items(cfg)).toHaveLength(5);
    expect(game.roundSeconds(cfg, game.items(cfg)[0]!)).toBeNull();
  });
  it("refuse des bornes incohérentes et une liste de designs vide ou inconnue", () => {
    expect(game.configSchema.safeParse({ cible_min: 9, cible_max: 6 }).success).toBe(false);
    expect(game.configSchema.safeParse({ visible_min: 4, visible_max: 3 }).success).toBe(false);
    expect(game.configSchema.safeParse({ cible_min: 0.5 }).success).toBe(false);
    expect(game.configSchema.safeParse({ designs: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ designs: ["inconnu"] }).success).toBe(false);
  });
  it("la cible tirée reste dans les bornes, au demi-seconde, et la visibilité aussi", () => {
    const cfg = game.configSchema.parse({});
    for (const r of [0, 0.13, 0.5, 0.77, 0.999999]) {
      const ctx = makeCtx(cfg, makePlayers(3), () => r);
      const pub = game.publicView(game.start({ design: "digital" }, ctx), ctx) as Pub;
      expect(pub.cible).toBeGreaterThanOrEqual(6);
      expect(pub.cible).toBeLessThanOrEqual(12);
      expect((pub.cible * 2) % 1).toBe(0);
      expect(pub.visible).toBeGreaterThanOrEqual(2);
      expect(pub.visible).toBeLessThanOrEqual(3);
    }
    const lo = makeCtx(cfg, makePlayers(2), () => 0);
    expect((game.publicView(game.start({ design: "digital" }, lo), lo) as Pub).cible).toBe(6);
    const hi = makeCtx(cfg, makePlayers(2), () => 0.999999);
    expect((game.publicView(game.start({ design: "digital" }, hi), hi) as Pub).cible).toBe(12);
  });
  it("le design de la manche est celui de l'item, uniquement parmi les designs actifs", () => {
    const cfg = parse({ designs: ["meche", "coupe", "meche"] });
    expect(game.items(cfg).map((i) => i.design)).toEqual(["meche", "coupe"]);
    const ctx = makeCtx(cfg, makePlayers(2));
    expect((game.publicView(game.start({ design: "coupe" }, ctx), ctx) as Pub).design).toBe("coupe");
  });
});

describe("compte-a-rebours : déroulé", () => {
  it("annonce, « 3 2 1 », GO : le départ est annoncé à l'avance avec l'heure serveur", () => {
    const r = round(3);
    expect(r.pub().phase).toBe("announce");
    expect(r.ctx.countdownState?.seconds).toBe(r.cfg.annonce);
    r.ctx.advance(r.cfg.annonce * 1000);
    expect(r.pub().phase).toBe("ready");
    expect(r.pub().goAt).toBe(r.ctx.now() + GO_LEAD_MS);
    expect(r.pub().startedAt).toBeNull();
    r.ctx.advance(GO_LEAD_MS - 1);
    expect(r.pub().phase).toBe("ready");
    r.ctx.advance(1);
    expect(r.pub().phase).toBe("running");
    expect(r.pub().startedAt).toBe(r.ctx.now());
  });

  it("le temps n'est jamais dans la vue publique, seulement qui a stoppé", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(4321);
    r.stop("p1", 4321);
    expect(r.pub().stoppedIds).toEqual(["p1"]);
    expect(JSON.stringify(game.publicView(r.state, r.ctx))).not.toContain("4321");
  });

  it("ignore un STOP avant le GO ou au payload invalide", () => {
    const r = round(3);
    r.stop("p1", 100);
    r.goNow();
    r.ctx.advance(3000);
    for (const bad of [undefined, null, "x", 12, {}, { ms: "3000" }, { ms: NaN }, { ms: Infinity }, { ms: -5 }, { ms: null }]) game.input(r.state, "p1", bad, r.ctx);
    expect(r.pub().stoppedIds).toEqual([]);
  });

  it("ignore un temps impossible (plus long que la manche) ; un appui est définitif", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(2000);
    r.stop("p1", 60_000);
    expect(r.pub().stoppedIds).toEqual([]);
    r.stop("p1", 1900);
    r.stop("p1", 2000); // deuxième appui ignoré
    r.stop("p2", 2000);
    const { results } = r.finish();
    expect((results as Results).ranking.find((x) => x.playerId === "p1")!.elapsedMs).toBe(1900);
  });

  it("fin anticipée quand tous les connectés ont stoppé", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(9000);
    r.stop("p1", 9000);
    r.stop("p2", 9500);
    expect(r.ctx.ended).toBe(false);
    r.stop("p3", 10_000);
    expect(r.ctx.ended).toBe(true);
  });

  it("un absent ne bloque pas la manche ; sa déconnexion en cours de route la termine", () => {
    const r = round(3, {}, () => 0.5, ["p3"]);
    r.goNow();
    r.ctx.advance(9000);
    r.stop("p1", 9000);
    r.stop("p2", 9500);
    expect(r.ctx.ended).toBe(true);

    const r2 = round(3);
    r2.goNow();
    r2.ctx.advance(9000);
    r2.stop("p1", 9000);
    r2.stop("p2", 9500);
    expect(r2.ctx.ended).toBe(false);
    r2.ctx.setConnected("p3", false);
    game.onPresenceChange!(r2.state, r2.ctx);
    expect(r2.ctx.ended).toBe(true);
  });

  it("personne ne réagit en pause d'annonce : onPresenceChange ne termine pas avant le GO", () => {
    const r = round(2);
    r.ctx.setConnected("p1", false);
    r.ctx.setConnected("p2", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.ended).toBe(false);
  });

  it("à cible + marge_max la manche s'arrête, les non-stoppés sont ratés", () => {
    const r = round(3, { marge_max: 3 });
    r.goNow();
    r.ctx.advance(10_000);
    r.stop("p1", 10_000);
    r.ctx.advance(2999);
    expect(r.ctx.ended).toBe(false);
    r.ctx.advance(1);
    expect(r.ctx.ended).toBe(true);
    const { results, scores } = r.finish();
    expect((results as Results).missed.map((m) => m.playerId)).toEqual(["p2", "p3"]);
    expect(scores).toEqual({ p1: 150 });
  });
});

describe("compte-a-rebours : classement et points", () => {
  it("points par place, écart absolu (trop tôt ou trop tard)", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(10_000);
    r.stop("p1", 10_300); // +0,30
    r.stop("p2", 9_900); //  −0,10
    r.stop("p3", 10_050); // +0,05
    const { results, scores } = r.finish();
    expect((results as Results).ranking.map((x) => x.playerId)).toEqual(["p3", "p2", "p1"]);
    expect((results as Results).ranking[1]).toMatchObject({ signedMs: -100, elapsedMs: 9_900 });
    expect(scores).toEqual({ p3: 150, p2: 100, p1: 70 });
  });

  it("égalité : même place, et la suivante saute", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(10_000);
    r.stop("p1", 10_100);
    r.stop("p2", 9_900);
    r.stop("p3", 10_500);
    const { scores, results } = r.finish();
    expect(scores).toEqual({ p1: 150, p2: 150, p3: 70 });
    expect((results as Results).ranking.map((x) => x.rank)).toEqual([1, 1, 3]);
  });

  it("place absente de la liste = 0 ; les ratés n'ont pas de ligne de score", () => {
    const r = round(3, { points: [100] });
    r.goNow();
    r.ctx.advance(10_000);
    r.stop("p1", 10_000);
    r.stop("p2", 10_400);
    r.ctx.advance(10_000);
    const { scores } = r.finish();
    expect(scores).toEqual({ p1: 100, p2: 0 });
  });

  it("personne n'a stoppé : résultat vide, aucun point", () => {
    const r = round(3);
    r.goNow();
    r.ctx.advance(20_000);
    const { scores, results } = r.finish();
    expect(scores).toEqual({});
    expect((results as Results).ranking).toEqual([]);
    expect(revealSeconds(results as Results)).toBeGreaterThan(0);
  });

  it("rankByError, formats, et durée de la révélation qui croît avec les joueurs", () => {
    expect(rankByError([3, -1, 1], (x) => x * 10).map((r) => [r.item, r.rank])).toEqual([[-1, 1], [1, 1], [3, 3]]);
    expect(fmtSeconds(7340)).toBe("7,34");
    expect(fmtSigned(-80)).toBe("−0,08");
    expect(fmtCible(8)).toBe("8,0");
    expect(fmtCible(7.5)).toBe("7,5");
    const mk = (n: number): Results => ({
      design: "digital",
      cible: 8,
      ranking: Array.from({ length: n }, (_, i) => ({ playerId: `p${i}`, rank: i + 1, elapsedMs: 8000, signedMs: i * 100 })),
      missed: [],
    });
    expect(revealSeconds(mk(7))).toBeGreaterThan(revealSeconds(mk(3)));
  });
});

describe("compte-a-rebours : compteurs chaotiques", () => {
  const vis = 2500;
  it("net pendant la phase visible, puis chaotique, sans jamais montrer la vraie valeur, de façon reproductible", () => {
    expect(chaosAt(1200, vis, 42).mode).toBe("clear");
    expect(shownMs(1200, chaosAt(1200, vis, 42), 10)).toBe(1200);
    let leaked = 0;
    for (let t = 3200; t < 12_000; t += 37) {
      const c = chaosAt(t, vis, 42);
      expect(c.mode).not.toBe("clear");
      expect(shownMs(t, chaosAt(t, vis, 42), 10)).toBe(shownMs(t, c, 10));
      if (Math.abs(shownMs(t, c, 10) - t) < 10) leaked++;
    }
    expect(leaked).toBeLessThan(5);
  });
  it("la graine change le déroulé du chaos", () => {
    const a = chaosAt(6000, vis, 1);
    const b = chaosAt(6000, vis, 999_999);
    const sample = (c: typeof a) => [0, 1, 2, 3].map((k) => c.rnd(k));
    expect(sample(a)).not.toEqual(sample(b));
  });
});

describe("compte-a-rebours : à travers le moteur", () => {
  it("deux joueurs stoppent en même temps, les points arrivent dans les deltas", () => {
    const cfg = parse({ annonce: 2 });
    const t = createTestEngine({ games: [{ game, cfg }], players: 2 });
    t.engine.setSetup({ counts: { "compte-a-rebours": 1 } });
    startRounds(t.engine);
    t.clock.advance(4000); // intro
    const pub = () => t.engine.snapshot(null).round!.public as Pub;
    expect(pub().phase).toBe("announce");
    t.clock.advance(2000);
    expect(pub().phase).toBe("ready");
    t.clock.advance(GO_LEAD_MS);
    expect(pub().phase).toBe("running");
    t.clock.advance(10_200);
    const [a, b] = t.engine.snapshot(null).players.map((p) => p.id) as [string, string];
    t.engine.input(a, { ms: 10_200 });
    expect(pub().stoppedIds).toEqual([a]);
    t.engine.input(b, { ms: 10_050 });
    expect(t.engine.snapshot(null).phase).toBe("results");
    expect(t.engine.snapshot(null).round!.deltas).toEqual({ [b]: 150, [a]: 100 });
  });
});

describe("compte-a-rebours : progress", () => {
  it("compte ceux qui ont stoppé, déconnectés compris", () => {
    const { ctx, state, goNow, stop } = round(3, {}, () => 0.5, ["p3"]);
    expect(game.progress!(state, ctx)).toEqual({ done: 0, expected: 3 });
    goNow();
    ctx.advance(9_600);
    stop("p1", 9000);
    stop("p3", 9500); // déconnecté mais sa réponse est acceptée
    expect(game.progress!(state, ctx)).toEqual({ done: 2, expected: 3 });
  });
});
