# Qui est le plus… ?

Une question s'affiche sur la TV (« Qui est le plus gourmand ? »). Chacun vote sur son téléphone pour l'invité qui lui correspond le mieux. Le fichier à modifier : `config/minijeux/qui-est-le-plus.yaml`.

## Déroulé d'une manche
1. **TV** : annonce du jeu, puis la question et la liste des invités avec le chrono. Les pastilles se cochent au fur et à mesure des votes (sans dire pour qui).
2. **Téléphone** : on touche le nom ou l'avatar de l'invité choisi. On peut changer d'avis tant que le chrono tourne.
3. La manche se termine quand tout le monde a voté, ou quand le chrono arrive à zéro.
4. **Résultats** : la TV montre le classement des votes et qui a voté pour qui ; chaque téléphone clique sur « Continuer ».

## Points
- Chaque votant qui a voté pour l'élu (la personne la plus votée) gagne `points.majorite` (100).
- L'élu gagne en plus `points.elu` (50).
- En cas d'égalité en tête, les ex æquo sont tous élus, et leurs votants marquent tous.
- Un invité qui n'a pas voté gagne 0.

**Exemple** : 5 joueurs (Léa, Tom, Zoé, Max, Sam). Tom, Zoé et Max votent Léa ; Léa et Sam votent Tom. Léa a 3 votes, elle est élue : Tom, Zoé et Max gagnent 100 chacun, Léa gagne 50 (bonus d'élue), Sam gagne 0 et Léa ne gagne rien de plus pour son vote pour Tom.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Qui est le plus… ?` | Titre affiché |
| `description` | `Votez pour l'invité…` | Phrase d'explication à l'annonce |
| `duree` | `30` | Secondes pour voter (peut être surchargé par question) |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `vote_pour_soi` | `false` | `true` : on peut voter pour soi-même |
| `points.majorite` | `100` | Points d'un votant qui a voté pour l'élu |
| `points.elu` | `50` | Bonus de l'élu |
| `questions` | (obligatoire) | Liste des questions, au moins une |

## Écrire des questions
Sous `questions:`, une question par ligne, commençant par `- ` (tiret + espace).

```yaml
questions:
  # forme simple
  - "Qui est le plus gourmand ?"
  # forme objet : durée spéciale (en secondes) pour cette question seulement
  - texte: "Qui mérite le titre de meilleur ami de l'année ?"
    duree: 45
```

Il n'y a pas de `{joueur}` ici : la question parle de « qui », les invités sont les réponses possibles.

Chaque question peut avoir un `theme:` facultatif (ex. `theme: bouffe`) : le tirage évite d'enchaîner deux questions du même thème.

### Exemples de questions personnelles
```yaml
  - "Qui a mis le feu à la cuisine de Paul en 2019 ?"
  - "Qui va encore raconter l'histoire du camping à Biarritz ?"
  - "Qui est le plus susceptible de perdre ses clés avant minuit ?"
```

## Conseils
- Gardez les questions **courtes** : elles s'affichent en grand sur la TV (une ligne ou deux).
- Les blagues d'initiés fonctionnent très bien, tant que tous les invités ont la référence.
- Sur la TV, on choisit le **nombre de manches par mini-jeu** ; les questions sont **tirées au hasard** parmi celles du fichier. Une vingtaine de questions (25 au maximum) suffisent largement pour une soirée.
- Durée : une manche dure environ `duree` + `temps_resultats`, soit ~45 s au maximum avec les valeurs par défaut (souvent moins, car la manche s'arrête quand tout le monde a voté). Avec 10 manches, comptez 5 à 8 minutes.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Mettez la question **entre guillemets** `"…"` dès qu'elle contient `: ` (deux-points + espace) ou ` #`, ou si elle commence par un caractère spécial (`*`, `&`, `!`, `{`, `[`, `-`, `%`, `@`…).
- Une apostrophe dans une question entre guillemets doubles est sans problème. Évitez simplement un `"` au milieu ; utilisez « » à la place.
- Les accents, apostrophes et émojis sont acceptés.
- Enregistrez en **UTF-8** (le Bloc-notes de Windows 11 le fait par défaut).
- En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
