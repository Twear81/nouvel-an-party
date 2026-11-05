// Écrans de "Tier list" : n'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { CheckIcon, fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";
import { TIER_BG, TIER_BORDER, TIER_TEXT, TierBadge, TierBoard } from "./tiers";

// ───────────────────────────── TV pendant le jeu ─────────────────────────────

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const finished = voters.filter((p) => pub.progress[p.id] && pub.progress[p.id]!.done >= pub.progress[p.id]!.total).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-balance text-center text-5xl font-extrabold leading-tight">
        {pub.question}
      </motion.h1>
      <TierBoard tiers={pub.tiers} testId="tier-board">
        {() => null}
      </TierBoard>
      <div className="flex shrink-0 items-center gap-8">
        <div data-testid="tv-answered-count" className="font-display text-5xl text-ink-muted">
          <span className="text-accent">{finished}</span> / {voters.length}
        </div>
        <div data-testid="tv-answered" className="flex flex-1 flex-wrap items-start justify-center gap-x-3 gap-y-2">
          {voters.map((p) => {
            const prog = pub.progress[p.id] ?? { done: 0, total: 1 };
            const done = prog.done >= prog.total;
            return (
              <motion.div key={p.id} animate={{ scale: done ? 1 : 0.94, y: done ? -4 : 0 }} className="flex w-[9.5rem] flex-col items-center gap-1">
                <PlayerAvatar profile={p.profile} size="md" dimmed={!done && prog.done === 0} badge={done ? <CheckIcon /> : undefined} />
                <span className={`w-full truncate text-center text-xl font-bold ${done ? "text-ink" : "text-ink-muted"}`}>{p.profile!.name}</span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-strong">
                  <motion.div animate={{ width: `${(prog.done / Math.max(1, prog.total)) * 100}%` }} className="h-full rounded-full bg-gold" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────── Téléphone pendant le jeu ─────────────────────────────

const Phone = ({ pub, priv, round, players, snapshot, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const myId = snapshot.me?.id;
  const targets = players.filter((p) => round.participants.includes(p.id) && p.profile && (pub.allowSelf || p.id !== myId));
  const mine = priv?.mine ?? {};
  const done = targets.filter((t) => mine[t.id] !== undefined).length;
  const complete = targets.length > 0 && done === targets.length;
  // Avec plus de 4 étages les boutons se serrent : le pseudo laisse de la place.
  const manyTiers = pub.tiers.length > 4;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 text-balance text-center text-lg font-extrabold leading-tight min-[400px]:text-xl">{pub.question}</h1>
      <div data-testid="rate-progress" className="flex h-6 shrink-0 items-center gap-2">
        {complete ? (
          <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex w-full items-center justify-center gap-2 text-base font-bold text-good">
            <CheckIcon /> Tout est noté !
          </motion.p>
        ) : (
          <>
            <div className="flex flex-1 gap-1">
              {targets.map((t) => (
                <div key={t.id} className="h-2 flex-1 overflow-hidden rounded-full bg-surface-strong">
                  <motion.div initial={false} animate={{ width: mine[t.id] !== undefined ? "100%" : "0%" }} className="h-full bg-gold" />
                </div>
              ))}
            </div>
            <span className="w-10 text-right font-display text-base tabular-nums text-accent">
              {done}/{targets.length}
            </span>
          </>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain pb-1">
        {targets.map((p) => {
          const tier = mine[p.id];
          return (
            <div
              key={p.id}
              data-testid={`rate-row-${p.id}`}
              className={`flex max-h-[4.6rem] min-h-[3.1rem] flex-1 items-center gap-2 rounded-btn border-2 bg-surface p-1 ${tier !== undefined ? TIER_BORDER[tier] : "border-transparent"}`}
            >
              <PlayerAvatar profile={p.profile} size="xs" />
              <span className={`shrink-0 truncate text-sm font-bold leading-tight ${manyTiers ? "w-[4.2rem]" : "w-[6.2rem]"}`}>{p.profile!.name}</span>
              <div className="flex h-full min-w-0 flex-1 gap-1">
                {pub.tiers.map((label, i) => {
                  const selected = tier === i;
                  return (
                    <motion.button
                      key={label}
                      type="button"
                      data-testid={`rate-${p.id}-${i}`}
                      aria-pressed={selected}
                      aria-label={`${p.profile!.name} : ${label}`}
                      whileTap={{ scale: 0.88 }}
                      animate={{ scale: selected ? 1.08 : 1, opacity: tier !== undefined && !selected ? 0.4 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      onClick={() => void sendInput({ target: p.id, tier: i }).catch(() => {})}
                      className={`min-w-0 flex-1 rounded-btn border-2 font-display text-lg leading-none ${TIER_BORDER[i]} ${selected ? `${TIER_BG[i]} text-accent-ink shadow-glow` : `bg-bg/40 ${TIER_TEXT[i]}`}`}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ───────────────────────────── TV résultats : la tier list se remplit ─────────────────────────────

/** Ordre de révélation : du plus bas étage vers le S, le meilleur arrive en dernier. */
const revealOrder = (placements: Results["placements"]) => [...placements].sort((a, b) => b.tier - a.tier || a.percent - b.percent);

/** Pause (ms) avant de révéler le n-ième invité : plus longue pour le suspense en haut du classement. */
function pauseBefore(order: Results["placements"], k: number): number {
  if (k === 0) return 1500;
  if (order[k]!.tier === 0) return k === order.length - 1 ? 2800 : 1900;
  return 1200;
}

/** Délai (ms) entre l'arrivée du dernier invité et la fin de l'animation (chute, confettis, pourcentage). */
const SETTLE_MS = 1300;

/** Durée totale (s) de la révélation : somme des pauses avant chaque invité, plus la chute du dernier. */
export function revealSeconds(placements: Results["placements"]): number {
  const order = revealOrder(placements);
  if (order.length === 0) return 0;
  return (order.reduce((sum, _, k) => sum + pauseBefore(order, k), 0) + SETTLE_MS) / 1000;
}

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  // Du plus bas étage vers le S : le meilleur arrive en dernier.
  const order = useMemo(() => (results ? revealOrder(results.placements) : []), [results]);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= order.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), pauseBefore(order, revealed));
    return () => clearTimeout(t);
  }, [revealed, order]);

  // Confettis quand un invité atterrit au sommet, grand final quand tout le monde est placé.
  useEffect(() => {
    if (revealed === 0 || revealed > order.length) return;
    const last = order[revealed - 1]!;
    const t = setTimeout(() => {
      if (revealed === order.length) fireConfetti("big");
      else if (last.tier === 0) fireConfetti("small");
    }, 450);
    return () => clearTimeout(t);
  }, [revealed, order]);

  if (!results) return null;
  const shown = order.slice(0, revealed);
  const inTier = (i: number) => shown.filter((p) => p.tier === i).sort((a, b) => b.percent - a.percent);
  const size = results.tiers.length > 5 ? "sm" : "md";
  return (
    <div data-testid="tier-results" data-revealed={revealed} data-total={order.length} className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="text-balance text-center text-4xl font-extrabold leading-tight">{results.question}</h1>
      {order.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-5xl text-ink-muted">Personne n'a noté…</p>
      ) : (
        <TierBoard tiers={results.tiers} testId="tier-board-results" pulse={(i) => shown.filter((p) => p.tier === i).length}>
          {(i) =>
            inTier(i).map((p) => (
              <motion.div
                key={p.playerId}
                layout="position"
                data-testid={`placed-${p.playerId}`}
                initial={{ y: "-42rem", opacity: 0, scale: 1.5, rotate: -14 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 13, mass: 1, layout: { type: "spring", stiffness: 300, damping: 28 } }}
                className="flex w-[7.5rem] flex-col items-center"
              >
                <PlayerAvatar profile={playerById(p.playerId)?.profile ?? null} size={size} />
                <span className="w-full truncate text-center text-lg font-bold leading-tight">{playerById(p.playerId)?.profile?.name ?? "?"}</span>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-base leading-none text-ink-muted tabular-nums">
                  {p.percent} %
                </motion.span>
              </motion.div>
            ))
          }
        </TierBoard>
      )}
    </div>
  );
};

// ───────────────────────────── Téléphone résultats ─────────────────────────────

const PhoneResults = ({ results, snapshot, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.hits[myId];
  const myPlacement = results.placements.find((p) => p.playerId === myId);
  const rated = Object.keys(results.ratings[myId] ?? {});
  return (
    <div data-testid="tier-phone-results" className="flex flex-col items-center gap-3 text-center">
      {myPlacement && (
        <div className="flex items-center gap-3">
          <span className="text-ink-muted">Tu es en</span>
          <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 12, delay: 0.3 }}>
            <TierBadge index={myPlacement.tier} label={results.tiers[myPlacement.tier]!} className="h-14 w-14 rounded-btn text-3xl" />
          </motion.div>
        </div>
      )}
      {mine ? (
        <>
          <p className="text-xl font-bold">
            <span className={mine.good.length > 0 ? "text-good" : "text-ink-muted"}>{mine.good.length}</span> / {mine.rated} comme la tablée
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {rated.map((id, i) => {
              const ok = mine.good.includes(id);
              return (
                <motion.div key={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.07 }}>
                  <PlayerAvatar profile={playerById(id)?.profile ?? null} size="xs" dimmed={!ok} badge={ok ? <CheckIcon /> : undefined} />
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-xl text-ink-muted">Tu n'as noté personne</p>
      )}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.placements) : 0) } satisfies MiniGameViews;
