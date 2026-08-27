CREATE TABLE "MarketplaceMonitor" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "region" TEXT NOT NULL DEFAULT 'fr',
  "minimumPrice" DECIMAL(65,30),
  "maximumPrice" DECIMAL(65,30),
  "intervalSeconds" INTEGER NOT NULL DEFAULT 30,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastPolledAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceMonitor_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketplaceMonitor_active_region_idx" ON "MarketplaceMonitor"("active", "region");
