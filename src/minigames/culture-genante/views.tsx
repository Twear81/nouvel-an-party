// Écrans de « Culture gênante » : l'aiguillage entre les scènes. La mise en scène vit dans les fichiers de scène,
// chacun sans logique de jeu (tout vient du serveur via `pub.stage`) :
//   Accroche.tsx (festif) → Bascule.tsx (rupture) → Question.tsx (sérieux) → Reveal.tsx (résultats) ; Phone.tsx côté téléphone.
// Jeu « interlude » : la TV affiche ces écrans en plein écran, sans l'en-tête ni le chrono standard.
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { Accroche } from "./Accroche";
import { Bascule } from "./Bascule";
import type { TvPub } from "./game";
import { Phone } from "./Phone";
import { Question } from "./Question";
import { PhoneResults, revealSeconds, TvResults } from "./Reveal";
import { TvSerious } from "./Serious";

function Tv({ pub, round, players }: MiniGameViewProps<TvPub>) {
  switch (pub.stage) {
    case "accroche":
      // Décor festif : celui de la TV (on ne le recouvre pas).
      return (
        <div data-testid="cg-tv" data-stage="accroche" className="flex min-h-0 flex-1 flex-col">
          <Accroche text={pub.accroche.rigolo} seconds={pub.accrocheS} image={pub.accroche.image} son={pub.accroche.son} />
        </div>
      );
    case "bascule":
      return (
        <TvSerious testId="cg-tv" stage="bascule">
          <Bascule text={pub.accroche.serieux} seconds={pub.basculeS} />
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
