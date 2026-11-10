// Scène Rocket League : une Octane arrive en boost, saute, frappe le gros ballon qui file dans la TV, et le but explose.
// Tout est dessiné autour de l'origine (0,0) puis placé par `transform` (voir `.sig-rl` dans room.css) :
// les positions sont donc des coordonnées absolues du viewBox de la pièce (1672×941).
import type { CSSProperties } from "react";
import { SKIN_TIMING } from "../../../shared/transitions";
import type { Animate, SignatureFrame } from "../RoomSignature";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  start: SKIN_TIMING.zoomOutEndMs, takeoff: 1850, impact: 2300, goal: 3100,
  boostOff: 3000, carOut: 3350, fxEnd: SKIN_TIMING.plungeStartMs + 500,
} as const;
const TV = { x: 749, y: 386, left: 627, top: 322, width: 244, height: 129 } as const;
const BALL = { x: 805, y: 652, r: 75 } as const;
const GROUND = 801;      // sol sous les roues de la voiture
const CAR_SCALE = 1.15;
const WHEEL_BOTTOM = 70 * CAR_SCALE; // distance centre voiture → bas des pneus

// Explosion : paramètres déterministes (aucun hasard).
const RAYS = Array.from({ length: 18 }, (_, i) => ({ angle: i * 20 + (i % 2) * 4, length: 420 + ((i * 5) % 7) * 55, width: 16 + (i % 3) * 7, orange: i % 2 === 1 }));
const SPARKS = Array.from({ length: 34 }, (_, i) => {
  const angle = (i * 137.508 * Math.PI) / 180;
  return { dx: Math.cos(angle) * (230 + ((i * 53) % 9) * 62), dy: Math.sin(angle) * (230 + ((i * 53) % 9) * 62) + 70,
    size: 5 + (i % 4) * 3, tone: ["blue", "orange", "white"][i % 3]!, life: 1000 + (i % 5) * 140, shard: i % 2 === 0 };
});
const hex = (cx: number, cy: number, r: number) =>
  `M${[0, 1, 2, 3, 4, 5].map((k) => `${(cx + r * Math.cos(k * Math.PI / 3)).toFixed(1)} ${(cy + r * Math.sin(k * Math.PI / 3)).toFixed(1)}`).join("L")}Z`;
const HEX_R = 33;
const HEX_STEP = HEX_R * Math.sqrt(3) + 2;
const HEX_CELLS = [[0, 0], ...[30, 90, 150, 210, 270, 330].map((a) => [Math.cos(a * Math.PI / 180) * HEX_STEP, Math.sin(a * Math.PI / 180) * HEX_STEP]),
  ...[0, 60, 120, 180, 240, 300].map((a) => [Math.cos(a * Math.PI / 180) * HEX_STEP * 1.9, Math.sin(a * Math.PI / 180) * HEX_STEP * 1.9])] as [number, number][];

const Stop = ({ at, tone, alpha = 1 }: { at: number; tone: string; alpha?: number }) =>
  <stop offset={at} style={{ stopColor: `var(--sig-rl-${tone})`, stopOpacity: alpha } as CSSProperties} />;

