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
| `skins` | tous | Liste d'habillages utilisés (au moins un ; id inconnu = erreur de config). Voir [skins.md](skins.md) |
| `skins_ordre` | `melange` | `melange` : ordre tiré au hasard au lancement de la partie ; `liste` : ordre de `skins`. Le skin ne change qu'à l'annonce d'une manche |
| `port_http` | `3000` | Port HTTP (la TV : `http://localhost:3000/tv`) |
| `port_https` | `3443` | Port HTTPS pour les téléphones (`https://<IP>:3443/play`) |
| `ip` | `auto` | `auto` : détection de l'IP wifi. Sinon une IP forcée (ex. `"192.168.1.42"`) si le QR code pointe vers la mauvaise carte réseau |
| `ouvrir_navigateur` | `true` | Ouvre automatiquement l'écran TV dans le navigateur au lancement |

Le nombre de manches par mini-jeu n'est **pas** dans ce fichier : il se choisit sur l'écran TV avant de lancer la partie. Les jeux « surprise » (interludes, ex. Culture gênante) n'ont pas de nombre de manches mais un interrupteur Activé / Désactivé ; leur rythme (« une fois tous les N jeux ») se règle dans le yaml du jeu (`tous_les`). `intro_secondes` ne s'applique pas à eux : pas d'annonce.

### Plafonner les manches d'un jeu : `manches_max`
Dans le yaml de **n'importe quel** mini-jeu, `manches_max: 3` (entier ≥ 1, optionnel, placé juste après `actif`) limite le nombre de manches que le lobby propose pour ce jeu (le « sur N » est le plus petit de `manches_max` et du nombre de questions disponibles). Utile pour qu'un jeu long ne prenne pas toute la soirée. Pour un jeu surprise, cela plafonne le nombre de surprises. Sans la ligne, pas de plafond.

### Exemple
```yaml
titre: "Nouvel An 2027"
duree_cible_minutes: 90
ordre: melange
intro_secondes: 4
skins: [dofus, overwatch, league-of-legends, rocket-league, gunz, mario-odyssey, plague-tale]
skins_ordre: melange
ip: auto
```

## Le dossier data/
Créé automatiquement à côté de l'exe. Ne pas y toucher pendant la partie.

| Contenu | Rôle |
|---|---|
| `save.json` | sauvegarde de la partie, réécrite à chaque étape. Après un crash ou un redémarrage, la TV propose de **reprendre** |
| `photos/` | photos de profil des joueurs |
| `certs/` | certificat HTTPS auto-signé (nécessaire pour la caméra du téléphone). Les téléphones affichent un avertissement la première fois : il faut accepter |

### Repartir de zéro
Fermez `NouvelAn.exe`, supprimez le dossier `data/`, relancez. Les joueurs et scores sont effacés. Le certificat est régénéré (les téléphones devront accepter à nouveau l'avertissement). Pour ne réinitialiser que la partie en gardant photos et certificat, supprimez seulement `save.json`.
