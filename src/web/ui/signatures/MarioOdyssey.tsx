// Scène Mario Odyssey : comme sur les murs 2D de Super Mario Odyssey, un Mario en pixel art 8-bit sort du tuyau vert,
// saute dans le mur (petit « pouf » pixelisé), court sur le sol de briques de la bande peinte, franchit d'un grand saut
// le vide du placard, cogne le bloc « ? » (il rebondit, une pièce 8-bit jaillit), puis fait un grand saut dans la TV
// dont l'écran s'illumine en iris carré.
// Tout est en coordonnées du viewBox de la pièce (1672×941). Les sprites font 16×16 : affichés à l'échelle entière ×3
// (un pixel de sprite = 3 unités) et déplacés par pas de 3, pour un mouvement saccadé façon NES. Pendant la scène, la
// caméra zoome d'un facteur qui rend ce pixel exactement égal à 6 pixels d'écran sur une TV 1920×1080.
// Mesures sur `piece-mario-odyssey.png` : sol de briques de la bande y ≈ 458, bloc « ? » à gauche de la TV x 546-586,
// y 409-449, tuyau vert (ouverture) x 190-284, y ≈ 523. Couleurs des effets : `.sig-mario` dans room.css.
import { SKIN_TIMING } from "../../../shared/transitions";
import type { Animate, SignatureFrame } from "../RoomSignature";
import piece from "../../theme/assets/piece-mario-odyssey.png";
import repos from "../../theme/assets/sprites/mario-odyssey-8bit-repos.png";
import course1 from "../../theme/assets/sprites/mario-odyssey-8bit-course1.png";
import course2 from "../../theme/assets/sprites/mario-odyssey-8bit-course2.png";
import course3 from "../../theme/assets/sprites/mario-odyssey-8bit-course3.png";
import saut from "../../theme/assets/sprites/mario-odyssey-8bit-saut.png";

const D = SKIN_TIMING.durationMs;
const PX = 3;                                    // un pixel de sprite, en unités du viewBox
const SPRITES = { repos, course1, course2, course3, saut } as const;
type SpriteName = keyof typeof SPRITES;
const GROUND = 459;                              // pieds de Mario sur le sol de briques de la bande
const PIPE = { x: 237, rimY: 526 };              // centre et ouverture du tuyau : Mario est masqué sous cette ligne
const BLOCK = { left: 546, top: 409, width: 40, height: 40 } as const;
const TV = { left: 627, top: 322, width: 244, height: 129 } as const;
/** Zoom de caméra : pixel de sprite = 6 px d'écran (1920 px d'écran / 1672 unités). */
const ZOOM = 2 * 1672 / 1920;
/** Instants de la scène (ms depuis le début de la transition). */
const T = {
  emerge: 1000, jump1: 1350, run1: 1780, gap: 2260, run2: 2930, hop: 3110, hit: 3270, run3: 3520, final: 4060, inTv: 4440,
  zoomIn: 1500, zoomOut: 4250, zoomEnd: SKIN_TIMING.plungeStartMs - 40,
} as const;
const STEP = 90;                                 // durée d'une image du cycle de course

interface Pose { at: number; x: number; y: number; sprite: SpriteName; shown: boolean }
const snap = (n: number) => Math.round(n / PX) * PX;

