/** fileAutosave.ts -- API-based persistence
 *
 * All localStorage mutations call scheduleWrite(), which debounces and
 * sends a PUT /snapshot to the treino-api NestJS service.
 */

import { buildSnapshot, restoreSnapshot } from "./storage";

const API_BASE =
  (import.meta as unknown as { env: Record<string, string> }).env
    ?.VITE_API_URL ?? "http://localhost:3334";

const DEBOUNCE_MS = 600;

let _timer: ReturnType<typeof setTimeout> | null = null;
let _saveListeners: Array<(status: "saved" | "error") => void> = [];

export function isLinked(): boolean {
  return true;
}

export function onSave(cb: (status: "saved" | "error") => void): () => void {
  _saveListeners.push(cb);
  return () => {
    _saveListeners = _saveListeners.filter((l) => l !== cb);
  };
}

export async function linkFile(): Promise<boolean> {
  return true;
}

export async function unlinkFile(): Promise<void> {}

export async function initFileAutosave(): Promise<void> {}

async function flushWrite(): Promise<void> {
  const snapshot = buildSnapshot();
  try {
    const res = await fetch(`${API_BASE}/snapshot`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _saveListeners.forEach((l) => l("saved"));
  } catch (e) {
    console.warn("[fileAutosave] PUT /snapshot failed", e);
    _saveListeners.forEach((l) => l("error"));
  }
}

export function scheduleWrite(): void {
  if (_timer !== null) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    void flushWrite();
  }, DEBOUNCE_MS);
}

export async function loadFromApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/snapshot`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as Record<string, string>;
    if (Object.keys(data).length === 0) return false;
    restoreSnapshot(data);
    return true;
  } catch {
    return false;
  }
}
