// Lance un vrai serveur de jeu (process Bun) sur des ports libres, avec config de test et dossier data jetable.
import { spawn, type ChildProcess } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const FIXTURE_CONFIG = path.join(ROOT, "tests/e2e/fixtures/config");

export interface ServerOptions {
  /** Durée de l'annonce de manche (s). Défaut du fixture : 1. */
  introSeconds?: number;
  /** Durée du chrono de chaque mini-jeu (s). Défaut du fixture : 8. */
  duree?: number;
}

export interface TestServer {
  httpPort: number;
  httpsPort: number;
  tvUrl: string;
  playUrl: string;
  dataDir: string;
  /** Tue brutalement le process (simule un crash). */
  kill(): Promise<void>;
  /** (Re)démarre sur les mêmes ports et le même dossier data. */
  start(): Promise<void>;
  /** Arrête proprement et supprime les fichiers temporaires. */
  dispose(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

/** Copie la config de test dans le dossier temporaire en appliquant les surcharges demandées. */
function prepareConfig(tmp: string, opts: ServerOptions): string {
  const dir = path.join(tmp, "config");
  cpSync(FIXTURE_CONFIG, dir, { recursive: true });
  const patch = (file: string, key: string, value: number) => {
    const f = path.join(dir, file);
    writeFileSync(f, readFileSync(f, "utf8").replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`));
  };
  if (opts.introSeconds !== undefined) patch("partie.yaml", "intro_secondes", opts.introSeconds);
  if (opts.duree !== undefined) {
    patch("minijeux/qui-est-le-plus.yaml", "duree", opts.duree);
    patch("minijeux/ceci-ou-cela.yaml", "duree", opts.duree);
  }
  return dir;
}

export async function createServer(opts: ServerOptions = {}): Promise<TestServer> {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "nouvel-an-e2e-"));
  const configDir = prepareConfig(tmp, opts);
  const dataDir = path.join(tmp, "data");
  const httpPort = await freePort();
  const httpsPort = await freePort();
  let proc: ChildProcess | null = null;
  let logs = "";

  const exited = (p: ChildProcess) => new Promise<void>((resolve) => (p.exitCode !== null || p.signalCode !== null ? resolve() : p.once("exit", () => resolve())));

  const server: TestServer = {
    httpPort,
    httpsPort,
    tvUrl: `http://localhost:${httpPort}/tv`,
    playUrl: `https://localhost:${httpsPort}/play`,
    dataDir,
    async start() {
      logs = "";
      const p = spawn("bun", ["src/server/index.ts", "--config", configDir, "--data", dataDir, "--no-open"], {
        cwd: ROOT,
        env: { ...process.env, PARTY_HTTP_PORT: String(httpPort), PARTY_HTTPS_PORT: String(httpsPort) },
        stdio: ["ignore", "pipe", "pipe"],
      });
      proc = p;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Le serveur ne démarre pas.\n${logs}`)), 30_000);
        const onData = (chunk: Buffer) => {
          logs += chunk.toString();
          if (logs.includes("Écran TV")) {
            clearTimeout(timer);
            resolve();
          }
        };
        p.stdout!.on("data", onData);
        p.stderr!.on("data", onData);
        p.once("exit", (code) => {
          clearTimeout(timer);
          reject(new Error(`Le serveur s'est arrêté (code ${code}).\n${logs}`));
        });
      });
    },
    async kill() {
      const p = proc;
      if (!p) return;
      proc = null;
      p.kill("SIGKILL");
      await exited(p);
    },
    async dispose() {
      await server.kill();
      rmSync(tmp, { recursive: true, force: true });
    },
  };
  await server.start();
  return server;
}
