import { assessGame, needsReview, REVIEW_THRESHOLD } from "./anticheat.js";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/**
 * Post-game screening.
 *
 * Opens a `CheatReport` for a human when a game looks unusual. **It never
 * punishes**, and there is deliberately no code path from here to a ban — the
 * loudest complaint about large chess sites is being banned by software with no
 * explanation, and at this scale a person can look at every case.
 *
 * Reads accuracy from `GameAnalysis`, which the worker computes with Stockfish
 * server-side. Client-reported accuracy is never used: a screening decision must
 * not rest on a number the player's own browser supplied.
 */

/** Games behind the player's accuracy baseline. */
/** One historical analysed game, used to build the baseline. */
type PastRow = {
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  game: { whiteId: string | null };
};

const BASELINE_GAMES = 30;

export async function screenGame(gameId: string): Promise<void> {
  try {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        whiteId: true,
        blackId: true,
        screenedAt: true,
        whiteMoveMsMean: true,
        whiteMoveMsStdDev: true,
        blackMoveMsMean: true,
        blackMoveMsStdDev: true,
        moves: { select: { id: true } },
      },
    });
    if (!game || game.screenedAt) return;

    const analysis = await prisma.gameAnalysis.findUnique({
      where: { gameId },
      select: { whiteAccuracy: true, blackAccuracy: true },
    });
    // No server-side analysis yet: nothing trustworthy to screen on. The game
    // is left unscreened so it can be picked up once analysis exists.
    if (!analysis?.whiteAccuracy || !analysis?.blackAccuracy) return;

    const sides = [
      {
        userId: game.whiteId,
        opponentId: game.blackId,
        accuracy: analysis.whiteAccuracy,
        meanMs: game.whiteMoveMsMean ?? 0,
        stdDevMs: game.whiteMoveMsStdDev ?? 0,
      },
      {
        userId: game.blackId,
        opponentId: game.whiteId,
        accuracy: analysis.blackAccuracy,
        meanMs: game.blackMoveMsMean ?? 0,
        stdDevMs: game.blackMoveMsStdDev ?? 0,
      },
    ];

    for (const side of sides) {
      if (!side.userId || !side.opponentId) continue;

      const [user, opponent] = await Promise.all([
        prisma.user.findUnique({
          where: { id: side.userId },
          select: { cheatExempt: true, titleManual: true, rating: true },
        }),
        prisma.user.findUnique({
          where: { id: side.opponentId },
          select: { rating: true },
        }),
      ]);
      if (!user || !opponent) continue;

      // Titled players are exempt: engine-like accuracy is what a title
      // certifies, so flagging it is noise rather than signal.
      if (user.cheatExempt || user.titleManual) continue;

      // Baseline from this player's own recent analysed games. Comparing
      // someone against themselves is the only comparison that means anything:
      // "90% accuracy" describes very different play at 1200 and 2400.
      const past = await prisma.gameAnalysis.findMany({
        where: {
          game: {
            id: { not: gameId },
            OR: [{ whiteId: side.userId }, { blackId: side.userId }],
          },
        },
        orderBy: { createdAt: "desc" },
        take: BASELINE_GAMES,
        select: {
          whiteAccuracy: true,
          blackAccuracy: true,
          game: { select: { whiteId: true } },
        },
      });

      const values = past
        .map((a: PastRow) => (a.game.whiteId === side.userId ? a.whiteAccuracy : a.blackAccuracy))
        .filter((v: number | null): v is number => typeof v === "number");

      if (values.length === 0) continue;
      const baseline = values.reduce((a: number, b: number) => a + b, 0) / values.length;

      const assessment = assessGame(
        {
          accuracy: side.accuracy,
          baselineAccuracy: baseline,
          baselineGames: values.length,
          rating: user.rating,
          opponentRating: opponent.rating,
          // Rating history is not tracked per period yet, so this signal is
          // left at zero rather than guessed. It only ever corroborates.
          recentRatingGain: 0,
          meanMoveMs: side.meanMs,
          moveTimeStdDev: side.stdDevMs,
          moves: game.moves.length,
        },
        false
      );

      if (needsReview(assessment)) {
        await prisma.cheatReport.create({
          data: {
            userId: side.userId,
            gameId,
            score: assessment.score,
            signals: assessment.signals,
            detail: assessment.detail,
          },
        });
        logger.info(
          { userId: side.userId, gameId, score: assessment.score, threshold: REVIEW_THRESHOLD },
          "cheat report opened for staff review"
        );
      }
    }

    await prisma.game.update({ where: { id: gameId }, data: { screenedAt: new Date() } });
  } catch (err) {
    // Screening must never affect the outcome of a game.
    logger.warn({ err, gameId }, "post-game screening failed");
  }
}
