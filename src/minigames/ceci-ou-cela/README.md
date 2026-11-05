# Ceci ou Cela

Une question s'affiche sur la TV avec **deux réponses** (Oui / Non par défaut, ou deux choix libres comme « Mer » / « Montagne »). Chacun touche sa réponse sur son téléphone. Le fichier à modifier : `config/minijeux/ceci-ou-cela.yaml`.

Deux modes, selon la question :
- **Majorité** (question normale) : on gagne si on est dans le camp le plus nombreux.
- **Devine l'invité** (question avec `{joueur}`) : un invité tiré au sort répond pour de vrai, les autres devinent sa réponse.

## Déroulé d'une manche
1. **TV** : annonce du jeu, puis la question, les deux réponses et le chrono. Les pastilles se cochent au fur et à mesure (sans dire qui a répondu quoi).
2. **Téléphone** : deux gros boutons. On peut changer d'avis tant que le chrono tourne. Dans le mode `{joueur}`, l'invité ciblé voit qu'il est la cible et répond sincèrement.
3. La manche se termine quand tout le monde a répondu, ou quand le chrono arrive à zéro.
4. **Résultats** : la TV montre la bonne réponse et qui a choisi quoi ; chaque téléphone clique sur « Continuer ».

## Points
Seule la valeur `points.bonne_reponse` (100 par défaut) est donnée à chaque gagnant. Ne pas répondre = 0.

**Mode majorité** : le camp le plus nombreux gagne. En cas d'**égalité**, tous ceux qui ont répondu gagnent. Si personne n'a répondu, personne ne marque.

Exemple : « Mer ou Montagne ? », 5 joueurs. Léa, Tom et Zoé choisissent Mer, Max choisit Montagne, Sam ne répond pas. Léa, Tom et Zoé gagnent 100 chacun ; Max et Sam 0. Si Sam avait répondu Montagne : 3 contre 2, même résultat. Avec 4 joueurs et 2 contre 2, les quatre gagnent 100.

**Mode `{joueur}`** : la réponse de l'invité ciblé fait foi. Chaque autre joueur qui a choisi la même réponse gagne `points.bonne_reponse`. Le ciblé ne gagne rien comme devineur, mais reçoit `points.cible` **par personne qui l'a bien deviné** (0 par défaut = rien).

Exemple : « Pour {joueur}, le meilleur moment du réveillon : Le repas / Minuit », 5 joueurs, Tom est tiré au sort et répond Minuit. Léa et Zoé répondent Minuit, Max répond Le repas, Sam ne répond pas. Léa et Zoé gagnent 100 chacune ; Max, Sam 0. Avec `points.cible: 25`, Tom gagne 2 × 25 = 50.

Si l'invité ciblé **n'a pas répondu** à temps, la manche retombe en mode majorité (la question est quand même posée avec son prénom).

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Ceci ou Cela` | Titre affiché |
| `description` | `Deux réponses possibles : …` | Phrase d'explication à l'annonce |
| `duree` | `20` | Secondes pour répondre (peut être surchargé par question) |
| `temps_resultats` | `12` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `choix_par_defaut` | `[Oui, Non]` | Les deux réponses des questions en texte simple (exactement 2) |
| `points.bonne_reponse` | `100` | Points d'un gagnant |
| `points.cible` | `0` | Mode `{joueur}` : points de l'invité ciblé par personne qui l'a bien deviné |
| `questions` | (obligatoire) | Liste des questions, au moins une |

## Écrire des questions
Sous `questions:`, une question par ligne, commençant par `- ` (tiret + espace). Trois formes :

```yaml
questions:
  # 1. Texte seul : réponses = choix_par_defaut (Oui / Non)
  - "L'ananas sur la pizza ?"

  # 2. Objet : texte + choix (exactement 2) + duree optionnelle (secondes)
  - texte: "Plutôt…"
    choix: [Mer, Montagne]
  - texte: "Pour trinquer à minuit :"
    choix: [Champagne, Mojito]
    duree: 30

  # 3. Mode {joueur} : remplacé par un invité tiré au sort
  - "Est-ce que {joueur} aime l'ananas sur la pizza ?"
  - texte: "Pour {joueur}, le meilleur moment du réveillon :"
    choix: [Le repas, Minuit]
```

Notes :
- `{joueur}` peut apparaître plusieurs fois dans la même question (toujours le même invité).
- Les réponses sont de **gros boutons** : 14 caractères maximum conseillés (« Champagne », « Lève-tôt »).
- Pour changer les réponses de toutes les questions simples (ex. « Vrai » / « Faux »), modifiez `choix_par_defaut`.

## Conseils
- Gardez les questions **courtes** : elles s'affichent en grand sur la TV.
- Les dilemmes (« Mer ou Montagne ») lancent mieux la discussion que les Oui/Non ; le mode `{joueur}` marche très bien avec des invités qui se connaissent.
- Sur la TV, on choisit le **nombre de manches par mini-jeu** ; les questions sont **tirées au hasard** parmi celles du fichier. Gardez-en entre 15 et 25 : assez pour varier sans qu'aucune ne se perde.
- Durée : une manche dure environ `duree` + `temps_resultats`, soit ~32 s au maximum avec les valeurs par défaut (souvent moins).

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Mettez le texte **entre guillemets** `"…"` dès qu'il contient `{joueur}`, `: ` (deux-points + espace) ou ` #`. Sans guillemets, `{joueur}` est lu comme une structure YAML et provoque une erreur.
- Les choix sont une liste entre crochets : `choix: [Mer, Montagne]` ; il en faut exactement deux. Si un choix contient une virgule ou `: `, mettez-le entre guillemets.
- `Oui`, `Non`, `Yes`, `No` restent du texte (pas de piège de booléen), mais un choix qui ressemble à un nombre (`2027`) ou `true`/`false` doit être entre guillemets.
- Une apostrophe dans un texte entre guillemets doubles est sans problème. Évitez un `"` au milieu ; utilisez « » à la place.
- Les accents, apostrophes et émojis sont acceptés. Enregistrez en **UTF-8**.
- En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
