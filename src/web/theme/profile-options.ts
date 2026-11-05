// Options du profil joueur : avatars, cadres et couleurs. Ajouter une ligne suffit pour qu'elle apparaisse sur les téléphones.
// Les cadres sont dessinés en CSS (classes .frame-* dans theme.css).

export interface AvatarPreset {
  id: string;
  label: string;
  emoji: string; // v1 : emoji dans un cercle coloré. Pour des images : ajouter un champ `src` et adapter PlayerAvatar.
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
];

export interface FrameOption {
  id: string;
  label: string;
  className: string; // classe CSS de theme.css
}

export const FRAMES: FrameOption[] = [
  { id: "none", label: "Aucun", className: "frame-none" },
  { id: "gold", label: "Or", className: "frame-gold" },
  { id: "neon", label: "Néon", className: "frame-neon" },
  { id: "sparkle", label: "Étincelles", className: "frame-sparkle" },
  { id: "double", label: "Double", className: "frame-double" },
  { id: "dashed", label: "Pointillés", className: "frame-dashed" },
];

export const COLORS: string[] = [
  "#ff4f9a", "#ff6b3d", "#ffb300", "#f2d824", "#8be04e", "#2ed3a4",
  "#19c3ff", "#4f7bff", "#8a5cff", "#d35cff", "#ff5c5c", "#e4def5",
];

export const avatarById = (id: string) => AVATARS.find((a) => a.id === id) ?? AVATARS[0]!;
export const frameById = (id: string) => FRAMES.find((f) => f.id === id) ?? FRAMES[0]!;

/** Profil proposé par défaut à l'arrivée d'un joueur. */
export function randomDefaults() {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;
  return { avatarId: pick(AVATARS).id, frame: pick(FRAMES).id, color: pick(COLORS) };
}
