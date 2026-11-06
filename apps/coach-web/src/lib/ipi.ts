// The Individual Progress Index: how far a client has come towards their own
// goals. It is not a clinical or scientific scale, and it is only meaningful
// against itself. Pure functions; what it gives is kept as a ProgressSnapshot.
//
// The cut-offs below are starting choices, not validated limits. Changing them
// or any formula means raising METHOD, so old results keep saying how they were made.

import { change, finalValue, goalProgress, series, testMdc, type Change } from "./assessment";
import { adherence, directionFor, sideLists } from "./balance";
import { benchmark, clientContext, latestComparable } from "./benchmark";
import { DIMENSIONS, sameWeights, weightsOf } from "./progress";
import type { Assessment, Client, DimensionId, DimensionState, Focus, Goal, ProgressSnapshot, ProgressStatus, Session, SnapshotDimension, SnapshotIndicator, TestCategory, TestDef, Weights } from "./types";

export const METHOD = 1;

/** Below this share of the weight with data, the index says too little to read. */
export const MIN_COVERAGE = 50;

const DIMENSION_OF: Record<TestCategory, DimensionId> = {
  antropometria: "composicao",
  mobilidade: "mobilidade",
  estabilidade: "mobilidade",
  movimento: "mobilidade",
  "controlo motor": "mobilidade",
  força: "forca",
  potência: "forca",
  resistência: "cardio",
  velocidade: "geral",
  agilidade: "geral",
};

