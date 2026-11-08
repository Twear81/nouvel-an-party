// Nombres de l'estimation : saisie au pavé (texte "1969"), conversion et affichage. Sans React : partagé avec les tests.

/** Nombre de chiffres max sur le pavé (999 999 999). */
export const MAX_DIGITS = 9;

/** Applique une touche ("0"-"9" ou "back") au texte en cours de saisie. */
export function pressKey(draft: string, key: string): string {
  if (key === "back") return draft.slice(0, -1);
  if (!/^\d$/.test(key)) return draft;
  if (draft === "0") return key; // pas de zéro en tête
  return draft.length >= MAX_DIGITS ? draft : draft + key;
}

/** "1969" → 1969 ; texte vide → null. */
export const draftToValue = (draft: string): number | null => (draft === "" ? null : Number(draft));

/** 12000 → "12 000" (espace fine insécable). Sous 10 000, pas d'espace : 1969 est une année, pas une quantité. */
export function formatNumber(n: number): string {
  return n >= 10_000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f") : String(n);
}

/** 1969, "ans" → "1969 ans". */
export const withUnit = (n: number, unit: string) => `${formatNumber(n)}${unit ? ` ${unit}` : ""}`;
