// Écrans de "Compte à rebours chaotique".
// TV : compteur géant (qui devient fou) + joueur en cours + classement des tours déjà joués.
// Téléphone : le joueur actif n'a qu'UN gros bouton (START puis STOP) ; les autres suivent le tour et leur propre résultat.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { serverNow } from "../../web/net/socket";
import { fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { Counter, Digits } from "./Counter";
import type { Priv, Pub, Results, Turn } from "./game";
import { fmtSeconds, fmtSigned, ordinal, QUALITY_TEXT, quality, rankByError } from "./rank";

type Props = MiniGameViewProps<Pub, Priv, Results>;
type PlayerOf = MiniGameViewProps["playerById"];

const VALUE_SIZE = (text: string, big: number, small: number) => `${text.length <= 5 ? big : small}rem`;

/** Verdict d'un tour (reconnaissable de loin) : "trop tard", "trop tôt", "PILE !". */
const verdict = (signedMs: number) => (quality(signedMs) === "pile" ? "PILE !" : signedMs > 0 ? "trop tard" : "trop tôt");

const REASON_TEXT: Record<NonNullable<Turn["reason"]>, string> = {
  "no-start": "Pas parti à temps",
  "no-stop": "Jamais arrêté",
  absent: "Absent",
};

/** Classement des tours déjà joués, + ceux à venir. Rang calculé sur les tours terminés. */
function boardRows(turns: Turn[]) {
  const done = rankByError(turns.filter((t) => t.status === "done"), (t) => t.signedMs!);
  return [
    ...done.map((d) => ({ turn: d.item, rank: d.rank })),
    ...turns.filter((t) => t.status === "current").map((turn) => ({ turn, rank: null as number | null })),
    ...turns.filter((t) => t.status === "pending").map((turn) => ({ turn, rank: null as number | null })),
    ...turns.filter((t) => t.status === "missed").map((turn) => ({ turn, rank: null as number | null })),
  ];
}

// ───────────────────────────── TV ─────────────────────────────

function Board({ pub, playerById }: { pub: Pub; playerById: PlayerOf }) {
  const rows = boardRows(pub.turns);
  return (
    <div data-testid="cabr-board" className="glass flex w-[31rem] shrink-0 flex-col justify-center gap-2 rounded-card p-4">
      {rows.map(({ turn, rank }) => {
        const p = playerById(turn.id);
        const isCur = turn.status === "current";
        const sleeping = turn.status === "pending" || turn.status === "missed";
        return (
          <motion.div
            layout
            key={turn.id}
            data-testid={`cabr-row-${turn.id}`}
            data-status={turn.status}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className={`flex h-[5.2rem] items-center gap-3 rounded-btn px-3 ${isCur ? "border-[0.2rem] border-accent bg-accent/15 shadow-glow" : "bg-surface"}`}
          >
            <span className={`w-9 text-center font-display text-3xl ${rank === 1 ? "text-accent" : "text-ink-muted"}`}>{rank ?? ""}</span>
            <PlayerAvatar profile={p?.profile ?? null} size="sm" dimmed={sleeping} />
            <span className={`min-w-0 flex-1 truncate text-2xl font-bold ${sleeping ? "text-ink-muted" : ""}`}>{p?.profile?.name}</span>
            <span className="font-display text-3xl">
              {turn.status === "done" ? (
                <span className={QUALITY_TEXT[quality(turn.signedMs!)]}>{fmtSigned(turn.signedMs!)}</span>
              ) : turn.status === "missed" ? (
                <span className="text-bad">✕</span>
              ) : isCur ? (
                <span className="animate-pulse-soft text-accent">···</span>
              ) : (
                <span className="text-ink-muted">–</span>
              )}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Ce qui remplace le compteur pendant la révélation. */
function Reveal({ pub, turn }: { pub: Pub; turn: Turn }) {
  useEffect(() => {
    if (turn.status === "done" && Math.abs(turn.signedMs!) <= 150) fireConfetti("small");
  }, [turn.status, turn.signedMs]);

  if (turn.status !== "done") {
    return (
      <motion.div data-testid="tv-reveal" data-status="missed" initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }} className="flex flex-col items-center gap-4">
        <span className="font-display text-[10rem] leading-none text-bad">RATÉ</span>
        <span className="font-display text-5xl text-ink-muted">{REASON_TEXT[turn.reason ?? "no-start"]}</span>
      </motion.div>
    );
  }
  const text = fmtSigned(turn.signedMs!);
  const q = quality(turn.signedMs!);
  return (
    <motion.div data-testid="tv-reveal" data-status="done" initial={{ scale: 3, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 13 }} className="flex flex-col items-center gap-3">
      <span className={`font-display leading-none ${QUALITY_TEXT[q]}`} style={{ fontSize: VALUE_SIZE(text, 15, 12), textShadow: "0 0 3rem currentColor" }}>
        <Digits text={text} />
        <span className="ml-3 text-[0.35em]">s</span>
      </span>
      <span className={`font-display text-7xl ${QUALITY_TEXT[q]}`}>{verdict(turn.signedMs!)}</span>
      <span className="text-4xl text-ink-muted">
        arrêté à <b className="text-ink">{fmtSeconds(turn.elapsedMs!)} s</b> pour {pub.cible} s visées
      </span>
    </motion.div>
  );
}

function TargetChip({ pub }: { pub: Pub }) {
  return (
    <div className="flex items-center gap-5 rounded-chip bg-surface-strong px-10 py-3 font-display text-4xl">
      <span className="text-accent">{pub.titre}</span>
      <span className="text-ink-muted">·</span>
      <span>
        {pub.decompte ? "Zéro à " : "Objectif "}
        <span className="text-accent">{fmtSeconds(pub.cible * 1000)} s</span>
      </span>
    </div>
  );
}

const Tv = ({ pub, playerById }: Props) => {
  const turn = pub.turns.find((t) => t.id === pub.currentId) ?? null;
  const who = turn ? playerById(turn.id) : undefined;
  const showReveal = pub.phase === "reveal" && turn;
  return (
    <div data-testid="cabr-tv" data-phase={pub.phase} className="flex min-h-0 flex-1 gap-8">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-between py-2 text-center">
        <TargetChip pub={pub} />
        <div className="flex h-[12.5rem] items-center gap-8">
          <AnimatePresence mode="wait">
            {who && (
              <motion.div key={pub.turnNo} data-testid="cabr-tv-player" initial={{ opacity: 0, x: -80, scale: 0.6 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 80 }} transition={{ type: "spring", stiffness: 200, damping: 18 }} className="flex items-center gap-8">
                <PlayerAvatar profile={who.profile} size="xl" className="drop-shadow-[0_0_1.5rem_var(--color-accent)]" />
                <span className="max-w-[48rem] truncate font-display leading-tight" style={{ fontSize: `${Math.min(6, 46 / (Math.max(who.profile?.name.length ?? 1, 1) * 0.8))}rem` }}>
                  {who.profile?.name}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex h-[22rem] items-center justify-center">
          {showReveal ? <Reveal key={pub.turnNo} pub={pub} turn={turn} /> : <Counter pub={pub} />}
        </div>
      </div>
      <Board pub={pub} playerById={playerById} />
    </div>
  );
};

// ───────────────────────── Téléphone ─────────────────────────

/** Le gros bouton : tout l'écran. Réagit au contact (pointerdown), pas au relâchement, pour ne pas perdre ~100 ms. */
function GiantButton({ testId, label, tone, onPress }: { testId: string; label: string; tone: "start" | "stop"; onPress: () => void }) {
  const solid = tone === "start" ? "bg-good text-bg shadow-[0_0.6rem_0_var(--color-good-deep)]" : "bg-hot text-bg shadow-[0_0.6rem_0_var(--color-bad-deep)]";
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onPointerDown={onPress}
      onClick={onPress}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.97, y: 6 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`relative mb-3 flex min-h-0 w-full flex-1 touch-manipulation items-center justify-center rounded-card font-display text-[4.5rem] leading-none tracking-wide ${solid}`}
    >
      {/* Halo qui respire (le bouton lui-même reste immobile sous le pouce) */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card ring-[0.5rem] ring-ink/50"
        animate={{ opacity: [0.15, 0.9, 0.15] }}
        transition={{ repeat: Infinity, duration: tone === "start" ? 1.4 : 0.7, ease: "easeInOut" }}
      />
      {label}
    </motion.button>
  );
}

function SignedBig({ signedMs, size = 5 }: { signedMs: number; size?: number }) {
  const text = fmtSigned(signedMs);
  return (
    <span className={`font-display leading-none ${QUALITY_TEXT[quality(signedMs)]}`} style={{ fontSize: VALUE_SIZE(text, size, size * 0.8) }}>
      <Digits text={text} />
    </span>
  );
}

/** Résultat d'un tour : écart + verdict. */
function TurnResult({ turn, testId }: { turn: Turn; testId: string }) {
  if (turn.status !== "done") {
    return (
      <div data-testid={testId} className="flex flex-col items-center gap-1">
        <span className="font-display text-5xl text-bad">RATÉ</span>
        <span className="text-lg text-ink-muted">{REASON_TEXT[turn.reason ?? "no-start"]}</span>
      </div>
    );
  }
  return (
    <motion.div data-testid={testId} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }} className="flex flex-col items-center gap-2">
      <SignedBig signedMs={turn.signedMs!} />
      <span className={`font-display text-3xl ${QUALITY_TEXT[quality(turn.signedMs!)]}`}>{verdict(turn.signedMs!)}</span>
      <span className="text-lg text-ink-muted">arrêté à <b className="text-ink">{fmtSeconds(turn.elapsedMs!)} s</b></span>
    </motion.div>
  );
}

/** Le joueur dont c'est le tour : un seul bouton. */
function ActivePhone({ pub, turn, sendInput }: { pub: Pub; turn: Turn; sendInput: Props["sendInput"] }) {
  // Si la page est rechargée en plein tour, le chrono local est perdu : on retombe sur l'heure du serveur.
  const [started, setStarted] = useState(pub.phase === "running");
  const [stopped, setStopped] = useState(false);
  const t0 = useRef<number | null>(null);
  const startedRef = useRef(pub.phase === "running");
  const stoppedRef = useRef(false);
  const lockUntil = useRef(0);

  const start = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    t0.current = performance.now(); // le temps est mesuré ICI, pas sur le serveur
    lockUntil.current = t0.current + 300; // évite qu'un même geste déclenche START puis STOP
    setStarted(true);
    try {
      navigator.vibrate?.(25);
    } catch {
      /* pas de vibration sur iOS */
    }
    void sendInput({ action: "start" }).catch(() => {});
  };
  const stop = () => {
    const now = performance.now();
    if (!startedRef.current || stoppedRef.current || now < lockUntil.current) return;
    stoppedRef.current = true;
    const ms = t0.current !== null ? now - t0.current : serverNow() - (pub.startedAt ?? serverNow());
    setStopped(true);
    void sendInput({ action: "stop", ms }).catch(() => {
      stoppedRef.current = false;
      setStopped(false);
    });
  };

  if (pub.phase === "reveal" || turn.status !== "current") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <TurnResult turn={turn} testId="cabr-mine" />
      </div>
    );
  }
  if (stopped) return <div data-testid="cabr-sent" className="flex flex-1 items-center justify-center font-display text-8xl text-good">✓</div>;
  return started ? <GiantButton testId="cabr-stop" label="STOP" tone="stop" onPress={stop} /> : <GiantButton testId="cabr-start" label="START" tone="start" onPress={start} />;
}

/** Les autres : à qui le tour, et où j'en suis. */
function WatcherPhone({ pub, myId, playerById }: { pub: Pub; myId: string; playerById: PlayerOf }) {
  const who = pub.currentId ? playerById(pub.currentId) : undefined;
  const cur = pub.turns.find((t) => t.id === pub.currentId);
  const mine = pub.turns.find((t) => t.id === myId);
  const rows = boardRows(pub.turns);
  const myRank = rows.find((r) => r.turn.id === myId)?.rank ?? null;
  const position = pub.turns.findIndex((t) => t.id === myId) + 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-2 pb-3 text-center">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
        <AnimatePresence mode="wait">
          {who && (
            <motion.div key={pub.turnNo} data-testid="cabr-turn" initial={{ opacity: 0, y: 30, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center gap-2">
              <PlayerAvatar profile={who.profile} size="xl" className="drop-shadow-[0_0_1.2rem_var(--color-accent)]" />
              <span className="max-w-full truncate font-display text-3xl">{who.profile?.name}</span>
              {pub.phase === "reveal" && cur ? (
                <TurnResult turn={cur} testId="cabr-turn-result" />
              ) : (
                <span className="animate-pulse-soft font-display text-3xl text-accent">{pub.phase === "running" ? "···" : "▶"}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div data-testid="cabr-me" data-status={mine?.status} className="glass flex w-full shrink-0 flex-col items-center gap-1 rounded-card px-4 py-3">
        {mine?.status === "done" ? (
          <>
            <span className="text-ink-muted">Ton écart</span>
            <SignedBig signedMs={mine.signedMs!} size={3.5} />
            <span className="font-display text-xl text-accent">{myRank ? `${ordinal(myRank)} pour l'instant` : ""}</span>
          </>
        ) : mine?.status === "missed" ? (
          <span className="font-display text-3xl text-bad">Tour raté</span>
        ) : (
          <span className="font-display text-2xl text-ink-muted">Tu passes en {ordinal(position)}</span>
        )}
      </div>
    </div>
  );
}

const Phone = ({ pub, snapshot, sendInput, playerById }: Props) => {
  const myId = snapshot.me?.id ?? "";
  const mine = pub.turns.find((t) => t.id === myId);
  // Pendant la révélation, currentId reste le joueur qui vient de jouer : il garde son résultat.
  if (mine && pub.currentId === myId) return <ActivePhone key={pub.turnNo} pub={pub} turn={mine!} sendInput={sendInput} />;
  return <WatcherPhone pub={pub} myId={myId} playerById={playerById} />;
};

// ───────────────────────── Résultats ─────────────────────────

const PODIUM = {
  1: { bar: "h-[17rem] bg-gold text-accent-ink", delay: 1.7 },
  2: { bar: "h-[12rem] bg-surface-strong text-ink", delay: 1.0 },
  3: { bar: "h-[8rem] bg-surface-strong text-ink", delay: 0.4 },
} as const;

// Rythme de la révélation (s) : le podium monte 3e, 2e, 1er, puis la liste des suivants arrive.
const CONFETTI_S = 2.2;
const LIST_DELAY_S = 2.2;
const MISSED_DELAY_S = 2.4;
const LIST_STEP_S = 0.12;
const SETTLE_S = 0.9;

/** Durée totale (s) de l'animation des résultats. */
export const revealSeconds = (results: Results) => {
  const top = Math.min(results.ranking.length, 3);
  const rest = results.ranking.length - top;
  // Le 1er arrive en dernier : sa barre part à `delay`, son avatar tombe 0,3 s plus tard.
  const podium = top === 0 ? 0 : PODIUM[1].delay + 0.3 + SETTLE_S;
  const list = rest > 0 ? LIST_DELAY_S + (rest - 1) * LIST_STEP_S : 0;
  const missed = results.missed.length > 0 ? MISSED_DELAY_S + (rest + results.missed.length - 1) * LIST_STEP_S : 0;
  return Math.max(podium, list, missed) + 0.4;
};

function PodiumColumn({ entry, playerById }: { entry: Results["ranking"][number]; playerById: PlayerOf }) {
  const p = playerById(entry.playerId);
  const tier = PODIUM[Math.min(entry.rank, 3) as 1 | 2 | 3];
  const text = fmtSigned(entry.signedMs);
  return (
    <div data-testid={`cabr-rank-${entry.rank}`} className="flex w-[19rem] flex-col items-center">
      <motion.div initial={{ opacity: 0, y: -300 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: tier.delay + 0.3, type: "spring", stiffness: 120, damping: 11 }} className="flex flex-col items-center gap-1">
        <PlayerAvatar profile={p?.profile ?? null} size="xl" className={entry.rank === 1 ? "drop-shadow-[0_0_2rem_var(--color-accent)]" : ""} />
        <span className="max-w-full truncate text-3xl font-bold">{p?.profile?.name}</span>
        <span className={`font-display text-5xl ${QUALITY_TEXT[quality(entry.signedMs)]}`}>
          <Digits text={text} /> s
        </span>
      </motion.div>
      <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: tier.delay, type: "spring", stiffness: 140, damping: 16 }} style={{ transformOrigin: "bottom" }} className={`mt-3 flex w-full items-start justify-center rounded-t-card pt-3 font-display text-8xl ${tier.bar}`}>
        {entry.rank}
      </motion.div>
    </div>
  );
}

const TvResults = ({ results, playerById }: Props) => {
  useEffect(() => {
    if (!results?.ranking.length) return;
    const id = setTimeout(() => fireConfetti("big"), CONFETTI_S * 1000);
    return () => clearTimeout(id);
  }, [results]);
  if (!results) return null;
  const top = results.ranking.slice(0, 3);
  const rest = results.ranking.slice(3);
  // Podium classique : 2e à gauche, 1er au milieu, 3e à droite.
  const arranged = top.length === 3 ? [top[1]!, top[0]!, top[2]!] : top.length === 2 ? [top[1]!, top[0]!] : top;
  return (
    <div data-testid="cabr-results" className="flex min-h-0 flex-1 gap-8">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6">
        <div className="rounded-chip bg-surface-strong px-10 py-2 font-display text-3xl text-accent">
          {results.titre} · {fmtSeconds(results.cible * 1000)} s
        </div>
        {top.length === 0 ? (
          <p className="font-display text-5xl text-ink-muted">Personne n'a arrêté le compteur…</p>
        ) : (
          <div className="flex items-end justify-center gap-6">
            {arranged.map((e) => (
              <PodiumColumn key={e.playerId} entry={e} playerById={playerById} />
            ))}
          </div>
        )}
      </div>
      {(rest.length > 0 || results.missed.length > 0) && (
        <div className="glass flex w-[30rem] shrink-0 flex-col justify-center gap-2 rounded-card p-4">
          {rest.map((e, i) => (
            <motion.div key={e.playerId} data-testid={`cabr-rank-${e.rank}`} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: LIST_DELAY_S + i * LIST_STEP_S }} className="flex h-[4.6rem] items-center gap-3 rounded-btn bg-surface px-3">
              <span className="w-9 text-center font-display text-3xl text-ink-muted">{e.rank}</span>
              <PlayerAvatar profile={playerById(e.playerId)?.profile ?? null} size="sm" />
              <span className="min-w-0 flex-1 truncate text-2xl font-bold">{playerById(e.playerId)?.profile?.name}</span>
              <span className={`font-display text-3xl ${QUALITY_TEXT[quality(e.signedMs)]}`}>{fmtSigned(e.signedMs)}</span>
            </motion.div>
          ))}
          {results.missed.map((m, i) => (
            <motion.div key={m.playerId} data-testid={`cabr-missed-${m.playerId}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: MISSED_DELAY_S + (rest.length + i) * LIST_STEP_S }} className="flex h-[4.6rem] items-center gap-3 rounded-btn bg-surface px-3">
              <span className="w-9 text-center font-display text-3xl text-bad">✕</span>
              <PlayerAvatar profile={playerById(m.playerId)?.profile ?? null} size="sm" dimmed />
              <span className="min-w-0 flex-1 truncate text-2xl font-bold text-ink-muted">{playerById(m.playerId)?.profile?.name}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: Props) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.ranking.find((r) => r.playerId === myId);
  if (!mine) return <p data-testid="cabr-phone-result" className="text-center font-display text-2xl text-bad">Tour raté</p>;
  return (
    <div data-testid="cabr-phone-result" data-rank={mine.rank} className="flex flex-col items-center gap-2 text-center">
      <span className="font-display text-3xl text-accent">{ordinal(mine.rank)}</span>
      <span className={`font-display text-4xl ${QUALITY_TEXT[quality(mine.signedMs)]}`}>{fmtSigned(mine.signedMs)} s</span>
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results) : 0) } satisfies MiniGameViews;
