# Image Linux du jeu : l'exécutable autonome (bun build --compile) et le dossier config/ modifiable.
# Construction : docker build -t nouvel-an-party .
# Lancement    : docker compose up -d   (voir compose.yaml et docs/conteneur.md)
#
# Le jeu sert la TV en HTTP (3000) et les téléphones en HTTPS (3443). Le QR code doit contenir l'IP du PC sur le wifi :
# en réseau « host » (Linux), elle est détectée toute seule ; sinon, la donner avec PARTY_IP.

# ── 1. Construction : front Vite + exécutable Linux autonome
FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run release -- linux sans-zip

# ── 2. Exécution : une image légère, sans Bun ni sources
FROM debian:bookworm-slim
# tzdata : minuit suit TZ (heure locale), sinon tout serait en UTC.
RUN apt-get update && apt-get install -y --no-install-recommends tzdata && rm -rf /var/lib/apt/lists/*
WORKDIR /jeu
COPY --from=build /app/release/nouvel-an-party/ ./
# Les données (sauvegarde, certificat des téléphones, mémoire des questions) vivent dans un volume.
RUN mkdir -p /jeu/data
VOLUME ["/jeu/data"]
EXPOSE 3000 3443
# --no-open : pas de navigateur dans un conteneur ; la TV ouvre http://<IP du PC>:3000/tv depuis son propre navigateur.
ENTRYPOINT ["/jeu/nouvel-an", "--config", "/jeu/config", "--data", "/jeu/data", "--no-open"]
