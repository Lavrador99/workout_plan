import { APP_PREFIXES } from "@/consts";
import type { SetLog } from "@/types";
import { dateKey } from "./date";
import { scheduleWrite } from "./fileAutosave";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE KEY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function pKey(prefix: string, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

// ─────────────────────────────────────────────────────────────────────────────
// SET LOGGING
// ─────────────────────────────────────────────────────────────────────────────

export function getLog(
  profilePrefix: string,
  date: Date,
  exKey: string,
  setIdx: number,
): SetLog | null {
  const raw = localStorage.getItem(
    pKey(profilePrefix, `log_${dateKey(date)}_${exKey}_${setIdx}`),
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SetLog;
  } catch {
    return null;
  }
}

export function saveLog(
  profilePrefix: string,
  date: Date,
  exKey: string,
  setIdx: number,
  log: SetLog,
): void {
  localStorage.setItem(
    pKey(profilePrefix, `log_${dateKey(date)}_${exKey}_${setIdx}`),
    JSON.stringify(log),
  );
  scheduleWrite();
}

export function removeLog(
  profilePrefix: string,
  date: Date,
  exKey: string,
  setIdx: number,
): void {
  localStorage.removeItem(
    pKey(profilePrefix, `log_${dateKey(date)}_${exKey}_${setIdx}`),
  );
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// SET DONE STATE
// ─────────────────────────────────────────────────────────────────────────────

export function isDone(
  profilePrefix: string,
  date: Date,
  exKey: string,
  setIdx: number,
): boolean {
  return (
    localStorage.getItem(
      pKey(profilePrefix, `done_${dateKey(date)}_${exKey}_${setIdx}`),
    ) === "1"
  );
}

export function markDone(
  profilePrefix: string,
  date: Date,
  exKey: string,
  setIdx: number,
  done: boolean,
): void {
  const k = pKey(profilePrefix, `done_${dateKey(date)}_${exKey}_${setIdx}`);
  if (done) localStorage.setItem(k, "1");
  else localStorage.removeItem(k);
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION COMPLETE
// ─────────────────────────────────────────────────────────────────────────────

export function isSessionComplete(profilePrefix: string, date: Date): boolean {
  return (
    localStorage.getItem(
      pKey(profilePrefix, `session_complete_${dateKey(date)}`),
    ) === "1"
  );
}

export function markSessionComplete(profilePrefix: string, date: Date): void {
  localStorage.setItem(
    pKey(profilePrefix, `session_complete_${dateKey(date)}`),
    "1",
  );
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION OVERRIDE
// ─────────────────────────────────────────────────────────────────────────────

export function getSessionOverride(
  profilePrefix: string,
  date: Date,
): string | null {
  return localStorage.getItem(
    pKey(profilePrefix, `session_override_${dateKey(date)}`),
  );
}

export function setSessionOverride(
  profilePrefix: string,
  date: Date,
  type: string,
): void {
  localStorage.setItem(
    pKey(profilePrefix, `session_override_${dateKey(date)}`),
    type,
  );
  scheduleWrite();
}

export function removeSessionOverride(profilePrefix: string, date: Date): void {
  localStorage.removeItem(
    pKey(profilePrefix, `session_override_${dateKey(date)}`),
  );
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// LAST WEIGHT
// ─────────────────────────────────────────────────────────────────────────────

export function getLastWeight(profilePrefix: string, exKey: string): string {
  return localStorage.getItem(pKey(profilePrefix, `lastweight_${exKey}`)) ?? "";
}

export function saveLastWeight(
  profilePrefix: string,
  exKey: string,
  weight: number,
): void {
  localStorage.setItem(
    pKey(profilePrefix, `lastweight_${exKey}`),
    String(weight),
  );
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK
// ─────────────────────────────────────────────────────────────────────────────

export function getStreak(profilePrefix: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (isSessionComplete(profilePrefix, d)) count++;
    else if (i > 0) break;
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/** Count how many distinct days had a session_complete flag in a date range */
export function getTotalSessions(
  profilePrefix: string,
  startDate: Date,
  totalDays: number,
): number {
  let count = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (isSessionComplete(profilePrefix, d)) count++;
  }
  return count;
}

/** Return all dates (as Date objects) that have a session_complete flag */
export function getCompletedDates(
  profilePrefix: string,
  startDate: Date,
  totalDays: number,
): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (isSessionComplete(profilePrefix, d)) dates.push(new Date(d));
  }
  return dates;
}

/**
 * Compute total training volume (sets × reps × weight) per week.
 * Returns an array of length `weeks`, indexed 0..weeks-1.
 */
export function getWeeklyVolumes(
  profilePrefix: string,
  startDate: Date,
  weeks: number,
): number[] {
  const result = new Array<number>(weeks).fill(0);
  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + w * 7 + dow);
      const logs = getLogsForDate(profilePrefix, d);
      for (const log of Object.values(logs)) {
        if (log.weight && log.reps) {
          result[w] += log.weight * log.reps;
        }
      }
    }
  }
  return result;
}

/** Total volume (kg×reps) over the entire programme */
export function getTotalVolume(
  profilePrefix: string,
  startDate: Date,
  totalDays: number,
): number {
  let total = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const logs = getLogsForDate(profilePrefix, d);
    for (const log of Object.values(logs)) {
      if (log.weight && log.reps) {
        total += log.weight * log.reps;
      }
    }
  }
  return total;
}

