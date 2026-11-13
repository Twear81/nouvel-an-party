// Chrono calculé depuis la deadline serveur (horloge corrigée). Même encombrement pour toutes les variantes de la TV ;
// seule la structure change selon le skin (docs/skins.md, « Chrono ») et le dessin fin est dans le fichier du skin.
// Sur le téléphone : toujours une barre compacte. `--p` (part restante, 1 → 0) est posé sur [data-ui="countdown"].
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { RoundInfo } from "../../shared/types";
import type { SkinId } from "../../shared/skins";
import { serverNow } from "../net/socket";
import { useSkin } from "../theme/skin";

export function useRemainingMs(round: RoundInfo | null): number | null {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  if (!round) return null;
  if (round.pausedRemainingMs != null) return round.pausedRemainingMs;
  if (round.deadline != null) return Math.max(0, round.deadline - serverNow());
  return null;
}

export type CountdownVariant = "bar" | "heart" | "hex" | "ring" | "scoreboard" | "coin";
const VARIANT_OF_SKIN: Record<SkinId, CountdownVariant> = {
  dofus: "heart",
  overwatch: "hex",
  "league-of-legends": "ring",
  "rocket-league": "scoreboard",
  "mario-odyssey": "coin",
  "plague-tale": "ring",
};

interface Props {
  round: RoundInfo;
  size?: "tv" | "phone";
  /** Variante `scoreboard` : joueurs qui ont répondu (à gauche) et qui n'ont pas encore répondu (à droite) ; des tirets si l'écran ne les connaît pas. */
  answeredCount?: number;
  waitingCount?: number;
}

const RING_LENGTH = 276.46; // 2π × rayon 44

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Chiffre du chrono. Dans les 5 dernières secondes il « bat » à chaque seconde (la clé relance l'animation CSS) :
 * le chiffre seul grossit de `amp` puis revient, à l'intérieur de sa boîte (qui garde son encombrement : un `transform`
 * ne déplace rien) ; à 3-2-1 il tremble en plus. Le conteneur du chiffre, lui, ne bouge jamais.
 */
function Digits({ seconds, low, amp = 1.15, children }: { seconds: number; low: boolean; amp?: number; children?: ReactNode }) {
  const style = low ? ({ "--beat": amp, animation: `${seconds <= 3 ? "countdown-beat-shake" : "countdown-beat"} 0.6s ease-out` } as CSSProperties) : undefined;
  return (
    <span key={seconds} data-ui="countdown-digits" className="inline-block" style={style}>
      {children ?? seconds}
    </span>
  );
}

