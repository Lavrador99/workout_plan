import { useEffect, useState } from "react";
import { exportBackup, importBackup, type Backup } from "../lib/db";
import { useSyncStatus } from "../lib/hooks";
import { currentUser, getConfig, setConfig, signIn, signOut, syncNow } from "../lib/sync";

export default function SettingsPage() {
  const status = useSyncStatus();
  const cfg = getConfig();
  const [url, setUrl] = useState(cfg?.url ?? "");
  const [key, setKey] = useState(cfg?.key ?? "");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void currentUser().then(setUser);
  }, [status]);

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

  const statusText =
    status.state === "off"
      ? "Desligada — os dados ficam só neste dispositivo."
      : status.state === "signed-out"
        ? "Configurada — falta entrar."
        : status.state === "syncing"
          ? "A sincronizar…"
          : status.state === "error"
            ? `Erro: ${status.message}`
            : `Sincronizado${status.at ? ` às ${new Date(status.at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}` : ""}.`;

  return (
    <div className="flex flex-col gap-4 p-3 pb-28">
      <section className="card p-3 flex flex-col gap-2">
        <h2 className="font-bold">Sincronização (telemóvel ↔ PC)</h2>
        <p className={`text-sm ${status.state === "error" ? "text-danger" : "text-muted"}`}>{statusText}</p>

        {status.state === "off" && (
          <>
            <p className="text-xs text-muted">
              Cria um projeto grátis em supabase.com (região UE), corre o ficheiro <code>supabase.sql</code> no SQL Editor e cola aqui o Project URL e a chave
              "anon public" (Settings → API).
            </p>
            <input className="input" placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
            <input className="input" placeholder="anon public key" value={key} onChange={(e) => setKey(e.target.value)} />
            <button type="button" className="btn-accent" disabled={!url || !key} onClick={() => setConfig({ url: url.trim(), key: key.trim() })}>
              Guardar
            </button>
          </>
        )}

        {status.state === "signed-out" && (
          <>
            <input className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="palavra-passe" value={pass} onChange={(e) => setPass(e.target.value)} />
            <div className="flex gap-2">
              <button type="button" className="btn-accent flex-1" onClick={async () => setMsg((await signIn(email, pass)) ?? "")}>
                Entrar
              </button>
              <button type="button" className="btn flex-1" onClick={async () => setMsg((await signIn(email, pass, true)) ?? "Conta criada. Se o Supabase pedir, confirma o email e depois entra.")}>
                Criar conta
              </button>
            </div>
            <button type="button" className="btn-ghost text-muted self-start" onClick={() => setConfig(null)}>
              Alterar projeto
            </button>
          </>
        )}

        {(status.state === "idle" || status.state === "syncing" || status.state === "error") && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm">{user}</span>
            <button type="button" className="btn-accent ml-auto" onClick={() => void syncNow()}>
              Sincronizar agora
            </button>
            <button type="button" className="btn" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        )}
        {msg && <p className="text-sm text-accent2">{msg}</p>}
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
  );
}
