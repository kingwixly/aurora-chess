-- Previous usernames.
--
-- Searching an old name should still find the person: someone renaming to
-- escape a reputation should not become unfindable, and an opponent looking up
-- "the player who beat me last week" should not hit a dead end.
CREATE TABLE IF NOT EXISTS "UsernameHistory" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "username"  TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UsernameHistory_username_idx" ON "UsernameHistory"("username");
CREATE INDEX IF NOT EXISTS "UsernameHistory_userId_changedAt_idx"
    ON "UsernameHistory"("userId", "changedAt");

ALTER TABLE "UsernameHistory" DROP CONSTRAINT IF EXISTS "UsernameHistory_userId_fkey";
ALTER TABLE "UsernameHistory"
    ADD CONSTRAINT "UsernameHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
