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
