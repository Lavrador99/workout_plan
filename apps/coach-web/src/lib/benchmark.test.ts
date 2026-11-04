import { describe, expect, it } from "vitest";
import type { VersionSeries } from "./assessment";
import { benchmark, clientContext, DATASETS, evidenceOf, fmtPosition, latestComparable, positionIn, SOURCES, type ClientContext, type ReferenceDataset } from "./benchmark";
import { seedTests } from "./seed";
import type { Client, Focus } from "./types";

const YOYO = { testId: "seed-test-yoyo-ir1", version: 1, direction: "higher" as const };
const ctx = (over: Partial<ClientContext> = {}): ClientContext => ({ sex: "male", age: 25, level: "competitivo", sports: ["Futebol"], ...over });
const labels = (o: ReturnType<typeof benchmark>) => (o.status === "ok" ? o.benchmarks.map((b) => [b.dataset.label, b.tier]) : o.status);

const dataset = (over: Partial<ReferenceDataset>): ReferenceDataset => ({
  id: "d",
  sourceId: "s",
  testId: "t",
  version: 1,
  group: "general",
  sex: "male",
  levels: [],
  label: "Grupo",
  studies: 1,
  subjects: 100,
  limitations: "",
  ...over,
});

describe("reference data", () => {
  it("every dataset points at a known source and a real test", () => {
    const tests = seedTests();
    for (const d of DATASETS) {
      expect(SOURCES.some((s) => s.id === d.sourceId), d.id).toBe(true);
      expect(tests.some((t) => t.id === d.testId && t.version === d.version), d.id).toBe(true);
    }
    expect(new Set(DATASETS.map((d) => d.id)).size).toBe(DATASETS.length);
  });

  it("matches the figures the Yo-Yo paper quotes in its text", () => {
    expect(DATASETS.find((d) => d.label === "Futebol masculino, sub-elite")).toMatchObject({ mean: 1891, sd: 466, subjects: 802, studies: 37 });
  });
});

describe("evidence", () => {
  it("follows the amount of data", () => {
    expect(evidenceOf({ studies: 37, subjects: 802 })).toBe("A");
    expect(evidenceOf({ studies: 7, subjects: 109 })).toBe("B");
    expect(evidenceOf({ studies: 2, subjects: 44 })).toBe("C");
    expect(evidenceOf({ studies: 1, subjects: 14 })).toBe("D");
  });
});

describe("position", () => {
  it("estimates from mean and SD, and says so", () => {
    const p = positionIn(dataset({ mean: 100, sd: 10 }), 100, "higher")!;
    expect(p.percentile).toBeCloseTo(50);
    expect(p.estimated).toBe(true);
    expect(positionIn(dataset({ mean: 100, sd: 10 }), 119.6, "higher")!.percentile).toBeCloseTo(97.5, 1);
  });

  it("lower times rank higher", () => {
    expect(positionIn(dataset({ mean: 2, sd: 0.1 }), 1.8, "lower")!.percentile).toBeCloseTo(97.7, 1);
  });

  it("prefers published percentiles, interpolating between them", () => {
    const p = positionIn(dataset({ mean: 1, sd: 1, percentiles: [[50, 100], [25, 80], [75, 120]] }), 110, "higher")!;
    expect(p.percentile).toBeCloseTo(62.5);
    expect(p.estimated).toBe(false);
  });

  it("does not extrapolate past the table", () => {
    const d = dataset({ percentiles: [[5, 10], [95, 90]] });
    expect(fmtPosition(positionIn(d, 5, "higher")!)).toBe("abaixo de P5");
    expect(fmtPosition(positionIn(d, 95, "higher")!)).toBe("acima de P95");
  });

  it("reads a table of times the right way round", () => {
    const d = dataset({ percentiles: [[25, 2.0], [75, 1.8]] });
    expect(positionIn(d, 1.9, "lower")!.percentile).toBeCloseTo(50);
    expect(fmtPosition(positionIn(d, 1.7, "lower")!)).toBe("acima de P75");
  });

  it("has no place on neutral tests", () => {
    expect(positionIn(dataset({ mean: 1, sd: 1 }), 1, "neutral")).toBeNull();
  });

  it("formats the extremes", () => {
    expect(fmtPosition({ percentile: 0.2, z: -3, estimated: true, beyond: null })).toBe("abaixo de P1");
    expect(fmtPosition({ percentile: 99.8, z: 3, estimated: true, beyond: null })).toBe("acima de P99");
    expect(fmtPosition({ percentile: 18.9, z: -1, estimated: true, beyond: null })).toBe("P19");
  });
});

