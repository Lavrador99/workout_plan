import { describe, expect, it } from "vitest";
import { TEST_CATEGORIES } from "./assessment";
import { addWeeks, baselineOf, buildReport, reportCautions, type ReportInput } from "./report";
import { newScreening } from "./db";
import { seedExercises, seedProfiles, seedTests } from "./seed";
import { demoData } from "./seedDemo";
import type { Exercise, Focus, Screening } from "@treino/core/types";

const tests = seedTests();
const library = seedExercises().map((e) => ({ ...e, updatedAt: 1 }) as Exercise);
const demo = demoData(tests, library);
const focuses = seedProfiles(library).map((f) => ({ ...f, updatedAt: 1 }) as Focus);
const byDate = [...demo.assessments].sort((a, b) => a.date.localeCompare(b.date));
const last = byDate[byDate.length - 1];
const input = (over: Partial<ReportInput> = {}): ReportInput => ({ client: demo.client, assessment: last, assessments: demo.assessments, tests, focuses, goals: demo.goals, screenings: demo.screenings, ...over });

describe("comparison", () => {
  it("is with the previous assessment unless another one is chosen", () => {
    expect(baselineOf(demo.assessments, last)?.id).toBe(byDate[byDate.length - 2].id);
    expect(baselineOf(demo.assessments, { ...last, report: { compareWith: byDate[0].id, findings: "", priorities: [], plan: "", nextDate: null } })?.id).toBe(byDate[0].id);
  });

  it("the first assessment has nothing to compare with", () => {
    expect(baselineOf(demo.assessments, byDate[0])).toBeNull();
    const report = buildReport(input({ assessment: byDate[0] }));
    expect(report.groups.flatMap((g) => g.rows).every((r) => r.sides.every((s) => s.before == null && s.change == null))).toBe(true);
  });
});

describe("report of the latest assessment", () => {
  const report = buildReport(input());
  const rows = report.groups.flatMap((g) => g.rows);

  it("has every test with a result, grouped in the categories' order", () => {
    expect(rows.length).toBe(last.results.length);
    const order = report.groups.map((g) => (g.category ? TEST_CATEGORIES.indexOf(g.category) : Infinity));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("compares each side and shows the asymmetry", () => {
    const grip = rows.find((r) => r.testId === "seed-test-handgrip")!;
    expect(grip.sides.map((s) => [s.side, s.before, s.now])).toEqual([
      ["left", 50, 50],
      ["right", 53, 54],
    ]);
    expect(grip.asymmetry).toMatch(/direito melhor/);
  });

  it("puts the client in a published population when there is one", () => {
    const grip = rows.find((r) => r.testId === "seed-test-handgrip")!;
    expect(grip.reference?.position).toMatch(/P\d+/);
    expect(report.sources.length).toBeGreaterThan(0);
  });

  it("never compares an estimate with a reference", () => {
    expect(rows.filter((r) => r.estimated).every((r) => r.reference == null)).toBe(true);
  });

  it("lists the goals with their progress", () => {
    expect(report.goals.length).toBeGreaterThan(0);
  });
});

describe("cautions", () => {
  const screening = (over: Partial<Screening>): Screening => ({ ...newScreening("c"), id: "s", date: "2026-01-01", ...over });

  it("keep injuries and restrictions, never diagnoses, medication or answers", () => {
    const text = reportCautions(
      [
        screening({
          diseases: ["diabetes", "hypertension"],
          medication: "Bisoprolol 5 mg",
          medicationFlags: ["betablocker"],
          quick: [true, null, null, null, null, null, null, null],
          quickDetails: "Palpitações",
          decision: "fit_restricted",
          restrictions: "FC até 140.",
          injuries: [
            { id: "i", region: "Joelho", side: "left", status: "active", since: "", pain: 3, aggravates: "Saltos e agachamento profundo", followedBy: "" },
            { id: "j", region: "Ombro", side: "right", status: "recovered", since: "", pain: null, aggravates: "", followedBy: "Dr. X" },
          ],
        }),
      ],
      "2026-02-01",
    ).join(" ");
    expect(text).toBe("Restrições: FC até 140. Joelho esquerdo, lesão ativa: evitar saltos e agachamento profundo.");
    for (const word of ["diabetes", "Bisoprolol", "Hipertensão", "Palpita", "Dr. X", "Ombro"]) expect(text).not.toContain(word);
  });

  it("say when clearance is still missing, and use only intakes up to the date", () => {
    expect(reportCautions([screening({ decision: "awaiting" })], "2026-02-01")).toEqual(["Aguarda autorização médica antes de aumentar a intensidade."]);
    expect(reportCautions([screening({ decision: "awaiting" })], "2025-12-01")).toEqual([]);
    expect(reportCautions([screening({ decision: "fit" })], "2026-02-01")).toEqual([]);
  });
});

it("adds weeks across months and years", () => {
  expect(addWeeks("2026-12-20", 6)).toBe("2027-01-31");
});
