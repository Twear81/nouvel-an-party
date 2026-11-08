// Écrans de « L'imposteur » : lire son mot, indices, tableau des indices (aide-mémoire du débat), vote, révélation.
// Règle d'or : le téléphone de l'imposteur est identique à celui des autres (même écrans, même données) jusqu'aux résultats.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button, CheckIcon, fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { containsOwnWord, type Priv, type Pub, type Results } from "./game";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Même nettoyage que le serveur (espaces réduits) pour comparer ce qui est tapé à ce qui est envoyé. */
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Durée (s) pendant laquelle le mot reste affiché quand on le consulte en cours de manche. */
const PEEK_SECONDS = 3;

/** Une case du tableau : l'indice dévoilé, ou un état d'attente pendant la saisie du tour. */
type Slot = { kind: "clue"; text: string; fresh: boolean } | { kind: "sent" } | { kind: "wait" } | { kind: "none" };

function slotsOf(pub: Pub, id: string): Slot[] {
  const revealed = pub.clues[id] ?? [];
  return Array.from({ length: pub.tours }, (_, t): Slot => {
    if (t < revealed.length) return { kind: "clue", text: revealed[t] || "—", fresh: pub.step === "montre" && t === pub.tour - 1 };
    if (pub.step === "indice" && t === pub.tour - 1) return pub.sentIds.includes(id) ? { kind: "sent" } : { kind: "wait" };
    return { kind: "none" };
  });
}

// ───────────────────────────── TV ─────────────────────────────

