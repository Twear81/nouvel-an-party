// Écrans de « Pierre-feuille-ciseaux : le tournoi ».
// TV : l'arbre (gauche → droite), les duels en cours qui brillent, puis l'arène où les mains s'affrontent.
// Téléphone : l'adversaire + trois gros boutons ; une fois éliminé, on suit l'arbre.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CheckIcon, CloseIcon, fireConfetti, PlayerAvatar, SkipIcon, type AvatarSize } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { roundLabel, type Choice } from "./bracket";
import type { MatchView, Priv, Pub, Results } from "./game";

type ById = MiniGameViewProps["playerById"];

// Classes écrites en toutes lettres pour que Tailwind les repère.
const HANDS = [
  { emoji: "✊", label: "Pierre", solid: "bg-cool text-bg" },
  { emoji: "✋", label: "Feuille", solid: "bg-good text-bg" },
  { emoji: "✌️", label: "Ciseaux", solid: "bg-hot text-bg" },
] as const;

/** Délai (ms) entre le début de la révélation et l'apparition des mains (le temps du « pierre… feuille… ciseaux ! »). */
const REVEAL_AT = 1300;
/** Puis l'issue du lancer. */
const OUTCOME_AT = 1900;

function useAfter(ms: number, key: unknown) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const t = setTimeout(() => setOn(true), ms);
    return () => clearTimeout(t);
  }, [ms, key]);
  return on;
}

/** Nom du tour où l'on a été battu (« en demi-finale »). */
function stageName(roundCount: number, round: number) {
  const left = roundCount - round;
  if (left === 1) return "en finale";
  if (left === 2) return "en demi-finale";
  if (left === 3) return "en quart de finale";
  if (left === 4) return "en huitième de finale";
  return `au tour ${round + 1}`;
}

// ───────────── Main (✊ ✋ ✌️) ─────────────

/**
 * Une main dans un cercle. `pick` : « ? » puis ✓ quand le joueur a choisi.
 * `reveal` : le poing tremble (« pierre… feuille… ciseaux ! »), puis le vrai choix éclate.
 */
function Hand({ mode, choice, picked, em, side, outcome }: { mode: "pick" | "reveal"; choice?: Choice | null; picked?: boolean; em: number; side: 0 | 1; outcome?: "win" | "lose" | "tie" | null }) {
  const shown = useAfter(REVEAL_AT, null);
  const box: CSSProperties = { width: `${em * 1.5}rem`, height: `${em * 1.5}rem`, fontSize: `${em}rem` };
  const ring = outcome === "win" ? "border-accent bg-accent/25 shadow-glow" : outcome === "tie" ? "border-warn bg-warn/15" : "border-line bg-surface-strong";

  if (mode === "pick") {
    return (
      <div style={box} className={`flex items-center justify-center rounded-full border-[0.08em] ${picked ? "border-accent bg-accent/20" : "border-line bg-surface"}`}>
        {picked ? (
          <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14 }} className="text-[0.7em] text-accent">
            <CheckIcon />
          </motion.span>
        ) : (
          <span className="animate-pulse-soft font-display text-[0.6em] text-ink-muted">?</span>
        )}
      </div>
    );
  }

  const tilt = side === 0 ? -1 : 1;
  return (
    <motion.div style={box} animate={{ opacity: outcome === "lose" ? 0.45 : 1, scale: outcome === "win" ? 1.08 : outcome === "lose" ? 0.9 : 1 }} className={`relative flex items-center justify-center rounded-full border-[0.08em] transition-colors duration-300 ${ring}`}>
      {!shown ? (
        <motion.span
          key="shake"
          className="leading-none"
          animate={{ y: ["0em", "-0.25em", "0em", "-0.25em", "0em", "-0.25em", "0em"], rotate: [0, 12 * tilt, 0, 12 * tilt, 0, 12 * tilt, 0] }}
          transition={{ duration: REVEAL_AT / 1000, ease: "easeInOut" }}
        >
          ✊
        </motion.span>
      ) : (
        <motion.span key="shown" className="leading-none" initial={{ scale: 0.2, rotate: -20 * tilt }} animate={{ scale: [0.2, 1.3, 1], rotate: 0 }} transition={{ duration: 0.45 }}>
          {choice == null ? "💤" : HANDS[choice].emoji}
        </motion.span>
      )}
      {shown && (
        <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-[0.06em] border-accent" initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.6 }} />
      )}
    </motion.div>
  );
}

