import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "./OpportunityScorer";

describe("scoreOpportunity", () => {
  it("plafonne une opportunité quand un signal de confiance clé manque", () => {
    const result = scoreOpportunity({
      discountPercent: -80,
      roi: 200,
      estimatedProfit: 250,
      identificationConfidence: null,
      imageQualityScore: 1,
      counterfeitRiskScore: 0,
      priceConfidence: null,
      trendChangePercent: 20,
    });

    expect(result.score).toBeLessThanOrEqual(69);
    expect(result.cappedForMissingSignals).toBe(true);
  });

  it("classe une opportunité complète dans la catégorie cohérente avec son score", () => {
    const result = scoreOpportunity({
      discountPercent: -60,
      roi: 100,
      estimatedProfit: 100,
      identificationConfidence: 1,
      imageQualityScore: 1,
      counterfeitRiskScore: 0,
      priceConfidence: 1,
      trendChangePercent: 50,
    });

    expect(result.score).toBe(100);
    expect(result.category).toBe("EXCEPTIONNEL");
  });
});
