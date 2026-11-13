// Point d'entrée du serveur (et de l'exe Windows).
// Lance HTTP (pour la TV sur le PC : http://localhost:3000/tv) et HTTPS (pour les téléphones).
import { spawn } from "node:child_process";
import http from "node:http";
import https from "node:https";
import { Server } from "socket.io";
import type { ClientToServer, ServerToClient } from "../shared/protocol";
import { ConfigError, loadConfig } from "./config";
import { GameEngine } from "./engine/engine";
import { lanIps, loadOrCreateCert, pickIp } from "./network";
import { flags, isCompiled, paths } from "./paths";
import { fileDejaVu, filePersistence } from "./persistence";
import { attachSockets, createBroadcaster } from "./socket";
import { handleHttp } from "./static/serve";
import { setSoundVolume } from "./static/sons";

async function main() {
  const { settings, games, awardCategories } = loadConfig(paths.config);
  const httpPort = Number(process.env.PARTY_HTTP_PORT ?? settings.port_http);
  const httpsPort = Number(process.env.PARTY_HTTPS_PORT ?? settings.port_https);
  // En dev, les téléphones passent par Vite (port différent) : voir scripts/dev.ts.
  const joinPort = Number(process.env.PARTY_JOIN_PORT ?? httpsPort);

  const ips = lanIps();
  const ip = pickIp(settings.ip);
  const cert = await loadOrCreateCert(paths.data, ips.length ? ips : [ip]);
  const joinUrl = `https://${ip}:${joinPort}/play`;

  setSoundVolume(settings.volume_sons);
  const httpServer = http.createServer(handleHttp);
  const httpsServer = https.createServer(cert, handleHttp);
  const io = new Server<ClientToServer, ServerToClient>(httpServer);
  // Le même serveur Socket.IO écoute aussi en HTTPS.
  io.engine.attach(httpsServer, { path: "/socket.io/" } as any);

  let engine!: GameEngine;
  const broadcast = createBroadcaster(io, () => engine);
  engine = new GameEngine({
    games,
    settings: {
      title: settings.titre,
      targetMinutes: settings.duree_cible_minutes,
      order: settings.ordre,
      introSeconds: settings.intro_secondes,
      midnight: settings.minuit.actif
        ? { time: settings.minuit.heure, newYearOnly: settings.minuit.uniquement_nouvel_an, countdownSeconds: settings.minuit.duree_compte_a_rebours, autoResumeSeconds: settings.minuit.reprise_auto }
        : undefined,
      outro: { active: settings.outro.actif, bonus: settings.outro.bonus, pointsBonus: settings.outro.points_bonus },
    },
    joinUrl,
    awardCategories,
    ceremonyTimeScale: Number(process.env.PARTY_CEREMONY_TIME_SCALE ?? 1),
    onChange: broadcast,
    persistence: filePersistence(paths.data),
    dejaVu: fileDejaVu(paths.data),
  });
  attachSockets(io, engine, { hostIps: ips });

  await Promise.all([listen(httpServer, httpPort), listen(httpsServer, httpsPort)]);

  const tvUrl = `http://localhost:${httpPort}/tv`;
  console.log(`
  🎉 ${settings.titre}

  Écran TV (sur ce PC) : ${tvUrl}
  Téléphones (QR code) : ${joinUrl}
  Mini-jeux chargés    : ${games.map((g) => g.game.id).join(", ")}
  Config               : ${paths.config}
  ${ips.length > 1 ? `\n  Autres IP détectées  : ${ips.slice(1).join(", ")} (forcer avec "ip:" dans partie.yaml)\n` : ""}
  Ferme cette fenêtre pour arrêter le jeu.
`);

  if (settings.ouvrir_navigateur && !flags.noOpen) openBrowser(tvUrl);
}

function listen(server: http.Server | https.Server, port: number) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", (err: NodeJS.ErrnoException) =>
      reject(err.code === "EADDRINUSE" ? new Error(`Le port ${port} est déjà utilisé (le jeu tourne déjà ?)`) : err),
    );
    server.listen(port, "0.0.0.0", resolve);
  });
}

function openBrowser(url: string) {
  const cmd =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(cmd[0] as string, cmd[1] as string[], { stdio: "ignore", detached: true }).on("error", () => {});
  } catch {}
}

main().catch(async (err) => {
  console.error(err instanceof ConfigError ? `\n❌ Erreur dans la configuration :\n\n${err.message}\n` : err);
  if (isCompiled) {
    // Sous Windows la fenêtre se fermerait aussitôt : on laisse le temps de lire.
    console.log("Corrige puis relance. Appuie sur Entrée pour fermer.");
    process.stdin.resume();
    process.stdin.once("data", () => process.exit(1));
  } else process.exit(1);
});
