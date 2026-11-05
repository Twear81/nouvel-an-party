// Les actions du maître du jeu ne sont acceptées que depuis le PC du serveur (voir isFromHostMachine dans server/socket.ts).
// Tout tourne en local ici : on simule un appareil distant avec l'en-tête X-Forwarded-For, que le serveur lit
// (c'est ce qu'envoie le proxy Vite en dev). Un vrai test depuis une autre machine du réseau n'est pas possible dans la CI.
import { io, type Socket } from "socket.io-client";
import { expect, test } from "./helpers/fixtures";

const REMOTE_IP = "192.168.77.12";

type Ack = { ok: boolean; error?: string };

function connect(url: string, headers?: Record<string, string>): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, { extraHeaders: headers, transports: ["websocket"], reconnection: false });
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

const call = (socket: Socket, event: string, ...args: unknown[]) => new Promise<Ack>((resolve) => socket.emit(event, ...args, resolve));

test.describe("Sécurité de base", () => {
  test("une TV ouverte depuis une autre machine n'a aucun contrôle de maître du jeu", async ({ party }) => {
    // La vraie TV (locale) et un joueur prêt : le maître du jeu pourrait lancer la partie.
    const alice = await party.addPhone("Alice");
    await expect(party.tv.getByTestId("start-game")).toBeEnabled();
    await expect(party.tv.getByTestId("host-bar")).toHaveCount(1);

    // Même page /tv, mais vue depuis une autre adresse : lecture seule.
    const remote = await party.newContextPage(`${party.server.tvUrl}`, { "x-forwarded-for": REMOTE_IP });
    await expect(remote.getByTestId(`tv-player-${alice.id}`)).toBeVisible();
    await remote.waitForTimeout(500); // laisse le temps à la réponse « tv:hello » d'arriver
    await expect(remote.getByTestId("start-game")).toBeDisabled();
    await expect(remote.getByTestId("start-blocked")).toContainText("Seul le PC du maître du jeu");
    await expect(remote.getByTestId("setup-inc-oui-non")).toBeDisabled();
    await expect(remote.getByTestId("setup-dec-oui-non")).toBeDisabled();
    await expect(remote.getByTestId("host-bar")).toHaveCount(0);
    await expect(remote.locator('[data-testid^="kick-"]')).toHaveCount(0);
  });

  test("un appareil distant ne peut envoyer aucune action de maître du jeu", async ({ party }) => {
    const { tv, server } = party;
    const [a] = await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();

    const rogue = await connect(`http://localhost:${server.httpPort}`, { "x-forwarded-for": REMOTE_IP });
    try {
      const hello = (await call(rogue, "tv:hello")) as Ack & { host: boolean };
      expect(hello.host).toBe(false);
      for (const [event, args] of [
        ["host:setup", [{ counts: { "oui-non": 3 } }]],
        ["host:start", []],
        ["host:skip", []],
        ["host:pause", []],
        ["host:resume", []],
        ["host:addTime", [10]],
        ["host:kick", [a!.id]],
        ["host:lobby", []],
        ["host:resumeSave", []],
      ] as const) {
        const res = await call(rogue, event, ...args);
        expect(res.ok, event).toBe(false);
        expect(res.error, event).toContain("Réservé au maître du jeu");
      }
    } finally {
      rogue.close();
    }

    // La partie n'a pas bougé : toujours en manche, personne n'a été retiré.
    await expect(tv.getByTestId("tv-playing")).toBeVisible();
    await expect(a!.t("phone-playing")).toBeVisible();
    await expect(tv.getByTestId("host-pause")).not.toContainText("Reprendre");

    // Contre-épreuve : la même action depuis le PC (sans l'en-tête) est acceptée.
    const local = await connect(`http://localhost:${server.httpPort}`);
    try {
      expect(((await call(local, "tv:hello")) as Ack & { host: boolean }).host).toBe(true);
      expect((await call(local, "host:pause")).ok).toBe(true);
      await expect(tv.getByTestId("paused-overlay")).toBeVisible();
    } finally {
      local.close();
    }
  });

  test("un téléphone sans profil ne peut ni répondre ni continuer", async ({ party }) => {
    const { tv, server } = party;
    await party.addPhones("Alice", "Bob");
    await party.startGame({ "qui-est-le-plus": 1, "oui-non": 0 });
    await expect(tv.getByTestId("tv-playing")).toBeVisible();

    // Une connexion qui n'a jamais rejoint (pas de player:join) est refusée.
    const socket = await connect(`http://localhost:${server.httpPort}`);
    try {
      const res = await call(socket, "player:input", { target: "x" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Rejoins la partie");
      expect((await call(socket, "player:continue")).ok).toBe(false);
      expect((await call(socket, "player:profile", { name: "Pirate" })).ok).toBe(false);
    } finally {
      socket.close();
    }
  });
});
