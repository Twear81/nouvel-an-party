// Section « Composants » : chaque brique de src/web/ui, seule, avec de quoi la déclencher à la main.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnsweredRoster, Button, Choice, CountUp, DuelGauge, FlyingPoints, Pop, ResultBar, SelectedBadge, VoteDots, WaitingDots, WatchingEyes } from "../../src/web/ui";
import { Disposition, TvPane } from "./panneaux";
import type { Env, Scene } from "./types";

function Page({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-12 px-24">
      <div className="font-display text-5xl text-gold-gradient">{titre}</div>
      {children}
    </div>
  );
}

function Cadre({ env, titre, children, actions }: { env: Env; titre: string; children: ReactNode; actions?: ReactNode }) {
  void env;
  return (
    <>
      <Disposition tv={(echelle) => <TvPane echelle={echelle}><Page titre={titre}>{children}</Page></TvPane>} />
      {actions && <div className="ga-actions">{actions}</div>}
    </>
  );
}

function Boutons({ env }: { env: Env }) {
  const [clics, setClics] = useState(0);
  const [actif, setActif] = useState(false);
  const simule = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setActif((a) => !a), 2500);
    return () => clearInterval(id);
  }, []);
  // Un doigt virtuel appuie toutes les 3 s sur le bouton du milieu : on voit le ressort sans rien toucher.
  useEffect(() => {
    let relache: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      const bouton = simule.current?.querySelector("button");
      if (!bouton) return;
      const r = bouton.getBoundingClientRect();
      const options = { bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
      bouton.dispatchEvent(new PointerEvent("pointerdown", options));
      relache = setTimeout(() => window.dispatchEvent(new PointerEvent("pointerup", options)), 350);
    }, 3000);
    return () => { clearInterval(id); clearTimeout(relache); };
  }, []);
  return (
    <Cadre env={env} titre="Boutons">
      <div className="flex items-center gap-10">
        <Button size="xl" onClick={() => setClics((c) => c + 1)} data-testid="ga-bouton">Appuie ({clics})</Button>
        <div ref={simule}><Button size="xl" variant="secondary">Enfoncé tout seul</Button></div>
        <Button size="xl" variant="good">Oui</Button>
        <Button size="xl" variant="bad">Non</Button>
      </div>
      <div className="flex items-center gap-8">
        <Button size="xl" disabled={!actif} data-testid="ga-bouton-grise">{actif ? "Valider" : "Encore 2 à placer"}</Button>
        <span className="text-3xl text-ink-muted">grisé, puis actif (rebond) toutes les 2,5 s</span>
      </div>
    </Cadre>
  );
}

function Choix({ env }: { env: Env }) {
  const [choisi, setChoisi] = useState<number | null>(null);
  const etat = (i: number) => (choisi !== null && choisi !== i ? "faded" : "idle");
  return (
    <Cadre env={env} titre="Choix et pastille ✓">
      <div className="flex gap-10">
        {["Champagne", "Mojito"].map((texte, i) => (
          <Choice key={texte} keyLabel={i === 0 ? "A" : "B"} selected={choisi === i} state={etat(i)} onClick={() => setChoisi(i)} className="h-44 w-[34rem] font-display text-5xl" data-testid={`ga-choix-${i}`}>
            {texte}
          </Choice>
        ))}
      </div>
      <div className="flex items-center gap-10">
        <Choice tone="good" state="correct" className="h-28 w-64 font-display text-3xl">correct</Choice>
        <Choice tone="bad" state="wrong" className="h-28 w-64 font-display text-3xl">raté</Choice>
        <Choice state="faded" className="h-28 w-64 font-display text-3xl">estompé</Choice>
        <SelectedBadge size="lg" tone="accent" className="" />
        <SelectedBadge size="md" tone="good" className="" />
      </div>
    </Cadre>
  );
}

function Liste({ env }: { env: Env }) {
  const [faits, setFaits] = useState(0);
  return (
    <Cadre
      env={env}
      titre="Qui a répondu"
      actions={
        <>
          <button type="button" data-testid="ga-suivant" disabled={faits >= env.joueurs.length} onClick={() => setFaits((n) => n + 1)}>Faire répondre le suivant</button>
          <button type="button" onClick={() => setFaits(0)}>Remettre à zéro</button>
        </>
      }
    >
      <AnsweredRoster players={env.joueurs} isDone={(id) => env.joueurs.findIndex((p) => p.id === id) < faits} />
    </Cadre>
  );
}

