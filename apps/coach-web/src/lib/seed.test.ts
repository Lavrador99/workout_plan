import { describe, expect, it } from "vitest";
import { asymmetry, finalValue, series } from "./assessment";
import { MUSCLES, PATTERNS } from "./movement";
import { seedDays, seedExercises, seedProfiles, seedTests } from "./seed";
import { demoData } from "./seedDemo";
import type { Exercise } from "./types";
import { norm } from "./text";

describe("seed library", () => {
  const list = seedExercises();

  it("one record per exercise, each with a Portuguese name", () => {
    expect(list.length).toBeGreaterThan(150);
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
    expect(list.filter((e) => !e.pt)).toEqual([]);
  });

  it("no name or alias points at two exercises", () => {
    const seen = new Map<string, string>();
    for (const e of list)
      for (const n of [e.name, ...e.aliases]) {
        const k = norm(n);
        expect(seen.get(k) ?? e.id, `${n} in ${e.id} and ${seen.get(k)}`).toBe(e.id);
        seen.set(k, e.id);
      }
  });

  it("merges tags of exercises listed in several groups", () => {
    const sp = list.find((e) => e.name === "Side Plank w/ Elevated Leg")!;
    expect(sp.tags).toEqual(expect.arrayContaining(["glúteos", "glúteo mínimo #1", "glúteo médio #1", "glúteo máximo #3"]));
    const sorensen = list.find((e) => e.name === "Sorensen Hold")!;
    expect(sorensen.tags).toEqual(expect.arrayContaining(["core: extensão", "core: anti-flexão"]));
  });

  it("4-day templates: 6 blocks each, every exercise found in the library", () => {
    const library = list.map((e) => ({ ...e, updatedAt: 1 }) as Exercise);
    const days = seedDays(library);
    expect(days.map((d) => d.title)).toEqual(["Lower 1", "Upper 1", "Lower 2", "Upper 2"]);
    for (const d of days) {
      expect(d.blocks).toHaveLength(6);
      for (const b of d.blocks!) for (const it of b.items) expect(it.exerciseId, `${d.name}: ${it.name}`).toBeTruthy();
    }
    const power = days[0].blocks![2].items[0];
    expect(power).toMatchObject({ name: "Box Jump", note: "vertical · desc. 45s · ou Squat Jump / Pogo Hops" });
    expect(power.sets).toHaveLength(3);
    expect(days[0].blocks![4].items[0].sets[0].duration).toBe(300);
  });
});

describe("seed tests", () => {
  const list = seedTests();

  it("one record per test, with its technical sheet filled in", () => {
    expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
    for (const t of list) for (const k of ["name", "unit", "purpose", "equipment", "instructions", "validity"] as const) expect(t[k], `${t.id}: ${k}`).toBeTruthy();
  });

  it("times are better when lower, and scores are in points", () => {
    for (const t of list.filter((x) => x.unit === "s" && x.category !== "estabilidade")) expect(t.direction, t.id).toBe("lower");
    for (const t of list.filter((x) => x.scale)) expect(t.unit, t.id).toBe("pts");
  });

  it("uses only known muscles and patterns", () => {
    for (const t of list) {
      for (const m of t.muscles ?? []) expect(MUSCLES, t.id).toContain(m);
      for (const p of t.patterns ?? []) expect(PATTERNS, t.id).toContain(p);
    }
  });

  it("has the seven FMS patterns, five of them per side", () => {
    const fms = list.filter((t) => t.groups.includes("FMS"));
    expect(fms).toHaveLength(7);
    expect(fms.filter((t) => t.sided)).toHaveLength(5);
  });
});

describe("made-up client Teste", () => {
  const tests = seedTests();
  const library = seedExercises().map((e) => ({ ...e, updatedAt: 1 }) as Exercise);
  const { client, assessments, sessions } = demoData(tests, library);
  const span = (dates: string[]) => (Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / 86_400_000;

  it("is called Teste and says it is made up", () => {
    expect(client.name).toBe("Teste");
    expect(client.notes).toMatch(/fictício/);
  });

  it("has over a year of assessments and sessions", () => {
    expect(assessments.length).toBeGreaterThanOrEqual(6);
    expect(span(assessments.map((a) => a.date))).toBeGreaterThanOrEqual(365);
    expect(span(sessions.map((s) => s.date))).toBeGreaterThanOrEqual(365);
  });

  it("gives every device the same records", () => {
    expect(demoData(tests, library)).toEqual({ client, assessments, sessions });
    expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length);
    expect(new Set(assessments.flatMap((a) => a.results.map((r) => r.id))).size).toBe(assessments.flatMap((a) => a.results).length);
  });

  it("uses tests that exist, and the best trial is the value written down", () => {
    for (const a of assessments) for (const r of a.results) expect(tests.some((t) => t.id === r.testId && t.version === r.version), r.testId).toBe(true);
    const [cmj] = series(assessments, "seed-test-cmj");
    expect(cmj.both.map((p) => p.value)).toEqual([33.2, 34.5, 35.6, 32.1, 34.8, 37, 38.4]); // the invalid 39.2 does not count
    expect(finalValue(assessments[6].results.find((r) => r.testId === "seed-test-sprint-10")!)).toBe(1.81);
  });

  it("keeps the left hip abductors weaker throughout", () => {
    const [abduction] = series(assessments, "seed-test-dinamometria-abducao");
    expect(abduction.asymmetries.every((p) => p.better === "right")).toBe(true);
    expect(asymmetry(assessments[0].results.find((r) => r.sided)!)).not.toBeNull();
  });

  it("every session is linked to the library, with its sets done, and none during the injury", () => {
    for (const s of sessions) for (const it of s.blocks[0].items) {
      expect(it.exerciseId, `${s.date}: ${it.name}`).toBeTruthy();
      expect(it.sets.length).toBeGreaterThan(0);
      expect(it.sets.every((x) => x.done)).toBe(true);
    }
    expect(sessions.some((s) => s.date >= "2026-03-16" && s.date < "2026-04-13")).toBe(false);
  });

  it("targets and profile point at things that exist", () => {
    for (const id of Object.keys(client.targets!)) expect(tests.some((t) => t.id === id), id).toBe(true);
    expect(seedProfiles(library).some((f) => f.id === client.focusIds![0])).toBe(true);
  });
});
