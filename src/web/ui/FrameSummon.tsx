// Invocation d'un cadre (clin d'œil gacha) : un gros bouton, une courte animation de tirage dont la lumière annonce la
// rareté (R bleu, SR violet, SSR or), puis le cadre obtenu apparaît sur l'avatar. Relancer à volonté.
// Le tirage est un choix de profil (pas un état de jeu) : Math.random côté téléphone, le serveur valide seulement l'id.
// Animations : transform/opacity sur des calques à dégradé fixe (voir .summon-* dans theme.css), rien de lourd.
import { useEffect, useRef, useState } from "react";
import type { Profile } from "../../shared/types";
import { drawFrame, frameById, FRAMES, RARITY_STARS, type FrameOption } from "../theme/profile-options";
import { Button } from "./Button";
import { haptique } from "./haptique";
import { PlayerAvatar } from "./PlayerAvatar";

/** Durée de l'animation de tirage avant l'apparition du cadre. */
export const SUMMON_MS = 1500;

/** Pour les tests et la mise au point : `localStorage["summon-force"] = <id du cadre>` impose le prochain tirage. */
function forcedFrame(): FrameOption | null {
  try {
    const id = localStorage.getItem("summon-force");
    return FRAMES.find((f) => f.id === id) ?? null;
  } catch {
    return null;
  }
}

interface Props {
  /** Profil en cours d'édition : l'avatar et la couleur servent à montrer le cadre. */
  profile: Profile;
  onFrame: (frame: string) => void;
  /** Vrai pendant le tirage (le parent peut bloquer la validation du profil). */
  onBusy?: (busy: boolean) => void;
}

export function FrameSummon({ profile, onFrame, onBusy }: Props) {
  const [phase, setPhase] = useState<"idle" | "summoning" | "done">("idle");
  const [pending, setPending] = useState<FrameOption | null>(null);
  const [draws, setDraws] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const current = frameById(profile.frame);
  const shown = phase === "summoning" && pending ? pending : current;

  const summon = () => {
    if (phase === "summoning") return;
    const result = forcedFrame() ?? drawFrame();
    setPending(result);
    setPhase("summoning");
    onBusy?.(true);
    timer.current = setTimeout(() => {
      onFrame(result.id);
      setDraws((n) => n + 1);
      setPhase("done");
      onBusy?.(false);
      if (result.rarity !== "R") haptique(result.rarity === "SSR" ? 100 : 40);
    }, SUMMON_MS);
  };

  const rarity = phase === "summoning" ? shown.rarity : current.rarity;
  return (
    <div data-testid="frame-summon" data-ui="frame-summon" data-phase={phase} data-frame={phase === "summoning" ? "" : current.id} data-rarity={rarity} className="flex flex-col gap-3">
      <div data-ui="summon-stage" data-phase={phase} data-rarity={rarity} className="summon-stage">
        <div data-ui="summon-beam" className="summon-beam" />
        {phase === "done" && <div data-ui="summon-rays" className="summon-rays" key={`rays-${draws}`} />}
        {phase === "done" && <div data-ui="summon-flash" className="summon-flash" key={`flash-${draws}`} />}
        <div className="summon-avatar relative z-10 flex items-center justify-center">
          {phase === "summoning" ? (
            <div data-ui="summon-card" className="summon-card" aria-hidden>
              <span className="summon-card-mark">✦</span>
            </div>
          ) : (
            <div key={`avatar-${draws}`} className={phase === "done" ? "summon-pop" : ""}>
              <PlayerAvatar profile={profile} size="lg" />
            </div>
          )}
        </div>
        <div
          data-testid="frame-result"
          data-ui="summon-result"
          data-frame={phase === "summoning" ? "" : current.id}
          data-rarity={phase === "summoning" ? "" : current.rarity}
          className="summon-result relative z-10"
          style={{ visibility: phase === "summoning" ? "hidden" : "visible" }}
        >
          <div className="summon-stars" aria-hidden>
            {Array.from({ length: RARITY_STARS[current.rarity] }, (_, i) => (
              <span key={`${draws}-${i}`} className="summon-star" style={{ animationDelay: `${phase === "done" ? 0.25 + i * 0.1 : 0}s` }}>★</span>
            ))}
          </div>
          <div className="summon-name">
            <span data-ui="rarity-tag" data-rarity={current.rarity} className="summon-tag">{current.rarity}</span>
            <span data-testid="frame-name">{current.label}</span>
          </div>
        </div>
      </div>
      <Button type="button" size="lg" block data-testid="frame-summon-button" disabled={phase === "summoning"} onClick={summon}>
        {phase === "summoning" ? "Invocation…" : draws === 0 ? "✨ Invoquer" : "🔄 Relancer"}
      </Button>
    </div>
  );
}
