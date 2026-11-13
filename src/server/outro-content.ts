// Contenu des bonus de la cérémonie (config/outro.yaml) : textes, emojis, activation de chaque catégorie.
// La LOGIQUE de calcul de chaque catégorie est dans le code (engine/awards.ts), indexée par ces ids.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

export interface AwardCategoryContent {
  id: string;
  titre: string;
  phrase: string;
  emoji: string;
}

/** Catégories connues (ordre canonique) avec leurs textes par défaut. */
export const DEFAULT_AWARD_CATEGORIES: AwardCategoryContent[] = [
  { id: "duo-improbable", emoji: "🧲", titre: "Duo improbable", phrase: "Ont passé une heure ensemble sans partager une seule opinion." },
  { id: "merci-travaux", emoji: "🏗️", titre: "Merci pour les travaux", phrase: "Sans fondations, aucun podium." },
  { id: "talent-incompris", emoji: "🎨", titre: "Le talent incompris", phrase: "Le public n'était pas prêt." },
  { id: "craquage-dos", emoji: "🦴", titre: "Le craquage de dos", phrase: "Un petit crac et tout se remet en place." },
  { id: "roi-manches", emoji: "👑", titre: "Roi des manches", phrase: "Le plus de victoires, le moins de modestie." },
  { id: "manche-de-sa-vie", emoji: "🚀", titre: "La manche de sa vie", phrase: "Un sommet qu'on n'atteint qu'une fois." },
  { id: "escargot", emoji: "🐌", titre: "L'escargot", phrase: "Il réfléchit. Longuement. Très longuement." },
  { id: "chou-fleur", emoji: "🥦", titre: "Le chou-fleur d'or", phrase: "Ni premier ni dernier : le roi du milieu." },
  { id: "k-style", emoji: "⚡", titre: "Le K-Style", phrase: "Des doigts qui ne s'arrêtent jamais." },
  { id: "indecis", emoji: "🤔", titre: "L'indécis", phrase: "A changé d'avis plus vite que son ombre." },
  { id: "geass", emoji: "👁️", titre: "Le Geass", phrase: "Tout le monde l'a désigné. Personne ne sait pourquoi." },
  { id: "cuillere-tiramisu", emoji: "🥄", titre: "La cuillère à tiramisu", phrase: "Il en reste toujours un peu au fond." },
];

const categoryIds = DEFAULT_AWARD_CATEGORIES.map((c) => c.id);

const categorySchema = z.object({
  actif: z.boolean().default(true),
  emoji: z.string().min(1).optional(),
  titre: z.string().min(1).optional(),
  phrase: z.string().min(1).optional(),
}).strict();

export const outroContentSchema = z.object({
  categories: z.record(z.string(), categorySchema).default({}).superRefine((cats, ctx) => {
    for (const id of Object.keys(cats)) {
      if (!categoryIds.includes(id)) {
        ctx.addIssue({ code: "custom", path: [id], message: `catégorie inconnue (attendu : ${categoryIds.join(", ")})` });
      }
    }
  }),
}).strict();

/** Catégories ACTIVES, textes de config appliqués par-dessus les textes par défaut. */
export function resolveAwardCategories(raw: z.infer<typeof outroContentSchema>): AwardCategoryContent[] {
  return DEFAULT_AWARD_CATEGORIES.flatMap((base) => {
    const over = raw.categories[base.id];
    if (over?.actif === false) return [];
    return [{ id: base.id, emoji: over?.emoji ?? base.emoji, titre: over?.titre ?? base.titre, phrase: over?.phrase ?? base.phrase }];
  });
}

/** Lit `config/outro.yaml` (absent = textes par défaut). Les erreurs de saisie sont renvoyées sous forme de messages. */
export function loadOutroContent(configDir: string): { categories: AwardCategoryContent[]; errors: string[] } {
  const file = path.join(configDir, "outro.yaml");
  if (!existsSync(file)) return { categories: resolveAwardCategories({ categories: {} }), errors: [] };
  let data: unknown;
  try {
    data = YAML.parse(readFileSync(file, "utf8")) ?? {};
  } catch (err) {
    return { categories: [], errors: [`${file}\n  → YAML invalide : ${(err as Error).message}`] };
  }
  const res = outroContentSchema.safeParse(data);
  if (res.success) return { categories: resolveAwardCategories(res.data), errors: [] };
  const lines = res.error.issues.map((i) => `  → ${i.path.join(".") || "(racine)"} : ${i.message}`);
  return { categories: [], errors: [`${file}\n${lines.join("\n")}`] };
}
