# Split the Room

Une situation s'affiche sur la TV (« Tu gagnes 1 million d'euros, mais… »). Chacun écrit **la suite** sur son téléphone, puis les phrases passent une par une, sans nom : toute la salle vote OUI ou NON (« Tu acceptes ? »). L'auteur marque d'autant plus que la salle est **coupée en deux**. Le fichier à modifier : `config/minijeux/split-the-room.yaml`.

## Déroulé d'une manche
1. **Écrire** : la TV montre le début de la situation et les invités ; chaque avatar s'allume quand son téléphone a envoyé une fin (sans dire laquelle). Sur le téléphone, on tape sa fin puis « Envoyer » : le cadre et le bouton passent au vert. On peut la modifier (« Modifier ») tant que l'étape dure ; vider le champ puis « Retirer » annule sa phrase.
   L'étape s'arrête au bout de `duree_ecriture`, ou 3 s après que tout le monde a envoyé (le temps de corriger une faute).
2. **Voter** : les phrases passent une à une, dans un ordre tiré au hasard. La TV affiche la phrase complète en grand (début en blanc, fin de l'invité en or) et des pastilles anonymes de progression des votes. Chaque téléphone a deux gros boutons OUI / NON (on peut changer d'avis) ; l'auteur voit « C'est ta phrase ! Croise les doigts pour un 50/50 ». On passe à la révélation quand tous ceux qui peuvent voter ont voté, ou au bout de `duree_vote`.
3. **Révélation** (`duree_revelation`) : une jauge se remplit vote par vote (les OUI à gauche, les NON à droite, sans dire qui a voté quoi), puis le verdict (« LA SALLE EST COUPÉE EN DEUX ! » en cas de score parfait, « Unanimité… » si tout le monde a voté pareil), puis l'auteur est démasqué avec ses points. Les téléphones n'affichent le résultat qu'en même temps que la TV (« Regarde la TV ! » d'abord).
4. **Résultats** : récapitulatif de toutes les phrases avec leur auteur, les OUI / NON et les points ; la phrase la plus coupée est mise en avant (cadre doré).

Moins de 2 phrases écrites : on ne peut rien voter, la manche passe directement aux résultats (sans points). Un téléphone déconnecté ne bloque jamais : on n'attend que les joueurs connectés.

## Points
Seul l'**auteur** de la phrase marque (les votants ne marquent rien), d'après l'écart entre OUI et NON :
- **Parfait** : écart minimal possible (0 si le nombre de votants est pair, 1 s'il est impair) = `points.max` (300) ;
- **Unanimité** (tout le monde pareil) = 0 ;
- entre les deux : proportionnel à l'écart, arrondi.
- Les abstentions (pas de vote avant la fin du chrono) sont ignorées. Avec moins de 2 votes sur une phrase : 0 point (la phrase est quand même montrée).

**Exemple** : 7 joueurs, donc 6 votants. 3 OUI / 3 NON = 300. 4 / 2 = 200. 5 / 1 = 100. 6 / 0 = 0.

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré dans la partie |
| `nom` | `Split the Room` | Titre affiché |
| `description` | `Termine la phrase pour couper la salle en deux` | Phrase d'explication à l'annonce |
| `duree_ecriture` | `60` | Secondes pour écrire |
| `duree_vote` | `15` | Secondes pour voter sur chaque phrase |
| `duree_revelation` | `9` | Secondes de révélation (jauge, verdict, auteur) après chaque phrase |
| `temps_resultats` | `15` | Secondes estimées de lecture des résultats (calcul de durée seulement) |
| `longueur_max` | `80` | Nombre max de caractères d'une fin de phrase (10 à 200) |
| `points.max` | `300` | Points de l'auteur quand la salle est parfaitement coupée |
| `situations` | (obligatoire) | Liste des débuts de situation, au moins un ; un est tiré par manche |

Durée d'une manche à 7 : environ 1 min d'écriture + 7 phrases × (≈ 8 s de vote + 9 s de révélation) ≈ 3 min.

## Écrire des situations
Sous `situations:`, un début par ligne, commençant par `- ` (tiret + espace), entre guillemets si il contient `: ` ou ` #`. Il doit se terminer par « mais… » (ou équivalent) pour que les invités écrivent la suite.

```yaml
situations:
  - "Tu gagnes 1 million d'euros, mais…"
  - "Tu peux voler, mais…"
```

Les meilleurs débuts sont séduisants au premier abord, avec un piège à inventer : chacun cherche la fin qui divisera la salle (ni trop gentille : tout le monde dirait oui, ni trop atroce : tout le monde dirait non).

## Pièges YAML
- Garder l'indentation (2 espaces) et le `- ` devant chaque situation.
- Une apostrophe dans un texte entre guillemets doubles ne pose pas de problème : `"Tu n'as plus jamais faim, mais…"`.

Pour désactiver le jeu : `actif: false`. Toute modification du yaml demande de relancer NouvelAn.exe.
