-- Site verification plus a confirmed FIDE account. Rendered before the mod
-- shield and title, so it is a User column rather than part of the profile
-- panel: it is read on every user query that renders a name.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fideVerified" BOOLEAN NOT NULL DEFAULT false;

-- Staff-maintained FIDE details, read only on the profile page. Kept in its own
-- table so it stays out of every query that does not need it.
CREATE TABLE IF NOT EXISTS "FideProfile" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT false,
    "standard"    INTEGER,
    "rapid"       INTEGER,
    "blitz"       INTEGER,
    "arenaTitles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "profileUrl"  TEXT,
    "federation"  TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "updatedBy"   TEXT,

    CONSTRAINT "FideProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FideProfile_userId_key" ON "FideProfile"("userId");

ALTER TABLE "FideProfile" DROP CONSTRAINT IF EXISTS "FideProfile_userId_fkey";
ALTER TABLE "FideProfile"
    ADD CONSTRAINT "FideProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
