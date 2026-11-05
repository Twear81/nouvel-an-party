# Oui ou Non

Une question s'affiche sur la TV, chacun répond **Oui** ou **Non** sur son téléphone. Le fichier à modifier : `config/minijeux/oui-non.yaml`.

Deux modes, choisis automatiquement selon la question :

| Mode | Quand | Qui gagne |
|---|---|---|
| **Devine sa réponse** | la question contient `{joueur}` | un invité est tiré au sort et répond honnêtement ; les autres gagnent s'ils devinent sa réponse |
| **Majorité** | pas de `{joueur}` | on gagne si on est dans le camp majoritaire |

## Déroulé d'une manche
1. **TV** : la question, avec le nom de l'invité tiré au sort pour les questions `{joueur}`, et le chrono. Les pastilles se cochent au fur et à mesure (sans dévoiler les réponses).
2. **Téléphone** : deux gros boutons Oui / Non. Dans le mode « devine », l'invité ciblé voit un message lui rappelant de répondre **honnêtement**, les autres de deviner. On peut changer sa réponse tant que le chrono tourne.
3. Fin quand tout le monde a répondu, ou à la fin du chrono.
4. **Résultats** : la TV montre qui a dit oui, qui a dit non, et la bonne réponse.

## Points
- **Mode devine** : si l'invité ciblé a répondu, chaque autre joueur dans le bon camp gagne `points.bonne_reponse` (100). L'invité ciblé gagne `points.cible` × nombre de joueurs qui ont deviné juste (0 par défaut).
- **Mode majorité** : tous ceux du camp majoritaire gagnent `points.bonne_reponse`. En cas d'égalité parfaite, tout le monde qui a répondu gagne.
- **Bascule** : si la question a `{joueur}` mais que l'invité ciblé n'a pas répondu à temps, la manche est comptée en mode majorité.
- Ceux qui n'ont pas répondu gagnent 0.

**Exemple** : « Est-ce que Léa a déjà pleuré devant un Disney ? », 5 joueurs. Léa répond **Oui**. Tom, Zoé répondent Oui, Max répond Non, Sam répond Non. Tom et Zoé gagnent 100 chacun ; Max et Sam 0 ; Léa 0 (avec `cible: 20`, elle gagnerait 2 × 20 = 40).

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Oui ou Non` | Titre affiché |
| `description` | `Devinez ce que pense la majorité…` | Phrase d'explication à l'annonce |
| `duree` | `20` | Secondes pour répondre (surchargeable par question) |
| `temps_resultats` | `12` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `points.bonne_reponse` | `100` | Points d'une bonne réponse |
| `points.cible` | `0` | Points de l'invité ciblé par joueur ayant deviné juste |
| `questions` | (obligatoire) | Liste des questions, au moins une |

## Écrire des questions
```yaml
questions:
  # opinion générale : la majorité l'emporte
  - "Le champagne est meilleur que le crémant ?"
  # {joueur} : un invité est tiré au sort et répond, les autres devinent
  - "Est-ce que {joueur} a déjà pleuré devant un Disney ?"
  # forme objet : durée spéciale
  - texte: "Est-ce que {joueur} tiendra ses résolutions jusqu'en février ?"
    duree: 25
```

- `{joueur}` peut se trouver n'importe où dans la phrase, et plusieurs fois. Il est remplacé par le pseudo choisi à l'inscription.
- **Mettez toujours entre guillemets** une question avec `{joueur}` : au début d'une ligne, `{` serait lu par YAML comme un dictionnaire et le fichier serait refusé.
- Formulez la question pour qu'on puisse répondre par Oui ou Non, sans ambiguïté.

### Exemples de questions personnelles
Le joker rend les questions « sur tout le monde » : un invité différent est tiré à chaque fois.
```yaml
  - "Est-ce que {joueur} a déjà ri aux éclats à un enterrement ?"
  - "Est-ce que {joueur} sait encore faire une roue ?"
  - "Est-ce que {joueur} mange sa pizza avec des couverts ?"
```
Pour parler d'une personne précise, écrivez son prénom (sans `{joueur}`) : ce sera alors une question d'opinion jugée à la majorité, ex. « Est-ce que Paul va encore arriver en retard ? ».

## Conseils
- Gardez les questions **courtes** : elles s'affichent en grand sur la TV.
- Mélangez les deux modes : les questions `{joueur}` sont les plus drôles, les questions d'opinion font respirer.
- Sur la TV, on choisit le **nombre de manches par mini-jeu** ; les questions sont **tirées au hasard**. Prévoyez 2 à 3 fois plus de questions que de manches.
- Durée : une manche dure au plus `duree` + `temps_resultats` (~32 s par défaut), souvent moins. 10 manches, ~4 à 5 minutes.
- Attention : le joueur tiré au sort l'est parmi les joueurs de la manche. Évitez les questions trop gênantes pour un invité en particulier.

## Désactiver le jeu
`actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Guillemets `"…"` obligatoires si la question contient `: ` ou ` #`, commence par un caractère spécial (`{`, `[`, `*`, `&`, `!`, `-`, `%`, `@`…), ou contient `{joueur}`.
- Évitez un `"` à l'intérieur ; utilisez « » à la place.
- Accents, apostrophes, émojis : sans problème.
- Enregistrez en **UTF-8** (le Bloc-notes de Windows 11 le fait par défaut).
- Une erreur est signalée au démarrage avec le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe**.
