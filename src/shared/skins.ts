// Skins : l'habillage visuel change au fil de la partie (TV + téléphones ensemble). Voir docs/skins.md.

/** Ordre de référence (aussi l'ordre par défaut de config/partie.yaml). */
export const SKINS = ["dofus", "overwatch", "league-of-legends", "rocket-league", "gunz", "mario-odyssey", "plague-tale"] as const;
export type SkinId = (typeof SKINS)[number];

export const isSkinId = (v: unknown): v is SkinId => typeof v === "string" && (SKINS as readonly string[]).includes(v);

/**
 * Skin de la manche `roundIndex` (0-based) d'un plan de `total` manches : les skins de `order` se partagent le plan
 * en tranches égales, chacun passe une fois (s'il y a au moins autant de manches que de skins).
 * Ex. 14 manches, 7 skins → un changement toutes les 2 manches.
 */
export function skinForRound(order: readonly SkinId[], roundIndex: number, total: number): SkinId {
  if (order.length === 0) return SKINS[0];
  if (total <= 0) return order[0]!;
  const i = Math.floor((Math.max(0, Math.min(roundIndex, total - 1)) * order.length) / total);
  return order[Math.min(order.length - 1, i)]!;
}
