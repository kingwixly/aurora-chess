-- Game indexes (high-traffic queries: history, stats, activity, admin)
CREATE INDEX "Game_status_idx" ON "Game"("status");
CREATE INDEX "Game_whiteId_idx" ON "Game"("whiteId");
CREATE INDEX "Game_blackId_idx" ON "Game"("blackId");
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");
CREATE INDEX "Game_endedAt_idx" ON "Game"("endedAt");

-- Friendship compound index (friend list, pending requests)
CREATE INDEX "Friendship_status_addresseeId_idx" ON "Friendship"("status", "addresseeId");

-- GameAnalysis index (activity feed recent analyses)
CREATE INDEX "GameAnalysis_createdAt_idx" ON "GameAnalysis"("createdAt");
