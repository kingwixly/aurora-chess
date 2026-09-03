import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  adminMiddleware,
  adminRateLimit,
  csrfProtection,
  generateCsrfToken,
  auditLog,
  sanitizeString,
} from "../middleware/admin.js";
import { z } from "zod";
import {
  adminCreateUserBodySchema,
  adminUpdateTitleBodySchema,
  adminUpdateFideBodySchema,
  createBotBodySchema,
  updateBotBodySchema,
} from "../lib/schemas.js";
import {
  computeAutoTitle,
  isValidFideProfileUrl,
  isValidBadgeKey,
  getBadge,
  type ManualTitle,
  type AutoTitle,
} from "@aurora/chess";
import { updatePeakAndAutoTitle } from "../lib/titles.js";
import { linkedAccounts } from "../lib/bans.js";
import { staffSupportRoutes } from "./support.js";
import { parsePagination } from "../lib/pagination.js";
import {
  apiError,
  ADMIN_SELF_DEMOTE,
  ADMIN_SELF_DEACTIVATE,
  ADMIN_LAST_ADMIN,
  ADMIN_SELF_DELETE,
  ADMIN_USER_NOT_FOUND,
  ADMIN_EMAIL_EXISTS,
  ADMIN_USERNAME_EXISTS,
  ADMIN_GAME_NOT_FOUND,
  ADMIN_BOT_NOT_FOUND,
  ADMIN_BOT_ID_EXISTS,
  VALIDATION_FAILED,
  NOT_FOUND,
} from "../lib/errorCodes.js";
import { loadBotsFromYaml, type BotDef } from "../../prisma/seed-bots.js";

