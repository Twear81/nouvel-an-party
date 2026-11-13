// Écrans de "Compte à rebours chaotique" (tout le monde en même temps).
// TV : annonce de la cible en géant, « 3… 2… 1… », puis le compteur (un design tiré par le serveur) qui devient fou.
// Téléphone : la cible, puis un énorme bouton STOP (aucun compteur : ce serait de la triche).
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { activeNow, eventTime } from "../../shared/clock";
import type { RoundInfo } from "../../shared/types";
import { serverNow } from "../../web/net/socket";
import { Button, haptique, ordinal, PlayerAvatar, Pop, useSfxOnChange, WaitingDots } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { Counter, useFrame } from "./Counter";
import { GO_LEAD_MS, type Priv, type Pub, type Results } from "./game";
import { revealSeconds, TvResults } from "./Results";
import { fmtCible, fmtSigned, QUALITY_TEXT, quality } from "./rank";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Le « 3… 2… 1… » calculé depuis l'heure du GO (serveur) : tout le monde le voit au même rythme. */
function useLead(pub: Pub, round: RoundInfo): number {
  useFrame(pub.phase === "ready");
  if (pub.phase !== "ready" || pub.goAt === null) return 0;
  return Math.min(GO_LEAD_MS / 1000, Math.max(1, Math.ceil((pub.goAt - activeNow(round, serverNow())) / 1000)));
}

// ───────────────────────── TV ─────────────────────────

const Tv = ({ pub, playerById, round }: Props) => {
  const lead = useLead(pub, round);
  // Sons : la cible tombe, « 3… 2… 1… » (tic de plus en plus aigu), GO, chaque STOP. Jamais au montage.
  useSfxOnChange(pub.phase, (_avant, apres) => (apres === "announce" ? { nom: "boum", options: { rate: 0.8 } } : apres === "running" ? { nom: "boum", options: { rate: 1.5, volume: 1.2 } } : null));
  useSfxOnChange(pub.phase === "ready" ? lead : 0, (_avant, apres) => (apres > 0 ? { nom: "ui.clic", options: { rate: 0.8 + (3 - apres) * 0.3, volume: 1.4 } } : null));
  useSfxOnChange(pub.stoppedIds.length, (avant, apres) => (apres > avant ? { nom: "carte.pose", options: { rate: 1 + Math.min(apres, 8) * 0.06 } } : null));
  return (
    <div data-testid="cabr-tv" data-stage={pub.phase} className="flex min-h-0 flex-1 flex-col items-center justify-between py-2 text-center">
      <div className="flex h-[7rem] items-center">
        {pub.phase === "announce" ? null : (
          <div className="rounded-chip bg-surface-strong px-12 py-3 font-display text-5xl">
            Arrêtez-vous à <span className="text-accent">{fmtCible(pub.cible)} s</span>
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {pub.phase === "announce" && (
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 12 }} className="flex flex-col items-center gap-4">
            <span data-testid="cabr-target-big" className="font-display text-7xl">
              Arrêtez-vous à
            </span>
            <span data-ui="animated-number" className="font-display text-[19rem] leading-none text-accent" style={{ textShadow: "0 0 4rem var(--color-accent-deep)" }}>
              {fmtCible(pub.cible)} s
            </span>
            <span className="text-4xl text-ink-muted">Le compteur va devenir fou : finissez de compter dans votre tête !</span>
          </motion.div>
        )}
        {pub.phase === "ready" && (
          <div className="flex flex-col items-center gap-6">
            <AnimatePresence mode="wait">
              <motion.span key={lead} data-testid="cabr-lead" initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.25 }} className="font-display text-[26rem] leading-none text-accent">
                {lead}
              </motion.span>
            </AnimatePresence>
            <span className="font-display text-5xl text-ink-muted">Prépare ton doigt…</span>
          </div>
        )}
        {pub.phase === "running" && <Counter pub={pub} round={round} />}
      </div>
      <div data-testid="cabr-chips" className="flex min-h-[8rem] flex-wrap items-center justify-center gap-4">
        {round.participants.map((id) => {
          const stopped = pub.stoppedIds.includes(id);
          const p = playerById(id);
          return (
            <div
              key={id}
              data-testid={`cabr-chip-${id}`}
              data-stopped={stopped}
              className={`flex items-center gap-3 rounded-chip px-4 py-2 transition-colors ${stopped ? "border-[0.2rem] border-good bg-good/20" : "bg-surface"}`}
            >
              <PlayerAvatar profile={p?.profile ?? null} size="sm" />
              <span className="max-w-[12rem] truncate text-2xl font-bold">{p?.profile?.name}</span>
              {stopped && (
                <Pop appear scale={1.4} className="font-display text-2xl text-good">
                  STOP !
                </Pop>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ───────────────────────── Téléphone ─────────────────────────

/** Le gros bouton STOP. Réagit au contact (pointerdown), pas au relâchement, pour ne pas perdre ~100 ms. */
function StopPad({ pub, round, sendInput }: { pub: Pub; round: RoundInfo; sendInput: Props["sendInput"] }) {
  // Le temps est mesuré ICI : depuis l'affichage du bouton sur ce téléphone (performance.now, instant réel du toucher via
  // event.timeStamp), jamais à l'arrivée au serveur.
  const t0 = useRef(0);
  // Les pauses de l'hôte ne comptent pas : on retire celles survenues depuis l'affichage du bouton.
  const pausedAtStart = useRef(round.pausedMs);
  const roundRef = useRef(round);
  roundRef.current = round;
  // Page rechargée en plein jeu : le chrono local est perdu, on retombe sur l'heure serveur.
  const late = useRef(pub.startedAt !== null && activeNow(round, serverNow()) - pub.startedAt > 1500);
  const done = useRef(false);
  const [sent, setSent] = useState(false);
  useLayoutEffect(() => {
    t0.current = performance.now();
  }, []);

  const stop = (e: { timeStamp: number }) => {
    const now = eventTime(e.timeStamp, performance.now());
    // Verrou de 250 ms : un doigt encore posé après « GO » ne déclenche pas STOP sans le vouloir.
    if (done.current || (!late.current && now - t0.current < 250)) return;
    done.current = true;
    const r = roundRef.current;
    const ms = late.current ? activeNow(r, serverNow()) - (pub.startedAt ?? activeNow(r, serverNow())) : now - t0.current - (r.pausedMs - pausedAtStart.current);
    setSent(true);
    haptique(80);
    void sendInput({ ms }).catch(() => {
      done.current = false;
      setSent(false);
    });
  };

  if (sent) return <Stopped />;
  return (
    <Button
      variant="bad"
      size="hero"
      data-testid="cabr-stop"
      onPointerDown={stop}
      onClick={stop}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.97, y: 6 }}
      whileHover={{}}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="relative mb-14 min-h-0 w-full flex-1 touch-manipulation"
    >
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-btn ring-[0.5rem] ring-ink/50" animate={{ opacity: [0.15, 0.9, 0.15] }} transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut" }} />
      STOP
    </Button>
  );
}

function Stopped() {
  return (
    <motion.div data-testid="cabr-stopped" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }} className="flex flex-1 flex-col items-center justify-center gap-3 pb-10">
      <span className="font-display text-9xl text-good">✓</span>
      <span className="font-display text-5xl text-good">Stoppé !</span>
      <span className="text-xl text-ink-muted">Regarde la TV…</span>
      <WaitingDots className="text-ink-muted" />
    </motion.div>
  );
}

