// ─────────────────────────────────────────────────────────────────────────────
// Coach sync API. Two endpoints, protected by one secret token (single user):
//   GET  /sync?since=<seq>  → records written after <seq>, oldest first
//   POST /sync {rows}       → upsert; a row only replaces a newer-or-equal one
// The app keeps everything locally; this is just the meeting point between
// the coach's devices.
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
  DB: D1Database;
  SYNC_TOKEN: string;
}

interface Row {
  id: string;
  kind: string;
  data: unknown;
  updated_at: number;
  deleted: boolean;
}

const KINDS = new Set(["client", "exercise", "session", "template", "focus", "test", "assessment", "goal", "snapshot"]);
const PAGE = 500;
const MAX_PUSH = 200;

const app = new Hono<{ Bindings: Env }>();

// Token auth carries no cookies, so any origin may call (the app runs on GitHub Pages and localhost).
app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "OPTIONS"] }));

app.get("/", (c) => c.json({ ok: true, app: "coach-api" }));

function sameToken(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

app.use("/sync", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!sameToken(token, c.env.SYNC_TOKEN ?? "")) return c.json({ error: "Chave inválida" }, 401);
  return next();
});

app.get("/sync", async (c) => {
  const since = Number(c.req.query("since") ?? 0) || 0;
  const { results } = await c.env.DB.prepare(
    "SELECT id, kind, data, updated_at, deleted, seq FROM records WHERE seq > ? ORDER BY seq LIMIT ?",
  )
    .bind(since, PAGE)
    .all<{ id: string; kind: string; data: string; updated_at: number; deleted: number; seq: number }>();
  const rows = results.map((r) => ({ ...r, data: JSON.parse(r.data), deleted: !!r.deleted }));
  return c.json({ rows, more: rows.length === PAGE });
});

app.post("/sync", async (c) => {
  const body = await c.req.json<{ rows?: Row[] }>().catch(() => null);
  const rows = body?.rows;
  if (!Array.isArray(rows)) return c.json({ error: "rows em falta" }, 400);
  if (rows.length > MAX_PUSH) return c.json({ error: `máximo ${MAX_PUSH} por pedido` }, 413);
  for (const r of rows) {
    if (typeof r?.id !== "string" || !KINDS.has(r.kind) || typeof r.updated_at !== "number" || r.data == null)
      return c.json({ error: `registo inválido: ${String(r?.id)}` }, 400);
  }
  if (!rows.length) return c.json({ ok: true, written: 0 });

  // Each write takes the next seq; last-write-wins on updated_at.
  const stmt = c.env.DB.prepare(
    `INSERT INTO records (id, kind, data, updated_at, deleted, seq)
     VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(seq), 0) + 1 FROM records))
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind, data = excluded.data, updated_at = excluded.updated_at,
       deleted = excluded.deleted, seq = excluded.seq
     WHERE excluded.updated_at >= records.updated_at`,
  );
  const res = await c.env.DB.batch(rows.map((r) => stmt.bind(r.id, r.kind, JSON.stringify(r.data), r.updated_at, r.deleted ? 1 : 0)));
  const written = res.reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  return c.json({ ok: true, written });
});

export default app;
