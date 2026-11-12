// Petites scènes originales, ancrées dans l'illustration et jouées uniquement aux changements d'univers.
import type { SkinId } from "../../shared/skins";
import { SKIN_TIMING } from "../../shared/transitions";
import { RocketLeagueScene, animateRocketLeague } from "./signatures/RocketLeague";
import { LeagueOfLegendsScene, animateLeagueOfLegends } from "./signatures/LeagueOfLegends";
import { MarioOdysseyScene, animateMarioOdyssey } from "./signatures/MarioOdyssey";
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

/** Enveloppe d'apparition du calque de signature (les scènes Rocket League, League of Legends, Dofus, Mario et Resonance gèrent leur propre durée de vie). */
export function signatureEnvelope(skin: SkinId | null): SignatureFrame[] {
  if (skin === "rocket-league" || skin === "league-of-legends" || skin === "plague-tale" || skin === "dofus" || skin === "mario-odyssey") return [
    { at: 0, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs - 200, opacity: 0 }, { at: SKIN_TIMING.zoomOutEndMs, opacity: 1 },
    { at: SKIN_TIMING.plungeEndMs - 700, opacity: 1 }, { at: SKIN_TIMING.plungeEndMs, opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
  return [
    { at: 0, opacity: 0 }, { at: legacyTime(850), opacity: 0 }, { at: legacyTime(1200), opacity: 1 },
    { at: legacyTime(2900), opacity: 1 }, { at: legacyTime(3500), opacity: 0 }, { at: SKIN_TIMING.durationMs, opacity: 0 },
  ];
}

export function RoomSignature({ skin, players = [] }: { skin: SkinId | null; players?: DofusPlayer[] }) {
  const content = skin === "dofus" ? <DofusScene players={players} />
    : skin === "league-of-legends" ? <LeagueOfLegendsScene /> : skin === "rocket-league" ? <RocketLeagueScene />
      : skin === "mario-odyssey" ? <MarioOdysseyScene /> : skin === "plague-tale" ? <PlagueTaleScene /> : null;
  if (!content) return null;
  // Resonance rend ses propres couches (SVG des veines + éléments HTML) : pas de SVG englobant.
  if (skin === "plague-tale") return content;
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
  if (skin === "mario-odyssey") animateMarioOdyssey(root, animateNative);
}
