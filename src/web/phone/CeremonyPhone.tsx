import { useEffect, useRef } from "react";
import type { GameSnapshot } from "../../shared/types";
import { Panel, WatchingEyes } from "../ui";

export function CeremonyPhone({ snapshot }: { snapshot: GameSnapshot }) {
  const info = snapshot.ceremony;
  const mine = info?.awards.filter((a) => a.winners.includes(snapshot.me!.id)) ?? [];
  const latest = mine.at(-1);
  const vibrated = useRef<string | null>(null);
  useEffect(() => {
    if (latest && vibrated.current !== latest.id) { navigator.vibrate?.([60, 40, 60]); vibrated.current = latest.id; }
  }, [latest?.id]);
  return <div data-testid="phone-ceremony" data-step={info?.step?.kind ?? "intro"} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
    <WatchingEyes /><h1 className="font-display text-3xl text-gold-gradient">Regarde la TV !</h1>
    {latest && <Panel data-testid="phone-award" data-award={latest.id} className="w-full p-5"><p className="text-5xl">{latest.emoji}</p><h2 className="font-display text-3xl">{latest.title}</h2><p className="mt-2 font-num text-4xl text-accent">+{latest.points}</p><p className="mt-2 text-ink-muted">{latest.statLabel}</p></Panel>}
  </div>;
}
