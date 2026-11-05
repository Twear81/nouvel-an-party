// Sauvegarde de la partie dans data/save.json (écriture atomique pour ne jamais corrompre le fichier).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Persistence, SaveData } from "./engine/engine";

export function filePersistence(dataDir: string): Persistence {
  const file = path.join(dataDir, "save.json");
  return {
    load() {
      if (!existsSync(file)) return null;
      try {
        return JSON.parse(readFileSync(file, "utf8")) as SaveData;
      } catch {
        console.warn("⚠ data/save.json illisible, ignoré");
        return null;
      }
    },
    save(data) {
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(file + ".tmp", JSON.stringify(data));
      renameSync(file + ".tmp", file);
    },
  };
}
