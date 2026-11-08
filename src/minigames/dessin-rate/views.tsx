// Écrans de "Dessin raté" : dessiner (téléphone tactile + mosaïque TV en direct), galerie, vote, révélation.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fireConfetti, PlayerAvatar, SelectedBadge, TrashIcon, typo, UndoIcon, VoteDots } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { Drawing, DrawingPad, PEN_BG } from "./drawing";
import type { Priv, Pub, Results, ResultCard, TvPub } from "./game";
import { PALETTE, WIDTHS, type Difficulty, type Stroke } from "./shared";

type Props = MiniGameViewProps<Pub, Priv, Results>;

/** Le téléphone envoie le dessin au plus toutes les SEND_MS (trait en cours inclus), et réessaie après RETRY_MS si l'envoi échoue (pause…). */
const SEND_MS = 180;
const RETRY_MS = 600;

const DIFFICULTY: Record<Difficulty, { label: string; className: string }> = {
  facile: { label: "Facile", className: "bg-good text-bg" },
  moyen: { label: "Moyen", className: "bg-warn text-accent-ink" },
  difficile: { label: "Difficile", className: "bg-bad text-bg" },
};

function DifficultyBadge({ difficulty, className = "" }: { difficulty: Difficulty; className?: string }) {
  const d = DIFFICULTY[difficulty];
  return (
    <span data-testid="difficulty-badge" data-difficulty={difficulty} className={`inline-block rounded-chip px-6 py-1 font-display ${d.className} ${className}`}>
      {d.label}
    </span>
  );
}

const nameOf = (props: Pick<Props, "playerById">, id: string) => props.playerById(id)?.profile?.name ?? "?";

// ───────────────────────────── TV : grille de dessins ─────────────────────────────

/** Colonnes de la mosaïque selon le nombre de dessins (1 à 8 joueurs) : jamais plus de 2 lignes. */
const columnsFor = (n: number) => (n <= 4 ? Math.max(1, n) : n <= 6 ? 3 : 4);

function TvGrid({ count, children }: { count: number; children: ReactNode }) {
  const cols = columnsFor(count);
  return (
    <div
      className="grid min-h-0 flex-1 gap-x-6 gap-y-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(1, Math.ceil(count / cols))}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

/** Une case de la mosaïque : le dessin remplit la place, une légende dessous. */
function Tile({ children, testId, className = "", ...rest }: { children: ReactNode; testId?: string; className?: string } & Record<`data-${string}`, string | number | undefined>) {
  return (
    <div data-testid={testId} {...rest} className={`flex min-h-0 min-w-0 flex-col items-center gap-1 ${className}`}>
      {children}
    </div>
  );
}

// ───────────────────────────── TV pendant le jeu ─────────────────────────────

function TvDraw({ pub, round, players }: MiniGameViewProps<TvPub>) {
  const drawers = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const live = new Map(pub.live.map((l) => [l.playerId, l.strokes]));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-center gap-6">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold">
          Dessinez votre mot secret !
        </motion.h1>
        <DifficultyBadge difficulty={pub.difficulty} className="text-4xl" />
      </div>
      <TvGrid count={drawers.length}>
        {drawers.map((p) => {
          const strokes = live.get(p.id) ?? [];
          return (
            <Tile key={p.id} testId={`tv-live-${p.id}`} data-strokes={strokes.length}>
              <div className="min-h-0 w-full flex-1">
                <Drawing strokes={strokes} />
              </div>
              <div className="flex max-w-full shrink-0 items-center gap-2">
                <PlayerAvatar profile={p.profile} size="xs" />
                <span className="truncate text-2xl font-bold">{p.profile!.name}</span>
              </div>
            </Tile>
          );
        })}
      </TvGrid>
    </div>
  );
}

function TvGallery({ pub, playerById }: MiniGameViewProps<Pub>) {
  const cur = pub.current;
  if (!cur) return null;
  const author = playerById(cur.playerId);
  const size = cur.word.length <= 22 ? "text-7xl" : cur.word.length <= 40 ? "text-6xl" : "text-5xl";
  return (
    <div className="flex min-h-0 flex-1 items-center gap-10">
      <div className="h-full min-h-0 flex-1 py-2">
        <AnimatePresence mode="wait">
          <motion.div key={cur.playerId} initial={{ opacity: 0, scale: 0.7, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 14 }} className="size-full">
            <Drawing strokes={cur.strokes} testId="tv-gallery-drawing" />
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.div key={`${cur.playerId}-txt`} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, type: "spring" }} className="flex w-[44rem] shrink-0 flex-col items-center gap-8 text-center">
        <span data-testid="tv-gallery-index" className="rounded-chip bg-surface-strong px-6 py-1 font-display text-4xl text-accent">
          {pub.index + 1} / {pub.total}
        </span>
        <p className="text-3xl font-semibold text-ink-muted">Le mot secret était</p>
        <h1 data-testid="tv-gallery-word" className={`text-balance break-words font-extrabold leading-[1.05] text-gold-gradient ${size}`}>
          {typo(cur.word)}
        </h1>
        <div className="flex items-center gap-5">
          <PlayerAvatar profile={author?.profile ?? null} size="lg" />
          <span data-testid="tv-gallery-author" className="max-w-[24rem] truncate text-5xl font-extrabold">
            {author?.profile?.name}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function TvVote({ pub }: MiniGameViewProps<Pub>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-center text-5xl font-extrabold">Votez pour le mieux dessiné !</h1>
      <TvGrid count={pub.cards.length}>
        {pub.cards.map((c, i) => (
          <Tile key={c.playerId} testId={`tv-vote-card-${c.playerId}`}>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: "spring" }} className="min-h-0 w-full flex-1">
              <Drawing strokes={c.strokes} blankLabel="Page blanche" />
            </motion.div>
            <span className="line-clamp-2 max-w-full shrink-0 text-balance text-center text-3xl font-bold leading-tight">{typo(c.word)}</span>
          </Tile>
        ))}
      </TvGrid>
      <VoteDots done={pub.votedCount} total={pub.voterCount} />
    </div>
  );
}

