// Petites scènes originales, ancrées dans l'illustration et jouées uniquement aux changements d'univers.
import type { SkinId } from "../../shared/skins";

export type SignatureFrame = Keyframe & { at: number };
type Animate = (element: Element | null, frames: SignatureFrame[]) => void;

const SPARKLES = [[-110, -10], [-90, -110], [-35, -135], [65, -120], [110, -45], [95, 45], [-70, 65]];
const BRANCHES = [
  "M748 490 C722 455 729 419 697 388 C665 358 671 320 634 288 C606 261 601 225 563 191",
  "M701 390 C671 389 643 365 611 370 C566 377 548 349 502 354 C466 356 439 332 402 337",
  "M638 294 C616 295 590 278 568 283 C544 290 526 268 501 270",
  "M614 267 C631 239 612 216 622 189 C630 165 610 151 614 124",
  "M568 283 C550 253 515 250 500 226 C485 200 456 205 440 179",
  "M748 490 C778 454 774 420 809 389 C845 359 832 323 873 295 C906 271 902 231 942 207",
  "M812 388 C851 400 880 375 917 382 C956 389 976 363 1019 370 C1059 377 1082 353 1125 359",
  "M877 292 C906 305 929 280 957 287 C989 295 1006 276 1040 282",
  "M907 266 C892 243 910 223 900 203 C887 177 906 160 896 136",
  "M1017 370 C1017 339 1042 321 1046 294 C1052 269 1076 263 1083 237",
  "M747 490 C737 458 756 432 746 403 C731 368 752 343 740 311 C728 274 748 253 739 218 C729 181 751 156 744 122",
  "M742 314 C717 309 709 282 686 275 C665 268 664 246 644 239",
  "M742 223 C765 219 774 193 795 189 C820 185 817 161 840 151",
  "M704 470 C682 487 654 479 636 499 C613 524 582 510 561 535 C535 565 507 546 482 570",
  "M793 470 C818 483 838 471 861 489 C887 511 913 495 939 514 C965 538 995 519 1022 542",
];

function DofusScene() {
  return <>
    <g className="sig-grid" data-room-motion="floor">
      {Array.from({ length: 25 }, (_, i) => {
        const x = i % 5, y = Math.floor(i / 5);
        const left = 805 + (x - y) * 66, top = 660 + (x + y) * 19;
        return <path key={i} d={`M${left} ${top}l66 19-66 19-66-19Z`} />;
      })}
    </g>
    <ellipse className="sig-green-aura" cx="805" cy="751" rx="115" ry="32" data-room-motion="aura" />
    <g transform="translate(805 675)">
      <g data-room-motion="egg" className="sig-egg">
        <path className="sig-egg-body" d="M0-94C44-94 64-42 61 7C58 56 37 82 0 85C-37 82-58 56-61 7C-64-42-44-94 0-94Z" />
        <path className="sig-egg-mark" d="M-33-25Q0-57 33-25Q4-5 26 23Q-7 50-31 20Q-8 4-33-25ZM-18 60Q4 47 22 56" />
        <path className="sig-egg-shine" d="M-35-54Q-23-75-12-74" />
      </g>
      {SPARKLES.map(([x, y], i) => <path key={i} data-room-motion="sparkle" className="sig-sparkle" d={`M${x} ${y - 9}q0 9 9 9q-9 0-9 9q0-9-9-9q9 0 9-9Z`} />)}
    </g>
  </>;
}

