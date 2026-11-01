import { UpdateBar } from "./components/PwaBanners";
import { useMemo } from "react";
import { go, useExercises, useRoute, useSyncStatus } from "./lib/hooks";
import { missingInfo } from "./lib/movement";
import ClientPage from "./pages/ClientPage";
import ClientsPage from "./pages/ClientsPage";
import FocusPage from "./pages/FocusPage";
import HistoryPage from "./pages/HistoryPage";
import ImportPage from "./pages/ImportPage";
import LibraryPage from "./pages/LibraryPage";
import SessionPage from "./pages/SessionPage";
import SettingsPage from "./pages/SettingsPage";

const TABS = [
  ["", "Clientes", "👥"],
  ["library", "Biblioteca", "📚"],
  ["focus", "Perfis", "🎯"],
  ["settings", "Definições", "⚙️"],
] as const;

export default function App() {
  const [page = "", id = "", sub = ""] = useRoute();
  const sync = useSyncStatus();
  const exercises = useExercises();
  const toReview = useMemo(() => exercises?.filter((e) => missingInfo(e).length).length ?? 0, [exercises]);
  const tab = page === "client" || page === "session" || page === "import" || page === "history" ? "" : page;

  return (
    <div className="min-h-screen max-w-2xl mx-auto safe-top">
      <UpdateBar />
      {sync.state === "error" && (
        <button type="button" className="w-full text-xs bg-danger/20 text-danger py-1" onClick={() => go("settings")}>
          Sincronização falhou — os dados estão guardados neste dispositivo.
        </button>
      )}
      <main className="pb-20">
        {page === "client" ? (
          <ClientPage key={id} id={id} />
        ) : page === "session" ? (
          <SessionPage key={id} id={id} />
        ) : page === "history" ? (
          <HistoryPage key={id + sub} clientId={id} exKey={sub} />
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