export interface IpiInput {
  client: Client;
  assessments: Assessment[];
  tests: TestDef[];
  goals: Goal[];
  sessions: Session[];
  focuses: Focus[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const round = (n: number) => Math.round(n * 10) / 10;
const lastOf = <T>(items: T[]): T | undefined => items[items.length - 1];
const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;

/** % of the way to the goal. A change within the measurement error is no change. */
export function indicatorScore(first: number, current: number, target: number, c: Change): number {
  const progress = goalProgress(first, current, target);
  if (progress == null) return c.improved === false && c.confirmed !== false ? 0 : 100; // started on the goal
  return c.confirmed === false ? 0 : clamp(progress);
}

/** One line per test and side with a goal and two results of the same protocol. */
function indicators(input: IpiInput, date: string): (SnapshotIndicator & { dimension: DimensionId })[] {
  const out: (SnapshotIndicator & { dimension: DimensionId })[] = [];
  for (const g of input.goals) {
    if (g.deleted || g.status === "dropped" || !g.testId || g.target == null) continue;
    const test = input.tests.find((t) => t.id === g.testId);
    const v = lastOf(series(input.assessments, g.testId));
    if (!test || !v) continue;
    for (const [list, side] of sideLists(v)) {
      const seen = list.filter((p) => p.date <= date);
      const [start, last] = [seen[0], lastOf(seen)];
      if (!start || !last || start.assessmentId === last.assessmentId) continue;
      const c = change(start.value, last.value, directionFor(v.direction, start.value, g.target), v.scale, testMdc(test, v.version));
      out.push({
        dimension: DIMENSION_OF[test.category],
        testId: test.id,
        name: test.name,
        unit: v.unit,
        ...(side ? { side } : {}),
        version: v.version,
        origin: v.strength === "estimated" ? "estimated" : "measured",
        first: start.value,
        current: last.value,
        target: g.target,
        improved: c.improved,
        confirmed: c.confirmed,
        score: round(indicatorScore(start.value, last.value, g.target, c)),
      });
    }
  }
  return out;
}

/** Both sides of a test count as one indicator, so a sided test does not weigh double. */
function scoreOf(list: SnapshotIndicator[]): number {
  const byTest = new Map<string, number[]>();
  for (const i of list) byTest.set(i.testId, [...(byTest.get(i.testId) ?? []), i.score]);
  return mean([...byTest.values()].map(mean));
}

/** Changes known to be real decide; with none, the unconfirmed ones give a provisional reading. */
export function dimensionState(list: Pick<SnapshotIndicator, "improved" | "confirmed">[]): { state: DimensionState; provisional: boolean } {
  const count = (confirmed: boolean | null, improved: boolean) => list.filter((i) => i.confirmed === confirmed && i.improved === improved).length;
  const read = (up: number, down: number): DimensionState => (up > down ? "improving" : down > up ? "regressing" : "stable");
  const [up, down] = [count(true, true), count(true, false)];
  if (up || down) return { state: read(up, down), provisional: false };
  const [maybeUp, maybeDown] = [count(null, true), count(null, false)];
  return { state: read(maybeUp, maybeDown), provisional: maybeUp + maybeDown > 0 };
}

/** From how many dimensions moved, not from a size of the index, which means nothing outside this client. */
export function statusOf(dimensions: Pick<SnapshotDimension, "id" | "state">[], ipi: number | null, coverage: number): ProgressStatus {
  const read = dimensions.filter((d) => d.id !== "adesao" && d.state != null);
  if (ipi == null || coverage < MIN_COVERAGE || !read.length) return "insufficient";
  const up = read.filter((d) => d.state === "improving").length;
  const down = read.filter((d) => d.state === "regressing").length;
  if (down > up) return "regression";
  if (!up && !down) return "stagnant";
  if (!down && up * 3 >= read.length * 2) return "positive";
  return up * 3 >= read.length ? "moderate" : "reduced";
}

function currentCondition(input: IpiInput, date: string): { icc: number | null; iccTests: number } {
  const ctx = clientContext(input.client, input.focuses, date);
  const percentiles: number[] = [];
  for (const testId of new Set(input.assessments.flatMap((a) => a.results.map((r) => r.testId)))) {
    const v = lastOf(series(input.assessments, testId));
    if (!v) continue;
    const upTo = <T extends { date: string }>(list: T[]) => list.filter((p) => p.date <= date);
    const last = latestComparable({ ...v, both: upTo(v.both), left: upTo(v.left), right: upTo(v.right) });
    if (!last) continue;
    const outcome = benchmark({ testId, ...v }, last.value, ctx);
    if (outcome.status === "ok") percentiles.push(outcome.benchmarks[0].position.percentile); // the closest population
  }
  return { icc: percentiles.length ? round(mean(percentiles)) : null, iccTests: percentiles.length };
}

function goalsMet(goals: Goal[], rows: SnapshotIndicator[], date: string): { io: number | null; ioGoals: number } {
  const scores = goals.flatMap((g): number[] => {
    if (g.deleted || g.status === "dropped") return [];
    if (g.status === "achieved" && (g.achievedAt ?? "") <= date) return [100];
    if (!g.testId) return [0];
    const mine = rows.filter((r) => r.testId === g.testId);
    return mine.length ? [mean(mine.map((r) => r.score))] : []; // nothing to read it from yet
  });
  return { io: scores.length ? round(mean(scores)) : null, ioGoals: scores.length };
}

const list = (names: string[]) => (names.length < 2 ? names[0] : `${names.slice(0, -1).join(", ")} e ${lastOf(names)}`).toLowerCase();

export const STATUS_LABEL: Record<ProgressStatus, string> = {
  positive: "Evolução global positiva",
  moderate: "Evolução moderada",
  reduced: "Evolução reduzida",
  stagnant: "Estagnação",
  regression: "Regressão",
  insufficient: "Dados insuficientes para avaliar",
};

/** Says only what the calculation found. */
export function describe(c: Pick<ProgressSnapshot, "status" | "provisional" | "dimensions" | "ia" | "io">): string {
  const named = (state: DimensionState) => c.dimensions.filter((d) => d.id !== "adesao" && d.state === state).map((d) => DIMENSIONS.find((x) => x.id === d.id)!.label);
  const empty = c.dimensions.filter((d) => d.state == null && d.id !== "adesao").map((d) => DIMENSIONS.find((x) => x.id === d.id)!.label);
  const [up, flat, down] = [named("improving"), named("stable"), named("regressing")];
  return [
    `${STATUS_LABEL[c.status]}.`,
    up.length ? `Melhoria em ${list(up)}.` : "",
    flat.length ? `Sem mudança relevante em ${list(flat)}.` : "",
    down.length ? `Em regressão: ${list(down)}. Pode precisar de atenção.` : "",
    empty.length ? `Sem dados em ${list(empty)}.` : "",
    c.ia != null ? `Adesão estimada de ${Math.round(c.ia)}%.` : "",
    c.io != null ? `Objetivos cumpridos a ${Math.round(c.io)}%.` : "",
    c.provisional ? "Leitura por confirmar: há testes sem erro de medição definido." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export type Calculation = Omit<ProgressSnapshot, "id" | "updatedAt" | "deleted" | "dirty" | "recalculated">;

/** The index as of one date, with what it was made from. */
export function calculate(input: IpiInput, date: string, weights: Weights = weightsOf(input.client)): Calculation {
  const rows = indicators(input, date);
  const a = adherence(input.sessions, input.assessments, input.client.weeklyFrequency, { from: null, to: date });

  const raw = DIMENSIONS.map(({ id }) => {
    const mine = rows.filter((r) => r.dimension === id).map(({ dimension: _d, ...r }): SnapshotIndicator => r);
    if (id === "adesao") return { id, score: a.pct == null ? null : round(clamp(a.pct)), state: null, provisional: false, indicators: mine };
    return { id, score: mine.length ? round(scoreOf(mine)) : null, ...(mine.length ? dimensionState(mine) : { state: null, provisional: false }), indicators: mine };
  });

  const valid = raw.filter((d) => d.score != null);
  const coverage = valid.reduce((sum, d) => sum + weights[d.id], 0);
  const dimensions: SnapshotDimension[] = raw.map((d) => ({ ...d, weight: d.score == null || !coverage ? 0 : round((weights[d.id] / coverage) * 100) }));
  // adherence alone is effort, not progress
  const ipi = coverage && valid.some((d) => d.id !== "adesao") ? round(valid.reduce((sum, d) => sum + (d.score as number) * weights[d.id], 0) / coverage) : null;

  const status = statusOf(dimensions, ipi, coverage);
  const provisional = dimensions.some((d) => d.provisional);
  const ia = a.pct == null ? null : round(a.pct);
  const { io, ioGoals } = goalsMet(input.goals, rows, date);
  const core = { status, provisional, dimensions, ia, io };
  return { clientId: input.client.id, date, method: METHOD, primaryGoal: input.client.primaryGoal ?? "saude", weights, ipi, coverage, ...currentCondition(input, date), ia, io, ioGoals, status, provisional, dimensions, interpretation: describe(core) };
}

// ── Snapshots ───────────────────────────────────────────────────────────────

/** Dates with at least one result: an assessment still empty says nothing. */
export function assessedDates(assessments: Assessment[]): string[] {
  const hasValue = (a: Assessment) => a.results.some((r) => (r.sided ? finalValue(r, "left") ?? finalValue(r, "right") : finalValue(r)) != null);
  return [...new Set(assessments.filter((a) => !a.deleted && hasValue(a)).map((a) => a.date))].sort();
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Same content gives the same id, so two devices arrive at one record. */
function toSnapshot(c: Calculation, recalculated: boolean): ProgressSnapshot {
  const { interpretation: _text, ...content } = c;
  return { ...c, id: `snap-${c.clientId}-${c.date}-m${c.method}-${hash(JSON.stringify(content))}`, updatedAt: 0, ...(recalculated ? { recalculated } : {}) };
}

/** The snapshot in force per date, oldest date first. */
export function latestByDate(snapshots: ProgressSnapshot[]): ProgressSnapshot[] {
  const byDate = new Map<string, ProgressSnapshot>();
  for (const s of snapshots) {
    const cur = byDate.get(s.date);
    if (!s.deleted && (!cur || s.updatedAt > cur.updatedAt)) byDate.set(s.date, s);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * What has to be stored now: dates never calculated, and the latest date if its
 * result moved. Earlier dates keep what they said; recalculate() is the only way
 * to add to them.
 */
export function pendingSnapshots(input: IpiInput, snapshots: ProgressSnapshot[]): ProgressSnapshot[] {
  const dates = assessedDates(input.assessments);
  const inForce = new Map(latestByDate(snapshots).map((s) => [s.date, s]));
  return dates.flatMap((date) => {
    const cur = inForce.get(date);
    if (cur && date !== lastOf(dates)) return [];
    const next = toSnapshot(calculate(input, date), false);
    return cur?.id === next.id ? [] : [next];
  });
}

/** The whole history again with today's method, weights and goals. Originals stay. */
export function recalculate(input: IpiInput, snapshots: ProgressSnapshot[]): ProgressSnapshot[] {
  const inForce = new Map(latestByDate(snapshots).map((s) => [s.date, s]));
  return assessedDates(input.assessments)
    .map((date) => toSnapshot(calculate(input, date), true))
    .filter((s) => inForce.get(s.date)?.id !== s.id);
}

export interface Evolution {
  current: ProgressSnapshot;
  /** Change against the previous and the first index; null with nothing to compare. */
  sincePrevious: number | null;
  sinceFirst: number | null;
  /** A comparison was left out or is flagged as the method or weights differ. */
  weightsChanged: boolean;
}

const comparable = (a: ProgressSnapshot, b: ProgressSnapshot) => a.method === b.method && sameWeights(a.weights, b.weights);

export function evolution(snapshots: ProgressSnapshot[]): Evolution | null {
  const all = latestByDate(snapshots);
  const current = lastOf(all);
  if (!current) return null;
  const earlier = all.slice(0, -1).filter((s) => s.ipi != null);
  const same = earlier.filter((s) => comparable(s, current));
  const delta = (s: ProgressSnapshot | undefined) => (s && current.ipi != null ? round(current.ipi - (s.ipi as number)) : null);
  return { current, sincePrevious: delta(lastOf(same)), sinceFirst: delta(same[0]), weightsChanged: same.length < earlier.length };
}

/**
 * What can share a line with the latest index, oldest first. Weights only touch
 * the index: dimensions and goals compare across them, not across methods.
 */
export function comparableHistory(snapshots: ProgressSnapshot[]): { list: ProgressSnapshot[]; sameMethod: ProgressSnapshot[]; left: number } {
  const all = latestByDate(snapshots);
  const current = lastOf(all);
  const list = current ? all.filter((s) => comparable(s, current)) : [];
  return { list, sameMethod: all.filter((s) => s.method === current?.method), left: all.length - list.length };
}

export interface CompareRow extends SnapshotIndicator {
  previous: number | null; // the value at the assessment before, when it has one
}

/** Start, previous, current and goal of every indicator behind the latest index. */
export function compareRows(snapshots: ProgressSnapshot[]): CompareRow[] {
  const all = latestByDate(snapshots);
  const current = lastOf(all);
  if (!current) return [];
  const earlier = lastOf(all.slice(0, -1))?.dimensions.flatMap((d) => d.indicators) ?? [];
  const same = (a: SnapshotIndicator, b: SnapshotIndicator) => a.testId === b.testId && a.side === b.side && a.version === b.version;
  return current.dimensions.flatMap((d) => d.indicators).map((i) => ({ ...i, previous: earlier.find((e) => same(e, i))?.current ?? null }));
}

export interface Highlights {
  /** Dimensions that gained the most since the start of the history given. */
  gained: { id: DimensionId; points: number }[];
  regressing: DimensionId[];
  stable: DimensionId[];
  reached: string[];
  furthest: { name: string; score: number }[];
}

const indicatorName = (i: SnapshotIndicator) => `${i.name}${i.side ? ` (${i.side === "left" ? "esquerdo" : "direito"})` : ""}`;

/** What stands out, for the coach to weigh. Nothing here touches the training plan. */
export function highlights(list: ProgressSnapshot[]): Highlights | null {
  const current = lastOf(list);
  if (!current) return null;
  const scored = current.dimensions.filter((d) => d.id !== "adesao" && d.score != null);
  const gained = scored.flatMap((d) => {
    const start = list.flatMap((s) => s.dimensions).find((x) => x.id === d.id && x.score != null);
    const points = round((d.score as number) - (start?.score as number));
    return points > 0 ? [{ id: d.id, points }] : [];
  });
  const rows = scored.flatMap((d) => d.indicators);
  return {
    gained: gained.sort((a, b) => b.points - a.points).slice(0, 3),
    regressing: scored.filter((d) => d.state === "regressing").map((d) => d.id),
    stable: scored.filter((d) => d.state === "stable").map((d) => d.id),
    reached: rows.filter((r) => r.score >= 100).map(indicatorName),
    furthest: rows
      .filter((r) => r.score < 100)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((r) => ({ name: indicatorName(r), score: r.score })),
  };
}
