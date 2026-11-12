// Application téléphone : profil → lobby → manches → classement final.
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { rankOf } from "../../shared/ranking";
import type { GameSnapshot, RoundInfo } from "../../shared/types";
import { webGames } from "../../minigames/registry.web";
import type { MiniGameViewProps } from "../../minigames/views-contract";
import { gameViewProps, playersWithProfile, waitingPlayers } from "../net/helpers";
import { useGame, type GameActions } from "../net/useGame";
import { useRevealed } from "../net/useReveal";
import { useFinalReveal } from "../net/useFinalReveal";
import { SkinProvider } from "../theme/skin";
import { Button, Countdown, fireConfetti, ordinal, PausedOverlay, Panel, PhoneStage, PlayerAvatar, Pop, ReconnectBanner, WaitingDots, WatchingEyes } from "../ui";
import { ProfileEditor } from "./ProfileEditor";
import { useWakeLock } from "./useWakeLock";

const Center = ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
  <div data-testid={testId} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
    {children}
  </div>
);

export function PhoneApp() {
  useWakeLock();
  const { snapshot, connected, actions } = useGame("phone");
  const [editing, setEditing] = useState(false);
  const me = snapshot?.me ? snapshot.players.find((p) => p.id === snapshot.me!.id) : undefined;

  let body: React.ReactNode;
  if (!snapshot || !snapshot.me || !me) {
    body = (
      <Center>
        <div className="font-display text-3xl text-accent animate-pulse-soft">Connexion…</div>
      </Center>
    );
  } else if (!me.profile || (editing && snapshot.phase === "lobby")) {
    body = <ProfileEditor key={me.profile ? "edit" : "new"} initial={me.profile} actions={actions} onDone={() => setEditing(false)} onCancel={me.profile ? () => setEditing(false) : undefined} />;
  } else {
    body = <PhoneScreen snapshot={snapshot} me={me} actions={actions} onEdit={() => setEditing(true)} />;
  }

  return (
    <SkinProvider skin={snapshot?.skin}>
      <PhoneStage phase={snapshot?.phase}>
        {body}
        <PausedOverlay show={!!snapshot?.paused} />
        <ReconnectBanner show={!connected} />
      </PhoneStage>
    </SkinProvider>
  );
}

type Me = GameSnapshot["players"][number];
interface ScreenProps {
  snapshot: GameSnapshot;
  me: Me;
  actions: GameActions;
  onEdit: () => void;
}

function PhoneScreen({ snapshot, me, actions, onEdit }: ScreenProps) {
  const round = snapshot.round;
  const finalReveal = useFinalReveal(snapshot.finalReveal);

  switch (snapshot.phase) {
    case "lobby": {
      const others = playersWithProfile(snapshot).filter((p) => p.id !== me.id);
      return (
        <Center testId="phone-lobby-ready">
          <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150, damping: 10 }}>
            <PlayerAvatar profile={me.profile} size="xl" />
          </motion.div>
          <h1 className="font-display text-4xl text-gold-gradient">Tu es prêt !</h1>
          <p className="max-w-full truncate text-xl font-bold">{me.profile!.name}</p>
          {others.length > 0 && (
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
              {others.map((p) => (
                <PlayerAvatar key={p.id} profile={p.profile} size="sm" dimmed={!p.connected} />
              ))}
            </div>
          )}
          <p className="flex items-center gap-3 text-ink-muted">En attente du lancement <WaitingDots /></p>
          <Button data-testid="edit-profile" variant="secondary" onClick={onEdit}>
            Modifier mon profil
          </Button>
        </Center>
      );
    }
    case "transition":
      return (
        <Center testId="phone-transition-wait">
          <WatchingEyes />
          <h1 className="font-display text-3xl text-gold-gradient">Regarde la TV !</h1>
        </Center>
      );
    case "intro":
      return (
        <Center testId="phone-intro">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-bold uppercase tracking-widest text-ink-muted">
            Manche {round?.number} / {round?.normalTotal}
          </motion.p>
          <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 12 }} className="font-display text-5xl text-gold-gradient">
            Prépare-toi&nbsp;!
          </motion.h1>
          <p className="font-display text-2xl text-ink">{round?.gameName}</p>
        </Center>
      );
    case "playing":
      if (!round) return null;
      return <PlayingPhone snapshot={snapshot} round={round} actions={actions} late={!snapshot.me?.inRound} />;
    case "results":
      if (!round) return null;
      return <ResultsPhone snapshot={snapshot} round={round} me={me} actions={actions} />;
    case "final": {
      if (!finalReveal.done) {
        return (
          <Center testId="phone-final-wait">
            <WatchingEyes />
            <h1 className="font-display text-3xl text-gold-gradient">Regarde la TV !</h1>
          </Center>
        );
      }
      const rank = playersWithProfile(snapshot).filter((p) => snapshot.finalReveal?.playerIds.includes(p.id))
        .sort((a, b) => b.score - a.score);
      const pos = rank.findIndex((p) => p.id === me.id);
      if (pos < 0) {
        return (
          <Center testId="phone-final-spectator">
            <PlayerAvatar profile={me.profile} size="xl" />
            <h1 className="font-display text-3xl text-gold-gradient">Bonne année ! 🥂</h1>
          </Center>
        );
      }
      return <FinalPhone rank={rankOf(rank, pos)} total={rank.length} score={me.score} profile={me.profile} />;
    }
  }
}

