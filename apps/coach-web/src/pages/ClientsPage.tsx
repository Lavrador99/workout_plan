import { TriangleAlert } from "lucide-react";
import { askText } from "../components/Dialogs";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { InstallCard } from "../components/PwaBanners";
import { newClient, save } from "../lib/db";
import { go, useClients, useSessions } from "../lib/hooks";
import PageHeader from "../components/PageHeader";
import { isInactive, lastDoneByClient, matchesClient, nextTraining } from "../lib/agenda";
import { owedMonths } from "../lib/payments";
import { fmtDate, todayISO } from "../lib/text";

const FILTERS = [
  ["all", "Todos"],
  ["inactive", "Inativos"],
  ["owing", "Por pagar"],
  ["injured", "Com lesão"],
] as const;
type Filter = (typeof FILTERS)[number][0];

export default function ClientsPage() {
  const clients = useClients();
  const sessions = useSessions();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayISO();

  const rows = useMemo(() => {
    const last = lastDoneByClient(sessions ?? []);
    return (clients ?? []).map((c) => ({
      c,
      last: last.get(c.id),
      next: nextTraining(c, sessions ?? [], today),
      inactive: isInactive(last.get(c.id), today),
      owing: owedMonths(c, today).length > 0,
    }));
  }, [clients, sessions, today]);

  const counts: Record<Filter, number> = {
    all: rows.length,
    inactive: rows.filter((r) => r.inactive).length,
    owing: rows.filter((r) => r.owing).length,
    injured: rows.filter((r) => r.c.injuries).length,
  };
  const passes = (r: (typeof rows)[number]) => (filter === "all" ? true : filter === "injured" ? !!r.c.injuries : r[filter]);
  const list = rows.filter((r) => passes(r) && matchesClient(r.c, q));

  const add = async () => {
    const name = q.trim() || (await askText("Nome do cliente"))?.trim();
    if (!name) return;
    const c = await save("clients", newClient(name));
    go("client", c.id);
  };

  return (
    <>
    <PageHeader title="Clientes" />
    <div className="page">
      <div className="flex gap-2">
        <input className="input" data-search aria-label="Procurar ou novo cliente" placeholder="Nome, telefone, email ou novo cliente…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && list.length === 0 && add()} />
        <button type="button" className="btn-accent shrink-0" onClick={add}>
          <Plus /> Cliente
        </button>
      </div>
      <InstallCard compact />
      {rows.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} className={`chip ${filter === k ? "chip-on" : ""}`} onClick={() => setFilter(k)}>
              {label} {counts[k] > 0 && k !== "all" ? counts[k] : ""}
            </button>
          ))}
        </div>
      )}
      {rows.length > 0 && list.length === 0 && <p className="card p-4 text-sm text-muted">Nenhum cliente encontrado.</p>}
      {clients && clients.length === 0 && (
        <div className="card p-4 text-sm text-muted">
          Ainda não tens clientes. Escreve um nome e carrega em <b>+ Cliente</b>. Depois podes colar o histórico de treinos dele em <b>Importar</b>.
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {list.map(({ c, last, next, inactive, owing }) => (
          <li key={c.id}>
            <button type="button" className="card w-full text-left p-3 flex items-center gap-3 active:bg-card2" onClick={() => go("client", c.id)}>
              <span className="w-10 h-10 rounded-full bg-card2 flex items-center justify-center font-bold text-accent shrink-0">{c.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold truncate">{c.name}</span>
                <span className="block text-xs text-muted truncate">{next ? `Próximo: ${next === today ? "hoje" : fmtDate(next)}` : "Sem próximo treino"}{last ? ` · último ${fmtDate(last)}` : ""}</span>
                {c.injuries && <span className="block text-xs text-danger truncate"><TriangleAlert /> {c.injuries}</span>}
              </span>
              <span className="flex flex-col items-end gap-1 text-xs shrink-0">
                {owing && <span className="text-warn">Por pagar</span>}
                {inactive && <span className="text-muted">Inativo</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}
