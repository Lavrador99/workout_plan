import { describe, expect, it } from "vitest";
import { newResult } from "./assessment";
import { sideTests, strengthRatio } from "./asymmetries";
import type { Assessment, TestDef, TestResult } from "@treino/core/types";

const test_ = (id: string, muscles: string[], over: Partial<TestDef> = {}): TestDef => ({
  id,
  updatedAt: 1,
  name: id,
  category: "força",
  unit: "kg",
  direction: "higher",
  sided: true,
  scale: null,
  trials: 1,
  aggregate: "best",
  groups: [],
  version: 1,
  purpose: "",
  equipment: "",
  instructions: "",
  validity: "",
  muscles,
  ...over,
});
const result = (t: TestDef, left: number, right: number): TestResult => ({ ...newResult(t), trials: [{ side: "left", value: left }, { side: "right", value: right }] });
const assessment = (id: string, date: string, results: TestResult[]): Assessment => ({ id, updatedAt: 1, clientId: "c", date, title: "", conditions: "", notes: "", results });

const abd = test_("abd", ["glúteo médio"]);
const add = test_("add", ["adutores"]);
const reach = test_("reach", ["glúteo médio"], { category: "estabilidade", unit: "cm" });

describe("asymmetries", () => {
  it("keeps each test's latest side difference and the one before", () => {
    const list = sideTests(["glúteo médio"], [assessment("a1", "2026-01-10", [result(abd, 15, 20)]), assessment("a2", "2026-03-10", [result(abd, 18, 20), result(reach, 60, 70)])], [abd, add, reach]);
    expect(list.map((x) => x.test.id)).toEqual(["abd", "reach"]);
    expect(list[0].asym).toEqual({ pct: 10, points: 2, better: "right" });
    expect(list[0].before).toEqual({ pct: 25, points: 5, better: "right" });
  });

  it("gives the strength ratio per side from strength tests in the same unit", () => {
    const all = [assessment("a1", "2026-03-10", [result(abd, 18, 20), result(add, 24, 20), result(reach, 60, 70)])];
    const r = strengthRatio(sideTests(["glúteo médio"], all, [abd, add, reach]), sideTests(["adutores"], all, [abd, add, reach]));
    expect(r?.own.test.id).toBe("abd");
    expect(r?.ratio).toEqual({ left: 0.75, right: 1 });
  });
});
