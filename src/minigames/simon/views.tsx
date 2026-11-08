// Écrans de "Simon" : la TV joue la suite sur un disque de 4 pastilles, les téléphones n'ont que les 4 pastilles à toucher
// (jamais la suite). N'utilise que les primitives de src/web/ui et les jetons du thème (couleurs --color-simon-* dans theme.css).
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { serverNow } from "../../web/net/socket";
import { CheckIcon, CloseIcon, fireConfetti, PlayerAvatar, ResultBar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { PlayerResult, Priv, Pub, Results } from "./game";
import { PADS, PadShape } from "./pads";

/** Part de chaque note pendant laquelle la pastille reste allumée (le reste est le silence qui sépare deux notes identiques). */
const LIT_RATIO = 0.7;

/** Heure serveur, rafraîchie souvent tant que `active` (animation de la suite). */
function useServerNow(active: boolean) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(serverNow()), 30);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** Note allumée à cet instant (index dans la suite), null avant / entre / après les notes. */
function litNote(show: NonNullable<Pub["show"]>, now: number): number | null {
  const t = now - show.startAt;
  if (t < 0) return null;
  const k = Math.floor(t / show.noteMs);
  if (k >= show.sequence.length || t - k * show.noteMs > show.noteMs * LIT_RATIO) return null;
  return k;
}

// ───────────────────────────── TV ─────────────────────────────

function TvPad({ index, lit, note, dim }: { index: number; lit: boolean; note: number | null; dim: boolean }) {
  const pad = PADS[index]!;
  return (
    <motion.div
      data-testid={`simon-tv-pad-${index}`}
      data-lit={lit ? "true" : "false"}
      animate={{ scale: lit ? 1.05 : 1, opacity: dim && !lit ? 0.5 : 1 }}
      transition={{ duration: 0.08 }}
      className={`relative flex items-center justify-center rounded-[1.5rem] ${pad.idle} ${pad.corner}`}
    >
      <div className={`absolute inset-0 rounded-[inherit] transition-opacity duration-75 ${pad.lit} ${pad.glow} ${lit ? "opacity-100" : "opacity-0"}`} />
      {lit && <motion.span key={note} initial={{ opacity: 0.9, scale: 0.95 }} animate={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.5, ease: "easeOut" }} className="absolute inset-0 rounded-[inherit] border-[0.5rem] border-ink" />}
      <PadShape pad={index} className={`relative h-[6rem] w-[6rem] ${lit ? "text-ink/70" : "text-bg/35"}`} />
    </motion.div>
  );
}

