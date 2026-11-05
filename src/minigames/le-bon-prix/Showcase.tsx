// Vitrine de l'objet : photo (config/medias) ou emoji, posé sur un piédestal sous un projecteur.
import { motion } from "motion/react";
import { useState } from "react";

interface Visual {
  image: string | null;
  emoji: string | null;
}

/** Photo de l'objet, ou son emoji (aussi en repli si la photo est introuvable). `rem` = hauteur visée. */
export function ItemVisual({ image, emoji, rem }: Visual & { rem: number }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken) {
    return (
      <img
        data-testid="bp-image"
        src={`/medias/${encodeURI(image)}`}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        className="object-contain drop-shadow-[0_1rem_1.5rem_rgb(0_0_0/0.55)]"
        style={{ height: `${rem}rem`, maxWidth: `${rem * 1.5}rem` }}
      />
    );
  }
  return (
    <span data-testid="bp-emoji" className="block select-none leading-none drop-shadow-[0_1rem_1.5rem_rgb(0_0_0/0.55)]" style={{ fontSize: `${rem * 0.82}rem`, height: `${rem}rem`, lineHeight: `${rem}rem` }}>
      {emoji ?? "🎁"}
    </span>
  );
}

const SPARKLES = [
  { x: "18%", y: "22%", d: 0, s: "3.5rem" },
  { x: "80%", y: "14%", d: 1.1, s: "2.5rem" },
  { x: "70%", y: "52%", d: 2.2, s: "3rem" },
  { x: "26%", y: "58%", d: 3, s: "2.2rem" },
];

/** La vitrine de la TV pendant le jeu : projecteur, objet qui flotte, piédestal. */
export function Showcase({ image, emoji }: Visual) {
  return (
    <div data-testid="bp-showcase" className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-y-0 left-1/2 w-[60rem] -translate-x-1/2 bg-[image:var(--gradient-spotlight)] [clip-path:polygon(40%_0,60%_0,100%_100%,0_100%)]"
      />
      {SPARKLES.map((s, i) => (
        <span key={i} aria-hidden className="animate-twinkle absolute" style={{ left: s.x, top: s.y, fontSize: s.s, animationDelay: `${s.d}s` }}>
          ✨
        </span>
      ))}

      <motion.div
        initial={{ y: -520, scale: 0.4, rotate: -25, opacity: 0 }}
        animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 90, damping: 11, delay: 0.1 }}
        className="relative z-10 -mb-[2.6rem]"
      >
        <motion.div animate={{ y: [0, -14, 0], rotate: [-2, 2, -2] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
          <ItemVisual image={image} emoji={emoji} rem={17} />
        </motion.div>
      </motion.div>

      {/* Piédestal : dessus doré en ellipse + fût */}
      <div className="relative flex flex-col items-center">
        <div className="relative z-[1] h-[5rem] w-[32rem] rounded-[50%] border-[0.2rem] border-accent-strong bg-[image:var(--gradient-pedestal-top)] shadow-glow" />
        <div className="-mt-[2.5rem] h-[4rem] w-[30rem] rounded-b-[50%] border-x border-b border-line bg-[image:var(--gradient-pedestal)]" />
      </div>
    </div>
  );
}
