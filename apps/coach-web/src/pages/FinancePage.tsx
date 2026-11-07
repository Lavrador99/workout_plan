import { Check } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../components/PageHeader";
import { PageLoading } from "../components/States";
import { registerPayment } from "../lib/agendaActions";
import { isDone, plannedSessions } from "../lib/balance";
import { patchClient } from "../lib/db";
import { go, useClients, useSessions } from "../lib/hooks";
import { fmtMoney, fmtMonth, monthKey, owedMonths, receivedIn, setFee } from "../lib/payments";
import { num, todayISO } from "../lib/text";
import type { Client } from "../lib/types";

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-3 min-w-0">
      <div className="label truncate">{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

/** Typed straight in the list; stored when it loses focus. */
function FeeInput({ client, today }: { client: Client; today: string }) {
  return (
    <input
      className="input w-24 shrink-0 text-right"
      inputMode="decimal"
      placeholder="€/mês"
      aria-label={`Mensalidade de ${client.name}`}
      defaultValue={client.monthlyFee ?? ""}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onBlur={(e) => {
        const fee = num(e.target.value);
        if (fee !== (client.monthlyFee ?? null)) void patchClient(client.id, (c) => setFee(c, fee, today));
      }}
    />
  );
}

export default function FinancePage() {
  const clients = useClients();
  const sessions = useSessions();
  const today = todayISO();
  const month = monthKey(today);

  const rows = useMemo(() => {
    const doneThisMonth = new Map<string, number>();
    for (const s of sessions ?? []) if (monthKey(s.date) === month && s.date <= today && isDone(s)) doneThisMonth.set(s.clientId, (doneThisMonth.get(s.clientId) ?? 0) + 1);
    return (clients ?? []).map((client) => ({
      client,
      owed: owedMonths(client, today),
      done: doneThisMonth.get(client.id) ?? 0,
      planned: plannedSessions(client, `${month}-01`, today).count,
    }));
  }, [clients, sessions, month, today]);

  if (!clients) return <PageLoading title="Finanças" />;

  const owing = rows.filter((r) => r.owed.length);
  const upToDate = rows.filter((r) => r.client.monthlyFee && !r.owed.length);
  const noFee = rows.filter((r) => !r.client.monthlyFee);
  const pending = owing.reduce((sum, r) => sum + r.owed.length * (r.client.monthlyFee ?? 0), 0);
  const sessionsText = (r: (typeof rows)[number]) => `${r.done}${r.planned ? ` de ${r.planned}` : ""} ${(r.planned || r.done) === 1 ? "sessão" : "sessões"}`;

  return (
    <>
      <PageHeader title="Finanças" subtitle={<span className="capitalize">{fmtMonth(month)}</span>} />
      <div className="page">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Recebido" value={fmtMoney(receivedIn(clients, month))} />
          <Stat label="Por receber" value={fmtMoney(pending)} tone={pending ? "text-warn" : ""} />
          <Stat label="Mensal" value={fmtMoney(rows.reduce((sum, r) => sum + (r.client.monthlyFee ?? 0), 0))} />
        </div>

        {clients.length === 0 && <p className="card p-4 text-sm text-muted">Sem clientes ainda. As mensalidades definem-se aqui ou na ficha de cada cliente.</p>}

        {owing.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="label">Por pagar</h2>
            <ul className="card divide-y divide-border">
              {owing.map((r) => (
                <li key={r.client.id} className="flex items-center gap-2 px-3 py-2">
                  <button type="button" className="flex-1 min-w-0 text-left" onClick={() => go("client", r.client.id, "info")}>
                    <span className="block font-medium truncate">{r.client.name}</span>
                    <span className="block text-xs text-muted truncate">
                      <span className="capitalize">{r.owed.map(fmtMonth).join(", ")}</span> · {fmtMoney(r.owed.length * (r.client.monthlyFee ?? 0))} · {sessionsText(r)}
                    </span>
                  </button>
                  <button type="button" className="btn shrink-0" aria-label={`Registar pagamento de ${r.client.name}`} onClick={() => void registerPayment(r.client.id, r.client.name, r.owed[0])}>
                    Pago
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {upToDate.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="label">Em dia</h2>
            <ul className="card divide-y divide-border">
              {upToDate.map((r) => (
                <li key={r.client.id}>
                  <button type="button" className="row" onClick={() => go("client", r.client.id, "info")}>
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{r.client.name}</span>
                      <span className="block text-xs text-muted">{sessionsText(r)}</span>
                    </span>
                    <span className="text-sm text-success shrink-0"><Check /> {fmtMoney(r.client.monthlyFee ?? 0)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {noFee.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="label">Sem mensalidade</h2>
            <ul className="card divide-y divide-border">
              {noFee.map((r) => (
                <li key={r.client.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 min-w-0 font-medium truncate">{r.client.name}</span>
                  <FeeInput client={r.client} today={today} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
