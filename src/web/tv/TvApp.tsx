// Écran TV : aiguille selon la phase et affiche les contrôles du maître du jeu.
import { AnimatePresence, motion } from "motion/react";
import { useGame } from "../net/useGame";
import { SkinProvider } from "../theme/skin";
import { PausedOverlay, ReconnectBanner, RoomTransition, roomReference, TvStage } from "../ui";
import { FinalScreen } from "./FinalScreen";
import { HostBar } from "./HostBar";
import { IntroScreen } from "./IntroScreen";
import { Lobby } from "./Lobby";
import { PlayingScreen } from "./PlayingScreen";
import { ResultsScreen } from "./ResultsScreen";

export function TvApp() {
  const game = useGame("tv");
  return (
    <>
      <link rel="preload" as="image" href={roomReference} />
      <SkinProvider skin={game.snapshot?.skin}>
        <TvScreens game={game} />
      </SkinProvider>
    </>
  );
}

function TvScreens({ game }: { game: ReturnType<typeof useGame> }) {
  const { snapshot, connected, host, actions } = game;

  if (!snapshot) {
    return (
      <TvStage>
        <div className="flex flex-1 items-center justify-center font-display text-5xl text-accent animate-pulse-soft">Connexion…</div>
        <ReconnectBanner show={!connected} />
      </TvStage>
    );
  }

  const round = snapshot.round;
  let screen;
  switch (snapshot.phase) {
    case "lobby":
      screen = <Lobby snapshot={snapshot} host={host} actions={actions} />;
      break;
    case "transition":
      screen = <RoomTransition key={`${snapshot.transition?.kind}-${snapshot.transition?.startedAt}`} snapshot={snapshot} />;
      break;
    case "intro":
      screen = round && <IntroScreen snapshot={snapshot} round={round} />;
      break;
    case "playing":
      screen = round && <PlayingScreen snapshot={snapshot} round={round} />;
      break;
    case "results":
      screen = round && <ResultsScreen snapshot={snapshot} round={round} />;
      break;
    case "final":
      screen = <FinalScreen snapshot={snapshot} />;
      break;
  }

  return (
    <TvStage phase={snapshot.phase}>
      {snapshot.phase === "transition" ? screen : <AnimatePresence mode="wait">
        <motion.div
          key={`${snapshot.phase}-${round?.index ?? ""}`}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          {screen}
        </motion.div>
      </AnimatePresence>}
      {host && snapshot.phase !== "lobby" && <HostBar snapshot={snapshot} actions={actions} overlay={snapshot.phase === "transition" || (snapshot.phase === "playing" && !!round?.interlude)} />}
      <PausedOverlay show={snapshot.paused} big />
      <ReconnectBanner show={!connected} />
    </TvStage>
  );
}
