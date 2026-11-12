// Scène Rocket League : une Octane (sprite du jeu) arrive en boost, saute, frappe le ballon qui file dans la TV, et le but explose.
// Les éléments sont dessinés autour de l'origine (0,0) puis placés par `transform` (voir `.sig-rl` dans room.css) :
// les positions sont donc des coordonnées absolues du viewBox de la pièce (1672×941).
import type { CSSProperties } from "react";
import { SKIN_TIMING } from "../../../shared/transitions";
import type { Animate, SignatureFrame } from "../RoomSignature";
import voiture from "../../theme/assets/sprites/rocket-league-voiture.png";
import ballon from "../../theme/assets/sprites/rocket-league-ballon.png";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  start: SKIN_TIMING.zoomOutEndMs, takeoff: 1850, impact: 2300, goal: 3100,
  boostOff: 3000, carOut: 3350, fxEnd: SKIN_TIMING.plungeStartMs + 500,
} as const;
const TV = { x: 749, y: 386, left: 627, top: 322, width: 244, height: 129 } as const;
const GROUND = 801;      // sol sous les roues de la voiture
const BALL = { x: 805, r: 85, y: 748 - 85 } as const; // posé sur la table basse (dessus à y 748)
const BALL_SHADOW_Y = 751;

// Sprites : l'origine locale est le point de contact au sol de la voiture (sprite 735×752) et le centre de la sphère
// du ballon (sprite 900×449 : sphère de 368 px de diamètre centrée en 450,224).
const CAR_SCALE = .46;
const CAR_PIVOT = { x: 400, y: 575 };
const EXHAUST = { x: 716 - CAR_PIVOT.x, y: 318 - CAR_PIVOT.y }; // sortie du boost, juste derrière l'aile arrière (repère sprite)
const BALL_SCALE = (BALL.r * 2) / 368;
const BALL_CENTER = { x: 450, y: 224 };

// Explosion : paramètres déterministes (aucun hasard).
const RAYS = Array.from({ length: 18 }, (_, i) => ({ angle: i * 20 + (i % 2) * 4, length: 420 + ((i * 5) % 7) * 55, width: 16 + (i % 3) * 7, orange: i % 2 === 1 }));
const SPARKS = Array.from({ length: 34 }, (_, i) => {
  const angle = (i * 137.508 * Math.PI) / 180;
  return { dx: Math.cos(angle) * (230 + ((i * 53) % 9) * 62), dy: Math.sin(angle) * (230 + ((i * 53) % 9) * 62) + 70,
    size: 5 + (i % 4) * 3, tone: ["blue", "orange", "white"][i % 3]!, life: 1000 + (i % 5) * 140, shard: i % 2 === 0 };
});
// Volutes de la traînée de boost (repère du pot, en unités du sprite) : chaudes près de la voiture, froides ensuite.
const PUFFS = Array.from({ length: 18 }, (_, i) => ({
  x: 130 + i * 84, y: Math.sin(i * 1.9) * 30 - i * 8, r: 58 + i * 6, hot: i < 8, strength: 1 - i * .035,
}));

const Stop = ({ at, tone, alpha = 1 }: { at: number; tone: string; alpha?: number }) =>
  <stop offset={at} style={{ stopColor: `var(--sig-rl-${tone})`, stopOpacity: alpha } as CSSProperties} />;

function Defs() {
  return <defs>
    <linearGradient id="rl-flame" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="orange-light" /><Stop at={.3} tone="orange" /><Stop at={.75} tone="orange-dark" alpha={.55} /><Stop at={1} tone="orange-dark" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-flame-mid" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="flame-core" /><Stop at={.45} tone="orange-light" /><Stop at={1} tone="orange" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-flame-core" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="white" /><Stop at={.5} tone="flame-core" /><Stop at={1} tone="orange-light" alpha={0} />
    </linearGradient>
    <linearGradient id="rl-trail-blue" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="orange-light" alpha={.95} /><Stop at={.3} tone="orange" alpha={.6} /><Stop at={.6} tone="blue-light" alpha={.4} /><Stop at={1} tone="blue" alpha={0} />
    </linearGradient>
    <radialGradient id="rl-puff-hot" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="flame-core" alpha={1} /><Stop at={.4} tone="orange" alpha={.8} /><Stop at={1} tone="orange-dark" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-puff-cool" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" alpha={.85} /><Stop at={.45} tone="blue-light" alpha={.55} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <radialGradient id="rl-ball-halo" cx=".5" cy=".5" r=".5">
      <Stop at={.45} tone="blue-light" alpha={.55} /><Stop at={.7} tone="blue" alpha={.22} /><Stop at={1} tone="blue" alpha={0} />
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
  </defs>;
}

