-- Chess960 support.
--
-- The variant is stored per game rather than inferred from the position: a 960
-- game can transpose into an arrangement that looks standard, and the castling
-- rules must not change partway through a game.
--
-- positionId keeps the Scharnagl number so a game can be replayed exactly. The
-- FEN alone loses which of the 960 arrangements produced it once pieces move.
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "variant" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "positionId" INTEGER;
CREATE INDEX IF NOT EXISTS "Game_variant_idx" ON "Game"("variant");
