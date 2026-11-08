// Révélation de la TV : les joueurs tombent sur un axe « trop tôt / trop tard » autour de la cible,
// du plus éloigné au plus proche ; le dernier à tomber (le plus proche) gagne. Le classement se remplit en même temps.
import { motion } from "motion/react";
import { useEffect } from "react";
import { fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps } from "../views-contract";
import type { Priv, Pub, Results } from "./game";
import { fmtCible, fmtSigned, QUALITY_TEXT, quality } from "./rank";

type Props = MiniGameViewProps<Pub, Priv, Results>;
type Entry = Results["ranking"][number];

// Rythme de la révélation (s). revealSeconds est calculé avec ces mêmes constantes.
const START_S = 1.0;
const STEP_S = 1.0;
/** Pause de suspense avant le dernier (le gagnant). */
const WINNER_EXTRA_S = 1.4;
/** Temps pour savourer le gagnant avant la fin. */
const SAVOR_S = 2.2;
const WINNER_FX_DELAY_S = 0.5;
const LANES = 3;
const LANE_REM = 10.8;
const AXIS_BOTTOM_REM = 5;

/** Les joueurs, du plus éloigné de la cible au plus proche : l'ordre d'arrivée sur l'axe. */
const landingOrder = (ranking: Entry[]) => [...ranking].sort((a, b) => b.rank - a.rank || Math.abs(b.signedMs) - Math.abs(a.signedMs));
/** Instant (s) où le k-ième sur n tombe. */
const landAt = (k: number, n: number) => START_S + k * STEP_S + (k === n - 1 ? WINNER_EXTRA_S : 0);

/** Durée totale (s) de l'animation des résultats. */
export const revealSeconds = (results: Results) => {
  const n = results.ranking.length;
  if (n === 0) return 1.5;
  return landAt(n - 1, n) + WINNER_FX_DELAY_S + SAVOR_S;
};

/** Demi-largeur de l'axe (ms) : assez grande pour contenir tout le monde. */
const axisRange = (ranking: Entry[]) => Math.max(1500, Math.ceil((Math.max(...ranking.map((e) => Math.abs(e.signedMs))) * 1.15) / 500) * 500);

