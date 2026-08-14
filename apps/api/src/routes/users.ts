import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import {
  PUBLIC_USER_SELECT,
  TITLE_SELECT,
  withTitle,
  withTitles,
  serializeBadges,
} from "../lib/titles.js";
import { shouldShowFideProfile } from "@aurora/chess";

/** Register user routes (profile, search, update, avatar). */
export async function userRoutes(app: FastifyInstance) {
  // Search users by partial username
  app.get<{ Querystring: { q?: string } }>(
    "/users/search",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query.q?.trim();
      if (!query || query.length < 1) {
        return apiError(reply, 400, VALIDATION_FAILED, "Query parameter 'q' is required");
      }

      // Match current names AND names people used to hold, so a player who
      // renamed is still findable by the name their opponents remember.
      const users = await prisma.user.findMany({
        where: {
          id: { not: request.user.userId },
          OR: [
            { username: { contains: query, mode: "insensitive" } },
            {
              usernameHistory: {
                some: { username: { contains: query, mode: "insensitive" } },
              },
            },
          ],
        },
        select: {
          ...PUBLIC_USER_SELECT,
          // Return the matching former name so the UI can say why this person
          // came up for a name they no longer use.
          usernameHistory: {
            where: { username: { contains: query, mode: "insensitive" } },
            select: { username: true, changedAt: true },
            orderBy: { changedAt: "desc" },
            take: 1,
          },
        },
        take: 20,
      });

      return {
        users: users.map((u) => {
          const { usernameHistory, ...rest } = u;
          // Defaulted rather than assumed: a user who has never renamed has no
          // rows here at all.
          const history = usernameHistory ?? [];
          return {
            ...withTitle(rest),
            // Only set when the match came from a name they no longer use.
            formerlyKnownAs:
              history.length > 0 && !u.username.toLowerCase().includes(query.toLowerCase())
                ? history[0].username
                : null,
          };
        }),
      };
    }
  );

  // Public profile with optional H2H
  app.get<{ Params: { username: string }; Querystring: { vsUserId?: string } }>(
    "/users/:username",
    async (request, reply) => {
      const { username } = request.params;
      const { vsUserId } = request.query;

      const user = await prisma.user.findUnique({
        where: { username },
        select: {
          ...PUBLIC_USER_SELECT,
          createdAt: true,
          hideRecentGames: true,
          bio: true,
          ratings: {
            select: { timeControl: true, rating: true, peak: true, games: true, deviation: true },
          },
          fideId: true,
          // Staff-maintained panel. Fetched here rather than in the standard
          // user select because it is read on this page only.
          badges: {
            select: { badgeKey: true, pinned: true, pinOrder: true, grantedAt: true },
          },
          fideProfile: {
            select: {
              enabled: true,
              standard: true,
              rapid: true,
              blitz: true,
              arenaTitles: true,
              profileUrl: true,
              federation: true,
            },
          },
        },
      });

      if (!user) {
        return apiError(reply, 404, NOT_FOUND, "User not found");
      }

      // Build filter: global or H2H
      const h2h = vsUserId && vsUserId !== user.id;
      const baseWhere = h2h
        ? {
            status: "COMPLETED" as const,
            OR: [
              { whiteId: user.id, blackId: vsUserId },
              { whiteId: vsUserId, blackId: user.id },
            ],
          }
        : {
            status: "COMPLETED" as const,
            OR: [{ whiteId: user.id }, { blackId: user.id }],
          };

      const [wins, losses, draws] = await Promise.all([
        prisma.game.count({
          where: {
            ...baseWhere,
            OR: h2h
              ? [
                  { whiteId: user.id, blackId: vsUserId, result: "WHITE_WIN" },
                  { blackId: user.id, whiteId: vsUserId, result: "BLACK_WIN" },
                ]
              : [
                  { whiteId: user.id, result: "WHITE_WIN" },
                  { blackId: user.id, result: "BLACK_WIN" },
                ],
          },
        }),
        prisma.game.count({
          where: {
            ...baseWhere,
            OR: h2h
              ? [
                  { whiteId: user.id, blackId: vsUserId, result: "BLACK_WIN" },
                  { blackId: user.id, whiteId: vsUserId, result: "WHITE_WIN" },
                ]
              : [
                  { whiteId: user.id, result: "BLACK_WIN" },
                  { blackId: user.id, result: "WHITE_WIN" },
                ],
          },
        }),
        prisma.game.count({
          where: {
            status: "COMPLETED",
            result: "DRAW",
            OR: h2h
              ? [
                  { whiteId: user.id, blackId: vsUserId },
                  { whiteId: vsUserId, blackId: user.id },
                ]
              : [{ whiteId: user.id }, { blackId: user.id }],
          },
        }),
      ]);

      // Recent games (H2H or global)
      const recentGames = await prisma.game.findMany({
        where: {
          status: "COMPLETED",
          OR: h2h
            ? [
                { whiteId: user.id, blackId: vsUserId },
                { whiteId: vsUserId, blackId: user.id },
              ]
            : [{ whiteId: user.id }, { blackId: user.id }],
        },
        select: {
          id: true,
          result: true,
          termination: true,
          timeControl: true,
          createdAt: true,
          whiteId: true,
          blackId: true,
          white: { select: { username: true, ...TITLE_SELECT } },
          black: { select: { username: true, ...TITLE_SELECT } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      const { fideProfile, fideId, badges, hideRecentGames, ...rest } = user;
      // Your own profile always shows your games; the toggle governs what
      // OTHER people see.
      const isSelf = request.user?.userId === user.id;
      // An enabled-but-empty panel implies missing data rather than unentered
      // data, so it is withheld until something is actually in it.
      const showFide = shouldShowFideProfile({ ...fideProfile, fideId });

      return {
        user: {
          ...withTitle(rest),
          fideProfile: showFide ? { ...fideProfile, fideId } : null,
          badges: serializeBadges(badges ?? []),
          stats: { wins, losses, draws, total: wins + losses + draws },
          // Hidden games are omitted entirely rather than sent and hidden in
          // the UI -- data that reaches the client is public whatever the
          // component does with it.
          recentGamesHidden: hideRecentGames && !isSelf,
          recentGames: (hideRecentGames && !isSelf ? [] : recentGames).map((g) => ({
            ...g,
            white: g.white ? withTitle(g.white) : null,
            black: g.black ? withTitle(g.black) : null,
          })),
          isH2H: !!h2h,
        },
      };
    }
  );
}
