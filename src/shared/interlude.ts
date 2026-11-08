// Combien de manches « interlude » (jeux surprise) une partie contient. Partagé entre le planner (serveur)
// et le lobby (estimation de la durée), pour que l'estimation colle toujours au plan réellement tiré.

export interface InterludeSource {
  id: string;
  /** « Environ une fois toutes les N manches normales ». */
  every: number;
  /** Nombre d'éléments tirables (une question = une manche) : on s'arrête quand il n'y en a plus. */
  available: number;
  /** Interrupteur du lobby. */
  enabled: boolean;
}

/**
 * Nombre de manches de chaque jeu interlude, pour `normalRounds` manches normales :
 * un bloc complet de N manches normales fait surgir UNE manche de ce jeu (plafonné par ses éléments disponibles).
 * Exception : aucune manche normale mais un interlude activé → une seule manche, du premier jeu activé
 * (utile pour une démo ou les tests). Plusieurs jeux interlude : chacun a son propre rythme.
 */
export function interludeCounts(normalRounds: number, sources: InterludeSource[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const usable = sources.filter((s) => s.enabled && s.available > 0);
  for (const s of sources) counts[s.id] = 0;
  if (normalRounds === 0) {
    if (usable[0]) counts[usable[0].id] = 1;
    return counts;
  }
  for (const s of usable) counts[s.id] = Math.min(Math.floor(normalRounds / Math.max(1, s.every)), s.available);
  return counts;
}
