# Compte à rebours chaotique

Chacun son tour, un **gros bouton** à presser pile au bon moment (par exemple à « minuit », ou à 10,00 s). Le compteur est lisible sur la TV pendant quelques secondes… puis il devient **fou** (chiffres qui sautent, s'effacent, repartent à l'envers) : il faut finir de compter dans sa tête. Le plus proche de la cible gagne. Le fichier à modifier : `config/minijeux/compte-a-rebours.yaml`.

## Déroulé d'une manche
1. Une **variante** est tirée au hasard (ex. « Pile à minuit », 10 s). Tout le monde joue la même, **un joueur à la fois**, dans un ordre aléatoire.
2. **Téléphone du joueur dont c'est le tour** : un seul bouton géant **START**. Il a `delai_depart` secondes (chrono visible) pour appuyer, sinon son tour est sauté.
3. Après START, le bouton devient **STOP**. La TV affiche le compteur : net pendant `visible` secondes, puis chaotique. Le joueur appuie sur STOP quand il pense que la cible est atteinte.
4. **Révélation** (`duree_revelation` secondes) : la TV affiche l'écart, « +0,23 s trop tard » ou « −0,08 s trop tôt », puis c'est au suivant.
5. **Les autres téléphones** montrent à qui c'est le tour, puis leur propre écart et leur place provisoire.
6. **Résultats** : podium animé (écart au centième de seconde) et classement complet.

Le temps est **mesuré sur le téléphone** entre START et STOP : la latence du wifi n'avantage ni ne pénalise personne. (Le serveur vérifie quand même que le temps envoyé est cohérent, à 2 s près.)

Un tour est **raté** (0 point) si le joueur ne démarre pas à temps, s'il n'appuie pas sur STOP avant **3 × la cible**, ou s'il est déconnecté quand son tour arrive.

## Points
Classement par écart absolu à la cible (trop tôt ou trop tard, c'est pareil). La place n°1 reçoit le 1er nombre de `points`, la 2e le 2e, etc. Une place au-delà de la liste reçoit 0. **Égalité** (même écart au centième) : les ex æquo reçoivent les points de la meilleure place, et la place suivante est sautée.

Exemple avec `points: [150, 100, 70, 50]`, cible 10 s : Léa arrête à 10,05 s (+0,05), Tom à 9,90 s (−0,10), Zoé à 10,10 s (+0,10), Max ne démarre pas. Léa 150, Tom et Zoé à égalité (0,10 s) : 100 chacun, Max 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Compte à rebours chaotique` | Titre affiché |
| `description` | `Arrêtez le compteur pile à l'heure…` | Phrase d'explication à l'annonce |
| `delai_depart` | `10` | Secondes pour appuyer sur START avant que le tour soit sauté |
| `duree_revelation` | `3.5` | Secondes d'affichage de l'écart entre deux joueurs |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `points` | `[150, 100, 70, 50, 30, 20, 10, 0]` | Points par place |
| `variantes` | (obligatoire) | Liste des variantes, au moins une |

Chaque variante :
| Champ | Défaut | Effet |
|---|---|---|
| `titre` | (obligatoire) | Nom affiché sur la TV |
| `cible` | (obligatoire) | Seconde à viser (au moins 1) |
| `visible` | `3` | Secondes pendant lesquelles le compteur est lisible (0 = chaotique d'emblée) |
| `decompte` | `false` | `true` : le compteur descend de `cible` à 0 (effet « minuit ») |

## Écrire des variantes
```yaml
variantes:
  - titre: "Pile à minuit"      # décompte 10 → 0, lisible 3 s
    cible: 10
    visible: 3
    decompte: true
  - titre: "Cinq secondes à l'aveugle"
    cible: 5
    visible: 1
```
Conseils : des cibles entre 5 et 15 s marchent bien (au-delà, l'attente est longue pour les autres). Une manche dure environ `nombre de joueurs × (cible + duree_revelation + 3 s)`, soit ~2 min à 8 joueurs avec une cible de 10 s. Gardez 5 à 10 variantes (25 maximum).

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations ; les champs d'une variante sont alignés sous `titre`.
- Mettez le titre **entre guillemets** s'il contient `: ` ou ` #`.
- Les nombres s'écrivent avec un **point** : `cible: 7.5` (pas `7,5`).
- `decompte` vaut `true` ou `false` (sans guillemets).
- Enregistrez en **UTF-8**. En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
