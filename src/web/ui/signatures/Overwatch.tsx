// Scène Overwatch : l'intro de « l'Action de la partie ». Bandes blanches, orange et bleues en biais, flash,
// gros carton, bandeau du joueur mis en avant, puis les bandes repassent. C'est une surimpression d'écran : elle vit
// hors de `.room-camera` (elle ne zoome pas avec la caméra) et a disparu avant le replongeon dans la TV.
// Couleurs et police : `.sig-ow` dans room.css. Tous les mouvements passent par `animate` (horloge de la scène).
import type { Profile } from "../../../shared/types";
import { SKIN_TIMING } from "../../../shared/transitions";
import { PlayerAvatar } from "../PlayerAvatar";
import type { Animate, SignatureFrame } from "../RoomSignature";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
export const OW_TIMING = {
  sweepIn: 1200,   // premier balayage : la pièce a été visible un court instant
  sweepOut: 3950,  // second balayage : efface le carton
  stripeTravel: 260, stripeStagger: 30, stripeHold: 20,
} as const;
const STRIPE_COUNT = 9;
const COVER = OW_TIMING.stripeTravel + (STRIPE_COUNT - 1) * OW_TIMING.stripeStagger; // écran entièrement couvert
const IN_COVER = OW_TIMING.sweepIn + COVER;
const OUT_COVER = OW_TIMING.sweepOut + COVER;

/** Le joueur mis en avant : déterministe (la TV qui recharge affiche le même). */
export function featuredPlayer<T>(players: T[], startedAt: number): T | null {
  return players.length ? players[Math.abs(Math.floor(startedAt)) % players.length]! : null;
}

export function OverwatchScene({ profile }: { profile: Profile | null }) {
  return (
    <div className="sig-ow" data-testid="transition-potg" aria-hidden="true">
      <div className="sig-ow-dim" data-room-motion="dim" />
      <div className="sig-ow-card">
        <div className="sig-ow-title" data-room-motion="title" data-testid="transition-potg-title">
          Action de la partie
        </div>
        {profile && (
          <div className="sig-ow-player" data-room-motion="player" data-testid="transition-potg-player">
            <div className="sig-ow-player-in">
              <PlayerAvatar profile={profile} size="xl" />
              <span className="sig-ow-name" data-testid="transition-potg-name">{profile.name}</span>
            </div>
          </div>
        )}
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

  // Carton : glisse et zoome en arrivant, dérive très légèrement, puis disparaît derrière le second balayage.
  const titleIn = IN_COVER + 40;
  animate(one("title"), [
    { at: 0, opacity: 0, transform: "translateX(-14cqw) scale(1.35)" },
    { at: titleIn, opacity: 0, transform: "translateX(-14cqw) scale(1.35)", easing: "cubic-bezier(.12, .9, .25, 1)" },
    { at: titleIn + 120, opacity: 1, transform: "translateX(-14cqw) scale(1.35)" },
    { at: titleIn + 520, opacity: 1, transform: "translateX(0cqw) scale(1)", easing: "linear" },
    { at: cut(OUT_COVER), opacity: 1, transform: "translateX(1.5cqw) scale(1.04)" },
    { at: OUT_COVER, opacity: 0, transform: "translateX(1.5cqw) scale(1.04)" },
    { at: D, opacity: 0, transform: "translateX(1.5cqw) scale(1.04)" },
  ]);

  // Bandeau du joueur : arrive de la droite après le carton.
  const playerIn = titleIn + 520;
  animate(one("player"), [
    { at: 0, opacity: 0, transform: "translateX(40cqw)" },
    { at: playerIn, opacity: 0, transform: "translateX(40cqw)", easing: "cubic-bezier(.12, .9, .25, 1)" },
    { at: playerIn + 50, opacity: 1, transform: "translateX(40cqw)" },
    { at: playerIn + 480, opacity: 1, transform: "translateX(0cqw)", easing: "linear" },
    { at: cut(OUT_COVER), opacity: 1, transform: "translateX(-1cqw)" },
    { at: OUT_COVER, opacity: 0, transform: "translateX(-1cqw)" },
    { at: D, opacity: 0, transform: "translateX(-1cqw)" },
  ]);
}
