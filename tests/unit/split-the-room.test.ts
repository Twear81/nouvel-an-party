import { describe, expect, it } from "bun:test";
import splitTheRoom, { GRACE_SECONDS, scoreSplit, type Priv, type Pub, type Results } from "../../src/minigames/split-the-room/game";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";
import { seededRng } from "./helpers/rng";

const game = splitTheRoom;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ situations: ["Tu peux voler, mais…"], ...extra });

function round(nPlayers = 4, cfgExtra: Record<string, unknown> = {}, rng: () => number = seededRng(7)) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), rng);
  const state = game.start("Tu peux voler, mais…", ctx);
  game.onPlay!(state, ctx);
  const write = (id: string, text: unknown) => game.input(state, id, { text }, ctx);
  const vote = (id: string, v: unknown) => game.input(state, id, { vote: v }, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  /** Les textes écrits par writeAll valent "t<id>" : la fin affichée désigne son auteur. */
  const currentAuthor = () => pub().ending!.slice(1);
  return { cfg, ctx, state, write, vote, pub, priv, currentAuthor, finish: () => game.finish(state, ctx) };
}

function writeAll(r: ReturnType<typeof round>, ids: string[]) {
  for (const id of ids) r.write(id, `t${id}`);
}

/** Écriture finie pour tous, on est à la première phrase. */
function toVote(nPlayers: number, cfgExtra: Record<string, unknown> = {}) {
  const r = round(nPlayers, cfgExtra);
  const ids = Array.from({ length: nPlayers }, (_, i) => `p${i + 1}`);
  writeAll(r, ids);
  r.ctx.finishCountdown();
  const author = r.currentAuthor();
  return { r, ids, author, voters: ids.filter((i) => i !== author) };
}

describe("split-the-room : points", () => {
  it("parfait (écart minimal) = max, unanimité = 0, linéaire entre les deux", () => {
    expect(scoreSplit(3, 3, 300)).toEqual({ verdict: "perfect", gain: 300 });
    expect(scoreSplit(3, 2, 300)).toEqual({ verdict: "perfect", gain: 300 }); // impair : 1 d'écart est le mieux possible
    expect(scoreSplit(6, 0, 300)).toEqual({ verdict: "unanimous", gain: 0 });
    expect(scoreSplit(0, 3, 300)).toEqual({ verdict: "unanimous", gain: 0 });
    expect(scoreSplit(4, 2, 300)).toEqual({ verdict: "split", gain: 200 }); // 6 votes, écart 2 sur 6
    expect(scoreSplit(5, 1, 300)).toEqual({ verdict: "split", gain: 100 });
    expect(scoreSplit(4, 1, 300)).toEqual({ verdict: "split", gain: 150 }); // 5 votes, écart 3, minimal 1 : (5-3)/(5-1)
  });
  it("moins de 2 votes : rien", () => {
    expect(scoreSplit(0, 0, 300)).toEqual({ verdict: "none", gain: 0 });
    expect(scoreSplit(1, 0, 300)).toEqual({ verdict: "none", gain: 0 });
  });
  it("2 votes : un OUI un NON = max, deux pareils = 0", () => {
    expect(scoreSplit(1, 1, 300).gain).toBe(300);
    expect(scoreSplit(2, 0, 300).gain).toBe(0);
  });
});

