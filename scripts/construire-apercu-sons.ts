// Assemble la planche d'écoute des sons : même React/CSS que le jeu, .ogg embarqués, sans serveur ni accès réseau.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const racine = path.resolve(import.meta.dirname, "..");
const entree = path.join(racine, "scripts/apercu-sons.tsx");
const sortie = path.join(racine, "captures/sons/index.html");
// Le jeu reste l'unique déclaration de ses polices : la planche suit ses imports à chaque construction.
const polices = readFileSync(path.join(racine, "src/web/main.tsx"), "utf8")
  .split("\n").filter((line) => /^import ["']@fontsource/.test(line)).join("\n");
// Mini-jeux qui citent chaque nom logique (dans leurs fichiers) : la planche n'a pas à embarquer les sources.
const noms = Object.keys((await import(path.join(racine, "src/web/theme/sons/catalogue.ts"))).SONS);
const usages: Record<string, string[]> = {};
const dossierJeux = path.join(racine, "src/minigames");
for (const jeu of readdirSync(dossierJeux, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const sources = readdirSync(path.join(dossierJeux, jeu.name), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx?$/.test(f)).map((f) => readFileSync(path.join(dossierJeux, jeu.name, f), "utf8")).join("\n");
  for (const nom of noms) if (sources.includes(`"${nom}"`)) (usages[nom] ??= []).push(jeu.name);
}
// Fichier Kenney d'origine : lu dans le tableau de LICENCES.md.
const origines: Record<string, string> = {};
for (const m of readFileSync(path.join(racine, "src/web/theme/sons/LICENCES.md"), "utf8").matchAll(/^\| `([^`]+)` \| ([^|]+) \| `([^`]+)` \|/gm)) {
  origines[m[1]!] = `${m[3]} (${m[2]!.trim()})`;
}
const result = await build({
  configFile: false,
  root: racine,
  // Le bundle autonome tourne dans le navigateur, sans les variables Node conservées par le mode bibliothèque.
  define: { "process.env.NODE_ENV": JSON.stringify("production"), __USAGES__: JSON.stringify(usages), __ORIGINES__: JSON.stringify(origines) },
  plugins: [
    { name: "polices-de-la-planche", enforce: "pre", transform(code, id) {
      if (id === entree) return { code: `${polices}\n${code}`, map: null };
    } },
    react(), tailwindcss(),
  ],
  build: {
    target: ["safari16.4", "firefox115", "chrome111"], write: false,
    lib: { entry: entree, name: "PlancheSons", formats: ["iife"], fileName: () => "planche.js" },
    cssCodeSplit: false, assetsInlineLimit: Infinity, minify: true,
  },
});
const bundles = Array.isArray(result) ? result : "output" in result ? [result] : [];
const fichiers = bundles.flatMap((item) => item.output);
const javascript = fichiers.filter((item) => item.type === "chunk").map((item) => item.code).join("\n");
const styles = fichiers.flatMap((item) => item.type === "asset" && item.fileName.endsWith(".css")
  ? [typeof item.source === "string" ? item.source : Buffer.from(item.source).toString("utf8")] : []).join("\n");
if (!javascript || !styles) throw new Error("La planche n’a pas produit son JavaScript et sa feuille de style.");
const ressources = fichiers.filter((item) => item.type === "asset" && !item.fileName.endsWith(".css"));
if (ressources.length) throw new Error(`Ressources non embarquées : ${ressources.map((item) => item.fileName).join(", ")}`);
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Planche des sons</title>
<style>${styles.replace(/<\/style/gi, "<\\/style")}</style></head>
<body><div id="planche"></div><script>${javascript.replace(/<\/script/gi, "<\\/script")}</script></body></html>\n`;
mkdirSync(path.dirname(sortie), { recursive: true });
writeFileSync(sortie, html);
console.log(`Planche des sons autonome : ${sortie} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} Mo)`);
