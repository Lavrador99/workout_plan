import { describe, expect, it } from "vitest";
import { focusSide, groupByPeriod, inferMuscles, inferPatterns, musclesOf, patternsOf, tally, weekStart } from "./movement";
import { seedExercises, seedProfiles } from "./seed";
import type { Block, Exercise, Item, Session } from "@treino/core/types";

const ex = (name: string, tags: string[] = [], pt = ""): Exercise => ({ id: name, updatedAt: 0, name, pt, aliases: [], tags });

const item = (name: string, sets: { done?: boolean }[], extra: Partial<Item> = {}): Item => ({
  id: name,
  exerciseId: name,
  name,
  role: "main",
  repsUnit: "r",
  loadMode: "abs",
  note: "",
  sets: sets.map((s) => ({ reps: 10, ...s })),
  ...extra,
});

const session = (id: string, date: string, blocks: Block[]): Session => ({ id, updatedAt: 0, clientId: "c", date, title: "", notes: "", blocks });
const block = (items: Item[], extra: Partial<Block> = {}): Block => ({ id: "b", kind: "sets", title: "", items, ...extra });

describe("inferPatterns", () => {
  it("guesses from English, Portuguese and tags", () => {
    expect(inferPatterns(ex("Back Squat"))).toEqual(["agachamento"]);
    expect(inferPatterns(ex("Bulgarian Split Squat"))).toEqual(["afundo / unilateral"]);
    expect(inferPatterns(ex("Remada com halter"))).toEqual(["puxar horizontal"]);
    expect(inferPatterns(ex("Nordic Hamstring Curl"))).toEqual(["flexão do joelho"]);
    expect(inferPatterns(ex("Pallof Press", ["core", "core: anti-rotação"]))).toEqual(["anti-rotação"]);
    expect(inferPatterns(ex("Rower", ["cardio"]))).toEqual(["locomoção / cardio"]);
    expect(inferPatterns(ex("Side Plank"))).toEqual(["anti-flexão lateral"]);
  });

  it("knows the hip thrust, ankle and hip rotation patterns", () => {
    expect(inferPatterns(ex("Hip Thrust"))).toEqual(["elevação pélvica"]);
    expect(inferPatterns(ex("Romanian Deadlift"))).toEqual(["dobradiça da anca"]);
    expect(inferPatterns(ex("Tibialis Raise"))).toEqual(["dorsiflexão"]);
    expect(inferPatterns(ex("Banded Ankle Eversion"))).toEqual(["eversão do pé"]);
    expect(inferPatterns(ex("Clamshell"))).toEqual(["abdução da anca", "rotação externa da anca"]);
    expect(inferPatterns(ex("Rotação externa da anca com elástico"))).toEqual(["rotação externa da anca"]);
    expect(inferPatterns(ex("Cable External Rotation"))).toEqual(["rotação do ombro"]);
  });

  it("reads patterns and muscles saved under their old names", () => {
    const old = { ...ex("x"), patterns: ["adução", "mobilidade"], muscles: ["posteriores", "oblíquos"] };
    expect(patternsOf(old)).toEqual(["adução da anca", "mobilidade / controlo motor"]);
    expect(musclesOf(old)).toEqual(["isquiotibiais", "oblíquo externo", "oblíquo interno"]);
  });

  it("finds a pattern for most of the base library", () => {
    const list = seedExercises();
    const none = list.filter((e) => !inferPatterns(e).length);
    expect(none.length / list.length).toBeLessThan(0.2);
  });
});

describe("inferMuscles", () => {
  it("tells apart muscles with shared words", () => {
    expect(inferMuscles(ex("Hammer Curl"))).toEqual(["braquiorradial"]);
    expect(inferMuscles(ex("x", ["bíceps femoral"]))).toEqual(["isquiotibiais"]);
    expect(inferMuscles(ex("x", ["bíceps braquial"]))).toEqual(["bíceps braquial"]);
    expect(inferMuscles(ex("Seated Calf Raise"))).toEqual(["gémeos", "sóleo"]);
    expect(inferMuscles(ex("x", ["tibial posterior"]))).toEqual(["tibial posterior"]);
  });
});

