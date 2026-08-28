ALTER TABLE "User"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN "trainerName" TEXT,
  ADD COLUMN "favoritePokemon" TEXT,
  ADD COLUMN "birthDate" TIMESTAMP(3),
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
