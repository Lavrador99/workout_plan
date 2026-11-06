import { describe as group, expect, it } from "vitest";
import { change } from "./assessment";
import { assessedDates, calculate, comparableHistory, compareRows, describe, dimensionState, evolution, highlights, indicatorScore, latestByDate, pendingSnapshots, recalculate, statusOf, type IpiInput } from "./ipi";
import { PRIMARY_GOALS } from "./progress";
import type { Assessment, Client, Goal, ProgressSnapshot, Session, SnapshotIndicator, TestCategory, TestDef, TestResult } from "./types";

const test_ = (id: string, category: TestCategory, over: Partial<TestDef> = {}): TestDef => ({ id, updatedAt: 1, name: id, category, unit: "kg", direction: "higher", sided: false, trials: 1, aggregate: "best", version: 1, groups: [], purpose: "", equipment: "", instructions: "", validity: "", ...over });
const result = (testId: string, value: number | [number, number]): TestResult => ({ id: `${testId}-${String(value)}`, testId, version: 1, name: testId, unit: "kg", direction: "higher", sided: Array.isArray(value), aggregate: "best", trials: Array.isArray(value) ? [{ side: "left", value: value[0] }, { side: "right", value: value[1] }] : [{ value }] });
const assessment = (date: string, ...results: TestResult[]): Assessment => ({ id: `a-${date}`, updatedAt: 1, clientId: "c", date, title: "", conditions: "", notes: "", results });
const goal = (testId: string | null, target: number | null, over: Partial<Goal> = {}): Goal => ({ id: `g-${testId}-${over.title ?? ""}`, updatedAt: 1, clientId: "c", title: "", testId, target, criteria: "", status: "active", ...over });
const session = (date: string): Session => ({ id: `s-${date}`, updatedAt: 1, clientId: "c", date, title: "", notes: "", blocks: [{ id: "b", kind: "sets", title: "", items: [{ id: "i", name: "x", role: "main", repsUnit: "r", loadMode: "abs", note: "", sets: [{ reps: 5, load: 50, done: true }] }] }] });
const client = (over: Partial<Client> = {}): Client => ({ id: "c", updatedAt: 1, name: "Ana", injuries: "", notes: "", ...over });

const input = (over: Partial<IpiInput> = {}): IpiInput => ({
  client: client(),
  assessments: [assessment("2026-01-01", result("f", 100), result("r", 1000)), assessment("2026-06-01", result("f", 150), result("r", 1000))],
  tests: [test_("f", "força", { sem: 1 }), test_("r", "resistência", { sem: 1 })],
  goals: [goal("f", 200), goal("r", 2000)],
  sessions: [],
  focuses: [],
  ...over,
});

const stored = (c: ReturnType<typeof pendingSnapshots>, updatedAt = 1): ProgressSnapshot[] => c.map((s, i) => ({ ...s, updatedAt: updatedAt + i }));

group("indicatorScore", () => {
  const score = (first: number, current: number, target: number, mdc: number | null = null) => indicatorScore(first, current, target, change(first, current, "higher", null, mdc));

  it("is the share of the way to the goal", () => expect(score(100, 150, 200)).toBe(50));
  it("stays between 0 and 100", () => {
    expect(score(100, 90, 200)).toBe(0);
    expect(score(100, 250, 200)).toBe(100);
  });
  it("gives nothing for a change within the measurement error", () => expect(score(100, 102, 200, 5)).toBe(0));
  it("keeps a change of unknown error", () => expect(score(100, 102, 200)).toBe(2));
  it("reads a goal that started met", () => {
    expect(score(100, 100, 100)).toBe(100);
    expect(score(100, 99, 100, 5)).toBe(100);
    expect(score(100, 80, 100, 5)).toBe(0);
  });
});

group("dimensionState", () => {
  const i = (improved: boolean | null, confirmed: boolean | null) => ({ improved, confirmed });
  it("lets confirmed changes decide", () => {
    expect(dimensionState([i(true, true), i(false, null), i(false, null)])).toEqual({ state: "improving", provisional: false });
    expect(dimensionState([i(false, true)])).toEqual({ state: "regressing", provisional: false });
  });
  it("calls a change within the error stable", () => expect(dimensionState([i(true, false)])).toEqual({ state: "stable", provisional: false }));
  it("flags a reading with no known error", () => expect(dimensionState([i(true, null)])).toEqual({ state: "improving", provisional: true }));
});

