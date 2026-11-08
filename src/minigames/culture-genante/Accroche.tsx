// Scène 1 : l'ACCROCHE. La TV est festive, tout va bien, le texte rigolo s'écrit tout seul.
// Pour changer la mise en scène : modifier ce composant (il ne contient aucune logique de jeu).
// Média optionnel (config/medias) : `image` à côté du texte, `son` joué à l'arrivée (le navigateur de la TV
// autorise le son une fois que l'hôte a cliqué sur la page, ce qui est le cas pour lancer la partie).
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { fitText } from "./Serious";

/** Fait apparaître `text` lettre par lettre en `ms` millisecondes. */
function useTypewriter(text: string, ms: number): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const n = Math.min(text.length, Math.floor(((performance.now() - start) / ms) * text.length));
      setShown(n);
      if (n >= text.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [text, ms]);
  return shown;
}

const CONFETTI = [
  { e: "🎉", x: "8%", y: "12%", d: 0 },
  { e: "🥂", x: "86%", y: "16%", d: 0.6 },
  { e: "✨", x: "14%", y: "74%", d: 1.2 },
  { e: "🎈", x: "82%", y: "70%", d: 0.3 },
  { e: "🎊", x: "48%", y: "6%", d: 0.9 },
];

export function Accroche({ text, seconds, image, son }: { text: string; seconds: number; image: string | null; son: string | null }) {
  // Le texte finit de s'écrire avant la fin de l'étape, pour qu'on ait le temps de le lire.
  const shown = useTypewriter(text, Math.max(500, seconds * 1000 * 0.65));
  const size = fitText(text, 78, 3.5, 7.5, 2);
  return (
    <div data-testid="cg-accroche" className="flex min-h-0 flex-1 items-center justify-center gap-16 px-20 pb-16">
      {CONFETTI.map((c) => (
        <motion.span key={c.e} aria-hidden className="absolute text-[5rem]" style={{ left: c.x, top: c.y }} animate={{ y: [0, -24, 0], rotate: [-8, 8, -8] }} transition={{ duration: 3.5, repeat: Infinity, delay: c.d }}>
          {c.e}
        </motion.span>
      ))}
      {image && <img data-testid="cg-accroche-image" src={`/medias/${encodeURI(image)}`} alt="" draggable={false} className="max-h-[32rem] max-w-[40rem] rounded-card object-contain shadow-card" />}
      <p data-testid="cg-accroche-text" className="relative max-w-[78rem] text-balance text-center font-display leading-[1.15] text-gold-gradient" style={{ fontSize: `${size}rem` }}>
        {text.slice(0, shown)}
        {/* Le reste est déjà dans la page (invisible) : les retours à la ligne ne bougent pas pendant l'écriture. */}
        <span className="opacity-0">{text.slice(shown)}</span>
      </p>
      {son && <audio data-testid="cg-accroche-son" src={`/medias/${encodeURI(son)}`} autoPlay />}
    </div>
  );
}
