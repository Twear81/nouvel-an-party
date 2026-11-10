// Scène League of Legends : les runes du socle s'allument, un Nexus (sprite du jeu) se matérialise sur la table basse,
// encaisse des coups (fissures), puis explose : colonne de lumière, onde de choc, éclats de cristal.
// Tout est dessiné autour d'une origine locale (0,0) placée par un `<g transform>` statique : les positions sont des
// coordonnées absolues du viewBox de la pièce (1672×941). Aucun hasard : tout est déterministe.
import type { CSSProperties } from "react";
import { SKIN_TIMING } from "../../../shared/transitions";
import type { Animate, SignatureFrame } from "../RoomSignature";
import nexus from "../../theme/assets/sprites/league-of-legends-nexus.png";

const D = SKIN_TIMING.durationMs;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  runes: SKIN_TIMING.zoomOutEndMs, rise: 1250, riseEnd: 1950, hits: [2250, 2550, 2850, 3050], boom: 3300,
  fxEnd: SKIN_TIMING.plungeStartMs + 500,
} as const;
const TV = { x: 749, y: 385, left: 622, top: 317, width: 254, height: 135 } as const;
const BASE = { x: 805, y: 752 } as const;        // pied du Nexus : dessus de la table basse
const FLOOR = { x: 790, y: 758 } as const;       // centre du socle doré au sol
const SCALE = 1.4;                                // sprite 250×262 : ≈ 365 px de haut dans le viewBox
const FOOT = { x: 125, y: 247 };                  // point d'appui du sprite (repère sprite)
const HEART = { x: BASE.x, y: BASE.y - (FOOT.y - 100) * SCALE }; // centre du cristal (ici naissent la lumière et les éclats)

// Fissures (repère sprite) : trois étapes, du cristal vers le socle.
const CRACKS = [
  "M128 20 L121 52 L132 74 L119 104",
  "M126 70 L146 88 L140 112 L156 140 M121 104 L104 126 L112 154",
  "M132 74 L112 66 L101 82 M140 112 L128 134 L136 168 L124 196 M156 140 L168 158",
];

// Éclats de cristal : polygones aux angles et vitesses déterministes.
const SHARDS = Array.from({ length: 24 }, (_, i) => {
  const angle = (-100 + ((i * 47) % 200)) * Math.PI / 180;
  const speed = 260 + ((i * 37) % 11) * 55;
  return { dx: Math.cos(angle) * speed * 1.05, dy: Math.sin(angle) * speed, size: 9 + (i % 5) * 5, spin: 240 + (i % 4) * 160, life: 1100 + (i % 5) * 160, pale: i % 3 === 0 };
});
// Poussière et étincelles : montent, puis dérivent vers la TV.
const MOTES = Array.from({ length: 26 }, (_, i) => ({
  x: BASE.x - 170 + ((i * 53) % 340), y: BASE.y - 20 - ((i * 29) % 90), r: 4 + (i % 4) * 2.5, rise: 120 + ((i * 41) % 10) * 28, delay: (i % 7) * 70, gold: i % 4 === 0,
}));
const RUNES = Array.from({ length: 14 }, (_, i) => {
  const a = i * 2 * Math.PI / 14 + .2;
  return { x: Math.cos(a) * 300, y: Math.sin(a) * 68 };
});

const Stop = ({ at, tone, alpha = 1 }: { at: number; tone: string; alpha?: number }) =>
  <stop offset={at} style={{ stopColor: `var(--sig-lol-${tone})`, stopOpacity: alpha } as CSSProperties} />;

