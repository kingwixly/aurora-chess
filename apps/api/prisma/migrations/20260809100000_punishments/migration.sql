CREATE TYPE "PunishmentType" AS ENUM
  ('WARNING', 'RESTRICTION', 'SUSPENSION', 'DEACTIVATION', 'BAN');
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'TRIAGED', 'ACCEPTED', 'DENIED');
CREATE TYPE "AppealSource" AS ENUM ('SITE', 'DISCORD');

-- Blocks /standing/appeal only. Standing itself stays readable: a person should
-- always be able to see what they are accused of, even having lost the right to
-- argue about it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appealBanned" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Punishment" (
    "id"              TEXT NOT NULL,
    "type"            "PunishmentType" NOT NULL,
    "scope"           "BanScope" NOT NULL DEFAULT 'ACCOUNT',
    "userId"          TEXT,
    "ip"              TEXT,
    "deviceId"        TEXT,
    "reason"          TEXT NOT NULL,
    "internalNote"    TEXT,
    "expiresAt"       TIMESTAMP(3),
    "appealsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "liftedAt"        TIMESTAMP(3),
    "liftedBy"        TEXT,
    "liftReason"      TEXT,
    "becameStrikeAt"  TIMESTAMP(3),
    "overturnedAt"    TIMESTAMP(3),
    "cheatReportId"   TEXT,
    "issuedBy"        TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Punishment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Punishment_userId_createdAt_idx" ON "Punishment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Punishment_type_expiresAt_idx"   ON "Punishment"("type", "expiresAt");
CREATE INDEX IF NOT EXISTS "Punishment_scope_ip_idx"         ON "Punishment"("scope", "ip");
CREATE INDEX IF NOT EXISTS "Punishment_scope_deviceId_idx"   ON "Punishment"("scope", "deviceId");

ALTER TABLE "Punishment" DROP CONSTRAINT IF EXISTS "Punishment_userId_fkey";
ALTER TABLE "Punishment" ADD CONSTRAINT "Punishment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing bans across rather than dropping them. A ban issued yesterday
-- must still apply after this migration.
INSERT INTO "Punishment"
  ("id", "type", "scope", "userId", "ip", "deviceId", "reason", "expiresAt",
   "liftedAt", "liftedBy", "issuedBy", "createdAt")
SELECT "id", 'BAN', "scope", "userId", "ip", "deviceId", "reason", "expiresAt",
       "liftedAt", "liftedBy", "createdBy", "createdAt"
FROM "Ban"
ON CONFLICT ("id") DO NOTHING;

DROP TABLE IF EXISTS "Ban";

CREATE TABLE IF NOT EXISTS "Appeal" (
    "id"                TEXT NOT NULL,
    "punishmentId"      TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "body"              TEXT NOT NULL,
    "source"            "AppealSource" NOT NULL DEFAULT 'SITE',
    "discordHandle"     TEXT,
    "publicPostUrl"     TEXT,
    "publicWithdrawnAt" TIMESTAMP(3),
    "status"            "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "triagedBy"         TEXT,
    "triageNote"        TEXT,
    "decidedBy"         TEXT,
    "decision"          TEXT,
    "decidedAt"         TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Appeal_userId_createdAt_idx" ON "Appeal"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Appeal_punishmentId_idx"     ON "Appeal"("punishmentId");

-- One open appeal per punishment per person. Enforced in the database rather
-- than only in the route, so a double-submit cannot create two.
CREATE UNIQUE INDEX IF NOT EXISTS "Appeal_one_open_per_punishment"
    ON "Appeal"("punishmentId", "userId") WHERE "status" = 'OPEN';

ALTER TABLE "Appeal" DROP CONSTRAINT IF EXISTS "Appeal_punishmentId_fkey";
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_punishmentId_fkey"
    FOREIGN KEY ("punishmentId") REFERENCES "Punishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appeal" DROP CONSTRAINT IF EXISTS "Appeal_userId_fkey";
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Report" (
    "id"         TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetId"   TEXT NOT NULL,
    "category"   TEXT NOT NULL,
    "body"       TEXT NOT NULL,
    "gameId"     TEXT,
    "messageId"  TEXT,
    "reviewed"   BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "outcome"    TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Report_reviewed_createdAt_idx"  ON "Report"("reviewed", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_targetId_idx"            ON "Report"("targetId");
CREATE INDEX IF NOT EXISTS "Report_reporterId_createdAt_idx" ON "Report"("reporterId", "createdAt");

ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_reporterId_fkey";
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_targetId_fkey";
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
