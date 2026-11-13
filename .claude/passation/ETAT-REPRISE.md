# État pour reprendre (13 novembre 2026, fin d'après-midi)

À SUPPRIMER (avec tout `.claude/passation/`) avant la fusion de `feat/outro-v2` dans `main`.

- `main` : inchangée (27c255e).
- `feat/soiree-socle` : tout sauf l'outro (questions neuves, contenu, minuit au 1er janvier, clins d'œil TV, profils/cadres,
  correctif audio, aperçus). Typecheck + 603 unitaires verts. **Suite E2E complète jamais terminée** ; cadres par skin et
  invocation à valider visuellement par l'organisateur. Puis fusion `--no-ff` dans `main`.
- `feat/outro-v2` = socle + moteur de cérémonie et stats (Codex, relus, sains) + correctif duo (≥ 3 avis communs)
  + **commit « WIP » de la refonte de scène, interrompue en cours** par un sous-agent : typecheck vert, tests non relancés,
  aucune capture relue. Spécification : `brief-scene-outro.md`. Images livrées dans `src/web/theme/assets/ceremonie/`
  (non encore vérifiées : cadrage de `piece-nuit.png` à comparer au pixel avec `piece-reference.png`, transparences).
  Spec exploratoire du sous-agent sauvegardé ici : `zz-explo-outro.spec.ts.txt` (à remettre dans `tests/e2e/` pour l'utiliser,
  ne jamais le commiter dans `tests/`).
- `feat/soiree-integration` : ancienne outro de Codex, refusée, gardée comme référence uniquement.
- Reste à faire : voir la fin de `PASSATION.md` et la liste donnée à l'organisateur (fusion du socle, finir/relire l'outro,
  sons à remplacer, Shenron, contenu pour 3 parties, release et test grandeur nature).

## Vérification des images (13 novembre, soir)
- `piece-nuit.png` : 1672×941 comme `piece-reference.png`, contours superposés au pixel (décalage 0,0). OK.
- Détourés, alpha réel : cadre-dore, etoile, cuillere, tableau-honneur, journal, podium OK (alpha max 254-255, sans gravité).
- **À refaire** : `cloche.png` et `projecteur.png` ont des franges rouges/jaunes crénelées et un halo blanc hors de l'objet
  (mauvais détourage, visible sur fond sombre). Pour le faisceau, préférer un dégradé CSS à une image.
- Refonte de la scène (relecture du WIP, tests, captures 8 joueurs) : pas commencée.

## Relecture du WIP (13 novembre, soir)
- Typecheck vert, 654 unitaires verts, E2E `ceremonie` + `03-partie-complete` verts (chromium).
- Captures cérémonie à 8 joueurs / 16 caractères relues : souvenirs, classement provisoire sans score, enveloppe, machine à sous,
  carte, projecteur, étoile sur le portrait, duo : conformes au brief.
- Corrigé (non commité) : les portraits s'effaçaient pas pendant le zoom sur un souvenir (énormes, chevauchés, masquaient le journal)
  → `zoomedIn` dans `CeremonyScreen.tsx`. À revérifier en capture.
- **Bug probable** : dans le spec explo (4 bonus), le 4e bonus passe de « carte » au classement final sans projecteur ni gagnant.
  La chronologie `ceremonyTimeline` est correcte : chercher côté serveur (fin de phase calculée avec une autre durée ?).
- Classement final : pas encore capturé (les marques du spec explo étaient ratées). Relancer le spec avec le `when` non bloquant
  mais un timeout court (5 s) pour ne pas laisser filer le final.

## Mise à jour (13 novembre, soir, suite)
- Le « bug du 4e bonus » venait du spec explo (sauvegarde démarrant 14 s dans le futur) : pas un bug du jeu.
- Corrigé et vérifié en capture : portraits masqués pendant zoom et journal plein écran, pseudos de 16 caractères entiers
  (carte centrale du final, tableau d'honneur), étiquette du 1er devant les avatars du podium.
- Typecheck, 654 unitaires, E2E ceremonie + 03-partie-complete verts. En attente : validation de l'organisateur puis commit ;
  docs `mise-en-scene.md` / `changer-le-design.md` ; confettis qui couvrent le tableau d'honneur (à décider).