/** La voiture : sprite posé sur son point de contact au sol, boost et traînée dans le repère du sprite. */
function Car() {
  return <g data-room-motion="car">
    <g transform={`scale(${CAR_SCALE})`}>
      {/* Boost : tout part du pot, incliné vers l'arrière-haut de la voiture (elle est vue de trois quarts avant) */}
      <g transform={`translate(${EXHAUST.x} ${EXHAUST.y}) rotate(-6)`}>
        <path data-room-motion="trail" className="sig-rl-trail" d="M80 -40C400 -80 900 -40 1650 -8C900 36 400 64 80 40Z" />
        {PUFFS.map((puff, i) => <circle key={i} data-room-motion="puff" data-puff={i} className={puff.hot ? "sig-rl-puff-hot" : "sig-rl-puff-cool"}
          cx={puff.x} cy={puff.y} r={puff.r} />)}
        <g data-room-motion="flame" className="sig-rl-flame">
          <path data-room-motion="tongue" data-tongue="0" className="sig-rl-flame-outer" d="M-30 -48C20 -78 140 -70 250 -44L330 -70L380 -26L520 -30L470 0L560 28L400 30L330 66L260 40C150 78 20 80 -30 48Z" />
          <path data-room-motion="tongue" data-tongue="1" className="sig-rl-flame-mid" d="M-20 -32C30 -52 120 -46 200 -26L290 -36L340 0L270 14L210 36C120 54 30 52 -20 32Z" />
          <path data-room-motion="tongue" data-tongue="2" className="sig-rl-flame-core" d="M-12 -18C30 -30 90 -24 150 -8L220 0L150 10C90 24 30 30 -12 18Z" />
        </g>
      </g>
      <image href={voiture} x={-CAR_PIVOT.x} y={-CAR_PIVOT.y} width="735" height="752" />
    </g>
  </g>;
}

