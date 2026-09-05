-- Which bot a game is against.
--
-- Rating cannot identify a bot: Pip and WorstFish are both rated 200, so
-- dispatching on rating meant playing Pip silently got you WorstFish's
-- inverted search from move two onward.
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "botId" TEXT;
