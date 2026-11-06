// What a client gained and lost in a period: tests, marks, adherence and goals.
// Pure functions over what is already stored, nothing here is saved.
// A training mark has no measurement error, so it only ever reads as indicative.

import { change, e1rm, goalProgress, series, testMdc, type Change, type SeriesPoint, type VersionSeries } from "./assessment";
import { norm } from "./text";
import type { Assessment, Client, Direction, Item, Session, SetRow, Side, TestDef } from "./types";

// ── Period ──────────────────────────────────────────────────────────────────

export type Preset = "30d" | "3m" | "6m" | "12m" | "all" | "custom";

/** Both ends included; no `from` means from the very beginning. */
export interface Range {
  from: string | null;
  to: string;
}

const DAY = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Same day n months earlier, or that month's last day when it is shorter. */
function monthsBefore(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 - n + 1, 0)).getUTCDate();
  return toIso(Date.UTC(y, m - 1 - n, Math.min(d, lastDay)));
}

export function presetRange(preset: Exclude<Preset, "custom">, today: string): Range {
  if (preset === "all") return { from: null, to: today };
  if (preset === "30d") return { from: toIso(toMs(today) - 30 * DAY), to: today };
  return { from: monthsBefore(today, parseInt(preset)), to: today };
}

/** Dates in either order, never past today. */
export function customRange(a: string, b: string, today: string): Range {
  const [from, to] = a <= b ? [a, b] : [b, a];
  return { from: from > today ? today : from, to: to > today ? today : to };
}

const within = (date: string, r: Range) => date <= r.to && (r.from == null || date >= r.from);

// ── Tests ───────────────────────────────────────────────────────────────────

/** gain/loss may still be unconfirmed (see `change.confirmed`); within = smaller than the measurement error. */
export type TestStatus = "gain" | "loss" | "within" | "flat";

export interface TestRow {
  testId: string;
  name: string;
  unit: string;
  side?: Side;
  version: number;
  /** The test has results from more than one protocol version in this period. */
  showVersion: boolean;
  estimated: boolean; // e1RM, not a measured 1RM
  base: SeriesPoint;
  last: SeriesPoint;
  change: Change;
  status: TestStatus;
}

/** A test with a single value to go on: nothing to compare it with. */
export interface SingleRow {
  testId: string;
  name: string;
  unit: string;
  side?: Side;
  last: SeriesPoint;
}

const statusOf = (c: Change): TestStatus => (c.improved == null ? "flat" : c.confirmed === false ? "within" : c.improved ? "gain" : "loss");

/** A neutral test has a better direction once the coach sets a goal: towards it. */
export function directionFor(direction: Direction, base: number, target: number | null | undefined): Direction {
  if (direction !== "neutral" || target == null || target === base) return direction;
  return target < base ? "lower" : "higher";
}

/** The last value before the period, else the first one in it. */
function reference(list: SeriesPoint[], r: Range): { base: SeriesPoint; last: SeriesPoint } | null {
  const inside = list.filter((p) => within(p.date, r));
  if (!inside.length) return null;
  const last = inside[inside.length - 1];
  const before = r.from == null ? [] : list.filter((p) => p.date < r.from!);
  return { base: before[before.length - 1] ?? inside[0], last };
}

const LISTS = (v: VersionSeries): [SeriesPoint[], Side | undefined][] => (v.sided ? [[v.left, "left"], [v.right, "right"]] : [[v.both, undefined]]);

function nameOf(assessments: Assessment[], testId: string, test: TestDef | undefined): string {
  if (test) return test.name;
  const newest = [...assessments].sort((a, b) => b.date.localeCompare(a.date)).find((a) => a.results.some((x) => x.testId === testId));
  return newest?.results.find((x) => x.testId === testId)?.name ?? "Teste";
}

export function testBalance(assessments: Assessment[], tests: TestDef[], targets: Client["targets"], r: Range): { rows: TestRow[]; singles: SingleRow[] } {
  const rows: TestRow[] = [];
  const singles: SingleRow[] = [];
  const byId = new Map(tests.map((t) => [t.id, t]));

  for (const testId of new Set(assessments.filter((a) => !a.deleted).flatMap((a) => a.results.map((x) => x.testId)))) {
    const test = byId.get(testId);
    const name = nameOf(assessments, testId, test);
    const versions = series(assessments, testId);
    const newest = versions[versions.length - 1];
    const active = versions.filter((v) => LISTS(v).some(([list]) => list.some((p) => within(p.date, r))));
    for (const v of active) {
      const mdc = testMdc(test, v.version);
      const target = v === newest ? targets?.[testId] : null; // a goal belongs to the current protocol
      for (const [list, side] of LISTS(v)) {
        const ref = reference(list, r);
        if (!ref) continue;
        const { base, last } = ref;
        const common = { testId, name, unit: v.unit, ...(side ? { side } : {}) };
        if (base.assessmentId === last.assessmentId) {
          singles.push({ ...common, last });
          continue;
        }
        const c = change(base.value, last.value, directionFor(v.direction, base.value, target), v.scale, mdc);
        rows.push({ ...common, version: v.version, showVersion: active.length > 1, estimated: v.strength === "estimated", base, last, change: c, status: statusOf(c) });
      }
    }
  }
  const byName = <T extends { name: string; side?: Side }>(a: T, b: T) => a.name.localeCompare(b.name, "pt") || (a.side ?? "").localeCompare(b.side ?? "");
  // what is known to be real goes first
  const rank = (x: TestRow) => (x.change.confirmed ? 0 : 1);
  return { rows: rows.sort((a, b) => rank(a) - rank(b) || byName(a, b)), singles: singles.sort(byName) };
}

