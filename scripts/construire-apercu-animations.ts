// Assemble une galerie autonome : même React/CSS que le jeu, sans serveur ni accès réseau à l'ouverture.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const racine = path.resolve(import.meta.dirname, "..");
const entree = path.join(racine, "scripts/apercu-animations.tsx");
const sortie = path.join(racine, "captures/animations/index.html");
// Le jeu reste l'unique déclaration de ses polices : la galerie suit ses imports à chaque construction.
const polices = readFileSync(path.join(racine, "src/web/main.tsx"), "utf8")
  .split("\n").filter((line) => /^import ["']@fontsource/.test(line)).join("\n");
const result = await build({
  configFile: false,
  root: racine,
  // Le bundle autonome tourne dans le navigateur, sans les variables Node conservées par le mode bibliothèque.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    { name: "polices-de-la-galerie", enforce: "pre", transform(code, id) {
      if (id === entree) return { code: `${polices}\n${code}`, map: null };
    } },
    react(), tailwindcss(),
  ],
  build: {
    target: ["safari16.4", "firefox115", "chrome111"], write: false,
    lib: { entry: entree, name: "GalerieAnimations", formats: ["iife"], fileName: () => "galerie.js" },
    cssCodeSplit: false, assetsInlineLimit: Infinity, minify: true,
  },
});
const bundles = Array.isArray(result) ? result : "output" in result ? [result] : [];
const fichiers = bundles.flatMap((item) => item.output);
const javascript = fichiers.filter((item) => item.type === "chunk").map((item) => item.code).join("\n");
const styles = fichiers.flatMap((item) => item.type === "asset" && item.fileName.endsWith(".css")
  ? [typeof item.source === "string" ? item.source : Buffer.from(item.source).toString("utf8")] : []).join("\n");
if (!javascript || !styles) throw new Error("La galerie n’a pas produit son JavaScript et sa feuille de style.");
const ressources = fichiers.filter((item) => item.type === "asset" && !item.fileName.endsWith(".css"));
if (ressources.length) throw new Error(`Ressources non embarquées : ${ressources.map((item) => item.fileName).join(", ")}`);
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Galerie des animations</title>
<style>${styles.replace(/<\/style/gi, "<\\/style")}</style></head>
<body><div id="galerie"></div><script>${javascript.replace(/<\/script/gi, "<\\/script")}</script></body></html>\n`;
mkdirSync(path.dirname(sortie), { recursive: true });
writeFileSync(sortie, html);
console.log(`Galerie autonome : ${sortie} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} Mo)`);
