import { useEffect, useRef, useState } from "react";
import { save } from "./db";
import type { SyncMeta, TableName } from "@treino/core/types";

/**
 * A record edited on a page: changes show at once and are stored shortly after,
 * and on leaving. Changes that arrive from sync are taken when not mid-edit.
 * With `create`, the first change makes the record when there is none yet.
 */
export function useDraft<T extends SyncMeta>(table: TableName, stored: T | null | undefined, create?: () => T): [T | null, (patch: Partial<T> | ((cur: T) => Partial<T>)) => void, () => Promise<void>] {
  const [draft, setDraft] = useState<T | null>(stored ?? null);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<T | null>(null);
  const current = useRef<T | null>(stored ?? null);

  useEffect(() => {
    if (stored !== undefined && !pending.current) {
      setDraft(stored);
      current.current = stored;
    }
  }, [stored]);

  const flush = async () => {
    clearTimeout(pending.current);
    pending.current = undefined;
    const next = latest.current;
    latest.current = null;
    if (next) await save(table, next);
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<T> | ((cur: T) => Partial<T>)) => {
    const base = current.current ?? create?.();
    if (!base) return;
    const next = { ...base, ...(typeof patch === "function" ? patch(base) : patch) };
    current.current = next;
    latest.current = next;
    setDraft(next);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };
  return [draft, update, flush];
}
