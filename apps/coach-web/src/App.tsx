import { UpdateBar } from "./components/PwaBanners";
import { useMemo } from "react";
import { go, useExercises, useRoute, useSyncStatus } from "./lib/hooks";
import { missingInfo } from "./lib/movement";
import AssessmentPage from "./pages/AssessmentPage";
import ClientPage from "./pages/ClientPage";
import ClientsPage from "./pages/ClientsPage";
import ComparePage from "./pages/ComparePage";
import EvolutionPage from "./pages/EvolutionPage";
import FocusPage from "./pages/FocusPage";
import HistoryPage from "./pages/HistoryPage";
import ImportPage from "./pages/ImportPage";
import LibraryPage from "./pages/LibraryPage";
import SessionPage from "./pages/SessionPage";
import SettingsPage from "./pages/SettingsPage";
import TestsPage from "./pages/TestsPage";

const TABS = [
  ["", "Clientes", "👥"],
  ["library", "Biblioteca", "📚"],
  ["focus", "Perfis", "🎯"],
  ["settings", "Definições", "⚙️"],
] as const;

export default function App() {
  const [page = "", id = "", sub = "", sub2 = ""] = useRoute();
  const sync = useSyncStatus();
  const exercises = useExercises();
  const toReview = useMemo(() => exercises?.filter((e) => missingInfo(e).length).length ?? 0, [exercises]);
  const tab = ["client", "session", "import", "history", "assessment", "evolution", "compare"].includes(page) ? "" : page === "tests" ? "library" : page;

  return (
    <div className="min-h-screen max-w-2xl mx-auto safe-top">
      <UpdateBar />
      {page !== "settings" && (sync.state === "off" || sync.state === "error") && (
        <button type="button" className="w-full text-xs bg-warn/15 text-warn px-3 py-1.5 text-left flex items-center gap-2" onClick={() => go("settings")}>
          <span className="flex-1">
            {sync.state === "off"
              ? "⚠ Sincronização desligada: o que fizeres aqui não chega aos outros aparelhos."
              : `⚠ Não sincronizou (${sync.message}). Está guardado neste aparelho.`}
          </span>
          <span className="font-semibold shrink-0">{sync.state === "off" ? "Ligar ›" : "Ver ›"}</span>
        </button>
      )}
      <main className="pb-20">
        {page === "client" ? (
          <ClientPage key={id} id={id} initialTab={sub} />
        ) : page === "session" ? (
          <SessionPage key={id} id={id} />
        ) : page === "history" ? (
          <HistoryPage key={id + sub} clientId={id} exKey={sub} />
        ) : page === "assessment" ? (
          <AssessmentPage key={id} id={id} />
        ) : page === "evolution" ? (
          <EvolutionPage key={id + sub} clientId={id} testId={sub} />
        ) : page === "compare" ? (
          <ComparePage key={id + sub + sub2} clientId={id} a={sub} b={sub2} />
        ) : page === "tests" ? (
          <TestsPage />
        ) : page === "import" ? (
          <ImportPage clientId={id} />
        ) : page === "library" ? (
          <LibraryPage />
        ) : page === "focus" ? (
          <FocusPage />
        ) : page === "settings" ? (
          <SettingsPage />
        ) : (
          <ClientsPage />
        )}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border safe-bottom z-40">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" onClick={() => go(k)} className={`flex-1 flex flex-col items-center py-2 text-xs ${tab === k ? "text-accent" : "text-muted"}`}>
              <span className="text-lg leading-none relative">
                {icon}
                {k === "settings" && (sync.state === "off" || sync.state === "error") && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-warn" />
                )}
                {k === "library" && toReview > 0 && (
                  <span className="absolute -top-1 -right-3 min-w-4 h-4 px-1 rounded-full bg-warn text-black text-[10px] font-bold leading-4">{toReview}</span>
                )}
              </span>
              {label}
              {k === "settings" && sync.state === "syncing" && <span className="sr-only">a sincronizar</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
