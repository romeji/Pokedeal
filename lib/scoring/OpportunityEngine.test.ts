import { describe, expect, it, vi } from "vitest";
import type { PriceEngine } from "@/lib/pricing/PriceEngine";
import { OpportunityEngine } from "./OpportunityEngine";

describe("OpportunityEngine", () => {
  it("ne compte jamais deux fois le même produit détecté sur plusieurs photos", async () => {
    const getMarketValueRange = vi.fn().mockResolvedValue({ optimisticValue: 30, probableValue: 25, conservativeValue: 20, retrievedAt: new Date() });
    const engine = new OpportunityEngine({ getMarketValueRange } as unknown as PriceEngine, { platformFeePercent: 0, buyerProtectionFeePercent: 0, shippingCostDefault: 0, resaleFeePercent: 0, riskMarginPercent: 0 });
    const result = await engine.calculate(10, [
      { cardmarketProductId: "same", matchConfidence: .9 },
      { cardmarketProductId: "same", matchConfidence: .9 },
      { cardmarketProductId: "same", matchConfidence: .8 },
    ]);
    expect(getMarketValueRange).toHaveBeenCalledTimes(1);
    expect(result?.probableValue).toBe(25);
    expect(result?.estimatedProfit).toBe(10);
  });
});
