// Rang d'un joueur dans un classement trié par score décroissant : classement « standard »
// (1, 2, 3, 3, 5) — les ex æquo partagent le rang du premier d'entre eux.
export function rankOf(sorted: { score: number }[], i: number): number {
  return sorted.findIndex((p) => p.score === sorted[i]!.score) + 1;
}
