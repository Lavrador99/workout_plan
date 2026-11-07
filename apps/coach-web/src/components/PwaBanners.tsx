import { X } from "lucide-react";
import { useState } from "react";
import { applyUpdate, isIOS, promptInstall, usePwa } from "../lib/pwa";

const DISMISS_KEY = "coach_install_dismissed";

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Nova versão disponível" — the update waits until the coach taps it. */
export function UpdateBar() {
  const { updateReady } = usePwa();
  if (!updateReady) return null;
  return (
    <div className="flex items-center gap-2 bg-accent2/15 text-accent text-sm px-3 py-2">
      <span className="flex-1">Nova versão disponível.</span>
      <button type="button" className="btn-accent min-h-[40px]" onClick={() => void applyUpdate()}>
        Atualizar
      </button>
    </div>
  );
}

/** How to install, for this browser. `compact` = dismissible card on the home screen. */
export function InstallCard({ compact = false }: { compact?: boolean }) {
  const { installed, installEvent } = usePwa();
  const [hidden, setHidden] = useState(compact && dismissed());
  if (installed || hidden) return null;
  const ios = isIOS();
  if (compact && !installEvent && !ios) return null;

  const hide = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* fine: shows again next time */
    }
    setHidden(true);
  };

  return (
    <div className="card p-3 flex flex-col gap-2 border-accent/40">
      <div className="flex items-start gap-3">
        <img src="icons/icon-192.png" alt="" className="w-10 h-10 rounded-lg" />
        <div className="flex-1 text-sm">
          <div className="font-semibold">Instalar a app</div>
          {installEvent ? (
            <div className="text-muted">Abre como app, em ecrã inteiro, e funciona sem rede no ginásio.</div>
          ) : ios ? (
            <div className="text-muted">
              No Safari: toca em <b>Partilhar</b> <span aria-hidden>⎋</span> e depois em <b>Adicionar ao ecrã principal</b>.
            </div>
          ) : (
            <div className="text-muted">No menu do browser, escolhe <b>Instalar app</b> ou <b>Adicionar ao ecrã principal</b>.</div>
          )}
        </div>
        {compact && (
          <button type="button" className="text-muted px-1" onClick={hide} aria-label="Fechar">
            <X />
          </button>
        )}
      </div>
      {installEvent && (
        <button type="button" className="btn-accent" onClick={() => void promptInstall()}>
          Instalar
        </button>
      )}
    </div>
  );
}
