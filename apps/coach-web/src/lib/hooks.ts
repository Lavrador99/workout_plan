import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "./db";
import { ExerciseIndex } from "./search";
import { getStatus, onStatus, type SyncStatus } from "./sync";
import type { Client, Exercise, Session, Template } from "./types";

// ── Hash router: #/client/abc → ["client", "abc"] ──────────────────────────

function readHash(): string[] {
  return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const f = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return route;
}

export function go(...parts: string[]) {
  location.hash = "/" + parts.map(encodeURIComponent).join("/");
}

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
