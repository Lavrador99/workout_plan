// The setup of the Individual Progress Index: its dimensions, the starting
// weights per main goal, and the record of every change to them.
// The weights are starting points for the coach, not scientific values.

import { goalProgress } from "./assessment";
import type { Client, DimensionId, Goal, Importance, PrimaryGoal, Weights } from "./types";

export const DIMENSIONS: { id: DimensionId; label: string }[] = [
  { id: "geral", label: "Condição física geral" },
  { id: "forca", label: "Força e capacidade muscular" },
  { id: "mobilidade", label: "Mobilidade, estabilidade e controlo motor" },
  { id: "composicao", label: "Composição corporal" },
  { id: "cardio", label: "Resistência cardiovascular" },
  { id: "adesao", label: "Consistência e adesão" },
];

const weights = (geral: number, forca: number, mobilidade: number, composicao: number, cardio: number, adesao: number): Weights => ({ geral, forca, mobilidade, composicao, cardio, adesao });

export const PRIMARY_GOALS: { id: PrimaryGoal; label: string; weights: Weights }[] = [
  { id: "saude", label: "Saúde e condição física geral", weights: weights(25, 20, 15, 15, 15, 10) },
  { id: "hipertrofia", label: "Hipertrofia", weights: weights(10, 40, 10, 20, 5, 15) },
  { id: "gordura", label: "Perda de gordura", weights: weights(15, 15, 10, 35, 15, 10) },
  { id: "desporto", label: "Preparação física desportiva", weights: weights(30, 25, 10, 5, 25, 5) },
  { id: "funcional", label: "Correção de limitações funcionais", weights: weights(15, 15, 45, 5, 5, 15) },
  { id: "longevidade", label: "Saúde e longevidade", weights: weights(20, 20, 20, 15, 15, 10) },
];

const DEFAULT_GOAL: PrimaryGoal = "saude";

export const goalLabel = (id: PrimaryGoal | null | undefined) => PRIMARY_GOALS.find((g) => g.id === id)?.label;

const presetOf = (id: PrimaryGoal | null | undefined) => (PRIMARY_GOALS.find((g) => g.id === id) ?? PRIMARY_GOALS.find((g) => g.id === DEFAULT_GOAL)!).weights;

/** The coach's own weights, else those of the main goal. */
export const weightsOf = (c: Pick<Client, "primaryGoal" | "weights">): Weights => c.weights ?? presetOf(c.primaryGoal);

export const totalOf = (w: Weights) => DIMENSIONS.reduce((sum, d) => sum + w[d.id], 0);

export const sameWeights = (a: Weights, b: Weights) => DIMENSIONS.every((d) => a[d.id] === b[d.id]);

/**
 * The fields to save for a new main goal and weights (null = the goal's own).
 * Logged, so an index can always be read with the weights it was made with.
 * Empty when nothing changes.
 */
export function changeWeights(c: Client, primaryGoal: PrimaryGoal, next: Weights | null, at: number): Partial<Client> {
  const custom = next != null && !sameWeights(next, presetOf(primaryGoal));
  const value = custom ? next : presetOf(primaryGoal);
  if (c.primaryGoal === primaryGoal && sameWeights(weightsOf(c), value)) return {};
  return { primaryGoal, weights: custom ? value : null, weightLog: [...(c.weightLog ?? []), { at, primaryGoal, weights: value, custom }] };
}

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
