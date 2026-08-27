import { config } from "dotenv";
import { prisma } from "@/lib/database/prisma";
import { getDatabaseDeployment } from "@/lib/database/deployment";

config({ quiet: true });

async function main() {
  const deployment = getDatabaseDeployment();
  if (deployment === "UNCONFIGURED") throw new Error("DATABASE_URL absente ou invalide");
  await prisma.$queryRaw`SELECT 1`;
  const [products, prices, listings] = await Promise.all([
    prisma.cardmarketProduct.count(),
    prisma.priceSnapshot.count(),
    prisma.listing.count(),
  ]);
  console.log(
    JSON.stringify({ ok: true, deployment, products, prices, listings }, null, 2)
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
