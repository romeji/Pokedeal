import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const favoritesOnly = url.searchParams.get("favorites") === "true";

  if (favoritesOnly && !isAdminRequest(request)) {
    return NextResponse.json({ error: "Connexion administrateur requise" }, { status: 401 });
  }
  if (!favoritesOnly && query.length < 2) return NextResponse.json([]);

  const products = await prisma.cardmarketProduct.findMany({
    where: {
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
      ...(favoritesOnly ? { watchlistEntries: { some: {} } } : {}),
    },
    select: {
      id: true,
      cardmarketProductId: true,
      name: true,
      kind: true,
      imageUrl: true,
      set: { select: { name: true, code: true } },
      priceSnapshots: {
        orderBy: { retrievedAt: "desc" },
        take: 1,
        select: {
          lowPrice: true,
          trendPrice: true,
          avg7Price: true,
          averagePrice: true,
          retrievedAt: true,
        },
      },
      watchlistEntries: { take: 1, select: { id: true } },
      productMatches: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          listing: {
            select: {
              images: { take: 1, select: { url: true } },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: 40,
  });

  return NextResponse.json(
    products.map((product) => {
      const price = product.priceSnapshots[0];
      return {
        id: product.id,
        cardmarketProductId: product.cardmarketProductId,
        name: product.name,
        kind: product.kind,
        setName: product.set?.name ?? null,
        setCode: product.set?.code ?? null,
        imageUrl:
          product.imageUrl ?? product.productMatches[0]?.listing.images[0]?.url ?? null,
        price: price
          ? {
              probable: Number(
                price.trendPrice ?? price.avg7Price ?? price.averagePrice ?? price.lowPrice ?? 0,
              ),
              low: price.lowPrice === null ? null : Number(price.lowPrice),
              trend: price.trendPrice === null ? null : Number(price.trendPrice),
              retrievedAt: price.retrievedAt,
            }
          : null,
        favorite: product.watchlistEntries.length > 0,
      };
    }),
  );
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Connexion administrateur requise" }, { status: 401 });
  }
  const body = (await request.json()) as { productId?: string; favorite?: boolean };
  if (!body.productId || typeof body.favorite !== "boolean") {
    return NextResponse.json({ error: "Produit ou état manquant" }, { status: 400 });
  }

  const product = await prisma.cardmarketProduct.findUnique({
    where: { id: body.productId },
    select: { id: true, name: true },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  if (body.favorite) {
    const existing = await prisma.watchlist.findFirst({ where: { productId: product.id } });
    if (!existing) {
      await prisma.watchlist.create({
        data: { productId: product.id, label: product.name },
      });
    }
  } else {
    await prisma.watchlist.deleteMany({ where: { productId: product.id } });
  }

  return NextResponse.json({ productId: product.id, favorite: body.favorite });
}
