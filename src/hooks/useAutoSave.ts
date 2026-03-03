import { buildSnapshot, exportJSON } from "@/utils/storage";
import { useCallback } from "react";

const AUTOSAVE_KEY = "treino_autosave_ts";

/** Triggers export / auto-save to localStorage sentinel */
export function useAutoSave() {
  const triggerSave = useCallback(() => {
    // Store a timestamp so components can react to it
    localStorage.setItem(AUTOSAVE_KEY, Date.now().toString());
  }, []);

  const exportData = useCallback(() => {
    exportJSON();
  }, []);

  return { triggerSave, exportData };
}

/** Read and parse the autosave snapshot from a URL (e.g. /treino_autosave.json) */
export async function fetchRemoteSnapshot(
  url: string,
): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, string>;
  } catch {
    return null;
  }
}

export function getLocalWeeks(profilePrefix: string): number {
  const snap = buildSnapshot();
  let count = 0;
  for (const key of Object.keys(snap)) {
    if (key.startsWith(profilePrefix + "_session_complete_")) count++;
  }
  return count;
}
