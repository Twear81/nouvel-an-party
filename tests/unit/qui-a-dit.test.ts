import { describe, expect, it } from "bun:test";
import quiADit, { cleanQuote, GRACE_SECONDS, type Priv, type Pub, type Results } from "../../src/minigames/qui-a-dit/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";
import { seededRng } from "./helpers/rng";

const game = quiADit;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ consignes: ["Ta résolution ?"], ...extra });

function round(nPlayers = 4, cfgExtra: Record<string, unknown> = {}, rng: () => number = seededRng(7)) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers), rng);
  const state = game.start("Ta résolution ?", ctx);
  game.onPlay!(state, ctx);
  const write = (id: string, text: unknown) => game.input(state, id, { text }, ctx);
  const guess = (id: string, target: unknown) => game.input(state, id, { target }, ctx);
  const pub = () => game.publicView(state, ctx) as Pub;
  const priv = (id: string) => game.privateView!(state, id, ctx) as Priv;
  /** Les textes écrits par writeAll valent "t<id>" : la citation affichée désigne son auteur. */
  const currentAuthor = () => pub().quote!.slice(1);
  return { cfg, ctx, state, write, guess, pub, priv, currentAuthor, finish: () => game.finish(state, ctx) };
}

function writeAll(r: ReturnType<typeof round>, ids: string[]) {
  for (const id of ids) r.write(id, `t${id}`);
}

describe("qui-a-dit : config", () => {
  it("valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree_ecriture: 60, duree_vote: 15, longueur_max: 80, points: { bonne_reponse: 100, auteur_piegeur: 50 } });
  });
  it("exige au moins une consigne", () => {
    expect(game.configSchema.safeParse({ consignes: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({}).success).toBe(false);
  });
  it("pas de chrono automatique", () => {
    expect(game.roundSeconds(parse(), "x")).toBeNull();
  });
});

describe("qui-a-dit : écriture", () => {
  it("lance le chrono d'écriture au début du jeu", () => {
    const r = round();
    expect(r.ctx.countdownState!.seconds).toBe(60);
    expect(r.pub().step).toBe("write");
  });

  it("nettoie le texte, le coupe à la longueur max, vide = pas de citation", () => {
    expect(cleanQuote("  salut   les\n amis ", 80)).toBe("salut les amis");
    expect(cleanQuote("x".repeat(200), 80)).toHaveLength(80);
    expect(cleanQuote(42, 80)).toBe("");
    const r = round(3, { longueur_max: 12 });
    r.write("p1", "abcdefghijklmnopqrstuvwxyz");
    expect(r.priv("p1").text).toBe("abcdefghijkl");
    r.write("p1", "   ");
    expect(r.priv("p1").text).toBeNull();
    expect(r.pub().writtenIds).toEqual([]);
  });

  it("on peut modifier sa réponse ; les textes des autres ne fuitent pas", () => {
    const r = round();
    r.write("p1", "premier");
    r.write("p1", "second");
    expect(r.priv("p1").text).toBe("second");
    expect(r.priv("p2").text).toBeNull();
    expect(JSON.stringify(r.pub())).not.toContain("second");
    expect(r.pub().writtenIds).toEqual(["p1"]);
  });

  it("ignore les payloads invalides et les joueurs inconnus", () => {
    const r = round();
    r.write("inconnu", "salut");
    game.input(r.state, "p1", null, r.ctx);
    game.input(r.state, "p1", { text: 12 }, r.ctx);
    game.input(r.state, "p1", { target: "p2" }, r.ctx); // vote pendant l'écriture
    expect(r.pub().writtenIds).toEqual([]);
  });

  it("quand tout le monde a écrit : court délai puis on passe aux devinettes", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    expect(r.pub().allWritten).toBe(true);
    expect(r.ctx.countdownState!.seconds).toBe(GRACE_SECONDS);
    r.write("p2", "corrigé"); // encore possible pendant le délai
    expect(r.priv("p2").text).toBe("corrigé");
    r.ctx.finishCountdown();
    expect(r.pub().step).toBe("guess");
    expect(r.pub().total).toBe(3);
  });

  it("fin du chrono avec des absents : seuls ceux qui ont écrit sont des auteurs possibles", () => {
    const r = round(5);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    expect(r.pub().total).toBe(3);
    expect(r.pub().candidateIds).toEqual(["p1", "p2", "p3"]);
    expect(r.ctx.countdownState!.seconds).toBe(15);
  });

  it("moins de 2 citations : on saute les devinettes et la manche se termine", () => {
    const r = round(3);
    r.write("p1", "seule");
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    const res = r.finish();
    expect((res.results as Results).quotes).toEqual([{ authorId: "p1", text: "seule", votes: [], played: false }]);
    expect(res.scores).toEqual({});
  });

  it("personne n'a écrit : résultats vides, aucun point", () => {
    const r = round(3);
    r.ctx.finishCountdown();
    expect(r.ctx.ended).toBe(true);
    const res = r.finish();
    expect((res.results as Results).quotes).toEqual([]);
    expect(res.scores).toEqual({});
  });
});

