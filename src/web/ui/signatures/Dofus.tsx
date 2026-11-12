// Scène Dofus : la phase de placement d'un combat. Le sol de la pièce se quadrille en cases en losange (projetées dans
// le plan du sol), des cases bleues (alliés) et rouges (ennemis) s'allument, les avatars des invités tombent chacun sur
// une case bleue, un Bouftou (en sautillant) et un Tofu (en volant) se posent sur des cases rouges, la « timeline »
// d'ordre de jeu glisse en bas à droite, puis un éclat doré lance le combat.
// Les coordonnées sont celles du viewBox de la pièce (1672×941). Aucun hasard : tout dépend de l'ordre de `players`.
// Les avatars sont du HTML (leur taille suit le rem de la TV, comme les portraits de la pièce) posé à la même
// position que les cases ; la frise est une surimpression d'écran hors caméra. Couleurs : `.sig-df` dans room.css.
import type { CSSProperties } from "react";
import type { Profile } from "../../../shared/types";
import { SKIN_TIMING } from "../../../shared/transitions";
import { PlayerAvatar } from "../PlayerAvatar";
import type { Animate, SignatureFrame } from "../RoomSignature";
import bouftou from "../../theme/assets/sprites/dofus-bouftou.png";
import tofu from "../../theme/assets/sprites/dofus-tofu.png";

export interface DofusPlayer { id: string; profile: Profile }

const D = SKIN_TIMING.durationMs;
const VIEW = { w: 1672, h: 941 } as const;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  grid: 1000, gridWave: 700, blue: 1850, red: 2100, drop: 2350, dropStagger: 140,
  bouftou: 2850, tofu: 3050, timeline: 3150, flash: 4250, timelineOut: SKIN_TIMING.plungeStartMs - 80,
} as const;

// --- Grille : plan du sol vu en perspective douce (horizon très haut, la pièce de l'illustration est peu fuyante).
const GROUND = { cx: 815, cy: 760, rx: 470, ry: 104, depthPx: 765, widthPx: 2000, step: .0275 } as const;
/** Point du sol (X latéral, D profondeur vers le fond) -> écran. Z = 1 au centre ; plus Z est grand, plus on est loin. */
function ground(X: number, Dp: number): [number, number] {
  const Z = 1 + Dp;
  return [GROUND.cx + GROUND.widthPx * X / Z, GROUND.depthPx / Z];
}
const fix = (n: number) => n.toFixed(1);

interface Cell { x: number; y: number; d: string; wave: number }
// Réseau de losanges : le coin (i, j) est à X = (i - j)·pas, profondeur = (i + j)·pas.
const CELLS: Cell[] = (() => {
  const list: Cell[] = [];
  const s = GROUND.step;
  for (let i = -16; i <= 16; i++) for (let j = -16; j <= 16; j++) {
    const [x, y] = ground((i - j) * s, (i + j + 1) * s);
    const nx = (x - GROUND.cx) / GROUND.rx, ny = (y - GROUND.cy) / GROUND.ry;
    if (nx * nx + ny * ny > 1) continue;
    const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => ground((a! - b!) * s, (a! + b!) * s));
    list.push({ x, y, d: `M${corners.map(([cx, cy]) => `${fix(cx!)} ${fix(cy!)}`).join("L")}Z`, wave: Math.hypot(nx, ny) });
  }
  return list;
})();
// Équipes : un massif de cases bleues côté canapé (avant-gauche), un massif de cases rouges côté cheminée (fond-droite).
const nearest = (ax: number, ay: number, n: number) => [...CELLS]
  .sort((a, b) => ((a.x - ax) / 130) ** 2 + ((a.y - ay) / 38) ** 2 - (((b.x - ax) / 130) ** 2 + ((b.y - ay) / 38) ** 2)).slice(0, n);
const BLUE = nearest(580, 805, 28);
const RED = nearest(1125, 742, 14);
// Cases des avatars : les plus proches du centre bleu d'abord, en gardant un écart pour que deux avatars ne se masquent pas.
const SLOTS = (() => {
  const picked: Cell[] = [];
  for (const c of BLUE) if (picked.every((o) => ((c.x - o.x) / 108) ** 2 + ((c.y - o.y) / 66) ** 2 >= 1)) picked.push(c);
  for (const c of BLUE) if (picked.length < 8 && !picked.includes(c)) picked.push(c);
  return picked;
})();
const RED_SLOTS = [...RED].sort((a, b) => a.y - b.y);
const BOUFTOU_CELL = RED_SLOTS[RED_SLOTS.length - 1]!;   // case rouge la plus en avant
const TOFU_CELL = [...RED_SLOTS].sort((a, b) => Math.abs(b.x - BOUFTOU_CELL.x) - Math.abs(a.x - BOUFTOU_CELL.x))[0]!;   // case rouge la plus éloignée en largeur
const slotFor = (i: number) => SLOTS[i % SLOTS.length]!;