/** Tableau des indices : une carte par joueur. Reste affiché jusqu'au vote (aide-mémoire du débat). */
function TvBoard({ pub, round, players }: Pick<Props, "pub" | "round" | "players">) {
  const list = pub.playerIds.map((id) => players.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p?.profile && round.participants.includes(p.id));
  const dense = list.length > 6;
  return (
    <div data-testid="tv-board" className="flex min-h-0 flex-1 flex-wrap content-center items-start justify-center gap-4">
      {list.map((p, i) => {
        const slots = slotsOf(pub, p.id);
        const sent = pub.step === "indice" && pub.sentIds.includes(p.id);
        return (
          <div key={p.id} data-testid={`board-${p.id}`} className={`glass flex flex-col gap-2 rounded-card px-4 py-3 ${dense ? "w-[26rem]" : "w-[30rem]"}`}>
            <div className="flex items-center gap-4">
              <PlayerAvatar profile={p.profile} size="md" dimmed={pub.step === "indice" && !sent} badge={sent ? <CheckIcon /> : undefined} />
              <span className="min-w-0 flex-1 truncate text-3xl font-extrabold">{p.profile!.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {slots.map((s, t) => (
                <div key={t} className="flex min-h-[4.25rem] items-center gap-3 rounded-chip bg-surface-strong px-4 py-1">
                  <span className="shrink-0 font-display text-2xl text-accent">{t + 1}</span>
                  {s.kind === "clue" ? (
                    <motion.span
                      data-testid={`clue-${p.id}-${t}`}
                      initial={s.fresh ? { opacity: 0, scale: 0.4, rotate: -6 } : false}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.3, type: "spring", stiffness: 220, damping: 13 }}
                      className="min-w-0 flex-1 text-4xl font-bold leading-tight [overflow-wrap:anywhere]"
                    >
                      {s.text}
                    </motion.span>
                  ) : (
                    <span className="min-w-0 flex-1 text-3xl text-ink-muted">{s.kind === "sent" ? "✓" : s.kind === "wait" ? "…" : ""}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

function Tv(props: Props) {
  const { pub, round, players } = props;
  if (pub.step === "mot") return <TvWord />;
  const n = pub.playerIds.filter((id) => round.participants.includes(id)).length;
  const sub =
    pub.step === "indice" ? (
      <span data-testid="tv-sent-count"><span className="text-accent">{pub.sentIds.length}</span> / {n}</span>
    ) : pub.step === "debat" ? (
      <span data-testid="tv-ready-count"><span className="text-accent">{pub.readyIds.length}</span> / {n} prêts à voter</span>
    ) : pub.step === "vote" ? (
      <span data-testid="tv-vote-count"><span className="text-accent">{pub.votedCount}</span> / {n} ont voté</span>
    ) : null;
  const title =
    pub.step === "indice" ? `Indice ${pub.tour}/${pub.tours} : un mot pour décrire le vôtre` : pub.step === "montre" ? `Les indices ${pub.tours > 1 ? `du tour ${pub.tour}` : ""}` : pub.step === "debat" ? "Débattez ! Qui n'a pas le même mot ?" : "Qui n'a pas le même mot ?";
  return (
    <div data-testid="tv-imposteur" data-step={pub.step} className="flex min-h-0 flex-1 flex-col">
      <Title sub={sub} testId="tv-imposteur-title">{title}</Title>
      <TvBoard pub={pub} round={round} players={players} />
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

/** Tableau compact : une ligne par joueur avec ses indices. */
function PhoneBoard({ pub, round, playerById, myId }: Pick<Props, "pub" | "round" | "playerById"> & { myId?: string }) {
  const list = pub.playerIds.filter((id) => round.participants.includes(id));
  return (
    <div data-testid="phone-board" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain">
      {list.map((id) => {
        const p = playerById(id);
        const slots = slotsOf(pub, id);
        return (
          <div key={id} data-testid={`phone-board-${id}`} className={`glass flex shrink-0 items-center gap-3 rounded-chip px-3 py-1.5 ${id === myId ? "border border-accent" : ""}`}>
            <PlayerAvatar profile={p?.profile ?? null} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-bold text-ink-muted">{p?.profile?.name}</span>
              <span className="text-balance text-xl [overflow-wrap:anywhere]">
                {slots.map((s, t) => (
                  <span key={t} className={s.kind === "clue" ? "font-bold" : "text-ink-muted"}>
                    {t > 0 && <span className="text-ink-muted"> · </span>}
                    {s.kind === "clue" ? s.text : s.kind === "sent" ? "✓" : s.kind === "wait" ? "…" : ""}
                  </span>
                ))}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PhoneClue({ pub, priv, sendInput, round, playerById, snapshot }: Props) {
  const sent = priv?.clue ?? null;
  const [draft, setDraft] = useState(sent ?? "");
  const [busy, setBusy] = useState(false);
  const typed = clean(draft);
  const isSent = sent !== null && typed === sent;
  const forbidden = typed !== "" && (containsOwnWord(typed, priv?.word ?? "") || priv?.rejected === typed);
  const canSend = !busy && !isSent && !forbidden && (typed !== "" || sent !== null);

  // Nouveau tour : champ vide (l'indice du tour précédent est déjà sur le tableau).
  useEffect(() => {
    setDraft(priv?.clue ?? "");
  }, [pub.tour]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!canSend) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setBusy(true);
    void sendInput({ clue: draft })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">
        {pub.tours > 1 ? `Indice ${pub.tour}/${pub.tours} : ` : ""}un mot pour décrire le tien
      </h1>
      <div className="flex shrink-0 flex-col gap-2">
        <div className="relative">
          <input
            data-testid="clue-input"
            value={draft}
            maxLength={pub.maxLength}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              submit();
            }}
            enterKeyHint="send"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Ton indice…"
            aria-label="Ton indice"
            className={`w-full rounded-btn border-[0.2rem] bg-surface-strong px-4 py-4 pr-12 text-xl font-bold text-ink outline-none transition-colors placeholder:font-normal placeholder:text-ink-muted focus:border-accent ${forbidden ? "border-bad" : isSent ? "border-good" : "border-line"}`}
          />
          {isSent && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14 }} className="pointer-events-none absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-good text-lg text-bg">
              <CheckIcon />
            </motion.span>
          )}
        </div>
        {forbidden ? (
          <p data-testid="clue-error" className="text-center text-base font-bold text-bad">Pas le droit d'écrire ton propre mot !</p>
        ) : (
          <Button data-testid="clue-send" data-sent={isSent} variant={isSent ? "good" : "primary"} size="lg" block disabled={!canSend && !isSent} onClick={submit}>
            {isSent ? <span className="inline-flex items-center gap-2">Envoyé <CheckIcon /></span> : typed === "" && sent !== null ? "Retirer" : sent !== null ? "Modifier" : "Envoyer"}
          </Button>
        )}
      </div>
      <PhoneBoard pub={pub} round={round} playerById={playerById} myId={snapshot.me?.id} />
    </div>
  );
}

function PhoneShow({ pub, round, playerById, snapshot }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-center text-2xl font-extrabold">👀 Regarde la TV !</h1>
      <PhoneBoard pub={pub} round={round} playerById={playerById} myId={snapshot.me?.id} />
    </div>
  );
}

function PhoneDebate({ pub, priv, sendInput, round, playerById, snapshot }: Props) {
  const ready = priv?.ready ?? false;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-balance text-center text-2xl font-extrabold leading-tight">Débattez ! Qui n'a pas le même mot ?</h1>
      <PhoneBoard pub={pub} round={round} playerById={playerById} myId={snapshot.me?.id} />
      <Button data-testid="ready-btn" data-ready={ready} variant={ready ? "good" : "primary"} size="lg" block onClick={() => void sendInput({ ready: !ready }).catch(() => {})} className="shrink-0">
        {ready ? <span className="inline-flex items-center gap-2">Prêt <CheckIcon /> ({pub.readyIds.length}/{pub.playerIds.length})</span> : "Prêt à voter"}
      </Button>
    </div>
  );
}

function PhoneVote({ pub, priv, sendInput, playerById, snapshot }: Props) {
  const myId = snapshot.me?.id;
  const options = pub.playerIds.filter((id) => id !== myId);
  const vote = priv?.vote ?? null;
  const dense = options.length > 4;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 text-center text-2xl font-extrabold">Qui n'a pas le même mot ?</h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto overscroll-contain px-1 pb-1 pt-1">
        {options.map((id) => {
          const selected = vote === id;
          const profile = playerById(id)?.profile ?? null;
          const clues = (pub.clues[id] ?? []).filter(Boolean).join(" · ");
          return (
            <motion.button
              key={id}
              type="button"
              data-testid={`vote-option-${id}`}
              whileTap={{ scale: 0.93 }}
              animate={{ scale: selected ? 1.03 : 1, opacity: vote !== null && !selected ? 0.5 : 1 }}
              onClick={() => void sendInput({ target: id }).catch(() => {})}
              aria-pressed={selected}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-card border-2 p-1.5 ${dense ? "min-h-[5.5rem]" : "min-h-[8rem]"} ${selected ? "border-accent bg-accent/25 shadow-glow" : "glass border-transparent"}`}
            >
              <PlayerAvatar profile={profile} size={dense ? "sm" : "lg"} />
              <span className="w-full truncate text-base font-bold leading-tight">{profile?.name}</span>
              <span className="line-clamp-2 w-full text-balance text-sm leading-tight text-ink-muted [overflow-wrap:anywhere]">{clues || "—"}</span>
              {selected && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-sm text-accent-ink">
                  <CheckIcon />
                </motion.span>
              )}
            </motion.button>
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
      {pub.step === "indice" ? <PhoneClue {...props} /> : pub.step === "montre" ? <PhoneShow {...props} /> : pub.step === "debat" ? <PhoneDebate {...props} /> : <PhoneVote {...props} />}
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

function TvResults({ results, playerById }: Props) {
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
  const crowd = results.playerIds.length > 6;
  return (
    <div data-testid="tv-imposteur-results" data-unveiled={unveiled} className="flex min-h-0 flex-1 flex-col items-center justify-between gap-4 text-center">
      <h1 className="shrink-0 text-[4rem] font-extrabold leading-tight">{unveiled ? "L'imposteur était…" : "Les votes tombent…"}</h1>
      <div className="flex flex-wrap items-start justify-center gap-x-3 gap-y-6">
        {results.playerIds.map((id) => {
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
              <span className="glass rounded-card px-8 py-3">Vous aviez : <span data-testid="tv-word-majority" className="text-accent">{results.majorityWord}</span></span>
              <span className="glass rounded-card px-8 py-3">Lui avait : <span data-testid="tv-word-imposter" className="text-accent">{results.imposterWord}</span></span>
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
