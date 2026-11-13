// Enveloppe dorée scellée, façon cérémonie des Oscars : elle glisse jusqu'au centre, le sceau saute, le rabat s'ouvre.
// Dessinée en CSS (theme/ceremonie.css) ; seuls transform et opacity s'animent. Durées en secondes (déjà à l'échelle).
import { motion } from "motion/react";

export function Envelope({ slideSeconds, openAfter, openSeconds = 0.5, exitAfter, exitSeconds = 0.5 }: {
  slideSeconds: number;
  /** Délai (s) avant l'ouverture, depuis le début. */
  openAfter: number;
  openSeconds?: number;
  /** Délai (s) avant de s'effacer en glissant vers le bas. */
  exitAfter: number;
  exitSeconds?: number;
}) {
  return (
    <motion.div data-testid="envelope" aria-hidden
      initial={{ x: "-70cqw", rotate: -10, opacity: 0, y: 0 }}
      animate={{ x: 0, rotate: 0, opacity: [0, 1, 1, 0], y: [0, 0, 0, 6 * 16] }}
      transition={{
        x: { duration: slideSeconds, ease: [0.16, 1, 0.3, 1] },
        rotate: { duration: slideSeconds, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: exitAfter + exitSeconds, times: [0, 0.05, exitAfter / (exitAfter + exitSeconds), 1], ease: "linear" },
        y: { duration: exitAfter + exitSeconds, times: [0, 0.05, exitAfter / (exitAfter + exitSeconds), 1], ease: "easeIn" },
      }}
      className="cer-envelope">
      <div className="cer-envelope-back" />
      <motion.div className="cer-envelope-flap" initial={{ rotateX: 0 }} animate={{ rotateX: 180 }}
        transition={{ delay: openAfter, duration: openSeconds, ease: "easeOut" }} />
      <div className="cer-envelope-front" />
      <motion.div className="cer-envelope-seal" initial={{ scale: 1, opacity: 1 }} animate={{ scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
        transition={{ delay: openAfter - 0.25, duration: 0.45, times: [0, 0.4, 1] }}>★</motion.div>
    </motion.div>
  );
}
