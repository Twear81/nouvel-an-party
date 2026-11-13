// Compte à rebours de minuit : calculs d'heure partagés (serveur, tests). Heure locale du PC serveur.

/** Ce que les écrans savent de minuit pendant le compte à rebours puis la célébration. */
export interface MidnightInfo {
  /** Instant de minuit (heure serveur, ms). */
  targetAt: number;
  phase: "countdown" | "celebrate";
  /** Année à fêter (« Bonne année 2027 ! »), déduite de la date de minuit. */
  year: number;
}

/** Heure de minuit en « HH:MM » ou « HH:MM:SS » → secondes depuis 00:00:00, ou null si invalide. */
export function parseClockTime(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [h, min, s] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
  return h < 24 && min < 60 && s < 60 ? h * 3600 + min * 60 + s : null;
}

/** Prochaine occurrence locale : le 1er janvier en mode annuel, sinon aujourd'hui ou demain (répétitions). */
export function nextOccurrence(now: number, time: string, newYearOnly = false): number {
  const secs = parseClockTime(time) ?? 0;
  const d = new Date(now);
  if (newYearOnly) d.setFullYear(d.getFullYear(), 0, 1);
  d.setHours(Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60, 0);
  if (d.getTime() <= now) {
    if (newYearOnly) d.setFullYear(d.getFullYear() + 1);
    else d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

/** Année du nouvel an fêté : celle de minuit, ou de l'année suivante si l'heure choisie est un peu avant minuit. */
export function midnightYear(targetAt: number): number {
  return new Date(targetAt + 6 * 3600_000).getFullYear();
}
