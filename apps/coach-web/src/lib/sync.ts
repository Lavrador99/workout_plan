// ─────────────────────────────────────────────────────────────────────────────
// Optional Supabase sync (free tier). One table, `coach_records`, holds every
// record as JSON. Pull first (newer updatedAt wins), then push local changes.
// See apps/coach-web/supabase.sql for the table and access rules.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Table } from "dexie";
import { db, onLocalChange } from "./db";
import type { SyncMeta, TableName } from "./types";

const CFG_KEY = "coach_sync_cfg";
const TABLES: TableName[] = ["clients", "exercises", "sessions", "templates"];
const KIND: Record<TableName, string> = { clients: "client", exercises: "exercise", sessions: "session", templates: "template" };
const TABLE_OF: Record<string, TableName> = { client: "clients", exercise: "exercises", session: "sessions", template: "templates" };

export interface SyncConfig {
  url: string;
  key: string;
}

export type SyncStatus =
  | { state: "off" }
  | { state: "signed-out" }
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

export function getConfig(): SyncConfig | null {
  try {
    const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? "null");
    return c?.url && c?.key ? c : null;
  } catch {
    return null;
  }
}

export function setConfig(c: SyncConfig | null) {
  try {
    if (c) localStorage.setItem(CFG_KEY, JSON.stringify(c));
    else localStorage.removeItem(CFG_KEY);
  } catch {
    /* storage blocked: sync stays off */
  }
  client = null;
  void refresh();
}

let client: SupabaseClient | null = null;
async function sb(): Promise<SupabaseClient | null> {
  const cfg = getConfig();
  if (!cfg) return null;
  if (!client) {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(cfg.url, cfg.key);
  }
  return client;
}

export async function currentUser(): Promise<string | null> {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user.email ?? null;
}

export async function signIn(email: string, password: string, create = false): Promise<string | null> {
  const c = await sb();
  if (!c) return "Configura primeiro o URL e a chave.";
  const { error } = create
    ? await c.auth.signUp({ email, password })
    : await c.auth.signInWithPassword({ email, password });
  if (error) return error.message;
  await refresh();
  void syncNow();
  return null;
}

export async function signOut() {
  const c = await sb();
  await c?.auth.signOut();
  await refresh();
}

async function refresh() {
  if (!getConfig()) return setStatus({ state: "off" });
  const email = await currentUser();
  if (!email) return setStatus({ state: "signed-out" });
  if (status.state === "off" || status.state === "signed-out") setStatus({ state: "idle", at: 0 });
}

async function meta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  if (!running) running = doSync().finally(() => (running = null));
  return running;
}

async function doSync() {
  const c = await sb();
  if (!c) return setStatus({ state: "off" });
  const { data: auth } = await c.auth.getSession();
  if (!auth.session) return setStatus({ state: "signed-out" });
  if (!navigator.onLine) return;
  setStatus({ state: "syncing" });
  try {
    // ── pull ──
    let since = (await meta<string>("lastPull")) ?? "1970-01-01T00:00:00Z";
    for (;;) {
      const { data, error } = await c
        .from("coach_records")
        .select("id, kind, data, updated_at, deleted, server_ts")
        .gt("server_ts", since)
        .order("server_ts")
        .limit(500);
      if (error) throw error;
      if (!data?.length) break;
      for (const row of data) {
        const table = TABLE_OF[row.kind];
        if (!table) continue;
        const t = db[table] as unknown as Table<SyncMeta, string>;
        const local = await t.get(row.id);
        if (!local || local.updatedAt <= Number(row.updated_at)) {
          await t.put({ ...(row.data as SyncMeta), id: row.id, updatedAt: Number(row.updated_at), deleted: row.deleted, dirty: 0 });
        }
      }
      since = data[data.length - 1].server_ts;
      await db.meta.put({ key: "lastPull", value: since });
      if (data.length < 500) break;
    }
    // ── push ──
    for (const table of TABLES) {
      const t = db[table] as unknown as Table<SyncMeta, string>;
      const dirty = await t.where("dirty").equals(1).toArray();
      for (let i = 0; i < dirty.length; i += 200) {
        const chunk = dirty.slice(i, i + 200);
        const rows = chunk.map(({ dirty: _d, ...rec }) => ({
          id: rec.id,
          kind: KIND[table],
          data: rec,
          updated_at: rec.updatedAt,
          deleted: !!rec.deleted,
        }));
        const { error } = await c.from("coach_records").upsert(rows);
        if (error) throw error;
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
  void refresh().then(() => syncNow());
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
