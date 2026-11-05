// Résultats TV du "Bon prix" : les prix des joueurs arrivent sur un axe, roulement de tambour, le vrai prix tombe, puis les écarts.
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fireConfetti, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps } from "../views-contract";
import { formatCents } from "./amount";
import type { GuessResult, Priv, Pub, Results } from "./game";
import { ItemVisual } from "./Showcase";

type Stage = "guesses" | "drum" | "price" | "done";

/** "+12 €" (trop cher), "−3 €" (pas assez) */
export const gapLabel = (diff: number) => (diff === 0 ? "Pile !" : `${diff > 0 ? "+" : "−"}${formatCents(Math.abs(diff))}`);

// Positions verticales (rem, depuis le bas de la zone) : étiquette du prix, graduations, axe, repères des joueurs.
const AXIS_Y = 8.4;
const MARKERS_Y = AXIS_Y + 7.5;

/**
 * Échelle de l'axe (valeur en centimes → fraction 0..1) et graduations.
 * Échelle logarithmique quand les prix s'étalent sur plusieurs ordres de grandeur (1 € et 1 000 €),
 * sinon linéaire, pour que les réponses proches ne s'écrasent pas toutes au même endroit.
 */
function makeScale(values: number[]) {
  const pos = values.map((v) => Math.max(v, 1));
  const min = Math.min(...pos);
  const max = Math.max(...pos);
  if (max / min > 12) {
    const lo = Math.log10(min) - 0.12;
    const hi = Math.log10(max) + 0.12;
    const f = (v: number) => (Math.log10(Math.max(v, 1)) - lo) / (hi - lo);
    const ticks: number[] = [];
    const few = hi - lo < 2.6;
    for (let e = Math.floor(lo); e <= Math.ceil(hi); e++) {
      for (const m of few ? [1, 2, 5] : [1]) {
        const v = m * 10 ** e;
        if (Math.log10(v) >= lo && Math.log10(v) <= hi) ticks.push(v);
      }
    }
    return { f, ticks };
  }
  const pad = max > min ? (max - min) * 0.08 : Math.max(100, max * 0.2);
  const lo = Math.max(0, Math.min(...values) - pad);
  const hi = Math.max(...values) + pad;
  const raw = (hi - lo) / 5;
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return { f: (v: number) => (v - lo) / (hi - lo), ticks };
}

/**
 * Place des étiquettes de largeur `w` le plus près possible de leur point (`xs` triés), sans chevauchement :
 * les groupes qui se touchent sont centrés sur la moyenne de leurs points.
 */
function spread(xs: number[], w: number, min: number, max: number): number[] {
  let blocks = xs.map((x, i) => ({ first: i, count: 1, sum: x, start: x - w / 2 }));
  for (let changed = true; changed; ) {
    changed = false;
    for (const b of blocks) b.start = Math.min(Math.max(b.sum / b.count - (b.count * w) / 2, min), max - b.count * w);
    for (let i = 0; i + 1 < blocks.length; i++) {
      const a = blocks[i]!;
      const b = blocks[i + 1]!;
      if (a.start + a.count * w > b.start + 0.01) {
        blocks = [...blocks.slice(0, i), { first: a.first, count: a.count + b.count, sum: a.sum + b.sum, start: 0 }, ...blocks.slice(i + 2)];
        changed = true;
        break;
      }
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.count; k++) out.push(b.start + k * w + w / 2);
  return out;
}

/** Taille (px) d'un élément et valeur de 1rem (px), mises à jour au redimensionnement. */
function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0, rem: 16 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight, rem: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...box };
}

/** Rythme de la révélation (ms) : prix des joueurs un par un, roulement de tambour, vrai prix, écarts. */
const REVEAL = { first: 400, step: 500, beforeDrum: 600, drum: 1700, price: 1100, settle: 900 };