function OverwatchScene() {
  return <>
    <path className="sig-hologram-beam" d="M646 444L665 738Q805 800 970 738L851 444Z" />
    <g className="sig-holo-floor" data-room-motion="floor">
      <ellipse cx="805" cy="737" rx="163" ry="49" /><ellipse cx="805" cy="737" rx="132" ry="36" />
    </g>
    <g transform="translate(805 620)">
      <g data-room-motion="holo-target" className="sig-holo-target">
        <path className="sig-holo-hex" d="M-48-84H48L96 0L48 84H-48L-96 0Z" />
        <circle className="sig-target-ring" r="65" /><circle className="sig-target-ring" r="43" />
        <path className="sig-target-lines" d="M-82 0H-48M48 0H82M0-82V-48M0 48V82M-14 0H14M0-14V14" />
      </g>
    </g>
    <g className="sig-holo-small" data-room-motion="holo-satellites">
      <path d="M635 570h30l15 26-15 26h-30l-15-26Z" /><path d="M927 535h24l12 21-12 21h-24l-12-21Z" />
      <path d="M934 669h24l12 21-12 21h-24l-12-21Z" />
    </g>
    <path data-room-motion="holo-scan" className="sig-holo-scan" d="M650 746H960" />
  </>;
}

function LeagueScene() {
  return <>
    <g className="sig-portal-floor" data-room-motion="floor">
      <ellipse cx="805" cy="746" rx="213" ry="65" /><ellipse cx="805" cy="746" rx="175" ry="49" />
    </g>
    {Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI / 5;
      return <g key={i} transform={`translate(${805 + Math.cos(angle) * 197} ${746 + Math.sin(angle) * 57})`}>
        <path data-room-motion="rune" className="sig-rune" d="M-9 5V-10L0-17L9-10V5M-14-2H14M0-17V15" />
      </g>;
    })}
    <g transform="translate(805 628)">
      <g data-room-motion="portal" className="sig-portal">
        <path className="sig-portal-energy" d="M0-143L115-72V72L0 151L-115 72V-72Z" />
        <ellipse className="sig-portal-inner" rx="79" ry="113" />
        <path className="sig-portal-rim" d="M0-143L115-72V72L0 151L-115 72V-72Z" />
        <path className="sig-portal-rim sig-portal-fine" d="M0-123L98-62V62L0 129L-98 62V-62Z" />
        <path className="sig-portal-cracks" d="M-58-79L-19-44-35-9L7 16-14 49L31 84M39-100L17-67 55-29 24 11 53 47" />
        <path className="sig-portal-rim" d="M-16-143L0-163 16-143 0-125ZM-16 151L0 170 16 151 0 133Z" />
      </g>
    </g>
  </>;
}

function RocketScene() {
  return <>
    <ellipse data-room-motion="ball-shadow" className="sig-object-shadow" cx="1030" cy="812" rx="70" ry="14" />
    <g data-room-motion="boost" className="sig-boost">
      <path pathLength="1" d="M1140 783C980 790 925 680 850 725S735 800 705 681S692 474 749 386" />
      <path pathLength="1" d="M1140 798C980 805 925 695 850 740S735 815 705 696S680 474 739 386" />
    </g>
    <g transform="translate(1030 760)">
      <g data-room-motion="ball-flight">
        <g data-room-motion="ball-spin" className="sig-ball">
          <circle className="sig-ball-leather" r="55" />
          <path className="sig-ball-panel" d="M0-26L25-8 15 20H-15L-25-8ZM-15-53L-25-33-47-27-50-42ZM45-32L33-13 43 11 55 8ZM39 40L17 34 3 53 23 51ZM-44 33L-25 29-14 48-32 43Z" />
          <path className="sig-ball-seams" d="M0-26L0-51M25-8L44-22M15 20L27 41M-15 20L-30 40M-25-8L-44-21" />
          <path className="sig-ball-shine" d="M-34-28Q-28-39-15-42" />
        </g>
      </g>
    </g>
  </>;
}

