// Disposition des étiquettes de joueurs sur l'axe des résultats : étages sans aucun chevauchement.

/** Largeur de l'axe (rem) : la TV est dessinée en 120 rem de large, moins le classement (30 rem) et les marges. */
export const AXIS_W_REM = 76;
/** Étiquette d'un joueur (avatar + pseudo + écart) : largeur max et hauteur d'un étage. */
export const LABEL_W_REM = 24;
export const LANE_REM = 3.6;
export const STEM_OFFSET_REM = 0.4;

interface Placed {
  id: string;
  /** Position du joueur sur l'axe (rem depuis la gauche). */
  px: number;
  /** Étiquette à droite de la tige (sinon à gauche, près du bord droit). */
  right: boolean;
  lane: number;
  from: number;
  to: number;
}

/**
 * Répartit les étiquettes en étages sans aucun chevauchement : deux étiquettes d'un même étage ne se touchent pas,
 * et la tige d'un joueur ne traverse pas l'étiquette d'un étage plus bas. Les étiquettes s'étendent du côté de la tige
 * où il y a de la place (escalier descendant vers le bord).
 */
export function layoutLanes(entries: { id: string; px: number }[], widthRem: number = AXIS_W_REM, labelRem: number = LABEL_W_REM): Placed[] {
  const placed: Placed[] = [];
  const mk = (e: { id: string; px: number }): Placed => {
    const right = e.px + labelRem - STEM_OFFSET_REM <= widthRem;
    return right
      ? { id: e.id, px: e.px, right, lane: 0, from: e.px - STEM_OFFSET_REM, to: e.px - STEM_OFFSET_REM + labelRem }
      : { id: e.id, px: e.px, right, lane: 0, from: e.px + STEM_OFFSET_REM - labelRem, to: e.px + STEM_OFFSET_REM };
  };
  const items = entries.map(mk);
  // Étiquettes tournées vers la gauche d'abord (de gauche à droite), puis celles tournées vers la droite (de droite à gauche) :
  // à chaque pas, la tige du nouveau joueur reste hors des étiquettes des étages plus bas.
  const order = [...items.filter((i) => !i.right).sort((a, b) => a.px - b.px), ...items.filter((i) => i.right).sort((a, b) => b.px - a.px)];
  const GAP = 0.6;
  for (const it of order) {
    const overlaps = (o: Placed) => it.from < o.to + GAP && o.from < it.to + GAP;
    const clean = (lane: number) =>
      !placed.some((o) => o.lane === lane && overlaps(o)) &&
      !placed.some((o) => o.lane < lane && it.px >= o.from && it.px <= o.to) &&
      !placed.some((o) => o.lane > lane && o.px >= it.from && o.px <= it.to);
    const free = (lane: number) => !placed.some((o) => o.lane === lane && overlaps(o));
    const max = placed.reduce((m, o) => Math.max(m, o.lane), -1) + 1;
    let lane = -1;
    for (let l = 0; l <= max && lane < 0; l++) if (clean(l)) lane = l;
    for (let l = 0; l <= max && lane < 0; l++) if (free(l)) lane = l;
    it.lane = lane < 0 ? max : lane;
    placed.push(it);
  }
  return placed;
}

