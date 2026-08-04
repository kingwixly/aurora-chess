-- CreateEnum
CREATE TYPE "ManualTitle" AS ENUM ('GM', 'WGM', 'IM', 'WIM', 'FM', 'WFM', 'CM', 'WCM', 'NM', 'WNM');

-- CreateEnum
CREATE TYPE "AutoTitle" AS ENUM ('AM', 'UM');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "peakRating" INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN "titleManual" "ManualTitle",
  ADD COLUMN "titleAuto" "AutoTitle",
  ADD COLUMN "titleAutoLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "titleBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "titleBanReason" TEXT;

-- Backfill peak rating.
-- There is no rating history table, so current rating is the best available
-- lower bound on any existing player's true peak. Players who once went above
-- their current rating are under-credited here; that is unavoidable and only
-- affects accounts that existed before this migration.
UPDATE "User" SET "peakRating" = "rating" WHERE "rating" > "peakRating";

-- Backfill auto titles from the peak rating just established.
UPDATE "User" SET "titleAuto" = 'AM' WHERE "peakRating" >= 2400;
UPDATE "User" SET "titleAuto" = 'UM' WHERE "peakRating" >= 2200 AND "peakRating" < 2400;

-- CreateIndex
CREATE INDEX "User_titleManual_idx" ON "User"("titleManual");

-- CreateIndex
CREATE INDEX "User_titleAuto_idx" ON "User"("titleAuto");
