import { Check, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { PageLoading } from "../components/States";
import Sheet, { Menu } from "../components/Sheet";
import { addDays, agendaFor, daysBetween, isInactive, lastDoneByClient, matchesClient, weekOf, type AgendaEntry, type AgendaStatus } from "../lib/agenda";
import { clearAbsence, completeEntry, markAbsence, prepareSession, registerPayment } from "../lib/agendaActions";
import { WEEKDAYS } from "../lib/balance";
import { groupKey } from "../lib/group";
import { go, useClients, useSessions, useViewState } from "../lib/hooks";
import { saveSessionChange } from "../lib/sessionSave";
import { fmtMoney, fmtMonth, owedMonths } from "../lib/payments";
import { fmtDate, todayISO } from "@treino/core/text";

const STATUS: Record<AgendaStatus, [string, string]> = {
  planned: ["Previsto", "text-muted"],
  prepared: ["Preparada", "text-accent"],
  live: ["A decorrer", "text-warn"],
  done: ["Concluída", "text-success"],
  missed: ["Faltou", "text-danger"],
  cancelled: ["Desmarcou", "text-muted"],
};

/** The day being looked at, so coming back from a session lands on it. */
let shownDay: string | null = null;

const fmtLong = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

const isOpen = (e: AgendaEntry) => e.status === "planned" || e.status === "prepared" || e.status === "live";

/** Each one's session for the day (prepared if there is none yet), started, in one live view. */
async function startGroup(entries: AgendaEntry[], date: string) {
  const ids: string[] = [];
  for (const e of entries) {
    const s = e.session ?? (await prepareSession(e.client.id, date));
    if (!s.startedAt) await saveSessionChange(s, { ...s, startedAt: Date.now() });
    ids.push(s.id);
  }
  go("group", groupKey(ids));
}

const openEntry = async (e: AgendaEntry, date: string) => go("session", e.session?.id ?? (await prepareSession(e.client.id, date)).id);

function EntryRow({ entry, date, today, debt }: { entry: AgendaEntry; date: string; today: string; debt: boolean }) {
  const { client, session, status } = entry;
  const [label, color] = STATUS[status];
  const absent = status === "missed" || status === "cancelled";
  const open = status !== "done" && !absent;
  const details = [session?.title, client.injuries && client.injuries].filter(Boolean).join(" · ");
  return (
    <li className="card flex items-stretch">
      <button type="button" className="flex-1 min-w-0 text-left p-3 active:bg-card2 rounded-l-xl" onClick={() => void openEntry(entry, date)}>
        <span className="flex items-baseline gap-2">
          <span className="font-semibold truncate">{client.name}</span>
          <span className={`text-xs shrink-0 ${color}`}>{label}</span>
          {debt && <span className="text-xs shrink-0 text-warn">por pagar</span>}
        </span>
        {details && <span className="block text-xs text-muted truncate">{details}</span>}
      </button>
      {open && date <= today && (
        <button type="button" className="px-4 border-l border-border text-success text-lg" aria-label={`Marcar sessão de ${client.name} como concluída`} title="Concluída" onClick={() => void completeEntry(entry, date)}>
          <Check />
        </button>
      )}
      {status !== "done" && (
        <Menu
          title={client.name}
          label={`Mais opções de ${client.name}`}
          items={
            absent
              ? [{ label: "Anular", onClick: () => void clearAbsence(client.id, date) }]
              : [
                  date <= today && { label: "Faltou", onClick: () => void markAbsence(entry, date, "missed") },
                  { label: "Desmarcou", onClick: () => void markAbsence(entry, date, "cancelled") },
                  { label: "Ver cliente", onClick: () => go("client", client.id) },
                ]
          }
        />
      )}
    </li>
  );
}

export default function HomePage() {
  const clients = useClients();
  const sessions = useSessions();
  const today = todayISO();
  const [day, setDay] = useState(shownDay ?? today);
  const [q, setQ] = useViewState("q", "");
  const [adding, setAdding] = useState(false);
  const [grouping, setGrouping] = useState(false);

  const pick = (d: string) => {
    shownDay = d;
    setDay(d);
  };

  const week = useMemo(() => weekOf(day), [day]);
  const counts = useMemo(() => week.map((d) => (clients && sessions ? agendaFor(clients, sessions, d).filter((e) => e.status !== "cancelled").length : 0)), [week, clients, sessions]);
  const agenda = useMemo(() => (clients && sessions ? agendaFor(clients, sessions, day) : []), [clients, sessions, day]);
  const owing = useMemo(() => (clients ?? []).map((client) => ({ client, months: owedMonths(client, today) })).filter((o) => o.months.length), [clients, today]);
  const toFollow = useMemo(() => {
    const last = lastDoneByClient(sessions ?? []);
    return (clients ?? [])
      .filter((c) => isInactive(last.get(c.id), today))
      .map((client) => ({ client, last: last.get(client.id) }))
      .sort((a, b) => (a.last ?? "9").localeCompare(b.last ?? "9"));
  }, [clients, sessions, today]);

  if (!clients || !sessions) return <PageLoading title="Hoje" />;

  const found = q.trim() ? clients.filter((c) => matchesClient(c, q)) : null;
  const toDo = agenda.filter((e) => ["planned", "prepared", "live"].includes(e.status)).length;

  return (
    <>
      <PageHeader title={day === today ? "Hoje" : fmtLong(day)} subtitle={day === today ? fmtLong(today) : `${agenda.length} ${agenda.length === 1 ? "cliente" : "clientes"}`} actions={<button type="button" className="btn-accent shrink-0" onClick={() => setAdding(true)}><Plus /> Sessão</button>} />
      <div className="page">
        <input className="input" data-search placeholder="Procurar cliente…" aria-label="Procurar cliente" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && found?.length === 1 && go("client", found[0].id)} />

        {found ? (
          <ul className="card divide-y divide-border">
            {found.map((c) => (
              <li key={c.id}>
                <button type="button" className="row" onClick={() => go("client", c.id)}>
                  {c.name}
                </button>
              </li>
            ))}
            {found.length === 0 && <li className="p-3 text-sm text-muted">Nenhum cliente com esse nome.</li>}
          </ul>
        ) : clients.length === 0 ? (
          <div className="card p-4 flex flex-col gap-2 items-start">
            <p className="text-sm text-muted">Ainda não tens clientes. Depois de criares o primeiro, os treinos do dia aparecem aqui.</p>
            <button type="button" className="btn-accent" onClick={() => go("clients")}>
              Criar cliente
            </button>
          </div>
        ) : (
          <>
            <nav aria-label="Semana" className="flex items-stretch gap-1">
              <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label="Semana anterior" onClick={() => pick(addDays(day, -7))}>
                <ChevronLeft />
              </button>
              {week.map((d, i) => (
                <button key={d} type="button" aria-current={d === day ? "date" : undefined} aria-label={`${fmtLong(d)}, ${counts[i]} previstos`} className={`flex-1 min-w-0 rounded-lg py-1 flex flex-col items-center text-xs border ${d === day ? "bg-accent text-on-accent border-accent font-bold" : d === today ? "border-accent text-accent" : "border-transparent text-muted"}`} onClick={() => pick(d)}>
                  {WEEKDAYS[i]}
                  <span className="text-sm font-semibold">{Number(d.slice(8))}</span>
                  <span className="text-[10px] leading-3 h-3">{counts[i] || ""}</span>
                </button>
              ))}
              <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label="Semana seguinte" onClick={() => pick(addDays(day, 7))}>
                <ChevronRight />
              </button>
            </nav>
            {day !== today && (
              <button type="button" className="text-xs text-accent self-start" onClick={() => pick(today)}>
                Voltar a hoje
              </button>
            )}

            <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="label">{toDo ? `Por fazer: ${toDo}` : "Sessões"}</h2>
                {day === today && toDo >= 2 && (
                  <button type="button" className="btn-ghost text-accent text-sm" onClick={() => setGrouping(true)}>
                    <Users /> Treino de grupo
                  </button>
                )}
              </div>
              {agenda.length === 0 ? (
                <p className="card p-4 text-sm text-muted">Nada previsto para este dia. Os dias de treino de cada cliente definem-se na ficha, em Treino e objetivos.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {agenda.map((e) => (
                    <EntryRow key={e.key} entry={e} date={day} today={today} debt={owing.some((o) => o.client.id === e.client.id)} />
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-4">
            {owing.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <h2 className="label">Pagamentos pendentes</h2>
                  <button type="button" className="text-xs text-accent" onClick={() => go("finance")}>
                    Ver todos <ChevronRight />
                  </button>
                </div>
                <ul className="card divide-y divide-border">
                  {owing.slice(0, 3).map(({ client, months }) => (
                    <li key={client.id} className="flex items-center gap-2 px-3 py-2">
                      <button type="button" className="flex-1 min-w-0 text-left" onClick={() => go("client", client.id, "info")}>
                        <span className="block font-medium truncate">{client.name}</span>
                        <span className="block text-xs text-muted capitalize">
                          {months.map(fmtMonth).join(", ")} · {fmtMoney(months.length * (client.monthlyFee ?? 0))}
                        </span>
                      </button>
                      <button type="button" className="btn shrink-0" onClick={() => void registerPayment(client.id, client.name, months[0])}>
                        Pago
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {toFollow.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="label">A acompanhar</h2>
                <ul className="card divide-y divide-border">
                  {toFollow.slice(0, 5).map(({ client, last }) => (
                    <li key={client.id}>
                      <button type="button" className="row" onClick={() => go("client", client.id)}>
                        <span className="flex-1 min-w-0 font-medium truncate">{client.name}</span>
                        <span className="text-xs text-muted shrink-0">{last ? `há ${daysBetween(last, today)} dias` : "ainda sem treinos"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            </div>
            </div>
          </>
        )}
      </div>

      {grouping && <GroupSheet entries={agenda.filter(isOpen)} date={day} onClose={() => setGrouping(false)} />}

      {adding && (
        <Sheet title="Nova sessão" subtitle={fmtDate(day)} onClose={() => setAdding(false)}>
          {clients.length === 0 && <p className="text-sm text-muted">Ainda não tens clientes.</p>}
          <ul className="flex flex-col -my-2 divide-y divide-border">
            {clients.map((c) => (
              <li key={c.id}>
                <button type="button" className="w-full text-left py-3 font-medium" onClick={() => void prepareSession(c.id, day).then((s) => go("session", s.id))}>
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}

/** Pick who trains together now; everyone still to train today starts ticked. */
function GroupSheet({ entries, date, onClose }: { entries: AgendaEntry[]; date: string; onClose: () => void }) {
  const [picked, setPicked] = useState(() => new Set(entries.map((e) => e.key)));
  const [starting, setStarting] = useState(false);
  const flip = (key: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(key)) n.add(key);
      return n;
    });
  const chosen = entries.filter((e) => picked.has(e.key));
  const start = async () => {
    setStarting(true);
    try {
      await startGroup(chosen, date);
    } finally {
      setStarting(false);
    }
  };
  return (
    <Sheet title="Treino de grupo" subtitle="Cada um segue o seu plano; acompanhas todos no mesmo ecrã." onClose={onClose}>
      <ul className="flex flex-col -my-2 divide-y divide-border">
        {entries.map((e) => (
          <li key={e.key}>
            <label className="flex items-center gap-3 py-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-[rgb(var(--c-accent))]" checked={picked.has(e.key)} onChange={() => flip(e.key)} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">{e.client.name}</span>
                <span className="block text-xs text-muted truncate">{e.session?.title || (e.session ? STATUS[e.status][0] : "Sessão nova, a partir da última")}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-accent h-12 w-full mt-4" disabled={!chosen.length || starting} onClick={() => void start()}>
        Começar com {chosen.length} {chosen.length === 1 ? "pessoa" : "pessoas"}
      </button>
    </Sheet>
  );
}
