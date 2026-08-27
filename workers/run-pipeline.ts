import { ListingCollector } from "@/workers/marketplace/listing-collector";
import { ListingAnalyzer } from "@/workers/ai/listing-analyzer";
import { OpportunityScoringWorker } from "@/workers/pricing/opportunity-scorer";
import { DiscordNotifierWorker } from "@/workers/notifications/discord-notifier";
import { TelegramNotifierWorker } from "@/workers/notifications/telegram-notifier";
import { runJob } from "@/lib/workers/runJob";

/**
 * Enchaîne tout le pipeline en une seule commande (section 22, V1 "simple
 * et gratuite" — pas d'orchestrateur distribué). À lancer manuellement ou
 * via cron (voir README, section "Automatisation").
 *
 * Objectif final du brief :
 * VINTED → Filtre → Gemini Vision → Identification → Cardmarket →
 * Prix marché → Frais+risque → Profit → ROI → Score → DISCORD + TELEGRAM
 */
async function main() {
  const collectResult = await runJob("listing-collector", () => new ListingCollector().collect());
  console.log("Collecte:", collectResult);

  const analyzeResult = await runJob("listing-analyzer", () => new ListingAnalyzer().runOnce());
  console.log("Analyse:", analyzeResult);

  const scoreResult = await runJob("opportunity-scorer", () => new OpportunityScoringWorker().runOnce());
  console.log("Scoring:", scoreResult);

  const notifyResult = await runJob("discord-notifier", () => new DiscordNotifierWorker().runOnce());
  console.log("Notifications Discord:", notifyResult);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    const telegramResult = await runJob("telegram-notifier", () => new TelegramNotifierWorker().runOnce());
    console.log("Notifications Telegram:", telegramResult);
  } else {
    console.log("Notifications Telegram ignorées : credentials non configurés.");
  }
}

main().catch((err) => {
  console.error("Pipeline interrompu:", err);
  process.exit(1);
});
