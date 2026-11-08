// What a client gained and lost in a period: tests, marks, adherence and goals.
// Pure functions over what is already stored, nothing here is saved.
// A training mark has no measurement error, so it only ever reads as indicative.

import { change, estimatedRm, goalProgress, series, testMdc, type Change, type SeriesPoint, type VersionSeries } from "./assessment";
import { norm } from "@treino/core/text";
import { metricProgress } from "./progress";
import type { Activity, Assessment, Client, Direction, Goal, Item, ScheduleChange, Session, SetRow, Side, TestDef } from "@treino/core/types";

// ── Period ──────────────────────────────────────────────────────────────────

export type Preset = "30d" | "3m" | "6m" | "12m" | "all" | "custom";

export const PERIODS: [Exclude<Preset, "custom">, string][] = [
  ["30d", "30 dias"],
  ["3m", "3 m"],
  ["6m", "6 m"],
  ["12m", "12 m"],
  ["all", "Tudo"],
];

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

export const sideLists = (v: VersionSeries): [SeriesPoint[], Side | undefined][] => (v.sided ? [[v.left, "left"], [v.right, "right"]] : [[v.both, undefined]]);

function nameOf(assessments: Assessment[], testId: string, test: TestDef | undefined): string {
  if (test) return test.name;
  const newest = [...assessments].sort((a, b) => b.date.localeCompare(a.date)).find((a) => a.results.some((x) => x.testId === testId));
  return newest?.results.find((x) => x.testId === testId)?.name ?? "Teste";
}

