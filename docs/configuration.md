# Configuration

Tout se règle dans le dossier `config/`, à côté de `NouvelAn.exe`. Les fichiers sont en YAML (texte simple, éditable avec le Bloc-notes, enregistré en UTF-8, indentation avec des espaces). **Toute modification demande de relancer `NouvelAn.exe`.**

| Fichier | Contenu |
|---|---|
| `config/partie.yaml` | réglages généraux de la soirée (cette page) |
| `config/minijeux/<jeu>.yaml` | contenu et réglages de chaque mini-jeu (voir le README de chaque jeu dans `src/minigames/<jeu>/`) |

Un fichier `partie.yaml` absent ou vide utilise les valeurs par défaut. Une faute de saisie affiche un message avec le fichier et le champ concerné.

## partie.yaml
| Option | Défaut | Effet |
|---|---|---|
| `titre` | `Soirée du Nouvel An` | Titre affiché sur la TV et les téléphones |
| `duree_cible_minutes` | `60` | Durée visée : sert à proposer, sur l'écran de lancement, un nombre de manches par défaut (chaque mini-jeu au moins une fois). Le réglage reste modifiable sur la TV |
| `ordre` | `melange` | `melange` : on alterne les mini-jeux ; `groupe` : toutes les manches d'un mini-jeu à la suite |
| `intro_secondes` | `4` | Durée de l'écran d'annonce avant chaque manche |
| `volume_sons` | `0.8` | Volume général des sons de la TV, de `0` (muet) à `1`. Le bouton haut-parleur de la barre de l'hôte coupe et remet le son pendant la partie. Les sons se remplacent sans recompiler : voir [Sons](#sons) |
| `port_http` | `3000` | Port HTTP (la TV : `http://localhost:3000/tv`) |
| `port_https` | `3443` | Port HTTPS pour les téléphones (`https://<IP>:3443/play`) |
| `ip` | `auto` | `auto` : détection de l'IP wifi. Sinon une IP forcée (ex. `"192.168.1.42"`) si le QR code pointe vers la mauvaise carte réseau |
| `ouvrir_navigateur` | `true` | Ouvre automatiquement l'écran TV dans le navigateur au lancement |

Le nombre de manches par mini-jeu n'est **pas** dans ce fichier : il se choisit sur l'écran TV avant de lancer la partie. Les jeux « surprise » (interludes, ex. Culture gênante) n'ont pas de nombre de manches mais un interrupteur Activé / Désactivé ; leur rythme (« une fois tous les N jeux ») se règle dans le yaml du jeu (`tous_les`). `intro_secondes` ne s'applique pas à eux : pas d'annonce.

`intro_secondes` concerne seulement l'annonce de chaque manche. L'installation dans la pièce en début de partie
dure 9 s ; les changements d'univers après Culture gênante durent 4 s et la sortie avant le podium 2,4 s.
Ces scènes utilisent les durées partagées du thème et se pilotent aussi avec Pause/Reprendre/Passer.

### Sons
Les sons sortent uniquement de la TV (jamais des téléphones). Les navigateurs interdisent le son tant qu'on n'a pas cliqué : la TV
affiche un haut-parleur barré dans le coin du lobby jusqu'au premier clic ou à la première touche. Le jour J, cliquer une fois sur la TV.

Pour remplacer un son sans recompiler, déposer un fichier `.mp3`, `.ogg` ou `.wav` portant le **nom logique** du son dans
`config/medias/sons/` (ex. `config/medias/sons/chrono.fin.mp3`), ou dans `config/medias/sons/<skin>/` pour un seul univers
(ex. `config/medias/sons/rocket-league/chrono.fin.ogg`). La liste des noms est dans `config/medias/sons/LISEZMOI.txt`.
Les sons fournis sont des sons libres (CC0) de Kenney : voir `src/web/theme/sons/LICENCES.md`.

### Plafonner les manches d'un jeu : `manches_max`
Dans le yaml de **n'importe quel** mini-jeu, `manches_max: 3` (entier ≥ 1, optionnel, placé juste après `actif`) limite le nombre de manches que le lobby propose pour ce jeu (le « sur N » est le plus petit de `manches_max` et du nombre de questions disponibles). Utile pour qu'un jeu long ne prenne pas toute la soirée. Pour un jeu surprise, cela plafonne le nombre de surprises. Sans la ligne, pas de plafond.

### Exemple
```yaml
titre: "Nouvel An 2027"
duree_cible_minutes: 90
ordre: melange
intro_secondes: 4
ip: auto
```

## Le dossier data/
Créé automatiquement à côté de l'exe. Ne pas y toucher pendant la partie.

| Contenu | Rôle |
|---|---|
| `save.json` | sauvegarde de la partie, réécrite à chaque étape. Après un crash ou un redémarrage, la TV propose de **reprendre** |
| `certs/` | certificat HTTPS auto-signé (nécessaire pour garder l'écran du téléphone allumé). Les téléphones affichent un avertissement la première fois : il faut accepter |

### Repartir de zéro
Fermez `NouvelAn.exe`, supprimez le dossier `data/`, relancez. Les joueurs et scores sont effacés. Le certificat est régénéré (les téléphones devront accepter à nouveau l'avertissement). Pour ne réinitialiser que la partie en gardant le certificat, supprimez seulement `save.json`.

Une ancienne sauvegarde avec un portrait photo reste utilisable : le portrait devient l'avatar Renard ; le pseudo,
le cadre, la couleur, le score et le jeton sont conservés. Un ancien dossier `photos/` n'est plus utilisé ni servi par
l'application ; ses fichiers ne sont pas supprimés automatiquement.

## Souvenirs et bonus de fin (`outro`)

Après la sortie de la TV, la cérémonie rappelle jusqu'à trois souvenirs de la partie et tire quatre bonus,
puis démarre le classement final. Les commandes Pause et Passer s'appliquent à chaque étape.

```yaml
outro:
  actif: true
  bonus: 4
  points_bonus: auto
```

`actif: false` rejoint directement le classement. `bonus` va de 0 à 12. `points_bonus` accepte un entier ≥ 0
ou `auto` : 37,5 % du gain moyen du gagnant d'une manche, arrondi au multiple de 10 le plus proche, minimum 10.
Les quatre bonus représentent donc environ une manche et demie. Chaque gagnant reçoit ce montant, y compris
les deux membres du Duo improbable et tous les ex æquo d'une catégorie. Le tirage sans remise favorise légèrement
les poursuivants et la variété. Un écart supérieur au total des bonus possibles protège mathématiquement le leader.

`config/outro.yaml` permet de changer `titre`, `phrase`, `emoji` ou `actif` pour chaque catégorie connue.
Une catégorie sans données ne passe jamais dans la roulette. Le fichier absent garde les textes par défaut ;
un identifiant inconnu est signalé au démarrage. Il est inclus dans le dossier portable de la même manière
que les questions. Les points sont appliqués une seule fois, à la fin de la cérémonie ; un crash reprend le
même tirage et le même instant, y compris une pause en cours.