function Disc({ pub }: { pub: Pub }) {
  const show = pub.show;
  const now = useServerNow(!!show);
  const note = show ? litNote(show, now) : null;
  const lit = note !== null ? show!.sequence[note]! : null;
  return (
    <div className="relative h-[34rem] w-[34rem] shrink-0">
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[0.9rem]">
        {PADS.map((_, i) => (
          <TvPad key={i} index={i} lit={lit === i} note={note} dim={pub.stage === "show" || pub.stage === "wait"} />
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 flex h-[10rem] w-[10rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[0.6rem] border-surface-strong bg-bg shadow-card">
        <motion.span key={pub.length} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} data-testid="simon-length" className="font-display text-[4.5rem] leading-none text-gold-gradient">
          {pub.length}
        </motion.span>
        <span className="text-xl font-bold text-ink-muted">notes</span>
      </div>
    </div>
  );
}

/** Une pastille d'info : couleurs du Simon pour les rappels dans les textes. */
function Banner({ pub, aliveCount, names }: { pub: Pub; aliveCount: number; names: string[] }) {
  let content: React.ReactNode;
  if (pub.stage === "over") {
    content =
      names.length === 1 ? (
        <span className="text-gold-gradient">👑 {names[0]} gagne !</span>
      ) : (
        <span className="text-gold-gradient">👑 Égalité !</span>
      );
  } else if (pub.stage === "between") {
    content = <span className="text-good">✓ Bien joué !</span>;
  } else if (pub.stage === "play") {
    content = <span className="text-accent">À vous de jouer !</span>;
  } else {
    content = <span>👀 Regardez bien !</span>;
  }
  return (
    <div className="relative flex h-[5.5rem] w-full items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div key={pub.stage === "wait" ? "show" : pub.stage} data-testid="simon-banner" initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="font-display text-[3.75rem] leading-none">
          {content}
        </motion.div>
      </AnimatePresence>
      <span className="absolute left-0 rounded-chip bg-surface-strong px-6 py-2 font-display text-3xl text-ink-muted">{pub.variant}</span>
      {pub.stage === "play" && (
        <span className="absolute right-0 rounded-chip bg-surface-strong px-6 py-2 font-display text-3xl text-ink-muted">
          <span className="text-good">{pub.doneIds.length}</span> / {aliveCount}
        </span>
      )}
    </div>
  );
}

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const roster = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const outIds = new Set(pub.out.map((o) => o.id));
  const alive = roster.filter((p) => !outIds.has(p.id));
  const fallen = pub.out.map((o) => roster.find((p) => p.id === o.id)).filter((p): p is NonNullable<typeof p> => !!p);
  const ordered = [...alive, ...fallen];
  const crowd = roster.length > 5;
  const over = pub.stage === "over";
  const winnerNames = pub.winners.map((id) => roster.find((p) => p.id === id)?.profile?.name ?? "");

  useEffect(() => {
    if (over) fireConfetti("big");
  }, [over]);

  return (
    <div data-testid="simon-tv" data-stage={pub.stage} data-length={pub.length} data-sequence={pub.show?.sequence.join(",") ?? ""} className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 text-center">
      <Banner pub={pub} aliveCount={alive.length} names={winnerNames} />
      <Disc pub={pub} />
      <div data-testid="simon-players" className="flex w-full flex-wrap items-start justify-center gap-x-3 gap-y-2">
        {ordered.map((p) => {
          const isOut = outIds.has(p.id);
          const done = pub.doneIds.includes(p.id);
          const winner = pub.winners.includes(p.id);
          const ratio = isOut ? 0 : done ? 1 : Math.min(1, (pub.progress[p.id] ?? 0) / Math.max(1, pub.length));
          return (
            <motion.div
              key={p.id}
              layout
              data-testid={`simon-player-${p.id}`}
              data-state={winner ? "winner" : isOut ? "out" : done ? "done" : "alive"}
              initial={false}
              animate={isOut && !winner ? { y: [0, -26, 12], rotate: [0, -8, 8], opacity: 0.6 } : { y: 0, rotate: 0, opacity: 1, scale: winner ? 1.12 : 1 }}
              transition={{ duration: 0.7, ease: "easeInOut", layout: { type: "spring", stiffness: 180, damping: 22 } }}
              className="flex w-[11rem] flex-col items-center gap-1"
            >
              <div className="relative">
                <PlayerAvatar profile={p.profile} size={crowd ? "md" : "lg"} dimmed={isOut && !winner} badge={winner ? "👑" : done ? <CheckIcon /> : undefined} className={done || winner ? "drop-shadow-[0_0_1rem_var(--color-good)]" : ""} />
                {isOut && !winner && (
                  <motion.span initial={false} animate={{ scale: [0, 1.4, 1] }} className="absolute inset-0 flex items-center justify-center text-bad drop-shadow-[0_0_0.5rem_var(--color-bg)]">
                    <CloseIcon className={crowd ? "h-[4rem] w-[4rem]" : "h-[6rem] w-[6rem]"} />
                  </motion.span>
                )}
              </div>
              <span className={`w-full truncate font-bold ${crowd ? "text-xl" : "text-2xl"} ${isOut && !winner ? "text-ink-muted" : "text-ink"}`}>{p.profile!.name}</span>
              <ResultBar pill tone={done || winner ? "good" : "gold"} value={ratio} fromZero={false} duration={0.2} className={`h-2.5 w-[7rem] ${isOut && !winner ? "invisible" : ""}`} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ───────────────────────────── Téléphone ─────────────────────────────

function Segments({ done, total }: { done: number; total: number }) {
  return (
    <div data-testid="simon-progress" data-done={done} data-total={total} className="flex shrink-0 gap-1 px-1">
      {Array.from({ length: total }, (_, i) => (
        <motion.span key={i} animate={{ scale: i === done - 1 ? [1.6, 1] : 1 }} className={`h-3 flex-1 rounded-full transition-colors ${i < done ? "bg-ink" : "bg-surface-strong"}`} />
      ))}
    </div>
  );
}

function PhonePad({ index, active, flashed, onTap }: { index: number; active: boolean; flashed: boolean; onTap: (i: number) => void }) {
  const pad = PADS[index]!;
  return (
    <motion.button
      type="button"
      data-testid={`simon-pad-${index}`}
      disabled={!active}
      whileTap={active ? { scale: 0.94, y: 6 } : undefined}
      animate={{ opacity: active ? 1 : 0.35 }}
      // pointerdown plutôt que click : la touche part dès le contact du doigt
      onPointerDown={(e) => {
        e.preventDefault();
        onTap(index);
      }}
      className={`relative flex items-center justify-center rounded-card ${pad.idle} ${active ? pad.deep : ""}`}
    >
      <div className={`absolute inset-0 rounded-[inherit] transition-opacity duration-100 ${pad.lit} ${flashed ? "opacity-100" : "opacity-0"}`} />
      <PadShape pad={index} className="relative h-[28%] min-h-[3rem] w-auto text-bg/35" />
    </motion.button>
  );
}

/** Tous les joueurs : en lice (éclatants), ayant fini l'étape (✓), éliminés (grisés, ✖). */
function Roster({ pub, players, round, myId }: { pub: Pub; players: MiniGameViewProps["players"]; round: MiniGameViewProps["round"]; myId?: string }) {
  const roster = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const outIds = new Set(pub.out.map((o) => o.id));
  return (
    <div data-testid="simon-roster" className="grid w-full grid-cols-4 gap-x-1 gap-y-3">
      {roster.map((p) => {
        const isOut = outIds.has(p.id) && !pub.winners.includes(p.id);
        const done = pub.doneIds.includes(p.id) || pub.winners.includes(p.id);
        return (
          <motion.div key={p.id} data-testid={`simon-roster-${p.id}`} data-state={isOut ? "out" : done ? "done" : "alive"} initial={false} animate={{ opacity: isOut ? 0.6 : 1, y: isOut ? 6 : 0 }} className="flex min-w-0 flex-col items-center gap-0.5">
            <div className="relative">
              <PlayerAvatar profile={p.profile} size="sm" dimmed={isOut} badge={pub.winners.includes(p.id) ? "👑" : done && !isOut ? <CheckIcon /> : undefined} className={p.id === myId ? "drop-shadow-[0_0_0.6rem_var(--color-accent)]" : ""} />
              {isOut && (
                <span className="absolute inset-0 flex items-center justify-center text-bad">
                  <CloseIcon className="h-8 w-8" />
                </span>
              )}
            </div>
            <span className={`w-full truncate text-center text-sm font-bold ${isOut ? "text-ink-muted" : ""}`}>{p.profile!.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

function Aside({ status, reason, pub, players, round, myId }: { status: "done" | "out" | "win"; reason: Priv["reason"]; pub: Pub; players: MiniGameViewProps["players"]; round: MiniGameViewProps["round"]; myId?: string }) {
  const tone = { done: "bg-good text-bg", out: "bg-bad text-bg", win: "bg-gold text-accent-ink" }[status];
  const title = { done: "Réussi !", out: reason === "time" ? "Trop lent !" : "Raté !", win: "Victoire !" }[status];
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 pb-2 text-center">
      <div className="flex flex-col items-center gap-3">
        <motion.div initial={{ scale: 0, rotate: status === "out" ? 25 : -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 11 }} className={`relative flex h-28 w-28 items-center justify-center rounded-full text-6xl shadow-glow ${tone}`}>
          {status === "done" ? <CheckIcon className="h-16 w-16" /> : status === "out" ? <CloseIcon className="h-16 w-16" /> : "👑"}
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`font-display text-4xl ${status === "out" ? "text-bad" : status === "win" ? "text-gold-gradient" : "text-good"}`}>
          {title}
        </motion.h1>
        {status === "out" && !pub.winners.length && (
          <span data-testid="simon-phone-length" className="rounded-chip bg-surface-strong px-5 py-1.5 font-display text-xl text-ink-muted">
            <span className="text-accent">{pub.length}</span> notes
          </span>
        )}
      </div>
      <Roster pub={pub} players={players} round={round} myId={myId} />
    </div>
  );
}

const Phone = ({ pub, priv, round, players, snapshot, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const status = priv?.status ?? "watch";
  const [flash, setFlash] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tap = (i: number) => {
    setFlash(i);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 170);
    try {
      navigator.vibrate?.(12);
    } catch {
      /* iOS : pas de vibration */
    }
    void sendInput({ pad: i }).catch(() => {});
  };

  const myId = snapshot.me?.id;
  if (status === "done" || status === "out" || status === "win") {
    return (
      <div data-testid="simon-phone" data-status={status} className="flex min-h-0 flex-1 flex-col">
        <Aside status={status} reason={priv?.reason ?? null} pub={pub} players={players} round={round} myId={myId} />
      </div>
    );
  }
  const active = status === "play";
  return (
    <div data-testid="simon-phone" data-status={status} className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
      <Segments done={priv?.progress ?? 0} total={pub.length} />
      <div className="relative grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
        {PADS.map((_, i) => (
          <PhonePad key={i} index={i} active={active} flashed={flash === i} onTap={tap} />
        ))}
        {!active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass flex flex-col items-center gap-1 rounded-card px-8 py-5">
              <span className="animate-pulse-soft text-6xl">📺</span>
              <span className="font-display text-2xl">Regarde la TV</span>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

// ───────────────────────────── Résultats ─────────────────────────────

const BAR_MAX_REM = 21;

// Rythme de la révélation (s) : les colonnes montent l'une après l'autre, la couronne puis la phrase arrivent ensuite.
const COLUMN_STEP_S = 0.15;
const BAR_DELAY_S = 0.3;
const BAR_SETTLE_S = 1.4; // ressort lent de la barre
const CROWN_DELAY_S = 0.9;
const CROWN_STEP_S = 0.1;
const TEXT_DELAY_S = 1.2;

/** Durée totale (s) de l'animation pour `n` colonnes. */
export const revealSeconds = (n: number) =>
  n === 0 ? 0 : Math.max(BAR_DELAY_S + COLUMN_STEP_S * (n - 1) + BAR_SETTLE_S, CROWN_DELAY_S + CROWN_STEP_S * (n - 1) + 0.6, TEXT_DELAY_S + 0.4);

function Column({ row, rank, max, count, playerById }: { row: PlayerResult; rank: number; max: number; count: number; playerById: MiniGameViewProps["playerById"] }) {
  const p = playerById(row.playerId);
  const crowd = count > 5;
  const height = 3 + (max > 0 ? (row.mastered / max) * (BAR_MAX_REM - 3) : 0);
  return (
    <motion.div data-testid={`simon-col-${row.playerId}`} data-winner={row.winner ? "true" : "false"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: COLUMN_STEP_S * rank }} className="flex w-[11rem] flex-col items-center justify-end gap-2">
      <div className="relative">
        {row.winner && (
          <motion.span initial={{ y: -40, opacity: 0, rotate: -30 }} animate={{ y: 0, opacity: 1, rotate: -8 }} transition={{ delay: CROWN_DELAY_S + CROWN_STEP_S * rank, type: "spring", stiffness: 200, damping: 10 }} className="absolute -top-[3rem] left-1/2 -translate-x-1/2 text-[3.5rem] leading-none">
            👑
          </motion.span>
        )}
        <PlayerAvatar profile={p?.profile ?? null} size={crowd ? "md" : "lg"} dimmed={!row.winner && row.mastered === 0} />
      </div>
      <motion.div initial={{ height: "3rem" }} animate={{ height: `${height}rem` }} transition={{ delay: BAR_DELAY_S + COLUMN_STEP_S * rank, type: "spring", stiffness: 70, damping: 14 }} className={`flex w-[7.5rem] items-start justify-center rounded-t-card pt-2 font-display text-4xl ${row.winner ? "bg-gold text-accent-ink shadow-glow" : "bg-surface-strong text-ink"}`}>
        {row.mastered}
      </motion.div>
      <span className="w-full truncate text-center text-xl font-bold">{p?.profile?.name}</span>
    </motion.div>
  );
}

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  if (!results) return null;
  const rows = results.rows;
  const max = Math.max(0, ...rows.map((r) => r.mastered));
  const winners = rows.filter((r) => r.winner);
  const names = winners.map((w) => playerById(w.playerId)?.profile?.name ?? "");
  const text =
    winners.length === 0
      ? "Personne n'a tenu bon…"
      : winners.length === 1
        ? `${names[0]} gagne${max > 0 ? ` avec ${max} note${max > 1 ? "s" : ""}` : ""} !`
        : winners.length === rows.length
          ? "Égalité : tout le monde l'emporte !"
          : `Égalité : ${names.join(", ")}`;
  return (
    <div data-testid="simon-results" className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3">
      <div className="flex min-h-0 flex-1 items-end justify-center gap-x-4 pt-14">
        {rows.map((r, i) => (
          <Column key={r.playerId} row={r} rank={i} max={max} count={rows.length} playerById={playerById} />
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: TEXT_DELAY_S }} className="max-w-[100rem] truncate text-center text-4xl font-bold text-accent">
        {text}
      </motion.p>
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  const me = results?.rows.find((r) => r.playerId === myId);
  if (!results || !me) return null;
  const rank = results.rows.findIndex((r) => r.playerId === myId) + 1;
  return (
    <div data-testid="phone-simon-result" data-winner={me.winner ? "true" : "false"} className="flex flex-col items-center gap-2 text-center">
      <p className={`font-display text-2xl ${me.winner ? "text-gold-gradient" : "text-ink"}`}>{me.winner ? "👑 Dernier debout !" : `${rank}${rank === 1 ? "er" : "e"} sur ${results.rows.length}`}</p>
      <p className="text-ink-muted">
        {me.mastered > 0 ? (
          <>
            Tu as tenu <b className="text-accent">{me.mastered}</b> note{me.mastered > 1 ? "s" : ""}
          </>
        ) : (
          "Tombé dès la première suite"
        )}
      </p>
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.rows.length) : 0) } satisfies MiniGameViews;
