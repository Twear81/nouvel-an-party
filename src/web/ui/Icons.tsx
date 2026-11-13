// Petites icônes SVG (rendu identique partout, contrairement aux emoji ⏸ ⏭ qui varient selon l'OS).
import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: "1.15em",
  height: "1.15em",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
  focusable: false,
  ...props,
});

export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="5" y="4" width="5" height="16" rx="1.5" />
    <rect x="14" y="4" width="5" height="16" rx="1.5" />
  </svg>
);
export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  </svg>
);
export const SkipIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 5.2v13.6a1 1 0 0 0 1.5.86l9-6.8a1 1 0 0 0 0-1.72l-9-6.8A1 1 0 0 0 4 5.2Z" />
    <rect x="17" y="4" width="3.5" height="16" rx="1.5" />
  </svg>
);
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", ...p })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3.2 2.8 11.4a1 1 0 0 0 .66 1.75H5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-6.85h1.54a1 1 0 0 0 .66-1.75L12 3.2Z" />
  </svg>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "none", stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round", ...p })}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "none", stroke: "currentColor", strokeWidth: 3.6, strokeLinecap: "round", strokeLinejoin: "round", ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);
export const UndoIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", ...p })}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round", ...p })}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
);

/** Haut-parleur (son actif) et haut-parleur barré (son coupé ou pas encore autorisé par le navigateur). */
export const SpeakerIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V5.67a1 1 0 0 0-1.7-.77L8 8.5H5a1 1 0 0 0-1 1Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
export const SpeakerOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.3 3.6a1 1 0 0 0 1.7-.77V5.67a1 1 0 0 0-1.7-.77L8 8.5H5a1 1 0 0 0-1 1Z" />
    <path d="M17 9.5l5 5M22 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
