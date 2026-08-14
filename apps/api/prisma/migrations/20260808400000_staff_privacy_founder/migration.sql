-- Public staff rank. Separate from `role`, which controls access: someone can
-- be recognised publicly without holding admin rights, and vice versa.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "staffRank" TEXT;

-- Let players hide their game history from other people's view of their profile.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hideRecentGames" BOOLEAN NOT NULL DEFAULT false;

-- Signup order, so the Founder badge can be awarded to the first 50 accounts.
-- Backfilled by creation date, which is the honest ordering for accounts that
-- already exist.
CREATE SEQUENCE IF NOT EXISTS "User_accountNumber_seq";
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "accountNumber" INTEGER NOT NULL
  DEFAULT nextval('"User_accountNumber_seq"');

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS n FROM "User"
)
UPDATE "User" u SET "accountNumber" = o.n FROM ordered o WHERE u.id = o.id;

SELECT setval('"User_accountNumber_seq"', GREATEST((SELECT COALESCE(MAX("accountNumber"), 0) FROM "User"), 1));

-- Award Founder to the first 50 accounts that already exist.
INSERT INTO "UserBadge" ("id", "userId", "badgeKey", "grantedAt")
SELECT gen_random_uuid()::text, id, 'founder', CURRENT_TIMESTAMP
FROM "User" WHERE "accountNumber" <= 50
ON CONFLICT ("userId", "badgeKey") DO NOTHING;
