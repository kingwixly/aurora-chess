import type { FastifyInstance } from "fastify";
import {
  capabilitiesFor,
  countingStrikes,
  blocksAutomaticTitles,
  titleBlockExpiresAt,
  canAppeal,
  isActive,
  PUNISHMENT_EFFECTS,
  STRIKE_WINDOW_MONTHS,
  type PunishmentRecord,
} from "@aurora/chess";
import { prisma } from "../lib/prisma.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import { sanitizeString } from "../middleware/admin.js";
import { authMiddleware } from "../middleware/auth.js";

/**
 * Standing and appeals.
 *
 * **These routes deliberately do not check capabilities.** A banned account can
 * sign in and reach them; that is the entire point. Anything else makes a ban
 * unappealable in practice however appealable it is on paper.
 *
 * `/standing` is reachable by every signed-in account, clean record or not.
 * `/standing/appeal` requires something to appeal.
 */

const MAX_APPEAL_LENGTH = 4000;

const SELECT = {
  id: true,
  type: true,
  scope: true,
  reason: true,
  expiresAt: true,
  liftedAt: true,
  liftReason: true,
  overturnedAt: true,
  becameStrikeAt: true,
  appealsDisabled: true,
  cheatReportId: true,
  createdAt: true,
} as const;

export default async function standingRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  /**
   * Your record.
   *
   * A clean account gets an explicit "nothing here" rather than a 404 — being
   * told you have no record is information, and a missing page reads as a fault.
   */
  app.get("/standing", async (request) => {
    const userId = request.user.userId;

    const [rows, me, appeals] = await Promise.all([
      prisma.punishment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: SELECT,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { appealBanned: true },
      }),
      prisma.appeal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          punishmentId: true,
          status: true,
          decision: true,
          decidedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const records = rows as unknown as PunishmentRecord[];
    const now = new Date();
    type AppealRow = { punishmentId: string; status: string };
    const appealRows = appeals as AppealRow[];
    const openByPunishment = new Set(
      appealRows.filter((a) => a.status === "OPEN").map((a) => a.punishmentId)
    );

    // Consecutive denials, newest first, stopping at the first non-denial.
    const denialsByPunishment = new Map<string, number>();
    for (const pid of new Set(appealRows.map((a) => a.punishmentId))) {
      let n = 0;
      for (const a of appealRows.filter((x) => x.punishmentId === pid)) {
        if (a.status === "DENIED") n++;
        else break;
      }
      denialsByPunishment.set(pid, n);
    }

    return {
      capabilities: capabilitiesFor(records, now),
      appealBanned: me?.appealBanned ?? false,
      strikeWindowMonths: STRIKE_WINDOW_MONTHS,
      automaticTitlesBlocked: blocksAutomaticTitles(records, now),
      automaticTitlesUnblockedAt: titleBlockExpiresAt(records, now),
      punishments: rows.map((p) => {
        const rec = p as unknown as PunishmentRecord;
        const eligibility = canAppeal(rec, {
          appealBanned: me?.appealBanned,
          openAppealExists: openByPunishment.has(p.id),
          consecutiveDenials: denialsByPunishment.get(p.id) ?? 0,
        });
        return {
          ...p,
          active: isActive(rec, now),
          effect: PUNISHMENT_EFFECTS[rec.type],
          canAppeal: eligibility.allowed,
          appealBlockedBecause: eligibility.reason ?? null,
        };
      }),
      appeals,
    };
  });

  /**
   * Submit an appeal.
   *
   * Attaches to any punishment on this account, expired ones included — an old
   * warning still counts toward escalation and still blocks automatic titles.
   */
  app.post<{
    Body: { punishmentId: string; body: string; discordHandle?: string; publicPostUrl?: string };
  }>("/standing/appeal", async (request, reply) => {
    const userId = request.user.userId;
    const { punishmentId, body, discordHandle, publicPostUrl } = request.body ?? {};

    const text = (body ?? "").trim();
    if (!punishmentId || !text) {
      return apiError(reply, 400, VALIDATION_FAILED, "Tell us which action and why");
    }
    if (text.length > MAX_APPEAL_LENGTH) {
      return apiError(reply, 400, VALIDATION_FAILED, "Appeals are limited to 4000 characters");
    }

    const [punishment, me, existing] = await Promise.all([
      prisma.punishment.findFirst({ where: { id: punishmentId, userId }, select: SELECT }),
      prisma.user.findUnique({ where: { id: userId }, select: { appealBanned: true } }),
      prisma.appeal.findMany({
        where: { punishmentId, userId },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      }),
    ]);

    if (!punishment) return apiError(reply, 404, NOT_FOUND, "No such action on your account");

    let denials = 0;
    for (const a of existing) {
      if (a.status === "DENIED") denials++;
      else break;
    }

    const eligibility = canAppeal(punishment as unknown as PunishmentRecord, {
      appealBanned: me?.appealBanned,
      openAppealExists: existing.some((a) => a.status === "OPEN"),
      consecutiveDenials: denials,
    });
    if (!eligibility.allowed) {
      return apiError(reply, 403, VALIDATION_FAILED, `Cannot appeal: ${eligibility.reason}`);
    }

    const appeal = await prisma.appeal.create({
      data: {
        punishmentId,
        userId,
        body: sanitizeString(text),
        // The public lane is opt-in and recorded, but it does not change the
        // queue: the row is the same either way, so withdrawing costs nothing.
        source: discordHandle ? "DISCORD" : "SITE",
        discordHandle: discordHandle ? sanitizeString(discordHandle) : null,
        publicPostUrl: publicPostUrl ? sanitizeString(publicPostUrl) : null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return { appeal };
  });

  /** Withdraw the public post. Deliberately does not touch the appeal itself. */
  app.post<{ Params: { id: string } }>(
    "/standing/appeal/:id/withdraw-public",
    async (request, reply) => {
      const userId = request.user.userId;
      const updated = await prisma.appeal.updateMany({
        where: { id: request.params.id, userId },
        // Queue position and status are untouched: withdrawing from the public
        // forum must carry no penalty, or the choice to post was never free.
        data: { publicWithdrawnAt: new Date() },
      });
      if (updated.count === 0) return apiError(reply, 404, NOT_FOUND, "Appeal not found");
      return { withdrawn: true };
    }
  );

  /** One appeal thread, including the moderator's reasoning. */
  app.get<{ Params: { id: string } }>("/standing/appeal/:id", async (request, reply) => {
    const appeal = await prisma.appeal.findFirst({
      where: { id: request.params.id, userId: request.user.userId },
      select: {
        id: true,
        body: true,
        source: true,
        status: true,
        decision: true,
        decidedAt: true,
        createdAt: true,
        publicPostUrl: true,
        publicWithdrawnAt: true,
        punishment: { select: SELECT },
      },
    });
    if (!appeal) return apiError(reply, 404, NOT_FOUND, "Appeal not found");
    return { appeal };
  });
}
