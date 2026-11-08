// Écrans de "Split the Room" : écrire la fin d'une situation, voter OUI / NON, révélation (jauge + auteur), récap.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, CheckIcon, fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results, Verdict } from "./game";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Même nettoyage que le serveur, pour savoir si ce qui est tapé est déjà envoyé. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

// Rythme de la révélation (s), partagé par la TV et les téléphones : les téléphones n'affichent le verdict
// qu'en même temps que la TV (pas de spoil). Compté depuis l'affichage de la révélation.
const FILL_START_S = 0.7;
const FILL_STEP_S = 0.4;
const VERDICT_PAUSE_S = 0.6;
const AUTHOR_DELAY_S = 2;
/** Instant (s) du verdict pour `n` votes. */
const verdictAt = (n: number) => FILL_START_S + n * FILL_STEP_S + VERDICT_PAUSE_S;
/** Instant (s) où l'auteur est démasqué. */
const authorAt = (n: number) => verdictAt(n) + AUTHOR_DELAY_S;

/** Horloge locale de la révélation : combien de votes sont tombés, verdict et auteur visibles ? */
function useRevealClock(n: number) {
  const [shown, setShown] = useState(0);
  const [verdict, setVerdict] = useState(false);
  const [author, setAuthor] = useState(false);
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= n; i++) ids.push(setTimeout(() => setShown(i), (FILL_START_S + (i - 1) * FILL_STEP_S) * 1000));
    ids.push(setTimeout(() => setVerdict(true), verdictAt(n) * 1000));
    ids.push(setTimeout(() => setAuthor(true), authorAt(n) * 1000));
    return () => ids.forEach(clearTimeout);
  }, [n]);
  return { shown, verdict, author };
}

const VERDICT_TEXT: Record<Verdict, string> = {
  perfect: "LA SALLE EST COUPÉE EN DEUX !",
  split: "La salle est partagée…",
  unanimous: "Unanimité…",
  none: "Pas assez de votes",
};
const VERDICT_TONE: Record<Verdict, string> = { perfect: "text-gold-gradient", split: "text-accent", unanimous: "text-ink-muted", none: "text-ink-muted" };

/** Taille (rem) de la phrase complète sur la TV selon sa longueur. */
const tvSize = (len: number) => (len <= 50 ? 6 : len <= 80 ? 5.25 : len <= 110 ? 4.5 : 3.75);

/** Phrase complète : début en blanc, fin de l'invité en or. */
function Sentence({ start, ending, size, testId }: { start: string; ending: string; size: number; testId?: string }) {
  return (
    <p data-testid={testId} className="text-balance break-words font-extrabold leading-[1.1]" style={{ fontSize: `${size}rem` }}>
      <span>{start}</span> <span className="text-accent">{ending}</span>
    </p>
  );
}

/** Pastilles anonymes de progression du vote (on ne dit pas qui a voté : l'auteur ne vote pas, ça le trahirait). */
function VoteDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2" data-testid="tv-vote-dots">
        {Array.from({ length: total }, (_, i) => (
          <motion.span key={i} animate={i < done ? { scale: [1, 1.5, 1] } : { scale: 1 }} className={`h-6 w-6 rounded-full ${i < done ? "bg-gold shadow-glow" : "bg-surface-strong"}`} />
        ))}
      </div>
      <span data-testid="tv-vote-count" className="font-display text-4xl text-ink-muted">
        <span className="text-accent">{done}</span> / {total}
      </span>
    </div>
  );
}

// ───────────────────────────── TV ─────────────────────────────

