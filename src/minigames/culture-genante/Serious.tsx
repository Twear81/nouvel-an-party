// Briques du mode « sérieux » de Culture gênante : décor sombre, chrono sobre, outils de mise en page.
// Toutes les couleurs et la typo viennent des jetons `serious-*` / `font-serious` (src/web/theme/theme.css) :
// pour refaire la mise en scène, on change ces jetons ou les scènes (Accroche, Bascule, Question, Reveal).
import type { ReactNode } from "react";
import type { RoundInfo } from "../../shared/types";
import { fit, useRemainingMs } from "../../web/ui";

/** Taille de police (rem) pour qu'un texte tienne sur `lines` lignes de `availRem` de large (≈ 0.5em par lettre en serif). */
export const fitText = (text: string, availRem: number, min: number, max: number, lines = 1) => fit(text, availRem, min, max, lines, 0.5);

/** Texte où les mots à trait d'union (« a-t-il », « Nouvelle-Zélande ») ne sont jamais coupés en fin de ligne. */
export function Unbroken({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\S*-\S*)/).map((part, i) =>
        part.includes("-") ? (
          <span key={i} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Décor « sérieux » de la TV : recouvre TOUTE la TV (y compris sous la barre de l'hôte, qui reste cliquable par-dessus)
 * et masque le décor festif. `pb-20` garde le coin bas-droit libre pour les boutons Pause / Passer.
 */
export function TvSerious({ children, testId, stage }: { children: ReactNode; testId?: string; stage?: string }) {
  return (
    <div data-testid={testId} data-stage={stage} className="absolute inset-0 flex flex-col bg-serious font-serious text-serious-ink">
      <div className="flex min-h-0 flex-1 flex-col px-24 pb-20 pt-12">{children}</div>
    </div>
  );
}

/** Décor « sérieux » d'un téléphone : plein écran, derrière le contenu. */
export function PhoneSerious({ children, testId, stage }: { children: ReactNode; testId?: string; stage?: string }) {
  return (
    <div data-testid={testId} data-stage={stage} className="relative flex min-h-0 flex-1 flex-col font-serious text-serious-ink">
      <div aria-hidden className="fixed inset-0 -z-10 bg-serious" />
      {children}
    </div>
  );
}

/** Chrono sobre : un trait qui se vide + les secondes. Lit la deadline serveur comme le chrono standard. */
export function SeriousTimer({ round, size }: { round: RoundInfo; size: "tv" | "phone" }) {
  const remaining = useRemainingMs(round);
  if (remaining == null) return null;
  const total = Math.max(1, round.timerTotalMs ?? remaining);
  const seconds = Math.ceil(remaining / 1000);
  const big = size === "tv";
  return (
    <div data-testid="cg-timer" className={`flex items-center ${big ? "gap-6" : "gap-3"}`}>
      <div className={`relative flex-1 overflow-hidden bg-serious-line ${big ? "h-1.5" : "h-1"}`}>
        <div className="absolute inset-y-0 left-0 bg-serious-accent transition-[width] duration-100 ease-linear" style={{ width: `${Math.min(100, (remaining / total) * 100)}%` }} />
      </div>
      <span className={`text-right tabular-nums text-serious-accent ${big ? "w-20 text-5xl" : "w-9 text-xl"}`}>{seconds}</span>
    </div>
  );
}

/** Lettre d'un choix : A, B, C, D (le formalisme fait partie du malaise). */
export const LETTERS = ["A", "B", "C", "D"] as const;