/** Max reps ever logged for a given exercise (no weight required — for bodyweight PRs) */
export function getRepsPR(
  profilePrefix: string,
  exKey: string,
  startDate: Date,
  totalDays: number,
): number {
  let pr = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    for (let s = 0; s < 6; s++) {
      const log = getLog(profilePrefix, d, exKey, s);
      if (log?.reps) pr = Math.max(pr, log.reps);
    }
  }
  return pr;
}

export function getSkillEntries(
  profilePrefix: string,
  skillKey: string,
): Array<{ value: number; date: string }> {
  const raw = localStorage.getItem(pKey(profilePrefix, `skill_${skillKey}`));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Array<{ value: number; date: string }>;
  } catch {
    return [];
  }
}

export function saveSkillEntry(
  profilePrefix: string,
  skillKey: string,
  value: number,
): void {
  const entries = getSkillEntries(profilePrefix, skillKey);
  entries.push({ value, date: new Date().toISOString() });
  localStorage.setItem(
    pKey(profilePrefix, `skill_${skillKey}`),
    JSON.stringify(entries),
  );
  scheduleWrite();
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY SCAN  (all logs for a date range)
// ─────────────────────────────────────────────────────────────────────────────

export function getLogsForDate(
  profilePrefix: string,
  date: Date,
): Record<string, SetLog> {
  const dk = dateKey(date);
  const prefix = pKey(profilePrefix, `log_${dk}_`);
  const out: Record<string, SetLog> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const suffix = k.slice(prefix.length); // "exKey_setIdx"
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      out[suffix] = JSON.parse(raw) as SetLog;
    } catch {
      /* skip */
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT / IMPORT SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

export function buildSnapshot(): Record<string, string> {
  const data: Record<string, string> = {};

  // Save profile metadata
  const profiles = localStorage.getItem("treino_profiles");
  if (profiles) data["treino_profiles"] = profiles;
  const active = localStorage.getItem("treino_active_profile");
  if (active) data["treino_active_profile"] = active;

  // Save all profile-prefixed keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    const match = APP_PREFIXES.some(
      (p) => k.includes("_" + p) || k.startsWith(p),
    );
    if (!match && k !== "treino_autosave") continue;
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  }

  return data;
}

export function restoreSnapshot(data: Record<string, string>): void {
  // Clear existing profile data
  const toRemove: string[] = [
    "treino_profiles",
    "treino_active_profile",
    "treino_autosave",
  ];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (APP_PREFIXES.some((p) => k.includes("_" + p) || k.startsWith(p))) {
      toRemove.push(k);
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k));

  // Restore
  Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
  scheduleWrite();
}

export function exportJSON(): void {
  const snapshot = buildSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "treino_autosave.json";
  a.click();
  URL.revokeObjectURL(url);
}
