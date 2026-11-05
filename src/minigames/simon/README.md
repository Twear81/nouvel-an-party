# Simon

Le grand classique : la TV joue une **suite de couleurs** sur un disque de 4 pastilles (vert, rouge, jaune, bleu ; chacune a aussi sa forme : triangle, rond, carré, losange). Chacun la reproduit sur les 4 grosses pastilles de son téléphone. À chaque étape, la suite **s'allonge d'une note**. Une faute ou le temps écoulé élimine. **Le dernier debout gagne.** Le fichier à modifier : `config/minijeux/simon.yaml`.

Une manche = une partie de Simon complète (de la première suite jusqu'au dernier survivant).

## Déroulé d'une manche
1. **Regardez la TV** : « Regardez bien ! », puis les pastilles s'allument une à une. Les téléphones affichent les pastilles éteintes et « Regarde la TV » : la suite n'apparaît **jamais** sur les téléphones.
2. **À vous** : un chrono démarre (`temps_par_note` × nombre de notes + 3 s). Chacun touche la suite sur son téléphone ; une barre se remplit à chaque bonne touche.
   - Une mauvaise touche élimine **tout de suite** (« Raté ! »).
   - Suite complète : « Réussi ! », on attend les autres.
   - Chrono écoulé sans avoir fini : éliminé (« Trop lent ! »).
3. La TV montre qui a fini (✓) et qui tombe (avatar grisé qui chute, ✖). Une note est ajoutée et on recommence.
4. **Fin** : quand il ne reste qu'un joueur (il gagne), ou quand la suite atteint `longueur_max` (tous les survivants gagnent). Si **tous** ceux qui restaient tombent à la même étape, ils sont **ex æquo** et gagnent ensemble.
5. **Résultats** : une colonne par joueur, aussi haute que la plus longue suite réussie, couronne pour le(s) vainqueur(s).

Les éliminés restent spectateurs sur leur téléphone : ils voient qui est encore en lice (avatars éclatants) et qui est tombé (grisés).
La suite accélère légèrement à chaque note ajoutée (jusqu'à 2 fois plus vite au maximum).

## Points
- `points.par_etape` (20) pour **chaque suite réussie**.
- `points.vainqueur` (150) en bonus pour le dernier debout (ou chacun des ex æquo).

Exemple (départ à 3 notes) : Léa, Tom et Zoé. Tom se trompe sur la suite de 3 notes (0 point). Léa et Zoé réussissent 3 puis 4 notes ; Zoé se trompe à 5 notes, Léa réussit. Léa : 3 × 20 + 150 = **210**. Zoé : 2 × 20 = **40**. Tom : **0**.
Si Léa s'était aussi trompée à 5 notes : ex æquo, Léa et Zoé gagnent chacune 2 × 20 + 150 = **190**.

Si le maître du jeu passe la manche en cours de route, ceux qui sont encore debout reçoivent le bonus du vainqueur.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Simon` | Titre affiché |
| `description` | `Mémorisez la suite…` | Phrase d'explication à l'annonce |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `vitesse_ms` | `650` | Durée d'une note sur la TV (ms, 100 minimum) ; plus petit = plus rapide |
| `longueur_depart` | `3` | Nombre de notes de la première suite |
| `longueur_max` | `20` | Longueur au-delà de laquelle on s'arrête : les survivants gagnent tous |
| `temps_par_note` | `1.2` | Secondes accordées par note pour reproduire la suite (+ 3 s) |
| `points.par_etape` | `20` | Points par suite réussie |
| `points.vainqueur` | `150` | Bonus du/des vainqueur(s) |
| `variantes` | `[Classique]` | Variantes tirées au hasard, une par manche (25 maximum) |

## Écrire des variantes
Sous `variantes:`, une variante par ligne commençant par `- `. Son nom est affiché sur la TV.

```yaml
variantes:
  # Texte seul : utilise les réglages généraux
  - "Classique"
  # Objet : nom + les réglages à changer (vitesse_ms, longueur_depart, longueur_max, temps_par_note)
  - nom: "Rapide"
    vitesse_ms: 420
    temps_par_note: 0.9
  - nom: "Longue"
    longueur_depart: 5
```

Pièges YAML : un tiret + espace devant chaque variante, l'indentation en espaces (pas de tabulation), des guillemets si le nom contient `: ` ou ` #`. Les nombres à virgule s'écrivent avec un point (`1.2`).

Pour désactiver le jeu : `actif: false`. Après toute modification, relancer NouvelAn.exe.
