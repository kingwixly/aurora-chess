-- Glicko-2.
--
-- Elo carries no notion of how confident it is, so a newcomer's rating crawls
-- and a returning player is judged on stale evidence. Glicko-2 adds a deviation
-- (uncertainty) and a volatility (consistency) to every rating.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deviation"        DOUBLE PRECISION NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS "volatility"       DOUBLE PRECISION NOT NULL DEFAULT 0.06,
  ADD COLUMN IF NOT EXISTS "puzzleDeviation"  DOUBLE PRECISION NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS "puzzleVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06;

ALTER TABLE "UserRating"
  ADD COLUMN IF NOT EXISTS "deviation"  DOUBLE PRECISION NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06;

-- Existing accounts sit on the old 1200-centred Elo scale. Glicko-2 is centred
-- on 1500, so ratings are shifted rather than reset: a 1600 Elo player is
-- stronger than average and should stay above the new centre, not be dropped
-- below it. Deviation is left at the default because their true uncertainty
-- under the new system is genuinely unknown.
UPDATE "User"        SET "rating" = "rating" + 300, "peakRating" = "peakRating" + 300;
UPDATE "UserRating"  SET "rating" = "rating" + 300, "peak" = "peak" + 300;
UPDATE "User"        SET "puzzleRating" = "puzzleRating" + 300, "puzzlePeak" = "puzzlePeak" + 300;

-- Column defaults follow the new centre for accounts created from here on.
ALTER TABLE "User"       ALTER COLUMN "rating" SET DEFAULT 1500;
ALTER TABLE "User"       ALTER COLUMN "peakRating" SET DEFAULT 1500;
ALTER TABLE "User"       ALTER COLUMN "puzzleRating" SET DEFAULT 1500;
ALTER TABLE "User"       ALTER COLUMN "puzzlePeak" SET DEFAULT 1500;
ALTER TABLE "UserRating" ALTER COLUMN "rating" SET DEFAULT 1500;
ALTER TABLE "UserRating" ALTER COLUMN "peak" SET DEFAULT 1500;

-- Puzzles keep their own difficulty ratings, also shifted to the new centre.
UPDATE "Puzzle" SET "rating" = "rating" + 300;
ALTER TABLE "Puzzle" ALTER COLUMN "rating" SET DEFAULT 1500;
