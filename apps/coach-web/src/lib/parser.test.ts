import { describe, expect, it } from "vitest";
import { parseCircuitHeader, parseImport, parseItemLine, sidesFromNote } from "./parser";
import { fmtItem, fmtSession } from "./format";
import type { Session } from "./types";

const rx = (line: string) => {
  const it = parseItemLine(line);
  return {
    name: it.name,
    sets: it.sets.map((s) => [s.reps, s.duration, s.load]),
    mode: it.loadMode,
    extraLeft: it.extraLeft,
    hold: it.holdSec,
    note: it.note,
    repsMax: it.repsMax,
    durationMax: it.durationMax,
    unit: it.repsUnit,
    rm: it.rmTest,
  };
};

describe("parseItemLine", () => {
  it("sets x reps + dual dumbbells + extra left set", () => {
    const r = rx("Step up - 3x8 2x8kg (E +1)");
    expect(r.name).toBe("Step up");
    expect(r.sets).toEqual([[8, null, 8], [8, null, 8], [8, null, 8]]);
    expect(r.mode).toBe("dual");
    expect(r.extraLeft).toBe(1);
  });

  it("isometric hold", () => {
    const r = rx("Leg extension iso 10kg 10r 10s 4s");
    expect(r.name).toBe("Leg extension iso");
    expect(r.sets).toHaveLength(4);
    expect(r.sets[0]).toEqual([10, null, 10]);
    expect(r.hold).toBe(10);
  });

  it("reps then sets written as Nr Ns", () => {
    expect(rx("Split squat 10kg 12r 3s").sets).toEqual([[12, null, 10], [12, null, 10], [12, null, 10]]);
    expect(rx("Clamshell 15r 2s").sets).toHaveLength(2);
  });

  it("added load", () => {
    const r = rx("Adutor no banco +12kg x12r 3s");
    expect(r.name).toBe("Adutor no banco");
    expect(r.mode).toBe("added");
    expect(r.sets).toEqual([[12, null, 12], [12, null, 12], [12, null, 12]]);
    expect(rx("Solear smith bipodal x12 +20kg").sets).toEqual([[12, null, 20]]);
  });

  it("time ranges and steps", () => {
    const r = rx("Side plank c/ perna elevada - 2x 20-25s (E +1)");
    expect(r.name).toBe("Side plank c/ perna elevada");
    expect(r.sets).toEqual([[null, 20, null], [null, 20, null]]);
    expect(r.durationMax).toBe(25);
    const w = rx("Lateral band walk - 2x 15 passos");
    expect(w.sets).toEqual([[15, null, null], [15, null, null]]);
    expect(w.unit).toBe("passos");
  });

  it("reps x load records", () => {
    expect(rx("Leg curl - 12x20kg").sets).toEqual([[12, null, 20]]);
    expect(rx("Gémeo(uni)- 12x10kg").name).toBe("Gémeo(uni)");
    expect(rx("Squat summo(bench) - 12*8kg").name).toBe("Squat summo(bench)");
  });

  it("pyramids", () => {
    expect(rx("Hip thrust - 12x40kg/12x40kg/11x50kg").sets).toEqual([[12, null, 40], [12, null, 40], [11, null, 50]]);
    expect(rx("Deadlift - 12x 40kg /65kg *8 / 70kg*8").sets).toEqual([[12, null, 40], [8, null, 65], [8, null, 70]]);
    expect(rx("Low row - 12x30kg | 12x36kg | 15x36kg").sets).toEqual([[12, null, 30], [12, null, 36], [15, null, 36]]);
    expect(rx("Back squat- 12*30kg / 12*40kg / 13 *50 kg").sets).toEqual([[12, null, 30], [12, null, 40], [13, null, 50]]);
    expect(rx("Ski - 2/1/0.5 min").sets).toEqual([[null, 120, null], [null, 60, null], [null, 30, null]]);
    expect(rx("Mountain climbers- 45/30/15 sec").sets).toEqual([[null, 45, null], [null, 30, null], [null, 15, null]]);
  });

  it("two loads for a combined exercise stay a note, not a pyramid", () => {
    const r = rx("Face pull + rear delt fly - 3x12 18kg / 3-4kg");
    expect(r.name).toBe("Face pull + rear delt fly");
    expect(r.sets).toHaveLength(3);
    expect(r.sets[0]).toEqual([12, null, 18]);
    expect(r.note).toContain("3-4kg");
  });

  it("tempo and RM test", () => {
    const r = rx("Pull up neutra negativas - 3x3 (4-5s)");
    expect(r.sets).toHaveLength(3);
    expect(r.note).toBe("4-5s");
    const t = rx("Supino inclinado halteres supinado - 8RM: ___");
    expect(t.name).toBe("Supino inclinado halteres supinado");
    expect(t.rm).toBe(8);
  });

  it("cadence (tempo) round-trips", () => {
    const it1 = parseItemLine("Back squat 4x6 60kg tempo 3110");
    expect(it1.tempo).toBe("3-1-1-0");
    expect(it1.sets).toHaveLength(4);
    expect(it1.note).toBe("");
    expect(fmtItem(it1)).toBe("Back squat - 4x6 60kg tempo 3-1-1-0");
    expect(parseItemLine(fmtItem(it1)).tempo).toBe("3-1-1-0");
    expect(parseItemLine("RDL 3x8 cadência 30X0").tempo).toBe("3-0-X-0");
  });

  it("names without prescription and leftover words", () => {
    expect(rx("90/90 rotação externa")).toMatchObject({ name: "90/90 rotação externa", sets: [] });
    expect(rx("Kettlebell swing x6 potentes")).toMatchObject({ sets: [[6, null, null]], note: "potentes" });
    expect(rx("Crunch c/ lançamento x4 4s").sets).toHaveLength(4);
    expect(rx("Cossack Squat - 20r + 8kg")).toMatchObject({ sets: [[20, null, 8]], mode: "added" });
    expect(rx("Back squat - 4x8 47,5kg").sets[0]).toEqual([8, null, 47.5]);
    expect(rx("Remada baixa uni polia - 3x10 12-15kg").sets[0]).toEqual([10, null, 12]);
  });
});

