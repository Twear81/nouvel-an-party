// Écrans de "Ceci ou Cela" : deux réponses face à face (couleurs neutres bleu / rose : ce n'est pas "bien / mal").
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect } from "react";
import { AnsweredCount, AnsweredRoster, CheckIcon, Choice, fireConfetti, fit, haptique, PlayerAvatar, typo, useSfxTimeline, type NomSon } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

// Classes écrites en toutes lettres pour que Tailwind les repère.
const TONES = [
  { solid: "bg-cool text-bg", soft: "border-cool bg-cool/15", text: "text-cool", glow: "shadow-[0_0_3.5rem_color-mix(in_srgb,var(--color-cool)_50%,transparent)]" },
  { solid: "bg-hot text-bg", soft: "border-hot bg-hot/15", text: "text-hot", glow: "shadow-[0_0_3.5rem_color-mix(in_srgb,var(--color-hot)_50%,transparent)]" },
] as const;

const GuessIcon = () => <span aria-hidden>🎯</span>;

/** Bandeau du mode : "il répond pour de vrai" (avec son avatar) ou "la majorité gagne". */
function ModeChip({ pub, playerById }: Pick<MiniGameViewProps<Pub>, "pub" | "playerById">) {
  const target = pub.targetId ? playerById(pub.targetId) : undefined;
  if (target) {
    return (
      <motion.div data-testid="mode-cible" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-5 rounded-chip border-[0.25rem] border-accent bg-accent/15 py-2 pl-3 pr-10 shadow-glow">
        <PlayerAvatar profile={target.profile} size="md" badge={<GuessIcon />} />
        <div className="text-left leading-tight">
          <div className="text-4xl font-extrabold text-accent">{target.profile?.name}</div>
          <div className="text-2xl text-ink-muted">répond pour de vrai, devinez sa réponse</div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div data-testid="mode-majorite" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="glass flex items-center gap-4 rounded-chip px-10 py-3 text-3xl font-bold">
      <span aria-hidden>👥</span> Rejoignez le camp majoritaire
    </motion.div>
  );
}

const Tv = ({ pub, round, playerById, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = voters.filter((p) => pub.answeredIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <ModeChip pub={pub} playerById={playerById} />
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90rem] text-balance text-[4.75rem] font-extrabold leading-[1.05]">
        {typo(pub.question)}
      </motion.h1>

      <div className="relative flex w-full max-w-[96rem] items-stretch gap-8">
        {pub.choices.map((label, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i === 0 ? -120 : 120 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 140, damping: 16 }}
            className={`flex min-h-[13rem] flex-1 items-center justify-center rounded-card px-6 py-8 shadow-card ${TONES[i]!.solid}`}
          >
            <span data-testid={`tv-choice-${i}`} className="text-balance break-words font-display leading-tight" style={{ fontSize: `${fit(label, 38, 3, 8)}rem` }}>
              {typo(label)}
            </span>
          </motion.div>
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: [0, 1.4, 1], rotate: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex h-24 w-24 items-center justify-center rounded-full border-[0.4rem] border-bg bg-gold font-display text-4xl text-accent-ink shadow-glow"
          >
            VS
          </motion.div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <AnsweredCount done={answered} total={voters.length} className="font-num text-4xl text-ink-muted" />
        <AnsweredRoster
          players={voters}
          size="compact"
          isDone={(id) => pub.answeredIds.includes(id)}
          badge={(p, done) => (done ? <CheckIcon /> : p.id === pub.targetId ? <GuessIcon /> : undefined)}
          avatarClassName={(p) => (p.id === pub.targetId ? "drop-shadow-[0_0_1rem_var(--color-accent)]" : "")}
          nameClassName={(p, done) => (p.id === pub.targetId ? "text-accent" : done ? "text-ink" : "text-ink-muted")}
        />
      </div>
    </div>
  );
};

const Phone = ({ pub, priv, sendInput, playerById }: MiniGameViewProps<Pub, Priv>) => {
  const choice = priv?.choice ?? null;
  const target = pub.targetId ? playerById(pub.targetId) : undefined;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">{typo(pub.question)}</h1>
      {priv?.isTarget ? (
        <div data-testid="phone-mode-cible" className="flex shrink-0 items-center justify-center gap-2 text-balance rounded-chip border-2 border-accent bg-accent/15 px-3 py-1.5 text-base font-bold text-accent">
          <GuessIcon /> Tu réponds pour de vrai !
        </div>
      ) : (
        target && (
          <div data-testid="phone-mode-devine" className="flex shrink-0 items-center justify-center gap-2 rounded-chip bg-surface-strong px-3 py-1 text-base font-bold">
            <PlayerAvatar profile={target.profile} size="xs" />
            <span className="min-w-0 truncate">Devine la réponse de <span className="text-accent">{target.profile?.name}</span></span>
          </div>
        )
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
        {pub.choices.map((label, i) => {
          const selected = choice === i;
          return (
            <Choice
              key={i}
              data-testid={`choice-${i}`}
              tone={i === 0 ? "cool" : "hot"}
              selected={selected}
              state={choice !== null && !selected ? "faded" : "idle"}
              onClick={() => {
                haptique();
                void sendInput({ choice: i }).catch(() => {});
              }}
              className="min-h-[6rem] flex-1 px-4"
            >
              <span className="text-balance break-words font-display leading-tight" style={{ fontSize: `${fit(label, 17, 1.5, 3.75)}rem` }}>
                {label}
              </span>
            </Choice>
          );
        })}
      </div>
    </div>
  );
};

// Rythme de la révélation (s) : les avatars arrivent un par un, puis la phrase d'explication.
const AVATAR_FIRST_S = 0.3;
const AVATAR_STEP_S = 0.12;
const EXPLAIN_DELAY_S = 1;
const SETTLE_S = 0.7;

/** Durée totale (s) de l'animation des résultats. */
export const revealSeconds = (results: Results) =>
  Math.max(EXPLAIN_DELAY_S, AVATAR_FIRST_S + (Math.max(results.picks[0].length, results.picks[1].length) - 1) * AVATAR_STEP_S) + SETTLE_S;

function Camp({ index, label, ids, winner, tie, total, results, playerById }: { index: 0 | 1; total: number; label: string; ids: string[]; winner: boolean; tie: boolean; results: Results; playerById: MiniGameViewProps["playerById"] }) {
  const tone = TONES[index];
  const lit = winner || (tie && ids.length > 0);
  const most = Math.max(results.picks[0].length, results.picks[1].length);
  const avatarSize = most <= 3 ? "xl" : most <= 5 ? "lg" : "md";
  const tileWidth = { xl: "w-[12rem]", lg: "w-[9.5rem]", md: "w-[8rem]" }[avatarSize];
  return (
    <motion.div
      data-testid={`camp-${index}`}
      data-winner={winner ? "true" : "false"}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: lit || total === 0 ? 1 : 0.5, y: 0, scale: winner ? [1, 1.06, 1.02] : 1 }}
      transition={{ delay: winner ? 0.6 : 0, duration: 0.6 }}
      className={`flex min-h-0 flex-1 flex-col items-center gap-3 rounded-card border-[0.3rem] p-5 ${lit ? `${tone.soft} ${tone.glow}` : "border-line bg-surface"}`}
    >
      <div className={`w-full rounded-btn px-4 py-3 text-center ${tone.solid}`}>
        <span className="text-balance break-words font-display leading-tight" style={{ fontSize: `${fit(label, 34, 2.5, 5)}rem` }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-num text-6xl ${tone.text}`}>{ids.length}</span>
        {winner && (
          <span className="rounded-chip bg-gold px-5 py-1 text-2xl font-extrabold text-accent-ink">
            {results.mode === "cible" ? "✓ Bonne réponse" : "👑 Majorité"}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-x-3 gap-y-2">
        {ids.map((id, i) => {
          const isTarget = id === results.targetId && results.mode === "cible";
          return (
            <motion.div key={id} initial={{ opacity: 0, x: index === 0 ? -160 : 160 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: AVATAR_FIRST_S + i * AVATAR_STEP_S, type: "spring" }} className={`flex flex-col items-center ${tileWidth}`}>
              <PlayerAvatar profile={playerById(id)?.profile ?? null} size={avatarSize} badge={isTarget ? <GuessIcon /> : undefined} />
              <span className={`w-full truncate text-center text-lg font-bold ${isTarget ? "text-accent" : ""}`}>{playerById(id)?.profile?.name}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function TvResults({ results, round, playerById }: MiniGameViewProps<Pub, Priv, Results>) {
  const total = results ? results.picks[0].length + results.picks[1].length : 0;
  const most = results ? Math.max(results.picks[0].length, results.picks[1].length) : 0;
  const hasWinner = !!results && results.winner !== null;
  const explainAt = Math.max(EXPLAIN_DELAY_S, AVATAR_FIRST_S + Math.max(0, most - 1) * AVATAR_STEP_S + 0.3);
  // Sons calés sur les constantes de l'animation : un clic par paire d'avatars qui arrivent, puis le verdict.
  useSfxTimeline(
    results ? round.resultsAt : null,
    [
      ...Array.from({ length: most }, (_, i) => ({ à: AVATAR_FIRST_S + i * AVATAR_STEP_S, son: "ui.clic" as NomSon, options: { rate: 0.9 + Math.min(i, 8) * 0.07, volume: 0.6 } })),
      { à: explainAt, son: (total === 0 ? "mauvaise.reponse" : "bonne.reponse") as NomSon },
    ],
  );
  useEffect(() => {
    if (!hasWinner) return;
    const id = setTimeout(() => fireConfetti("small"), explainAt * 1000);
    return () => clearTimeout(id);
  }, [hasWinner, explainAt]);
  if (!results) return null;
  const tie = results.winner === null && total > 0;
  const target = results.targetId ? playerById(results.targetId) : undefined;
  let explain: string;
  if (total === 0) explain = "Personne n'a répondu…";
  else if (tie) explain = "Égalité : tout le monde marque !";
  else if (results.mode === "cible") explain = `${target?.profile?.name ?? "L'invité"} a répondu « ${results.choices[results.winner!]} » : ceux qui ont deviné juste gagnent !`;
  else explain = `La majorité a choisi « ${results.choices[results.winner!]} » : ce camp gagne !`;
  return (
    <div data-testid="ceci-results" data-mode={results.mode} className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="text-balance text-center text-5xl font-extrabold leading-tight">{typo(results.question)}</h1>
      <div className="relative flex min-h-0 flex-1 gap-8">
        {([0, 1] as const).map((i) => (
          <Camp key={i} index={i} label={typo(results.choices[i])} ids={results.picks[i]} winner={results.winner === i} tie={tie} total={total} results={results} playerById={playerById} />
        ))}
        <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.4rem] border-bg bg-gold font-display text-4xl text-accent-ink shadow-glow">
          {tie ? "=" : "VS"}
        </div>
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: EXPLAIN_DELAY_S }} className="text-balance text-center text-3xl font-bold text-accent">
        {explain}
      </motion.p>
    </div>
  );
}

const PhoneResults = ({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine: 0 | 1 | null = results.picks[0].includes(myId) ? 0 : results.picks[1].includes(myId) ? 1 : null;
  const isTarget = results.targetId === myId && results.mode === "cible";
  const tie = results.winner === null;
  if (mine === null) return <p className="text-center text-xl text-ink-muted">Tu n'as pas répondu</p>;

  const ok = isTarget || tie || results.winner === mine;
  let text: string;
  if (isTarget) text = "Tu as répondu pour de vrai !";
  else if (tie) text = "Égalité : tu marques !";
  else if (results.mode === "majorite") text = ok ? "Avec la majorité !" : "Pas avec la majorité…";
  else text = ok ? "Bien deviné !" : "Raté !";
  return (
    <div data-testid="phone-ceci-result" data-ok={ok ? "true" : "false"} className="flex flex-col items-center gap-3 text-center">
      <p className={`text-balance font-display text-2xl ${ok ? "text-good" : "text-bad"}`}>{text}</p>
      <div className="flex items-center gap-2 text-ink-muted">
        Ta réponse
        <span className={`rounded-chip px-4 py-1 font-display text-lg ${TONES[mine].solid}`}>{results.choices[mine]}</span>
      </div>
      {!tie && !ok && (
        <div className="flex items-center gap-2 text-ink-muted">
          {results.mode === "cible" ? "Bonne réponse" : "Majorité"}
          <span className={`rounded-chip px-4 py-1 font-display text-lg ${TONES[results.winner!].solid}`}>{results.choices[results.winner!]}</span>
        </div>
      )}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results) : 0) } satisfies MiniGameViews;
