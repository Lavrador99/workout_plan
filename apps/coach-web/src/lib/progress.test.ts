import { describe, expect, it } from "vitest";
import { goalsFromTargets, targetsOf, testGoalId } from "./progress";
import type { Goal } from "@treino/core/types";

const goal = (over: Partial<Goal> = {}): Goal => ({ id: "g", updatedAt: 1, clientId: "c", title: "", criteria: "", status: "active", ...over });

describe("goals", () => {
  it("reads the values of live test goals only", () => {
    const list = [
      goal({ id: "a", testId: "t1", target: 40 }),
      goal({ id: "b", testId: "t2", target: 10, status: "achieved" }),
      goal({ id: "c", testId: "t3", target: 10, status: "dropped" }),
      goal({ id: "d", testId: "t4", target: 10, deleted: true }),
      goal({ id: "e", testId: "t5", target: null }),
      goal({ id: "f", title: "Correr sem dor" }),
    ];
    expect(targetsOf(list)).toEqual({ t1: 40, t2: 10 });
  });
});

describe("old targets", () => {
  it("become test goals", () => {
    expect(goalsFromTargets("c", { t1: 40 }, new Set())).toEqual([{ id: testGoalId("c", "t1"), updatedAt: 0, clientId: "c", title: "", testId: "t1", target: 40, criteria: "", status: "active" }]);
  });

  it("leave a goal already there alone, even a deleted one", () => {
    expect(goalsFromTargets("c", { t1: 40, t2: 10 }, new Set([testGoalId("c", "t1")])).map((g) => g.testId)).toEqual(["t2"]);
  });
});
