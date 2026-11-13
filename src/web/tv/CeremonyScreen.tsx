// Habillage provisoire du contrat de cérémonie ; la scène illustrée remplace cette vue au lot suivant.
import { ceremonyScores } from "../../shared/ceremony";
import type { CeremonyInfo } from "../../shared/ceremony";
import type { GameSnapshot } from "../../shared/types";
import { useCeremony } from "../net/useCeremony";
import { Panel, PlayerAvatar } from "../ui";

export function CeremonyScreen({ snapshot }: { snapshot: GameSnapshot }) {
  if (!snapshot.ceremony) return null;
  return <CeremonyBody info={snapshot.ceremony} snapshot={snapshot} />;
}

function CeremonyBody({ info, snapshot }: { info: CeremonyInfo; snapshot: GameSnapshot }) {
  const { elapsed, step } = useCeremony(info);
  const award = step.index === undefined ? undefined : info.awards[step.index];
  const scores = ceremonyScores(info, elapsed);
  const ranked = snapshot.players.filter((p) => info.playerIds.includes(p.id)).sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const souvenir = step.kind === "souvenir" ? info.souvenirs[step.index!] : undefined;
  const bonusStep = ["roulette", "carte", "projecteur", "gagnant"].includes(step.kind);
  return <div data-testid="tv-ceremony" data-step={step.kind} data-index={step.index} className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
    <h1 className="font-display text-6xl text-gold-gradient">{step.kind === "intro" ? "Les souvenirs de la soirée" : step.kind === "provisoire" ? "Attendez… ce n'est pas fini !" : step.kind === "fin" ? "Place au classement final !" : bonusStep ? "Les bonus de la soirée" : "On garde ça !"}</h1>
    {souvenir && <Panel className="max-w-4xl p-8 font-display text-4xl">{souvenir.kind === "dessin" ? `🎨 ${souvenir.label}` : souvenir.kind === "objet" ? `${souvenir.emoji} ${souvenir.label} — ${souvenir.detail}` : `${souvenir.text} ${souvenir.detail ?? ""}`}</Panel>}
    {bonusStep && award && <Panel data-testid="ceremony-award" data-award={step.kind === "roulette" ? "" : award.id} className="max-w-5xl p-8">
      {step.kind === "roulette" ? <p className="font-display text-4xl">🎰 {award.roulette.map((id) => info.categories[id]?.emoji ?? "★").join(" ")}</p> : <><p className="text-6xl">{award.emoji}</p><h2 className="font-display text-5xl">{award.title}</h2><p className="mt-4 text-2xl">{award.phrase}</p></>}
      {step.kind === "gagnant" && <div data-testid="ceremony-winners" className="mt-5 text-3xl text-accent">{award.winners.map((id) => snapshot.players.find((p) => p.id === id)?.profile?.name).join(" & ")} +{award.points}<p className="text-xl text-ink-muted">{award.statLabel}</p></div>}
    </Panel>}
    <div className="flex w-full flex-wrap justify-center gap-5">{ranked.map((p) => <div key={p.id} data-testid={`ceremony-player-${p.id}`} className="flex w-40 flex-col items-center gap-2"><PlayerAvatar profile={p.profile} size="lg" /><p className="w-full truncate text-xl font-bold">{p.profile?.name}</p><p className="font-num text-3xl text-accent">{scores[p.id]}</p></div>)}</div>
  </div>;
}
