import { describe, expect, it } from "bun:test";
import ceciOuCela, { type Pub, type Priv, type Results } from "../../src/minigames/ceci-ou-cela/game";
import { createTestEngine } from "./helpers/engine-setup";
import { makeCtx, makePlayers } from "./helpers/minigame-ctx";

const game = ceciOuCela;
type Item = { text: string; choices: [string, string]; duration?: number };

/** rng fixe à 0.5 avec 3 joueurs → le joueur ciblé est toujours p2 (index 1). */
function round(text: string, nPlayers = 3, cfgExtra: Record<string, unknown> = {}, choices: [string, string] = ["Oui", "Non"]) {
  const cfg = game.configSchema.parse({ questions: ["q"], ...cfgExtra });
  const ctx = makeCtx(cfg, makePlayers(nPlayers), () => 0.5);
  const state = game.start({ text, choices } as Item, ctx);
  const answer = (id: string, choice: unknown) => game.input(state, id, { choice }, ctx);
  const finish = () => game.finish(state, ctx);
  return { cfg, ctx, state, answer, finish };
}

const TARGETED = "Est-ce que {joueur} aime l'ananas ?";
const PLAIN = "L'ananas sur la pizza ?";

describe("ceci-ou-cela : config et démarrage", () => {
  it("valeurs par défaut et questions obligatoires", () => {
    const cfg = game.configSchema.parse({ questions: ["q"] });
    expect(cfg).toMatchObject({ duree: 20, temps_resultats: 12, choix_par_defaut: ["Oui", "Non"], points: { bonne_reponse: 100, cible: 0 } });
    expect(game.configSchema.safeParse({ questions: [] }).success).toBe(false);
  });

  it("items : texte simple = choix par défaut, objet = choix perso et durée", () => {
    const cfg = game.configSchema.parse({
      questions: ["Simple ?", { texte: "Plutôt…", choix: ["Mer", "Montagne"], duree: 30 }, { texte: "Sans choix ?" }],
    });
    expect(game.items(cfg)).toEqual([
      { text: "Simple ?", choices: ["Oui", "Non"], duration: undefined },
      { text: "Plutôt…", choices: ["Mer", "Montagne"], duration: 30 },
      { text: "Sans choix ?", choices: ["Oui", "Non"], duration: undefined },
    ]);
  });

  it("choix_par_defaut surchargé", () => {
    const cfg = game.configSchema.parse({ choix_par_defaut: ["Vrai", "Faux"], questions: ["q", { texte: "r", choix: ["A", "B"] }] });
    const items = game.items(cfg) as Item[];
    expect(items[0]!.choices).toEqual(["Vrai", "Faux"]);
    expect(items[1]!.choices).toEqual(["A", "B"]);
  });

  it("refuse un nombre de choix différent de 2 ou un choix vide", () => {
    for (const choix of [["A"], ["A", "B", "C"], ["A", ""], []]) {
      expect(game.configSchema.safeParse({ questions: [{ texte: "q", choix }] }).success).toBe(false);
    }
    expect(game.configSchema.safeParse({ choix_par_defaut: ["Seul"], questions: ["q"] }).success).toBe(false);
  });

  it("durée par question prioritaire sur duree", () => {
    const cfg = game.configSchema.parse({ duree: 20, questions: ["q"] });
    expect(game.roundSeconds(cfg, { text: "a", choices: ["Oui", "Non"] } as Item)).toBe(20);
    expect(game.roundSeconds(cfg, { text: "a", choices: ["Oui", "Non"], duration: 45 } as Item)).toBe(45);
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
    const { ctx, state, answer } = round(TARGETED, 3, {}, ["Mer", "Montagne"]);
    answer("p1", 1);
    expect(game.publicView(state, ctx) as Pub).toEqual({
      question: "Est-ce que Joueur2 aime l'ananas ?",
      choices: ["Mer", "Montagne"],
      targetId: "p2",
      answeredIds: ["p1"],
    });
    expect(game.privateView!(state, "p1", ctx) as Priv).toEqual({ choice: 1, isTarget: false });
    expect(game.privateView!(state, "p2", ctx) as Priv).toEqual({ choice: null, isTarget: true });
  });
});

