import { motion } from "motion/react";
import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { waitingPlayers } from "../net/helpers";
import { PlayerAvatar } from "../ui";
import { TvGameView } from "./GameView";
import { RoundHeader } from "./PlayingScreen";

export function ResultsScreen({ snapshot, round }: { snapshot: GameSnapshot; round: RoundInfo }) {
  const deltas = round.deltas ?? {};
  const waiting = waitingPlayers(snapshot);
  const missing = waiting.filter((p) => !snapshot.continued.includes(p.id));
  const strip = snapshot.players
    .filter((p) => p.profile)
    .sort((a, b) => (deltas[b.id] ?? 0) - (deltas[a.id] ?? 0));

  return (
    <div data-testid="tv-results" className="flex min-h-0 flex-1 flex-col">
      <RoundHeader round={round}>
        <span className="font-display text-3xl text-accent">Résultats</span>
      </RoundHeader>
      <div className="flex min-h-0 flex-1 flex-col px-14 pt-2">
        <TvGameView snapshot={snapshot} round={round} kind="TvResults" />
      </div>
      <footer className="glass mx-10 mb-8 mt-3 rounded-card px-8 py-4">
        <div className="flex items-center gap-5 overflow-hidden">
          <div className="flex min-w-0 flex-1 items-end gap-5">
            {strip.map((p, i) => {
              const gained = deltas[p.id] ?? 0;
              const done = snapshot.continued.includes(p.id);
              return (
                <motion.div
                  key={p.id}
                  data-testid={`delta-${p.id}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className={`font-display text-3xl ${gained > 0 ? "text-good" : "text-ink-muted"}`}>{gained > 0 ? `+${gained}` : "0"}</span>
                  <PlayerAvatar profile={p.profile} size="sm" dimmed={!p.connected} badge={done ? "✓" : undefined} className={done ? "drop-shadow-[0_0_0.8rem_var(--color-good)]" : ""} />
                  <span className="max-w-[6rem] truncate text-sm text-ink-muted">{p.profile!.name}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="w-[22rem] shrink-0 text-right text-3xl font-semibold text-ink-muted">
            {missing.length === 0 ? "Tout le monde est prêt !" : `En attente de ${missing.length} joueur${missing.length > 1 ? "s" : ""}…`}
          </div>
        </div>
      </footer>
    </div>
  );
}
