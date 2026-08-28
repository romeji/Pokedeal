import { readFile } from "node:fs/promises";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { assertProviderApproved } from "@/lib/compliance/complianceGate";

/**
 * Importeur du Price Guide Cardmarket, écrit contre le format RÉEL du
 * fichier fourni par Jack (price_guide_6.json).
 *
 * Format vérifié :
 * {
 *   "version": 1,
 *   "createdAt": "2026-08-26T12:20:28+0200",
 *   "priceGuides": [
 *     { "idProduct": 273532, "idCategory": 51,
 *       "avg": 0.16, "low": 0.02, "trend": 0.16,
 *       "avg1": 0.1, "avg7": 0.16, "avg30": 0.14,
 *       "avg-holo": 0.2, "low-holo": 0.1, "trend-holo": 0.65,
 *       "avg1-holo": 0.2, "avg7-holo": 0.47, "avg30-holo": 0.58 },
 *     ...
 *   ]
 * }
 *
 * Constat important (voir COMPLIANCE-cardmarket.md et le schéma) : aucun
 * champ langue. Un seul prix par idProduct (+ variante holo pour les
 * singles) — pas de prix séparé FR vs JP au niveau de cet export.
 *
 * Idempotent au sens "rejouable sans dupliquer" : un import donné crée un
 * nouveau PriceSnapshot (l'historique est voulu, section 4), mais ne
 * touche jamais les snapshots précédents.
 */

interface RawPriceGuideFile {
  version: number;
  createdAt: string;
  priceGuides: RawPriceGuideEntry[];
}

interface RawPriceGuideEntry {
  idProduct: number;
  idCategory: number;
  avg: number | null;
  low: number | null;
  trend: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  "avg-holo": number | null;
  "low-holo": number | null;
  "trend-holo": number | null;
  "avg1-holo": number | null;
  "avg7-holo": number | null;
  "avg30-holo": number | null;
}

export class CardmarketPriceImporter {
  constructor(private readonly priceGuideFilePath: string) {}

  async run(): Promise<{
    snapshotsCreated: number;
    skippedUnknownProduct: number;
    sourceCreatedAt: string;
    alreadyImported: boolean;
  }> {
    await assertProviderApproved("cardmarket");

    const raw = await readFile(this.priceGuideFilePath, "utf-8");
    const file = JSON.parse(raw) as RawPriceGuideFile;
    const sourceCreatedAt = new Date(file.createdAt);
    if (Number.isNaN(sourceCreatedAt.getTime())) {
      throw new Error(`Date Cardmarket invalide : ${file.createdAt}`);
    }

    const source = await prisma.priceSource.upsert({
      where: { name: "cardmarket" },
      update: {},
      create: { name: "cardmarket", isPrimary: true },
    });

    // Tous les produits d'un même fichier portent la date de publication du
    // fichier. Cela rend l'import quotidien réellement idempotent, y compris
    // après un redémarrage ou une perte du manifeste local de téléchargement.
    const cardmarketProductIds = file.priceGuides.map((p) => p.idProduct);
    const knownProducts = await prisma.cardmarketProduct.findMany({
      where: { cardmarketProductId: { in: cardmarketProductIds } },
      select: { id: true, cardmarketProductId: true },
    });
    const productIdByCardmarketId = new Map(
      knownProducts.map((p) => [p.cardmarketProductId, p.id])
    );

    const existingCount = await prisma.priceSnapshot.count({
      where: { sourceId: source.id, retrievedAt: sourceCreatedAt },
    });
    if (existingCount === knownProducts.length && existingCount > 0) {
      return {
        snapshotsCreated: 0,
        skippedUnknownProduct: file.priceGuides.length - knownProducts.length,
        sourceCreatedAt: sourceCreatedAt.toISOString(),
        alreadyImported: true,
      };
    }
    // Une interruption peut laisser quelques lots de la journée déjà écrits.
    // Ils sont supprimés puis recréés pour garantir une journée complète.
    if (existingCount > 0) {
      await prisma.priceSnapshot.deleteMany({
        where: { sourceId: source.id, retrievedAt: sourceCreatedAt },
      });
    }

    let snapshotsCreated = 0;
    let skippedUnknownProduct = 0;

    const BATCH_SIZE = 2_000;
    for (let i = 0; i < file.priceGuides.length; i += BATCH_SIZE) {
      const batch = file.priceGuides.slice(i, i + BATCH_SIZE);
      const creates: Prisma.PriceSnapshotCreateManyInput[] = [];
      for (const entry of batch) {
        const productId = productIdByCardmarketId.get(entry.idProduct);
        if (!productId) {
          // Le produit n'est pas (encore) dans notre catalogue local —
          // on ne devine jamais ses attributs, on saute simplement.
          skippedUnknownProduct++;
          continue;
        }
        creates.push({
          productId,
          sourceId: source.id,
          currency: "EUR",
          lowPrice: entry.low,
          averagePrice: entry.avg,
          trendPrice: entry.trend,
          avg1Price: entry.avg1,
          avg7Price: entry.avg7,
          avg30Price: entry.avg30,
          lowPriceHolo: entry["low-holo"],
          averagePriceHolo: entry["avg-holo"],
          trendPriceHolo: entry["trend-holo"],
          avg1PriceHolo: entry["avg1-holo"],
          avg7PriceHolo: entry["avg7-holo"],
          avg30PriceHolo: entry["avg30-holo"],
          retrievedAt: sourceCreatedAt,
        });
      }
      if (creates.length > 0) {
        const result = await prisma.priceSnapshot.createMany({ data: creates });
        snapshotsCreated += result.count;
      }
      console.log(`Cardmarket : ${Math.min(i + batch.length, file.priceGuides.length)}/${file.priceGuides.length} cotations traitées.`);
    }

    return {
      snapshotsCreated,
      skippedUnknownProduct,
      sourceCreatedAt: sourceCreatedAt.toISOString(),
      alreadyImported: false,
    };
  }
}
