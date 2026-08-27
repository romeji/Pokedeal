import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getDatabaseDeployment } from "@/lib/database/deployment";

export const dynamic = "force-dynamic";

export async function GET() {
  const deployment = getDatabaseDeployment();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latestPrice = await prisma.priceSnapshot.findFirst({
      orderBy: { retrievedAt: "desc" },
      select: { retrievedAt: true },
    });
    return NextResponse.json(
      { ok: true, deployment, latestPriceAt: latestPrice?.retrievedAt ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, deployment, error: "DATABASE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
