import { toast } from "../components/Toast";
import type { AgendaEntry } from "./agenda";
import { db, duplicateSession, newSession, patchClient, remove, save } from "./db";
import { fmtMonth, newPayment } from "./payments";
import { todayISO } from "./text";
import type { Absence } from "./types";

// One tap, done, with a way back in the toast. Each writes on the stored record.

async function latestSession(clientId: string) {
  const list = (await db.sessions.where("clientId").equals(clientId).toArray()).filter((s) => !s.deleted);
  return list.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)[0];
}

/** A session for that day: the client's last one again, or a blank one. */
export async function prepareSession(clientId: string, date: string) {
  const last = await latestSession(clientId);
  return save("sessions", last ? duplicateSession(last, clientId, date) : { ...newSession(clientId), date });
}

export async function completeEntry(e: AgendaEntry, date: string) {
  const name = e.client.name;
  await clearAbsence(e.client.id, date);
  if (e.session) {
    const s = await save("sessions", { ...e.session, endedAt: Date.now() });
    return toast(`${name}: sessão concluída`, () => void save("sessions", { ...s, endedAt: null }));
  }
  const s = await prepareSession(e.client.id, date);
  await save("sessions", { ...s, endedAt: Date.now() });
  toast(`${name}: sessão concluída`, () => void remove("sessions", s.id));
}

export const clearAbsence = (clientId: string, date: string) => patchClient(clientId, (c) => ({ absences: c.absences?.filter((a) => a.date !== date) }));

export async function markAbsence(e: AgendaEntry, date: string, kind: Absence["kind"]) {
  await patchClient(e.client.id, (c) => ({ absences: [...(c.absences ?? []).filter((a) => a.date !== date), { date, kind }] }));
  toast(`${e.client.name}: ${kind === "missed" ? "faltou" : "desmarcou"}`, () => void clearAbsence(e.client.id, date));
}

export async function registerPayment(clientId: string, name: string, month: string) {
  let id = "";
  await patchClient(clientId, (c) => {
    const p = newPayment(c, month, todayISO());
    id = p.id;
    return { payments: [...(c.payments ?? []), p] };
  });
  toast(`${name}: ${fmtMonth(month)} pago`, () => void patchClient(clientId, (c) => ({ payments: c.payments?.filter((p) => p.id !== id) })));
}