describe("benchmark", () => {
  it("picks the same sport, sex and level, plus active people", () => {
    const o = benchmark(YOYO, 1480, ctx());
    expect(labels(o)).toEqual([
      ["Futebol masculino, sub-elite", 1],
      ["Praticantes recreativos, homens", 3],
    ]);
    if (o.status !== "ok") throw new Error();
    expect(fmtPosition(o.benchmarks[0].position)).toBe("P19");
    expect(fmtPosition(o.benchmarks[1].position)).toBe("P60");
    expect(o.benchmarks[0].evidence).toBe("A");
  });

  it("a group covering two levels counts for both", () => {
    expect(labels(benchmark(YOYO, 1000, ctx({ sex: "female", level: "elite" })))[0]).toEqual(["Futebol feminino, sub-elite e elite", 1]);
  });

  it("falls to another level of the sport, flagged as such", () => {
    expect(labels(benchmark(YOYO, 1000, ctx({ sports: ["Futsal"] })))[0]).toEqual(["Praticantes recreativos, homens", 3]);
    expect(labels(benchmark(YOYO, 1000, ctx({ sports: ["Futsal"], level: "elite" })))[0]).toEqual(["Futsal masculino, elite", 1]);
    expect(labels(benchmark(YOYO, 1000, ctx({ sports: ["Andebol"], level: "recreativo" })))[0]).toEqual(["Andebol masculino, sub-elite", 2]);
  });

  it("never uses professionals for someone who is not one", () => {
    const o = benchmark(YOYO, 1000, ctx({ sports: ["Ténis"], level: "recreativo" }));
    expect(labels(o)).toEqual([
      ["Praticantes recreativos, homens", 3],
      ["Homens inativos", 4],
    ]);
    expect(labels(benchmark(YOYO, 1000, ctx({ sex: "female", sports: ["Voleibol"], level: null })))).toEqual([["Praticantes recreativas, mulheres", 3]]);
  });

  it("with no sport, compares with active and inactive people", () => {
    expect(labels(benchmark(YOYO, 1000, ctx({ sports: [], level: null })))).toEqual([
      ["Praticantes recreativos, homens", 3],
      ["Homens inativos", 4],
    ]);
  });

  it("asks for what it needs instead of guessing", () => {
    expect(benchmark(YOYO, 1000, ctx({ sex: null }))).toEqual({ status: "missing_data", missing: ["sexo"] });
    expect(benchmark(YOYO, 1000, ctx({ sex: undefined, age: null }))).toEqual({ status: "missing_data", missing: ["sexo", "idade"] });
  });

  it("has no reference outside the age, the protocol or the test", () => {
    expect(benchmark(YOYO, 1000, ctx({ age: 14 })).status).toBe("no_compatible_reference");
    expect(benchmark({ ...YOYO, version: 2 }, 1000, ctx()).status).toBe("no_compatible_reference");
    expect(benchmark({ ...YOYO, testId: "seed-test-cmj" }, 30, ctx()).status).toBe("no_compatible_reference");
  });

  it("never compares an estimate with measured references", () => {
    expect(benchmark({ ...YOYO, strength: "estimated" }, 1000, ctx()).status).toBe("no_compatible_reference");
  });

  it("does not ask for data when there is nothing to compare with", () => {
    expect(benchmark({ ...YOYO, testId: "x" }, 1, ctx({ sex: null })).status).toBe("no_compatible_reference");
  });
});

describe("clientContext", () => {
  const client = { id: "c", updatedAt: 1, name: "A", injuries: "", notes: "", birthYear: 2001, sex: "male", level: "elite", focusIds: ["f", "p"] } as Client;
  const focus = (id: string, kind: Focus["kind"], name: string) => ({ id, updatedAt: 1, kind, name, patterns: [], muscles: [], exerciseIds: [], notes: "" }) as Focus;

  it("takes the age on the day and only the sports", () => {
    const c = clientContext(client, [focus("f", "sport", "Futebol"), focus("p", "pathology", "Lombalgia"), focus("x", "sport", "Ténis")], "2026-03-01");
    expect(c).toEqual({ sex: "male", age: 25, level: "elite", sports: ["Futebol"] });
  });

  it("has no age without a birth year", () => {
    expect(clientContext({ ...client, birthYear: null }, [], "2026-03-01").age).toBeNull();
  });
});

describe("tests measured per side", () => {
  const HANDGRIP = { testId: "seed-test-handgrip", version: 1, direction: "higher" as const, sided: true };
  const point = (date: string, value: number) => ({ date, value, assessmentId: date });
  const grip = (left: VersionSeries["left"], right: VersionSeries["right"]): VersionSeries => ({ version: 1, unit: "kg", direction: "higher", sided: true, both: [], left, right, asymmetries: [] });

  it("uses the best side of the last assessment with both", () => {
    const v = grip([point("2026-01-01", 50)], [point("2026-01-01", 54), point("2026-02-01", 60)]);
    expect(latestComparable(v)).toEqual({ date: "2026-01-01", value: 54 });
  });

  it("does not compare a single side", () => {
    expect(latestComparable(grip([], [point("2026-01-01", 54)]))).toBeNull();
  });

  it("reads the handgrip table by sex and age, as the general population", () => {
    const o = benchmark(HANDGRIP, 54, ctx());
    expect(labels(o)).toEqual([["População geral, homens 25–29 anos", 4]]);
    expect(o.status === "ok" && Math.round(o.benchmarks[0].position.percentile)).toBe(70);
    expect(o.status === "ok" && o.benchmarks[0].evidence).toBe("A");
    expect(labels(benchmark(HANDGRIP, 30, ctx({ sex: "female", age: 102 })))).toEqual([["População geral, mulheres 100+ anos", 4]]);
  });

  it("has no reference under 20 and keeps sides and no-sides apart", () => {
    expect(benchmark(HANDGRIP, 54, ctx({ age: 19 })).status).toBe("no_compatible_reference");
    expect(benchmark({ ...HANDGRIP, sided: false }, 54, ctx()).status).toBe("no_compatible_reference");
    expect(benchmark({ ...YOYO, sided: true }, 1000, ctx()).status).toBe("no_compatible_reference");
  });

  it("has a full and rising table for every age and sex", () => {
    const grips = DATASETS.filter((d) => d.testId === HANDGRIP.testId);
    expect(grips).toHaveLength(34);
    for (const d of grips) {
      const values = d.percentiles!.map(([, v]) => v);
      expect(values, d.id).toHaveLength(11);
      expect([...values].sort((a, b) => a - b), d.id).toEqual(values);
    }
  });
});
