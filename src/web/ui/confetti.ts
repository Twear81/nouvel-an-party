// Confettis aux couleurs du thème (lues dans les variables CSS) + formes maison du thème (src/web/theme/confetti-shapes.ts),
// peintes une seule fois dans un canvas puis réutilisées par tous les tirs.
import confetti, { type Shape } from "canvas-confetti";
import { CONFETTI_CUSTOM_SHARE, CONFETTI_SCALAR, CONFETTI_SHAPES, CONFETTI_SIZE } from "../theme/confetti-shapes";

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let customShapes: Shape[] | null = null;

/** Peint chaque forme maison une fois (canvas hors écran) ; vide si le navigateur ne sait pas (le tir garde alors les formes génériques). */
function paintShapes(): Shape[] {
  if (customShapes) return customShapes;
  customShapes = [];
  try {
    const scale = 1 / CONFETTI_SCALAR;
    for (const { draw } of CONFETTI_SHAPES) {
      const canvas = new OffscreenCanvas(CONFETTI_SIZE, CONFETTI_SIZE);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      draw(ctx, CONFETTI_SIZE);
      customShapes.push({
        type: "bitmap",
        bitmap: canvas.transferToImageBitmap(),
        matrix: [scale, 0, 0, scale, (-CONFETTI_SIZE * scale) / 2, (-CONFETTI_SIZE * scale) / 2],
      } as unknown as Shape);
    }
  } catch {
    customShapes = [];
  }
  return customShapes;
}

/**
 * Tir mixte : les formes génériques gardent leur taille d'origine (scalar 1) ; les formes maison partent dans un tir
 * séparé, plus gros, avec seulement `CONFETTI_CUSTOM_SHARE` des particules (sinon elles masquent l'écran).
 */
function shoot(base: confetti.Options, opts: confetti.Options & { particleCount: number }) {
  const custom = paintShapes();
  const share = custom.length ? CONFETTI_CUSTOM_SHARE : 0;
  const customCount = Math.round(opts.particleCount * share);
  void confetti({ ...base, ...opts, particleCount: opts.particleCount - customCount });
  if (customCount > 0) void confetti({ ...base, ...opts, particleCount: customCount, shapes: custom, scalar: CONFETTI_SCALAR });
}

/** `keepLeft` : ne tire pas sur le tiers gauche de l'écran (ex. tableau d'honneur du classement final, qui doit rester lisible). */
export function fireConfetti(power: "small" | "big" = "small", keepLeft = false) {
  const colors = ["--color-accent", "--color-accent-strong", "--color-hot", "--color-cool", "--color-ink"].map(token).filter(Boolean);
  const base = { colors, zIndex: 60, disableForReducedMotion: true };
  if (power === "small") {
    shoot(base, { particleCount: 60, spread: 70, origin: { y: 0.7 } });
    return;
  }
  const end = Date.now() + 2500;
  let tick = 0;
  const frame = () => {
    // Formes maison une image sur quatre seulement dans les jets latéraux.
    const withCustom = tick++ % 4 === 0;
    if (!keepLeft) void confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
    void confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
    const custom = paintShapes();
    if (withCustom && custom.length) {
      if (!keepLeft) void confetti({ ...base, particleCount: 1, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, shapes: custom, scalar: CONFETTI_SCALAR });
      void confetti({ ...base, particleCount: 1, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, shapes: custom, scalar: CONFETTI_SCALAR });
    }
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  shoot(base, keepLeft
    ? { particleCount: 130, spread: 70, startVelocity: 45, origin: { x: 0.66, y: 0.5 } }
    : { particleCount: 160, spread: 110, startVelocity: 45, origin: { y: 0.5 } });
}
