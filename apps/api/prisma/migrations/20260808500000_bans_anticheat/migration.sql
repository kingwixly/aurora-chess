CREATE TYPE "BanScope" AS ENUM ('ACCOUNT', 'IP', 'DEVICE');

-- Exemption from automated detection. Titled players trip accuracy heuristics
-- by playing well, which is the whole point of a title.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "cheatExempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deviceIds"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "knownIps"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Anyone already holding a federation title is exempt by default.
UPDATE "User" SET "cheatExempt" = true
WHERE "titleManual" IN ('GM','WGM','IM','WIM','FM','WFM','CM','WCM','NM','WNM');

CREATE TABLE IF NOT EXISTS "Ban" (
    "id"        TEXT NOT NULL,
    "scope"     "BanScope" NOT NULL,
    "userId"    TEXT,
    "ip"        TEXT,
    "deviceId"  TEXT,
    "reason"    TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "liftedAt"  TIMESTAMP(3),
    "liftedBy"  TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Ban_scope_ip_idx"       ON "Ban"("scope", "ip");
CREATE INDEX IF NOT EXISTS "Ban_scope_deviceId_idx" ON "Ban"("scope", "deviceId");
CREATE INDEX IF NOT EXISTS "Ban_userId_idx"         ON "Ban"("userId");
CREATE INDEX IF NOT EXISTS "Ban_expiresAt_idx"      ON "Ban"("expiresAt");

ALTER TABLE "Ban" DROP CONSTRAINT IF EXISTS "Ban_userId_fkey";
ALTER TABLE "Ban"
    ADD CONSTRAINT "Ban_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "CheatReport" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "gameId"     TEXT,
    "score"      INTEGER NOT NULL,
    "signals"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "detail"     TEXT,
    "reviewed"   BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "verdict"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheatReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CheatReport_reviewed_createdAt_idx"
    ON "CheatReport"("reviewed", "createdAt");
CREATE INDEX IF NOT EXISTS "CheatReport_userId_idx" ON "CheatReport"("userId");

ALTER TABLE "CheatReport" DROP CONSTRAINT IF EXISTS "CheatReport_userId_fkey";
ALTER TABLE "CheatReport"
    ADD CONSTRAINT "CheatReport_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