function Defs() {
  return <defs>
    <linearGradient id="rl-body" x1="0" y1="0" x2="0" y2="1">
      <Stop at={0} tone="blue-light" /><Stop at={.35} tone="blue" /><Stop at={1} tone="blue-dark" />
    </linearGradient>
    <linearGradient id="rl-glass" x1="0" y1="0" x2="1" y2="1">
      <Stop at={0} tone="glass-light" /><Stop at={.45} tone="glass" /><Stop at={1} tone="navy" />
    </linearGradient>
    <linearGradient id="rl-stripe" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="orange-light" /><Stop at={.5} tone="orange" /><Stop at={1} tone="orange-dark" />
    </linearGradient>
    <radialGradient id="rl-tire" cx=".5" cy=".5" r=".5">
      <Stop at={.6} tone="tire" /><Stop at={.9} tone="tire-light" /><Stop at={1} tone="tire" />
    </radialGradient>
    <radialGradient id="rl-rim" cx=".35" cy=".3" r=".8">
      <Stop at={0} tone="steel-light" /><Stop at={.55} tone="steel" /><Stop at={1} tone="steel-dark" />
    </radialGradient>
    <linearGradient id="rl-flame" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="flame-core" /><Stop at={.25} tone="orange-light" /><Stop at={.6} tone="orange" /><Stop at={1} tone="orange-dark" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-flame-core" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="white" /><Stop at={.5} tone="flame-core" /><Stop at={1} tone="orange-light" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-trail-blue" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="blue-light" alpha={.9} /><Stop at={1} tone="blue" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-trail-orange" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="orange-light" alpha={.9} /><Stop at={1} tone="orange" alpha={0} />
    </linearGradient>
    <radialGradient id="rl-ball-base" cx=".35" cy=".3" r=".85">
      <Stop at={0} tone="white" /><Stop at={.45} tone="steel-light" /><Stop at={1} tone="steel" />
    </radialGradient>
    <radialGradient id="rl-ball-shade" cx=".5" cy=".5" r=".5">
      <Stop at={.5} tone="navy" alpha={0} /><Stop at={.85} tone="navy" alpha={.35} /><Stop at={1} tone="navy" alpha={.75} />
    </radialGradient>
    <radialGradient id="rl-ball-halo" cx=".5" cy=".5" r=".5">
      <Stop at={.45} tone="blue-light" alpha={.65} /><Stop at={.7} tone="blue" alpha={.25} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-ball-spec" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" alpha={.95} /><Stop at={1} tone="white" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-burst" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" /><Stop at={.3} tone="blue-light" alpha={.9} /><Stop at={.65} tone="blue" alpha={.4} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-flash" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" alpha={.95} /><Stop at={.4} tone="blue-light" alpha={.45} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-impact" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" /><Stop at={.35} tone="orange-light" alpha={.9} /><Stop at={1} tone="orange" alpha={0} />
    </radialGradient>
    <linearGradient id="rl-ray-blue" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="white" /><Stop at={.2} tone="blue-light" /><Stop at={.6} tone="blue" alpha={.8} /><Stop at={1} tone="blue" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-ray-orange" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="white" /><Stop at={.2} tone="orange-light" /><Stop at={.6} tone="orange" alpha={.85} /><Stop at={1} tone="orange" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-screen" x1="0" y1="0" x2="0" y2="1">
      <Stop at={0} tone="white" /><Stop at={1} tone="blue-light" />
    </linearGradient>
    <clipPath id="rl-ball-clip"><circle r={BALL.r} /></clipPath>
  </defs>;
}

function Wheel({ x, r, spoke }: { x: number; r: number; spoke: string }) {
  return <g transform={`translate(${x} 36)`}>
    <circle className="sig-rl-arch" r={r + 7} />
    <circle className="sig-rl-tire" r={r} />
    <circle className="sig-rl-tire-wall" r={r - 4} />
    <circle className="sig-rl-rim" r={r * .62} />
    <g data-room-motion={spoke}>
      {[0, 72, 144, 216, 288].map((a) => <path key={a} className="sig-rl-spoke" transform={`rotate(${a})`} d={`M-3.5 -2L-5 ${-r * .6}L5 ${-r * .6}L3.5 -2Z`} />)}
    </g>
    <circle className="sig-rl-rim-glow" r={r * .64} />
    <circle className="sig-rl-hub" r={5} />
  </g>;
}

