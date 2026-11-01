import { describe, expect, it } from "vitest";
import { buildSteps, editSet, isDone, nextOpen, restAfter, setDone } from "./live";
import { parseSessionText } from "./parser";
import type { Session } from "./types";

const session = (text: string): Session => ({ id: "s", updatedAt: 0, clientId: "c", date: "2026-11-01", title: "", notes: "", ...parseSessionText(text) });

const label = (s: Session) =>
  buildSteps(s).map((st) => (st.kind === "block" ? `B${st.bi}` : `${s.blocks[st.bi].items[st.ii].name}${st.kind === "set" ? st.si + 1 : ""}`));

describe("buildSteps", () => {
  it("goes set by set, alternating main and fillers", () => {
    const s = session("Back squat 3x8 50kg\n(Russian twist 3x10)\nLeg press 2x10 100kg");
    expect(label(s)).toEqual(["Back squat1", "Russian twist1", "Back squat2", "Russian twist2", "Back squat3", "Russian twist3", "Leg press1", "Leg press2"]);
  });

  it("keeps items without sets and whole circuits as one step", () => {
    const s = session('Elephant wall\n\n40"/20" x3\nDevil press\nWall ball');
    expect(label(s)).toEqual(["Elephant wall", "B1"]);
  });
});

describe("ticking", () => {
  it("ticks an item with no sets and a whole circuit", () => {
    let s = session('Elephant wall\n\n40"/20" x3\nDevil press\nWall ball');
    const [a, b] = buildSteps(s);
    s = setDone(setDone(s, a, true), b, true);
    expect(isDone(s, a) && isDone(s, b)).toBe(true);
    expect(nextOpen(s, buildSteps(s))).toBeUndefined();
  });

  it("next open step wraps round past skipped ones", () => {
    let s = session("Back squat 3x8 50kg");
    const steps = buildSteps(s);
    s = setDone(s, steps[1], true);
    expect(nextOpen(s, steps, 1)).toEqual(steps[2]);
    s = setDone(s, steps[2], true);
    expect(nextOpen(s, steps, 2)).toEqual(steps[0]);
  });
});

describe("editSet", () => {
  it("raises the sets still to do that had the same load", () => {
    let s = session("Back squat 4x8 50kg");
    s = setDone(s, buildSteps(s)[0], true);
    s = editSet(s, 0, 0, 1, "load", 52.5);
    expect(s.blocks[0].items[0].sets.map((x) => x.load)).toEqual([50, 52.5, 52.5, 52.5]);
  });

  it("leaves a pyramid's different numbers alone", () => {
    let s = session("Hip thrust 12x40kg/12x40kg/11x50kg");
    s = editSet(s, 0, 0, 0, "load", 45);
    expect(s.blocks[0].items[0].sets.map((x) => x.load)).toEqual([45, 45, 50]);
  });
});

describe("restAfter", () => {
  it("no rest between the two exercises of a superset turn, default after", () => {
    const s = session("Back squat 2x8 50kg\n(Russian twist 2x10)");
    const steps = buildSteps(s);
    expect(restAfter(s, steps, steps[0])).toBe(0);
    expect(restAfter(s, steps, steps[1])).toBe(90);
    expect(restAfter(s, steps, steps[3])).toBe(0); // last step
  });
});