export function Countdown({ round, size = "tv", answeredCount, waitingCount }: Props) {
  const remaining = useRemainingMs(round);
  const skin = useSkin();
  if (remaining == null) return null;
  const total = Math.max(1, round.timerTotalMs ?? remaining);

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 5;
  const part = Math.max(0, Math.min(1, remaining / total));
  const variant: CountdownVariant = size === "phone" || !skin ? "bar" : VARIANT_OF_SKIN[skin];
  const common = {
    "data-testid": "countdown",
    "data-ui": "countdown",
    "data-variant": variant,
    "data-size": size,
    "data-low": low ? "true" : "false",
    style: { "--p": part } as CSSProperties,
  };
  const numClass = `font-num tabular-nums transition-colors duration-500 ${low ? "text-bad" : "text-accent"}`;

  if (variant === "bar") {
    const big = size === "tv";
    return (
      <div {...common} className={`flex items-center gap-4 ${big ? "w-[34rem]" : "w-full"}`}>
        <div data-ui="countdown-track" className={`relative flex-1 overflow-hidden rounded-full bg-surface-strong ${big ? "h-5" : "h-2.5"}`}>
          <div
            data-ui="countdown-fill"
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear ${low ? "bg-bad" : "bg-gold"}`}
            style={{ width: `${part * 100}%` }}
          />
        </div>
        <span data-ui="countdown-num" className={`text-right ${numClass} ${big ? "w-24 text-5xl" : "w-10 text-xl"}`}><Digits seconds={seconds} low={low} amp={big ? 1.15 : 1.2} /></span>
      </div>
    );
  }

  // Variantes de la TV : même boîte pour toutes (le contenu est centré dedans).
  const box = "relative flex h-[6rem] w-[16rem] shrink-0 items-center justify-center";
  switch (variant) {
    case "heart":
      return (
        <div {...common} className={box}>
          <svg data-ui="countdown-shape" viewBox="0 0 100 92" aria-hidden className="absolute h-full">
            <path d={HEART} className="fill-bg stroke-ink" strokeWidth="3" />
          </svg>
          {/* Le cœur plein se vide du haut vers le bas : rogné selon --p. */}
          <svg data-ui="countdown-fill" viewBox="0 0 100 92" aria-hidden className="absolute h-full transition-[clip-path] duration-100 ease-linear" style={{ clipPath: "inset(calc((1 - var(--p)) * 100%) 0 0 0)" }}>
            <path d={HEART} className={`stroke-ink ${low ? "fill-bad" : "fill-hot"}`} strokeWidth="3" />
          </svg>
          <span data-ui="countdown-num" className={`relative text-5xl text-ink font-num tabular-nums`}><Digits seconds={seconds} low={low} /></span>
        </div>
      );
    case "hex":
      return (
        <div {...common} className={box}>
          <svg data-ui="countdown-shape" viewBox="0 0 120 100" aria-hidden className="absolute h-full">
            <polygon points="30,0 90,0 120,50 90,100 30,100 0,50" className={low ? "fill-bad" : "fill-ink"} />
          </svg>
          <span data-ui="countdown-num" className={`relative font-num text-6xl tabular-nums text-bg`}><Digits seconds={seconds} low={low} /></span>
        </div>
      );
    case "ring":
      return (
        <div {...common} className={box}>
          <svg data-ui="countdown-shape" viewBox="0 0 100 100" aria-hidden className="absolute h-full">
            <circle data-ui="countdown-ring-bg" cx="50" cy="50" r="44" className="fill-none stroke-line" strokeWidth="6" />
            <circle
              data-ui="countdown-ring"
              cx="50"
              cy="50"
              r="44"
              className={`fill-none transition-[stroke-dashoffset] duration-100 ease-linear ${low ? "stroke-bad" : "stroke-accent"}`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              style={{ strokeDashoffset: `calc(${RING_LENGTH} * (1 - var(--p)))`, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
          </svg>
          <span data-ui="countdown-num" className={`relative text-5xl ${numClass}`}><Digits seconds={seconds} low={low} /></span>
          <span data-ui="countdown-cartouche" aria-hidden className="absolute bottom-0 left-1/2 h-[1.1rem] w-[3.2rem] -translate-x-1/2 rounded-chip bg-bg" />
        </div>
      );
    case "scoreboard": {
      const m = Math.floor(seconds / 60);
      return (
        <div {...common} className={`${box} gap-0`}>
          <span data-ui="countdown-side" data-side="left" className="flex h-full w-[4.5rem] items-center justify-center rounded-l-btn bg-cool font-num text-4xl text-bg">{answeredCount ?? "–"}</span>
          <span data-ui="countdown-num" className={`flex h-full flex-1 items-center justify-center bg-bg-2 text-5xl transition-colors duration-500 ${low ? "text-bad" : "text-ink"} font-num tabular-nums`}><Digits seconds={seconds} low={low} amp={1.08}>{m}:{pad2(seconds % 60)}</Digits></span>
          <span data-ui="countdown-side" data-side="right" className="flex h-full w-[4.5rem] items-center justify-center rounded-r-btn bg-hot font-num text-4xl text-bg">{waitingCount ?? "–"}</span>
        </div>
      );
    }
    case "coin":
      return (
        <div {...common} className={box}>
          <span data-ui="countdown-shape" className={`flex h-[6rem] w-[6rem] items-center justify-center rounded-full ${low ? "bg-bad" : "bg-gold"}`}>
            <span data-ui="countdown-num" className={`font-num text-5xl tabular-nums text-accent-ink`}><Digits seconds={seconds} low={low} /></span>
          </span>
        </div>
      );
  }
}

const HEART = "M50 89C21 67 3 50 3 29 3 13 15 3 29 3c10 0 17 5 21 13 4-8 11-13 21-13 14 0 26 10 26 26 0 21-18 38-47 60Z";
