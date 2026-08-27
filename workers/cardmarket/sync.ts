import { config } from "dotenv";
import { CardmarketAutomaticSync } from "@/lib/cardmarket/CardmarketAutomaticSync";
import { prisma } from "@/lib/database/prisma";
import { runJob } from "@/lib/workers/runJob";

config({ quiet: true });

async function syncOnce() {
  const result = await runJob("cardmarket-automatic-sync", () =>
    new CardmarketAutomaticSync().run()
  );
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const continuous = process.argv.includes("--continuous");
  const hours = Number(process.env.CARDMARKET_SYNC_INTERVAL_HOURS ?? 6);
  if (!Number.isFinite(hours) || hours < 1) {
    throw new Error("CARDMARKET_SYNC_INTERVAL_HOURS doit être un nombre supérieur ou égal à 1");
  }

  do {
    try {
      await syncOnce();
    } catch (error) {
      console.error("Synchronisation Cardmarket échouée :", error);
    }
    if (continuous) {
      console.log(`Prochaine vérification Cardmarket dans ${hours} heure(s).`);
      await new Promise((resolve) => setTimeout(resolve, hours * 60 * 60 * 1000));
    }
  } while (continuous);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!process.argv.includes("--continuous")) await prisma.$disconnect();
  });
