import { describe, expect, it } from "vitest";
import { athleteState, groupIds, groupKey, nextAthlete } from "./group";
import type { Session } from "@treino/core/types";

const NOW = 1_000_000;

const session = (id: string, opts: { done?: number; restUntil?: number | null; ended?: boolean } = {}): Session => ({
  id,
  updatedAt: 1,
  clientId: `c-${id}`,
  date: "2026-11-08",
  title: "",
  notes: "",
  startedAt: 1,
  endedAt: opts.ended ? 2 : null,
  live: opts.restUntil === undefined ? null : { step: null, restUntil: opts.restUntil, at: 1 },
  blocks: [
    {
      id: "b",
      kind: "sets",
      title: "",
      items: [{ id: `${id}-i`, name: "Squat", role: "main", repsUnit: "r", loadMode: "abs", note: "", sets: [0, 1, 2].map((k) => ({ reps: 8, done: k < (opts.done ?? 0) })) }],
    },
  ],
});

describe("athleteState", () => {
  it("counts sets and reads the rest", () => {
    expect(athleteState(session("a", { done: 1, restUntil: NOW + 30_000 }), NOW)).toEqual({ done: 1, total: 3, finished: false, restUntil: NOW + 30_000 });
  });

  it("a rest already over is no rest", () => {
    expect(athleteState(session("a", { restUntil: NOW - 1 }), NOW).restUntil).toBeNull();
  });

  it("all done or ended = finished", () => {
    expect(athleteState(session("a", { done: 3 }), NOW).finished).toBe(true);
    expect(athleteState(session("a", { ended: true }), NOW).finished).toBe(true);
  });
});

describe("nextAthlete", () => {
  it("goes to whoever is ready, before those resting", () => {
    const list = [session("a"), session("b", { restUntil: NOW + 60_000 }), session("c")];
    expect(nextAthlete(list, "a", NOW)).toBe("c");
  });

  it("among those resting, the one who ends first", () => {
    const list = [session("a"), session("b", { restUntil: NOW + 60_000 }), session("c", { restUntil: NOW + 20_000 })];
    expect(nextAthlete(list, "a", NOW)).toBe("c");
  });

  it("a tie goes to the next in order, wrapping round", () => {
    const list = [session("a"), session("b"), session("c")];
    expect(nextAthlete(list, "b", NOW)).toBe("c");
    expect(nextAthlete(list, "c", NOW)).toBe("a");
  });

  it("skips the finished; nobody left = stay", () => {
    expect(nextAthlete([session("a"), session("b", { done: 3 }), session("c", { ended: true })], "a", NOW)).toBeNull();
  });
});

it("group key round-trips", () => {
  expect(groupIds(groupKey(["x", "y"]))).toEqual(["x", "y"]);
});