// Sprites : point d'appui (pieds) et échelle dans le viewBox.
const SPRITES = {
  bouftou: { href: bouftou, size: 447, foot: { x: 222, y: 395 }, scale: .27 },
  tofu: { href: tofu, size: 736, foot: { x: 385, y: 712 }, scale: .17 },
} as const;

function Monster({ kind, cell }: { kind: keyof typeof SPRITES; cell: Cell }) {
  const s = SPRITES[kind];
  return <g transform={`translate(${fix(cell.x)} ${fix(cell.y)})`}>
    <ellipse data-room-motion={`${kind}-shadow`} className="sig-df-shadow" cx="0" cy="3" rx="46" ry="11" />
    <g data-room-motion={kind}>
      {/* Les sprites regardent à droite : on les retourne pour qu'ils fassent face aux alliés */}
      <g transform={`scale(${-s.scale} ${s.scale}) translate(${-s.foot.x} ${-s.foot.y})`}>
        <image href={s.href} width={s.size} height={s.size} />
      </g>
    </g>
  </g>;
}

export function DofusScene({ players }: { players: DofusPlayer[] }) {
  return <g className="sig-df">
    <defs>
      <radialGradient id="df-flash" cx=".5" cy=".5" r=".5">
        <stop offset="0" style={{ stopColor: "var(--sig-df-gold-light)", stopOpacity: .95 } as CSSProperties} />
        <stop offset=".45" style={{ stopColor: "var(--sig-df-gold)", stopOpacity: .55 } as CSSProperties} />
        <stop offset="1" style={{ stopColor: "var(--sig-df-gold)", stopOpacity: 0 } as CSSProperties} />
      </radialGradient>
    </defs>
    <rect data-room-motion="dim" className="sig-df-dim" x="-200" y="-200" width={VIEW.w + 400} height={VIEW.h + 400} />
    <g data-room-motion="grid">
      {CELLS.map((c, i) => <path key={i} data-room-motion="cell" data-wave={c.wave.toFixed(2)} className="sig-df-cell" d={c.d} />)}
    </g>
    {BLUE.map((c, i) => <path key={`b${i}`} data-room-motion="team" data-team="blue" data-order={i} className="sig-df-team sig-df-blue" d={c.d} />)}
    {RED.map((c, i) => <path key={`r${i}`} data-room-motion="team" data-team="red" data-order={i} className="sig-df-team sig-df-red" d={c.d} />)}
    {players.map((p, i) => {
      const c = slotFor(i);
      return <ellipse key={p.id} data-room-motion="avatar-shadow" data-slot={i} className="sig-df-shadow" cx={fix(c.x)} cy={fix(c.y + 2)} rx="42" ry="10" />;
    })}
    <Monster kind="bouftou" cell={BOUFTOU_CELL} />
    <Monster kind="tofu" cell={TOFU_CELL} />
    <ellipse data-room-motion="ring" className="sig-df-ring" cx={GROUND.cx} cy={GROUND.cy} rx="260" ry="62" />
    <ellipse data-room-motion="flash" className="sig-df-flash" cx={GROUND.cx} cy={GROUND.cy - 40} rx="780" ry="330" />
  </g>;
}

/** Avatars des invités (HTML, au-dessus du SVG) : un par case bleue, les plus au fond d'abord pour l'ordre d'empilement. */
export function DofusActors({ players }: { players: DofusPlayer[] }) {
  const order = players.map((p, i) => ({ p, i, y: slotFor(i).y })).sort((a, b) => a.y - b.y);
  return <div className="sig-df sig-df-actors" data-testid="transition-dofus-actors">
    {order.map(({ p, i }) => {
      const c = slotFor(i);
      return <div key={p.id} className="sig-df-actor" data-testid={`transition-dofus-player-${p.id}`} data-slot={i}
        style={{ left: `${c.x / VIEW.w * 100}%`, top: `${(c.y + 4) / VIEW.h * 100}%` }}>
        <div data-room-motion="avatar" data-slot={i} className="sig-df-actor-in">
          <div className="sig-df-actor-size"><PlayerAvatar profile={p.profile} size="lg" /></div>
        </div>
      </div>;
    })}
  </div>;
}

