// Écrans de "Qui a dit ça ?" : écrire une réponse, deviner l'auteur de chaque citation, révélation, récap.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, CheckIcon, fireConfetti, PlayerAvatar, typo } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { Priv, Pub, Results } from "./game";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Même nettoyage que le serveur, pour savoir si ce qui est tapé est déjà envoyé. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Taille (rem) de la citation sur la TV selon sa longueur : courte = énorme, longue = 3 lignes. */
const tvQuoteSize = (len: number) => (len <= 25 ? 8 : len <= 45 ? 6.5 : len <= 65 ? 5.5 : 4.75);

/** Citation entre guillemets dorés, grand format TV. */
function QuoteCard({ text, size, testId }: { text: string; size: number; testId?: string }) {
  return (
    <div className="glass relative w-full max-w-[100rem] rounded-card px-24 py-10 text-center">
      <span aria-hidden className="absolute -top-2 left-8 font-display text-[11rem] leading-none text-gold-gradient">“</span>
      <span aria-hidden className="absolute -bottom-20 right-8 font-display text-[11rem] leading-none text-gold-gradient">”</span>
      <p data-testid={testId} className="text-balance break-words font-extrabold italic leading-[1.1]" style={{ fontSize: `${size}rem` }}>
        {text}
      </p>
    </div>
  );
}

