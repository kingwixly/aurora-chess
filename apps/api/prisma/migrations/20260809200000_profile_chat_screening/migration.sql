-- Profile identity.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "countryCode" TEXT,
  ADD COLUMN IF NOT EXISTS "bio"         TEXT;

-- Move-time statistics for the screening timing signal.
--
-- Accuracy is deliberately NOT stored here: it lives on GameAnalysis, which the
-- worker computes server-side with Stockfish. Screening must never rest on
-- figures the player's own browser supplied.
ALTER TABLE "Game"
  ADD COLUMN IF NOT EXISTS "whiteMoveMsMean"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "whiteMoveMsStdDev" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "blackMoveMsMean"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "blackMoveMsStdDev" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "screenedAt"        TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "GameChatMessage" (
    "id"        TEXT NOT NULL,
    "gameId"    TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    -- Soft delete, so staff can still read it in a report.
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GameChatMessage_gameId_createdAt_idx"
    ON "GameChatMessage"("gameId", "createdAt");

ALTER TABLE "GameChatMessage" DROP CONSTRAINT IF EXISTS "GameChatMessage_gameId_fkey";
ALTER TABLE "GameChatMessage" ADD CONSTRAINT "GameChatMessage_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
