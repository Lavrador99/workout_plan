import { describe, expect, it } from "vitest";
import { asymmetry, change, compare, finalValue, fmtAsymmetry, fmtChange, goalProgress, newResult, previousResult, repeatResults, series } from "./assessment";
import type { Assessment, Side, TestDef, TestResult, Trial } from "./types";

const test_ = (over: Partial<TestDef> = {}): TestDef => ({
  id: "t1",
  updatedAt: 1,
  name: "Teste",
  category: "força",
  unit: "kg",
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

const result = (over: Partial<TestDef>, trials: Trial[]): TestResult => ({ ...newResult(test_(over)), trials });
const both = (left: number | null, right: number | null): Trial[] => [
  { side: "left", value: left },
  { side: "right", value: right },
];
const assessment = (id: string, date: string, results: TestResult[], over: Partial<Assessment> = {}): Assessment => ({
  id,
  updatedAt: 1,
  clientId: "c1",
  date,
  title: "",
  conditions: "",
  notes: "",
  results,
  ...over,
});

describe("newResult", () => {
  it("opens one set of trials per side", () => {
    const sides = newResult(test_({ sided: true, trials: 2 })).trials.map((t) => t.side);
    expect(sides).toEqual<(Side | undefined)[]>(["left", "left", "right", "right"]);
    expect(newResult(test_({ trials: 3 })).trials.every((t) => !("side" in t))).toBe(true);
  });

  it("keeps a copy, so editing the test later does not change old results", () => {
    const t = test_({ unit: "kg", version: 1 });
    const r = newResult(t);
    t.unit = "lb";
    t.version = 2;
    expect(r.unit).toBe("kg");
    expect(r.version).toBe(1);
  });
});

describe("finalValue", () => {
  const trials: Trial[] = [{ value: 3 }, { value: 1 }, { value: 2 }];

  it("takes the best in the test's direction", () => {
    expect(finalValue(result({ direction: "higher" }, trials))).toBe(3);
    expect(finalValue(result({ direction: "lower" }, trials))).toBe(1);
  });

  it("averages neutral tests, which have no best", () => {
    expect(finalValue(result({ direction: "neutral" }, trials))).toBe(2);
  });

  it("supports mean and last", () => {
    expect(finalValue(result({ aggregate: "mean" }, trials))).toBe(2);
    expect(finalValue(result({ aggregate: "last" }, trials))).toBe(2);
  });

  it("ignores invalid and empty trials", () => {
    expect(finalValue(result({}, [{ value: 9, invalid: true }, { value: null }, { value: 4 }]))).toBe(4);
    expect(finalValue(result({}, [{ value: 9, invalid: true }, { value: null }]))).toBeNull();
  });

  it("reads each side on its own", () => {
    const r = result({ sided: true }, both(8, 10));
    expect(finalValue(r, "left")).toBe(8);
    expect(finalValue(r, "right")).toBe(10);
  });
});

describe("asymmetry", () => {
  it("is a % of the better side", () => {
    expect(asymmetry(result({ sided: true }, both(85, 100)))).toEqual({ pct: 15, points: 15, better: "right" });
  });

  it("on times, the faster side is the better one", () => {
    const a = asymmetry(result({ sided: true, direction: "lower", unit: "s" }, both(2, 2.5)));
    expect(a?.better).toBe("left");
    expect(a?.pct).toBeCloseTo(25);
  });

  it("gives points, not a %, on scores", () => {
    expect(asymmetry(result({ sided: true, scale: { min: 0, max: 3 } }, both(1, 3)))).toEqual({ pct: null, points: 2, better: "right" });
  });

  it("names no better side on neutral tests", () => {
    expect(asymmetry(result({ sided: true, direction: "neutral" }, both(30, 32)))).toEqual({ pct: null, points: 2, better: null });
  });

  it("needs both sides and no negative values", () => {
    expect(asymmetry(result({ sided: true }, both(10, null)))).toBeNull();
    expect(asymmetry(result({ sided: true }, both(-2, 5)))).toBeNull();
    expect(asymmetry(result({}, [{ value: 1 }]))).toBeNull();
  });

  it("handles zeros", () => {
    expect(asymmetry(result({ sided: true }, both(0, 0)))).toEqual({ pct: 0, points: 0, better: "equal" });
    expect(asymmetry(result({ sided: true }, both(0, 5)))?.pct).toBe(100);
    expect(asymmetry(result({ sided: true, direction: "lower" }, both(0, 5)))).toEqual({ pct: null, points: 5, better: "left" });
  });
});

describe("change", () => {
  it("knows that less time is better", () => {
    expect(change(2, 1.8, "lower").improved).toBe(true);
    expect(change(2, 2.2, "lower").improved).toBe(false);
    expect(change(10, 12, "higher")).toEqual({ delta: 2, pct: 20, improved: true });
  });

  it("has no % from a first value of 0", () => {
    expect(change(0, 5, "higher")).toEqual({ delta: 5, pct: null, improved: true });
  });

  it("does not judge neutral tests or no change", () => {
    expect(change(80, 78, "neutral").improved).toBeNull();
    expect(change(5, 5, "higher").improved).toBeNull();
  });
});

describe("fmtChange", () => {
  it("shows the difference and the %", () => {
    expect(fmtChange(change(10, 12, "higher"), "cm")).toBe("+2 cm (+20%)");
    expect(fmtChange(change(2, 1.84, "lower"), "s")).toBe("-0,16 s (-8%)");
  });

  it("leaves the % out on scores, from 0 and with no change", () => {
    expect(fmtChange(change(2, 3, "higher", { min: 0, max: 3 }), "pts")).toBe("+1 pts");
    expect(fmtChange(change(0, 3, "higher"), "cm")).toBe("+3 cm");
    expect(fmtChange(change(5, 5, "higher"), "cm")).toBe("0 cm");
  });
});

describe("goalProgress", () => {
  it("works in both directions", () => {
    expect(goalProgress(7, 10, 13)).toBe(50);
    expect(goalProgress(3, 2.8, 2.6)).toBeCloseTo(50);
  });

  it("goes negative when moving away from the goal", () => {
    expect(goalProgress(10, 8, 12)).toBe(-100);
  });

  it("is undefined when the goal is the starting value", () => {
    expect(goalProgress(10, 12, 10)).toBeNull();
  });
});

describe("series", () => {
  it("orders by date and never joins protocol versions", () => {
    const v1 = result({}, [{ value: 10 }]);
    const v2 = { ...result({}, [{ value: 50 }]), version: 2 };
    const list = series([assessment("b", "2026-03-01", [v2]), assessment("a", "2026-01-01", [v1]), assessment("c", "2026-02-01", [v1])], "t1");
    expect(list.map((s) => s.version)).toEqual([1, 2]);
    expect(list[0].both.map((p) => p.date)).toEqual(["2026-01-01", "2026-02-01"]);
    expect(list[1].both.map((p) => p.value)).toEqual([50]);
  });

  it("keeps sides apart and tracks the asymmetry", () => {
    const [s] = series([assessment("a", "2026-01-01", [result({ sided: true }, both(85, 100))])], "t1");
    expect(s.left[0].value).toBe(85);
    expect(s.right[0].value).toBe(100);
    expect(s.asymmetries[0].pct).toBe(15);
  });

  it("skips deleted assessments and other tests", () => {
    const list = series([assessment("a", "2026-01-01", [result({}, [{ value: 1 }])], { deleted: true }), assessment("b", "2026-01-02", [result({ id: "t2" } as Partial<TestDef>, [{ value: 1 }])])], "t1");
    expect(list).toEqual([]);
  });

  it("leaves out results with no valid trial", () => {
    const [s] = series([assessment("a", "2026-01-01", [result({}, [{ value: null }])])], "t1");
    expect(s.both).toEqual([]);
  });
});

describe("compare", () => {
  it("gives the difference between the two dates", () => {
    const [row] = compare(assessment("a", "2026-01-01", [result({}, [{ value: 10 }])]), assessment("b", "2026-02-01", [result({}, [{ value: 12 }])]));
    expect(row).toMatchObject({ status: "ok", older: 10, newer: 12 });
    expect(row.change).toEqual({ delta: 2, pct: 20, improved: true });
  });

  it("gives no difference between protocol versions", () => {
    const newer = { ...result({}, [{ value: 12 }]), version: 2 };
    const [row] = compare(assessment("a", "2026-01-01", [result({}, [{ value: 10 }])]), assessment("b", "2026-02-01", [newer]));
    expect(row).toMatchObject({ status: "different-protocol", older: 10, newer: 12, change: null });
  });

  it("gives one row per side", () => {
    const rows = compare(assessment("a", "2026-01-01", [result({ sided: true }, both(8, 10))]), assessment("b", "2026-02-01", [result({ sided: true }, both(9, 10))]));
    expect(rows.map((r) => [r.side, r.change?.delta])).toEqual([
      ["left", 1],
      ["right", 0],
    ]);
  });

  it("has no % on scores", () => {
    const [row] = compare(assessment("a", "2026-01-01", [result({ scale: { min: 0, max: 3 } }, [{ value: 1 }])]), assessment("b", "2026-02-01", [result({ scale: { min: 0, max: 3 } }, [{ value: 2 }])]));
    expect(row.change).toEqual({ delta: 1, pct: null, improved: true });
  });

  it("leaves a missing value without a difference", () => {
    const [row] = compare(assessment("a", "2026-01-01", [result({}, [{ value: null }])]), assessment("b", "2026-02-01", [result({}, [{ value: 2 }])]));
    expect(row).toMatchObject({ status: "ok", older: null, newer: 2, change: null });
  });

  it("puts tests that are only in one assessment last", () => {
    const shared = result({}, [{ value: 1 }]);
    const onlyOld = { ...result({}, [{ value: 1 }]), testId: "old" };
    const onlyNew = { ...result({}, [{ value: 1 }]), testId: "new" };
    const rows = compare(assessment("a", "2026-01-01", [onlyOld, shared]), assessment("b", "2026-02-01", [onlyNew, shared]));
    expect(rows.map((r) => [r.testId, r.status])).toEqual([
      ["t1", "ok"],
      ["old", "only-older"],
      ["new", "only-newer"],
    ]);
  });
});

describe("fmtAsymmetry", () => {
  it("says the size and the better side", () => {
    expect(fmtAsymmetry({ pct: 19.05, points: 2, better: "right" }, "cm")).toBe("19% · direito melhor");
    expect(fmtAsymmetry({ pct: null, points: 2, better: "left" }, "pts")).toBe("2 pts · esquerdo melhor");
  });

  it("names no side on neutral tests, and no difference when there is none", () => {
    expect(fmtAsymmetry({ pct: null, points: 1.5, better: null }, "cm")).toBe("1,5 cm de diferença");
    expect(fmtAsymmetry({ pct: 0, points: 0, better: "equal" }, "kg")).toBe("Sem diferença");
  });
});

describe("repeatResults", () => {
  it("starts empty, from the test as it is today", () => {
    const old = result({ sided: true }, both(8, 10));
    const [r] = repeatResults([old], [test_({ sided: true, version: 2, trials: 2 })]);
    expect(r.id).not.toBe(old.id);
    expect(r.version).toBe(2);
    expect(r.trials).toHaveLength(4);
    expect(r.trials.every((t) => t.value === null)).toBe(true);
  });

  it("keeps a test that was deleted, with no values", () => {
    const old = { ...result({ sided: true }, both(8, 10)), note: "nota" };
    const [r] = repeatResults([old], []);
    expect(r.testId).toBe("t1");
    expect(r.note).toBeUndefined();
    expect(r.trials).toEqual(both(null, null));
  });
});

describe("previousResult", () => {
  const value = (v: number | null) => result({}, [{ value: v }]);

  it("finds the latest earlier result of the test", () => {
    const a = assessment("a", "2026-01-01", [value(1)]);
    const b = assessment("b", "2026-02-01", [value(2)]);
    const now = assessment("c", "2026-03-01", [value(3)]);
    expect(previousResult([now, b, a], now, "t1")?.assessment.id).toBe("b");
  });

  it("skips empty results, later assessments and deleted ones", () => {
    const a = assessment("a", "2026-01-01", [value(1)]);
    const empty = assessment("b", "2026-02-01", [value(null)]);
    const deleted = assessment("d", "2026-02-15", [value(9)], { deleted: true });
    const later = assessment("e", "2026-04-01", [value(9)]);
    const now = assessment("c", "2026-03-01", []);
    expect(previousResult([a, empty, deleted, later, now], now, "t1")?.assessment.id).toBe("a");
    expect(previousResult([now], now, "t1")).toBeNull();
  });
});