describe("qui-a-dit : devinettes", () => {
  it("l'auteur n'est jamais dans la vue publique avant la révélation", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    const pub = r.pub();
    expect(pub.step).toBe("guess");
    expect(pub.authorId).toBeNull();
    expect(pub.votes).toEqual([]);
    expect(pub.voterCount).toBe(2);
    const author = r.currentAuthor();
    expect(r.priv(author).isAuthor).toBe(true);
    expect(r.priv(["p1", "p2", "p3"].find((i) => i !== author)!).isAuthor).toBe(false);
  });

  it("refuse : vote de l'auteur, vote pour soi, cible inconnue ou qui n'a pas écrit", () => {
    const r = round(4);
    writeAll(r, ["p1", "p2", "p3"]); // p4 n'écrit pas
    r.ctx.finishCountdown();
    const author = r.currentAuthor();
    const others = ["p1", "p2", "p3"].filter((i) => i !== author);
    r.guess(author, others[0]); // l'auteur ne vote pas
    r.guess(others[0]!, others[0]); // pas pour soi
    r.guess(others[0]!, "inconnu");
    r.guess(others[0]!, "p4"); // n'a pas écrit
    r.guess(others[0]!, 12);
    r.guess("inconnu", author);
    expect(r.pub().votedCount).toBe(0);
    r.guess("p4", author); // un non-écrivain peut voter
    expect(r.pub().votedCount).toBe(1);
  });

  it("on peut changer son vote ; tout le monde a voté → révélation immédiate", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    const author = r.currentAuthor();
    const [v1, v2] = ["p1", "p2", "p3"].filter((i) => i !== author) as [string, string];
    r.guess(v1, v2);
    r.guess(v1, author);
    expect(r.priv(v1).vote).toBe(author);
    expect(r.pub().step).toBe("guess");
    r.guess(v2, author);
    expect(r.pub().step).toBe("reveal");
    expect(r.pub().authorId).toBe(author);
    expect(r.pub().votes).toHaveLength(2);
  });

  it("points : bonne réponse + piégeur pour chaque mauvaise réponse, toutes citations", () => {
    const r = round(4);
    writeAll(r, ["p1", "p2", "p3", "p4"]);
    r.ctx.finishCountdown();
    const expected: Record<string, number> = {};
    const add = (id: string, n: number) => (expected[id] = (expected[id] ?? 0) + n);
    for (let i = 0; i < 4; i++) {
      const author = r.currentAuthor();
      const voters = ["p1", "p2", "p3", "p4"].filter((p) => p !== author);
      // 1er votant : bonne réponse ; les deux autres : un autre joueur que l'auteur et que lui-même
      r.guess(voters[0]!, author);
      add(voters[0]!, 100);
      for (const v of voters.slice(1)) {
        const wrong = ["p1", "p2", "p3", "p4"].find((p) => p !== author && p !== v)!;
        r.guess(v, wrong);
        add(author, 50);
      }
      expect(r.pub().step).toBe("reveal");
      expect(r.pub().authorGain).toBe(100);
      r.ctx.finishCountdown(); // fin de la révélation
    }
    expect(r.ctx.ended).toBe(true);
    const { results, scores } = r.finish();
    expect(scores).toEqual(expected);
    const res = results as Results;
    expect(res.quotes).toHaveLength(4);
    expect(res.quotes.every((q) => q.played && q.votes.length === 3)).toBe(true);
    expect(res.trickster!.fooled).toBe(2);
    expect(res.trickster!.playerIds.sort()).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("vote non terminé : le chrono déclenche la révélation, les non-votants ne marquent rien", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    const author = r.currentAuthor();
    const voter = ["p1", "p2", "p3"].find((i) => i !== author)!;
    r.guess(voter, author);
    r.ctx.advance(15_000);
    expect(r.pub().step).toBe("reveal");
    expect(r.pub().authorGain).toBe(0);
    expect(r.finish().scores).toEqual({ [voter]: 100 });
    r.ctx.advance(5_000);
    expect(r.pub().step).toBe("guess");
    expect(r.pub().index).toBe(1);
  });

  it("ordre des citations : mélangé avec rng, toutes présentes une fois", () => {
    const r = round(6, {}, seededRng(3));
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    writeAll(r, ids);
    r.ctx.finishCountdown();
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      seen.push(r.currentAuthor());
      r.ctx.advance(15_000);
      r.ctx.advance(5_000);
    }
    expect([...seen].sort()).toEqual(ids);
    expect(seen).not.toEqual(ids);
    expect(r.ctx.ended).toBe(true);
  });

  it("manche écourtée en plein vote : les citations non jouées sont listées sans votes", () => {
    const r = round(3);
    writeAll(r, ["p1", "p2", "p3"]);
    r.ctx.finishCountdown();
    const res = r.finish().results as Results;
    expect(res.quotes).toHaveLength(3);
    expect(res.quotes.every((q) => !q.played)).toBe(true);
    expect(res.trickster).toBeNull();
  });

  it("à 2 joueurs : une seule cible possible, ça marche", () => {
    const r = round(2);
    writeAll(r, ["p1", "p2"]);
    r.ctx.finishCountdown();
    const author = r.currentAuthor();
    const other = author === "p1" ? "p2" : "p1";
    r.guess(other, author);
    expect(r.pub().step).toBe("reveal");
    expect(r.finish().scores).toEqual({ [other]: 100 });
  });
});

