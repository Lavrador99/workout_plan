import { describe, expect, it } from "vitest";
import { addSet, buildSteps, editSet, setDone, setItem } from "./live";
import { applyOp, applyOps, diffOps, parseOp, type LiveOp } from "./ops";
import type { Item, Session, SetRow } from "./types";

const item = (id: string, sets: SetRow[]): Item => ({ id, name: id, role: "main", repsUnit: "r", loadMode: "abs", note: "", sets });
const three = (): SetRow[] => [1, 2, 3].map(() => ({ reps: 8, load: 50 }));

const session = (): Session => ({
  id: "s1",
  updatedAt: 1,
  clientId: "c1",
  date: "2026-11-08",
  title: "Lower",
  notes: "",
  blocks: [
    { id: "b0", kind: "list", title: "Mobilidade", items: [item("wall", [])] },
    { id: "b1", kind: "sets", title: "", items: [item("squat", three()), item("lunge", three())] },
  ],
});

/** Without the per-field timestamps, which only ops add. */
const noAt = (s: Session) => JSON.parse(JSON.stringify(s, (k, v) => (k === "at" ? undefined : v)));

describe("diffOps → applyOps", () => {
  it("rebuilds what the live helpers did", () => {
    const s0 = { ...session(), startedAt: 100 };
    const steps = buildSteps(s0);
    let s1 = setDone(s0, steps[0], true); // item with no sets
    s1 = editSet(s1, 1, 0, 0, "load", 52.5); // raises the sets still to do
    s1 = setDone(s1, steps[1], true);
    s1 = addSet(s1, 1, 1);
    s1 = { ...s1, live: { step: steps[2], restUntil: 5_000, at: 0 } };

    const ops = diffOps(s0, s1, 1_000);
    expect(ops).not.toBeNull();
    const out = applyOps(s0, ops!);
    expect(noAt(out)).toEqual(noAt({ ...s1, live: { ...s1.live!, at: 1_000 } }));
    expect(out.blocks[1].items[0].sets.map((x) => x.load)).toEqual([52.5, 52.5, 52.5]);
    expect(out.blocks[1].items[1].sets).toHaveLength(4);
  });

  it("gives nothing when nothing changed", () => {
    expect(diffOps(session(), session(), 1)).toEqual([]);
  });

  it("refuses changes that are not live (swapped exercise, removed set, edited notes)", () => {
    const s0 = session();
    expect(diffOps(s0, setItem(s0, 1, 0, item("deadlift", three())), 1)).toBeNull();
    const fewer = { ...s0, blocks: s0.blocks.map((b, j) => (j === 1 ? { ...b, items: [b.items[0], { ...b.items[1], sets: [] }] } : b)) };
    expect(diffOps(s0, fewer, 1)).toBeNull();
    expect(diffOps(s0, { ...s0, notes: "dor no joelho" }, 1)).toBeNull();
  });
});

describe("applyOp", () => {
  const op = (o: Partial<LiveOp> & Pick<LiveOp, "op">): LiveOp => ({ sessionId: "s1", at: 10, item: "squat", si: 0, ...o }) as LiveOp;

  it("coach and client changing different fields of the same set keep both", () => {
    const coach = op({ op: "set", field: "load", value: 55, at: 20 });
    const client = op({ op: "set", field: "done", value: true, at: 10 }); // older, arrives later
    const set = applyOps(session(), [coach, client]).blocks[1].items[0].sets[0];
    expect(set).toMatchObject({ load: 55, done: true });
  });

  it("the later change to the same field wins, in any arrival order", () => {
    const a = op({ op: "set", field: "reps", value: 6, at: 10 });
    const b = op({ op: "set", field: "reps", value: 7, at: 20 });
    expect(applyOps(session(), [a, b]).blocks[1].items[0].sets[0].reps).toBe(7);
    expect(applyOps(session(), [b, a]).blocks[1].items[0].sets[0].reps).toBe(7);
  });

  it("is idempotent: the same op twice changes nothing more", () => {
    const o = op({ op: "set", field: "done", value: true });
    const once = applyOp(session(), o);
    expect(applyOp(once, o)).toBe(once);
    const add = op({ op: "addSet", si: 3 });
    const added = applyOp(session(), add);
    expect(applyOp(added, add)).toBe(added); // two "one more set" at once add one
    expect(added.blocks[1].items[0].sets[3]).toMatchObject({ reps: 8, load: 50, done: false });
  });

  it("finds the item by id after the blocks were reordered", () => {
    const s = session();
    const swapped = { ...s, blocks: [s.blocks[1], s.blocks[0]] };
    expect(applyOp(swapped, op({ op: "set", field: "done", value: true })).blocks[0].items[0].sets[0].done).toBe(true);
  });

  it("ignores unknown items and sets that do not exist yet", () => {
    const s = session();
    expect(applyOp(s, op({ op: "set", item: "nope", field: "done", value: true }))).toBe(s);
    expect(applyOp(s, op({ op: "set", si: 7, field: "done", value: true }))).toBe(s);
  });

  it("an older cursor does not move it back; start and end keep the first time", () => {
    let s = applyOp(session(), op({ op: "cursor", step: null, restUntil: 99, at: 20 }));
    s = applyOp(s, op({ op: "cursor", step: null, restUntil: 50, at: 10 }));
    expect(s.live).toEqual({ step: null, restUntil: 99, at: 20 });
    s = applyOps(s, [op({ op: "start", at: 5 }), op({ op: "start", at: 9 }), op({ op: "end", at: 30 })]);
    expect([s.startedAt, s.endedAt]).toEqual([5, 30]);
  });
});

describe("parseOp", () => {
  const ok = { op: "set", sessionId: "s1", at: 10, item: "squat", si: 0, field: "load", value: 50 };

  it("keeps only known keys", () => {
    expect(parseOp({ ...ok, evil: 1 })).toEqual(ok);
  });

  it("refuses bad shapes and values", () => {
    for (const bad of [
      null,
      [],
      { ...ok, op: "delete" },
      { ...ok, field: "name" },
      { ...ok, value: -1 },
      { ...ok, value: 1e9 },
      { ...ok, value: Number.NaN },
      { ...ok, field: "done", value: 1 },
      { ...ok, si: -1 },
      { ...ok, at: 0 },
      { ...ok, sessionId: "" },
      { op: "cursor", sessionId: "s1", at: 1, step: { kind: "set", bi: 0, ii: 0, group: "0" }, restUntil: null },
    ])
      expect(parseOp(bad)).toBeNull();
  });

  it("accepts the other ops", () => {
    expect(parseOp({ op: "addSet", sessionId: "s1", at: 1, item: "a", si: 3 })).not.toBeNull();
    expect(parseOp({ op: "cursor", sessionId: "s1", at: 1, step: { kind: "block", bi: 1, group: "1" }, restUntil: 5 })).not.toBeNull();
    expect(parseOp({ op: "end", sessionId: "s1", at: 1 })).toEqual({ op: "end", sessionId: "s1", at: 1 });
  });
});