export function RocketLeagueScene() {
  return <g className="sig-rl">
    <Defs />
    {/* Ombres portées */}
    <ellipse data-room-motion="car-shadow" className="sig-rl-shadow" rx="165" ry="17" />
    <ellipse data-room-motion="ball-shadow" className="sig-rl-shadow" rx="80" ry="12" />
    {/* Ballon de Rocket League */}
    {[2, 1].map((n) => <circle key={n} data-room-motion="ball-ghost" data-ghost={n} className="sig-rl-ghost" r={BALL.r} />)}
    <g data-room-motion="ball">
      <circle className="sig-rl-halo" r={BALL.r * 2} />
      <g data-room-motion="ball-spin">
        <g transform={`scale(${BALL_SCALE})`}>
          <image href={ballon} x={-BALL_CENTER.x} y={-BALL_CENTER.y} width="900" height="449" />
        </g>
      </g>
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

/** Secousse de caméra : léger zoom (pour ne pas montrer les bords) et tremblement amorti, ajoutés à la caméra (`composite: "add"`). */
function shakeFrames(): SignatureFrame[] {
  const rest = (at: number): SignatureFrame => ({ at, transform: "translate(0%, 0%) scale(1) translate(0px, 0px)", composite: "add" });
  const kick = (at: number, amp: number, zoom: number, i: number): SignatureFrame => ({
    at, composite: "add",
    transform: `translate(${-(zoom - 1) * 50}%, ${-(zoom - 1) * 50}%) scale(${zoom}) translate(${(Math.sin(i * 2.7) * amp).toFixed(1)}px, ${(Math.cos(i * 3.9) * amp).toFixed(1)}px)`,
  });
  const frames: SignatureFrame[] = [rest(0), rest(T.impact - 20)];
  for (let t = T.impact, i = 0; t <= T.impact + 280; t += 35, i++) frames.push(kick(t, 12 * (1 - (t - T.impact) / 320), 1.03, i));
  frames.push(rest(T.impact + 340), rest(T.goal - 20));
  for (let t = T.goal, i = 20; t <= T.goal + 700; t += 35, i++) frames.push(kick(t, 22 * (1 - (t - T.goal) / 780), 1.045, i));
  frames.push(rest(T.goal + 780), rest(D));
  return frames;
}

/** Animations natives : tout est calé sur l'horloge de la scène (pause comprise), rien d'autonome. */
export function animateRocketLeague(root: Element, _reduced: boolean, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  // Les secousses s'ajoutent à l'animation de la caméra de la pièce, sans la remplacer.
  animate(root.closest(".room-camera"), shakeFrames());

  // Voiture : arrivée en boost par la droite (vibration du châssis), saut qui se cabre, frappe, puis elle file vers la gauche.
  const hitX = 1085, lift = 88, takeoffX = 1300;
  const drive: SignatureFrame[] = [];
  for (let t = T.start, i = 0; t < T.takeoff; t += 90, i++) {
    const p = (t - T.start) / (T.takeoff - T.start);
    drive.push(pose(t, 1900 + (takeoffX - 1900) * p * (1.25 - .25 * p), GROUND + (i % 2 ? 2 : -1.5), { s: .97 + .04 * p, r: i % 2 ? -.4 : .3, ease: "linear" }));
  }
  animate(one("car"), [
    pose(0, 1900, GROUND, { s: .97 }), ...drive,
    pose(T.takeoff, takeoffX, GROUND, { s: 1.01, ease: "cubic-bezier(.3, .1, .5, 1)" }),
    pose(2080, 1190, GROUND - 52, { s: 1.04, r: 8, ease: "linear" }),
    pose(T.impact, hitX, GROUND - lift, { s: 1.06, r: 14 }),
    pose(2640, 880, GROUND - 70, { s: 1.04, r: 6, ease: "ease-in" }),
    pose(2920, 700, GROUND - 18, { s: 1.02, r: -3, ease: "ease-out" }),
    pose(3150, 560, GROUND, { s: 1, r: 0, ease: "linear" }),
    pose(T.carOut, 350, GROUND, { s: .96, op: 0 }), pose(D, 350, GROUND, { s: .96, op: 0 }),
  ]);
  const shadow = (x: number, at: number, op: number, s = 1): SignatureFrame => pose(at, x, GROUND + 3, { op: Math.min(1, op * 1.5), s });
  animate(one("car-shadow"), [
    shadow(1900, 0, 0), shadow(1900, T.start, .5), shadow(takeoffX, T.takeoff, .5, 1.04), shadow(1190, 2080, .38, .88),
    shadow(hitX, T.impact, .28, .78), shadow(880, 2640, .3, .82), shadow(700, 2920, .4, .92),
    shadow(560, 3150, .5), shadow(350, T.carOut, 0), shadow(350, D, 0),
  ]);
  // Boost : flamme qui vacille (cœur blanc-jaune), traînée de volutes qui se dissipent derrière.
  const flicker: SignatureFrame[] = [{ at: 0, opacity: 0, transform: "scale(.2, .4)" }];
  for (let t = T.start, i = 0; t < T.boostOff; t += 70, i++) {
    const boosted = t < T.takeoff + 150 ? 1.15 : 1;
    flicker.push({ at: t, opacity: 1, transform: `scale(${(boosted * [1, .72, 1.12, .84, 1.2, .78, .96][i % 7]!).toFixed(2)}, ${[1, .86, 1.1, .94][i % 4]})` });
  }
  flicker.push({ at: T.boostOff, opacity: 1, transform: "scale(.6, .7)" }, { at: T.boostOff + 220, opacity: 0, transform: "scale(.2, .4)" }, { at: D, opacity: 0, transform: "scale(.2, .4)" });
  animate(one("flame"), flicker);
  // Chaque langue de feu vacille à son rythme : le feu ne ressemble pas à un faisceau.
  all("tongue").forEach((e, n) => {
    const frames: SignatureFrame[] = [{ at: 0, transform: "scale(1, 1)" }];
    for (let t = T.start, k = 0; t < T.boostOff + 300; t += 55, k++) frames.push({ at: t, transform: `scale(${(.78 + .3 * Math.abs(Math.sin(k * (1.7 + n * .6) + n))).toFixed(2)}, ${(.82 + .25 * Math.abs(Math.cos(k * (2.1 - n * .3) + n * 2))).toFixed(2)})` });
    frames.push({ at: D, transform: "scale(1, 1)" });
    animate(e, frames);
  });
  animate(one("trail"), [
    { at: 0, opacity: 0 }, { at: T.start, opacity: 0 }, { at: T.start + 250, opacity: .4 }, { at: T.boostOff - 100, opacity: .4 },
    { at: T.boostOff + 500, opacity: 0 }, { at: D, opacity: 0 },
  ]);
  all("puff").forEach((e, i) => {
    const puff = PUFFS[i]!;
    const frames: SignatureFrame[] = [{ at: 0, opacity: 0, transform: "scale(.3)" }];
    for (let t = T.start + i * 25, k = 0; t < T.boostOff; t += 110, k++) {
      const wave = Math.sin(k * 1.3 + i * .9);
      frames.push({ at: t, opacity: Math.max(0, puff.strength * (.8 + .2 * wave)), transform: `scale(${(.85 + .22 * Math.cos(k * 1.7 + i)).toFixed(2)}) translate(0px, ${(wave * 10).toFixed(1)}px)` });
    }
    frames.push({ at: T.boostOff + 450 + i * 20, opacity: 0, transform: "scale(1.5)" }, { at: D, opacity: 0, transform: "scale(1.5)" });
    animate(e, frames);
  });

  // Ballon : posé sur la table, puis frappé vers l'écran de la TV (arc qui rétrécit, tourne sur lui-même).
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
    pose(1650, BALL.x, BALL.y - 10, { ease: "ease-in" }), pose(T.impact, BALL.x, BALL.y, { s: 1 }),
    ...flight(0, 1).slice(2, -1), pose(D, TV.x, TV.y, { s: .1, op: 0 }),
  ]);
  all("ball-ghost").forEach((e) => {
    const n = Number((e as HTMLElement).dataset.ghost);
    animate(e, flight(n * 55, n === 2 ? .2 : .34));
  });
  animate(one("ball-spin"), [{ at: 0, transform: "rotate(0deg)" }, { at: T.start, transform: "rotate(0deg)" }, { at: T.impact, transform: "rotate(-25deg)" }, { at: T.goal, transform: "rotate(-780deg)" }, { at: D, transform: "rotate(-780deg)" }]);
  animate(one("ball-shadow"), [
    pose(0, BALL.x, BALL_SHADOW_Y, { op: 0 }), pose(T.start, BALL.x, BALL_SHADOW_Y, { op: 0 }), pose(T.start + 300, BALL.x, BALL_SHADOW_Y, { op: .5 }),
    pose(T.impact, BALL.x, BALL_SHADOW_Y, { op: .5 }), pose(T.impact + 200, BALL.x, BALL_SHADOW_Y, { op: 0, s: .5 }), pose(D, BALL.x, BALL_SHADOW_Y, { op: 0 }),
  ]);

  // Impact : éclair orange à l'endroit de la frappe (nez de la voiture contre le ballon).
  const hit = { x: BALL.x + 82, y: BALL.y + 4 };
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
  burst("burst", T.goal, T.goal + 1500, { s0: .2, s1: 1.9 });
  burst("ring-blue", T.goal, T.goal + 1300, { s0: .2, s1: 8 });
  burst("ring-orange", T.goal + 120, T.goal + 1500, { s0: .15, s1: 9.5, peak: .9 });
  animate(one("rays"), [
    pose(0, TV.x, TV.y, { s: .1, op: 0 }), pose(T.goal - 20, TV.x, TV.y, { s: .1, op: 0 }),
    pose(T.goal, TV.x, TV.y, { s: .1, op: 1, ease: "cubic-bezier(.1, .8, .3, 1)" }), pose(T.goal + 450, TV.x, TV.y, { s: 1, r: 8, op: 1 }),
    pose(T.goal + 1500, TV.x, TV.y, { s: 1.25, r: 30, op: 0 }), pose(D, TV.x, TV.y, { s: 1.25, r: 30, op: 0 }),
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
