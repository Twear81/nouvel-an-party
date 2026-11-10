// Skins : l'habillage visuel change au fil de la partie (TV + téléphones ensemble). Voir docs/skins.md.

/** Univers disponibles ; leur ordre de passage est tiré au hasard par le moteur. */
export const SKINS = ["dofus", "overwatch", "league-of-legends", "rocket-league", "mario-odyssey", "plague-tale"] as const;
export type SkinId = (typeof SKINS)[number];

export const isSkinId = (v: unknown): v is SkinId => typeof v === "string" && (SKINS as readonly string[]).includes(v);
