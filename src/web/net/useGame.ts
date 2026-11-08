// Hook central : état de jeu reçu du serveur, état de la connexion et actions typées.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameSnapshot, PlayerId, Profile, Setup } from "../../shared/types";
import { call, socket, syncClock } from "./socket";

const TOKEN_KEY = "nouvel-an-token";
const readToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* navigation privée : on joue sans mémoire */
  }
};

/** Envoie une action au serveur et n'en garde que la réussite ou l'échec (la réponse est ignorée). */
const send = (...args: Parameters<typeof call>): Promise<void> => call(...args).then(() => {});

export function useGame(role: "tv" | "phone") {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [host, setHost] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const join = async (token: string | null) => {
      for (;;) {
        try {
          const res = await call<{ playerId: PlayerId; token: string }>("player:join", token);
          writeToken(res.token);
          return;
        } catch {
          if (cancelled || !socket.connected) return;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    // À chaque (re)connexion : resynchroniser l'horloge puis se (re)présenter au serveur.
    const onConnect = () => {
      setConnected(true);
      void syncClock();
      if (role === "tv") {
        call<{ host: boolean }>("tv:hello").then((r) => setHost(r.host), () => {});
      } else {
        void join(readToken());
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: GameSnapshot) => {
      setSnapshot(s);
    };
    const onKicked = () => {
      writeToken(null);
      void join(null);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state", onState);
    socket.on("kicked", onKicked);
    if (socket.connected) onConnect();
    else socket.connect();
    const resync = setInterval(() => socket.connected && void syncClock(4), 60_000);

    return () => {
      cancelled = true;
      clearInterval(resync);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state", onState);
      socket.off("kicked", onKicked);
    };
  }, [role]);

  const setup = useCallback((s: Setup) => send("host:setup", s), []);
  const actions = useMemo(
    () => ({
      setup,
      start: () => send("host:start"),
      resumeSave: () => send("host:resumeSave"),
      skip: () => send("host:skip"),
      pause: () => send("host:pause"),
      resume: () => send("host:resume"),
      addTime: (seconds: number) => send("host:addTime", seconds),
      kick: (id: PlayerId) => send("host:kick", id),
      lobby: () => send("host:lobby"),
      setProfile: (p: Profile) => send("player:profile", p),
      uploadPhoto: (data: ArrayBuffer) => call<{ url: string }>("player:photo", data).then((r) => r.url),
      input: (payload: unknown) => send("player:input", payload),
      continue: () => send("player:continue"),
    }),
    [setup],
  );

  return { snapshot, connected, host, actions };
}

export type GameActions = ReturnType<typeof useGame>["actions"];
