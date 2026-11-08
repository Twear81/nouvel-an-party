// Scène 4 : la RÉVÉLATION (résultats). Ton pince-sans-rire : la bonne réponse, qui a répondu quoi, puis la stat qui gêne.
// Pour changer la mise en scène : modifier ce composant. `revealSeconds` doit rester calculé avec les mêmes
// constantes que l'animation (la TV cache les points et les téléphones restent sur « Regarde la TV » pendant ce temps).
import { motion } from "motion/react";
import type { MiniGameViewProps } from "../views-contract";
import { PlayerAvatar, typo } from "../../web/ui";
import type { Priv, Pub, ResultAnswer, Results } from "./game";
import { withUnit } from "./number";
import { fitText, LETTERS, Unbroken } from "./Serious";

// Rythme de la révélation (s) : la bonne réponse arrive, puis les joueurs un par un, puis la stat.
export const ANSWER_AT_S = 1.4;
export const PLAYER_STEP_S = 0.12;
export const SETTLE_S = 0.9;

/** Durée totale (s) de l'animation des résultats. */
export const revealSeconds = (results: Results) => ANSWER_AT_S + results.answers.length * PLAYER_STEP_S + SETTLE_S;

/** La phrase qui gêne. */
export function statLine(r: Results): string {
  if (r.answers.length === 0) return "Personne n'a répondu. C'est une réponse comme une autre.";
  if (r.kind === "estimation") {
    const best = r.answers[0]!;
    return best.gap === 0 ? "Pile. C'en est presque suspect." : `Le plus proche était à ${withUnit(best.gap!, r.unit)} près.`;
  }
  if (r.right === 0) return "Personne n'a trouvé. Personne.";
  if (r.right === r.total) return "Tout le monde a trouvé. Rassurant.";
  return `${r.right} / ${r.total} ont trouvé.`;
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} s`;

/** Un joueur et sa réponse (temps ou écart sous le pseudo). */
function PlayerTile({ a, playerById, i, good, note }: { a: ResultAnswer; playerById: MiniGameViewProps["playerById"]; i: number; good: boolean; note: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: ANSWER_AT_S + 0.2 + i * PLAYER_STEP_S, type: "spring", stiffness: 240, damping: 16 }}
      className="flex w-[7.5rem] flex-col items-center"
    >
      <PlayerAvatar profile={playerById(a.playerId)?.profile ?? null} size="sm" />
      <span className="w-full truncate text-center text-base leading-tight">{playerById(a.playerId)?.profile?.name}</span>
      <span className={`text-sm leading-tight ${good ? "text-serious-good" : "text-serious-muted"}`}>{note}</span>
    </motion.div>
  );
}

function QcmRows({ results, playerById }: { results: Results; playerById: MiniGameViewProps["playerById"] }) {
  // L'ordre d'apparition des joueurs suit `answers` (bonnes réponses d'abord) : on garde leur rang global.
  const rank = new Map(results.answers.map((a, i) => [a.playerId, i]));
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
      {results.choices.map((label, c) => {
        const correct = c === results.correctIndex;
        const who = results.answers.filter((a) => a.choice === c);
        return (
          <div key={c} data-testid={`cg-row-${c}`} data-correct={correct ? "true" : "false"} className="relative flex items-center gap-5 border border-serious-line px-6 py-1.5">
            {/* La bonne réponse s'allume au moment de la révélation. */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ANSWER_AT_S }} className={`absolute inset-0 border-2 ${correct ? "border-serious-good bg-serious-good/10" : "bg-serious-bg/60"}`} />
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-serious-accent text-2xl text-serious-accent">{LETTERS[c]}</span>
            <span className="relative min-w-0 flex-1 truncate leading-tight" style={{ fontSize: `${fitText(label, 30, 1.7, 2.4)}rem` }}>
              {typo(label)}
              {correct && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ANSWER_AT_S }} className="ml-4 text-serious-good">
                  ✓
                </motion.span>
              )}
            </span>
            <div className="relative flex min-h-[5.6rem] flex-wrap items-center justify-end gap-x-1">
              {who.map((a) => (
                <PlayerTile key={a.playerId} a={a} playerById={playerById} i={rank.get(a.playerId)!} good={correct} note={a.ms === null ? "" : seconds(a.ms)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EstimationRows({ results, playerById }: { results: Results; playerById: MiniGameViewProps["playerById"] }) {
  const list = results.answers.slice(0, 8);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
      <div className="flex items-baseline gap-5">
        <span className="text-3xl text-serious-muted">Réponse exacte :</span>
        <motion.span data-testid="cg-exact" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: ANSWER_AT_S, type: "spring", stiffness: 200, damping: 14 }} className="text-[5rem] leading-none text-serious-good">
          {withUnit(results.value!, results.unit)}
        </motion.span>
      </div>
      <div className="grid w-full max-w-[84rem] grid-cols-2 gap-x-10 gap-y-1">
        {list.map((a, i) => (
          <motion.div
            key={a.playerId}
            data-testid={`cg-est-${a.playerId}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: ANSWER_AT_S + 0.2 + i * PLAYER_STEP_S }}
            className={`flex items-center gap-4 border px-4 py-1 ${a.rank === 1 ? "border-serious-good bg-serious-good/10" : "border-serious-line"}`}
          >
            <span className="w-10 text-center text-3xl text-serious-accent">{a.rank}</span>
            <PlayerAvatar profile={playerById(a.playerId)?.profile ?? null} size="xs" />
            <span className="min-w-0 flex-1 truncate text-2xl">{playerById(a.playerId)?.profile?.name}</span>
            <span className="text-3xl">{withUnit(a.value!, results.unit)}</span>
            <span className="w-[8rem] text-right text-xl text-serious-muted">{a.gap === 0 ? "pile" : `écart ${withUnit(a.gap!, "")}`}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function TvResults({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) {
  if (!results) return null;
  const missing = results.missingIds.map((id) => playerById(id)?.profile?.name).filter(Boolean);
  return (
    <div data-testid="cg-results" data-kind={results.kind} className="flex min-h-0 flex-1 flex-col gap-3 rounded-card bg-serious px-14 py-6 font-serious text-serious-ink shadow-card">
      <h1 className="shrink-0 text-balance text-center leading-tight text-serious-muted" style={{ fontSize: `${fitText(typo(results.question), 100, 1.9, 2.6, 2)}rem` }}>
        <Unbroken text={typo(results.question)} />
      </h1>
      {results.kind === "qcm" ? <QcmRows results={results} playerById={playerById} /> : <EstimationRows results={results} playerById={playerById} />}
      <div className="flex shrink-0 flex-col items-center gap-1">
        {/* La stat arrive en dernier : c'est la chute. */}
        <motion.p
          data-testid="cg-stat"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: revealSeconds(results) - SETTLE_S + 0.1, duration: 0.5 }}
          className="text-balance text-center text-5xl leading-tight text-serious-accent"
        >
          {statLine(results)}
        </motion.p>
        {results.comment && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ANSWER_AT_S + 0.4 }} className="text-balance text-center text-2xl italic text-serious-muted">
            {results.comment}
          </motion.p>
        )}
        {missing.length > 0 && <p className="text-lg text-serious-muted">N'ont pas répondu : {missing.join(", ")}</p>}
      </div>
    </div>
  );
}

