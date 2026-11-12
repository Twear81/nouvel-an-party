// Sert le front (dist/web ou fichiers embarqués dans l'exe) et les médias de la configuration.
import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { paths } from "../paths";
import { embedded } from "./embedded-assets";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const cache = new Map<string, Buffer>();

async function readWebFile(rel: string): Promise<Buffer | null> {
  if (cache.has(rel)) return cache.get(rel)!;
  let buf: Buffer | null = null;
  if (embedded) {
    const f = embedded[rel];
    if (f) buf = Buffer.from(await Bun.file(f).arrayBuffer());
  } else {
    const file = path.join(paths.web, rel);
    if (file.startsWith(paths.web) && existsSync(file)) buf = readFileSync(file);
  }
  if (buf && embedded) cache.set(rel, buf); // en dev on relit à chaque fois (rebuild du front)
  return buf;
}

function send(res: ServerResponse, status: number, body: Buffer | string, ext: string, cacheable = false) {
  res.writeHead(status, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": cacheable ? "public, max-age=31536000, immutable" : "no-cache",
  });
  res.end(body);
}

export async function handleHttp(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://x");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith("/socket.io")) return; // géré par Socket.IO

  if (pathname === "/") {
    res.writeHead(302, { Location: "/play" });
    return res.end();
  }

  // Images/sons fournis avec la config (config/medias), ex : les objets du "bon prix"
  if (pathname.startsWith("/medias/")) {
    const rel = pathname.slice("/medias/".length);
    const dir = path.join(paths.config, "medias");
    const file = path.resolve(dir, rel);
    if (file.startsWith(dir + path.sep) && existsSync(file)) return send(res, 200, readFileSync(file), path.extname(file));
    return send(res, 404, "not found", ".txt");
  }

  const rel = pathname.replace(/^\/+/, "");
  const ext = path.extname(rel);
  if (ext) {
    const buf = await readWebFile(rel);
    if (buf) return send(res, 200, buf, ext, rel.startsWith("assets/"));
    return send(res, 404, "not found", ".txt");
  }

  // Routes de l'appli (/tv, /play) → index.html
  const index = await readWebFile("index.html");
  if (index) return send(res, 200, index, ".html");
  send(res, 500, "Front non compilé : lance `bun run build:web`", ".txt");
}
