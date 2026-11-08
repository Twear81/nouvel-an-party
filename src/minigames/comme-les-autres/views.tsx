// Écrans de "Comme les autres" : n'utilise que les primitives de src/web/ui et les jetons du thème.
// TV : la consigne + les avatars qui s'allument (réponses cachées), puis les groupes révélés un par un du plus petit au plus grand.
// Téléphone : un champ + un bouton qui change d'état (Envoyer → Envoyé → Renvoyer si on modifie).
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnsweredCount, AnsweredRoster, Button, CheckIcon, fireConfetti, fit, PlayerAvatar, SelectedBadge, typo } from "../../web/ui";
import type { MiniGameViewProps, MiniGameViews } from "../views-contract";
import type { AnswerGroup, Priv, Pub, Results } from "./game";

const MAX_LENGTH = 40;

// ───────────── TV pendant la manche ─────────────

const Tv = ({ pub, round, players }: MiniGameViewProps<Pub>) => {
  const writers = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = writers.filter((p) => pub.answeredIds.includes(p.id)).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-9 text-center">
      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90rem] text-balance text-[5.75rem] font-extrabold leading-[1.05]">
        {typo(pub.question)}
      </motion.h1>
      {pub.perPlayer > 1 && (
        <motion.div data-testid="tv-per-player" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-chip px-10 py-2 font-display text-4xl text-accent">
          {pub.perPlayer} réponses possibles
        </motion.div>
      )}
      <AnsweredCount done={answered} total={writers.length} />
      <AnsweredRoster
        players={writers}
        isDone={(id) => pub.answeredIds.includes(id)}
        badge={(_, done) => (done ? <CheckIcon /> : <span className="animate-pulse-soft">…</span>)}
        avatarClassName={(_, done) => (done ? "drop-shadow-[0_0_1.4rem_var(--color-good)]" : "")}
        /* Onde qui part de l'avatar au moment où le joueur répond */
        overlay={(_, done) => done && <motion.span aria-hidden initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 0.9 }} className="absolute inset-0 rounded-full border-[0.4rem] border-good" />}
      />
    </div>
  );
};

// ───────────── Téléphone pendant la manche ─────────────

/** Liste des réponses non vides, sans doublon (casse et espaces ignorés) : sert à savoir si le joueur a modifié ses champs. */
const signature = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim().replace(/\s+/g, " ");
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out;
};

