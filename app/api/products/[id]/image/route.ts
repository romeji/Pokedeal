import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { assetImage, searchCardsDetailed } from "@/lib/tcgdex/client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.cardmarketProduct.findUnique({
    where: { id },
    include: { productMatches: { orderBy: [{ confidence: "desc" }, { createdAt: "desc" }], take: 1, include: { listing: { include: { images: { take: 1 } } } } } },
  });
  if (!product) return NextResponse.redirect(new URL("/icon.svg", request.url));
  let imageUrl = product.imageUrl ?? product.productMatches[0]?.listing.images[0]?.url ?? null;
  if (!imageUrl && product.kind === "SINGLE") {
    const cards = await searchCardsDetailed(product.name.replace(/\s*\[.*$/, ""), 12).catch(() => []);
    imageUrl = assetImage(cards.find((card) => card.pricing?.cardmarket?.idProduct === product.cardmarketProductId)?.image);
  }
  if (imageUrl && imageUrl !== product.imageUrl) await prisma.cardmarketProduct.update({ where: { id }, data: { imageUrl } }).catch(() => undefined);
  const response = NextResponse.redirect(imageUrl || new URL("/icon.svg", request.url));
  response.headers.set("Cache-Control", imageUrl ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=1800");
  return response;
}
