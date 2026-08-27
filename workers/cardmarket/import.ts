import { CardmarketCatalogImporter } from "@/lib/cardmarket/CardmarketCatalogImporter";
import { CardmarketPriceImporter } from "@/lib/cardmarket/CardmarketPriceImporter";
import { runJob } from "@/lib/workers/runJob";

/**
 * Usage :
 *   npm run worker:catalog-import -- \
 *     ./data/products_singles_6.json ./data/products_nonsingles_6.json
 *   npm run worker:price-import -- ./data/price_guide_6.json
 *
 * Les fichiers Cardmarket (13-15 Mo) ne sont volontairement pas commités
 * dans le dépôt — place-les dans un dossier local (ex: ./data, ignoré par
 * git) et passe leur chemin en argument.
 */
async function main() {
  const [, , mode, ...args] = process.argv;

  if (mode === "catalog") {
    const [singlesPath, nonSinglesPath] = args;
    if (!singlesPath || !nonSinglesPath) {
      throw new Error(
        "Usage: tsx workers/cardmarket/import.ts catalog <products_singles.json> <products_nonsingles.json>"
      );
    }
    const result = await runJob("cardmarket-catalog-import", () =>
      new CardmarketCatalogImporter(singlesPath, nonSinglesPath).run()
    );
    console.log(`Catalogue importé : ${result.imported} produits, ${result.setsCreated} sets créés.`);
    return;
  }

  if (mode === "prices") {
    const [priceGuidePath] = args;
    if (!priceGuidePath) {
      throw new Error("Usage: tsx workers/cardmarket/import.ts prices <price_guide.json>");
    }
    const result = await runJob("cardmarket-price-import", () =>
      new CardmarketPriceImporter(priceGuidePath).run()
    );
    console.log(
      result.alreadyImported
        ? `Price guide déjà importé (${result.sourceCreatedAt}) — aucun doublon créé.`
        : `Price guide importé : ${result.snapshotsCreated} snapshots créés, ${result.skippedUnknownProduct} ignorés (produit inconnu du catalogue local — importer le catalogue d'abord).`
    );
    return;
  }

  throw new Error('Usage: tsx workers/cardmarket/import.ts <catalog|prices> ...');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
