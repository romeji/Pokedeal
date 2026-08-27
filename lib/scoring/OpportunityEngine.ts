import { PriceEngine } from "@/lib/pricing/PriceEngine";
import { loadFeeConfig, type FeeConfig } from "./feeConfig";

/**
 * OpportunityEngine — sections 12 (lots) et 13 (calcul profit/ROI).
 *
 * Pour un lot (plusieurs ProductMatch sur une même annonce), section 12 :
 * ne jamais additionner aveuglément les valeurs optimistes. On somme les
 * valeurs conservative/probable par élément matché, et on garde
 * l'optimiste séparément à titre indicatif seulement.
 */

export interface MatchedItem {
  cardmarketProductId: string; // CardmarketProduct.id interne
  matchConfidence: number;
}

export interface OpportunityCalculation {
  optimisticValue: number;
  probableValue: number;
  conservativeValue: number;
  usableValue: number; // valeur probable/conservative après marge de sécurité — sert au calcul du profit
  purchasePrice: number;
  shippingCost: number;
  platformFees: number;
  resaleFees: number;
  riskMargin: number;
  estimatedProfit: number;
  roi: number; // en %
}

export class OpportunityEngine {
  constructor(
    private readonly priceEngine = new PriceEngine(),
    private readonly fees: FeeConfig = loadFeeConfig()
  ) {}

  /**
   * `purchasePrice` = prix de l'annonce Vinted. `items` = tous les
   * ProductMatch de l'annonce (un seul pour un produit simple, plusieurs
   * pour un lot).
   */
  async calculate(purchasePrice: number, items: MatchedItem[]): Promise<OpportunityCalculation | null> {
    if (items.length === 0) return null;

    const ranges = await Promise.all(
      items.map((item) => this.priceEngine.getMarketValueRange(item.cardmarketProductId))
    );

    // On ignore les éléments sans prix connu plutôt que de deviner une valeur.
    const knownRanges = ranges.filter((r): r is NonNullable<typeof r> => r !== null);
    if (knownRanges.length === 0) return null;

    const optimisticValue = knownRanges.reduce((sum, r) => sum + r.optimisticValue, 0);
    const probableValue = knownRanges.reduce((sum, r) => sum + r.probableValue, 0);
    const conservativeValue = knownRanges.reduce((sum, r) => sum + r.conservativeValue, 0);

    const riskMargin = (probableValue * this.fees.riskMarginPercent) / 100;
    // "Le score doit surtout utiliser probableValue/conservativeValue" (section 12) —
    // on prend le plus prudent des deux comme base, puis on retire la marge de sécurité.
    const usableValue = Math.max(0, Math.min(probableValue, conservativeValue + riskMargin) - riskMargin);

    const shippingCost = this.fees.shippingCostDefault;
    const platformFees =
      (purchasePrice * this.fees.platformFeePercent) / 100 +
      (purchasePrice * this.fees.buyerProtectionFeePercent) / 100;
    const resaleFees = (usableValue * this.fees.resaleFeePercent) / 100;

    const totalCost = purchasePrice + shippingCost + platformFees;
    const netResaleValue = usableValue - resaleFees;
    const estimatedProfit = Math.round((netResaleValue - totalCost) * 100) / 100;
    const roi = totalCost > 0 ? Math.round((estimatedProfit / totalCost) * 1000) / 10 : 0;

    return {
      optimisticValue: Math.round(optimisticValue * 100) / 100,
      probableValue: Math.round(probableValue * 100) / 100,
      conservativeValue: Math.round(conservativeValue * 100) / 100,
      usableValue: Math.round(usableValue * 100) / 100,
      purchasePrice,
      shippingCost,
      platformFees: Math.round(platformFees * 100) / 100,
      resaleFees: Math.round(resaleFees * 100) / 100,
      riskMargin: Math.round(riskMargin * 100) / 100,
      estimatedProfit,
      roi,
    };
  }
}
