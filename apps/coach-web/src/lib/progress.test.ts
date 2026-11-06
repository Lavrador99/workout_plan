import { describe, expect, it } from "vitest";
import { changeWeights, DIMENSIONS, goalsFromTargets, PRIMARY_GOALS, sameWeights, targetsOf, testGoalId, totalOf, weightsOf } from "./progress";
import type { Client, Goal, Weights } from "./types";

const client = (over: Partial<Client> = {}): Client => ({ id: "c", updatedAt: 1, name: "Ana", injuries: "", notes: "", ...over });
const goal = (over: Partial<Goal> = {}): Goal => ({ id: "g", updatedAt: 1, clientId: "c", title: "", criteria: "", status: "active", ...over });
const custom: Weights = { geral: 30, forca: 30, mobilidade: 10, composicao: 10, cardio: 10, adesao: 10 };

describe("weights", () => {
  it("adds up to 100 on every main goal and covers every dimension", () => {
    expect(PRIMARY_GOALS).toHaveLength(6);
    for (const g of PRIMARY_GOALS) {
      expect(totalOf(g.weights), g.id).toBe(100);
      expect(Object.keys(g.weights).sort()).toEqual(DIMENSIONS.map((d) => d.id).sort());
    }
  });

  it("starts from general health, then the main goal, then the coach's own", () => {
    expect(weightsOf(client()).geral).toBe(25);
    expect(weightsOf(client({ primaryGoal: "hipertrofia" })).forca).toBe(40);
    expect(weightsOf(client({ primaryGoal: "hipertrofia", weights: custom })).forca).toBe(30);
  });

  it("logs a change of main goal", () => {
    const patch = changeWeights(client(), "gordura", null, 5);
    expect(patch).toMatchObject({ primaryGoal: "gordura", weights: null });
    expect(patch.weightLog).toEqual([{ at: 5, primaryGoal: "gordura", weights: PRIMARY_GOALS[2].weights, custom: false }]);
  });

  it("logs the coach's own weights and keeps what came before", () => {
    const before = client({ primaryGoal: "saude", weightLog: [{ at: 1, primaryGoal: "saude", weights: PRIMARY_GOALS[0].weights, custom: false }] });
    const patch = changeWeights(before, "saude", custom, 5);
    expect(patch.weights).toEqual(custom);
    expect(patch.weightLog?.map((l) => [l.at, l.custom])).toEqual([[1, false], [5, true]]);
  });

  it("treats weights equal to the main goal's as that goal's", () => {
    const patch = changeWeights(client({ primaryGoal: "saude", weights: custom }), "saude", { ...PRIMARY_GOALS[0].weights }, 5);
    expect(patch).toMatchObject({ weights: null });
    expect(patch.weightLog?.[0].custom).toBe(false);
  });

  it("logs nothing when nothing changes", () => {
    expect(changeWeights(client({ primaryGoal: "saude" }), "saude", null, 5)).toEqual({});
    expect(changeWeights(client({ primaryGoal: "saude", weights: custom }), "saude", { ...custom }, 5)).toEqual({});
  });

  it("compares weights by value", () => {
    expect(sameWeights(custom, { ...custom })).toBe(true);
    expect(sameWeights(custom, { ...custom, adesao: 11 })).toBe(false);
  });
});

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
