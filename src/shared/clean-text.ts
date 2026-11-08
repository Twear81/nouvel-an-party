// Nettoyage d'une saisie libre, identique côté serveur (validation) et côté téléphone (comparaison avec ce qui est envoyé).

/** Espaces réduits, caractères de contrôle retirés, coupé à `max` caractères (points de code). Non-chaîne = chaîne vide. */
export function cleanText(raw: unknown, max = Infinity): string {
  if (typeof raw !== "string") return "";
  return Array.from(raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim())
    .slice(0, max)
    .join("")
    .trim();
}
