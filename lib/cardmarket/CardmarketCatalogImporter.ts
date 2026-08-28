import { readFile } from "node:fs/promises";
import { Prisma, ProductKind } from "@prisma/client";
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

const CATEGORY_TO_KIND: Record<number, ProductKind> = {
  51: ProductKind.SINGLE,
  52: ProductKind.BOOSTER,
  53: ProductKind.DISPLAY,
  54: ProductKind.THEME_DECK,
  1013: ProductKind.TRAINER_KIT,
  1014: ProductKind.TIN,
  1015: ProductKind.BOX_SET,
  1016: ProductKind.ELITE_TRAINER_BOX,
  1017: ProductKind.COIN,
  1064: ProductKind.LOT,
  1083: ProductKind.BLISTER,
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

    const existing = await prisma.cardmarketProduct.findMany({
      where: { cardmarketProductId: { in: allProducts.map((product) => product.idProduct) } },
      select: {
        cardmarketProductId: true, cardmarketCategoryId: true, categoryName: true,
        kind: true, name: true, setId: true, cardmarketMetacardId: true,
        cardmarketDateAdded: true,
      },
    });
    const existingById = new Map(existing.map((product) => [product.cardmarketProductId, product]));
    const fresh: Prisma.CardmarketProductCreateManyInput[] = [];
    const changed: Prisma.CardmarketProductCreateManyInput[] = [];

    for (const product of allProducts) {
      const data: Prisma.CardmarketProductCreateManyInput = {
        cardmarketProductId: product.idProduct,
        cardmarketCategoryId: product.idCategory,
        categoryName: product.categoryName,
        kind: CATEGORY_TO_KIND[product.idCategory] ?? ProductKind.OTHER,
        name: product.name,
        setId: setIdByExpansion.get(product.idExpansion) ?? null,
        cardmarketMetacardId: product.idMetacard || null,
        cardmarketDateAdded: parseDateAdded(product.dateAdded),
      };
      const current = existingById.get(product.idProduct);
      if (!current) fresh.push(data);
      else if (!sameProduct(current, data)) changed.push(data);
    }

    const BATCH_SIZE = 2_000;
    for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
      await prisma.cardmarketProduct.createMany({ data: fresh.slice(i, i + BATCH_SIZE) });
      console.log(`Cardmarket : ${Math.min(i + BATCH_SIZE, fresh.length)}/${fresh.length} nouveaux produits importés.`);
    }
    const UPDATE_BATCH_SIZE = 200;
    for (let i = 0; i < changed.length; i += UPDATE_BATCH_SIZE) {
      const batch = changed.slice(i, i + UPDATE_BATCH_SIZE);
      await prisma.$transaction(batch.map(({ cardmarketProductId, ...data }) =>
        prisma.cardmarketProduct.update({ where: { cardmarketProductId }, data }),
      ));
      console.log(`Cardmarket : ${Math.min(i + UPDATE_BATCH_SIZE, changed.length)}/${changed.length} produits actualisés.`);
    }

    console.log(`Cardmarket : catalogue contrôlé (${fresh.length} ajout(s), ${changed.length} mise(s) à jour).`);
    return { imported: fresh.length + changed.length, setsCreated: setIdByExpansion.size };
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

function sameProduct(
  current: {
    cardmarketCategoryId: number; categoryName: string; kind: ProductKind; name: string;
    setId: string | null; cardmarketMetacardId: number | null; cardmarketDateAdded: Date | null;
  },
  next: Prisma.CardmarketProductCreateManyInput,
) {
  return current.cardmarketCategoryId === next.cardmarketCategoryId
    && current.categoryName === next.categoryName
    && current.kind === next.kind
    && current.name === next.name
    && current.setId === (next.setId ?? null)
    && current.cardmarketMetacardId === (next.cardmarketMetacardId ?? null)
    && current.cardmarketDateAdded?.getTime() === (next.cardmarketDateAdded instanceof Date ? next.cardmarketDateAdded.getTime() : undefined);
}
