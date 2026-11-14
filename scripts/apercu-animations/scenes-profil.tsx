// Section « Écrans TV » : la personnalisation d'un joueur, parcours réel du téléphone.
// Comme PhoneApp : sans profil → éditeur de création ; profil validé → lobby avec « Modifier » ; Modifier → éditeur.
// La TV montre le lobby réel : le joueur y apparaît (ou change d'allure) dès qu'il valide.
import { useEffect, useMemo, useState } from "react";
import type { GameSnapshot, Profile } from "../../src/shared/types";
import { PhoneScreen } from "../../src/web/phone/PhoneApp";
import { ProfileEditor } from "../../src/web/phone/ProfileEditor";
import { snapshotDeBase } from "./instantane";
import { actionsFactices, Disposition, PhonePane, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

function SceneProfil({ env }: { env: Env }) {
  // Le joueur personnalisé est le dernier arrivé ; les autres sont déjà dans le lobby.
  const autres = useMemo(() => env.joueurs.slice(0, -1).map((p) => ({ ...p, score: 0 })), [env.joueurs]);
  const moi = env.joueurs.at(-1)!;
  const [profil, setProfil] = useState<Profile | null>(null);
  const [edition, setEdition] = useState(false);
  const [essai, setEssai] = useState(0);
  const { definirDuree } = env;
  useEffect(() => definirDuree(null), [definirDuree]);

  const joueurs = [...autres, { ...moi, score: 0, profile: profil }];
  // Lobby en thème de base, comme en partie (docs/skins.md).
  const snapshot: GameSnapshot = { ...snapshotDeBase("lobby", { joueurs, skin: null, paused: false }), me: { id: moi.id, private: null, inRound: true } };
  const actions = actionsFactices({ setProfile: async (p) => { setProfil(p); } });
  const enEdition = !profil || edition;
  const moiPublic = joueurs.at(-1)!;

  return (
    <>
      <Disposition
        tv={(echelle) => <TvPane snapshot={{ ...snapshot, players: profil ? joueurs : autres }} echelle={echelle} />}
        telephones={[
          <PhonePane key={`profil-${essai}`} snapshot={snapshot} joueurId={moi.id} actions={actions} taille={env.taillePhone}
            etiquette={!profil ? "Premier passage : création du profil" : edition ? "Modification du profil" : "Lobby du joueur"}>
            {enEdition
              ? <ProfileEditor key={profil ? "edit" : `new-${essai}`} initial={profil} actions={actions} onDone={() => setEdition(false)} onCancel={profil ? () => setEdition(false) : undefined} />
              : <PhoneScreen snapshot={snapshot} me={moiPublic} actions={actions} onEdit={() => setEdition(true)} />}
          </PhonePane>,
        ]}
      />
      <div className="ga-actions">
        <button type="button" data-testid="ga-profil-zero" onClick={() => { setProfil(null); setEdition(false); setEssai((n) => n + 1); }}>Recommencer à zéro</button>
        <button type="button" data-testid="ga-profil-existant" onClick={() => { setProfil(moi.profile); setEdition(true); }}>Modifier un profil existant</button>
      </div>
    </>
  );
}

export const SCENES_PROFIL: Scene[] = [
  { id: "ecrans/profil", section: "ecrans", titre: "Personnalisation d'un joueur", aide: "Parcours réel du téléphone : création du profil (pseudo, avatar, couleur, cadre), puis lobby et « Modifier » ; la TV montre l'arrivée dans le lobby.", Composant: SceneProfil },
];
