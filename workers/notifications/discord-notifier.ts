import { prisma } from "@/lib/database/prisma";
import { DiscordNotificationProvider } from "@/lib/discord/DiscordNotificationProvider";
import type { NotificationProvider } from "@/lib/notifications/types";
import { runJob } from "@/lib/workers/runJob";
import { LEGACY_ADMIN_USER_ID } from "@/lib/auth/user";

export interface NotificationRunResult {
  sent: number;
  suppressedByRules: number;
  alreadyNotified: number;
  retryLimitReached: number;
  errors: number;
}

/**
 * Worker indépendant du canal. La déduplication est faite par le couple
 * (opportunityId, notifier.name), ce qui autorise une alerte Discord ET une
 * alerte Telegram pour la même opportunité sans répéter un même canal.
 */
export class NotificationNotifierWorker {
  constructor(private readonly notifier: NotificationProvider) {}

  async runOnce(limit = 20): Promise<NotificationRunResult> {
    const channel = this.notifier.name;
    const maxAttempts = readMaxAttempts();
    const opportunities = await prisma.opportunity.findMany({
      where: {
        listing: { status: "SCORED" },
        notifications: { none: { channel, success: true } },
      },
      include: {
        listing: {
          include: { images: true, items: true, matches: { orderBy: { confidence: "desc" }, include: { product: true } } },
        },
        score: true,
        notifications: { where: { channel } },
      },
      take: limit,
    });

    const result: NotificationRunResult = {
      sent: 0,
      suppressedByRules: 0,
      alreadyNotified: 0,
      retryLimitReached: 0,
      errors: 0,
    };
    const activeRules = await prisma.alertRule.findMany({ where: { active: true } });
    const watchlist = await prisma.watchlist.findMany({ where: { userId: LEGACY_ADMIN_USER_ID } });

    for (const opportunity of opportunities) {
      const previous = opportunity.notifications[0];
      if (previous?.success) {
        result.alreadyNotified++;
        continue;
      }
      if ((previous?.attemptCount ?? 0) >= maxAttempts) {
        result.retryLimitReached++;
        continue;
      }
      if (!opportunity.score) {
        result.suppressedByRules++;
        continue;
      }
      if ((opportunity.roi ?? 0) > 150 || opportunity.score.confidenceScore < 0.72 || opportunity.score.riskScore > 0.65) {
        result.suppressedByRules++;
        continue;
      }
      const primaryMatch = opportunity.listing.matches[0];
      if (!primaryMatch || primaryMatch.confidence < 0.82 || opportunity.listing.items.length > 1) {
        result.suppressedByRules++;
        continue;
      }

      const passes =
        this.passesAnyRule(opportunity, activeRules) ||
        this.passesWatchlist(opportunity, watchlist);
      if (!passes) {
        result.suppressedByRules++;
        continue;
      }

      try {
        const product = opportunity.listing.matches[0]?.product;
        const sendResult = await this.notifier.sendOpportunity({
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

        const now = new Date();
        await prisma.discordNotification.upsert({
          where: { opportunityId_channel: { opportunityId: opportunity.id, channel } },
          create: {
            opportunityId: opportunity.id,
            channel,
            attemptCount: 1,
            lastAttemptAt: now,
            sentAt: sendResult.success ? now : null,
            success: sendResult.success,
            error: sendResult.error,
          },
          update: {
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
            sentAt: sendResult.success ? now : null,
            success: sendResult.success,
            error: sendResult.error,
          },
        });

        if (sendResult.success) result.sent++;
        else result.errors++;
      } catch (error) {
        result.errors++;
        console.error(`Erreur ${channel} pour l'opportunité ${opportunity.id}:`, error);
      }
    }

    return result;
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
      score: { score: number; confidenceScore: number; riskScore: number } | null;
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
    if (rules.length === 0) return false;
    return rules.some((rule) => {
      if (!opportunity.score) return false;
      if (rule.minimumScore !== null && opportunity.score.score < rule.minimumScore) return false;
      if (rule.minimumProfit !== null && Number(opportunity.estimatedProfit) < Number(rule.minimumProfit)) return false;
      if (rule.minimumROI !== null && (opportunity.roi ?? 0) < rule.minimumROI) return false;
      if (rule.maximumPrice !== null && Number(opportunity.purchasePrice) > Number(rule.maximumPrice)) return false;
      if (rule.minimumConfidence !== null && opportunity.score.confidenceScore < rule.minimumConfidence) return false;
      if (rule.maximumRisk !== null && opportunity.score.riskScore > rule.maximumRisk) return false;
      return true;
    });
  }

  private passesWatchlist(
    opportunity: { listing: { matches: Array<{ productId: string }> }; purchasePrice: unknown },
    watchlist: Array<{ productId: string | null; maxPrice: unknown }>
  ): boolean {
    const matchedProductIds = new Set(opportunity.listing.matches.map((match) => match.productId));
    return watchlist.some(
      (entry) =>
        entry.productId !== null &&
        matchedProductIds.has(entry.productId) &&
        (entry.maxPrice === null || Number(opportunity.purchasePrice) <= Number(entry.maxPrice))
    );
  }
}

export class DiscordNotifierWorker extends NotificationNotifierWorker {
  constructor(notifier: NotificationProvider = new DiscordNotificationProvider()) {
    super(notifier);
  }
}

function readMaxAttempts(): number {
  const parsed = Number(process.env.NOTIFICATION_MAX_ATTEMPTS ?? "3");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
}

if (require.main === module) {
  runJob("discord-notifier", () => new DiscordNotifierWorker().runOnce())
    .then((summary) => console.log("Notification Discord terminée :", summary))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
