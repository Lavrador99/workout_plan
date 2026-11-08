/** Lowercase, no accents, single spaces: used for search and for matching names. */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+/]+/g, " ")
    .trim();
}

export function uid(): string {
  return crypto.randomUUID();
}

/** "47,5" → 47.5 */
export function num(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** 47.5 → "47,5" */
export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "";
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-10-30" → "30/10/2026" */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** 90 → "1:30", 40 → "40s" */
export function fmtSec(s: number | null | undefined): string {
  if (s == null) return "";
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}:${String(r).padStart(2, "0")}` : `${m}min`;
  }
  return `${s}s`;
}
