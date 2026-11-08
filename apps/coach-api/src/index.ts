// ─────────────────────────────────────────────────────────────────────────────
// Coach sync API.
//   GET  /sync?since=<seq>  → records written after <seq>, oldest first (coach)
//   POST /sync {rows}       → upsert; a row only replaces a newer-or-equal one (coach)
//   POST /live/ops {ops}    → small changes to live sessions (coach, client)
// The coach's key is SYNC_TOKEN; clients and screens have keys of their own in
// the `access` table (only their hash). The app keeps everything locally; this
// is the meeting point between the coach's devices, the clients and screens.
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from "hono";
import { cors } from "hono/cors";
import { applyOps, parseOp, type LiveOp } from "@treino/core/ops";
import type { Session } from "@treino/core/types";

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

const MAX_OPS = 200;
const RETRIES = 3;

/** Who is calling, from their key. */
type Who = { role: "coach" } | { role: "client"; clientId: string };

const app = new Hono<{ Bindings: Env; Variables: { who: Who } }>();

// Token auth carries no cookies, so any origin may call (the app runs on GitHub Pages and localhost).
app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "OPTIONS"] }));

app.get("/", (c) => c.json({ ok: true, app: "coach-api" }));

function sameToken(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The caller's role, or null for a wrong or revoked key. */
async function identify(env: Env, token: string): Promise<Who | null> {
  if (!token) return null;
  if (sameToken(token, env.SYNC_TOKEN ?? "")) return { role: "coach" };
  const row = await env.DB.prepare("SELECT role, client_id FROM access WHERE token_hash = ? AND revoked = 0")
    .bind(await sha256(token))
    .first<{ role: string; client_id: string | null }>();
  if (row?.role === "client" && row.client_id) return { role: "client", clientId: row.client_id };
  return null; // screens never write: none of these routes is theirs
}

const bearer = (h: string | undefined) => h?.replace(/^Bearer\s+/i, "") ?? "";

app.use("/sync", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  if (!sameToken(bearer(c.req.header("Authorization")), c.env.SYNC_TOKEN ?? "")) return c.json({ error: "Chave inválida" }, 401);
  return next();
});

app.use("/live/*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  const who = await identify(c.env, bearer(c.req.header("Authorization")));
  if (!who) return c.json({ error: "Chave inválida" }, 401);
  c.set("who", who);
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
    `INSERT INTO records (id, kind, data, updated_at, deleted, seq, client_id)
     VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(seq), 0) + 1 FROM records), ?6)
     ON CONFLICT(id) DO UPDATE SET
       kind = excluded.kind, data = excluded.data, updated_at = excluded.updated_at,
       deleted = excluded.deleted, seq = excluded.seq, client_id = excluded.client_id
     WHERE excluded.updated_at >= records.updated_at`,
  );
  const clientOf = (data: unknown) => {
    const id = (data as { clientId?: unknown }).clientId;
    return typeof id === "string" ? id : null;
  };
  const res = await c.env.DB.batch(
    rows.map((r) => stmt.bind(r.id, r.kind, JSON.stringify(r.data), r.updated_at, r.deleted ? 1 : 0, clientOf(r.data))),
  );
  const written = res.reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  return c.json({ ok: true, written });
});

/**
 * Apply ops to live sessions, set by set (see libs/training-core/src/ops.ts):
 * two people ticking different sets of the same session never undo each
 * other. The session is then saved with a new seq and updated_at, so the
 * coach's normal /sync pulls the result. A client may only touch their own
 * sessions; a session of someone else answers as not found.
 */
app.post("/live/ops", async (c) => {
  const who = c.get("who");
  const body = await c.req.json<{ ops?: unknown[] }>().catch(() => null);
  if (!Array.isArray(body?.ops)) return c.json({ error: "ops em falta" }, 400);
  if (body.ops.length > MAX_OPS) return c.json({ error: `máximo ${MAX_OPS} por pedido` }, 413);
  const ops: LiveOp[] = [];
  for (const raw of body.ops) {
    const op = parseOp(raw);
    if (!op) return c.json({ error: "op inválida" }, 400);
    ops.push(op);
  }

  // by session, keeping each sender's order (an addSet before the sets it makes)
  const bySession = new Map<string, LiveOp[]>();
  for (const op of ops) bySession.set(op.sessionId, [...(bySession.get(op.sessionId) ?? []), op]);

  const sessions: { id: string; updated_at: number }[] = [];
  const rejected: { id: string; error: "not_found" | "busy" }[] = [];
  for (const [id, list] of bySession) {
    let done = false;
    // optimistic: write only if nobody wrote the session since it was read, else read again
    for (let attempt = 0; attempt < RETRIES && !done; attempt++) {
      const row = await c.env.DB.prepare("SELECT data, updated_at, deleted, seq, client_id FROM records WHERE id = ? AND kind = 'session'")
        .bind(id)
        .first<{ data: string; updated_at: number; deleted: number; seq: number; client_id: string | null }>();
      if (!row || row.deleted || (who.role === "client" && row.client_id !== who.clientId)) {
        rejected.push({ id, error: "not_found" });
        done = true;
        break;
      }
      const before = JSON.parse(row.data) as Session;
      const after = applyOps(before, list);
      if (after === before) {
        sessions.push({ id, updated_at: row.updated_at });
        done = true;
        break;
      }
      const updatedAt = Math.max(Date.now(), row.updated_at + 1);
      const res = await c.env.DB.prepare(
        `UPDATE records SET data = ?1, updated_at = ?2, seq = (SELECT COALESCE(MAX(seq), 0) + 1 FROM records)
         WHERE id = ?3 AND seq = ?4`,
      )
        .bind(JSON.stringify({ ...after, updatedAt }), updatedAt, id, row.seq)
        .run();
      if (res.meta.changes) {
        sessions.push({ id, updated_at: updatedAt });
        done = true;
      }
    }
    if (!done) rejected.push({ id, error: "busy" });
  }
  return c.json({ ok: true, sessions, rejected });
});

export default app;