describe("qui-a-dit : à travers le moteur", () => {
  it("une manche complète, des chronos aux points cumulés", () => {
    const cfg = game.configSchema.parse({ consignes: ["Ta résolution ?"], duree_vote: 10, duree_revelation: 2 });
    const t = createTestEngine({ games: [{ game, cfg }], players: 3, settings: { introSeconds: 1 } });
    t.engine.setSetup({ counts: { "qui-a-dit": 1 } });
    t.engine.start();
    t.clock.advance(1_000);
    const snap = () => t.engine.snapshot(null).round!;
    const pub = () => snap().public as Pub;
    expect(pub().step).toBe("write");
    expect(snap().timerTotalMs).toBe(60_000);

    for (const id of t.ids) t.engine.input(id, { text: `citation de ${id}` });
    t.clock.advance(GRACE_SECONDS * 1000);
    expect(pub().step).toBe("guess");
    expect(snap().timerTotalMs).toBe(10_000);

    for (let i = 0; i < 3; i++) {
      const author = t.ids.find((id) => pub().quote!.endsWith(id))!;
      for (const v of t.ids.filter((id) => id !== author)) t.engine.input(v, { target: author });
      expect(pub().step).toBe("reveal");
      expect(pub().authorId).toBe(author);
      t.clock.advance(2_000);
    }
    const state = t.engine.snapshot(null);
    expect(state.phase).toBe("results");
    expect(state.round!.deltas).toEqual({ [t.ids[0]!]: 200, [t.ids[1]!]: 200, [t.ids[2]!]: 200 });
    expect(t.engine.snapshot(t.ids[0]!).me!.private).toMatchObject({ text: `citation de ${t.ids[0]}` });
  });
});
