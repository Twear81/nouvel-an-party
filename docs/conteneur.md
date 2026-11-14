# Faire tourner le jeu en conteneur (Linux)

Le jeu existe aussi en exécutable Linux autonome (`bun run release -- linux`), embarqué dans une image Docker.
Fichiers : [`Dockerfile`](../Dockerfile), [`compose.yaml`](../compose.yaml), [`.dockerignore`](../.dockerignore).

## Lancer

```sh
docker compose up -d --build     # construit l'image puis lance le jeu
docker compose logs -f           # affiche l'adresse de la TV et celle du QR code
docker compose down              # arrête (la partie reste sauvegardée dans ./data)
```

Puis, sur le PC branché à la TV : `http://localhost:3000/tv` (ou `http://<IP du serveur>:3000/tv`).
Les téléphones scannent le QR code affiché par la TV, comme d'habitude.

## Réseau : le point important

Les téléphones rejoignent `https://<IP>:3443/play`, l'IP écrite dans le QR code. Elle doit être celle de la machine
sur le wifi, pas l'IP interne du conteneur.

- **Linux (recommandé)** : `network_mode: host` (réglage par défaut de `compose.yaml`). Le jeu voit les vraies IP,
  le QR code est juste, et la TV ouverte sur la même machine est reconnue comme maître du jeu (Pause, Passer…).
- **Docker Desktop (Windows / Mac)**, sans réseau host : dans `compose.yaml`, commenter `network_mode`, décommenter
  `ports`, puis renseigner :
  - `PARTY_IP` : l'IP du PC sur le wifi (ex. `192.168.1.42`), pour le QR code et le certificat ;
  - `PARTY_HOST_IPS` : l'adresse sous laquelle la TV de ce PC arrive dans le conteneur (passerelle Docker, souvent
    `172.17.0.1`, visible dans les journaux de connexion), pour qu'elle pilote la partie.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `TZ` | Fuseau horaire, pour minuit (`Europe/Paris` dans `compose.yaml`). Sans lui, minuit tomberait à l'heure UTC. |
| `PARTY_IP` | IP du QR code ; l'emporte sur `ip:` de `config/partie.yaml`. |
| `PARTY_HOST_IPS` | IP supplémentaires traitées comme « la machine hôte », séparées par des virgules. |
| `PARTY_HTTP_PORT`, `PARTY_HTTPS_PORT` | Ports TV (3000) et téléphones (3443), si `port_http` / `port_https` ne suffisent pas. |

## Volumes

- `./data` → `/jeu/data` : sauvegarde de la partie, certificat des téléphones (gardé d'une soirée à l'autre tant que
  l'IP ne change pas), mémoire des questions déjà vues.
- `./config` → `/jeu/config` : le même dossier `config/` que la version Windows (questions, réglages, sons et médias
  de l'organisateur). Modifiable sans reconstruire l'image ; relancer le conteneur pour recharger.

L'image ne contient ni Bun ni les sources : seulement l'exécutable (front embarqué), `config/` par défaut et les crédits.
La GitHub Action « Release » produit aussi le zip Linux (`nouvel-an-party-linux-x64.zip`), utilisable sans Docker.
