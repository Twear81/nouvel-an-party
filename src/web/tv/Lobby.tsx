// Lobby TV : QR code d'inscription, joueurs, réglage des manches par mini-jeu et lancement.
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "../../shared/types";
import type { GameActions } from "../net/useGame";
import { Button, CloseIcon, ConfirmDialog, Panel, PlayerAvatar, type AvatarSize } from "../ui";

export function formatDuration(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 1) return seconds > 0 ? "< 1 min" : "0 min";
  if (min < 60) return `~${min} min`;
  return `~${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}

function QrCode({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    QRCode.toDataURL(url, {
      margin: 1,
      width: 640,
      color: { dark: css.getPropertyValue("--color-qr-dark").trim(), light: css.getPropertyValue("--color-qr-light").trim() },
    }).then(setSrc, () => setSrc(null));
  }, [url]);
  return (
    <div className="rounded-card bg-ink p-3 shadow-glow">
      {src ? <img data-testid="tv-qr" src={src} alt={`QR code ${url}`} className="h-[17rem] w-[17rem] rounded-btn" /> : <div className="h-[17rem] w-[17rem]" />}
    </div>
  );
}

export function Lobby({ snapshot, host, actions }: { snapshot: GameSnapshot; host: boolean; actions: GameActions }) {
  const { catalog, setup, players, resumable } = snapshot;
  const latestSetup = useRef(setup);
  latestSetup.current = setup;
  const [error, setError] = useState<string | null>(null);
  const [kicking, setKicking] = useState<{ id: string; name: string } | null>(null);

  const totalRounds = catalog.reduce((n, g) => n + (setup.counts[g.id] ?? 0), 0);
  const totalSeconds = catalog.reduce((n, g) => n + (setup.counts[g.id] ?? 0) * g.secondsPerRound, 0);
  const ready = players.filter((p) => p.profile && p.connected).length;

  const setCount = (id: string, value: number, max: number) => {
    const counts = { ...latestSetup.current.counts, [id]: Math.max(0, Math.min(max, value)) };
    latestSetup.current = { counts };
    actions.setup({ counts }).catch((e: Error) => setError(e.message));
  };

  let blocked: string | null = null;
  if (!host) blocked = "Seul le PC du maître du jeu peut lancer";
  else if (ready === 0) blocked = "En attente d'un joueur prêt";
  else if (totalRounds === 0) blocked = "Choisis au moins une manche";

  // Peu de joueurs : grands avatars pour que le lobby ne paraisse pas vide ; 8 et plus : tout tient sur deux rangées.
  const avatarSize: AvatarSize = players.length <= 3 ? "2xl" : players.length <= 8 ? "xl" : "lg";
  const tileWidth = players.length <= 3 ? "w-[17rem]" : "w-[14rem]";

  return (
    <div data-testid="tv-lobby" className="flex min-h-0 flex-1 flex-col gap-5 px-12 py-8">
      <div className="flex min-h-0 flex-1 gap-10">
        {/* Inscription */}
        <div className="flex w-[26rem] shrink-0 flex-col items-center gap-4 text-center">
          <h1 className="font-display text-5xl leading-tight text-gold-gradient">{snapshot.title}</h1>
          <QrCode url={snapshot.joinUrl} />
          <div className="rounded-chip bg-surface-strong px-5 py-2 font-mono text-2xl font-bold text-accent">{snapshot.joinUrl}</div>
          <p className="text-xl leading-snug text-ink-muted">
            Accepte l'alerte de certificat du navigateur pour continuer.
          </p>
        </div>

        {/* Joueurs */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-4xl text-ink">Les invités</h2>
            <span className="text-2xl text-ink-muted">
              {ready} prêt{ready > 1 ? "s" : ""} · {players.length} connecté{players.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-wrap content-center items-start justify-center gap-x-6 gap-y-6 overflow-hidden pt-2">
            {players.length === 0 && <p className="w-full text-center text-3xl text-ink-muted animate-pulse-soft">En attente des premiers invités…</p>}
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  data-testid={`tv-player-${p.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.2, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.2 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className={`relative flex ${tileWidth} flex-col items-center gap-1.5`}
                >
                  <PlayerAvatar profile={p.profile} size={avatarSize} dimmed={!p.connected} />
                  <span className={`max-w-full truncate text-2xl font-bold ${p.connected ? "" : "text-ink-muted"}`}>
                    {p.profile ? p.profile.name : <i className="font-normal text-ink-muted">crée son profil…</i>}
                  </span>
                  {host && (
                    <button
                      data-testid={`kick-${p.id}`}
                      onClick={() => setKicking({ id: p.id, name: p.profile?.name ?? "ce joueur" })}
                      aria-label={`Retirer ${p.profile?.name ?? "ce joueur"}`}
                      title="Retirer ce joueur"
                      className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-[0.2rem] border-bg bg-bad text-bg shadow-card transition-transform hover:scale-110"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Réglage de la partie */}
      <Panel className="flex shrink-0 flex-col gap-3 px-8 py-5">
        {resumable && host && (
          <div className="flex items-center justify-between rounded-btn bg-accent/15 px-6 py-3">
            <span className="text-2xl font-semibold text-accent">Une partie interrompue a été trouvée.</span>
            <Button data-testid="resume-game" size="md" onClick={() => void actions.resumeSave().catch((e: Error) => setError(e.message))}>
              Reprendre la partie (manche {resumable.roundIndex + 1}/{resumable.total})
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {catalog.map((g) => {
            const count = setup.counts[g.id] ?? 0;
            return (
              <div key={g.id} data-testid={`setup-row-${g.id}`} className="flex items-center gap-6">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-3xl">{g.name}</div>
                  <div className="truncate text-xl text-ink-muted">{g.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Button data-testid={`setup-dec-${g.id}`} variant="secondary" size="md" disabled={!host || count <= 0} onClick={() => setCount(g.id, count - 1, g.available)} aria-label="Moins">
                    −
                  </Button>
                  <div className="w-24 text-center">
                    <span data-testid={`setup-count-${g.id}`} className="font-display text-5xl text-accent">{count}</span>
                    <span className="block text-base text-ink-muted">sur {g.available}</span>
                  </div>
                  <Button data-testid={`setup-inc-${g.id}`} variant="secondary" size="md" disabled={!host || count >= g.available} onClick={() => setCount(g.id, count + 1, g.available)} aria-label="Plus">
                    +
                  </Button>
                </div>
                <div className="w-32 text-right text-2xl text-ink-muted">{formatDuration(count * g.secondsPerRound)}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <div data-testid="setup-total" className="text-3xl font-semibold">
            <span className="text-accent">{totalRounds}</span> manche{totalRounds > 1 ? "s" : ""} · <span className="text-accent">{formatDuration(totalSeconds)}</span>
          </div>
          <div className="flex items-center gap-5">
            {(blocked || error) && <span data-testid="start-blocked" className="text-xl text-warn">{error ?? blocked}</span>}
            <Button data-testid="start-game" size="lg" disabled={blocked !== null} onClick={() => void actions.start().catch((e: Error) => setError(e.message))}>
              Lancer la partie
            </Button>
          </div>
        </div>
      </Panel>
      {kicking && (
        <ConfirmDialog
          title={`Retirer ${kicking.name} ?`}
          detail="Son téléphone reviendra à la création de profil."
          confirmLabel="Retirer"
          onCancel={() => setKicking(null)}
          onConfirm={() => {
            void actions.kick(kicking.id).catch(() => {});
            setKicking(null);
          }}
        />
      )}
    </div>
  );
}
