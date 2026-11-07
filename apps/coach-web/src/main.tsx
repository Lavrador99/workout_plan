import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startPwa } from "./lib/pwa";
import { migrateTargets } from "./lib/db";
import { seedLibrary } from "./lib/seed";
import { startAutoSync, syncNow } from "./lib/sync";
import { startTheme } from "./lib/theme";

startTheme();
startPwa();
startAutoSync();
// after the first pull, so another device's library is seen before seeding
void syncNow().finally(() => void seedLibrary().then(migrateTargets));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
