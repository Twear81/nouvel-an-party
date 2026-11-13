# Culture gênante

Un **jeu surprise** (« interlude ») : il ne se programme pas comme les autres. Entre deux jeux, sans prévenir, la TV casse l'ambiance. Une phrase rigolote (« Haha, quelle ambiance, on rigole bien… »), puis la rupture (« Bon. Plus sérieusement. »), puis une question qui met mal à l'aise : une question de culture générale basique mais qui pique, ou des réponses franchement problématiques. Le fichier à modifier : `config/minijeux/culture-genante.yaml`.

## Quand ça arrive
- Sur l'écran de lancement, le jeu n'a pas de nombre de manches mais un interrupteur **Activé / Désactivé** (« Surprise · ~1 fois tous les 5 jeux »).
- Avec `tous_les: 5`, il surgit **une fois par bloc de 5 manches normales**, à un moment aléatoire du bloc : jamais en tout premier, jamais deux de suite. Avec 20 manches : environ 4 surprises. S'il n'y a plus de question inédite, il s'arrête.
- Pas d'écran d'annonce, pas de « Prépare-toi ! » : l'effet de surprise est le but. La manche ne compte pas dans « Manche 3 / 8 » (sinon on la verrait venir).
- Si vous ne lancez que ce jeu (interrupteur activé, aucune autre manche), la partie est une seule manche surprise : pratique pour essayer.

## Déroulé d'une manche (≈ 25-30 s)
1. **Accroche** (4 s) : la TV reste festive, la phrase rigolote s'écrit. Les téléphones affichent « Regarde la TV… ».
2. **Bascule** (2 s) : rupture nette. Écran sombre, un blanc, puis la phrase sérieuse. Les téléphones affichent toujours « Regarde la TV… » (aucun indice).
3. **Question** (15 s) : la TV, sobre et solennelle, affiche la question. Les choix (ou le pavé numérique) n'apparaissent sur les téléphones qu'à ce moment. La manche s'arrête dès que tout le monde (les téléphones connectés) a répondu.
4. **Résultats** : la bonne réponse s'allume, chacun apparaît sous la réponse qu'il a choisie (avec son temps), puis la phrase qui gêne (« 2 / 7 ont trouvé. », « Personne n'a trouvé. Personne. »).

Les résultats terminent l'univers courant. Après « Continuer » ou le passage de l'hôte, la pièce mène au
skin suivant avant la prochaine manche. La surprise et ses résultats gardent leur skin jusqu'au bout.
Si c'est la dernière manche, la pièce mène directement au classement final.

## Points

- **QCM** : bonne réponse = `bonne_reponse` (100) + un bonus de rapidité jusqu'à `bonus_rapidite` (50). Le bonus décroît avec le temps de réaction, **mesuré sur le téléphone** (à partir de l'affichage des choix) : 50 si instantané, 25 à mi-temps, 0 à la dernière seconde. Mauvaise réponse ou pas de réponse : 0. La réponse est définitive (un seul essai).
- **Estimation** : on classe par écart avec la bonne valeur. Le plus proche : `estimation_premier` (150), puis −`estimation_decroissance` (50) par rang : 150, 100, 50, 0. Égalité d'écart : même rang, mêmes points.

**Exemple** : « En quelle année… ? » (1969). Léa 1969 (150), Tom 1960 et Zoé 1978 (écart 9 : 2es ex æquo, 100 chacun), Max 1900 (4e : 0), Sam ne répond pas (0).

## Options du yaml
| Option | Défaut | Effet |
|---|---|---|
| `actif` | `true` | `false` : le jeu est ignoré |
| `nom`, `description` | | Titre et phrase d'explication |
| `tous_les` | `5` | Une surprise environ toutes les N manches normales |
| `duree_accroche` | `4` | Secondes de la phrase rigolote |
| `duree_bascule` | `2` | Secondes de la phrase sérieuse |
| `duree_question` | `15` | Secondes pour répondre (réglable par question) |
| `temps_resultats` | `8` | Lecture des résultats (calcul de durée de la soirée seulement) |
| `points.bonne_reponse` | `100` | QCM : bonne réponse |
| `points.bonus_rapidite` | `50` | QCM : bonus maximal de rapidité |
| `points.estimation_premier` | `150` | Estimation : points du plus proche |
| `points.estimation_decroissance` | `50` | Estimation : points perdus par rang |
| `accroches` | (obligatoire) | Les accroches, une tirée au hasard par manche |
| `questions` | (obligatoire) | Les questions |

## Écrire des accroches
```yaml
accroches:
  - rigolo: "Haha, quelle ambiance, on rigole bien…"
    serieux: "Bon. Plus sérieusement."
  - rigolo: "Champagne, rires, confettis… la vie est belle !"
    serieux: "Passons aux choses sérieuses."
    image: fete.jpg      # facultatif : fichier du dossier config/medias/, affiché à côté du texte rigolo
    son: rires.mp3       # facultatif : fichier du dossier config/medias/, joué pendant l'accroche
```
Courtes (80 caractères conseillés). Le son est joué par le navigateur de la TV ; si rien ne sort, vérifiez le volume et que vous avez cliqué sur la page (le bouton « Lancer la partie » suffit).

## Écrire des questions
**QCM** (2 à 4 réponses). **La bonne réponse est toujours la première de la liste** : le jeu mélange l'ordre à l'écran, personne ne voit la combine.
```yaml
questions:
  - texte: "Quelle est la capitale de l'Australie ?"
    reponses: ["Canberra", "Sydney"]
    commentaire: "Sydney est la plus grande ville, mais la capitale, c'est Canberra."   # facultatif
  - texte: "Quel animal tue le plus d'humains chaque année ?"
    reponses: ["Le moustique", "Le requin", "L'hippopotame", "Tonton au volant après minuit"]
    duree: 20                                                                          # facultatif
```
**Estimation** (un nombre entier, le plus proche gagne) :
```yaml
  - texte: "En quelle année l'homme a-t-il marché sur la Lune ?"
    estimation: 1969
    unite: "ans"          # facultatif : affiché après le nombre
```
Pour une question précise, `accroche: { rigolo: "...", serieux: "..." }` impose son accroche (sinon tirée au hasard).

Conseils : réponses de 40 caractères maximum (ce sont de gros boutons sur les téléphones) ; **vérifiez les bonnes réponses** (elles se discutent à 1 h du matin) ; l'humour noir vise la situation et les invités présents, jamais un groupe de personnes. Mettez les textes entre guillemets (surtout avec « : » ou « ? »). Une question tirée n'est pas rejouée dans la partie.

Chaque question peut avoir un `theme:` facultatif (ex. `theme: bouffe`) : le tirage évite d'enchaîner deux questions du même thème.

## Changer la mise en scène (pour les développeurs)
Chaque scène est un composant séparé, sans logique de jeu (tout vient du serveur via `pub.stage`) : `Accroche.tsx` (festif), `Bascule.tsx` (rupture), `Question.tsx` (sérieux), `Reveal.tsx` (résultats, `revealSeconds`), `Phone.tsx` (téléphones), `Serious.tsx` (décor sombre et chrono sobre). Les couleurs et la typo du mode sérieux sont dans `src/web/theme/theme.css` (section `culture-genante` : `serious-*`, `font-serious`). L'écran étant un interlude, la TV affiche `Tv` en plein écran, sans l'en-tête ni le chrono habituels (voir `docs/creer-un-mini-jeu.md`).
