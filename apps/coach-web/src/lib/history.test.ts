import { describe, expect, it } from "vitest";
import { history, suggest, topSet } from "./history";
import { parseItemLine } from "./parser";
import type { Item, Session } from "./types";

const session = (id: string, date: string, lines: string[], done = true): Session => ({
  id,
  updatedAt: 0,
  clientId: "c",
  date,
  title: "",
  notes: "",
  blocks: [
    {
      id: "b",
      kind: "sets",
      title: "",
      items: lines.map((l) => {
        const it = parseItemLine(l);
        return { ...it, sets: it.sets.map((s) => ({ ...s, done })) };
      }),
    },
  ],
});

describe("history", () => {
  const sessions = [
    session("a", "2026-10-19", ["Front squat 4x8 42,5kg"]),
    session("b", "2026-10-26", ["Back squat 4x8 47,5kg", "front squat 3x5 45kg"]),
    session("c", "2026-10-30", ["Front squat 4x8 45kg"], false),
  ];

  it("matches by name ignoring case, newest first, excluding the current session", () => {
    const h = history(sessions, { name: "Front Squat" }, { excludeId: "c" });
    expect(h.map((o) => o.session.id)).toEqual(["b", "a"]);
  });

  it("topSet prefers ticked sets", () => {
    const it: Item = parseItemLine("Deadlift 12x40kg/8x65kg/8x70kg");
    it.sets[0].done = true;
    expect(topSet(it)?.load).toBe(40);
    it.sets.forEach((s) => (s.done = false));
    expect(topSet(it)?.load).toBe(70);
  });
});

describe("suggest", () => {
  const prev = (line: string, done: boolean) => {
    const s = session("p", "2026-10-26", [line], done);
    return { session: s, item: s.blocks[0].items[0] };
  };

  it("adds load when everything was done", () => {
    const sg = suggest(prev("Back squat 4x8 47,5kg", true))!;
    expect(sg.kind).toBe("progress");
    const out = sg.apply(parseItemLine("Back squat"));
    expect(out.sets).toHaveLength(4);
    expect(out.sets[0]).toMatchObject({ reps: 8, load: 50, done: false });
  });

  it("dual dumbbells step 2kg, pyramids keep their shape", () => {
    expect(suggest(prev("Step up 3x8 2x8kg", true))!.apply(parseItemLine("Step up")).sets[0].load).toBe(10);
    const p = suggest(prev("Hip thrust 12x40kg/12x40kg/11x50kg", true))!.apply(parseItemLine("Hip thrust"));
    expect(p.sets.map((s) => s.load)).toEqual([42.5, 42.5, 52.5]);
  });

  it("without load adds a rep or 5 seconds", () => {
    expect(suggest(prev("Hip hike 2x12", true))!.apply(parseItemLine("Hip hike")).sets[0].reps).toBe(13);
    expect(suggest(prev("Side plank 2x 20s", true))!.apply(parseItemLine("Side plank")).sets[0].duration).toBe(25);
  });

  it("repeats when not everything was ticked", () => {
    const sg = suggest(prev("Back squat 4x8 47,5kg", false))!;
    expect(sg.kind).toBe("repeat");
    expect(sg.apply(parseItemLine("Back squat")).sets[0].load).toBe(47.5);
  });
});