/** Trajectoire de Mario, échantillonnée toutes les 30 ms : position arrondie au pixel de sprite, image choisie par segment. */
function track(): Pose[] {
  const poses: Pose[] = [{ at: 0, x: PIPE.x, y: PIPE.rimY + 60, sprite: "repos", shown: false }];
  const sample = (from: number, to: number, at: (p: number, t: number) => { x: number; y: number; sprite: SpriteName }) => {
    for (let t = from; t < to; t += 30) poses.push({ at: t, ...at((t - from) / (to - from), t), shown: true });
  };
  const arc = (x0: number, y0: number, x1: number, y1: number, h: number) => (p: number) =>
    ({ x: snap(x0 + (x1 - x0) * p), y: snap(y0 + (y1 - y0) * p - 4 * h * p * (1 - p)), sprite: "saut" as SpriteName });
  const run = (x0: number, dx: number) => (_p: number, t0: number, from: number) => {
    const k = Math.floor((t0 - from) / STEP);
    return { x: x0 + dx * k, y: GROUND, sprite: (["course1", "course2", "course3"] as const)[k % 3]! };
  };
  // 1. Il sort du tuyau (masqué sous le bord), 2. saute dans le mur
  sample(T.emerge, T.jump1, (p) => ({ x: PIPE.x, y: snap(PIPE.rimY + 54 - 75 * p), sprite: "repos" }));
  sample(T.jump1, T.run1, arc(PIPE.x, PIPE.rimY - 21, 243, GROUND, 95));
  // 3. Course sur la bande, puis grand saut par-dessus le placard
  const r1 = run(243, 9); sample(T.run1, T.gap, (p, t) => r1(p, t, T.run1));
  sample(T.gap, T.run2, arc(288, GROUND, 528, GROUND, 85));
  const r2 = run(528, 3); sample(T.run2, T.hop, (p, t) => r2(p, t, T.run2));
  // 4. Saut sous le bloc « ? », 5. course jusqu'à la TV puis grand saut dans l'écran
  sample(T.hop, T.run3, arc(531, GROUND, 543, GROUND, 24));
  const r3 = run(543, 18); sample(T.run3, T.final, (p, t) => r3(p, t, T.run3));
  sample(T.final, T.inTv, arc(651, GROUND, 750, 410, 80));
  poses.push({ at: T.inTv, x: 750, y: 410, sprite: "saut", shown: false }, { at: D, x: 750, y: 410, sprite: "saut", shown: false });
  return poses;
}
const STEPPED = "steps(1, end)";

// --- Pièce 8-bit : 4 images (de face, 3/4, tranche, 3/4), chaque lettre = un pixel de sprite.
const COIN_FRAMES = [
  ["..DDDD..", ".DYYYYD.", "DYLLYYYD", "DYLYYYYD", "DYLYYYYD", "DYLYYYYD", "DYLYYYYD", "DYLYYYYD", "DYYYYYYD", "DYYYYYYD", ".DYYYYD.", "..DDDD.."],
  [".DDDD.", "DYLYYD", "DYLYYD", "DYLYYD", "DYLYYD", "DYLYYD", "DYLYYD", "DYLYYD", "DYLYYD", "DYYYYD", "DYYYYD", ".DDDD."],
  ["DD", "DY", "DY", "DY", "DY", "DY", "DY", "DY", "DY", "DY", "DY", "DD"],
  [".DDDD.", "DYYLYD", "DYYLYD", "DYYLYD", "DYYLYD", "DYYLYD", "DYYLYD", "DYYLYD", "DYYLYD", "DYYYYD", "DYYYYD", ".DDDD."],
] as const;
const COIN_TONE: Record<string, string> = { D: "sig-mario-coin-dark", Y: "sig-mario-coin", L: "sig-mario-coin-light" };

function CoinFrame({ rows, index }: { rows: readonly string[]; index: number }) {
  const rects: { x: number; y: number; w: number; tone: string }[] = [];
  rows.forEach((row, y) => {
    const offset = (8 - row.length) / 2;
    for (let x = 0; x < row.length;) {
      const c = row[x]!; let w = 1;
      while (row[x + w] === c) w++;
      if (c !== ".") rects.push({ x: x + offset, y, w, tone: COIN_TONE[c]! });
      x += w;
    }
  });
  return <g data-room-motion="coin-frame" data-frame={index}>
    {rects.map((r, i) => <rect key={i} className={r.tone} x={(r.x - 4) * PX} y={(r.y - 12) * PX} width={r.w * PX} height={PX} />)}
  </g>;
}

// Éclats du « pouf » pixelisé quand Mario entre dans le mur : 8 carrés qui partent dans toutes les directions.
const POUF = Array.from({ length: 8 }, (_, i) => ({ dx: Math.round(Math.cos(i * Math.PI / 4) * 14) * PX, dy: Math.round(Math.sin(i * Math.PI / 4) * 12) * PX, big: i % 2 === 0 }));
const POUF_AT = { x: 243, y: 438 };

