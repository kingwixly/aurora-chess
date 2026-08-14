-- Restore the displayed flair.
--
-- The badges migration dropped this column while the API and UI still
-- referenced it, so every /auth/me call threw and no session could be
-- established. Flairs and badges are complementary rather than alternatives:
-- a user earns many badges (shown on their profile) and displays one of them
-- beside their name.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activeFlair" TEXT;
