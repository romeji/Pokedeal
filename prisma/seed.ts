import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ quiet: true });

const prisma = new PrismaClient();

async function main() {
  // Section 24 — statuts de conformité initiaux.
  await prisma.providerComplianceReview.upsert({
    where: { provider: "vinted" },
    update: {},
    create: {
      provider: "vinted",
      accessMethod: "external-automation-forbidden-by-terms",
      officialApi: false,
      authorized: false,
      status: "DISABLED",
      limitations:
        "Les CGU Vinted consultées le 2026-08-27 interdisent les bots, le scraping, le crawling et l'extraction de données sans autorisation de Vinted. Le provider réel reste désactivé; utiliser uniquement le mock tant qu'une autorisation écrite ou une API officielle adaptée n'existe pas.",
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

  // Section 4 — source de prix principale.
  await prisma.priceSource.upsert({
    where: { name: "cardmarket" },
    update: {},
    create: { name: "cardmarket", isPrimary: true },
  });

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
