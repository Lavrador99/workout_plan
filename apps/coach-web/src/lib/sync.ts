// ─────────────────────────────────────────────────────────────────────────────
// Optional sync with the coach API (apps/coach-api, Cloudflare Workers + D1).
// Live ops first (sessionSave.ts), then pull (newer updatedAt wins), then push
// local changes. The server keeps a write counter (seq), so each device only
// pulls what changed since last time.
// ─────────────────────────────────────────────────────────────────────────────

import type { Table } from "dexie";
import { applyOps } from "@treino/core/ops";
import { db, DEFAULTS, migrateSideNotes, migrateTargets, onLocalChange } from "./db";
import type { Session, SyncMeta, TableName } from "@treino/core/types";

const CFG_KEY = "coach_api_cfg";
const TABLES: TableName[] = ["clients", "exercises", "sessions", "templates", "focuses", "tests", "assessments", "goals", "snapshots"];
const KIND: Record<TableName, string> = {
  clients: "client",
  exercises: "exercise",
  sessions: "session",
  templates: "template",
  focuses: "focus",
  tests: "test",
  assessments: "assessment",
  goals: "goal",
  snapshots: "snapshot",
};
const TABLE_OF = Object.fromEntries(TABLES.map((t) => [KIND[t], t])) as Record<string, TableName>;
const PUSH_CHUNK = 200;
const OPS_CHUNK = 200;
/** Live ops go out this soon, so a screen or the client sees a tick within seconds. */
const OPS_DELAY = 300;

export interface SyncConfig {
  url: string;
  token: string;
}

export type SyncStatus =
  | { state: "off" }
  | { state: "idle"; at: number }
  | { state: "syncing" }
  | { state: "error"; message: string };

let status: SyncStatus = { state: "off" };
const statusListeners = new Set<(s: SyncStatus) => void>();
function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((f) => f(s));
}
export function getStatus() {
  return status;
}
export function onStatus(fn: (s: SyncStatus) => void): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

const cleanUrl = (u: string) => u.trim().replace(/\/+$/, "");

export function getConfig(): SyncConfig | null {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "null");
    return c?.url && c?.token ? c : null;
  } catch {
    return null;
  }
}

/** Save the API address + key. A new server gets everything this device has. */
export async function setConfig(c: SyncConfig | null) {
  const prev = getConfig();
  const next = c ? { url: cleanUrl(c.url), token: c.token.trim() } : null;
  try {
    if (next) localStorage.setItem(CFG_KEY, JSON.stringify(next));
    else localStorage.removeItem(CFG_KEY);
  } catch {
    /* storage blocked: sync stays off */
  }
  if (next && prev?.url !== next.url) {
    await db.meta.delete("lastSeq");
    for (const t of TABLES) await (db[t] as unknown as Table<SyncMeta, string>).toCollection().modify({ dirty: 1 });
    await db.ops.clear(); // the whole sessions go to the new server
  }
  if (!next) return setStatus({ state: "off" });
  setStatus({ state: "idle", at: 0 });
  void syncNow();
}