function Car() {
  return <g data-room-motion="car">
    <g transform={`scale(${CAR_SCALE})`}>
      {/* Traînée de boost derrière la voiture */}
      <path data-room-motion="trail" className="sig-rl-trail-blue" d="M150 -6C300 -22 470 18 820 2C470 40 300 36 150 26Z" />
      <path data-room-motion="trail" className="sig-rl-trail-orange" d="M150 6C280 0 420 22 640 12C420 34 280 30 150 22Z" />
      {/* Flammes de boost */}
      <g data-room-motion="flame" className="sig-rl-flame">
        <path className="sig-rl-flame-outer" d="M150 2C195 -12 270 -8 380 14C270 38 195 32 150 28Z" />
        <path className="sig-rl-flame-core" d="M150 8C185 1 240 5 300 14C240 25 185 25 150 22Z" />
      </g>
      {/* Aileron */}
      <path className="sig-rl-wing-post" d="M118 -16L124 -78L132 -78L130 -16Z" />
      <path className="sig-rl-wing" d="M96 -90L162 -90Q170 -90 170 -82L170 -66L98 -66Z" />
      <path className="sig-rl-wing-edge" d="M96 -90L170 -90" />
      {/* Carrosserie : capot long et bas, cabine reculée, gros hayon */}
      <path className="sig-rl-body" d="M-152 32L-154 10Q-153 2 -144 0L-84 -8L-36 -40Q-31 -45 -22 -45L36 -45Q48 -45 55 -38L96 -14L140 -16Q152 -16 154 -6L154 32Q154 38 146 38L-146 38Q-152 38 -152 32Z" />
      <path className="sig-rl-rocker" d="M-150 29L150 29L150 36Q150 38 146 38L-146 38Q-150 38 -150 34Z" />
      <path className="sig-rl-stripe" d="M-148 10L120 10L132 19L-148 19Z" />
      <path className="sig-rl-glass" d="M-58 -17L-33 -38Q-30 -41 -22 -41L34 -41Q42 -41 47 -36L80 -17Z" />
      <path className="sig-rl-pillar" d="M12 -41L20 -41L24 -17L16 -17Z" />
      <path className="sig-rl-glass-shine" d="M-46 -19L-30 -35L-12 -35L-26 -19Z" />
      <path className="sig-rl-seam" d="M-34 -14L-36 27M62 -14L66 27" />
      <path className="sig-rl-roof-light" d="M-33 -43Q-30 -45 -22 -45L36 -45Q46 -45 52 -40" />
      <path className="sig-rl-hood-light" d="M-146 -2L-84 -9" />
      <path className="sig-rl-headlight" d="M-153 3L-128 -1L-131 10L-154 13Z" />
      <path className="sig-rl-taillight" d="M149 -6L154 -6L154 8L149 8Z" />
      <Wheel x={-92} r={33} spoke="wheel-front" />
      <Wheel x={96} r={34} spoke="wheel-rear" />
    </g>
  </g>;
}

export function RocketLeagueScene() {
  return <g className="sig-rl">
    <Defs />
    {/* Ombres portées */}
    <ellipse data-room-motion="car-shadow" className="sig-rl-shadow" rx="190" ry="19" />
    <ellipse data-room-motion="ball-shadow" className="sig-rl-shadow" rx="78" ry="12" />
    <ellipse data-room-motion="ground-glow" className="sig-rl-ground-glow" rx="230" ry="26" />
    {/* Ballon de Rocket League */}
    {[2, 1].map((n) => <circle key={n} data-room-motion="ball-ghost" data-ghost={n} className="sig-rl-ghost" r={BALL.r} />)}
    <g data-room-motion="ball">
      <circle className="sig-rl-halo" r="150" />
      <circle className="sig-rl-ball-base" r={BALL.r} />
      <g clipPath="url(#rl-ball-clip)">
        <g data-room-motion="ball-spin">
          {HEX_CELLS.map(([cx, cy], i) => <path key={i} className={i === 0 ? "sig-rl-hex sig-rl-hex-core" : i < 7 ? "sig-rl-hex" : "sig-rl-hex sig-rl-hex-far"} d={hex(cx! - 10, cy! - 6, HEX_R)} />)}
        </g>
      </g>
      <circle className="sig-rl-ball-shade" r={BALL.r} />
      <ellipse className="sig-rl-ball-spec" cx="-26" cy="-32" rx="30" ry="19" transform="rotate(-35 -26 -32)" />
      <circle className="sig-rl-ball-rim" r={BALL.r} />
      <circle className="sig-rl-ball-rim-outer" r={BALL.r + 4} />
    </g>
    <Car />
    {/* Impact */}
    <g data-room-motion="impact">
      <circle className="sig-rl-impact" r="110" />
      <path className="sig-rl-impact-star" d="M0-120L16-30L110-60L34-6L120 40L26 28L10 120L-6 34L-90 84L-34 10L-130-30L-28-24Z" />
    </g>
    {/* But : écran de la TV et explosion bleue et orange */}
    <rect data-room-motion="dim" className="sig-rl-dim" x="-200" y="-200" width="2072" height="1341" />
    <rect data-room-motion="tv-glow" className="sig-rl-tv-glow" x={TV.left} y={TV.top} width={TV.width} height={TV.height} rx="6" />
    <circle data-room-motion="flash" className="sig-rl-flash" r="700" />
    <circle data-room-motion="burst" className="sig-rl-burst" r="150" />
    <g data-room-motion="rays">
      {RAYS.map((ray, i) => <path key={i} className={ray.orange ? "sig-rl-ray sig-rl-ray-orange" : "sig-rl-ray sig-rl-ray-blue"}
        transform={`rotate(${ray.angle})`} d={`M0 ${-ray.width}L${ray.length} 0L0 ${ray.width}Z`} />)}
    </g>
    <circle data-room-motion="ring-blue" className="sig-rl-ring sig-rl-ring-blue" r="100" />
    <circle data-room-motion="ring-orange" className="sig-rl-ring sig-rl-ring-orange" r="100" />
    {SPARKS.map((spark, i) => spark.shard
      ? <path key={i} data-room-motion="spark" className={`sig-rl-spark sig-rl-spark-${spark.tone}`} d={`M0 ${-spark.size * 2}L${spark.size} 0L0 ${spark.size * 2}L${-spark.size} 0Z`} />
      : <circle key={i} data-room-motion="spark" className={`sig-rl-spark sig-rl-spark-${spark.tone}`} r={spark.size} />)}
  </g>;
}

