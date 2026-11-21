// What the client's tests say about an asymmetry: the side difference of each
// sided test of its muscles, and the strength ratio against the antagonists.

import { asymmetry, finalValue, type Asymmetry } from "./assessment";
import { canonMuscles, type PerSide } from "./movement";
import type { Assessment, Side, TestDef, TestResult } from "@treino/core/types";

export interface SideTest {
  test: TestDef;
  date: string;
  result: TestResult;
  asym: Asymmetry | null;
  /** The difference in the assessment before, to see where it is going. */
  before: Asymmetry | null;
}

/** Each sided test of these muscles, from its latest assessment, newest first. */
export function sideTests(muscles: string[], assessments: Assessment[], tests: TestDef[]): SideTest[] {
  const wanted = new Set(canonMuscles(muscles));
  const byId = new Map(tests.map((t) => [t.id, t]));
  const out = new Map<string, SideTest>();
  const newest = assessments.filter((a) => !a.deleted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  for (const a of newest)
    for (const r of a.results) {
      const t = byId.get(r.testId);
      if (!t || !r.sided || !canonMuscles(t.muscles ?? []).some((m) => wanted.has(m))) continue;
      if (finalValue(r, "left") == null || finalValue(r, "right") == null) continue;
      const cur = out.get(t.id);
      if (!cur) out.set(t.id, { test: t, date: a.date, result: r, asym: asymmetry(r), before: null });
      else if (!cur.before) cur.before = asymmetry(r);
    }
  return [...out.values()];
}

export interface StrengthRatio {
  own: SideTest;
  antagonist: SideTest;
  /** Muscle ÷ antagonist on each side. */
  ratio: Record<Side, number | null>;
}

/** The latest strength tests of the muscle and of its antagonist, in the same unit, as a ratio per side. */
export function strengthRatio(own: SideTest[], antagonist: SideTest[]): StrengthRatio | null {
  for (const o of own) {
    if (o.test.category !== "força") continue;
    const a = antagonist.find((x) => x.test.category === "força" && x.test.unit === o.test.unit && x.test.id !== o.test.id);
    if (!a) continue;
    const per = (side: Side) => {
      const m = finalValue(o.result, side);
      const n = finalValue(a.result, side);
      return m != null && n ? m / n : null;
    };
    return { own: o, antagonist: a, ratio: { left: per("left"), right: per("right") } };
  }
  return null;
}

/** Muscle ÷ antagonist sets on each side; null where the antagonist had none. */
export function volumeRatio(own: PerSide, antagonist: PerSide): Record<Side, number | null> {
  return { left: antagonist.left ? own.left / antagonist.left : null, right: antagonist.right ? own.right / antagonist.right : null };
}
