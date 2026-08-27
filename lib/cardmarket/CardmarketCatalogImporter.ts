import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/database/prisma";
import { assertProviderApproved } from "@/lib/compliance/complianceGate";

/**
 * Importeur du catalogue Cardmarket (Product List), écrit contre le format
 * RÉEL des fichiers fournis par Jack (products_singles_6.json /
 * products_nonsingles_6.json — "6" = idGame Pokémon, tiré du nom de
 * fichier, absent du contenu JSON). Voir prisma/schema.prisma pour le
 * détail des constats faits sur ces fichiers.
 *
 * Format vérifié :
 * {
 *   "version": 1,
 *   "createdAt": "2026-08-26T12:20:28+0200",
 *   "products": [
 *     { "idProduct": 273532, "idCategory": 51, "categoryName": "Pokémon Single",
 *       "idExpansion": 1585, "idMetacard": 340471, "name": "Weedle [Multiply]",
 *       "dateAdded": "0000-00-00 00:00:00" },
 *     ...
 *   ]
 * }
 *
 * Idempotent : upsert par cardmarketProductId.
 */

interface RawCatalogFile {
  version: number;
  createdAt: string;
  products: RawCatalogProduct[];
}

interface RawCatalogProduct {
  idProduct: number;
  idCategory: number;
  categoryName: string;
  idExpansion: number;
  idMetacard: number;
  name: string;
  dateAdded: string; // peut être "0000-00-00 00:00:00" (pas de date connue)
}

const CATEGORY_TO_KIND: Record<number, string> = {
  51: "SINGLE",
  52: "BOOSTER",
  53: "DISPLAY",
  54: "THEME_DECK",
  1013: "TRAINER_KIT",
  1014: "TIN",
  1015: "BOX_SET",
  1016: "ELITE_TRAINER_BOX",
  1017: "COIN",
  1064: "LOT",
  1083: "BLISTER",
  // 1654 apparaît pour deux categoryName différents ("Pokémon Pokémon Sets"
  // et "PCG Set") dans les fichiers fournis — mappé en OTHER par prudence,
  // à affiner si Cardmarket clarifie ces deux usages du même idCategory.
};

function parseDateAdded(raw: string): Date | null {
  if (!raw || raw.startsWith("0000-00-00")) return null;
  const d = new Date(raw.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

export class CardmarketCatalogImporter {
  constructor(
    private readonly singlesFilePath: string,
    private readonly nonSinglesFilePath: string
  ) {}

  async run(): Promise<{ imported: number; setsCreated: number }> {
    await assertProviderApproved("cardmarket");

    const [singles, nonSingles] = await Promise.all([
      this.readCatalog(this.singlesFilePath),
      this.readCatalog(this.nonSinglesFilePath),
    ]);

    const allProducts = [...singles.products, ...nonSingles.products];

    const expansionIds = new Set(allProducts.map((p) => p.idExpansion));
    const setIdByExpansion = await this.ensureSets(expansionIds);

    let imported = 0;

    // Lots de 500 pour rester raisonnable en mémoire/DB — pas de service
    // payant, juste des upserts Prisma séquentiels.
    const BATCH_SIZE = 500;
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((p) =>
          prisma.cardmarketProduct.upsert({
            where: { cardmarketProductId: p.idProduct },
            update: {
              cardmarketCategoryId: p.idCategory,
              categoryName: p.categoryName,
              kind: (CATEGORY_TO_KIND[p.idCategory] ?? "OTHER") as never,
              name: p.name,
              setId: setIdByExpansion.get(p.idExpansion) ?? null,
              cardmarketMetacardId: p.idMetacard || null,
              cardmarketDateAdded: parseDateAdded(p.dateAdded),
            },
            create: {
              cardmarketProductId: p.idProduct,
              cardmarketCategoryId: p.idCategory,
              categoryName: p.categoryName,
              kind: (CATEGORY_TO_KIND[p.idCategory] ?? "OTHER") as never,
              name: p.name,
              setId: setIdByExpansion.get(p.idExpansion) ?? null,
              cardmarketMetacardId: p.idMetacard || null,
              cardmarketDateAdded: parseDateAdded(p.dateAdded),
            },
          })
        )
      );
      imported += batch.length;
    }

    return { imported, setsCreated: setIdByExpansion.size };
  }

  private async readCatalog(path: string): Promise<RawCatalogFile> {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as RawCatalogFile;
  }

  /**
   * Crée un PokemonSet "stub" par idExpansion rencontré — name/code
   * restent null tant que l'export "Expansions" (non fourni) n'est pas
   * importé séparément. Retourne idExpansion -> PokemonSet.id.
   */
  private async ensureSets(expansionIds: Set<number>): Promise<Map<number, string>> {
    const existing = await prisma.pokemonSet.findMany({
      where: { cardmarketExpansionId: { in: [...expansionIds] } },
      select: { id: true, cardmarketExpansionId: true },
    });
    const map = new Map(existing.map((s) => [s.cardmarketExpansionId, s.id]));

    const missing = [...expansionIds].filter((id) => !map.has(id));
    for (const idExpansion of missing) {
      const created = await prisma.pokemonSet.upsert({
        where: { cardmarketExpansionId: idExpansion },
        update: {},
        create: { cardmarketExpansionId: idExpansion },
      });
      map.set(idExpansion, created.id);
    }
    return map;
  }
}
