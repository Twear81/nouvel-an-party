# Pierre-feuille-ciseaux : le tournoi

Une manche = **un tournoi à élimination directe** entre tous les joueurs. Le jeu tire l'arbre au sort et l'affiche sur la TV ; chaque duel se joue sur les téléphones : ✊ pierre, ✋ feuille, ✌️ ciseaux. Le fichier à modifier : `config/minijeux/pierre-feuille-ciseaux.yaml`.

## Déroulé d'une manche
1. **Tirage** (5 s) : la TV dessine l'arbre de gauche à droite. Si le nombre de joueurs n'est pas une puissance de 2 (3, 5, 6, 7…), certains joueurs tirés au hasard sont **qualifiés d'office** au premier tour (case « Qualifié d'office » sur la TV, icône ⏭ sur les téléphones).
2. **Lancer** : tous les duels du tour se jouent **en même temps**. Chaque duelliste voit son adversaire et trois gros boutons ; il a `duree` secondes pour choisir. Le choix reste secret ; la TV montre seulement ✓ quand quelqu'un a choisi. Dès que tous les duellistes ont choisi, on passe à la suite.
3. **Révélation** : sur la TV, les poings tremblent (« pierre… feuille… ciseaux ! ») puis les mains apparaissent ; le gagnant brille, le perdant s'efface. Chaque téléphone affiche aussi « Gagné ! / Perdu… / Égalité ! ».
4. **Égalité** : seul ce duel se rejoue (chrono `duree_rejouer`), les autres attendent. Après `rejouer_max` rejeux, le gagnant est tiré au sort (🎲).
5. **Avancée** : les gagnants passent dans la colonne suivante de l'arbre, puis le tour suivant commence. La **finale** se joue en grand au centre de la TV.
6. **Champion** : couronne et confettis, puis l'écran des résultats montre l'arbre complet.

Les éliminés voient « Éliminé » sur leur téléphone et suivent l'arbre en direct.

**Temps écoulé** : celui qui a choisi gagne contre celui qui n'a rien choisi ; si aucun des deux n'a choisi, le sort décide.

## Points (fin de manche)
| Tour atteint | Points (défaut) |
|---|---|
| Champion | `points.vainqueur` = 300 |
| Finaliste | `points.suivants[0]` = 150 |
| Demi-finalistes | `points.suivants[1]` = 75 |
| Quarts de finale | `points.suivants[2]` = 25 |
| Éliminés plus tôt | 0 (ou la valeur suivante si la liste est plus longue) |

Un joueur qualifié d'office compte le tour où il a été battu. **Exemple à 6 joueurs** (arbre de 8, 2 qualifiés d'office) : les 2 perdants des quarts gagnent 25, les 2 perdants des demies 75, le finaliste 150, le champion 300.

Si le maître du jeu touche « Passer » en plein tournoi, les duels restants sont tirés au sort pour attribuer les points.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Pierre-feuille-ciseaux : le tournoi` | Titre affiché |
| `description` | `Tournoi à élimination directe…` | Phrase d'explication à l'annonce |
| `duree` | `10` | Secondes pour choisir à chaque tour |
| `duree_rejouer` | `6` | Secondes pour choisir lors d'un rejeu (égalité ou manche suivante d'un duel) |
| `rejouer_max` | `3` | Rejeux après égalité avant le tirage au sort |
| `manches_gagnantes` | `1` | Lancers à gagner pour remporter un duel (2 = au meilleur des 3) |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `points.vainqueur` | `300` | Points du champion |
| `points.suivants` | `[150, 75, 25]` | Finaliste, demi-finalistes, quarts… |
| `variantes` | classique + 2 manches gagnantes | Liste des tournois possibles (voir ci-dessous) |

## Écrire des variantes
Chaque manche de ce jeu tire une variante au hasard (25 au maximum conseillé) :
```yaml
variantes:
  - nom: "Tournoi classique"
  - nom: "Tournoi en 2 manches gagnantes"
    manches_gagnantes: 2
  - nom: "Tournoi éclair"
    duree: 5
```
`manches_gagnantes` et `duree` sont facultatifs dans une variante : sinon les valeurs générales s'appliquent.

## Conseils
- Durée : avec 8 joueurs, comptez environ 1 min 30 par tournoi (3 tours), un peu plus avec des égalités ou 2 manches gagnantes.
- Pièges YAML : une ligne par variante, commençant par `- ` (tiret + espace) ; les guillemets autour du nom évitent les surprises avec `:`.
- Modifier le fichier demande de relancer NouvelAn.exe.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.