function Defs() {
  return <defs>
    <radialGradient id="lol-halo" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" alpha={.85} /><Stop at={.3} tone="cyan" alpha={.6} /><Stop at={.7} tone="blue" alpha={.2} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <radialGradient id="lol-flash" cx=".5" cy=".5" r=".5">
      <Stop at={0} tone="white" alpha={1} /><Stop at={.35} tone="cyan" alpha={.55} /><Stop at={1} tone="blue" alpha={0} />
    </radialGradient>
    <linearGradient id="lol-pillar" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="cyan" alpha={0} /><Stop at={.28} tone="cyan" alpha={.7} /><Stop at={.5} tone="white" alpha={.98} /><Stop at={.72} tone="cyan" alpha={.7} /><Stop at={1} tone="cyan" alpha={0} />
    </linearGradient>
    {/* Fondu vertical : la colonne est vive au pied et se dissout vers le plafond */}
    <linearGradient id="lol-fade-v" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity=".12" />
    </linearGradient>
    <mask id="lol-pillar-mask" maskUnits="userSpaceOnUse" x="-300" y="-800" width="600" height="820">
      <rect x="-300" y="-780" width="600" height="780" fill="url(#lol-fade-v)" />
    </mask>
    <linearGradient id="lol-pillar-side" x1="0" y1="0" x2="1" y2="0">
      <Stop at={0} tone="blue" alpha={0} /><Stop at={.5} tone="cyan" alpha={.55} /><Stop at={1} tone="blue" alpha={0} />
    </linearGradient>
    <linearGradient id="lol-shard" x1="0" y1="0" x2="1" y2="1">
      <Stop at={0} tone="white" /><Stop at={.45} tone="cyan" /><Stop at={1} tone="blue" />
    </linearGradient>
    <radialGradient id="lol-screen" cx=".5" cy=".5" r=".6">
      <Stop at={0} tone="white" alpha={.95} /><Stop at={.5} tone="cyan" alpha={.7} /><Stop at={1} tone="blue" alpha={.35} />
    </radialGradient>
    {/* Silhouette blanche du sprite (coups reçus et éclat avant l'explosion) */}
    <filter id="lol-white" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .9  0 0 0 0 1  0 0 0 1 0" />
    </filter>
  </defs>;
}

export function LeagueOfLegendsScene() {
  return <g className="sig-lol">
    <Defs />
    <rect data-room-motion="dim" className="sig-lol-dim" x="-200" y="-200" width="2072" height="1341" />
    {/* Socle : anneaux de runes qui s'allument */}
    <g transform={`translate(${FLOOR.x} ${FLOOR.y})`}>
      <g data-room-motion="rune-ring">
        <ellipse className="sig-lol-ring-glow" rx="300" ry="68" />
        <ellipse className="sig-lol-ring" rx="300" ry="68" />
        <ellipse className="sig-lol-ring sig-lol-ring-fine" rx="388" ry="84" />
        {RUNES.map((r, i) => <path key={i} data-room-motion="rune" className="sig-lol-rune" transform={`translate(${r.x} ${r.y}) scale(1.6 .55)`} d="M0 -14L10 0L0 14L-10 0Z M0 -6V6" />)}
      </g>
    </g>
    <ellipse data-room-motion="table-glow" className="sig-lol-table-glow" cx={BASE.x} cy={BASE.y + 6} rx="190" ry="34" />
    {/* Onde de choc au sol */}
    <g transform={`translate(${BASE.x} ${BASE.y + 8})`}>
      {[1, 2].map((n) => <ellipse key={n} data-room-motion="shockwave" data-wave={n} className="sig-lol-shockwave" rx="100" ry="24" />)}
    </g>
    {/* Colonne de lumière vers le plafond */}
    <g transform={`translate(${BASE.x} ${BASE.y - 10})`} mask="url(#lol-pillar-mask)">
      <rect data-room-motion="pillar-wide" className="sig-lol-pillar-wide" x="-170" y="-780" width="340" height="780" />
      <rect data-room-motion="pillar" className="sig-lol-pillar" x="-85" y="-780" width="170" height="780" />
    </g>
    {/* Le Nexus */}
    <g transform={`translate(${BASE.x} ${BASE.y})`}>
      <g data-room-motion="nexus">
        <circle data-room-motion="nexus-halo" className="sig-lol-halo" cy={-(FOOT.y - 100) * SCALE} r="260" />
        <g transform={`scale(${SCALE}) translate(${-FOOT.x} ${-FOOT.y})`}>
          <image href={nexus} width="250" height="262" />
          <image data-room-motion="nexus-white" href={nexus} width="250" height="262" filter="url(#lol-white)" opacity="0" />
          <g className="sig-lol-cracks">
            {CRACKS.map((d, i) => <g key={i} data-room-motion="crack" data-crack={i}>
              <path className="sig-lol-crack-glow" pathLength="1" d={d} />
              <path className="sig-lol-crack-core" pathLength="1" d={d} />
            </g>)}
          </g>
        </g>
      </g>
    </g>
    {/* Explosion */}
    <g transform={`translate(${HEART.x} ${HEART.y})`}>
      <circle data-room-motion="flash" className="sig-lol-flash" r="700" />
      <circle data-room-motion="burst" className="sig-lol-burst" r="170" />
      {SHARDS.map((s, i) => <path key={i} data-room-motion="shard" data-shard={i} className={s.pale ? "sig-lol-shard sig-lol-shard-pale" : "sig-lol-shard"}
        d={`M0 ${-s.size * 1.6}L${s.size * .7} ${-s.size * .2}L${s.size * .35} ${s.size}L${-s.size * .6} ${s.size * .5}L${-s.size * .75} ${-s.size * .5}Z`} />)}
    </g>
    {MOTES.map((m, i) => <circle key={i} data-room-motion="mote" data-mote={i} className={m.gold ? "sig-lol-mote sig-lol-mote-gold" : "sig-lol-mote"} cx={m.x} cy={m.y} r={m.r} />)}
    <rect data-room-motion="tv-glow" className="sig-lol-tv-glow" x={TV.left} y={TV.top} width={TV.width} height={TV.height} rx="6" />
  </g>;
}

