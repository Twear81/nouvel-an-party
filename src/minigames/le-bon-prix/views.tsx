// Écrans du "Bon prix" : vitrine sur la TV, pavé numérique sur le téléphone, révélation sur un axe de prix.
// N'utilise que les primitives de src/web/ui et les jetons du thème.
import { motion } from "motion/react";
import { useState } from "react";
import { CheckIcon, PlayerAvatar } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import { centsToDraft, draftToCents, formatCents, formatDraft, pressKey } from "./amount";
import type { Priv, Pub, Results } from "./game";
import { ItemVisual, Showcase } from "./Showcase";
import { gapLabel, TvResults } from "./TvReveal";

/** Taille de police (rem) pour qu'un texte de `availRem` de large tienne sur une ligne (Bungee ≈ 0.8em par lettre). */
const fit = (label: string, availRem: number, min: number, max: number) => Math.max(min, Math.min(max, availRem / (Math.max(label.length, 1) * 0.8)));

const ordinal = (rank: number) => (rank === 1 ? "1er" : `${rank}e`);

// ───────────────────────────── TV : pendant le jeu ─────────────────────────────

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const voters = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = voters.filter((p) => pub.answeredIds.includes(p.id)).length;
  const crowd = voters.length > 5;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-1 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="bp-name"
        className="max-w-[100rem] text-balance font-display leading-tight text-gold-gradient"
        style={{ fontSize: `${fit(pub.nom, 96, 3.5, 6)}rem` }}
      >
        {pub.nom}
      </motion.h1>
      {pub.details && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-balance text-4xl font-semibold text-ink-muted">
          {pub.details}
        </motion.p>
      )}

      <Showcase image={pub.image} emoji={pub.emoji} />

      <div className="flex flex-col items-center gap-1 pt-2">
        <div data-testid="tv-answered-count" className="font-display text-3xl text-ink-muted">
          <span className="text-accent">{answered}</span> / {voters.length}
        </div>
        <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-1" data-testid="tv-answered">
          {voters.map((p) => {
            const has = pub.answeredIds.includes(p.id);
            return (
              <div key={p.id} className="flex w-[11rem] flex-col items-center gap-0.5">
                <PlayerAvatar profile={p.profile} size={crowd ? "md" : "lg"} dimmed={!has} badge={has ? <CheckIcon /> : undefined} />
                <span className={`w-full truncate font-bold ${crowd ? "text-lg" : "text-xl"} ${has ? "text-ink" : "text-ink-muted"}`}>{p.profile!.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────── Téléphone : pavé numérique ─────────────────────────────

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

const Phone = ({ pub, priv, sendInput }: MiniGameViewProps<Pub, Priv>) => {
  const sent = priv?.cents ?? null;
  const [draft, setDraft] = useState(() => (sent === null ? "" : centsToDraft(sent)));
  const cents = draftToCents(draft);
  const validated = sent !== null && cents === sent;
  const shown = draft === "" ? "0" : formatDraft(draft);

  const press = (key: string) => {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* pas de vibration : tant pis */
    }
    setDraft((d) => pressKey(d, key));
  };
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
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14 }} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-good text-bg">
            <CheckIcon />
          </motion.span>
        )}
      </div>

      {/* Pavé numérique */}
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
        {KEYS.map((k) => {
          const useless = pressKey(draft, k) === draft;
          return (
            <motion.button
              key={k}
              type="button"
              data-testid={k === "back" ? "key-back" : k === "," ? "key-comma" : `key-${k}`}
              aria-label={k === "back" ? "Effacer" : undefined}
              whileTap={{ scale: 0.9 }}
              disabled={useless}
              onClick={() => press(k)}
              className="glass flex items-center justify-center rounded-btn font-display text-3xl transition-opacity disabled:opacity-30"
            >
              {k === "back" ? "⌫" : k}
            </motion.button>
          );
        })}
      </div>

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

export default { Tv, Phone, TvResults, PhoneResults } satisfies MiniGameViews;
