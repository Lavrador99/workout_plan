// ─────────────────────────────────────────────────────────────────────────────
// Optional sync with the coach API (apps/coach-api, Cloudflare Workers + D1).
// Pull first (newer updatedAt wins), then push local changes. The server keeps
// a write counter (seq), so each device only pulls what changed since last time.
// ─────────────────────────────────────────────────────────────────────────────

import type { Table } from "dexie";
import { db, onLocalChange } from "./db";
import type { SyncMeta, TableName } from "./types";

const CFG_KEY = "coach_api_cfg";
const TABLES: TableName[] = ["clients", "exercises", "sessions", "templates"];
const KIND: Record<TableName, string> = { clients: "client", exercises: "exercise", sessions: "session", templates: "template" };
const TABLE_OF: Record<string, TableName> = { client: "clients", exercise: "exercises", session: "sessions", template: "templates" };
const PUSH_CHUNK = 200;
/** Fields the UI relies on, in case a record arrives incomplete. */
const DEFAULTS: Record<TableName, object> = {
  clients: { name: "", injuries: "", notes: "" },
  exercises: { name: "", aliases: [], tags: [] },
  sessions: { title: "", notes: "", blocks: [] },
  templates: { name: "", block: { id: "", kind: "list", title: "", items: [] } },
};

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
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
  return json as T;
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

export function syncNow(): Promise<void> {
  if (!running) running = doSync().finally(() => (running = null));
  return running;
}

async function doSync() {
  const cfg = getConfig();
  if (!cfg) return setStatus({ state: "off" });
  if (!navigator.onLine) return;
  setStatus({ state: "syncing" });
  try {
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
            await t.put({ ...DEFAULTS[table], ...row.data, id: row.id, updatedAt: row.updated_at, deleted: row.deleted, dirty: 0 });
          }
        }
        since = Math.max(since, row.seq);
      }
      await db.meta.put({ key: "lastSeq", value: since });
      if (!more) break;
    }
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
