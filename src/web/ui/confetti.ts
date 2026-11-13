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

/** Mélange de formes d'un tir : génériques + maison, dans la proportion `CONFETTI_CUSTOM_SHARE`. */
function shapeMix(): { shapes?: Shape[]; scalar: number } {
  const custom = paintShapes();
  if (custom.length === 0) return { scalar: 1 };
  const generic: Shape[] = ["square", "circle", "star"];
  const reps = Math.max(1, Math.round(((CONFETTI_CUSTOM_SHARE / (1 - CONFETTI_CUSTOM_SHARE)) * generic.length) / custom.length));
  return { shapes: [...generic, ...Array.from({ length: reps }, () => custom).flat()], scalar: CONFETTI_SCALAR };
}

export function fireConfetti(power: "small" | "big" = "small") {
  const colors = ["--color-accent", "--color-accent-strong", "--color-hot", "--color-cool", "--color-ink"].map(token).filter(Boolean);
  const base = { colors, zIndex: 60, disableForReducedMotion: true, ...shapeMix() };
  if (power === "small") {
    void confetti({ ...base, particleCount: 60, spread: 70, origin: { y: 0.7 } });
    return;
  }
  const end = Date.now() + 2500;
  const frame = () => {
    void confetti({ ...base, particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 } });
    void confetti({ ...base, particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
  void confetti({ ...base, particleCount: 160, spread: 110, startVelocity: 45, origin: { y: 0.5 } });
}
