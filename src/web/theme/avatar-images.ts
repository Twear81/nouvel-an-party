// Images des avatars sans emoji (AvatarPreset.image) : une ligne par avatar, clé = id de l'avatar.
// Fichiers dans assets/avatars/ (SVG statiques, viewBox carré 128 : lisibles de 2 rem sur téléphone à 15 rem sur la TV).
import bouleQuatreEtoiles from "./assets/avatars/boule-4-etoiles.svg";
import chouFleur from "./assets/avatars/chou-fleur.svg";
import tiramisu from "./assets/avatars/tiramisu.svg";

const IMAGES: Record<string, string> = {
  "boule-4-etoiles": bouleQuatreEtoiles,
  "chou-fleur": chouFleur,
  tiramisu,
};

export const avatarImage = (id: string): string | undefined => IMAGES[id];
