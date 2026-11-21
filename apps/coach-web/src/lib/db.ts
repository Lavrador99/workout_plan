import Dexie, { type Table } from "dexie";
import { withSidedExtras } from "@treino/core/extras";
import { goalsFromTargets, testGoal } from "./progress";
import { sideFromName } from "./movement";
import { sidesFromNote } from "./parser";
import type { LiveOp } from "@treino/core/ops";
import type { Assessment, Block, Client, CoachProfile, Consents, Exercise, Focus, Goal, Item, Screening, Session, SyncMeta, TableName, Template, TestDef } from "@treino/core/types";
import { norm, todayISO, uid } from "@treino/core/text";

// Local-first storage: everything lives in IndexedDB so the app works in the
// gym without signal. sync.ts pushes/pulls the dirty records when online.

class CoachDB extends Dexie {
  clients!: Table<Client, string>;
  exercises!: Table<Exercise, string>;
  sessions!: Table<Session, string>;
  templates!: Table<Template, string>;
  focuses!: Table<Focus, string>;
  tests!: Table<TestDef, string>;
  assessments!: Table<Assessment, string>;
  goals!: Table<Goal, string>;
  screenings!: Table<Screening, string>;
  profiles!: Table<CoachProfile, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  /** Live changes not yet sent to the API, in the order they were made (sessionSave.ts). */
  ops!: Table<{ seq?: number; sessionId: string; op: LiveOp }, number>;

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
    // Every new record kind does this: an older version of the app skipped the
    // kinds it did not know while lastSeq moved on, so pull everything once.
    this.version(4)
      .stores({ tests: "id, name, category, updatedAt, dirty", assessments: "id, clientId, date, updatedAt, dirty" })
      .upgrade((tx) => tx.table("meta").delete("lastSeq"));
    this.version(5)
      .stores({ goals: "id, clientId, updatedAt, dirty", snapshots: "id, clientId, date, updatedAt, dirty" })
      .upgrade((tx) => tx.table("meta").delete("lastSeq"));
    this.version(6).stores({ ops: "++seq, sessionId" });
    this.version(7)
      .stores({ screenings: "id, clientId, date, updatedAt, dirty" })
      .upgrade((tx) => tx.table("meta").delete("lastSeq"));
    this.version(8)
      .stores({ profiles: "id, updatedAt, dirty" })
      .upgrade((tx) => tx.table("meta").delete("lastSeq"));
    // the progress index is gone (fase 8): its records are no longer kept here
    this.version(9).stores({ snapshots: null });
  }
}

export const db = new CoachDB();

/** Fields the UI relies on, in case a record arrives incomplete (or was erased). */
export const DEFAULTS: Record<TableName, object> = {
  clients: { name: "", injuries: "", notes: "" },
  exercises: { name: "", aliases: [], tags: [] },
  sessions: { title: "", notes: "", blocks: [] },
  templates: { name: "", block: { id: "", kind: "list", title: "", items: [] } },
  focuses: { kind: "sport", name: "", patterns: [], muscles: [], exerciseIds: [], notes: "" },
  tests: { name: "", category: "mobilidade", unit: "", direction: "higher", sided: false, trials: 1, aggregate: "best", version: 1, groups: [], purpose: "", equipment: "", instructions: "", validity: "" },
  assessments: { title: "", conditions: "", notes: "", results: [] },
  goals: { title: "", criteria: "", status: "active" },
  profiles: { name: "", title: "", licence: "", phone: "", email: "", instagram: "", logo: null },
  screenings: {
    quick: [null, null, null, null, null, null, null, null],
    quickDetails: "",
    parq: null,
    referralCriteria: [],
    decision: null,
    restrictions: "",
    clearanceRequested: "",
    referredTo: "",
    diseases: [],
    diseaseDetails: "",
    diseaseLimits: null,
    medication: "",
    medicationCount: null,
    medicationFlags: [],
    surgeries: "",
    injuries: [],
    painZone: "",
    painIntensity: null,
    painSince: "",
    painTriggers: "",
    familyHistory: null,
    healthProfessionals: "",
    exerciseNow: "",
    pastSports: "",
    bestPhase: "",
    strengthExperience: null,
    competitions: "",
    ptBefore: "",
    trainingInjuries: "",
    sleepHours: null,
    sleepQuality: null,
    stress: null,
    steps: null,
    stressSource: "",
    food: "",
    water: "",
    alcohol: "",
    tobacco: "",
    supplements: "",
    mainGoal: "",
    why: "",
    secondaryGoals: "",
    deadline: "",
    targetEvent: "",
    success: "",
    availability: "",
    sessionsPerWeek: null,
    place: "",
    homeEquipment: "",
    budget: "",
    likes: "",
    dislikes: "",
    stage: null,
    confidence: null,
    reason: "",
    motivation: "",
    barriers: [],
    barrierDetails: "",
    pastDropout: "",
    support: "",
    followUp: "",
    fallOrFear: null,
    risesWithoutHands: null,
    longInactivity: null,
    impressions: "",
    referralsMade: "",
    package: "",
    nextSession: null,
    checklist: [],
  },
};

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

