-- CreateTable
CREATE TABLE "BotProfile" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "elo" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'beginner',
    "tier" TEXT NOT NULL DEFAULT 'custom',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "randomMoveChance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "blunderChance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "captureGreed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aggressionBias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDepth" INTEGER NOT NULL DEFAULT 3,
    "queenEarly" BOOLEAN NOT NULL DEFAULT false,
    "pawnPusher" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotProfile_botId_key" ON "BotProfile"("botId");

-- CreateIndex
CREATE INDEX "BotProfile_elo_idx" ON "BotProfile"("elo");

-- CreateIndex
CREATE INDEX "BotProfile_category_idx" ON "BotProfile"("category");
