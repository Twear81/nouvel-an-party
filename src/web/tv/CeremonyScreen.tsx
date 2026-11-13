// Cérémonie de fin de partie, dans la pièce de nuit : les souvenirs s'installent dans le décor un par un (zoom caméra),
// puis « Attendez… ce n'est pas fini ! », le classement provisoire sans score, et les bonus (enveloppe, roulette de catégories,
// carte, projecteur, gagnant). AUCUN chiffre de score : chaque bonus donne une étoile posée sur le portrait du gagnant.
// La TV ne tire rien : tout vient de la chronologie serveur (`ceremonyTimeline`), les animations ne font que la jouer.
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ceremonyTimeline, revealedAwards, revealedSouvenirs, type Award, type CeremonyInfo, type CeremonyStep, type Keepsake } from "../../shared/ceremony";
import type { GameSnapshot, PublicPlayer } from "../../shared/types";
import { cleanStrokes, GRID } from "../../minigames/dessin-rate/shared";
import { StrokesSvg } from "../../minigames/dessin-rate/drawing";
import { serverNow } from "../net/socket";
import { useCeremony } from "../net/useCeremony";
import { ANCHORS, ceremonieImage, CEREMONIE_ASPECT, seat, seatLabelSide } from "../theme/ceremonie-assets";
import { Envelope, PlayerAvatar, RoomSet, SlotMachine, slotTickTimes, Star, useSfxTimeline, WIDE, type Camera, type SlotItem } from "../ui";
import { journalHeadline } from "./scene/headline";
import { Spotlight } from "./scene/Spotlight";
import { spotlightPath, spotlightTimes } from "./scene/spotlight";
import { BellSouvenir, FrameSouvenir, JournalSouvenir, SOUVENIR_FOCUS } from "./scene/Souvenirs";

export function CeremonyScreen({ snapshot }: { snapshot: GameSnapshot }) {
  if (!snapshot.ceremony) return null;
  return <CeremonyBody info={snapshot.ceremony} players={snapshot.players} />;
}

const SPOON_AWARDS = new Set(["merci-travaux", "cuillere-tiramisu"]);

