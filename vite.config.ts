// Front (TV + téléphones). En dev, Vite sert l'appli en HTTPS et relaie le temps réel vers le serveur Bun.
import { existsSync, readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const serverPort = Number(process.env.PARTY_HTTP_PORT ?? 3000);
// Certificat créé par le serveur au démarrage (data/certs), réutilisé pour Vite.
const certDir = "data/certs";
const https = existsSync(`${certDir}/cert.pem`)
  ? { key: readFileSync(`${certDir}/key.pem`), cert: readFileSync(`${certDir}/cert.pem`) }
  : undefined;

export default defineConfig({
  root: "src/web",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  // Téléphones visés : iOS Safari 16.4+, Firefox et Chrome Android récents.
  build: { outDir: "../../dist/web", emptyOutDir: true, target: ["safari16.4", "firefox115", "chrome111"] },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    https,
    proxy: {
      "/socket.io": { target: `http://localhost:${serverPort}`, ws: true, xfwd: true },
      "/photos": { target: `http://localhost:${serverPort}`, xfwd: true },
    },
  },
});
