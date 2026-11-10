// Petites scènes originales, ancrées dans l'illustration et jouées uniquement aux changements d'univers.
import type { SkinId } from "../../shared/skins";
import { SKIN_TIMING } from "../../shared/transitions";
import { RocketLeagueScene, animateRocketLeague } from "./signatures/RocketLeague";
import { LeagueOfLegendsScene, animateLeagueOfLegends } from "./signatures/LeagueOfLegends";
import { PlagueTaleScene, animatePlagueTale } from "./signatures/PlagueTale";
import { DofusActors, DofusScene, animateDofus, type DofusPlayer } from "./signatures/Dofus";

export type SignatureFrame = Keyframe & { at: number };
export type Animate = (element: Element | null, frames: SignatureFrame[]) => void;

/**
 * Les signatures historiques ont été écrites sur 4 s (scène visible de 1000 à 3500 ms) : leurs instants sont
 * étirés pour occuper la fenêtre de 6 s (scène visible de zoomOutEndMs à plungeStartMs), sans les redessiner.
 */
export function legacyTime(at: number): number {
  const start = SKIN_TIMING.zoomOutEndMs, end = SKIN_TIMING.plungeStartMs;
  if (at <= 1000) return at;
  if (at <= 3500) return start + (at - 1000) * (end - start) / 2500;
  return end + (at - 3500) * (SKIN_TIMING.durationMs - end) / 500;
}

/** Enveloppe d'apparition du calque de signature (les scènes Rocket League, League of Legends, Dofus et Resonance gèrent leur propre durée de vie). */
export function signatureEnvelope(skin: SkinId | null): SignatureFrame[] {
  if (skin === "rocket-league" || skin === "league-of-legends" || skin === "plague-tale" || skin === "dofus") return [
    { at: 0, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs - 200, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs, opacity: 1 },
    { at: SKIN_TIMING.plungeEndMs - 700, opacity: 1 }, { at: SKIN_TIMING.plungeEndMs, opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
  return [
    { at: 0, opacity: 0 }, { at: legacyTime(850), opacity: 0 }, { at: legacyTime(1200), opacity: 1 },
    { at: legacyTime(2900), opacity: 1 }, { at: legacyTime(3500), opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
}

const COINS = [[687, 633], [773, 571], [857, 495], [852, 424]];
function MarioScene() {
  return <>
    {COINS.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}>
      <g data-room-motion="coin" className="sig-coin"><circle r="25" /><ellipse rx="16" ry="20" /><path d="M0-12V12" /></g>
    </g>)}
    <g transform="translate(630 680)">
      <g data-room-motion="cap-flight" className="sig-cap">
        <path className="sig-cap-body" d="M-73 10C-81-52-48-94 2-94C52-94 82-62 78 12L62 31H-61Z" />
        <path className="sig-cap-brim" d="M-86 9Q-19-11 75 7Q125 17 110 36Q24 66-88 38Q-112 30-86 9Z" />
        <path className="sig-cap-shine" d="M-51-46Q-32-73-9-74" />
        <ellipse className="sig-cap-eye" cx="-23" cy="-27" rx="18" ry="28" /><ellipse className="sig-cap-eye" cx="18" cy="-27" rx="18" ry="28" />
        <ellipse className="sig-cap-iris" cx="-17" cy="-24" rx="9" ry="17" /><ellipse className="sig-cap-iris" cx="24" cy="-24" rx="9" ry="17" />
        <circle className="sig-cap-eye" cx="-14" cy="-30" r="3" /><circle className="sig-cap-eye" cx="27" cy="-30" r="3" />
      </g>
    </g>
  </>;
}

export function RoomSignature({ skin, players = [] }: { skin: SkinId | null; players?: DofusPlayer[] }) {
  const content = skin === "dofus" ? <DofusScene players={players} />
    : skin === "league-of-legends" ? <LeagueOfLegendsScene /> : skin === "rocket-league" ? <RocketLeagueScene />
      : skin === "mario-odyssey" ? <MarioScene /> : skin === "plague-tale" ? <PlagueTaleScene /> : null;
  if (!content) return null;
  return <>
    <svg className="room-signature-art" viewBox="0 0 1672 941" aria-hidden="true" data-testid="transition-signature" data-signature={skin}>{content}</svg>
    {skin === "dofus" && <DofusActors players={players} />}
  </>;
}

/** Les effets natifs sont ajoutés à la même liste que la caméra : aucun temps autonome. */
export function animateRoomSignature(root: Element | null, skin: SkinId | null, reduced: boolean, animateNative: Animate) {
  if (!root) return;
  if (skin === "rocket-league") { animateRocketLeague(root, reduced, animateNative); return; }
  if (skin === "league-of-legends") { animateLeagueOfLegends(root, reduced, animateNative); return; }
  if (skin === "plague-tale") { animatePlagueTale(root, reduced, animateNative); return; }
  if (skin === "dofus") { animateDofus(root, animateNative); return; }
  const animate: Animate = (element, frames) => animateNative(element, frames.map((frame) => ({ ...frame, at: legacyTime(frame.at) })));
  const select = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => root.querySelectorAll(`[data-room-motion="${name}"]`);
  if (skin === "mario-odyssey") {
    animate(select("cap-flight"), reduced ? [
      { at: 0, opacity: 0, transform: "translate(175px, -20px)" }, { at: 1200, opacity: 1, transform: "translate(175px, -20px)" },
      { at: 2900, opacity: 1, transform: "translate(175px, -20px)" }, { at: 4000, opacity: 0, transform: "translate(175px, -20px)" },
    ] : [
      { at: 0, opacity: 0, transform: "translate(-90px, 45px) rotate(-18deg) scale(.8)" }, { at: 950, opacity: 0, transform: "translate(-90px, 45px) rotate(-18deg) scale(.8)" },
      { at: 1300, opacity: 1, transform: "translate(20px, -30px) rotate(-8deg) scale(1)" }, { at: 1750, opacity: 1, transform: "translate(185px, -145px) rotate(12deg) scale(1)" },
      { at: 2200, opacity: 1, transform: "translate(270px, -260px) rotate(26deg) scale(.75)" }, { at: 2750, opacity: .85, transform: "translate(119px, -294px) rotate(-6deg) scale(.25)" },
      { at: 3000, opacity: 0, transform: "translate(119px, -294px) scale(.15)" }, { at: 4000, opacity: 0, transform: "translate(119px, -294px) scale(.15)" },
    ]);
    all("coin").forEach((element, i) => animate(element, [
      { at: 0, opacity: 0, transform: "scaleX(1)" }, { at: 1100 + i * 140, opacity: 0, transform: "scaleX(1)" },
      { at: 1280 + i * 140, opacity: 1, transform: reduced ? "scaleX(1)" : "scaleX(.35)" },
      { at: 1700 + i * 140, opacity: 1, transform: "scaleX(1)" }, { at: 2100 + i * 140, opacity: 0, transform: "scaleX(1)" }, { at: 4000, opacity: 0, transform: "scaleX(1)" },
    ]));
  }
}