// ── Marks ───────────────────────────────────────────────────────────────────

export interface MarkPoint {
  e1rm: number;
  load: number;
  reps: number;
  date: string;
  item: Item;
}

export type MarkStatus = "gain" | "below" | "same";

export interface MarkRow {
  /** Same key the exercise history page uses. */
  key: string;
  name: string;
  base: MarkPoint;
  best: MarkPoint;
  pct: number; // change in e1RM
  status: MarkStatus;
}

/** Only real reps at a load Epley can read: no warm-ups, added load, steps or special methods. */
function setEstimate(it: Item, set: SetRow): number | null {
  if (!set.done || set.type === "warmup" || it.repsUnit !== "r" || it.method) return null;
  return set.load == null ? null : e1rm(set.load, set.reps ?? 0);
}

const stronger = (cur: MarkPoint | undefined, next: MarkPoint) => (!cur || next.e1rm > cur.e1rm ? next : cur);

interface Group {
  key: string;
  label: string;
  sessions: Map<string, MarkPoint>; // the best set of each session
}

export function markBalance(sessions: Session[], names: Map<string, string>, r: Range): MarkRow[] {
  const groups = new Map<string, Group>();
  for (const s of sessions) {
    if (s.deleted || s.date > r.to) continue;
    for (const b of s.blocks)
      for (const it of b.items) {
        if (it.loadMode === "added") continue;
        const key = it.exerciseId ?? `n:${it.name}`;
        const id = `${it.exerciseId ?? norm(it.name)}|${it.loadMode}`; // 2×20kg and 40kg are different numbers
        for (const set of it.sets) {
          const estimate = setEstimate(it, set);
          if (estimate == null) continue;
          const g = groups.get(id) ?? { key, label: names.get(key) ?? it.name, sessions: new Map() };
          groups.set(id, g);
          const point: MarkPoint = { e1rm: estimate, load: set.load as number, reps: set.reps as number, date: s.date, item: it };
          g.sessions.set(s.id, stronger(g.sessions.get(s.id), point));
        }
      }
  }

  const rows: MarkRow[] = [];
  for (const g of groups.values()) {
    const points = [...g.sessions.values()].sort((a, b) => a.date.localeCompare(b.date));
    const inside = points.filter((p) => within(p.date, r));
    if (!inside.length) continue;
    const before = points.filter((p) => r.from != null && p.date < r.from);
    const best = inside.reduce<MarkPoint | undefined>(stronger, undefined) as MarkPoint;
    const base = before.reduce<MarkPoint | undefined>(stronger, undefined) ?? inside[0];
    if (!before.length && inside.length < 2) continue; // first time: nothing to compare it with
    const pct = ((best.e1rm - base.e1rm) / base.e1rm) * 100;
    rows.push({ key: g.key, name: g.label, base, best, pct, status: pct > 0 ? "gain" : pct < 0 ? "below" : "same" });
  }
  return rows.sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, "pt"));
}

// ── Adherence ───────────────────────────────────────────────────────────────

export const isDone = (s: Session) => s.endedAt != null || s.blocks.some((b) => b.items.some((i) => i.sets.some((x) => x.done)));

export const doneIn = (sessions: Session[], r: Range) => sessions.filter((s) => !s.deleted && within(s.date, r) && isDone(s));

export interface Adherence {
  done: number;
  /** Sessions in the period with nothing ticked: maybe missed, maybe never ticked. */
  unticked: number;
  /** Weekly frequency × weeks: an estimate, there is no plan to read it from. */
  expected: number | null;
  pct: number | null;
  /** The period starts here if the client started after it. */
  from: string | null;
}

export function adherence(sessions: Session[], assessments: Assessment[], weeklyFrequency: number | null | undefined, r: Range): Adherence {
  const live = sessions.filter((s) => !s.deleted);
  const inside = live.filter((s) => within(s.date, r));
  const done = inside.filter(isDone).length;
  const unticked = inside.filter((s) => !isDone(s) && s.blocks.some((b) => b.items.length > 0)).length;
  const first = [...live.filter(isDone).map((s) => s.date), ...assessments.filter((a) => !a.deleted).map((a) => a.date)].sort()[0] ?? null;
  const from = first == null ? r.from : r.from == null || first > r.from ? first : r.from;
  const days = from == null || from > r.to ? 0 : Math.round((toMs(r.to) - toMs(from)) / DAY) + 1;
  const expected = weeklyFrequency ? Math.round((weeklyFrequency * days) / 7) : null;
  return { done, unticked, expected: expected || null, pct: expected ? (done / expected) * 100 : null, from };
}

// ── Goals ───────────────────────────────────────────────────────────────────

export interface GoalRow {
  testId: string;
  name: string;
  unit: string;
  side?: Side;
  target: number;
  start: number; // first value on the current protocol
  current: number; // latest one by the end of the period
  date: string;
  progress: number | null; // % of the way there, see goalProgress
}

export function goalBalance(assessments: Assessment[], tests: TestDef[], targets: Client["targets"], r: Range): GoalRow[] {
  const rows: GoalRow[] = [];
  for (const [testId, target] of Object.entries(targets ?? {})) {
    const versions = series(assessments, testId);
    const v = versions[versions.length - 1];
    if (!v) continue;
    const name = nameOf(assessments, testId, tests.find((t) => t.id === testId));
    for (const [list, side] of LISTS(v)) {
      const seen = list.filter((p) => p.date <= r.to);
      if (!seen.length) continue;
      const last = seen[seen.length - 1];
      rows.push({ testId, name, unit: v.unit, ...(side ? { side } : {}), target, start: seen[0].value, current: last.value, date: last.date, progress: goalProgress(seen[0].value, last.value, target) });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt"));
}