const fade = (...points: [number, number][]): SignatureFrame[] => [{ at: 0, opacity: points[0]![1] }, ...points.map(([at, opacity]) => ({ at, opacity })), { at: D, opacity: points.at(-1)![1] }]
  .filter((frame, i, all) => i === 0 || frame.at > all[i - 1]!.at);

/** Secousse de caméra ajoutée à la caméra de la pièce (`composite: "add"`) : petits coups, puis grosse explosion. */
function shakeFrames(): SignatureFrame[] {
  const rest = (at: number): SignatureFrame => ({ at, transform: "translate(0%, 0%) scale(1) translate(0px, 0px)", composite: "add" });
  const kick = (at: number, amp: number, zoom: number, i: number): SignatureFrame => ({
    at, composite: "add",
    transform: `translate(${-(zoom - 1) * 50}%, ${-(zoom - 1) * 50}%) scale(${zoom}) translate(${(Math.sin(i * 2.7) * amp).toFixed(1)}px, ${(Math.cos(i * 3.9) * amp).toFixed(1)}px)`,
  });
  const frames: SignatureFrame[] = [rest(0)];
  T.hits.forEach((hit, n) => {
    frames.push(rest(hit - 20));
    for (let t = hit, i = n * 5; t <= hit + 120; t += 40, i++) frames.push(kick(t, 4 + n * 2.5 - (t - hit) / 30, 1.012, i));
    frames.push(rest(hit + 150));
  });
  frames.push(rest(T.boom - 20));
  for (let t = T.boom, i = 30; t <= T.boom + 800; t += 35, i++) frames.push(kick(t, 24 * (1 - (t - T.boom) / 880), 1.045, i));
  frames.push(rest(T.boom + 880), rest(D));
  return frames;
}

