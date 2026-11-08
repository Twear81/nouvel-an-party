// Typographie française pour l'affichage du CONTENU (yaml, textes tapés par les joueurs) : espace insécable avant
// « ! ? ; : » et à l'intérieur des guillemets « », pour qu'un signe ne se retrouve jamais seul en début de ligne.
// La longueur ne change que si l'espace manquait (« Santé! » → « Santé ! »). À appliquer à l'affichage uniquement.

const NBSP = " ";

export function typo(text: string): string;
export function typo(text: string | null | undefined): string | undefined;
export function typo(text: string | null | undefined): string | undefined {
  if (text == null) return undefined;
  return (
    text
      // « ! ? ; : » : espace insécable devant, sauf dans « 12:30 » ou « https://… » (suivi d'une lettre/chiffre/barre).
      .replace(/([^\s!?;:])[   ]?([!?;:])(?=$|[\s!?;:.…»”")])/g, `$1${NBSP}$2`)
      .replace(/«[   ]*/g, `«${NBSP}`)
      .replace(/[   ]*»/g, `${NBSP}»`)
  );
}

/**
 * Taille de police (rem) pour qu'un texte tienne sur `lines` lignes de `availRem` de large.
 * `em` = largeur moyenne d'une lettre en em (0.8 pour la police d'affichage Bungee, 0.5 pour un serif).
 */
export const fit = (text: string, availRem: number, min: number, max: number, lines = 1, em = 0.8) =>
  Math.max(min, Math.min(max, (availRem * lines) / (Math.max(text.length, 1) * em)));

/** 1 → "1er", 2 → "2e". */
export const ordinal = (rank: number) => (rank === 1 ? "1er" : `${rank}e`);
