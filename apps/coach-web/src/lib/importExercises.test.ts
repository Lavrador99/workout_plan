import { describe, expect, it } from "vitest";
import { exercisesCsv } from "./exportExercises";
import { parseCsv, planImport } from "./importExercises";
import type { Exercise } from "@treino/core/types";

const ex = (over: Partial<Exercise> = {}): Exercise => ({ id: "e1", updatedAt: 0, name: "Bulgarian split squat", aliases: [], tags: [], ...over });

describe("exercise CSV", () => {
  it("reads quoted cells, ; or , and a BOM", () => {
    expect(parseCsv('﻿id;Nome\r\ne1;"Agachamento; búlgaro"\r\n')).toEqual([["id", "Nome"], ["e1", "Agachamento; búlgaro"]]);
    expect(parseCsv("id,Nome\ne1,Prancha\n")).toEqual([["id", "Nome"], ["e1", "Prancha"]]);
  });

  it("goes out and comes back the same: nothing to change", () => {
    const list = [ex({ patterns: ["afundo / unilateral"], muscles: ["quadríceps", "glúteo máximo"], primaryMuscles: ["quadríceps"] })];
    expect(planImport(list, exercisesCsv(list, new Map())).changes).toEqual([]);
  });

  it("a translated name keeps the old one as an alias; the classification is set; unknown names are left out", () => {
    const csv = "id;Nome;Sinónimos;Padrão principal;Outros padrões;Músculos principais;Músculos secundários\ne1;Agachamento búlgaro;;afundo / unilateral;;quadríceps, glúteo máximo, banana;adutores\nnope;X;;;;;\n";
    const plan = planImport([ex()], csv);
    expect(plan.notFound).toBe(1);
    expect(plan.unknown).toEqual(["banana"]);
    expect(plan.changes[0]).toMatchObject({
      name: "Agachamento búlgaro",
      aliases: ["Bulgarian split squat"],
      patterns: ["afundo / unilateral"],
      primaryPattern: "afundo / unilateral",
      muscles: ["quadríceps", "glúteo máximo", "adutores"],
      primaryMuscles: ["quadríceps", "glúteo máximo"],
    });
  });

  it("never removes: empty cells leave what is there", () => {
    const list = [ex({ name: "Prancha", aliases: ["Plank"], patterns: ["anti-extensão"], muscles: ["reto do abdómen"] })];
    expect(planImport(list, "id;Nome;Padrão principal;Músculos principais\ne1;;;\n").changes).toEqual([]);
  });
});
