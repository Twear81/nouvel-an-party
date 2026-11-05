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
| `port_http` | `3000` | Port HTTP (la TV : `http://localhost:3000/tv`) |
| `port_https` | `3443` | Port HTTPS pour les téléphones (`https://<IP>:3443/play`) |
| `ip` | `auto` | `auto` : détection de l'IP wifi. Sinon une IP forcée (ex. `"192.168.1.42"`) si le QR code pointe vers la mauvaise carte réseau |
| `ouvrir_navigateur` | `true` | Ouvre automatiquement l'écran TV dans le navigateur au lancement |

Le nombre de manches par mini-jeu n'est **pas** dans ce fichier : il se choisit sur l'écran TV avant de lancer la partie.

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
| `photos/` | photos de profil des joueurs |
| `certs/` | certificat HTTPS auto-signé (nécessaire pour la caméra du téléphone). Les téléphones affichent un avertissement la première fois : il faut accepter |

### Repartir de zéro
Fermez `NouvelAn.exe`, supprimez le dossier `data/`, relancez. Les joueurs et scores sont effacés. Le certificat est régénéré (les téléphones devront accepter à nouveau l'avertissement). Pour ne réinitialiser que la partie en gardant photos et certificat, supprimez seulement `save.json`.
