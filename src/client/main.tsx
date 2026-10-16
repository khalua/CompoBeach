import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans-condensed/400.css";
import "@fontsource/ibm-plex-sans-condensed/500.css";
import "@fontsource/ibm-plex-sans-condensed/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./styles/app.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
