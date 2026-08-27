-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('SINGLE', 'BOOSTER', 'DISPLAY', 'ELITE_TRAINER_BOX', 'THEME_DECK', 'BOX_SET', 'TIN', 'BLISTER', 'COIN', 'TRAINER_KIT', 'LOT', 'OTHER');

-- CreateTable
CREATE TABLE "PokemonSet" (
    "id" TEXT NOT NULL,
    "cardmarketExpansionId" INTEGER NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardmarketProduct" (
    "id" TEXT NOT NULL,
    "cardmarketProductId" INTEGER NOT NULL,
    "cardmarketCategoryId" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "kind" "ProductKind" NOT NULL,
    "name" TEXT NOT NULL,
    "setId" TEXT,
    "cardmarketMetacardId" INTEGER,
    "cardmarketDateAdded" TIMESTAMP(3),
    "language" TEXT,
    "number" TEXT,
    "rarity" TEXT,
    "edition" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardmarketProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "lowPrice" DECIMAL(65,30),
    "averagePrice" DECIMAL(65,30),
    "trendPrice" DECIMAL(65,30),
    "avg1Price" DECIMAL(65,30),
    "avg7Price" DECIMAL(65,30),
    "avg30Price" DECIMAL(65,30),
    "lowPriceHolo" DECIMAL(65,30),
    "averagePriceHolo" DECIMAL(65,30),
    "trendPriceHolo" DECIMAL(65,30),
    "avg1PriceHolo" DECIMAL(65,30),
    "avg7PriceHolo" DECIMAL(65,30),
    "avg30PriceHolo" DECIMAL(65,30),
    "sampleSize" INTEGER,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL DEFAULT 'vinted',
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "listingHash" TEXT,
    "titleHash" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageHash" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "visionResultRaw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingItem" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "imageQualityScore" DOUBLE PRECISION,
    "counterfeitRiskScore" DOUBLE PRECISION,
    "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "marketValue" DECIMAL(65,30),
    "conservativeMarketValue" DECIMAL(65,30),
    "probableMarketValue" DECIMAL(65,30),
    "purchasePrice" DECIMAL(65,30) NOT NULL,
    "shippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "platformFees" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "resaleFees" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "riskMargin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estimatedProfit" DECIMAL(65,30),
    "roi" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityScore" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "liquidityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "label" TEXT NOT NULL,
    "maxPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minimumScore" INTEGER,
    "minimumProfit" DECIMAL(65,30),
    "minimumROI" DOUBLE PRECISION,
    "maximumPrice" DECIMAL(65,30),
    "minimumConfidence" DOUBLE PRECISION,
    "maximumRisk" DOUBLE PRECISION,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordNotification" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'discord',
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "success" BOOLEAN NOT NULL,
    "error" TEXT,

    CONSTRAINT "DiscordNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderComplianceReview" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessMethod" TEXT NOT NULL,
    "officialApi" BOOLEAN NOT NULL DEFAULT false,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "termsReviewedAt" TIMESTAMP(3),
    "limitations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderComplianceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerRun" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" JSONB,

    CONSTRAINT "WorkerRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PokemonSet_cardmarketExpansionId_key" ON "PokemonSet"("cardmarketExpansionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardmarketProduct_cardmarketProductId_key" ON "CardmarketProduct"("cardmarketProductId");

-- CreateIndex
CREATE INDEX "CardmarketProduct_cardmarketCategoryId_idx" ON "CardmarketProduct"("cardmarketCategoryId");

-- CreateIndex
CREATE INDEX "CardmarketProduct_setId_idx" ON "CardmarketProduct"("setId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSource_name_key" ON "PriceSource"("name");

-- CreateIndex
CREATE INDEX "PriceSnapshot_productId_retrievedAt_idx" ON "PriceSnapshot"("productId", "retrievedAt");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_marketplace_externalId_key" ON "Listing"("marketplace", "externalId");

-- CreateIndex
CREATE INDEX "ListingImage_imageHash_idx" ON "ListingImage"("imageHash");

-- CreateIndex
CREATE INDEX "ProductMatch_listingId_idx" ON "ProductMatch"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_listingId_key" ON "Opportunity"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityScore_opportunityId_key" ON "OpportunityScore"("opportunityId");

-- CreateIndex
CREATE INDEX "DiscordNotification_channel_success_idx" ON "DiscordNotification"("channel", "success");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordNotification_opportunityId_channel_key" ON "DiscordNotification"("opportunityId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderComplianceReview_provider_key" ON "ProviderComplianceReview"("provider");

-- CreateIndex
CREATE INDEX "WorkerRun_jobName_startedAt_idx" ON "WorkerRun"("jobName", "startedAt");

-- AddForeignKey
ALTER TABLE "CardmarketProduct" ADD CONSTRAINT "CardmarketProduct_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CardmarketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "PriceSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingItem" ADD CONSTRAINT "ListingItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CardmarketProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityScore" ADD CONSTRAINT "OpportunityScore_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CardmarketProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordNotification" ADD CONSTRAINT "DiscordNotification_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