export const TvResults = ({ results, playerById }: Props) => {
  useEffect(() => {
    if (!results?.ranking.length) return;
    const n = results.ranking.length;
    const id = setTimeout(() => fireConfetti("big"), (landAt(n - 1, n) + WINNER_FX_DELAY_S) * 1000);
    return () => clearTimeout(id);
  }, [results]);
  if (!results) return null;
  const order = landingOrder(results.ranking);
  const n = order.length;
  const range = n > 0 ? axisRange(results.ranking) : 1500;
  const x = (signedMs: number) => 50 + (signedMs / range) * 44;
  // Voies alternées par position sur l'axe : deux voisins ne se recouvrent pas.
  const lane = new Map([...results.ranking].sort((a, b) => a.signedMs - b.signedMs).map((e, i) => [e.playerId, i % LANES]));
  const step = range <= 3000 ? 500 : 1000;
  const ticks: number[] = [];
  for (let t = -range; t <= range; t += step) ticks.push(t);
  const byRank = [...results.ranking].sort((a, b) => a.rank - b.rank || Math.abs(a.signedMs) - Math.abs(b.signedMs));
  const at = (id: string) => landAt(order.findIndex((e) => e.playerId === id), n);

  return (
    <div data-testid="cabr-results" className="flex min-h-0 flex-1 gap-8">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4">
        <div className="rounded-chip bg-surface-strong px-10 py-2 font-display text-4xl">
          Objectif <span className="text-accent">{fmtCible(results.cible)} s</span>
        </div>
        {n === 0 ? (
          <p className="font-display text-5xl text-ink-muted">Personne n'a arrêté le compteur…</p>
        ) : (
          <div data-testid="cabr-axis" className="relative w-full" style={{ height: `${AXIS_BOTTOM_REM + LANES * LANE_REM + 1}rem` }}>
            {/* l'axe, ses graduations et la cible */}
            <div className="absolute inset-x-0 h-[0.4rem] rounded-chip bg-line" style={{ bottom: `${AXIS_BOTTOM_REM}rem` }} />
            {ticks.map((t) => (
              <div key={t} className="absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap" style={{ left: `${x(t)}%`, bottom: `${AXIS_BOTTOM_REM - 3}rem` }}>
                <span className={`h-5 w-[0.2rem] ${t === 0 ? "bg-accent" : "bg-ink-muted"}`} />
                <span className={`font-display text-2xl ${t === 0 ? "text-accent" : "text-ink-muted"}`}>{t === 0 ? "PILE" : `${t > 0 ? "+" : "−"}${Math.abs(t) / 1000} s`.replace(".", ",")}</span>
              </div>
            ))}
            <span className="absolute left-2 font-display text-3xl text-cool" style={{ bottom: `${AXIS_BOTTOM_REM - 5}rem` }}>◀ TROP TÔT</span>
            <span className="absolute right-2 font-display text-3xl text-hot" style={{ bottom: `${AXIS_BOTTOM_REM - 5}rem` }}>TROP TARD ▶</span>
            {order.map((e) => {
              const p = playerById(e.playerId);
              const l = lane.get(e.playerId) ?? 0;
              const winner = e.rank === 1;
              return (
                <motion.div
                  key={e.playerId}
                  data-testid={`cabr-drop-${e.playerId}`}
                  initial={{ opacity: 0, y: -520 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: at(e.playerId), type: "spring", stiffness: 110, damping: 13 }}
                  className="absolute flex w-[13rem] -translate-x-1/2 flex-col items-center"
                  style={{ left: `${x(e.signedMs)}%`, bottom: `${AXIS_BOTTOM_REM}rem` }}
                >
                  <motion.div
                    animate={winner ? { scale: [1, 1.18, 1.1] } : { opacity: [1, 1, 0.65] }}
                    transition={{ delay: landAt(n - 1, n) + WINNER_FX_DELAY_S, duration: 0.6 }}
                    className="flex flex-col items-center"
                  >
                    <PlayerAvatar profile={p?.profile ?? null} size="md" className={winner ? "drop-shadow-[0_0_2rem_var(--color-accent)]" : ""} />
                    <span className="max-w-full truncate text-2xl font-bold">{p?.profile?.name}</span>
                    <span className={`font-display text-5xl ${QUALITY_TEXT[quality(e.signedMs)]}`}>{fmtSigned(e.signedMs)}</span>
                  </motion.div>
                  <span className="w-[0.25rem] bg-ink/40" style={{ height: `${1 + l * LANE_REM}rem` }} />
                  <span className={`absolute -bottom-[0.9rem] h-5 w-5 rounded-full ${winner ? "bg-accent shadow-glow" : "bg-ink"}`} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <div className="glass flex w-[30rem] shrink-0 flex-col justify-center gap-2 rounded-card p-4">
        {byRank.map((e) => (
          <motion.div
            key={e.playerId}
            data-testid={`cabr-rank-${e.playerId}`}
            data-rank={e.rank}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: at(e.playerId) + 0.5 }}
            className={`flex h-[4.6rem] items-center gap-3 rounded-btn px-3 ${e.rank === 1 ? "border-[0.2rem] border-accent bg-accent/15 shadow-glow" : "bg-surface"}`}
          >
            <span className={`w-9 text-center font-display text-3xl ${e.rank === 1 ? "text-accent" : "text-ink-muted"}`}>{e.rank}</span>
            <PlayerAvatar profile={playerById(e.playerId)?.profile ?? null} size="sm" />
            <span className="min-w-0 flex-1 truncate text-2xl font-bold">{playerById(e.playerId)?.profile?.name}</span>
            <span className={`font-display text-3xl ${QUALITY_TEXT[quality(e.signedMs)]}`}>{fmtSigned(e.signedMs)}</span>
          </motion.div>
        ))}
        {results.missed.map((m) => (
          <div key={m.playerId} data-testid={`cabr-missed-${m.playerId}`} className="flex h-[4.6rem] items-center gap-3 rounded-btn bg-surface px-3 opacity-70">
            <span className="w-9 text-center font-display text-3xl text-bad">✕</span>
            <PlayerAvatar profile={playerById(m.playerId)?.profile ?? null} size="sm" dimmed />
            <span className="min-w-0 flex-1 truncate text-2xl font-bold text-ink-muted">{playerById(m.playerId)?.profile?.name}</span>
            <span className="text-xl text-ink-muted">pas stoppé</span>
          </div>
        ))}
      </div>
    </div>
  );
};
