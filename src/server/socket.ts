// Branche les événements Socket.IO sur le moteur et rediffuse l'état à chaque changement.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Server, Socket } from "socket.io";
import type { Ack, ClientToServer, ServerToClient } from "../shared/protocol";
import type { PlayerId } from "../shared/types";
import { GameError, type GameEngine } from "./engine/engine";

type IO = Server<ClientToServer, ServerToClient>;
type S = Socket<ClientToServer, ServerToClient>;

interface SocketData {
  playerId: PlayerId | null;
  isTv: boolean;
  isHost: boolean;
}

const MAX_PHOTO_BYTES = 3_000_000;

/** Les actions du maître du jeu ne sont acceptées que depuis le PC lui-même. */
function isFromHostMachine(socket: S, hostIps: string[]): boolean {
  const forwarded = String(socket.handshake.headers["x-forwarded-for"] ?? "").split(",")[0]!.trim();
  const addr = (forwarded || socket.handshake.address).replace(/^::ffff:/, "");
  return addr === "127.0.0.1" || addr === "::1" || hostIps.includes(addr);
}

/** Exécute une action et répond ok/erreur au client. */
function handle(ack: Ack<any> | undefined, fn: () => object | void) {
  try {
    const extra = fn() ?? {};
    ack?.({ ok: true, ...extra });
  } catch (err) {
    const msg = err instanceof GameError ? err.message : "Erreur serveur";
    if (!(err instanceof GameError)) console.error(err);
    ack?.({ ok: false, error: msg });
  }
}

export function createBroadcaster(io: IO, getEngine: () => GameEngine) {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    // On regroupe les changements d'un même tick en un seul envoi.
    setImmediate(() => {
      scheduled = false;
      const engine = getEngine();
      const tvSnapshot = engine.snapshot(null);
      for (const socket of io.sockets.sockets.values()) {
        const data = socket.data as SocketData;
        if (data.playerId) socket.emit("state", engine.snapshot(data.playerId));
        else if (data.isTv) socket.emit("state", tvSnapshot);
      }
    });
  };
}

export function attachSockets(io: IO, engine: GameEngine, opts: { dataDir: string; hostIps: string[] }) {
  io.on("connection", (socket) => {
    const data: SocketData = { playerId: null, isTv: false, isHost: isFromHostMachine(socket, opts.hostIps) };
    socket.data = data;

    const host = (ack: Ack | undefined, fn: () => void) =>
      handle(ack, () => {
        if (!data.isHost) throw new GameError("Réservé au maître du jeu");
        fn();
      });
    const player = (ack: Ack<any> | undefined, fn: (id: PlayerId) => object | void) =>
      handle(ack, () => {
        if (!data.playerId || !engine.hasPlayer(data.playerId)) throw new GameError("Rejoins la partie d'abord");
        return fn(data.playerId);
      });

    socket.on("time:sync", (_t, ack) => typeof ack === "function" && ack(Date.now()));

    // ── TV / maître du jeu
    socket.on("tv:hello", (ack) =>
      handle(ack, () => {
        data.isTv = true;
        socket.emit("state", engine.snapshot(null));
        return { host: data.isHost };
      }),
    );
    socket.on("host:setup", (setup, ack) => host(ack, () => engine.setSetup(setup)));
    socket.on("host:start", (ack) => host(ack, () => engine.start()));
    socket.on("host:resumeSave", (ack) => host(ack, () => engine.resumeSave()));
    socket.on("host:skip", (ack) => host(ack, () => engine.skip()));
    socket.on("host:pause", (ack) => host(ack, () => engine.pause()));
    socket.on("host:resume", (ack) => host(ack, () => engine.resume()));
    socket.on("host:addTime", (s, ack) => host(ack, () => engine.addTime(Number(s) || 0)));
    socket.on("host:lobby", (ack) => host(ack, () => engine.backToLobby()));
    socket.on("host:kick", (playerId, ack) =>
      host(ack, () => {
        engine.kick(playerId);
        for (const s of io.sockets.sockets.values()) {
          if ((s.data as SocketData).playerId === playerId) {
            (s.data as SocketData).playerId = null;
            s.emit("kicked");
          }
        }
      }),
    );

    // ── Téléphone
    socket.on("player:join", (token, ack) =>
      handle(ack, () => {
        if (data.playerId) engine.disconnect(data.playerId); // re-join sur la même connexion
        const res = engine.join(typeof token === "string" ? token : null);
        data.playerId = res.playerId;
        socket.emit("state", engine.snapshot(res.playerId));
        return res;
      }),
    );
    socket.on("player:profile", (profile, ack) => player(ack, (id) => engine.setProfile(id, profile)));
    socket.on("player:input", (payload, ack) => player(ack, (id) => engine.input(id, payload)));
    socket.on("player:continue", (ack) => player(ack, (id) => engine.continue(id)));
    socket.on("player:photo", (buf, ack) =>
      player(ack, (id) => {
        const bytes = Buffer.from(buf as ArrayBuffer);
        if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new GameError("Photo trop lourde");
        const ext = imageExt(bytes);
        if (!ext) throw new GameError("Format d'image non supporté");
        const name = `${id}-${Date.now()}.${ext}`;
        const dir = path.join(opts.dataDir, "photos");
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, name), bytes);
        return { url: `/photos/${name}` };
      }),
    );

    socket.on("disconnect", () => {
      if (data.playerId) engine.disconnect(data.playerId);
    });
  });
}

/** Reconnaît le format via les premiers octets (on ne fait pas confiance au client). */
function imageExt(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}
