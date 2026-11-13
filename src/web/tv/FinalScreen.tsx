// Classement final : révélation suspense de la dernière à la première place, puis podium et confettis.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { FINAL_ENTRY_MS } from "../../shared/final-reveal";
import { useFinalReveal } from "../net/useFinalReveal";
import { rankOf } from "../../shared/ranking";
import { playersWithProfile } from "../net/helpers";
import type { GameSnapshot } from "../../shared/types";
import { CountUp, fireConfetti, PlayerAvatar } from "../ui";

export function FinalScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const sorted = useMemo(
    () => playersWithProfile(snapshot).filter((p) => snapshot.finalReveal?.playerIds.includes(p.id))
      .sort((a, b) => b.score - a.score || a.profile!.name.localeCompare(b.profile!.name)),
    [snapshot.players, snapshot.finalReveal],
  );
  const total = sorted.length;
  const { step, done } = useFinalReveal(snapshot.finalReveal);
  const revealed = (index: number) => index >= total - step; // index dans `sorted`
  useEffect(() => {
    if (done && total > 0) fireConfetti("big");
  }, [done, total]);

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  // Ordre visuel du podium : 2e, 1er, 3e
  const podiumOrder = [1, 0, 2].filter((i) => i < podium.length);
  const heights = ["h-[17rem]", "h-[12rem]", "h-[9rem]"];

  return (
    <div data-testid="tv-final" data-stage={done ? "done" : "reveal"} className="flex min-h-0 flex-1 flex-col items-center gap-2 px-tv-gutter pt-6">
      <motion.h1 key={done ? "done" : "reveal"} initial={{ opacity: 0, y: -30, scale: done ? 0.5 : 1 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className="font-display text-6xl text-gold-gradient">
        {done ? "Bonne année !" : "Le classement…"}
      </motion.h1>

      {total === 0 && <p className="mt-20 text-4xl text-ink-muted">Personne n'a joué…</p>}

      <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-12">
        {/* Podium */}
        <div data-ui="podium" className="flex items-end gap-5">
          {podiumOrder.map((i) => {
            const p = podium[i]!;
            const shown = revealed(i);
            return (
              <div key={p.id} data-testid={`podium-${i + 1}`} className="flex w-[19rem] flex-col items-center">
                <div className="mb-5 flex min-h-[19rem] flex-col items-center justify-end gap-2">
                  <AnimatePresence>
                    {shown && (
                      <motion.div
                        initial={{ opacity: 0, y: -200, scale: 0.4 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", duration: FINAL_ENTRY_MS / 1000, bounce: 0.2 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <PlayerAvatar profile={p.profile} size={i === 0 ? "xl" : "lg"} crowned={i === 0} crownDelay={0.35} />
                        <span className="max-w-full truncate text-3xl font-bold">{p.profile!.name}</span>
                        <CountUp value={p.score} duration={1.2} className="font-num text-4xl text-accent" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ transformOrigin: "bottom" }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                  className={`flex w-full items-start justify-center rounded-t-card pt-3 font-display text-7xl ${heights[i]} ${i === 0 ? "bg-gold text-accent-ink" : "glass text-accent"}`}
                >
                  {shown ? rankOf(sorted, i) : "?"}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Autres joueurs : apparaissent du dernier vers le 4e */}
        {rest.length > 0 && (
          <div className="flex h-full w-[28rem] shrink-0 flex-col justify-end gap-2 overflow-hidden pb-2">
            <AnimatePresence initial={false}>
              {rest.map((p, k) => {
                const i = k + 3;
                if (!revealed(i)) return null;
                return (
                  <motion.div
                    layout
                    key={p.id}
                    data-testid={`rank-${i + 1}`}
                    data-ui="score-row"
                    data-rank={rankOf(sorted, i)}
                    data-highlight="false"
                    initial={{ opacity: 0, x: 120 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 160, damping: 14 }}
                    className="glass flex items-center gap-4 rounded-btn px-5 py-2"
                    style={{ order: i }}
                  >
                    <span className="w-12 text-center font-num text-3xl text-ink-muted">{rankOf(sorted, i)}</span>
                    <PlayerAvatar profile={p.profile} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-2xl font-bold">{p.profile!.name}</span>
                    <CountUp value={p.score} duration={0.8} className="font-num text-3xl text-accent" />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
