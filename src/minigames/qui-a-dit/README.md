# Qui a dit ça ?

Une consigne s'affiche (« Ta résolution la plus irréaliste pour 2027 »). Chacun écrit sa réponse sur son téléphone, puis les réponses passent une par une sur la TV, sans nom : il faut deviner qui l'a écrite. Le fichier à modifier : `config/minijeux/qui-a-dit.yaml`.

## Déroulé d'une manche
1. **Écrire** : la TV montre la consigne et les invités ; chaque avatar s'allume quand son téléphone a envoyé une réponse (sans dire laquelle). Sur le téléphone, on tape sa réponse puis « Envoyer » : le cadre et le bouton passent au vert. On peut la modifier (« Modifier ») tant que l'étape dure ; vider le champ puis « Retirer » annule sa réponse.
   L'étape s'arrête au bout de `duree_ecriture`, ou 3 s après que tout le monde a envoyé (le temps de corriger une faute).
2. **Deviner** : les réponses passent une à une, dans un ordre tiré au hasard. La TV affiche la citation en grand, les auteurs possibles (ceux qui ont écrit) et des pastilles anonymes de progression des votes. Chaque téléphone touche l'invité qu'il soupçonne (on peut changer d'avis) ; l'auteur voit « C'est toi ! » à la place des choix. On passe à la révélation quand tous ceux qui peuvent voter ont voté, ou au bout de `duree_vote`.
3. **Révélation** (`duree_revelation`) : les votes tombent sous chaque invité, puis l'auteur est démasqué (🎭, points gagnés, confettis s'il a trompé quelqu'un). Chaque téléphone affiche « Bien vu ! », « Raté… » ou, pour l'auteur, le nombre de personnes trompées. Puis citation suivante.
4. **Résultats** : récapitulatif de toutes les citations avec leur auteur et le nombre de bonnes réponses (🎯 3/7), meilleur piégeur 🎭 et meilleur flair 🔎 (masqués s'il y a plus de 3 ex æquo).

Moins de 2 réponses écrites : on ne peut rien deviner, la manche passe directement aux résultats (sans points).

## Points
- Deviner le bon auteur : `points.bonne_reponse` (100) par citation.
- L'auteur gagne `points.auteur_piegeur` (50) pour chaque invité qui a désigné quelqu'un d'autre. Ceux qui n'ont pas voté ne comptent pas.
- Ne pas écrire n'empêche pas de deviner (on peut marquer sur les citations des autres), mais on ne peut piéger personne.

**Exemple** : 4 joueurs (Léa, Tom, Zoé, Max). Sur la citation de Léa, Tom désigne Léa, Zoé et Max désignent Tom. Tom gagne 100, Léa gagne 2 × 50 = 100, Zoé et Max 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Qui a dit ça ?` | Titre affiché |
| `description` | `Écrivez une réponse…` | Phrase d'explication à l'annonce |
| `duree_ecriture` | `60` | Secondes pour écrire |
| `duree_vote` | `15` | Secondes pour deviner l'auteur de chaque citation |
| `duree_revelation` | `5` | Secondes d'affichage de l'auteur après chaque citation |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `longueur_max` | `80` | Nombre max de caractères d'une réponse (10 à 200) |
| `points.bonne_reponse` | `100` | Points pour un bon auteur deviné |
| `points.auteur_piegeur` | `50` | Points de l'auteur par invité trompé |
| `consignes` | (obligatoire) | Liste des consignes, au moins une ; une est tirée par manche |

Durée d'une manche à 8 : environ 1 min d'écriture + 8 citations × (≈ 10 s de vote + 5 s de révélation) ≈ 3 min.

## Écrire des consignes
Sous `consignes:`, une consigne par ligne, commençant par `- ` (tiret + espace), entre guillemets si elle contient `: ` ou ` #`.

```yaml
consignes:
  - "Ta résolution la plus irréaliste pour 2027"
  - "Ce que tu dirais à Paul s'il arrivait encore en retard"
```

Les meilleures consignes appellent une réponse courte et personnelle, qui trahit (ou pas !) son auteur. Évitez les questions à réponse unique (« Ta date de naissance ») : tout le monde devinerait.

## Pièges YAML
- Garder l'indentation (2 espaces) et le `- ` devant chaque consigne.
- Une apostrophe dans un texte entre guillemets doubles ne pose pas de problème : `"Ce que tu n'avoues jamais"`.

Pour désactiver le jeu : `actif: false`. Toute modification du yaml demande de relancer NouvelAn.exe.
