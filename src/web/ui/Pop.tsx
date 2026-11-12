// Effets de vie réutilisables (transform / opacity uniquement) : `Pop` (petit rebond à chaque changement de valeur ou à
// l'apparition), `CountUp` (nombre qui défile), `FlyingPoints` (« +N » qui jaillit et s'envole), `WaitingDots` (attente),
// `useChanged` (vrai quand une valeur du snapshot vient de changer, jamais au montage : pas de rejeu au rechargement).
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/** true pendant le rendu où `value` vient de changer (jamais au premier rendu). */
export function useChanged(value: unknown): boolean {
  const prev = useRef(value);
  const first = useRef(true);
  const changed = !first.current && prev.current !== value;
  useEffect(() => {
    first.current = false;
    prev.current = value;
  });
  return changed;
}

interface PopProps {
  /** Quand cette valeur change, le contenu fait un petit rebond. */
  value?: unknown;
  /** Rebond aussi à l'apparition (sinon seulement aux changements). */
  appear?: boolean;
  /** Amplitude du rebond (1.25 par défaut). */
  scale?: number;
  className?: string;
  children?: ReactNode;
  "data-testid"?: string;
}

export function Pop({ value, appear = false, scale = 1.25, className = "", children, ...rest }: PopProps) {
  const changed = useChanged(value);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!changed || !el.current) return;
    const c = animate(el.current, { scale: [1, scale, 1] }, { duration: 0.4, ease: "easeOut" });
    return () => c.stop();
  }, [changed, value, scale]);
  return (
    <motion.span
      ref={el}
      data-testid={rest["data-testid"]}
      initial={appear ? { scale: 0, opacity: 0 } : false}
      animate={appear ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: "spring", stiffness: 420, damping: 13 }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.span>
  );
}

/** Nombre qui défile jusqu'à `value` (depuis 0 au montage, depuis l'ancienne valeur ensuite). */
export function CountUp({ value, duration = 0.9, prefix = "", className = "", ...rest }: { value: number; duration?: number; prefix?: string; className?: string; "data-testid"?: string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}`);
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: "easeOut" });
    return () => c.stop();
  }, [value, duration, mv]);
  return (
    <motion.span data-testid={rest["data-testid"]} data-value={value} className={`tabular-nums ${className}`}>
      {text}
    </motion.span>
  );
}

/** « +N » fantôme qui jaillit d'un point et s'envole en s'effaçant. À poser dans un parent `relative`. */
export function FlyingPoints({ value, delay = 0, className = "" }: { value: number; delay?: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span aria-hidden data-ui="flying-points" className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 ${className}`}>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0], y: [10, -30, -80, -130], scale: [0.4, 1.5, 1.3, 1.1] }}
        transition={{ delay, duration: 1.6, times: [0, 0.2, 0.6, 1], ease: "easeOut" }}
        className="block font-num text-5xl text-good"
      >
        +{value}
      </motion.span>
    </span>
  );
}

/** Les deux yeux « regarde la TV » : ils louchent d'un côté puis de l'autre, légèrement. */
export function WatchingEyes({ testId }: { testId?: string }) {
  return (
    <motion.span
      aria-hidden
      data-testid={testId}
      animate={{ x: [0, -10, -10, 10, 10, 0], rotate: [0, -4, -4, 4, 4, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.15, 0.45, 0.6, 0.9, 1] }}
      className="inline-block text-8xl"
    >
      👀
    </motion.span>
  );
}

/** Trois points qui rebondissent en cascade : « on attend les autres », sans texte. */
export function WaitingDots({ className = "" }: { className?: string }) {
  return (
    <span data-ui="waiting-dots" aria-hidden className={`inline-flex items-end gap-1.5 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          className="inline-block h-2.5 w-2.5 rounded-full bg-current"
        />
      ))}
    </span>
  );
}
