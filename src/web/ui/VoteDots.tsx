// Pastilles anonymes de progression d'un vote (on ne dit pas qui a voté) + compteur n / total.
import { motion } from "motion/react";

export function VoteDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-5">
      <div className="flex items-center gap-2" data-testid="tv-vote-dots">
        {Array.from({ length: total }, (_, i) => (
          <motion.span key={i} animate={{ scale: i < done ? 1.2 : 1 }} className={`h-6 w-6 rounded-full ${i < done ? "bg-gold shadow-glow" : "bg-surface-strong"}`} />
        ))}
      </div>
      <span data-testid="tv-vote-count" className="font-display text-4xl text-ink-muted">
        <span className="text-accent">{done}</span> / {total}
      </span>
    </div>
  );
}
