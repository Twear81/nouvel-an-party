// Remplacé temporairement par scripts/build-release.ts lors de la compilation de l'exe :
// il liste alors tous les fichiers du front pour les embarquer dans l'exécutable.
// En dev, ce fichier reste vide et les fichiers sont lus depuis dist/web.
export const embedded: Record<string, string> | null = null;
