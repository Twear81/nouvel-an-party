// Écrans de "Qui est le plus… ?" : n'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

const Tv = ({ pub, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => p.profile);
  const voted = voters.filter((p) => pub.votedIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88rem] text-balance text-[6.5rem] font-extrabold leading-[1.05]">
        {pub.question}
      </motion.h1>
      <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-4">
        {voters.map((p) => {
          const has = pub.votedIds.includes(p.id);
          return (
            <motion.div key={p.id} animate={{ scale: has ? 1 : 0.92, y: has ? -8 : 0 }} className="flex flex-col items-center gap-1">
              <PlayerAvatar profile={p.profile} size="lg" dimmed={!has} badge={has ? "✓" : undefined} />
              <span className={`max-w-[9rem] truncate text-2xl font-bold ${has ? "text-ink" : "text-ink-muted"}`}>{p.profile!.name}</span>
            </motion.div>
          );
        })}
      </div>
      <p className="text-3xl text-ink-muted">
        {voted} / {voters.length} ont voté
      </p>
    </div>
  );
};

const Phone = ({ pub, priv, players, snapshot, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const myId = snapshot.me?.id;
  const options = players.filter((p) => p.profile && (pub.allowSelfVote || p.id !== myId));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">{pub.question}</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto pb-1">
        {options.map((p) => {
          const selected = priv?.votedFor === p.id;
          return (
            <motion.button
              key={p.id}
              data-testid={`vote-option-${p.id}`}
              whileTap={{ scale: 0.93 }}
              animate={{ scale: selected ? 1.03 : 1 }}
              onClick={() => void sendInput({ target: p.id }).catch(() => {})}
              aria-pressed={selected}
              className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-card border-2 p-2 ${selected ? "border-accent bg-accent/25 shadow-glow" : "glass border-transparent"}`}
            >
              <PlayerAvatar profile={p.profile} size="md" />
              <span className="max-w-full truncate text-base font-bold">{p.profile!.name}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  if (!results) return null;
  const max = Math.max(1, ...results.tally.map((t) => t.votes));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="text-balance text-center text-5xl font-extrabold leading-tight">{results.question}</h1>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {results.tally.length === 0 && <p className="text-center text-5xl text-ink-muted">Personne n'a voté…</p>}
        {results.tally.slice(0, 5).map((t, i) => {
          const player = playerById(t.playerId);
          const winner = results.winners.includes(t.playerId);
          return (
            <motion.div key={t.playerId} initial={{ opacity: 0, x: -80 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25, type: "spring" }} className="flex items-center gap-6">
              <div className="relative">
                {winner && <motion.span initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.25, type: "spring" }} className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 text-5xl">👑</motion.span>}
                <PlayerAvatar profile={player?.profile ?? null} size="lg" />
              </div>
              <div className="w-[13rem] truncate text-3xl font-bold">{player?.profile?.name ?? "?"}</div>
              <div className="relative h-20 flex-1 overflow-hidden rounded-btn bg-surface">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(t.votes / max) * 100}%` }}
                  transition={{ delay: 0.3 + i * 0.25, duration: 0.9, ease: "easeOut" }}
                  className={`flex h-full items-center gap-2 rounded-btn px-4 ${winner ? "bg-gold shadow-glow" : "bg-hot-gradient"}`}
                >
                  {t.voters.map((v) => (
                    <PlayerAvatar key={v} profile={playerById(v)?.profile ?? null} size="xs" />
                  ))}
                </motion.div>
              </div>
              <div className={`w-24 text-right font-display text-6xl ${winner ? "text-accent" : "text-ink"}`}>{t.votes}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const PhoneResults = ({ results, snapshot, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.tally.find((t) => t.voters.includes(myId));
  const target = mine ? playerById(mine.playerId) : undefined;
  const withMajority = !!mine && results.winners.includes(mine.playerId);
  const elected = results.winners.includes(myId);
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {mine ? (
        <>
          <p className="text-ink-muted">Tu as voté pour</p>
          <div className="flex items-center gap-3">
            <PlayerAvatar profile={target?.profile ?? null} size="md" />
            <span className="text-2xl font-bold">{target?.profile?.name}</span>
          </div>
          <p className={`text-xl font-bold ${withMajority ? "text-good" : "text-ink-muted"}`}>{withMajority ? "Avec la majorité !" : "Pas avec la majorité…"}</p>
        </>
      ) : (
        <p className="text-xl text-ink-muted">Tu n'as pas voté</p>
      )}
      {elected && <p className="font-display text-2xl text-accent">👑 Tu as été élu(e) !</p>}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults } satisfies MiniGameViews;
