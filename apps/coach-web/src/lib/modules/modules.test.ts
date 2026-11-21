import { describe, expect, it } from "vitest";
import { evaluate, hits, strengthBalanceReasons, suggestedModules, suggestedPriorities } from "./index";
import { STRENGTH_BALANCE, fallsItem } from "./strengthBalance";
import { newScreening } from "../db";
import { seedTests } from "../seed";
import { moduleDemos } from "../seedModuleDemo";
import type { Client, Light, Screening } from "@treino/core/types";

const tests = seedTests();
const demos = moduleDemos(tests);
const run = (id: string) => {
  const d = demos.find((x) => x.client.id === id)!;
  return evaluate(STRENGTH_BALANCE, d.assessment, { client: d.client, tests, focuses: [] });
};
const lights = (id: string): Record<string, Light | null> => Object.fromEntries(run(id).areas.map((a) => [a.id, a.light]));

describe("the four cases", () => {
  it("healthy: every area green", () => {
    expect(lights("seed-fe-ana")).toEqual({ balance: "green", legs: "green", arms: "green", gait: "green", mobility: "green", endurance: "green", daily: "green" });
    expect(run("seed-fe-ana").risks).toEqual([]);
  });

  it("balance and legs: balance red, legs, gait, endurance and daily life yellow", () => {
    expect(lights("seed-fe-manuel")).toEqual({ balance: "red", legs: "yellow", arms: "yellow", gait: "yellow", mobility: "green", endurance: "yellow", daily: "yellow" });
  });

  it("endurance and mobility: those red, legs and balance green", () => {
    expect(lights("seed-fe-rosa")).toEqual({ balance: "green", legs: "green", arms: "yellow", gait: "green", mobility: "red", endurance: "red", daily: "yellow" });
  });

  it("handgrip reads the general population even above the form's cut", () => {
    const grip = run("seed-fe-rosa").rows.find((r) => r.key === "seed-test-handgrip")!;
    expect(grip.light).toBe("yellow");
    expect(grip.detail).toMatch(/^P\d+ \(melhor lado\) · P50 [\d,]+$/);
  });

  it("all altered: every area red, the risk zone and the SARC-F alert for the coach", () => {
    expect(Object.values(lights("seed-fe-joaquim")).every((l) => l === "red")).toBe(true);
    const e = run("seed-fe-joaquim");
    expect(e.risks).toHaveLength(5);
    expect(e.notes.some((n) => /SARC-F.*8.*prioridade de força/.test(n))).toBe(true);
  });
});

describe("rows", () => {
  it("place a result against the reference of the client's age and sex", () => {
    const ug = run("seed-fe-rosa").rows.find((r) => r.key === "seed-test-8ft-up-go")!;
    expect(ug.detail).toMatch(/^P\d+ · P25 7,1 · P50 6 · P75 4,9$/);
    expect(ug.light).toBe("green");
  });

  it("use the best side against the reference, the worst one for the balance cut", () => {
    const manuel = run("seed-fe-manuel").rows;
    expect(manuel.find((r) => r.key === "seed-test-chair-sit-reach")!.detail).toMatch(/melhor lado/);
    expect(manuel.find((r) => r.key === "seed-test-unipodal-30")!.light).toBe("red");
  });

  it("read gait speed from the 4 m time: 5 s or more is 0,8 m/s or less", () => {
    expect(run("seed-fe-joaquim").rows.find((r) => r.key === "seed-test-gait-4m")!.light).toBe("red");
    expect(hits({ when: "at_least", value: 5, text: "" }, 5, false)).toBe(true);
  });

  it("apply the women's value of a cut", () => {
    const cut = { when: "below" as const, value: 27, female: 16, text: "" };
    expect(hits(cut, 20, true)).toBe(false);
    expect(hits(cut, 20, false)).toBe(true);
  });

  it("let the coach's colour override the calculated one", () => {
    const d = demos.find((x) => x.client.id === "seed-fe-rosa")!;
    const e = evaluate(STRENGTH_BALANCE, { ...d.assessment, report: { ...d.assessment.report!, areaOverrides: { mobility: "yellow" } } }, { client: d.client, tests, focuses: [] });
    const mobility = e.areas.find((a) => a.id === "mobility")!;
    expect(mobility).toMatchObject({ light: "yellow", calculated: "red", overridden: true });
  });
});

it("suggests priorities red first, in the module's order, at most three", () => {
  expect(suggestedPriorities(STRENGTH_BALANCE, run("seed-fe-manuel").areas).map((a) => a.id)).toEqual(["balance", "gait", "legs"]);
  expect(suggestedPriorities(STRENGTH_BALANCE, run("seed-fe-ana").areas)).toEqual([]);
});

it("the falls item of the SARC-F comes from the number of falls", () => {
  expect([0, 1, 3, 4, null].map(fallsItem)).toEqual([0, 1, 1, 2, null]);
});

describe("modules suggested", () => {
  const client = (over: Partial<Client> = {}): Client => ({ id: "c", updatedAt: 0, name: "X", injuries: "", notes: "", ...over });
  const s = (over: Partial<Screening> = {}): Screening => ({ ...newScreening("c"), ...over });

  it("Força e Equilíbrio by function, not only by age", () => {
    expect(strengthBalanceReasons(client({ birthDate: "1956-01-01" }), s(), "2026-11-21")).toEqual(["65 anos ou mais"]);
    expect(strengthBalanceReasons(client({ birthDate: "1981-01-01" }), s({ fallOrFear: true, risesWithoutHands: false }), "2026-11-21")).toHaveLength(2);
    expect(strengthBalanceReasons(client({ birthDate: "1981-01-01" }), s(), "2026-11-21")).toEqual([]);
  });

  it("motor development for minors, health and performance when nothing else, clinical with a disease", () => {
    expect(suggestedModules(client({ birthDate: "2012-01-01" }), s(), "2026-11-21")).toEqual(["motor_development"]);
    expect(suggestedModules(client({ birthDate: "1990-01-01" }), s(), "2026-11-21")).toEqual(["health_performance"]);
    expect(suggestedModules(client({ birthDate: "1950-01-01" }), s({ diseases: ["diabetes"] }), "2026-11-21")).toEqual(["strength_balance", "clinical"]);
  });
});