/** Ordre de jeu : les invités, avec le Bouftou et le Tofu glissés parmi eux (tout est déterministe). */
function turnOrder(players: DofusPlayer[]): ({ kind: "player"; player: DofusPlayer } | { kind: "monster"; monster: "bouftou" | "tofu" })[] {
  const list: ({ kind: "player"; player: DofusPlayer } | { kind: "monster"; monster: "bouftou" | "tofu" })[] = players.map((player) => ({ kind: "player", player }));
  list.splice(Math.min(1, list.length), 0, { kind: "monster", monster: "bouftou" });
  list.splice(Math.min(3, list.length), 0, { kind: "monster", monster: "tofu" });
  return list;
}

/** Frise de la timeline : surimpression d'écran en bas à droite (hors caméra). */
export function DofusTimeline({ players }: { players: DofusPlayer[] }) {
  return <div className="sig-df sig-df-timeline" data-testid="transition-dofus-timeline" aria-hidden="true">
    {turnOrder(players).map((entry, i) => (
      <div key={i} className="sig-df-tile" data-room-motion="tile" data-active={i === 0 ? "true" : "false"}>
        {entry.kind === "player" ? <PlayerAvatar profile={entry.player.profile} size="sm" />
          : <img className="sig-df-tile-monster" src={SPRITES[entry.monster].href} alt="" draggable={false} />}
      </div>
    ))}
  </div>;
}

const fade = (...points: [number, number][]): SignatureFrame[] => [{ at: 0, opacity: points[0]![1] }, ...points.map(([at, opacity]) => ({ at, opacity })), { at: D, opacity: points.at(-1)![1] }]
  .filter((frame, i, all) => i === 0 || frame.at > all[i - 1]!.at);