/** Register admin routes (user management, site settings, CSRF tokens). */
export async function adminRoutes(app: FastifyInstance) {
  // Registered inside this plugin so the staff support terminal inherits the
  // SAME admin guard as everything else here. A separately mounted route would
  // be one forgotten preHandler away from public.
  await app.register(staffSupportRoutes);

  // All admin routes require auth + admin role + rate limiting
  app.addHook("preHandler", authMiddleware);
  app.addHook("preHandler", adminMiddleware);
  app.addHook("preHandler", adminRateLimit);
  app.addHook("preHandler", csrfProtection);

  // ── CSRF Token ────────────────────────────────────────
  app.get("/admin/csrf", async (request, reply) => {
    const token = generateCsrfToken();
    reply.setCookie("csrf_token", token, {
      httpOnly: false, // Must be readable by JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 3600_000,
    });
    return { token };
  });

  // ── Dashboard ─────────────────────────────────────────
  app.get("/admin/dashboard", async () => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      newUsersWeek,
      totalGames,
      activeGames,
      completedGames,
      abortedGames,
      gamesToday,
      gamesWeek,
      gamesMonth,
      botGames,
      queueDepth,
      resultDist,
      timeControlDist,
      recentAudit,
      topBotGames,
      enabledBots,
      totalBots,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { verified: true } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.game.count(),
      prisma.game.count({ where: { status: "ACTIVE" } }),
      prisma.game.count({ where: { status: "COMPLETED" } }),
      prisma.game.count({ where: { status: "ABORTED" } }),
      prisma.game.count({ where: { createdAt: { gte: today } } }),
      prisma.game.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.game.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.game.count({ where: { isVsBot: true } }),
      redis.llen("analysis:queue"),
      prisma.game.groupBy({
        by: ["result"],
        where: { status: "COMPLETED", result: { not: null } },
        _count: true,
      }),
      prisma.game.groupBy({ by: ["timeControl"], _count: true }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { username: true } } },
      }),
      prisma.game.groupBy({
        by: ["botElo"],
        where: { isVsBot: true, botElo: { not: null } },
        _count: true,
        orderBy: { _count: { botElo: "desc" } },
        take: 5,
      }),
      prisma.botProfile.count({ where: { enabled: true } }),
      prisma.botProfile.count(),
    ]);

    // Map top bot Elos to bot names
    const topBotElos = topBotGames.map((g) => g.botElo as number);
    const botProfiles =
      topBotElos.length > 0
        ? await prisma.botProfile.findMany({
            where: { elo: { in: topBotElos } },
            select: { name: true, avatar: true, elo: true },
          })
        : [];
    const botByElo = new Map(botProfiles.map((b) => [b.elo, b]));
    const topBots = topBotGames.map((g) => {
      const bot = botByElo.get(g.botElo as number);
      return {
        name: bot?.name || `Bot ${g.botElo}`,
        avatar: bot?.avatar || "",
        elo: g.botElo,
        games: g._count,
      };
    });

    // Online users count from Redis
    let onlineCount = 0;
    try {
      const keys = await redis.keys("online:*");
      onlineCount = keys.length;
    } catch {
      // Redis might not have any keys
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });

    return {
      stats: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        newUsersWeek,
        totalGames,
        activeGames,
        completedGames,
        abortedGames,
        gamesToday,
        gamesWeek,
        gamesMonth,
        botGames,
        humanGames: totalGames - botGames,
        analysisQueueDepth: queueDepth,
        onlineCount,
        enabledBots,
        totalBots,
      },
      resultDistribution: resultDist.map((r) => ({
        result: r.result,
        count: r._count,
      })),
      timeControlDistribution: timeControlDist.map((t) => ({
        timeControl: t.timeControl,
        count: t._count,
      })),
      topBots,
      recentAudit: recentAudit.map((a) => ({
        action: a.action,
        admin: a.admin.username,
        createdAt: a.createdAt,
      })),
      settings: settings || null,
    };
  });

  // ── Users ─────────────────────────────────────────────
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
      order?: string;
    };
  }>("/admin/users", async (request) => {
    const { page, limit, skip } = parsePagination(request.query, { maxLimit: 100 });
    const search = request.query.search?.trim();
    const sort = request.query.sort || "createdAt";
    const order = request.query.order === "asc" ? "asc" : "desc";

    const validSorts = ["createdAt", "username", "email", "rating", "role"];
    const orderBy = validSorts.includes(sort) ? { [sort]: order } : { createdAt: "desc" as const };

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          rating: true,
          peakRating: true,
          role: true,
          active: true,
          verified: true,
          createdAt: true,
          titleManual: true,
          titleAuto: true,
          titleAutoLocked: true,
          titleBanned: true,
          titleBanReason: true,
          fideVerified: true,
          fideId: true,
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
          badges: { select: { badgeKey: true } },
          cheatExempt: true,
          usernameHistory: {
            select: { username: true, changedAt: true },
            orderBy: { changedAt: "desc" },
            take: 10,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  app.patch<{
    Params: { id: string };
    Body: {
      active?: boolean;
      verified?: boolean;
      role?: string;
      rating?: number;
      ratingReason?: string;
    };
  }>("/admin/users/:id", async (request, reply) => {
    const { id } = request.params;
    const { active, verified, role, rating, ratingReason } = request.body;
    const adminId = request.user.userId;

    if (id === adminId && role && role !== "ADMIN") {
      return apiError(reply, 400, ADMIN_SELF_DEMOTE, "Cannot demote yourself");
    }

    if (id === adminId && active === false) {
      return apiError(reply, 400, ADMIN_SELF_DEACTIVATE, "Cannot deactivate yourself");
    }

    // Prevent removing last admin
    if (role === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role === "ADMIN" && adminCount <= 1) {
        return apiError(reply, 400, ADMIN_LAST_ADMIN, "Cannot remove the last admin");
      }
    }

    const data: Record<string, unknown> = {};
    if (active !== undefined) data.active = active;
    if (verified !== undefined) data.verified = verified;
    if (role === "USER" || role === "ADMIN") data.role = role;

    // A rating correction moves peak rating too, and peak drives the automatic
    // titles -- so a correction downward must not leave a title the player can
    // no longer justify, and one upward should grant what they now qualify for.
    let ratingData: { rating?: number; peakRating?: number } = {};
    if (rating !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id },
        select: { rating: true, peakRating: true, username: true },
      });
      if (!current) return apiError(reply, 404, ADMIN_USER_NOT_FOUND, "User not found");

      ratingData = { rating };
      // Peak follows a correction in both directions. Leaving a stale higher
      // peak would preserve a title the corrected rating does not support.
      ratingData.peakRating = rating;

      await auditLog(
        adminId,
        "user.rating.update",
        "user",
        id,
        {
          username: current.username,
          before: { rating: current.rating, peakRating: current.peakRating },
          after: { rating, peakRating: rating },
          reason: ratingReason ? sanitizeString(ratingReason) : null,
        },
        request.ip
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: { ...data, ...ratingData },
      select: {
        id: true,
        email: true,
        username: true,
        rating: true,
        peakRating: true,
        role: true,
        active: true,
        verified: true,
      },
    });

    // Recompute the automatic title against the corrected rating. Skipped for
    // users whose title staff have locked by hand.
    if (rating !== undefined) {
      await updatePeakAndAutoTitle(id, rating);
    }

    await auditLog(adminId, "user.update", "user", id, data, request.ip);

    return { user };
  });

  // ── Titles ────────────────────────────────────────────
  //
  // Title state is never destroyed by these operations, only masked. Clearing a
  // manual title reveals whatever auto title the player independently earned;
  // lifting a title ban restores whatever was there before it.
  app.patch<{
    Params: { id: string };
    Body: {
      titleManual?: ManualTitle | null;
      titleAuto?: AutoTitle | null;
      titleAutoLocked?: boolean;
      titleBanned?: boolean;
      titleBanReason?: string | null;
    };
  }>(
    "/admin/users/:id/title",
    { schema: { body: adminUpdateTitleBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.user.userId;
      const body = request.body;

      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          username: true,
          peakRating: true,
          titleManual: true,
          titleAuto: true,
          titleAutoLocked: true,
          titleBanned: true,
        },
      });

      if (!target) {
        return apiError(reply, 404, ADMIN_USER_NOT_FOUND, "User not found");
      }

      const data: Record<string, unknown> = {};

      if (body.titleManual !== undefined) data.titleManual = body.titleManual;

      // Writing titleAuto by hand implies locking, otherwise the player's next
      // completed game would immediately recompute it away.
      if (body.titleAuto !== undefined) {
        data.titleAuto = body.titleAuto;
        data.titleAutoLocked = true;
      }

      // An explicit lock flag always wins over the implicit lock above.
      if (body.titleAutoLocked !== undefined) {
        data.titleAutoLocked = body.titleAutoLocked;
        // Unlocking hands the user back to the automatic system straight away,
        // rather than leaving a stale value until their next game.
        if (body.titleAutoLocked === false) {
          data.titleAuto = computeAutoTitle(target.peakRating);
        }
      }

      if (body.titleBanned !== undefined) {
        data.titleBanned = body.titleBanned;
        // Clear a stale reason when the ban is lifted.
        if (body.titleBanned === false && body.titleBanReason === undefined) {
          data.titleBanReason = null;
        }
      }

      if (body.titleBanReason !== undefined) {
        data.titleBanReason = body.titleBanReason ? sanitizeString(body.titleBanReason) : null;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          username: true,
          rating: true,
          peakRating: true,
          titleManual: true,
          titleAuto: true,
          titleAutoLocked: true,
          titleBanned: true,
          titleBanReason: true,
        },
      });

      await auditLog(
        adminId,
        "user.title.update",
        "user",
        id,
        {
          username: target.username,
          before: {
            titleManual: target.titleManual,
            titleAuto: target.titleAuto,
            titleAutoLocked: target.titleAutoLocked,
            titleBanned: target.titleBanned,
          },
          after: data,
        },
        request.ip
      );

      return { user };
    }
  );

  // ── FIDE ──────────────────────────────────────────────
  //
  // Two separate things behind one endpoint: the verification mark (a flag on
  // the user, rendered before every name) and the profile panel (staff-
  // maintained detail, shown only on the profile). Both are staff-only.
  app.patch<{
    Params: { id: string };
    Body: {
      fideVerified?: boolean;
      fideId?: string | null;
      enabled?: boolean;
      standard?: number | null;
      rapid?: number | null;
      blitz?: number | null;
      arenaTitles?: string[];
      profileUrl?: string | null;
      federation?: string | null;
    };
  }>(
    "/admin/users/:id/fide",
    { schema: { body: adminUpdateFideBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const adminId = request.user.userId;
      const b = request.body;

      const target = await prisma.user.findUnique({
        where: { id },
        select: { username: true, fideVerified: true, fideId: true },
      });
      if (!target) return apiError(reply, 404, ADMIN_USER_NOT_FOUND, "User not found");

      // The URL is rendered as an outbound link on a public profile, so it is
      // restricted to FIDE's own domain rather than trusted as entered.
      if (b.profileUrl && !isValidFideProfileUrl(b.profileUrl)) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          "Profile URL must be an https link on fide.com"
        );
      }

      const userData: Record<string, unknown> = {};
      if (b.fideVerified !== undefined) userData.fideVerified = b.fideVerified;
      if (b.fideId !== undefined) userData.fideId = b.fideId ? sanitizeString(b.fideId) : null;
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({ where: { id }, data: userData });
      }

      const panelKeys = [
        "enabled",
        "standard",
        "rapid",
        "blitz",
        "arenaTitles",
        "profileUrl",
        "federation",
      ] as const;
      const panelData: Record<string, unknown> = {};
      for (const k of panelKeys) {
        if (b[k] !== undefined) panelData[k] = b[k];
      }
      if (b.federation) panelData.federation = sanitizeString(b.federation).toUpperCase();
      panelData.updatedBy = adminId;

      let profile = null;
      if (Object.keys(panelData).length > 1) {
        profile = await prisma.fideProfile.upsert({
          where: { userId: id },
          create: { userId: id, ...panelData },
          update: panelData,
        });
      }

      await auditLog(
        adminId,
        "user.fide.update",
        "user",
        id,
        { username: target.username, changes: b },
        request.ip
      );

      return { fideVerified: userData.fideVerified ?? target.fideVerified, profile };
    }
  );

  /**
   * Grant or revoke a badge.
   *
   * Credentials require evidence — an arbiter certification claimed with no
   * reference is not a verification, it is a guess.
   */
  app.patch<{
    Params: { id: string };
    Body: { badgeKey: string; granted: boolean; evidence?: string };
  }>("/admin/users/:id/badges", async (request, reply) => {
    const { id } = request.params;
    const adminId = request.user.userId;
    const { badgeKey, granted, evidence } = request.body ?? {};

    if (!badgeKey || typeof granted !== "boolean") {
      return apiError(reply, 400, VALIDATION_FAILED, "badgeKey and granted are required");
    }
    if (!isValidBadgeKey(badgeKey)) {
      return apiError(reply, 400, VALIDATION_FAILED, "Unknown badge");
    }

    const badge = getBadge(badgeKey);
    if (granted && badge?.requiresEvidence && !evidence?.trim()) {
      return apiError(reply, 400, VALIDATION_FAILED, `${badge.label} requires evidence`);
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { username: true },
    });
    if (!target) return apiError(reply, 404, ADMIN_USER_NOT_FOUND, "User not found");

    if (granted) {
      await prisma.userBadge.upsert({
        where: { userId_badgeKey: { userId: id, badgeKey } },
        create: {
          userId: id,
          badgeKey,
          evidence: evidence ? sanitizeString(evidence) : null,
          grantedBy: adminId,
        },
        update: {
          evidence: evidence ? sanitizeString(evidence) : null,
          grantedBy: adminId,
        },
      });
    } else {
      await prisma.userBadge.deleteMany({ where: { userId: id, badgeKey } });
    }

    await auditLog(
      adminId,
      granted ? "user.badge.grant" : "user.badge.revoke",
      "user",
      id,
      { username: target.username, badgeKey, evidence: evidence ?? null },
      request.ip
    );

    return { badgeKey, granted };
  });

  /**
   * Issue a ban.
   *
   * Scope decides what is blocked. IP bans are blunt — a household or a school
   * shares an address — so they should be short and are never issued
   * automatically.
   */
  app.post<{
    Body: {
      scope: "ACCOUNT" | "IP" | "DEVICE";
      userId?: string;
      ip?: string;
      deviceId?: string;
      reason: string;
      /** Hours. Omit or 0 for permanent. */
      hours?: number;
    };
  }>("/admin/bans", async (request, reply) => {
    const adminId = request.user.userId;
    const { scope, userId, ip, deviceId: device, reason, hours } = request.body ?? {};

    if (!scope || !reason?.trim()) {
      return apiError(reply, 400, VALIDATION_FAILED, "scope and reason are required");
    }
    const target = scope === "ACCOUNT" ? userId : scope === "IP" ? ip : device;
    if (!target) {
      return apiError(reply, 400, VALIDATION_FAILED, `A ${scope.toLowerCase()} value is required`);
    }
    if (scope === "ACCOUNT" && userId === adminId) {
      return apiError(reply, 400, VALIDATION_FAILED, "You cannot ban yourself");
    }

    const expiresAt = hours && hours > 0 ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;

    const ban = await prisma.punishment.create({
      data: {
        type: "BAN",
        scope,
        userId: scope === "ACCOUNT" ? userId : null,
        ip: scope === "IP" ? ip : null,
        deviceId: scope === "DEVICE" ? device : null,
        reason: sanitizeString(reason),
        expiresAt,
        issuedBy: adminId,
      },
    });

    // Revoke sessions so an account ban takes effect immediately rather than
    // when the current access token happens to expire.
    if (scope === "ACCOUNT" && userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await auditLog(
      adminId,
      "ban.create",
      "ban",
      ban.id,
      { scope, target, reason, expiresAt },
      request.ip
    );
    return { ban };
  });

  /** Lift a ban. Kept as a row rather than deleted, so the history survives. */
  app.post<{ Params: { id: string } }>("/admin/bans/:id/lift", async (request, reply) => {
    const adminId = request.user.userId;
    const ban = await prisma.punishment.findUnique({ where: { id: request.params.id } });
    if (!ban) return apiError(reply, 404, NOT_FOUND, "Ban not found");

    const updated = await prisma.punishment.update({
      where: { id: ban.id },
      data: { liftedAt: new Date(), liftedBy: adminId },
    });
    await auditLog(adminId, "ban.lift", "ban", ban.id, {}, request.ip);
    return { ban: updated };
  });

  /** Active bans, newest first. */
  app.get("/admin/bans", async () => {
    const bans = await prisma.punishment.findMany({
      where: {
        type: "BAN",
        liftedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { id: true, username: true } } },
    });
    return { bans };
  });

  /** Accounts seen from the same address or device. */
  app.get<{ Params: { id: string } }>("/admin/users/:id/linked", async (request) => {
    return { linked: await linkedAccounts(request.params.id) };
  });

  /** Open cheat reports. These are prompts to look, never verdicts. */
  app.get("/admin/cheat-reports", async (request) => {
    const showReviewed = (request.query as { all?: string })?.all === "1";
    const reports = await prisma.cheatReport.findMany({
      where: showReviewed ? {} : { reviewed: false },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { user: { select: { id: true, username: true, rating: true, titleManual: true } } },
    });
    return { reports };
  });

  /** Record a staff verdict on a report. */
  app.patch<{ Params: { id: string }; Body: { verdict: string } }>(
    "/admin/cheat-reports/:id",
    async (request, reply) => {
      const adminId = request.user.userId;
      const { verdict } = request.body ?? {};
      if (!verdict?.trim()) {
        return apiError(reply, 400, VALIDATION_FAILED, "A verdict is required");
      }
      const report = await prisma.cheatReport.update({
        where: { id: request.params.id },
        data: { reviewed: true, reviewedBy: adminId, verdict: sanitizeString(verdict) },
      });
      await auditLog(adminId, "cheat.review", "cheatReport", report.id, { verdict }, request.ip);
      return { report };
    }
  );

  /** Exempt a player from automated detection, or remove the exemption. */
  app.patch<{ Params: { id: string }; Body: { cheatExempt: boolean } }>(
    "/admin/users/:id/exempt",
    async (request, reply) => {
      const adminId = request.user.userId;
      const { cheatExempt } = request.body ?? {};
      if (typeof cheatExempt !== "boolean") {
        return apiError(reply, 400, VALIDATION_FAILED, "cheatExempt must be a boolean");
      }
      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { cheatExempt },
        select: { id: true, username: true, cheatExempt: true },
      });
      await auditLog(adminId, "user.exempt", "user", user.id, { cheatExempt }, request.ip);
      return { user };
    }
  );

  /**
   * Issue any punishment.
   *
   * Replaces the ban-only endpoint. Bans additionally revoke sessions; the
   * lighter types do not, because a suspended player should stay signed in and
   * see the banner explaining why matchmaking is unavailable.
   */
  app.post<{
    Body: {
      type: "WARNING" | "RESTRICTION" | "SUSPENSION" | "DEACTIVATION" | "BAN";
      scope?: "ACCOUNT" | "IP" | "DEVICE";
      userId?: string;
      ip?: string;
      deviceId?: string;
      reason: string;
      internalNote?: string;
      hours?: number;
      appealsDisabled?: boolean;
      cheatReportId?: string;
    };
  }>("/admin/punishments", async (request, reply) => {
    const adminId = request.user.userId;
    const b = request.body ?? ({} as Record<string, never>);
    const scope = b.scope ?? "ACCOUNT";

    if (!b.type || !b.reason?.trim()) {
      return apiError(reply, 400, VALIDATION_FAILED, "type and reason are required");
    }
    if (b.type !== "BAN" && scope !== "ACCOUNT") {
      return apiError(reply, 400, VALIDATION_FAILED, "Only bans can apply to an address or device");
    }
    const target = scope === "ACCOUNT" ? b.userId : scope === "IP" ? b.ip : b.deviceId;
    if (!target) {
      return apiError(reply, 400, VALIDATION_FAILED, `A ${scope.toLowerCase()} value is required`);
    }
    if (scope === "ACCOUNT" && b.userId === adminId) {
      return apiError(reply, 400, VALIDATION_FAILED, "You cannot action your own account");
    }

    // IP and device bans are permanent by design; a timed one is a half measure
    // that mostly inconveniences the household.
    const expiresAt =
      scope !== "ACCOUNT"
        ? null
        : b.hours && b.hours > 0
          ? new Date(Date.now() + b.hours * 3600_000)
          : null;

    const punishment = await prisma.punishment.create({
      data: {
        type: b.type,
        scope,
        userId: scope === "ACCOUNT" ? b.userId : null,
        ip: scope === "IP" ? b.ip : null,
        deviceId: scope === "DEVICE" ? b.deviceId : null,
        reason: sanitizeString(b.reason),
        internalNote: b.internalNote ? sanitizeString(b.internalNote) : null,
        expiresAt,
        appealsDisabled: Boolean(b.appealsDisabled),
        cheatReportId: b.cheatReportId ?? null,
        issuedBy: adminId,
      },
    });

    if (b.type === "BAN" && b.userId) {
      await prisma.refreshToken.deleteMany({ where: { userId: b.userId } });
    }

    await auditLog(
      adminId,
      "punishment.create",
      "punishment",
      punishment.id,
      { type: b.type, scope, target, reason: b.reason, expiresAt },
      request.ip
    );
    return { punishment };
  });

  /** Lift a punishment early. */
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    "/admin/punishments/:id/lift",
    async (request, reply) => {
      const adminId = request.user.userId;
      const existing = await prisma.punishment.findUnique({ where: { id: request.params.id } });
      if (!existing) return apiError(reply, 404, NOT_FOUND, "Not found");

      const punishment = await prisma.punishment.update({
        where: { id: existing.id },
        data: {
          liftedAt: new Date(),
          liftedBy: adminId,
          liftReason: request.body?.reason ? sanitizeString(request.body.reason) : null,
        },
      });
      await auditLog(adminId, "punishment.lift", "punishment", existing.id, {}, request.ip);
      return { punishment };
    }
  );

  /** Open appeals, oldest first — a queue people wait in should be fair. */
  app.get("/admin/appeals", async (request) => {
    const showAll = (request.query as { all?: string })?.all === "1";
    const appeals = await prisma.appeal.findMany({
      where: showAll ? {} : { status: { in: ["OPEN", "TRIAGED"] } },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        body: true,
        source: true,
        discordHandle: true,
        publicPostUrl: true,
        publicWithdrawnAt: true,
        status: true,
        triageNote: true,
        decision: true,
        createdAt: true,
        user: { select: { id: true, username: true } },
        punishment: {
          select: {
            id: true,
            type: true,
            reason: true,
            internalNote: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });
    return { appeals };
  });

  /**
   * Decide an appeal.
   *
   * Accepting overturns the punishment, which removes its effects immediately
   * rather than waiting for the nightly recompute — a player who wins an appeal
   * should not then wait a day for their title back.
   */
  app.patch<{
    Params: { id: string };
    Body: { status: "ACCEPTED" | "DENIED" | "TRIAGED"; decision?: string; triageNote?: string };
  }>("/admin/appeals/:id", async (request, reply) => {
    const adminId = request.user.userId;
    const { status, decision, triageNote } = request.body ?? {};

    const appeal = await prisma.appeal.findUnique({
      where: { id: request.params.id },
      select: { id: true, punishmentId: true, userId: true },
    });
    if (!appeal) return apiError(reply, 404, NOT_FOUND, "Appeal not found");

    if (status === "TRIAGED") {
      const updated = await prisma.appeal.update({
        where: { id: appeal.id },
        data: {
          status,
          triagedBy: adminId,
          triageNote: triageNote ? sanitizeString(triageNote) : null,
        },
      });
      return { appeal: updated };
    }

    if (!decision?.trim()) {
      return apiError(reply, 400, VALIDATION_FAILED, "Record your reasoning");
    }

    const updated = await prisma.appeal.update({
      where: { id: appeal.id },
      data: {
        status,
        decision: sanitizeString(decision),
        decidedBy: adminId,
        decidedAt: new Date(),
      },
    });

    if (status === "ACCEPTED") {
      await prisma.punishment.update({
        where: { id: appeal.punishmentId },
        data: { overturnedAt: new Date() },
      });
      // Titles are recomputed here rather than on the next cron run.
      await updatePeakAndAutoTitle(appeal.userId, 0).catch(() => {});
    } else {
      // Three consecutive denials close appeals on this action.
      const recent = await prisma.appeal.findMany({
        where: { punishmentId: appeal.punishmentId, userId: appeal.userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { status: true },
      });
      if (recent.length === 3 && recent.every((a) => a.status === "DENIED")) {
        await prisma.punishment.update({
          where: { id: appeal.punishmentId },
          data: { appealsDisabled: true },
        });
      }
    }

    await auditLog(
      adminId,
      `appeal.${status.toLowerCase()}`,
      "appeal",
      appeal.id,
      { decision },
      request.ip
    );
    return { appeal: updated };
  });

  /** Player reports awaiting review. */
  app.get("/admin/reports", async (request) => {
    const showAll = (request.query as { all?: string })?.all === "1";
    const reports = await prisma.report.findMany({
      where: showAll ? {} : { reviewed: false },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        category: true,
        body: true,
        gameId: true,
        messageId: true,
        createdAt: true,
        reviewed: true,
        outcome: true,
        reporter: { select: { id: true, username: true } },
        target: { select: { id: true, username: true, rating: true } },
      },
    });
    return { reports };
  });

  app.patch<{ Params: { id: string }; Body: { outcome: string } }>(
    "/admin/reports/:id",
    async (request, reply) => {
      const adminId = request.user.userId;
      const { outcome } = request.body ?? {};
      if (!outcome?.trim()) {
        return apiError(reply, 400, VALIDATION_FAILED, "An outcome is required");
      }
      const report = await prisma.report.update({
        where: { id: request.params.id },
        data: { reviewed: true, reviewedBy: adminId, outcome: sanitizeString(outcome) },
      });
      await auditLog(adminId, "report.review", "report", report.id, { outcome }, request.ip);
      return { report };
    }
  );

  app.delete<{ Params: { id: string } }>("/admin/users/:id", async (request, reply) => {
    const { id } = request.params;
    const adminId = request.user.userId;

    if (id === adminId) {
      return apiError(reply, 400, ADMIN_SELF_DELETE, "Cannot delete yourself");
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, username: true },
    });

    if (!target) {
      return apiError(reply, 404, ADMIN_USER_NOT_FOUND, "User not found");
    }

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return apiError(reply, 400, ADMIN_LAST_ADMIN, "Cannot delete the last admin");
      }
    }

    await prisma.user.delete({ where: { id } });

    await auditLog(adminId, "user.delete", "user", id, { username: target.username }, request.ip);

    return { success: true };
  });

  // Create user
  app.post<{
    Body: {
      email: string;
      username: string;
      password: string;
      role?: string;
      verified?: boolean;
    };
  }>("/admin/users", { schema: { body: adminCreateUserBodySchema } }, async (request, reply) => {
    const adminId = request.user.userId;
    const { email, username, password, role, verified } = request.body;

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return apiError(reply, 409, ADMIN_EMAIL_EXISTS, "Email already in use");
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return apiError(reply, 409, ADMIN_USERNAME_EXISTS, "Username already taken");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: sanitizeString(email).toLowerCase(),
        username: sanitizeString(username),
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        verified: verified ?? true,
        tosAccepted: true,
        tosAcceptedAt: new Date(),
      },
    });

    // Create Favorites collection
    await prisma.collection.create({
      data: { userId: user.id, name: "Favorites" },
    });

    await auditLog(
      adminId,
      "user.create",
      "user",
      user.id,
      { email: user.email, username: user.username, role: user.role },
      request.ip
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        verified: user.verified,
      },
    };
  });

  // ── Games ─────────────────────────────────────────────
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
    };
  }>("/admin/games", async (request) => {
    const { page, limit, skip } = parsePagination(request.query, { maxLimit: 100 });
    const statusFilter = request.query.status;
    const search = request.query.search?.trim();

    const where: Record<string, unknown> = {};
    if (statusFilter && ["WAITING", "ACTIVE", "COMPLETED", "ABORTED"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (search) {
      where.OR = [
        { white: { username: { contains: search, mode: "insensitive" } } },
        { black: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        select: {
          id: true,
          status: true,
          result: true,
          timeControl: true,
          createdAt: true,
          white: { select: { username: true } },
          black: { select: { username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.game.count({ where }),
    ]);

    return {
      games,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.delete<{ Params: { id: string } }>("/admin/games/:id", async (request, reply) => {
    const { id } = request.params;
    const adminId = request.user.userId;

    const game = await prisma.game.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!game) {
      return apiError(reply, 404, ADMIN_GAME_NOT_FOUND, "Game not found");
    }

    await prisma.game.delete({ where: { id } });

    await auditLog(adminId, "game.delete", "game", id, null, request.ip);

    return { success: true };
  });

  // ── Site Settings ─────────────────────────────────────
  app.get("/admin/settings", async () => {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: process.env.SITE_NAME || "AuroraChess",
          registrationOpen: process.env.REGISTRATION_OPEN !== "false",
          maxUsers: parseInt(process.env.MAX_USERS || "0"),
          requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
        },
      });
    }

    return { settings };
  });

  app.put<{
    Body: {
      siteName?: string;
      registrationOpen?: boolean;
      maxUsers?: number;
      requireEmailVerification?: boolean;
    };
  }>("/admin/settings", async (request) => {
    const { siteName, registrationOpen, maxUsers, requireEmailVerification } = request.body;
    const adminId = request.user.userId;

    const data: Record<string, unknown> = {};
    if (siteName !== undefined) data.siteName = sanitizeString(siteName).slice(0, 100);
    if (registrationOpen !== undefined) data.registrationOpen = registrationOpen;
    if (maxUsers !== undefined) data.maxUsers = Math.max(0, Math.min(1000000, maxUsers));
    if (requireEmailVerification !== undefined)
      data.requireEmailVerification = requireEmailVerification;

    const settings = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: {
        siteName: (data.siteName as string) || "AuroraChess",
        registrationOpen: (data.registrationOpen as boolean) ?? true,
        maxUsers: (data.maxUsers as number) ?? 0,
        requireEmailVerification: (data.requireEmailVerification as boolean) ?? false,
      },
    });

    await auditLog(adminId, "settings.update", "settings", "singleton", data, request.ip);

    return { settings };
  });

  // ── Audit Log ─────────────────────────────────────────
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      action?: string;
      adminId?: string;
    };
  }>("/admin/audit-log", async (request) => {
    const { page, limit, skip } = parsePagination(request.query, {
      defaultLimit: 50,
      maxLimit: 100,
    });
    const actionFilter = request.query.action;
    const adminFilter = request.query.adminId;

    const where: Record<string, unknown> = {};
    if (actionFilter) where.action = { contains: actionFilter };
    if (adminFilter) where.adminId = adminFilter;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          admin: { select: { username: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // ── Bots ────────────────────────────────────────────────

  app.get("/admin/bots", async (request) => {
    const { search, sort, order } = request.query as Record<string, string | undefined>;
    const { page, limit, skip } = parsePagination(
      request.query as { page?: string; limit?: string },
      { maxLimit: 100 }
    );
    const sortField = ["elo", "name", "category", "sortOrder", "createdAt"].includes(sort || "")
      ? sort!
      : "sortOrder";
    const sortOrder = order === "desc" ? "desc" : "asc";

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { botId: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [bots, total] = await Promise.all([
      prisma.botProfile.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.botProfile.count({ where }),
    ]);

    return {
      bots: bots.map((b) => ({
        id: b.id,
        botId: b.botId,
        name: b.name,
        elo: b.elo,
        description: b.description,
        avatar: b.avatar,
        tier: b.tier,
        category: b.category,
        enabled: b.enabled,
        sortOrder: b.sortOrder,
        randomMoveChance: b.randomMoveChance,
        blunderChance: b.blunderChance,
        captureGreed: b.captureGreed,
        aggressionBias: b.aggressionBias,
        maxDepth: b.maxDepth,
        queenEarly: b.queenEarly,
        pawnPusher: b.pawnPusher,
        messages: b.messages ?? null,
        preferredOpenings: b.preferredOpenings ?? null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.post("/admin/bots", { schema: { body: createBotBodySchema } }, async (request, reply) => {
    const body = request.body as z.infer<typeof createBotBodySchema>;

    const existing = await prisma.botProfile.findUnique({ where: { botId: body.botId } });
    if (existing) return apiError(reply, 409, ADMIN_BOT_ID_EXISTS, "Bot ID already exists");

    const maxSort = await prisma.botProfile.aggregate({ _max: { sortOrder: true } });
    const bot = await prisma.botProfile.create({
      data: {
        botId: body.botId,
        name: sanitizeString(body.name),
        elo: body.elo,
        description: sanitizeString(body.description),
        avatar: body.avatar,
        tier: body.tier,
        category: body.category,
        enabled: body.enabled ?? true,
        randomMoveChance: body.randomMoveChance ?? 0,
        blunderChance: body.blunderChance ?? 0,
        captureGreed: body.captureGreed ?? 0,
        aggressionBias: body.aggressionBias ?? 0,
        maxDepth: body.maxDepth ?? 3,
        queenEarly: body.queenEarly ?? false,
        pawnPusher: body.pawnPusher ?? false,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        messages: body.messages,
        preferredOpenings: body.preferredOpenings,
      },
    });

    await auditLog(
      request.user.userId,
      "bot.create",
      "BotProfile",
      bot.id,
      { botId: body.botId, name: bot.name, elo: bot.elo },
      request.ip
    );

    return { bot };
  });

  app.patch<{ Params: { id: string } }>(
    "/admin/bots/:id",
    { schema: { body: updateBotBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as z.infer<typeof updateBotBodySchema>;

      const existing = await prisma.botProfile.findUnique({ where: { id } });
      if (!existing) return apiError(reply, 404, ADMIN_BOT_NOT_FOUND, "Bot not found");

      const data: Record<string, unknown> = {};
      const entries = Object.entries(body) as [string, unknown][];
      for (const [key, value] of entries) {
        if (value !== undefined) {
          data[key] = typeof value === "string" ? sanitizeString(value) : value;
        }
      }

      const bot = await prisma.botProfile.update({ where: { id }, data });

      await auditLog(request.user.userId, "bot.update", "BotProfile", id, data, request.ip);

      return { bot };
    }
  );

  app.delete<{ Params: { id: string } }>("/admin/bots/:id", async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.botProfile.findUnique({ where: { id } });
    if (!existing) return apiError(reply, 404, ADMIN_BOT_NOT_FOUND, "Bot not found");

    await prisma.botProfile.delete({ where: { id } });

    await auditLog(
      request.user.userId,
      "bot.delete",
      "BotProfile",
      id,
      { botId: existing.botId, name: existing.name },
      request.ip
    );

    return { success: true };
  });

  app.post("/admin/bots/reseed", async (request) => {
    let bots: BotDef[];
    try {
      bots = loadBotsFromYaml();
    } catch {
      return { error: "Could not load bots.yml" };
    }

    let created = 0;
    let updated = 0;

    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      const existing = await prisma.botProfile.findUnique({ where: { botId: bot.id } });

      const data = {
        name: bot.name,
        elo: bot.elo,
        description: bot.description,
        avatar: bot.avatar,
        category: bot.category,
        tier: bot.tier,
        randomMoveChance: bot.randomMoveChance,
        blunderChance: bot.blunderChance,
        captureGreed: bot.captureGreed,
        aggressionBias: bot.aggressionBias,
        maxDepth: bot.maxDepth,
        queenEarly: bot.queenEarly,
        pawnPusher: bot.pawnPusher,
        sortOrder: i,
        messages: bot.messages ?? undefined,
        preferredOpenings: bot.preferredOpenings ?? undefined,
      };

      if (existing) {
        await prisma.botProfile.update({ where: { botId: bot.id }, data });
        updated++;
      } else {
        await prisma.botProfile.create({ data: { botId: bot.id, ...data } });
        created++;
      }
    }

    await auditLog(
      request.user.userId,
      "bot.reseed",
      "BotProfile",
      "all",
      { created, updated, total: bots.length },
      request.ip
    );

    return { created, updated };
  });
}

/**
 * Blog administration.
 *
 * Registered inside the admin plugin, so `adminMiddleware` already guards
 * everything here - there is no per-route check to forget.
 */
export async function adminBlogRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminMiddleware);

  /** Every post, drafts included. The public route excludes drafts. */
  app.get("/admin/blog", async () => {
    const posts = await prisma.post.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true } },
      },
    });
    return { posts };
  });

  app.get<{ Params: { id: string } }>("/admin/blog/:id", async (request, reply) => {
    const post = await prisma.post.findUnique({ where: { id: request.params.id } });
    if (!post) return apiError(reply, 404, VALIDATION_FAILED, "No such post");
    return { post };
  });

  app.post<{
    Body: { title?: string; summary?: string; body?: string; publish?: boolean };
  }>("/admin/blog", async (request, reply) => {
    const title = String(request.body?.title ?? "").trim();
    const summary = String(request.body?.summary ?? "").trim();
    const body = String(request.body?.body ?? "").trim();

    if (title.length < 3) {
      return apiError(reply, 400, VALIDATION_FAILED, "Give the post a title");
    }
    if (!body) {
      return apiError(reply, 400, VALIDATION_FAILED, "Write something");
    }

    // Slug derived once, from the title, and never regenerated on edit -
    // changing it later would break every link already shared.
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

    // Collisions get a numeric suffix rather than failing, so publishing a
    // second "Update" post does not throw an error at the writer.
    let slug = base || "post";
    for (let n = 2; await prisma.post.findUnique({ where: { slug } }); n++) {
      slug = `${base}-${n}`;
    }

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        summary: summary || title,
        body,
        authorId: request.user.userId,
        publishedAt: request.body?.publish ? new Date() : null,
      },
      select: { id: true, slug: true },
    });
    return { post };
  });

  app.patch<{
    Params: { id: string };
    Body: { title?: string; summary?: string; body?: string; publish?: boolean };
  }>("/admin/blog/:id", async (request, reply) => {
    const existing = await prisma.post.findUnique({
      where: { id: request.params.id },
      select: { id: true, publishedAt: true },
    });
    if (!existing) return apiError(reply, 404, VALIDATION_FAILED, "No such post");

    const { title, summary, body, publish } = request.body ?? {};

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(summary !== undefined ? { summary: String(summary).trim() } : {}),
        ...(body !== undefined ? { body: String(body).trim() } : {}),
        // Publishing sets the date once. Re-publishing an already-live post
        // keeps the original date, so editing a typo does not move it back to
        // the top of the blog.
        ...(publish === true && !existing.publishedAt ? { publishedAt: new Date() } : {}),
        ...(publish === false ? { publishedAt: null } : {}),
      },
      select: { id: true, slug: true, publishedAt: true },
    });
    return { post };
  });

  app.delete<{ Params: { id: string } }>("/admin/blog/:id", async (request, reply) => {
    const post = await prisma.post.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    });
    if (!post) return apiError(reply, 404, VALIDATION_FAILED, "No such post");
    await prisma.post.delete({ where: { id: post.id } });
    return { success: true };
  });

  /** Pin, lock or remove a forum thread. */
  app.patch<{
    Params: { id: string };
    Body: { pinned?: boolean; locked?: boolean; deleted?: boolean };
  }>("/admin/forum/threads/:id", async (request, reply) => {
    const thread = await prisma.thread.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    });
    if (!thread) return apiError(reply, 404, VALIDATION_FAILED, "No such thread");

    const { pinned, locked, deleted } = request.body ?? {};
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        ...(pinned !== undefined ? { pinned } : {}),
        ...(locked !== undefined ? { locked } : {}),
        // Soft delete, so a removal can be undone and the thread is not lost.
        ...(deleted !== undefined ? { deletedAt: deleted ? new Date() : null } : {}),
      },
    });
    return { success: true };
  });

  /** Remove a single forum post. Leaves a tombstone. */
  app.delete<{ Params: { id: string } }>("/admin/forum/posts/:id", async (request, reply) => {
    const post = await prisma.threadPost.findUnique({
      where: { id: request.params.id },
      select: { id: true },
    });
    if (!post) return apiError(reply, 404, VALIDATION_FAILED, "No such post");
    await prisma.threadPost.update({
      where: { id: post.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  });
}