export function MarioOdysseyScene() {
  return <g className="sig-mario">
    <defs>
      <clipPath id="mario-pipe-clip"><rect x="0" y="0" width="1672" height={PIPE.rimY} /></clipPath>
      <clipPath id="mario-block-clip"><rect x={BLOCK.left} y={BLOCK.top - 2 * PX} width={BLOCK.width} height={BLOCK.height + 2 * PX} /></clipPath>
    </defs>
    {/* Mario : un calque par image du sprite, une seule est visible à la fois */}
    <g clipPath="url(#mario-pipe-clip)">
      <g data-room-motion="mario">
        {(Object.keys(SPRITES) as SpriteName[]).map((name) =>
          <image key={name} data-room-motion="mario-sprite" data-sprite={name} href={SPRITES[name]} x={-8 * PX} y={-16 * PX} width={16 * PX} height={16 * PX} />)}
      </g>
    </g>
    {/* Le bloc « ? » : une copie de la peinture qui rebondit d'un cran (rognée sur le bloc, 2 pixels de marge en haut seulement : en bas on verrait le sol de briques) */}
    <g clipPath="url(#mario-block-clip)">
      <g data-room-motion="block"><image href={piece} x="0" y="0" width="1672" height="941" preserveAspectRatio="xMidYMid slice" /></g>
    </g>
    <g data-room-motion="pouf" transform={`translate(${POUF_AT.x} ${POUF_AT.y})`}>
      {POUF.map((p, i) => <rect key={i} data-room-motion="pouf-bit" data-bit={i} className={p.big ? "sig-mario-pouf" : "sig-mario-pouf-b"}
        x={-PX * (p.big ? 2 : 1.5)} y={-PX * (p.big ? 2 : 1.5)} width={PX * (p.big ? 4 : 3)} height={PX * (p.big ? 4 : 3)} />)}
    </g>
    <g data-room-motion="coin">
      {COIN_FRAMES.map((rows, i) => <CoinFrame key={i} rows={rows} index={i} />)}
    </g>
    <rect data-room-motion="iris-edge" className="sig-mario-iris-edge" x={TV.left - PX * 2} y={TV.top - PX * 2} width={TV.width + PX * 4} height={TV.height + PX * 4} />
    <rect data-room-motion="iris" className="sig-mario-iris" x={TV.left} y={TV.top} width={TV.width} height={TV.height} />
  </g>;
}

const jump = (at: number, extra: Partial<SignatureFrame> = {}): SignatureFrame => ({ at, easing: STEPPED, ...extra });

/** Zoom de caméra vers la bande (ajouté à la caméra, revenu à zéro avant le replongeon). */
function cameraFrames(): SignatureFrame[] {
  const rest = (at: number, easing?: string): SignatureFrame => ({ at, transform: "translate(0%, 0%) scale(1)", composite: "add", ...(easing ? { easing } : {}) });
  const zoom = (at: number): SignatureFrame => ({ at, transform: `translate(0%, ${(-(ZOOM - 1) * 50).toFixed(2)}%) scale(${ZOOM.toFixed(4)})`, composite: "add" });
  return [rest(0), rest(SKIN_TIMING.zoomOutEndMs, "ease-in-out"), zoom(T.zoomIn), zoom(T.zoomOut), rest(T.zoomEnd, "ease-in-out"), rest(D)];
}