group("statusOf", () => {
  const dims = (...states: ("improving" | "stable" | "regressing" | null)[]) => states.map((state, n) => ({ id: "forca" as const, state, n }));
  it("needs enough data", () => {
    expect(statusOf(dims("improving"), null, 100)).toBe("insufficient");
    expect(statusOf(dims("improving"), 50, 40)).toBe("insufficient");
    expect(statusOf([{ id: "adesao", state: null }], 50, 100)).toBe("insufficient");
  });
  it("reads how many dimensions moved", () => {
    expect(statusOf(dims("improving", "improving", "stable"), 50, 100)).toBe("positive");
    expect(statusOf(dims("improving", "stable", "stable"), 50, 100)).toBe("moderate");
    expect(statusOf(dims("improving", "improving", "regressing"), 50, 100)).toBe("moderate");
    expect(statusOf(dims("improving", "stable", "stable", "stable"), 50, 100)).toBe("reduced");
    expect(statusOf(dims("stable", "stable"), 50, 100)).toBe("stagnant");
    expect(statusOf(dims("regressing", "stable"), 50, 100)).toBe("regression");
  });
});

group("calculate", () => {
  it("shares the weight of dimensions with no data among the others", () => {
    const c = calculate(input(), "2026-06-01");
    const [f, r] = [c.dimensions.find((d) => d.id === "forca")!, c.dimensions.find((d) => d.id === "cardio")!];
    expect(c.coverage).toBe(35); // força 20 + cardio 15
    expect(f).toMatchObject({ score: 50, weight: 57.1 });
    expect(r).toMatchObject({ score: 0, weight: 42.9 });
    expect(c.ipi).toBeCloseTo((50 * 20) / 35, 1);
    expect(c.dimensions.find((d) => d.id === "composicao")).toMatchObject({ score: null, weight: 0, state: null });
  });

  it("says data are short below the minimum coverage", () => {
    expect(calculate(input(), "2026-06-01").status).toBe("insufficient");
    const weights = { ...PRIMARY_GOALS[0].weights, forca: 45, cardio: 20, geral: 10, composicao: 10, mobilidade: 5, adesao: 10 };
    expect(calculate(input(), "2026-06-01", weights).status).not.toBe("insufficient");
  });

  it("has no index from the first assessment alone", () => {
    expect(calculate(input(), "2026-01-01")).toMatchObject({ ipi: null, coverage: 0, status: "insufficient" });
  });

  it("does not score a test with no goal", () => {
    expect(calculate(input({ goals: [] }), "2026-06-01").ipi).toBeNull();
  });

  it("makes no index out of adherence alone", () => {
    const c = calculate(input({ goals: [], client: client({ weeklyFrequency: 1 }), sessions: [session("2026-01-01")] }), "2026-06-01");
    expect(c.dimensions.find((d) => d.id === "adesao")!.score).not.toBeNull();
    expect(c.ipi).toBeNull();
  });

  it("counts both sides of a test as one indicator", () => {
    const c = calculate(
      input({
        tests: [test_("a", "força", { sided: true }), test_("b", "força")],
        assessments: [assessment("2026-01-01", result("a", [100, 100]), result("b", 100)), assessment("2026-06-01", result("a", [200, 100]), result("b", 100))],
        goals: [goal("a", 200), goal("b", 200)],
      }),
      "2026-06-01",
    );
    expect(c.dimensions.find((d) => d.id === "forca")!.score).toBe(25); // (mean of 100, 0) and 0
  });

  it("weighs tests within a dimension by the importance of their goals", () => {
    const tests = [test_("a", "força"), test_("b", "força")];
    const assessments = [assessment("2026-01-01", result("a", 100), result("b", 100)), assessment("2026-06-01", result("a", 200), result("b", 100))];
    const score = (a: Goal, b: Goal) => calculate(input({ tests, assessments, goals: [a, b] }), "2026-06-01").dimensions.find((d) => d.id === "forca");
    expect(score(goal("a", 200), goal("b", 200))?.score).toBe(50);
    expect(score(goal("a", 200, { importance: 3 }), goal("b", 200))?.score).toBe(75);
    expect(score(goal("a", 200, { importance: 3 }), goal("b", 200))?.indicators.map((i) => i.importance)).toEqual([3, 1]);
  });

  it("weighs goals met by importance too", () => {
    const goals = [goal(null, null, { title: "a", status: "achieved", importance: 3 }), goal(null, null, { title: "b" })];
    expect(calculate(input({ goals }), "2026-06-01").io).toBe(75);
  });

  it("keeps out dropped goals and results after the date", () => {
    expect(calculate(input({ goals: [goal("f", 200, { status: "dropped" })] }), "2026-06-01").ipi).toBeNull();
    expect(calculate(input(), "2026-03-01").ipi).toBeNull();
  });

  it("tells estimated results from measured ones", () => {
    const estimated = (load: number): TestResult => ({ ...result("f", load), strength: "estimated", trials: [{ value: load, reps: 5 }] });
    const c = calculate(input({ assessments: [assessment("2026-01-01", estimated(100)), assessment("2026-06-01", estimated(120))], goals: [goal("f", 200)] }), "2026-06-01");
    expect(c.dimensions.find((d) => d.id === "forca")!.indicators[0]).toMatchObject({ origin: "estimated", target: 200 });
    expect(calculate(input(), "2026-06-01").dimensions.find((d) => d.id === "forca")!.indicators[0].origin).toBe("measured");
  });

  it("works out goals met from tests and from the coach's word", () => {
    const goals = [goal("f", 200), goal(null, null, { title: "Correr", status: "achieved", achievedAt: "2026-05-01" }), goal(null, null, { title: "Dormir" }), goal(null, null, { title: "x", status: "dropped" })];
    expect(calculate(input({ goals }), "2026-06-01")).toMatchObject({ io: 50, ioGoals: 3 });
    expect(calculate(input({ goals }), "2026-02-01").io).toBe(0); // not yet achieved then
  });

  it("uses reference populations for the current condition, never for the index", () => {
    const tests = [test_("seed-test-handgrip", "força")];
    const assessments = [assessment("2026-06-01", result("seed-test-handgrip", [50, 52]))];
    const c = calculate(input({ tests, assessments, goals: [], client: client({ sex: "male", birthYear: 1990 }) }), "2026-06-01");
    expect(c.iccTests).toBe(1);
    expect(c.icc).toBeGreaterThan(0);
    expect(c.ipi).toBeNull();
    expect(calculate(input(), "2026-06-01")).toMatchObject({ icc: null, iccTests: 0 });
  });
});

