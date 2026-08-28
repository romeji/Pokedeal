import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { prisma } from "@/lib/database/prisma";
import { assetImage, searchCardsDetailed } from "@/lib/tcgdex/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const favoritesOnly = url.searchParams.get("favorites") === "true";

  const user = await getRequestUser(request);
  if (favoritesOnly && !user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  if (!favoritesOnly && query.length < 2) return NextResponse.json([]);

  const searchTokens = normalizeProductQuery(query);
  const cardDetails = !favoritesOnly && query ? await searchCardsDetailed(query, 24).catch(() => []) : [];
  const tcgdexByProductId = new Map(cardDetails.flatMap((card) => {
    const id = card.pricing?.cardmarket?.idProduct;
    return id ? [[id, card] as const] : [];
  }));
  const cardmarketIds = [...tcgdexByProductId.keys()];

  const productSelect = {
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
      watchlistEntries: { where: { userId: user?.id ?? "__anonymous__" }, take: 1, select: { id: true } },
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
  } satisfies Prisma.CardmarketProductSelect;
  const favoriteWhere = favoritesOnly && user ? { watchlistEntries: { some: { userId: user.id } } } : {};
  const [exactProducts, namedProducts] = await Promise.all([
    cardmarketIds.length ? prisma.cardmarketProduct.findMany({
      where: { cardmarketProductId: { in: cardmarketIds }, ...favoriteWhere },
      select: productSelect,
      take: 40,
    }) : [],
    prisma.cardmarketProduct.findMany({
      where: {
        ...(query && searchTokens.length ? { AND: searchTokens.map((token) => ({ name: { contains: token, mode: "insensitive" as const } })) } : {}),
        ...favoriteWhere,
      },
      select: productSelect,
      orderBy: { name: "asc" },
      take: 60,
    }),
  ]);
  const products = [...new Map([...exactProducts, ...namedProducts].map((product) => [product.id, product])).values()];

  return NextResponse.json(
    products.map((product) => {
      const price = product.priceSnapshots[0];
      const tcgdex = tcgdexByProductId.get(product.cardmarketProductId);
      return {
        id: product.id,
        cardmarketProductId: product.cardmarketProductId,
        name: tcgdex?.name ?? product.name,
        kind: product.kind,
        setName: tcgdex?.set.name ?? product.set?.name ?? null,
        setCode: product.set?.code ?? null,
        imageUrl:
          assetImage(tcgdex?.image) ?? product.imageUrl ?? product.productMatches[0]?.listing.images[0]?.url ?? null,
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
        priceSource: price ? "Cardmarket Price Guide" : null,
      };
    }).sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl))).slice(0, 40),
  );
}

function normalizeProductQuery(query: string) {
  const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
  const expanded = normalized.replace(/\betb\b/g, "elite trainer box").replace(/\bdracaufeu\b/g, "charizard");
  const noise = new Set(["pokemon", "tcg", "set", "bloc", "block", "serie", "carte", "cartes", "card", "cards", "fr", "francais", "francaise", "francaises", "anglais", "english", "en", "japonais", "japonaise", "jp"]);
  return [...new Set(expanded.split(/\s+/).filter((token) => token.length > 1 && !noise.has(token)))];
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
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
    await prisma.watchlist.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      create: { userId: user.id, productId: product.id, label: product.name },
      update: { label: product.name },
    });
  } else {
    await prisma.watchlist.deleteMany({ where: { userId: user.id, productId: product.id } });
  }

  return NextResponse.json({ productId: product.id, favorite: body.favorite });
}
