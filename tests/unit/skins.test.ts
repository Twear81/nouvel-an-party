import { describe, expect, it } from "bun:test";
import { SKINS, isSkinId, skinForRound, type SkinId } from "../../src/shared/skins";

const seq = (total: number, order: readonly SkinId[] = SKINS) => Array.from({ length: total }, (_, i) => skinForRound(order, i, total));

describe("skinForRound", () => {
  it("12 manches / 6 skins : un changement toutes les 2 manches", () => {
    expect(seq(12)).toEqual(SKINS.flatMap((s) => [s, s]));
  });

  it("16 manches / 6 skins : tranches de 2 ou 3, chaque skin passe une fois, dans l'ordre", () => {
    const s = seq(16);
    expect(s[0]).toBe(SKINS[0]);
    expect(s[15]).toBe(SKINS[SKINS.length - 1]);
    expect([...new Set(s)]).toEqual([...SKINS]);
    for (const skin of SKINS) {
      const n = s.filter((x) => x === skin).length;
      expect(n === 2 || n === 3).toBe(true);
    }
  });

  it("3 manches / 6 skins : 3 skins distincts, répartis sur la liste", () => {
    expect(seq(3)).toEqual([SKINS[0], SKINS[2], SKINS[4]]);
  });

  it("1 manche : premier skin ; 1 seul skin : toujours lui", () => {
    expect(seq(1)).toEqual([SKINS[0]]);
    expect(seq(5, ["dofus"])).toEqual(Array(5).fill("dofus"));
  });

  it("bornes : index négatif ou trop grand ramenés dans le plan, total nul, ordre vide", () => {
    expect(skinForRound(SKINS, -3, 10)).toBe(SKINS[0]);
    expect(skinForRound(SKINS, 99, 10)).toBe(SKINS[SKINS.length - 1]);
    expect(skinForRound(SKINS, 4, 0)).toBe(SKINS[0]);
    expect(skinForRound([], 2, 10)).toBe(SKINS[0]);
  });

  it("isSkinId", () => {
    expect(isSkinId("dofus")).toBe(true);
    expect(isSkinId("nope")).toBe(false);
    expect(isSkinId("gunz")).toBe(false);
    expect(isSkinId(3)).toBe(false);
  });
});
