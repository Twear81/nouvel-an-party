import { describe, expect, it } from "bun:test";
import { cleanText, endWhenAllDone, playerIds, shuffle, startGraceOnce } from "../../src/minigames/helpers";
import { tieRanks } from "../../src/shared/ranking";

const fakeCtx = (ids: string[], connected: string[]) => {
  let ended = 0;
  return {
    players: ids.map((id) => ({ id })) as any,
    isConnected: (id: string) => connected.includes(id),
    end: () => void ended++,
    get ended() {
      return ended;
    },
  };
};

describe("endWhenAllDone", () => {
  it("termine quand tous les connectés sont servis, sans attendre les déconnectés", () => {
    const ctx = fakeCtx(["a", "b", "c"], ["a", "b"]);
    endWhenAllDone(ctx, (id) => id === "a");
    expect(ctx.ended).toBe(0);
    endWhenAllDone(ctx, (id) => id !== "c");
    expect(ctx.ended).toBe(1);
  });
  it("ne termine rien si personne n'est connecté", () => {
    const ctx = fakeCtx(["a"], []);
    endWhenAllDone(ctx, () => true);
    expect(ctx.ended).toBe(0);
  });
  it("playerIds liste les ids", () => {
    expect(playerIds(fakeCtx(["a", "b"], []))).toEqual(["a", "b"]);
  });
});

describe("tieRanks", () => {
  it("donne 1, 1, 3 aux ex æquo", () => {
    expect(tieRanks([1, 1, 2, 3, 3, 3, 9], (x) => x)).toEqual([1, 1, 3, 4, 4, 4, 7]);
    expect(tieRanks([], (x: number) => x)).toEqual([]);
  });
});

describe("shuffle", () => {
  it("ne modifie pas l'entrée et garde les éléments", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, () => 0.3);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(src);
  });
});

describe("cleanText", () => {
  it("réduit les espaces et retire les caractères de contrôle", () => {
    expect(cleanText("  salut   les\n amis \u0007", 80)).toBe("salut les amis");
  });
  it("coupe à la longueur max (en caractères, emoji compris)", () => {
    expect(cleanText("x".repeat(200), 80)).toHaveLength(80);
    expect(cleanText("😀😀😀😀", 2)).toBe("😀😀");
  });
  it("renvoie une chaîne vide pour un non-texte", () => {
    expect(cleanText(42, 80)).toBe("");
    expect(cleanText(undefined)).toBe("");
  });
});

describe("startGraceOnce", () => {
  it("ne lance le countdown qu'une fois jusqu'à la remise à zéro", () => {
    const calls: number[] = [];
    const ctx = { countdown: (s: number, _f: () => void) => void calls.push(s) };
    const state = { graceStarted: false };
    expect(startGraceOnce(state, ctx, 2, () => {})).toBe(true);
    expect(startGraceOnce(state, ctx, 2, () => {})).toBe(false);
    expect(calls).toEqual([2]);
    state.graceStarted = false;
    expect(startGraceOnce(state, ctx, 3, () => {})).toBe(true);
    expect(calls).toEqual([2, 3]);
  });
});
