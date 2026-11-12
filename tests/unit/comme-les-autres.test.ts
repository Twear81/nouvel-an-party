import { describe, expect, it } from "bun:test";
import { cleanText } from "../../src/minigames/helpers";
import commeLesAutres, { MAX_LENGTH, groupAnswers, withinOneEdit, type Pub, type Results } from "../../src/minigames/comme-les-autres/game";
import { createTestEngine, startRounds } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = commeLesAutres;
const parse = (extra: Record<string, unknown> = {}) => game.configSchema.parse({ questions: ["Un fruit."], ...extra });

function round(nPlayers = 4, cfgExtra: Record<string, unknown> = {}) {
  const cfg = parse(cfgExtra);
  const ctx = makeCtx(cfg, makePlayers(nPlayers));
  const state = game.start({ text: "Un fruit." }, ctx);
  const answer = (id: string, ...answers: unknown[]) => game.input(state, id, { answers }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, answer, finish };
}

describe("comme-les-autres : config", () => {
  it("applique les valeurs par défaut", () => {
    expect(parse()).toMatchObject({ duree: 30, tolerance_fautes: true, reponses: 1, points: { par_joueur: 50, majorite: 50 } });
  });
  it("exige au moins une question et 1 à 3 réponses", () => {
    expect(game.configSchema.safeParse({ questions: [] }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], reponses: 0 }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], reponses: 4 }).success).toBe(false);
    expect(game.configSchema.safeParse({ questions: ["a"], reponses: 3 }).success).toBe(true);
  });
  it("une question objet peut surcharger la durée", () => {
    const cfg = parse({ questions: ["a", { texte: "b", duree: 12 }] });
    const items = game.items(cfg);
    expect(game.roundSeconds(cfg, items[0]!)).toBe(30);
    expect(game.roundSeconds(cfg, items[1]!)).toBe(12);
  });
});

