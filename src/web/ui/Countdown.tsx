// Chrono : barre + secondes restantes, calculé depuis la deadline serveur (horloge corrigée).
import { useEffect, useRef, useState } from "react";
import type { RoundInfo } from "../../shared/types";
import { serverNow } from "../net/socket";

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

interface Props {
  round: RoundInfo;
  size?: "tv" | "phone";
}

export function Countdown({ round, size = "tv" }: Props) {
  const remaining = useRemainingMs(round);
  // Durée de référence = plus grand temps restant vu pour cette manche (couvre aussi le +10 s).
  const ref = useRef({ index: -1, max: 1 });
  if (ref.current.index !== round.index) ref.current = { index: round.index, max: 1 };
  if (remaining != null && remaining > ref.current.max) ref.current.max = remaining;
  if (remaining == null) return null;

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 5;
  const big = size === "tv";
  return (
    <div data-testid="countdown" className={`flex items-center gap-4 ${big ? "w-[34rem]" : "w-full"}`}>
      <div className={`relative flex-1 overflow-hidden rounded-full bg-surface-strong ${big ? "h-5" : "h-2.5"}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear ${low ? "bg-bad" : "bg-gold"}`}
          style={{ width: `${Math.min(100, (remaining / ref.current.max) * 100)}%` }}
        />
      </div>
      <span className={`text-right font-display tabular-nums ${big ? "w-24 text-5xl" : "w-10 text-xl"} ${low ? "text-bad animate-pulse-soft" : "text-accent"}`}>{seconds}</span>
    </div>
  );
}
