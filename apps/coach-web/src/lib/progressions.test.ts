import { describe, expect, it } from "vitest";
import { families, familyOf, likelyMeant, parseFamilies, step } from "./progressions";
import type { Exercise } from "@treino/core/types";

const ex = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise => ({ id, updatedAt: 0, name, aliases: [], tags: [], ...extra });

const lib = [
  ex("bd", "Bird Dog", { progressions: ["box", "row", "gone"] }),
  ex("box", "Bird dog em cima da caixa"),
  ex("row", "Bird dog em cima da caixa c/ peso row"),
  ex("gone", "Apagado", { deleted: true }),
  ex("rl", "Reverse Lunge", { pt: "Afundo atrás" }),
];

describe("familyOf", () => {
  it("finds the family from the base or from any level, skipping deleted ones", () => {
    expect(familyOf("bd", lib)?.chain.map((e) => e.id)).toEqual(["bd", "box", "row"]);
    expect(familyOf("row", lib)?.base.id).toBe("bd");
    expect(familyOf("rl", lib)).toBeNull();
    expect(families(lib).map((f) => f.base.name)).toEqual(["Bird Dog"]);
  });

  it("steps up and down", () => {
    const f = familyOf("box", lib)!;
    expect(step(f, "box", 1)?.id).toBe("row");
    expect(step(f, "box", -1)?.id).toBe("bd");
    expect(step(f, "row", 1)).toBeUndefined();
  });
});

describe("parseFamilies", () => {
  it("splits on blank lines, first line is the base, matches the library", () => {
    const text = "Lunge\nAfundo atrás\n  Walnking lunge\n\n\nBIRD dog\n- BIRD dog em cima da caixa\n\nSozinho";
    const fams = parseFamilies(text, lib);
    expect(fams.map((f) => f.map((l) => l.name))).toEqual([
      ["Lunge", "Afundo atrás", "Walnking lunge"],
      ["BIRD dog", "BIRD dog em cima da caixa"],
    ]);
    expect(fams[0].map((l) => l.ex?.id)).toEqual([undefined, "rl", undefined]);
    expect(fams[1].map((l) => l.ex?.id)).toEqual(["bd", "box"]);
  });
});

describe("likelyMeant", () => {
  it("catches typos, not loosely related names", () => {
    const walking = ex("wl", "Walking Lunge", { pt: "Afundo a andar" });
    const pulldown = ex("lp", "Lat Pulldown");
    expect(likelyMeant("Walnking lunge", [walking, pulldown])?.id).toBe("wl");
    expect(likelyMeant("Lunge a frente", [walking, pulldown])).toBeUndefined();
    expect(likelyMeant("Lunge", [walking])).toBeUndefined();
  });
});
