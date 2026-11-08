// Écrans du "Bon prix" : vitrine sur la TV, pavé numérique sur le téléphone, révélation sur un axe de prix.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useState } from "react";
import { AnsweredCount, AnsweredRoster, CheckIcon, fit, NumPad, ordinal, SelectedBadge, typo } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { centsToDraft, draftToCents, formatCents, formatDraft, pressKey } from "./amount";
import type { Priv, Pub, Results } from "./game";
import { ItemVisual, Showcase } from "./Showcase";
import { gapLabel, revealSeconds, TvResults } from "./TvReveal";

// ───────────────────────────── TV : pendant le jeu ─────────────────────────────

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = voters.filter((p) => pub.answeredIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-1 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="bp-name"
        className="max-w-[100rem] text-balance font-display leading-tight text-gold-gradient"
        style={{ fontSize: `${fit(pub.nom, 96, 3.5, 6)}rem` }}
      >
        {typo(pub.nom)}
      </motion.h1>
      {pub.details && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-balance text-4xl font-semibold text-ink-muted">
          {typo(pub.details)}
        </motion.p>
      )}

      <Showcase image={pub.image} emoji={pub.emoji} />

      <div className="flex flex-col items-center gap-1 pt-2">
        <AnsweredCount done={answered} total={voters.length} className="font-num text-3xl text-ink-muted" />
        <AnsweredRoster players={voters} size="compact" isDone={(id) => pub.answeredIds.includes(id)} />
      </div>
    </div>
  );
};

// ───────────────────────────── Téléphone : pavé numérique ─────────────────────────────

const Phone = ({ pub, priv, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const sent = priv?.cents ?? null;
  const [draft, setDraft] = useState(() => (sent === null ? "" : centsToDraft(sent)));
  const cents = draftToCents(draft);
  const validated = sent !== null && cents === sent;
  const shown = draft === "" ? "0" : formatDraft(draft);

  const submit = () => {
    if (cents !== null && !validated) void sendInput({ cents }).catch(() => {});
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* L'objet à deviner (rappel de la TV) */}
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center overflow-hidden rounded-card bg-surface-strong">
          <ItemVisual image={pub.image} emoji={pub.emoji} rem={3} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="line-clamp-2 text-balance text-xl font-extrabold">{pub.nom}</div>
          {pub.details && <div className="truncate text-sm text-ink-muted">{pub.details}</div>}
        </div>
      </div>

      {/* Le montant saisi */}
      <div
        data-testid="bp-amount"
        data-validated={validated ? "true" : "false"}
        className={`glass relative flex h-[4.75rem] shrink-0 items-center justify-center gap-2 rounded-card border-2 px-4 ${validated ? "border-good" : "border-transparent"}`}
      >
        <span className={`font-display leading-none ${draft === "" ? "text-ink-muted/50" : ""}`} style={{ fontSize: `${fit(`${shown} €`, 19, 1.7, 3.4)}rem` }}>
          {shown}
        </span>
        {/* Curseur clignotant tant que le prix n'est pas validé */}
        {!validated && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="-ml-1 h-10 w-[0.2rem] rounded bg-accent" />}
        <span className="font-display text-3xl leading-none text-accent">€</span>
        {validated && (
          <SelectedBadge tone="good" size="md" className="absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      <NumPad allowComma isUseless={(k) => pressKey(draft, k) === draft} onKey={(k) => setDraft((d) => pressKey(d, k))} />

      <motion.button
        type="button"
        data-testid="submit-guess"
        whileTap={{ scale: 0.95, y: 3 }}
        animate={{ opacity: cents === null ? 0.4 : 1 }}
        disabled={cents === null || validated}
        onClick={submit}
        className={`mb-2 flex h-[3.75rem] shrink-0 items-center justify-center gap-2 rounded-btn font-display text-2xl ${validated ? "bg-good text-bg shadow-[0_0.35rem_0_var(--color-good-deep)]" : "bg-gold text-accent-ink shadow-btn"}`}
      >
        {validated ? (
          <>
            <CheckIcon /> Validé
          </>
        ) : (
          "Valider"
        )}
      </motion.button>
    </div>
  );
};

// ───────────────────────────── Téléphone : mes résultats ─────────────────────────────

const PhoneResults = ({ results, snapshot }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.ranking.find((g) => g.playerId === myId);
  return (
    <div data-testid="phone-bp-result" data-rank={mine?.rank ?? ""} className="flex flex-col items-center gap-2 text-center">
      <div className="flex items-baseline gap-3 text-ink-muted">
        Prix réel
        <span data-testid="phone-bp-price" className="font-display text-3xl text-accent">{formatCents(results.priceCents)}</span>
      </div>
      {mine ? (
        <>
          <div className="flex items-baseline gap-3 text-ink-muted">
            Ton prix
            <span className="font-display text-2xl text-ink">{formatCents(mine.cents)}</span>
          </div>
          <p className={`font-display text-2xl ${mine.points > 0 ? "text-good" : "text-bad"}`}>{mine.exact ? "Pile le bon prix ! 🎯" : gapLabel(mine.diff)}</p>
          <p className="text-xl font-bold">
            {mine.rank === 1 ? "👑 " : ""}
            {ordinal(mine.rank)} sur {results.ranking.length}
          </p>
        </>
      ) : (
        <p className="text-xl text-ink-muted">Tu n'as pas répondu</p>
      )}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.ranking.length) : 0) } satisfies MiniGameViews;
