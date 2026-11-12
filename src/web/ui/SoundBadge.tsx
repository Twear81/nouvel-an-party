// Haut-parleur barré discret dans un coin de la TV tant que le navigateur n'autorise pas le son (avant le premier clic).
// Aucun texte : l'icône suffit. Reste dans le DOM (data-sound) pour que les tests lisent l'état du son.
import { useSoundState } from "../sound/hooks";
import { SpeakerOffIcon } from "./Icons";

export function SoundBadge({ visible }: { visible: boolean }) {
  const state = useSoundState();
  return (
    <div
      data-testid="sound-state"
      data-sound={state}
      className={`pointer-events-none absolute right-4 top-3 z-30 text-3xl text-ink-muted opacity-70 ${visible && state === "locked" ? "" : "hidden"}`}
    >
      <SpeakerOffIcon />
    </div>
  );
}
