import { describe, expect, it } from "vitest";
import { cautions, clearanceNeeded, clearancePending, isMinor, monthsBetween, nextScreening, outcome, screeningState } from "./screening";
import { newScreening } from "./db";
import type { Screening } from "@treino/core/types";

const s = (over: Partial<Screening> = {}): Screening => ({ ...newScreening("c1"), id: "s1", date: "2026-01-10", ...over });

describe("ACSM outcome", () => {
  it("waits for the regular exercise answer", () => {
    expect(outcome(s())).toBeNull();
  });

  it.each([
    [false, [], [], "start"],
    [false, ["metabolic"], [], "clearance"],
    [false, [], ["chest"], "clearance"],
    [false, ["renal"], ["edema"], "clearance"],
    [true, [], [], "continue"],
    [true, ["cardiovascular"], [], "vigorous"],
    [true, [], ["dizziness"], "stop"],
    [true, ["metabolic"], ["breath"], "stop"],
  ] as const)("exercising %s, diseases %j, symptoms %j → %s", (regularExercise, diseases, symptoms, expected) => {
    expect(outcome(s({ regularExercise, diseases: [...diseases], symptoms: [...symptoms] }))).toBe(expected);
  });
});

describe("medical clearance", () => {
  it("is needed before starting with disease or symptoms, and to stop with symptoms", () => {
    expect(clearanceNeeded(s({ regularExercise: false, diseases: ["metabolic"] }))).toBe(true);
    expect(clearanceNeeded(s({ regularExercise: true, symptoms: ["chest"] }))).toBe(true);
    expect(clearanceNeeded(s({ regularExercise: false }))).toBe(false);
    expect(clearanceNeeded(s({ regularExercise: true }))).toBe(false);
  });

  it("with known disease and exercising, only for vigorous (or not yet said)", () => {
    const base = { regularExercise: true, diseases: ["cardiovascular" as const] };
    expect(clearanceNeeded(s({ ...base, wantedIntensity: "moderate" }))).toBe(false);
    expect(clearanceNeeded(s({ ...base, wantedIntensity: "light" }))).toBe(false);
    expect(clearanceNeeded(s({ ...base, wantedIntensity: "vigorous" }))).toBe(true);
    expect(clearanceNeeded(s({ ...base, wantedIntensity: null }))).toBe(true);
  });

  it("stops being pending once recorded", () => {
    const needs = s({ regularExercise: false, symptoms: ["palpitations"] });
    expect(clearancePending(needs)).toBe(true);
    expect(clearancePending({ ...needs, clearance: { date: "2026-01-20", by: "Dr. X", restrictions: "" } })).toBe(false);
  });
});

describe("state of the latest screening", () => {
  it("none, incomplete, pending, expired and ok", () => {
    expect(screeningState(undefined, "2026-02-01")).toBe("none");
    expect(screeningState(s(), "2026-02-01")).toBe("incomplete");
    expect(screeningState(s({ regularExercise: false, diseases: ["renal"] }), "2026-02-01")).toBe("pending");
    expect(screeningState(s({ regularExercise: true }), "2027-01-09")).toBe("ok");
    expect(screeningState(s({ regularExercise: true }), "2027-01-10")).toBe("expired");
  });

  it("counts whole months", () => {
    expect(monthsBetween("2026-01-31", "2026-02-28")).toBe(0);
    expect(monthsBetween("2026-01-10", "2026-02-10")).toBe(1);
  });
});

it("a minor is under 18 by birth year", () => {
  expect(isMinor({ birthYear: 2010 }, "2026-11-20")).toBe(true);
  expect(isMinor({ birthYear: 2008 }, "2026-11-20")).toBe(false);
  expect(isMinor({ birthYear: null }, "2026-11-20")).toBe(false);
});

it("cautions come from medication, injuries still there and pregnancy", () => {
  const list = cautions(
    s({
      medications: [{ name: "Bisoprolol", flags: ["betablocker"] }],
      injuries: [
        { id: "i1", region: "Joelho", side: "left", status: "active", since: "", pain: 4, aggravates: "", followedBy: "" },
        { id: "i2", region: "Ombro", side: "right", status: "recovered", since: "", pain: null, aggravates: "", followedBy: "" },
      ],
      pregnancy: { weeks: 20, obstetricianOk: false },
    }),
  );
  expect(list).toHaveLength(3);
  expect(list[0]).toMatch(/PSE/);
  expect(list[1]).toMatch(/obstetra/);
  expect(list[2]).toBe("Lesão ativa: Joelho esquerdo, dor 4/10.");
});

it("a new screening keeps the answers but not the clearance", () => {
  const last = s({ regularExercise: false, diseases: ["metabolic"], clearance: { date: "2026-01-20", by: "Dr. X", restrictions: "" }, dirty: 1 });
  const next = nextScreening(last, "s2", "2026-11-20");
  expect(next).toMatchObject({ id: "s2", date: "2026-11-20", diseases: ["metabolic"], clearance: null, updatedAt: 0 });
  expect("dirty" in next).toBe(false);
});