export function newClient(name: string, clientNumber: number | null = null): Client {
  return { id: uid(), updatedAt: 0, name, injuries: "", notes: "", birthYear: null, hrMax: null, hrRest: null, clientNumber };
}

/** One more than the highest number given so far. */
export async function nextClientNumber(): Promise<number> {
  let max = 0;
  await db.clients.each((c) => {
    if (!c.deleted && (c.clientNumber ?? 0) > max) max = c.clientNumber ?? 0;
  });
  return max + 1;
}

export const emptyConsents = (): Consents => ({ given: {}, professionals: "", signature: null, guardianSignature: null, signedAt: null });

/**
 * Bring older clients up to date: the three consent dates become consents,
 * the birth year follows the birth date, and clients with no number get one.
 * Safe to run any time; runs after every pull too.
 */
export async function migrateClients(): Promise<number> {
  const clients = await db.clients.toArray();
  let next = clients.reduce((m, c) => Math.max(m, c.clientNumber ?? 0), 0) + 1;
  let n = 0;
  for (const c of [...clients].sort((a, b) => a.name.localeCompare(b.name, "pt"))) {
    if (c.deleted) continue;
    const patch: Partial<Client> = {};
    if (c.consentAt !== undefined || c.healthConsentAt !== undefined || c.imageConsentAt !== undefined) {
      const consents = c.consents ?? emptyConsents();
      const given = { ...consents.given };
      if (c.consentAt || c.healthConsentAt) given.data_health ??= c.healthConsentAt ?? c.consentAt ?? undefined;
      if (c.imageConsentAt) given.social_face ??= c.imageConsentAt;
      Object.assign(patch, { consents: { ...consents, given }, consentAt: undefined, healthConsentAt: undefined, imageConsentAt: undefined });
    }
    const year = c.birthDate ? Number(c.birthDate.slice(0, 4)) : null;
    if (year && c.birthYear !== year) patch.birthYear = year;
    if (c.clientNumber == null) patch.clientNumber = next++;
    if (!Object.keys(patch).length) continue;
    const { consentAt: _a, healthConsentAt: _b, imageConsentAt: _c, ...rest } = { ...c, ...patch };
    await save("clients", rest);
    n++;
  }
  return n;
}

