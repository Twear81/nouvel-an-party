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
