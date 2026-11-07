import { uid } from "./text";
import type { Client, Payment } from "./types";

// Operational view only: who has paid what, month by month. Not accounting.

export const monthKey = (iso: string) => iso.slice(0, 7);

/** The next month after a YYYY-MM. */
function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Months owed up to today's, oldest first. */
export function owedMonths(c: Pick<Client, "monthlyFee" | "feeFrom" | "payments">, today: string): string[] {
  if (!c.monthlyFee) return [];
  const paid = new Set(c.payments?.map((p) => p.month));
  const last = monthKey(today);
  const owed: string[] = [];
  for (let m = c.feeFrom ?? last; m <= last; m = nextMonth(m)) if (!paid.has(m)) owed.push(m);
  return owed;
}

/** Taking the fee away also forgets where it started, so setting a new one owes nothing old. */
export function setFee(c: Pick<Client, "feeFrom">, fee: number | null, today: string): Pick<Client, "monthlyFee" | "feeFrom"> {
  return fee ? { monthlyFee: fee, feeFrom: c.feeFrom ?? monthKey(today) } : { monthlyFee: null, feeFrom: null };
}

export function newPayment(c: Pick<Client, "monthlyFee">, month: string, today: string): Payment {
  return { id: uid(), month, date: today, amount: c.monthlyFee ?? 0 };
}

/** Everything received in a month, whichever month it covers. */
export const receivedIn = (clients: Pick<Client, "payments">[], month: string) =>
  clients.reduce((sum, c) => sum + (c.payments ?? []).filter((p) => monthKey(p.date) === month).reduce((s, p) => s + p.amount, 0), 0);

export const fmtMoney = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);

/** "2026-11" → "novembro" */
export const fmtMonth = (month: string) => new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-PT", { month: "long" });
