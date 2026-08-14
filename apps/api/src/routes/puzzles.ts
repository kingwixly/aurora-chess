import type { FastifyInstance } from "fastify";
import { Chess } from "chess.js";
import { checkPuzzleMove, puzzleRatingChange, type PuzzleData } from "@aurora/chess";
import { prisma } from "../lib/prisma.js";
import { requireCapability } from "../middleware/capabilities.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import { logger } from "../lib/logger.js";

/**
 * Puzzle routes.
 *
 * The solution line never leaves the server until the puzzle is finished.
 * Sending it with the position would put the answer in the network tab, which
 * makes the rating meaningless — so moves are checked one at a time and the
 * explanations are returned as they are earned.
 */
export default async function puzzleRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireCapability("puzzles"));
  /**
   * Next puzzle for the player, near their rating.
   *
   * Picks randomly from a band rather than the single closest puzzle: with a
   * small set, always serving the nearest one means seeing the same puzzle
   * every session.
   */
  app.get("/puzzles/next", async (request, reply) => {
    const userId = request.user?.userId;

    const me = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { puzzleRating: true },
        })
      : null;
    const rating = me?.puzzleRating ?? 1200;

    // Widen the band until something is found, so a player at either extreme
    // still gets a puzzle rather than an empty screen.
    let pool: { id: string }[] = [];
    for (const band of [300, 600, 1200, 5000]) {
      pool = await prisma.puzzle.findMany({
        where: {
          enabled: true,
          rating: { gte: rating - band, lte: rating + band },
          // Skip puzzles already solved, unless that would leave nothing.
          ...(userId ? { puzzleAttempts: { none: { userId, solved: true } } } : {}),
        },
        select: { id: true },
      });
      if (pool.length > 0) break;
    }

    // Everything solved: fall back to the whole set so practice can continue.
    if (pool.length === 0) {
      pool = await prisma.puzzle.findMany({ where: { enabled: true }, select: { id: true } });
    }
    if (pool.length === 0) {
      return apiError(reply, 404, NOT_FOUND, "No puzzles available");
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: pick.id },
      select: {
        id: true,
        fen: true,
        rating: true,
        title: true,
        intro: true,
        themes: true,
        // moves and explanations are deliberately withheld.
      },
    });

    return { puzzle, playerRating: rating };
  });

  /**
   * Check a single move.
   *
   * Stateless: the client sends how many moves it has solved so far, and the
   * server re-derives the position from the stored FEN and line rather than
   * trusting a client-supplied board.
   */
  app.post<{
    Body: { puzzleId: string; move: string; movesMade: number };
  }>("/puzzles/move", async (request, reply) => {
    const { puzzleId, move, movesMade } = request.body ?? {};
    if (!puzzleId || !move || typeof movesMade !== "number" || movesMade < 0) {
      return apiError(reply, 400, VALIDATION_FAILED, "puzzleId, move and movesMade required");
    }

    const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId } });
    if (!puzzle) return apiError(reply, 404, NOT_FOUND, "Puzzle not found");

    // Replay the solution up to this point from the stored FEN. The client's
    // board is never trusted.
    const board = new Chess(puzzle.fen);
    for (let i = 0; i < movesMade * 2 && i < puzzle.moves.length; i++) {
      const m = puzzle.moves[i];
      try {
        board.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.slice(4) || undefined });
      } catch {
        logger.error({ puzzleId, ply: i }, "stored puzzle line is not playable");
        return apiError(reply, 500, VALIDATION_FAILED, "Puzzle data is inconsistent");
      }
    }

    // Is the attempted move legal, and does it mate?
    let deliversMate = false;
    try {
      const probe = new Chess(board.fen());
      probe.move({
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        promotion: move.slice(4) || undefined,
      });
      deliversMate = probe.isCheckmate();
    } catch {
      return { status: "wrong" as const };
    }

    const data: PuzzleData = {
      id: puzzle.id,
      fen: puzzle.fen,
      rating: puzzle.rating,
      title: puzzle.title,
      intro: puzzle.intro,
      themes: puzzle.themes,
      moves: puzzle.moves,
      explanations: puzzle.explanations,
    };

    return checkPuzzleMove(data, movesMade, move, deliversMate);
  });

  /**
   * Record a finished attempt and update ratings.
   *
   * Separate from the move check so a player who abandons a puzzle mid-way is
   * not scored — only a resolved attempt counts.
   */
  app.post<{
    Body: { puzzleId: string; solved: boolean; hinted?: boolean; msSpent?: number };
  }>("/puzzles/attempt", async (request, reply) => {
    const userId = request.user?.userId;
    if (!userId) return apiError(reply, 401, VALIDATION_FAILED, "Sign in to record attempts");

    const { puzzleId, solved, hinted = false, msSpent = 0 } = request.body ?? {};
    if (!puzzleId || typeof solved !== "boolean") {
      return apiError(reply, 400, VALIDATION_FAILED, "puzzleId and solved required");
    }

    const [puzzle, user] = await Promise.all([
      prisma.puzzle.findUnique({ where: { id: puzzleId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          puzzleRating: true,
          puzzlePeak: true,
          puzzlesSolved: true,
          puzzleDeviation: true,
          puzzleVolatility: true,
        },
      }),
    ]);
    if (!puzzle || !user) return apiError(reply, 404, NOT_FOUND, "Not found");

    // A hinted solve does not move the rating: the player was shown the idea,
    // so it is no evidence of strength — but they should not be punished for
    // looking either.
    const current = {
      rating: user.puzzleRating,
      deviation: user.puzzleDeviation,
      volatility: user.puzzleVolatility,
    };
    const next = hinted ? current : puzzleRatingChange(current, puzzle.rating, solved);
    const after = Math.max(400, next.rating);
    const delta = after - user.puzzleRating;

    await prisma.$transaction([
      prisma.puzzleAttempt.create({
        data: {
          userId,
          puzzleId,
          solved,
          hinted,
          msSpent: Math.max(0, Math.min(msSpent, 3_600_000)),
          ratingBefore: user.puzzleRating,
          ratingAfter: after,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          puzzleRating: after,
          puzzleDeviation: next.deviation,
          puzzleVolatility: next.volatility,
          puzzlePeak: Math.max(user.puzzlePeak, after),
          ...(solved ? { puzzlesSolved: { increment: 1 } } : {}),
        },
      }),
      prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          attempts: { increment: 1 },
          ...(solved ? { solves: { increment: 1 } } : {}),
        },
      }),
    ]);

    return { ratingBefore: user.puzzleRating, ratingAfter: after, delta };
  });
}
