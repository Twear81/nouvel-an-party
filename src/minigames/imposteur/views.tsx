// Écrans de « L'imposteur » : lire son mot, parole (un joueur à la fois, indice dit à voix haute), décision, vote, révélation.
// Règle d'or : le téléphone de l'imposteur est identique à celui des autres (même écrans, même données) jusqu'aux résultats.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, CheckIcon, Choice, fireConfetti, Panel, PlayerAvatar, ResultBar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Durée (s) pendant laquelle le mot reste affiché quand on le consulte en cours de manche. */
const PEEK_SECONDS = 3;

// ───────────────────────────── TV ─────────────────────────────

function Title({ children, sub, testId }: { children: React.ReactNode; sub?: React.ReactNode; testId?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pb-2 text-center">
      <h1 data-testid={testId} className="text-balance text-[4.25rem] font-extrabold leading-[1.05]">{children}</h1>
      {sub != null && <div className="font-display text-4xl text-ink-muted">{sub}</div>}
    </div>
  );
}

function TvWord() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 text-center">
      <motion.span animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="text-[9rem] leading-none" aria-hidden>
        🤫
      </motion.span>
      <h1 data-testid="tv-word-title" className="text-balance text-[6rem] font-extrabold leading-[1.05]">Regardez votre mot en cachette</h1>
      <p className="font-display text-5xl text-ink-muted">Sur votre téléphone. Ne le montrez à personne.</p>
    </div>
  );
}

