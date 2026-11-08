import { describe, expect, it } from "vitest";
import { fmtItem, fmtRx } from "@treino/core/format";
import { suggest } from "./history";
import { fmtPace, fmtRunTotal, fmtSegment, fmtZone, newSegment, parsePace, zoneName, zoneRange } from "@treino/core/run";
import type { Item, RunZone, SetRow } from "@treino/core/types";

const hr = (zone: RunZone["zone"]): RunZone => ({ kind: "hr", zone });
const pace = (zone: RunZone["zone"]): RunZone => ({ kind: "pace", zone });
const run = (sets: SetRow[]): Item => ({ id: "i", name: "Corrida", role: "main", repsUnit: "m", loadMode: "abs", note: "", run: true, sets });

describe("zones", () => {
  it("names them", () => {
    expect(fmtZone(hr(2))).toBe("FC Z2");
    expect(fmtZone(pace(4))).toBe("Ritmo Z4");
    expect(zoneName(hr(5))).toBe("VO2máx");
    expect(zoneName(pace(1))).toBe("Regenerativo");
  });

  it("gives heart rate as a % of the maximum, or of the reserve with a resting rate", () => {
    expect(zoneRange(hr(2), { hrMax: 200 })).toBe("120–140 bpm");
    expect(zoneRange(hr(2), { hrMax: 192, hrRest: 54 })).toBe("137–151 bpm");
  });

  it("gives pace from the threshold, open at both ends", () => {
    const c = { thresholdPace: 270 };
    expect(zoneRange(pace(1), c)).toBe("mais lento que 5:48/km");
    expect(zoneRange(pace(2), c)).toBe("5:08–5:48/km");
    expect(zoneRange(pace(4), c)).toBe("4:27–4:44/km");
    expect(zoneRange(pace(5), c)).toBe("mais rápido que 4:27/km");
  });

  it("says nothing without the value it depends on", () => {
    expect(zoneRange(hr(2), {})).toBeNull();
    expect(zoneRange(pace(2), { hrMax: 190 })).toBeNull();
    expect(zoneRange(hr(2), null)).toBeNull();
  });
});

describe("pace", () => {
  it("reads and writes minutes:seconds", () => {
    expect(fmtPace(270)).toBe("4:30");
    expect(fmtPace(305)).toBe("5:05");
    expect(parsePace("4:30")).toBe(270);
    expect(parsePace(" 5:05 ")).toBe(305);
  });

  it("refuses what is not a pace", () => {
    for (const t of ["", "4", "4:7", "4:75", "abc"]) expect(parsePace(t), t).toBeNull();
  });
});

describe("segments", () => {
  const warm: SetRow = { reps: 1500, duration: null, zone: hr(2) };
  const hard: SetRow = { reps: null, duration: 600, zone: pace(4) };
  const free: SetRow = { reps: 1000, duration: null, zone: null };

  it("are written by distance or time, with their goal", () => {
    expect(fmtSegment(warm)).toBe("1,5km · FC Z2");
    expect(fmtSegment(hard)).toBe("10min · Ritmo Z4");
    expect(fmtSegment(free)).toBe("1km");
  });

  it("add up apart", () => {
    expect(fmtRunTotal(run([warm, hard, free]))).toBe("2,5km + 10min");
    expect(fmtRunTotal(run([warm]))).toBe("1,5km");
  });

  it("read as text one by one", () => {
    expect(fmtRx(run([warm, hard, free]))).toBe("1,5km FC Z2 / 10min Ritmo Z4 / 1km");
    expect(fmtItem(run([warm, hard]))).toBe("Corrida - 1,5km FC Z2 / 10min Ritmo Z4");
  });

  it("say so when they repeat, without losing the goal", () => {
    expect(fmtRx(run([{ ...warm }, { ...warm }, { ...warm }]))).toBe("3x1,5km FC Z2");
  });

  it("start with a kilometre at an easy heart rate", () => {
    expect(newSegment()).toMatchObject({ reps: 1000, duration: null, done: false, zone: hr(2) });
  });

  it("get no automatic progression", () => {
    expect(suggest({ date: "2026-01-01", sessionId: "s", item: run([{ ...hard, done: true }]) } as Parameters<typeof suggest>[0])).toBeNull();
  });

  it("leave other items as they were", () => {
    const sled: Item = { ...run([{ reps: 20 }, { reps: 20 }]), name: "Sled", run: undefined };
    expect(fmtRx(sled)).toBe("2x20m");
  });
});