group("describe", () => {
  it("names only what was found", () => {
    const text = describe({ status: "moderate", provisional: true, ia: 80.4, io: null, dimensions: [{ id: "forca", state: "improving", score: 50, weight: 50, provisional: true, indicators: [] }, { id: "cardio", state: "regressing", score: 0, weight: 50, provisional: false, indicators: [] }, { id: "mobilidade", state: null, score: null, weight: 0, provisional: false, indicators: [] }, { id: "adesao", state: null, score: 80, weight: 0, provisional: false, indicators: [] }] });
    expect(text).toBe("Evolução moderada. Melhoria em força e capacidade muscular. Em regressão: resistência cardiovascular. Pode precisar de atenção. Sem dados em mobilidade, estabilidade e controlo motor. Adesão estimada de 80%. Leitura por confirmar: há testes sem erro de medição definido.");
  });
});

group("snapshots", () => {
  it("skips assessments with nothing filled in", () => {
    expect(assessedDates([assessment("2026-01-01", { ...result("f", 1), trials: [{ value: null }] }), assessment("2026-02-01", result("f", 1))])).toEqual(["2026-02-01"]);
  });

  it("stores each date once", () => {
    const first = pendingSnapshots(input(), []);
    expect(first.map((s) => s.date)).toEqual(["2026-01-01", "2026-06-01"]);
    expect(pendingSnapshots(input(), stored(first))).toEqual([]);
  });

  it("gives two devices the same record", () => {
    expect(pendingSnapshots(input(), []).map((s) => s.id)).toEqual(pendingSnapshots(input(), []).map((s) => s.id));
  });

  it("adds a new one for the latest date when its result moves, and leaves the rest", () => {
    const old = stored(pendingSnapshots(input(), []));
    const next = pendingSnapshots(input({ goals: [goal("f", 300), goal("r", 2000)] }), old);
    expect(next.map((s) => s.date)).toEqual(["2026-06-01"]);
    expect(next[0].id).not.toBe(old[1].id);
  });

  it("recalculates alongside the originals, marked as such", () => {
    const old = stored(pendingSnapshots(input(), []));
    const again = recalculate(input({ goals: [goal("f", 300)] }), old);
    expect(again.every((s) => s.recalculated)).toBe(true);
    expect(again.map((s) => s.date)).toEqual(["2026-06-01"]); // the first date gives the same result
    const all = [...old, ...stored(again, 10)];
    expect(all).toHaveLength(3);
    expect(latestByDate(all)[1].recalculated).toBe(true);
  });

  it("compares only indices of the same method and weights", () => {
    const base = { clientId: "c", method: 1, primaryGoal: "saude", weights: PRIMARY_GOALS[0].weights, ipi: 40, status: "moderate", dimensions: [] } as unknown as ProgressSnapshot;
    const a = { ...base, id: "a", updatedAt: 1, date: "2026-01-01", ipi: 20 };
    const b = { ...base, id: "b", updatedAt: 2, date: "2026-02-01", ipi: 30 };
    const c = { ...base, id: "c", updatedAt: 3, date: "2026-03-01", ipi: 45 };
    expect(evolution([a, b, c])).toMatchObject({ sincePrevious: 15, sinceFirst: 25, weightsChanged: false });
    expect(evolution([{ ...a, weights: PRIMARY_GOALS[1].weights }, b, c])).toMatchObject({ sincePrevious: 15, sinceFirst: 15, weightsChanged: true });
    expect(evolution([{ ...a, method: 2 }, c])).toMatchObject({ sincePrevious: null, sinceFirst: null, weightsChanged: true });
    expect(evolution([])).toBeNull();
  });
});

