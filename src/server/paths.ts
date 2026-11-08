// Où trouver config/ et data/ : à côté du .exe en version portable, à la racine du projet en dev.
import path from "node:path";

/** Vrai quand on tourne depuis l'exécutable compilé par `bun build --compile`. */
export const isCompiled = import.meta.dir.includes("$bunfs") || import.meta.dir.includes("~BUN");

const projectRoot = path.resolve(import.meta.dir, "../..");
const appRoot = isCompiled ? path.dirname(process.execPath) : projectRoot;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export const paths = {
  config: path.resolve(arg("config") ?? path.join(appRoot, "config")),
  data: path.resolve(arg("data") ?? path.join(appRoot, "data")),
  /** Front compilé (uniquement utilisé hors exe, l'exe embarque les fichiers). */
  web: path.join(projectRoot, "dist/web"),
};

export const flags = {
  noOpen: process.argv.includes("--no-open"),
};
