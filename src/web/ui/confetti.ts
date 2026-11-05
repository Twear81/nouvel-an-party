// Confettis aux couleurs du thème (lues dans les variables CSS).
import confetti from "canvas-confetti";

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function fireConfetti(power: "small" | "big" = "small") {
  const colors = ["--color-accent", "--color-accent-strong", "--color-hot", "--color-cool", "--color-ink"].map(token).filter(Boolean);
  const base = { colors, zIndex: 60, disableForReducedMotion: true };
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
