// Rendu et tracé des dessins : le même composant sert sur la TV, sur les miniatures et sur la page du téléphone.
// Couleurs = feutres du thème (pen-0…pen-4) dans l'ordre de la palette ; la page est le « papier » du thème.
import { memo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { GRID, MAX_POINTS, MAX_POINTS_PER_STROKE, MAX_STROKES, MIN_STEP, WIDTHS, type Stroke } from "./shared";

/** Classes littérales (Tailwind doit les voir en entier) : index de palette → couleur du thème. */
export const PEN_STROKE = ["stroke-pen-0", "stroke-pen-1", "stroke-pen-2", "stroke-pen-3", "stroke-pen-4"] as const;
export const PEN_BG = ["bg-pen-0", "bg-pen-1", "bg-pen-2", "bg-pen-3", "bg-pen-4"] as const;
export const PEN_FILL = ["fill-pen-0", "fill-pen-1", "fill-pen-2", "fill-pen-3", "fill-pen-4"] as const;

/** Trait lissé : courbes quadratiques passant par les milieux des segments. */
function pathData(p: number[]): string {
  const n = p.length / 2;
  let d = `M${p[0]} ${p[1]}`;
  if (n === 2) return `${d}L${p[2]} ${p[3]}`;
  for (let i = 1; i < n - 1; i++) {
    const x = p[2 * i]!;
    const y = p[2 * i + 1]!;
    d += `Q${x} ${y} ${(x + p[2 * i + 2]!) / 2} ${(y + p[2 * i + 3]!) / 2}`;
  }
  return `${d}L${p[2 * n - 2]} ${p[2 * n - 1]}`;
}

const StrokeShape = memo(function StrokeShape({ s }: { s: Stroke }) {
  const width = WIDTHS[s.w] ?? WIDTHS[0];
  if (s.p.length < 4) return <circle cx={s.p[0]} cy={s.p[1]} r={width / 2} className={PEN_FILL[s.c]} />; // simple point
  return <path d={pathData(s.p)} fill="none" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className={PEN_STROKE[s.c]} />;
});

/** Le dessin lui-même (SVG sans fond). */
export function StrokesSvg({ strokes }: { strokes: Stroke[] }) {
  return (
    <>
      {strokes.map((s, i) => (
        <StrokeShape key={i} s={s} />
      ))}
    </>
  );
}

interface SheetProps {
  strokes: Stroke[];
  /** Texte au centre si la page est vide (« Page blanche »). */
  blankLabel?: string;
  testId?: string;
  className?: string;
}

/**
 * Une page carrée qui remplit le carré disponible dans son parent (qui doit avoir une taille définie).
 * Le trait est en unités de la grille : il grossit avec la page.
 */
export function Drawing({ strokes, blankLabel, testId, className = "" }: SheetProps) {
  return (
    <div className="size-full [container-type:size]">
      <div className="flex size-full items-center justify-center">
        <div
          data-testid={testId}
          data-strokes={strokes.length}
          className={`relative overflow-hidden rounded-btn bg-paper shadow-card ${className}`}
          style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
        >
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="absolute inset-0 size-full" aria-hidden>
            <StrokesSvg strokes={strokes} />
          </svg>
          {blankLabel && strokes.length === 0 && (
            <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-base font-bold italic leading-tight text-bg-3/60">{blankLabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface PadProps {
  strokes: Stroke[];
  color: number;
  width: number;
  disabled?: boolean;
  /** `final` = le doigt est levé (ou trait terminé) : le moment d'envoyer sans attendre. */
  onChange: (strokes: Stroke[], final: boolean) => void;
}

/** La page tactile : pointer events, aucun défilement/zoom/sélection/menu contextuel pendant qu'on dessine. */
export function DrawingPad({ strokes, color, width, disabled, onChange }: PadProps) {
  const svg = useRef<SVGSVGElement>(null);
  const cur = useRef(strokes); // le dessin le plus récent (les événements arrivent plus vite que les rendus)
  const emitted = useRef(strokes);
  const active = useRef<number | null>(null); // pointerId du doigt qui dessine
  if (strokes !== emitted.current) {
    // Changement venu d'ailleurs (annuler, tout effacer).
    cur.current = strokes;
    emitted.current = strokes;
  }

  const emit = (next: Stroke[], final: boolean) => {
    cur.current = next;
    emitted.current = next;
    onChange(next, final);
  };
  const total = () => cur.current.reduce((n, s) => n + s.p.length / 2, 0);
  const toPoint = (e: ReactPointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(GRID, Math.round(v)));
    return [clamp(((e.clientX - r.left) / r.width) * GRID), clamp(((e.clientY - r.top) / r.height) * GRID)];
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (disabled || active.current !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    if (cur.current.length >= MAX_STROKES || total() >= MAX_POINTS) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pas grave : le tracé continue tant que le doigt reste sur la page */
    }
    active.current = e.pointerId;
    const [x, y] = toPoint(e);
    emit([...cur.current, { c: color, w: width, p: [x, y] }], false);
  };

  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (active.current !== e.pointerId) return;
    e.preventDefault();
    const list = cur.current;
    const s = list[list.length - 1];
    if (!s || s.p.length / 2 >= MAX_POINTS_PER_STROKE || total() >= MAX_POINTS) return;
    const [x, y] = toPoint(e);
    if (Math.abs(x - s.p[s.p.length - 2]!) + Math.abs(y - s.p[s.p.length - 1]!) < MIN_STEP) return;
    emit([...list.slice(0, -1), { ...s, p: [...s.p, x, y] }], false);
  };

  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (active.current !== e.pointerId) return;
    active.current = null;
    emit(cur.current, true);
  };

  return (
    <div className="size-full [container-type:size]">
      <div className="flex size-full items-center justify-center">
        <div className="relative overflow-hidden rounded-card bg-paper shadow-card" style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}>
          <svg
            ref={svg}
            data-testid="draw-canvas"
            data-strokes={strokes.length}
            data-locked={disabled ? "true" : "false"}
            viewBox={`0 0 ${GRID} ${GRID}`}
            className="absolute inset-0 size-full touch-none select-none [-webkit-touch-callout:none]"
            style={{ touchAction: "none" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onContextMenu={(e) => e.preventDefault()}
          >
            <StrokesSvg strokes={strokes} />
          </svg>
        </div>
      </div>
    </div>
  );
}