describe("parseCircuitHeader", () => {
  it("reads the common forms", () => {
    expect(parseCircuitHeader('**40”/20” x3 | 1:30 rest**')).toMatchObject({ work: 40, rest: 20, rounds: 3, roundRest: 90 });
    expect(parseCircuitHeader("30”/30”")).toMatchObject({ work: 30, rest: 30 });
    expect(parseCircuitHeader("Circuito 30/30")).toMatchObject({ work: 30, rest: 30 });
    expect(parseCircuitHeader("20min - 40s / 20s")).toMatchObject({ work: 40, rest: 20, title: "20 min" });
    expect(parseCircuitHeader("90/90 rotação externa")).toBeNull();
  });
});

const CATIA = `
**30/10/2026**
**Fullbody**

Flexibilidade e mobilidade
Adductor side bend
Heel sit thread the needle

Step up - 3x8 2x8kg (E +1)
(Heel touches)
Bottoms up KB press meio ajoelhado - 3x8 6kg
(Dead bug calcanhares no chão)

**40”/20” x3 | 1:30 rest**
Dumbbell devil press
Wall ball

——————————————————————
**26/10/2026**
**Inferiores**

Back squat - 4x8 47,5kg
(Russian twist, side bends)

Mesociclo FrontSquat
`;

describe("parseImport", () => {
  it("splits sessions and blocks", () => {
    const s = parseImport(CATIA);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ date: "2026-10-30", title: "Fullbody" });
    expect(s[0].blocks.map((b) => b.kind)).toEqual(["list", "sets", "circuit"]);
    expect(s[0].blocks[0].title).toBe("Flexibilidade e mobilidade");
    expect(s[0].blocks[1].items.map((i) => i.role)).toEqual(["main", "filler", "main", "filler"]);
    expect(s[1].blocks[0].items.map((i) => i.name)).toEqual(["Back squat", "Russian twist", "side bends"]);
  });

  it("splits a mobility list from the prescribed work in the same group", () => {
    const s = parseImport(`Filipa\n\n26/10/2026\n\nFlexibilidade e mobilidade\nBird dog\nPallof press\nHip hike x12\nGoblet squat +10kg x12 3s`)[1];
    expect(s.date).toBe("2026-10-26");
    expect(s.blocks.map((b) => [b.kind, b.items.length])).toEqual([["list", 2], ["sets", 2]]);
  });

  it("titles across lines", () => {
    const [s] = parseImport(`Mesociclo FrontSquat\nSemana 3\n[Goblet Squat - 20kg - 15r]`);
    expect(s.title).toBe("Mesociclo FrontSquat – Semana 3");
    expect(s.blocks[0].items[0]).toMatchObject({ name: "Goblet Squat" });
    expect(s.blocks[0].items[0].sets[0]).toMatchObject({ reps: 15, load: 20 });
  });
});

describe("format round trip", () => {
  const cases = [
    "Step up - 3x8 2x8kg (E +1)",
    "Back squat - 4x8 47,5kg",
    "Side plank c/ perna elevada - 2x 20-25s (E +1)",
    "Hip thrust - 12x40kg / 12x40kg / 11x50kg",
    "Solear smith - x12 +20kg",
    "Lateral band walk - 2x15 passos",
    "Supino inclinado - 8RM: ___",
    "Bird dog",
  ];
  for (const c of cases) {
    it(c, () => {
      const once = fmtItem(parseItemLine(c));
      expect(fmtItem(parseItemLine(once))).toBe(once);
      expect(once).toBe(c);
    });
  }

  it("session", () => {
    const [p] = parseImport(CATIA);
    const s: Session = { id: "x", updatedAt: 0, clientId: "c", date: p.date!, title: p.title, notes: "", blocks: p.blocks };
    const txt = fmtSession(s);
    expect(txt).toContain("**30/10/2026**\n**Fullbody**");
    expect(txt).toContain('**40"/20" x3 | 1:30 rest**');
    expect(txt).toContain("(Heel touches)");
  });
});

describe("extra sets on one side", () => {
  it("reads E +n and D +n", () => {
    const r = parseItemLine("Hip thrust 3x10 D+1");
    expect(r.name).toBe("Hip thrust");
    expect(r.extraRight).toBe(1);
    expect(r.extraLeft).toBeUndefined();
    expect(r.note).toBe("");
    expect(parseItemLine("Nordic 3x5 (D +2) (E +1)")).toMatchObject({ extraRight: 2, extraLeft: 1 });
  });

  it("moves D +n left in a note by older versions", () => {
    const old = { ...parseItemLine("Hip thrust 3x10"), note: "D+1 lento" };
    expect(sidesFromNote(old)).toMatchObject({ extraRight: 1, note: "lento" });
    expect(sidesFromNote({ ...old, note: "lento" })).toBeNull();
    // already set: the note stays as it is
    expect(sidesFromNote({ ...old, extraRight: 2 })).toBeNull();
  });
});