/** Pastilles des manches gagnées (duels en plusieurs manches). */
function Pips({ won, needed, size = "md" }: { won: number; needed: number; size?: "sm" | "md" | "lg" }) {
  if (needed <= 1) return null;
  const dim = { sm: "h-2 w-2", md: "h-4 w-4", lg: "h-6 w-6" }[size];
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: needed }, (_, i) => (
        <span key={i} className={`${dim} rounded-full border-2 ${i < won ? "border-accent bg-accent" : "border-line bg-transparent"}`} />
      ))}
    </div>
  );
}

// ───────────── Arbre ─────────────

type Density = "tv" | "tvSmall" | "phone";

function avatarFor(roundCount: number, density: Density): AvatarSize {
  const size = 2 ** roundCount;
  if (density === "phone") return size <= 4 ? "sm" : "xs";
  if (density === "tvSmall") return size <= 4 ? "md" : size <= 8 ? "sm" : "xs";
  return size <= 4 ? "lg" : size <= 8 ? "sm" : "xs";
}

interface BracketProps {
  bracket: MatchView[][];
  champion: string | null;
  winsNeeded: number;
  playerById: ById;
  density: Density;
  /** Tour en cours (mis en avant dans les intitulés). */
  current?: number;
  /** Mise en place animée de l'arbre (tirage au sort). */
  intro?: boolean;
  /** Colonne dont les joueurs viennent d'arriver (animation « ils avancent »). */
  popColumn?: number | null;
  meId?: string | null;
  testId?: string;
}

