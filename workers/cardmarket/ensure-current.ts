import { config } from "dotenv";
import { CardmarketAutomaticSync } from "@/lib/cardmarket/CardmarketAutomaticSync";
import { prisma } from "@/lib/database/prisma";
import { runJob } from "@/lib/workers/runJob";

config({ quiet: true });

async function main() {
  const maxAgeHours = Number(process.env.CARDMARKET_MAX_PRICE_AGE_HOURS ?? 36);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours < 24 || maxAgeHours > 168) {
    throw new Error("CARDMARKET_MAX_PRICE_AGE_HOURS doit être compris entre 24 et 168");
  }

  const result = await runJob("cardmarket-startup-check", () =>
    new CardmarketAutomaticSync().run(),
  );
  const publishedAt = new Date(result.downloads.prices.createdAt);
  const ageHours = (Date.now() - publishedAt.getTime()) / 3_600_000;

  if (!Number.isFinite(ageHours) || ageHours > maxAgeHours) {
    throw new Error(
      `Le Price Guide Cardmarket a ${Math.round(ageHours)} h (maximum ${maxAgeHours} h)`,
    );
  }

  console.log(
    `Cardmarket validé : Price Guide du ${publishedAt.toLocaleString("fr-FR")} · ${result.downloads.prices.entries} prix · âge ${ageHours.toFixed(1)} h.`,
  );
}

main()
  .catch((error) => {
    console.error("Contrôle Cardmarket échoué:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