/** Change a client from outside its page: always on top of the stored record. */
export async function patchClient(id: string, patch: (c: Client) => Partial<Client>): Promise<void> {
  const c = await db.clients.get(id);
  if (c) await save("clients", { ...c, ...patch(c) });
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
    // one of its names (an English one, say): shown with the library's name
    out.push({ ...it, exerciseId: ex.id, name: ex.name });
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
  // a base that goes into an exercise with no family of its own hands its family over
  const progressions = into.progressions?.length ? into.progressions : from.progressions?.filter((p) => p !== intoId);
  await save("exercises", { ...into, pt: into.pt || from.pt, aliases, tags: [...new Set([...into.tags, ...from.tags])], progressions });
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
  // families that listed it now list the exercise it went into
  for (const e of await db.exercises.toArray()) {
    if (!e.progressions?.includes(fromId)) continue;
    const progressions = [...new Set(e.progressions.map((p) => (p === fromId ? intoId : p)))].filter((p) => p !== e.id);
    await save("exercises", { ...e, progressions });
  }
  await remove("exercises", fromId);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export function newSession(clientId: string): Session {
  return { id: uid(), updatedAt: 0, clientId, date: todayISO(), title: "", notes: "", blocks: [] };
}

/** Fresh copy of a block: new ids, nothing ticked, no live change times. */
export function copyBlock(b: Block): Block {
  return { ...b, id: uid(), items: b.items.map((i) => ({ ...i, id: uid(), sets: i.sets.map(({ at: _at, ...r }) => ({ ...r, done: false })) })) };
}

/** The blocks a template adds: the whole day, or its single block. */
export function templateBlocks(t: Template): Block[] {
  return t.blocks?.length ? t.blocks : [t.block];
}

/** Copy of a session, for today unless told otherwise: new ids, nothing ticked. */
export function duplicateSession(s: Session, clientId = s.clientId, date = todayISO()): Session {
  return { ...newSession(clientId), date, title: s.title, blocks: s.blocks.map(copyBlock), ...(s.noAdherence ? { noAdherence: true } : {}), ...(s.activity ? { activity: s.activity } : {}) };
}

// ── Tests and assessments ───────────────────────────────────────────────────

export function newTest(name: string): TestDef {
  return {
    id: uid(),
    updatedAt: 0,
    name,
    category: "mobilidade",
    unit: "",
    direction: "higher",
    sided: false,
    scale: null,
    trials: 1,
    aggregate: "best",
    version: 1,
    groups: [],
    purpose: "",
    equipment: "",
    instructions: "",
    validity: "",
  };
}

export function newAssessment(clientId: string): Assessment {
  return { id: uid(), updatedAt: 0, clientId, date: todayISO(), title: "", conditions: "", notes: "", results: [] };
}

// ── Screenings ──────────────────────────────────────────────────────────────

export function newScreening(clientId: string): Screening {
  return {
    id: uid(),
    updatedAt: 0,
    clientId,
    date: todayISO(),
    ...(DEFAULTS.screenings as Omit<Screening, "id" | "updatedAt" | "clientId" | "date">),
  };
}

// ── Coach profile ───────────────────────────────────────────────────────────

export const PROFILE_ID = "coach-profile";

export function newProfile(): CoachProfile {
  return { id: PROFILE_ID, updatedAt: 0, name: "", title: "Técnico de Exercício Físico", licence: "", phone: "", email: "", instagram: "", logo: null };
}

// ── Goals ───────────────────────────────────────────────────────────────────

export function newGoal(clientId: string, testId?: string): Goal {
  return testId ? testGoal(clientId, testId) : { id: uid(), updatedAt: 0, clientId, title: "", criteria: "", status: "active" };
}

/**
 * Move the goals older versions kept on the client to Goal records. Safe to run
 * any time: test goals have fixed ids, so a goal already here (or deleted on
 * purpose) stays as it is. Runs after every pull too, as they may still arrive.
 */
export async function migrateTargets(): Promise<number> {
  const clients = (await db.clients.toArray()).filter((c) => c.targets);
  if (!clients.length) return 0;
  const existing = new Set(await db.goals.toCollection().primaryKeys());
  let n = 0;
  for (const { targets, ...client } of clients) {
    for (const goal of goalsFromTargets(client.id, targets ?? {}, existing)) {
      await save("goals", goal);
      n++;
    }
    await save("clients", client);
  }
  return n;
}

/** Bump when a migration is added or changed: 2 = extra sets as sets with a side, 3 = free-text injuries into the intake, 4 = exercises named in Portuguese, 5 = the side of a profile read from its name. */
const MIGRATIONS = 5;

/**
 * Bring older records up to date. At start-up only once per version; after a
 * pull that brought records (they may come from a device not yet updated),
 * again, as every migration is safe to repeat.
 */
export async function runMigrations(force = false): Promise<void> {
  if (!force && (await db.meta.get("migrations"))?.value === MIGRATIONS) return;
  await migrateTargets();
  await migrateSideNotes();
  await migrateClients();
  await migrateInjuries();
  await migrateExerciseNames();
  await migrateFocusSides();
  await db.meta.put({ key: "migrations", value: MIGRATIONS });
}

/**
 * The Portuguese name becomes the name, the English one an alias. Items of
 * sessions and templates linked to it and written with one of its names take
 * the new one; a variant written differently stays as it was.
 */
export async function migrateExerciseNames(): Promise<number> {
  const renamed = new Map<string, { name: string; old: Set<string> }>();
  for (const ex of await db.exercises.toArray()) {
    const pt = ex.pt?.trim();
    if (ex.deleted || !pt || norm(pt) === norm(ex.name)) {
      if (ex.pt !== undefined && !ex.deleted) await save("exercises", { ...ex, pt: undefined });
      continue;
    }
    const aliases = [...new Set([ex.name, ...ex.aliases])].filter((a) => norm(a) !== norm(pt));
    await save("exercises", { ...ex, name: pt, pt: undefined, aliases });
    renamed.set(ex.id, { name: pt, old: new Set([ex.name, ...ex.aliases].map(norm)) });
  }
  if (!renamed.size) return 0;
  const rename = (it: Item): Item => {
    const r = it.exerciseId ? renamed.get(it.exerciseId) : undefined;
    return r && r.old.has(norm(it.name)) ? { ...it, name: r.name } : it;
  };
  for (const s of await db.sessions.toArray()) {
    if (s.deleted) continue;
    const blocks = s.blocks.map((b) => ({ ...b, items: b.items.map(rename) }));
    if (JSON.stringify(blocks) !== JSON.stringify(s.blocks)) await save("sessions", { ...s, blocks });
  }
  for (const t of await db.templates.toArray()) {
    if (t.deleted) continue;
    const next = { ...t, block: { ...t.block, items: t.block.items.map(rename) }, ...(t.blocks ? { blocks: t.blocks.map((b) => ({ ...b, items: b.items.map(rename) })) } : {}) };
    if (JSON.stringify(next) !== JSON.stringify(t)) await save("templates", next);
  }
  return renamed.size;
}

/**
 * The client's free-text injuries become an injury of their latest intake
 * (region "Outra", the text kept as it was), so the intake is the only place.
 */
export async function migrateInjuries(): Promise<number> {
  let n = 0;
  for (const c of await db.clients.toArray()) {
    const text = c.injuries?.trim();
    if (c.deleted || !text) continue;
    const mine = (await db.screenings.where("clientId").equals(c.id).toArray()).filter((s) => !s.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
    const s = mine[0] ?? newScreening(c.id);
    if (!s.injuries.some((i) => i.aggravates === text)) await save("screenings", { ...s, injuries: [...s.injuries, { id: uid(), region: "Outra", side: null, status: "active", since: "", pain: null, aggravates: text, followedBy: "" }] });
    await save("clients", { ...c, injuries: "" });
    n++;
  }
  return n;
}

/** Profiles that left their side in the name ("Glúteo direito") keep it as their side. */
export async function migrateFocusSides(): Promise<number> {
  let n = 0;
  for (const f of await db.focuses.toArray()) {
    if (f.deleted || f.side !== undefined) continue;
    await save("focuses", { ...f, side: sideFromName(f.name) });
    n++;
  }
  return n;
}

/** Move "D +1" left in item notes by older versions to the items' extra sets. Safe to run any time. */
export async function migrateSideNotes(): Promise<number> {
  let n = 0;
  for (const session of await db.sessions.toArray()) {
    if (session.deleted) continue;
    let touched = false;
    const blocks = session.blocks.map((b) => ({
      ...b,
      items: b.items.map((it) => {
        const moved = withSidedExtras(sidesFromNote(it) ?? it);
        if (moved === it) return it;
        touched = true;
        return moved;
      }),
    }));
    if (!touched) continue;
    await save("sessions", { ...session, blocks });
    n++;
  }
  return n;
}

// ── A client's data ─────────────────────────────────────────────────────────

/** Everything kept about a client, for handing it over to them. */
export async function exportClient(id: string) {
  const [client, sessions, assessments, goals, screenings] = await Promise.all([
    db.clients.get(id),
    db.sessions.where("clientId").equals(id).toArray(),
    db.assessments.where("clientId").equals(id).toArray(),
    db.goals.where("clientId").equals(id).toArray(),
    db.screenings.where("clientId").equals(id).toArray(),
  ]);
  const clean = <T extends SyncMeta>({ dirty: _d, ...rec }: T) => rec;
  return {
    app: "coach",
    exportedAt: new Date().toISOString(),
    client: client && clean(client),
    sessions: sessions.filter((s) => !s.deleted).map(clean),
    assessments: assessments.filter((a) => !a.deleted).map(clean),
    goals: goals.filter((g) => !g.deleted).map(clean),
    screenings: screenings.filter((s) => !s.deleted).map(clean),
  };
}

async function erase(table: TableName, id: string) {
  await (db[table] as unknown as Table<SyncMeta, string>).put({ ...DEFAULTS[table], id, updatedAt: Date.now(), deleted: true, dirty: 1 });
}

/**
 * Erase a client for good: unlike remove(), no content stays behind, here or
 * (after the next sync) on the server. Only empty tombstones remain, which is
 * what carries the deletion to the other devices.
 */
export async function purgeClient(id: string): Promise<void> {
  for (const table of ["sessions", "assessments", "goals", "screenings"] as const) {
    for (const key of await db[table].where("clientId").equals(id).primaryKeys()) await erase(table, key);
  }
  await erase("clients", id);
  changed();
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
  tests?: TestDef[];
  assessments?: Assessment[];
  goals?: Goal[];
  /** Older backups only: the progress index, no longer read. */
  snapshots?: unknown[];
  screenings?: Screening[];
  profiles?: CoachProfile[];
}

export async function exportBackup(): Promise<Backup> {
  const [clients, exercises, sessions, templates, focuses, tests, assessments, goals, screenings, profiles] = await Promise.all([
    db.clients.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.templates.toArray(),
    db.focuses.toArray(),
    db.tests.toArray(),
    db.assessments.toArray(),
    db.goals.toArray(),
    db.screenings.toArray(),
    db.profiles.toArray(),
  ]);
  return { app: "coach", version: 1, exportedAt: new Date().toISOString(), clients, exercises, sessions, templates, focuses, tests, assessments, goals, screenings, profiles };
}

/** Merge a backup in: newer record wins, so importing twice is harmless. */
export async function importBackup(b: Backup): Promise<number> {
  let n = 0;
  for (const table of ["clients", "exercises", "sessions", "templates", "focuses", "tests", "assessments", "goals", "screenings", "profiles"] as const) {
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
