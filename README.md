# 🎉 Nouvel An Party

Jeu de soirée façon Jackbox : la TV affiche les questions, chacun joue sur son téléphone.
Fonctionne en local sur le wifi, sans internet ni installation sur les téléphones.

- **Jouer le jour J** → télécharger le zip Windows dans les [Releases](../../releases), voir `LISEZMOI.txt`.
- **Ajouter ses questions** → `config/minijeux/*.yaml`, doc dans chaque `src/minigames/<jeu>/README.md`.
- **Comprendre le code** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Mini-jeux

| Mini-jeu | Principe | Doc |
|---|---|---|
| Qui est le plus… ? | On vote pour l'invité qui correspond le mieux | [README](src/minigames/qui-est-le-plus/README.md) |
| Oui ou Non | On devine la majorité… ou la vraie réponse d'un invité tiré au sort | [README](src/minigames/oui-non/README.md) |

Créer un nouveau mini-jeu : [docs/creer-un-mini-jeu.md](docs/creer-un-mini-jeu.md).

## Développement (Debian sous WSL / Linux / macOS)

```bash
curl -fsSL https://bun.sh/install | bash
```

```bash
bun install
```

```bash
bun run dev
```

- TV : https://localhost:5173/tv (accepter l'avertissement de certificat une fois)
- Téléphones : scanner le QR code affiché sur la TV
- Le serveur redémarre et le front se recharge à chaque modification.

### Tester avec de vrais téléphones depuis WSL

Par défaut WSL est derrière un réseau virtuel : les téléphones ne le voient pas. Sur Windows 11 :

1. Créer/compléter `%UserProfile%\.wslconfig` :
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```
2. Autoriser les connexions entrantes vers WSL (PowerShell **administrateur**) :
   ```powershell
   Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
   ```
3. `wsl --shutdown` puis rouvrir le terminal.

Si le QR code pointe sur la mauvaise IP, la forcer dans `config/partie.yaml` (`ip: "192.168.1.42"`).

## Commandes

| Commande | Rôle |
|---|---|
| `bun run dev` | Dev avec rechargement à chaud |
| `bun run start` | Compile le front puis lance le serveur comme en prod |
| `bun run test` | Tests unitaires (moteur, mini-jeux, config) |
| `bun run test:e2e` | Tests de bout en bout (TV + plusieurs téléphones simulés). 1re fois : `bunx playwright install --with-deps chromium` |
| `bun run typecheck` | Vérification TypeScript |
| `bun run release` | Construit `release/nouvel-an-party-windows-x64.zip` (fonctionne depuis WSL) |
| `bun run release -- linux` | Même chose en exécutable Linux, pour tester sous WSL |

## Publier une version

```bash
git tag v1.0.0
```

```bash
git push origin v1.0.0
```

GitHub Actions teste, construit le zip Windows et le publie dans les Releases.

## Structure

```
config/              ← réglages et questions (copié à côté de l'exe)
src/shared/          ← types et protocole réseau partagés serveur/écrans
src/server/          ← serveur, moteur de partie, config, réseau
src/minigames/<id>/  ← un dossier par mini-jeu : game.ts (logique) + views.tsx (écrans) + README.md
src/web/             ← front React : tv/, play/, ui/ (composants), theme/ (design)
tests/unit/          ← tests du moteur et des mini-jeux (bun test)
tests/e2e/           ← tests navigateur (Playwright)
scripts/             ← dev et build de la release
```
