import { config } from "dotenv";
import { ListingAnalyzer } from "@/workers/ai/listing-analyzer";
import { OpportunityScoringWorker } from "@/workers/pricing/opportunity-scorer";
import { DiscordNotifierWorker } from "@/workers/notifications/discord-notifier";
import { TelegramNotifierWorker } from "@/workers/notifications/telegram-notifier";

config({ quiet: true });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function positiveInteger(raw: string | undefined, fallback: number) {
  const value = Number(raw ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

async function main() {
  const visionConfigured = Boolean(process.env.GEMINI_API_KEY);
  const intervalSeconds = positiveInteger(process.env.PROCESSOR_INTERVAL_SECONDS, 30);
  const analysisBatchSize = positiveInteger(process.env.GEMINI_ANALYSIS_BATCH_SIZE, 5);

  console.log(
    `Processeur Pokedeal continu actif${
      visionConfigured ? "" : " (Gemini en attente de GEMINI_API_KEY)"
    } · cycle ${intervalSeconds}s · lot Gemini ${analysisBatchSize}.`,
  );

  for (;;) {
    try {
      const analyzed = visionConfigured
        ? await new ListingAnalyzer().runOnce(analysisBatchSize)
        : { analyzed: 0, ignored: 0, errors: 0 };
      const scored = await new OpportunityScoringWorker().runOnce(20);
      const discord = await new DiscordNotifierWorker().runOnce(20);
      const telegram =
        process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
          ? await new TelegramNotifierWorker().runOnce(20)
          : null;

      if (
        analyzed.analyzed ||
        analyzed.ignored ||
        analyzed.errors ||
        scored.scored ||
        scored.errors ||
        discord.sent ||
        telegram?.sent
      ) {
        console.log({ analyzed, scored, discord, telegram });
      }
    } catch (error) {
      console.error("Cycle continu en erreur:", error);
    }
    await delay(intervalSeconds * 1_000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
