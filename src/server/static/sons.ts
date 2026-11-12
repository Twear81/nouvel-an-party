// Liste des sons que l'organisateur a déposés dans config/medias/sons/ (surcharge des sons par défaut de la TV).
// Lue à chaque appel (un simple readdir) : la TV la demande une fois à son démarrage. Le moteur de jeu n'est pas concerné.
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const SOUNDS_ROUTE = "/medias/_sons";
const AUDIO = /\.(mp3|ogg|wav)$/i;

export interface SoundListing {
  /** Réglage `volume_sons` de partie.yaml (0–1). */
  volume: number;
  /** Chemins relatifs à config/medias/sons/, ex : "chrono.fin.mp3" ou "rocket-league/chrono.fin.ogg". */
  fichiers: string[];
}

let volume = 0.8;
export function setSoundVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
}

/** Fichiers audio de `dir` et de ses sous-dossiers directs (un par skin). */
export function listSoundFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const stat = statSync(full, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isFile() && AUDIO.test(name)) out.push(name);
    else if (stat.isDirectory()) {
      for (const sub of readdirSync(full).sort()) if (AUDIO.test(sub) && statSync(path.join(full, sub)).isFile()) out.push(`${name}/${sub}`);
    }
  }
  return out;
}

export const soundListing = (configDir: string): SoundListing => ({
  volume,
  fichiers: listSoundFiles(path.join(configDir, "medias", "sons")),
});
