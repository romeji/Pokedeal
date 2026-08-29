import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { prisma } from "@/lib/database/prisma";
import { INACTIVE_OPPORTUNITY_STATUSES } from "@/lib/deals/visibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(60, Math.max(6, Number(url.searchParams.get("pageSize")) || 18));
  const keyword = url.searchParams.get("q")?.trim();
  const country = url.searchParams.get("country")?.trim();
  const condition = url.searchParams.get("condition")?.trim();
  const decision = url.searchParams.get("decision")?.trim();
  const scope = url.searchParams.get("scope")?.trim();
  const sort = url.searchParams.get("sort")?.trim();
  const minScore = Math.max(0, Number(url.searchParams.get("minScore")) || 0);
  const minRoi = Math.max(0, Number(url.searchParams.get("minRoi")) || 0);
  if (scope === "treated" && !user) return NextResponse.json({ page: 1, pageSize, total: 0, pages: 1, rows: [] });
  const since = url.searchParams.get("since");
  const where = {
    estimatedProfit: { gt: 0 },
    roi: { ...(minRoi ? { gte: minRoi } : {}), lte: 150 },
    score: { is: { ...(minScore ? { score: { gte: minScore } } : {}), confidenceScore: { gte: 0.72 }, riskScore: { lte: 0.65 } } },
    status: { notIn: [...INACTIVE_OPPORTUNITY_STATUSES] },
    listing: {
      status: "SCORED",
      ...(country ? { sellerCountry: { equals: country, mode: "insensitive" as const } } : {}),
      ...(condition ? { itemCondition: { contains: condition, mode: "insensitive" as const } } : {}),
      ...(since ? { firstSeenAt: { gte: new Date(since) } } : {}),
      matches: { some: { confidence: { gte: 0.82 } } },
      items: { none: { needsManualReview: true } },
      ...(keyword ? { OR: [
        { title: { contains: keyword, mode: "insensitive" as const } },
        { description: { contains: keyword, mode: "insensitive" as const } },
        { sellerCountry: { contains: keyword, mode: "insensitive" as const } },
        { itemCondition: { contains: keyword, mode: "insensitive" as const } },
      ] } : {}),
    },
    ...(user && scope === "treated" ? { decisions: { some: { userId: user.id, status: { in: ["VALIDATED", "BOUGHT", "IGNORED"] } } } } :
      user && decision ? { decisions: { some: { userId: user.id, status: decision } } } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.opportunity.count({ where }),
    prisma.opportunity.findMany({
      where,
      include: {
        listing: { include: { images: { take: 1 }, matches: { orderBy: { confidence: "desc" }, take: 1, include: { product: { select: { id: true, name: true } } } } } },
        score: true,
        decisions: user ? { where: { userId: user.id }, take: 1 } : false,
      },
      orderBy: sort === "roi" ? [{ roi: "desc" }, { updatedAt: "desc" }] : sort === "recent" ? [{ updatedAt: "desc" }] : [{ score: { score: "desc" } }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  if (total === 0 && scope !== "treated" && !decision) {
    const candidates = await prisma.listing.findMany({
      where: {
        status: { in: ["NEW", "ANALYZED", "REVIEW_REQUIRED", "NO_MATCH"] },
        images: { some: {} },
        ...(country ? { sellerCountry: { equals: country, mode: "insensitive" as const } } : {}),
        ...(condition ? { itemCondition: { contains: condition, mode: "insensitive" as const } } : {}),
        ...(keyword ? { OR: [
          { title: { contains: keyword, mode: "insensitive" as const } },
          { description: { contains: keyword, mode: "insensitive" as const } },
        ] } : {}),
      },
      include: { images: { take: 1 }, matches: { orderBy: { confidence: "desc" }, take: 1, include: { product: { select: { id: true, name: true } } } } },
      orderBy: { lastSeenAt: "desc" }, take: pageSize,
    });
    return NextResponse.json({
      page: 1, pageSize, total: candidates.length, pages: 1,
      rows: candidates.map((listing) => ({
        id: listing.id, candidate: true, title: listing.title, description: listing.description,
        url: listing.url, imageUrl: listing.images[0]?.url ?? null, price: Number(listing.price),
        marketValue: null, profit: null, roi: null, score: null, category: null,
        confidence: null, risk: null, listingStatus: listing.status,
        country: listing.sellerCountry, condition: listing.itemCondition,
        publishedAt: listing.publishedAt ?? listing.firstSeenAt, decision: "ANALYZING",
        productId: listing.matches[0]?.product.id ?? null,
        productName: listing.matches[0]?.product.name ?? null,
        matchConfidence: listing.matches[0]?.confidence ?? null,
      })),
    });
  }
  return NextResponse.json({
    page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)),
    rows: rows.map((row) => ({
      id: row.id,
      title: row.listing.title,
      description: row.listing.description,
      url: row.listing.url,
      imageUrl: row.listing.images[0]?.url ?? null,
      price: Number(row.purchasePrice),
      marketValue: row.marketValue === null ? null : Number(row.marketValue),
      profit: row.estimatedProfit === null ? null : Number(row.estimatedProfit),
      roi: row.roi,
      score: row.score?.score ?? null,
      category: row.score?.category ?? null,
      confidence: row.score?.confidenceScore ?? null,
      risk: row.score?.riskScore ?? null,
      listingStatus: row.listing.status,
      country: row.listing.sellerCountry,
      condition: row.listing.itemCondition,
      publishedAt: row.listing.publishedAt ?? row.listing.firstSeenAt,
      decision: Array.isArray(row.decisions) ? row.decisions[0]?.status ?? "TO_REVIEW" : "TO_REVIEW",
      productId: row.listing.matches[0]?.product.id ?? null,
      productName: row.listing.matches[0]?.product.name ?? null,
      matchConfidence: row.listing.matches[0]?.confidence ?? null,
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = await request.json() as { opportunityId?: string; status?: string; notes?: string };
  const allowed = ["TO_REVIEW", "VALIDATED", "BOUGHT", "IGNORED"];
  if (!body.opportunityId || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "Décision invalide" }, { status: 400 });
  const exists = await prisma.opportunity.findUnique({ where: { id: body.opportunityId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Deal introuvable" }, { status: 404 });
  const decision = await prisma.opportunityDecision.upsert({
    where: { userId_opportunityId: { userId: user.id, opportunityId: body.opportunityId } },
    create: { userId: user.id, opportunityId: body.opportunityId, status: body.status, notes: body.notes },
    update: { status: body.status, notes: body.notes },
  });
  return NextResponse.json(decision);
}
