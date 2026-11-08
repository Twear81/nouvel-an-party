// Téléphone de Culture gênante : écran neutre pendant l'accroche et la bascule (surprise : rien ne bouge, la TV fait le show),
// puis, à l'étape « question », les choix (QCM) ou le pavé numérique (estimation).
// Temps de réaction (QCM) : mesuré ICI, avec performance.now(), à partir de l'affichage des choix (invariant 7).
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "../../web/ui";
import type { MiniGameViewProps } from "../views-contract";
import type { Priv, Pub } from "./game";
import { draftToValue, formatNumber, pressKey } from "./number";
import { fitText, LETTERS, Unbroken, PhoneSerious, SeriousTimer } from "./Serious";

/** Écran d'attente, identique pendant l'accroche et la bascule (aucun indice sur ce qui arrive). */
function Waiting({ stage }: { stage: string }) {
  return (
    <div data-testid="cg-phone" data-stage={stage} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
      <motion.span animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="text-8xl">
        👀
      </motion.span>
      <h1 className="font-display text-3xl text-gold-gradient">Regarde la TV…</h1>
    </div>
  );
}

/** Réponse enregistrée : on attend les autres. */
function Locked({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="cg-locked" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-serious-good text-3xl text-serious-bg">
        <CheckIcon />
      </span>
      <p className="text-2xl">Réponse enregistrée</p>
      <p className="text-balance text-xl text-serious-muted">{children}</p>
      <p className="animate-pulse-soft text-lg text-serious-muted">On attend les autres…</p>
    </div>
  );
}

function QcmPhone({ pub, priv, round, sendInput }: MiniGameViewProps<Pub, Priv>) {
  // L'instant où les choix apparaissent à l'écran (après le rendu), pour mesurer le temps de réaction.
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      shownAt.current = performance.now();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const choices = pub.choices ?? [];
  const mine = priv?.choice ?? null;
  const answer = (i: number) => {
    if (priv?.answered) return;
    const ms = shownAt.current === null ? 0 : performance.now() - shownAt.current;
    void sendInput({ choice: i, ms }).catch(() => {});
  };

  return (
    <PhoneSerious testId="cg-phone" stage="question">
      <div className="flex min-h-0 flex-1 flex-col gap-3 pb-2 pt-1">
        <SeriousTimer round={round} size="phone" />
        <h1 data-testid="cg-phone-question" className="shrink-0 text-balance text-center leading-tight" style={{ fontSize: `${fitText(pub.question ?? "", 24, 1.35, 1.9, 4)}rem` }}>
          <Unbroken text={pub.question ?? ""} />
        </h1>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {choices.map((label, i) => {
            const selected = mine === i;
            return (
              <motion.button
                key={i}
                type="button"
                data-testid={`cg-choice-${i}`}
                whileTap={{ scale: 0.97 }}
                animate={{ opacity: priv?.answered && !selected ? 0.35 : 1 }}
                disabled={!!priv?.answered}
                onClick={() => answer(i)}
                aria-pressed={selected}
                className={`relative flex min-h-[4rem] flex-1 items-center gap-4 border px-4 text-left ${selected ? "border-serious-good bg-serious-good/15" : "border-serious-line bg-serious-bg-2/70"}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-serious-accent text-xl text-serious-accent">{LETTERS[i]}</span>
                <span className="min-w-0 text-balance break-words leading-tight" style={{ fontSize: `${fitText(label, 15, 1.15, 1.7, 2)}rem` }}>
                  {label}
                </span>
                {selected && (
                  <span className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-serious-good text-serious-bg">
                    <CheckIcon />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        {priv?.answered && <p className="shrink-0 animate-pulse-soft text-center text-lg text-serious-muted">Réponse enregistrée. On attend les autres…</p>}
      </div>
    </PhoneSerious>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

function EstimationPhone({ pub, priv, sendInput }: MiniGameViewProps<Pub, Priv>) {
  const [draft, setDraft] = useState("");
  const value = draftToValue(draft);
  const done = !!priv?.answered;
  const shown = value === null ? "" : formatNumber(value);

  const press = (key: string) => {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* pas de vibration : tant pis */
    }
    setDraft((d) => pressKey(d, key));
  };

  return (
    <PhoneSerious testId="cg-phone" stage="question">
      <div className="flex min-h-0 flex-1 flex-col gap-2 pb-2 pt-1">
        <h1 data-testid="cg-phone-question" className="shrink-0 text-balance text-center leading-tight" style={{ fontSize: `${fitText(pub.question ?? "", 24, 1.2, 1.7, 4)}rem` }}>
          <Unbroken text={pub.question ?? ""} />
        </h1>
        {done ? (
          <Locked>
            Ton chiffre : <b className="text-serious-ink">{formatNumber(priv!.value!)}</b>
            {pub.unit ? ` ${pub.unit}` : ""}
          </Locked>
        ) : (
          <>
            <div data-testid="cg-amount" className="flex h-[4.25rem] shrink-0 items-center justify-center gap-3 border border-serious-line bg-serious-bg-2/70 px-4">
              <span className={`leading-none ${shown === "" ? "text-serious-muted" : ""}`} style={{ fontSize: `${fitText(shown || "0", 16, 1.6, 3.2)}rem` }}>
                {shown || "?"}
              </span>
              {pub.unit && <span className="text-xl text-serious-muted">{pub.unit}</span>}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
              {KEYS.map((k, i) =>
                k === "" ? (
                  <div key={i} />
                ) : (
                  <motion.button
                    key={k}
                    type="button"
                    data-testid={k === "back" ? "cg-key-back" : `cg-key-${k}`}
                    aria-label={k === "back" ? "Effacer" : undefined}
                    whileTap={{ scale: 0.92 }}
                    disabled={pressKey(draft, k) === draft}
                    onClick={() => press(k)}
                    className="flex items-center justify-center border border-serious-line bg-serious-bg-2/70 text-3xl transition-opacity disabled:opacity-30"
                  >
                    {k === "back" ? "⌫" : k}
                  </motion.button>
                ),
              )}
            </div>
            <motion.button
              type="button"
              data-testid="cg-submit"
              whileTap={{ scale: 0.97 }}
              disabled={value === null}
              onClick={() => value !== null && void sendInput({ value }).catch(() => {})}
              className="flex h-14 shrink-0 items-center justify-center border border-serious-accent bg-serious-ink text-2xl text-serious-bg transition-opacity disabled:opacity-30"
            >
              Valider
            </motion.button>
          </>
        )}
      </div>
    </PhoneSerious>
  );
}

export function Phone(props: MiniGameViewProps<Pub, Priv>) {
  const { pub } = props;
  if (pub.stage !== "question") return <Waiting stage={pub.stage} />;
  if (pub.kind === "estimation") return <EstimationPhone {...props} />;
  return <QcmPhone {...props} />;
}
