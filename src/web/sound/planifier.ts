// Planification pure des sons calés sur l'horloge du serveur (révélations). Testable sans navigateur.
import type { NomSon } from "../theme/sons/catalogue";
import type { PlayOptions } from "./engine";

/** Retard toléré au montage : au-delà (rechargement de la TV en pleine révélation), on ne rejoue pas le son. */
export const RETARD_TOLERE_MS = 300;

export interface SonPlanifie {
  /** Heure serveur (ms) du son. */
  heure: number;
  nom: NomSon;
  options?: PlayOptions;
}

/** Délai (ms) avant `heure`, ou null si l'instant est déjà passé de plus de `tolerance`. */
export function delaiAvant(heure: number, maintenant: number, tolerance = RETARD_TOLERE_MS): number | null {
  const delai = heure - maintenant;
  return delai < -tolerance ? null : Math.max(0, delai);
}

/** Transforme une liste « à N secondes après `depuisMs` » en sons à heure absolue. */
export const chronologie = (depuisMs: number, liste: readonly { à: number; son: NomSon; options?: PlayOptions }[]): SonPlanifie[] =>
  liste.map((e) => ({ heure: depuisMs + e.à * 1000, nom: e.son, options: e.options }));
