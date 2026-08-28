ALTER TABLE "CollectionEntry"
ADD COLUMN "grader" TEXT,
ADD COLUMN "grade" TEXT,
ADD COLUMN "certification" TEXT,
ADD COLUMN "page" INTEGER,
ADD COLUMN "row" INTEGER,
ADD COLUMN "column" INTEGER;

CREATE TABLE "CollectionActivity" (
  "id" TEXT NOT NULL,
  "binderId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entryName" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollectionActivity_binderId_createdAt_idx" ON "CollectionActivity"("binderId", "createdAt");
ALTER TABLE "CollectionActivity" ADD CONSTRAINT "CollectionActivity_binderId_fkey"
FOREIGN KEY ("binderId") REFERENCES "CollectorBinder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