/** Animations de la scène : tout est calé sur l'horloge fournie (pause comprise), aucun temps autonome. */
export function animateMarioOdyssey(root: Element, animate: Animate) {
  const one = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => [...root.querySelectorAll(`[data-room-motion="${name}"]`)];
  animate(root.closest(".room-camera"), cameraFrames());

  // Mario : position (pas de 3 unités, saccadée) et image du sprite.
  const poses = track();
  animate(one("mario"), poses.map((p) => jump(p.at, { opacity: p.shown ? 1 : 0, transform: `translate(${p.x}px, ${p.y}px)` })));
  all("mario-sprite").forEach((e) => {
    const name = (e as HTMLElement).dataset.sprite;
    const frames: SignatureFrame[] = [];
    for (const p of poses) {
      const opacity = p.sprite === name ? 1 : 0;
      if (!frames.length || frames[frames.length - 1]!.opacity !== opacity) frames.push(jump(p.at, { opacity }));
    }
    animate(e, frames);
  });

  // La copie du bloc apparaît avec la pièce transformée, puis rebondit d'un cran quand Mario le cogne.
  const blk = (at: number, dy: number, opacity = 1, easing?: string): SignatureFrame => ({ at, opacity, transform: `translate(0px, ${dy}px)`, ...(easing ? { easing } : {}) });
  animate(one("block"), [blk(0, 0, 0), blk(SKIN_TIMING.zoomOutEndMs, 0, 0), blk(SKIN_TIMING.roomSkinFadeEndMs, 0, 1),
    blk(T.hit - 1, 0, 1, STEPPED), blk(T.hit, -2 * PX, 1, STEPPED), blk(T.hit + 90, -PX, 1, STEPPED), blk(T.hit + 180, 0, 1), blk(D, 0, 1)]);

  // Pièce : jaillit du dessus du bloc en tournant (image changée toutes les 60 ms), monte puis retombe et disparaît.
  const up = 520;
  const coinPose: { at: number; y: number }[] = [];
  for (let t = 0; t < up; t += 30) coinPose.push({ at: T.hit + t, y: snap(BLOCK.top - 6 - 110 * Math.sin(t / up * Math.PI)) });
  const coinX = BLOCK.left + BLOCK.width / 2;
  animate(one("coin"), [jump(0, { opacity: 0, transform: `translate(${coinX}px, ${BLOCK.top}px)` }),
    ...coinPose.map((c) => jump(c.at, { opacity: 1, transform: `translate(${coinX}px, ${c.y}px)` })),
    jump(T.hit + up, { opacity: 0, transform: `translate(${coinX}px, ${BLOCK.top}px)` }), jump(D, { opacity: 0 })]);
  all("coin-frame").forEach((e) => {
    const index = Number((e as HTMLElement).dataset.frame);
    const frames: SignatureFrame[] = [jump(0, { opacity: 0 })];
    for (let t = 0, k = 0; t < up; t += 60, k++) frames.push(jump(T.hit + t, { opacity: k % 4 === index ? 1 : 0 }));
    frames.push(jump(T.hit + up, { opacity: 0 }), jump(D, { opacity: 0 }));
    animate(e, frames);
  });

  // Pouf d'entrée dans le mur : carrés qui s'écartent par pas, puis s'éteignent.
  all("pouf-bit").forEach((e) => {
    const bit = POUF[Number((e as HTMLElement).dataset.bit)]!;
    const at = (k: number, scale: number, opacity: number): SignatureFrame =>
      jump(T.run1 - 60 + k * 70, { opacity, transform: `translate(${snap(bit.dx * scale)}px, ${snap(bit.dy * scale)}px)` });
    animate(e, [jump(0, { opacity: 0, transform: "translate(0px, 0px)" }), at(0, 0, 1), at(1, .35, 1), at(2, .7, 1), at(3, 1, 1), at(4, 1.2, 0), jump(D, { opacity: 0 })]);
  });

  // Écran de la TV : iris carré par pas (centre vers les bords), éclat maintenu pendant le replongeon, puis fondu.
  const iris = (name: string, delay: number) => animate(one(name), [
    { at: 0, opacity: 0, transform: "scale(.1)" }, jump(T.inTv + delay - 1, { opacity: 0, transform: "scale(.1)" }), jump(T.inTv + delay, { opacity: 1, transform: "scale(.25)" }),
    jump(T.inTv + delay + 60, { opacity: 1, transform: "scale(.5)" }), jump(T.inTv + delay + 120, { opacity: 1, transform: "scale(.75)" }),
    jump(T.inTv + delay + 180, { opacity: 1, transform: "scale(1)" }),
    { at: SKIN_TIMING.plungeEndMs - 700, opacity: 1, transform: "scale(1)" }, { at: SKIN_TIMING.plungeEndMs, opacity: 0, transform: "scale(1)" }, { at: D, opacity: 0, transform: "scale(1)" },
  ]);
  iris("iris-edge", 0);
  iris("iris", 60);
}