export function testBalance(assessments: Assessment[], tests: TestDef[], targets: Record<string, number> | undefined, r: Range): { rows: TestRow[]; singles: SingleRow[] } {
  const rows: TestRow[] = [];
  const singles: SingleRow[] = [];
  const byId = new Map(tests.map((t) => [t.id, t]));

  for (const testId of new Set(assessments.filter((a) => !a.deleted).flatMap((a) => a.results.map((x) => x.testId)))) {
    const test = byId.get(testId);
    const name = nameOf(assessments, testId, test);
    const versions = series(assessments, testId);
    const newest = versions[versions.length - 1];
    const active = versions.filter((v) => sideLists(v).some(([list]) => list.some((p) => within(p.date, r))));
    for (const v of active) {
      const mdc = testMdc(test, v.version);
      const target = v === newest ? targets?.[testId] : null; // a goal belongs to the current protocol
      for (const [list, side] of sideLists(v)) {
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
  e1rm: number | null; // null when Epley cannot read the set
  load: number;
  reps: number | null;
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
  /** By estimated RM, or by the load alone when any session has no RM to compare. */
  basis: "rm" | "load";
  pct: number;
  status: MarkStatus;
}

/** A loaded set not ticked yet, of an exercise with marks: it may have been done. */
export interface PendingMark {
  sessionId: string;
  name: string;
  point: MarkPoint;
}

/** Real reps at a load Epley can read: no added load, steps or special methods. */
function setEstimate(it: Item, set: SetRow): number | null {
  if (it.loadMode === "added" || it.repsUnit !== "r" || it.method) return null;
  return estimatedRm(set.load as number, set.reps ?? 0);
}

const isMark = (set: SetRow) => (set.load ?? 0) > 0 && set.type !== "warmup";

const pointOf = (it: Item, set: SetRow, date: string): MarkPoint => ({ e1rm: setEstimate(it, set), load: set.load as number, reps: set.reps ?? null, date, item: it });

interface Group {
  key: string;
  label: string;
  sessions: Map<string, MarkPoint[]>; // the ticked sets of each session
  pending: { sessionId: string; point: MarkPoint }[];
}

function markGroups(sessions: Session[], names: Map<string, string>, r: Range): Group[] {
  const groups = new Map<string, Group>();
  for (const s of sessions) {
    if (s.deleted || s.date > r.to) continue;
    for (const b of s.blocks)
      for (const it of b.items) {
        const key = it.exerciseId ?? `n:${it.name}`;
        const id = `${it.exerciseId ?? norm(it.name)}|${it.loadMode}`; // 2×20kg, 40kg and +40kg are different numbers
        for (const set of it.sets) {
          if (!isMark(set)) continue;
          const g: Group = groups.get(id) ?? { key, label: names.get(key) ?? it.name, sessions: new Map(), pending: [] };
          groups.set(id, g);
          const point = pointOf(it, set, s.date);
          if (set.done) g.sessions.set(s.id, [...(g.sessions.get(s.id) ?? []), point]);
          else if (within(s.date, r)) g.pending.push({ sessionId: s.id, point });
        }
      }
  }
  return [...groups.values()];
}

const bestBy = (list: MarkPoint[], value: (p: MarkPoint) => number) => list.reduce((a, b) => (value(b) > value(a) ? b : a));

function markRow(g: Group, r: Range): MarkRow | null {
  const days = [...g.sessions.values()];
  const basis = days.every((sets) => sets.some((p) => p.e1rm != null)) ? "rm" : "load";
  const value = (p: MarkPoint) => (basis === "rm" ? (p.e1rm ?? 0) : p.load);
  const points = days.map((sets) => bestBy(sets, value)).sort((a, b) => a.date.localeCompare(b.date));
  const inside = points.filter((p) => within(p.date, r));
  if (!inside.length) return null;
  const before = points.filter((p) => r.from != null && p.date < r.from);
  if (!before.length && inside.length < 2) return null; // first time: nothing to compare it with
  const best = bestBy(inside, value);
  const base = before.length ? bestBy(before, value) : inside[0];
  const pct = ((value(best) - value(base)) / value(base)) * 100;
  return { key: g.key, name: g.label, base, best, basis, pct, status: pct > 0 ? "gain" : pct < 0 ? "below" : "same" };
}

export function markBalance(sessions: Session[], names: Map<string, string>, r: Range): MarkRow[] {
  return markGroups(sessions, names, r)
    .flatMap((g) => markRow(g, r) ?? [])
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name, "pt"));
}

/** The heaviest set not ticked per exercise: never counted as done, but not left out of sight. */
export function pendingMarks(sessions: Session[], names: Map<string, string>, r: Range): PendingMark[] {
  return markGroups(sessions, names, r)
    .filter((g) => g.sessions.size > 0 && g.pending.length > 0)
    .map((g) => {
      const top = g.pending.reduce((a, b) => (b.point.load > a.point.load ? b : a));
      return { ...top, name: g.label };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

// ── Adherence ───────────────────────────────────────────────────────────────

export const isDone = (s: Session) => s.endedAt != null || s.blocks.some((b) => b.items.some((i) => i.sets.some((x) => x.done)));

export const doneIn = (sessions: Session[], r: Range) => sessions.filter((s) => !s.deleted && within(s.date, r) && isDone(s));

export interface Adherence {
  done: number;
  /** Sessions in the period with nothing ticked: maybe missed, maybe never ticked. */
  unticked: number;
  /** From the planned week; for days before there was one, the weekly frequency. */
  expected: number | null;
  pct: number | null;
  source: "plan" | "estimate" | null;
  /** The period starts here if the client started after it. */
  from: string | null;
}

export type AdherencePlan = Pick<Client, "weeklyFrequency" | "schedule" | "adherenceSkips">;

export const ACTIVITIES: [Activity, string][] = [
  ["treino", "Treino"],
  ["cardio", "Cardio"],
  ["mobilidade", "Mobilidade"],
  ["avaliacao", "Avaliação"],
  ["outro", "Outro"],
];

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** The planned days that held on `date`; a client's history keeps every change. */
const entryOn = (schedule: ScheduleChange[], date: string) => schedule.filter((e) => e.from <= date).pop();

export const currentDays = (c: Pick<Client, "schedule">, date: string): number[] => entryOn(c.schedule ?? [], date)?.days ?? [];

/** The fields to save for a new planned week, kept apart from the one before. */
export function changeSchedule(c: Pick<Client, "schedule">, days: number[], today: string): Partial<Client> {
  const list = c.schedule ?? [];
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join() === currentDays(c, today).join() && list.length) return {};
  return { schedule: [...list.filter((e) => e.from !== today), { from: today, days: sorted }] };
}

/** Sessions planned in a span, and whether any of them is only an estimate. */
export function plannedSessions(p: AdherencePlan, from: string, to: string): { count: number; estimated: boolean } {
  const schedule = p.schedule ?? [];
  let planned = 0;
  let estimatedDays = 0;
  for (let ms = toMs(from); ms <= toMs(to); ms += DAY) {
    const entry = entryOn(schedule, toIso(ms));
    if (!entry) estimatedDays++;
    else if (entry.days.includes((new Date(ms).getUTCDay() + 6) % 7)) planned++;
  }
  const frequency = p.weeklyFrequency ?? 0;
  return { count: Math.round(planned + (frequency * estimatedDays) / 7), estimated: frequency > 0 && estimatedDays > 0 };
}

export function adherence(sessions: Session[], assessments: Assessment[], plan: AdherencePlan, r: Range): Adherence {
  const live = sessions.filter((s) => !s.deleted);
  const counts = (s: Session) => !s.noAdherence && !plan.adherenceSkips?.includes(s.activity ?? "treino");
  const inside = live.filter((s) => within(s.date, r) && counts(s));
  const done = inside.filter(isDone).length;
  const unticked = inside.filter((s) => !isDone(s) && s.blocks.some((b) => b.items.length > 0)).length;
  const first = [...live.filter(isDone).map((s) => s.date), ...assessments.filter((a) => !a.deleted).map((a) => a.date)].sort()[0] ?? null;
  const from = first == null ? r.from : r.from == null || first > r.from ? first : r.from;
  const { count, estimated } = from == null || from > r.to ? { count: 0, estimated: false } : plannedSessions(plan, from, r.to);
  return { done, unticked, expected: count || null, pct: count ? (done / count) * 100 : null, source: !count ? null : estimated ? "estimate" : "plan", from };
}

export interface MonthAdherence extends Pick<Adherence, "done" | "expected" | "pct"> {
  month: string; // YYYY-MM
}

/** Month by month, each cut to the period and to when the client started. */
export function monthlyAdherence(sessions: Session[], assessments: Assessment[], plan: AdherencePlan, r: Range): MonthAdherence[] {
  const start = adherence(sessions, assessments, plan, r).from;
  if (start == null || start > r.to) return [];
  const months: MonthAdherence[] = [];
  let [y, m] = start.split("-").map(Number);
  while (toIso(Date.UTC(y, m - 1, 1)) <= r.to) {
    const first = toIso(Date.UTC(y, m - 1, 1));
    const last = toIso(Date.UTC(y, m, 0));
    const part = { from: first < start ? start : first, to: last > r.to ? r.to : last };
    const { done, expected, pct } = adherence(sessions, assessments, plan, part);
    months.push({ month: first.slice(0, 7), done, expected, pct });
    [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  }
  return months;
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

/** A metric of its own, in the same shape as a test's goal. */
export function metricRow(g: Goal): GoalRow | null {
  const progress = metricProgress(g);
  if (g.unit == null || g.startValue == null || g.target == null) return null;
  return { testId: g.id, name: g.title, unit: g.unit, target: g.target, start: g.startValue, current: g.currentValue ?? g.startValue, date: "", progress };
}

export function goalBalance(assessments: Assessment[], tests: TestDef[], targets: Record<string, number> | undefined, r: Range): GoalRow[] {
  const rows: GoalRow[] = [];
  for (const [testId, target] of Object.entries(targets ?? {})) {
    const versions = series(assessments, testId);
    const v = versions[versions.length - 1];
    if (!v) continue;
    const name = nameOf(assessments, testId, tests.find((t) => t.id === testId));
    for (const [list, side] of sideLists(v)) {
      const seen = list.filter((p) => p.date <= r.to);
      if (!seen.length) continue;
      const last = seen[seen.length - 1];
      rows.push({ testId, name, unit: v.unit, ...(side ? { side } : {}), target, start: seen[0].value, current: last.value, date: last.date, progress: goalProgress(seen[0].value, last.value, target) });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt"));
}
