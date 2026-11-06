import { describe, expect, it } from "vitest";
import { adherence, changeSchedule, currentDays, metricRow, monthlyAdherence, plannedSessions, customRange, directionFor, doneIn, goalBalance, markBalance, pendingMarks, presetRange, testBalance, type Range } from "./balance";
import type { Assessment, Item, Session, SetRow, TestDef, TestResult } from "./types";

const test_ = (over: Partial<TestDef> = {}): TestDef => ({
  id: "t1",
  updatedAt: 1,
  name: "Salto",
  category: "potência",
  unit: "cm",
  direction: "higher",
  sided: false,
  trials: 1,
  aggregate: "best",
  version: 1,
  groups: [],
  purpose: "",
  equipment: "",
  instructions: "",
  validity: "",
  ...over,
});

const result = (value: number | [number, number], over: Partial<TestResult> = {}): TestResult => ({
  id: `r${Math.random()}`,
  testId: "t1",
  version: 1,
  name: "Salto",
  unit: "cm",
  direction: "higher",
  sided: false,
  aggregate: "best",
  trials: Array.isArray(value) ? [{ side: "left", value: value[0] }, { side: "right", value: value[1] }] : [{ value }],
  ...over,
});

const assessment = (date: string, ...results: TestResult[]): Assessment => ({ id: `a-${date}`, updatedAt: 1, clientId: "c", date, title: "", conditions: "", notes: "", results });

const item = (sets: SetRow[], over: Partial<Item> = {}): Item => ({ id: "i", exerciseId: "ex", name: "Agachamento", role: "main", repsUnit: "r", loadMode: "abs", note: "", sets, ...over });

const session = (date: string, items: Item[], over: Partial<Session> = {}): Session => ({ id: `s-${date}`, updatedAt: 1, clientId: "c", date, title: "", notes: "", blocks: [{ id: "b", kind: "sets", title: "", items }], ...over });

const set = (load: number, reps: number, over: Partial<SetRow> = {}): SetRow => ({ load, reps, done: true, ...over });

const YEAR: Range = { from: "2026-01-01", to: "2026-12-31" };
const names = new Map([["ex", "Agachamento"]]);

describe("period", () => {
  it("counts back from today", () => {
    expect(presetRange("30d", "2026-11-06")).toEqual({ from: "2026-10-07", to: "2026-11-06" });
    expect(presetRange("3m", "2026-11-06")).toEqual({ from: "2026-08-06", to: "2026-11-06" });
    expect(presetRange("12m", "2026-11-06")).toEqual({ from: "2025-11-06", to: "2026-11-06" });
    expect(presetRange("all", "2026-11-06")).toEqual({ from: null, to: "2026-11-06" });
  });

  it("lands on the last day of a shorter month", () => {
    expect(presetRange("3m", "2026-05-31")).toEqual({ from: "2026-02-28", to: "2026-05-31" });
  });

  it("takes dates in any order and stops at today", () => {
    expect(customRange("2026-10-01", "2026-09-01", "2026-11-06")).toEqual({ from: "2026-09-01", to: "2026-10-01" });
    expect(customRange("2026-10-01", "2027-01-01", "2026-11-06")).toEqual({ from: "2026-10-01", to: "2026-11-06" });
  });
});