describe("ceci-ou-cela : réponses", () => {
  it("n'accepte que {choice: 0|1}", () => {
    const { ctx, state, answer } = round(PLAIN);
    for (const p of [null, undefined, "oui", {}, { choice: true }, { choice: false }, { choice: "0" }, { choice: 2 }, { choice: -1 }, { choice: null }, { answer: true }]) {
      game.input(state, "p1", p, ctx);
    }
    answer("p1", undefined);
    expect(state.answers.size).toBe(0);
    expect(ctx.ended).toBe(false);
    answer("p1", 0);
    expect(state.answers.get("p1")).toBe(0);
  });

  it("on peut changer sa réponse", () => {
    const { answer, finish } = round(PLAIN);
    answer("p1", 0);
    answer("p1", 1);
    expect((finish().results as Results).picks).toEqual([[], ["p1"]]);
  });

  it("fin anticipée quand tout le monde a répondu", () => {
    const { ctx, answer } = round(PLAIN);
    answer("p1", 0);
    answer("p2", 1);
    expect(ctx.ended).toBe(false);
    answer("p3", 0);
    expect(ctx.ended).toBe(true);
  });
});

describe("ceci-ou-cela : présence", () => {
  it("un déconnecté ne bloque pas la fin anticipée ; sa réponse reste acceptée", () => {
    const { ctx, state, answer } = round(PLAIN);
    answer("p1", 0);
    ctx.setConnected("p3", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(false);
    answer("p2", 1);
    expect(ctx.ended).toBe(true);
    answer("p3", 0); // accepté quand même
    expect(state.answers.get("p3")).toBe(0);
  });

  it("la déconnexion du dernier qui n'avait pas répondu termine la manche tout de suite", () => {
    const { ctx, state, answer } = round(PLAIN);
    answer("p1", 0);
    answer("p2", 1);
    ctx.setConnected("p3", false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(true);
  });

  it("personne de connecté : on n'arrête rien (le chrono s'en charge)", () => {
    const { ctx, state } = round(PLAIN);
    for (const id of ["p1", "p2", "p3"]) ctx.setConnected(id, false);
    game.onPresenceChange!(state, ctx);
    expect(ctx.ended).toBe(false);
  });
});

describe("ceci-ou-cela : mode cible", () => {
  it("les joueurs qui devinent la réponse de la cible gagnent, la cible est exclue", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", 0); // la cible
    answer("p1", 0);
    answer("p3", 1);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "cible", targetId: "p2", winner: 0, picks: [["p2", "p1"], ["p3"]] });
    expect(scores).toEqual({ p1: 100 });
  });

  it("la bonne réponse peut être la 2e", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", 1);
    answer("p1", 0);
    answer("p3", 1);
    const { results, scores } = finish();
    expect((results as Results).winner).toBe(1);
    expect(scores).toEqual({ p3: 100 });
  });

  it("points.cible : la cible gagne par personne qui l'a bien devinée", () => {
    const { answer, finish } = round(TARGETED, 4, { points: { bonne_reponse: 100, cible: 25 } });
    // 4 joueurs, rng 0.5 → index 2 → p3
    answer("p3", 0);
    answer("p1", 0);
    answer("p2", 0);
    answer("p4", 1);
    const { results, scores } = finish();
    expect((results as Results).targetId).toBe("p3");
    expect(scores).toEqual({ p1: 100, p2: 100, p3: 50 });
  });

  it("personne ne devine bien : la cible gagne 0", () => {
    const { answer, finish } = round(TARGETED, 3, { points: { bonne_reponse: 100, cible: 25 } });
    answer("p2", 0);
    answer("p1", 1);
    answer("p3", 1);
    expect(finish().scores).toEqual({ p2: 0 });
  });

  it("points.cible à 0 : aucune entrée pour la cible", () => {
    const { answer, finish } = round(TARGETED);
    answer("p2", 0);
    answer("p1", 0);
    expect(finish().scores).toEqual({ p1: 100 });
  });

  it("la cible n'a pas répondu : retombe en mode majorité", () => {
    const { answer, finish } = round(TARGETED);
    answer("p1", 0);
    answer("p3", 0);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "majorite", targetId: "p2", winner: 0 });
    expect(scores).toEqual({ p1: 100, p3: 100 });
  });
});

