// Scène Overwatch : l'intro de « l'Action de la partie ». Bandes blanches, orange et bleues en biais, flash,
// gros carton, bandeau du joueur mis en avant, puis les bandes repassent. C'est une surimpression d'écran : elle vit
// hors de `.room-camera` (elle ne zoome pas avec la caméra) et a disparu avant le replongeon dans la TV.
// Couleurs et police : `.sig-ow` dans room.css. Tous les mouvements passent par `animate` (horloge de la scène).
import type { CSSProperties } from "react";
import type { Profile } from "../../../shared/types";
import { SKIN_TIMING } from "../../../shared/transitions";
import { AVATARS } from "../../theme/profile-options";
import type { Animate, SignatureFrame } from "../RoomSignature";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
export const OW_TIMING = {
  sweepIn: 1100,   // premier balayage : la pièce a été visible un court instant
  sweepOut: 3500,  // second balayage : efface le carton ; les bandes sont parties avant le replongeon (4600)
  stripeTravel: 260, stripeStagger: 30, stripeHold: 20,
} as const;
const STRIPE_COUNT = 9;
const COVER = OW_TIMING.stripeTravel + (STRIPE_COUNT - 1) * OW_TIMING.stripeStagger; // écran entièrement couvert
const IN_COVER = OW_TIMING.sweepIn + COVER;
const OUT_COVER = OW_TIMING.sweepOut + COVER;

/** Le libellé de l'avatar (« Renard »), ou `null` si l'avatar du profil est introuvable. */
function avatarLabel(profile: Profile): { label: string; emoji: string } | null {
  const preset = AVATARS.find((a) => a.id === profile.avatar.id);
  return preset ? { label: preset.label, emoji: preset.emoji } : null;
}

/** Taille du pseudo (cqw) : grande, réduite pour qu'un pseudo de 16 caractères tienne dans la moitié gauche. */
const nameSize = (name: string) => Math.min(11, 44 / (Math.max(name.length, 1) * .46));

/** `profile` : la vedette choisie par le serveur (`scene.spotlightPlayerId`) ; `null` = titre seul. */
export function OverwatchScene({ profile, playerId }: { profile: Profile | null; playerId: string | null }) {
  const avatar = profile ? avatarLabel(profile) : null;
  return (
    <div className="sig-ow" data-testid="transition-potg" aria-hidden="true">
      <div className="sig-ow-dim" data-room-motion="dim" />
      {profile && (
        <div className="sig-ow-hero" data-room-motion="hero" style={{ "--sig-ow-glow": profile.color } as CSSProperties}>
          <div className="sig-ow-hero-in" data-room-motion="hero-cam">
            <span className="sig-ow-hero-face">{avatar?.emoji ?? "?"}</span>
          </div>
        </div>
      )}
      <div className="sig-ow-card" data-room-motion="card">
        <div className="sig-ow-text" data-room-motion="text">
          <div className="sig-ow-title" data-testid="transition-potg-title">Action de la partie</div>
          {profile && (
            <div data-testid="transition-potg-player" data-player-id={playerId ?? undefined}>
              <div className="sig-ow-name" data-testid="transition-potg-name" style={{ fontSize: `${nameSize(profile.name)}cqw` }}>{profile.name}</div>
              {avatar && <div className="sig-ow-role" data-testid="transition-potg-role">En tant que {avatar.label}</div>}
            </div>
          )}
        </div>
      </div>
      <div className="sig-ow-flash" data-room-motion="flash" />
      <div className="sig-ow-stripes">
        {Array.from({ length: STRIPE_COUNT }, (_, i) => (
          <div key={i} className="sig-ow-stripe" data-room-motion="stripe" data-tone={i % 3 === 1 ? "orange" : i % 3 === 2 ? "blue" : "white"} />
        ))}
      </div>
    </div>
  );
}

const fade = (...points: [number, number][]): SignatureFrame[] => [{ at: 0, opacity: points[0]![1] }, ...points.map(([at, opacity]) => ({ at, opacity })), { at: D, opacity: points.at(-1)![1] }]
  .filter((frame, i, all) => i === 0 || frame.at > all[i - 1]!.at);

