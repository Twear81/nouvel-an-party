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
      <div className="relative overflow-hidden px-10 py-1">
        <motion.h1
          initial={{ opacity: 0, scale: 2.6, rotate: -7 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 15, delay: 0.2 }}
          className={`font-display ${long ? "text-[4.5rem]" : "text-[7rem]"} leading-[1.05] text-gold-gradient drop-shadow-[0_0_2rem_color-mix(in_srgb,var(--color-accent)_40%,transparent)]`}
        >
          {round.gameName}
        </motion.h1>
        {/* Balayage de lumière : une bande inclinée qui traverse une fois, juste après le claquement. */}
        <motion.span
          aria-hidden
          data-ui="intro-sheen"
          initial={{ x: "-120%", opacity: 0 }}
          animate={{ x: "120%", opacity: [0, 1, 1, 0] }}
          transition={{ delay: 0.75, duration: 0.9, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-ink/30 to-transparent"
        />
      </div>
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
