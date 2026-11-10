// Design « Chronomètre digital » : de gros chiffres. Chaos : les chiffres sautent, tournent, se dédoublent en rose et bleu,
// s'effacent, repartent à l'envers ou se changent en points d'interrogation.
import type { DesignProps } from "../chaos";
import { fmtCounter } from "../rank";

// Classes écrites en toutes lettres pour que Tailwind les repère.
const TONES = ["text-ink", "text-hot", "text-cool", "text-accent"];

// Chaque caractère dans une case de largeur fixe : un compteur ne « danse » pas à cause des chiffres plus ou moins larges.
function Digits({ text }: { text: string }) {
  return (
    <>
      {[...text].map((c, i) => (
        <span key={i} className="inline-block text-center" style={{ width: c === "," ? "0.4em" : c === "+" || c === "−" ? "0.7em" : "0.8em" }}>
          {c}
        </span>
      ))}
    </>
  );
}

export function Digital({ chaos: c, shown }: DesignProps) {
  const jit = (k: number) => c.rnd(c.frame * 7 + k) - 0.5;
  const p = c.power;
  const clear = c.mode === "clear";
  const split = clear ? 0 : c.mode === "tremble" ? 0.1 : 0.03 + 0.07 * p * c.rnd(c.frame * 3 + 9);
  let x = clear ? 0 : jit(1) * 0.5 * p;
  let y = clear ? 0 : jit(2) * 0.25 * p;
  let rot = clear ? 0 : jit(3) * 8 * p;
  let skew = clear ? 0 : jit(4) * 16 * p;
  let scale = clear ? 1 : 1 + jit(5) * 0.18 * p;
  let opacity = 1;
  let text = fmtCounter(shown);
  if (c.mode === "freeze") [x, y, rot, skew] = [0, 0, 0, 0];
  if (c.mode === "hidden") {
    opacity = 0.03 + 0.05 * c.rnd(c.frame);
    if (c.bucket % 2) text = "??,??";
  }
  if (c.mode === "jump") {
    x = (c.rnd(c.bucket + 4) - 0.5) * 0.6;
    y = (c.rnd(c.bucket + 6) - 0.5) * 0.4;
    rot = (c.rnd(c.bucket + 8) - 0.5) * 24;
    scale = 0.6 + c.rnd(c.bucket + 12) * 0.6;
  }
  const tone = clear ? "text-accent" : c.mode === "tremble" ? "text-hot" : TONES[Math.floor(c.rnd(c.bucket + 21) * TONES.length)]!;
  return (
    <div className="relative">
      {!clear && c.mode !== "hidden" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full bg-hot/10 shadow-[0_0_8rem_var(--color-hot)]" />
      )}
      <div
        data-ui="animated-number"
        className={`relative font-display text-[17rem] leading-none ${tone}`}
        style={{
          opacity,
          transform: `translate(${x}em, ${y}em) rotate(${rot}deg) skewX(${skew}deg) scale(${scale})`,
          textShadow: clear ? "0 0 3rem var(--color-accent-deep)" : `${split}em 0 0 var(--color-hot), -${split}em 0 0 var(--color-cool)`,
        }}
      >
        <Digits text={text} />
      </div>
    </div>
  );
}
