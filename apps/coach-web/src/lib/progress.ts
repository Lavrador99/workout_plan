// Goals: measurable targets on a test or a metric of the coach's own.

import { goalProgress } from "./assessment";
import type { Goal, Importance } from "@treino/core/types";

// ── Goals ───────────────────────────────────────────────────────────────────

export const IMPORTANCE: [Importance, string][] = [
  [1, "Normal"],
  [2, "Alta"],
  [3, "Muito alta"],
];

/** % of the way on a metric of its own; null until it has a start and a target. */
export function metricProgress(g: Pick<Goal, "startValue" | "currentValue" | "target">): number | null {
  if (g.startValue == null || g.target == null) return null;
  return goalProgress(g.startValue, g.currentValue ?? g.startValue, g.target);
}

/** One goal per test and client, so every device arrives at the same record. */
export const testGoalId = (clientId: string, testId: string) => `goal-${clientId}-${testId}`;

export const testGoal = (clientId: string, testId: string, target: number | null = null): Goal => ({ id: testGoalId(clientId, testId), updatedAt: 0, clientId, title: "", testId, target, criteria: "", status: "active" });

/** The targets older versions kept on the client that are not goals yet. */
export const goalsFromTargets = (clientId: string, targets: Record<string, number>, existing: Set<string>): Goal[] =>
  Object.entries(targets)
    .map(([testId, target]) => testGoal(clientId, testId, target))
    .filter((g) => !existing.has(g.id));

/** Goal per test (testId → value), read in the test's direction. */
export function targetsOf(goals: Goal[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of goals) if (!g.deleted && g.status !== "dropped" && g.testId && g.target != null) out[g.testId] = g.target;
  return out;
}
