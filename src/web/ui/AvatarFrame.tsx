// Les mêmes tracés servent à tous les cadres : le skin choisit la forme, le profil choisit le décor.
// Les cadres à ornements (flammes, pétales, sceaux…) en posent le long du contour de CHAQUE forme (cercle, carré,
// hexagone) : ils suivent donc la silhouette du skin comme les traits. Les couleurs viennent des classes .frame-*.
import { useId, type CSSProperties } from "react";

type Shape = "circle" | "square" | "hexagon";

const HEXAGON: [number, number][] = [[50, 2], [98, 26], [98, 74], [50, 98], [2, 74], [2, 26]];
const SQUARE: [number, number][] = [[2, 2], [98, 2], [98, 98], [2, 98]];
const OUTLINES: Record<Shape, [number, number][] | null> = { circle: null, square: SQUARE, hexagon: HEXAGON };

function Outline() {
  return (
    <>
      <circle data-avatar-shape="circle" cx="50" cy="50" r="48" pathLength="100" />
      <rect data-avatar-shape="square" x="2" y="2" width="96" height="96" rx="2" pathLength="100" />
      <polygon data-avatar-shape="hexagon" points="50,2 98,26 98,74 50,98 2,74 2,26" pathLength="100" />
    </>
  );
}

/** Point du contour à la position t (0..1, depuis le haut du cercle / le coin haut-gauche du carré / le sommet de l'hexagone) et angle (°) de la direction sortante. */
function onOutline(shape: Shape, t: number): { x: number; y: number; angle: number } {
  const pts = OUTLINES[shape];
  let x: number;
  let y: number;
  if (!pts) {
    const a = t * 2 * Math.PI - Math.PI / 2;
    x = 50 + 48 * Math.cos(a);
    y = 50 + 48 * Math.sin(a);
  } else {
    const lengths = pts.map((p, i) => Math.hypot(pts[(i + 1) % pts.length]![0] - p[0], pts[(i + 1) % pts.length]![1] - p[1]));
    const total = lengths.reduce((s, l) => s + l, 0);
    let d = (((t % 1) + 1) % 1) * total;
    let i = 0;
    while (d > lengths[i]!) d -= lengths[i++]!;
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[(i + 1) % pts.length]!;
    x = x0 + ((x1 - x0) * d) / lengths[i]!;
    y = y0 + ((y1 - y0) * d) / lengths[i]!;
  }
  // Direction sortante = du centre vers le point (le décor « jaillit » du portrait, même dans les coins).
  return { x, y, angle: (Math.atan2(y - 50, x - 50) * 180) / Math.PI };
}

/** Pose `count` éléments le long du contour ; le dessin local pointe vers le haut (-y) et est tourné vers l'extérieur. */
function around(shape: Shape, count: number, start: number, draw: (i: number) => React.ReactNode, scale = (_i: number) => 1) {
  return Array.from({ length: count }, (_, i) => {
    const { x, y, angle } = onOutline(shape, start + i / count);
    return (
      <g key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(angle + 90).toFixed(1)}) scale(${scale(i)})`}>
        {draw(i)}
      </g>
    );
  });
}

// Dessins locaux (base en y = 0, pointe vers -y), en unités du viewBox 100×100.
const FLAME = "M-5.5,1 C-7,-6 -1.5,-9 -2.5,-17 C1.5,-13 4,-10 3,-6 C6.5,-9 8,-4 5.5,1Z";
const FLAME_CORE = "M-2.6,0.5 C-3.4,-3.5 -0.6,-5.5 -1,-9.5 C1,-7 2.2,-5.5 1.8,-3 C3.4,-4.5 3.8,-1.5 2.6,0.5Z";
const PETAL = "M0,2 C-4.6,-3 -4,-11 0,-15 C4,-11 4.6,-3 0,2Z";
const BIRD = "M0,-3 C-3,-8 -9,-10 -14,-6 C-10,-6 -7,-3 -5,2 C-3,0 -1.5,0.5 0,3 C1.5,0.5 3,0 5,2 C7,-3 10,-6 14,-6 C9,-10 3,-8 0,-3Z M-1.6,3 L0,11 L1.6,3Z M0,-12.5 m-2,0 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0Z";
const STUD = "M0,-3.6 L3.2,0 L0,3.6 L-3.2,0Z";

const COUNT: Record<Shape, number> = { circle: 12, square: 16, hexagon: 12 };
const SHAPES: Shape[] = ["circle", "square", "hexagon"];

/** Ornements posés AVANT les traits (ils passent dessous) ou APRÈS (par-dessus), selon le cadre. */
function Decor({ frame, layer }: { frame: string; layer: "under" | "over" }) {
  const deco = (shape: Shape, children: React.ReactNode, name: string) => (
    <g key={`${name}-${shape}`} data-ui="avatar-frame-deco" data-avatar-shape={shape} className={name}>{children}</g>
  );
  if (frame === "saiyan" && layer === "under") {
    return SHAPES.map((shape) => {
      const n = COUNT[shape];
      const flames = (parity: number) => around(shape, n, 0, () => (
        <>
          <path className="flame-outer" d={FLAME} />
          <path className="flame-core" d={FLAME_CORE} />
        </>
      ), () => (parity === 0 ? 1.35 : 0.85)).filter((_, i) => i % 2 === parity);
      // Deux hauteurs de flammes fixes : aucun redessin SVG pendant les animations du profil.
      return deco(shape, <><g className="flame-set flame-set-a">{flames(0)}</g><g className="flame-set flame-set-b">{flames(1)}</g></>, "deco-saiyan");
    });
  }
  if (frame === "tournesol" && layer === "under") {
    return SHAPES.map((shape) => {
      const n = COUNT[shape];
      return deco(shape, <>
        <g className="petals-back">{around(shape, n, 0.5 / n, () => <path d={PETAL} />, () => 1.1)}</g>
        <g className="petals-front">{around(shape, n, 0, () => <path d={PETAL} />, () => 0.95)}</g>
      </>, "deco-tournesol");
    });
  }
  if (frame === "geass" && layer === "over") {
    return SHAPES.map((shape) => deco(shape, around(shape, 4, shape === "square" ? 0 : 0.125, () => <path d={BIRD} />, () => 1.2), "deco-geass"));
  }
  if (frame === "karmine" && layer === "over") {
    return SHAPES.map((shape) => deco(shape, around(shape, 4, shape === "square" ? 0.125 : 0, () => <path d={STUD} />), "deco-karmine"));
  }
  return null;
}

export function AvatarFrame({ className, frame = "none" }: { className: string; frame?: string }) {
  const gradient = useId();
  return (
    <svg data-ui="avatar-frame" className={`frame ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-accent-strong)" />
          <stop offset="0.35" stopColor="var(--p)" />
          <stop offset="0.65" stopColor="var(--color-ink)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>
      <Decor frame={frame} layer="under" />
      <g data-ui="avatar-frame-outer" style={{ "--frame-shimmer": `url(#${gradient})` } as CSSProperties}><Outline /></g>
      <g data-ui="avatar-frame-inner" transform="translate(50 50) scale(0.86) translate(-50 -50)"><Outline /></g>
      <Decor frame={frame} layer="over" />
    </svg>
  );
}
