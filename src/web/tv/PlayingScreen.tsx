import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { Countdown } from "../ui";
import { TvGameView } from "./GameView";

export function RoundHeader({ round, children }: { round: RoundInfo; children?: React.ReactNode }) {
  return (
    <header data-ui="round-header" className="flex items-center justify-between gap-8 px-14 pt-8">
      <div className="flex items-center gap-5">
        {/* Un interlude n'a pas de numéro : le compter dévoilerait sa venue. */}
        {!round.interlude && (
          <span data-ui="round-tag" className="rounded-chip bg-surface-strong px-6 py-2 font-num text-3xl text-accent">
            {round.number} / {round.normalTotal}
          </span>
        )}
        <span className="font-display text-3xl text-ink-muted">{round.gameName}</span>
      </div>
      {children}
    </header>
  );
}

export function PlayingScreen({ snapshot, round }: { snapshot: GameSnapshot; round: RoundInfo }) {
  // Interlude : pas de cadre (en-tête, chrono standard). Le jeu met tout en scène, en plein écran.
  if (round.interlude) {
    return (
      <div data-testid="tv-playing" data-interlude="true" className="flex min-h-0 flex-1 flex-col">
        <TvGameView snapshot={snapshot} round={round} kind="Tv" />
      </div>
    );
  }
  return (
    <div data-testid="tv-playing" data-interlude="false" className="flex min-h-0 flex-1 flex-col">
      <RoundHeader round={round}>
        <Countdown round={round} size="tv" />
      </RoundHeader>
      <div className="flex min-h-0 flex-1 flex-col px-14 pb-4 pt-4">
        <TvGameView snapshot={snapshot} round={round} kind="Tv" />
      </div>
    </div>
  );
}