const pose = (at: number, x: number, y: number, o: { r?: number; s?: number; sx?: number; op?: number; ease?: string } = {}): SignatureFrame => ({
  at, opacity: o.op ?? 1, transform: `translate(${x}px, ${y}px) rotate(${o.r ?? 0}deg) scale(${o.sx ?? o.s ?? 1}, ${o.s ?? 1})`,
  ...(o.ease ? { easing: o.ease } : {}),
});
const fade = (...points: [number, number][]): SignatureFrame[] => [{ at: 0, opacity: points[0]![1] }, ...points.map(([at, opacity]) => ({ at, opacity })), { at: D, opacity: points.at(-1)![1] }]
  .filter((frame, i, all) => i === 0 || frame.at > all[i - 1]!.at);

/** Animations natives : tout est calé sur l'horloge de la scène (pause comprise), rien d'autonome. */
export function animateRocketLeague(root: Element, reduced: boolean, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  const carY = GROUND - WHEEL_BOTTOM;

  if (reduced) {
    // Version sans trajectoire : les éléments apparaissent en fondu à leur place.
    animate(one("car"), [pose(0, 1000, carY, { op: 0 }), pose(T.start, 1000, carY, { op: 0 }), pose(T.start + 400, 1000, carY), pose(T.goal - 200, 1000, carY), pose(T.goal + 300, 1000, carY, { op: 0 }), pose(D, 1000, carY, { op: 0 })]);
    animate(one("ball"), [pose(0, BALL.x, BALL.y, { op: 0 }), pose(T.start, BALL.x, BALL.y, { op: 0 }), pose(T.start + 400, BALL.x, BALL.y), pose(T.goal - 200, BALL.x, BALL.y), pose(T.goal + 300, BALL.x, BALL.y, { op: 0 }), pose(D, BALL.x, BALL.y, { op: 0 })]);
    const still = (name: string, s: number, peak = 1) => animate(one(name), [pose(0, TV.x, TV.y, { s, op: 0 }), pose(T.goal, TV.x, TV.y, { s, op: 0 }), pose(T.goal + 400, TV.x, TV.y, { s, op: peak }), pose(T.fxEnd, TV.x, TV.y, { s, op: 0 }), pose(D, TV.x, TV.y, { s, op: 0 })]);
    still("burst", 1.6); still("rays", .9); still("ring-blue", 3, .7); still("ring-orange", 4, .6);
    animate(one("tv-glow"), fade([T.goal, 0], [T.goal + 400, .9], [T.fxEnd, 0]));
    all("flame").forEach((e) => animate(e, fade([D, 0])));
    return;
  }

  // Voiture : arrivée en boost par la droite, saut, frappe, puis elle file vers la gauche.
  const ramp = "cubic-bezier(.45, 0, .75, .6)";
  const hitX = 1042, hitY = carY - 31;
  animate(one("car"), [
    pose(0, 2050, carY), pose(T.start, 2050, carY, { ease: "cubic-bezier(.12, .6, .4, 1)" }),
    pose(T.takeoff, 1200, carY, { ease: ramp }), pose(2090, 1120, carY - 22, { r: 7, ease: "linear" }),
    pose(T.impact, hitX, hitY, { r: 12 }), pose(2640, 800, carY - 80, { r: 6, ease: "ease-in" }),
    pose(2920, 620, carY - 20, { r: -4, ease: "ease-out" }), pose(3150, 470, carY, { r: 0, ease: "linear" }),
    pose(T.carOut, 230, carY, { op: 0 }), pose(D, 230, carY, { op: 0 }),
  ]);
  animate(one("car-shadow"), [
    pose(0, 2050, GROUND + 3, { op: 0 }), pose(T.start, 2050, GROUND + 3, { op: .55 }), pose(T.takeoff, 1200, GROUND + 3, { op: .55 }),
    pose(T.impact, hitX, GROUND + 3, { op: .3, s: .85 }), pose(2920, 610, GROUND + 3, { op: .32, s: .85 }),
    pose(3150, 470, GROUND + 3, { op: .55 }), pose(T.carOut, 230, GROUND + 3, { op: 0 }), pose(D, 230, GROUND + 3, { op: 0 }),
  ]);
  animate(one("ground-glow"), [
    pose(0, 2050, GROUND, { op: 0 }), pose(T.start, 2050, GROUND, { op: .5 }), pose(T.takeoff, 1200, GROUND, { op: .5 }),
    pose(T.impact, hitX, GROUND, { op: 0 }), pose(D, hitX, GROUND, { op: 0 }),
  ]);
  // Boost : flammes qui vacillent, traînée bleue et orange.
  const flicker: SignatureFrame[] = [{ at: 0, opacity: 0, transform: "scale(.2, .5)" }];
  for (let t = T.start, i = 0; t < T.boostOff; t += 90, i++) {
    const boosted = t < T.takeoff + 150 ? 1.25 : 1;
    flicker.push({ at: t, opacity: 1, transform: `scale(${(boosted * [1, .78, 1.12, .88, 1.06, .82][i % 6]!).toFixed(2)}, ${[1, .9, 1.08, .94][i % 4]})` });
  }
  flicker.push({ at: T.boostOff, opacity: 1, transform: "scale(.7, .8)" }, { at: T.boostOff + 200, opacity: 0, transform: "scale(.2, .5)" }, { at: D, opacity: 0, transform: "scale(.2, .5)" });
  animate(one("flame"), flicker);
  all("trail").forEach((e, i) => animate(e, fade([T.start, 0], [T.start + 200, .85 - i * .15], [T.takeoff + 450, .85 - i * .15], [T.boostOff, 0])));
  all("wheel-front").concat(all("wheel-rear")).forEach((e) => animate(e, [
    { at: 0, transform: "rotate(0deg)" }, { at: T.start, transform: "rotate(0deg)" }, { at: T.boostOff, transform: "rotate(-1900deg)" }, { at: D, transform: "rotate(-1900deg)" },
  ]));

  // Ballon : posé sur la table, puis frappé vers l'écran de la TV (arc qui rétrécit).
  const flight = (delay: number, alpha: number): SignatureFrame[] => {
    const frames = [
      pose(T.impact, BALL.x, BALL.y, { op: 0 }),
      pose(T.impact + 120, 745, 565, { s: .95, op: alpha, ease: "ease-out" }), pose(T.impact + 300, 692, 462, { s: .72, op: alpha, ease: "linear" }),
      pose(T.impact + 500, 700, 408, { s: .45, op: alpha, ease: "ease-in" }), pose(T.impact + 680, 740, 390, { s: .26, op: alpha }),
      pose(T.goal, TV.x, TV.y, { s: .14, op: alpha }), pose(T.goal + 40, TV.x, TV.y, { s: .1, op: 0 }),
    ].map((f) => ({ ...f, at: Math.min(D, f.at + delay) }));
    return [pose(0, BALL.x, BALL.y, { op: 0 }), ...frames, pose(D, TV.x, TV.y, { s: .1, op: 0 })];
  };
  animate(one("ball"), [
    pose(0, BALL.x, BALL.y, { op: 0 }), pose(T.start, BALL.x, BALL.y, { op: 0 }), pose(T.start + 300, BALL.x, BALL.y - 4),
    pose(1650, BALL.x, BALL.y - 12, { ease: "ease-in" }), pose(T.impact, BALL.x, BALL.y, { s: 1 }),
    ...flight(0, 1).slice(2, -1), pose(D, TV.x, TV.y, { s: .1, op: 0 }),
  ]);
  all("ball-ghost").forEach((e) => {
    const n = Number((e as HTMLElement).dataset.ghost);
    animate(e, flight(n * 55, n === 2 ? .22 : .38));
  });
  animate(one("ball-spin"), [{ at: 0, transform: "rotate(0deg)" }, { at: T.start, transform: "rotate(0deg)" }, { at: T.impact, transform: "rotate(-35deg)" }, { at: T.goal, transform: "rotate(-820deg)" }, { at: D, transform: "rotate(-820deg)" }]);
  animate(one("ball-shadow"), [
    pose(0, BALL.x, 728, { op: 0 }), pose(T.start, BALL.x, 728, { op: 0 }), pose(T.start + 300, BALL.x, 728, { op: .5 }),
    pose(T.impact, BALL.x, 728, { op: .5 }), pose(T.impact + 200, BALL.x, 728, { op: 0, s: .5 }), pose(D, BALL.x, 728, { op: 0 }),
  ]);

  // Impact : éclair orange à l'endroit de la frappe.
  const hit = { x: 872, y: 662 };
  animate(one("impact"), [
    pose(0, hit.x, hit.y, { op: 0, s: .2 }), pose(T.impact - 30, hit.x, hit.y, { op: 0, s: .2 }),
    pose(T.impact + 50, hit.x, hit.y, { op: 1, s: .75, r: 8 }), pose(T.impact + 260, hit.x, hit.y, { op: 0, s: 1.05, r: 20 }), pose(D, hit.x, hit.y, { op: 0, s: 1.05 }),
  ]);

  // But : l'écran s'illumine, puis explosion bleue et orange centrée sur la TV.
  animate(one("dim"), fade([T.goal - 100, 0], [T.goal + 250, .5], [T.fxEnd - 300, .4], [SKIN_TIMING.plungeEndMs - 300, 0]));
  animate(one("tv-glow"), fade([T.goal - 300, 0], [T.goal - 40, .55], [T.goal + 40, 1], [3500, .6], [3800, .95], [4300, .5], [T.fxEnd, 0]));
  const burst = (name: string, from: number, to: number, o: { s0: number; s1: number; peak?: number; r1?: number }) => animate(one(name), [
    pose(0, TV.x, TV.y, { s: o.s0, op: 0 }), pose(from - 20, TV.x, TV.y, { s: o.s0, op: 0 }),
    pose(from, TV.x, TV.y, { s: o.s0, op: o.peak ?? 1, ease: "cubic-bezier(.1, .7, .3, 1)" }),
    pose(to, TV.x, TV.y, { s: o.s1, op: 0, r: o.r1 ?? 0 }), pose(D, TV.x, TV.y, { s: o.s1, op: 0 }),
  ]);
  burst("flash", T.goal, T.goal + 700, { s0: .3, s1: 1.5, peak: .95 });
  burst("burst", T.goal, T.fxEnd - 100, { s0: .2, s1: 1.9 });
  burst("ring-blue", T.goal, T.goal + 1300, { s0: .2, s1: 8 });
  burst("ring-orange", T.goal + 120, T.goal + 1500, { s0: .15, s1: 9.5, peak: .9 });
  animate(one("rays"), [
    pose(0, TV.x, TV.y, { s: .1, op: 0 }), pose(T.goal - 20, TV.x, TV.y, { s: .1, op: 0 }),
    pose(T.goal, TV.x, TV.y, { s: .1, op: 1, ease: "cubic-bezier(.1, .8, .3, 1)" }), pose(T.goal + 450, TV.x, TV.y, { s: 1, r: 8, op: 1 }),
    pose(T.fxEnd, TV.x, TV.y, { s: 1.25, r: 30, op: 0 }), pose(D, TV.x, TV.y, { s: 1.25, r: 30, op: 0 }),
  ]);
  all("spark").forEach((e, i) => {
    const s = SPARKS[i]!;
    animate(e, [
      pose(0, TV.x, TV.y, { s: .2, op: 0 }), pose(T.goal - 20, TV.x, TV.y, { s: .2, op: 0 }),
      pose(T.goal, TV.x, TV.y, { s: 1.1, op: 1, r: 0, ease: "cubic-bezier(.1, .8, .3, 1)" }),
      pose(T.goal + s.life * .55, TV.x + s.dx * .8, TV.y + s.dy * .6, { s: .8, op: 1, r: 160, ease: "ease-in" }),
      pose(T.goal + s.life, TV.x + s.dx, TV.y + s.dy + 90, { s: .2, op: 0, r: 320 }), pose(D, TV.x + s.dx, TV.y + s.dy + 90, { s: .2, op: 0 }),
    ]);
  });
}