group("charts", () => {
  const snap = (date: string, updatedAt: number, over: Partial<ProgressSnapshot> = {}) => ({ id: date, updatedAt, clientId: "c", date, method: 1, primaryGoal: "saude", weights: PRIMARY_GOALS[0].weights, ipi: 40, coverage: 100, icc: null, iccTests: 0, ia: null, io: null, ioGoals: 0, status: "moderate", provisional: false, dimensions: [], interpretation: "", ...over }) as ProgressSnapshot;
  const row = (over: Partial<SnapshotIndicator> = {}): SnapshotIndicator => ({ testId: "f", name: "Força", unit: "kg", version: 1, importance: 1, origin: "measured", first: 100, current: 150, target: 200, improved: true, confirmed: null, score: 50, ...over });
  const dim = (id: "forca" | "cardio", score: number, state: "improving" | "stable" | "regressing", indicators: SnapshotIndicator[] = []) => ({ id, score, weight: 50, state, provisional: false, indicators });

  it("keeps out of the line what was made with other weights", () => {
    const { list, sameMethod, left } = comparableHistory([snap("2025-12-01", 1, { method: 0 }), snap("2026-01-01", 2, { weights: PRIMARY_GOALS[1].weights }), snap("2026-02-01", 3), snap("2026-03-01", 4)]);
    expect(list.map((s) => s.date)).toEqual(["2026-02-01", "2026-03-01"]);
    expect(sameMethod.map((s) => s.date)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(left).toBe(2);
  });

  it("keeps apart scores made with another measurement error", () => {
    const old = snap("2026-01-01", 1, { dimensions: [dim("forca", 25, "improving", [row()])] });
    const now = snap("2026-02-01", 2, { dimensions: [dim("forca", 10, "stable", [row({ mdc: 4 })])] });
    expect(comparableHistory([old, now])).toMatchObject({ list: [{ id: "2026-02-01" }], sameMethod: [{ id: "2026-02-01" }], left: 1 });
    expect(evolution([old, now])).toMatchObject({ sincePrevious: null, weightsChanged: true });
    const same = snap("2026-01-15", 1, { dimensions: [dim("forca", 5, "stable", [row({ mdc: 4 }), row({ testId: "other" })])] });
    expect(comparableHistory([same, now]).left).toBe(0);
  });

  it("finds the previous value of each indicator", () => {
    const rows = compareRows([snap("2026-01-01", 1, { dimensions: [dim("forca", 25, "improving", [row({ current: 120 })])] }), snap("2026-02-01", 2, { dimensions: [dim("forca", 50, "improving", [row(), row({ testId: "x" })])] })]);
    expect(rows.map((r) => [r.testId, r.previous])).toEqual([["f", 120], ["x", null]]);
  });

  it("picks out what gained, what stalled and what is far", () => {
    const h = highlights([
      snap("2026-01-01", 1, { dimensions: [dim("forca", 10, "stable"), dim("cardio", 40, "stable")] }),
      snap("2026-02-01", 2, { dimensions: [dim("forca", 60, "improving", [row({ score: 100, name: "Salto", side: "left" }), row({ score: 20, name: "Prensa" })]), dim("cardio", 30, "regressing")] }),
    ]);
    expect(h).toEqual({ gained: [{ id: "forca", points: 50 }], regressing: ["cardio"], stable: [], reached: ["Salto (esquerdo)"], furthest: [{ name: "Prensa", score: 20 }] });
    expect(highlights([])).toBeNull();
  });
});
