// Une seule connexion Socket.IO (même origine) par page + horloge synchronisée avec le serveur.
import { io, type Socket } from "socket.io-client";
import type { ClientToServer, ServerToClient } from "../../shared/protocol";

export type GameSocket = Socket<ServerToClient, ClientToServer>;
export const socket: GameSocket = io({ autoConnect: false });

/** Envoie un événement et attend l'accusé : rejette avec le message d'erreur du serveur. */
export function call<T = object>(event: keyof ClientToServer, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    (socket.timeout(10_000) as unknown as { emit: (...a: unknown[]) => void }).emit(
      event,
      ...args,
      (err: Error | null, res: { ok: boolean; error?: string }) => {
        if (err) return reject(new Error("Le serveur ne répond pas"));
        if (res && res.ok === false) return reject(new Error(res.error ?? "Erreur"));
        resolve(res as T);
      },
    );
  });
}

// ── Horloge : décalage = heure serveur − heure locale, mesuré sur l'échantillon au plus faible aller-retour.
let offset = 0;
let horlogeImposee: (() => number) | null = null;
export const serverNow = () => (horlogeImposee ? horlogeImposee() : Date.now() + offset);
/** Galerie des animations seulement : remplace l'horloge serveur par une horloge locale pilotable (pause, curseur). */
export const imposerHorloge = (horloge: (() => number) | null) => {
  horlogeImposee = horloge;
};

export async function syncClock(samples = 8): Promise<boolean> {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < samples; i++) {
    if (!socket.connected) return false;
    const t0 = performance.now();
    const c0 = Date.now();
    const serverTime = await new Promise<number>((resolve) => {
      (socket.timeout(2000) as unknown as { emit: (...a: unknown[]) => void }).emit(
        "time:sync",
        c0,
        (err: Error | null, t: number) => resolve(err ? NaN : t),
      );
    });
    const rtt = performance.now() - t0;
    if (Number.isFinite(serverTime) && (!best || rtt < best.rtt)) {
      best = { rtt, offset: serverTime - (c0 + rtt / 2) };
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  if (best) offset = best.offset;
  return best !== null;
}