describe("split-the-room : config", () => {
  it("valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree_ecriture: 60, duree_vote: 15, duree_revelation: 9, longueur_max: 80, points: { max: 300 } });
  });
  it("exige au moins une situation", () => {
    expect(game.configSchema.safeParse({ situations: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
  });
  it("pas de chrono automatique", () => {
    expect(game.roundSeconds(parse(), "x")).toBeNull();
  });
});

describe("split-the-room : écriture", () => {
  it("chrono d'écriture au début du jeu", () => {
    const r = round();
    expect(r.ctx.countdownState!.seconds).toBe(60);
    expect(r.pub().step).toBe("write");
  });

  it("nettoie le texte, le coupe à la longueur max et ignore un retrait après envoi", () => {
    const r = round(3, { longueur_max: 12 });
    r.write("p1", "abcdefghijklmnopqrstuvwxyz");
    expect(r.priv("p1").text).toBe("abcdefghijkl");
    r.write("p1", "   ");
    expect(r.priv("p1").text).toBe("abcdefghijkl");
    expect(r.pub().writtenIds).toEqual(["p1"]);
  });

  it("la première phrase envoyée reste verrouillée ; les textes des autres ne fuitent pas", () => {
    const r = round();
    r.write("p1", "premier");
    r.write("p1", "second");
    expect(r.priv("p1").text).toBe("premier");
    expect(r.priv("p2").text).toBeNull();
    expect(JSON.stringify(r.pub())).not.toContain("premier");
  });

  it("ignore payloads invalides, vote pendant l'écriture", () => {
    const r = round();
    game.input(r.state, "p1", null, r.ctx);
    game.input(r.state, "p1", { text: 12 }, r.ctx);
    r.vote("p1", true);
    expect(r.pub().writtenIds).toEqual([]);
  });

  it("tout le monde a écrit : court délai puis vote", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.write("p2", "corrigé");
    expect(r.priv("p2").text).toBe("tp2");
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("vote");
    expect(r.pub().total).toBe(3);
  });

  it("moins de 2 phrases ou aucune : on saute le vote, aucun point", () => {
    const r = round(3);
    r.write("p1", "seule");
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    const res = r.finish();
    expect((res.results as Results).sentences).toEqual([{ authorId: "p1", text: "seule", yes: 0, no: 0, gain: 0, played: false, best: false }]);
    expect(res.scores).toEqual({});
    const r0 = round(3);
    r0.ctx.finishCountdown();
    expect(r0.ctx.ended).toBe(true);
    expect((r0.finish().results as Results).sentences).toEqual([]);
  });
});

describe("split-the-room : présence", () => {
  it("écriture : le délai de grâce part quand tous les connectés ont écrit", () => {
    const r = round(4);
    r.ctx.setConnected("p4", false);
    writeAll(r, ["p1", "p2"]);
    expect(r.ctx.countdownState!.seconds).not.toBe(GRACE_SECONDS);
    r.write("p3", "tp3");
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
  });

  it("écriture : la déconnexion du dernier manquant lance le délai", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2"]);
    r.ctx.setConnected("p3", false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
  });

  it("vote : révélation quand tous les votants connectés ont voté", () => {
    const { r, voters } = toVote(4);
    r.ctx.setConnected(voters[2]!, false);
    game.onPresenceChange!(r.state, r.ctx);
    r.vote(voters[0]!, true);
    expect(r.pub().step).toBe("vote");
    r.vote(voters[1]!, false);
    expect(r.pub().step).toBe("reveal");
  });

  it("vote : la déconnexion du dernier votant manquant déclenche la révélation", () => {
    const { r, voters } = toVote(3);
    r.vote(voters[0]!, true);
    r.ctx.setConnected(voters[1]!, false);
    game.onPresenceChange!(r.state, r.ctx);
    expect(r.pub().step).toBe("reveal");
  });
});

describe("split-the-room : vote", () => {
  it("rien de secret avant la révélation", () => {
    const { r, author, voters } = toVote(4);
    r.vote(voters[0]!, true);
    const pub = r.pub();
    expect(pub.step).toBe("vote");
    expect(pub.authorId).toBeNull();
    expect(pub.sequence).toEqual([]);
    expect(pub.yes + pub.no).toBe(0);
    expect(pub.verdict).toBeNull();
    expect(pub.votedCount).toBe(1);
    expect(pub.voterCount).toBe(3);
    expect(r.priv(author).isAuthor).toBe(true);
    expect(r.priv(voters[0]!).vote).toBe(true);
    expect(r.priv(voters[1]!).vote).toBeNull();
  });

  it("refuse : vote de l'auteur, valeur non booléenne", () => {
    const { r, author, voters } = toVote(4);
    r.vote(author, true);
    r.vote(voters[0]!, "oui");
    r.vote(voters[0]!, 1);
    game.input(r.state, voters[0]!, null, r.ctx);
    expect(r.pub().votedCount).toBe(0);
  });

  it("changement d'avis possible ; tout le monde a voté → révélation immédiate avec verdict", () => {
    const { r, author, voters } = toVote(4);
    r.vote(voters[0]!, true);
    r.vote(voters[0]!, false);
    expect(r.priv(voters[0]!).vote).toBe(false);
    r.vote(voters[1]!, true);
    r.vote(voters[2]!, true);
    const pub = r.pub();
    expect(pub.step).toBe("reveal");
    expect(pub.authorId).toBe(author);
    expect(pub.yes).toBe(2);
    expect(pub.no).toBe(1);
    expect(pub.sequence.slice().sort()).toEqual([false, true, true]);
    expect(pub.verdict).toBe("perfect"); // 3 votes : 2-1 est le meilleur possible
    expect(pub.authorGain).toBe(300);
    expect(r.finish().scores).toEqual({ [author]: 300 });
  });

  it("unanimité : 0 point pour l'auteur", () => {
    const { r, voters } = toVote(4);
    for (const v of voters) r.vote(v, true);
    expect(r.pub().verdict).toBe("unanimous");
    expect(r.pub().authorGain).toBe(0);
    expect(r.finish().scores).toEqual({});
  });

  it("chrono écoulé : abstentions ignorées ; moins de 2 votes = 0 point", () => {
    const { r, voters } = toVote(4);
    r.vote(voters[0]!, true);
    r.ctx.advance(15_000);
    expect(r.pub().step).toBe("reveal");
    expect(r.pub().verdict).toBe("none");
    expect(r.finish().scores).toEqual({});
  });

  it("chrono écoulé avec 2 votes sur 4 votants possibles : les abstentions ne comptent pas", () => {
    const { r, author, voters } = toVote(5);
    r.vote(voters[0]!, true);
    r.vote(voters[1]!, false);
    r.ctx.advance(15_000);
    expect(r.pub().verdict).toBe("perfect");
    expect(r.finish().scores).toEqual({ [author]: 300 });
  });

  it("les non-écrivains votent aussi", () => {
    const r = round(4);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    r.vote("p4", true);
    expect(r.pub().votedCount).toBe(1);
  });

  it("ordre mélangé avec rng, toutes les phrases une fois, enchaînement des chronos", () => {
    const r = round(6, {}, seededRng(3));
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    writeAll(r, ids);
    r.ctx.finishCountdown();
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(r.currentAuthor());
      r.ctx.advance(15_000);
      expect(r.pub().step).toBe("reveal");
      r.ctx.advance(9_000);
    }
    expect([...seen].sort()).toEqual(ids);
    expect(seen).not.toEqual(ids);
    expect(r.ctx.ended).toBe(true);
  });

  it("résultats : la phrase la plus coupée est marquée", () => {
    const { r, ids } = toVote(4);
    // 1re phrase : 2-1 (parfait, 300) ; les suivantes : unanimité
    const a1 = r.currentAuthor();
    const v1 = ids.filter((i) => i !== a1);
    r.vote(v1[0]!, true);
    r.vote(v1[1]!, true);
    r.vote(v1[2]!, false);
    r.ctx.finishCountdown();
    for (let i = 0; i < 3; i++) {
      const a = r.currentAuthor();
      for (const v of ids.filter((x) => x !== a)) r.vote(v, false);
      r.ctx.finishCountdown();
    }
    expect(r.ctx.ended).toBe(true);
    const res = r.finish().results as Results;
    expect(res.sentences).toHaveLength(4);
    expect(res.sentences.filter((s) => s.best).map((s) => s.authorId)).toEqual([a1]);
    expect(res.sentences.find((s) => s.authorId === a1)).toMatchObject({ yes: 2, no: 1, gain: 300 });
  });

  it("manche écourtée en plein vote : phrases non jouées listées sans votes", () => {
    const { r } = toVote(3);
    const res = r.finish().results as Results;
    expect(res.sentences).toHaveLength(3);
    expect(res.sentences.every((s) => !s.played && !s.best)).toBe(true);
  });

  it("à 2 joueurs : un seul votant, donc 0 point (moins de 2 votes)", () => {
    const { r, voters } = toVote(2);
    r.vote(voters[0]!, true);
    expect(r.pub().step).toBe("reveal");
    expect(r.finish().scores).toEqual({});
  });
});

