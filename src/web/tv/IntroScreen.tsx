import { motion } from "motion/react";
import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { TvGameView } from "./GameView";

export function IntroScreen({ snapshot, round }: { snapshot: GameSnapshot; round: RoundInfo }) {
  // Un nom long (« Pierre-feuille-ciseaux : le tournoi ») tient sur une ligne pour laisser la place au jeu dessous.
  const long = round.gameName.length > 18;
  return (
    <div data-testid="tv-intro" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        data-ui="round-tag"
        className="rounded-chip bg-surface-strong px-10 py-3 font-display text-4xl tracking-widest text-accent"
      >
        Manche {round.number} / {round.normalTotal}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, scale: 0.4, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.2 }}
        className={`font-display ${long ? "text-[4.5rem]" : "text-[7rem]"} leading-[1.05] text-gold-gradient drop-shadow-[0_0_2rem_color-mix(in_srgb,var(--color-accent)_40%,transparent)]`}
      >
        {round.gameName}
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="flex min-h-0 w-full"
      >
        <TvGameView snapshot={snapshot} round={round} kind="Tv" />
      </motion.div>
    </div>
  );
}