describe("ceci-ou-cela : mode majorité", () => {
  it("le camp majoritaire gagne", () => {
    const { answer, finish } = round(PLAIN);
    answer("p1", 0);
    answer("p2", 0);
    answer("p3", 1);
    const { results, scores } = finish();
    expect(results).toMatchObject({ mode: "majorite", winner: 0, picks: [["p1", "p2"], ["p3"]], targetId: null, choices: ["Oui", "Non"] });
    expect(scores).toEqual({ p1: 100, p2: 100 });
  });

  it("la 2e réponse peut être majoritaire", () => {
    const { answer, finish } = round(PLAIN, 3, {}, ["Mer", "Montagne"]);
    answer("p1", 1);
    answer("p2", 1);
    answer("p3", 0);
    const { results, scores } = finish();
    expect((results as Results).winner).toBe(1);
    expect(scores).toEqual({ p1: 100, p2: 100 });
  });

  it("égalité : tous ceux qui ont répondu gagnent, winner = null", () => {
    const { answer, finish } = round(PLAIN, 4);
    answer("p1", 0);
    answer("p2", 1);
    const { results, scores } = finish();
    expect((results as Results).winner).toBeNull();
    expect(scores).toEqual({ p1: 100, p2: 100 });
  });

  it("personne n'a répondu : aucun point", () => {
    const { results, scores } = round(PLAIN).finish();
    expect(results).toMatchObject({ mode: "majorite", picks: [[], []], winner: null });
    expect(scores).toEqual({});
  });

  it("respecte bonne_reponse configuré", () => {
    const { answer, finish } = round(PLAIN, 3, { points: { bonne_reponse: 7, cible: 0 } });
    answer("p1", 0);
    expect(finish().scores).toEqual({ p1: 7 });
  });
});

describe("ceci-ou-cela : via le moteur", () => {
  it("une manche complète avec chrono", () => {
    const cfg = game.configSchema.parse({ duree: 20, questions: [{ texte: "Plutôt…", choix: ["Mer", "Montagne"] }] });
    const t = createTestEngine({ games: [{ game, cfg }], players: 3 });
    t.engine.setSetup({ counts: { "ceci-ou-cela": 1 } });
    t.engine.start();
    t.clock.advance(4000);
    t.engine.input(t.ids[0]!, { choice: 0 });
    t.engine.input(t.ids[1]!, { choice: 0 });
    t.clock.advance(19_999);
    expect(t.engine.snapshot(null).phase).toBe("playing");
    t.clock.advance(1);
    const s = t.engine.snapshot(null);
    expect(s.phase).toBe("results");
    expect(s.round!.deltas).toEqual({ [t.ids[0]!]: 100, [t.ids[1]!]: 100 });
  });
});

describe("ceci-ou-cela : progress", () => {
  it("compte les réponses ; un déconnecté reste attendu", () => {
    const { ctx, state, answer } = round(PLAIN, 3);
    expect(game.progress!(state, ctx)).toEqual({ done: 0, expected: 3 });
    answer("p1", 0);
    ctx.setConnected("p3", false);
    expect(game.progress!(state, ctx)).toEqual({ done: 1, expected: 3 });
  });
});
