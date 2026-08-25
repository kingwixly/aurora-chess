-- Forced mate is not a centipawn score.
--
-- Without a column for it the analysis board clamped mate to +/-1000 and showed
-- "+1000.0", which reads as a huge material advantage rather than "this is
-- finished".
ALTER TABLE "MoveFeedback" ADD COLUMN IF NOT EXISTS "mateAfter" INTEGER;