/** Pastilles anonymes de progression du vote (on ne dit pas qui a voté : l'auteur ne vote pas, ça le trahirait). */
function VoteDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2" data-testid="tv-vote-dots">
        {Array.from({ length: total }, (_, i) => (
          <motion.span
            key={i}
            animate={i < done ? { scale: [1, 1.5, 1] } : { scale: 1 }}
            className={`h-6 w-6 rounded-full ${i < done ? "bg-gold shadow-glow" : "bg-surface-strong"}`}
          />
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
        ✍️
      </motion.span>
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} data-testid="tv-prompt" className="max-w-[92rem] text-balance text-[5.75rem] font-extrabold leading-[1.05]">
        {typo(pub.prompt)}
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

function TvGuess({ pub, playerById }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <div className="flex w-full items-center justify-center gap-6">
        <span data-testid="tv-quote-index" className="rounded-chip bg-surface-strong px-5 py-1 font-display text-3xl text-accent">
          {pub.index + 1} / {pub.total}
        </span>
        <span className="min-w-0 truncate text-3xl text-ink-muted">{typo(pub.prompt)}</span>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={pub.index}
            initial={{ opacity: 0, y: 80, rotate: -3, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            className="flex w-full justify-center"
          >
            <QuoteCard text={pub.quote ?? ""} size={tvQuoteSize((pub.quote ?? "").length)} testId="tv-quote" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-2" data-testid="tv-candidates">
          {pub.candidateIds.map((id) => (
            <div key={id} className="flex w-[10rem] flex-col items-center gap-0.5">
              <PlayerAvatar profile={playerById(id)?.profile ?? null} size={pub.candidateIds.length > 6 ? "md" : "lg"} />
              <span className="w-full truncate text-xl font-bold">{playerById(id)?.profile?.name}</span>
            </div>
          ))}
        </div>
        <VoteDots done={pub.votedCount} total={pub.voterCount} />
      </div>
    </div>
  );
}

function TvReveal({ pub, playerById }: Props) {
  const authorId = pub.authorId;
  const fooled = pub.votes.filter((v) => v.targetId !== authorId).length;
  useEffect(() => {
    if (fooled === 0) return;
    const id = setTimeout(() => fireConfetti("small"), 1500);
    return () => clearTimeout(id);
  }, [fooled]);

  // Déroulé : les votes tombent sous chaque suspect, puis l'auteur se détache (les autres s'éteignent).
  const REVEAL_AT = 1.3;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-6 text-center">
      <span className="rounded-chip bg-surface-strong px-5 py-1 font-display text-3xl text-accent">
        {pub.index + 1} / {pub.total}
      </span>
      <motion.div initial={{ scale: 1.08 }} animate={{ scale: 1 }} className="w-full max-w-[100rem] [&_p]:line-clamp-3">
        <QuoteCard text={pub.quote ?? ""} size={4} />
      </motion.div>
      <div data-testid="tv-reveal" className="flex flex-1 flex-nowrap items-center justify-center gap-x-2 pb-10">
        {pub.candidateIds.map((id, i) => {
          const isAuthor = id === authorId;
          const voters = pub.votes.filter((v) => v.targetId === id);
          return (
            <motion.div
              key={id}
              data-testid={isAuthor ? "tv-reveal-author" : undefined}
              animate={{ opacity: isAuthor ? 1 : 0.35, scale: isAuthor ? 1.3 : 0.95, y: isAuthor ? -12 : 0 }}
              transition={{ delay: REVEAL_AT, type: "spring", stiffness: 160, damping: 11 }}
              className={`flex w-[11.5rem] flex-col items-center gap-1 ${isAuthor ? "z-10" : ""}`}
            >
              <div className="relative">
                {isAuthor && (
                  <motion.span initial={{ scale: 0, y: 20, rotate: -30 }} animate={{ scale: 1, y: 0, rotate: -18 }} transition={{ delay: REVEAL_AT + 0.2, type: "spring" }} className="absolute -left-4 -top-6 z-10 text-6xl">
                    🎭
                  </motion.span>
                )}
                {isAuthor && pub.authorGain > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: REVEAL_AT + 0.5, type: "spring", stiffness: 300, damping: 12 }}
                    className="absolute -right-8 -top-4 z-10 rounded-chip bg-gold px-3 py-1 font-display text-3xl text-accent-ink shadow-glow"
                  >
                    +{pub.authorGain}
                  </motion.span>
                )}
                <PlayerAvatar profile={playerById(id)?.profile ?? null} size="lg" className={isAuthor ? "drop-shadow-[0_0_1.5rem_var(--color-accent)]" : ""} />
              </div>
              <span className={`w-full truncate text-2xl font-bold ${isAuthor ? "text-accent" : ""}`}>{playerById(id)?.profile?.name}</span>
              <div className="flex min-h-[3.5rem] flex-wrap justify-center gap-1">
                {voters.map((v, k) => (
                  <motion.div key={v.voterId} initial={{ opacity: 0, y: -40, scale: 0.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15 + (i + k) * 0.08, type: "spring" }} className="relative">
                    <PlayerAvatar profile={playerById(v.voterId)?.profile ?? null} size="sm" />
                    {isAuthor && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: REVEAL_AT + 0.4 + k * 0.08, type: "spring" }} className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-good text-sm text-bg">
                        <CheckIcon />
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const Tv = (props: Props) => (props.pub.step === "write" ? <TvWrite {...props} /> : props.pub.step === "guess" ? <TvGuess {...props} /> : <TvReveal {...props} />);

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
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight min-[400px]:text-3xl">{typo(pub.prompt)}</h1>
      <div className={`relative min-h-[7rem] max-h-[16rem] flex-1 rounded-card border-2 transition-colors ${isSent ? "border-good bg-good/10" : "border-line bg-surface"}`}>
        <textarea
          data-testid="quote-input"
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
          autoCapitalize="sentences"
          placeholder="Ta réponse…"
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
      <Button data-testid="quote-send" data-sent={isSent} variant={isSent ? "good" : "primary"} size="lg" block disabled={!canSend && !isSent} onClick={submit} className="shrink-0">
        {isSent ? <span className="inline-flex items-center gap-2">Envoyé <CheckIcon /></span> : typed === "" && sent !== null ? "Retirer" : sent !== null ? "Modifier" : "Envoyer"}
      </Button>
    </div>
  );
}

function PhoneGuess({ pub, priv, sendInput, playerById, snapshot }: Props) {
  const myId = snapshot.me?.id;
  const options = pub.candidateIds.filter((id) => id !== myId);
  const vote = priv?.vote ?? null;
  const dense = options.length > 4;
  const quote = pub.quote ?? "";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="glass relative shrink-0 rounded-card px-5 py-3 text-center">
        <span aria-hidden className="absolute left-2 top-0 font-display text-5xl leading-none text-gold-gradient">“</span>
        <p data-testid="phone-quote" className={`text-balance break-words font-extrabold italic leading-tight ${quote.length > 50 ? "text-xl" : "text-2xl"}`}>
          {quote}
        </p>
      </div>
      {priv?.isAuthor ? (
        <motion.div
          data-testid="guess-author"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-card border-2 border-accent bg-accent/15 shadow-glow"
        >
          <PlayerAvatar profile={playerById(myId ?? "")?.profile ?? null} size="lg" badge={<span aria-hidden>🤫</span>} />
          <p className="font-display text-3xl text-accent">C'est toi !</p>
        </motion.div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-1">
          {options.map((id) => {
            const selected = vote === id;
            const profile = playerById(id)?.profile ?? null;
            return (
              <motion.button
                key={id}
                type="button"
                data-testid={`guess-option-${id}`}
                whileTap={{ scale: 0.93 }}
                animate={{ scale: selected ? 1.03 : 1, opacity: vote !== null && !selected ? 0.5 : 1 }}
                onClick={() => void sendInput({ target: id }).catch(() => {})}
                aria-pressed={selected}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-card border-2 p-1.5 ${dense ? "min-h-[4.6rem]" : "min-h-[7.5rem]"} ${selected ? "border-accent bg-accent/25 shadow-glow" : "glass border-transparent"}`}
              >
                <PlayerAvatar profile={profile} size={dense ? "sm" : "lg"} />
                <span className="w-full truncate text-base font-bold leading-tight">{profile?.name}</span>
                {selected && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-sm text-accent-ink">
                    <CheckIcon />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhoneReveal({ pub, priv, snapshot, playerById }: Props) {
  const myId = snapshot.me?.id;
  const author = playerById(pub.authorId ?? "");
  const mine = priv?.isAuthor;
  const right = !mine && priv?.vote != null && priv.vote === pub.authorId;
  const fooled = pub.votes.filter((v) => v.targetId !== pub.authorId).length;
  const tone = mine ? "text-accent" : right ? "text-good" : "text-ink-muted";
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="line-clamp-3 text-balance px-2 text-xl font-bold italic leading-tight text-ink-muted">“{pub.quote}”</p>
      <motion.div initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 11, delay: 0.2 }} className="flex flex-col items-center gap-2">
        <PlayerAvatar profile={author?.profile ?? null} size="xl" badge={<span aria-hidden>🎭</span>} className="drop-shadow-[0_0_1.5rem_var(--color-accent)]" />
        <span className="max-w-full truncate font-display text-3xl text-accent">{author?.profile?.name}</span>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} data-testid="reveal-result" className={`font-display text-3xl ${tone}`}>
        {mine ? (
          <>
            {fooled > 0 ? `${fooled} trompé${fooled > 1 ? "s" : ""} ! +${pub.authorGain}` : "Personne n'est tombé dans le piège"}
          </>
        ) : right ? (
          <>Bien vu ! +{pub.rightPoints}</>
        ) : priv?.vote ? (
          <>Raté…</>
        ) : myId ? (
          <>Pas de vote</>
        ) : null}
      </motion.div>
    </div>
  );
}

const Phone = (props: Props) => (props.pub.step === "write" ? <PhoneWrite {...props} /> : props.pub.step === "guess" ? <PhoneGuess {...props} /> : <PhoneReveal {...props} />);

// ───────────────────────────── Résultats ─────────────────────────────

function Award({ icon, title, ids, detail, playerById, testId }: { icon: string; title: string; ids: string[]; detail: string; playerById: Props["playerById"]; testId: string }) {
  return (
    <motion.div data-testid={testId} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="flex items-center gap-5 rounded-chip border-[0.25rem] border-accent bg-accent/15 py-2 pl-3 pr-10 shadow-glow">
      <div className="flex -space-x-4">
        {ids.slice(0, 3).map((id) => (
          <PlayerAvatar key={id} profile={playerById(id)?.profile ?? null} size="md" badge={<span aria-hidden>{icon}</span>} />
        ))}
      </div>
      <div className="min-w-0 text-left leading-tight">
        <div className="truncate text-3xl font-extrabold text-accent">{ids.map((id) => playerById(id)?.profile?.name).join(" & ")}</div>
        <div className="text-2xl text-ink-muted">{title} · {detail}</div>
      </div>
    </motion.div>
  );
}

// Rythme de la révélation (s) : le récapitulatif arrive carte par carte (le vrai suspense a eu lieu pendant la manche).
const RECAP_FIRST_S = 0.1;
const RECAP_STEP_S = 0.1;
const SETTLE_S = 0.8;

/** Durée totale (s) de l'animation pour `n` citations. */
export const revealSeconds = (n: number) => RECAP_FIRST_S + Math.max(0, n - 1) * RECAP_STEP_S + SETTLE_S;

const TvResults = ({ results, playerById }: Props) => {
  if (!results) return null;
  const n = results.quotes.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-4xl font-extrabold leading-tight">{typo(results.prompt)}</h1>
      {(results.trickster || results.detective) && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-6">
          {results.trickster && results.trickster.playerIds.length <= 3 && <Award testId="award-trickster" icon="🎭" title="Meilleur piégeur" ids={results.trickster.playerIds} detail={`${results.trickster.fooled} trompé${results.trickster.fooled > 1 ? "s" : ""}`} playerById={playerById} />}
          {results.detective && results.detective.playerIds.length <= 3 && <Award testId="award-detective" icon="🔎" title="Meilleur flair" ids={results.detective.playerIds} detail={`${results.detective.correct} bonne${results.detective.correct > 1 ? "s" : ""} réponse${results.detective.correct > 1 ? "s" : ""}`} playerById={playerById} />}
        </div>
      )}
      <div data-testid="quotes-recap" className={`grid min-h-0 flex-1 auto-rows-fr content-center gap-3 ${n > 3 ? "grid-cols-2" : "grid-cols-1"}`}>
        {n === 0 && <p className="text-center text-5xl text-ink-muted">Personne n'a écrit…</p>}
        {results.quotes.map((q, i) => {
          const author = playerById(q.authorId);
          const good = q.votes.filter((v) => v.targetId === q.authorId).length;
          return (
            <motion.div key={q.authorId} data-testid={`recap-${q.authorId}`} initial={{ opacity: 0, x: i % 2 ? 60 : -60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: RECAP_FIRST_S + i * RECAP_STEP_S, type: "spring" }} className="glass flex min-h-0 items-center gap-4 rounded-card px-4 py-2">
              <div className="flex w-[7.5rem] shrink-0 flex-col items-center gap-0.5">
                <PlayerAvatar profile={author?.profile ?? null} size="sm" />
                <span className="w-full truncate text-center text-lg font-bold">{author?.profile?.name}</span>
              </div>
              <p className="min-w-0 flex-1 text-balance break-words text-2xl font-bold italic leading-tight">“{typo(q.text)}”</p>
              {q.played && (
                <div className="shrink-0 text-center font-display leading-none">
                  <div className="text-3xl text-accent">{good}/{q.votes.length}</div>
                  <div className="text-xl" aria-hidden>🎯</div>
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
  const mine = results?.quotes.find((q) => q.authorId === myId);
  if (!results || !myId) return null;
  const fooled = mine ? mine.votes.filter((v) => v.targetId !== myId).length : 0;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {mine ? (
        <>
          <p className="text-balance text-lg font-bold italic">“{mine.text}”</p>
          {mine.played && <p className="text-ink-muted">{fooled > 0 ? `Tu as trompé ${fooled} joueur${fooled > 1 ? "s" : ""}` : "Tout le monde t'a reconnu(e)"}</p>}
        </>
      ) : (
        <p className="text-xl text-ink-muted">Tu n'as rien écrit</p>
      )}
      {results.trickster?.playerIds.includes(myId) && <p className="font-display text-2xl text-accent">🎭 Meilleur piégeur !</p>}
      {results.detective?.playerIds.includes(myId) && <p className="font-display text-2xl text-accent">🔎 Meilleur flair !</p>}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.quotes.length) : 0) } satisfies MiniGameViews;
