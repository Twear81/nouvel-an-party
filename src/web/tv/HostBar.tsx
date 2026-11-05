// Contrôles du maître du jeu : barre qui apparaît au mouvement de la souris (reste dans le DOM, cliquable) + raccourcis clavier.
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSnapshot } from "../../shared/types";
import type { GameActions } from "../net/useGame";
import { Button } from "../ui";

export function HostBar({ snapshot, actions }: { snapshot: GameSnapshot; actions: GameActions }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { phase, paused } = snapshot;
  const inGame = phase === "intro" || phase === "playing" || phase === "results";

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  const togglePause = useCallback(() => void (paused ? actions.resume() : actions.pause()).catch(() => {}), [paused, actions]);
  const skip = useCallback(() => void actions.skip().catch(() => {}), [actions]);
  const backToLobby = useCallback(() => {
    if (window.confirm("Retourner au lobby ? Les scores seront remis à zéro.")) void actions.lobby().catch(() => {});
  }, [actions]);

  useEffect(() => {
    const onMove = () => show();
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.code === "Space" && inGame) {
        e.preventDefault();
        togglePause();
      } else if ((e.key === "n" || e.key === "N" || e.key === "ArrowRight") && inGame) {
        skip();
      } else return;
      show();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer.current);
    };
  }, [inGame, show, togglePause, skip]);

  return (
    <div
      data-testid="host-bar"
      onMouseEnter={show}
      className={`absolute inset-x-0 bottom-4 z-50 flex justify-center transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      <div className="glass flex items-center gap-3 rounded-chip px-5 py-3">
        {inGame && (
          <>
            <Button data-testid="host-pause" variant="secondary" size="sm" onClick={togglePause}>
              {paused ? "▶ Reprendre" : "⏸ Pause"}
            </Button>
            <Button data-testid="host-skip" variant="secondary" size="sm" onClick={skip}>
              ⏭ Passer
            </Button>
            {phase === "playing" && (
              <Button data-testid="host-addtime" variant="secondary" size="sm" onClick={() => void actions.addTime(10).catch(() => {})}>
                +10 s
              </Button>
            )}
          </>
        )}
        {phase !== "lobby" ? (
          <Button data-testid="host-lobby" variant="danger" size="sm" onClick={backToLobby}>
            Retour au lobby
          </Button>
        ) : (
          <span className="px-2 text-base text-ink-muted">Maître du jeu · Espace = pause · N = passer</span>
        )}
      </div>
    </div>
  );
}
