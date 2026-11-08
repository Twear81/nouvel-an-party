import { describe, expect, it } from "bun:test";
import { endWhenAllDone, playerIds, shuffle } from "../../src/minigames/helpers";
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
