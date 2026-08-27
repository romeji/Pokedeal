import { ProductKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { prisma } from "@/lib/database/prisma";
import { assetImage, searchCards } from "@/lib/tcgdex/client";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const kind = url.searchParams.get("kind") === "ITEM" ? "ITEM" : "CARD";
  if (query.length < 2) return NextResponse.json([]);

  if (kind === "CARD") {
    const cards = await searchCards(query, "fr");
    return NextResponse.json(cards.slice(0, 36).map((card) => ({ ...card, imageUrl: assetImage(card.image) })));
  }

  const products = await prisma.cardmarketProduct.findMany({
    where: { kind: { not: ProductKind.SINGLE }, name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: 36,
    select: {
      id: true,
      name: true,
      kind: true,
      imageUrl: true,
      priceSnapshots: {
        orderBy: { retrievedAt: "desc" },
        take: 1,
        select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true },
      },
    },
  });
  return NextResponse.json(
    products.map((product) => {
      const price = product.priceSnapshots[0];
      return {
        id: product.id,
        name: product.name,
        kind: product.kind,
        imageUrl: product.imageUrl,
        price: Number(price?.trendPrice ?? price?.avg7Price ?? price?.averagePrice ?? price?.lowPrice ?? 0),
      };
    }),
  );
}
