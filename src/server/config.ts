// Lecture et validation de config/partie.yaml et config/minijeux/*.yaml.
// Une erreur de saisie produit un message clair (fichier + champ) au lieu d'un crash.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { serverGames } from "../minigames/registry.server";
import { loadOutroContent, type AwardCategoryContent } from "./outro-content";
import type { LoadedGame } from "./engine/planner";

export const settingsSchema = z.object({
  outro: z.object({
    actif: z.boolean().default(true),
    bonus: z.number().int().min(0).max(12).default(4),
    points_bonus: z.union([z.literal("auto"), z.number().int().min(0).max(100000)]).default("auto"),
  }).default({ actif: true, bonus: 4, points_bonus: "auto" }),
  titre: z.string().default("Soirée du Nouvel An"),
  duree_cible_minutes: z.number().positive().default(60),
  ordre: z.enum(["melange", "groupe"]).default("melange"),
  intro_secondes: z.number().nonnegative().default(4),
  port_http: z.number().int().default(3000),
  port_https: z.number().int().default(3443),
  /** "auto" ou une IP forcée si la détection choisit la mauvaise carte réseau. */
  ip: z.string().default("auto"),
  ouvrir_navigateur: z.boolean().default(true),
  /** Volume général des sons de la TV (0 = muet, 1 = plein). */
  volume_sons: z.number().min(0).max(1).default(0.8),
});
export type Settings = z.infer<typeof settingsSchema>;

const maxRoundsSchema = z.number().int().min(1, "doit être un entier ≥ 1");

export class ConfigError extends Error {}

function readYaml(file: string): unknown {
  try {
    return YAML.parse(readFileSync(file, "utf8")) ?? {};
  } catch (err) {
    throw new ConfigError(`${file}\n  → YAML invalide : ${(err as Error).message}`);
  }
}

function validate<T>(schema: z.ZodType<T>, data: unknown, file: string): T {
  const res = schema.safeParse(data);
  if (res.success) return res.data;
  const lines = res.error.issues.map((i) => `  → ${i.path.join(".") || "(racine)"} : ${i.message}`);
  throw new ConfigError(`${file}\n${lines.join("\n")}`);
}

export function loadConfig(configDir: string): { settings: Settings; games: LoadedGame[]; awardCategories: AwardCategoryContent[] } {
  const settingsFile = path.join(configDir, "partie.yaml");
  const settings = validate(settingsSchema, existsSync(settingsFile) ? readYaml(settingsFile) : {}, settingsFile);

  const games: LoadedGame[] = [];
  const outro = loadOutroContent(configDir);
  const errors: string[] = [...outro.errors];
  for (const game of serverGames) {
    const file = path.join(configDir, "minijeux", `${game.id}.yaml`);
    if (!existsSync(file)) {
      console.warn(`⚠ ${file} absent : mini-jeu "${game.id}" désactivé`);
      continue;
    }
    try {
      const raw = readYaml(file) as Record<string, unknown>;
      if (raw.actif === false) continue;
      delete raw.actif;
      // `manches_max` : plafond générique de manches, géré par le moteur (le mini-jeu ne le déclare pas).
      const maxRounds = raw.manches_max === undefined ? undefined : validate(maxRoundsSchema, raw.manches_max, `${file} (manches_max)`);
      delete raw.manches_max;
      games.push({ game, cfg: validate(game.configSchema, raw, file), ...(maxRounds === undefined ? {} : { maxRounds }) });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
  if (errors.length) throw new ConfigError(errors.join("\n\n"));
  return { settings, games, awardCategories: outro.categories };
}
