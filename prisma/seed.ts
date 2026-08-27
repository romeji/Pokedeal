import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ quiet: true });

const prisma = new PrismaClient();

async function main() {
  const vintedRealtimeEnabled = process.env.VINTED_REALTIME_ENABLED === "true";
  // Section 24 — statuts de conformité initiaux.
  await prisma.providerComplianceReview.upsert({
    where: { provider: "vinted" },
    update: {
      accessMethod: vintedRealtimeEnabled ? "vintrack-catalog-bridge" : "external-automation-disabled",
      authorized: vintedRealtimeEnabled,
      status: vintedRealtimeEnabled ? "APPROVED" : "DISABLED",
    },
    create: {
      provider: "vinted",
      accessMethod: vintedRealtimeEnabled ? "vintrack-catalog-bridge" : "external-automation-disabled",
      officialApi: false,
      authorized: vintedRealtimeEnabled,
      status: vintedRealtimeEnabled ? "APPROVED" : "DISABLED",
      limitations:
        "Pont catalogue Vintrack limité, temporisé et journalisé. Aucun proxy, contournement CAPTCHA ou imitation TLS n'est inclus. Activation explicite par VINTED_REALTIME_ENABLED.",
    },
  });

  await prisma.providerComplianceReview.upsert({
    where: { provider: "cardmarket" },
    update: {},
    create: {
      provider: "cardmarket",
      accessMethod: "public-download-files",
      officialApi: false,
      authorized: true,
      status: "APPROVED",
      limitations:
        "Autorisation donnée par Jack pour un usage strictement personnel (alertes Discord privées, pas de republication publique/commerciale). La clause CGU sur l'accord écrit préalable pour 'the presentation of the trading cards and their respective prices' reste non clarifiée avec Cardmarket — à revoir avant tout usage public, partagé ou commercial. Voir COMPLIANCE-cardmarket.md.",
    },
  });

  await prisma.providerComplianceReview.upsert({
    where: { provider: "gemini" },
    update: {},
    create: {
      provider: "gemini",
      accessMethod: "official-api",
      officialApi: true,
      authorized: true,
      status: "APPROVED",
      limitations: "Free tier — surveiller les quotas.",
    },
  });

  await prisma.providerComplianceReview.upsert({
    where: { provider: "tcgdex" },
    update: {},
    create: {
      provider: "tcgdex",
      accessMethod: "public-open-source-api",
      officialApi: true,
      authorized: true,
      status: "APPROVED",
      limitations:
        "API TCGdex publique et base open source pour les métadonnées et visuels de collection. Les marques et illustrations Pokémon restent la propriété de leurs ayants droit. Cardmarket demeure la source de prix principale de PokéDeal.",
    },
  });

  // Section 4 — source de prix principale.
  await prisma.priceSource.upsert({
    where: { name: "cardmarket" },
    update: {},
    create: { name: "cardmarket", isPrimary: true },
  });

  // Sans règle active, le notifier bloque toutes les opportunités. Cette
  // règle reprend les seuils .env et peut ensuite être modifiée en base.
  const defaultAlertName = "Opportunités rentables par défaut";
  const defaultAlert = {
    minimumScore: Number(process.env.ALERT_MIN_SCORE ?? 70),
    minimumProfit: Number(process.env.ALERT_MIN_PROFIT_EUR ?? 15),
    minimumROI: Number(process.env.ALERT_MIN_ROI_PERCENT ?? 25),
    minimumConfidence: Number(process.env.ALERT_MIN_CONFIDENCE ?? 0.6),
    active: true,
  };
  const existingAlert = await prisma.alertRule.findFirst({
    where: { name: defaultAlertName },
  });
  if (existingAlert) {
    await prisma.alertRule.update({ where: { id: existingAlert.id }, data: defaultAlert });
  } else {
    await prisma.alertRule.create({ data: { name: defaultAlertName, ...defaultAlert } });
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
