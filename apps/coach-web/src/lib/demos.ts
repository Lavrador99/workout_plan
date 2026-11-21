// The made-up clients ("Teste" and the four of Força e Equilíbrio) only exist on
// a device that asks for them (Definições), and never sync: they are not
// anyone's real data. Their ids are fixed, so every device makes the same ones.

import { changed, db, DEFAULTS } from "./db";
import { seedTests } from "./seed";
import { DEMO_CLIENT_ID, demoData } from "./seedDemo";
import { moduleDemos } from "./seedModuleDemo";
import type { Exercise, SyncMeta, TableName, TestDef } from "@treino/core/types";

const KEY = "coach_show_demos";

type DemoTable = "clients" | "sessions" | "assessments" | "goals" | "screenings";

function demoRecords(tests: TestDef[], library: Exercise[]): [DemoTable, SyncMeta][] {
  const teste = demoData(tests, library);
  const out: [DemoTable, SyncMeta][] = [
    ["clients", teste.client],
    ...teste.sessions.map((r) => ["sessions", r] as [DemoTable, SyncMeta]),
    ...teste.assessments.map((r) => ["assessments", r] as [DemoTable, SyncMeta]),
    ...teste.goals.map((r) => ["goals", r] as [DemoTable, SyncMeta]),
    ...teste.screenings.map((r) => ["screenings", r] as [DemoTable, SyncMeta]),
  ];
  for (const d of moduleDemos(tests)) out.push(["clients", d.client], ["screenings", d.screening], ["assessments", d.assessment]);
  return out;
}

export const DEMO_CLIENT_IDS = new Set([DEMO_CLIENT_ID, ...moduleDemos([]).map((d) => d.client.id)]);

/** A made-up client, or anything of one. */
export const isDemo = (rec: { id: string; clientId?: unknown }) => DEMO_CLIENT_IDS.has(rec.id) || (typeof rec.clientId === "string" && DEMO_CLIENT_IDS.has(rec.clientId));

export function demosShown(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

async function putAll(): Promise<void> {
  const tests = (await db.tests.toArray()).filter((t) => !t.deleted);
  const library = (await db.exercises.toArray()).filter((e) => !e.deleted);
  for (const [table, rec] of demoRecords(tests.length ? tests : seedTests(), library)) await (db[table] as unknown as { put: (r: SyncMeta) => Promise<unknown> }).put({ ...rec, dirty: 0 });
}

async function dropAll(): Promise<void> {
  for (const table of ["clients", "sessions", "assessments", "goals", "screenings"] as const) {
    const t = db[table] as unknown as { toArray: () => Promise<(SyncMeta & { clientId?: string })[]>; bulkDelete: (ids: string[]) => Promise<void> };
    await t.bulkDelete((await t.toArray()).filter(isDemo).map((r) => r.id));
  }
}

/** Turn the made-up clients on (made fresh) or off (removed from this device only). */
export async function setDemosShown(on: boolean): Promise<void> {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // private mode: the choice lasts this session only
  }
  if (on) await putAll();
  else await dropAll();
  changed();
}

/** At start-up: shown and missing (a new device, a cleared browser) → made; hidden → none left. */
export async function ensureDemos(): Promise<void> {
  if (!demosShown()) return dropAll();
  if (!(await db.clients.get(DEMO_CLIENT_ID))) await putAll();
}

/**
 * Deletions for the made-up records an older version synced to the server,
 * as rows the API takes. Sent once; from then on they are never sent or read.
 */
export function demoTombstones(kindOf: Record<TableName, string>, at: number) {
  return demoRecords(seedTests(), []).map(([table, rec]) => ({
    id: rec.id,
    kind: kindOf[table],
    data: { ...DEFAULTS[table], id: rec.id, updatedAt: at, deleted: true },
    updated_at: at,
    deleted: true,
  }));
}
