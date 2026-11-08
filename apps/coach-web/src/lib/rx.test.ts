import { describe, expect, it } from "vitest";
import { fmtCircuitHeader, fmtRx } from "@treino/core/format";
import { suggest } from "./history";
import { countedSets } from "./movement";
import { parseItemLine } from "./parser";
import { addBackoff, addDrop, addWarmups, cycleType, pyramid } from "./rx";
import type { Block, Item, Session } from "@treino/core/types";

const bench = (): Item => ({ ...parseItemLine("Supino 4x10 60kg RIR 2 desc 90s"), id: "i" });

describe("per-set prescription", () => {
  it("reads RIR / RPE and rest from the typed line", () => {
    const it = bench();
    expect(it.sets).toHaveLength(4);
    expect(it.sets[0]).toMatchObject({ reps: 10, load: 60, rir: 2, rest: 90 });
    expect(it.effort).toBe("rir");
    expect(parseItemLine("Agachamento 3x5 100kg @8 descanso 2min").sets[2]).toMatchObject({ rir: 8, rest: 120 });
    expect(parseItemLine("Agachamento 3x5 100kg @8").effort).toBe("rpe");
    expect(parseItemLine("Remada 3x10 desc. 1:30").sets[0].rest).toBe(90);
  });

  it("writes them back", () => {
    expect(fmtRx(bench())).toBe("4x10 60kg RIR 2 desc. 1:30");
  });

  it("pyramid: more load, fewer reps, lower RIR each set", () => {
    const p = pyramid(bench());
    expect(p.sets.map((s) => [s.reps, s.load, s.rir])).toEqual([
      [10, 60, 2],
      [8, 65, 1],
      [6, 70, 0],
      [4, 72.5, 0],
    ]);
    expect(fmtRx(p)).toContain("10x60kg RIR 2 / 8x65kg RIR 1");
    expect(pyramid(bench(), true).sets.map((s) => [s.reps, s.load])).toEqual([
      [10, 60],
      [12, 55],
      [14, 50],
      [16, 47.5],
    ]);
  });

  it("warm-ups go first and do not count as working sets", () => {
    const w = addWarmups(bench());
    expect(w.sets.slice(0, 2).map((s) => [s.type, s.load])).toEqual([
      ["warmup", 30],
      ["warmup", 45],
    ]);
    expect(addWarmups(w).sets.filter((s) => s.type === "warmup")).toHaveLength(2);
    const block: Block = { id: "b", kind: "sets", title: "", items: [w] };
    expect(countedSets(block, w, false)).toBe(4);
  });

  it("back-off and drop sets", () => {
    const b = addBackoff(bench());
    expect(b.sets[4]).toMatchObject({ reps: 12, load: 50 });
    const d = addDrop(bench());
    expect(d.sets[3].rest).toBe(0);
    expect(d.sets[4]).toMatchObject({ type: "drop", reps: null, load: 47.5, rir: 0 });
  });

  it("set type cycles work → warm-up → failure → drop → work", () => {
    let s = bench().sets[0];
    const seen = [];
    for (let i = 0; i < 4; i++) seen.push((s = cycleType(s)).type);
    expect(seen).toEqual(["warmup", "failure", "drop", "work"]);
  });

  it("progression keeps each set's RIR, rest and type", () => {
    const done = { ...addWarmups(bench()), sets: addWarmups(bench()).sets.map((s) => ({ ...s, done: true })) };
    const session = { id: "s", date: "2026-10-30" } as Session;
    const next = suggest({ session, item: done })!.apply(done);
    expect(next.sets[0]).toMatchObject({ type: "warmup", load: 30 }); // warm-ups unchanged
    expect(next.sets[2]).toMatchObject({ load: 62.5, rir: 2, rest: 90, done: false });
  });
});

describe("timed blocks", () => {
  it("headers", () => {
    expect(fmtCircuitHeader({ id: "b", kind: "emom", title: "", items: [], work: 60, rounds: 12 })).toBe("EMOM x12");
    expect(fmtCircuitHeader({ id: "b", kind: "emom", title: "", items: [], work: 90, rounds: 8 })).toBe("EMOM 1:30 x8");
    expect(fmtCircuitHeader({ id: "b", kind: "amrap", title: "", items: [], work: 720 })).toBe("AMRAP 12min");
  });
});
