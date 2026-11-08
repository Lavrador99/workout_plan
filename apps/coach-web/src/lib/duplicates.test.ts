import { describe, expect, it } from "vitest";
import { findDuplicates, nameSimilarity } from "./duplicates";
import { inferMuscles, missingInfo } from "./movement";
import { seedExercises } from "./seed";
import type { Exercise } from "@treino/core/types";

const ex = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise => ({ id, updatedAt: 0, name, aliases: [], tags: [], ...extra });

describe("duplicates", () => {
  it("finds the same name written differently", () => {
    expect(nameSimilarity("Back Squat", "back squat")).toBe(1);
    expect(nameSimilarity("Squat, Back", "Back squats")).toBe(1);
    expect(nameSimilarity("Pull-up", "Pullups")).toBe(1);
    expect(nameSimilarity("Romanian deadlif", "Romanian Deadlift")).toBe(0.9);
    expect(nameSimilarity("Low Box Jump", "High Box Jump")).toBe(0);
    expect(nameSimilarity("Agachamento búlgaro", "Agachamento bulgaro c/ halteres")).toBeLessThan(0.8);
    expect(nameSimilarity("Front Squat", "Back Squat")).toBeLessThan(0.8);
    expect(nameSimilarity("Hip hike", "Hip hinge")).toBeLessThan(0.8);
    expect(nameSimilarity("Remada em A", "Remada")).toBe(0);
  });

  it("pairs exercises by any of their names and skips pairs marked distinct", () => {
    const a = ex("a", "Romanian Deadlift", { aliases: ["RDL"] });
    const b = ex("b", "Rdl");
    const c = ex("c", "Peso morto romeno");
    const d = ex("d", "Peso Morto Romeno", { distinct: ["c"] });
    const pairs = findDuplicates([a, b, c, d]);
    expect(pairs.map((p) => [p.a.id, p.b.id])).toEqual([["a", "b"]]);
  });

  it("finds no pairs in the base library (variations are not duplicates)", () => {
    const lib = seedExercises().map((s, i) => ({ ...s, id: String(i), updatedAt: 0 }));
    expect(findDuplicates(lib)).toEqual([]);
  });
});

describe("muscles", () => {
  it("guesses from tags, then from patterns", () => {
    expect(inferMuscles(ex("x", "Hip Hike", { tags: ["glúteo médio #2"] }))).toEqual(["glúteo médio"]);
    expect(inferMuscles(ex("x", "Back Squat"))).toEqual(["glúteo máximo", "quadríceps"]);
  });

  it("flags exercises without patterns or muscles", () => {
    expect(missingInfo(ex("x", "Turkish get-up"))).toEqual(["padrão", "músculos"]);
    expect(missingInfo(ex("x", "Turkish get-up", { muscles: ["corpo inteiro"] }))).toEqual(["padrão"]);
    expect(missingInfo(ex("x", "Back Squat"))).toEqual([]);
  });
});
