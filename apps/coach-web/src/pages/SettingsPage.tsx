import { ask } from "../components/Dialogs";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Seg from "../components/Seg";
import { InstallCard } from "../components/PwaBanners";
import { exportBackup, importBackup, type Backup } from "../lib/db";
import { useSyncStatus } from "../lib/hooks";
import { usePwa } from "../lib/pwa";
import { getConfig, setConfig, syncNow, testConnection } from "../lib/sync";
import { getTheme, setTheme, THEMES, type Theme } from "../lib/theme";

export default function SettingsPage() {
  const status = useSyncStatus();
  const pwa = usePwa();
  const cfg = getConfig();
  const [url, setUrl] = useState(cfg?.url ?? "");
  const [token, setToken] = useState(cfg?.token ?? "");
  const [editing, setEditing] = useState(!cfg);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [theme, pickTheme] = useState(getTheme);

  const download = async () => {
    const b = await exportBackup();
    const blob = new Blob([JSON.stringify(b)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coach-backup-${b.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (f: File | undefined) => {
    if (!f) return;
    try {
      const b = JSON.parse(await f.text()) as Backup;
      if (b.app !== "coach") throw new Error("Ficheiro não é um backup desta app.");
      setMsg(`${await importBackup(b)} registos importados.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const connect = async () => {
    setBusy(true);
    setMsg("");
    const err = await testConnection({ url, token });
    setBusy(false);
    if (err) return setMsg(`Não ligou: ${err}`);
    await setConfig({ url, token });
    setEditing(false);
    setMsg("Ligado. A enviar os dados deste dispositivo…");
  };

  const statusText =
    status.state === "off"
      ? "Desligada — os dados ficam só neste dispositivo."
      : status.state === "syncing"
        ? "A sincronizar…"
        : status.state === "error"
          ? `Erro: ${status.message}`
          : `Sincronizado${status.at ? ` às ${new Date(status.at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : ""}.`;

  return (
    <>
    <PageHeader title="Definições" />
    <div className="page">
      <section className="card p-3 flex flex-col gap-2">
        <h2 className="font-bold">Sincronização (telemóvel ↔ PC)</h2>
        <p className={`text-sm ${status.state === "error" ? "text-danger" : "text-muted"}`}>{statusText}</p>

        {editing ? (
          <>
            <p className="text-xs text-muted">
              Cola o endereço da tua API e a chave que o <code>npm run deploy:api</code> mostrou no fim. Usa os mesmos no telemóvel e no PC.
            </p>
            <input className="input" placeholder="https://coach-api.<conta>.workers.dev" inputMode="url" autoCapitalize="off" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input className="input font-mono" placeholder="chave" autoCapitalize="off" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-accent flex-1" disabled={!url.trim() || !token.trim() || busy} onClick={connect}>
                {busy ? "A testar…" : "Ligar"}
              </button>
              {cfg && (
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted truncate max-w-full">{cfg?.url}</span>
            <button type="button" className="btn-accent ml-auto" onClick={() => void syncNow()}>
              Sincronizar agora
            </button>
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              Alterar
            </button>
            <button
              type="button"
              className="btn text-danger"
              onClick={async () => {
                if ((await ask("Desligar a sincronização neste dispositivo? Os dados ficam cá."))) {
                  void setConfig(null);
                  setEditing(true);
                }
              }}
            >
              Desligar
            </button>
          </div>
        )}
        {msg && <p className="text-sm text-accent">{msg}</p>}
      </section>

      <section className="card p-3 flex flex-col gap-2">
        <h2 className="font-bold">Aspeto</h2>
        <Seg
          options={THEMES}
          value={theme}
          onChange={(v) => {
            setTheme(v as Theme);
            pickTheme(v as Theme);
          }}
        />
      </section>

      <InstallCard />

      <section className="card p-3 flex flex-col gap-1 text-sm">
        <h2 className="font-bold mb-1">App</h2>
        <div className="flex justify-between">
          <span className="text-muted">Instalada</span>
          <span>{pwa.installed ? "sim" : "não"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Dados protegidos pelo browser</span>
          <span className={pwa.persisted === false && status.state === "off" ? "text-danger" : ""}>{pwa.persisted == null ? "…" : pwa.persisted ? "sim" : "não"}</span>
        </div>
        {pwa.persisted === false && status.state === "off" && (
          <p className="text-xs text-muted">O browser pode apagar dados de sites pouco usados. Instalar a app e ligar a sincronização evita perdas.</p>
        )}
      </section>

      <section className="card p-3 flex flex-col gap-2">
        <h2 className="font-bold">Cópia de segurança</h2>
        <p className="text-xs text-muted">Descarrega tudo num ficheiro .json. Importar junta os dados (o mais recente ganha), não apaga nada.</p>
        <div className="flex gap-2">
          <button type="button" className="btn flex-1" onClick={download}>
            Descarregar backup
          </button>
          <label className="btn flex-1 cursor-pointer">
            Importar backup
            <input type="file" accept="application/json" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          </label>
        </div>
      </section>
    </div>
    </>
  );
}
