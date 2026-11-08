// Petits utilitaires réutilisables par les mini-jeux.
import { z } from "zod";
import type { PublicPlayer } from "../shared/types";

export { shuffle } from "../shared/shuffle";

/** Ids de tous les joueurs de la manche. */
export const playerIds = (ctx: { players: PublicPlayer[] }): string[] => ctx.players.map((p) => p.id);

/**
 * Règle « tout le monde a répondu » : vrai quand tous les joueurs CONNECTÉS parmi `ids` sont servis par `done`.
 * Un joueur déconnecté (téléphone planté) ne bloque pas la fin anticipée ; si personne n'est connecté on n'arrête rien
 * (le chrono s'en charge). À rappeler dans `onPresenceChange`.
 */
export function allConnectedDone(ctx: { isConnected: (id: string) => boolean }, ids: string[], done: (id: string) => boolean): boolean {
  const here = ids.filter((id) => ctx.isConnected(id));
  return here.length > 0 && here.every(done);
}

/** Fin anticipée de la manche dès que tous les joueurs connectés sont servis par `done` (voir `allConnectedDone`). */
export function endWhenAllDone(
  ctx: { players: PublicPlayer[]; isConnected: (id: string) => boolean; end: () => void },
  done: (id: string) => boolean,
): void {
  if (allConnectedDone(ctx, playerIds(ctx), done)) ctx.end();
}

/** Une question peut s'écrire en texte simple, ou en objet pour surcharger la durée. */
export const questionSchema = z.union([
  z.string().min(1),
  z.object({ texte: z.string().min(1), duree: z.number().positive().optional() }),
]);
export type QuestionEntry = z.infer<typeof questionSchema>;

export function normalizeQuestion(q: QuestionEntry): { text: string; duration?: number } {
  return typeof q === "string" ? { text: q } : { text: q.texte, duration: q.duree };
}

/** Le texte contient-il le joker {joueur} ? */
export const hasPlayerPlaceholder = (text: string) => text.includes("{joueur}");

/** Remplace {joueur} par le pseudo d'un joueur tiré au sort. */
export function fillPlayer(text: string, players: PublicPlayer[], rng: () => number): { text: string; targetId: string | null } {
  if (!hasPlayerPlaceholder(text) || players.length === 0) return { text, targetId: null };
  const target = players[Math.floor(rng() * players.length)]!;
  return { text: text.replaceAll("{joueur}", target.profile?.name ?? "?"), targetId: target.id };
}

/** Ids ayant la valeur maximale (gère les égalités). */
export function argmaxAll(counts: Record<string, number>): string[] {
  const max = Math.max(0, ...Object.values(counts));
  if (max === 0) return [];
  return Object.keys(counts).filter((k) => counts[k] === max);
}

/**
 * Normalise une réponse libre pour comparer celles des joueurs :
 * minuscules, sans accents ni ponctuation, espaces réduits, sans article au début, sans "s" final.
 * "Les Œufs !" → "oeuf" ; "  du   Beurre" → "beurre"
 */
export function normalizeAnswer(text: string): string {
  let s = text
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  s = s.replace(/^(le|la|les|l|un|une|des|du|de la|de l|de|d)\s+/, "");
  return s
    .split(" ")
    .map((w) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}
