import { BinderType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { recordCollectionActivity } from "@/lib/collections/activity";
import { recordBinderSnapshot } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

const entryFields = {
  externalId: true, kind: true, name: true, imageUrl: true, setName: true, number: true,
  variant: true, language: true, condition: true, quantity: true, purchasePrice: true,
  manualValue: true, notes: true, grader: true, grade: true, certification: true,
  page: true, row: true, column: true,
  product: { select: { cardmarketProductId: true } },
} as const;

function csvCell(value: unknown) {
  const string = value === null || value === undefined ? "" : String(value);
  return `"${string.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const binders = await prisma.collectorBinder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { entries: { select: entryFields, orderBy: { createdAt: "asc" } } },
  });
  const format = new URL(request.url).searchParams.get("format");
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const headers = ["classeur", "type", "nom", "série", "numéro", "nature", "variante", "langue", "état", "quantité", "prix_achat", "valeur_manuelle", "grader", "note_grade", "certification", "page", "ligne", "colonne", "notes"];
    const rows = binders.flatMap((binder) => binder.entries.map((entry) => [
      binder.name, binder.type, entry.name, entry.setName, entry.number, entry.kind, entry.variant,
      entry.language, entry.condition, entry.quantity, entry.purchasePrice, entry.manualValue,
      entry.grader, entry.grade, entry.certification, entry.page, entry.row, entry.column, entry.notes,
    ].map(csvCell).join(",")));
    return new Response([headers.map(csvCell).join(","), ...rows].join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="pokedeal-collection-${stamp}.csv"` },
    });
  }
  const payload = {
    format: "pokedeal-collection", version: 1, exportedAt: new Date().toISOString(),
    binders: binders.map(({ entries, ...binder }) => ({
      ...binder,
      entries: entries.map(({ product, purchasePrice, manualValue, ...entry }) => ({
        ...entry,
        purchasePrice: purchasePrice === null ? null : Number(purchasePrice),
        manualValue: manualValue === null ? null : Number(manualValue),
        cardmarketProductId: product?.cardmarketProductId ?? null,
      })),
    })),
  };
  return NextResponse.json(payload, {
    headers: { "Content-Disposition": `attachment; filename="pokedeal-backup-${stamp}.json"` },
  });
}

type BackupEntry = Record<string, unknown> & { name?: string; externalId?: string; cardmarketProductId?: number | null };
type BackupBinder = Record<string, unknown> & { name?: string; type?: BinderType; entries?: BackupEntry[] };

function optionalDecimal(value: unknown) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? null : new Prisma.Decimal(Math.max(0, parsed));
}

function optionalInt(value: unknown, maximum = 9999) {
  const parsed = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? null : Math.max(1, Math.min(maximum, Math.round(parsed)));
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const backup = (await request.json()) as { format?: string; version?: number; binders?: BackupBinder[] };
  if (backup.format !== "pokedeal-collection" || backup.version !== 1 || !Array.isArray(backup.binders) || backup.binders.length > 100) {
    return NextResponse.json({ error: "Sauvegarde PokéDeal invalide" }, { status: 400 });
  }
  let restoredBinders = 0;
  let restoredEntries = 0;
  for (const rawBinder of backup.binders) {
    if (!rawBinder.name || !Object.values(BinderType).includes(rawBinder.type as BinderType)) continue;
    const binder = await prisma.collectorBinder.create({
      data: {
        userId: user.id,
        name: `${String(rawBinder.name).slice(0, 120)} · restauré`,
        description: rawBinder.description ? String(rawBinder.description).slice(0, 500) : null,
        type: rawBinder.type as BinderType,
        tcgdexSetId: rawBinder.tcgdexSetId ? String(rawBinder.tcgdexSetId) : null,
        tcgdexSetName: rawBinder.tcgdexSetName ? String(rawBinder.tcgdexSetName) : null,
        tcgdexSetNameEn: rawBinder.tcgdexSetNameEn ? String(rawBinder.tcgdexSetNameEn) : null,
        coverImageUrl: rawBinder.coverImageUrl ? String(rawBinder.coverImageUrl) : null,
        accentColor: /^#[0-9a-f]{6}$/i.test(String(rawBinder.accentColor ?? "")) ? String(rawBinder.accentColor) : "#38bdf8",
        targetCount: optionalInt(rawBinder.targetCount, 100000),
      },
    });
    restoredBinders++;
    for (const raw of Array.isArray(rawBinder.entries) ? rawBinder.entries.slice(0, Math.max(0, 10000 - restoredEntries)) : []) {
      if (!raw.name || !raw.externalId) continue;
      const product = raw.cardmarketProductId ? await prisma.cardmarketProduct.findUnique({ where: { cardmarketProductId: Number(raw.cardmarketProductId) }, select: { id: true } }) : null;
      await prisma.collectionEntry.create({ data: {
        binderId: binder.id, productId: product?.id ?? null,
        externalId: String(raw.externalId).slice(0, 200), kind: String(raw.kind ?? "CARD").slice(0, 16), name: String(raw.name).slice(0, 240),
        imageUrl: raw.imageUrl ? String(raw.imageUrl) : null, setName: raw.setName ? String(raw.setName).slice(0, 160) : null,
        number: raw.number ? String(raw.number).slice(0, 32) : null, variant: String(raw.variant ?? "normal").slice(0, 32),
        language: String(raw.language ?? "fr").slice(0, 12), condition: String(raw.condition ?? "NM").slice(0, 16),
        quantity: Math.max(1, Math.min(999, Math.round(Number(raw.quantity) || 1))),
        purchasePrice: optionalDecimal(raw.purchasePrice),
        manualValue: optionalDecimal(raw.manualValue),
        notes: raw.notes ? String(raw.notes).slice(0, 1000) : null, grader: raw.grader ? String(raw.grader).slice(0, 32) : null,
        grade: raw.grade ? String(raw.grade).slice(0, 16) : null, certification: raw.certification ? String(raw.certification).slice(0, 64) : null,
        page: optionalInt(raw.page), row: optionalInt(raw.row, 99), column: optionalInt(raw.column, 99),
      } });
      restoredEntries++;
    }
    await recordCollectionActivity(binder.id, "BACKUP_RESTORED", binder.name, { entries: restoredEntries });
    await recordBinderSnapshot(binder.id);
  }
  return NextResponse.json({ restoredBinders, restoredEntries }, { status: 201 });
}
