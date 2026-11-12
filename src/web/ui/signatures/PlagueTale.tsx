// Scène Resonance : la pièce s'assombrit, un réseau de veines noires très fines (dentelle de capillaires, parcourue de
// rubans turquoise) pousse depuis le poêle jusqu'aux murs, puis la Macula (sprite) se déploie devant la cheminée,
// pulse trois fois et éblouit l'écran de la TV avant le replongeon.
// Les veines sont générées dans le code, de façon déterministe (graine fixe, aucun hasard) : coordonnées du viewBox 1672×941.
import type { CSSProperties } from "react";
import { SKIN_TIMING } from "../../../shared/transitions";
import type { Animate, SignatureFrame } from "../RoomSignature";
import macula from "../../theme/assets/sprites/plague-tale-macula.png";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  dim: SKIN_TIMING.zoomOutEndMs, veins: 1500, veinsEnd: 3500, appear: 2300, deployed: 3200,
  beats: [3300, 3750, 4150], last: 4380,
} as const;
const STOVE = { x: 755, y: 585 } as const;         // cœur du poêle : les veines naissent ici
const CENTER = { x: 760, y: 570 } as const;        // centre de la Macula, devant la cheminée
const TV = { left: 622, top: 317, width: 254, height: 135 } as const;
const SIZE = { w: 1511, h: 1041 } as const;         // sprite d'origine
const MACULA_SCALE = 0.47;                          // ≈ 710 px de large dans le viewBox

// --- Génération des veines -------------------------------------------------------------------------------------------
/** Générateur pseudo-aléatoire à graine fixe (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];
interface Branch { points: Pt[]; depth: number; trunk: number }

const inTv = (x: number, y: number) => x > TV.left - 14 && x < TV.left + TV.width + 14 && y > TV.top - 14 && y < TV.top + TV.height + 24;
const outside = (x: number, y: number) => x < -10 || x > 1682 || y < -10 || y > 951;

/** Un tronc : [x, y, angle (rad), longueur]. Éventail depuis le poêle vers les murs, le manteau et le sol. */
const TRUNKS: [number, number, number, number][] = [
  [715, 560, Math.PI, 620], [722, 600, Math.PI * 0.86, 560], [712, 520, -Math.PI * 0.8, 600], [730, 505, -Math.PI * 0.62, 470],
  [790, 505, -Math.PI * 0.38, 470], [800, 520, -Math.PI * 0.2, 600], [800, 560, 0, 640], [792, 600, Math.PI * 0.12, 600],
  [745, 520, -Math.PI * 0.95, 520], [775, 510, -Math.PI * 0.12, 560], [720, 545, -Math.PI * 0.7, 560], [790, 540, -Math.PI * 0.3, 540],
  [740, 630, Math.PI * 0.62, 320], [775, 635, Math.PI * 0.4, 330], [705, 580, Math.PI * 0.72, 480], [805, 585, Math.PI * 0.26, 500],
];

function grow(x: number, y: number, angle: number, length: number, depth: number, trunk: number, rnd: () => number, out: Branch[]) {
  const points: Pt[] = [[x, y]];
  const step = depth < 2 ? 15 : 11;
  let heading = angle, drift = 0, px = x, py = y;
  for (let travelled = 0; travelled < length; travelled += step) {
    // Tortuosité : l'angle dérive doucement (capillaires), jamais de ligne droite.
    drift = drift * 0.8 + (rnd() - 0.5) * (depth < 2 ? 0.26 : 0.5);
    // Rappel doux vers la direction de départ : le réseau s'étale vers les murs sans boucler sur lui-même.
    heading += drift + (angle - heading) * 0.07;
    px += Math.cos(heading) * step; py += Math.sin(heading) * step;
    if (outside(px, py) || inTv(px, py)) break;
    points.push([px, py]);
    const fork = depth < 2 ? 0.22 : depth < 4 ? 0.2 : 0.13;
    if (depth < 6 && travelled > step * 1.5 && rnd() < fork) {
      const side = rnd() < 0.5 ? -1 : 1;
      const sub = length * (0.3 + rnd() * 0.27);
      if (sub > 18) grow(px, py, heading + side * (0.35 + rnd() * 0.6), sub, depth + 1, trunk, rnd, out);
    }
  }
  if (points.length > 2) out.push({ points, depth, trunk });
}

