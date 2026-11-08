import { describe, expect, it } from "bun:test";
import dessinRate, { type Item, type Priv, type Pub, type Results, type TvPub } from "../../src/minigames/dessin-rate/game";
import { cleanStrokes, MAX_POINTS, MAX_POINTS_PER_STROKE, MAX_STROKES, type Stroke } from "../../src/minigames/dessin-rate/shared";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";
import { seededRng } from "./helpers/rng";

const game = dessinRate;
const words = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ mots: { facile: words("f", 10) }, ...extra });
const line = (x = 10): Stroke => ({ c: 1, w: 0, p: [x, 10, x + 100, 200] });

function round(nPlayers = 4, cfgExtra: Record<string, unknown> = {}) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), seededRng(3));
  const item: Item = { difficulte: "facile", mots: words("m", 8) };
  const state = game.start(item, ctx);
  game.onPlay!(state, ctx);
  const draw = (id: string, strokes: unknown) => game.input(state, id, { strokes }, ctx);
  const vote = (id: string, target: unknown) => game.input(state, id, { target }, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const tv = () => game.tvView!(state, ctx) as TvPub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  /** Fin du dessin, puis toute la galerie : on arrive au vote (ou aux résultats). */
  const toVote = () => {
    ctx.finishCountdown();
    while (!ctx.ended && pub().step === "gallery") ctx.finishCountdown();
  };
  return { cfg, ctx, state, draw, vote, pub, tv, priv, toVote, finish: () => game.finish(state, ctx) };
}