function viewProps(snapshot: GameSnapshot, round: RoundInfo, actions: GameActions, onError: (m: string) => void): MiniGameViewProps {
  return gameViewProps(snapshot, round, snapshot.me?.private ?? null, (payload) =>
    actions.input(payload).catch((e: Error) => {
      onError(e.message);
      throw e;
    }),
  );
}

const LATE_TEXT = "Tu joues à la prochaine manche";

function Late({ testId }: { testId?: string }) {
  return (
    <Center testId={testId}>
      <motion.span aria-hidden animate={{ rotate: [0, 0, 180, 180, 360] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.3, 0.45, 0.8, 1], ease: "easeInOut" }} className="inline-block text-6xl">⏳</motion.span>
      <h1 className="font-display text-3xl text-gold-gradient">{LATE_TEXT}</h1>
      <p className="text-ink-muted">Tu es arrivé en cours de manche. Regarde la TV !</p>
    </Center>
  );
}

function PlayingPhone({ snapshot, round, actions, late }: Pick<ScreenProps, "snapshot" | "actions"> & { round: RoundInfo; late: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const View = webGames[round.gameId]?.Phone;
  if (late) return <Late testId="phone-playing" />;
  return (
    <div data-testid="phone-playing" data-game={round.gameId} data-interlude={round.interlude ? "true" : "false"} className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Interlude : le jeu affiche lui-même son chrono (ou pas), sinon on dévoilerait la surprise. */}
      {!round.interlude && (
        <div className="shrink-0 pt-1">
          <Countdown round={round} size="phone" />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        {View ? (
          <View
            {...viewProps(snapshot, round, actions, setError)}
          />
        ) : (
          <Center>{round.gameName}</Center>
        )}
      </div>
      {error && <p className="shrink-0 text-center text-sm font-semibold text-bad">{error}</p>}
    </div>
  );
}

function ResultsPhone({ snapshot, round, me, actions }: Pick<ScreenProps, "snapshot" | "actions" | "me"> & { round: RoundInfo }) {
  const PhoneResults = webGames[round.gameId]?.PhoneResults;
  const props = viewProps(snapshot, round, actions, () => {});
  // Tant que la TV joue sa révélation, le téléphone ne dévoile rien (ni points, ni rang) : « regarde la TV ».
  const revealed = useRevealed(props);
  const gained = round.deltas?.[me.id] ?? 0;
  const done = snapshot.continued.includes(me.id);
  const waiting = waitingPlayers(snapshot);
  const doneCount = waiting.filter((p) => snapshot.continued.includes(p.id)).length;
  const [sending, setSending] = useState(false);

  if (!revealed) {
    return (
      <Center testId="phone-results">
        <WatchingEyes testId="phone-reveal-wait" />
        <h1 className="font-display text-3xl text-gold-gradient">Regarde la TV !</h1>
      </Center>
    );
  }

  return (
    <div data-testid="phone-results" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 10 }} data-testid="points-gained" data-ui="score-row" data-highlight={gained > 0 ? "true" : "false"} className={`font-num text-7xl ${gained > 0 ? "text-good" : "text-ink-muted"}`}>
          {gained > 0 ? `+${gained}` : "+0"}
        </motion.div>
        <p className="text-ink-muted">
          Total : <b className="font-num text-accent">{me.score}</b> pts
        </p>
        {PhoneResults && (
          <div className="mt-2 w-full">
            <PhoneResults {...props} />
          </div>
        )}
      </div>
      <div className="shrink-0 pb-3">
        {done ? (
          <Panel data-testid="waiting-others" className="flex items-center justify-center gap-3 py-5 text-center text-xl font-bold text-ink-muted">
            En attente des autres (<Pop value={doneCount}>{doneCount}</Pop>/{waiting.length}) <WaitingDots />
          </Panel>
        ) : (
          <Button
            data-testid="continue-button"
            size="xl"
            block
            disabled={sending}
            onClick={() => {
              setSending(true);
              actions.continue().finally(() => setSending(false));
            }}
          >
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
}

function FinalPhone({ rank, total, score, profile }: { rank: number; total: number; score: number; profile: Me["profile"] }) {
  useEffect(() => {
    if (rank === 1) fireConfetti("big");
    else fireConfetti("small");
  }, [rank]);
  return (
    <Center testId="phone-final">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg font-bold uppercase tracking-widest text-ink-muted">
        Classement final
      </motion.p>
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.3 }} className={`relative ${rank === 1 ? "mt-8" : ""}`}>
        {rank === 1 && <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-6xl">👑</span>}
        <PlayerAvatar profile={profile} size="xl" />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} data-ui="score-row" data-rank={rank} data-highlight={rank === 1 ? "true" : "false"} className="flex flex-col items-center gap-1">
        <span className="font-num text-7xl text-gold-gradient">{ordinal(rank)}</span>
        <span className="text-xl text-ink-muted">sur {total} joueur{total > 1 ? "s" : ""}</span>
        <span className="mt-2 font-num text-4xl text-accent">{score} pts</span>
        <span className="mt-4 text-xl font-semibold">Bonne année ! 🥂</span>
      </motion.div>
    </Center>
  );
}
