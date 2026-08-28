import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { entryUnitValue } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json([], { status: 401 });
  const entries = await prisma.collectionEntry.findMany({
    where: { quantity: { gt: 0 }, binder: { userId: user.id } },
    orderBy: { updatedAt: "desc" },
    include: {
      binder: { select: { name: true } },
      product: { select: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 1, select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true } } } },
    },
  });
  return NextResponse.json(entries.map((entry) => ({
    id: entry.id,
    externalId: entry.externalId,
    productId: entry.productId,
    kind: entry.kind,
    name: entry.name,
    imageUrl: entry.imageUrl || (entry.productId ? `/api/products/${entry.productId}/image` : null),
    quantity: entry.quantity,
    value: entryUnitValue(entry) * entry.quantity,
    binderName: entry.binder.name,
  })));
}
