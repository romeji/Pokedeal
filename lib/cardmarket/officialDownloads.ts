/**
 * Liens publiés sur les pages officielles Cardmarket Pokémon :
 * https://www.cardmarket.com/en/Pokemon/Data/Price-Guide
 * https://www.cardmarket.com/en/Pokemon/Data/Product-List
 *
 * Le numéro 6 est l'identifiant public du jeu Pokémon chez Cardmarket.
 * Il ne s'agit pas d'un endpoint API privé ou reconstitué.
 */
export const CARDMARKET_OFFICIAL_DOWNLOADS = {
  singles: {
    fileName: "products_singles_6.json",
    url: "https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_6.json",
    rootArray: "products",
  },
  nonSingles: {
    fileName: "products_nonsingles_6.json",
    url: "https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json",
    rootArray: "products",
  },
  prices: {
    fileName: "price_guide_6.json",
    url: "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json",
    rootArray: "priceGuides",
  },
} as const;

export type CardmarketDownloadKey = keyof typeof CARDMARKET_OFFICIAL_DOWNLOADS;

export function assertOfficialCardmarketDownloadUrl(rawUrl: string): void {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== "downloads.s3.cardmarket.com") {
    throw new Error(`Téléchargement Cardmarket refusé : hôte non officiel (${url.hostname})`);
  }
}

export function validateCardmarketPayload(
  payload: unknown,
  expectedRootArray: "products" | "priceGuides"
): { createdAt: string; entries: number } {
  if (!payload || typeof payload !== "object") {
    throw new Error("Fichier Cardmarket invalide : objet JSON attendu");
  }
  const record = payload as Record<string, unknown>;
  if (record.version !== 1 || typeof record.createdAt !== "string") {
    throw new Error("Fichier Cardmarket invalide : version/createdAt absent");
  }
  if (Number.isNaN(new Date(record.createdAt).getTime())) {
    throw new Error(`Fichier Cardmarket invalide : date ${record.createdAt}`);
  }
  const entries = record[expectedRootArray];
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`Fichier Cardmarket invalide : ${expectedRootArray} vide ou absent`);
  }
  return { createdAt: record.createdAt, entries: entries.length };
}