const pose = (at: number, x: number, y: number, o: { sx?: number; sy?: number; rot?: number; opacity?: number; easing?: string } = {}): SignatureFrame =>
  ({ at, opacity: o.opacity ?? 1, transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(o.rot ?? 0).toFixed(1)}deg) scale(${o.sx ?? 1}, ${o.sy ?? 1})`, ...(o.easing ? { easing: o.easing } : {}) });

/** Rend un mouvement échantillonné (positions calculées par `at(p)`) puis le garde posé jusqu'à la fin. */
function sampled(from: number, to: number, step: number, at: (p: number) => SignatureFrame): SignatureFrame[] {
  const frames: SignatureFrame[] = [];
  for (let t = from; t < to; t += step) frames.push({ ...at((t - from) / (to - from)), at: t });
  frames.push({ ...at(1), at: to });
  return frames;
}

/** Animations de la scène dans la caméra (SVG et avatars). Tout est calé sur l'horloge de la scène. */
export function animateDofus(root: Element, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];

  animate(one("dim"), fade([T.grid, 0], [T.grid + 600, .22], [T.flash, .22], [T.flash + 250, .1]));

  // 1. La grille se dessine en vague depuis le centre.
  all("cell").forEach((e) => {
    const t = T.grid + Number((e as HTMLElement).dataset.wave) * T.gridWave;
    animate(e, fade([t, 0], [t + 260, 1]));
  });
  // 2. Les cases de placement s'allument (bleues puis rouges), avec un petit pulse.
  all("team").forEach((e) => {
    const el = e as HTMLElement, order = Number(el.dataset.order);
    const t = (el.dataset.team === "blue" ? T.blue : T.red) + order * 45;
    animate(e, fade([t, 0], [t + 180, 1], [t + 340, .75], [t + 520, 1]));
  });

  // 3. Les avatars tombent chacun sur leur case, avec un léger décalage, rebond et ombre au sol.
  all("avatar").forEach((e) => {
    const i = Number((e as HTMLElement).dataset.slot), t = T.drop + i * T.dropStagger;
    animate(e, [
      pose(0, 0, -320, { opacity: 0 }), pose(t, 0, -320, { opacity: 0, easing: "cubic-bezier(.5, 0, 1, .6)" }),
      pose(t + 120, 0, -200, { opacity: 1 }),
      pose(t + 330, 0, 0, { sx: 1.12, sy: .88, easing: "ease-out" }),
      pose(t + 460, 0, -26, { sx: .97, sy: 1.04, easing: "ease-in" }),
      pose(t + 590, 0, 0, { sx: 1.05, sy: .95 }), pose(t + 700, 0, 0),
      pose(D, 0, 0),
    ]);
  });
  all("avatar-shadow").forEach((e) => {
    const i = Number((e as HTMLElement).dataset.slot), t = T.drop + i * T.dropStagger;
    animate(e, [{ at: 0, opacity: 0, transform: "scale(.3)" }, { at: t + 120, opacity: 0, transform: "scale(.3)" },
      { at: t + 330, opacity: 1, transform: "scale(1)" }, { at: t + 460, opacity: .55, transform: "scale(.8)" }, { at: t + 590, opacity: 1, transform: "scale(1)" }, { at: D, opacity: 1, transform: "scale(1)" }]);
  });

  // 4a. Le Bouftou arrive en sautillant du côté du fond-droite, puis se pose sur sa case.
  {
    const from = 560, hops = 4, hopMs = 210, end = T.bouftou + hops * hopMs;
    animate(one("bouftou"), [pose(0, from, 0, { opacity: 0 }), ...sampled(T.bouftou, end, 35, (p) => {
      const k = Math.min(hops - 1, Math.floor(p * hops)), q = p * hops - k;
      const x = from * (1 - p), lift = Math.sin(q * Math.PI) * (58 - k * 8);
      const squash = q < .12 || q > .88 ? .9 : 1;
      return pose(0, x, -lift, { opacity: p < .02 ? 0 : 1, sy: squash, sx: 2 - squash, rot: Math.sin(q * Math.PI) * -7 });
    }), pose(end + 120, 0, 0, { sx: 1.08, sy: .92 }), pose(end + 240, 0, 0), pose(D, 0, 0)]);
    animate(one("bouftou-shadow"), fade([T.bouftou + 100, 0], [end - 80, 0], [end, 1]));
  }
  // 4b. Le Tofu arrive en volant (battements, oscillations) et se pose sur une autre case.
  {
    const fromX = 640, fromY = -380, end = T.tofu + 950;
    animate(one("tofu"), [pose(0, fromX, fromY, { opacity: 0 }), ...sampled(T.tofu, end, 35, (p) => {
      const e = 1 - Math.pow(1 - p, 3), calm = 1 - p;
      const flap = Math.sin(p * Math.PI * 14) * .07 * calm;
      return pose(0, fromX * (1 - e), fromY * (1 - e) + Math.sin(p * Math.PI * 5) * 28 * calm, { opacity: p < .02 ? 0 : 1, sx: 1 - flap, sy: 1 + flap, rot: Math.sin(p * Math.PI * 6) * 9 * calm });
    }), pose(end + 130, 0, 0, { sx: 1.1, sy: .9 }), pose(end + 260, 0, 0), pose(D, 0, 0)]);
    animate(one("tofu-shadow"), [{ at: 0, opacity: 0, transform: "scale(.3)" }, { at: T.tofu + 100, opacity: 0, transform: "scale(.3)" },
      { at: end, opacity: 1, transform: "scale(1)" }, { at: D, opacity: 1, transform: "scale(1)" }]);
  }

  // 6. Éclat doré : « début du combat », juste avant le replongeon.
  animate(one("flash"), [{ at: 0, opacity: 0, transform: "scale(.3)" }, { at: T.flash, opacity: 0, transform: "scale(.3)" },
    { at: T.flash + 150, opacity: 1, transform: "scale(.8)", easing: "ease-out" }, { at: T.flash + 500, opacity: 0, transform: "scale(1.2)" }, { at: D, opacity: 0, transform: "scale(1.2)" }]);
  animate(one("ring"), [{ at: 0, opacity: 0, transform: "scale(.2)" }, { at: T.flash, opacity: 0, transform: "scale(.2)" },
    { at: T.flash + 60, opacity: 1, transform: "scale(.4)", easing: "ease-out" }, { at: T.flash + 520, opacity: 0, transform: "scale(2.2)" }, { at: D, opacity: 0, transform: "scale(2.2)" }]);
}

/** La frise d'ordre de jeu : glisse depuis la droite, une case après l'autre, et disparaît avant le replongeon. */
export function animateDofusTimeline(root: Element, animate: Animate) {
  const tiles = [...root.querySelectorAll('[data-room-motion="tile"]')];
  animate(root, fade([T.timeline - 1, 0], [T.timeline, 1], [T.timelineOut - 260, 1], [T.timelineOut, 0]));
  tiles.forEach((e, i) => {
    const t = T.timeline + i * 30, off = "translate(26rem, 0rem)";
    animate(e, [
      { at: 0, opacity: 0, transform: off }, { at: t, opacity: 0, transform: off, easing: "cubic-bezier(.2, .9, .3, 1)" },
      { at: t + 60, opacity: 1, transform: off }, { at: t + 320, opacity: 1, transform: "translate(0rem, 0rem)" },
      { at: Math.max(T.flash, t + 330), opacity: 1, transform: "translate(0rem, 0rem)" }, { at: Math.max(T.flash, t + 330) + 120, opacity: 1, transform: `translate(0rem, ${i === 0 ? -.6 : 0}rem)` },
      { at: D, opacity: 1, transform: "translate(0rem, 0rem)" },
    ]);
  });
}
