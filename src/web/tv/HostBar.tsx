// Contrôles du maître du jeu : bande fine, toujours visible, en bas à droite de la TV (sous le jeu, jamais par-dessus).
// Raccourcis clavier (Espace = pause, N = passer) : bonus silencieux, rien n'est écrit à l'écran.
import { useCallback, useEffect, useState } from "react";
import type { GameSnapshot } from "../../shared/types";
import type { GameActions } from "../net/useGame";
import { Button, ClockIcon, ConfirmDialog, HomeIcon, PauseIcon, PlayIcon, SkipIcon, SpeakerIcon, SpeakerOffIcon, useSoundState } from "../ui";
import { sound } from "../sound/engine";

/** `overlay` : barre posée par-dessus l'écran (interlude plein écran, le jeu occupe toute la TV et laisse le coin libre). */
export function HostBar({ snapshot, actions, overlay }: { snapshot: GameSnapshot; actions: GameActions; overlay?: boolean }) {
  const [confirmLobby, setConfirmLobby] = useState(false);
  const soundState = useSoundState();
  const { phase, paused } = snapshot;
  const inGame = phase === "transition" || phase === "intro" || phase === "playing" || phase === "results";

  const togglePause = useCallback(() => void (paused ? actions.resume() : actions.pause()).catch(() => {}), [paused, actions]);
  const skip = useCallback(() => void actions.skip().catch(() => {}), [actions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmLobby || (e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.code === "Space" && inGame) {
        e.preventDefault();
        togglePause();
      } else if ((e.key === "n" || e.key === "N" || e.key === "ArrowRight") && inGame) skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inGame, confirmLobby, togglePause, skip]);

  return (
    <>
      <div data-testid="host-bar" data-ui="host-bar" className={`z-50 flex items-center justify-end gap-3 px-10 pb-3 pt-1 ${overlay ? "absolute inset-x-0 bottom-0" : "relative shrink-0"}`}>
        {inGame && (
          <>
            <Button data-ui="host-button" data-testid="host-pause" variant={paused ? "primary" : "secondary"} size="sm" className="flex items-center gap-2 !px-4 !py-1.5" onClick={togglePause}>
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Reprendre" : "Pause"}
            </Button>
            <Button data-ui="host-button" data-testid="host-skip" variant="secondary" size="sm" className="flex items-center gap-2 !px-4 !py-1.5" onClick={skip}>
              <SkipIcon />
              Passer
            </Button>
            {phase === "playing" && (
              <Button data-ui="host-button" data-testid="host-addtime" variant="secondary" size="sm" className="flex items-center gap-2 !px-4 !py-1.5" onClick={() => void actions.addTime(10).catch(() => {})}>
                <ClockIcon />
                +10 s
              </Button>
            )}
          </>
        )}
        <Button data-ui="host-button" data-testid="host-sound" data-sound={soundState} aria-label="Son" variant="secondary" size="sm" className="ml-3 flex items-center !px-4 !py-1.5" onClick={() => sound.toggleMuted()}>
          {soundState === "on" ? <SpeakerIcon /> : <SpeakerOffIcon />}
        </Button>
        <Button data-ui="host-button" data-testid="host-lobby" variant="secondary" size="sm" className="flex items-center gap-2 !px-4 !py-1.5" onClick={() => setConfirmLobby(true)}>
          <HomeIcon />
          Lobby
        </Button>
      </div>
      {confirmLobby && (
        <ConfirmDialog
          title="Retourner au lobby ?"
          detail="Les joueurs restent, les scores repartent à zéro."
          confirmLabel="Retourner au lobby"
          onCancel={() => setConfirmLobby(false)}
          onConfirm={() => {
            setConfirmLobby(false);
            void actions.lobby().catch(() => {});
          }}
        />
      )}
    </>
  );
}
