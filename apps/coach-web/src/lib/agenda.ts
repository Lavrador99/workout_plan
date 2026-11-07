import { currentDays, isDone } from "./balance";
import { norm } from "./text";
import type { Absence, Client, Session } from "./types";

// What a day looks like for the coach, worked out from what is already stored:
// the planned week of each client, their sessions and their absences.

/** No finished session for this long: the client needs a word. */
export const INACTIVE_DAYS = 14;

export type AgendaStatus = "planned" | "prepared" | "live" | "done" | Absence["kind"];

export interface AgendaEntry {
  key: string;
  client: Client;
  session?: Session;
  status: AgendaStatus;
}

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const noon = (iso: string) => new Date(`${iso}T12:00:00`);

export function addDays(iso: string, days: number): string {
  const d = noon(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** 0 = Monday … 6 = Sunday, as in the client's schedule. */
export const weekdayOf = (iso: string) => (noon(iso).getDay() + 6) % 7;

/** The seven days, Monday first, of the week holding `iso`. */
export function weekOf(iso: string): string[] {
  const monday = addDays(iso, -weekdayOf(iso));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const daysBetween = (from: string, to: string) => Math.round((noon(to).getTime() - noon(from).getTime()) / 86_400_000);

function statusOf(s: Session, absence?: Absence): AgendaStatus {
  if (s.endedAt != null) return "done";
  if (s.startedAt != null) return "live";
  if (isDone(s)) return "done";
  return absence?.kind ?? "prepared";
}

const ORDER: AgendaStatus[] = ["live", "prepared", "planned", "done", "missed", "cancelled"];

/** Everyone expected on a date, and how each one went. */
export function agendaFor(clients: Client[], sessions: Session[], date: string): AgendaEntry[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const entries: AgendaEntry[] = [];
  const seen = new Set<string>();
  for (const s of sessions) {
    const client = byId.get(s.clientId);
    if (s.date !== date || s.deleted || !client) continue;
    seen.add(client.id);
    entries.push({ key: s.id, client, session: s, status: statusOf(s, client.absences?.find((a) => a.date === date)) });
  }
  for (const client of clients) {
    if (seen.has(client.id)) continue;
    const absence = client.absences?.find((a) => a.date === date);
    if (absence) entries.push({ key: client.id, client, status: absence.kind });
    else if (currentDays(client, date).includes(weekdayOf(date))) entries.push({ key: client.id, client, status: "planned" });
  }
  return entries.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.client.name.localeCompare(b.client.name, "pt"));
}

/** The date of the most recent finished session of each client. */
export function lastDoneByClient(sessions: Session[]): Map<string, string> {
  const last = new Map<string, string>();
  for (const s of sessions) {
    if (s.deleted || !isDone(s)) continue;
    const cur = last.get(s.clientId);
    if (!cur || s.date > cur) last.set(s.clientId, s.date);
  }
  return last;
}

/** Trained too long ago, or never. */
export const isInactive = (last: string | undefined, today: string) => !last || daysBetween(last, today) >= INACTIVE_DAYS;

/** The next day the client is expected, from today on, within two weeks. */
export function nextTraining(client: Client, sessions: Session[], today: string): string | null {
  const dated = new Map(sessions.filter((s) => s.clientId === client.id && !s.deleted && s.date >= today).map((s) => [s.date, s]));
  const absent = new Set(client.absences?.map((a) => a.date));
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const s = dated.get(date);
    if (absent.has(date) || (s && isDone(s))) continue;
    if (s || currentDays(client, date).includes(weekdayOf(date))) return date;
  }
  return null;
}

/** Search by anything the coach might remember a client by. */
export const matchesClient = (c: Pick<Client, "name" | "phone" | "email">, q: string) => {
  const n = norm(q);
  return [c.name, c.phone, c.email].some((v) => v && norm(v).includes(n));
};
