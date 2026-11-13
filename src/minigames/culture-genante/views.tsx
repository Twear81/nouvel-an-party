// Écrans de « Culture gênante » : l'aiguillage entre les scènes. La mise en scène vit dans les fichiers de scène,
// chacun sans logique de jeu (tout vient du serveur via `pub.stage`) :
//   Accroche.tsx (festif) → Bascule.tsx (rupture) → Question.tsx (sérieux) → Reveal.tsx (résultats) ; Phone.tsx côté téléphone.
// Jeu « interlude » : la TV affiche ces écrans en plein écran, sans l'en-tête ni le chrono standard.
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { Accroche } from "./Accroche";
import { typo } from "../../web/ui";
import { useSfxSequence, type SonDecale } from "../../web/ui/sfxSequence";
import { Bascule, silenceBascule } from "./Bascule";
import type { TvPub } from "./game";
import { Phone } from "./Phone";
import { PLAQUE_DELAY_S, PLAQUE_STEP_S, Question } from "./Question";
import { PhoneResults, revealSeconds, TvResults } from "./Reveal";
import { TvSerious } from "./Serious";

const sonsBascule = (seconds: number): SonDecale[] => [
  { at: 0, son: "boum", options: { rate: 0.5, volume: 1.2 } },
  { at: silenceBascule(seconds) * 1000, son: "ui.clic", options: { rate: 0.5 } },
];

const sonsQuestion = (choix: number): SonDecale[] => [
  { at: 0, son: "carte.pose", options: { rate: 0.7 } },
  ...Array.from({ length: choix }, (_, i) => ({ at: Math.round((PLAQUE_DELAY_S + i * PLAQUE_STEP_S) * 1000), son: "carte.pose" as const, options: { rate: 0.8 + i * 0.08, volume: 0.7 } })),
];

function Tv({ pub, round, players }: MiniGameViewProps<TvPub>) {
  // Sons de la mise en scène, déclenchés par le changement d'étape (jamais au montage). Les mêmes constantes que les scènes :
  // la bascule laisse son silence (`silenceBascule`) avant la phrase, les plaques de la question arrivent en cascade.
  useSfxSequence(pub.stage === "bascule" ? "bascule" : null, sonsBascule(pub.basculeS));
  useSfxSequence(pub.stage === "question" ? "question" : null, sonsQuestion(pub.choices?.length ?? 0));
  switch (pub.stage) {
    case "accroche":
      // Décor festif : celui de la TV (on ne le recouvre pas).
      return (
        <div data-testid="cg-tv" data-stage="accroche" className="flex min-h-0 flex-1 flex-col">
          <Accroche text={typo(pub.accroche.rigolo)} seconds={pub.accrocheS} image={pub.accroche.image} son={pub.accroche.son} />
        </div>
      );
    case "bascule":
      return (
        <TvSerious testId="cg-tv" stage="bascule">
          <Bascule text={typo(pub.accroche.serieux)} seconds={pub.basculeS} />
        </TvSerious>
      );
    case "question":
      return (
        <TvSerious testId="cg-tv" stage="question">
          <Question pub={pub} round={round} players={players} />
        </TvSerious>
      );
  }
}

export default {
  Tv,
  Phone,
  TvResults,
  PhoneResults,
  revealSeconds: ({ results }) => (results ? revealSeconds(results) : 0),
} satisfies MiniGameViews;