/** Cadence interne d'une étape : nombre de repères déjà franchis (rechargement compris), à `ms` après le début de l'étape. */
function useCues(stepKey: string, elapsedInStep: number, cuesMs: number[]): number {
  const [passed, setPassed] = useState(() => cuesMs.filter((c) => elapsedInStep >= c).length);
  useEffect(() => {
    setPassed(cuesMs.filter((c) => elapsedInStep >= c).length);
    const timers = cuesMs.filter((c) => c > elapsedInStep).map((c, i, rest) => setTimeout(() => setPassed(cuesMs.length - rest.length + i + 1), c - elapsedInStep));
    return () => timers.forEach(clearTimeout);
    // `elapsedInStep` est lu au montage de l'étape : seul un changement d'étape relance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);
  return passed;
}

const nameOf = (players: PublicPlayer[], id: string) => players.find((p) => p.id === id)?.profile?.name ?? "";

function CeremonyBody({ info, players }: { info: CeremonyInfo; players: PublicPlayer[] }) {
  const { elapsed, step: current } = useCeremony(info);
  const k = info.timeScale;
  const { steps } = useMemo(() => ceremonyTimeline(info.souvenirs, info.awards, info.timeScale), [info.souvenirs, info.awards, info.timeScale]);
  const step = steps.find((s) => s.startMs === current.startMs) ?? current;
  const stepKey = `${step.kind}-${step.index ?? ""}`;
  const inStep = Math.max(0, elapsed - step.startMs);
  const length = step.endMs - step.startMs;
  const stepAbs = info.startedAt + info.pausedMs + step.startMs;
  const ms = (fraction: number) => length * fraction;

  const award = step.index === undefined ? undefined : info.awards[step.index];
  const bonus = ["roulette", "carte", "projecteur", "gagnant"].includes(step.kind);
  const souvenir = step.kind === "souvenir" ? info.souvenirs[step.index!] : undefined;
  const shownSouvenirs = revealedSouvenirs(steps, elapsed);
  const awardsRevealed = revealedAwards(steps, elapsed);

  // Joueurs présents au début de la cérémonie, dans l'ordre d'arrivée puis (après « Attendez… ») dans l'ordre du classement.
  const present = info.playerIds.map((id) => players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p?.profile);
  const provisionalAt = steps.find((s) => s.kind === "provisoire")!.startMs;
  const ranked = elapsed >= provisionalAt;
  const seated = useMemo(() => ranked
    ? [...present].sort((a, b) => (info.scoresBefore[b.id] ?? 0) - (info.scoresBefore[a.id] ?? 0) || a.profile!.name.localeCompare(b.profile!.name))
    : present,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [ranked, players, info.playerIds]);
  const seats = seated.map((_, i) => seat(i, seated.length));
  const indexOfPlayer = (id: string) => seated.findIndex((p) => p.id === id);

  // Repères de l'étape en cours (ms depuis son début).
  const souvenirKind = souvenir?.kind;
  const cues = useCues(stepKey, inStep,
    souvenirKind === "post-it" ? [ms(0.5), ms(0.7), ms(0.88)]
      : souvenirKind ? [ms(0.17), ms(0.36), ms(0.82)]
        : step.kind === "roulette" ? [ms(0.33)]
          : step.kind === "gagnant" ? [ms(0.12), ms(0.62)] : []);

  // Caméra : zoom vers le souvenir pendant qu'il s'installe et se lit, pièce entière le reste du temps.
  let camera: Camera = WIDE;
  if (souvenir) {
    const zoomed = souvenir.kind === "post-it" ? cues >= 1 && cues < 3 : cues < 3;
    if (zoomed) camera = SOUVENIR_FOCUS[souvenir.kind];
  }
  // Pendant le zoom sur un souvenir (et l'arrivée plein écran du journal), les invités s'effacent : zoomés avec la pièce, ils masqueraient l'objet.
  const zoomedIn = camera !== WIDE || (!!souvenir && cues < 3);
  const dim = step.kind === "roulette" ? 0.6 : step.kind === "carte" ? 0.65 : step.kind === "projecteur" ? 0.62 : step.kind === "gagnant" ? 0.45 : 0;

  // Sons : calés sur la chronologie serveur (jamais rejoués après un rechargement tardif).
  const soundBase = stepAbs;
  const sfx: { à: number; son: "ceremonie.souvenir" | "ceremonie.enveloppe" | "ceremonie.tic" | "ceremonie.flash" | "ceremonie.etoile" | "ceremonie.gagnant" | "applaudissements"; options?: { rate?: number; volume?: number } }[] = [];
  if (souvenir) sfx.push({ à: souvenir.kind === "post-it" ? 0.05 : ms(0.17) / 1000 + 0.15 * k, son: "ceremonie.souvenir" });
  if (step.kind === "roulette") {
    sfx.push({ à: 0, son: "ceremonie.enveloppe" });
    const spinFrom = ms(0.33), spinMs = length - spinFrom - 350 * k;
    slotTickTimes().forEach((t, i) => sfx.push({ à: (spinFrom + t * spinMs) / 1000, son: "ceremonie.tic", options: { rate: 0.9 + (i / 22) * 0.5 } }));
  }
  const path = useMemo(() => award && seated.length ? spotlightPath(award.id + info.playerIds.join(), seated.length, Math.max(0, indexOfPlayer(award.winners[0]!))) : [], // eslint-disable-line react-hooks/exhaustive-deps
    [award?.id, seated.length, award?.winners.join()]);
  if (step.kind === "projecteur") {
    const spotMs = length * 0.9;
    spotlightTimes(path.length).forEach((t, i) => i > 0 && sfx.push({ à: (t * spotMs) / 1000, son: "ceremonie.tic", options: { rate: 1.1 } }));
  }
  if (step.kind === "gagnant") {
    sfx.push({ à: 0.02, son: "ceremonie.flash" }, { à: 0.15 * k + 0.1, son: "ceremonie.gagnant" }, { à: ms(0.62) / 1000, son: "ceremonie.etoile" }, { à: ms(0.5) / 1000, son: "applaudissements", options: { volume: 0.6 } });
  }
  useSfxTimeline(sfx.length ? soundBase : null, sfx);

  // Étoiles : une par bonus déjà révélé (le bonus en cours est posé pendant l'étape « gagnant »).
  const starsOf = (id: string) => info.awards.slice(0, awardsRevealed).map((a, i) => ({ a, i })).filter(({ a }) => a.winners.includes(id));
  // Allumés seulement à la révélation : pendant que le projecteur cherche, tous les portraits sont grisés pareil (pas de spoil).
  const winnerIds = step.kind === "gagnant" ? award?.winners ?? [] : [];

  return (
    <div className="relative min-h-0 flex-1">
      <RoomSet data-testid="tv-ceremony" data-step={step.kind} data-index={step.index} camera={camera} cameraSeconds={Math.max(0.05, 1.1 * k)} dim={dim}
        overlay={<Overlay info={info} step={step} players={players} award={award} souvenir={souvenir} cues={cues} winnerIds={winnerIds} length={length} />}>
        {info.souvenirs.slice(0, shownSouvenirs).map((s, i) => {
          const active = souvenir === s && step.index === i;
          // L'objet n'apparaît qu'après le zoom ; il est posé tel quel quand son étape est passée.
          if (active && cues < 1 && s.kind !== "post-it") return null;
          return <SouvenirObject key={`${s.kind}-${i}`} keepsake={s} active={active} cues={cues} k={k} length={length} />;
        })}
        {bonus && award && (step.kind === "projecteur" || step.kind === "gagnant") && seated.length > 0 && (
          <Spotlight key={`${stepKey}-${award.id}`} seats={seats} partner={award.winners[1] ? indexOfPlayer(award.winners[1]) : undefined}
            path={step.kind === "projecteur" ? path : [Math.max(0, indexOfPlayer(award.winners[0]!))]} seconds={Math.max(0.05, length * 0.9 / 1000)} />
        )}
        {seated.map((p, i) => {
          const s = seats[i]!;
          const lit = winnerIds.includes(p.id);
          const isWinnerNow = step.kind === "gagnant" && lit;
          const stars = starsOf(p.id);
          return (
            <motion.div key={p.id} data-testid={`ceremony-player-${p.id}`} data-label={seatLabelSide(s.angle)} data-dim={bonus && !lit} data-lit={lit} data-hidden={zoomedIn}
              className="cer-person" initial={{ x: `${s.x * 100}cqw`, y: `${s.y * 100}cqh`, opacity: 0 }}
              animate={{ x: `${s.x * 100}cqw`, y: `${s.y * 100}cqh`, opacity: zoomedIn ? 0 : bonus && !lit ? 0.5 : 1 }}
              transition={{ x: { type: "spring", stiffness: 70, damping: 15 }, y: { type: "spring", stiffness: 70, damping: 15 }, opacity: { duration: 0.5, delay: !zoomedIn && souvenir ? Math.max(0.05, 1.1 * k) : 0 } }}>
              <motion.div className="room-visitor" animate={isWinnerNow ? { y: [0, -56, 0, -22, 0, -8, 0], scale: [1, 1.22, 1, 1.1, 1, 1.04, 1] } : { y: 0, scale: 1 }}
                transition={{ duration: isWinnerNow ? Math.max(0.1, 1.4 * k) : 0.2, delay: isWinnerNow ? 0.2 * k : 0, times: isWinnerNow ? [0, 0.22, 0.45, 0.62, 0.78, 0.9, 1] : undefined }}>
                <div className="room-portrait"><PlayerAvatar profile={p.profile} size="lg" /></div>
                <span className="room-name">{p.profile!.name}</span>
                {ranked && <span className="cer-rank-chip" data-testid={`ceremony-rank-${p.id}`}>{i + 1}</span>}
                <div className="cer-stars" data-testid={`ceremony-stars-${p.id}`} data-count={stars.length}>
                  {stars.map(({ a, i: awardIndex }) => {
                    const fresh = step.kind === "gagnant" && step.index === awardIndex;
                    return (
                      <motion.div key={a.id} initial={fresh ? { y: "-22rem", opacity: 0, scale: 2.4, rotate: -50 } : false}
                        animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 140, damping: 9, delay: fresh ? Math.max(0.05, ms(0.62) / 1000) : 0 }}>
                        <Star size={4.2} />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </RoomSet>
    </div>
  );
}

/** Le souvenir est posé dans le décor ; `active` = il vient de s'installer (geste physique), sinon il est déjà là. */
function SouvenirObject({ keepsake, active, cues, k, length }: { keepsake: Keepsake; active: boolean; cues: number; k: number; length: number }) {
  if (keepsake.kind === "dessin") return <FrameSouvenir keepsake={keepsake} active={active} seconds={Math.max(0.05, k)} />;
  if (keepsake.kind === "objet") return <BellSouvenir keepsake={keepsake} active={active} seconds={Math.max(0.05, k)} />;
  const phase = active ? (cues >= 1 ? 1 : 0) : 1;
  return <JournalSouvenir keepsake={keepsake} active={active} phase={phase}
    seconds={{ spin: Math.max(0.05, length * 0.2 / 1000), settle: Math.max(0.05, length * 0.2 / 1000) }} />;
}

// ───────────────────────────── Calque d'écran : titres, légendes, enveloppe, roulette, carte ─────────────────────────────

function Banner({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <motion.h1 key={String(children)} data-testid={testId} initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 14 }}
      className="cer-title absolute inset-x-0 top-[5%] text-center font-display text-7xl text-accent-strong">{children}</motion.h1>
  );
}

function Overlay({ info, step, players, award, souvenir, cues, winnerIds, length }: {
  info: CeremonyInfo; step: CeremonyStep; players: PublicPlayer[]; award?: Award; souvenir?: Keepsake; cues: number; winnerIds: string[]; length: number;
}) {
  const k = info.timeScale;
  const sec = (ms: number) => Math.max(0.05, ms / 1000);
  const roulette = useMemo<SlotItem[]>(() => (award?.roulette ?? []).map((id) => ({ id, emoji: info.categories[id]?.emoji ?? "★", title: info.categories[id]?.title ?? id })), [award, info.categories]);
  return (
    <>
      {step.kind === "intro" && <Banner>Les souvenirs de la soirée</Banner>}
      {step.kind === "provisoire" && <><Banner>Attendez… ce n'est pas fini !</Banner>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 * k }} className="cer-title absolute inset-x-0 top-[19%] text-center font-display text-4xl text-ink">Où en est-on ?</motion.p></>}
      {step.kind === "fin" && <Banner>Place au classement final !</Banner>}

      {souvenir && cues >= 2 && cues < 3 && <Legend souvenir={souvenir} players={players} />}

      {step.kind === "roulette" && award && (
        <div className="absolute inset-0 flex items-center justify-center" data-testid="ceremony-award" data-award="">
          <Envelope slideSeconds={sec(length * 0.2)} openAfter={sec(length * 0.24)} exitAfter={sec(length * 0.3)} exitSeconds={sec(length * 0.05)} />
          {cues >= 1 && (
            <motion.div className="absolute" initial={{ opacity: 0, scale: 0.7, y: 60 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
              <SlotMachine items={roulette} delaySeconds={0.05} spinSeconds={sec(length - length * 0.33 - 350 * k)} />
            </motion.div>
          )}
        </div>
      )}

      {step.kind === "carte" && award && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "90rem" }}>
          <motion.div data-testid="ceremony-award" data-award={award.id} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }} className="cer-card">
            <p className="text-[8rem] leading-none">{award.emoji}</p>
            <h2 className="mt-4 font-display text-6xl text-accent-strong">{award.title}</h2>
            <p className="mt-5 text-4xl leading-snug text-ink">{award.phrase}</p>
          </motion.div>
        </div>
      )}

      {step.kind === "projecteur" && award && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cer-title absolute inset-x-0 top-[5%] text-center font-display text-6xl text-accent-strong">
          {award.emoji} {award.title}
        </motion.p>
      )}

      {step.kind === "gagnant" && award && (
        <Winner info={info} award={award} players={players} winnerIds={winnerIds} cues={cues} length={length} />
      )}
    </>
  );
}

function Legend({ souvenir, players }: { souvenir: Keepsake; players: PublicPlayer[] }) {
  const owner = souvenir.kind === "dessin" ? players.find((p) => p.id === souvenir.playerId) : undefined;
  return (
    <motion.div data-testid="souvenir-legend" data-kind={souvenir.kind} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 15 }}
      className="absolute inset-x-0 bottom-[9%] flex justify-center">
      <div className="cer-card !w-auto min-w-[44rem] max-w-[62rem] !px-12 !py-6">
        {souvenir.kind === "dessin" && <>
          <p className="text-3xl font-bold uppercase tracking-widest text-ink-muted">Le dessin le plus voté</p>
          <p className="mt-2 font-display text-6xl text-accent-strong">{souvenir.label}</p>
          {owner?.profile && <p className="mt-3 flex items-center justify-center gap-4 text-3xl font-bold"><PlayerAvatar profile={owner.profile} size="xs" />par {owner.profile.name}</p>}
        </>}
        {souvenir.kind === "objet" && <>
          <p className="text-3xl font-bold uppercase tracking-widest text-ink-muted">L'objet qui vous a le plus surpris</p>
          <p className="mt-2 font-display text-6xl text-accent-strong">{souvenir.emoji} {souvenir.label}</p>
          <p className="mt-2 font-num text-5xl">{souvenir.detail}</p>
        </>}
        {souvenir.kind === "post-it" && <>
          <p className="text-3xl font-bold uppercase tracking-widest text-ink-muted">La Une du 1er janvier</p>
          <p className="mt-2 font-serious text-5xl font-black uppercase leading-tight text-accent-strong">{journalHeadline(souvenir).title}</p>
          {journalHeadline(souvenir).sub && <p className="mt-2 font-serious text-4xl italic">{journalHeadline(souvenir).sub}</p>}
        </>}
      </div>
    </motion.div>
  );
}

function Winner({ info, award, players, winnerIds, cues, length }: { info: CeremonyInfo; award: Award; players: PublicPlayer[]; winnerIds: string[]; cues: number; length: number }) {
  const k = info.timeScale;
  const names = winnerIds.map((id) => nameOf(players, id)).join(" & ");
  const strokes = award.keepsake?.kind === "dessin" ? cleanStrokes(award.keepsake.strokes) ?? [] : null;
  const spoon = SPOON_AWARDS.has(award.id);
  const spoonImage = ceremonieImage("cuillere");
  return (
    <>
      {/* Flash du projecteur qui s'arrête */}
      <motion.div aria-hidden className="absolute inset-0 bg-ink" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ duration: Math.max(0.1, 0.6 * k), times: [0, 0.15, 1] }} />
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cer-title absolute inset-x-0 top-[5%] text-center font-display text-6xl text-accent-strong">
        {award.emoji} {award.title}
      </motion.p>
      {cues >= 1 && strokes && (
        <motion.div data-testid="award-keepsake" initial={{ scale: 0.2, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: -3, opacity: 1 }} transition={{ type: "spring", stiffness: 100, damping: 11 }}
          className="absolute right-[7%] top-[22%] w-[26rem]">
          <div className="cer-card !w-full !p-5">
            <div className="aspect-square w-full bg-paper"><svg viewBox={`0 0 ${GRID} ${GRID}`} className="h-full w-full" aria-hidden><StrokesSvg strokes={strokes} /></svg></div>
            <p className="mt-3 font-display text-3xl text-accent-strong">{award.keepsake!.kind === "dessin" ? award.keepsake!.label : ""}</p>
          </div>
        </motion.div>
      )}
      {cues >= 1 && spoon && (
        <motion.div data-testid="award-spoon" initial={{ y: "-40rem", rotate: 200, scale: 0.4, opacity: 0 }} animate={{ y: 0, rotate: [200, -8, 5, 0], scale: 1, opacity: 1 }}
          transition={{ y: { type: "spring", stiffness: 90, damping: 11 }, rotate: { duration: Math.max(0.2, 1.4 * k) }, opacity: { duration: 0.2 } }}
          className="cer-spoon absolute right-[9%] top-[24%]" style={{ width: "17rem", aspectRatio: String(CEREMONIE_ASPECT.cuillere) }}>
          {spoonImage ? <img src={spoonImage} alt="" draggable={false} className="h-full w-full" /> : (
            <div className="cer-spoon-fallback"><span style={{ fontSize: "11rem", lineHeight: 1 }}>🥄</span><span className="cer-spoon-base" /></div>
          )}
        </motion.div>
      )}
      <motion.div data-testid="ceremony-winners" initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.max(0.05, length * 0.1 / 1000), type: "spring", stiffness: 110, damping: 14 }}
        className="absolute inset-x-0 top-[14%] flex flex-col items-center gap-3 text-center">
        <p className="cer-title font-display text-7xl text-ink">{names}</p>
        <p className="cer-title text-4xl font-bold text-accent-strong">{award.statLabel}</p>
      </motion.div>
    </>
  );
}
