// Point d'entrée : /tv → écran TV, /play → téléphone (simple aiguillage sur l'URL).
import "@fontsource-variable/outfit";
import "@fontsource/bungee";
import "./theme/theme.css";
import { createRoot } from "react-dom/client";
import { PhoneApp } from "./phone/PhoneApp";
import { TvApp } from "./tv/TvApp";

const isTv = location.pathname.replace(/\/+$/, "").endsWith("/tv");
document.documentElement.dataset.app = isTv ? "tv" : "phone";

createRoot(document.getElementById("root")!).render(isTv ? <TvApp /> : <PhoneApp />);
