// Clin d'œil Dragon Ball du lobby : les 7 boules de cristal (1★ à 7★), une de plus allumée par joueur prêt, et Shenron qui
// traverse le décor quand la septième s'allume. L'état vient du snapshot (nombre de joueurs prêts) : seul l'éclat d'allumage
// est un effet passager (jamais rejoué au montage). Dessin 100 % CSS statique (dégradés, étoiles en clip-path) ; couleurs
// dans theme.css (--color-dragonball*), dragon dans src/web/theme/assets/shenron.svg. Animations : transform / opacity.
import { animate, motion } from "motion/react";
import { useEffect, useRef } from "react";
import shenron from "../theme/assets/shenron.svg";
import { useChanged } from "./Pop";

/** Nombre de boules de la légende ; au-delà, une boule « bonus » s'ajoute. */
export const DRAGON_BALLS = 7;

/** Position (en % de la boule) de chaque étoile, selon le nombre d'étoiles (disposition des vraies boules). */
const STAR_LAYOUT: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[34, 50], [66, 50]],
  3: [[50, 32], [33, 64], [67, 64]],
  4: [[35, 35], [65, 35], [35, 65], [65, 65]],
  5: [[35, 33], [65, 33], [50, 50], [35, 67], [65, 67]],
  6: [[35, 28], [65, 28], [35, 50], [65, 50], [35, 72], [65, 72]],
  7: [[50, 50], [50, 24], [72, 37], [72, 63], [50, 76], [28, 63], [28, 37]],
  // Boule bonus (8e joueur) : une couronne de huit petites étoiles.
  8: Array.from({ length: 8 }, (_, i) => [50 + 30 * Math.cos((i * Math.PI) / 4), 50 + 30 * Math.sin((i * Math.PI) / 4)] as [number, number]),
};
const STAR_CLIP = "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

function Ball({ n, lit, bonus = false }: { n: number; lit: boolean; bonus?: boolean }) {
  const changed = useChanged(lit);
  const ball = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  // Allumage : la boule gonfle puis se pose, un anneau de lumière s'élargit en s'éteignant.
  useEffect(() => {
    if (!changed || !lit || !ball.current || !ring.current) return;
    void animate(ball.current, { scale: [1, 1.55, 0.95, 1] }, { duration: 0.65, ease: "easeOut" });
    void animate(ring.current, { scale: [0.9, 2.8], opacity: [0.95, 0] }, { duration: 0.9, ease: "easeOut" });
    // Pas de nettoyage : si un autre joueur arrive pendant l'éclat, il doit aller au bout (sinon l'anneau reste figé).
  }, [changed, lit]);
  const size = n === 8 ? 0.13 : 0.2;
  return (
    <motion.div
      data-testid={`dragon-ball-${n}`}
      data-lit={lit ? "true" : "false"}
      data-bonus={bonus ? "true" : "false"}
      initial={bonus ? { scale: 0, opacity: 0 } : false}
      animate={bonus ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 12 }}
      className="relative h-[4.2rem] w-[4.2rem] shrink-0"
    >
      <span ref={ring} aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-[0.25rem] border-dragonball-light opacity-0" />
      <div
        ref={ball}
        className={`relative h-full w-full rounded-full border-[0.15rem] border-dragonball-deep transition-opacity duration-500 ${lit ? "opacity-100 shadow-[0_0_1.6rem_0.2rem_var(--color-dragonball)]" : "opacity-30"}`}
        style={{ background: "radial-gradient(circle at 32% 28%, var(--color-dragonball-light) 0%, var(--color-dragonball) 48%, var(--color-dragonball-deep) 100%)" }}
      >
        {(STAR_LAYOUT[n] ?? []).map(([x, y], i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-dragonball-star"
            style={{ left: `${x}%`, top: `${y}%`, width: `${size * 100}%`, height: `${size * 100}%`, clipPath: STAR_CLIP }}
          />
        ))}
        {/* Reflet fixe de la sphère */}
        <span aria-hidden className="absolute left-[18%] top-[12%] h-[18%] w-[30%] -rotate-[35deg] rounded-full bg-ink opacity-50" />
      </div>
    </motion.div>
  );
}

/** Les boules de cristal : `lit` = nombre de joueurs prêts (une boule de plus apparaît au-delà de 7). */
export function DragonBalls({ lit }: { lit: number }) {
  const shown = Math.min(lit, DRAGON_BALLS + 1);
  return (
    <div data-testid="dragon-balls" data-lit={shown} className="flex shrink-0 items-center gap-2">
      {Array.from({ length: DRAGON_BALLS }, (_, i) => (
        <Ball key={i + 1} n={i + 1} lit={shown > i} />
      ))}
      {shown > DRAGON_BALLS && <Ball n={DRAGON_BALLS + 1} lit bonus />}
    </div>
  );
}

/** Shenron qui traverse le décor une seule fois (à poser dans un parent `relative` : il se place derrière le contenu). */
export function Shenron({ onDone }: { onDone: () => void }) {
  return (
    <div aria-hidden data-testid="shenron" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.img
        src={shenron}
        alt=""
        draggable={false}
        initial={{ x: "-105%", y: 0, opacity: 0 }}
        animate={{ x: "175%", y: [0, -50, 30, -40, 0], rotate: [0, -3, 2, -2, 0], opacity: [0, 0.75, 0.75, 0.75, 0] }}
        transition={{ duration: 7, ease: "linear", times: [0, 0.25, 0.5, 0.75, 1] }}
        onAnimationComplete={onDone}
        className="absolute left-0 top-[8%] w-[58%] max-w-none"
      />
    </div>
  );
}
