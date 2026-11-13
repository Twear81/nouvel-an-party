// Images peintes de la cérémonie et du classement final, et points d'ancrage dans la pièce.
// Les PNG se déposent dans `assets/ceremonie/` (liste et noms exacts : docs/changer-le-design.md#images-de-la-cérémonie).
// Un fichier absent n'empêche rien : la scène dessine un remplaçant sobre (CSS du thème) de mêmes proportions,
// et prend l'image dès que le fichier est déposé.
//
// Toutes les coordonnées sont des fractions de l'illustration `piece-reference.png` (1672 × 941 px), mesurées dessus :
// `piece-nuit.png` a le même cadrage, donc les mêmes ancres.

/** Noms de fichier attendus dans `assets/ceremonie/`. */
export type CeremonieImage =
  | "piece-nuit" | "podium" | "cadre-dore" | "cloche" | "journal" | "projecteur" | "etoile" | "cuillere" | "tableau-honneur";

export const CEREMONIE_IMAGE_NAMES: readonly CeremonieImage[] = [
  "piece-nuit", "podium", "cadre-dore", "cloche", "journal", "projecteur", "etoile", "cuillere", "tableau-honneur",
];

// Vite remplace l'appel à la compilation ; sous Bun (tests unitaires) il n'existe pas : aucune image.
function loadImages(): Record<string, string> {
  try { return import.meta.glob<string>("./assets/ceremonie/*.png", { eager: true, query: "?url", import: "default" }); } catch { return {}; }
}
const found = loadImages();

/** Adresse de l'image peinte, ou `undefined` si elle n'est pas (encore) livrée. */
export const ceremonieImage = (name: CeremonieImage): string | undefined => found[`./assets/ceremonie/${name}.png`];

/** Proportions (largeur / hauteur) des images à fond transparent : le remplaçant CSS les reprend. */
export const CEREMONIE_ASPECT = {
  podium: 1200 / 700,
  "cadre-dore": 900 / 700,
  cloche: 700 / 800,
  journal: 1000 / 1300,
  projecteur: 800 / 1400,
  etoile: 1,
  cuillere: 600 / 900,
  "tableau-honneur": 1000 / 1300,
} as const;

export const ROOM_W = 1672;
export const ROOM_H = 941;
export const ROOM_ASPECT = ROOM_W / ROOM_H;

/** Fraction de l'illustration à partir de pixels de l'illustration. */
const px = (x: number, y: number) => ({ x: x / ROOM_W, y: y / ROOM_H });
const rect = (left: number, top: number, width: number, height: number) => ({
  left: left / ROOM_W, top: top / ROOM_H, width: width / ROOM_W, height: height / ROOM_H,
});

/**
 * Points d'ancrage de la pièce. Les objets sont posés « par le bas » (`bottom`) ou « par le centre » (`center`).
 * `width` = largeur de l'objet en fraction de la largeur de l'illustration.
 */
export const ANCHORS = {
  /** Écran de la télévision dessinée (même rectangle que la scène d'ouverture). */
  tv: rect(627, 322, 244, 129),
  /** Table de la partie : ellipse sur laquelle s'assoient les portraits. */
  table: { x: 0.48, y: 0.79, radiusX: 0.24, radiusY: 0.104 },
  /** Mur du fond, au-dessus du placard et à gauche de la cheminée : le dessin encadré. */
  frame: { center: px(411, 203), width: 200 / ROOM_W },
  /** Plateau de la table basse en verre : la cloche du Bon Prix (posée par le bas) et le journal (à plat). */
  bell: { bottom: px(790, 752), width: 128 / ROOM_W },
  journal: { center: px(905, 748), width: 96 / ROOM_W, tilt: -7 },
  /** Cheminée : le podium se pose sur le sol devant, centré sur le foyer. */
  podium: { bottom: px(752, 756), width: 560 / ROOM_W },
  /** Jukebox : centre de son halo et rayon (fraction de la largeur). */
  jukebox: { center: px(1282, 610), radius: 175 / ROOM_W },
  /** Verre des deux fenêtres : le feu d'artifice y est découpé (rectangles, rien ne déborde sur le mur). */
  windows: [rect(1103, 284, 68, 308), rect(1493, 222, 146, 436)],
} as const;

/**
 * Places sur le podium, en fraction de l'image `podium.png` mesurée sur le fichier livré : `x` = centre du bloc,
 * `feet` = hauteur de son plateau (les pieds du portrait y reposent), `number` = centre de sa face avant (chiffre écrit par le code).
 * Le 1er n'a pas de portrait sur son bloc : il apparaît dans l'écran de la télévision.
 */
export const PODIUM_SLOTS = {
  second: { x: 0.23, feet: 0.46, number: 0.62 },
  first: { x: 0.5, feet: 0.35, number: 0.575 },
  third: { x: 0.78, feet: 0.565, number: 0.664 },
} as const;

/**
 * Tableau d'honneur : sur la gauche de l'écran, sous le dessin encadré (placard, porte et pouf), car la droite est
 * occupée par le jukebox et les fenêtres où le feu d'artifice doit se voir. `side: "right"` le renverse.
 * Tailles en % de la scène (1920 × 1080) ; `inner` = zone de velours (en fraction de l'image) où se rangent les lignes.
 */
export const HONOR_BOARD = {
  side: "left" as "left" | "right",
  marginPct: 1.2,
  topPct: 29,
  heightPct: 70,
  /** Zone de velours sous la couronne de laurier (mesurée sur `tableau-honneur.png`). */
  inner: { left: 0.105, right: 0.14, top: 0.215, bottom: 0.1 },
  /** Nombre de lignes réservées (huit joueurs au plus). */
  rows: 8,
} as const;

/** Place `index` sur `count` autour de la table (fractions de l'illustration), la première en haut puis dans le sens horaire. */
export function seat(index: number, count: number): { x: number; y: number; angle: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(count, 1);
  return { x: ANCHORS.table.x + Math.cos(angle) * ANCHORS.table.radiusX, y: ANCHORS.table.y + Math.sin(angle) * ANCHORS.table.radiusY, angle };
}

/** De quel côté du portrait écrire le pseudo pour qu'il ne recouvre ni la table ni ses voisins (même règle que la scène d'ouverture). */
export function seatLabelSide(angle: number): "top" | "bottom" | "left" | "right" {
  return Math.sin(angle) < -0.35 ? "top" : Math.sin(angle) > 0.35 ? "bottom" : Math.cos(angle) < 0 ? "left" : "right";
}
