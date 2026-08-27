import type {
  NotificationProvider,
  NotificationResult,
  OpportunityNotificationPayload,
} from "@/lib/notifications/types";

interface TelegramApiResponse {
  ok?: boolean;
  description?: string;
}

export class TelegramNotificationProvider implements NotificationProvider {
  readonly name = "telegram";

  constructor(
    private readonly botToken = process.env.TELEGRAM_BOT_TOKEN,
    private readonly chatId = process.env.TELEGRAM_CHAT_ID
  ) {}

  async sendOpportunity(payload: OpportunityNotificationPayload): Promise<NotificationResult> {
    if (!this.botToken) {
      return { success: false, error: "TELEGRAM_BOT_TOKEN non configuré" };
    }
    if (!this.chatId) {
      return { success: false, error: "TELEGRAM_CHAT_ID non configuré" };
    }

    const text = this.formatMessage(payload);
    const method = payload.imageUrl ? "sendPhoto" : "sendMessage";
    const body = payload.imageUrl
      ? {
          chat_id: this.chatId,
          photo: payload.imageUrl,
          caption: text,
          parse_mode: "HTML",
          reply_markup: this.replyMarkup(payload.listingUrl),
        }
      : {
          chat_id: this.chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
          reply_markup: this.replyMarkup(payload.listingUrl),
        };

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as TelegramApiResponse;
      if (!response.ok || data.ok === false) {
        return {
          success: false,
          error: data.description ?? `Telegram a répondu ${response.status}`,
        };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur Telegram inconnue",
      };
    }
  }

  private formatMessage(payload: OpportunityNotificationPayload): string {
    return [
      "🚨 <b>NOUVELLE OPPORTUNITÉ</b>",
      "",
      `🃏 <b>${escapeHtml(payload.productName)}</b>`,
      `💰 Prix : <b>${formatNumber(payload.purchasePrice)} €</b>`,
      `📊 Cardmarket : <b>${formatNumber(payload.marketValue)} €</b>`,
      `📉 Décote : <b>${formatNumber(payload.discountPercent)} %</b>`,
      "",
      `💵 Profit : <b>${formatNumber(payload.estimatedProfit)} €</b>`,
      `📈 ROI : <b>${formatNumber(payload.roi)} %</b>`,
      `⭐ Score : <b>${payload.score}/100</b> (${escapeHtml(payload.category)})`,
      `🧠 Confiance : <b>${Math.round(payload.confidence * 100)} %</b>`,
      `⚠️ Risque : <b>${payload.riskLabel}</b>`,
    ].join("\n");
  }

  private replyMarkup(listingUrl: string) {
    return { inline_keyboard: [[{ text: "Voir l’annonce", url: listingUrl }]] };
  }
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}