/** Durée totale (s) de la révélation pour `n` réponses : tout est en place, vainqueur compris. */
export const revealSeconds = (n: number) => (REVEAL.first + n * REVEAL.step + REVEAL.beforeDrum + REVEAL.drum + REVEAL.price + REVEAL.settle) / 1000;

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function GuessMarker({ g, left, big, stage, playerById }: { g: GuessResult; left: number; big: boolean; stage: Stage; playerById: MiniGameViewProps["playerById"] }) {
  const done = stage === "done";
  const winner = done && g.rank === 1;
  const player = playerById(g.playerId);
  return (
    <motion.div
      data-testid={`bp-guess-${g.playerId}`}
      data-rank={done ? g.rank : undefined}
      initial={{ opacity: 0, y: -160, scale: 0.3 }}
      animate={{ opacity: done && g.points === 0 ? 0.55 : 1, y: winner ? -16 : 0, scale: winner ? 1.15 : 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 13 }}
      className={`absolute z-20 flex -translate-x-1/2 flex-col items-center rounded-card px-1 pb-1 pt-2 text-center ${winner ? "border-[0.2rem] border-accent bg-bg-2 shadow-glow" : "bg-bg/60"}`}
      style={{ left, bottom: `${MARKERS_Y}rem`, width: `${big ? 12.5 : 10.5}rem`, transformOrigin: "bottom center" }}
    >
      <PlayerAvatar profile={player?.profile ?? null} size={big ? "lg" : "md"} badge={done && g.rank <= 3 ? MEDALS[g.rank - 1] : undefined} />
      <span className="mt-1 w-full truncate text-xl font-bold leading-tight">{player?.profile?.name}</span>
      <span className={`font-display text-3xl leading-tight ${winner ? "text-accent" : ""}`}>{formatCents(g.cents)}</span>
      <span data-testid={`bp-gap-${g.playerId}`} className={`text-2xl font-extrabold leading-tight transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"} ${winner ? "text-accent" : "text-ink-muted"}`}>
        {g.exact ? "Pile ! 🎯" : gapLabel(g.diff)}
      </span>
    </motion.div>
  );
}

