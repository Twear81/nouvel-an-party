// Scène 3 : la QUESTION, en mode sérieux. Sobre, solennelle : le malaise vient du contraste avec l'accroche.
// Pour changer la mise en scène : modifier ce composant (aucune logique de jeu ici).
import { motion } from "motion/react";
import type { PublicPlayer, RoundInfo } from "../../shared/types";
import { CheckIcon, PlayerAvatar, typo } from "../../web/ui";
import type { Pub } from "./game";
import { fitText, LETTERS, SeriousTimer, Unbroken } from "./Serious";

/** Une plaque de réponse (A, B, C, D). */
function Plaque({ letter, label, i, count }: { letter: string; label: string; i: number; count: number }) {
  // 2 ou 3 choix : de grandes plaques (sinon l'écran est vide) ; 4 choix : deux rangées plus basses.
  const tall = count <= 3;
  const wide = count === 3 ? 22 : 36;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + i * 0.12 }}
      className={`flex items-center gap-6 border border-serious-line bg-serious-bg-2/60 px-8 py-6 ${tall ? "min-h-[17rem]" : ""} ${count === 3 ? "flex-col justify-center text-center" : ""}`}
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-serious-accent text-4xl text-serious-accent">{letter}</span>
      <span data-testid={`cg-tv-choice-${i}`} className="min-w-0 text-balance break-words leading-tight" style={{ fontSize: `${fitText(label, wide, 2.4, tall ? 5 : 3.8, 2)}rem` }}>
        {label}
      </span>
    </motion.div>
  );
}

/** Qui a déjà répondu (jamais quoi). */
function AnsweredStrip({ pub, round, players }: { pub: Pub; round: RoundInfo; players: PublicPlayer[] }) {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = voters.filter((p) => pub.answeredIds.includes(p.id)).length;
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div data-testid="cg-answered-count" className="text-3xl text-serious-muted">
        <span className="text-serious-ink">{answered}</span> / {voters.length}
      </div>
      <div className="flex flex-wrap items-start justify-center gap-x-2" data-testid="cg-answered">
        {voters.map((p) => {
          const has = pub.answeredIds.includes(p.id);
          return (
            <div key={p.id} className="flex w-[9.5rem] flex-col items-center gap-0.5">
              <PlayerAvatar profile={p.profile} size="md" dimmed={!has} badge={has ? <CheckIcon /> : undefined} />
              <span className={`w-full truncate text-center text-lg ${has ? "text-serious-ink" : "text-serious-muted"}`}>{p.profile!.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Question({ pub, round, players }: { pub: Pub; round: RoundInfo; players: PublicPlayer[] }) {
  const text = typo(pub.question ?? "");
  const choices = pub.choices;
  return (
    <div data-testid="cg-question" className="flex min-h-0 flex-1 flex-col gap-6">
      <SeriousTimer round={round} size="tv" />
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        data-testid="cg-tv-question"
        className="shrink-0 text-balance text-center leading-tight"
        style={{ fontSize: `${fitText(text, 92, 3.2, 5.6, 2)}rem` }}
      >
        <Unbroken text={text} />
      </motion.h1>

      {choices ? (
        <div className={`grid min-h-0 flex-1 content-center gap-5 ${choices.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {choices.map((label, i) => (
            <Plaque key={i} letter={LETTERS[i]!} label={typo(label)} i={i} count={choices.length} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="border border-serious-line px-16 py-6 text-[7rem] leading-none text-serious-accent">
            ?{pub.unit ? <span className="ml-6 text-5xl text-serious-muted">{pub.unit}</span> : null}
          </motion.div>
          <p className="text-3xl text-serious-muted">Le plus proche gagne. Écris ton chiffre sur ton téléphone.</p>
        </div>
      )}

      <AnsweredStrip pub={pub} round={round} players={players} />
    </div>
  );
}