function Bracket({ bracket, champion, winsNeeded, playerById, density, current, intro, popColumn = null, meId, testId }: BracketProps) {
  const roundCount = bracket.length;
  const avatar = avatarFor(roundCount, density);
  const tv = density !== "phone";
  const vars = { "--g": tv ? "2.5rem" : "0.7rem", "--lw": tv ? "0.25rem" : "2px" } as CSSProperties;
  return (
    <div data-testid={testId} className="flex min-h-0 flex-1 flex-col gap-2" style={vars}>
      {tv && (
        <div className="flex shrink-0">
          {bracket.map((_, r) => (
            <div key={r} className={`min-w-0 flex-1 truncate pr-[var(--g)] text-center font-display text-2xl ${r === current ? "text-accent" : "text-ink-muted"}`}>
              {roundLabel(roundCount, r)}
            </div>
          ))}
          <div className="flex-[0.7] text-center text-3xl">🏆</div>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {bracket.map((round, r) => (
          <div key={r} className="flex min-w-0 flex-1 flex-col">
            {round.map((m, i) => (
              <div key={i} className={`relative flex min-h-0 flex-1 items-center pr-[var(--g)] ${tv ? "py-2" : "py-1"}`}>
                <MatchCard m={m} r={r} i={i} avatar={avatar} tv={tv} winsNeeded={winsNeeded} playerById={playerById} intro={intro} pop={popColumn === r} meId={meId} />
                <Connector even={i % 2 === 0} last={r === roundCount - 1} lit={m.winner !== null} />
              </div>
            ))}
          </div>
        ))}
        <div className="flex min-w-0 flex-[0.7] flex-col items-center justify-center">
          <ChampionSlot id={champion} playerById={playerById} tv={tv} avatar={avatar} pop={popColumn === roundCount} meId={meId} />
        </div>
      </div>
    </div>
  );
}

function Connector({ even, last, lit }: { even: boolean; last: boolean; lit: boolean }) {
  const color = lit ? "z-10 bg-accent" : "bg-line";
  return (
    <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-[var(--g)]">
      <div className={`absolute left-0 top-1/2 h-[var(--lw)] -translate-y-1/2 ${last ? "w-full" : "w-1/2"} ${color}`} />
      {!last && (
        <>
          <div className={`absolute left-1/2 w-[var(--lw)] -translate-x-1/2 ${even ? "top-1/2 h-1/2" : "top-0 h-1/2"} ${color}`} />
          <div className={`absolute left-1/2 h-[var(--lw)] w-1/2 ${even ? "bottom-0 translate-y-1/2" : "top-0 -translate-y-1/2"} ${color}`} />
        </>
      )}
    </div>
  );
}

function MatchCard({ m, r, i, avatar, tv, winsNeeded, playerById, intro, pop, meId }: { m: MatchView; r: number; i: number; avatar: AvatarSize; tv: boolean; winsNeeded: number; playerById: ById; intro?: boolean; pop: boolean; meId?: string | null }) {
  return (
    <motion.div
      data-testid={`pfc-match-${r}-${i}`}
      data-active={m.active ? "true" : "false"}
      initial={intro ? { opacity: 0, scale: 0.5, y: 40, rotate: i % 2 ? 6 : -6 } : false}
      animate={m.active ? { opacity: 1, scale: [1, 1.03, 1], y: 0, rotate: 0 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={m.active ? { scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } } : { delay: intro ? 0.3 + r * 0.35 + i * 0.12 : 0, type: "spring", stiffness: 160, damping: 15 }}
      className={`relative flex w-full min-w-0 flex-col rounded-card border-[length:var(--lw)] ${tv ? "gap-1 p-1" : "gap-0.5 p-[3px]"} ${m.active ? "border-accent bg-accent/10 shadow-glow" : "border-line bg-surface"}`}
    >
      <SlotRow id={m.a} m={m} side={0} avatar={avatar} tv={tv} winsNeeded={winsNeeded} playerById={playerById} pop={pop} delay={i * 0.15} meId={meId} />
      {m.bye ? <ByeRow avatar={avatar} tv={tv} /> : <SlotRow id={m.b} m={m} side={1} avatar={avatar} tv={tv} winsNeeded={winsNeeded} playerById={playerById} pop={pop} delay={i * 0.15 + 0.08} meId={meId} />}
    </motion.div>
  );
}

function SlotRow({ id, m, side, avatar, tv, winsNeeded, playerById, pop, delay, meId }: { id: string | null; m: MatchView; side: 0 | 1; avatar: AvatarSize; tv: boolean; winsNeeded: number; playerById: ById; pop: boolean; delay: number; meId?: string | null }) {
  const p = id ? playerById(id) : undefined;
  const won = id !== null && m.winner === id && !m.bye;
  const lost = id !== null && m.winner !== null && m.winner !== id;
  const isMe = !!meId && id === meId;
  const badge = m.active ? m.picked[side] ? <CheckIcon /> : <span className="animate-pulse-soft">…</span> : undefined;
  const tone = won ? "bg-accent/20" : isMe ? "bg-hot/25" : "";
  return (
    <motion.div
      initial={pop && id ? { scale: 0.2, opacity: 0, x: "-30%" } : false}
      animate={{ scale: 1, opacity: lost ? 0.4 : 1, x: "0%" }}
      transition={{ delay: pop ? 0.35 + delay : 0, type: "spring", stiffness: 220, damping: 14 }}
      className={`flex min-w-0 items-center rounded-btn ${tv ? "gap-3 px-2 py-0.5" : "justify-center p-[2px]"} ${tone} ${isMe && !tv ? "ring-2 ring-hot" : ""}`}
    >
      <PlayerAvatar profile={p?.profile ?? null} size={avatar} dimmed={lost} badge={badge} className={won ? "drop-shadow-[0_0_0.6rem_var(--color-accent)]" : ""} />
      {tv && (
        <>
          <span className={`min-w-0 flex-1 truncate font-bold ${avatar === "xs" ? "text-xl" : "text-3xl"} ${won ? "text-accent" : id ? "text-ink" : "text-ink-muted"}`}>{p?.profile?.name ?? "…"}</span>
          {id && <Pips won={m.wins[side]} needed={winsNeeded} size="sm" />}
          {won && m.byChance && <span className="text-2xl">🎲</span>}
        </>
      )}
    </motion.div>
  );
}

function ByeRow({ avatar, tv }: { avatar: AvatarSize; tv: boolean }) {
  const h = { xs: 2, sm: 3.25, md: 5, lg: 8, xl: 11, "2xl": 15 }[avatar];
  return (
    <div data-testid="pfc-bye" style={{ minHeight: `${h}rem` }} className={`flex items-center justify-center gap-2 rounded-btn border-2 border-dashed border-line text-ink-muted ${tv ? "text-2xl font-bold" : "text-sm"}`}>
      <SkipIcon />
      {tv && "Qualifié d'office"}
    </div>
  );
}

function ChampionSlot({ id, playerById, tv, avatar, pop, meId }: { id: string | null; playerById: ById; tv: boolean; avatar: AvatarSize; pop: boolean; meId?: string | null }) {
  const p = id ? playerById(id) : undefined;
  const big: AvatarSize = tv ? (avatar === "xs" ? "md" : "lg") : "sm";
  if (!id) {
    return (
      <div className={`flex items-center justify-center rounded-full border-[length:var(--lw)] border-dashed border-line text-ink-muted ${tv ? "h-[8rem] w-[8rem] text-6xl" : "h-12 w-12 text-2xl"}`}>
        <span className="opacity-50">🏆</span>
      </div>
    );
  }
  return (
    <motion.div data-testid="pfc-champion-slot" initial={pop ? { scale: 0, rotate: -30 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ delay: pop ? 0.5 : 0, type: "spring", stiffness: 180, damping: 11 }} className="flex min-w-0 max-w-full flex-col items-center gap-1">
      <span className={tv ? "text-6xl" : "text-2xl"}>👑</span>
      <PlayerAvatar profile={p?.profile ?? null} size={big} className={`drop-shadow-[0_0_1.2rem_var(--color-accent)] ${meId === id ? "ring-2 ring-hot rounded-full" : ""}`} />
      {tv && <span className="max-w-full truncate font-display text-3xl text-gold-gradient">{p?.profile?.name}</span>}
    </motion.div>
  );
}

// ───────────── Arène (duels face à face) ─────────────

const TILE = {
  xl: { avatar: "xl" as AvatarSize, hand: 8, name: "text-5xl", vs: "h-24 w-24 text-4xl" },
  lg: { avatar: "lg" as AvatarSize, hand: 5.5, name: "text-3xl", vs: "h-20 w-20 text-3xl" },
  md: { avatar: "md" as AvatarSize, hand: 3.6, name: "text-2xl", vs: "h-14 w-14 text-2xl" },
  sm: { avatar: "sm" as AvatarSize, hand: 2.6, name: "text-xl", vs: "h-11 w-11 text-xl" },
};
type TileSize = keyof typeof TILE;

function sideOutcome(m: MatchView, side: 0 | 1): "win" | "lose" | "tie" | null {
  if (!m.last) return null;
  if (m.last.result === "tie") return m.byChance ? (m.winner === (side === 0 ? m.a : m.b) ? "win" : "lose") : "tie";
  return (m.last.result === "a") === (side === 0) ? "win" : "lose";
}

function DuelTile({ m, index, size, mode, winsNeeded, playerById, final }: { m: MatchView; index: number; size: TileSize; mode: "pick" | "reveal"; winsNeeded: number; playerById: ById; final: boolean }) {
  const t = TILE[size];
  const showOutcome = useAfter(OUTCOME_AT, null);
  const tie = m.last?.result === "tie" && !m.byChance;
  // Pendant l'animation, on montre le score d'avant ce lancer.
  const before: [number, number] = [...m.wins];
  if (m.last && !showOutcome && m.last.result !== "tie") before[m.last.result === "a" ? 0 : 1]--;

  const side = (s: 0 | 1) => {
    const id = s === 0 ? m.a : m.b;
    const p = id ? playerById(id) : undefined;
    const outcome = mode === "reveal" && showOutcome ? sideOutcome(m, s) : null;
    const choice = m.last ? (s === 0 ? m.last.a : m.last.b) : null;
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
        <PlayerAvatar profile={p?.profile ?? null} size={t.avatar} dimmed={outcome === "lose"} className={outcome === "win" ? "drop-shadow-[0_0_1.5rem_var(--color-accent)]" : ""} />
        <span className={`w-full truncate text-center font-extrabold leading-tight ${t.name} ${outcome === "win" ? "text-accent" : ""}`}>{p?.profile?.name}</span>
        <Pips won={before[s]} needed={winsNeeded} size={size === "xl" ? "lg" : "md"} />
        <Hand mode={mode} choice={choice} picked={m.picked[s]} em={t.hand} side={s} outcome={outcome} />
      </div>
    );
  };

  return (
    <motion.div
      data-testid={`pfc-duel-${index}`}
      data-outcome={showOutcome && m.last ? m.last.result : ""}
      initial={{ opacity: 0, scale: 0.7, y: 30 }}
      animate={tie && showOutcome ? { opacity: 1, scale: 1, y: 0, x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: mode === "pick" ? index * 0.08 : 0, type: "spring", stiffness: 170, damping: 15 }}
      className={`relative flex min-w-0 items-center gap-3 rounded-card border-[0.25rem] p-4 ${final ? "border-accent bg-accent/10 shadow-glow" : "border-line bg-surface"}`}
    >
      {side(0)}
      <div className="flex shrink-0 flex-col items-center gap-3">
        <motion.div
          key={showOutcome ? "after" : "before"}
          initial={showOutcome ? { scale: 1.8, rotate: -25 } : false}
          animate={{ scale: 1, rotate: 0 }}
          className={`flex items-center justify-center rounded-full border-[0.3rem] border-bg font-display shadow-glow ${t.vs} ${tie && showOutcome ? "bg-warn text-accent-ink" : "bg-gold text-accent-ink"}`}
        >
          {tie && showOutcome ? "=" : "VS"}
        </motion.div>
        {showOutcome && m.last && (tie || m.byChance || m.last.random) && (
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`whitespace-nowrap rounded-chip px-3 py-0.5 font-bold ${size === "sm" ? "text-base" : "text-2xl"} ${tie ? "bg-warn/20 text-warn" : "bg-surface-strong text-ink"}`}>
            {m.byChance || m.last.random ? "🎲 Au sort" : tie ? "Égalité !" : ""}
          </motion.span>
        )}
      </div>
      {side(1)}
    </motion.div>
  );
}

function Arena({ pub, playerById, mode }: { pub: Pub; playerById: ById; mode: "pick" | "reveal" }) {
  const round = pub.bracket[pub.round] ?? [];
  const duels = round.map((m, i) => ({ m, i })).filter(({ m }) => (mode === "reveal" ? m.last !== null : m.active));
  const final = pub.round === pub.roundCount - 1;
  const n = duels.length;
  const size: TileSize = n <= 2 ? "xl" : n <= 4 ? "lg" : "md";
  const grid = n <= 1 ? "grid-cols-1 w-[70rem]" : n <= 4 ? "grid-cols-2 w-full" : "grid-cols-4 w-full";
  return (
    <div data-testid={mode === "reveal" ? "pfc-arena" : "pfc-final-pick"} className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      {final && <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent)]" />}
      <div className={`relative grid max-w-full gap-6 ${grid}`}>
        {duels.map(({ m, i }) => (
          <DuelTile key={`${i}-${pub.throwNo}-${mode}`} m={m} index={i} size={size} mode={mode} winsNeeded={pub.winsNeeded} playerById={playerById} final={final} />
        ))}
      </div>
    </div>
  );
}

