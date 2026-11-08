// Carte en verre dépoli, base de tous les encarts. `title` (facultatif) : titre du panneau, que les skins habillent
// à leur façon (barre de titre, bandeau…) via [data-ui="panel-title"].
import type { HTMLAttributes, ReactNode } from "react";

export function Panel({ className = "", title, children, ...rest }: Omit<HTMLAttributes<HTMLDivElement>, "title"> & { title?: ReactNode }) {
  return (
    <div data-ui="panel" className={`glass rounded-card ${className}`} {...rest}>
      {title != null && (
        <h3 data-ui="panel-title" className="font-display text-xl text-ink-muted">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
