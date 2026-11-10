import { describe, expect, it } from "bun:test";
import { SKINS, isSkinId } from "../../src/shared/skins";

describe("registre des skins", () => {
  it("contient les six univers disponibles, sans doublon", () => {
    expect(SKINS).toHaveLength(6);
    expect(new Set(SKINS).size).toBe(SKINS.length);
    for (const skin of SKINS) expect(isSkinId(skin)).toBe(true);
  });

  it("le thème de base et les habillages retirés ne sont pas des skins", () => {
    for (const value of [null, undefined, "gunz", "nope", "base", 3]) expect(isSkinId(value)).toBe(false);
  });
});
