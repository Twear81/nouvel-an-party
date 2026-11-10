// Petites scènes originales, ancrées dans l'illustration et jouées uniquement aux changements d'univers.
import type { SkinId } from "../../shared/skins";
import { SKIN_TIMING } from "../../shared/transitions";
import { RocketLeagueScene, animateRocketLeague } from "./signatures/RocketLeague";
import { LeagueOfLegendsScene, animateLeagueOfLegends } from "./signatures/LeagueOfLegends";
import { PlagueTaleScene, animatePlagueTale } from "./signatures/PlagueTale";

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

/** Enveloppe d'apparition du calque de signature (les scènes Rocket League, League of Legends et Resonance gèrent leur propre durée de vie). */
export function signatureEnvelope(skin: SkinId | null): SignatureFrame[] {
  if (skin === "rocket-league" || skin === "league-of-legends" || skin === "plague-tale") return [
    { at: 0, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs - 200, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs, opacity: 1 },
    { at: SKIN_TIMING.plungeEndMs - 700, opacity: 1 }, { at: SKIN_TIMING.plungeEndMs, opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
  return [
    { at: 0, opacity: 0 }, { at: legacyTime(850), opacity: 0 }, { at: legacyTime(1200), opacity: 1 },
    { at: legacyTime(2900), opacity: 1 }, { at: legacyTime(3500), opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
}

const SPARKLES = [[-110, -10], [-90, -110], [-35, -135], [65, -120], [110, -45], [95, 45], [-70, 65]];

function DofusScene() {
  return <>
    <g className="sig-grid" data-room-motion="floor">
      {Array.from({ length: 25 }, (_, i) => {
        const x = i % 5, y = Math.floor(i / 5);
        const left = 805 + (x - y) * 66, top = 660 + (x + y) * 19;
        return <path key={i} d={`M${left} ${top}l66 19-66 19-66-19Z`} />;
      })}
    </g>
    <ellipse className="sig-green-aura" cx="805" cy="751" rx="115" ry="32" data-room-motion="aura" />
    <g transform="translate(805 675)">
      <g data-room-motion="egg" className="sig-egg">
        <path className="sig-egg-body" d="M0-94C44-94 64-42 61 7C58 56 37 82 0 85C-37 82-58 56-61 7C-64-42-44-94 0-94Z" />
        <path className="sig-egg-mark" d="M-33-25Q0-57 33-25Q4-5 26 23Q-7 50-31 20Q-8 4-33-25ZM-18 60Q4 47 22 56" />
        <path className="sig-egg-shine" d="M-35-54Q-23-75-12-74" />
      </g>
      {SPARKLES.map(([x, y], i) => <path key={i} data-room-motion="sparkle" className="sig-sparkle" d={`M${x} ${y - 9}q0 9 9 9q-9 0-9 9q0-9-9-9q9 0 9-9Z`} />)}
    </g>
  </>;
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

export function RoomSignature({ skin }: { skin: SkinId | null }) {
  const content = skin === "dofus" ? <DofusScene />
    : skin === "league-of-legends" ? <LeagueOfLegendsScene /> : skin === "rocket-league" ? <RocketLeagueScene />
      : skin === "mario-odyssey" ? <MarioScene /> : skin === "plague-tale" ? <PlagueTaleScene /> : null;
  return content && <svg className="room-signature-art" viewBox="0 0 1672 941" aria-hidden="true" data-testid="transition-signature" data-signature={skin}>{content}</svg>;
}

/** Les effets natifs sont ajoutés à la même liste que la caméra : aucun temps autonome. */
export function animateRoomSignature(root: Element | null, skin: SkinId | null, reduced: boolean, animateNative: Animate) {
  if (!root) return;
  if (skin === "rocket-league") { animateRocketLeague(root, reduced, animateNative); return; }
  if (skin === "league-of-legends") { animateLeagueOfLegends(root, reduced, animateNative); return; }
  if (skin === "plague-tale") { animatePlagueTale(root, reduced, animateNative); return; }
  const animate: Animate = (element, frames) => animateNative(element, frames.map((frame) => ({ ...frame, at: legacyTime(frame.at) })));
  const select = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => root.querySelectorAll(`[data-room-motion="${name}"]`);
  const appear = (element: Element | null, delay = 0) => animate(element, [
    { at: 0, opacity: 0 }, { at: 1000 + delay, opacity: 0 }, { at: 1250 + delay, opacity: 1 },
    { at: 3000, opacity: 1 }, { at: 3500, opacity: 0 }, { at: 4000, opacity: 0 },
  ]);
  appear(select("floor"));
  if (skin === "dofus") {
    animate(select("egg"), reduced ? [
      { at: 0, opacity: 0 }, { at: 1050, opacity: 0 }, { at: 1350, opacity: 1 }, { at: 3000, opacity: 1 }, { at: 4000, opacity: 0 },
    ] : [
      { at: 0, opacity: 0, transform: "translateY(35px) scale(.7)" }, { at: 1050, opacity: 0, transform: "translateY(35px) scale(.7)" },
      { at: 1450, opacity: 1, transform: "translateY(-5px) scale(1.05)" }, { at: 2200, opacity: 1, transform: "translateY(-18px) scale(1)" },
      { at: 3100, opacity: 0, transform: "translateY(-65px) scale(.85)" }, { at: 4000, opacity: 0, transform: "translateY(-65px) scale(.85)" },
    ]);
    appear(select("aura"));
    all("sparkle").forEach((element, i) => animate(element, [
      { at: 0, opacity: 0 }, { at: 1250 + i * 70, opacity: 0 }, { at: 1450 + i * 70, opacity: 1 },
      { at: 1950 + i * 70, opacity: 0 }, { at: 4000, opacity: 0 },
    ]));
  } else if (skin === "mario-odyssey") {
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
