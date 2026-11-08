// Rang d'un joueur dans un classement trié par score décroissant : classement « standard »
// (1, 2, 3, 3, 5) — les ex æquo partagent le rang du premier d'entre eux.
export function rankOf(sorted: { score: number }[], i: number): number {
  return sorted.findIndex((p) => p.score === sorted[i]!.score) + 1;
}

/**
 * Rangs « olympiques » (1, 1, 3…) d'une liste DÉJÀ triée : les éléments de même clé (`keyOf`) partagent
 * le rang du premier d'entre eux. Les ex æquo doivent être contigus (c'est le cas d'une liste triée par cette clé).
 */
export function tieRanks<T>(sorted: T[], keyOf: (item: T) => number): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, i) => {
    ranks.push(i > 0 && keyOf(sorted[i - 1]!) === keyOf(item) ? ranks[i - 1]! : i + 1);
  });
  return ranks;
}