export function PhoneResults({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.answers.find((a) => a.playerId === myId);
  const goodAnswer = results.kind === "qcm" ? results.choices[results.correctIndex!]! : withUnit(results.value!, results.unit);
  let verdict: string;
  let ok: boolean;
  if (!mine) {
    verdict = "Tu n'as pas répondu. C'est un choix.";
    ok = false;
  } else if (results.kind === "qcm") {
    ok = mine.correct;
    verdict = ok ? "Bonne réponse. Ça rassure." : "Raté. Ça reste entre nous.";
  } else {
    ok = mine.rank === 1;
    verdict = ok ? "Le plus proche. Impressionnant." : `${mine.rank}e sur ${results.answers.length}.`;
  }
  return (
    <div data-testid="phone-cg-result" data-ok={ok ? "true" : "false"} className="flex flex-col items-center gap-2 text-center font-serious">
      <p className={`text-balance text-2xl ${ok ? "text-good" : "text-bad"}`}>{verdict}</p>
      <p className="text-ink-muted">
        Bonne réponse : <b className="text-ink">{goodAnswer}</b>
      </p>
      {mine && results.kind === "qcm" && (
        <p className="text-ink-muted">
          Ta réponse : <b className="text-ink">{results.choices[mine.choice!]}</b>
          {mine.ms !== null && mine.correct ? ` · ${seconds(mine.ms)}` : ""}
        </p>
      )}
      {mine && results.kind === "estimation" && (
        <p className="text-ink-muted">
          Ton chiffre : <b className="text-ink">{withUnit(mine.value!, results.unit)}</b>
          {mine.gap ? ` (écart ${withUnit(mine.gap, "")})` : " (pile)"}
        </p>
      )}
      <p className="text-balance text-lg italic text-ink-muted">{statLine(results)}</p>
    </div>
  );
}
