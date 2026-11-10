// Validation des données envoyées par les téléphones (partagée pour afficher les mêmes limites côté UI).
import { z } from "zod";

export const NAME_MAX = 16;

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Choisis un pseudo").max(NAME_MAX, `${NAME_MAX} caractères max`),
  avatar: z.object({ kind: z.literal("preset"), id: z.string().min(1).max(40) }),
  frame: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
