import { describe, expect, it } from "vitest";
import { owedMonths, receivedIn, setFee } from "./payments";

describe("owedMonths", () => {
  it("owes nothing without a fee", () => {
    expect(owedMonths({ monthlyFee: null, feeFrom: "2026-01" }, "2026-11-07")).toEqual([]);
  });

  it("counts every unpaid month since the fee started, across years", () => {
    const paid = [{ id: "p", month: "2026-12", date: "2026-12-01", amount: 50 }];
    expect(owedMonths({ monthlyFee: 50, feeFrom: "2026-11", payments: paid }, "2027-01-15")).toEqual(["2026-11", "2027-01"]);
  });

  it("starts in the current month when no start is stored", () => {
    expect(owedMonths({ monthlyFee: 50 }, "2026-11-07")).toEqual(["2026-11"]);
  });
});

describe("setFee", () => {
  it("keeps the start while the fee changes, and forgets it when removed", () => {
    expect(setFee({ feeFrom: "2026-03" }, 60, "2026-11-07")).toEqual({ monthlyFee: 60, feeFrom: "2026-03" });
    expect(setFee({}, 60, "2026-11-07")).toEqual({ monthlyFee: 60, feeFrom: "2026-11" });
    expect(setFee({ feeFrom: "2026-03" }, null, "2026-11-07")).toEqual({ monthlyFee: null, feeFrom: null });
  });
});

describe("receivedIn", () => {
  it("goes by the day received, not the month covered", () => {
    const clients = [{ payments: [{ id: "a", month: "2026-10", date: "2026-11-02", amount: 50 }, { id: "b", month: "2026-11", date: "2026-11-03", amount: 30 }, { id: "c", month: "2026-09", date: "2026-09-30", amount: 99 }] }, {}];
    expect(receivedIn(clients, "2026-11")).toBe(80);
  });
});