export function animateOverwatch(root: Element, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  const cut = (at: number) => at - 1;
  const { stripeTravel: travel, stripeStagger: stagger, stripeHold: hold } = OW_TIMING;
  const left = "translateX(-125%)", right = "translateX(125%)", mid = "translateX(0%)";

  // Bandes : chacune entre par la gauche, couvre l'écran avec ses voisines, puis sort par la droite. Deux passages.
  all("stripe").forEach((element, i) => {
    const frames: SignatureFrame[] = [{ at: 0, transform: left }];
    for (const start of [OW_TIMING.sweepIn, OW_TIMING.sweepOut]) {
      const enter = start + i * stagger, leave = start + COVER + hold + i * stagger;
      frames.push(
        { at: enter, transform: left, easing: "cubic-bezier(.2, .8, .3, 1)" }, { at: enter + travel, transform: mid },
        { at: leave, transform: mid, easing: "cubic-bezier(.7, 0, .9, .4)" }, { at: leave + travel, transform: right },
        { at: leave + travel + 1, transform: left },
      );
    }
    frames.push({ at: D, transform: left });
    animate(element, frames);
  });

  // Flash blanc quand le premier balayage couvre l'écran, plus discret au second pour un raccord net.
  animate(one("flash"), fade([IN_COVER - 40, 0], [IN_COVER + 60, .9], [IN_COVER + 420, 0], [OUT_COVER - 40, 0], [OUT_COVER + 40, .5], [OUT_COVER + 300, 0]));

  // Fond assombri : posé derrière les bandes, retiré derrière elles.
  animate(one("dim"), fade([cut(IN_COVER), 0], [IN_COVER, 1], [cut(OUT_COVER), 1], [OUT_COVER, 0]));

  // Texte : entrée rapide par la gauche, puis glissement lent vers la droite jusqu'au second balayage.
  const textIn = IN_COVER + 40;
  const drift = "translateX(4cqw)";
  animate(one("text"), [
    { at: 0, opacity: 0, transform: "translateX(-9cqw)" },
    { at: textIn, opacity: 0, transform: "translateX(-9cqw)", easing: "cubic-bezier(.12, .9, .25, 1)" },
    { at: textIn + 90, opacity: 1, transform: "translateX(-9cqw)" },
    { at: textIn + 380, opacity: 1, transform: "translateX(0cqw)", easing: "linear" },
    { at: cut(OUT_COVER), opacity: 1, transform: drift },
    { at: OUT_COVER, opacity: 0, transform: drift },
    { at: D, opacity: 0, transform: drift },
  ]);

  // Personnage : arrive de la droite, puis mouvement de caméra lent (zoom et dérive).
  const heroEnter = "translateX(14cqw)";
  animate(one("hero"), [
    { at: 0, opacity: 0, transform: heroEnter },
    { at: textIn - 60, opacity: 0, transform: heroEnter, easing: "cubic-bezier(.12, .9, .25, 1)" },
    { at: textIn + 140, opacity: 1, transform: heroEnter },
    { at: textIn + 520, opacity: 1, transform: "translateX(0cqw)" },
    { at: cut(OUT_COVER), opacity: 1, transform: "translateX(0cqw)" },
    { at: OUT_COVER, opacity: 0, transform: "translateX(0cqw)" },
    { at: D, opacity: 0, transform: "translateX(0cqw)" },
  ]);
  animate(one("hero-cam"), [
    { at: 0, transform: "scale(1) translate(0cqw, 0cqw)", easing: "linear" },
    { at: textIn, transform: "scale(1) translate(0cqw, 0cqw)", easing: "linear" },
    { at: OUT_COVER, transform: "scale(1.1) translate(-1.5cqw, -1cqw)" },
    { at: D, transform: "scale(1.1) translate(-1.5cqw, -1cqw)" },
  ]);
}
