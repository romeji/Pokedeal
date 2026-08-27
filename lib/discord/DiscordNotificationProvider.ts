import type {
  NotificationProvider,
  OpportunityNotificationPayload,
} from "@/lib/notifications/types";

export class DiscordNotificationProvider implements NotificationProvider {
  readonly name = "discord";

  constructor(private readonly webhookUrl = process.env.DISCORD_WEBHOOK_URL) {}

  async sendOpportunity(
    payload: OpportunityNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookUrl) {
      return { success: false, error: "DISCORD_WEBHOOK_URL non configuré" };
    }

    const embed = {
      title: "🚨 NOUVELLE OPPORTUNITÉ",
      description: `🃏 ${payload.productName}`,
      color: this.colorForScore(payload.score),
      fields: [
        {
          name: "Prix",
          value: `💰 ${payload.purchasePrice}€  →  📊 Cardmarket : ${payload.marketValue}€ (📉 ${payload.discountPercent}%)`,
        },
        {
          name: "Rentabilité",
          value: `💵 Profit : ${payload.estimatedProfit}€\n📈 ROI : ${payload.roi}%`,
        },
        {
          name: "Score",
          value: `⭐ ${payload.score}/100\n🧠 Confiance : ${Math.round(payload.confidence * 100)}%\n⚠️ Risque : ${payload.riskLabel}`,
        },
      ],
      image: payload.imageUrl ? { url: payload.imageUrl } : undefined,
      url: payload.listingUrl,
    };

    try {
      const res = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) {
        return { success: false, error: `Discord a répondu ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erreur inconnue" };
    }
  }

  private colorForScore(score: number): number {
    if (score >= 90) return 0xff5470; // exceptionnel
    if (score >= 80) return 0xff8c42; // très bon deal
    if (score >= 70) return 0xffb703; // bon deal
    if (score >= 60) return 0x8ecae6; // à surveiller
    return 0x4a5568; // ignorer
  }
}
