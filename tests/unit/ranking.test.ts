import { describe, expect, test } from "bun:test";
import { rankOf } from "../../src/shared/ranking";

const ranks = (scores: number[]) => {
  const sorted = scores.map((score) => ({ score }));
  return sorted.map((_, i) => rankOf(sorted, i));
};

describe("rankOf", () => {
  test("sans égalité : 1, 2, 3…", () => expect(ranks([30, 20, 10])).toEqual([1, 2, 3]));
  test("ex æquo : 1, 2, 3, 3, 5", () => expect(ranks([300, 250, 200, 200, 100])).toEqual([1, 2, 3, 3, 5]));
  test("égalités multiples", () => expect(ranks([300, 300, 200, 200, 200, 0])).toEqual([1, 1, 3, 3, 3, 6]));
  test("tous à égalité", () => expect(ranks([0, 0, 0])).toEqual([1, 1, 1]));
});
