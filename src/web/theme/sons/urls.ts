// Adresse (hachée par Vite) de chaque fichier du catalogue. Sous Bun (tests unitaires) `import.meta.glob` n'existe pas : aucune adresse.
function load(): Record<string, string> {
  try {
    return import.meta.glob<string>("./*.{ogg,wav}", { eager: true, import: "default", query: "?url" });
  } catch {
    return {};
  }
}
const urls = load();

/** Adresse d'un fichier du dossier `sons/` (null si inconnu). */
export const urlDuFichier = (fichier: string): string | null => urls[`./${fichier}`] ?? null;
