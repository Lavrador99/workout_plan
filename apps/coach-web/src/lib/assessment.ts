// What assessments mean: final values, asymmetries, evolution and comparison.
// Pure functions, so they work offline and give the same answer on every device.
// No thresholds on purpose: an asymmetry is shown, never classified as a risk.

import { fmtNum, uid } from "./text";
import type { Assessment, Direction, Scale, Side, TestCategory, TestDef, TestResult, Trial } from "./types";

export const SIDES: Side[] = ["left", "right"];
export const SIDE_SHORT: Record<Side, string> = { left: "E", right: "D" };
const SIDE_NAME: Record<Side, string> = { left: "esquerdo", right: "direito" };

export const TEST_CATEGORIES: TestCategory[] = [
  "antropometria",
  "mobilidade",
  "estabilidade",
  "movimento",
  "controlo motor",
  "força",
  "potência",
  "velocidade",
  "agilidade",
  "resistência",
];

/** Empty result for a test, holding a copy of what the test is today. */
export function newResult(t: TestDef): TestResult {
  const count = Math.max(1, t.trials);
  const trials: Trial[] = (t.sided ? SIDES : [undefined]).flatMap((side) =>
    Array.from({ length: count }, (): Trial => (side ? { side, value: null } : { value: null })),
  );
  return {
    id: uid(),
    testId: t.id,
    version: t.version,
    name: t.name,
    unit: t.unit,
    direction: t.direction,
    sided: t.sided,
    scale: t.scale ?? null,
    ...(t.strength ? { strength: t.strength } : {}),
    aggregate: t.aggregate,
    trials,
  };
}

/** The same tests, empty, as they are today; a test deleted since keeps its old definition. */
export function repeatResults(results: TestResult[], tests: TestDef[]): TestResult[] {
  return results.map((r) => {
    const t = tests.find((x) => x.id === r.testId);
    if (t) return newResult(t);
    return { ...r, id: uid(), instrument: undefined, note: undefined, trials: r.trials.map((x) => ({ ...(x.side ? { side: x.side } : {}), value: null })) };
  });
}

// ── Final value ─────────────────────────────────────────────────────────────

/** Beyond this the estimate is too loose to be worth showing. */
export const MAX_E1RM_REPS = 10;

/** Epley. An estimate, never equivalent to a measured 1RM. */
export function e1rm(load: number, reps: number): number | null {
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_E1RM_REPS || load <= 0) return null;
  return reps === 1 ? load : load * (1 + reps / 30);
}

const measured = (r: TestResult, t: Trial): number | null => (r.strength === "estimated" ? (t.value == null ? null : e1rm(t.value, t.reps ?? 0)) : t.value);