const Phone = ({ pub, priv, round, players, sendInput }:MiniGameViewProps<Pub, Priv>) => {
  const n = pub.perPlayer;
  const fields = Array.from({ length: n }, (_, i) => i);
  const [values, setValues] = useState<string[]>(() => fields.map((i) => priv?.answers[i] ?? ""));
  // Dernière version envoyée (retrouvée au rechargement de la page grâce à la vue privée).
  const [sent, setSent] = useState<string[] | null>(() => (priv && priv.answers.length ? signature(priv.answers) : null));
  const [sending, setSending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Au rechargement, la vue privée peut arriver après le premier rendu.
  const restored = useRef(sent !== null);
  useEffect(() => {
    if (restored.current || !priv?.answers.length) return;
    restored.current = true;
    setValues((v) => (v.some((x) => x) ? v : fields.map((i) => priv.answers[i] ?? "")));
    setSent(signature(priv.answers));
  }, [priv?.answers.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = signature(values);
  const dirty = JSON.stringify(current) !== JSON.stringify(sent ?? []);
  const state: "empty" | "ready" | "sent" = sent && !dirty ? "sent" : current.length === 0 && !sent ? "empty" : "ready";

  const submit = async () => {
    if (!dirty || sending) return;
    (document.activeElement as HTMLElement | null)?.blur(); // referme le clavier : on voit le bouton passer à "Envoyé"
    setSending(true);
    try {
      await sendInput({ answers: current });
      setSent(current);
    } catch {
      /* l'erreur s'affiche déjà dans PhoneApp ; le bouton reste disponible pour réessayer */
    } finally {
      setSending(false);
    }
  };

  const writers = players.filter((p) => round.participants.includes(p.id) && p.profile);
  const answered = writers.filter((p) => pub.answeredIds.includes(p.id)).length;
  return (
    <form
      data-testid="comme-phone"
      data-state={state}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <h1 className="shrink-0 text-balance text-center text-[1.65rem] font-extrabold leading-tight">{typo(pub.question)}</h1>

      <div className="flex shrink-0 flex-col gap-3">
        {fields.map((i) => {
          const done = state === "sent" && !!values[i]?.trim();
          return (
            <div key={i} className="relative">
              {n > 1 && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl text-accent">{i + 1}</span>}
              <input
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-testid={`answer-input-${i}`}
                value={values[i]}
                onChange={(e) => setValues((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (i < n - 1) refs.current[i + 1]?.focus();
                  else void submit();
                }}
                maxLength={MAX_LENGTH}
                placeholder="Ta réponse…"
                enterKeyHint={i < n - 1 ? "next" : "send"}
                autoComplete="off"
                autoCapitalize="sentences"
                spellCheck={false}
                aria-label={n > 1 ? `Réponse ${i + 1}` : "Ta réponse"}
                className={`w-full rounded-btn border-[0.2rem] bg-surface-strong pr-12 ${n > 1 ? "py-3" : "py-4"} text-xl font-bold text-ink outline-none transition-colors placeholder:font-normal placeholder:text-ink-muted focus:border-accent ${n > 1 ? "pl-11" : "pl-4"} ${done ? "border-good" : "border-line"}`}
              />
              {done && (
                <SelectedBadge tone="good" size="md" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          );
        })}
      </div>

      {state === "sent" ? (
        <motion.div
          key="sent"
          data-testid="answer-sent"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="flex shrink-0 items-center justify-center gap-3 rounded-btn border-[0.2rem] border-good bg-good/15 px-6 py-4 font-display text-2xl text-good"
        >
          <CheckIcon /> Envoyé
        </motion.div>
      ) : (
        <Button data-testid="answer-send" type="submit" size="lg" block disabled={state === "empty" || sending} className="shrink-0">
          {sent ? "Renvoyer" : "Envoyer"}
        </Button>
      )}

      {/* Qui a déjà répondu : les avatars s'allument comme sur la TV */}
      <div data-testid="phone-answered" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden pb-2">
        <span data-testid="phone-answered-count" className="font-num text-2xl text-ink-muted">
          <span className="text-accent">{answered}</span> / {writers.length}
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {writers.map((p) => {
            const has = pub.answeredIds.includes(p.id);
            return (
              <motion.div key={p.id} animate={{ scale: has ? 1 : 0.85, y: has ? -3 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                <PlayerAvatar profile={p.profile} size="sm" dimmed={!has} badge={has ? <CheckIcon /> : undefined} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </form>
  );
};

// ───────────── Résultats TV ─────────────

const REVEAL_FIRST_MS = 900; // avant la 1re révélation
const REVEAL_STEP_MS = 1900; // entre deux groupes
const REVEAL_SETTLE_MS = 1000; // ressort de la dernière carte + confettis

/** Durée totale (s) : réponses isolées, puis un groupe de plus à chaque étape (au moins 2 joueurs). */
export const revealSeconds = (groups: Results["groups"]) => {
  const steps = 1 + groups.filter((g) => g.playerIds.length >= 2).length;
  return (REVEAL_FIRST_MS + (steps - 1) * REVEAL_STEP_MS + REVEAL_SETTLE_MS) / 1000;
};

function GroupCard({ group, revealed, cols, rows, playerById }: { group: AnswerGroup; revealed: boolean; cols: number; rows: number; playerById: MiniGameViewProps["playerById"] }) {
  const colRem = cols <= 1 ? 54 : cols === 2 ? 42 : cols === 3 ? 30 : 22;
  const size = group.playerIds.length;
  // Taille des avatars selon la place disponible (nombre de lignes et de colonnes de la grille, taille du groupe).
  const avatar: "sm" | "md" | "lg" = rows >= 3 || size > 5 || (cols >= 4 && size > 2) ? "sm" : rows === 1 && cols <= 3 && size <= 3 ? "lg" : "md";
  const tile = { sm: "w-[6.2rem]", md: "w-[8rem]", lg: "w-[10rem]" }[avatar];
  const maxFont = rows === 1 ? (cols <= 1 ? 6 : 4.5) : rows === 2 ? 3.4 : 2.4;
  return (
    <motion.div
      data-testid="group"
      data-size={size}
      data-label={group.label}
      data-biggest={group.biggest ? "true" : "false"}
      data-revealed={revealed ? "true" : "false"}
      initial={false}
      animate={revealed ? { opacity: 1, scale: group.biggest ? 1.03 : 1, y: 0, rotate: 0 } : { opacity: 0, scale: 0.4, y: 60, rotate: -4 }}
      transition={{ type: "spring", stiffness: 180, damping: 14 }}
      className={`relative flex min-h-0 flex-col items-center justify-center rounded-card border-[0.3rem] px-4 ${rows >= 3 ? "gap-1 py-2" : "gap-3 py-4"} ${
        group.biggest ? "border-accent bg-accent/15 shadow-glow" : "glass border-line"
      }`}
    >
      {group.biggest && (
        <motion.span
          initial={false}
          animate={revealed ? { scale: 1, rotate: 14 } : { scale: 0 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 10 }}
          className={`absolute -right-3 -top-5 leading-none ${rows >= 3 ? "text-[2.75rem]" : "text-[4rem]"}`}
          aria-hidden
        >
          👑
        </motion.span>
      )}
      <div className="flex w-full items-center justify-center gap-3">
        <span className="min-w-0 text-balance break-words font-display leading-tight" style={{ fontSize: `${fit(group.label, colRem - 14, 1.6, maxFont)}rem` }}>
          {group.label}
        </span>
        <span className={`shrink-0 rounded-chip bg-surface-strong px-3 py-0.5 font-display text-accent ${rows >= 3 ? "text-2xl" : "text-3xl"}`}>×{size}</span>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-1">
        {group.playerIds.map((id, i) => (
          <motion.div key={id} initial={false} animate={revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }} transition={{ delay: revealed ? 0.25 + i * 0.1 : 0, type: "spring", stiffness: 260, damping: 12 }} className={`flex flex-col items-center ${tile}`}>
            <PlayerAvatar profile={playerById(id)?.profile ?? null} size={avatar} />
            <span className={`w-full truncate text-center font-bold ${avatar === "sm" ? "text-base" : "text-xl"}`}>{playerById(id)?.profile?.name}</span>
          </motion.div>
        ))}
      </div>
      <motion.span initial={false} animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ delay: revealed ? 0.5 : 0 }} className={`font-display text-good ${rows >= 3 ? "text-2xl" : "text-4xl"}`}>
        +{group.points}
      </motion.span>
    </motion.div>
  );
}

const TvResults = ({ results, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  const multi = useMemo(() => (results?.groups ?? []).filter((g) => g.playerIds.length >= 2), [results]);
  const lonely = useMemo(() => (results?.groups ?? []).filter((g) => g.playerIds.length < 2), [results]);
  // Étape 0 : rien. Étape 1 : les réponses isolées. Puis un groupe de plus à chaque étape, du plus petit au plus grand.
  const [step, setStep] = useState(0);
  const lastStep = 1 + multi.length;
  const biggestFiredRef = useRef(false);

  useEffect(() => {
    if (!results) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let s = 1; s <= lastStep; s++) timers.push(setTimeout(() => setStep(s), REVEAL_FIRST_MS + (s - 1) * REVEAL_STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [results, lastStep]);

  const revealedMulti = Math.max(0, step - 1);
  useEffect(() => {
    // Le dernier groupe révélé est le plus grand : confettis.
    if (multi.length && revealedMulti === multi.length && !biggestFiredRef.current) {
      biggestFiredRef.current = true;
      fireConfetti("small");
    }
  }, [revealedMulti, multi.length]);

  if (!results) return null;
  const n = multi.length;
  const cols = n <= 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 4 : n <= 6 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(n / cols));
  const done = step >= lastStep;
  const nobody = results.groups.length === 0;

  return (
    <div data-testid="comme-results" data-groups={results.groups.length} data-done={done ? "true" : "false"} className="flex min-h-0 flex-1 flex-col gap-4">
      <h1 className="line-clamp-2 shrink-0 text-balance text-center text-5xl font-extrabold leading-tight">{typo(results.question)}</h1>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        {n > 0 ? (
          <div
            className={`grid h-full w-full justify-center pt-3 ${rows >= 3 ? "gap-4" : "gap-5"}`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, ${cols === 1 ? "56rem" : "1fr"}))`, gridTemplateRows: `repeat(${rows}, minmax(0, ${rows === 1 ? "auto" : "1fr"}))`, alignContent: "center" }}
          >
            {/* Disposition : le plus grand en premier ; révélation : du plus petit au plus grand */}
            {multi.map((g, i) => (
              <GroupCard key={g.label + i} group={g} revealed={n - 1 - i < revealedMulti} cols={cols} rows={rows} playerById={playerById} />
            ))}
          </div>
        ) : (
          <motion.p initial={false} animate={step >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} className="text-balance text-center text-6xl font-extrabold text-ink-muted">
            {nobody ? "Personne n'a répondu…" : "Aucune réponse en commun… 😬"}
          </motion.p>
        )}
      </div>

      {lonely.length > 0 && (
        <div data-testid="comme-lonely" className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-3 pb-1">
          {lonely.map((g, i) => (
            <motion.div
              key={g.label + i}
              data-testid="lonely"
              initial={false}
              animate={step >= 1 ? { opacity: 0.55, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.8 }}
              transition={{ delay: step >= 1 ? i * 0.12 : 0, type: "spring", stiffness: 200, damping: 16 }}
              className="flex max-w-[34rem] items-center gap-3 rounded-chip bg-surface py-1.5 pl-1.5 pr-6"
            >
              <PlayerAvatar profile={playerById(g.playerIds[0]!)?.profile ?? null} size={lonely.length > 8 ? "xs" : "sm"} dimmed />
              <span className={`truncate font-bold text-ink-muted ${lonely.length > 8 ? "text-xl" : "text-2xl"}`}>{g.label}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ───────────── Résultats téléphone ─────────────

const PhoneResults = ({ results, snapshot, playerById }: MiniGameViewProps<Pub, Priv, Results>) => {
  const myId = snapshot.me?.id;
  if (!results || !myId) return null;
  const mine = results.groups.filter((g) => g.playerIds.includes(myId));
  if (mine.length === 0) return <p className="text-center text-xl text-ink-muted">Tu n'as pas répondu</p>;
  return (
    <div data-testid="phone-comme-result" className="flex flex-col gap-2">
      {mine.map((g) => {
        const others = g.playerIds.filter((id) => id !== myId);
        return (
          <div key={g.label} data-testid="phone-group" data-size={g.playerIds.length} className={`flex items-center gap-3 rounded-card border-2 px-4 py-2.5 ${others.length ? (g.biggest ? "border-accent bg-accent/15" : "glass border-line") : "border-line bg-surface opacity-60"}`}>
            <span className="min-w-0 flex-1 truncate text-left font-display text-xl">{g.biggest && "👑 "}{g.label}</span>
            <div className="flex shrink-0 -space-x-2">
              {others.slice(0, 4).map((id) => (
                <PlayerAvatar key={id} profile={playerById(id)?.profile ?? null} size="xs" />
              ))}
            </div>
            {others.length > 4 && <span className="shrink-0 text-sm font-bold text-ink-muted">+{others.length - 4}</span>}
          </div>
        );
      })}
    </div>
  );
};

export default { Tv, Phone, TvResults, PhoneResults, revealSeconds: ({ results }) => (results ? revealSeconds(results.groups) : 0) } satisfies MiniGameViews;
