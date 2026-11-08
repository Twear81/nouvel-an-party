// Fonctions pures partagées par le serveur (game.ts) et les écrans (views.tsx) : classement et formats d'affichage.

/** Écart affiché au centième de seconde : deux joueurs au même centième sont à égalité. */
export const errorCs = (signedMs: number) => Math.round(Math.abs(signedMs) / 10);

export interface Ranked<T> {
  item: T;
  rank: number; // 1 = meilleur ; les égalités partagent le meilleur rang (1, 1, 3…)
  errorMs: number;
}

/** Trie du plus proche de la cible au plus éloigné. `signedOf` = temps mesuré − cible (négatif = trop tôt). */
export function rankByError<T>(entries: T[], signedOf: (e: T) => number): Ranked<T>[] {
  const sorted = entries
    .map((item) => ({ item, errorMs: Math.abs(signedOf(item)) }))
    .sort((a, b) => errorCs(a.errorMs) - errorCs(b.errorMs) || a.errorMs - b.errorMs);
  return sorted.map((s) => {
    const first = sorted.findIndex((o) => errorCs(o.errorMs) === errorCs(s.errorMs));
    return { ...s, rank: first + 1 };
  });
}

/** 7340 → "7,34" (virgule française, toujours 2 décimales). */
export const fmtSeconds = (ms: number) => (Math.max(0, ms) / 1000).toFixed(2).replace(".", ",");

/** Même chose avec deux chiffres minimum devant la virgule : "07,34" (look de compteur numérique). */
export const fmtCounter = (ms: number) => fmtSeconds(ms).padStart(5, "0");

/** +0,23 / −0,08 (vrai signe moins) */
export const fmtSigned = (signedMs: number) => `${signedMs < 0 ? "−" : "+"}${fmtSeconds(Math.abs(signedMs))}`;

export type Quality = "pile" | "great" | "ok" | "far";
export function quality(signedMs: number): Quality {
  const cs = errorCs(signedMs);
  return cs === 0 ? "pile" : cs <= 15 ? "great" : cs <= 60 ? "ok" : "far";
}
// Classes écrites en toutes lettres pour que Tailwind les repère.
export const QUALITY_TEXT: Record<Quality, string> = { pile: "text-good", great: "text-good", ok: "text-accent", far: "text-bad" };

/** 8 → "8,0" ; 7.5 → "7,5" (la cible est au demi-seconde). */
export const fmtCible = (cibleS: number) => cibleS.toFixed(1).replace(".", ",");
