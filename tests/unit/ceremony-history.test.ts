import { describe, expect, it } from "bun:test";
import { sanitizeStats, sanitizeOpinions, sanitizeKeepsakes, pruneKeepsakes, sanitizeHistory } from "../../src/server/engine/history";
import type { Keepsake, RoundSummary } from "../../src/shared/ceremony";
const ids = new Set(["a", "b", "c", "d", "e", "f", "g", "h"]);
const drawing = (playerId: string, score = 0): Keepsake => ({ kind: "dessin", tag: "incompris", playerId, score, label: "Tournesol", strokes: [{ c: 0, w: 0, p: [0, 0, 1000, 1000] }] });
function round(keepsakes: Keepsake[]): RoundSummary { return { gameId: "dessin", participants: [...ids], deltas: {}, scoresAfter: {}, standingsAfter: [...ids], keepsakes }; }
describe("historique de cérémonie borné", () => {
  it("ignore les stats invalides, les inconnus et les champs non déclarés", () => {
    expect(sanitizeStats({ a: { actions: 2, answerChanges: -1, drawings: NaN, reactionMs: [10, Infinity, -1], secret: 12 }, inconnu: { actions: 5 } }, ids)).toEqual({ a: { actions: 2, reactionMs: [10] } });
    expect(sanitizeStats(null, ids)).toBeUndefined();
  });
  it("limite les réactions et les tables d'avis, ignore les avis seuls", () => {
    expect(sanitizeStats({ a: { reactionMs: Array(1000).fill(100) } }, ids)?.a?.reactionMs).toHaveLength(200);
    expect(sanitizeOpinions(Array(1000).fill({ a: "oui", b: "non" }), ids)).toHaveLength(60);
    expect(sanitizeOpinions([{ a: "oui", inconnu: "non" }], ids)).toBeUndefined();
  });
  it("valide strictement les traits et ignore les objets inconnus", () => {
    expect(sanitizeKeepsakes([{ ...drawing("a"), strokes: [{ c: 99, w: 0, p: [0, 0] }] }, { kind: "secret", score: 1 }], ids)).toBeUndefined();
    expect(sanitizeKeepsakes([{ ...drawing("a"), score: -1 }], ids)).toBeUndefined();
    expect(sanitizeKeepsakes([drawing("inconnu")], ids)).toBeUndefined();
  });
  it("conserve les huit incompris en plus des trois souvenirs généraux", () => {
    const general: Keepsake[] = Array.from({ length: 5 }, (_, i) => ({ kind: "objet", label: `Objet ${i}`, emoji: "🎁", detail: "100 €", score: i }));
    const kept = sanitizeKeepsakes([...general, ...[...ids].map((id) => drawing(id))], ids)!;
    expect(kept).toHaveLength(11);
    expect(kept.filter((k) => k.kind === "dessin")).toHaveLength(8);
  });
  it("garde le dessin le moins voté par joueur et borne à trois les souvenirs généraux par jeu", () => {
    const a = round([drawing("a", 0), { kind: "post-it", text: "Avant", score: 1 }]);
    const b = round([drawing("a", 3), drawing("b", 0), ...Array.from({ length: 4 }, (_, i): Keepsake => ({ kind: "post-it", text: `Après ${i}`, score: 2 + i }))]);
    const pruned = pruneKeepsakes([a, b]);
    const all = pruned.flatMap((r) => r.keepsakes ?? []);
    expect(all.filter((k) => k.kind === "dessin")).toHaveLength(2);
    expect(all.find((k) => k.kind === "dessin" && k.playerId === "a")?.score).toBe(0);
    expect(all.filter((k) => k.kind === "post-it")).toHaveLength(3);
    expect(a.keepsakes).toHaveLength(2);
  });
  it("relit une ancienne sauvegarde sans historique", () => {
    expect(sanitizeHistory(undefined)).toEqual([]);
    expect(sanitizeHistory([null, { gameId: "faux" }])).toEqual([]);
  });
});

it("borne réellement chaque dessin à 24 Ko UTF-8", () => {
  // 80 traits de 30 points respectent les bornes du jeu mais le souvenir JSON dépasse 24 Ko.
  const strokes = Array.from({ length: 80 }, () => ({ c: 0, w: 0, p: Array(60).fill(1000) }));
  const large = { ...drawing("a"), strokes };
  expect(sanitizeKeepsakes([large], ids)).toBeUndefined();
  const unicode = { ...drawing("a"), label: "é".repeat(60), strokes: Array.from({ length: 80 }, () => ({ c: 0, w: 0, p: [1000, 1000] })) };
  // Chercher un dessin valide situé juste sous le plafond en caractères, au-dessus en octets.
  for (let i = 0; i < 2320; i++) {
    const stroke = unicode.strokes[i % 80]!;
    stroke.p.push(1000, 1000);
    const json = JSON.stringify(unicode);
    if (json.length <= 24 * 1024 && new TextEncoder().encode(json).byteLength > 24 * 1024) {
      expect(sanitizeKeepsakes([unicode], ids)).toBeUndefined();
      return;
    }
  }
  throw new Error("Dessin de frontière UTF-8 introuvable");
});