// ───────────── TV ─────────────

function StageTitle({ pub }: { pub: Pub }) {
  const final = pub.round === pub.roundCount - 1;
  let title: string;
  if (pub.step === "draw") title = "Tirage au sort";
  else if (pub.step === "done") title = "Champion !";
  else title = roundLabel(pub.roundCount, pub.round);
  const replay = pub.throwNo > 0 && (pub.step === "pick" || pub.step === "reveal");
  return (
    <div className="flex shrink-0 items-center justify-center gap-5">
      <motion.h1 key={title} initial={{ opacity: 0, y: -20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} data-testid="pfc-stage" className={`font-display leading-none ${final || pub.step === "done" ? "text-7xl text-gold-gradient" : "text-5xl text-ink"}`}>
        {title}
      </motion.h1>
      {replay && (
        <motion.span key={`r${pub.throwNo}`} initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -4 }} className="rounded-chip bg-warn px-5 py-1 font-display text-3xl text-accent-ink">
          {pub.winsNeeded > 1 ? `Lancer ${pub.throwNo + 1}` : "On rejoue !"}
        </motion.span>
      )}
      <span className="rounded-chip bg-surface-strong px-4 py-1 text-2xl font-bold text-ink-muted">{pub.variant}</span>
    </div>
  );
}

