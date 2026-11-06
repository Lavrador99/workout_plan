import { adherence } from "./balance";
import { calculate } from "./ipi";
import { describe, expect, it } from "vitest";
import { asymmetry, finalValue, series } from "./assessment";
import { MUSCLES, PATTERNS } from "./movement";
import { MEASUREMENT_ERRORS, withMeasurementError } from "./references/measurementError";
import { seedDays, seedExercises, seedProfiles, seedTests } from "./seed";
import { demoData, fillMissing } from "./seedDemo";
import type { Exercise, Focus, Client } from "./types";
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

  it("keeps measured and estimated strength apart", () => {
    const strength = list.filter((t) => t.strength);
    expect(strength.filter((t) => t.strength === "direct")).toHaveLength(4);
    expect(strength.filter((t) => t.strength === "estimated")).toHaveLength(5);
    for (const t of strength) {
      expect(t.unit, t.id).toBe("kg");
      expect(t.direction, t.id).toBe("higher");
      expect(t.groups, t.id).toEqual([t.strength === "direct" ? "1RM" : "e1RM"]);
    }
  });

  it("sprints know their distance", () => {
    expect(list.filter((t) => t.distanceM).map((t) => t.distanceM)).toEqual([5, 10, 20]);
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
  const { client, assessments, sessions, goals } = demoData(tests, library);
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
    expect(demoData(tests, library)).toEqual({ client, assessments, sessions, goals });
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
    for (const s of sessions.filter((x) => x.activity !== "cardio")) for (const it of s.blocks[0].items) {
      expect(it.exerciseId, `${s.date}: ${it.name}`).toBeTruthy();
      expect(it.sets.length).toBeGreaterThan(0);
    }
    expect(sessions.filter((x) => x.activity === "treino").every((s) => s.blocks[0].items.every((it) => it.sets.every((x) => x.done)))).toBe(true);
    expect(sessions.some((s) => s.date >= "2026-03-16" && s.date < "2026-04-13")).toBe(false);
  });

  it("has measured and estimated strength, kept apart", () => {
    expect(series(assessments, "seed-test-1rm-agachamento")[0].both.map((p) => p.value)).toEqual([100, 110, 105, 120]);
    expect(series(assessments, "seed-test-e1rm-supino")[0].both[0].value).toBeCloseTo(70);
    expect(series(assessments, "seed-test-e1rm-bulgaro")[0].left).toHaveLength(7);
  });

  it("targets and profile point at things that exist", () => {
    for (const g of goals.filter((x) => x.testId)) expect(tests.some((t) => t.id === g.testId), g.testId as string).toBe(true);
    expect(seedProfiles(library).some((f) => f.id === client.focusIds![0])).toBe(true);
  });
});