describe("dessin-rate : config", () => {
  it("valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree_dessin: 20, duree_galerie: 4, duree_vote: 20, points: { par_vote: 50, gagnant: 100 } });
  });
  it("exige une liste d'au moins 8 mots", () => {
    expect(game.configSchema.safeParse({ mots: { facile: words("f", 7) } }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
    expect(game.configSchema.safeParse({ mots: { difficile: words("d", 8) } }).success).toBe(true);
  });
  it("pas de chrono automatique", () => {
    expect(game.roundSeconds(parse(), { difficulte: "facile", mots: [] })).toBeNull();
  });
  it("manches : une par tranche de 8 mots et par difficulté, sans mot en double", () => {
    const cfg = parse({ mots: { facile: words("f", 30), moyen: words("m", 8), difficile: words("d", 7) } });
    const items = game.items(cfg);
    expect(items.filter((i) => i.difficulte === "facile")).toHaveLength(3);
    expect(items.filter((i) => i.difficulte === "moyen")).toHaveLength(1);
    expect(items.filter((i) => i.difficulte === "difficile")).toHaveLength(0);
    const all = items.filter((i) => i.difficulte === "facile").flatMap((i) => i.mots);
    expect(new Set(all).size).toBe(30);
    for (const i of items) expect(i.mots.length).toBeGreaterThanOrEqual(8);
  });
});

describe("dessin-rate : tirage des mots", () => {
  it("chaque joueur a un mot différent de la même liste, visible de lui seul", () => {
    const r = round(8);
    const mine = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map((id) => r.priv(id).word!);
    expect(new Set(mine).size).toBe(8);
    for (const w of mine) expect(w).toMatch(/^m[1-8]$/);
    expect(JSON.stringify(r.pub())).not.toMatch(/"m[1-8]"/);
    expect(JSON.stringify(r.tv())).not.toMatch(/"m[1-8]"/);
    expect(r.pub().difficulty).toBe("facile");
  });
});

describe("dessin-rate : dessiner", () => {
  it("lance le chrono de dessin au début du jeu", () => {
    const r = round();
    expect(r.ctx.countdownState!.seconds).toBe(20);
    expect(r.pub().step).toBe("draw");
  });

  it("le dessin complet remplace le précédent ; renvoyé au téléphone (rechargement) et à la TV, pas aux autres", () => {
    const r = round();
    r.draw("p1", [line()]);
    r.draw("p1", [line(), line(300)]);
    expect(r.priv("p1").strokes).toHaveLength(2);
    expect(r.priv("p2").strokes).toHaveLength(0);
    expect(r.tv().live.find((l) => l.playerId === "p1")!.strokes).toHaveLength(2);
    expect(JSON.stringify(r.pub())).not.toContain('"p":[');
  });

  it("valide strictement le dessin : un payload invalide est ignoré en entier", () => {
    const r = round();
    r.draw("p1", [line()]);
    const bad: unknown[] = [
      "x",
      null,
      [{ c: 9, w: 0, p: [1, 2] }], // couleur hors palette
      [{ c: 0, w: 2, p: [1, 2] }], // épaisseur inconnue
      [{ c: 0, w: 0, p: [1, 2, 3] }], // nombre impair
      [{ c: 0, w: 0, p: [] }],
      [{ c: 0, w: 0, p: [1.5, 2] }], // pas entier
      [{ c: 0, w: 0, p: [1001, 2] }], // hors bornes
      [{ c: 0, w: 0, p: [-1, 2] }],
      [{ c: 0, w: 0, p: ["1", 2] }],
      [{ c: 0, w: 0, p: [Number.NaN, 2] }],
      [{ c: 0.5, w: 0, p: [1, 2] }],
      [null],
      [{ c: 0, w: 0 }],
      [line(), { c: 0, w: 0, p: [1, 2, 3] }], // un seul mauvais trait invalide tout
      Array.from({ length: MAX_STROKES + 1 }, () => line()), // trop de traits
      [{ c: 0, w: 0, p: Array.from({ length: (MAX_POINTS_PER_STROKE + 1) * 2 }, () => 5) }], // trait trop long
      Array.from({ length: 4 }, () => ({ c: 0, w: 0, p: Array.from({ length: (MAX_POINTS / 4 + 1) * 2 }, () => 5) })), // trop de points au total
    ];
    for (const b of bad) {
      r.draw("p1", b);
      expect(r.priv("p1").strokes).toHaveLength(1);
    }
  });

  it("ignore le payload sans dessin ; ne garde que c/w/p ; accepte les bornes", () => {
    const r = round();
    game.input(r.state, "p1", null, r.ctx);
    game.input(r.state, "p1", { strokes: [{ ...line(), extra: "x" }] }, r.ctx);
    expect(r.priv("p1").strokes[0]).toEqual(line());
    expect(cleanStrokes([])).toEqual([]);
    expect(cleanStrokes([{ c: 4, w: 1, p: [0, 1000, 1000, 0] }])).not.toBeNull();
    expect(cleanStrokes(Array.from({ length: MAX_STROKES }, () => line()))).toHaveLength(MAX_STROKES);
  });

  it("à la fin du chrono le dessin est figé", () => {
    const r = round(3);
    r.draw("p1", [line()]);
    r.draw("p2", [line()]);
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("gallery");
    r.draw("p1", [line(), line(400)]);
    const cards = (r.finish().results as Results).cards;
    expect(cards).toHaveLength(2);
    expect(cards.find((c) => c.playerId === "p1")!.strokes).toHaveLength(1);
  });
});

describe("dessin-rate : galerie", () => {
  it("montre chaque dessin non vide avec son mot, un chrono par dessin ; les pages blanches sont sautées", () => {
    const r = round(4);
    r.draw("p1", [line()]);
    r.draw("p2", [line()]);
    r.draw("p3", [line()]);
    r.ctx.finishCountdown();
    expect(r.ctx.countdownState!.seconds).toBe(4);
    const seen: string[] = [];
    while (r.pub().step === "gallery") {
      const cur = r.pub().current!;
      expect(cur.word).toBe(r.priv(cur.playerId).word!);
      expect(r.pub().total).toBe(3);
      seen.push(cur.playerId);
      r.ctx.finishCountdown();
    }
    expect(seen.sort()).toEqual(["p1", "p2", "p3"]);
    expect(r.pub().step).toBe("vote");
    expect(r.pub().cards).toHaveLength(4); // la page blanche de p4 est dans le vote
  });

  it("personne n'a dessiné : la manche se termine sans points", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    const out = r.finish();
    expect((out.results as Results).cards).toEqual([]);
    expect(out.scores).toEqual({});
  });

  it("un seul dessin : galerie puis fin, sans vote", () => {
    const r = round(3);
    r.draw("p2", [line()]);
    r.toVote();
    expect(r.ctx.ended).toBe(true);
    expect((r.finish().results as Results).voted).toBe(false);
    expect(r.finish().scores).toEqual({});
  });
});