function values(r: TestResult, side?: Side): number[] {
  return r.trials.flatMap((t) => {
    const v = measured(r, t);
    return t.side === side && !t.invalid && v != null && Number.isFinite(v) ? [v] : [];
  });
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

/** The result on that side (no side for tests without sides); null with no valid trial. */
export function finalValue(r: TestResult, side?: Side): number | null {
  const v = values(r, side);
  if (!v.length) return null;
  if (r.aggregate === "last") return v[v.length - 1];
  if (r.aggregate === "mean" || r.direction === "neutral") return mean(v); // neutral has no best
  return r.direction === "lower" ? Math.min(...v) : Math.max(...v);
}

// ── Derived from a result ───────────────────────────────────────────────────

export const BODY_MASS_TEST = "seed-test-peso";
/** A weigh-in older than this says little about the day of the test. */
const BODY_MASS_MAX_DAYS = 60;

/** Body mass on the assessment's day, else the latest one before it, if recent. */
export function bodyMassAt(all: Assessment[], current: Assessment): { value: number; date: string } | null {
  const earliest = new Date(Date.parse(current.date) - BODY_MASS_MAX_DAYS * 86_400_000).toISOString().slice(0, 10);
  const candidates = [current, ...all.filter((a) => a.id !== current.id && !a.deleted && a.date <= current.date && a.date >= earliest).sort((a, b) => b.date.localeCompare(a.date))];
  for (const a of candidates) {
    const r = a.results.find((x) => x.testId === BODY_MASS_TEST);
    const value = r ? finalValue(r) : null;
    if (value != null && value > 0) return { value, date: a.date };
  }
  return null;
}

/** Load in multiples of body weight. Handy, but it tends to favour lighter people. */
export function relativeStrength(load: number | null, bodyMass: number | null | undefined): number | null {
  return load == null || !bodyMass || bodyMass <= 0 ? null : load / bodyMass;
}

/** Average speed in m/s. */
export function averageSpeed(distanceM: number | null | undefined, seconds: number | null): number | null {
  return !distanceM || !seconds || seconds <= 0 ? null : distanceM / seconds;
}

// ── Measurement error ───────────────────────────────────────────────────────

/** MDC95: the smallest change unlikely to be measurement error alone. */
export function mdc95(sem: number | null | undefined): number | null {
  return sem && sem > 0 ? 1.96 * Math.SQRT2 * sem : null;
}

/** A test's MDC95 for results of one protocol version: an error only holds for its own protocol. */
export function testMdc(test: TestDef | undefined, version: number): number | null {
  return test?.version === version ? mdc95(test.sem) : null;
}

// ── Asymmetry ───────────────────────────────────────────────────────────────

export interface Asymmetry {
  /** % of the better side; null on scores, neutral tests or when that side is 0. */
  pct: number | null;
  points: number; // difference in the test's unit
  /** Null on neutral tests, which have no better side. */
  better: Side | "equal" | null;
}

export function asymmetry(r: TestResult): Asymmetry | null {
  if (!r.sided) return null;
  const left = finalValue(r, "left");
  const right = finalValue(r, "right");
  if (left == null || right == null || left < 0 || right < 0) return null;
  const points = Math.abs(right - left);
  if (r.direction === "neutral") return { pct: null, points, better: null };
  const lower = r.direction === "lower";
  const best = lower ? Math.min(left, right) : Math.max(left, right);
  const better: Asymmetry["better"] = left === right ? "equal" : left === best ? "left" : "right";
  if (r.scale) return { pct: null, points, better };
  if (left === right) return { pct: 0, points, better };
  return { pct: best === 0 ? null : (points / best) * 100, points, better };
}

/** "19% · direito melhor", in the test's unit on scores and neutral tests. */
export function fmtAsymmetry(a: Asymmetry, unit: string): string {
  if (a.points === 0) return "Sem diferença";
  const size = a.pct != null ? `${Math.round(a.pct)}%` : `${fmtNum(a.points)} ${unit}`;
  return a.better === "left" || a.better === "right" ? `${size} · ${SIDE_NAME[a.better]} melhor` : `${size} de diferença`;
}

// ── Evolution ───────────────────────────────────────────────────────────────

export interface Change {
  delta: number;
  pct: number | null; // null from a first value of 0
  /** Null when nothing changed or the test has no better direction. */
  improved: boolean | null;
  /** Beyond the measurement error (true), within it (false), or that error is unknown (null). */
  confirmed: boolean | null;
}

export function change(first: number, last: number, direction: Direction, scale?: Scale | null, mdc?: number | null): Change {
  const delta = last - first;
  const improved = delta === 0 || direction === "neutral" ? null : direction === "lower" ? delta < 0 : delta > 0;
  // a % of an ordinal score means nothing
  return { delta, pct: first === 0 || scale ? null : (delta / Math.abs(first)) * 100, improved, confirmed: mdc == null ? null : Math.abs(delta) > mdc };
}

/** Good or bad only once the change is known to exceed the measurement error. */
export function changeTone(c: Change): "good" | "bad" | "neutral" {
  return c.improved == null || !c.confirmed ? "neutral" : c.improved ? "good" : "bad";
}

const signed = (n: number, text: string) => `${n > 0 ? "+" : ""}${text}`;

/** "+2,1 cm (+6%)", or only the difference when a % has no meaning. */
export function fmtChange(c: Change, unit: string): string {
  const pct = c.pct != null && c.delta !== 0 ? ` (${signed(c.pct, String(Math.round(c.pct)))}%)` : "";
  return `${signed(c.delta, fmtNum(c.delta))} ${unit}${pct}${c.confirmed === false ? " · dentro do erro" : ""}`;
}

/** % of the way from first to target. Works in both directions; negative means going backwards. */
export function goalProgress(first: number, current: number, target: number): number | null {
  return target === first ? null : ((current - first) / (target - first)) * 100;
}

/** Latest result of this test before `current`, skipping results with nothing valid. */
export function previousResult(all: Assessment[], current: Assessment, testId: string): { assessment: Assessment; result: TestResult } | null {
  const earlier = all
    .filter((a) => !a.deleted && a.id !== current.id && (a.date < current.date || (a.date === current.date && a.updatedAt < current.updatedAt)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  for (const assessment of earlier) {
    const result = assessment.results.find((r) => r.testId === testId && (r.sided ? SIDES.some((s) => finalValue(r, s) != null) : finalValue(r) != null));
    if (result) return { assessment, result };
  }
  return null;
}

export interface SeriesPoint {
  date: string;
  value: number;
  assessmentId: string;
}

export interface AsymmetryPoint extends Asymmetry {
  date: string;
  assessmentId: string;
}

/** One protocol version of a test: points from different versions never share a line. */
export interface VersionSeries {
  version: number;
  unit: string;
  direction: Direction;
  sided: boolean;
  scale?: Scale | null;
  strength?: TestResult["strength"];
  both: SeriesPoint[]; // tests without sides
  left: SeriesPoint[];
  right: SeriesPoint[];
  asymmetries: AsymmetryPoint[];
}

/** A test's results over time, oldest first, one entry per protocol version. */
export function series(assessments: Assessment[], testId: string): VersionSeries[] {
  const byVersion = new Map<number, VersionSeries>();
  const oldestFirst = assessments.filter((a) => !a.deleted).sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt - b.updatedAt);
  for (const a of oldestFirst) {
    for (const r of a.results) {
      if (r.testId !== testId) continue;
      let s = byVersion.get(r.version);
      if (!s) {
        s = { version: r.version, unit: r.unit, direction: r.direction, sided: r.sided, scale: r.scale, strength: r.strength, both: [], left: [], right: [], asymmetries: [] };
        byVersion.set(r.version, s);
      }
      const add = (list: SeriesPoint[], value: number | null) => {
        if (value != null) list.push({ date: a.date, value, assessmentId: a.id });
      };
      if (r.sided) {
        add(s.left, finalValue(r, "left"));
        add(s.right, finalValue(r, "right"));
        const asym = asymmetry(r);
        if (asym) s.asymmetries.push({ ...asym, date: a.date, assessmentId: a.id });
      } else {
        add(s.both, finalValue(r));
      }
    }
  }
  return [...byVersion.values()].sort((a, b) => a.version - b.version);
}

// ── Comparison ──────────────────────────────────────────────────────────────

export type CompareStatus = "ok" | "different-protocol" | "only-older" | "only-newer";

export interface CompareRow {
  testId: string;
  name: string;
  unit: string;
  side?: Side;
  status: CompareStatus;
  older: number | null;
  newer: number | null;
  /** Only between two values of the same protocol version. */
  change: Change | null;
}

/** Row per test and side; tests that are only in one assessment go last. */
export function compare(older: Assessment, newer: Assessment, mdcOf: (r: TestResult) => number | null = () => null): CompareRow[] {
  const rows = (o: TestResult | undefined, n: TestResult | undefined): CompareRow[] => {
    const r = (n ?? o) as TestResult;
    const status: CompareStatus = !o ? "only-newer" : !n ? "only-older" : o.version !== n.version ? "different-protocol" : "ok";
    return (r.sided ? SIDES : [undefined]).map((side) => {
      const a = o ? finalValue(o, side) : null;
      const b = n ? finalValue(n, side) : null;
      const diff = status === "ok" && a != null && b != null ? change(a, b, r.direction, r.scale, mdcOf(r)) : null;
      return { testId: r.testId, name: r.name, unit: r.unit, ...(side ? { side } : {}), status, older: a, newer: b, change: diff };
    });
  };
  const inOlder = new Map(older.results.map((r) => [r.testId, r]));
  const inNewer = new Set(newer.results.map((r) => r.testId));
  const both = newer.results.filter((r) => inOlder.has(r.testId)).flatMap((r) => rows(inOlder.get(r.testId), r));
  const onlyOlder = older.results.filter((r) => !inNewer.has(r.testId)).flatMap((r) => rows(r, undefined));
  const onlyNewer = newer.results.filter((r) => !inOlder.has(r.testId)).flatMap((r) => rows(undefined, r));
  return [...both, ...onlyOlder, ...onlyNewer];
}