describe("Teste shows everything the app reads", () => {
  const tests = seedTests();
  const library = seedExercises().map((e) => ({ ...e, updatedAt: 1 }) as Exercise);
  const { client, assessments, sessions, goals } = demoData(tests, library);
  const input = { client, assessments, sessions, goals, tests, focuses: seedProfiles(library).map((f) => ({ ...f, updatedAt: 1 }) as Focus) };

  it("has every base test", () => {
    const done = new Set(assessments.flatMap((a) => a.results.map((r) => r.testId)));
    expect(tests.filter((t) => !done.has(t.id)).map((t) => t.id)).toEqual([]);
    for (const a of assessments) for (const r of a.results) expect(r.sided ? finalValue(r, "left") != null && finalValue(r, "right") != null : finalValue(r) != null, r.testId).toBe(true);
  });

  it("gives ordinal tests whole scores inside their scale", () => {
    for (const r of assessments.flatMap((a) => a.results).filter((x) => x.scale)) for (const t of r.trials) {
      expect(Number.isInteger(t.value), r.testId).toBe(true);
      expect(t.value as number, r.testId).toBeGreaterThanOrEqual(r.scale!.min);
      expect(t.value as number, r.testId).toBeLessThanOrEqual(r.scale!.max);
    }
  });

  it("has each kind of goal and state", () => {
    expect(goals.some((g) => g.testId)).toBe(true);
    expect(goals.some((g) => g.unit)).toBe(true);
    expect(goals.some((g) => !g.testId && !g.unit)).toBe(true);
    expect(new Set(goals.map((g) => g.status))).toEqual(new Set(["active", "achieved", "dropped"]));
    expect(new Set(goals.map((g) => g.importance))).toEqual(new Set([1, 2, 3]));
    expect(goals.some((g) => g.status === "active" && g.dueDate && g.dueDate < "2026-11-06")).toBe(true);
    expect(new Set(goals.map((g) => g.id)).size).toBe(goals.length);
  });

  it("has sessions that count and sessions that do not", () => {
    expect(new Set(sessions.map((s) => s.activity))).toEqual(new Set(["treino", "mobilidade", "cardio", "avaliacao", "outro"]));
    expect(sessions.some((s) => s.noAdherence)).toBe(true);
    const a = adherence(sessions, assessments, client, { from: "2026-09-07", to: "2026-11-05" });
    expect(a).toMatchObject({ source: "plan", unticked: 2 });
    expect(a.done).toBeLessThan(a.expected as number); // the two missed ones
    expect(a.pct).toBeGreaterThan(85);
    expect(adherence(sessions, assessments, client, { from: "2026-03-20", to: "2026-04-10" }).expected).toBeNull(); // the injury is a planned break
    expect(new Set(sessions.map((s) => s.id)).size).toBe(sessions.length);
  });

  it("gives an index with all dimensions, the injury included", () => {
    const last = calculate(input, "2026-11-02");
    expect(last.coverage).toBe(100);
    expect(last.dimensions.every((d) => d.score != null)).toBe(true);
    expect(last.iaSource).toBe("plan");
    expect(last.iccTests).toBeGreaterThan(0);
    expect(last.provisional).toBe(true); // some tests have no known error
    const [before, injured] = [calculate(input, "2026-02-16"), calculate(input, "2026-04-20")];
    expect(injured.ipi as number).toBeLessThan(before.ipi as number);
    expect(last.ipi as number).toBeGreaterThan(before.ipi as number);
  });

  it("keeps what the coach changed when it fills in the rest", () => {
    const cur = { id: "c", updatedAt: 5, name: "Mudado", injuries: "", notes: "x" } as Client;
    expect(fillMissing(cur, { ...cur, name: "Teste", injuries: "Entorse", notes: "y", primaryGoal: "desporto" })).toEqual({ ...cur, injuries: "Entorse", primaryGoal: "desporto" });
  });
});

describe("measurement errors", () => {
  const seeded = seedTests();

  it("belong to tests that exist and always say where they come from", () => {
    for (const [id, e] of Object.entries(MEASUREMENT_ERRORS)) {
      expect(seeded.find((t) => t.id === id)?.sem, id).toBe(e.sem);
      expect(e.sem, id).toBeGreaterThan(0);
      expect(e.semSource.length, id).toBeGreaterThan(20);
    }
  });

  it("stay out of tests with no checked source", () => {
    expect(seeded.filter((t) => t.sem != null)).toHaveLength(Object.keys(MEASUREMENT_ERRORS).length);
    expect(seeded.find((t) => t.id === "seed-test-1rm-agachamento")?.sem).toBeUndefined();
  });

  it("reach a test already here, without touching the coach's own or a changed protocol", () => {
    const t = seeded.find((x) => x.id === "seed-test-handgrip")!;
    const { sem: _s, semSource: _o, ...cur } = t;
    expect(withMeasurementError(cur, t)).toMatchObject({ sem: 1.8 });
    expect(withMeasurementError({ ...cur, sem: 2.5 }, t)).toBeNull();
    expect(withMeasurementError({ ...cur, version: 2 }, t)).toBeNull();
    expect(withMeasurementError({ ...cur, deleted: true }, t)).toBeNull();
    const none = seeded.find((x) => x.id === "seed-test-cooper")!;
    expect(withMeasurementError(none, none)).toBeNull();
  });
});
