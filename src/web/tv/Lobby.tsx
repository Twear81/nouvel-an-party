// Lobby TV : QR code d'inscription, joueurs, réglage des manches par mini-jeu et lancement.
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { interludeCounts } from "../../shared/interlude";
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
    // Taille fixe et grande (24 rem = 384 px, image 360 px à 1920×1080) : il se scanne de loin, quel que soit le nombre de jeux.
    <div className="flex h-[24rem] w-[24rem] shrink-0 rounded-card bg-ink p-3 shadow-glow">
      {src ? <img data-testid="tv-qr" src={src} alt={`QR code ${url}`} className="h-full w-full rounded-btn" /> : <div className="h-full w-full" />}
    </div>
  );
}

/**
 * Rappel de l'alerte de certificat : sans l'accepter, le téléphone n'arrive jamais sur le jeu.
 * Animé (volontairement « cheap ») tant qu'aucun téléphone n'est connecté ; version calme et discrète ensuite
 * (il reste utile pour les retardataires, on ne le masque pas).
 */
function CertificateWarning({ calm }: { calm: boolean }) {
  if (calm) {
    return (
      <div data-testid="cert-warning" data-calm="true" className="flex shrink-0 items-center gap-2 rounded-card border-[0.12rem] border-line bg-surface px-3 py-1.5">
        <span aria-hidden className="text-2xl opacity-70">⚠️</span>
        <p className="text-left text-lg font-semibold leading-tight text-ink-muted">Un invité bloqué ? Il doit accepter l'alerte de certificat du navigateur</p>
      </div>
    );
  }
  return (
    <div
      data-testid="cert-warning"
      data-calm="false"
      className="flex shrink-0 items-center gap-3 rounded-card border-[0.2rem] border-warn bg-warn/15 px-4 py-2 animate-attention"
    >
      <span aria-hidden className="inline-block text-4xl animate-wiggle">⚠️</span>
      <p className="text-left text-2xl font-bold leading-tight text-warn">Accepte l'alerte de certificat du navigateur pour continuer</p>
      <span aria-hidden className="inline-block text-4xl animate-nudge">👈</span>
    </div>
  );
}

