/**
 * fileAutosave.ts
 * Manages a FileSystemFileHandle for treino_autosave.json.
 * Persists the handle across page reloads via IndexedDB.
 * Call scheduleWrite() after any localStorage mutation — it debounces
 * and writes buildSnapshot() to the linked file.
 */

import { buildSnapshot } from "./storage";

// FileSystemFileHandle.queryPermission / requestPermission are not yet in
// TypeScript's lib.dom.d.ts — extend with a local cast interface.
interface FSFileHandleWithPermission extends FileSystemFileHandle {
  queryPermission(desc: {
    mode: "read" | "readwrite";
  }): Promise<PermissionState>;
  requestPermission(desc: {
    mode: "read" | "readwrite";
  }): Promise<PermissionState>;
}

const IDB_NAME = "treino_fsa";
const IDB_STORE = "handles";
const IDB_KEY = "autosave_handle";
const DEBOUNCE_MS = 600;

let _handle: FileSystemFileHandle | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _saveListeners: Array<(status: "saved" | "error") => void> = [];

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns whether a file is currently linked. */
export function isLinked(): boolean {
  return _handle !== null;
}

/** Subscribe to save events (for UI feedback). */
export function onSave(cb: (status: "saved" | "error") => void): () => void {
  _saveListeners.push(cb);
  return () => {
    _saveListeners = _saveListeners.filter((l) => l !== cb);
  };
}

/** Write snapshot to disk immediately (called after debounce). */
async function flushWrite(): Promise<void> {
  if (!_handle) return;
  const snapshot = buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const h = _handle as FSFileHandleWithPermission;
  try {
    const perm = await h.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") {
      const req = await h.requestPermission({ mode: "readwrite" });
      if (req !== "granted") {
        _handle = null;
        _saveListeners.forEach((l) => l("error"));
        return;
      }
    }
    const w = await _handle.createWritable();
    await w.write(json);
    await w.close();
    _saveListeners.forEach((l) => l("saved"));
  } catch (e) {
    console.warn("[fileAutosave] write failed", e);
    _saveListeners.forEach((l) => l("error"));
  }
}

/** Schedule a debounced write. Call this after every localStorage mutation. */
export function scheduleWrite(): void {
  if (!_handle) return;
  if (_timer !== null) clearTimeout(_timer);
  _timer = setTimeout(() => {
    _timer = null;
    void flushWrite();
  }, DEBOUNCE_MS);
}

/**
 * Prompt the user to pick (or create) the autosave file.
 * Persists the handle in IndexedDB for reuse across page reloads.
 */
export async function linkFile(): Promise<boolean> {
  if (!("showSaveFilePicker" in window)) {
    alert("O teu browser não suporta File System Access API.");
    return false;
  }
  try {
    const handle = await (
      window as unknown as {
        showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker({
      suggestedName: "treino_autosave.json",
      types: [
        { description: "JSON", accept: { "application/json": [".json"] } },
      ],
    });
    _handle = handle;
    await idbSet(IDB_KEY, handle);
    // Immediately write current state to the chosen file
    await flushWrite();
    return true;
  } catch (e: unknown) {
    // User cancelled — not an error
    if (e instanceof Error && e.name !== "AbortError") {
      console.warn("[fileAutosave] linkFile failed", e);
    }
    return false;
  }
}

/** Unlink and forget the file. */
export async function unlinkFile(): Promise<void> {
  _handle = null;
  const db = await openDb();
  const tx = db.transaction(IDB_STORE, "readwrite");
  tx.objectStore(IDB_STORE).delete(IDB_KEY);
}

/**
 * Called once on app boot: tries to restore the stored handle from IndexedDB
 * and quietly re-requests permission. Silently skips if not available.
 */
export async function initFileAutosave(): Promise<void> {
  try {
    const stored = await idbGet<FileSystemFileHandle>(IDB_KEY);
    if (
      !stored ||
      typeof (stored as FSFileHandleWithPermission).queryPermission !==
        "function"
    )
      return;
    const h = stored as FSFileHandleWithPermission;
    const perm = await h.queryPermission({ mode: "readwrite" });
    if (perm === "granted") {
      _handle = stored;
    } else if (perm === "prompt") {
      // Don't block boot with a permission dialog — keep handle ready for
      // scheduleWrite() which will request on next write attempt.
      _handle = stored;
    }
  } catch {
    /* no stored handle, ignore */
  }
}
