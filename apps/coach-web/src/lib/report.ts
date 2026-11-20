// The assessment report handed to the client. Only facts come from here: the
// coach writes the findings, priorities and plan. It leaves the app, so health
// data stays out except what matters for training (injuries, medical clearance).

import { asymmetry, compare, finalValue, fmtAsymmetry, SIDES, TEST_CATEGORIES, testMdc, type Change } from "./assessment";
import { goalBalance, metricRow, type GoalRow } from "./balance";
import { benchmark, clientContext, fmtPosition, type ReferenceSource } from "./benchmark";
import { targetsOf } from "./progress";
import { clearanceNeeded } from "./screening";
import { fmtDate } from "@treino/core/text";
import type { Assessment, AssessmentReport, Client, Focus, Goal, Screening, Side, TestCategory, TestDef, TestResult } from "@treino/core/types";

export const MAX_PRIORITIES = 3;
/** Default gap to the next assessment. */
export const REASSESS_WEEKS = 6;

export function emptyReport(): AssessmentReport {
  return { compareWith: null, findings: "", priorities: [], plan: "", nextDate: null };
}

export function addWeeks(iso: string, weeks: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

const hasValue = (r: TestResult) => (r.sided ? SIDES.some((s) => finalValue(r, s) != null) : finalValue(r) != null);
const before = (a: Assessment, b: Assessment) => a.date < b.date || (a.date === b.date && a.updatedAt < b.updatedAt);

/** Earlier assessments with results, newest first: what the report can compare with. */
export function baselines(all: Assessment[], current: Assessment): Assessment[] {
  return all
    .filter((a) => !a.deleted && a.id !== current.id && before(a, current) && a.results.some(hasValue))
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
}

/** The one chosen, or else the latest earlier one. */
export function baselineOf(all: Assessment[], current: Assessment): Assessment | null {
  const list = baselines(all, current);
  const chosen = current.report?.compareWith;
  return (chosen ? list.find((a) => a.id === chosen) : undefined) ?? list[0] ?? null;
}

export interface ReportSide {
  side?: Side;
  now: number | null;
  before: number | null;
  change: Change | null;
}

export interface ReportReference {
  position: string; // "P62"
  label: string; // the population
  estimated: boolean; // from mean and SD
}

export interface ReportRow {
  testId: string;
  name: string;
  unit: string;
  estimated: boolean; // e1RM
  differentProtocol: boolean;
  sides: ReportSide[];
  asymmetry: string | null;
  reference: ReportReference | null;
}

export interface ReportGroup {
  category: TestCategory | null;
  rows: ReportRow[];
}

export interface Report {
  baseline: Assessment | null;
  groups: ReportGroup[];
  goals: GoalRow[];
  /** Goals with nothing to measure: shown by name. */
  otherGoals: Goal[];
  cautions: string[];
  sources: ReferenceSource[];
  /** Some change is within the measurement error, or the error is unknown: say why it has no colour. */
  uncoloured: boolean;
}

export interface ReportInput {
  client: Client;
  assessment: Assessment;
  assessments: Assessment[];
  tests: TestDef[];
  focuses: Focus[];
  goals: Goal[];
  screenings: Screening[];
}

/** The value a reference compares: the best side, and only with both sides measured. */
function referenceValue(r: TestResult): number | null {
  if (!r.sided) return finalValue(r);
  const [left, right] = [finalValue(r, "left"), finalValue(r, "right")];
  if (left == null || right == null) return null;
  return r.direction === "lower" ? Math.min(left, right) : Math.max(left, right);
}

function referenceOf(r: TestResult, input: ReportInput): { reference: ReportReference; source: ReferenceSource | undefined } | null {
  const value = referenceValue(r);
  if (value == null) return null;
  const outcome = benchmark(r, value, clientContext(input.client, input.focuses, input.assessment.date));
  if (outcome.status !== "ok") return null;
  const b = outcome.benchmarks[0];
  return { reference: { position: fmtPosition(b.position), label: b.dataset.label, estimated: b.position.estimated }, source: b.source };
}

/** Care for training from the latest screening up to the report's date. No diagnoses, medication or symptoms. */
export function reportCautions(screenings: Screening[], date: string): string[] {
  const s = screenings.filter((x) => !x.deleted && x.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!s) return [];
  const side = (v: Side | "both" | null) => (v === "left" ? " esquerdo" : v === "right" ? " direito" : v === "both" ? " (ambos os lados)" : "");
  const injuries = s.injuries
    .filter((i) => i.status !== "recovered" && i.region)
    .map((i) => `${i.region}${side(i.side)}, ${i.status === "active" ? "lesão ativa" : "em recuperação"}${i.aggravates ? `: evitar ${i.aggravates.charAt(0).toLowerCase()}${i.aggravates.slice(1)}` : ""}.`);
  const clearance = !clearanceNeeded(s)
    ? []
    : s.clearance
      ? [`Autorização médica de ${fmtDate(s.clearance.date)}${s.clearance.restrictions ? `. Restrições: ${s.clearance.restrictions}` : ""}.`]
      : ["Aguarda autorização médica antes de aumentar a intensidade."];
  return [...clearance, ...injuries];
}

export function buildReport(input: ReportInput): Report {
  const { assessment: current, assessments, tests } = input;
  const baseline = baselineOf(assessments, current);
  const mdcOf = (r: TestResult) => testMdc(tests.find((t) => t.id === r.testId), r.version);
  const empty: Assessment = { ...current, id: "", results: [] };
  const rows = compare(baseline ?? empty, current, mdcOf).filter((r) => r.status !== "only-older");
  const sources = new Map<string, ReferenceSource>();
  let uncoloured = false;

  const byTest: ReportRow[] = current.results.filter(hasValue).map((r) => {
    const mine = rows.filter((x) => x.testId === r.testId);
    const sides = mine.map((x): ReportSide => ({ ...(x.side ? { side: x.side } : {}), now: x.newer, before: baseline ? x.older : null, change: x.change }));
    if (sides.some((x) => x.change && x.change.improved != null && !x.change.confirmed)) uncoloured = true;
    const asym = asymmetry(r);
    const ref = referenceOf(r, input);
    if (ref?.source) sources.set(ref.source.id, ref.source);
    return {
      testId: r.testId,
      name: r.name,
      unit: r.unit,
      estimated: r.strength === "estimated",
      differentProtocol: mine.some((x) => x.status === "different-protocol"),
      sides,
      asymmetry: asym ? fmtAsymmetry(asym, r.unit) : null,
      reference: ref?.reference ?? null,
    };
  });

  const categoryOf = (testId: string): TestCategory | null => {
    const c = tests.find((t) => t.id === testId)?.category;
    return c && TEST_CATEGORIES.includes(c) ? c : null;
  };
  const groups: ReportGroup[] = [...TEST_CATEGORIES, null]
    .map((category) => ({ category, rows: byTest.filter((row) => categoryOf(row.testId) === category) }))
    .filter((g) => g.rows.length);

  const live = input.goals.filter((g) => !g.deleted && g.status !== "dropped");
  const upTo = assessments.filter((a) => !a.deleted && !before(current, a));
  const goals = [...goalBalance(upTo, tests, targetsOf(live), { from: null, to: current.date }), ...live.filter((g) => !g.testId).flatMap((g) => metricRow(g) ?? [])];
  const otherGoals = live.filter((g) => !g.testId && !metricRow(g));

  return { baseline, groups, goals, otherGoals, cautions: reportCautions(input.screenings, current.date), sources: [...sources.values()], uncoloured };
}
