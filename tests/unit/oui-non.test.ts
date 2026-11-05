import { describe, expect, it } from "bun:test";
import ouiNon, { type Pub, type Priv, type Results } from "../../src/minigames/oui-non/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = ouiNon;

/** rng fixe à 0.5 avec 3 joueurs → le joueur ciblé est toujours p2 (index 1). */
function round(text: string, nPlayers = 3, cfgExtra: Record<string, unknown> = {}) {
  const cfg = game.configSchema.parse({ questions: ["q"], ...cfgExtra });
  const ctx = makeCtx(cfg, makePlayers(nPlayers), () => 0.5);
  const state = game.start({ text }, ctx);
  const answer = (id: string, a: unknown) => game.input(state, id, { answer: a }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, answer, finish };
}

const TARGETED = "Est-ce que {joueur} aime l'ananas ?";
const PLAIN = "L'ananas sur la pizza ?";

describe("oui-non : config et démarrage", () => {
  it("valeurs par défaut et questions obligatoires", () => {
    const cfg = game.configSchema.parse({ questions: ["q"] });
    expect(cfg).toMatchObject({ duree: 20, points: { bonne_reponse: 100, cible: 0 } });
    expect(game.configSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("remplace {joueur} par le pseudo du joueur tiré et fixe targetId", () => {
    const { state } = round("{joueur} a-t-il peur ? Oui, {joueur} a peur.");
    expect(state.targetId).toBe("p2");
    expect(state.question).toBe("Joueur2 a-t-il peur ? Oui, Joueur2 a peur.");
  });

  it("sans {joueur}, pas de cible", () => {
    const { state } = round(PLAIN);
    expect(state).toMatchObject({ targetId: null, question: PLAIN });
  });

  it("vues publique et privée", () => {
    const { ctx, state, answer } = round(TARGETED);
    answer("p1", true);
    expect(game.publicView(state, ctx) as Pub).toEqual({ question: "Est-ce que Joueur2 aime l'ananas ?", targetId: "p2", answeredIds: ["p1"] });
    expect(game.privateView!(state, "p1", ctx) as Priv).toEqual({ answer: true, isTarget: false });
    expect(game.privateView!(state, "p2", ctx) as Priv).toEqual({ answer: null, isTarget: true });
  });
});

describe("oui-non : réponses", () => {
  it("ignore les payloads invalides", () => {
    const { ctx, state, answer } = round(PLAIN);
    for (const p of [null, undefined, "oui", {}, { answer: "true" }, { answer: 1 }, { answer: null }]) game.input(state, "p1", p, ctx);
    answer("p1", undefined);
    expect(state.answers.size).toBe(0);
    expect(ctx.ended).toBe(false);
  });

  it("on peut changer sa réponse", () => {
    const { answer, finish } = round(PLAIN);
    answer("p1", true);
    answer("p1", false);
    expect((finish().results as Results).no).toEqual(["p1"]);
  });

  it("fin anticipée quand tout le monde a répondu", () => {
    const { ctx, answer } = round(PLAIN);
    answer("p1", true);
    answer("p2", false);
    expect(ctx.ended).toBe(false);
    answer("p3", true);
    expect(ctx.ended).toBe(true);
  });
});

describe("oui-non : mode cible", () => {
  it("les joueurs qui devinent la réponse de la cible gagnent, la cible est exclue", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", true); // la cible dit oui
    answer("p1", true);
    answer("p3", false);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "cible", targetId: "p2", truth: true, yes: ["p2", "p1"], no: ["p3"] });
    expect(scores).toEqual({ p1: 100 }); // la cible n'est pas récompensée comme devineuse
  });

  it("la vérité peut être non", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", false);
    answer("p1", true);
    answer("p3", false);
    const { results, scores } = finish();
    expect((results as Results).truth).toBe(false);
    expect(scores).toEqual({ p3: 100 });
  });

  it("points.cible : la cible gagne par personne qui l'a bien devinée", () => {
    const { answer, finish } = round(TARGETED, 4, { points: { bonne_reponse: 100, cible: 25 } });
    // 4 joueurs, rng 0.5 → index 2 → p3
    answer("p3", true);
    answer("p1", true);
    answer("p2", true);
    answer("p4", false);
    const { results, scores } = finish();
    expect((results as Results).targetId).toBe("p3");
    expect(scores).toEqual({ p1: 100, p2: 100, p3: 50 });
  });

  it("personne ne devine bien : la cible gagne 0 point cible et rien n'est attribué", () => {
    const { answer, finish } = round(TARGETED, 3, { points: { bonne_reponse: 100, cible: 25 } });
    answer("p2", true);
    answer("p1", false);
    answer("p3", false);
    expect(finish().scores).toEqual({ p2: 0 });
  });

  it("points.cible à 0 : aucune entrée pour la cible", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", true);
    answer("p1", true);
    expect(finish().scores).toEqual({ p1: 100 });
  });

  it("la cible n'a pas répondu : retombe en mode majorité", () => {
    const { answer, finish } = round(TARGETED);
    answer("p1", true);
    answer("p3", true);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "majorite", targetId: "p2", truth: true });
    expect(scores).toEqual({ p1: 100, p3: 100 });
  });
});

describe("oui-non : mode majorité", () => {
  it("le camp majoritaire gagne", () => {
    const { answer, finish } = round(PLAIN);
    answer("p1", true);
    answer("p2", true);
    answer("p3", false);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "majorite", truth: true, yes: ["p1", "p2"], no: ["p3"], targetId: null });
    expect(scores).toEqual({ p1: 100, p2: 100 });
  });

  it("le non majoritaire gagne aussi", () => {
    const { answer, finish } = round(PLAIN);
    answer("p1", false);
    answer("p2", false);
    answer("p3", true);
    expect(finish().scores).toEqual({ p1: 100, p2: 100 });
  });

  it("égalité : tous ceux qui ont répondu gagnent, truth = null", () => {
    const { answer, finish } = round(PLAIN, 4);
    answer("p1", true);
    answer("p2", false);
    const { results, scores } = finish();
    expect((results as Results).truth).toBeNull();
    expect(scores).toEqual({ p1: 100, p2: 100 });
  });

  it("personne n'a répondu : aucun point", () => {
    const { finish } = round(PLAIN);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "majorite", yes: [], no: [], truth: null });
    expect(scores).toEqual({});
  });

  it("respecte bonne_reponse configuré", () => {
    const { answer, finish } = round(PLAIN, 3, { points: { bonne_reponse: 7, cible: 0 } });
    answer("p1", true);
    expect(finish().scores).toEqual({ p1: 7 });
  });
});

describe("oui-non : via le moteur", () => {
  it("une manche complète avec chrono", () => {
    const cfg = game.configSchema.parse({ duree: 20, questions: [PLAIN] });
    const t = createTestEngine({ games: [{ game, cfg }], players: 3 });
    t.engine.setSetup({ counts: { "oui-non": 1 } });
    t.engine.start();
    t.clock.advance(4000);
    t.engine.input(t.ids[0]!, { answer: true });
    t.engine.input(t.ids[1]!, { answer: true });
    t.clock.advance(19_999);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(1);
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [t.ids[0]!]: 100, [t.ids[1]!]: 100 });
  });
});