describe("tests", () => {
  const tests = [test_({ sem: 1 })]; // MDC95 ≈ 2,77

  it("compares with the last value before the period", () => {
    const list = [assessment("2025-06-01", result(30)), assessment("2025-12-01", result(35)), assessment("2026-03-01", result(40))];
    const { rows } = testBalance(list, tests, undefined, YEAR);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "gain", base: { value: 35, date: "2025-12-01" }, last: { value: 40 } });
  });

  it("falls back to the first value in the period, and to the very first with no start", () => {
    const list = [assessment("2026-02-01", result(30)), assessment("2026-06-01", result(40))];
    expect(testBalance(list, tests, undefined, YEAR).rows[0].base.value).toBe(30);
    expect(testBalance(list, tests, undefined, { from: null, to: "2026-12-31" }).rows[0].base.value).toBe(30);
  });

  it("ignores values after the end and tests not measured in the period", () => {
    const list = [assessment("2025-06-01", result(30)), assessment("2027-01-01", result(50))];
    expect(testBalance(list, tests, undefined, YEAR)).toEqual({ rows: [], singles: [] });
  });

  it("keeps a lone value apart: there is nothing to compare it with", () => {
    const { rows, singles } = testBalance([assessment("2026-02-01", result(30))], tests, undefined, YEAR);
    expect(rows).toEqual([]);
    expect(singles[0]).toMatchObject({ testId: "t1", last: { value: 30 } });
  });

  it("does not call a change within the measurement error a loss", () => {
    const list = [assessment("2026-02-01", result(40)), assessment("2026-06-01", result(38))];
    expect(testBalance(list, tests, undefined, YEAR).rows[0].status).toBe("within");
  });

  it("calls a change beyond the error a confirmed loss", () => {
    const list = [assessment("2026-02-01", result(40)), assessment("2026-06-01", result(35))];
    expect(testBalance(list, tests, undefined, YEAR).rows[0]).toMatchObject({ status: "loss", change: { confirmed: true } });
  });

  it("keeps a change with no known error as a gain to be confirmed", () => {
    const list = [assessment("2026-02-01", result(40)), assessment("2026-06-01", result(45))];
    expect(testBalance(list, [test_()], undefined, YEAR).rows[0]).toMatchObject({ status: "gain", change: { confirmed: null } });
  });

  it("never compares across protocol versions", () => {
    const list = [assessment("2026-02-01", result(30)), assessment("2026-03-01", result(32)), assessment("2026-06-01", result(50, { version: 2 }))];
    const { rows, singles } = testBalance(list, [test_({ version: 2 })], undefined, YEAR);
    expect(rows.map((r) => [r.version, r.base.value, r.last.value, r.showVersion])).toEqual([[1, 30, 32, true]]);
    expect(singles.map((s) => s.last.value)).toEqual([50]);
  });

  it("gives each side its own row", () => {
    const sided = { sided: true };
    const list = [assessment("2026-02-01", result([10, 10], sided)), assessment("2026-06-01", result([9, 12], sided))];
    const { rows } = testBalance(list, [test_({ sided: true, sem: 0.1 })], undefined, YEAR);
    expect(rows.map((r) => [r.side, r.status])).toEqual([["left", "loss"], ["right", "gain"]]);
  });

  it("reads a neutral test towards its goal", () => {
    expect(directionFor("neutral", 80, 75)).toBe("lower");
    expect(directionFor("neutral", 70, 75)).toBe("higher");
    expect(directionFor("neutral", 80, null)).toBe("neutral");
    expect(directionFor("higher", 80, 75)).toBe("higher");
    const weight = { direction: "neutral" as const };
    const list = [assessment("2026-02-01", result(80, weight)), assessment("2026-06-01", result(77, weight))];
    const tests = [test_({ direction: "neutral", sem: 0.5 })];
    expect(testBalance(list, tests, undefined, YEAR).rows[0].status).toBe("flat");
    expect(testBalance(list, tests, { t1: 75 }, YEAR).rows[0].status).toBe("gain");
  });
});

