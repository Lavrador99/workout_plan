import { describe, expect, it } from "vitest";
import { seedDays, seedExercises } from "./seed";
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
