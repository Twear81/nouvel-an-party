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
import { Button, Countdown, fireConfetti, ordinal, PausedOverlay, PhoneStage, PlayerAvatar, ReconnectBanner } from "../ui";
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
    <PhoneStage phase={snapshot?.phase}>
      {body}
      <PausedOverlay show={!!snapshot?.paused} />
      <ReconnectBanner show={!connected} />
    </PhoneStage>
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
  const rank = playersWithProfile(snapshot).sort((a, b) => b.score - a.score);

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
          <p className="animate-pulse-soft text-ink-muted">En attente du lancement…</p>
          <Button data-testid="edit-profile" variant="secondary" size="md" onClick={onEdit}>
            Modifier mon profil
          </Button>
        </Center>
      );
    }
    case "intro":
      return (
        <Center testId="phone-intro">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-bold uppercase tracking-widest text-ink-muted">
            Manche {round?.number} / {round?.normalTotal}
          </motion.p>
          <motion.h1 initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 12 }} className="font-display text-5xl text-gold-gradient">
            Prépare-toi !
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
      const pos = rank.findIndex((p) => p.id === me.id);
      return <FinalPhone rank={pos < 0 ? rank.length + 1 : rankOf(rank, pos)} total={rank.length} score={me.score} profile={me.profile} />;
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
      <span className="text-6xl">⏳</span>
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
        <motion.span data-testid="phone-reveal-wait" animate={{ scale: [1, 1.15, 1], rotate: [-6, 6, -6] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-8xl">
          👀
        </motion.span>
        <h1 className="font-display text-3xl text-gold-gradient">Regarde la TV !</h1>
      </Center>
    );
  }

  return (
    <div data-testid="phone-results" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
        <motion.div initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 10 }} data-testid="points-gained" className={`font-display text-7xl ${gained > 0 ? "text-good" : "text-ink-muted"}`}>
          {gained > 0 ? `+${gained}` : "+0"}
        </motion.div>
        <p className="text-ink-muted">
          Total : <b className="text-accent">{me.score}</b> pts
        </p>
        {PhoneResults && (
          <div className="mt-2 w-full">
            <PhoneResults {...props} />
          </div>
        )}
      </div>
      <div className="shrink-0 pb-3">
        {done ? (
          <div data-testid="waiting-others" className="glass rounded-card py-5 text-center text-xl font-bold text-ink-muted animate-pulse-soft">
            En attente des autres ({doneCount}/{waiting.length})
          </div>
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
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex flex-col items-center gap-1">
        <span className="font-display text-7xl text-gold-gradient">{ordinal(rank)}</span>
        <span className="text-xl text-ink-muted">sur {total} joueur{total > 1 ? "s" : ""}</span>
        <span className="mt-2 font-display text-4xl text-accent">{score} pts</span>
        <span className="mt-4 text-xl font-semibold">Bonne année ! 🥂</span>
      </motion.div>
    </Center>
  );
}
