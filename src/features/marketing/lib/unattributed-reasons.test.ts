import { describe, expect, it } from "vitest";
import { REASON_LABEL, visibleReasonRows } from "./unattributed-reasons";

describe("visibleReasonRows", () => {
  it("API antiga sem byReason → nenhuma linha", () => {
    expect(visibleReasonRows(undefined)).toEqual([]);
  });

  it("esconde motivo sem venda e ordena pela receita", () => {
    const rows = visibleReasonRows([
      { reason: "site", deals: 0, revenue: 0 },
      { reason: "organic", deals: 2, revenue: 14284.5 },
      { reason: "portfolio", deals: 29, revenue: 249800.53 },
    ]);
    expect(rows.map((r) => r.reason)).toEqual(["portfolio", "organic"]);
  });

  it("todo motivo tem rótulo", () => {
    expect(REASON_LABEL.portfolio).toBe("Carteira / recompra");
    expect(Object.keys(REASON_LABEL)).toHaveLength(5);
  });
});
