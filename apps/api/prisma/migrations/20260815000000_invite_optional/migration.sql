-- Invite codes become optional.
--
-- The invite system is kept intact and gated on this flag rather than removed,
-- so registration can be re-gated from the admin panel without a deployment if
-- open signup ever becomes a problem.
ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "inviteOnly" BOOLEAN NOT NULL DEFAULT false;
