// Écrans de "Qui est le plus… ?" : n'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { AnsweredCount, AnsweredRoster, Choice, PlayerAvatar, ResultBar, typo } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const voted = voters.filter((p) => pub.votedIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-12 text-center">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88rem] text-balance text-[6rem] font-extrabold leading-[1.05]">
        {typo(pub.question)}
      </motion.h1>
      <AnsweredCount done={voted} total={voters.length} />
      <AnsweredRoster players={voters} isDone={(id) => pub.votedIds.includes(id)} />
    </div>
  );
};

const Phone = ({ pub, priv, round, players, snapshot, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const myId = snapshot.me?.id;
  const options = players.filter((p) => round.participants.includes(p.id) && p.profile && (pub.allowSelfVote || p.id !== myId));
  const voted = priv?.votedFor ?? null;
  // Jusqu'à 7 choix doivent tenir sans défilement sur un écran de 360×640 : 4 rangées de cartes compactes.
  const dense = options.length > 4;
  const tiny = options.length > 6;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 text-balance text-center text-xl font-extrabold leading-tight min-[400px]:text-2xl">{typo(pub.question)}</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-1">
        {options.map((p) => {
          const selected = voted === p.id;
          return (
            <Choice
              key={p.id}
              data-testid={`vote-option-${p.id}`}
              selected={selected}
              state={voted !== null && !selected ? "faded" : "idle"}
              onClick={() => void sendInput({ target: p.id }).catch(() => {})}
              checkTone="accent"
              checkSize="sm"
              checkClassName="absolute right-1.5 top-1.5"
              className={`flex-col gap-0.5 p-1.5 ${dense ? "min-h-[4.9rem]" : "min-h-[8rem]"}`}
            >
              <PlayerAvatar profile={p.profile} size={tiny ? "sm" : dense ? "sm" : "lg"} />
              <span className="w-full truncate text-base font-bold leading-tight">{p.profile!.name}</span>
            </Choice>
          );
        })}
      </div>
    </div>
  );
};

// Rythme de la révélation (s) : les barres se remplissent l'une après l'autre, la couronne arrive en dernier.
const ROW_STEP_S = 0.18;
const BAR_DELAY_S = 0.3;
const BAR_DURATION_S = 0.9;
const CROWN_DELAY_S = 0.8;
const SETTLE_S = 0.5;

/** Durée totale (s) de l'animation pour `n` lignes. */
export const revealSeconds = (n: number) => (n === 0 ? 0 : Math.max(BAR_DELAY_S + BAR_DURATION_S, CROWN_DELAY_S) + (n - 1) * ROW_STEP_S + SETTLE_S);

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  if (!results) return null;
  const max = Math.max(1, ...results.tally.map((t) => t.votes));
  const n = results.tally.length;
  // 8 barres doivent tenir : les lignes rétrécissent avec le nombre de résultats.
  const size = n <= 4 ? "lg" : n <= 6 ? "md" : "sm";
  const barH = n <= 4 ? "h-20" : n <= 6 ? "h-[4.25rem]" : "h-[3.75rem]";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="text-balance text-center text-5xl font-extrabold leading-tight">{typo(results.question)}</h1>
      <div data-testid="tally" className="flex min-h-0 flex-1 flex-col justify-center gap-2">
        {n === 0 && <p className="text-center text-5xl text-ink-muted">Personne n'a voté…</p>}
        {results.tally.map((t, i) => {
          const player = playerById(t.playerId);
          const winner = results.winners.includes(t.playerId);
          return (
            <motion.div key={t.playerId} data-testid={`tally-${t.playerId}`} initial={{ opacity: 0, x: -80 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * ROW_STEP_S, type: "spring" }} className="flex items-center gap-5">
              <div className="relative">
                {winner && <motion.span initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: CROWN_DELAY_S + i * ROW_STEP_S, type: "spring" }} className="absolute -left-2 -top-3 z-10 -rotate-[18deg] text-3xl">👑</motion.span>}
                <PlayerAvatar profile={player?.profile ?? null} size={size} />
              </div>
              <div className={`shrink-0 truncate font-bold ${n > 4 ? "w-[16rem] text-2xl" : "w-[14rem] text-3xl"}`}>{player?.profile?.name ?? "?"}</div>
              <ResultBar
                value={t.votes / max}
                highlight={winner}
                delay={BAR_DELAY_S + i * ROW_STEP_S}
                duration={BAR_DURATION_S}
                ease="easeOut"
                className={`flex-1 ${barH}`}
                fillClassName="min-w-[3rem] gap-1.5 px-3"
              >
                {t.voters.map((v) => (
                  <PlayerAvatar key={v} profile={playerById(v)?.profile ?? null} size="xs" />
                ))}
              </ResultBar>
              <div className={`w-20 text-right font-num text-5xl ${winner ? "text-accent" : "text-ink"}`}>{t.votes}</div>
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

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.tally.length) : 0) } satisfies MiniGameViews;
