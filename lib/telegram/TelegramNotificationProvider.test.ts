import { afterEach, describe, expect, it, vi } from "vitest";
import { TelegramNotificationProvider } from "./TelegramNotificationProvider";

const payload = {
  productName: "Dracaufeu <rare>",
  listingUrl: "https://www.vinted.fr/items/123",
  imageUrl: null,
  purchasePrice: 55,
  marketValue: 100,
  discountPercent: -45,
  estimatedProfit: 30,
  roi: 50,
  score: 91,
  category: "EXCEPTIONNEL",
  confidence: 0.96,
  riskLabel: "Faible" as const,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TelegramNotificationProvider", () => {
  it("refuse un envoi sans secret configuré", async () => {
    const provider = new TelegramNotificationProvider(undefined, undefined);
    await expect(provider.sendOpportunity(payload)).resolves.toEqual({
      success: false,
      error: "TELEGRAM_BOT_TOKEN non configuré",
    });
  });

  it("envoie un message texte via l'API Bot officielle", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new TelegramNotificationProvider("secret-token", "12345").sendOpportunity(payload);

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/botsecret-token/sendMessage");
    const body = JSON.parse(String(request.body));
    expect(body.chat_id).toBe("12345");
    expect(body.text).toContain("Dracaufeu &lt;rare&gt;");
    expect(body.reply_markup.inline_keyboard[0][0].url).toBe(payload.listingUrl);
  });

  it("utilise sendPhoto quand une image est disponible", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await new TelegramNotificationProvider("token", "chat").sendOpportunity({
      ...payload,
      imageUrl: "https://images.example/card.jpg",
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bottoken/sendPhoto");
    expect(JSON.parse(String(request.body)).photo).toBe("https://images.example/card.jpg");
  });
});