const Phone = ({ pub, snapshot, round, sendInput }: Props) => {
  const lead = useLead(pub, round);
  const myId = snapshot.me?.id ?? "";
  const target = (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="font-display text-2xl text-ink-muted">Arrête-toi à</span>
      <span data-testid="cabr-target" className="font-display text-7xl leading-none text-accent">
        {fmtCible(pub.cible)} s
      </span>
    </div>
  );
  if (!round.participants.includes(myId)) {
    return <div data-testid="cabr-spectator" className="flex flex-1 items-center justify-center text-center font-display text-3xl text-ink-muted">Regarde la TV !</div>;
  }
  if (pub.stoppedIds.includes(myId)) return <Stopped />;
  if (pub.phase === "running") {
    return (
      <div data-testid="cabr-phone" data-stage="running" className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="pt-1">{target}</div>
        <StopPad pub={pub} round={round} sendInput={sendInput} />
      </div>
    );
  }
  return (
    <div data-testid="cabr-phone" data-stage={pub.phase} className="flex flex-1 flex-col items-center justify-center gap-8 pb-10 text-center">
      {target}
      {pub.phase === "ready" ? (
        <motion.span key={lead} data-testid="cabr-lead" initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} className="font-display text-[9rem] leading-none">
          {lead}
        </motion.span>
      ) : (
        <span className="animate-pulse-soft font-display text-4xl">Prépare ton doigt</span>
      )}
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: Props) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.ranking.find((r) => r.playerId === myId);
  if (!mine) return <p data-testid="cabr-phone-result" className="text-center font-display text-2xl text-bad">Pas stoppé à temps</p>;
  return (
    <div data-testid="cabr-phone-result" data-rank={mine.rank} className="flex flex-col items-center gap-2 text-center">
      <span className="font-display text-3xl text-accent">{ordinal(mine.rank)}</span>
      <span className={`font-num text-4xl ${QUALITY_TEXT[quality(mine.signedMs)]}`}>{fmtSigned(mine.signedMs)} s</span>
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results) : 0) } satisfies MiniGameViews;
