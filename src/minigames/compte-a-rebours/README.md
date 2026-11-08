# Compte à rebours chaotique

**Tout le monde joue en même temps.** La TV annonce une cible (« Arrêtez-vous à 8,0 s ! »), puis « 3… 2… 1… GO ». Un compteur démarre sur la TV : lisible quelques secondes, il devient ensuite **fou** (chiffres qui sautent, aiguille qui s'affole, fumée…). Chacun appuie sur **STOP** sur son téléphone quand il pense que la cible est atteinte : il faut finir de compter dans sa tête. Le plus proche de la cible gagne. Le fichier à modifier : `config/minijeux/compte-a-rebours.yaml`.

## Déroulé d'une manche (environ 1 minute)
1. **Annonce** (`annonce` secondes) : la TV affiche la cible en très grand. Les téléphones : la cible + « Prépare ton doigt ».
2. **« 3… 2… 1… GO »** : synchronisé sur tous les écrans. Au GO, le compteur démarre sur la TV et chaque téléphone affiche un énorme bouton **STOP** (aucun compteur sur le téléphone : ce serait de la triche).
3. **Chacun appuie une seule fois** : le choix est définitif (« Stoppé ! » sur le téléphone, une pastille verte sur la TV, sans révéler le temps).
4. Le compteur continue jusqu'à ce que **tous les joueurs connectés aient stoppé**, ou au plus tard jusqu'à `cible + marge_max` secondes. Ceux qui n'ont pas appuyé sont ratés (0 point).
5. **Révélation sur la TV** : les joueurs tombent un par un sur un axe « trop tôt / trop tard » autour de la cible, du plus éloigné au plus proche. Le dernier à tomber, le plus proche, gagne. Le classement se remplit en même temps.

Le temps est **mesuré sur le téléphone** (depuis l'affichage du bouton STOP sur ce téléphone) puis envoyé au serveur, qui le vérifie (jamais plus long que la manche réelle) : la latence du wifi n'avantage ni ne pénalise personne.

## La cible, le compteur et les designs
- La **cible** est tirée au hasard à chaque manche entre `cible_min` et `cible_max` (6 à 12 s par défaut), **au demi-seconde** (6,0 ; 6,5 ; 7,0…).
- Le compteur est lisible entre `visible_min` et `visible_max` secondes (tirage au dixième), puis il devient chaotique.
- **5 designs** de compteur, un par manche (tirés au hasard, sans répétition dans une partie), chacun fou à sa façon :

| Design | Le compteur | Comment il devient chaotique |
|---|---|---|
| `digital` | chronomètre aux gros chiffres | les chiffres sautent, tournent, se dédoublent en rose et bleu, s'effacent, repartent à l'envers, deviennent des « ?? » |
| `horloge` | horloge à 12 graduations (1 graduation = 1 s) et sa trotteuse | l'aiguille s'affole, tourne à l'envers, se dédouble, puis disparaît |
| `meche` | une mèche qui brûle jusqu'à la bombe | l'étincelle avance par saccades, recule, et une fumée épaisse masque la mèche |
| `coupe` | une coupe de champagne qui se remplit (pleine = cible) | le niveau saute, déborde en mousse, se vide, puis des bulles cachent la coupe |
| `minuit` | décompte du Nouvel An dans un anneau qui se vide | le chiffre compte n'importe comment, l'anneau tourne et clignote, puis devient « ? » |

Le design et le chaos sont décidés **côté serveur** (une graine envoyée avec la manche) : un rechargement de la TV rejoue exactement le même compteur.

## Points
Classement par écart absolu à la cible (trop tôt ou trop tard, c'est pareil). La place n°1 reçoit le 1er nombre de `points`, la 2e le 2e, etc. Une place au-delà de la liste reçoit 0. **Égalité** (même écart au centième de seconde) : les ex æquo reçoivent les points de la meilleure place, et la place suivante est sautée.

Exemple avec `points: [150, 100, 70, 50]`, cible 8 s : Léa arrête à 8,05 s (+0,05), Tom à 7,90 s (−0,10), Zoé à 8,10 s (+0,10), Max n'appuie pas. Léa 150, Tom et Zoé à égalité (0,10 s) : 100 chacun, Max 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Compte à rebours chaotique` | Titre affiché |
| `description` | `Appuie sur STOP quand le compteur fou atteint la cible…` | Phrase d'explication à l'annonce |
| `annonce` | `6` | Secondes d'annonce de la cible avant le « 3… 2… 1… » |
| `cible_min` / `cible_max` | `6` / `12` | Bornes (secondes, au moins 1) de la cible tirée au hasard, au demi-seconde |
| `visible_min` / `visible_max` | `2` / `3` | Bornes (secondes) de la durée où le compteur est lisible ; 0 = chaotique d'emblée |
| `marge_max` | `4` | Le compteur s'arrête au plus tard à `cible + marge_max` secondes ; les non-stoppés sont ratés |
| `temps_resultats` | `25` | Secondes estimées pour la révélation et les résultats (calcul de durée de la soirée seulement) |
| `points` | `[150, 100, 70, 50, 30, 20, 10, 0]` | Points par place |
| `designs` | les 5 designs | Liste des designs possibles : retirez une ligne pour en désactiver un (au moins un) |

Une partie propose au plus un exemplaire de chaque design par jeu : avec 5 designs actifs, on peut jouer jusqu'à 5 manches de ce jeu sans répétition.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations ; les éléments de `designs` sont alignés avec un tiret.
- Les nombres s'écrivent avec un **point** : `cible_min: 6.5` (pas `6,5`).
- `cible_max` doit être supérieur ou égal à `cible_min` (idem `visible_max` / `visible_min`).
- Les noms de designs sont exacts : `digital`, `horloge`, `meche`, `coupe`, `minuit`.
- Enregistrez en **UTF-8**. En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
