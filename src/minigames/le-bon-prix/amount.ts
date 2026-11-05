// Montants du "Bon prix" : saisie au pavé numérique (texte "12,5"), conversion en centimes, affichage en euros.
// Fichier sans React : partagé par le serveur, les écrans et les tests.

/** Plus gros montant accepté (centimes) : 999 999,99 €. */
export const MAX_CENTS = 99_999_999;
const MAX_INT_DIGITS = 6;

/** Applique une touche ("0"-"9", ",", "back") au texte en cours de saisie. */
export function pressKey(draft: string, key: string): string {
  if (key === "back") return draft.slice(0, -1);
  if (key === ",") return draft.includes(",") ? draft : draft === "" ? "0," : `${draft},`;
  if (!/^\d$/.test(key)) return draft;
  const [int = "", dec] = draft.split(",");
  if (dec !== undefined) return dec.length >= 2 ? draft : draft + key;
  if (int === "0") return key; // pas de zéro en tête
  return int.length >= MAX_INT_DIGITS ? draft : draft + key;
}

/** "12,5" → 1250 ; texte vide → null. */
export function draftToCents(draft: string): number | null {
  if (draft === "") return null;
  const [int = "0", dec = ""] = draft.split(",");
  return Number(int || "0") * 100 + Number(dec.padEnd(2, "0"));
}

/** 1250 → "12,5" ; 1200 → "12". */
export function centsToDraft(cents: number): string {
  const int = Math.floor(cents / 100);
  const dec = String(cents % 100).padStart(2, "0").replace(/0+$/, "");
  return dec === "" ? String(int) : `${int},${dec}`;
}

const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Texte en cours de saisie, avec espaces entre les milliers : "1234,5" → "1 234,5". */
export function formatDraft(draft: string): string {
  const [int = "", ...rest] = draft.split(",");
  return rest.length ? `${group(int)},${rest.join("")}` : group(int);
}

/** 1250 → "12,50 €" ; 1200 → "12 €" ; 123456 → "1 234,56 €". */
export function formatCents(cents: number): string {
  const int = Math.floor(Math.abs(cents) / 100);
  const dec = Math.abs(cents) % 100;
  return `${cents < 0 ? "-" : ""}${group(String(int))}${dec ? `,${String(dec).padStart(2, "0")}` : ""} €`;
}
