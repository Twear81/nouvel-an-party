// Les mêmes tracés servent à tous les cadres : le skin choisit la forme, le profil choisit le décor.
import { useId, type CSSProperties } from "react";

function Outline() {
  return (
    <>
      <circle data-avatar-shape="circle" cx="50" cy="50" r="48" pathLength="100" />
      <rect data-avatar-shape="square" x="2" y="2" width="96" height="96" rx="2" pathLength="100" />
      <polygon data-avatar-shape="hexagon" points="50,2 98,26 98,74 50,98 2,74 2,26" pathLength="100" />
    </>
  );
}

export function AvatarFrame({ className }: { className: string }) {
  const gradient = useId();
  return (
    <svg data-ui="avatar-frame" className={`frame ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-accent-strong)" />
          <stop offset="0.35" stopColor="var(--p)" />
          <stop offset="0.65" stopColor="var(--color-ink)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
      </defs>
      <g data-ui="avatar-frame-outer" style={{ "--frame-shimmer": `url(#${gradient})` } as CSSProperties}><Outline /></g>
      <g data-ui="avatar-frame-inner" transform="translate(50 50) scale(0.86) translate(-50 -50)"><Outline /></g>
    </svg>
  );
}
