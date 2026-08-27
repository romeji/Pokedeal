import { PriceEngine } from "@/lib/pricing/PriceEngine";

/**
 * Usage : npm run worker:price-check -- 719691
 * (719691 = "151 Elite Trainer Box" dans le catalogue fourni)
 */
async function main() {
  const [, , idArg] = process.argv;
  if (!idArg) {
    throw new Error("Usage: tsx workers/pricing/price-check.ts <cardmarketProductId>");
  }

  const engine = new PriceEngine();
  const price = await engine.getProductPrice(idArg);
  const range = await engine.getMarketValueRange(idArg);
  const evolution7 = await engine.getPriceEvolution(idArg, 7);

  console.log("Prix courant:", price);
  console.log("Fourchette (optimiste/probable/prudente):", range);
  console.log("Évolution 7 jours:", evolution7 ?? "pas assez d'historique encore");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
