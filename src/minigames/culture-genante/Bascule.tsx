// Scène 2 : la BASCULE. Rupture nette : plus de fête, un décor sombre, un silence, puis la phrase sérieuse.
// Pour changer la mise en scène : modifier ce composant (aucune logique de jeu ici).
import { motion } from "motion/react";
import { fitText } from "./Serious";

/** Durée (s) du blanc de noir avant la phrase sérieuse. */
export const silenceBascule = (seconds: number) => Math.min(0.7, seconds * 0.3);

export function Bascule({ text, seconds }: { text: string; seconds: number }) {
  // Un blanc de noir complet avant la phrase : c'est lui qui fait « le silence ».
  const silence = silenceBascule(seconds);
  const size = fitText(text, 80, 3.5, 7, 2);
  return (
    <div data-testid="cg-bascule" className="flex min-h-0 flex-1 items-center justify-center px-16">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: silence, duration: 0.9, ease: "easeOut" }}
        className="max-w-[80rem] text-balance text-center leading-tight tracking-wide text-serious-ink"
        style={{ fontSize: `${size}rem` }}
      >
        {text}
      </motion.p>
    </div>
  );
}