const Tv = ({ pub, playerById }: MiniGameViewProps<Pub>) => {
  useEffect(() => {
    if (pub.step === "done" && pub.champion) fireConfetti("big");
  }, [pub.step, pub.champion]);
  if (pub.roundCount === 0) return <div className="flex flex-1 items-center justify-center text-5xl text-ink-muted">Il faut au moins 2 joueurs</div>;
  const final = pub.round === pub.roundCount - 1;
  let body: ReactNode;
  if (pub.step === "reveal") body = <Arena pub={pub} playerById={playerById} mode="reveal" />;
  else if (pub.step === "pick" && final) body = <Arena pub={pub} playerById={playerById} mode="pick" />;
  else
    body = (
      <Bracket
        testId="pfc-bracket"
        bracket={pub.bracket}
        champion={pub.champion}
        winsNeeded={pub.winsNeeded}
        playerById={playerById}
        density="tv"
        current={pub.step === "draw" ? undefined : pub.round}
        intro={pub.step === "draw"}
        popColumn={pub.step === "advance" ? pub.round + 1 : pub.step === "done" ? pub.roundCount : null}
      />
    );
  return (
    <div data-testid="pfc-tv" data-step={pub.step} className="flex min-h-0 flex-1 flex-col gap-4">
      <StageTitle pub={pub} />
      {body}
    </div>
  );
};

