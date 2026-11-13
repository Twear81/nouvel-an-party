# Prompts des images de l'outro (à générer avec Codex)

Déposer les fichiers dans `src/web/theme/assets/ceremonie/` avec exactement ces noms.
Toujours joindre `src/web/theme/assets/piece-reference.png` comme image de référence (style et lumière).

## Bloc de style commun (à coller au début de chaque prompt)
Style: warm semi-realistic digital painting, exactly the same rendering style, brushwork, palette and lighting as the attached
reference image of a living room (soft cinematic light, gentle bloom, clean edges, cozy French apartment, New Year's Eve).
No text, no letters, no logos, no watermark, no people.

## 1. `piece-nuit.png` — la pièce de nuit (fond de toute la cérémonie et du classement)
Edit the attached image. Keep EXACTLY the same composition, camera, perspective, furniture positions and image size
(1672×941, 16:9) — every object must stay at the same pixel position so overlays line up. Change only the lighting: it is now
late at night, the ceiling lights are off. The room is lit by the warm glow of the wood stove fire, the pink and cyan neon of the
jukebox, the Christmas string lights of the street through the two windows, and a soft deep-blue moonlight. Walls in deep blue
shadow with warm pools of light near the stove and jukebox. The TV screen is dark navy, slightly reflective. The cat still sleeps
on the pouf. The glass coffee table catches small reflections. Atmosphere: magical, festive, intimate, slightly darker but still
readable (nothing pitch black).

## 2. `podium.png` — le podium (calque qui monte devant la cheminée)
Transparent background PNG, 1200×700. A festive three-step winners' podium seen from the front at the same slight high angle as
the reference room: center block tallest, left block medium, right block lowest. Made of dark navy blue lacquered wood with polished
gold trim and gold edges, soft warm reflections, a little gold glitter dust on the top surfaces. Front faces of the blocks are
plain and empty (numbers will be added by code). Flat tops with enough room for one large round portrait on each block.
Soft contact shadow under the podium only. Lit as if in the night version of the room (warm fire light from behind, blue ambient).

## 3. `cadre-dore.png` — le cadre du dessin souvenir (accroché au mur du fond)
Transparent background PNG, 900×700. An ornate but elegant gilded picture frame seen perfectly from the front, landscape format,
with a thin cream mat (passe-partout). The inner opening (inside the mat) must be fully transparent (a drawing will be shown behind
it). Small brass nail and a thin wire at the top. Subtle drop shadow cast down-right, as if hanging on a wall. Museum quality,
slightly humorous pomp.

## 4. `cloche.png` — la cloche du Bon Prix (posée sur la table basse)
Transparent background PNG, 700×800. A glass display cloche (dome) on a round dark walnut base with a small brass plaque on the
front (plaque empty, no text). The glass is clear and slightly reflective with soft highlights; the inside is EMPTY and the area
inside the dome must stay mostly transparent so an object can be shown inside it. Front view, slight high angle. Soft contact shadow.

## 5. `journal.png` — « La Une du 1er janvier » (remplace le post-it)
Transparent background PNG, 1000×1300, portrait. The front page of a vintage-style French daily newspaper seen perfectly from the
front, flat, very slightly crumpled paper, warm off-white paper with subtle print texture. Top: an ornate empty masthead banner
(no letters). Below: a very large EMPTY headline zone (plain paper), then an empty rectangular photo box with a thin black border,
then a few columns of illegible tiny grey placeholder lines (no readable text). Gentle shadow at the edges. The headline, date and
photo will be added by code.

## 6. `projecteur.png` — le halo de projecteur (roulette des bonus)
Transparent background PNG, 800×1400, portrait. A theatrical spotlight beam coming from the top: a soft cone of warm white light
widening towards the bottom, ending in a soft bright oval pool of light on the floor at the very bottom. Visible dust particles
floating in the beam, smooth falloff to fully transparent edges. No lamp fixture visible. Additive-light look.

## 7. `etoile.png` — l'étoile bonus
Transparent background PNG, 512×512. A chunky, glossy, five-pointed golden star with rounded points, a bright specular highlight,
a thin darker gold outline and a few small sparkles around it. Cheerful video-game party style, original design (not a copy of any
existing game asset). Front view, centered, no shadow.

## 8. `cuillere.png` — la cuillère à tiramisu (prix « Merci pour les travaux »)
Transparent background PNG, 600×900, portrait. A ridiculous trophy: a large shiny silver dessert spoon holding a perfect bite of
tiramisu (cocoa-dusted cream layer and coffee-soaked biscuit), mounted upright on a small marble trophy base with an empty gold
plaque (no text). Proud, absurd, award-ceremony look. Front view, soft contact shadow.

## 9. `tableau-honneur.png` — le panneau du classement final complet
Transparent background PNG, 1000×1300, portrait. An elegant honor board: deep navy blue velvet panel with a polished gold
ornamental border, small gold stars in the corners, a subtle laurel wreath motif at the top center, and a warm sheen. The inside is a
plain empty velvet area (rows of names and scores will be added by code). Front view, soft drop shadow.

## Vérification après génération
- `piece-nuit.png` : superposée à `piece-reference.png`, la TV, la table basse, la cheminée et les fenêtres doivent tomber aux mêmes
  pixels (sinon regénérer ; la position des souvenirs et du podium en dépend).
- Les PNG à fond transparent doivent vraiment l'être (pas de damier peint, pas de fond blanc).