describe("tally", () => {
  const lib = new Map([ex("Back Squat"), ex("Pull-up"), ex("Copenhagen Plank", ["prehab"])].map((e) => [e.id, e]));

  it("counts ticked sets once anything is ticked, prescribed sets otherwise", () => {
    const planned = session("a", "2026-10-26", [block([item("Back Squat", [{}, {}, {}])])]);
    const done = session("b", "2026-10-27", [block([item("Back Squat", [{ done: true }, { done: true }, {}]), item("Pull-up", [{}, {}])])]);
    expect(tally([planned], lib, []).sets).toBe(3);
    const t = tally([done], lib, []);
    expect(t.sets).toBe(2);
    expect(t.patterns.get("agachamento")).toBe(2);
    expect(t.patterns.has("puxar vertical")).toBe(false);
  });

  it("counts grips, stances, extra left and circuit rounds", () => {
    const s = session("a", "2026-10-26", [
      block([item("Pull-up", [{}, {}], { grip: "supinada" }), item("Back Squat", [{}], { stance: "largura dos ombros", extraLeft: 1 })]),
      block([item("Copenhagen Plank", [])], { kind: "circuit", rounds: 3 }),
    ]);
    const t = tally([s], lib, []);
    expect(t.grips.get("supinada")).toBe(2);
    // the extra set on the left is a set too
    expect(t.stances.get("largura dos ombros")).toBe(2);
    expect(t.extra.left.sets).toBe(1);
    expect(t.extra.right.sets).toBe(0);
    expect(t.patterns.get("adução da anca")).toBe(3);
  });

  it("counts towards a focus by key exercise, pattern or muscle", () => {
    const [futebol] = seedProfiles([...lib.values()]);
    expect(futebol.exerciseIds).toEqual(["Copenhagen Plank"]);
    const s = session("a", "2026-10-26", [block([item("Copenhagen Plank", [{}]), item("Back Squat", [{}]), item("Pull-up", [{}])])]);
    const hit = tally([s], lib, [{ ...futebol, muscles: ["squat"] }]).focus.get(futebol.id);
    expect(hit?.sets).toBe(2);
    expect([...(hit?.exercises ?? [])]).toEqual(["Copenhagen Plank", "Back Squat"]);
  });

  it("counts the extra sets on each side, and on a one-sided focus's side", () => {
    const s = session("a", "2026-10-26", [
      block([item("Back Squat", [{ done: true }, { done: true }, { done: true }], { extraRight: 1 }), item("Back Squat", [{ done: true }], { extraLeft: 2 }), item("Pull-up", [{}], { extraRight: 1 })]),
    ]);
    const base = { id: "f", updatedAt: 0, kind: "asymmetry" as const, patterns: [], muscles: ["squat"], exerciseIds: [], notes: "" };
    const t = tally([s], lib, [{ ...base, name: "Glúteo direito" }]);
    // the pull-up was not done, so its extra set does not count either
    expect(t.extra.right.sets).toBe(1);
    expect(t.extra.left.sets).toBe(2);
    expect([...t.extra.right.exercises]).toEqual([["Back Squat", 1]]);
    expect(t.sets).toBe(7);
    expect(t.focus.get("f")).toMatchObject({ sets: 7, extra: 1 });
  });

  it("reads a focus's side from the name unless it is set", () => {
    const f = { id: "f", updatedAt: 0, kind: "asymmetry" as const, patterns: [], muscles: [], exerciseIds: [], notes: "" };
    expect(focusSide({ ...f, name: "Isquiotibial direito" })).toBe("right");
    expect(focusSide({ ...f, name: "Ombro esquerdo" })).toBe("left");
    expect(focusSide({ ...f, name: "Glúteo médio" })).toBeNull();
    expect(focusSide({ ...f, name: "Glúteo direito", side: null })).toBeNull();
    expect(focusSide({ ...f, name: "Joelho", side: "left" })).toBe("left");
  });
});

describe("periods", () => {
  it("weeks start on Monday", () => {
    expect(weekStart("2026-10-30")).toBe("2026-10-26"); // Friday
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday
  });

  it("groups newest first", () => {
    const s = [session("a", "2026-10-01", []), session("b", "2026-10-28", []), session("c", "2026-11-02", [])];
    expect(groupByPeriod(s, "month").map((g) => [g.label, g.sessions.length])).toEqual([
      ["novembro 2026", 1],
      ["outubro 2026", 2],
    ]);
    expect(groupByPeriod(s, "week").map((g) => g.key)).toEqual(["2026-11-02", "2026-10-26", "2026-09-28"]);
    expect(groupByPeriod(s, "session").map((g) => g.key)).toEqual(["c", "b", "a"]);
    const older = [...s, session("d", "2025-12-30", [])];
    expect(groupByPeriod(older, "year").map((g) => [g.label, g.sessions.length])).toEqual([
      ["2026", 3],
      ["2025", 1],
    ]);
    expect(groupByPeriod(older, "all").map((g) => [g.label, g.sessions.length])).toEqual([["Total", 4]]);
  });
});
