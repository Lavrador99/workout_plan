// A run split into segments, each by distance or time, with a heart rate or
// pace zone as its goal. Each segment is one set of the item (metres in `reps`,
// seconds in `duration`), so ticking, live mode and counts work as for any set.
// The bands are common starting points, not values measured on the client.

import { fmtNum, fmtSec } from "./text";
import type { Client, Item, RunZone, SetRow } from "./types";

export const ZONES = [1, 2, 3, 4, 5] as const;

/** % of the maximum heart rate, or of the reserve when the resting rate is known. */
const HR_BANDS: Record<RunZone["zone"], { name: string; from: number; to: number }> = {
  1: { name: "Recuperação", from: 50, to: 60 },
  2: { name: "Aeróbio", from: 60, to: 70 },
  3: { name: "Tempo", from: 70, to: 80 },
  4: { name: "Limiar", from: 80, to: 90 },
  5: { name: "VO2máx", from: 90, to: 100 },
};

/** % of the threshold pace; a higher % is slower. Open-ended at both ends. */
const PACE_BANDS: Record<RunZone["zone"], { name: string; slow: number | null; fast: number | null }> = {
  1: { name: "Regenerativo", slow: null, fast: 129 },
  2: { name: "Fácil", slow: 129, fast: 114 },
  3: { name: "Moderado", slow: 113, fast: 106 },
  4: { name: "Limiar", slow: 105, fast: 99 },
  5: { name: "Intervalado", slow: 99, fast: null },
};

export const zoneName = (z: RunZone) => (z.kind === "hr" ? HR_BANDS : PACE_BANDS)[z.zone].name;

/** "FC Z2", "Ritmo Z4". */
export const fmtZone = (z: RunZone) => `${z.kind === "hr" ? "FC" : "Ritmo"} Z${z.zone}`;

/** 270 → "4:30". */
export function fmtPace(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "4:30" → 270; null unless it is a whole minutes:seconds pace. */
export function parsePace(text: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

type ZoneClient = Pick<Client, "hrMax" | "hrRest" | "thresholdPace">;

/** What the zone means for this client; null without the value it depends on. */
export function zoneRange(z: RunZone, c: ZoneClient | null | undefined): string | null {
  if (z.kind === "hr") {
    if (!c?.hrMax) return null;
    const rest = c.hrRest ?? 0; // with a resting rate, Karvonen; else a plain % of the maximum
    const bpm = (pct: number) => Math.round(rest + ((c.hrMax as number) - rest) * (pct / 100));
    return `${bpm(HR_BANDS[z.zone].from)}–${bpm(HR_BANDS[z.zone].to)} bpm`;
  }
  if (!c?.thresholdPace) return null;
  const { slow, fast } = PACE_BANDS[z.zone];
  const at = (pct: number) => fmtPace(((c.thresholdPace as number) * pct) / 100);
  if (slow == null) return `mais lento que ${at(fast as number)}/km`;
  if (fast == null) return `mais rápido que ${at(slow)}/km`;
  return `${at(fast)}–${at(slow)}/km`;
}

/** "1,5km", "10min". */
export function fmtDistanceOrTime(s: SetRow): string {
  if (s.duration != null) return fmtSec(s.duration);
  return s.reps != null ? `${fmtNum(s.reps / 1000)}km` : "";
}

/** "1,5km · FC Z2". */
export const fmtSegment = (s: SetRow) => [fmtDistanceOrTime(s), s.zone && fmtZone(s.zone)].filter(Boolean).join(" · ");

export function runTotals(item: Pick<Item, "sets">): { km: number; seconds: number } {
  return { km: item.sets.reduce((n, s) => n + (s.reps ?? 0), 0) / 1000, seconds: item.sets.reduce((n, s) => n + (s.duration ?? 0), 0) };
}

/** "8km + 20min", the parts it has. */
export function fmtRunTotal(item: Pick<Item, "sets">): string {
  const { km, seconds } = runTotals(item);
  return [km > 0 && `${fmtNum(km)}km`, seconds > 0 && fmtSec(seconds)].filter(Boolean).join(" + ");
}

export const newSegment = (): SetRow => ({ reps: 1000, duration: null, load: null, done: false, zone: { kind: "hr", zone: 2 } });

/** An item ready to run: tell it apart by the exercise's tag. */
export const RUN_TAG = "corrida";
