import { describe, expect, it } from "vitest";
import { extraCount, mainSets, setExtras, withSidedExtras } from "./extras";
import { buildSteps } from "./live";
import { fmtRx } from "./format";
import type { Item, Session } from "./types";

const item = (over: Partial<Item> = {}): Item => ({
  id: "i",
  name: "Agachamento búlgaro",
  role: "main",
  repsUnit: "reps",
  loadMode: "dual",
  note: "",
  sets: [
    { type: "warmup", reps: 10, load: 4 },
    { reps: 8, load: 10, done: true },
    { reps: 8, load: 10 },
  ],
  ...over,
});

describe("extra sets on one side", () => {
  it("are sets with a side, copied from the last work set and not done", () => {
    const it2 = setExtras(item(), "left", 2);
    expect(extraCount(it2, "left")).toBe(2);
    expect(it2.sets.slice(-2)).toEqual([
      { reps: 8, load: 10, side: "left", done: false },
      { reps: 8, load: 10, side: "left", done: false },
    ]);
    expect(mainSets(it2)).toHaveLength(3);
  });

  it("go down from the last one of that side", () => {
    const it2 = setExtras(setExtras(setExtras(item(), "left", 2), "right", 1), "left", 1);
    expect(it2.sets.filter((s) => s.side).map((s) => s.side)).toEqual(["left", "right"]);
  });

  it("older items keep only a number: read it, and turn it into sets", () => {
    const old = item({ extraLeft: 1, extraRight: 2 });
    expect(extraCount(old, "right")).toBe(2);
    const now = withSidedExtras(old);
    expect("extraLeft" in now || "extraRight" in now).toBe(false);
    expect(now.sets.filter((s) => s.side === "right")).toHaveLength(2);
    expect(withSidedExtras(now)).toBe(now);
  });

  it("are steps of the live session, so they can be ticked", () => {
    const s: Session = { id: "s", updatedAt: 0, clientId: "c", date: "2026-11-21", title: "", notes: "", blocks: [{ id: "b", kind: "list", title: "", items: [setExtras(item(), "left", 1)] }] };
    expect(buildSteps(s).filter((st) => st.kind === "set")).toHaveLength(4);
  });

  it("show in the prescription as E +n, not as more sets", () => {
    expect(fmtRx(setExtras(item({ sets: [{ reps: 8, load: 10 }, { reps: 8, load: 10 }] }), "left", 1))).toMatch(/^2x8 .*\(E \+1\)$/);
  });
});
