# Le bon prix

Un objet s'affiche sur la TV, sous un projecteur (« Une bouteille de champagne — Brut, grande marque, 75 cl »). Chacun tape son prix sur son téléphone : le plus proche gagne. Le fichier à modifier : `config/minijeux/le-bon-prix.yaml`.

## Déroulé d'une manche
1. **TV** : le nom de l'objet, l'indice (`details`) et l'objet sur son piédestal (photo ou emoji). En bas, les invités : leur pastille se coche dès qu'ils ont validé (sans montrer leur prix).
2. **Téléphone** : un pavé numérique (chiffres, virgule, effacer) et le montant en grand, en euros. On touche **Valider** ; le bouton devient vert « ✓ Validé ». On peut retoucher le montant et revalider tant que le chrono tourne.
3. La manche se termine quand tout le monde a validé, ou à la fin du chrono. Un montant tapé mais pas validé ne compte pas.
4. **Résultats** : les prix des joueurs tombent un par un sur un axe (du plus éloigné au plus proche), roulement de tambour, puis le vrai prix tombe avec un faisceau doré. Chaque joueur voit son écart (« +12 € » = trop cher, « −3 € » = pas assez), le plus proche est couronné. Quand les prix vont de 1 € à 1 000 €, l'axe passe en échelle logarithmique pour rester lisible.

## Points
- On classe les joueurs par **écart absolu** avec le vrai prix (trop cher ou pas assez, c'est pareil).
- `points.classement` donne les points par rang : 150 au plus proche, 100 au 2e, 60 au 3e, 30 au 4e, 0 ensuite.
- Égalité d'écart : même rang et mêmes points ; le suivant saute un rang (1er, 1er, 3e…).
- Pile le bon prix (à `tolerance_centimes` près) : `bonus_prix_exact` (100) en plus.
- Pas de réponse validée : 0.

**Exemple** : la bouteille coûte 38 €. Léa dit 38 €, Tom 35 €, Zoé 41 €, Max 60 €, Sam ne valide pas. Léa : 150 + 100 (exact) = 250. Tom et Zoé sont tous les deux à 3 € : 2es ex æquo, 100 chacun. Max est 4e : 30. Sam : 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Le bon prix` | Titre affiché |
| `description` | `Devinez le prix…` | Phrase d'explication à l'annonce |
| `duree` | `30` | Secondes pour répondre (peut être surchargé par objet) |
| `temps_resultats` | `20` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `points.classement` | `[150, 100, 60, 30]` | Points du 1er, 2e, 3e… (les suivants : 0) |
| `points.bonus_prix_exact` | `100` | Bonus quand on tombe pile |
| `points.tolerance_centimes` | `0` | Écart accepté pour « pile » : 0 = au centime près, 100 = à 1 € près |
| `objets` | (obligatoire) | La liste des objets, au moins un |

## Écrire des objets
```yaml
objets:
  # forme courte, sur une ligne
  - { nom: "Une baguette tradition", prix: 1.40, emoji: "🥖", details: "Chez le boulanger du coin" }
  # forme longue
  - nom: "La montre de Papy"
    prix: 350
    image: montre.jpg
    details: "Achetée en 1987"
    duree: 45
```
| Champ | Obligatoire | Rôle |
|---|---|---|
| `nom` | oui | Affiché en grand sur la TV et sur les téléphones |
| `prix` | oui | Le vrai prix en **euros**, centimes avec un **point** : `3.49` (ni virgule, ni `€`). Max 999 999,99 |
| `emoji` | non | L'objet sur le piédestal quand il n'y a pas de photo (sinon 🎁) |
| `image` | non | Une photo du dossier `config/medias/` (remplace l'emoji) |
| `details` | non | Un indice sous le nom : contenance, taille, année, magasin… |
| `duree` | non | Secondes pour cet objet seulement |

### Ajouter une vraie photo
1. Copiez la photo (`.jpg`, `.png` ou `.webp`) dans le dossier `config/medias/` (à côté de `config/minijeux/`).
2. Indiquez juste son nom de fichier : `image: montre.jpg` (un sous-dossier marche aussi : `image: objets/montre.jpg`).
3. Une photo détourée (fond transparent, en `.png`) est la plus jolie sur le piédestal. Gardez-la sous 1 Mo.

Si le fichier est introuvable, l'emoji (ou 🎁) s'affiche à la place.

Chaque objet peut avoir un `theme:` facultatif (ex. `theme: bouffe`) : le tirage évite d'enchaîner deux objets du même thème.

## Conseils
- Les objets de la vie de tous les jours (baguette, ticket de métro) font de super manches : tout le monde croit savoir… et se trompe.
- Mélangez les ordres de grandeur (1 €, 40 €, 1 000 €, 20 000 €).
- Les objets personnels marchent très bien : « Le canapé de Julie », « Le voyage de noces de Paul et Léa ».
- Les prix fournis sont indicatifs (France, 2026) : ajustez-les.
- Une vingtaine d'objets (25 au maximum) suffisent : les manches sont tirées au hasard.

## Désactiver le jeu
Mettre `actif: false` en haut du fichier.

## Pièges YAML
- **Indentation avec des espaces**, jamais de tabulations.
- Prix avec un **point** : `prix: 36.10`. `prix: 36,10` est refusé.
- Mettez le nom entre guillemets `"…"` dès qu'il contient `: `, ` #`, une virgule (forme courte `{ … }`) ou commence par un caractère spécial.
- Les accents, apostrophes et émojis sont acceptés. Enregistrez en **UTF-8**.
- En cas d'erreur, le message de démarrage indique le fichier et le champ fautif.

## Appliquer les changements
Fermez puis relancez **NouvelAn.exe** : le fichier n'est lu qu'au démarrage.