describe("marks", () => {
  it("compares the period's best with the best before it", () => {
    const list = [session("2025-11-01", [item([set(100, 5)])]), session("2025-12-01", [item([set(90, 5)])]), session("2026-02-01", [item([set(110, 5)])])];
    const [row] = markBalance(list, names, YEAR);
    expect(row).toMatchObject({ key: "ex", name: "Agachamento", status: "gain", base: { load: 100 }, best: { load: 110 } });
    expect(row.pct).toBeCloseTo(10);
  });

  it("reads more reps at the same load as a gain", () => {
    const list = [session("2025-11-01", [item([set(100, 5)])]), session("2026-02-01", [item([set(100, 8)])])];
    expect(markBalance(list, names, YEAR)[0].status).toBe("gain");
  });

  it("says when the period stayed below the earlier best", () => {
    const list = [session("2025-11-01", [item([set(100, 5)])]), session("2026-02-01", [item([set(90, 5)])])];
    expect(markBalance(list, names, YEAR)[0].status).toBe("below");
  });

  it("uses the first session of the period when there is none before", () => {
    const list = [session("2026-02-01", [item([set(90, 5)])]), session("2026-03-01", [item([set(100, 5)])])];
    expect(markBalance(list, names, YEAR)[0]).toMatchObject({ status: "gain", base: { load: 90 } });
  });

  it("leaves out an exercise done once, or not done in the period", () => {
    expect(markBalance([session("2026-02-01", [item([set(90, 5)])])], names, YEAR)).toEqual([]);
    expect(markBalance([session("2025-02-01", [item([set(90, 5)])])], names, YEAR)).toEqual([]);
  });

  it("estimates from high reps too", () => {
    const list = [session("2025-11-01", [item([set(30, 12)])]), session("2026-02-01", [item([set(50, 13)])])];
    const [row] = markBalance(list, names, YEAR);
    expect(row).toMatchObject({ status: "gain", base: { reps: 12 }, best: { reps: 13 } });
    expect(row.base.e1rm).toBeCloseTo(42);
    expect(row.best.e1rm).toBeCloseTo(71.67, 1);
  });

  it("weighs reps against load across different sets", () => {
    const list = [session("2025-11-01", [item([set(50, 13)])]), session("2026-02-01", [item([set(47.5, 8)])])];
    expect(markBalance(list, names, YEAR)[0].status).toBe("below"); // 71,7 against 60,2
  });

  it("compares the load alone when a session has no reps written down", () => {
    const list = [session("2025-11-01", [item([set(30, 12)])]), session("2026-02-01", [item([{ load: 35, done: true }])])];
    expect(markBalance(list, names, YEAR)[0]).toMatchObject({ basis: "load", status: "gain", base: { load: 30 }, best: { load: 35, reps: null } });
  });

  it("compares added load by the load, apart from a plain one", () => {
    const list = [session("2025-11-01", [item([set(20, 12)], { loadMode: "added" })]), session("2026-02-01", [item([set(35, 12)], { loadMode: "added" }), item([set(100, 5)])])];
    expect(markBalance(list, names, YEAR)).toMatchObject([{ basis: "load", status: "gain" }]);
  });

  it("uses the estimate when each session has one, even beside sets with no reps", () => {
    const list = [session("2025-11-01", [item([set(100, 5), { load: 150, done: true }])]), session("2026-02-01", [item([set(110, 5)])])];
    expect(markBalance(list, names, YEAR)[0]).toMatchObject({ basis: "rm", status: "gain", base: { load: 100 } });
  });

  it("reads time, distance and methods by the load", () => {
    const later = (over: object) => [session("2025-11-01", [item([set(100, 5)])]), session("2026-02-01", [item([set(120, 5)], over)])];
    expect(markBalance(later({ repsUnit: "m" }), names, YEAR)[0]).toMatchObject({ basis: "load" });
    expect(markBalance(later({ method: { type: "cluster", clusters: 4, reps: 2, pause: 20 } }), names, YEAR)[0]).toMatchObject({ basis: "load", status: "gain" });
  });

  it("never counts warm-ups or sets not ticked", () => {
    const skipped = [item([set(200, 5, { done: false })]), item([set(200, 5, { type: "warmup" })])];
    const list = [session("2025-11-01", [item([set(100, 5)])]), session("2026-02-01", [...skipped, item([set(100, 5)])])];
    expect(markBalance(list, names, YEAR)[0].status).toBe("same");
  });

  it("shows sets with load still to tick, of an exercise with marks", () => {
    const list = [session("2025-11-01", [item([set(70, 12)])]), session("2026-02-01", [item([set(80, 3, { done: false }), set(85, 1, { done: false })])])];
    expect(markBalance(list, names, YEAR)).toEqual([]);
    expect(pendingMarks(list, names, YEAR)).toMatchObject([{ sessionId: "s-2026-02-01", name: "Agachamento", point: { load: 85, reps: 1 } }]);
  });

  it("leaves out a plan with nothing done yet, and what is outside the period", () => {
    expect(pendingMarks([session("2026-02-01", [item([set(85, 1, { done: false })])])], names, YEAR)).toEqual([]);
    const list = [session("2025-02-01", [item([set(70, 5)])]), session("2025-03-01", [item([set(85, 1, { done: false })])])];
    expect(pendingMarks(list, names, YEAR)).toEqual([]);
  });

  it("never compares one dumbbell per hand with a single load", () => {
    const list = [session("2025-11-01", [item([set(20, 5)], { loadMode: "dual" })]), session("2026-02-01", [item([set(40, 5)])]), session("2026-03-01", [item([set(40, 5)])])];
    expect(markBalance(list, names, YEAR).map((r) => r.base.item.loadMode)).toEqual(["abs"]);
  });
});

