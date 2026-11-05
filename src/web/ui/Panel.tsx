// Carte en verre dépoli, base de tous les encarts.
import type { HTMLAttributes } from "react";

export function Panel({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass rounded-card ${className}`} {...rest} />;
}
