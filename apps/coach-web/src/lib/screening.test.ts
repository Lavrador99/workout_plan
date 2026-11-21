import { describe, expect, it } from "vitest";
import { ageOf, bpStops, canTest, healthAlerts, isMinor, monthsBetween, nextScreening, screeningState, suggestedDecision } from "./screening";
import { newScreening } from "./db";
import type { Screening } from "@treino/core/types";

const s = (over: Partial<Screening> = {}): Screening => ({ ...newScreening("c1"), id: "s1", date: "2026-01-10", ...over });

describe("age", () => {
  it("is exact with a birth date, from the year otherwise", () => {
    expect(ageOf({ birthDate: "1950-11-22" }, "2026-11-21")).toBe(75);
    expect(ageOf({ birthDate: "1950-11-21" }, "2026-11-21")).toBe(76);
    expect(ageOf({ birthYear: 1950 }, "2026-11-21")).toBe(76);
    expect(ageOf({}, "2026-11-21")).toBeNull();
  });

  it("a minor is under 18", () => {
    expect(isMinor({ birthDate: "2008-12-01" }, "2026-11-21")).toBe(true);
    expect(isMinor({ birthDate: "2008-11-01" }, "2026-11-21")).toBe(false);
    expect(isMinor({}, "2026-11-21")).toBe(false);
  });
});

describe("decision", () => {
  it("suggests referral for resting pressure of 160/100 or more, or chest signs", () => {
    expect(bpStops(160, 80)).toBe(true);
    expect(bpStops(140, 100)).toBe(true);
    expect(bpStops(159, 99)).toBe(false);
    expect(suggestedDecision(s(), true)).toBe("referred");
    expect(suggestedDecision(s({ referralCriteria: ["cardiac_signs"] }), false)).toBe("referred");
  });

  it("suggests restrictions with any yes or criterion, fit otherwise", () => {
    expect(suggestedDecision(s({ quick: [false, true, null, null, null, null, null, null] }), false)).toBe("fit_restricted");
    expect(suggestedDecision(s({ referralCriteria: ["nutrition"] }), false)).toBe("fit_restricted");
    expect(suggestedDecision(s(), false)).toBe("fit");
  });

  it("only fit decisions open the tests", () => {
    expect(canTest(s({ decision: "fit" }))).toBe(true);
    expect(canTest(s({ decision: "fit_restricted" }))).toBe(true);
    expect(canTest(s({ decision: "awaiting" }))).toBe(false);
    expect(canTest(s({ decision: "referred" }))).toBe(false);
    expect(canTest(s())).toBe(false);
    expect(canTest(undefined)).toBe(false);
  });
});

describe("state of the latest intake", () => {
  it("none, open, awaiting, referred, expired and ok", () => {
    expect(screeningState(undefined, "2026-02-01")).toBe("none");
    expect(screeningState(s(), "2026-02-01")).toBe("open");
    expect(screeningState(s({ decision: "awaiting" }), "2026-02-01")).toBe("awaiting");
    expect(screeningState(s({ decision: "referred" }), "2026-02-01")).toBe("referred");
    expect(screeningState(s({ decision: "fit" }), "2027-01-09")).toBe("ok");
    expect(screeningState(s({ decision: "fit" }), "2027-01-10")).toBe("expired");
  });

  it("counts whole months", () => {
    expect(monthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(monthsBetween("2026-01-10", "2026-02-10")).toBe(1);
  });
});

it("health alerts come from pressure, medication, confidence and the answers", () => {
  const list = healthAlerts(s({ medicationFlags: ["betablocker"], medicationCount: 5, confidence: 6, quick: [true, null, null, null, null, null, null, null], restrictions: "Sem saltos" }), { sys: 165, dia: 90 });
  expect(list).toHaveLength(6);
  expect(list[0]).toMatch(/160\/100/);
  expect(list.some((a) => /perceção de esforço/.test(a))).toBe(true);
  expect(list.some((a) => /baixar a meta/.test(a))).toBe(true);
  expect(list.at(-1)).toBe("Restrições: Sem saltos");
  expect(healthAlerts(s(), null)).toEqual([]);
});

it("a new intake keeps the answers but not the decision", () => {
  const last = s({ diseases: ["diabetes"], decision: "fit_restricted", restrictions: "x", dirty: 1 });
  const next = nextScreening(last, "s2", "2026-11-20");
  expect(next).toMatchObject({ id: "s2", date: "2026-11-20", diseases: ["diabetes"], decision: null, restrictions: "", updatedAt: 0 });
  expect("dirty" in next).toBe(false);
});