describe("adherence", () => {
  const done = (date: string) => session(date, [item([set(50, 5)])]);
  const open = (date: string) => session(date, [item([set(50, 5, { done: false })])]);

  it("is done over frequency × weeks", () => {
    const r: Range = { from: "2026-01-05", to: "2026-02-01" }; // 4 weeks
    const a = adherence([done("2026-01-01"), done("2026-01-06"), done("2026-01-13"), open("2026-01-20")], [], { weeklyFrequency: 2 }, r);
    expect(a).toMatchObject({ done: 2, unticked: 1, expected: 8, pct: 25 });
  });

  it("starts when the client did", () => {
    const a = adherence([done("2026-10-05")], [], { weeklyFrequency: 2 }, { from: "2025-11-06", to: "2026-11-01" }); // 4 weeks since
    expect(a).toMatchObject({ from: "2026-10-05", expected: 8 });
  });

  it("leaves out the sessions the coach set aside, but not from the client's start", () => {
    const r: Range = { from: null, to: "2026-01-28" }; // 4 weeks from 01/01
    const list = [{ ...done("2026-01-01"), noAdherence: true }, done("2026-01-06"), { ...open("2026-01-13"), noAdherence: true }];
    expect(adherence(list, [], { weeklyFrequency: 1 }, r)).toMatchObject({ done: 1, unticked: 0, expected: 4, from: "2026-01-01" });
    expect(doneIn(list, r)).toHaveLength(2); // volume still counts it
  });

  it("has no estimate without a frequency", () => {
    expect(adherence([done("2026-02-01")], [], {}, YEAR)).toMatchObject({ done: 1, expected: null, pct: null });
  });

  it("does not count a session that was never done", () => {
    expect(doneIn([done("2026-02-01"), open("2026-02-02")], YEAR)).toHaveLength(1);
  });
});

