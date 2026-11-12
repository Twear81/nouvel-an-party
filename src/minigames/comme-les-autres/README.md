# Comme les autres

Une consigne s'affiche sur la TV (« Cite un truc qu'on trouve dans un frigo. »). Chacun tape sa réponse sur son téléphone. **On marque quand d'autres invités ont tapé la même chose** : il faut penser comme le groupe ! Le fichier à modifier : `config/minijeux/comme-les-autres.yaml`.

## Déroulé d'une manche
1. **TV** : annonce du jeu, puis la consigne et le chrono. Les avatars s'allument au fur et à mesure que les joueurs répondent (les réponses restent cachées).
2. **Téléphone** : un champ de texte (ou 2-3 avec l'option `reponses`) et un bouton **Envoyer**. Une fois envoyé, le bouton devient **Envoyé** et tous les champs sont grisés et verrouillés. La première réponse valable est définitive, y compris après rechargement ; le serveur ignore toute modification ou tentative de retrait.
3. La manche se termine quand tout le monde a répondu, ou quand le chrono arrive à zéro.
4. **Résultats** : la TV regroupe les réponses identiques. Les réponses isolées apparaissent d'abord (grisées), puis les groupes un par un, du plus petit au plus grand : le plus grand arrive en dernier, avec sa couronne. Chaque téléphone affiche ses réponses et avec qui il les partage, puis « Continuer ».

## Quelles réponses sont « les mêmes » ?
Sont ignorés : majuscules, accents, ponctuation, espaces en trop, article au début (« le », « la », « les », « un », « une », « du », « des »…) et le pluriel en -s / -x. Ainsi « Les Œufs ! », « un oeuf » et « ŒUF » vont ensemble.

Avec `tolerance_fautes: true` (par défaut), une faute de frappe est aussi pardonnée sur les mots d'au moins 5 lettres : une lettre en trop, en moins, remplacée, ou deux lettres voisines inversées (« Mozarella » = « Mozzarella », « Champagen » = « Champagne »). Les mots courts restent stricts (« chat » ≠ « chap ») ainsi que les nombres.

Le groupe s'affiche avec l'orthographe la plus utilisée par ses membres.

## Points
- Chaque joueur gagne `points.par_joueur` (50) **par autre joueur** de son groupe.
- Bonus `points.majorite` (50) pour chaque membre du **plus grand groupe** (s'il compte au moins 2 joueurs ; en cas d'égalité, tous les plus grands groupes ont le bonus).
- Réponse isolée ou pas de réponse : 0.

Exemple, 6 joueurs : « Fromage » ×3, « Lait » ×2, « Saucisson » ×1.
- Fromage : 2 autres × 50 + bonus 50 = **150** chacun.
- Lait : 1 autre × 50 = **50** chacun.
- Saucisson : **0**.

Avec `reponses: 2` ou `3`, **chaque réponse marque indépendamment** et les points s'additionnent. Deux variantes de la même réponse d'un même joueur (« pomme » et « pommes ») ne comptent qu'une fois.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Comme les autres` | Titre affiché |
| `description` | `Trouvez la même réponse…` | Phrase d'explication à l'annonce |
| `duree` | `30` | Secondes pour répondre (peut être surchargé par consigne) |
| `temps_resultats` | `25` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `tolerance_fautes` | `true` | Pardonne une faute de frappe sur les mots de 5 lettres et plus |
| `reponses` | `1` | Nombre de réponses par joueur (1 à 3) |
| `points.par_joueur` | `50` | Points par autre joueur ayant la même réponse |
| `points.majorite` | `50` | Bonus des membres du plus grand groupe |
| `questions` | (obligatoire) | Liste des consignes, au moins une |

Les réponses sont limitées à **40 caractères**.

## Écrire des consignes
```yaml
questions:
  # Texte seul
  - "Cite un truc qu'on trouve dans un frigo."
  # Objet : texte + duree optionnelle (secondes)
  - texte: "Un prénom de chien."
    duree: 20
```
Une bonne consigne a **quelques réponses évidentes** que plusieurs personnes auront en tête (« Un fruit », « Une boisson de minuit »). Trop vague (« Un mot ») : personne ne tombe d'accord. Trop fermée (« La capitale de la France ») : tout le monde marque, aucun suspense.

## Conseils
- Gardez entre 15 et 25 consignes : les manches sont tirées au hasard parmi elles.
- `reponses: 3` rend le jeu plus généreux et plus long à lire sur la TV ; à réserver aux groupes nombreux.
- Durée : une manche dure environ `duree` + `temps_resultats`, soit ~55 s au maximum avec les valeurs par défaut.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Mettez les consignes **entre guillemets** `"…"`, surtout si elles contiennent `: ` (deux-points + espace) ou ` #`.
- Une apostrophe dans un texte entre guillemets doubles est sans problème. Évitez un `"` au milieu ; utilisez « » à la place.
- `reponses` doit être un nombre entier entre 1 et 3, `tolerance_fautes` vaut `true` ou `false`.
- Enregistrez en **UTF-8**. En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
