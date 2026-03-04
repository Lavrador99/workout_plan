import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initFileAutosave } from "./utils/fileAutosave";

// Restore linked file handle from IndexedDB (silent, no UI block)
void initFileAutosave();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