const Tv = (props: MiniGameViewProps<TvPub>) => (
  <div data-testid="tv-dessin" data-stage={props.pub.step} className="flex min-h-0 flex-1 flex-col">
    {props.pub.step === "draw" ? <TvDraw {...props} /> : props.pub.step === "gallery" ? <TvGallery {...props} /> : <TvVote {...props} />}
  </div>
);

// ───────────────────────────── Téléphone ─────────────────────────────

/** Bouton rond de la barre d'outils : tient 9 sur une ligne dans 360 px. */
const TOOL = "flex aspect-square min-w-0 max-w-12 flex-1 items-center justify-center rounded-full border-2 transition-transform";

function PhoneDraw({ priv, snapshot, sendInput }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>(() => priv?.strokes ?? []); // un téléphone rechargé retrouve son dessin
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(1);
  const send = useRef(sendInput);
  send.current = sendInput;
  const latest = useRef(strokes);
  const dirty = useRef(false);
  const lastSent = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useRef(() => {});
  flush.current = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    lastSent.current = Date.now();
    send.current({ strokes: latest.current }).catch(() => {
      dirty.current = true; // pause, réseau : on réessaie, le dessin complet remplace le précédent
      timer.current = setTimeout(() => flush.current(), RETRY_MS);
    });
  };
  useEffect(
    () => () => {
      flush.current(); // dernier envoi si on quitte l'étape avec un trait pas encore parti
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const change = (next: Stroke[], final: boolean) => {
    latest.current = next;
    dirty.current = true;
    setStrokes(next);
    if (final) flush.current();
    else if (!timer.current) timer.current = setTimeout(() => flush.current(), Math.max(0, SEND_MS - (Date.now() - lastSent.current)));
  };

  const word = priv?.word ?? "";
  return (
    <div data-testid="phone-dessin" data-stage="draw" className="flex min-h-0 flex-1 flex-col gap-2 pb-2">
      <div className="glass flex min-h-[3.5rem] shrink-0 items-center justify-center rounded-card px-4 py-1.5">
        <h1 data-testid="draw-word" className={`line-clamp-2 text-balance text-center font-extrabold leading-tight ${word.length > 28 ? "text-xl" : "text-2xl"}`}>
          {word}
        </h1>
      </div>
      <div className="order-2 min-h-0 flex-1">
        <DrawingPad strokes={strokes} color={color} width={width} disabled={snapshot.paused} onChange={change} />
      </div>
      <div data-testid="draw-tools" className="order-1 -mx-3 flex shrink-0 items-center justify-center gap-1">
        {Array.from({ length: PALETTE }, (_, i) => (
          <button
            key={i}
            type="button"
            data-testid={`draw-color-${i}`}
            aria-label={`Couleur ${i + 1}`}
            aria-pressed={color === i}
            onClick={() => setColor(i)}
            className={`${TOOL} ${PEN_BG[i]} ${color === i ? "scale-110 border-accent shadow-glow" : "border-ink/40"}`}
          />
        ))}
        {WIDTHS.map((w, i) => (
          <button
            key={w}
            type="button"
            data-testid={`draw-width-${i}`}
            aria-label={i === 0 ? "Trait fin" : "Trait épais"}
            aria-pressed={width === i}
            onClick={() => setWidth(i)}
            className={`${TOOL} bg-surface-strong ${width === i ? "border-accent" : "border-transparent"}`}
          >
            <span className={`rounded-full bg-ink ${i === 0 ? "h-1.5 w-1.5" : "h-3.5 w-3.5"}`} />
          </button>
        ))}
        <button type="button" data-testid="draw-undo" aria-label="Annuler le dernier trait" disabled={strokes.length === 0} onClick={() => change(strokes.slice(0, -1), true)} className={`${TOOL} border-transparent bg-surface-strong text-xl disabled:opacity-35`}>
          <UndoIcon />
        </button>
        <button type="button" data-testid="draw-clear" aria-label="Tout effacer" disabled={strokes.length === 0} onClick={() => change([], true)} className={`${TOOL} border-transparent bg-surface-strong text-xl disabled:opacity-35`}>
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function PhoneGallery({ priv }: Props) {
  return (
    <div data-testid="phone-dessin" data-stage="gallery" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <span className="text-6xl" aria-hidden>
        📺
      </span>
      <h1 className="font-display text-4xl text-gold-gradient">Regarde la TV !</h1>
      {priv?.word && <p className="text-lg text-ink-muted">Ton mot : {priv.word}</p>}
    </div>
  );
}

function PhoneVote({ pub, priv, sendInput, snapshot }: Props) {
  const myId = snapshot.me?.id;
  const options = pub.cards.filter((c) => c.playerId !== myId);
  const vote = priv?.vote ?? null;
  const cols = options.length <= 4 ? 2 : 3;
  return (
    <div data-testid="phone-dessin" data-stage="vote" className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 text-center text-xl font-extrabold leading-tight">Le mieux dessiné ?</h1>
      <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain px-1 pb-2 pt-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((c) => {
          const blank = c.strokes.length === 0;
          const selected = vote === c.playerId;
          return (
            <motion.button
              key={c.playerId}
              type="button"
              data-testid={`vote-card-${c.playerId}`}
              data-blank={blank}
              disabled={blank}
              aria-pressed={selected}
              whileTap={blank ? undefined : { scale: 0.94 }}
              animate={{ scale: selected ? 1.03 : 1, opacity: blank ? 0.55 : vote !== null && !selected ? 0.55 : 1 }}
              onClick={() => void sendInput({ target: c.playerId }).catch(() => {})}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-card border-2 p-1.5 ${selected ? "border-accent bg-accent/25 shadow-glow" : "glass border-transparent"}`}
            >
              <div className="aspect-square w-full">
                <Drawing strokes={c.strokes} blankLabel="Page blanche" />
              </div>
              <span className="line-clamp-2 w-full text-balance text-center text-xs font-bold leading-tight">{c.word}</span>
              {selected && (
                <SelectedBadge tone="accent" size="sm" className="absolute right-1 top-1" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

const Phone = (props: Props) => (props.pub.step === "draw" ? <PhoneDraw {...props} /> : props.pub.step === "gallery" ? <PhoneGallery {...props} /> : <PhoneVote {...props} />);

// ───────────────────────────── TV résultats : du moins voté au plus voté ─────────────────────────────

// Rythme de la révélation (ms) : la durée annoncée (`revealSeconds`) se calcule avec ces mêmes constantes.
const FIRST_MS = 1500; // avant le premier dessin
const STEP_MS = 1900; // entre deux dessins
const WINNER_MS = 3000; // suspense avant le(s) gagnant(s)
const SETTLE_MS = 1500; // couronne, confettis, compteur de votes

/** Découpe les dessins : les perdants du moins voté au plus voté, puis le(s) gagnant(s). */
function split(results: Results) {
  const winners = results.cards.filter((c) => results.winners.includes(c.playerId));
  const losers = results.cards.filter((c) => !results.winners.includes(c.playerId)).sort((a, b) => a.votes - b.votes);
  return { winners, losers };
}
/** Y a-t-il une révélation animée ? (sinon : vote impossible ou aucun vote, simple récapitulatif) */
const animated = (results: Results) => results.voted && results.winners.length > 0;

/** Pause (ms) avant l'étape k (0 = premier perdant ou, s'il n'y en a pas, le gagnant). */
function pauseBefore(k: number, steps: number): number {
  if (k === 0) return FIRST_MS;
  return k === steps - 1 ? WINNER_MS : STEP_MS;
}

/** Durée totale (s) de la révélation : les pauses avant chaque dessin, plus le temps de savourer le gagnant. */
export function revealSeconds(results: Results): number {
  if (!animated(results)) return 0;
  const steps = split(results).losers.length + 1;
  let ms = SETTLE_MS;
  for (let k = 0; k < steps; k++) ms += pauseBefore(k, steps);
  return ms / 1000;
}

const votesLabel = (n: number) => `${n} vote${n > 1 ? "s" : ""}`;

function ResultCaption({ card, props, big, crown, noVotes }: { card: ResultCard; props: Props; big?: boolean; crown?: boolean; noVotes?: boolean }) {
  const author = props.playerById(card.playerId);
  return (
    <div className={`flex max-w-full shrink-0 flex-col items-center ${big ? "gap-2" : "gap-1"}`}>
      <span className={`line-clamp-2 text-balance text-center font-extrabold leading-tight ${big ? "text-5xl text-gold-gradient" : "text-2xl"}`}>{typo(card.word)}</span>
      {/* Pseudo puis badge de votes sur deux lignes : le badge « rebondit » à l'arrivée, il ne doit jamais toucher le pseudo. */}
      <div className={`flex max-w-full flex-col items-center ${big ? "gap-4" : "gap-1"}`}>
        <div className="flex max-w-full items-center gap-3">
          <PlayerAvatar profile={author?.profile ?? null} size={big ? "md" : "xs"} />
          <span className={`min-w-0 truncate font-bold ${big ? "text-4xl" : "text-xl"}`}>{author?.profile?.name}</span>
        </div>
        {!noVotes && <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: big ? 0.6 : 0.3, type: "spring", stiffness: 260, damping: 12 }}
          className={`shrink-0 rounded-chip font-display text-accent-ink ${crown ? "bg-gold shadow-glow" : "bg-surface-strong text-ink"} ${big ? "px-5 py-1 text-4xl" : "px-3 text-xl"}`}
        >
          {votesLabel(card.votes)}
        </motion.span>}
      </div>
    </div>
  );
}

function TvResults(props: Props) {
  const { results } = props;
  const parts = useMemo(() => (results ? split(results) : { winners: [], losers: [] }), [results]);
  const steps = parts.losers.length + 1;
  const [k, setK] = useState(0); // nombre d'étapes révélées
  const run = !!results && animated(results);

  useEffect(() => {
    if (!run || k >= steps) return;
    const t = setTimeout(() => setK((v) => v + 1), pauseBefore(k, steps));
    return () => clearTimeout(t);
  }, [run, k, steps]);

  const done = k >= steps;
  useEffect(() => {
    if (!run || !done) return;
    const t = setTimeout(() => fireConfetti("big"), 500);
    return () => clearTimeout(t);
  }, [run, done]);

  if (!results) return null;

  // Pas de vote (ou un seul dessin) : simple récapitulatif.
  if (!run) {
    return (
      <div data-testid="dessin-results" data-revealed="0" className="flex min-h-0 flex-1 flex-col gap-3">
        <h1 className="shrink-0 text-center text-5xl font-extrabold">{results.cards.length === 0 ? "Personne n'a dessiné…" : "Les œuvres de la soirée"}</h1>
        <TvGrid count={results.cards.length}>
          {results.cards.map((c) => (
            <Tile key={c.playerId}>
              <div className="min-h-0 w-full flex-1">
                <Drawing strokes={c.strokes} />
              </div>
              <ResultCaption card={c} props={props} noVotes />
            </Tile>
          ))}
        </TvGrid>
      </div>
    );
  }

  // Dessin(s) en grand : le dernier révélé ; les précédents rejoignent la colonne de droite.
  const big: ResultCard[] = done ? parts.winners : k >= 1 ? [parts.losers[k - 1]!] : [];
  const strip = done ? parts.losers : parts.losers.slice(0, Math.max(0, k - 1));
  const bigCols = Math.min(3, Math.ceil(Math.sqrt(Math.max(1, big.length))));
  return (
    <div data-testid="dessin-results" data-revealed={k} data-total={steps} data-done={done} className="flex min-h-0 flex-1 flex-col gap-2">
      <h1 className="shrink-0 pb-4 text-center text-4xl font-extrabold">
        {done ? (parts.winners.length > 1 ? "Les mieux dessinés !" : "Le mieux dessiné !") : "Du moins voté au plus voté…"}
      </h1>
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="min-h-0 min-w-0 flex-1 px-4 pb-2 pt-8">
          <div className="grid size-full gap-6" style={{ gridTemplateColumns: `repeat(${bigCols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.max(1, Math.ceil(big.length / bigCols))}, minmax(0, 1fr))` }}>
            {big.length === 0 && (
              <div className="col-span-full flex items-center justify-center">
                <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="font-display text-[12rem] leading-none text-gold-gradient">
                  ?
                </motion.span>
              </div>
            )}
            <AnimatePresence mode="wait">
              {big.map((c) => (
                <motion.div
                  key={c.playerId}
                  data-testid={`dessin-big-${c.playerId}`}
                  initial={{ opacity: 0, scale: 0.4, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.25 } }}
                  transition={{ type: "spring", stiffness: 150, damping: 13 }}
                  className="relative flex min-h-0 min-w-0 flex-col items-center gap-2"
                >
                  <div className="relative min-h-0 w-full flex-1">
                    <Drawing strokes={c.strokes} className={done ? "ring-[0.5rem] ring-accent" : ""} />
                    {done && (
                      <motion.span initial={{ scale: 0, y: 30, rotate: -30 }} animate={{ scale: 1, y: 0, rotate: -14 }} transition={{ delay: 0.3, type: "spring" }} className="absolute -left-4 -top-6 text-[7rem] leading-none drop-shadow-lg" aria-hidden>
                        👑
                      </motion.span>
                    )}
                  </div>
                  <ResultCaption card={c} props={props} big crown={done} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        {strip.length > 0 && (
          <div data-testid="dessin-strip" className="grid w-[40%] shrink-0 grid-cols-2 content-start gap-x-4 gap-y-2" style={{ gridTemplateRows: "repeat(4, minmax(0, 1fr))" }}>
            {strip.map((c) => (
              <motion.div key={c.playerId} data-testid={`dessin-small-${c.playerId}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-0 min-w-0 flex-col items-center gap-1">
                <div className="min-h-0 w-full flex-1">
                  <Drawing strokes={c.strokes} />
                </div>
                <ResultCaption card={c} props={props} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Téléphone résultats ─────────────────────────────

function PhoneResults({ results, snapshot }: Props) {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.cards.find((c) => c.playerId === myId);
  const won = results.winners.includes(myId);
  return (
    <div data-testid="dessin-phone-results" className="flex flex-col items-center gap-2 text-center">
      {mine ? (
        <>
          <div className="h-32 w-32">
            <Drawing strokes={mine.strokes} />
          </div>
          <p className="text-balance text-lg font-bold">{mine.word}</p>
          {results.voted && (
            <p data-testid="my-votes" className={`font-display text-2xl ${won ? "text-accent" : "text-ink"}`}>
              {won ? "👑 " : ""}
              {votesLabel(mine.votes)}
            </p>
          )}
        </>
      ) : (
        <p className="text-xl text-ink-muted">Page blanche… tu n'as rien dessiné</p>
      )}
    </div>
  );
}

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results) : 0) } satisfies MiniGameViews;
