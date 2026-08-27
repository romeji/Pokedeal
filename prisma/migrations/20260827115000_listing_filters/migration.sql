ALTER TABLE "Listing" ADD COLUMN "filterReason" TEXT,
ADD COLUMN "filterFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "ListingFilter" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "action" TEXT NOT NULL DEFAULT 'REJECT',
  "isRegex" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListingFilter_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ListingFilter_enabled_priority_idx" ON "ListingFilter"("enabled", "priority");
