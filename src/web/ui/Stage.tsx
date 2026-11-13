// Mises en page d'écran : la TV est un cadre 16:9 centré (lettre-boîte), le téléphone plein écran portrait.
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Backdrop } from "./Backdrop";

export function TvStage({ phase, children }: { phase?: string; children: ReactNode }) {
  return (
    <div data-phase={phase} data-ui="stage-tv" className="flex h-full w-full items-center justify-center bg-bg">
      <div className="relative overflow-hidden" style={{ width: "min(100vw, calc(100vh * 16 / 9))", height: "min(100vh, calc(100vw * 9 / 16))" }}>
        <Backdrop />
        <div className="relative flex h-full w-full flex-col">{children}</div>
      </div>
    </div>
  );
}

export function PhoneStage({ phase, children }: { phase?: string; children: ReactNode }) {
  return (
    <div data-phase={phase} data-ui="stage-phone" className="relative mx-auto h-full w-full max-w-[34rem] overflow-hidden">
      <div className="fixed inset-0 -z-0"><Backdrop stars={24} still /></div>
      <div className="relative z-10 flex h-app min-h-0 flex-col pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {children}
      </div>
    </div>
  );
}

/** Bandeau "Reconnexion…" (téléphone et TV). */
export function ReconnectBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div data-testid="reconnecting" className="fixed left-1/2 top-2 z-50 -translate-x-1/2 animate-pulse-soft rounded-chip bg-warn px-4 py-1.5 text-sm font-bold text-accent-ink shadow-card">
      Reconnexion…
    </div>
  );
}

/**
 * Pause. Sur la TV (`big`) : cliffhanger de K-drama. L'écran de jeu reste en place sous un voile (il zoome en trois à-coups,
 * voir `PauseZoom`), deux bandes de cinéma se ferment et « À suivre… » s'affiche comme à la fin d'un épisode. Volontairement
 * indépendant des skins (`data-ui="paused-cliffhanger"`, couleurs --color-cinema*) : toujours lisible, quel que soit l'univers.
 * Sur le téléphone : le simple « PAUSE » d'origine.
 */
export function PausedOverlay({ show, big }: { show: boolean; big?: boolean }) {
  if (!show) return null;
  if (!big) {
    return (
      <div data-testid="paused-overlay" data-ui="paused" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-bg/80 backdrop-blur-(--scrim-blur)">
        <span className="font-display text-gold-gradient text-6xl">PAUSE</span>
        <span className="text-ink-muted text-lg">La partie reprend bientôt…</span>
      </div>
    );
  }
  return (
    <div data-testid="paused-overlay" data-ui="paused-cliffhanger" className="pointer-events-none absolute inset-0 z-40 overflow-hidden bg-bg/50">
      {(["top", "bottom"] as const).map((side) => (
        <motion.div
          key={side}
          data-ui="cinema-bar"
          initial={{ y: side === "top" ? "-100%" : "100%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={`absolute inset-x-0 h-[12%] bg-cinema ${side === "top" ? "top-0" : "bottom-0"}`}
        />
      ))}
      <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <motion.div
          data-ui="cliffhanger-title"
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
          className="flex w-full justify-center bg-cinema/80 py-8"
        >
          <motion.span
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
            className="font-display text-[9rem] leading-none text-cinema-ink"
          >
            À suivre…
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
}

/** Zoom dramatique de la pause : trois à-coups successifs (transform seulement), retour en douceur à la reprise. */
export function PauseZoom({ paused, children }: { paused: boolean; children: ReactNode }) {
  return (
    <motion.div
      data-ui="pause-zoom"
      data-paused={paused}
      initial={false}
      animate={paused ? { scale: [1, 1.04, 1.04, 1.08, 1.08, 1.12, 1.12] } : { scale: 1 }}
      transition={paused ? { duration: 2.2, times: [0, 0.07, 0.35, 0.42, 0.7, 0.77, 1], ease: "easeOut" } : { duration: 0.3 }}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
