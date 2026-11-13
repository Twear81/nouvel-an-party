// Formes de confettis « maison » (clins d'œil aux invités), peintes UNE fois dans un canvas puis réutilisées par chaque
// tir : aucune image à charger, aucun coût par image. Pour en ajouter ou en retirer, éditer `CONFETTI_SHAPES` ci-dessous
// (docs/changer-le-design.md). Les couleurs sont propres à chaque dessin (ce sont des objets, pas des couleurs du thème).

/** Côté du canvas d'une forme, en pixels (affichée à `CONFETTI_SIZE / CONFETTI_SCALAR` px : net même sur la TV). */
export const CONFETTI_SIZE = 56;
/** Échelle globale passée à canvas-confetti : une forme apparaît à ≈ 31 px, les formes génériques grossissent d'autant. */
export const CONFETTI_SCALAR = 1.8;
/** Part des particules qui prennent une forme maison (le reste garde les formes génériques carré / cercle / étoile). */
export const CONFETTI_CUSTOM_SHARE = 0.55;

export type DrawShape = (ctx: OffscreenCanvasRenderingContext2D, s: number) => void;
type Ctx = OffscreenCanvasRenderingContext2D;

const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
};

const star = (ctx: Ctx, cx: number, cy: number, r: number) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
};

/** Tournesol : couronne de pétales jaunes autour d'un cœur brun. */
const tournesol: DrawShape = (ctx, s) => {
  const c = s / 2;
  ctx.fillStyle = "#f7b500";
  for (let i = 0; i < 14; i++) {
    const a = (i * Math.PI * 2) / 14;
    ellipse(ctx, c + Math.cos(a) * s * 0.33, c + Math.sin(a) * s * 0.33, s * 0.15, s * 0.07, a);
  }
  ctx.fillStyle = "#ffd23f";
  for (let i = 0; i < 14; i++) {
    const a = (i * Math.PI * 2) / 14 + Math.PI / 14;
    ellipse(ctx, c + Math.cos(a) * s * 0.28, c + Math.sin(a) * s * 0.28, s * 0.13, s * 0.06, a);
  }
  ctx.fillStyle = "#5a3416";
  ellipse(ctx, c, c, s * 0.19, s * 0.19);
  ctx.fillStyle = "#8a5424";
  ellipse(ctx, c - s * 0.04, c - s * 0.04, s * 0.09, s * 0.09);
};

/** Chou-fleur : bouquet de boules crème sur trois feuilles vertes. */
const chouFleur: DrawShape = (ctx, s) => {
  ctx.fillStyle = "#6fb04a";
  ellipse(ctx, s * 0.3, s * 0.72, s * 0.2, s * 0.1, -0.7);
  ellipse(ctx, s * 0.7, s * 0.72, s * 0.2, s * 0.1, 0.7);
  ctx.fillStyle = "#8ccb5e";
  ellipse(ctx, s * 0.5, s * 0.8, s * 0.16, s * 0.1);
  const bumps: [number, number, number][] = [[0.5, 0.3, 0.17], [0.3, 0.42, 0.16], [0.7, 0.42, 0.16], [0.4, 0.58, 0.16], [0.6, 0.58, 0.16], [0.5, 0.45, 0.17]];
  ctx.fillStyle = "#e9dcb4";
  for (const [x, y, r] of bumps) ellipse(ctx, s * x, s * y, s * r, s * r);
  ctx.fillStyle = "#fff6d8";
  for (const [x, y, r] of bumps) ellipse(ctx, s * (x - 0.04), s * (y - 0.04), s * r * 0.5, s * r * 0.5);
};

/** Boule de cristal orange à étoile rouge (clin d'œil Dragon Ball). */
const bouleDeCristal: DrawShape = (ctx, s) => {
  const c = s / 2;
  const g = ctx.createRadialGradient(c - s * 0.12, c - s * 0.14, s * 0.04, c, c, s * 0.46);
  g.addColorStop(0, "#ffd37a");
  g.addColorStop(0.55, "#ff9d1c");
  g.addColorStop(1, "#c85a00");
  ctx.fillStyle = g;
  ellipse(ctx, c, c, s * 0.44, s * 0.44);
  ctx.fillStyle = "#d4161c";
  star(ctx, c, c + s * 0.02, s * 0.2);
  ctx.fillStyle = "rgb(255 255 255 / 0.55)";
  ellipse(ctx, c - s * 0.17, c - s * 0.2, s * 0.09, s * 0.05, -0.7);
};

/** Balle de ping-pong : blanche, petit reflet, fine ligne de contour. */
const balleDePingPong: DrawShape = (ctx, s) => {
  const c = s / 2;
  const g = ctx.createRadialGradient(c - s * 0.12, c - s * 0.12, s * 0.03, c, c, s * 0.4);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#e7e2d4");
  ctx.fillStyle = g;
  ellipse(ctx, c, c, s * 0.34, s * 0.34);
  ctx.strokeStyle = "#d8d1bd";
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.ellipse(c, c, s * 0.34, s * 0.34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgb(255 255 255 / 0.9)";
  ellipse(ctx, c - s * 0.12, c - s * 0.14, s * 0.07, s * 0.04, -0.7);
};

/** Patte de chien ou de chat : un gros coussinet et quatre doigts. */
const patte: DrawShape = (ctx, s) => {
  ctx.fillStyle = "#8b5a35";
  ellipse(ctx, s * 0.5, s * 0.64, s * 0.2, s * 0.17);
  ellipse(ctx, s * 0.3, s * 0.4, s * 0.085, s * 0.11, -0.4);
  ellipse(ctx, s * 0.43, s * 0.27, s * 0.085, s * 0.11, -0.12);
  ellipse(ctx, s * 0.57, s * 0.27, s * 0.085, s * 0.11, 0.12);
  ellipse(ctx, s * 0.7, s * 0.4, s * 0.085, s * 0.11, 0.4);
  ctx.fillStyle = "#c98a5c";
  ellipse(ctx, s * 0.5, s * 0.62, s * 0.11, s * 0.08);
};

/** Les formes maison, mélangées à parts égales. Ajouter une ligne = une nouvelle forme dans les tirs. */
export const CONFETTI_SHAPES: { id: string; draw: DrawShape }[] = [
  { id: "tournesol", draw: tournesol },
  { id: "chou-fleur", draw: chouFleur },
  { id: "boule-de-cristal", draw: bouleDeCristal },
  { id: "balle-de-ping-pong", draw: balleDePingPong },
  { id: "patte", draw: patte },
];
