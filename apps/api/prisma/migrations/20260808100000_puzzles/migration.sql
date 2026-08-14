CREATE TABLE IF NOT EXISTS "Puzzle" (
    "id"           TEXT NOT NULL,
    "fen"          TEXT NOT NULL,
    "rating"       INTEGER NOT NULL DEFAULT 1200,
    "title"        TEXT NOT NULL,
    "intro"        TEXT NOT NULL,
    "themes"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "moves"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "explanations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attempts"     INTEGER NOT NULL DEFAULT 0,
    "solves"       INTEGER NOT NULL DEFAULT 0,
    "enabled"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Puzzle_rating_enabled_idx" ON "Puzzle"("rating", "enabled");

CREATE TABLE IF NOT EXISTS "PuzzleAttempt" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "puzzleId"     TEXT NOT NULL,
    "solved"       BOOLEAN NOT NULL,
    "hinted"       BOOLEAN NOT NULL DEFAULT false,
    "msSpent"      INTEGER NOT NULL DEFAULT 0,
    "ratingBefore" INTEGER NOT NULL,
    "ratingAfter"  INTEGER NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PuzzleAttempt_userId_createdAt_idx"
    ON "PuzzleAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PuzzleAttempt_puzzleId_idx" ON "PuzzleAttempt"("puzzleId");

ALTER TABLE "PuzzleAttempt" DROP CONSTRAINT IF EXISTS "PuzzleAttempt_userId_fkey";
ALTER TABLE "PuzzleAttempt"
    ADD CONSTRAINT "PuzzleAttempt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PuzzleAttempt" DROP CONSTRAINT IF EXISTS "PuzzleAttempt_puzzleId_fkey";
ALTER TABLE "PuzzleAttempt"
    ADD CONSTRAINT "PuzzleAttempt_puzzleId_fkey"
    FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
