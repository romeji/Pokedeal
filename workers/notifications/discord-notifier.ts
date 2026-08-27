import { prisma } from "@/lib/database/prisma";
import { DiscordNotificationProvider } from "@/lib/discord/DiscordNotificationProvider";
import type { NotificationProvider } from "@/lib/discord/types";
import { runJob } from "@/lib/workers/runJob";

/**
 * Phase 7 — pour chaque Opportunity nouvellement SCORED sans notification
 * Discord déjà envoyée : vérifie les AlertRule actives (section 17) et le
 * Watchlist (section 19), puis notifie si les seuils sont atteints.
 *
 * Dédoublonnage (section 18) : une notification n'est envoyée qu'une
 * seule fois par Opportunity (une ligne DiscordNotification existante
 * suffit à bloquer un renvoi) — pas de spam en boucle du même deal.
 */
export class DiscordNotifierWorker {
  constructor(private readonly notifier: NotificationProvider = new DiscordNotificationProvider()) {}

  async runOnce(limit = 20): Promise<{ sent: number; suppressedByRules: number; alreadyNotified: number; errors: number }> {
    const opportunities = await prisma.opportunity.findMany({
      where: { listing: { status: "SCORED" }, notifications: { none: {} } },
      include: { listing: { include: { images: true, matches: { include: { product: true } } } }, score: true },
      take: limit,
    });

    let sent = 0;
    let suppressedByRules = 0;
    let alreadyNotified = 0;
    let errors = 0;

    const activeRules = await prisma.alertRule.findMany({ where: { active: true } });
    const watchlist = await prisma.watchlist.findMany();

    for (const opportunity of opportunities) {
      try {
        if (!opportunity.score) {
          suppressedByRules++;
          continue;
        }

        const passes = this.passesAnyRule(opportunity, activeRules) || this.passesWatchlist(opportunity, watchlist);
        if (!passes) {
          suppressedByRules++;
          continue;
        }

        const product = opportunity.listing.matches[0]?.product;
        const result = await this.notifier.sendOpportunity({
          productName: product?.name ?? opportunity.listing.title,
          listingUrl: opportunity.listing.url,
          imageUrl: opportunity.listing.images[0]?.url ?? null,
          purchasePrice: Number(opportunity.purchasePrice),
          marketValue: Number(opportunity.marketValue ?? 0),
          discountPercent: this.computeDiscount(opportunity),
          estimatedProfit: Number(opportunity.estimatedProfit ?? 0),
          roi: opportunity.roi ?? 0,
          score: opportunity.score.score,
          category: opportunity.score.category,
          confidence: opportunity.score.confidenceScore,
          riskLabel: this.riskLabel(opportunity.score.riskScore),
        });

        await prisma.discordNotification.create({
          data: { opportunityId: opportunity.id, success: result.success, error: result.error },
        });

        if (result.success) sent++;
        else errors++;
      } catch (err) {
        errors++;
        console.error(`Erreur de notification pour l'opportunité ${opportunity.id}:`, err);
      }
    }

    return { sent, suppressedByRules, alreadyNotified, errors };
  }

  private computeDiscount(opportunity: { purchasePrice: unknown; marketValue: unknown }): number {
    const price = Number(opportunity.purchasePrice);
    const market = Number(opportunity.marketValue);
    if (!market) return 0;
    return Math.round(((price - market) / market) * 1000) / 10;
  }

  private riskLabel(riskScore: number): "Faible" | "Modéré" | "Élevé" {
    if (riskScore < 0.33) return "Faible";
    if (riskScore < 0.66) return "Modéré";
    return "Élevé";
  }

  private passesAnyRule(
    opportunity: {
      score: { score: number; confidenceScore: number } | null;
      estimatedProfit: unknown;
      roi: number | null;
      purchasePrice: unknown;
    },
    rules: Array<{
      minimumScore: number | null;
      minimumProfit: unknown;
      minimumROI: number | null;
      maximumPrice: unknown;
      minimumConfidence: number | null;
      maximumRisk: number | null;
    }>
  ): boolean {
    if (rules.length === 0) return false; // aucune règle active = pas d'alerte tant que Jack n'en crée pas
    return rules.some((rule) => {
      if (!opportunity.score) return false;
      if (rule.minimumScore !== null && opportunity.score.score < rule.minimumScore) return false;
      if (rule.minimumProfit !== null && Number(opportunity.estimatedProfit) < Number(rule.minimumProfit)) return false;
      if (rule.minimumROI !== null && (opportunity.roi ?? 0) < rule.minimumROI) return false;
      if (rule.maximumPrice !== null && Number(opportunity.purchasePrice) > Number(rule.maximumPrice)) return false;
      if (rule.minimumConfidence !== null && opportunity.score.confidenceScore < rule.minimumConfidence) return false;
      return true;
    });
  }

  private passesWatchlist(
    opportunity: { listing: { matches: Array<{ productId: string }> }; purchasePrice: unknown },
    watchlist: Array<{ productId: string | null; maxPrice: unknown }>
  ): boolean {
    const matchedProductIds = new Set(opportunity.listing.matches.map((m) => m.productId));
    return watchlist.some(
      (w) =>
        w.productId &&
        matchedProductIds.has(w.productId) &&
        (w.maxPrice === null || Number(opportunity.purchasePrice) <= Number(w.maxPrice))
    );
  }
}

if (require.main === module) {
  runJob("discord-notifier", () => new DiscordNotifierWorker().runOnce())
    .then((r) =>
      console.log(
        `Notification terminée : ${r.sent} envoyées, ${r.suppressedByRules} filtrées par les règles, ${r.errors} erreurs.`
      )
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
