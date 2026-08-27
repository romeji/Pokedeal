-- CreateEnum
CREATE TYPE "BinderType" AS ENUM ('GLOBAL', 'CUSTOM', 'MASTER_CARDS', 'MASTER_ITEMS');

-- CreateTable
CREATE TABLE "CollectorBinder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "BinderType" NOT NULL DEFAULT 'CUSTOM',
    "tcgdexSetId" TEXT,
    "tcgdexSetName" TEXT,
    "tcgdexSetNameEn" TEXT,
    "coverImageUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#38bdf8',
    "targetCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CollectorBinder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionEntry" (
    "id" TEXT NOT NULL,
    "binderId" TEXT NOT NULL,
    "productId" TEXT,
    "externalId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CARD',
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "setName" TEXT,
    "number" TEXT,
    "variant" TEXT NOT NULL DEFAULT 'normal',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "condition" TEXT NOT NULL DEFAULT 'NM',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DECIMAL(65,30),
    "manualValue" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CollectionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionValueSnapshot" (
    "id" TEXT NOT NULL,
    "binderId" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionValueSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollectorBinder_type_updatedAt_idx" ON "CollectorBinder"("type", "updatedAt");
CREATE UNIQUE INDEX "CollectionEntry_binderId_externalId_variant_condition_key" ON "CollectionEntry"("binderId", "externalId", "variant", "condition");
CREATE INDEX "CollectionEntry_binderId_kind_idx" ON "CollectionEntry"("binderId", "kind");
CREATE INDEX "CollectionEntry_productId_idx" ON "CollectionEntry"("productId");
CREATE INDEX "CollectionValueSnapshot_binderId_recordedAt_idx" ON "CollectionValueSnapshot"("binderId", "recordedAt");

ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "CollectorBinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionEntry" ADD CONSTRAINT "CollectionEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CardmarketProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollectionValueSnapshot" ADD CONSTRAINT "CollectionValueSnapshot_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "CollectorBinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
