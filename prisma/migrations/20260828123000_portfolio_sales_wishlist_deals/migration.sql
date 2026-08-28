ALTER TABLE "Listing" ADD COLUMN "sellerCountry" TEXT;
ALTER TABLE "Listing" ADD COLUMN "itemCondition" TEXT;
ALTER TABLE "Listing" ADD COLUMN "publishedAt" TIMESTAMP(3);

ALTER TABLE "Watchlist" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Watchlist" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ITEM';
ALTER TABLE "Watchlist" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Watchlist" ADD COLUMN "setName" TEXT;
UPDATE "Watchlist" SET "externalId" = 'cardmarket:' || "productId" WHERE "externalId" IS NULL AND "productId" IS NOT NULL;
CREATE UNIQUE INDEX "Watchlist_userId_externalId_key" ON "Watchlist"("userId", "externalId");

CREATE TABLE "OpportunityDecision" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TO_REVIEW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpportunityDecision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OpportunityDecision_userId_opportunityId_key" ON "OpportunityDecision"("userId", "opportunityId");
CREATE INDEX "OpportunityDecision_userId_status_updatedAt_idx" ON "OpportunityDecision"("userId", "status", "updatedAt");
ALTER TABLE "OpportunityDecision" ADD CONSTRAINT "OpportunityDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityDecision" ADD CONSTRAINT "OpportunityDecision_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CollectionSale" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "entryId" TEXT,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageUrl" TEXT,
  "setName" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitSalePrice" DECIMAL(65,30) NOT NULL,
  "fees" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "unitCostBasis" DECIMAL(65,30),
  "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionSale_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CollectionSale_userId_soldAt_idx" ON "CollectionSale"("userId", "soldAt");
CREATE INDEX "CollectionSale_entryId_idx" ON "CollectionSale"("entryId");
ALTER TABLE "CollectionSale" ADD CONSTRAINT "CollectionSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionSale" ADD CONSTRAINT "CollectionSale_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CollectionEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
