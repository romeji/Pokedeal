import { prisma } from "@/lib/database/prisma";
import { PriceEngine } from "@/lib/pricing/PriceEngine";
import { OpportunityEngine, type MatchedItem } from "@/lib/scoring/OpportunityEngine";
import { scoreOpportunity } from "@/lib/scoring/OpportunityScorer";
import { runJob } from "@/lib/workers/runJob";

/**
 * Phase 5 — pour chaque Listing en statut ANALYZED avec au moins un
 * ProductMatch : calcule profit/ROI (OpportunityEngine), puis le score
 * 0-100 (OpportunityScorer), et écrit Opportunity + OpportunityScore.
 * Passe le Listing en statut SCORED.
 */
export class OpportunityScoringWorker {
  constructor(
    private readonly opportunityEngine = new OpportunityEngine(),
    private readonly priceEngine = new PriceEngine()
  ) {}

  async runOnce(limit = 20): Promise<{ scored: number; skipped: number; errors: number }> {
    const listings = await prisma.listing.findMany({
      where: { status: "ANALYZED" },
      include: { matches: true, items: true },
      take: limit,
    });

    let scored = 0;
    let skipped = 0;
    let errors = 0;

    for (const listing of listings) {
      try {
        if (listing.matches.length === 0) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { status: "NO_MATCH", filterReason: "Aucun produit Cardmarket suffisamment fiable" },
          });
          skipped++;
          continue;
        }

        if (listing.items.some((item) => item.needsManualReview || (item.confidenceScore ?? 0) < 0.75)) {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: "REVIEW_REQUIRED", filterReason: "Identification visuelle à confirmer manuellement" } });
          skipped++;
          continue;
        }

        const matchedItems: MatchedItem[] = listing.matches.filter((match) => match.confidence >= 0.82).map((m) => ({
          cardmarketProductId: m.productId,
          matchConfidence: m.confidence,
        }));
        if (matchedItems.length === 0) {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: "REVIEW_REQUIRED", filterReason: "Association produit trop incertaine pour une cotation" } });
          skipped++;
          continue;
        }

        const calculation = await this.opportunityEngine.calculate(Number(listing.price), matchedItems);
        if (!calculation) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { status: "PRICE_UNAVAILABLE", filterReason: "Prix Cardmarket indisponible" },
          });
          skipped++;
          continue;
        }
        if (calculation.roi > 150 || calculation.probableValue > Number(listing.price) * 3.5) {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: "REVIEW_REQUIRED", filterReason: "Écart de prix anormal : vérification manuelle requise" } });
          skipped++;
          continue;
        }

        const discountPercent =
          calculation.probableValue > 0
            ? Math.round(
                ((Number(listing.price) - calculation.probableValue) / calculation.probableValue) * 1000
              ) / 10
            : 0;

        const identificationConfidence = this.average(listing.items.map((i) => i.confidenceScore));
        const imageQualityScore = this.average(listing.items.map((i) => i.imageQualityScore));
        const counterfeitRiskScore = this.average(listing.items.map((i) => i.counterfeitRiskScore));

        // Fiabilité prix + tendance : basées sur le premier produit matché
        // (V1 — une agrégation multi-produits pour les lots serait plus
        // juste mais plus complexe ; TODO si les lots deviennent fréquents).
        const primaryProduct = listing.matches[0]?.productId;
        const priceResult = primaryProduct ? await this.priceEngine.getProductPrice(
          (await prisma.cardmarketProduct.findUnique({ where: { id: primaryProduct } }))?.cardmarketProductId.toString() ?? ""
        ) : null;
        const evolution = primaryProduct
          ? await this.priceEngine.getPriceEvolution(
              (await prisma.cardmarketProduct.findUnique({ where: { id: primaryProduct } }))?.cardmarketProductId.toString() ?? "",
              7
            )
          : null;

        const result = scoreOpportunity({
          discountPercent,
          roi: calculation.roi,
          estimatedProfit: calculation.estimatedProfit,
          identificationConfidence,
          imageQualityScore,
          counterfeitRiskScore,
          priceConfidence: priceResult?.confidence ?? null,
          trendChangePercent: evolution?.changePercent ?? null,
        });

        await prisma.opportunity.upsert({
          where: { listingId: listing.id },
          update: {
            marketValue: calculation.probableValue,
            conservativeMarketValue: calculation.conservativeValue,
            probableMarketValue: calculation.probableValue,
            purchasePrice: calculation.purchasePrice,
            shippingCost: calculation.shippingCost,
            platformFees: calculation.platformFees,
            resaleFees: calculation.resaleFees,
            riskMargin: calculation.riskMargin,
            estimatedProfit: calculation.estimatedProfit,
            roi: calculation.roi,
          },
          create: {
            listingId: listing.id,
            marketValue: calculation.probableValue,
            conservativeMarketValue: calculation.conservativeValue,
            probableMarketValue: calculation.probableValue,
            purchasePrice: calculation.purchasePrice,
            shippingCost: calculation.shippingCost,
            platformFees: calculation.platformFees,
            resaleFees: calculation.resaleFees,
            riskMargin: calculation.riskMargin,
            estimatedProfit: calculation.estimatedProfit,
            roi: calculation.roi,
          },
        });

        const opportunity = await prisma.opportunity.findUniqueOrThrow({ where: { listingId: listing.id } });

        await prisma.opportunityScore.upsert({
          where: { opportunityId: opportunity.id },
          update: {
            score: result.score,
            category: result.category,
            confidenceScore: result.confidenceScore,
            riskScore: result.riskScore,
            liquidityScore: result.liquidityScore,
          },
          create: {
            opportunityId: opportunity.id,
            score: result.score,
            category: result.category,
            confidenceScore: result.confidenceScore,
            riskScore: result.riskScore,
            liquidityScore: result.liquidityScore,
          },
        });

        await prisma.listing.update({ where: { id: listing.id }, data: { status: "SCORED" } });
        scored++;
      } catch (err) {
        errors++;
        console.error(`Erreur de scoring pour l'annonce ${listing.id}:`, err);
      }
    }

    return { scored, skipped, errors };
  }

  private average(values: Array<number | null>): number | null {
    const known = values.filter((v): v is number => v !== null);
    if (known.length === 0) return null;
    return known.reduce((s, v) => s + v, 0) / known.length;
  }
}

if (require.main === module) {
  runJob("opportunity-scorer", () => new OpportunityScoringWorker().runOnce())
    .then((r) => console.log(`Scoring terminé : ${r.scored} scorées, ${r.skipped} ignorées, ${r.errors} erreurs.`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
