// Écrans de "Oui ou Non" : n'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

const Tv = ({ pub, playerById, players }: MiniGameViewProps<Pub>) => {
  const target = pub.targetId ? playerById(pub.targetId) : undefined;
  const voters = players.filter((p) => p.profile);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center">
      {target && (
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-6 rounded-chip bg-surface-strong py-3 pl-4 pr-10">
          <PlayerAvatar profile={target.profile} size="lg" />
          <span className="text-4xl font-bold">
            <span className="text-accent">{target.profile?.name}</span> répond pour de vrai, les autres devinent !
          </span>
        </motion.div>
      )}
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88rem] text-balance text-[6.5rem] font-extrabold leading-[1.05]">
        {pub.question}
      </motion.h1>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {voters.map((p) => (
          <PlayerAvatar key={p.id} profile={p.profile} size="md" dimmed={!pub.answeredIds.includes(p.id)} badge={pub.answeredIds.includes(p.id) ? "✓" : undefined} />
        ))}
      </div>
      <p className="text-3xl text-ink-muted">
        {pub.answeredIds.length} / {voters.length} ont répondu
      </p>
    </div>
  );
};

const Phone = ({ pub, priv, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const answer = priv?.answer ?? null;
  const btn = (value: boolean, label: string, tone: "good" | "bad") => {
    const selected = answer === value;
    return (
      <motion.button
        key={label}
        data-testid={value ? "answer-yes" : "answer-no"}
        whileTap={{ scale: 0.95 }}
        animate={{ scale: selected ? 1.02 : 1, opacity: answer !== null && !selected ? 0.45 : 1 }}
        onClick={() => void sendInput({ answer: value }).catch(() => {})}
        aria-pressed={selected}
        className={`flex-1 rounded-card font-display text-6xl ${tone === "good" ? "bg-good text-bg" : "bg-bad text-bg"} ${selected ? "ring-8 ring-ink" : ""}`}
      >
        {label}
      </motion.button>
    );
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">{pub.question}</h1>
      {priv?.isTarget && <p className="shrink-0 rounded-btn bg-accent/20 px-3 py-2 text-center text-sm font-bold text-accent">Réponds honnêtement, les autres doivent deviner ta réponse !</p>}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
        {btn(true, "OUI", "good")}
        {btn(false, "NON", "bad")}
      </div>
    </div>
  );
};

const Column = ({ label, ids, truth, tone, target, playerById }: { label: string; ids: string[]; truth: boolean; tone: "good" | "bad"; target: string | null; playerById: MiniGameViewProps["playerById"] }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: truth ? 1 : 0.55, y: 0, scale: truth ? 1.03 : 1 }}
    className={`glass flex min-h-0 flex-1 flex-col items-center gap-4 rounded-card p-6 ${truth ? "border-accent shadow-glow" : ""}`}
  >
    <div className={`font-display text-7xl ${tone === "good" ? "text-good" : "text-bad"}`}>{label}</div>
    <div className="font-display text-3xl text-ink-muted">{ids.length}</div>
    {truth && <div className="rounded-chip bg-gold px-6 py-1 text-2xl font-extrabold text-accent-ink">✓ Bonne réponse</div>}
    <div className="flex min-h-0 flex-wrap content-start justify-center gap-4">
      {ids.map((id, i) => (
        <motion.div key={id} initial={{ opacity: 0, x: tone === "good" ? -120 : 120 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, type: "spring" }} className="flex flex-col items-center">
          <PlayerAvatar profile={playerById(id)?.profile ?? null} size="md" badge={id === target ? "🎯" : undefined} />
          <span className="max-w-[7rem] truncate text-lg font-bold">{playerById(id)?.profile?.name}</span>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  if (!results) return null;
  const target = results.targetId ? playerById(results.targetId) : undefined;
  const word = (v: boolean) => (v ? "OUI" : "NON");
  let explain: string;
  if (results.truth === null) explain = results.yes.length + results.no.length === 0 ? "Personne n'a répondu…" : "Égalité : tout le monde marque !";
  else if (results.mode === "cible") explain = `${target?.profile?.name ?? "La cible"} a répondu ${word(results.truth)} : ceux qui ont deviné juste gagnent !`;
  else explain = `La majorité a répondu ${word(results.truth)} : le camp majoritaire gagne !`;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="text-balance text-center text-5xl font-extrabold leading-tight">{results.question}</h1>
      <div className="flex min-h-0 flex-1 gap-8">
        <Column label="OUI" ids={results.yes} truth={results.truth === true || (results.truth === null && results.yes.length > 0)} tone="good" target={results.targetId} playerById={playerById} />
        <Column label="NON" ids={results.no} truth={results.truth === false || (results.truth === null && results.no.length > 0)} tone="bad" target={results.targetId} playerById={playerById} />
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center text-4xl font-bold text-accent">
        {explain}
      </motion.p>
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.yes.includes(myId) ? true : results.no.includes(myId) ? false : null;
  const isTarget = results.targetId === myId && results.mode === "cible";
  let text: string;
  let good = false;
  if (mine === null) text = "Tu n'as pas répondu";
  else if (isTarget) {
    text = `Tu as répondu ${mine ? "OUI" : "NON"}`;
    good = true;
  } else if (results.truth === null || results.truth === mine) {
    text = results.truth === null ? "Égalité : tu marques !" : "Bien joué !";
    good = true;
  } else text = "Raté !";
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {mine !== null && <p className="text-ink-muted">Ta réponse : <b className="text-ink">{mine ? "OUI" : "NON"}</b></p>}
      <p className={`font-display text-3xl ${good ? "text-good" : "text-bad"}`}>{text}</p>
      {results.truth !== null && <p className="text-ink-muted">Bonne réponse : <b className="text-accent">{results.truth ? "OUI" : "NON"}</b></p>}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults } satisfies MiniGameViews;
