import { describe, expect, it } from "vitest";
import { entryUnitValue } from "./valuation";

describe("entryUnitValue", () => {
  it("priorise une valeur manuelle", () => {
    expect(entryUnitValue({ quantity: 1, manualValue: { toString: () => "42.5" }, product: null })).toBe(42.5);
  });

  it("utilise la tendance Cardmarket avant les autres prix", () => {
    expect(entryUnitValue({
      quantity: 1,
      manualValue: null,
      product: { priceSnapshots: [{ trendPrice: { toString: () => "18.9" }, avg7Price: { toString: () => "17" }, averagePrice: null, lowPrice: null }] },
    })).toBe(18.9);
  });
});
