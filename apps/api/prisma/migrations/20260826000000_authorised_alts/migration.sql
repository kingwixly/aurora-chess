-- Authorised alternate accounts.
--
-- A second account is normally a ban-evasion signal, so this is opt-in per user
-- and granted by staff. `altOf` keeps the link visible to moderation, which is
-- the whole point: an authorised alt should be MORE visible than a hidden one,
-- not less.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "altsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "altOf" TEXT;

DO $$ BEGIN
  ALTER TABLE "User"
    ADD CONSTRAINT "User_altOf_fkey"
    FOREIGN KEY ("altOf") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "User_altOf_idx" ON "User"("altOf");
