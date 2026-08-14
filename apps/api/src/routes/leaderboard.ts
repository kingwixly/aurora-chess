import type { FastifyInstance } from "fastify";
import { PUBLIC_USER_SELECT, withTitle } from "../lib/titles.js";
import { prisma } from "../lib/prisma.js";

/**
 * Leaderboards, per time control.
 *
 * The one design decision that matters: **unsettled ratings are excluded.**
 * Glicko-2 tracks how confident a rating is, and a 2400 with a deviation of 300
 * has played four games rather than demonstrated 2400. Ranking on the raw
 * number puts a lucky newcomer above a proven player, which makes the board
 * worthless within a week of launch.
 *
 * Requiring an established rating and a minimum game count costs a little
 * inclusiveness and buys a board that means something.
 */

/** Deviation at or below which a rating counts as settled. */
const ESTABLISHED_DEVIATION = 110;
const MIN_GAMES = 10;

const POOLS = ["BULLET", "BLITZ", "RAPID", "CLASSICAL"] as const;

export default async function leaderboardRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { pool?: string; limit?: string } }>("/leaderboard", async (request) => {
    const pool = POOLS.includes(request.query.pool as never)
      ? (request.query.pool as (typeof POOLS)[number])
      : "BLITZ";
    const limit = Math.min(100, Math.max(5, Number(request.query.limit) || 25));

    const rows = await prisma.userRating.findMany({
      where: {
        timeControl: pool,
        games: { gte: MIN_GAMES },
        deviation: { lte: ESTABLISHED_DEVIATION },
        // A banned or deactivated account should not sit at the top of a
        // public board.
        user: {
          active: true,
          // Only bans hide someone from the board. A suspension is temporary
          // and does not erase what they achieved.
          punishments: { none: { type: "BAN", liftedAt: null, overturnedAt: null } },
        },
      },
      orderBy: { rating: "desc" },
      take: limit,
      select: {
        rating: true,
        peak: true,
        games: true,
        wins: true,
        losses: true,
        draws: true,
        user: { select: PUBLIC_USER_SELECT },
      },
    });

    return {
      pool,
      minGames: MIN_GAMES,
      entries: rows.map((r, i) => ({
        rank: i + 1,
        rating: r.rating,
        peak: r.peak,
        games: r.games,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        user: withTitle(r.user),
      })),
    };
  });

  /** Top puzzle solvers, on the same evidence principle. */
  app.get("/leaderboard/puzzles", async () => {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        puzzlesSolved: { gte: 20 },
        punishments: { none: { type: "BAN", liftedAt: null, overturnedAt: null } },
      },
      orderBy: { puzzleRating: "desc" },
      take: 25,
      select: { ...PUBLIC_USER_SELECT, puzzleRating: true, puzzlesSolved: true },
    });

    return {
      entries: users.map((u, i) => {
        const { puzzleRating, puzzlesSolved, ...rest } = u;
        return { rank: i + 1, rating: puzzleRating, solved: puzzlesSolved, user: withTitle(rest) };
      }),
    };
  });
}