async function api<T>(cfg: SyncConfig, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(cfg.url + path, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${cfg.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("sem ligação à API");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? `Erro ${res.status}`, res.status);
  return json as T;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Check address and key without changing anything. Returns an error message or null. */
export async function testConnection(c: SyncConfig): Promise<string | null> {
  try {
    await api({ url: cleanUrl(c.url), token: c.token.trim() }, "/sync?since=999999999999");
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

interface RemoteRow {
  id: string;
  kind: string;
  data: SyncMeta;
  updated_at: number;
  deleted: boolean;
  seq: number;
}

let running: Promise<void> | null = null;
let again = false;

/** Sync now; asked while a sync runs, another one follows it (it may have missed the latest change). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = doSync().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

let opsTimer: ReturnType<typeof setTimeout> | undefined;
/** Live ops were queued: send them soon. */
export function requestOpsPush() {
  if (!getConfig()) return;
  clearTimeout(opsTimer);
  opsTimer = setTimeout(() => void syncNow(), OPS_DELAY);
}

/** Mark sessions to go whole on the next push (the API cannot take their ops). */
async function sendWhole(ids: Iterable<string>) {
  for (const id of ids) {
    const s = await db.sessions.get(id);
    if (s && !s.deleted) await db.sessions.put({ ...s, updatedAt: Date.now(), dirty: 1 });
  }
}

/**
 * Send the queued live ops, oldest first. Sent ones are dropped; those of a
 * session the server was busy with stay for the next sync; a session the
 * server does not have (or ops it refuses) goes whole instead.
 */
async function pushOps(cfg: SyncConfig) {
  for (;;) {
    const batch = await db.ops.orderBy("seq").limit(OPS_CHUNK).toArray();
    if (!batch.length) return;
    let rejected: { id: string; error: string }[] = [];
    try {
      ({ rejected } = await api<{ rejected: { id: string; error: string }[] }>(cfg, "/live/ops", { ops: batch.map((b) => b.op) }));
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 400) throw e;
      rejected = [...new Set(batch.map((b) => b.sessionId))].map((id) => ({ id, error: "not_found" }));
    }
    const busy = new Set(rejected.filter((r) => r.error === "busy").map((r) => r.id));
    const missing = rejected.filter((r) => r.error !== "busy").map((r) => r.id);
    await db.transaction("rw", db.ops, db.sessions, async () => {
      await db.ops.bulkDelete(batch.filter((b) => !busy.has(b.sessionId)).map((b) => b.seq!));
      await sendWhole(missing);
    });
    if (busy.size) return; // try those again on the next sync, not in a loop now
  }
}

async function doSync() {
  const cfg = getConfig();
  if (!cfg) return setStatus({ state: "off" });
  if (!navigator.onLine) return;
  setStatus({ state: "syncing" });
  try {
    await pushOps(cfg);
    // ── pull ──
    let since = ((await db.meta.get("lastSeq"))?.value as number | undefined) ?? 0;
    for (;;) {
      const { rows, more } = await api<{ rows: RemoteRow[]; more: boolean }>(cfg, `/sync?since=${since}`);
      for (const row of rows) {
        const table = TABLE_OF[row.kind];
        if (table) {
          const t = db[table] as unknown as Table<SyncMeta, string>;
          const local = await t.get(row.id);
          if (!local || local.updatedAt <= row.updated_at) {
            let rec = { ...DEFAULTS[table], ...row.data, id: row.id, updatedAt: row.updated_at, deleted: row.deleted, dirty: 0 as const };
            // live ops not sent yet (offline, server busy) stay on top of the server's version
            if (table === "sessions") {
              const pending = await db.ops.where("sessionId").equals(row.id).sortBy("seq");
              if (pending.length) rec = applyOps(rec as Session, pending.map((p) => p.op)) as typeof rec;
            }
            await t.put(rec);
          }
        }
        since = Math.max(since, row.seq);
      }
      await db.meta.put({ key: "lastSeq", value: since });
      if (!more) break;
    }
    await migrateTargets();
    await migrateSideNotes();
    // ── push ──
    for (const table of TABLES) {
      const t = db[table] as unknown as Table<SyncMeta, string>;
      const dirty = await t.where("dirty").equals(1).toArray();
      for (let i = 0; i < dirty.length; i += PUSH_CHUNK) {
        const chunk = dirty.slice(i, i + PUSH_CHUNK);
        const rows = chunk.map(({ dirty: _d, ...rec }) => ({
          id: rec.id,
          kind: KIND[table],
          data: rec,
          updated_at: rec.updatedAt,
          deleted: !!rec.deleted,
        }));
        await api(cfg, "/sync", { rows });
        // only clear the flag if the record was not edited again meanwhile
        await db.transaction("rw", t, async () => {
          for (const rec of chunk) {
            const cur = await t.get(rec.id);
            if (cur && cur.updatedAt === rec.updatedAt) await t.update(rec.id, { dirty: 0 });
          }
        });
      }
    }
    setStatus({ state: "idle", at: Date.now() });
  } catch (e) {
    setStatus({ state: "error", message: e instanceof Error ? e.message : String(e) });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function startAutoSync() {
  if (getConfig()) setStatus({ state: "idle", at: 0 });
  void syncNow();
  onLocalChange(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 3000);
  });
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 60_000);
}
