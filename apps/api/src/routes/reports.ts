import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import { sanitizeString } from "../middleware/admin.js";
import { authMiddleware } from "../middleware/auth.js";

/**
 * Player reports.
 *
 * Rate-limited per reporter, because most reports submitted immediately after a
 * loss are about losing. A limit does not stop a genuine report — it stops
 * someone working through a list of everyone who beat them today.
 */

const CATEGORIES = ["cheating", "chat", "username", "other"] as const;
const MAX_BODY = 2000;

/** Reports one person may file in a day. */
const DAILY_LIMIT = 10;

export default async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.post<{
    Body: {
      targetUsername?: string;
      targetId?: string;
      category: string;
      body: string;
      gameId?: string;
      messageId?: string;
    };
  }>("/reports", async (request, reply) => {
    const reporterId = request.user.userId;
    const { targetUsername, targetId, category, body, gameId, messageId } = request.body ?? {};

    if (!CATEGORIES.includes(category as never)) {
      return apiError(reply, 400, VALIDATION_FAILED, "Unknown report category");
    }
    const text = (body ?? "").trim();
    if (text.length < 10) {
      return apiError(reply, 400, VALIDATION_FAILED, "Tell us what happened, in a sentence or two");
    }
    if (text.length > MAX_BODY) {
      return apiError(reply, 400, VALIDATION_FAILED, "Reports are limited to 2000 characters");
    }

    const target = targetId
      ? await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } })
      : targetUsername
        ? await prisma.user.findFirst({
            where: { username: { equals: targetUsername, mode: "insensitive" } },
            select: { id: true },
          })
        : null;

    if (!target) return apiError(reply, 404, NOT_FOUND, "No such player");
    if (target.id === reporterId) {
      return apiError(reply, 400, VALIDATION_FAILED, "You cannot report yourself");
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await prisma.report.count({
      where: { reporterId, createdAt: { gt: since } },
    });
    if (recent >= DAILY_LIMIT) {
      return apiError(
        reply,
        429,
        VALIDATION_FAILED,
        "You have filed a lot of reports today. Try again tomorrow."
      );
    }

    // One open report per reporter per target: repeated filings about the same
    // person do not make the queue move faster, they just make it longer.
    const duplicate = await prisma.report.findFirst({
      where: { reporterId, targetId: target.id, reviewed: false },
      select: { id: true },
    });
    if (duplicate) {
      return apiError(
        reply,
        409,
        VALIDATION_FAILED,
        "You already have an open report about this player"
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetId: target.id,
        category,
        body: sanitizeString(text),
        gameId: gameId ?? null,
        messageId: messageId ?? null,
      },
      select: { id: true, createdAt: true },
    });

    return { report };
  });

  /** Your own reports, so filing does not feel like shouting into a void. */
  app.get("/reports/mine", async (request) => {
    const reports = await prisma.report.findMany({
      where: { reporterId: request.user.userId },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        category: true,
        reviewed: true,
        createdAt: true,
        target: { select: { username: true } },
      },
    });
    return { reports };
  });
}
