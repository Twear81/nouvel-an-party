// Lecture et validation de config/partie.yaml et config/minijeux/*.yaml.
// Une erreur de saisie produit un message clair (fichier + champ) au lieu d'un crash.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";
import { SKINS } from "../shared/skins";
import { serverGames } from "../minigames/registry.server";
import type { LoadedGame } from "./engine/planner";

export const settingsSchema = z.object({
  titre: z.string().default("Soirée du Nouvel An"),
  duree_cible_minutes: z.number().positive().default(60),
  ordre: z.enum(["melange", "groupe"]).default("melange"),
  intro_secondes: z.number().nonnegative().default(4),
  /** Skins utilisés (ids de SKINS) ; défaut = tous, dans l'ordre de SKINS. */
  skins: z.array(z.enum(SKINS, { error: (i) => `skin inconnu « ${String(i.input)} » (ids valides : ${SKINS.join(", ")})` })).min(1, "au moins un skin").default([...SKINS]),
  skins_ordre: z.enum(["melange", "liste"]).default("melange"),
  port_http: z.number().int().default(3000),
  port_https: z.number().int().default(3443),
  /** "auto" ou une IP forcée si la détection choisit la mauvaise carte réseau. */
  ip: z.string().default("auto"),
  ouvrir_navigateur: z.boolean().default(true),
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

export function loadConfig(configDir: string): { settings: Settings; games: LoadedGame[] } {
  const settingsFile = path.join(configDir, "partie.yaml");
  const settings = validate(settingsSchema, existsSync(settingsFile) ? readYaml(settingsFile) : {}, settingsFile);

  const games: LoadedGame[] = [];
  const errors: string[] = [];
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
  return { settings, games };
}