// ───────────── Téléphone ─────────────

function myMatch(pub: Pub, me: string | undefined) {
  if (!me) return null;
  const m = pub.bracket[pub.round]?.find((x) => x.a === me || x.b === me);
  return m ?? null;
}

function FaceOff({ m, me, playerById, winsNeeded, step }: { m: MatchView; me: string; playerById: ById; winsNeeded: number; step: Pub["step"] }) {
  const mySide = m.a === me ? 0 : 1;
  const oppSide = mySide === 0 ? 1 : 0;
  const opp = playerById((oppSide === 0 ? m.a : m.b) ?? "");
  const mine = playerById(me);
  const oppBadge = m.active ? m.picked[oppSide] ? <CheckIcon /> : <span className="animate-pulse-soft">…</span> : undefined;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="flex w-full items-center justify-center gap-3">
        <div className="flex w-[7rem] min-w-0 flex-col items-center gap-1">
          <PlayerAvatar profile={mine?.profile ?? null} size="sm" />
          <span className="w-full truncate text-center text-sm font-bold text-ink-muted">{mine?.profile?.name}</span>
          <Pips won={m.wins[mySide]} needed={winsNeeded} size="sm" />
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold font-display text-lg text-accent-ink shadow-glow">VS</div>
        <div className="flex w-[8.5rem] min-w-0 flex-col items-center gap-1">
          <PlayerAvatar profile={opp?.profile ?? null} size="md" badge={oppBadge} />
          <span data-testid="pfc-opponent" className="w-full truncate text-center text-lg font-extrabold">{opp?.profile?.name}</span>
          <Pips won={m.wins[oppSide]} needed={winsNeeded} size="sm" />
        </div>
      </div>
      {step === "pick" && m.ties > 0 && (
        <motion.div key={m.ties} initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-chip bg-warn px-4 py-0.5 font-display text-base text-accent-ink">
          Égalité ! On rejoue
        </motion.div>
      )}
    </div>
  );
}

