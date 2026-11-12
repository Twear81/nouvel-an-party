// Détection de l'IP du PC sur le wifi + certificat HTTPS auto-signé.
// Le HTTPS est nécessaire sur les téléphones pour garder l'écran allumé.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import selfsigned from "selfsigned";

/** Cartes réseau virtuelles à ignorer (WSL, Hyper-V, VirtualBox, VPN…). */
const VIRTUAL = /vEthernet|WSL|Hyper-V|VirtualBox|VMware|docker|br-|veth|tailscale|zerotier|loopback/i;

export function lanIps(): string[] {
  const found: string[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const a of addrs ?? []) if (a.family === "IPv4" && !a.internal) found.push(a.address);
  }
  // Les box internet utilisent quasi toujours 192.168.x.x : on les met en premier.
  const rank = (ip: string) => (ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : 2);
  return found.sort((a, b) => rank(a) - rank(b));
}

export function pickIp(setting: string): string {
  if (setting !== "auto") return setting;
  return lanIps()[0] ?? "127.0.0.1";
}

/**
 * Certificat réutilisé d'une soirée à l'autre (les téléphones n'ont à accepter
 * l'avertissement qu'une fois), regénéré seulement si l'IP du PC a changé.
 */
export async function loadOrCreateCert(dataDir: string, ips: string[]): Promise<{ key: string; cert: string }> {
  const dir = path.join(dataDir, "certs");
  const metaFile = path.join(dir, "meta.json");
  const wanted = [...new Set(["127.0.0.1", ...ips])].sort();
  if (existsSync(metaFile)) {
    const meta = JSON.parse(readFileSync(metaFile, "utf8")) as { ips: string[] };
    if (wanted.every((ip) => meta.ips.includes(ip))) {
      return { key: readFileSync(path.join(dir, "key.pem"), "utf8"), cert: readFileSync(path.join(dir, "cert.pem"), "utf8") };
    }
  }
  const pems = await selfsigned.generate([{ name: "commonName", value: "Soiree Nouvel An" }], {
    days: 3650,
    keySize: 2048,
    algorithm: "sha256",
    extensions: [
      {
        name: "subjectAltName",
        altNames: [{ type: 2, value: "localhost" }, ...wanted.map((ip) => ({ type: 7, ip }))],
      },
    ],
  } as any);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "key.pem"), pems.private);
  writeFileSync(path.join(dir, "cert.pem"), pems.cert);
  writeFileSync(metaFile, JSON.stringify({ ips: wanted }));
  return { key: pems.private, cert: pems.cert };
}
