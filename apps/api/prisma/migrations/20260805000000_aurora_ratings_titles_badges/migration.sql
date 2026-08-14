-- Finalised title set.
--
-- The previous migration created AutoTitle as (AM, UM) and ManualTitle with
-- NM/WNM. Postgres cannot remove enum values, so both types are rebuilt.
-- Existing values are remapped rather than dropped: AM and UM keep their
-- meaning as *labels* but swap thresholds, so no data mapping is needed here --
-- only the recompute at the end of this file changes who holds what.

-- ManualTitle: keep the national titles (NM/WNM) and add Aurora's own.
ALTER TABLE "User" ALTER COLUMN "titleManual" TYPE TEXT;
DROP TYPE "ManualTitle";
CREATE TYPE "ManualTitle" AS ENUM
  ('GM','WGM','IM','WIM','FM','WFM','CM','WCM','NM','WNM','HM','RM','OM');
ALTER TABLE "User"
  ALTER COLUMN "titleManual" TYPE "ManualTitle" USING "titleManual"::"ManualTitle";

-- AutoTitle: replace with the finalised set.
ALTER TABLE "User" ALTER COLUMN "titleAuto" TYPE TEXT;
DROP TYPE "AutoTitle";
CREATE TYPE "AutoTitle" AS ENUM ('UM','AM','BM','TdM','PM','EM','TM');
ALTER TABLE "User"
  ALTER COLUMN "titleAuto" TYPE "AutoTitle" USING "titleAuto"::"AutoTitle";

-- Per-time-control ratings. Replaces the single pooled rating as the source of
-- truth for competitive standing; User.rating is kept as the overall figure.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "modShield"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tournamentWins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "puzzleRating"   INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS "puzzlePeak"     INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS "puzzlesSolved"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "endgameWins"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "endgameGames"   INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "UserRating" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "timeControl" "TimeControl" NOT NULL,
    "rating"      INTEGER NOT NULL DEFAULT 1200,
    "peak"        INTEGER NOT NULL DEFAULT 1200,
    "games"       INTEGER NOT NULL DEFAULT 0,
    "wins"        INTEGER NOT NULL DEFAULT 0,
    "losses"      INTEGER NOT NULL DEFAULT 0,
    "draws"       INTEGER NOT NULL DEFAULT 0,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRating_userId_timeControl_key"
    ON "UserRating"("userId", "timeControl");
CREATE INDEX IF NOT EXISTS "UserRating_timeControl_rating_idx"
    ON "UserRating"("timeControl", "rating");

ALTER TABLE "UserRating" DROP CONSTRAINT IF EXISTS "UserRating_userId_fkey";
ALTER TABLE "UserRating"
    ADD CONSTRAINT "UserRating_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed every pool from the player's existing pooled rating. There is no
-- per-pool history to recover, so this avoids resetting established players to
-- 1200 at the cost of briefly overstating them in pools they have not played.
INSERT INTO "UserRating" ("id", "userId", "timeControl", "rating", "peak", "updatedAt")
SELECT u."id" || '_' || tc.name, u."id", tc.name::"TimeControl",
       u."rating", GREATEST(u."rating", u."peakRating"), CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (VALUES ('BULLET'),('BLITZ'),('RAPID'),('CLASSICAL'),('UNLIMITED')) AS tc(name)
ON CONFLICT ("userId", "timeControl") DO NOTHING;

-- FIDE ID, recorded when staff verify a title or arbiter credential.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fideId" TEXT;

-- Badges replace the flair system.
DROP TABLE IF EXISTS "UserFlair";
ALTER TABLE "User" DROP COLUMN IF EXISTS "activeFlair";

CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "badgeKey"  TEXT NOT NULL,
    "pinned"    BOOLEAN NOT NULL DEFAULT false,
    "pinOrder"  INTEGER,
    "evidence"  TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeKey_key"
    ON "UserBadge"("userId", "badgeKey");
CREATE INDEX IF NOT EXISTS "UserBadge_badgeKey_idx" ON "UserBadge"("badgeKey");
CREATE INDEX IF NOT EXISTS "UserBadge_userId_pinned_idx" ON "UserBadge"("userId", "pinned");

ALTER TABLE "UserBadge" DROP CONSTRAINT IF EXISTS "UserBadge_userId_fkey";
ALTER TABLE "UserBadge"
    ADD CONSTRAINT "UserBadge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Site-wide derived values. PM is a percentile rather than a fixed bar, so its
-- cutoff is recomputed over the whole population on a schedule.
CREATE TABLE IF NOT EXISTS "SiteStat" (
    "key"       TEXT NOT NULL,
    "value"     INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStat_pkey" PRIMARY KEY ("key")
);

-- Zero disables PM until enough solvers exist for a percentile to be meaningful.
INSERT INTO "SiteStat" ("key", "value", "updatedAt")
VALUES ('puzzle_percentile_cutoff', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Recompute automatic titles under the new thresholds. Only rows the automatic
-- system owns are touched: staff overrides (titleAutoLocked) are left alone.
UPDATE "User" u SET "titleAuto" = CASE
    WHEN u."peakRating" >= 2400 THEN 'UM'::"AutoTitle"
    WHEN u."peakRating" >= 2200 THEN 'AM'::"AutoTitle"
    WHEN COALESCE((SELECT MAX(r.peak) FROM "UserRating" r
                   WHERE r."userId" = u."id"
                     AND r."timeControl" IN ('BULLET','BLITZ')), 0) >= 2200
      THEN 'BM'::"AutoTitle"
    WHEN COALESCE((SELECT r.peak FROM "UserRating" r
                   WHERE r."userId" = u."id"
                     AND r."timeControl" = 'CLASSICAL'), 0) >= 2200
      THEN 'TdM'::"AutoTitle"
    WHEN u."tournamentWins" >= 3 THEN 'TM'::"AutoTitle"
    ELSE NULL
  END
WHERE u."titleAutoLocked" = false;