function Barres({ env }: { env: Env }) {
  const [essai, setEssai] = useState(0);
  const valeurs = [0.9, 0.6, 0.35, 0.1];
  return (
    <Cadre env={env} titre="Barres de résultat" actions={<button type="button" onClick={() => setEssai((n) => n + 1)}>Rejouer</button>}>
      <div key={essai} className="flex w-[70rem] flex-col gap-5">
        {valeurs.map((v, i) => (
          <ResultBar key={i} value={v} highlight={i === 0} delay={i * 0.25} duration={0.9} className="h-20 w-full">
            <span className="px-6 font-display text-3xl">{Math.round(v * 100)} %</span>
          </ResultBar>
        ))}
      </div>
    </Cadre>
  );
}

function Pastilles({ env }: { env: Env }) {
  const total = env.joueurs.length;
  const [fait, setFait] = useState(1);
  return (
    <Cadre
      env={env}
      titre="Pastilles de vote"
      actions={
        <>
          <button type="button" disabled={fait >= total} onClick={() => setFait((n) => n + 1)}>Un vote de plus</button>
          <button type="button" onClick={() => setFait(0)}>Remettre à zéro</button>
        </>
      }
    >
      <VoteDots done={fait} total={total} />
    </Cadre>
  );
}

function Jauge({ env }: { env: Env }) {
  const [oui, setOui] = useState(3);
  const [non, setNon] = useState(2);
  const total = env.joueurs.length;
  return (
    <Cadre
      env={env}
      titre="Jauge de duel"
      actions={
        <>
          <button type="button" onClick={() => setOui((n) => Math.min(total, n + 1))}>OUI +1</button>
          <button type="button" onClick={() => setNon((n) => Math.min(total, n + 1))}>NON +1</button>
          <button type="button" onClick={() => { setOui(0); setNon(0); }}>Remettre à zéro</button>
        </>
      }
    >
      <DuelGauge left={oui / total / 2 + 0.0} right={non / total / 2 + 0.0} className="h-24 w-[70rem]" />
      <div className="flex w-[70rem] justify-between font-num text-5xl"><span className="text-good">OUI {oui}</span><span className="text-bad">{non} NON</span></div>
    </Cadre>
  );
}

function Points({ env }: { env: Env }) {
  const [score, setScore] = useState(300);
  const [essai, setEssai] = useState(0);
  return (
    <Cadre
      env={env}
      titre="Points qui s'envolent"
      actions={<button type="button" data-testid="ga-points" onClick={() => { setScore((s) => s + 150); setEssai((n) => n + 1); }}>+150 points</button>}
    >
      <div className="relative flex items-center gap-16 font-num text-9xl">
        <span className="relative flex h-40 items-center text-ink-muted">
          <FlyingPoints key={essai} value={essai === 0 ? 0 : 150} />
        </span>
        <Pop value={score} className="text-accent">{score}</Pop>
        <CountUp value={score} duration={1.2} className="text-good" />
      </div>
      <div className="text-3xl text-ink-muted">Pop (rebond) · CountUp (défile) · FlyingPoints (« +N » qui s'envole)</div>
    </Cadre>
  );
}

function Attente({ env }: { env: Env }) {
  return (
    <Cadre env={env} titre="Attendre, regarder">
      <div className="flex items-center gap-24">
        <span className="text-8xl text-ink-muted"><WaitingDots className="scale-[2.5]" /></span>
        <WatchingEyes />
      </div>
    </Cadre>
  );
}

const C = (id: string, titre: string, aide: string, Composant: Scene["Composant"]): Scene => ({ id: `composants/${id}`, section: "composants", titre, aide, Composant });

export const SCENES_COMPOSANTS: Scene[] = [
  C("boutons", "Boutons", "Appuyer : le bouton s'enfonce. Grisé puis actif : il rebondit.", Boutons),
  C("choix", "Choix et pastille ✓", "Un choix enregistré : rebond, ✓, les autres s'estompent.", Choix),
  C("liste", "Qui a répondu", "Chaque avatar saute et s'allume quand il répond.", Liste),
  C("barres", "Barres de résultat", "Les barres se remplissent l'une après l'autre.", Barres),
  C("pastilles", "Pastilles de vote", "Une pastille s'allume à chaque vote.", Pastilles),
  C("jauge", "Jauge de duel", "Deux camps face à face.", Jauge),
  C("points", "Points qui s'envolent", "Pop, CountUp et FlyingPoints.", Points),
  C("attente", "Attendre, regarder", "Les points d'attente et les yeux « regarde la TV ».", Attente),
];
