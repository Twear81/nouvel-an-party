// Compile le front une seule fois : le serveur sert dist/web.
import { spawnSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  if (process.env.E2E_SKIP_BUILD) return;
  const root = path.resolve(import.meta.dirname, "../..");
  const res = spawnSync("bunx", ["vite", "build"], { cwd: root, stdio: "inherit" });
  if (res.status !== 0) throw new Error("Échec de `bunx vite build`");
}