/** Animations natives : tout est calé sur l'horloge de la scène (pause comprise), rien d'autonome. */
export function animateLeagueOfLegends(root: Element, _reduced: boolean, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  animate(root.closest(".room-camera"), shakeFrames());

  animate(one("dim"), fade([T.runes, 0], [T.rise + 400, .25], [T.boom - 100, .4], [T.boom + 200, .55], [T.fxEnd - 300, .3], [SKIN_TIMING.plungeEndMs - 300, 0]));
  // Runes : l'anneau s'allume rune après rune, puis pulse de plus en plus vite.
  animate(one("rune-ring"), [
    { at: 0, opacity: 0 }, { at: T.runes, opacity: 0 }, { at: T.runes + 500, opacity: .8 }, { at: 2000, opacity: 1 }, { at: 2200, opacity: .6 },
    { at: 2400, opacity: 1 }, { at: 2550, opacity: .6 }, { at: 2700, opacity: 1 }, { at: 2850, opacity: .65 }, { at: 2950, opacity: 1 },
    { at: T.boom, opacity: 1 }, { at: T.boom + 700, opacity: .9 }, { at: T.fxEnd, opacity: 0 }, { at: D, opacity: 0 },
  ]);
  all("rune").forEach((e, i) => animate(e, fade([T.runes + i * 35, 0], [T.runes + i * 35 + 260, 1], [T.fxEnd, 1], [T.fxEnd + 300, 0])));
  animate(one("table-glow"), fade([T.rise, 0], [T.riseEnd, .6], [T.boom - 50, .9], [T.boom + 60, 1], [T.fxEnd - 300, .3], [T.fxEnd, 0]));

  // Matérialisation : fondu + montée, puis le Nexus pulse et tremble à chaque coup.
  const pose = (t: number, y: number, s: number, op: number, ease?: string): SignatureFrame =>
    ({ at: t, opacity: op, transform: `translate(0px, ${y}px) scale(${s})`, ...(ease ? { easing: ease } : {}) });
  const nexusFrames: SignatureFrame[] = [pose(0, 60, .9, 0), pose(T.rise, 60, .9, 0, "cubic-bezier(.2, .8, .3, 1)"), pose(T.riseEnd, 0, 1, 1)];
  T.hits.forEach((hit, n) => {
    nexusFrames.push(pose(hit - 30, 0, 1 + n * .004, 1), pose(hit + 25, 3 + n, 1 + (n + 1) * .012, 1), pose(hit + 90, -2, 1 - .006 * (n + 1), 1), pose(hit + 140, 0, 1, 1));
  });
  nexusFrames.push(pose(T.boom - 60, 0, 1.03, 1), pose(T.boom, -4, 1.1, 1), pose(T.boom + 160, -10, 1.22, 0), pose(D, -10, 1.22, 0));
  animate(one("nexus"), nexusFrames);
  animate(one("nexus-halo"), fade([T.rise, 0], [T.riseEnd, .55], [2250, .85], [2400, .6], [2550, .9], [2700, .65], [2850, 1], [2950, .7], [3050, 1], [T.boom, 1], [T.boom + 160, 0]));
  animate(one("nexus-white"), fade([2000, 0], [T.hits[0], 0], [T.hits[0] + 40, .5], [T.hits[0] + 200, 0],
    [T.hits[1], 0], [T.hits[1] + 40, .55], [T.hits[1] + 190, 0], [T.hits[2], 0], [T.hits[2] + 40, .6], [T.hits[2] + 170, .1],
    [T.hits[3], .1], [T.hits[3] + 30, .65], [T.hits[3] + 130, .2], [T.boom - 120, .4], [T.boom, .9], [T.boom + 120, .9]));
  // Fissures : une par coup, la dernière juste avant l'explosion.
  all("crack").forEach((e, i) => {
    const start = T.hits[i === 0 ? 0 : i === 1 ? 1 : 2]!;
    animate(e, fade([start, 0], [start + 60, 1], [D, 1]));
    e.querySelectorAll("path").forEach((p) => animate(p, [
      { at: 0, strokeDashoffset: 1 }, { at: start, strokeDashoffset: 1 }, { at: start + 220, strokeDashoffset: 0 }, { at: D, strokeDashoffset: 0 },
    ]));
  });

  // Explosion : flash, colonne de lumière, onde de choc.
  const burst = (name: string, o: { from: number; to: number; s0: number; s1: number; peak: number }) => animate(one(name), [
    { at: 0, opacity: 0, transform: `scale(${o.s0})` }, { at: o.from, opacity: 0, transform: `scale(${o.s0})` },
    { at: o.from + 80, opacity: o.peak, transform: `scale(${(o.s0 + o.s1) / 2.5})`, easing: "ease-out" },
    { at: o.to, opacity: 0, transform: `scale(${o.s1})` }, { at: D, opacity: 0, transform: `scale(${o.s1})` },
  ]);
  burst("flash", { from: T.boom - 30, to: T.boom + 650, s0: .2, s1: 1.1, peak: 1 });
  burst("burst", { from: T.boom, to: T.boom + 900, s0: .25, s1: 2.6, peak: .95 });
  const pillar = (name: string, peak: number, grow: number): void => animate(one(name), [
    { at: 0, opacity: 0, transform: "scale(.1, 0)" }, { at: T.boom - 20, opacity: 0, transform: "scale(.1, 0)" },
    { at: T.boom + 100, opacity: peak, transform: "scale(1, 1)", easing: "cubic-bezier(.1, .8, .3, 1)" },
    { at: T.boom + grow, opacity: peak * .75, transform: "scale(.9, 1)" },
    { at: T.boom + 1300, opacity: 0, transform: "scale(.2, 1)" }, { at: D, opacity: 0, transform: "scale(.2, 1)" },
  ]);
  pillar("pillar", 1, 600);
  pillar("pillar-wide", .8, 700);
  all("shockwave").forEach((e, i) => animate(e, [
    { at: 0, opacity: 0, transform: "scale(.2)" }, { at: T.boom + i * 220, opacity: 0, transform: "scale(.2)" },
    { at: T.boom + i * 220 + 60, opacity: 1, transform: "scale(.5)", easing: "ease-out" },
    { at: T.boom + i * 220 + 1000, opacity: 0, transform: "scale(5.2)" }, { at: D, opacity: 0, transform: "scale(5.2)" },
  ]));

  // Éclats de cristal : trajectoire en cloche échantillonnée (aucun hasard).
  all("shard").forEach((e, i) => {
    const s = SHARDS[i]!, floorDy = BASE.y - HEART.y + 30;
    const frames: SignatureFrame[] = [{ at: 0, opacity: 0, transform: "translate(0px, 0px) scale(.3)" }, { at: T.boom - 20, opacity: 0, transform: "translate(0px, 0px) scale(.3)" }];
    for (let n = 1; n <= 8; n++) {
      const p = n / 8;
      const y = Math.min(s.dy * p + 520 * p * p, floorDy); // gravité : l'éclat finit au sol
      frames.push({ at: T.boom + p * s.life, opacity: n < 5 ? 1 : 1 - (n - 4) / 4, transform: `translate(${(s.dx * p).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(s.spin * p).toFixed(0)}deg) scale(${(1 - p * .35).toFixed(2)})` });
    }
    frames.push({ at: D, opacity: 0, transform: frames.at(-1)!.transform });
    animate(e, frames);
  });

  // Retombée : poussière bleue qui monte, puis la lueur file vers la TV.
  all("mote").forEach((e, i) => {
    const m = MOTES[i]!, t0 = T.boom + 150 + m.delay;
    const toTv = `translate(${TV.x - m.x}px, ${TV.y - m.y}px) scale(.3)`;
    animate(e, [
      { at: 0, opacity: 0, transform: "translate(0px, 0px) scale(.4)" }, { at: t0, opacity: 0, transform: "translate(0px, 0px) scale(.4)" },
      { at: t0 + 200, opacity: .95, transform: `translate(${(i % 2 ? 1 : -1) * 14}px, ${-m.rise * .4}px) scale(1)`, easing: "ease-out" },
      { at: Math.min(t0 + 800, SKIN_TIMING.plungeStartMs), opacity: .8, transform: `translate(${(i % 2 ? -1 : 1) * 22}px, ${-m.rise}px) scale(.9)`, easing: "ease-in" },
      { at: SKIN_TIMING.plungeStartMs + 120, opacity: .9, transform: toTv }, { at: SKIN_TIMING.plungeStartMs + 450, opacity: 0, transform: toTv }, { at: D, opacity: 0, transform: toTv },
    ]);
  });
  animate(one("tv-glow"), fade([T.boom + 300, 0], [T.boom + 900, .3], [3900, .55], [SKIN_TIMING.plungeStartMs - 100, .95], [SKIN_TIMING.plungeStartMs + 400, .8], [T.fxEnd, 0]));
}
