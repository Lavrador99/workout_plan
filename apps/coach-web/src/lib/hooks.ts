import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "./db";
import { ExerciseIndex } from "./search";
import { getStatus, onStatus, type SyncStatus } from "./sync";
import type { Assessment, Client, Exercise, Focus, Goal, Session, Template, TestDef } from "./types";

export { back, go, replaceRoute, useBackClose, useRoute } from "./nav";

const NO_VERSIONS = new Map<string, Set<number>>();

// ── Data ────────────────────────────────────────────────────────────────────

export function useClients(): Client[] | undefined {
  return useLiveQuery(async () => (await db.clients.toArray()).filter((c) => !c.deleted).sort((a, b) => a.name.localeCompare(b.name, "pt")), []);
}

export function useClient(id: string): Client | null | undefined {
  return useLiveQuery(async () => (await db.clients.get(id)) ?? null, [id]);
}

export function useSessions(clientId?: string): Session[] | undefined {
  return useLiveQuery(async () => {
    const list = clientId ? await db.sessions.where("clientId").equals(clientId).toArray() : await db.sessions.toArray();
    return list.filter((s) => !s.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  }, [clientId]);
}

export function useSession(id: string): Session | null | undefined {
  return useLiveQuery(async () => (await db.sessions.get(id)) ?? null, [id]);
}

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(async () => (await db.exercises.toArray()).filter((e) => !e.deleted).sort((a, b) => a.name.localeCompare(b.name, "pt")), []);
}

export function useTemplates(): Template[] | undefined {
  return useLiveQuery(async () => (await db.templates.toArray()).filter((t) => !t.deleted).sort((a, b) => a.name.localeCompare(b.name, "pt")), []);
}

export function useFocuses(): Focus[] | undefined {
  return useLiveQuery(async () => (await db.focuses.toArray()).filter((f) => !f.deleted).sort((a, b) => a.name.localeCompare(b.name, "pt")), []);
}

export function useTests(): TestDef[] | undefined {
  return useLiveQuery(async () => (await db.tests.toArray()).filter((t) => !t.deleted).sort((a, b) => a.name.localeCompare(b.name, "pt")), []);
}

export function useAssessments(clientId: string): Assessment[] | undefined {
  return useLiveQuery(async () => {
    const list = await db.assessments.where("clientId").equals(clientId).toArray();
    return list.filter((a) => !a.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  }, [clientId]);
}

export function useGoals(clientId: string): Goal[] | undefined {
  return useLiveQuery(async () => (await db.goals.where("clientId").equals(clientId).toArray()).filter((g) => !g.deleted), [clientId]);
}

/** The protocol versions of each test that already have results, in any client's assessment. */
export function useUsedVersions(): Map<string, Set<number>> {
  const used = useLiveQuery(async () => {
    const m = new Map<string, Set<number>>();
    for (const a of await db.assessments.toArray()) {
      if (a.deleted) continue;
      for (const r of a.results) {
        if (!r.trials.some((t) => t.value != null)) continue;
        if (!m.has(r.testId)) m.set(r.testId, new Set());
        m.get(r.testId)!.add(r.version);
      }
    }
    return m;
  }, []);
  return used ?? NO_VERSIONS;
}

export function useAssessment(id: string): Assessment | null | undefined {
  return useLiveQuery(async () => (await db.assessments.get(id)) ?? null, [id]);
}

/** How many times each exercise was prescribed (all clients). */
export function useUsage(): Map<string, number> {
  const sessions = useSessions();
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions ?? []) for (const b of s.blocks) for (const i of b.items) if (i.exerciseId) m.set(i.exerciseId, (m.get(i.exerciseId) ?? 0) + 1);
    return m;
  }, [sessions]);
}

export function useExerciseIndex(): ExerciseIndex {
  const exercises = useExercises();
  const usage = useUsage();
  return useMemo(() => new ExerciseIndex(exercises ?? [], usage), [exercises, usage]);
}

export function useSyncStatus(): SyncStatus {
  const [s, set] = useState(getStatus);
  useEffect(() => onStatus(set), []);
  return s;
}
