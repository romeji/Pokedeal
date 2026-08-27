import { config } from "dotenv";
import { DiscordNotificationProvider } from "@/lib/discord/DiscordNotificationProvider";
import type { NotificationProvider } from "@/lib/notifications/types";
import { TelegramNotificationProvider } from "@/lib/telegram/TelegramNotificationProvider";

config({ quiet: true });

async function main() {
  const channel = process.argv[2]?.toLowerCase();
  const provider: NotificationProvider =
    channel === "telegram"
      ? new TelegramNotificationProvider()
      : channel === "discord"
        ? new DiscordNotificationProvider()
        : failUsage();

  const result = await provider.sendOpportunity({
    productName: "Test Pokémon Deal Scanner",
    listingUrl: "https://www.vinted.fr/",
    imageUrl: null,
    purchasePrice: 55,
    marketValue: 100,
    discountPercent: -45,
    estimatedProfit: 30,
    roi: 50,
    score: 91,
    category: "EXCEPTIONNEL",
    confidence: 0.96,
    riskLabel: "Faible",
  });

  if (!result.success) throw new Error(result.error ?? `Échec du test ${provider.name}`);
  console.log(`Notification de test ${provider.name} envoyée avec succès.`);
}

function failUsage(): never {
  throw new Error("Usage: tsx workers/notifications/test-notification.ts <telegram|discord>");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
