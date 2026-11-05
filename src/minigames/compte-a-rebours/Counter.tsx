// Le gros compteur de la TV : net au début, puis glitché. Calé sur l'heure serveur (pas sur le moment où la page l'a reçu).
import { useEffect, useState } from "react";
import { serverNow } from "../../web/net/socket";
import { counterFrame, type Tone } from "./chaos";
import { fmtCounter } from "./rank";
import type { Pub } from "./game";

// Classes écrites en toutes lettres pour que Tailwind les repère.
export const TONE_CLASS: Record<Tone, string> = { ink: "text-ink", hot: "text-hot", cool: "text-cool", accent: "text-accent" };

/** Chaque caractère dans une case de largeur fixe : le compteur ne "danse" pas à cause des chiffres plus ou moins larges. */
export function Digits({ text }: { text: string }) {
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

/** Rafraîchit à chaque image d'écran tant que `on` est vrai. */
function useFrame(on: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = requestAnimationFrame(function loop() {
      setN((n) => n + 1);
      id = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [on]);
}

export function Counter({ pub }: { pub: Pub }) {
  const running = pub.phase === "running" && pub.startedAt !== null;
  useFrame(running);

  if (!running) {
    // Avant le départ : le compteur attend, immobile (au chiffre de départ).
    const start = pub.decompte ? pub.cible * 1000 : 0;
    return (
      <div data-testid="tv-counter" data-kind="idle" className="animate-pulse-soft font-display text-[17rem] leading-none text-ink-muted">
        <Digits text={fmtCounter(start)} />
      </div>
    );
  }

  const f = counterFrame(Math.max(0, serverNow() - pub.startedAt!), pub);
  const s = f.split;
  return (
    <div className="relative">
      {f.kind !== "clear" && f.kind !== "hidden" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 animate-pulse-soft rounded-full bg-hot/10 shadow-[0_0_8rem_var(--color-hot)]" />
      )}
      <div
        data-testid="tv-counter"
        data-kind={f.kind}
        className={`relative font-display text-[17rem] leading-none ${TONE_CLASS[f.tone]}`}
        style={{
          opacity: f.opacity,
          transform: `translate(${f.x}em, ${f.y}em) rotate(${f.rot}deg) skewX(${f.skew}deg) scale(${f.scale})`,
          textShadow: f.kind === "clear" ? "0 0 3rem var(--color-accent-deep)" : `${s}em 0 0 var(--color-hot), -${s}em 0 0 var(--color-cool)`,
        }}
      >
        <Digits text={f.text} />
      </div>
    </div>
  );
}