function TvWrite({ pub, round, players }: Props) {
  const writers = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const crowd = writers.length > 5;
  const done = writers.filter((p) => pub.writtenIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-10 text-center">
      <motion.span animate={{ rotate: [0, -14, 8, -14, 0], y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="text-[6rem] leading-none" aria-hidden>
        ✂️
      </motion.span>
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} data-testid="tv-start" className="max-w-[92rem] text-balance text-[5.75rem] font-extrabold leading-[1.05]">
        {pub.start}
      </motion.h1>
      <div data-testid="tv-written-count" className={`font-display text-5xl ${pub.allWritten ? "text-good" : "text-ink-muted"}`}>
        <span className={pub.allWritten ? "" : "text-accent"}>{done}</span> / {writers.length}
      </div>
      <div data-testid="tv-written" className="flex flex-wrap items-start justify-center gap-x-2 gap-y-3">
        {writers.map((p) => {
          const has = pub.writtenIds.includes(p.id);
          return (
            <motion.div key={p.id} animate={{ scale: has ? 1 : 0.92, y: has ? -8 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className="flex w-[11rem] flex-col items-center gap-1">
              <PlayerAvatar profile={p.profile} size={crowd ? "md" : "lg"} dimmed={!has} badge={has ? <CheckIcon /> : undefined} className={has ? "drop-shadow-[0_0_1.2rem_var(--color-accent)]" : ""} />
              <span className={`w-full truncate font-bold ${crowd ? "text-xl" : "text-2xl"} ${has ? "text-ink" : "text-ink-muted"}`}>{p.profile!.name}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function TvVote({ pub }: Props) {
  const ending = pub.ending ?? "";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <span data-testid="tv-sentence-index" className="rounded-chip bg-surface-strong px-5 py-1 font-display text-3xl text-accent">
        {pub.index + 1} / {pub.total}
      </span>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <motion.div
          key={pub.index}
          initial={{ opacity: 0, y: 80, rotate: -3, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="glass w-full max-w-[100rem] rounded-card px-16 py-10 text-center"
        >
          <Sentence start={pub.start} ending={ending} size={tvSize(pub.start.length + ending.length)} testId="tv-sentence" />
        </motion.div>
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <p className="font-display text-6xl">Tu acceptes ?</p>
        <VoteDots done={pub.votedCount} total={pub.voterCount} />
      </div>
    </div>
  );
}

/** Jauge : les OUI poussent depuis la gauche, les NON depuis la droite ; la frontière finale dit si la salle est coupée. */
function Gauge({ sequence, shown }: { sequence: boolean[]; shown: number }) {
  const n = sequence.length;
  const yes = sequence.slice(0, shown).filter(Boolean).length;
  const no = shown - yes;
  return (
    <div className="flex w-full max-w-[100rem] flex-col gap-3">
      <div className="flex items-end justify-between font-display">
        <span data-testid="tv-gauge-yes" className="text-[7rem] leading-none text-good">
          {yes} <span className="text-5xl">OUI</span>
        </span>
        <span data-testid="tv-gauge-no" className="text-[7rem] leading-none text-bad">
          <span className="text-5xl">NON</span> {no}
        </span>
      </div>
      <div data-testid="tv-gauge" className="relative h-20 w-full overflow-hidden rounded-chip bg-surface-strong">
        <div className="absolute inset-y-0 left-0 bg-good transition-[width] duration-300" style={{ width: n ? `${(yes / n) * 100}%` : 0 }} />
        <div className="absolute inset-y-0 right-0 bg-bad transition-[width] duration-300" style={{ width: n ? `${(no / n) * 100}%` : 0 }} />
        <div className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 bg-ink" />
      </div>
    </div>
  );
}

function TvReveal({ pub, playerById }: Props) {
  const n = pub.sequence.length;
  const { shown, verdict, author } = useRevealClock(n);
  const v = pub.verdict ?? "none";
  useEffect(() => {
    if (!verdict) return;
    if (v === "perfect") fireConfetti("big");
    else if (pub.authorGain > 0) fireConfetti("small");
  }, [verdict, v, pub.authorGain]);

  const ending = pub.ending ?? "";
  const authorProfile = playerById(pub.authorId ?? "")?.profile ?? null;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <span className="rounded-chip bg-surface-strong px-5 py-1 font-display text-3xl text-accent">
        {pub.index + 1} / {pub.total}
      </span>
      <div className="glass w-full max-w-[100rem] rounded-card px-12 py-5 [&_p]:line-clamp-3">
        <Sentence start={pub.start} ending={ending} size={3.5} />
      </div>
      {n > 0 ? <Gauge sequence={pub.sequence} shown={shown} /> : <p className="text-5xl text-ink-muted">Personne n'a voté…</p>}
      <div className="flex min-h-[11rem] w-full flex-col items-center justify-start gap-4">
        {verdict && (
          <motion.p
            data-testid="tv-verdict"
            data-verdict={v}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className={`font-display text-7xl ${VERDICT_TONE[v]}`}
          >
            {VERDICT_TEXT[v]}
          </motion.p>
        )}
        {author && (
          <motion.div data-testid="tv-reveal-author" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6">
            <PlayerAvatar profile={authorProfile} size="lg" badge={<span aria-hidden>🎭</span>} className="drop-shadow-[0_0_1.5rem_var(--color-accent)]" />
            <span className="max-w-[40rem] whitespace-nowrap font-display text-5xl text-accent">{authorProfile?.name}</span>
            {pub.authorGain > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} className="rounded-chip bg-gold px-5 py-2 font-display text-5xl text-accent-ink shadow-glow">
                +{pub.authorGain}
              </motion.span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const Tv = (props: Props) => (props.pub.step === "write" ? <TvWrite {...props} /> : props.pub.step === "vote" ? <TvVote {...props} /> : <TvReveal {...props} />);

// ───────────────────────────── Téléphone ─────────────────────────────

function PhoneWrite({ pub, priv, sendInput }: Props) {
  const sent = priv?.text ?? null;
  const [draft, setDraft] = useState(sent ?? "");
  const [busy, setBusy] = useState(false);
  const typed = clean(draft);
  const isSent = sent !== null && typed === sent;
  const canSend = !busy && !isSent && (typed !== "" || sent !== null);

  const submit = () => {
    if (!canSend) return;
    setBusy(true);
    void sendInput({ text: draft })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 pb-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight min-[400px]:text-3xl">{pub.start}</h1>
      <div className={`relative min-h-[7rem] max-h-[16rem] flex-1 rounded-card border-2 transition-colors ${isSent ? "border-good bg-good/10" : "border-line bg-surface"}`}>
        <textarea
          data-testid="split-input"
          value={draft}
          maxLength={pub.maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          enterKeyHint="send"
          autoCapitalize="none"
          placeholder="…la suite, la plus piégeuse possible"
          className="h-full w-full resize-none rounded-card bg-transparent p-4 pb-9 text-2xl font-semibold leading-snug text-ink outline-none placeholder:text-ink-muted"
        />
        <span className="pointer-events-none absolute bottom-2 right-4 text-base tabular-nums text-ink-muted">
          {draft.length}/{pub.maxLength}
        </span>
        {isSent && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="pointer-events-none absolute bottom-2 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-good text-bg">
            <CheckIcon />
          </motion.span>
        )}
      </div>
      <Button data-testid="split-send" data-sent={isSent} variant={isSent ? "good" : "primary"} size="lg" block disabled={!canSend && !isSent} onClick={submit} className="shrink-0">
        {isSent ? <span className="inline-flex items-center gap-2">Envoyé <CheckIcon /></span> : typed === "" && sent !== null ? "Retirer" : sent !== null ? "Modifier" : "Envoyer"}
      </Button>
    </div>
  );
}

function PhoneVote({ pub, priv, sendInput }: Props) {
  const vote = priv?.vote ?? null;
  const ending = pub.ending ?? "";
  const long = pub.start.length + ending.length > 70;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-1">
      <div className="glass shrink-0 rounded-card px-4 py-3 text-center">
        <p data-testid="phone-sentence" className={`text-balance break-words font-extrabold leading-tight ${long ? "text-xl" : "text-2xl"}`}>
          <span>{pub.start}</span> <span className="text-accent">{ending}</span>
        </p>
      </div>
      {priv?.isAuthor ? (
        <motion.div data-testid="vote-author" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-card border-2 border-accent bg-accent/15 px-4 text-center shadow-glow">
          <span className="text-6xl" aria-hidden>🤞</span>
          <p className="font-display text-3xl text-accent">C'est ta phrase !</p>
          <p className="text-lg text-ink-muted">Croise les doigts pour un 50/50</p>
        </motion.div>
      ) : (
        <>
          <p className="shrink-0 text-center font-display text-3xl">Tu acceptes ?</p>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {([true, false] as const).map((yes) => {
              const selected = vote === yes;
              return (
                <motion.div key={String(yes)} animate={{ opacity: vote !== null && !selected ? 0.45 : 1, scale: selected ? 1.02 : 1 }} className="flex min-h-[5rem] flex-1">
                  <Button
                    data-testid={yes ? "vote-yes" : "vote-no"}
                    aria-pressed={selected}
                    variant={yes ? "good" : "bad"}
                    size="xl"
                    block
                    onClick={() => void sendInput({ vote: yes }).catch(() => {})}
                    className="relative h-full !text-5xl"
                  >
                    {yes ? "OUI" : "NON"}
                    {selected && (
                      <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-bg text-ink">
                        <CheckIcon />
                      </span>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PhoneReveal({ pub, priv, snapshot, playerById }: Props) {
  const myId = snapshot.me?.id;
  const { verdict, author } = useRevealClock(pub.sequence.length);
  const v = pub.verdict ?? "none";
  const mine = priv?.isAuthor;
  const authorProfile = playerById(pub.authorId ?? "")?.profile ?? null;
  const ending = pub.ending ?? "";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
      <p className="line-clamp-3 text-balance px-2 text-xl font-bold leading-tight text-ink-muted">
        {pub.start} {ending}
      </p>
      {!verdict ? (
        <p data-testid="reveal-wait" className="font-display text-3xl text-accent">Regarde la TV !</p>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} data-testid="reveal-result" data-verdict={v} className="flex flex-col items-center gap-3">
          <p className={`font-display text-3xl leading-tight ${VERDICT_TONE[v]}`}>{VERDICT_TEXT[v]}</p>
          {pub.sequence.length > 0 && (
            <p className="font-display text-4xl">
              <span className="text-good">{pub.yes} OUI</span> <span className="text-ink-muted">·</span> <span className="text-bad">{pub.no} NON</span>
            </p>
          )}
          {!author ? null : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
              <PlayerAvatar profile={authorProfile} size="xl" badge={<span aria-hidden>🎭</span>} className="drop-shadow-[0_0_1.5rem_var(--color-accent)]" />
              <span className="max-w-full truncate font-display text-3xl text-accent">{authorProfile?.name}</span>
              {pub.authorGain > 0 && (
                <span data-testid="reveal-gain" className="font-display text-3xl text-accent">
                  {mine ? "Tu marques" : "Marque"} +{pub.authorGain}
                </span>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
      {myId && !mine && priv?.vote == null && verdict && <p className="text-lg text-ink-muted">Tu n'as pas voté</p>}
    </div>
  );
}

const Phone = (props: Props) => (props.pub.step === "write" ? <PhoneWrite {...props} /> : props.pub.step === "vote" ? <PhoneVote {...props} /> : <PhoneReveal {...props} />);

// ───────────────────────────── Résultats ─────────────────────────────

// Rythme de l'animation du récap (s) : les cartes arrivent une à une (le vrai suspense a eu lieu pendant la manche).
const RECAP_FIRST_S = 0.1;
const RECAP_STEP_S = 0.1;
const SETTLE_S = 0.8;

/** Durée totale (s) de l'animation pour `n` phrases. */
export const revealSeconds = (n: number) => RECAP_FIRST_S + Math.max(0, n - 1) * RECAP_STEP_S + SETTLE_S;

const TvResults = ({ results, playerById }: Props) => {
  if (!results) return null;
  const n = results.sentences.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-4xl font-extrabold leading-tight">{results.start}</h1>
      <div data-testid="sentences-recap" className={`grid min-h-0 flex-1 auto-rows-fr content-center gap-3 ${n > 3 ? "grid-cols-2" : "grid-cols-1"}`}>
        {n === 0 && <p className="text-center text-5xl text-ink-muted">Personne n'a écrit…</p>}
        {results.sentences.map((s, i) => {
          const author = playerById(s.authorId);
          return (
            <motion.div
              key={s.authorId}
              data-testid={`recap-${s.authorId}`}
              data-best={s.best}
              initial={{ opacity: 0, x: i % 2 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: RECAP_FIRST_S + i * RECAP_STEP_S, type: "spring" }}
              className={`flex min-h-0 items-center gap-4 rounded-card px-4 py-2 ${s.best ? "border-[0.25rem] border-accent bg-accent/15 shadow-glow" : "glass"}`}
            >
              <div className="flex w-[7.5rem] shrink-0 flex-col items-center gap-0.5">
                <PlayerAvatar profile={author?.profile ?? null} size="sm" badge={s.best ? <span aria-hidden>✂️</span> : undefined} />
                <span className="w-full truncate text-center text-lg font-bold">{author?.profile?.name}</span>
              </div>
              <p className="min-w-0 flex-1 text-balance break-words text-2xl font-bold leading-tight">
                <span className="text-ink-muted">{results.start}</span> <span className="text-accent">{s.text}</span>
              </p>
              {s.played && (
                <div className="shrink-0 text-center font-display leading-none">
                  <div className="text-3xl">
                    <span className="text-good">{s.yes}</span> <span className="text-ink-muted">/</span> <span className="text-bad">{s.no}</span>
                  </div>
                  <div className="mt-1 text-xl text-accent">{s.gain > 0 ? `+${s.gain}` : "0"}</div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: Props) => {
  const myId = snapshot.me?.id;
  const mine = results?.sentences.find((s) => s.authorId === myId);
  if (!results || !myId) return null;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {mine ? (
        <>
          <p className="text-balance text-lg font-bold">{results.start} <span className="text-accent">{mine.text}</span></p>
          {mine.played && (
            <p className="text-ink-muted">
              {mine.yes} OUI · {mine.no} NON{mine.best ? " · la plus coupée !" : ""}
            </p>
          )}
        </>
      ) : (
        <p className="text-xl text-ink-muted">Tu n'as rien écrit</p>
      )}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.sentences.length) : 0) } satisfies MiniGameViews;
