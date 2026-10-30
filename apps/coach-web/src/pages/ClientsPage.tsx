import { useState } from "react";
import { newClient, save } from "../lib/db";
import { go, useClients, useSessions } from "../lib/hooks";
import { fmtDate, norm } from "../lib/text";

export default function ClientsPage() {
  const clients = useClients();
  const sessions = useSessions();
  const [q, setQ] = useState("");

  const last = new Map<string, string>();
  for (const s of sessions ?? []) if (!last.has(s.clientId)) last.set(s.clientId, s.date);

  const list = (clients ?? []).filter((c) => norm(c.name).includes(norm(q)));

  const add = async () => {
    const name = q.trim() || prompt("Nome do cliente")?.trim();
    if (!name) return;
    const c = await save("clients", newClient(name));
    go("client", c.id);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex gap-2">
        <input className="input" placeholder="Procurar ou novo cliente…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && list.length === 0 && add()} />
        <button type="button" className="btn-accent shrink-0" onClick={add}>
          + Cliente
        </button>
      </div>
      {clients && clients.length === 0 && (
        <div className="card p-4 text-sm text-muted">
          Ainda não tens clientes. Escreve um nome e carrega em <b>+ Cliente</b>. Depois podes colar o histórico de treinos dele em <b>Importar</b>.
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className="card w-full text-left p-3 flex items-center gap-3 active:bg-card2" onClick={() => go("client", c.id)}>
              <span className="w-10 h-10 rounded-full bg-card2 flex items-center justify-center font-bold text-accent">{c.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{c.name}</span>
                {c.injuries && <span className="block text-xs text-danger truncate">⚠ {c.injuries}</span>}
              </span>
              <span className="text-xs text-muted">{last.has(c.id) ? fmtDate(last.get(c.id)!) : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