/** Parole : l'orateur en très grand, la file des suivants en dessous (ceux qui ont parlé sont cochés). */
function TvSpeech({ pub, playerById }: Props) {
  const current = playerById(pub.currentId ?? "");
  const queue = pub.order;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <p className="shrink-0 font-display text-4xl text-ink-muted">{pub.tours > 1 ? `Tour ${pub.tour}/${pub.tours}` : "Indice"}</p>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
        <motion.div key={pub.currentId ?? "none"} initial={{ scale: 0.5, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 13 }} className="flex flex-col items-center gap-4">
          <PlayerAvatar profile={current?.profile ?? null} size="2xl" />
          <h1 data-testid="tv-speaker" data-speaker={pub.currentId ?? ""} className="max-w-full truncate text-[5.5rem] font-extrabold leading-none">
            À <span className="text-accent">{current?.profile?.name ?? "…"}</span> !
          </h1>
        </motion.div>
        <p className="font-display text-5xl text-ink-muted">Dis ton indice à voix haute</p>
      </div>
      <div data-testid="tv-queue" className="flex shrink-0 flex-wrap items-start justify-center gap-x-5 gap-y-2">
        {queue.map((id) => {
          const done = pub.spokenIds.includes(id);
          const isCur = id === pub.currentId;
          return (
            <div key={id} data-testid={`queue-${id}`} data-state={done ? "done" : isCur ? "current" : "wait"} className={`flex w-[11rem] flex-col items-center gap-1 ${isCur ? "scale-110" : ""}`}>
              <PlayerAvatar profile={playerById(id)?.profile ?? null} size="md" dimmed={!done && !isCur} badge={done ? <CheckIcon /> : undefined} className={isCur ? "drop-shadow-[0_0_1.2rem_var(--color-accent)]" : ""} />
              <span className={`w-full truncate text-xl font-bold ${isCur ? "text-accent" : done ? "text-ink-muted" : ""}`}>{playerById(id)?.profile?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Décision : deux gros compteurs en direct (jamais de noms). */
function TvDecision({ pub }: Props) {
  const total = Math.max(1, pub.wantVote + pub.wantTour);
  const cards = [
    { id: "vote", emoji: "🗳️", label: "On vote", n: pub.wantVote },
    { id: "tour", emoji: "🔁", label: "Encore un tour", n: pub.wantTour },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Title testId="tv-decision-title">On vote ou on refait un tour ?</Title>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-12">
        {cards.map((c) => (
          <div key={c.id} data-testid={`tv-count-${c.id}`} data-count={c.n} className="glass flex w-[40rem] flex-col items-center gap-5 rounded-card px-8 py-10">
            <span className="text-[7rem] leading-none" aria-hidden>{c.emoji}</span>
            <span className="font-display text-6xl">{c.label}</span>
            <span className="font-num text-[9rem] leading-none text-accent">{c.n}</span>
            <ResultBar pill tone="gold" value={c.n / total} fromZero={false} transition={{ type: "spring", stiffness: 120, damping: 16 }} className="h-6 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TvVote({ pub, round, playerById }: Props) {
  const list = round.participants;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Title sub={<span data-testid="tv-vote-count"><span className="text-accent">{pub.votedCount}</span> / {list.length} ont voté</span>} testId="tv-imposteur-title">
        Qui n'a pas le même mot ?
      </Title>
      <div className="flex min-h-0 flex-1 flex-wrap content-center items-start justify-center gap-x-6 gap-y-6">
        {list.map((id) => (
          <div key={id} className="flex w-[13rem] flex-col items-center gap-2">
            <PlayerAvatar profile={playerById(id)?.profile ?? null} size="xl" />
            <span className="w-full truncate text-2xl font-bold">{playerById(id)?.profile?.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tv(props: Props) {
  const { pub } = props;
  if (pub.step === "mot") return <TvWord />;
  return (
    <div data-testid="tv-imposteur" data-step={pub.step} data-tour={pub.tour} className="flex min-h-0 flex-1 flex-col">
      {pub.step === "parole" ? <TvSpeech {...props} /> : pub.step === "decision" ? <TvDecision {...props} /> : <TvVote {...props} />}
    </div>
  );
}

// ───────────────────────────── Téléphone ─────────────────────────────

/** Le mot reste consultable toute la manche : un appui l'affiche 3 s puis il se recache (rien à tenir, rien qui traîne à l'écran). */
function WordPeek({ word }: { word: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown(false), PEEK_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [shown]);
  return (
    <button
      type="button"
      data-testid="word-peek"
      data-shown={shown}
      onClick={() => setShown((s) => !s)}
      className="glass flex h-[3.25rem] w-full shrink-0 items-center justify-center gap-2 rounded-btn px-4 text-xl font-bold [-webkit-touch-callout:none]"
    >
      {shown ? (
        <span data-testid="word-peek-word" className="truncate font-display text-2xl text-accent">{word}</span>
      ) : (
        <>
          <span aria-hidden>🔒</span> <span className="text-ink-muted">Voir mon mot</span>
        </>
      )}
    </button>
  );
}

function PhoneWord({ priv }: Props) {
  const word = priv?.word ?? "";
  // La police d'affichage est large : la taille suit le mot le plus long, pour qu'aucun mot ne soit coupé en deux.
  const longest = Math.max(1, ...word.split(" ").map((w) => w.length));
  const size = longest <= 6 ? "text-6xl" : longest <= 8 ? "text-5xl" : longest <= 10 ? "text-4xl" : longest <= 13 ? "text-3xl" : "text-2xl";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
      <p className="text-2xl font-bold text-ink-muted">Ton mot</p>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="glass w-full rounded-card px-3 py-8">
        <p data-testid="word-big" className={`text-balance font-display leading-tight text-gold-gradient ${size}`}>{word}</p>
      </motion.div>
      <p className="text-2xl font-bold">🤫 Ne le montre à personne !</p>
    </div>
  );
}

/** Parole : l'orateur a un énorme bouton ; les autres regardent qui parle. Une seule chose à faire par écran. */
function PhoneSpeech({ pub, sendInput, playerById, snapshot }: Props) {
  const myId = snapshot.me?.id;
  const mine = pub.currentId !== null && pub.currentId === myId;
  const current = playerById(pub.currentId ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [pub.currentId]);
  if (mine) {
    return (
      <div data-testid="phone-speaking" data-me="true" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-2 text-center">
        <p className="shrink-0 text-balance text-2xl font-extrabold leading-tight">C'est à toi !<br />Dis ton indice à voix haute</p>
        <Button
          data-testid="speech-done"
          variant="good"
          size="lg"
          block
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void sendInput({ done: true }).catch(() => setBusy(false));
          }}
          className="min-h-0 flex-1 !text-3xl"
        >
          J'ai dit mon indice ✓
        </Button>
      </div>
    );
  }
  return (
    <div data-testid="phone-speaking" data-me="false" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <PlayerAvatar profile={current?.profile ?? null} size="xl" />
      <p className="w-full truncate text-4xl font-extrabold">{current?.profile?.name ?? "…"}</p>
      <p className="font-display text-3xl text-accent">parle…</p>
      <p className="text-xl text-ink-muted">Écoute bien son indice</p>
    </div>
  );
}

// Mêmes codes que « Ceci ou Cela » : deux gros boutons pleins, le choisi a un anneau et une pastille ✓, l'autre s'estompe.
const DECISION_TONES = { vote: "cool", tour: "hot" } as const;

function PhoneDecision({ priv, sendInput }: Props) {
  const choice = priv?.choice ?? null;
  const options = [
    { id: "vote", label: "🗳️ On vote" },
    { id: "tour", label: "🔁 Encore un tour" },
  ] as const;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">On vote ou on refait un tour ?</h1>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {options.map((o) => {
          const selected = choice === o.id;
          return (
            <Choice
              key={o.id}
              data-testid={`decision-${o.id}`}
              tone={DECISION_TONES[o.id]}
              selected={selected}
              state={choice !== null && !selected ? "faded" : "idle"}
              onClick={() => void sendInput({ choice: o.id }).catch(() => {})}
              className="min-h-[5rem] flex-1 px-4"
            >
              <span className="text-balance font-display text-3xl leading-tight">{o.label}</span>
            </Choice>
          );
        })}
      </div>
    </div>
  );
}

function PhoneVote({ round, priv, sendInput, playerById, snapshot }: Props) {
  const myId = snapshot.me?.id;
  const options = round.participants.filter((id) => id !== myId);
  const vote = priv?.vote ?? null;
  const dense = options.length > 4;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 text-center text-2xl font-extrabold">Qui n'a pas le même mot ?</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-1">
        {options.map((id) => {
          const selected = vote === id;
          const profile = playerById(id)?.profile ?? null;
          return (
            <Choice
              key={id}
              data-testid={`vote-option-${id}`}
              selected={selected}
              state={vote !== null && !selected ? "faded" : "idle"}
              onClick={() => void sendInput({ target: id }).catch(() => {})}
              checkTone="accent"
              checkSize="sm"
              checkClassName="absolute right-1.5 top-1.5"
              className={`flex-col gap-1 p-1.5 ${dense ? "min-h-[6.5rem]" : "min-h-[9rem]"}`}
            >
              <PlayerAvatar profile={profile} size={dense ? "md" : "lg"} />
              <span className="w-full truncate text-lg font-bold leading-tight">{profile?.name}</span>
            </Choice>
          );
        })}
      </div>
    </div>
  );
}

function Phone(props: Props) {
  const { pub, priv } = props;
  if (pub.step === "mot") return <PhoneWord {...props} />;
  return (
    <div data-testid="phone-imposteur" data-step={pub.step} className="flex min-h-0 flex-1 flex-col gap-3">
      <WordPeek word={priv?.word ?? ""} />
      {pub.step === "parole" ? <PhoneSpeech {...props} /> : pub.step === "decision" ? <PhoneDecision {...props} /> : <PhoneVote {...props} />}
    </div>
  );
}

// ───────────────────────────── Résultats ─────────────────────────────

// Rythme de la révélation (s) : les votes tombent un par un, silence, puis l'imposteur se détache avec les deux mots.
const VOTES_START_S = 0.6;
const VOTE_STEP_S = 0.45;
const SUSPENSE_S = 1.6;
const SETTLE_S = 2.4;

/** Instant (s) où l'imposteur est dévoilé, pour `n` votes. */
const unveilAt = (n: number) => VOTES_START_S + n * VOTE_STEP_S + SUSPENSE_S;
/** Durée totale (s) de l'animation pour `n` votes. */
export const revealSeconds = (n: number) => unveilAt(n) + SETTLE_S;

function TvResults({ results, round, playerById }: Props) {
  const votes = results?.votes ?? [];
  const at = unveilAt(votes.length);
  const [unveiled, setUnveiled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      setUnveiled(true);
      if (results?.unmasked) fireConfetti("big");
    }, at * 1000);
    return () => clearTimeout(id);
  }, [at, results?.unmasked]);
  if (!results) return null;
  const crowd = round.participants.length > 6;
  return (
    <div data-testid="tv-imposteur-results" data-unveiled={unveiled} className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <h1 className="shrink-0 text-[4rem] font-extrabold leading-tight">{unveiled ? "L'imposteur était…" : "Les votes tombent…"}</h1>
      <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-6">
        {round.participants.map((id) => {
          const isImp = id === results.imposterId;
          const mine = votes.map((v, k) => ({ ...v, k })).filter((v) => v.targetId === id);
          return (
            <motion.div
              key={id}
              data-testid={isImp && unveiled ? "tv-imposter" : undefined}
              animate={{ opacity: unveiled && !isImp ? 0.35 : 1, scale: unveiled && isImp ? 1.2 : 1, y: unveiled && isImp ? -8 : 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 11 }}
              className={`flex flex-col items-center gap-1 ${crowd ? "w-[13rem]" : "w-[14rem]"} ${unveiled && isImp ? "z-10" : ""}`}
            >
              <div className="relative">
                {unveiled && isImp && (
                  <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: -14 }} transition={{ type: "spring" }} className="absolute -left-4 -top-6 z-10 text-6xl">
                    🕵️
                  </motion.span>
                )}
                <PlayerAvatar profile={playerById(id)?.profile ?? null} size="lg" className={unveiled && isImp ? "drop-shadow-[0_0_1.5rem_var(--color-accent)]" : ""} />
              </div>
              <span className={`w-full truncate text-xl font-bold ${unveiled && isImp ? "text-accent" : ""}`}>{playerById(id)?.profile?.name}</span>
              <div className="flex min-h-[3.5rem] flex-wrap justify-center gap-1">
                {mine.map((v) => (
                  <motion.div key={v.voterId} initial={{ opacity: 0, y: -50, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: VOTES_START_S + v.k * VOTE_STEP_S, type: "spring" }}>
                    <PlayerAvatar profile={playerById(v.voterId)?.profile ?? null} size="sm" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex min-h-[13rem] shrink-0 flex-col items-center justify-end gap-3 pb-4">
        {unveiled && (
          <motion.div initial={{ opacity: 0, scale: 0.7, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 14 }} data-testid="tv-verdict" data-unmasked={results.unmasked} className="flex flex-col items-center gap-3">
            <p className={`font-display text-6xl ${results.unmasked ? "text-good" : "text-bad"}`}>
              {results.unmasked ? "Démasqué !" : "Il s'en sort !"}
            </p>
            <div className="flex items-center gap-10 text-5xl font-extrabold">
              <Panel className="px-8 py-3">Vous aviez : <span data-testid="tv-word-majority" className="text-accent">{results.majorityWord}</span></Panel>
              <Panel className="px-8 py-3">Lui avait : <span data-testid="tv-word-imposter" className="text-accent">{results.imposterWord}</span></Panel>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function PhoneResults({ results, priv, snapshot, playerById }: Props) {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const imp = playerById(results.imposterId ?? "");
  const isImp = results.imposterId === myId;
  const vote = priv?.vote ?? null;
  const right = !isImp && vote !== null && vote === results.imposterId;
  const role = isImp ? "imposter" : right ? "right" : vote ? "wrong" : "none";
  const tone = isImp ? "text-accent" : right ? "text-good" : "text-ink-muted";
  return (
    <div data-testid="imposteur-result" data-role={role} className="flex flex-col items-center gap-2 text-center">
      <p className={`font-display text-3xl ${tone}`}>
        {isImp
          ? "🕵️ Tu étais l'imposteur !"
          : right
            ? `Bien vu ! ${results.unmasked ? `+${results.rightPoints}` : ""}`
            : vote
              ? "Raté…"
              : "Pas de vote"}
      </p>
      {isImp ? (
        <p className="text-lg text-ink-muted">
          {results.unmasked ? "Tu t'es fait démasquer…" : `Personne ne t'a démasqué ! +${results.imposterGain}`}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-lg text-ink-muted">
          L'imposteur : <PlayerAvatar profile={imp?.profile ?? null} size="xs" /> <b className="text-ink">{imp?.profile?.name}</b>
        </p>
      )}
      <p className="text-lg text-ink-muted">
        Vous aviez <b className="text-ink">{results.majorityWord}</b>, lui <b className="text-ink">{results.imposterWord}</b>
      </p>
    </div>
  );
}

export default {
  Tv,
  Phone,
  TvResults,
  PhoneResults,
  revealSeconds: ({ results }) => (results ? revealSeconds(results.votes.length) : 0),
} satisfies MiniGameViews;