describe("session plan", () => {
  const done = (date: string, over: Partial<Session> = {}) => session(date, [item([set(50, 5)])], over);
  const week = { schedule: [{ from: "2026-01-05", days: [0, 2] }] }; // Monday and Wednesday

  it("counts the planned weekdays", () => {
    expect(plannedSessions(week, "2026-01-05", "2026-01-18")).toEqual({ count: 4, estimated: false });
    expect(plannedSessions(week, "2026-01-05", "2026-01-05")).toEqual({ count: 1, estimated: false });
  });

  it("follows each change of plan, breaks included", () => {
    const schedule = [{ from: "2026-01-05", days: [0, 2] }, { from: "2026-01-12", days: [] }, { from: "2026-01-19", days: [4] }];
    expect(plannedSessions({ schedule }, "2026-01-05", "2026-01-25").count).toBe(3); // 2 + break + 1
  });

  it("falls back on the weekly frequency before there was a plan, and says so", () => {
    expect(plannedSessions({ ...week, weeklyFrequency: 7 }, "2026-01-01", "2026-01-11")).toEqual({ count: 6, estimated: true }); // 4 days + Mon, Wed
    expect(plannedSessions({ ...week }, "2026-01-01", "2026-01-11")).toEqual({ count: 2, estimated: false });
  });

  it("gives adherence against the plan", () => {
    const a = adherence([done("2026-01-05"), done("2026-01-07"), done("2026-01-12")], [], week, { from: "2026-01-05", to: "2026-01-18" });
    expect(a).toMatchObject({ done: 3, expected: 4, pct: 75, source: "plan" });
  });

  it("leaves out the kinds of session the coach chose", () => {
    const list = [done("2026-01-05"), done("2026-01-07", { activity: "cardio" }), done("2026-01-12", { activity: "avaliacao" })];
    expect(adherence(list, [], { ...week, adherenceSkips: ["cardio", "avaliacao"] }, { from: "2026-01-05", to: "2026-01-18" }).done).toBe(1);
    expect(adherence(list, [], { ...week, adherenceSkips: ["treino"] }, { from: "2026-01-05", to: "2026-01-18" }).done).toBe(2);
  });

  it("keeps the plan before a change, and one change per day", () => {
    const c = { schedule: [{ from: "2026-01-05", days: [0] }] };
    expect(changeSchedule(c, [2, 1], "2026-02-01").schedule).toEqual([{ from: "2026-01-05", days: [0] }, { from: "2026-02-01", days: [1, 2] }]);
    expect(changeSchedule(c, [3], "2026-01-05").schedule).toEqual([{ from: "2026-01-05", days: [3] }]);
    expect(changeSchedule(c, [0], "2026-02-01")).toEqual({});
    expect(changeSchedule({}, [], "2026-02-01").schedule).toEqual([{ from: "2026-02-01", days: [] }]);
    expect(currentDays(c, "2026-01-01")).toEqual([]);
  });
});

describe("metric goals", () => {
  const g = { id: "g", updatedAt: 1, clientId: "c", title: "Treinos por mês", criteria: "", status: "active" as const };

  it("read in the shape of a test goal", () => {
    expect(metricRow({ ...g, unit: "treinos", startValue: 4, currentValue: 7, target: 10 })).toMatchObject({ name: "Treinos por mês", unit: "treinos", start: 4, current: 7, target: 10, progress: 50 });
  });

  it("start at the first value until there is another", () => {
    expect(metricRow({ ...g, unit: "treinos", startValue: 4, target: 10 })).toMatchObject({ current: 4, progress: 0 });
  });

  it("stay out without their numbers", () => {
    expect(metricRow(g)).toBeNull();
    expect(metricRow({ ...g, unit: "treinos", startValue: 4 })).toBeNull();
  });
});

describe("monthly adherence", () => {
  const done = (date: string) => session(date, [item([set(50, 5)])]);

  it("goes month by month, cut to the client's start and the period's end", () => {
    const months = monthlyAdherence([done("2026-01-15"), done("2026-02-03"), done("2026-02-10")], [], { weeklyFrequency: 1 }, { from: "2025-06-01", to: "2026-03-14" });
    expect(months.map((m) => [m.month, m.done, m.expected])).toEqual([["2026-01", 1, 2], ["2026-02", 2, 4], ["2026-03", 0, 2]]);
  });

  it("crosses a year and works with no frequency", () => {
    const months = monthlyAdherence([done("2025-12-20"), done("2026-01-02")], [], {}, { from: null, to: "2026-01-31" });
    expect(months).toMatchObject([{ month: "2025-12", done: 1, pct: null }, { month: "2026-01", done: 1, pct: null }]);
  });

  it("is empty with nothing to go on", () => {
    expect(monthlyAdherence([], [], { weeklyFrequency: 2 }, { from: null, to: "2026-01-31" })).toEqual([]);
  });
});

describe("goals", () => {
  it("shows the way from the first value to the goal, up to the end of the period", () => {
    const list = [assessment("2025-06-01", result(30)), assessment("2026-02-01", result(35)), assessment("2027-02-01", result(39))];
    const [row] = goalBalance(list, [test_()], { t1: 40 }, YEAR);
    expect(row).toMatchObject({ testId: "t1", target: 40, start: 30, current: 35, progress: 50 });
  });

  it("leaves out a goal with no result yet", () => {
    expect(goalBalance([], [test_()], { t1: 40 }, YEAR)).toEqual([]);
  });
});