function PickButtons({ myPick, sendInput }: { myPick: Choice | null; sendInput: (p: unknown) => Promise<void> }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
      {HANDS.map((h, i) => {
        const selected = myPick === i;
        const locked = myPick !== null;
        return (
          <motion.button
            key={i}
            type="button"
            data-testid={`pfc-choice-${i}`}
            aria-pressed={selected}
            disabled={locked}
            whileTap={locked ? undefined : { scale: 0.94 }}
            initial={{ opacity: 0, x: i % 2 ? 60 : -60 }}
            animate={{ opacity: locked && !selected ? 0.3 : 1, x: 0, scale: selected ? 1.03 : 1 }}
            transition={{ delay: locked ? 0 : i * 0.06, type: "spring", stiffness: 260, damping: 18 }}
            onClick={() => void sendInput({ choice: i }).catch(() => {})}
            className={`relative flex min-h-[4.5rem] flex-1 items-center justify-center gap-4 rounded-card px-4 shadow-card disabled:cursor-default ${h.solid} ${selected ? "ring-[0.35rem] ring-ink" : ""}`}
          >
            <span className="text-[3.25rem] leading-none">{h.emoji}</span>
            <span className="font-display text-2xl">{h.label}</span>
            {selected && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xl text-bg">
                <CheckIcon />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Révélation sur le téléphone : ma main contre la sienne, au même rythme que la TV. */
function PhoneReveal({ m, me }: { m: MatchView; me: string }) {
  const mySide: 0 | 1 = m.a === me ? 0 : 1;
  const oppSide: 0 | 1 = mySide === 0 ? 1 : 0;
  const show = useAfter(OUTCOME_AT, null);
  const outcome = sideOutcome(m, mySide);
  const choiceOf = (s: 0 | 1) => (s === 0 ? m.last!.a : m.last!.b);
  const text = outcome === "win" ? "Gagné !" : outcome === "lose" ? "Perdu…" : "Égalité !";
  const tone = outcome === "win" ? "text-good" : outcome === "lose" ? "text-bad" : "text-warn";
  return (
    <div data-testid="pfc-phone-reveal" data-outcome={show ? (outcome ?? "") : ""} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-4">
        <Hand mode="reveal" choice={choiceOf(mySide)} em={4} side={0} outcome={show ? outcome : null} />
        <span className="font-display text-2xl text-ink-muted">VS</span>
        <Hand mode="reveal" choice={choiceOf(oppSide)} em={4} side={1} outcome={show ? sideOutcome(m, oppSide) : null} />
      </div>
      {show && (
        <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 12 }} className={`font-display text-5xl ${tone}`}>
          {text}
        </motion.div>
      )}
      {show && (m.byChance || m.last?.random) && <div className="text-xl font-bold text-ink-muted">🎲 Le sort a tranché</div>}
    </div>
  );
}

function StatusBanner({ priv, me, playerById, roundCount }: { priv: Priv; me: string; playerById: ById; roundCount: number }) {
  const p = playerById(me);
  if (priv.status === "out") {
    return (
      <motion.div data-testid="pfc-phone-out" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex shrink-0 items-center justify-center gap-3 rounded-card border-2 border-bad bg-bad/15 px-4 py-2">
        <PlayerAvatar profile={p?.profile ?? null} size="sm" dimmed badge={<CloseIcon />} />
        <div className="min-w-0 leading-tight">
          <div className="font-display text-2xl text-bad">Éliminé</div>
          <div className="truncate text-base text-ink-muted">{stageName(roundCount, priv.outRound ?? 0)}</div>
        </div>
      </motion.div>
    );
  }
  if (priv.status === "champion") {
    return (
      <motion.div data-testid="pfc-phone-champion" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }} className="flex shrink-0 items-center justify-center gap-3 rounded-card border-2 border-accent bg-accent/15 px-4 py-2 shadow-glow">
        <span className="text-4xl">👑</span>
        <PlayerAvatar profile={p?.profile ?? null} size="sm" />
        <span className="font-display text-2xl text-gold-gradient">Champion !</span>
      </motion.div>
    );
  }
  if (priv.status === "through") {
    return (
      <motion.div data-testid="pfc-phone-through" data-bye={priv.bye ? "true" : "false"} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex shrink-0 items-center justify-center gap-3 rounded-card border-2 border-good bg-good/15 px-4 py-2">
        <PlayerAvatar profile={p?.profile ?? null} size="sm" badge={priv.bye ? <SkipIcon /> : <CheckIcon />} />
        <span className="font-display text-2xl text-good">{priv.bye ? "Qualifié d'office" : "Qualifié !"}</span>
      </motion.div>
    );
  }
  return null;
}

const Phone = ({ pub, priv, sendInput, playerById, snapshot }: MiniGameViewProps<Pub, Priv>) => {
  const me = snapshot.me?.id;
  if (!priv || !me) return null;
  const m = myMatch(pub, me);

  // La révélation de mon duel prime (même si je viens d'être éliminé ou qualifié par ce lancer).
  if (pub.step === "reveal" && m?.last) {
    return (
      <div data-testid="pfc-phone" data-status="reveal" className="flex min-h-0 flex-1 flex-col gap-3">
        <FaceOff m={m} me={me} playerById={playerById} winsNeeded={pub.winsNeeded} step={pub.step} />
        <PhoneReveal key={`${pub.round}-${pub.throwNo}`} m={m} me={me} />
      </div>
    );
  }

  if (priv.status === "duel" && m && pub.step === "pick" && m.active) {
    return (
      <div data-testid="pfc-phone" data-status="pick" className="flex min-h-0 flex-1 flex-col gap-3">
        <FaceOff m={m} me={me} playerById={playerById} winsNeeded={pub.winsNeeded} step={pub.step} />
        <PickButtons key={`${pub.round}-${pub.throwNo}`} myPick={priv.myPick} sendInput={sendInput} />
      </div>
    );
  }

  // Sinon : où j'en suis + l'arbre (tirage, attente des autres duels, éliminé, champion).
  return (
    <div data-testid="pfc-phone" data-status={priv.status} className="flex min-h-0 flex-1 flex-col gap-3 pb-2">
      {priv.status === "duel" && m ? <FaceOff m={m} me={me} playerById={playerById} winsNeeded={pub.winsNeeded} step={pub.step} /> : <StatusBanner priv={priv} me={me} playerById={playerById} roundCount={pub.roundCount} />}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Bracket bracket={pub.bracket} champion={pub.champion} winsNeeded={pub.winsNeeded} playerById={playerById} density="phone" intro={pub.step === "draw"} popColumn={pub.step === "advance" ? pub.round + 1 : null} meId={me} testId="pfc-phone-bracket" />
      </div>
    </div>
  );
};

// ───────────── Résultats ─────────────

/** Durée (s) de l'animation des résultats : le champion arrive en ressort (le tournoi s'est joué pendant la manche). */
export const REVEAL_SECONDS = 1.5;

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  useEffect(() => {
    if (results?.champion) fireConfetti("small");
  }, [results?.champion]);
  if (!results) return null;
  const champ = results.champion ? playerById(results.champion) : undefined;
  return (
    <div data-testid="pfc-results" className="flex min-h-0 flex-1 flex-col gap-3">
      {champ && (
        <motion.div data-testid="pfc-champion" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 12 }} className="flex shrink-0 items-center justify-center gap-6">
          <motion.span className="text-7xl" animate={{ rotate: [-8, 8, -8] }} transition={{ duration: 2, repeat: Infinity }}>
            👑
          </motion.span>
          <PlayerAvatar profile={champ.profile} size="lg" className="drop-shadow-[0_0_1.5rem_var(--color-accent)]" />
          <div className="min-w-0 leading-tight">
            <div className="max-w-[60rem] truncate font-display text-6xl text-gold-gradient">{champ.profile?.name}</div>
            <div className="text-3xl font-bold text-ink-muted">remporte le tournoi !</div>
          </div>
        </motion.div>
      )}
      <Bracket bracket={results.bracket} champion={results.champion} winsNeeded={results.winsNeeded} playerById={playerById} density="tvSmall" testId="pfc-results-bracket" />
    </div>
  );
};

const PhoneResults = ({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) => {
  const me = snapshot.me?.id;
  if (!results || !me || results.reached[me] === undefined) return null;
  const reached = results.reached[me]!;
  const champion = reached >= results.roundCount;
  const text = champion ? "👑 Champion !" : `Éliminé ${stageName(results.roundCount, reached)}`;
  return (
    <p data-testid="pfc-phone-result" data-champion={champion ? "true" : "false"} className={`text-balance text-center font-display text-2xl ${champion ? "text-gold-gradient" : "text-ink-muted"}`}>
      {text}
    </p>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: () => REVEAL_SECONDS } satisfies MiniGameViews;
