// Chronos d'étape (ctx.countdown) : un mini-jeu en plusieurs étapes dans une même manche.
import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { defineMiniGame } from "../../src/minigames/contract";
import { createTestEngine, startRounds } from "./helpers/engine-setup";

// Jeu à 2 étapes : "ecrire" (10 s) puis "voter" (5 s), puis fin de manche.
const twoSteps = defineMiniGame<{}, number, { step: string }>({
  id: "deux-etapes",
  configSchema: z.object({}),
  name: () => "Deux étapes",
  description: () => "",
  items: () => [1, 2, 3],
  roundSeconds: () => null,
  estimateSeconds: () => 20,
  start: () => ({ step: "attente" }),
  onPlay(state, ctx) {
    state.step = "ecrire";
    ctx.countdown(10, () => {
      state.step = "voter";
      ctx.countdown(5);
    });
  },
  input(state, _id, payload, ctx) {
    if (payload === "stop") ctx.clearCountdown();
    if (payload === "fin") ctx.end();
  },
  publicView: (state) => state.step,
  finish: () => ({ results: null, scores: {} }),
});

function setup() {
  const t = createTestEngine({ games: [{ game: twoSteps, cfg: {} }], settings: { introSeconds: 1 } });
  t.engine.setSetup({ counts: { "deux-etapes": 1 } });
  startRounds(t.engine);
  t.clock.advance(1000); // fin de l'intro
  return t;
}

describe("ctx.countdown", () => {
  it("enchaîne les étapes puis termine la manche", () => {
    const t = setup();
    let round = t.engine.snapshot(null).round!;
    expect(round.public).toBe("ecrire");
    expect(round.timerTotalMs).toBe(10_000);
    expect(round.deadline).toBe(t.clock.now() + 10_000);

    t.clock.advance(10_000);
    round = t.engine.snapshot(null).round!;
    expect(round.public).toBe("voter");
    expect(round.timerTotalMs).toBe(5_000);
    expect(t.engine.snapshot(null).phase).toBe("playing");

    t.clock.advance(5_000);
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("pause et +10 s s'appliquent au chrono d'étape", () => {
    const t = setup();
    t.engine.pause();
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).round!.pausedRemainingMs).toBe(10_000);
    t.engine.resume();
    t.engine.addTime(10);
    expect(t.engine.snapshot(null).round!.timerTotalMs).toBe(20_000);
    t.clock.advance(19_999);
    expect(t.engine.snapshot(null).round!.public).toBe("ecrire");
    t.clock.advance(1);
    expect(t.engine.snapshot(null).round!.public).toBe("voter");
  });

  it("clearCountdown masque le chrono et n'appelle pas la suite", () => {
    const t = setup();
    t.engine.input(t.ids[0]!, "stop");
    const round = t.engine.snapshot(null).round!;
    expect(round.deadline).toBeNull();
    expect(round.timerTotalMs).toBeNull();
    t.clock.advance(60_000);
    expect(t.engine.snapshot(null).round!.public).toBe("ecrire");
    t.engine.input(t.ids[0]!, "fin");
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("Passer pendant une étape termine la manche", () => {
    const t = setup();
    t.engine.skip();
    expect(t.engine.snapshot(null).phase).toBe("results");
  });

  it("un chrono simple (roundSeconds) remplit aussi timerTotalMs", () => {
    const t = createTestEngine({ settings: { introSeconds: 1 } });
    startRounds(t.engine);
    t.clock.advance(1000);
    expect(t.engine.snapshot(null).round!.timerTotalMs).not.toBeNull();
  });
});
