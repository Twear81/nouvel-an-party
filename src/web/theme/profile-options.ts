// Options du profil joueur : avatars, cadres et couleurs. Ajouter une ligne suffit pour qu'elle apparaisse sur les téléphones.
// Les cadres partagent les tracés SVG d'AvatarFrame, habillés par les classes .frame-* de theme.css.

export interface AvatarPreset {
  id: string;
  label: string;
  /** Emoji affiché ; pour un avatar à image, emoji de repli (textes, signatures) : l'image prend le dessus dans PlayerAvatar. */
  emoji: string;
  /** Vrai : l'image `assets/avatars/<id>.svg` (déclarée dans avatar-images.ts) remplace l'emoji, pour ce qui n'en a pas.
   *  Les images sont dans un module à part pour que les tests (Playwright, bun) importent ces options sans charger de SVG. */
  image?: boolean;
}

export const AVATARS: AvatarPreset[] = [
  { id: "renard", label: "Renard", emoji: "🦊" },
  { id: "panda", label: "Panda", emoji: "🐼" },
  { id: "grenouille", label: "Grenouille", emoji: "🐸" },
  { id: "lion", label: "Lion", emoji: "🦁" },
  { id: "tigre", label: "Tigre", emoji: "🐯" },
  { id: "singe", label: "Singe", emoji: "🐵" },
  { id: "pieuvre", label: "Pieuvre", emoji: "🐙" },
  { id: "licorne", label: "Licorne", emoji: "🦄" },
  { id: "pingouin", label: "Pingouin", emoji: "🐧" },
  { id: "hibou", label: "Hibou", emoji: "🦉" },
  { id: "dragon", label: "Dragon", emoji: "🐲" },
  { id: "chat", label: "Chat", emoji: "🐱" },
  { id: "chien", label: "Chien", emoji: "🐶" },
  { id: "lapin", label: "Lapin", emoji: "🐰" },
  { id: "ours", label: "Ours", emoji: "🐻" },
  { id: "dino", label: "Dino", emoji: "🦖" },
  { id: "robot", label: "Robot", emoji: "🤖" },
  { id: "alien", label: "Alien", emoji: "👽" },
  { id: "fantome", label: "Fantôme", emoji: "👻" },
  { id: "clown", label: "Clown", emoji: "🤡" },
  { id: "magicien", label: "Magicien", emoji: "🧙" },
  { id: "pere-noel", label: "Père Noël", emoji: "🎅" },
  { id: "fete", label: "Fêtard", emoji: "🥳" },
  { id: "cool", label: "Cool", emoji: "😎" },
  { id: "corbeau", label: "Corbeau", emoji: "🐦‍⬛" },
  { id: "tournesol", label: "Tournesol", emoji: "🌻" },
  { id: "chou-fleur", label: "Chou-fleur", emoji: "🥦", image: true },
  { id: "tiramisu", label: "Tiramisu", emoji: "🍰", image: true },
  { id: "ping-pong", label: "Ping-pong", emoji: "🏓" },
  { id: "voiture-course", label: "Voiture de course", emoji: "🏎️" },
  { id: "boule-4-etoiles", label: "Boule à 4 étoiles", emoji: "🔮", image: true },
];

export type Rarity = "R" | "SR" | "SSR";

export interface FrameOption {
  id: string;
  label: string;
  className: string; // classe CSS de theme.css
  rarity: Rarity; // rareté à l'invocation (FrameSummon)
}

export const FRAMES: FrameOption[] = [
  { id: "none", label: "Aucun", className: "frame-none", rarity: "R" },
  { id: "dashed", label: "Pointillés", className: "frame-dashed", rarity: "R" },
  { id: "double", label: "Double", className: "frame-double", rarity: "R" },
  { id: "gold", label: "Or", className: "frame-gold", rarity: "SR" },
  { id: "neon", label: "Néon", className: "frame-neon", rarity: "SR" },
  { id: "karmine", label: "Bleu Karmine", className: "frame-karmine", rarity: "SR" },
  { id: "tournesol", label: "Pétales de tournesol", className: "frame-tournesol", rarity: "SR" },
  { id: "sparkle", label: "Étincelles", className: "frame-sparkle", rarity: "SSR" },
  { id: "saiyan", label: "Aura Super Saiyan", className: "frame-saiyan", rarity: "SSR" },
  { id: "geass", label: "Sceau du Geass", className: "frame-geass", rarity: "SSR" },
];

/** Étoiles affichées par rareté, et chances de tomber sur chaque rareté (en %, total 100). */
export const RARITY_STARS: Record<Rarity, number> = { R: 3, SR: 4, SSR: 5 };
export const RARITY_RATES: Record<Rarity, number> = { R: 60, SR: 30, SSR: 10 };

/** Tirage pondéré : d'abord la rareté, puis un cadre au hasard de cette rareté (SSR ≈ 10 %). */
export function drawFrame(rng: () => number = Math.random): FrameOption {
  let roll = rng() * 100;
  let rarity: Rarity = "R";
  for (const r of ["SSR", "SR", "R"] as const) {
    rarity = r;
    if (roll < RARITY_RATES[r]) break;
    roll -= RARITY_RATES[r];
  }
  const pool = FRAMES.filter((f) => f.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)]!;
}

export const COLORS: string[] = [
  "#ff4f9a", "#ff6b3d", "#ffb300", "#f2d824", "#8be04e", "#2ed3a4",
  "#19c3ff", "#4f7bff", "#8a5cff", "#d35cff", "#ff5c5c", "#e4def5",
];

export const avatarById = (id: string) => AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
export const frameById = (id: string) => FRAMES.find((f) => f.id === id) ?? FRAMES[0]!;

/** Profil proposé par défaut à l'arrivée d'un joueur. */
export function randomDefaults() {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;
  return { avatarId: pick(AVATARS).id, frame: drawFrame().id, color: pick(COLORS) };
}