export function Lobby({ snapshot, host, actions }: { snapshot: GameSnapshot; host: boolean; actions: GameActions }) {
  const { catalog, setup, players, resumable } = snapshot;
  const latestSetup = useRef(setup);
  latestSetup.current = setup;
  const [error, setError] = useState<string | null>(null);
  const [kicking, setKicking] = useState<{ id: string; name: string } | null>(null);

  const normalGames = catalog.filter((g) => g.interlude === undefined);
  const normalRounds = normalGames.reduce((n, g) => n + (setup.counts[g.id] ?? 0), 0);
  // Les interludes (surprises) sont des interrupteurs : leur nombre de manches découle des manches normales choisies.
  const planned = interludeCounts(
    normalRounds,
    catalog.filter((g) => g.interlude !== undefined).map((g) => ({ id: g.id, every: g.interlude!, available: g.available, enabled: (setup.counts[g.id] ?? 0) > 0 })),
  );
  const roundsOf = (g: (typeof catalog)[number]) => (g.interlude === undefined ? (setup.counts[g.id] ?? 0) : (planned[g.id] ?? 0));
  const totalRounds = catalog.reduce((n, g) => n + roundsOf(g), 0);
  const totalSeconds = catalog.reduce((n, g) => n + roundsOf(g) * g.secondsPerRound, 0);
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
  // Beaucoup de mini-jeux : le panneau du bas est plus haut, les avatars rétrécissent d'un cran.
  const SMALLER: Record<AvatarSize, AvatarSize> = { "2xl": "xl", xl: "lg", lg: "md", md: "md", sm: "sm", xs: "xs" };
  const baseSize: AvatarSize = players.length <= 3 ? "2xl" : players.length <= 8 ? "xl" : "lg";
  // Jusqu'à 3 joueurs, une seule rangée : on garde les grands avatars même avec beaucoup de mini-jeux.
  const avatarSize = catalog.length > 4 && players.length > 3 ?SMALLER[baseSize] : baseSize;
  const tileWidth = players.length <= 3 ? "w-[17rem]" : "w-[14rem]";

  return (
    <div data-testid="tv-lobby" className="flex min-h-0 flex-1 flex-col gap-5 px-12 py-8">
      <div className="flex min-h-0 flex-1 gap-10">
        {/* Inscription */}
        <div className="flex min-h-0 w-[26rem] shrink-0 flex-col items-center gap-4 text-center">
          <h1 className="shrink-0 font-display text-4xl leading-tight text-gold-gradient">{snapshot.title}</h1>
          <QrCode url={snapshot.joinUrl} />
          <div className="shrink-0 rounded-chip bg-surface-strong px-5 py-2 font-mono text-2xl font-bold text-accent">{snapshot.joinUrl}</div>
          <CertificateWarning calm={players.some((p) => p.connected)} />
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
      <Panel className="flex shrink-0 flex-col gap-3 px-8 py-4">
        {resumable && host && (
          <div className="flex items-center justify-between rounded-btn bg-accent/15 px-6 py-3">
            <span className="text-2xl font-semibold text-accent">Une partie interrompue a été trouvée.</span>
            <Button data-testid="resume-game" size="md" onClick={() => void actions.resumeSave().catch((e: Error) => setError(e.message))}>
              Reprendre la partie{resumable.total > 0 && ` (manche ${resumable.roundIndex + 1}/${resumable.total})`}
            </Button>
          </div>
        )}
        {/* Une ligne courte par jeu, sur 3 colonnes : le détail se lit dans l'annonce de la manche. */}
        <div data-testid="setup-grid" className="grid grid-cols-3 gap-x-10 gap-y-2">
          {catalog.map((g) => {
            const count = setup.counts[g.id] ?? 0;
            const nameClass = "min-w-0 flex-1 line-clamp-2 font-display text-xl leading-tight";
            if (g.interlude !== undefined) {
              // Jeu surprise : un interrupteur, et ce qu'il produira vraiment avec les manches normales choisies.
              const on = count > 0;
              const n = roundsOf(g);
              return (
                <div key={g.id} data-testid={`setup-row-${g.id}`} data-interlude="true" className="flex items-center gap-3">
                  <div className={nameClass} title={g.name}>{g.name}</div>
                  <span data-testid={`setup-planned-${g.id}`} className={`shrink-0 text-2xl font-bold ${on ? "text-accent" : "text-ink-muted"}`}>
                    {on ? `×${n}${n > 0 ? ` · ${formatDuration(n * g.secondsPerRound)}` : ""}` : "—"}
                  </span>
                  <Button
                    data-testid={`setup-toggle-${g.id}`}
                    data-on={on ? "true" : "false"}
                    role="switch"
                    aria-checked={on}
                    variant={on ? "primary" : "secondary"}
                    size="sm"
                    className="w-[7.5rem] shrink-0"
                    disabled={!host || g.available === 0}
                    onClick={() => setCount(g.id, on ? 0 : 1, 1)}
                  >
                    {on ? "Activé" : "Désactivé"}
                  </Button>
                </div>
              );
            }
            return (
              <div key={g.id} data-testid={`setup-row-${g.id}`} className="flex items-center gap-3">
                <div className={nameClass} title={g.name}>{g.name}</div>
                <Button data-testid={`setup-dec-${g.id}`} variant="secondary" size="sm" disabled={!host || count <= 0} onClick={() => setCount(g.id, count - 1, g.available)} aria-label="Moins">
                  −
                </Button>
                <div className="flex w-[4.5rem] shrink-0 items-baseline justify-center gap-1">
                  <span data-testid={`setup-count-${g.id}`} className="font-display text-3xl text-accent">{count}</span>
                  <span className="text-base text-ink-muted">/{g.available}</span>
                </div>
                <Button data-testid={`setup-inc-${g.id}`} variant="secondary" size="sm" disabled={!host || count >= g.available} onClick={() => setCount(g.id, count + 1, g.available)} aria-label="Plus">
                  +
                </Button>
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
