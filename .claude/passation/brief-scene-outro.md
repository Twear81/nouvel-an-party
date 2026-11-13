# Brief : refonte de la scène d'outro et du classement final (branche `feat/outro-v2`)

Contexte : le moteur de cérémonie (`src/server/engine/awards.ts`, `history.ts`, `src/shared/ceremony.ts`, phase `ceremony`) et la collecte
des stats par les mini-jeux sont en place et sains. L'écran actuel de cérémonie (`src/web/tv/CeremonyScreen.tsx`, provisoire) et
l'écran final (`src/web/tv/FinalScreen.tsx`) sont à REFAIRE. La version précédente (Codex, branche `feat/soiree-integration`, commit
37de4f9) a été refusée : points affichés pendant la cérémonie (aucun suspense), souvenirs posés « à l'arrache », post-it pas terrible,
projecteurs pas terribles, corbeau cheap, écran de classement final « horrible ». Ne pas s'en inspirer.

Images (peintes, dans `src/web/theme/assets/ceremonie/`) : `piece-nuit.png` (même cadrage que `piece-reference.png`, 1672×941),
`podium.png`, `cadre-dore.png` (centre transparent), `cloche.png`, `journal.png`, `projecteur.png`, `etoile.png`, `cuillere.png`,
`tableau-honneur.png`. Prompts : `.claude/passation/prompts-images-outro.md`.

## Décisions de l'organisateur
- Thème de base, dans la pièce. **Aucun chiffre de score pendant la cérémonie** : chaque bonus donne une **étoile** (`etoile.png`)
  posée sur le portrait du gagnant. Les points n'apparaissent qu'au classement final, où les étoiles se convertissent sous nos yeux.
- **Pas de corbeau.** Les enveloppes des bonus arrivent en glissant, façon cérémonie des Oscars (enveloppe dorée dessinée en CSS
  propre ou image, scellée, qui s'ouvre).
- Souvenirs mis en scène un par un : **zoom caméra** (transform scale/translate sur le calque pièce) vers l'endroit, l'objet s'installe
  avec un geste physique (ressort, légère oscillation), légende sur une carte élégante, puis dézoom ; l'objet RESTE dans le décor.
  - dessin le plus voté dans `cadre-dore.png`, accroché au mur du fond (au-dessus du placard, à gauche de la cheminée) ;
  - objet du Bon Prix (emoji + nom) sous `cloche.png` sur la table basse, prix sur la plaque ;
  - Culture gênante : **« La Une du 1er janvier »** (`journal.png`) qui arrive en tournoyant plein écran (effet journal de vieux film),
    titre écrit par le code dans une police à empattements du thème (ex. « INCROYABLE : 5 invités sur 7 pensaient que… »), puis se pose
    à plat sur la table.
  Les points d'ancrage sont mesurés sur l'illustration (constantes regroupées, en % de l'image) et vérifiés en capture.
- Roulette des bonus : la pièce s'assombrit (voile opacity), une machine à sous de catégories (emoji + titre) défile et ralentit, puis
  la carte de la catégorie tirée se retourne (titre, phrase). Projecteur : `projecteur.png` (additif via opacity, pas de blend-mode sur
  grand calque) saute de portrait en portrait en ralentissant, tic sonore à chaque saut, puis flash, le gagnant bondit, l'étoile tombe
  sur son portrait, `statLabel` affiché. « Merci pour les travaux » : la cuillère (`cuillere.png`) est remise. « Talent incompris » : le
  dessin revient en grand, « Le public n'était pas prêt. ». « Duo improbable » : deux portraits éclairés ensemble, deux étoiles.
- Classement provisoire (avant les bonus) : portraits autour de la table dans l'ordre, SANS score.

## Classement final (remplace FinalScreen) — dans `piece-nuit.png`
1. Scores toujours cachés. Du dernier au 4e : chaque portrait s'avance au centre, son score de base défile (CountUp), puis ses étoiles
   s'envolent une à une vers le score (« ★ +120 » chacune), puis il va se ranger sur le `tableau-honneur.png` à droite (rang, avatar,
   pseudo 16 caractères, score), lisible à 4 m.
2. `podium.png` monte devant la cheminée ; 3e puis 2e (même conversion d'étoiles), long roulement, puis le 1er.
3. Le 1er : son portrait apparaît en grand dans l'écran de la TV dessinée avec couronne (`crowned`), le jukebox « s'illumine »
   (halo opacity), feu d'artifice dessiné par le code limité aux deux fenêtres (masque/clip rectangulaire), confettis maison, « Bonne
   année ! ». Le tableau final reste affiché (tous les rangs).
4. Chronologie : prolonger `src/shared/final-reveal.ts` (constantes partagées serveur/écran, la durée dépend du nombre de joueurs et
   d'étoiles de chacun) — invariant « pas de spoil » ; garder `data-testid="tv-final"`, `podium-N`, `data-stage` (reveal/done).
5. Téléphones : pendant la cérémonie « Regarde la TV » + carte de SON bonus quand il est révélé (vibration Android) ; au final, son rang
   seulement quand il est révélé.

## Règles
CLAUDE.md : transform/opacity uniquement, images fixes, pas de SVG animé, pas de filter/mix-blend-mode sur grand calque ; classes du
thème, composants `src/web/ui` (nouveaux composants si besoin) ; `data-testid` + `data-step`/`data-stage` ; sons TV via le catalogue
(roulette, tic de projecteur, roulement de tambour, fanfare, applaudissements ; réutiliser l'existant, signaler ce qui manque).
TV 1920×1080 lisible à 4 m ; 8 joueurs, pseudos de 16 caractères ; téléphone 360×640.
Revue : spec exploratoire jetable qui capture chaque étape (TV + téléphone, chromium puis webkit), relire ≤ 15 captures, supprimer le spec.
Tests : `bun run typecheck && bun run test`, E2E `ceremonie*` + specs de partie complète/classement final, mise à jour de
`docs/mise-en-scene.md` et `docs/changer-le-design.md`. Commits en français, auteur = identité du dépôt, aucune mention de Claude.
