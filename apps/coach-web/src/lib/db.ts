import Dexie, { type Table } from "dexie";
import type { Block, Client, Exercise, Focus, Item, Session, SyncMeta, TableName, Template } from "./types";
import { norm, todayISO, uid } from "./text";

// Local-first storage: everything lives in IndexedDB so the app works in the
// gym without signal. sync.ts pushes/pulls the dirty records when online.

class CoachDB extends Dexie {
  clients!: Table<Client, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  templates!: Table<Template, string>;
  focuses!: Table<Focus, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("coach");
    this.version(1).stores({
      clients: "id, name, updatedAt, dirty",
      exercises: "id, name, updatedAt, dirty",
      sessions: "id, clientId, date, updatedAt, dirty",
      meta: "key",
    });
    this.version(2).stores({ templates: "id, name, updatedAt, dirty" });
    this.version(3).stores({ focuses: "id, kind, name, updatedAt, dirty" });
  }
}

export const db = new CoachDB();

type Listener = () => void;
const changeListeners = new Set<Listener>();
/** Called after every local write (sync.ts uses it to schedule a push). */
export function onLocalChange(fn: Listener): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/** Tell listeners (sync) that something was written locally. */
export function changed() {
  changeListeners.forEach((f) => f());
}

export async function save<T extends SyncMeta>(table: TableName, rec: T): Promise<T> {
  const r = { ...rec, updatedAt: Date.now(), dirty: 1 as const };
  await (db[table] as unknown as Table<T, string>).put(r);
  changed();
  return r;
}

export async function remove(table: TableName, id: string): Promise<void> {
  const rec = await (db[table] as Table<SyncMeta, string>).get(id);
  if (rec) await save(table, { ...rec, deleted: true });
}

// ── Clients ─────────────────────────────────────────────────────────────────

export function newClient(name: string): Client {
  return { id: uid(), updatedAt: 0, name, injuries: "", notes: "", birthYear: null, hrMax: null, hrRest: null };
}

// ── Focuses (sports, pathologies, asymmetries) ────────────────────────────────

export function newFocus(kind: Focus["kind"], name: string): Focus {
  return { id: uid(), updatedAt: 0, kind, name, patterns: [], muscles: [], exerciseIds: [], notes: "" };
}

// ── Exercises ───────────────────────────────────────────────────────────────

/** Find a library exercise by name or alias (accent/case-insensitive). */
export function matchExercise(list: Exercise[], name: string): Exercise | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return list.find((e) => !e.deleted && (norm(e.name) === n || (e.pt && norm(e.pt) === n) || e.aliases.some((a) => norm(a) === n)));
}

/** Link items to library exercises, creating new library entries when needed. */
export async function linkItems(items: Item[]): Promise<Item[]> {
  const all = await db.exercises.toArray();
  const out: Item[] = [];
  for (const it of items) {
    if (!it.name.trim()) {
      out.push(it);
      continue;
    }
    let ex = matchExercise(all, it.name);
    if (!ex) {
      ex = await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name: it.name.trim(), aliases: [], tags: [] });
      all.push(ex);
    }
    out.push({ ...it, exerciseId: ex.id });
  }
  return out;
}

/** Merge `fromId` into `intoId`: its name becomes an alias, sessions are relinked. */
export async function mergeExercises(fromId: string, intoId: string): Promise<void> {
  const [from, into] = await Promise.all([db.exercises.get(fromId), db.exercises.get(intoId)]);
  if (!from || !into || fromId === intoId) return;
  const aliases = [...new Set([...into.aliases, from.name, ...(from.pt ? [from.pt] : []), ...from.aliases])].filter(
    (a) => norm(a) !== norm(into.name) && norm(a) !== norm(into.pt ?? ""),
  );
  await save("exercises", { ...into, pt: into.pt || from.pt, aliases, tags: [...new Set([...into.tags, ...from.tags])] });
  const sessions = await db.sessions.toArray();
  for (const s of sessions) {
    let changed = false;
    const blocks = s.blocks.map((b) => ({
      ...b,
      items: b.items.map((i) => {
        if (i.exerciseId !== fromId) return i;
        changed = true;
        return { ...i, exerciseId: intoId };
      }),
    }));
    if (changed) await save("sessions", { ...s, blocks });
  }
  await remove("exercises", fromId);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export function newSession(clientId: string): Session {
  return { id: uid(), updatedAt: 0, clientId, date: todayISO(), title: "", notes: "", blocks: [] };
}

/** Fresh copy of a block: new ids, nothing ticked. */
export function copyBlock(b: Block): Block {
  return { ...b, id: uid(), items: b.items.map((i) => ({ ...i, id: uid(), sets: i.sets.map((r) => ({ ...r, done: false })) })) };
}

/** The blocks a template adds: the whole day, or its single block. */
export function templateBlocks(t: Template): Block[] {
  return t.blocks?.length ? t.blocks : [t.block];
}

/** Copy of a session for today: new ids, nothing ticked. */
export function duplicateSession(s: Session): Session {
  return { ...newSession(s.clientId), title: s.title, blocks: s.blocks.map(copyBlock) };
}

// ── Backup ──────────────────────────────────────────────────────────────────

export interface Backup {
  app: "coach";
  version: 1;
  exportedAt: string;
  clients: Client[];
  exercises: Exercise[];
  sessions: Session[];
  templates?: Template[];
  focuses?: Focus[];
}

export async function exportBackup(): Promise<Backup> {
  const [clients, exercises, sessions, templates, focuses] = await Promise.all([
    db.clients.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.templates.toArray(),
    db.focuses.toArray(),
  ]);
  return { app: "coach", version: 1, exportedAt: new Date().toISOString(), clients, exercises, sessions, templates, focuses };
}

/** Merge a backup in: newer record wins, so importing twice is harmless. */
export async function importBackup(b: Backup): Promise<number> {
  let n = 0;
  for (const table of ["clients", "exercises", "sessions", "templates", "focuses"] as const) {
    const t = db[table] as unknown as Table<SyncMeta, string>;
    for (const rec of (b[table] ?? []) as SyncMeta[]) {
      const cur = await t.get(rec.id);
      if (!cur || cur.updatedAt < rec.updatedAt) {
        await t.put({ ...rec, dirty: 1 });
        n++;
      }
    }
  }
  changed();
  return n;
}
