// Classement final : révélation suspense de la dernière à la première place, puis podium et confettis.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { rankOf } from "../../shared/ranking";
import type { GameSnapshot } from "../../shared/types";
import { fireConfetti, PlayerAvatar } from "../ui";

const STEP_MS = 1700; // suspense pour le podium
const FAST_STEP_MS = 1000; // du dernier au 4e : plus vite

export function FinalScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const sorted = useMemo(
    () => snapshot.players.filter((p) => p.profile).sort((a, b) => b.score - a.score || a.profile!.name.localeCompare(b.profile!.name)),
    [snapshot.players],
  );
  const total = sorted.length;
  const [step, setStep] = useState(0); // nombre de joueurs révélés (depuis le dernier)

  useEffect(() => {
    if (step >= total) return;
    // Le prochain joueur révélé a l'index total - step - 1 : le podium (index 0..2) prend son temps.
    const nextIndex = total - step - 1;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 1800 : nextIndex >= 3 ? FAST_STEP_MS : STEP_MS);
    return () => clearTimeout(id);
  }, [step, total]);

  const revealed = (index: number) => index >= total - step; // index dans `sorted`
  const done = step >= total;
  useEffect(() => {
    if (done && total > 0) fireConfetti("big");
  }, [done, total]);

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  // Ordre visuel du podium : 2e, 1er, 3e
  const podiumOrder = [1, 0, 2].filter((i) => i < podium.length);
  const heights = ["h-[17rem]", "h-[12rem]", "h-[9rem]"];

  return (
    <div data-testid="tv-final" className="flex min-h-0 flex-1 flex-col items-center gap-2 px-12 pt-6">
      <motion.h1 initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="font-display text-6xl text-gold-gradient">
        {done ? "Bonne année !" : "Le classement…"}
      </motion.h1>

      {total === 0 && <p className="mt-20 text-4xl text-ink-muted">Personne n'a joué…</p>}

      <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-12">
        {/* Podium */}
        <div className="flex items-end gap-5">
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
                        transition={{ type: "spring", stiffness: 120, damping: 22 }}
                        className="flex flex-col items-center gap-2"
                      >
                        {i === 0 && <motion.span animate={{ rotate: [-8, 8, -8] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl">👑</motion.span>}
                        <PlayerAvatar profile={p.profile} size={i === 0 ? "xl" : "lg"} />
                        <span className="max-w-full truncate text-3xl font-bold">{p.profile!.name}</span>
                        <span className="font-display text-4xl text-accent">{p.score}</span>
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
                    initial={{ opacity: 0, x: 120 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass flex items-center gap-4 rounded-btn px-5 py-2"
                    style={{ order: i }}
                  >
                    <span className="w-12 text-center font-display text-3xl text-ink-muted">{rankOf(sorted, i)}</span>
                    <PlayerAvatar profile={p.profile} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-2xl font-bold">{p.profile!.name}</span>
                    <span className="font-display text-3xl text-accent">{p.score}</span>
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
