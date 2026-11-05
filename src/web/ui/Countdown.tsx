// Chrono : barre + secondes restantes, calculé depuis la deadline serveur (horloge corrigée).
import { useEffect, useState } from "react";
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
  if (remaining == null) return null;
  const total = Math.max(1, round.timerTotalMs ?? remaining);

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 5;
  const big = size === "tv";
  return (
    <div data-testid="countdown" className={`flex items-center gap-4 ${big ? "w-[34rem]" : "w-full"}`}>
      <div className={`relative flex-1 overflow-hidden rounded-full bg-surface-strong ${big ? "h-5" : "h-2.5"}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear ${low ? "bg-bad" : "bg-gold"}`}
          style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }}
        />
      </div>
      <span className={`text-right font-display tabular-nums ${big ? "w-24 text-5xl" : "w-10 text-xl"} ${low ? "text-bad animate-pulse-soft" : "text-accent"}`}>{seconds}</span>
    </div>
  );
}
