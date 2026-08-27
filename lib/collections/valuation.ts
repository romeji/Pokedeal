import { prisma } from "../database/prisma";

type PricedEntry = {
  quantity: number;
  manualValue: { toString(): string } | null;
  product: {
    priceSnapshots: Array<{
      trendPrice: { toString(): string } | null;
      avg7Price: { toString(): string } | null;
      averagePrice: { toString(): string } | null;
      lowPrice: { toString(): string } | null;
    }>;
  } | null;
};

export function entryUnitValue(entry: PricedEntry) {
  if (entry.manualValue !== null) return Number(entry.manualValue);
  const price = entry.product?.priceSnapshots[0];
  return Number(price?.trendPrice ?? price?.avg7Price ?? price?.averagePrice ?? price?.lowPrice ?? 0);
}

export async function recordBinderSnapshot(binderId: string) {
  const entries = await prisma.collectionEntry.findMany({
    where: { binderId },
    select: {
      quantity: true,
      manualValue: true,
      product: {
        select: {
          priceSnapshots: {
            orderBy: { retrievedAt: "desc" },
            take: 1,
            select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true },
          },
        },
      },
    },
  });
  const value = entries.reduce((sum, entry) => sum + entryUnitValue(entry) * entry.quantity, 0);
  const itemCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  return prisma.collectionValueSnapshot.create({ data: { binderId, value, itemCount } });
}
