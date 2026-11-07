import { describe, expect, it } from "vitest";
import { addDays, agendaFor, isInactive, lastDoneByClient, nextTraining, weekOf, weekdayOf } from "./agenda";
import type { Client, Session } from "./types";

const client = (over: Partial<Client> = {}): Client => ({ id: "c", updatedAt: 0, name: "Ana", injuries: "", notes: "", ...over });
const session = (over: Partial<Session> = {}): Session => ({ id: "s", updatedAt: 0, clientId: "c", date: "2026-11-09", title: "", notes: "", blocks: [], ...over });

// 2026-11-09 is a Monday
const mondays = [{ from: "2026-01-01", days: [0] }];

describe("dates", () => {
  it("crosses months and weeks", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(weekdayOf("2026-11-09")).toBe(0);
    expect(weekdayOf("2026-11-15")).toBe(6);
    expect(weekOf("2026-11-15")[0]).toBe("2026-11-09");
    expect(weekOf("2026-11-09")[6]).toBe("2026-11-15");
  });
});

describe("agendaFor", () => {
  it("expects clients on their planned days only", () => {
    const c = client({ schedule: mondays });
    expect(agendaFor([c], [], "2026-11-09").map((e) => e.status)).toEqual(["planned"]);
    expect(agendaFor([c], [], "2026-11-10")).toEqual([]);
  });

  it("shows one entry per session, not the plan as well", () => {
    const c = client({ schedule: mondays });
    expect(agendaFor([c], [session()], "2026-11-09").map((e) => e.status)).toEqual(["prepared"]);
    expect(agendaFor([c], [session({ startedAt: 1 })], "2026-11-09").map((e) => e.status)).toEqual(["live"]);
    expect(agendaFor([c], [session({ endedAt: 1 })], "2026-11-09").map((e) => e.status)).toEqual(["done"]);
  });

  it("an absence replaces the plan and an unstarted session, never a finished one", () => {
    const c = client({ schedule: mondays, absences: [{ date: "2026-11-09", kind: "missed" }] });
    expect(agendaFor([c], [], "2026-11-09").map((e) => e.status)).toEqual(["missed"]);
    expect(agendaFor([c], [session()], "2026-11-09").map((e) => e.status)).toEqual(["missed"]);
    expect(agendaFor([c], [session({ endedAt: 1 })], "2026-11-09").map((e) => e.status)).toEqual(["done"]);
  });

  it("leaves out deleted sessions and deleted clients", () => {
    expect(agendaFor([client()], [session({ deleted: true })], "2026-11-09")).toEqual([]);
    expect(agendaFor([], [session()], "2026-11-09")).toEqual([]);
  });
});

describe("following up", () => {
  it("only finished sessions count as training", () => {
    const last = lastDoneByClient([session({ date: "2026-11-01" }), session({ id: "b", date: "2026-10-01", endedAt: 1 })]);
    expect(last.get("c")).toBe("2026-10-01");
  });

  it("is inactive from 14 days on, or when never trained", () => {
    expect(isInactive("2026-10-27", "2026-11-09")).toBe(false);
    expect(isInactive("2026-10-26", "2026-11-09")).toBe(true);
    expect(isInactive(undefined, "2026-11-09")).toBe(true);
  });
});

describe("nextTraining", () => {
  it("is today when planned and not yet done", () => {
    expect(nextTraining(client({ schedule: mondays }), [], "2026-11-09")).toBe("2026-11-09");
  });

  it("skips a day already trained or missed", () => {
    expect(nextTraining(client({ schedule: mondays }), [session({ endedAt: 1 })], "2026-11-09")).toBe("2026-11-16");
    expect(nextTraining(client({ schedule: mondays, absences: [{ date: "2026-11-09", kind: "missed" }] }), [], "2026-11-09")).toBe("2026-11-16");
  });

  it("finds a prepared session outside the plan, and nothing when there is neither", () => {
    expect(nextTraining(client(), [session({ date: "2026-11-11" })], "2026-11-09")).toBe("2026-11-11");
    expect(nextTraining(client(), [], "2026-11-09")).toBeNull();
  });
});
