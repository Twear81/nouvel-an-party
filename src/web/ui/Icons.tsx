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
