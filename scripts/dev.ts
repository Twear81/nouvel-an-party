// `bun run dev` : serveur Bun (redémarre à chaque modif) + Vite (rechargement à chaud du front).
// TV : https://localhost:5173/tv   —   Téléphones : le QR code affiché sur la TV.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const env = { ...process.env, PARTY_JOIN_PORT: "5173" };
const run = (cmd: string, args: string[]) => spawn(cmd, args, { stdio: "inherit", env });

const server = run("bun", ["--watch", "src/server/index.ts", "--no-open"]);

// Vite a besoin du certificat généré par le serveur au premier lancement.
while (!existsSync("data/certs/cert.pem")) await Bun.sleep(200);
const vite = run("bunx", ["vite"]);

const stop = () => {
  server.kill();
  vite.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
