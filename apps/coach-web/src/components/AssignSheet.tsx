import { useState } from "react";
import { addDays } from "../lib/agenda";
import { duplicateSession, remove, save } from "../lib/db";
import { useClients } from "../lib/hooks";
import { fmtDate, todayISO } from "../lib/text";
import type { Session } from "../lib/types";
import Sheet, { SheetFooter } from "./Sheet";
import { toast } from "./Toast";

/** The same session for several clients at once: each gets their own copy to adjust. */
export default function AssignSheet({ session, onClose }: { session: Session; onClose: () => void }) {
  const clients = useClients()?.filter((c) => c.id !== session.clientId);
  const [picked, setPicked] = useState<string[]>([]);
  const today = todayISO();
  const [date, setDate] = useState(session.date > today ? session.date : addDays(today, 1));

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const assign = async () => {
    const copies = await Promise.all(picked.map((id) => save("sessions", duplicateSession(session, id, date))));
    onClose();
    toast(`Copiada para ${copies.length} ${copies.length === 1 ? "cliente" : "clientes"} em ${fmtDate(date)}`, () => copies.forEach((c) => void remove("sessions", c.id)));
  };

  return (
    <Sheet title="Copiar para outros clientes" subtitle={session.title || undefined} onClose={onClose}>
      <label className="flex items-center gap-2">
        <span className="label">Dia</span>
        <input type="date" className="input w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      {clients?.length === 0 && <p className="text-sm text-muted">Não há outros clientes.</p>}
      <ul className="flex flex-col divide-y divide-border">
        {clients?.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-3 py-3 font-medium">
              <input type="checkbox" className="w-5 h-5" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.name}
            </label>
          </li>
        ))}
      </ul>
      <SheetFooter>
        <button type="button" className="btn-accent flex-1" disabled={!picked.length} onClick={() => void assign()}>
          Copiar{picked.length ? ` para ${picked.length}` : ""}
        </button>
      </SheetFooter>
    </Sheet>
  );
}
