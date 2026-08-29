import { prisma } from "@/lib/database/prisma";
import { PriceEngine } from "@/lib/pricing/PriceEngine";
import { OpportunityEngine, type MatchedItem } from "@/lib/scoring/OpportunityEngine";
import { scoreOpportunity } from "@/lib/scoring/OpportunityScorer";
import { runJob } from "@/lib/workers/runJob";
import { ProductMatcher } from "@/lib/matching/ProductMatcher";

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
    const matcher = new ProductMatcher();
    const legacyNoMatches = await prisma.listing.findMany({
      where: { status: "NO_MATCH", items: { some: { label: { contains: "/" } } } },
      include: { items: true }, orderBy: { lastSeenAt: "desc" }, take: limit,
    });
    for (const listing of legacyNoMatches) {
      for (const item of listing.items) {
        const number = item.label.match(/\d+[a-z]?\s*\/\s*\d+/i)?.[0]?.replace(/\s/g, "") ?? null;
        const setName = item.label.match(/\((?:Pok[eé]mon\s*)?([^)]*)\)\s*$/i)?.[1]?.trim() ?? null;
        if (!number) continue;
        const match = await matcher.match({
          label: item.label, productType: "CARD", setCode: null, setName, number,
          language: null, rarity: null, edition: null, condition: null,
          confidenceScore: item.confidenceScore ?? .75,
          imageQualityScore: item.imageQualityScore ?? .5,
          counterfeitRiskScore: item.counterfeitRiskScore ?? .5,
          needsManualReview: item.needsManualReview,
        }).catch(() => null);
        if (!match || match.confidence < .82) continue;
        await prisma.productMatch.upsert({
          where: { listingId_productId: { listingId: listing.id, productId: match.cardmarketProductId } },
          create: { listingId: listing.id, productId: match.cardmarketProductId, confidence: match.confidence },
          update: { confidence: match.confidence },
        });
        await prisma.listing.update({ where: { id: listing.id }, data: { status: "ANALYZED", filterReason: null } });
        break;
      }
    }
    // Répare progressivement les annonces bloquées par l'ancien bug qui
    // comptait le même produit une fois par photo.
    const legacyDuplicates = await prisma.listing.findMany({
      where: { status: "REVIEW_REQUIRED", filterReason: { startsWith: "Lot multi-produits" } },
      include: { items: true },
      take: limit,
    });
    for (const listing of legacyDuplicates) {
      if (uniqueListingItems(listing.items).length === 1) {
        await prisma.listing.update({ where: { id: listing.id }, data: { status: "ANALYZED", filterReason: null } });
      }
    }
    const listings = await prisma.listing.findMany({
      where: { status: "ANALYZED" },
      include: { matches: { orderBy: { confidence: "desc" } }, items: true },
      take: limit,
    });

    let scored = 0;
    let skipped = 0;
    let errors = 0;

    for (const listing of listings) {
      try {
        const distinctItems = uniqueListingItems(listing.items);
        if (listing.matches.length === 0) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { status: "NO_MATCH", filterReason: "Aucun produit Cardmarket suffisamment fiable" },
          });
          skipped++;
          continue;
        }

        if (distinctItems.some((item) => item.needsManualReview || (item.confidenceScore ?? 0) < 0.75)) {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: "REVIEW_REQUIRED", filterReason: "Identification visuelle à confirmer manuellement" } });
          skipped++;
          continue;
        }

        if (distinctItems.length > 1) {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: "REVIEW_REQUIRED", filterReason: "Lot multi-produits : chaque élément doit être associé séparément" } });
          skipped++;
          continue;
        }

        // ProductMatch contient des candidats alternatifs, pas les composants
        // d'un lot. Pour une annonce simple, seule la meilleure association
        // doit contribuer à la valeur, sinon les prix sont additionnés à tort.
        const matchedItems: MatchedItem[] = listing.matches.filter((match) => match.confidence >= 0.82).slice(0, 1).map((m) => ({
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

        const identificationConfidence = this.average(distinctItems.map((i) => i.confidenceScore));
        const imageQualityScore = this.average(distinctItems.map((i) => i.imageQualityScore));
        const counterfeitRiskScore = this.average(distinctItems.map((i) => i.counterfeitRiskScore));

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

function uniqueListingItems<T extends { label: string; confidenceScore: number | null; imageQualityScore: number | null; counterfeitRiskScore: number | null; needsManualReview: boolean }>(items: T[]) {
  const unique = new Map<string, T>();
  for (const item of items) {
    const key = item.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const current = unique.get(key);
    if (!current || (item.confidenceScore ?? 0) > (current.confidenceScore ?? 0)) unique.set(key, item);
  }
  return [...unique.values()];
}

if (require.main === module) {
  runJob("opportunity-scorer", () => new OpportunityScoringWorker().runOnce())
    .then((r) => console.log(`Scoring terminé : ${r.scored} scorées, ${r.skipped} ignorées, ${r.errors} erreurs.`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