const COINS = [[687, 633], [773, 571], [857, 495], [852, 424]];
function MarioScene() {
  return <>
    {COINS.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}>
      <g data-room-motion="coin" className="sig-coin"><circle r="25" /><ellipse rx="16" ry="20" /><path d="M0-12V12" /></g>
    </g>)}
    <g transform="translate(630 680)">
      <g data-room-motion="cap-flight" className="sig-cap">
        <path className="sig-cap-body" d="M-73 10C-81-52-48-94 2-94C52-94 82-62 78 12L62 31H-61Z" />
        <path className="sig-cap-brim" d="M-86 9Q-19-11 75 7Q125 17 110 36Q24 66-88 38Q-112 30-86 9Z" />
        <path className="sig-cap-shine" d="M-51-46Q-32-73-9-74" />
        <ellipse className="sig-cap-eye" cx="-23" cy="-27" rx="18" ry="28" /><ellipse className="sig-cap-eye" cx="18" cy="-27" rx="18" ry="28" />
        <ellipse className="sig-cap-iris" cx="-17" cy="-24" rx="9" ry="17" /><ellipse className="sig-cap-iris" cx="24" cy="-24" rx="9" ry="17" />
        <circle className="sig-cap-eye" cx="-14" cy="-30" r="3" /><circle className="sig-cap-eye" cx="27" cy="-30" r="3" />
      </g>
    </g>
  </>;
}

function MaculaScene() {
  return <>
    <g data-room-motion="macula-pulse" className="sig-macula-pulse">
      <ellipse cx="748" cy="477" rx="163" ry="87" /><ellipse cx="748" cy="477" rx="107" ry="58" /><ellipse cx="748" cy="477" rx="47" ry="29" />
    </g>
    <g className="sig-macula-roots">
      {BRANCHES.map((d, i) => <path key={i} data-room-motion="macula-branch" pathLength="1" className={i % 5 === 0 ? "sig-macula-trunk" : undefined} d={d} />)}
    </g>
    <g className="sig-macula-knots" data-room-motion="macula-knots">
      <path d="M739 472Q719 457 730 445Q745 434 753 449Q773 444 774 460Q769 479 752 474Q741 489 739 472Z" />
      <path d="M691 389Q679 376 686 368Q701 363 705 377Q717 377 717 389Q704 401 691 389ZM805 391Q792 384 802 372Q818 367 822 382Q832 392 817 401Z" />
    </g>
  </>;
}

export function RoomSignature({ skin }: { skin: SkinId | null }) {
  const content = skin === "dofus" ? <DofusScene /> : skin === "overwatch" ? <OverwatchScene />
    : skin === "league-of-legends" ? <LeagueScene /> : skin === "rocket-league" ? <RocketScene />
      : skin === "mario-odyssey" ? <MarioScene /> : skin === "plague-tale" ? <MaculaScene /> : null;
  return content && <svg className="room-signature-art" viewBox="0 0 1672 941" aria-hidden="true" data-testid="transition-signature" data-signature={skin}>{content}</svg>;
}

