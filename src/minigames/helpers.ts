// Petits utilitaires réutilisables par les mini-jeux.
import { z } from "zod";
import type { PublicPlayer } from "../shared/types";

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
