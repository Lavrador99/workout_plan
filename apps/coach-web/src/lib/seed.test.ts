import { describe, expect, it } from "vitest";
import { seedExercises } from "./seed";
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
});
