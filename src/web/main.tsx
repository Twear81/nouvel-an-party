// Point d'entrée : /tv → écran TV, /play → téléphone (simple aiguillage sur l'URL).
import "@fontsource-variable/outfit";
import "@fontsource/bungee";
// Polices des skins (docs/skins.md) : latin seulement, poids utiles, tout en local (pas d'internet le jour J).
import "@fontsource/fira-sans/latin-600.css";
import "@fontsource/fira-sans/latin-700.css";
import "@fontsource/fira-sans/latin-800.css";
import "@fontsource/fira-sans/latin-900.css";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/jost/latin-400.css";
import "@fontsource/jost/latin-500.css";
import "@fontsource/jost/latin-700.css";
import "@fontsource/cinzel/latin-400.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/cinzel/latin-800.css";
import "@fontsource/lato/latin-400.css";
import "@fontsource/lato/latin-700.css";
import "@fontsource/exo-2/latin-300.css";
import "@fontsource/exo-2/latin-400.css";
import "@fontsource/exo-2/latin-500.css";
import "@fontsource/exo-2/latin-600.css";
import "@fontsource/orbitron/latin-400.css";
import "@fontsource/orbitron/latin-500.css";
import "@fontsource/arimo/latin-400.css";
import "@fontsource/arimo/latin-700.css";
import "@fontsource/jura/latin-500.css";
import "@fontsource/jura/latin-600.css";
import "@fontsource/jura/latin-700.css";
import "@fontsource/share-tech-mono/latin-400.css";
import "@fontsource/m-plus-1p/latin-500.css";
import "@fontsource/m-plus-1p/latin-700.css";
import "@fontsource/m-plus-1p/latin-800.css";
import "@fontsource/barlow-condensed/latin-300.css";
import "@fontsource/barlow-condensed/latin-400.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "./theme/theme.css";
import { createRoot } from "react-dom/client";
import { PhoneApp } from "./phone/PhoneApp";
import { TvApp } from "./tv/TvApp";

const isTv = location.pathname.replace(/\/+$/, "").endsWith("/tv");
document.documentElement.dataset.app = isTv ? "tv" : "phone";

createRoot(document.getElementById("root")!).render(isTv ? <TvApp /> : <PhoneApp />);
