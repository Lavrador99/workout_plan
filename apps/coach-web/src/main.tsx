import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startPwa } from "./lib/pwa";
import { startAutoSync } from "./lib/sync";

startPwa();
startAutoSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