describe("comme-les-autres : tolérance aux fautes", () => {
  it("withinOneEdit : substitution, insertion, suppression", () => {
    expect(withinOneEdit("champagne", "champagen")).toBe(true); // deux lettres voisines inversées
    expect(withinOneEdit("champagne", "chapmagen")).toBe(false);
    expect(withinOneEdit("champagne", "champagn")).toBe(true);
    expect(withinOneEdit("fromage", "fromages")).toBe(true);
    expect(withinOneEdit("fromage", "fromoge")).toBe(true);
    expect(withinOneEdit("fromage", "fromoga")).toBe(false);
    expect(withinOneEdit("abc", "abc")).toBe(true);
  });

  it("fusionne à une lettre près pour les mots de 5 lettres et plus", () => {
    const m = new Map([["p1", ["Mozzarella"]], ["p2", ["Mozarella"]], ["p3", ["Mozzarella"]]]);
    const g = groupAnswers(m, true);
    expect(g).toHaveLength(1);
    expect([...g[0]!.playerIds].sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("ne fusionne pas les mots courts ni les nombres", () => {
    const m = new Map([["p1", ["chat"]], ["p2", ["chap"]], ["p3", ["2025"]], ["p4", ["2026"]]]);
    expect(groupAnswers(m, true)).toHaveLength(4);
  });

  it("peut être désactivée", () => {
    const m = new Map([["p1", ["pomme"]], ["p2", ["pommr"]]]);
    expect(groupAnswers(m, false)).toHaveLength(2);
    expect(groupAnswers(m, true)).toHaveLength(1);
  });

  it("ne chaîne pas de proche en proche", () => {
    // bancel est à 1 de bancal, boncel à 1 de bancel mais à 2 de bancal : pas de fusion en chaîne
    const m = new Map([["p1", ["bancal"]], ["p2", ["bancal"]], ["p3", ["bancel"]], ["p4", ["boncel"]]]);
    const g = groupAnswers(m, true);
    const sizes = g.map((x) => x.playerIds.length).sort();
    expect(sizes).toEqual([1, 3]); // boncel est à 2 de bancal : reste seul
  });
});

describe("comme-les-autres : réponses", () => {
  it("normalise accents, casse, articles et pluriel", () => {
    const { answer, finish } = round(4);
    answer("p1", "Les Œufs !");
    answer("p2", "un oeuf");
    answer("p3", "Oeuf");
    answer("p4", "pomme");
    const r = finish().results as Results;
    expect(r.groups[0]!.playerIds).toEqual(["p1", "p2", "p3"]);
    expect(r.groups[0]!.label).toBe("Oeuf"); // à égalité de fréquence : la saisie la plus courte
    expect(r.groups[1]!.playerIds).toEqual(["p4"]);
  });

  it("garde la graphie la plus fréquente comme libellé", () => {
    const { answer, finish } = round(4);
    answer("p1", "champagne");
    answer("p2", "Champagne");
    answer("p3", "champagne");
    answer("p4", "Champagnes");
    const r = finish().results as Results;
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0]!.label).toBe("Champagne");
  });

  it("limite à 40 caractères, nettoie les espaces et ignore les payloads invalides", () => {
    const { ctx, state, answer } = round(3);
    answer("p1", "  a    b  ".padEnd(100, "z"));
    expect(state.answers.get("p1")![0]!.length).toBe(40);
    expect(cleanText("  tout   seul \n", MAX_LENGTH)).toBe("tout seul");
    for (const payload of [null, undefined, "x", 42, {}, { answers: "pomme" }, { answers: [1, null, {}] }, { answers: ["", "   ", "!!!"] }]) {
      game.input(state, "p2", payload, ctx);
    }
    expect(state.answers.has("p2")).toBe(false);
    expect(ctx.ended).toBe(false);
  });

  it("la première réponse valable est définitive, même si un client tente de modifier ou retirer", () => {
    const { ctx, state, answer, finish } = round(3);
    answer("p1", "pomme");
    answer("p1", "poire");
    expect(state.answers.get("p1")).toEqual(["pomme"]);
    answer("p1", "");
    expect(state.answers.get("p1")).toEqual(["pomme"]);
    expect((finish().results as Results).silentIds).toEqual(["p2", "p3"]);
    expect(ctx.ended).toBe(false);
  });

  it("n'accepte que le nombre de réponses autorisé (doublons comptés une fois)", () => {
    const { state, answer } = round(3, { reponses: 2 });
    answer("p1", "pomme", "Pommes", "poire", "kiwi");
    expect(state.answers.get("p1")).toEqual(["pomme", "poire"]);
    const solo = round(3);
    solo.answer("p1", "pomme", "poire");
    expect(solo.state.answers.get("p1")).toEqual(["pomme"]);
  });

  it("termine la manche quand tout le monde a répondu, pas avant", () => {
    const { ctx, answer } = round(3);
    answer("p1", "a1");
    answer("p2", "b2");
    answer("p1", "c3");
    expect(ctx.ended).toBe(false);
    answer("p3", "d4");
    expect(ctx.ended).toBe(true);
  });

  it("vue publique sans les réponses ; vue privée avec les siennes", () => {
    const { ctx, state, answer } = round(3);
    answer("p1", "secret");
    const pub = game.publicView(state, ctx) as Pub;
    expect(pub).toEqual({ question: "Un fruit.", perPlayer: 1, answeredIds: ["p1"] });
    expect(JSON.stringify(pub)).not.toContain("secret");
    expect(game.privateView!(state, "p1", ctx)).toEqual({ answers: ["secret"] });
    expect(game.privateView!(state, "p2", ctx)).toEqual({ answers: [] });
  });
});

describe("comme-les-autres : présence", () => {
  it("seuls les joueurs connectés comptent pour la fin anticipée", () => {
    const { ctx, state, answer } = round(3);
    ctx.setConnected("p3", false);
    answer("p1", "pomme");
    expect(ctx.ended).toBe(false);
    answer("p2", "poire");
    expect(ctx.ended).toBe(true);
  });

  it("onPresenceChange rejoue la règle quand l'absent part", () => {
    const { ctx, state, answer } = round(3);
    answer("p1", "pomme");
    answer("p2", "poire");
    ctx.setConnected("p3", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(true);
  });
});

describe("comme-les-autres : points", () => {
  it("50 x autres joueurs du groupe + bonus 50 pour le plus grand groupe", () => {
    const { answer, finish } = round(5);
    answer("p1", "pomme");
    answer("p2", "pomme");
    answer("p3", "pomme");
    answer("p4", "kiwi");
    answer("p5", "Kiwis");
    const { results, scores } = finish();
    expect(scores).toEqual({ p1: 150, p2: 150, p3: 150, p4: 50, p5: 50 });
    const r = results as Results;
    expect(r.groups.map((g) => [g.label, g.points, g.biggest])).toEqual([["Pomme", 150, true], ["Kiwi", 50, false]]);
  });

  it("égalité pour le plus grand groupe : bonus pour les deux", () => {
    const { answer, finish } = round(4);
    answer("p1", "a1");
    answer("p2", "a1");
    answer("p3", "b2");
    answer("p4", "b2");
    expect(finish().scores).toEqual({ p1: 100, p2: 100, p3: 100, p4: 100 });
  });

  it("réponses toutes différentes : personne ne marque, pas de bonus", () => {
    const { answer, finish } = round(3);
    answer("p1", "a1");
    answer("p2", "b2");
    answer("p3", "c3");
    const { scores, results } = finish();
    expect(scores).toEqual({});
    expect((results as Results).groups.every((g) => !g.biggest)).toBe(true);
  });

  it("plusieurs réponses : chacune marque indépendamment, un doublon ne compte qu'une fois", () => {
    const { answer, finish } = round(3, { reponses: 3 });
    answer("p1", "pomme", "poire", "pommes");
    answer("p2", "pomme", "kiwi");
    answer("p3", "poire");
    const { scores } = finish();
    // pomme : p1+p2 (taille 2, plus grand ex æquo avec poire) = 50 + 50 ; poire : p1+p3 = 50 + 50
    expect(scores).toEqual({ p1: 200, p2: 100, p3: 100 });
  });

  it("respecte les points configurés et absents = 0", () => {
    const { answer, finish } = round(4, { points: { par_joueur: 10, majorite: 0 } });
    answer("p1", "a1");
    answer("p2", "a1");
    expect(finish().scores).toEqual({ p1: 10, p2: 10 });
  });
});

describe("comme-les-autres : via le moteur", () => {
  it("tout le monde répond → fin anticipée, points dans les deltas", () => {
    const t = createTestEngine({ games: [{ game, cfg: parse() }], players: 3 });
    t.engine.setSetup({ counts: { "comme-les-autres": 1 } });
    startRounds(t.engine);
    t.clock.advance(4000);
    const [a, b, c] = t.ids as [string, string, string];
    t.engine.input(a, { answers: ["Fromage"] });
    t.engine.input(b, { answers: ["le fromage"] });
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.engine.input(c, { answers: ["Beurre"] });
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [a]: 100, [b]: 100 });
  });
});

describe("comme-les-autres : progress", () => {
  it("compte les joueurs ayant répondu, déconnectés compris", () => {
    const { ctx, state, answer } = round(3);
    expect(game.progress!(state, ctx)).toEqual({ done: 0, expected: 3 });
    answer("p1", "pomme");
    ctx.setConnected("p2", false);
    expect(game.progress!(state, ctx)).toEqual({ done: 1, expected: 3 });
  });
});
