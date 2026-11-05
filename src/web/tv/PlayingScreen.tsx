import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { Countdown } from "../ui";
import { TvGameView } from "./GameView";

export function RoundHeader({ round, children }: { round: RoundInfo; children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-8 px-14 pt-8">
      <div className="flex items-center gap-5">
        <span className="rounded-chip bg-surface-strong px-6 py-2 font-display text-3xl text-accent">
          {round.index + 1} / {round.total}
        </span>
        <span className="font-display text-3xl text-ink-muted">{round.gameName}</span>
      </div>
      {children}
    </header>
  );
}

export function PlayingScreen({ snapshot, round }: { snapshot: GameSnapshot; round: RoundInfo }) {
  return (
    <div data-testid="tv-playing" className="flex min-h-0 flex-1 flex-col">
      <RoundHeader round={round}>
        <Countdown round={round} size="tv" />
      </RoundHeader>
      <div className="flex min-h-0 flex-1 flex-col px-14 pb-4 pt-4">
        <TvGameView snapshot={snapshot} round={round} kind="Tv" />
      </div>
    </div>
  );
}
