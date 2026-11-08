# Dessin raté

Chacun reçoit un mot secret sur son téléphone et le dessine du doigt en 20 secondes. Les dessins défilent ensuite sur la TV avec leur mot (c'est là que ça devient drôle), puis tout le monde vote pour le mieux dessiné. Le fichier à modifier : `config/minijeux/dessin-rate.yaml`.

## Déroulé d'une manche
1. **Dessiner** (`duree_dessin`, 20 s) : la TV annonce la **difficulté** de la manche (Facile / Moyen / Difficile) et montre une mosaïque des dessins **en direct**, sans les mots. Sur le téléphone : le mot en haut, une page carrée, et une seule ligne d'outils : 5 couleurs, 2 épaisseurs, « annuler le dernier trait » et « tout effacer ». À la fin du chrono le dessin est figé. Un téléphone qui recharge, ou qui plante, garde son dessin (le serveur le reçoit au fil de l'eau).
2. **Galerie** (`duree_galerie`, 4 s par dessin) : chaque dessin passe en grand sur la TV avec son mot et son auteur, dans un ordre tiré au hasard. Les pages blanches sont sautées. Les téléphones affichent « Regarde la TV ! ».
3. **Vote** (`duree_vote`, 20 s) : les téléphones montrent une grille de miniatures (dessin + mot), sauf le sien. On touche celui qui a le mieux dessiné son mot ; on peut changer d'avis. Un dessin vide s'affiche « Page blanche » et ne peut pas être voté. La TV montre la mosaïque et des pastilles de progression anonymes. Le vote s'arrête dès que tous les téléphones connectés ont voté.
4. **Résultats** : les dessins sont révélés du moins voté au plus voté, le(s) gagnant(s) en dernier, en grand, avec couronne et confettis. Chaque téléphone affiche son nombre de votes.

Cas particuliers : personne n'a dessiné → direct aux résultats ; un seul dessin → galerie puis résultats, sans vote ni points ; personne ne vote → pas de gagnant, pas de points.

## Équité : même difficulté pour tous
Chaque manche tire **une seule difficulté** et chaque joueur reçoit **un mot différent de cette liste**. Personne n'a donc « Un chat qui fait du ski » pendant qu'un autre dessine « Une banane ». Les mots ne sont jamais sur la TV pendant le dessin.

## Points
- `points.par_vote` (50) par vote reçu ;
- `points.gagnant` (100) en plus pour le dessin le plus voté (ex æquo : tous les premiers) ;
- aucun vote → personne ne marque ; on ne peut pas voter pour soi.

**Exemple** : 4 joueurs. Bob reçoit 2 votes, Alice 1. Bob gagne 2 × 50 + 100 = 200, Alice 50, les autres 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Dessin raté` | Titre affiché |
| `description` | `Dessine ton mot secret…` | Phrase d'explication à l'annonce |
| `duree_dessin` | `20` | Secondes pour dessiner |
| `duree_galerie` | `4` | Secondes d'affichage de chaque dessin en grand |
| `duree_vote` | `20` | Secondes pour voter (fin anticipée quand tout le monde a voté) |
| `temps_resultats` | `20` | Secondes estimées de lecture des résultats (calcul de durée de soirée seulement) |
| `points.par_vote` | `50` | Points par vote reçu |
| `points.gagnant` | `100` | Bonus du/des dessin(s) le plus voté |
| `mots` | (obligatoire) | Trois listes : `facile`, `moyen`, `difficile` |

Durée d'une manche à 7 joueurs : environ 20 s de dessin + 7 × 4 s de galerie + 15 s de vote + 15 s de révélation ≈ 1 min 30 à 2 min avec l'annonce.

## Écrire des mots et les classer
Sous `mots:`, trois listes, un mot ou une expression par ligne, commençant par `- ` (entre guillemets si le texte contient `: ` ou ` #`).

**Une liste doit avoir au moins 8 mots pour être jouée** (8 joueurs, 8 mots différents). Avec 16 mots ou plus, la difficulté revient sur plusieurs manches : une manche par tranche de 8 mots (30 mots = 3 manches), sans jamais répéter un mot. Une liste de moins de 8 mots est ignorée ; au moins une liste doit être complète.

**Comment classer un mot** : l'idée est que, dans une même liste, tous les mots soient aussi durs à dessiner les uns que les autres.
- **Facile** : un objet concret qu'on reconnaît en 3 traits (« Une banane », « Un sapin de Noël », « Une montre »).
- **Moyen** : une action ou une scène, un personnage qui fait quelque chose (« Un chat qui fait du ski », « Un bonhomme de neige qui fond »). Il faut deux idées à dessiner.
- **Difficile** : un concept, une émotion, une expression, qui n'a pas de forme (« La gueule de bois », « Le réveil du 1er janvier », « La flemme »). C'est là que les dessins sont les plus ratés, donc les plus drôles.

Test rapide : « peut-on le dessiner sans écrire de lettres ? » Un objet seul : facile. Un objet qui fait quelque chose : moyen. Il faut expliquer pour que ça se comprenne : difficile. Évitez de mélanger des niveaux dans la même liste : celui qui tire « Une banane » aurait un avantage sur « La flemme ».

Exemple :

```yaml
mots:
  facile:
    - "Une banane"
    - "Un sapin de Noël"
    # … au moins 8
  moyen:
    - "Un chat qui fait du ski"
  difficile:
    - "La gueule de bois"
```

## Pièges YAML
- Garder l'indentation (2 espaces par niveau) et le `- ` devant chaque mot.
- Une apostrophe dans un texte entre guillemets doubles ne pose pas de problème : `"L'année qui passe trop vite"`.

Pour désactiver le jeu : `actif: false`. Toute modification du yaml demande de relancer NouvelAn.exe.

## Pour les curieux
Le dessin est envoyé au serveur environ 5 fois par seconde (trait en cours compris) sous forme compacte : coordonnées entières de 0 à 1000, couleur et épaisseur en index. Le serveur refuse tout dessin invalide ou trop gros (80 traits, 2 400 points au total au maximum). Les couleurs des feutres et le papier sont des jetons du thème (`--color-pen-0` à `--color-pen-4`, `--color-paper` dans `src/web/theme/theme.css`).