export function TvResults({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) {
  const [stage, setStage] = useState<Stage>("guesses");
  const [shown, setShown] = useState(0);
  const box = useBox();
  const ranking = results?.ranking ?? [];
  const n = ranking.length;
  const hasResults = results != null;
  const exactWin = ranking[0]?.exact ?? false;

  // Les prix arrivent un par un, du plus éloigné au plus proche : le suspense monte.
  useEffect(() => {
    if (!hasResults) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    for (let i = 1; i <= n; i++) at(REVEAL.first + i * REVEAL.step, () => setShown(i));
    const tDrum = REVEAL.first + n * REVEAL.step + REVEAL.beforeDrum;
    at(tDrum, () => setStage("drum"));
    at(tDrum + REVEAL.drum, () => setStage("price"));
    at(tDrum + REVEAL.drum + REVEAL.price, () => {
      setStage("done");
      if (n > 0) fireConfetti(exactWin ? "big" : "small");
    });
    return () => timers.forEach(clearTimeout);
    // Dépend de valeurs simples : un nouvel instantané du serveur (même contenu) ne relance pas l'animation.
  }, [hasResults, n, exactWin]);

  if (!results) return null;
  const { w, h, rem } = box;
  const scale = makeScale([results.priceCents, ...ranking.map((g) => g.cents)]);
  // L'axe occupe 3 % → 97 % de la largeur ; ses points utiles 6 % → 94 %.
  const axisX = (v: number) => w * (0.06 + 0.88 * scale.f(v));
  const byValue = [...ranking].sort((a, b) => a.cents - b.cents);
  const big = n <= 5;
  const markerW = (big ? 12.5 : 10.5) * rem + 0.4 * rem;
  const points = byValue.map((g) => axisX(g.cents));
  const lefts = w > 0 ? spread(points, markerW, 0.02 * w, 0.98 * w) : points;
  const farthestFirst = [...ranking].reverse();
  const visible = new Set(farthestFirst.slice(0, shown).map((g) => g.playerId));
  const priceX = axisX(results.priceCents);
  const tagX = Math.min(Math.max(priceX, 0.1 * w), 0.9 * w);
  const winners = ranking.filter((g) => g.rank === 1);
  const priceShown = stage === "price" || stage === "done";
  const yAxis = h - AXIS_Y * rem;
  const yMarkers = h - MARKERS_Y * rem;

  return (
    <div data-testid="bp-results" data-stage={stage} className="flex min-h-0 flex-1 flex-col gap-1">
      {/* En-tête : l'objet et, à la fin, le vainqueur */}
      <div className="flex h-[6.5rem] shrink-0 items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <ItemVisual image={results.image} emoji={results.emoji} rem={5.5} />
          <h1 className="min-w-0 truncate font-display text-5xl text-gold-gradient">{results.nom}</h1>
        </div>
        {stage === "done" && (
          <motion.div
            data-testid="bp-winner"
            initial={{ opacity: 0, x: 80, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 14 }}
            className="flex min-w-0 max-w-[60rem] shrink-0 items-center gap-4 rounded-chip border-[0.25rem] border-accent bg-accent/15 px-8 py-2 shadow-glow"
          >
            {winners.length === 0 ? (
              <span className="text-3xl font-bold text-ink-muted">Personne n'a répondu…</span>
            ) : (
              <>
                <span className="text-5xl">{winners[0]!.exact ? "🎯" : "👑"}</span>
                <div className="min-w-0 leading-tight">
                  <div className="truncate text-4xl font-extrabold text-accent">{winners.map((g) => playerById(g.playerId)?.profile?.name).join(" & ")}</div>
                  <div className="text-2xl text-ink-muted">{winners[0]!.exact ? "Le prix exact !" : `à ${formatCents(winners[0]!.gap)} près`}</div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Axe des prix */}
      <div ref={box.ref} className="relative min-h-0 flex-1">
        <div className="absolute inset-x-[3%] h-[0.45rem] -translate-y-1/2 rounded-full bg-surface-strong" style={{ bottom: `${AXIS_Y}rem` }} />
        {w > 0 &&
          scale.ticks.map((t) => (
            <div key={t} className="absolute -translate-x-1/2 text-center" style={{ left: axisX(t), top: yAxis + 0.4 * rem }}>
              <div className="mx-auto mb-0.5 h-2 w-[0.15rem] bg-ink-muted" />
              <span className="whitespace-nowrap text-xl font-semibold text-ink-muted">{formatCents(t)}</span>
            </div>
          ))}

        {/* Traits qui relient chaque réponse à son point exact sur l'axe */}
        {w > 0 && (
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden>
            {byValue.map((g, i) =>
              visible.has(g.playerId) ? (
                <g key={g.playerId}>
                  <motion.line
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.25, duration: 0.3 }}
                    x1={lefts[i]}
                    y1={yMarkers}
                    x2={points[i]}
                    y2={yAxis}
                    stroke="var(--color-ink-muted)"
                    strokeWidth={0.18 * rem}
                    strokeLinecap="round"
                  />
                  <circle cx={points[i]} cy={yAxis} r={0.45 * rem} fill={stage === "done" && g.rank === 1 ? "var(--color-accent)" : "var(--color-ink)"} />
                </g>
              ) : null,
            )}
          </svg>
        )}

        {/* Le vrai prix : un faisceau doré tombe du haut, l'étiquette rebondit en bas */}
        {priceShown && w > 0 && (
          <>
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeIn" }}
              style={{ left: priceX, originY: 0, bottom: `${AXIS_Y - 0.5}rem` }}
              className="absolute top-0 z-0 w-[0.5rem] -translate-x-1/2 rounded-full bg-gold shadow-glow"
            />
            <motion.div
              data-testid="bp-real-price"
              initial={{ y: -420, scale: 1.8, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 160, damping: 9, delay: 0.3 }}
              className="absolute bottom-0 z-30 -translate-x-1/2 whitespace-nowrap rounded-chip border-[0.25rem] border-accent-strong bg-gold px-8 py-1 font-display text-6xl text-accent-ink shadow-glow"
              style={{ left: tagX }}
            >
              {formatCents(results.priceCents)}
            </motion.div>
          </>
        )}
        {stage === "drum" && (
          <motion.div
            data-testid="bp-drum"
            initial={{ scale: 0 }}
            animate={{ rotate: [-4, 4, -4], scale: [1, 1.1, 1] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="absolute bottom-0 left-1/2 z-30 -ml-[10rem] w-[20rem] whitespace-nowrap rounded-chip border-[0.3rem] border-accent bg-bg-2 py-1 text-center font-display text-6xl text-accent"
          >
            🥁 ? ? ?
          </motion.div>
        )}

        {w > 0 &&
          byValue.map((g, i) => (visible.has(g.playerId) ? <GuessMarker key={g.playerId} g={g} left={lefts[i]!} big={big} stage={stage} playerById={playerById} /> : null))}

        {results.missingIds.length > 0 && (
          <div className="absolute bottom-0 left-0 flex max-w-[30%] items-center gap-2 opacity-70">
            {results.missingIds.map((id) => (
              <PlayerAvatar key={id} profile={playerById(id)?.profile ?? null} size="sm" dimmed />
            ))}
            <span className="text-xl text-ink-muted">sans réponse</span>
          </div>
        )}
      </div>
    </div>
  );
}
