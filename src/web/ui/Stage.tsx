// Mises en page d'écran : la TV est un cadre 16:9 centré (lettre-boîte), le téléphone plein écran portrait.
import type { ReactNode } from "react";
import { Backdrop } from "./Backdrop";

export function TvStage({ phase, children }: { phase?: string; children: ReactNode }) {
  return (
    <div data-phase={phase} className="flex h-full w-full items-center justify-center bg-bg">
      <div className="relative overflow-hidden" style={{ width: "min(100vw, calc(100vh * 16 / 9))", height: "min(100vh, calc(100vw * 9 / 16))" }}>
        <Backdrop />
        <div className="relative flex h-full w-full flex-col">{children}</div>
      </div>
    </div>
  );
}

export function PhoneStage({ phase, children }: { phase?: string; children: ReactNode }) {
  return (
    <div data-phase={phase} className="relative mx-auto h-full w-full max-w-[34rem] overflow-hidden">
      <div className="fixed inset-0 -z-0"><Backdrop stars={24} /></div>
      <div className="relative z-10 flex h-app min-h-0 flex-col pb-[env(safe-area-inset-bottom)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
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

export function PausedOverlay({ show, big }: { show: boolean; big?: boolean }) {
  if (!show) return null;
  return (
    <div data-testid="paused-overlay" className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-bg/80 backdrop-blur-md">
      <span className={`font-display text-gold-gradient ${big ? "text-[10rem]" : "text-6xl"}`}>PAUSE</span>
      <span className={`text-ink-muted ${big ? "text-4xl" : "text-lg"}`}>La partie reprend bientôt…</span>
    </div>
  );
}
