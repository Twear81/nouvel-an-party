// Compte à rebours de minuit, plein écran, au-dessus de tout (TV et téléphones). Aucun état de jeu ici : tout vient de
// `snapshot.midnight` et de l'horloge synchronisée (`serverNow`). Thème de base (le serveur retire le skin pendant minuit).
// Le chiffre pulse à l'intérieur de son emplacement (transform seul), jamais en changeant la taille de la boîte.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MidnightInfo } from "../../shared/midnight";
import { serverNow } from "../net/socket";
import { fireConfetti } from "./confetti";
import { Fireworks } from "./Fireworks";

/** Secondes affichées une à une, en énorme, avant minuit. */
export const LAST_SECONDS = 10;

const pad2 = (n: number) => String(n).padStart(2, "0");
/** « 1:05 » → "01:05". */
export const formatMmSs = (totalSeconds: number) => `${pad2(Math.floor(totalSeconds / 60))}:${pad2(totalSeconds % 60)}`;

function useRemainingSeconds(targetAt: number): number {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.ceil((targetAt - serverNow()) / 1000));
}

const STYLES = {
  tv: {
    root: "pb-28",
    label: "text-6xl",
    clock: "text-[17rem]",
    slot: "h-[34rem]",
    big: "text-[30rem]",
    hello: "text-[10rem]",
    year: "text-[19rem]",
    gap: "gap-6",
    beat: 1.2,
  },
  phone: {
    root: "px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[max(0.75rem,env(safe-area-inset-top))]",
    label: "text-2xl",
    clock: "text-7xl",
    slot: "h-[14rem]",
    big: "text-[11rem]",
    hello: "text-5xl",
    year: "text-8xl",
    gap: "gap-3",
    beat: 1.12,
  },
} as const;

export function MidnightOverlay({ midnight, size = "tv" }: { midnight: MidnightInfo; size?: "tv" | "phone" }) {
  const seconds = useRemainingSeconds(midnight.targetAt);
  const celebrate = midnight.phase === "celebrate" || seconds <= 0;
  const st = STYLES[size];

  // Confettis une seule fois par minuit (l'overlay peut être rendu à nouveau à chaque snapshot).
  const fired = useRef<number | null>(null);
  useEffect(() => {
    if (!celebrate || fired.current === midnight.targetAt) return;
    fired.current = midnight.targetAt;
    fireConfetti(size === "tv" ? "big" : "small");
  }, [celebrate, midnight.targetAt, size]);

  const beat = { "--beat": st.beat, animation: `countdown-beat${seconds <= 3 ? "-shake" : ""} 0.8s ease-out` } as CSSProperties;

  return (
    <div
      data-testid="midnight"
      data-ui="midnight"
      data-state={celebrate ? "celebrate" : "countdown"}
      data-seconds={celebrate ? 0 : seconds}
      className={`absolute inset-0 z-[45] flex flex-col items-center justify-center overflow-hidden bg-night text-center ${st.gap} ${st.root}`}
    >
      {celebrate ? (
        <>
          <Fireworks size={size} />
          <h1 data-testid="midnight-hello" className={`relative font-display leading-none text-gold-gradient ${st.hello}`}>Bonne année</h1>
          <p data-testid="midnight-year" className={`relative font-num leading-none text-gold-gradient ${st.year}`}>{midnight.year}&nbsp;!</p>
        </>
      ) : (
        <>
          <p className={`font-display text-ink-muted ${st.label}`}>Minuit dans</p>
          <div className={`flex w-full items-center justify-center ${st.slot}`}>
            {seconds > LAST_SECONDS ? (
              <span data-testid="midnight-count" className={`font-num leading-none text-gold-gradient ${st.clock}`}>{formatMmSs(seconds)}</span>
            ) : (
              // `key` relance l'animation à chaque seconde ; la boîte du chiffre garde sa taille.
              <span key={seconds} data-testid="midnight-count" data-last="true" className={`inline-block font-num leading-none text-gold-gradient ${st.big}`} style={beat}>{seconds}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
