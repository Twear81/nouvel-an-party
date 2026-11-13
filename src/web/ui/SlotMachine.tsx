// Machine à sous de catégories : une colonne d'emoji + titre défile puis ralentit et s'arrête sur la dernière entrée de
// `items` (la catégorie tirée par le serveur ; l'écran ne tire rien). Une seule animation de transform sur la colonne.
import { motion } from "motion/react";
import { useMemo } from "react";

export interface SlotItem { id: string; emoji: string; title: string }

const ROW_REM = 10;
/** Nombre de lignes qui défilent avant l'arrêt. */
export const SLOT_ROWS = 22;
/** Décélération : la même fonction sert à l'animation et au calcul des tics sonores. */
export const slotEase = (t: number) => 1 - (1 - t) ** 3;

/** Instants (fraction 0-1 de la durée du défilement) où chaque ligne passe dans la fenêtre : un tic par ligne. */
export function slotTickTimes(rows = SLOT_ROWS): number[] {
  const last = rows - 2;
  return Array.from({ length: last }, (_, i) => 1 - (1 - (i + 1) / last) ** (1 / 3));
}

export function SlotMachine({ items, spinSeconds, delaySeconds = 0 }: { items: SlotItem[]; spinSeconds: number; delaySeconds?: number }) {
  const rows = useMemo(() => {
    const n = items.length;
    if (n === 0) return [];
    const total = SLOT_ROWS;
    const offset = ((n - 1 - (total - 1)) % n + n) % n;
    // total lignes jusqu'à la gagnante (index total - 1), plus une voisine dessous.
    return Array.from({ length: total + 1 }, (_, j) => items[(j + offset) % n]!);
  }, [items]);
  const target = (SLOT_ROWS - 2) * ROW_REM;
  const winner = items.at(-1);
  return (
    <div data-testid="slot-machine" data-award={winner?.id} className="cer-slot">
      <motion.div className="cer-slot-strip" initial={{ y: 0 }} animate={{ y: `${-target}rem` }}
        transition={{ delay: delaySeconds, duration: spinSeconds, ease: slotEase }}>
        {rows.map((r, i) => <div key={i} className="cer-slot-row"><span>{r.emoji}</span><span>{r.title}</span></div>)}
      </motion.div>
      <div className="cer-slot-fade" data-side="top" />
      <div className="cer-slot-fade" data-side="bottom" />
      <div className="cer-slot-window" />
    </div>
  );
}