/** Courbe lisse (quadratiques passant par les milieux) avec coordonnées entières : chemin compact. */
function smooth(points: Pt[]): string {
  const f = (n: number) => Math.round(n * 10) / 10;
  let d = `M${f(points[0]![0])} ${f(points[0]![1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [cx, cy] = points[i]!, [nx, ny] = points[i + 1]!;
    d += `Q${f(cx)} ${f(cy)} ${f((cx + nx) / 2)} ${f((cy + ny) / 2)}`;
  }
  const last = points.at(-1)!;
  return `${d}L${f(last[0])} ${f(last[1])}`;
}

const dist = (p: Pt) => Math.hypot(p[0] - STOVE.x, p[1] - STOVE.y);

function buildVeins() {
  const rnd = seeded(20261231);
  const branches: Branch[] = [];
  TRUNKS.forEach(([x, y, a, len], i) => grow(x, y, a, len, 0, i, rnd, branches));
  // Un élément par (tronc, finesse) : révélé d'un seul tenant, du poêle vers les extrémités.
  const veins: { trunk: number; fine: number; d: string; start: number }[] = [];
  for (let trunk = 0; trunk < TRUNKS.length; trunk++) {
    for (let fine = 0; fine < 3; fine++) {
      const group = branches.filter((b) => b.trunk === trunk && Math.min(2, b.depth === 0 ? 0 : b.depth <= 2 ? 1 : 2) === fine)
        .sort((a, b) => dist(a.points[0]!) - dist(b.points[0]!));
      if (!group.length) continue;
      veins.push({ trunk, fine, d: group.map((b) => smooth(b.points)).join(""), start: dist(group[0]!.points[0]!) });
    }
  }
  // Rubans turquoise : les troncs et une branche sur trois de premier niveau.
  const ribbons = branches.filter((b) => b.depth === 0 || (b.depth === 1 && b.points.length > 14 && b.points.length % 4 === 0))
    .map((b) => ({ d: smooth(b.points), depth: b.depth, trunk: b.trunk }));
  return { veins, ribbons };
}

const { veins: VEINS, ribbons: RIBBONS } = buildVeins();

// Rendu en couches : le SVG des veines ne bouge plus après ~3,5 s, et tout ce qui anime ensuite (nuit, poêle, halo, Macula,
// lueur de la TV) est un élément HTML animé par transformation/opacité, donc sans redessiner les centaines de tracés.
// Positions en % de la scène (même repère que le viewBox 1672×941).
const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;
const X = (v: number) => pct(v, 1672), Y = (v: number) => pct(v, 941);
const box = (cx: number, cy: number, w: number, h: number): CSSProperties =>
  ({ left: X(cx - w / 2), top: Y(cy - h / 2), width: X(w), height: Y(h) });

/** Les couches sont rendues dans le calque de signature, à la suite les unes des autres. */
export function PlagueTaleScene() {
  return <div className="sig-pt sig-pt-stack" data-testid="transition-signature" data-signature="plague-tale">
    <div data-room-motion="night" className="sig-pt-night" style={box(STOVE.x, STOVE.y, 3400, 2000)} />
    <div data-room-motion="stove" className="sig-pt-stove" style={box(STOVE.x, STOVE.y + 10, 520, 380)} />
    <svg className="room-signature-art sig-pt-veins-layer" viewBox="0 0 1672 941" aria-hidden="true">
      <g className="sig-pt-veins">
        {VEINS.map((v, i) => <path key={i} data-room-motion="vein" data-trunk={v.trunk} data-fine={v.fine} data-order={i} pathLength="1"
          className={`sig-pt-vein sig-pt-vein-${v.fine}`} d={v.d} />)}
      </g>
      <g data-room-motion="ribbons" className="sig-pt-ribbons">
        {RIBBONS.map((r, i) => r.depth === 0 && <path key={`g${i}`} data-room-motion="ribbon" data-order={i} pathLength="1" className="sig-pt-ribbon sig-pt-ribbon-glow" d={r.d} />)}
        {RIBBONS.map((r, i) => <path key={i} data-room-motion="ribbon" data-order={i} pathLength="1" className={r.depth === 0 ? "sig-pt-ribbon sig-pt-ribbon-main" : "sig-pt-ribbon"} d={r.d} />)}
      </g>
    </svg>
    <div data-room-motion="halo" className="sig-pt-halo" style={box(CENTER.x, CENTER.y, 860, 860)} />
    <img data-room-motion="macula" className="sig-pt-macula" src={macula} alt="" draggable={false}
      style={box(CENTER.x, CENTER.y, SIZE.w * MACULA_SCALE, SIZE.h * MACULA_SCALE)} />
    <div data-room-motion="tv-glow" className="sig-pt-tv-glow" style={{ ...box(TV.left + TV.width / 2, TV.top + TV.height / 2, TV.width, TV.height) }} />
  </div>;
}

const fade = (...points: [number, number][]): SignatureFrame[] => [{ at: 0, opacity: points[0]![1] }, ...points.map(([at, opacity]) => ({ at, opacity })), { at: D, opacity: points.at(-1)![1] }]
  .filter((frame, i, all) => i === 0 || frame.at > all[i - 1]!.at);

/** Tremblement de la pièce, ajouté à la caméra (`composite: "add"`) : léger à chaque battement, plus fort au dernier. */
function shakeFrames(): SignatureFrame[] {
  const rest = (at: number): SignatureFrame => ({ at, transform: "translate(0%, 0%) scale(1) translate(0px, 0px)", composite: "add" });
  const kick = (at: number, amp: number, zoom: number, i: number): SignatureFrame => ({
    at, composite: "add",
    transform: `translate(${-(zoom - 1) * 50}%, ${-(zoom - 1) * 50}%) scale(${zoom}) translate(${(Math.sin(i * 2.7) * amp).toFixed(1)}px, ${(Math.cos(i * 3.9) * amp).toFixed(1)}px)`,
  });
  const frames: SignatureFrame[] = [rest(0)];
  [...T.beats, T.last].forEach((beat, n, all) => {
    const strong = n === all.length - 1, amp = strong ? 8 : 2.5 + n * 0.8;
    frames.push(rest(beat - 20));
    for (let t = beat, i = n * 6; t <= beat + (strong ? 260 : 140); t += 40, i++) frames.push(kick(t, amp * (1 - (t - beat) / (strong ? 320 : 200)), strong ? 1.02 : 1.006, i));
    frames.push(rest(beat + (strong ? 320 : 190)));
  });
  frames.push(rest(D));
  return frames;
}

/** Animations natives : tout est calé sur l'horloge de la scène (pause comprise), rien d'autonome. */
export function animatePlagueTale(root: Element, _reduced: boolean, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  animate(root.closest(".room-camera"), shakeFrames());

  // 1. La nuit se resserre autour du poêle, qui vacille (valeurs déterministes).
  animate(one("night"), [
    { at: 0, opacity: 0, transform: "scale(1.5)" }, { at: T.dim, opacity: 0, transform: "scale(1.5)" },
    { at: 2200, opacity: 0.85, transform: "scale(1)" }, { at: T.last, opacity: 1, transform: "scale(.8)" },
    { at: SKIN_TIMING.plungeEndMs - 400, opacity: 0.6, transform: "scale(.8)" }, { at: D, opacity: 0, transform: "scale(.8)" },
  ]);
  const flicker: [number, number][] = [[T.dim, 0]];
  for (let t = T.dim + 150, i = 0; t < SKIN_TIMING.plungeStartMs; t += 150, i++) flicker.push([t, 0.55 + 0.4 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.9))]);
  flicker.push([SKIN_TIMING.plungeEndMs - 400, 0.3]);
  animate(one("stove"), fade(...flicker));

  // 2. Les veines poussent du poêle vers les murs : les plus fines un peu après les troncs.
  all("vein").forEach((e) => {
    const trunk = Number((e as HTMLElement).dataset.trunk ?? 0), fine = Number((e as HTMLElement).dataset.fine ?? 0);
    const start = T.veins + 60 + trunk * 45 + fine * 140, end = Math.min(T.veinsEnd + 300, start + 1300 + fine * 150);
    animate(e, [
      { at: 0, strokeDashoffset: 1, opacity: 0 }, { at: start, strokeDashoffset: 1, opacity: 0 }, { at: start + 20, strokeDashoffset: 1, opacity: 1 },
      { at: end, strokeDashoffset: 0, opacity: 1, easing: "ease-out" }, { at: D, strokeDashoffset: 0, opacity: 1 },
    ]);
  });
  all("ribbon").forEach((e) => {
    const order = Number((e as HTMLElement).dataset.order ?? 0);
    const start = T.veins + 350 + (order % 12) * 55, end = start + 1500;
    animate(e, [
      { at: 0, strokeDashoffset: 1, opacity: 0 }, { at: start, strokeDashoffset: 1, opacity: 0 }, { at: start + 20, strokeDashoffset: 1, opacity: 0.9 },
      { at: end, strokeDashoffset: 0, opacity: 1, easing: "ease-out" },
      { at: D, strokeDashoffset: 0, opacity: 1 },
    ]);
  });
  animate(one("ribbons"), fade([T.veins, 0], [T.veins + 700, 0.65], [T.beats[0], 1], [T.last, 1]));

  // 3. La Macula se déploie depuis le cœur, tourne lentement, puis bat (échelle + lueur) sur chaque pulsation.
  const pose = (at: number, scale: number, rotate: number, opacity: number, easing?: string): SignatureFrame =>
    ({ at, opacity, transform: `scale(${scale}) rotate(${rotate}deg)`, ...(easing ? { easing } : {}) });
  const frames: SignatureFrame[] = [pose(0, 0.2, -55, 0), pose(T.appear, 0.2, -55, 0, "cubic-bezier(.2, .8, .3, 1)"), pose(T.deployed, 1, 0, 1)];
  const rot = (at: number) => (at - T.deployed) / 130;
  T.beats.forEach((b, n) => {
    const peak = 1.06 + n * 0.02;
    frames.push(pose(b - 20, 1 + n * 0.005, rot(b - 20), 1), pose(b + 80, peak, rot(b + 80), 1, "ease-out"), pose(b + 170, 0.985, rot(b + 170), 1));
  });
  frames.push(pose(T.last - 40, 1.0, rot(T.last - 40), 1), pose(T.last + 100, 1.18, rot(T.last + 100), 1, "ease-out"),
    pose(SKIN_TIMING.plungeStartMs, 1.1, rot(SKIN_TIMING.plungeStartMs), 1), pose(D, 1.1, rot(D), 1));
  animate(one("macula"), frames);
  animate(one("halo"), [
    { at: 0, opacity: 0, transform: "scale(.4)" }, { at: T.appear, opacity: 0, transform: "scale(.4)" }, { at: T.deployed, opacity: 0.35, transform: "scale(.9)" },
    ...T.beats.flatMap((b, n): SignatureFrame[] => [
      { at: b - 20, opacity: 0.3 + n * 0.08, transform: "scale(.9)" }, { at: b + 80, opacity: 0.75 + n * 0.1, transform: `scale(${1.1 + n * 0.06})`, easing: "ease-out" },
      { at: b + 170, opacity: 0.35 + n * 0.1, transform: "scale(.95)" }]),
    { at: T.last - 40, opacity: 0.5, transform: "scale(1)" }, { at: T.last + 100, opacity: 1, transform: "scale(1.45)", easing: "ease-out" },
    { at: SKIN_TIMING.plungeStartMs, opacity: 0.9, transform: "scale(1.3)" }, { at: D, opacity: 0.9, transform: "scale(1.3)" },
  ].filter((f, i, arr) => i === 0 || f.at > arr[i - 1]!.at));

  // 4. La lueur turquoise envahit l'écran de la TV pendant les dernières pulsations.
  animate(one("tv-glow"), fade([T.beats[1], 0], [T.beats[2], 0.4], [T.last, 0.75], [T.last + 150, 1], [SKIN_TIMING.plungeStartMs + 400, 1]));
}
