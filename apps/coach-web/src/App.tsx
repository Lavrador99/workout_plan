import { BookOpen, CalendarDays, Settings, TriangleAlert, Users, Wallet } from "lucide-react";
import { DialogHost } from "./components/Dialogs";
import { ErrorBoundary } from "./components/States";
import { UpdateBar } from "./components/PwaBanners";
import { useEffect, useMemo } from "react";
import { Toaster } from "./components/Toast";
import { go, useExercises, useRoute, useSyncStatus } from "./lib/hooks";
import { missingInfo } from "./lib/movement";
import AssessmentPage from "./pages/AssessmentPage";
import ClientPage from "./pages/ClientPage";
import ClientsPage from "./pages/ClientsPage";
import ComparePage from "./pages/ComparePage";
import EvolutionPage from "./pages/EvolutionPage";
import FinancePage from "./pages/FinancePage";
import HomePage from "./pages/HomePage";
import ProgressPage from "./pages/ProgressPage";
import FocusPage from "./pages/FocusPage";
import HistoryPage from "./pages/HistoryPage";
import ImportPage from "./pages/ImportPage";
import LibraryPage from "./pages/LibraryPage";
import SessionPage from "./pages/SessionPage";
import SettingsPage from "./pages/SettingsPage";

const TAB_OF: Record<string, string> = { focus: "library" };
for (const page of ["client", "session", "import", "history", "assessment", "evolution", "compare", "progress"]) TAB_OF[page] = "clients";

const TABS = [
  ["", "Hoje", CalendarDays],
  ["clients", "Clientes", Users],
  ["library", "Biblioteca", BookOpen],
  ["finance", "Finanças", Wallet],
  ["settings", "Definições", Settings],
] as const;

export default function App() {
  const [page = "", id = "", sub = "", sub2 = ""] = useRoute();
  const sync = useSyncStatus();
  const exercises = useExercises();
  const toReview = useMemo(() => exercises?.filter((e) => missingInfo(e).length).length ?? 0, [exercises]);
  const tab = TAB_OF[page] ?? page;

  // "/" jumps to the search of the page, for those on a keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      const search = document.querySelector<HTMLInputElement>("[data-search]");
      if (!search) return;
      e.preventDefault();
      search.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen max-w-2xl lg:max-w-4xl mx-auto lg:pl-56 safe-top">
      <div className="fixed top-0 inset-x-0 z-40 bg-bg safe-top-strip" />
      <UpdateBar />
      {page !== "settings" && (sync.state === "off" || sync.state === "error") && (
        <button type="button" className="w-full text-xs bg-warn/15 text-warn px-3 py-1.5 text-left flex items-center gap-2" onClick={() => go("settings")}>
          <TriangleAlert />
          <span className="flex-1">
            {sync.state === "off"
              ? "Sincronização desligada: o que fizeres aqui não chega aos outros aparelhos."
              : `Não sincronizou (${sync.message}). Está guardado neste aparelho.`}
          </span>
          <span className="font-semibold shrink-0">{sync.state === "off" ? "Ligar" : "Ver"}</span>
        </button>
      )}
      <main className="pb-nav">
        <ErrorBoundary resetKey={location.hash}>
        {page === "client" ? (
          <ClientPage key={id} id={id} tab={sub} />
        ) : page === "session" ? (
          <SessionPage key={id} id={id} />
        ) : page === "history" ? (
          <HistoryPage key={id + sub} clientId={id} exKey={sub} />
        ) : page === "assessment" ? (
          <AssessmentPage key={id} id={id} />
        ) : page === "evolution" ? (
          <EvolutionPage key={id + sub} clientId={id} testId={sub} />
        ) : page === "progress" ? (
          <ProgressPage key={id} clientId={id} />
        ) : page === "compare" ? (
          <ComparePage key={id + sub + sub2} clientId={id} a={sub} b={sub2} />
        ) : page === "import" ? (
          <ImportPage clientId={id} />
        ) : page === "clients" ? (
          <ClientsPage />
        ) : page === "finance" ? (
          <FinancePage />
        ) : page === "library" ? (
          <LibraryPage view={id} />
        ) : page === "focus" ? (
          <FocusPage />
        ) : page === "settings" ? (
          <SettingsPage />
        ) : (
          <HomePage />
        )}
        </ErrorBoundary>
      </main>
      <Toaster />
      <DialogHost />
      <nav aria-label="Principal" className="fixed bottom-0 inset-x-0 lg:inset-x-auto lg:top-0 lg:left-[max(0px,calc(50vw-28rem))] lg:w-52 bg-card/95 backdrop-blur border-t lg:border-t-0 lg:border-r border-border safe-bottom z-40">
        <div className="max-w-2xl mx-auto flex lg:flex-col lg:gap-1 lg:p-2 lg:pt-4">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => go(k)} className={`flex-1 flex flex-col lg:flex-none lg:flex-row lg:gap-3 lg:px-3 lg:min-h-[44px] lg:rounded-lg items-center py-2 text-xs lg:text-sm font-medium ${tab === k ? "text-accent lg:bg-card2" : "text-muted"}`}>
              <span className="text-lg leading-none relative">
                <Icon />
                {k === "settings" && (sync.state === "off" || sync.state === "error") && (
                  <span className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-warn" />
                )}
                {k === "library" && toReview > 0 && (
                  <span className="absolute -top-1 -right-2 lg:left-3 lg:right-auto min-w-4 h-4 px-1 rounded-full bg-warn text-on-accent text-[10px] font-bold leading-4">{toReview}</span>
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