describe("split-the-room : à travers le moteur", () => {
  it("une manche complète, des chronos aux points cumulés", () => {
    const cfg = game.configSchema.parse({ situations: ["Tu peux voler, mais…"], duree_vote: 10, duree_revelation: 2 });
    const t = createTestEngine({ games: [{ game, cfg }], players: 4, settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { "split-the-room": 1 } });
    startRounds(t.engine);
    t.clock.advance(1_000);
    const snap = () => t.engine.snapshot(null).round!;
    const pub = () => snap().public as Pub;
    expect(pub().step).toBe("write");
    expect(snap().timerTotalMs).toBe(60_000);

    for (const id of t.ids) t.engine.input(id, { text: `fin de ${id}` });
    t.clock.advance(GRACE_SECONDS * 1000);
    expect(pub().step).toBe("vote");
    expect(snap().timerTotalMs).toBe(10_000);

    for (let i = 0; i < 4; i++) {
      const author = t.ids.find((id) => pub().ending!.endsWith(id))!;
      const [a, b, c] = t.ids.filter((id) => id !== author) as [string, string, string];
      t.engine.input(a, { vote: true });
      t.engine.input(b, { vote: false });
      t.engine.input(c, { vote: true });
      expect(pub().step).toBe("reveal");
      expect(pub().authorId).toBe(author);
      t.clock.advance(2_000);
    }
    const state = t.engine.snapshot(null);
    expect(state.phase).toBe("results");
    expect(state.round!.deltas).toEqual(Object.fromEntries(t.ids.map((id) => [id, 300])));
  });
});

describe("split-the-room : progress", () => {
  it("écriture, puis vote sans l'auteur, null à la révélation", () => {
    const r = round(4);
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 0, expected: 4 });
    r.write("p1", "abc");
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 1, expected: 4 });
    for (const id of ["p2", "p3", "p4"]) r.write(id, `t${id}`);
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("vote");
    const author = r.currentAuthor();
    const voters = ["p1", "p2", "p3", "p4"].filter((i) => i !== author);
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 0, expected: 3 });
    r.vote(author, true); // l'auteur ne vote pas
    r.vote(voters[0]!, true);
    r.ctx.setConnected(voters[2]!, false);
    expect(game.progress!(r.state, r.ctx)).toEqual({ done: 1, expected: 3 });
    r.vote(voters[1]!, false);
    r.vote(voters[2]!, true);
    expect(r.pub().step).toBe("reveal");
    expect(game.progress!(r.state, r.ctx)).toBeNull();
  });
});
