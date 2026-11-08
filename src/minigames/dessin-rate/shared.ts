// Format des dessins, partagé par le serveur (validation) et les écrans (rendu, tracé).
// Un dessin = une liste de traits. Coordonnées entières normalisées 0..1000 (page carrée),
// couleur = index dans la palette (feutres du thème : pen-0…pen-4), épaisseur = index (0 fin, 1 épais).

/** Une page carrée : x et y vont de 0 à GRID. */
export const GRID = 1000;
/** Nombre de couleurs de la palette (index 0..PALETTE-1). */
export const PALETTE = 5;
/** Épaisseurs (en unités de la grille) : index 0 = fin, 1 = épais. */
export const WIDTHS = [14, 30] as const;

/** Bornes de validation (le téléphone s'y plie aussi : il arrête de tracer au-delà). */
export const MAX_STROKES = 80;
export const MAX_POINTS_PER_STROKE = 800;
export const MAX_POINTS = 2400;
/** Écart minimal (unités de la grille) entre deux points d'un même trait côté téléphone. */
export const MIN_STEP = 8;

export interface Stroke {
  /** index de couleur */
  c: number;
  /** index d'épaisseur */
  w: number;
  /** x0, y0, x1, y1… (entiers 0..GRID) */
  p: number[];
}

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/**
 * Valide un dessin venu du réseau. Renvoie les traits (copie propre, rien d'autre que c/w/p)
 * ou `null` si quoi que ce soit est invalide ou trop gros : le tout est alors ignoré.
 */
export function cleanStrokes(raw: unknown): Stroke[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_STROKES) return null;
  const out: Stroke[] = [];
  let total = 0;
  for (const s of raw) {
    if (typeof s !== "object" || s === null) return null;
    const { c, w, p } = s as { c?: unknown; w?: unknown; p?: unknown };
    if (!isInt(c, 0, PALETTE - 1) || !isInt(w, 0, WIDTHS.length - 1)) return null;
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0 || p.length / 2 > MAX_POINTS_PER_STROKE) return null;
    total += p.length / 2;
    if (total > MAX_POINTS) return null;
    for (const v of p) if (!isInt(v, 0, GRID)) return null;
    out.push({ c, w, p: p.slice() });
  }
  return out;
}

/** Dessin vide (rien dessiné) : « page blanche ». */
export const isBlank = (strokes: Stroke[]) => strokes.length === 0;

export type Difficulty = "facile" | "moyen" | "difficile";
export const DIFFICULTIES: Difficulty[] = ["facile", "moyen", "difficile"];
