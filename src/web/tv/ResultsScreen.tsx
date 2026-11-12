import { motion } from "motion/react";
import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { playersWithProfile, waitingPlayers } from "../net/helpers";
import { useRevealed } from "../net/useReveal";
import { CheckIcon, FlyingPoints, PlayerAvatar, Pop } from "../ui";
import { TvGameView, tvViewProps } from "./GameView";
import { GameFrame, RoundHeader } from "./PlayingScreen";

export function ResultsScreen({ snapshot, round }: { snapshot: GameSnapshot; round: RoundInfo }) {
  const deltas = round.deltas ?? {};
  const waiting = waitingPlayers(snapshot);
  const missing = waiting.filter((p) => !snapshot.continued.includes(p.id));
  // Les points n'apparaissent (et le classement ne se trie) qu'après l'animation des résultats : pas de spoil.
  const revealed = useRevealed(tvViewProps(snapshot, round));
  const strip = playersWithProfile(snapshot)
    .sort((a, b) => (revealed ? (deltas[b.id] ?? 0) - (deltas[a.id] ?? 0) : 0));

  return (
    <div data-testid="tv-results" className="flex min-h-0 flex-1 flex-col">
      <RoundHeader round={round}>
        <span className="font-display text-3xl text-accent">Résultats</span>
      </RoundHeader>
      <GameFrame title={round.gameName} className="mt-2">
        <TvGameView snapshot={snapshot} round={round} kind="TvResults" />
      </GameFrame>
      <footer data-ui="results-footer" className="glass mx-tv-gutter mb-3 mt-3 shrink-0 rounded-card px-tv-panel py-3">
        <div className="flex items-center gap-4">
          <div className="grid min-w-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(strip.length, 1)}, minmax(0, 1fr))` }}>
            {strip.map((p, i) => {
              const gained = deltas[p.id] ?? 0;
              const done = snapshot.continued.includes(p.id) || !p.connected;
              return (
                <motion.div
                  key={p.id}
                  data-testid={`delta-${p.id}`}
                  data-ui="score-row"
                  data-rank={i + 1}
                  data-highlight={revealed && i === 0 && gained > 0 ? "true" : "false"}
                  layout="position"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, layout: { type: "spring", stiffness: 200, damping: 24 } }}
                  className="flex min-w-0 flex-col items-center gap-0.5"
                >
                  {/* Emplacement réservé pour que la bande ne saute pas quand les points arrivent. */}
                  <span className="relative flex h-[3.25rem] items-center">
                    {revealed && <FlyingPoints value={gained} delay={i * 0.07} />}
                    {revealed && (
                      <motion.span
                        data-testid={`delta-value-${p.id}`}
                        initial={{ opacity: 0, scale: 0.2, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 12, delay: i * 0.07 }}
                        className={`font-num text-3xl leading-none ${gained > 0 ? "text-good" : "text-ink-muted"}`}
                      >
                        {gained > 0 ? `+${gained}` : "0"}
                      </motion.span>
                    )}
                  </span>
                  <div className="relative">
                    <PlayerAvatar
                      profile={p.profile}
                      size="sm"
                      crowned={revealed && i === 0 && gained > 0}
                      dimmed={!p.connected}
                      badge={snapshot.continued.includes(p.id) ? <Pop appear><CheckIcon /></Pop> : p.connected ? <span className="animate-pulse-soft">…</span> : undefined}
                      className={done && p.connected ? "drop-shadow-[0_0_0.8rem_var(--color-good)]" : ""}
                    />
                  </div>
                  <span className="w-full truncate text-center text-base text-ink-muted">{p.profile!.name}</span>
                </motion.div>
              );
            })}
          </div>
          <div className="w-[15rem] shrink-0 text-right text-2xl font-semibold leading-tight text-ink-muted">
            {missing.length === 0 ? "Tout le monde est prêt !" : `En attente de ${missing.length} joueur${missing.length > 1 ? "s" : ""}…`}
          </div>
        </div>
      </footer>
    </div>
  );
}
