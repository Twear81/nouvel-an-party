// Boîte de confirmation dans le style du jeu (remplace window.confirm, qui sort du plein écran et détonne sur la TV).
import { motion } from "motion/react";
import { useEffect } from "react";
import { Button } from "./Button";

interface Props {
  title: string;
  /** Libellé du bouton de validation (le geste, pas "OK" : « Retirer », « Retourner au lobby »). */
  confirmLabel: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, detail, confirmLabel, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div data-testid="confirm-dialog" role="alertdialog" aria-modal="true" aria-label={title} className="absolute inset-0 z-[55] flex items-center justify-center bg-bg/80 backdrop-blur-(--scrim-blur)">
      <motion.div initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} data-ui="dialog" className="glass flex max-w-[52rem] flex-col items-center gap-8 rounded-card px-14 py-10 text-center">
        <h2 className="text-balance font-display text-5xl leading-tight text-gold-gradient">{title}</h2>
        {detail && <p className="text-3xl text-ink-muted">{detail}</p>}
        <div className="flex items-center gap-6">
          <Button autoFocus /* action sûre par défaut : Entrée = Annuler */ data-testid="confirm-no" variant="secondary" size="lg" onClick={onCancel}>
            Annuler
          </Button>
          <Button data-testid="confirm-yes" variant="danger" size="lg" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
