import { describe, expect, test } from "bun:test";
import { AXIS_W_REM, LABEL_W_REM, layoutLanes } from "../../src/minigames/compte-a-rebours/layout";

function noOverlap(entries: { id: string; px: number }[]) {
  const placed = layoutLanes(entries);
  for (const a of placed) {
    expect(a.from).toBeGreaterThanOrEqual(-0.01);
    expect(a.to).toBeLessThanOrEqual(AXIS_W_REM + 0.01);
    expect(a.to - a.from).toBeCloseTo(LABEL_W_REM, 5);
    for (const b of placed) if (a !== b && a.lane === b.lane) expect(a.from >= b.to || b.from >= a.to).toBe(true);
  }
  return placed;
}

describe("étages des résultats (compte à rebours)", () => {
  test("8 joueurs collés à ±0,1 s : aucune étiquette ne se chevauche", () => {
    const px = (ms: number) => AXIS_W_REM / 2 + (ms / 1500) * (AXIS_W_REM / 2) * 0.96;
    const placed = noOverlap(Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, px: px(-100 + i * 28) })));
    expect(placed).toHaveLength(8);
  });
  test("joueurs aux bords de l'axe", () => {
    noOverlap([{ id: "a", px: 0.5 }, { id: "b", px: 1 }, { id: "c", px: AXIS_W_REM - 0.5 }, { id: "d", px: AXIS_W_REM - 2 }, { id: "e", px: AXIS_W_REM / 2 }]);
  });
  test("espacés : tous au premier étage", () => {
    const placed = noOverlap([{ id: "a", px: 5 }, { id: "b", px: 36 }]);
    expect(placed.every((p) => p.lane === 0)).toBe(true);
  });
  test("positions identiques", () => {
    noOverlap([{ id: "a", px: 38 }, { id: "b", px: 38 }, { id: "c", px: 38 }]);
  });
});