/** Les effets natifs sont ajoutés à la même liste que la caméra : aucun temps autonome. */
export function animateRoomSignature(root: Element | null, skin: SkinId | null, reduced: boolean, animate: Animate) {
  if (!root) return;
  const select = (name: string) => root.querySelector(`[data-room-motion="${name}"]`);
  const all = (name: string) => root.querySelectorAll(`[data-room-motion="${name}"]`);
  const appear = (element: Element | null, delay = 0) => animate(element, [
    { at: 0, opacity: 0 }, { at: 1000 + delay, opacity: 0 }, { at: 1250 + delay, opacity: 1 },
    { at: 3000, opacity: 1 }, { at: 3500, opacity: 0 }, { at: 4000, opacity: 0 },
  ]);
  appear(select("floor"));
  if (skin === "dofus") {
    animate(select("egg"), reduced ? [
      { at: 0, opacity: 0 }, { at: 1050, opacity: 0 }, { at: 1350, opacity: 1 }, { at: 3000, opacity: 1 }, { at: 4000, opacity: 0 },
    ] : [
      { at: 0, opacity: 0, transform: "translateY(35px) scale(.7)" }, { at: 1050, opacity: 0, transform: "translateY(35px) scale(.7)" },
      { at: 1450, opacity: 1, transform: "translateY(-5px) scale(1.05)" }, { at: 2200, opacity: 1, transform: "translateY(-18px) scale(1)" },
      { at: 3100, opacity: 0, transform: "translateY(-65px) scale(.85)" }, { at: 4000, opacity: 0, transform: "translateY(-65px) scale(.85)" },
    ]);
    appear(select("aura"));
    all("sparkle").forEach((element, i) => animate(element, [
      { at: 0, opacity: 0 }, { at: 1250 + i * 70, opacity: 0 }, { at: 1450 + i * 70, opacity: 1 },
      { at: 1950 + i * 70, opacity: 0 }, { at: 4000, opacity: 0 },
    ]));
  } else if (skin === "overwatch") {
    appear(select("holo-target")); appear(select("holo-satellites"), 100);
    animate(select("holo-scan"), reduced ? [
      { at: 0, opacity: 0 }, { at: 1200, opacity: .8 }, { at: 3000, opacity: .8 }, { at: 4000, opacity: 0 },
    ] : [
      { at: 0, opacity: 0, transform: "translateY(0px)" }, { at: 1100, opacity: 0, transform: "translateY(0px)" },
      { at: 1400, opacity: 1, transform: "translateY(-50px)" }, { at: 2500, opacity: 1, transform: "translateY(-245px)" },
      { at: 2850, opacity: 0, transform: "translateY(-275px)" }, { at: 4000, opacity: 0, transform: "translateY(-275px)" },
    ]);
  } else if (skin === "league-of-legends") {
    animate(select("portal"), [
      { at: 0, opacity: 0, transform: reduced ? "none" : "scaleX(.04)" }, { at: 1000, opacity: 0, transform: reduced ? "none" : "scaleX(.04)" },
      { at: 1450, opacity: 1, transform: "scaleX(1)" }, { at: 2800, opacity: 1, transform: "scaleX(1)" },
      { at: 3400, opacity: 0, transform: "scaleX(1)" }, { at: 4000, opacity: 0, transform: "scaleX(1)" },
    ]);
    all("rune").forEach((element, i) => appear(element, i * 35));
  } else if (skin === "rocket-league") {
    animate(select("ball-flight"), reduced ? [
      { at: 0, opacity: 0, transform: "translate(-225px, -50px)" }, { at: 1150, opacity: 1, transform: "translate(-225px, -50px)" },
      { at: 2900, opacity: 1, transform: "translate(-225px, -50px)" }, { at: 4000, opacity: 0, transform: "translate(-225px, -50px)" },
    ] : [
      { at: 0, opacity: 0, transform: "translate(110px, 20px) scale(.8)" }, { at: 950, opacity: 0, transform: "translate(110px, 20px) scale(.8)" },
      { at: 1250, opacity: 1, transform: "translate(0px, 15px) scale(1)" }, { at: 1550, opacity: 1, transform: "translate(-130px, -55px) scale(1)" },
      { at: 1800, opacity: 1, transform: "translate(-225px, 10px) scale(1)" }, { at: 2100, opacity: 1, transform: "translate(-310px, -30px) scale(.95)" },
      { at: 2400, opacity: 1, transform: "translate(-350px, -160px) scale(.65)" }, { at: 2800, opacity: .8, transform: "translate(-281px, -374px) scale(.18)" },
      { at: 3000, opacity: 0, transform: "translate(-281px, -374px) scale(.1)" }, { at: 4000, opacity: 0, transform: "translate(-281px, -374px) scale(.1)" },
    ]);
    if (!reduced) animate(select("ball-spin"), [{ at: 0, transform: "rotate(0deg)" }, { at: 1000, transform: "rotate(0deg)" }, { at: 2800, transform: "rotate(-630deg)" }, { at: 4000, transform: "rotate(-630deg)" }]);
    animate(select("ball-shadow"), reduced ? [
      { at: 0, opacity: 0, transform: "translateX(-225px)" }, { at: 1200, opacity: .35, transform: "translateX(-225px)" },
      { at: 2900, opacity: .35, transform: "translateX(-225px)" }, { at: 4000, opacity: 0, transform: "translateX(-225px)" },
    ] : [
      { at: 0, opacity: 0, transform: "translateX(110px)" }, { at: 1200, opacity: .35, transform: "translateX(0px)" },
      { at: 2100, opacity: .35, transform: "translateX(-310px)" }, { at: 2400, opacity: 0, transform: "translateX(-350px)" }, { at: 4000, opacity: 0, transform: "translateX(-350px)" },
    ]);
    all("boost").forEach((element) => appear(element));
    root.querySelectorAll(".sig-boost path").forEach((element) => animate(element, [
      { at: 0, strokeDashoffset: reduced ? 0 : 1 }, { at: 1050, strokeDashoffset: reduced ? 0 : 1 }, { at: 2800, strokeDashoffset: 0 }, { at: 4000, strokeDashoffset: 0 },
    ]));
  } else if (skin === "mario-odyssey") {
    animate(select("cap-flight"), reduced ? [
      { at: 0, opacity: 0, transform: "translate(175px, -20px)" }, { at: 1200, opacity: 1, transform: "translate(175px, -20px)" },
      { at: 2900, opacity: 1, transform: "translate(175px, -20px)" }, { at: 4000, opacity: 0, transform: "translate(175px, -20px)" },
    ] : [
      { at: 0, opacity: 0, transform: "translate(-90px, 45px) rotate(-18deg) scale(.8)" }, { at: 950, opacity: 0, transform: "translate(-90px, 45px) rotate(-18deg) scale(.8)" },
      { at: 1300, opacity: 1, transform: "translate(20px, -30px) rotate(-8deg) scale(1)" }, { at: 1750, opacity: 1, transform: "translate(185px, -145px) rotate(12deg) scale(1)" },
      { at: 2200, opacity: 1, transform: "translate(270px, -260px) rotate(26deg) scale(.75)" }, { at: 2750, opacity: .85, transform: "translate(119px, -294px) rotate(-6deg) scale(.25)" },
      { at: 3000, opacity: 0, transform: "translate(119px, -294px) scale(.15)" }, { at: 4000, opacity: 0, transform: "translate(119px, -294px) scale(.15)" },
    ]);
    all("coin").forEach((element, i) => animate(element, [
      { at: 0, opacity: 0, transform: "scaleX(1)" }, { at: 1100 + i * 140, opacity: 0, transform: "scaleX(1)" },
      { at: 1280 + i * 140, opacity: 1, transform: reduced ? "scaleX(1)" : "scaleX(.35)" },
      { at: 1700 + i * 140, opacity: 1, transform: "scaleX(1)" }, { at: 2100 + i * 140, opacity: 0, transform: "scaleX(1)" }, { at: 4000, opacity: 0, transform: "scaleX(1)" },
    ]));
  } else if (skin === "plague-tale") {
    all("macula-branch").forEach((element, i) => animate(element, [
      { at: 0, strokeDashoffset: reduced ? 0 : 1, opacity: 0 }, { at: 1000 + i * 28, strokeDashoffset: reduced ? 0 : 1, opacity: 0 },
      { at: 1300 + i * 28, opacity: 1 }, { at: 2450 + i * 20, strokeDashoffset: 0, opacity: 1 },
      { at: 3300, strokeDashoffset: 0, opacity: 1 }, { at: 4000, strokeDashoffset: 0, opacity: 0 },
    ]));
    appear(select("macula-knots"), 200);
    animate(select("macula-pulse"), reduced ? [
      { at: 0, opacity: 0 }, { at: 1300, opacity: .55 }, { at: 2900, opacity: .55 }, { at: 4000, opacity: 0 },
    ] : [
      { at: 0, opacity: 0, transform: "scale(.75)" }, { at: 1250, opacity: .2, transform: "scale(.75)" },
      { at: 1750, opacity: .9, transform: "scale(1.08)" }, { at: 2200, opacity: .3, transform: "scale(.9)" },
      { at: 2600, opacity: .85, transform: "scale(1.1)" }, { at: 3100, opacity: 0, transform: "scale(1.15)" }, { at: 4000, opacity: 0, transform: "scale(1.15)" },
    ]);
  }
}