describe("dessin-rate : vote", () => {
  function atVote(n = 4) {
    const r = round(n);
    for (let i = 1; i <= n; i++) r.draw(`p${i}`, [line(i * 50)]);
    r.toVote();
    return r;
  }

  it("on ne vote pas pour soi, ni pour un inconnu, ni pour une page blanche ; on peut changer d'avis", () => {
    const r = round(4);
    for (const id of ["p1", "p2", "p3"]) r.draw(id, [line()]); // p4 : page blanche
    r.toVote();
    r.vote("p1", "p1");
    r.vote("p1", "zz");
    r.vote("p1", 42);
    r.vote("p1", "p4");
    expect(r.priv("p1").vote).toBeNull();
    expect(r.pub().votedCount).toBe(0);
    r.vote("p1", "p2");
    r.vote("p1", "p3");
    expect(r.priv("p1").vote).toBe("p3");
    expect(r.pub().votedCount).toBe(1);
    r.vote("p4", "p1"); // celui qui n'a rien dessiné vote quand même
    expect(r.pub().votedCount).toBe(2);
  });

  it("le vote ne dit pas qui a voté quoi", () => {
    const r = atVote();
    r.vote("p1", "p2");
    expect(JSON.stringify(r.pub())).not.toContain("votes");
    expect(r.priv("p2").vote).toBeNull();
  });

  it("fin anticipée quand tous les connectés ont voté ; un téléphone déconnecté ne bloque pas", () => {
    const r = atVote();
    r.ctx.setConnected("p4", false);
    r.vote("p1", "p2");
    r.vote("p2", "p1");
    expect(r.ctx.ended).toBe(false);
    r.vote("p3", "p1");
    expect(r.ctx.ended).toBe(true);
  });

  it("fin anticipée aussi quand le dernier qui n'a pas voté se déconnecte (onPresenceChange)", () => {
    const r = atVote();
    r.vote("p1", "p2");
    r.vote("p2", "p1");
    r.vote("p3", "p1");
    expect(r.ctx.ended).toBe(false);
    r.ctx.setConnected("p4", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.ended).toBe(true);
  });

  it("personne ne vote : le chrono termine la manche, personne ne marque", () => {
    const r = atVote();
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    expect(r.finish().scores).toEqual({});
    expect((r.finish().results as Results).winners).toEqual([]);
  });

  it("le vote n'est pas accepté pendant le dessin", () => {
    const r = round(3);
    r.draw("p1", [line()]);
    r.vote("p2", "p1");
    expect(r.priv("p2").vote).toBeNull();
  });
});

describe("dessin-rate : points", () => {
  function voted(votes: [string, string][], n = 4, cfg: Record<string, unknown> = {}) {
    const r = round(n, cfg);
    for (let i = 1; i <= n; i++) r.draw(`p${i}`, [line(i * 50)]);
    r.toVote();
    for (const [a, b] of votes) r.vote(a, b);
    return r.finish();
  }

  it("50 par vote + 100 pour le plus voté", () => {
    const out = voted([["p1", "p2"], ["p3", "p2"], ["p4", "p1"]]);
    expect(out.scores).toEqual({ p2: 2 * 50 + 100, p1: 50 });
    expect((out.results as Results).winners).toEqual(["p2"]);
  });

  it("ex æquo : tous les premiers touchent le bonus", () => {
    const out = voted([["p1", "p2"], ["p2", "p1"], ["p3", "p1"], ["p4", "p2"]]);
    expect(out.scores).toEqual({ p1: 2 * 50 + 100, p2: 2 * 50 + 100 });
    expect((out.results as Results).winners.sort()).toEqual(["p1", "p2"]);
  });

  it("valeurs du yaml respectées", () => {
    const out = voted([["p1", "p2"]], 3, { points: { par_vote: 10, gagnant: 7 } });
    expect(out.scores).toEqual({ p2: 17 });
  });

  it("résultats : dessins non vides avec leurs votes, jamais de vote pour soi", () => {
    const out = voted([["p1", "p2"], ["p2", "p1"], ["p2", "p2"]]);
    const res = out.results as Results;
    expect(res.voted).toBe(true);
    expect(res.cards).toHaveLength(4);
    expect(res.cards.find((c) => c.playerId === "p2")!.votes).toBe(1);
    expect(res.cards.find((c) => c.playerId === "p1")!.votes).toBe(1);
  });
});

describe("dessin-rate : progress", () => {
  it("null pendant le dessin et la galerie, compte les votes pendant le vote", () => {
    const r = round(4);
    r.draw("p1", [line()]);
    expect(game.progress!(r.state, r.ctx)).toBeNull();
    for (const id of ["p1", "p2", "p3", "p4"]) r.draw(id, [line()]);
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("gallery");
    expect(game.progress!(r.state, r.ctx)).toBeNull();
    r.toVote();
    expect(r.pub().step).toBe("vote");
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 0, expected: 4 });
    r.vote("p1", "p2");
    r.vote("p2", "p3");
    r.vote("p2", "p4"); // changement d'avis : compte une fois
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 2, expected: 4 });
  });
});
