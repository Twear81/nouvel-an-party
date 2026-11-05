// Construit la version portable : release/nouvel-an-party/{NouvelAn.exe, config/, LISEZMOI.txt} + un zip.
// Usage : bun run release            (Windows x64, par défaut)
//         bun run release -- linux   (exécutable Linux, pratique pour tester sous WSL)
import { $ } from "bun";
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const target = process.argv.includes("linux") ? "bun-linux-x64" : "bun-windows-x64";
const exeName = target.includes("windows") ? "NouvelAn.exe" : "nouvel-an";
const outDir = "release/nouvel-an-party";
const assetsFile = "src/server/static/embedded-assets.ts";
const stub = await Bun.file(assetsFile).text();

console.log("▶ Compilation du front…");
await $`bunx vite build`;

// Liste les fichiers du front pour les embarquer dans l'exe.
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    statSync(full).isDirectory() ? walk(full) : files.push(path.relative("dist/web", full).replaceAll("\\", "/"));
  }
};
walk("dist/web");

const imports = files.map((f, i) => `import f${i} from "../../../dist/web/${f}" with { type: "file" };`).join("\n");
const map = files.map((f, i) => `  ${JSON.stringify(f)}: f${i},`).join("\n");
writeFileSync(assetsFile, `// FICHIER GÉNÉRÉ TEMPORAIREMENT\n${imports}\nexport const embedded: Record<string, string> | null = {\n${map}\n};\n`);

try {
  console.log(`▶ Compilation de l'exécutable (${target}, ${files.length} fichiers embarqués)…`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  await $`bun build --compile --minify --target=${target} src/server/index.ts --outfile ${path.join(outDir, exeName)}`;
} finally {
  writeFileSync(assetsFile, stub); // on remet le fichier vide d'origine
}

cpSync("config", path.join(outDir, "config"), { recursive: true });
cpSync("docs/LISEZMOI-release.txt", path.join(outDir, "LISEZMOI.txt"));

const zip = `release/nouvel-an-party-${target.replace("bun-", "")}.zip`;
rmSync(zip, { force: true });
await $`cd release && zip -qr ${path.basename(zip)} nouvel-an-party`;
console.log(`✔ ${zip}`);
