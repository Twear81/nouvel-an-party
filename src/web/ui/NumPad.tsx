// Pavé numérique du téléphone (3 colonnes × 4 rangées : 1-9, [virgule], 0, effacer). La logique de saisie reste
// dans le mini-jeu (`isUseless` grise les touches sans effet) ; ce composant ne dessine que les touches.
import { motion } from "motion/react";

interface Props {
  /** Affiche la touche « , » (montants) ; sinon la case est vide (nombres entiers). */
  allowComma?: boolean;
  /** Touche sans effet dans l'état actuel (grisée et désactivée). */
  isUseless: (key: string) => boolean;
  onKey: (key: string) => void;
  /** Préfixe des data-testid : `${testIdPrefix}1`, `${testIdPrefix}comma`, `${testIdPrefix}back`. */
  testIdPrefix?: string;
  /** "serious" : touches plates du décor sombre de Culture gênante. */
  tone?: "default" | "serious";
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

export function NumPad({ allowComma = false, isUseless, onKey, testIdPrefix = "key-", tone = "default" }: Props) {
  const serious = tone === "serious";
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
      {KEYS.map((k) => {
        if (k === "," && !allowComma) return <div key={k} />;
        return (
          <motion.button
            key={k}
            type="button"
            data-testid={`${testIdPrefix}${k === "," ? "comma" : k}`}
            aria-label={k === "back" ? "Effacer" : undefined}
            whileTap={{ scale: serious ? 0.92 : 0.9 }}
            disabled={isUseless(k)}
            onClick={() => {
              try {
                navigator.vibrate?.(8);
              } catch {
                /* pas de vibration (iOS) : tant pis */
              }
              onKey(k);
            }}
            className={`flex items-center justify-center text-3xl transition-opacity disabled:opacity-30 ${serious ? "border border-serious-line bg-serious-bg-2/70" : "glass rounded-btn font-display"}`}
          >
            {k === "back" ? "⌫" : k}
          </motion.button>
        );
      })}
    </div>
  );
}
