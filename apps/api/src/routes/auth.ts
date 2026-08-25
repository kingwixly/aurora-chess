import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { TITLE_SELECT, withTitle } from "../lib/titles.js";
import { FOUNDER_CUTOFF, isValidCountryCode } from "@aurora/chess";
import { logger } from "../lib/logger.js";
import { signAccessToken, generateRefreshToken, hashToken } from "../lib/jwt.js";
import { getSiteSettings } from "../lib/settings.js";
import { authMiddleware } from "../middleware/auth.js";
import { checkBan, clientIp, deviceId, recordSighting } from "../lib/bans.js";
import { checkSignupVelocity, releaseSignupAttempt } from "../lib/signupVelocity.js";
import {
  consumeToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSecurityNotice,
  logCodeRequest,
} from "../lib/emailTokens.js";
import { redis } from "../lib/redis.js";
import { sanitizeString } from "../middleware/admin.js";
import { registerBodySchema, loginBodySchema, preferencesBodySchema } from "../lib/schemas.js";
import {
  apiError,
  AUTH_INVALID_INVITE,
  AUTH_INVITE_USED,
  AUTH_REGISTRATION_CLOSED,
  AUTH_MAX_USERS,
  AUTH_EMAIL_EXISTS,
  AUTH_USERNAME_EXISTS,
  AUTH_INVALID_CREDENTIALS,
  AUTH_ACCOUNT_DEACTIVATED,
  AUTH_EMAIL_NOT_VERIFIED,
  AUTH_NO_REFRESH_TOKEN,
  AUTH_INVALID_REFRESH_TOKEN,
  AUTH_TOKEN_USED,
  VALIDATION_FAILED,
  NOT_FOUND,
} from "../lib/errorCodes.js";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const COOKIE_NAME = "refresh_token";

function getCookieDomain(): string | undefined {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return undefined;
  try {
    const hostname = new URL(siteUrl).hostname;
    // Set domain to .root-domain so subdomains (admin.*) share the cookie
    const parts = hostname.split(".");
    if (parts.length >= 2) return "." + parts.slice(-2).join(".");
    return undefined;
  } catch {
    return undefined;
  }
}

function cookieOptions(maxAgeMs: number) {
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs,
    ...(domain ? { domain } : {}),
  };
}

async function createTokens(user: { id: string; email: string; username: string; role: string }) {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  const rawRefreshToken = generateRefreshToken();
  const hashedToken = hashToken(rawRefreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, rawRefreshToken };
}

/** Register authentication routes (register, login, refresh, logout). */
export async function authRoutes(app: FastifyInstance) {
  // ── Register ──────────────────────────────────────
  app.post<{
    Body: { email: string; username: string; password: string; inviteCode?: string };
  }>("/auth/register", { schema: { body: registerBodySchema } }, async (request, reply) => {
    const { email, password, inviteCode } = request.body;
    const username = sanitizeString(request.body.username);

    const siteSettings = await getSiteSettings();
    if (!siteSettings.registrationOpen) {
      return apiError(reply, 403, AUTH_REGISTRATION_CLOSED, "Registration is currently closed");
    }

    // Registration is open, so bulk signup is the thing worth slowing down —
    // one account is free, ten from one machine in an hour is a script.
    const signupIp = clientIp(request);
    const signupDevice = deviceId(request);
    const velocity = await checkSignupVelocity(signupIp, signupDevice);
    if (!velocity.allowed) {
      // The message is deliberately vague about which signal tripped: telling
      // someone it was their device is a hint about how to avoid it.
      reply.header("Retry-After", String(velocity.retryAfter ?? 3600));
      logger.warn({ reason: velocity.reason, ip: signupIp }, "signup velocity limit hit");
      return apiError(
        reply,
        429,
        VALIDATION_FAILED,
        "Too many accounts have been created from here recently. Try again later."
      );
    }

    // Invites are optional now. The system is kept intact and gated on a
    // setting, so it can be switched back on from the admin panel without a
    // deployment if open signup ever becomes a problem.
    //
    // A code supplied when none is required is still honoured and consumed —
    // otherwise an outstanding invite would silently stop working the moment
    // the gate came down, and whoever sent it would look unreliable.
    let invite: { code: string; usedById: string | null } | null = null;
    if (inviteCode) {
      invite = await prisma.invite.findUnique({
        where: { code: inviteCode },
        select: { code: true, usedById: true },
      });
    }

    if (siteSettings.inviteOnly) {
      if (!inviteCode || !invite) {
        await releaseSignupAttempt(signupIp, signupDevice);
        return apiError(reply, 400, AUTH_INVALID_INVITE, "Invalid invite code");
      }
      if (invite.usedById) {
        await releaseSignupAttempt(signupIp, signupDevice);
        return apiError(reply, 410, AUTH_INVITE_USED, "Invite code has already been used");
      }
    } else if (invite?.usedById) {
      // Not required, and this one is spent: ignore it rather than refusing an
      // otherwise valid signup.
      invite = null;
    }

    if (siteSettings.maxUsers > 0) {
      const userCount = await prisma.user.count();
      if (userCount >= siteSettings.maxUsers) {
        await releaseSignupAttempt(signupIp, signupDevice);
        return apiError(reply, 403, AUTH_MAX_USERS, "Maximum user limit reached");
      }
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      // Not a spent attempt: someone who forgot they already have an account
      // should not be pushed toward the limit for it.
      await releaseSignupAttempt(signupIp, signupDevice);
      return apiError(reply, 409, AUTH_EMAIL_EXISTS, "Email already in use");
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      await releaseSignupAttempt(signupIp, signupDevice);
      return apiError(reply, 409, AUTH_USERNAME_EXISTS, "Username already taken");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    // Founder for the first 50 accounts. Done here rather than by a trigger so
    // the rule lives with the rest of the signup logic and is easy to find.
    // Fire and forget, deliberately. If mail is down, registration still
    // succeeds and the account exists — the person can request another link.
    // Blocking here would mean an email outage stops signups entirely.
    void sendVerificationEmail(user.id, user.email, user.username);

    if (user.accountNumber <= FOUNDER_CUTOFF) {
      await prisma.userBadge
        .create({
          data: { userId: user.id, badgeKey: "founder" },
        })
        .catch(() => {
          // A duplicate is harmless and must not fail a signup.
        });
    }

    // Mark the invite used, when one was actually supplied and unspent.
    if (invite) {
      await prisma.invite.update({
        where: { code: invite.code },
        data: { usedById: user.id, usedAt: new Date() },
      });
    }

    // Auto-create Favorites collection
    await prisma.collection.create({
      data: { userId: user.id, name: "Favorites" },
    });

    const { accessToken, rawRefreshToken } = await createTokens(user);

    reply.setCookie(
      COOKIE_NAME,
      rawRefreshToken,
      cookieOptions(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    );

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        rating: user.rating,
        role: user.role,
      },
    };
  });

  // ── Login ─────────────────────────────────────────
  app.post<{
    Body: { email: string; password: string };
  }>("/auth/login", { schema: { body: loginBodySchema } }, async (request, reply) => {
    const { email, password } = request.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return apiError(reply, 401, AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return apiError(reply, 401, AUTH_INVALID_CREDENTIALS, "Invalid credentials");
    }

    if (!user.active) {
      return apiError(reply, 403, AUTH_ACCOUNT_DEACTIVATED, "Account is deactivated");
    }

    // A banned account still signs in — deliberately.
    //
    // Refusing the token here would mean a banned user could never reach their
    // standing page and could never appeal, which makes every ban permanent in
    // practice regardless of what the punishment says. The ban is enforced by
    // capabilities on every other route instead; the standing routes check
    // none.
    //
    // Checked after credentials so a wrong password does not reveal that an
    // account is banned.
    const ip = clientIp(request);
    const device = deviceId(request);
    let ban: Awaited<ReturnType<typeof checkBan>> = { banned: false };
    try {
      ban = await checkBan(user.id, ip, device);
      await recordSighting(user.id, ip, device);
    } catch (err) {
      // Sign-in must not fail because moderation bookkeeping did. Bans are
      // still enforced by capabilities on every gated route.
      logger.warn({ err, userId: user.id }, "ban check failed during login; allowing");
    }

    const loginSettings = await getSiteSettings();
    if (loginSettings.requireEmailVerification && !user.verified) {
      return apiError(reply, 403, AUTH_EMAIL_NOT_VERIFIED, "Email not verified");
    }

    const { accessToken, rawRefreshToken } = await createTokens(user);

    reply.setCookie(
      COOKIE_NAME,
      rawRefreshToken,
      cookieOptions(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    );

    return {
      accessToken,
      // The SAME shape /auth/me returns. A trimmed payload here meant the store
      // held a user with tosAccepted undefined immediately after login, so the
      // terms gate fired on every single sign-in — the field was missing, not
      // false.
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        rating: user.rating,
        role: user.role,
        tosAccepted: user.tosAccepted,
        avatarUrl: user.avatarUrl,
        darkMode: user.darkMode,
        boardTheme: user.boardTheme,
        pieceSet: user.pieceSet,
        soundEnabled: user.soundEnabled,
        countryCode: user.countryCode,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      // Set when an active ban applies. The client sends them straight to their
      // standing page rather than letting them discover the ban by finding
      // every button broken.
      banned: ban.banned
        ? { reason: ban.reason, expiresAt: ban.expiresAt ?? null, standingPath: "/standing" }
        : null,
    };
  });

  /**
   * Confirm an email address.
   *
   * Deliberately a POST rather than a GET on the link: mail scanners and
   * link-preview bots fetch GET URLs, which would silently consume the token
   * before the user clicked. The emailed link opens a page that posts this.
   */
  app.post<{ Body: { token: string } }>("/auth/verify", async (request, reply) => {
    const token = request.body?.token;
    if (!token || typeof token !== "string" || token.length > 200) {
      return apiError(reply, 400, VALIDATION_FAILED, "Invalid link");
    }

    const result = await consumeToken(token, "VERIFY_EMAIL");
    if (!result.userId) {
      // One message for every failure mode. Saying "expired" versus "not found"
      // tells someone probing whether a token ever existed.
      return apiError(
        reply,
        400,
        VALIDATION_FAILED,
        "That link is no longer valid. Request a new one."
      );
    }

    await prisma.user.update({
      where: { id: result.userId },
      data: { verified: true },
    });
    return { verified: true };
  });

  /** Send another verification email. */
  app.post("/auth/verify/resend", { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true, verified: true },
    });
    if (!user) return apiError(reply, 404, NOT_FOUND, "Account not found");
    if (user.verified) return { sent: false, alreadyVerified: true };

    // Per-account limit. The global mailer cap is a backstop, not this.
    const key = `verify:resend:${userId}`;
    const count = await redis.incr(key).catch(() => 0);
    if (count === 1) await redis.expire(key, 3600).catch(() => {});
    if (count > 3) {
      return apiError(reply, 429, VALIDATION_FAILED, "Too many requests. Try again in an hour.");
    }

    void logCodeRequest(user.username, "VERIFY_EMAIL");
    const sent = await sendVerificationEmail(userId, user.email, user.username);
    return { sent };
  });

  /**
   * Begin a password reset.
   *
   * Always reports success. Reporting "no such account" turns this endpoint
   * into a way to test which email addresses are registered.
   */
  app.post<{ Body: { email: string } }>("/auth/forgot-password", async (request, reply) => {
    const email = String(request.body?.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || email.length > 254) {
      return apiError(reply, 400, VALIDATION_FAILED, "Enter your email address");
    }

    // Rate limited by address AND by caller, so this cannot be used to mail-bomb
    // one person or to enumerate many.
    const ip = clientIp(request);
    for (const [key, limit, ttl] of [
      [`reset:email:${email}`, 3, 3600],
      [`reset:ip:${ip}`, 10, 3600],
    ] as const) {
      const n = await redis.incr(key).catch(() => 0);
      if (n === 1) await redis.expire(key, ttl).catch(() => {});
      if (n > limit) {
        // Still a success response: the limit must not leak either.
        return { sent: true };
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, active: true },
    });

    if (user && user.active) {
      void logCodeRequest(user.username, "PASSWORD_RESET");
      await sendPasswordResetEmail(user.id, user.email, user.username);
    }

    return { sent: true };
  });

  /** Finish a password reset. */
  app.post<{ Body: { token: string; password: string } }>(
    "/auth/reset-password",
    async (request, reply) => {
      const { token, password } = request.body ?? {};
      if (!token || typeof token !== "string" || token.length > 200) {
        return apiError(reply, 400, VALIDATION_FAILED, "Invalid link");
      }
      if (!password || password.length < 8 || password.length > 200) {
        return apiError(reply, 400, VALIDATION_FAILED, "Password must be at least 8 characters");
      }

      const result = await consumeToken(token, "PASSWORD_RESET");
      if (!result.userId) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          "That link is no longer valid. Request a new one."
        );
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await prisma.user.update({
        where: { id: result.userId },
        data: { passwordHash },
        select: { email: true, username: true },
      });

      // Every existing session dies. A reset is often a response to a
      // compromise, so leaving the intruder signed in would defeat it.
      await prisma.refreshToken.deleteMany({ where: { userId: result.userId } });

      void sendSecurityNotice(user.email, user.username, "Your password was reset.");
      return { reset: true };
    }
  );

  // ── Refresh ───────────────────────────────────────
  app.post("/auth/refresh", async (request, reply) => {
    const rawToken = request.cookies[COOKIE_NAME];
    if (!rawToken) {
      return apiError(reply, 401, AUTH_NO_REFRESH_TOKEN, "No refresh token");
    }

    const hashed = hashToken(rawToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      reply.clearCookie(COOKIE_NAME, { path: "/" });
      return apiError(reply, 401, AUTH_INVALID_REFRESH_TOKEN, "Invalid or expired refresh token");
    }

    // Rotate: delete old, create new (handle concurrent requests gracefully)
    const deleted = await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    if (deleted.count === 0) {
      // Another concurrent request already rotated this token
      return apiError(reply, 401, AUTH_TOKEN_USED, "Token already used");
    }

    const { accessToken, rawRefreshToken } = await createTokens(stored.user);

    reply.setCookie(
      COOKIE_NAME,
      rawRefreshToken,
      cookieOptions(REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    );

    return { accessToken };
  });

  // ── Logout ────────────────────────────────────────
  app.post("/auth/logout", async (request, reply) => {
    const rawToken = request.cookies[COOKIE_NAME];
    if (rawToken) {
      const hashed = hashToken(rawToken);
      await prisma.refreshToken
        .delete({ where: { token: hashed } })
        .catch((err) => logger.warn({ err }, "failed to delete refresh token on logout"));
    }

    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  });

  // ── Me ────────────────────────────────────────────

  /**
   * Account changes: display details, and separately the password.
   *
   * Username and email are unique, so a clash is a normal outcome rather than
   * an error to swallow. Email changes require the current password — an
   * unattended session should not be able to redirect password resets to a new
   * address.
   */
  app.patch<{
    Body: {
      username?: string;
      email?: string;
      avatarUrl?: string | null;
      hideRecentGames?: boolean;
      activeFlair?: string | null;
      countryCode?: string | null;
      bio?: string | null;
      currentPassword?: string;
    };
  }>("/auth/account", { preHandler: authMiddleware }, async (request, reply) => {
    const userId = request.user.userId;
    const {
      username,
      email,
      avatarUrl,
      hideRecentGames,
      activeFlair,
      countryCode,
      bio,
      currentPassword,
    } = request.body ?? {};

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true, username: true },
    });
    if (!me) return apiError(reply, 404, NOT_FOUND, "User not found");

    const data: Record<string, unknown> = {};

    if (username !== undefined && username !== me.username) {
      const clean = sanitizeString(username).trim();
      if (clean.length < 3 || clean.length > 20 || !/^[A-Za-z0-9_-]+$/.test(clean)) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          "Usernames are 3-20 characters: letters, numbers, hyphen or underscore"
        );
      }
      const taken = await prisma.user.findFirst({
        where: { username: { equals: clean, mode: "insensitive" }, id: { not: userId } },
        select: { id: true },
      });
      if (taken) return apiError(reply, 409, VALIDATION_FAILED, "That username is taken");
      // Also refuse a name someone else used to hold, so a rename cannot be
      // used to impersonate a player's old identity.
      const historic = await prisma.usernameHistory.findFirst({
        where: { username: { equals: clean, mode: "insensitive" }, userId: { not: userId } },
        select: { id: true },
      });
      if (historic) {
        return apiError(
          reply,
          409,
          VALIDATION_FAILED,
          "That username was previously used by someone else"
        );
      }
      await prisma.usernameHistory.create({
        data: { userId, username: me.username },
      });
      data.username = clean;
    }

    if (email !== undefined && email !== me.email) {
      // Changing the address that receives password resets is a security
      // decision, not a preference.
      if (!currentPassword || !(await bcrypt.compare(currentPassword, me.passwordHash))) {
        return apiError(
          reply,
          403,
          VALIDATION_FAILED,
          "Enter your current password to change your email"
        );
      }
      const clean = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return apiError(reply, 400, VALIDATION_FAILED, "That email address is not valid");
      }
      const taken = await prisma.user.findFirst({
        where: { email: clean, id: { not: userId } },
        select: { id: true },
      });
      if (taken) return apiError(reply, 409, VALIDATION_FAILED, "That email is already in use");
      data.email = clean;
    }

    if (avatarUrl !== undefined) {
      // Remote images are fetched by every viewer's browser, so the URL is
      // restricted to https and length-capped.
      if (avatarUrl && !/^https:\/\/\S{1,290}$/.test(avatarUrl)) {
        return apiError(reply, 400, VALIDATION_FAILED, "Avatar must be an https URL");
      }
      data.avatarUrl = avatarUrl || null;
    }

    if (hideRecentGames !== undefined) data.hideRecentGames = hideRecentGames;

    if (countryCode !== undefined) {
      if (countryCode === null || countryCode === "") {
        data.countryCode = null;
      } else if (!isValidCountryCode(countryCode)) {
        return apiError(reply, 400, VALIDATION_FAILED, "Unknown country");
      } else {
        data.countryCode = countryCode.toUpperCase();
      }
    }

    if (bio !== undefined) {
      const clean = (bio ?? "").trim();
      if (clean.length > 300) {
        return apiError(reply, 400, VALIDATION_FAILED, "Bio is limited to 300 characters");
      }
      // Links on a public profile are a spam vector; text only until there is
      // a trust signal worth gating them behind.
      if (/https?:\/\/|www\./i.test(clean)) {
        return apiError(reply, 400, VALIDATION_FAILED, "Bios cannot contain links");
      }
      data.bio = clean ? sanitizeString(clean) : null;
    }

    if (activeFlair !== undefined) {
      if (activeFlair === null) {
        data.activeFlair = null;
      } else {
        // The field is user-settable, so holding the badge is checked here
        // rather than trusted from the client.
        const held = await prisma.userBadge.findUnique({
          where: { userId_badgeKey: { userId, badgeKey: activeFlair } },
          select: { id: true },
        });
        if (!held) {
          return apiError(reply, 403, VALIDATION_FAILED, "You have not earned that flair");
        }
        data.activeFlair = activeFlair;
      }
    }

    if (Object.keys(data).length === 0) return { user: null, changed: false };

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, avatarUrl: true, hideRecentGames: true },
    });

    return { user, changed: true };
  });

  /**
   * Change password.
   *
   * Every other session is revoked afterwards: the usual reason for changing a
   * password is that someone else may have it.
   */
  app.post<{ Body: { currentPassword: string; newPassword: string } }>(
    "/auth/password",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const userId = request.user.userId;
      const { currentPassword, newPassword } = request.body ?? {};

      if (!currentPassword || !newPassword) {
        return apiError(reply, 400, VALIDATION_FAILED, "Both passwords are required");
      }
      if (newPassword.length < 8) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          "New password must be at least 8 characters"
        );
      }

      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });
      if (!me) return apiError(reply, 404, NOT_FOUND, "User not found");

      if (!(await bcrypt.compare(currentPassword, me.passwordHash))) {
        return apiError(reply, 403, VALIDATION_FAILED, "Current password is incorrect");
      }

      const changed = await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 10) },
        select: { email: true, username: true },
      });

      // Sent after the fact, to the address on file. This is what surfaces an
      // account takeover to the real owner.
      void sendSecurityNotice(changed.email, changed.username, "Your password was changed.");

      // Revoke every refresh token, including this session's.
      await prisma.refreshToken.deleteMany({ where: { userId } });
      reply.clearCookie(COOKIE_NAME, { path: "/" });

      return { success: true, signedOut: true };
    }
  );

  /**
   * What the server thinks of this request.
   *
   * Exists because the admin panel failed in a way that was invisible from
   * both ends: the browser saw a redirect, the server saw a normal request,
   * and nothing said which of the several possible causes applied. This answers
   * that in one call, and deliberately reveals nothing an attacker could not
   * already determine about their own session.
   */
  app.get("/auth/whoami", async (request) => {
    const raw = request.cookies[COOKIE_NAME];
    let userId: string | null = null;
    let role: string | null = null;
    let username: string | null = null;

    if (raw) {
      const stored = await prisma.refreshToken.findUnique({
        where: { token: hashToken(raw) },
        include: { user: { select: { id: true, username: true, role: true, active: true } } },
      });
      if (stored?.user) {
        userId = stored.user.id;
        role = stored.user.role;
        username = stored.user.username;
      }
    }

    return {
      refreshCookiePresent: Boolean(raw),
      refreshCookieValid: Boolean(userId),
      username,
      role,
      isAdmin: role === "ADMIN",
      // What the API believes about itself, which is what CORS and cookie
      // scope depend on.
      seenHost: request.headers.host ?? null,
      seenOrigin: request.headers.origin ?? null,
      cookieDomain: getCookieDomain() ?? null,
      siteUrl: process.env.SITE_URL ?? null,
      adminUrl: process.env.ADMIN_URL ?? null,
    };
  });

  app.get("/auth/me", { preHandler: authMiddleware }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        username: true,
        rating: true,
        avatarUrl: true,
        tosAccepted: true,
        darkMode: true,
        boardTheme: true,
        pieceSet: true,
        soundEnabled: true,
        createdAt: true,
        ...TITLE_SELECT,
        // AFTER the spread and stated explicitly. TITLE_SELECT happens to
        // include role today, but the Admin button depends on this field and
        // must not silently lose it if that constant is ever trimmed.
        role: true,
        countryCode: true,
        bio: true,
        fideId: true,
        // Per-pool ratings. The header and profile show the pool the player
        // last competed in rather than the pooled figure, which is what makes
        // "your blitz rating" a real thing rather than a stored number nobody
        // sees.
        ratings: {
          select: { timeControl: true, rating: true, peak: true, games: true, deviation: true },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, message: "User not found" };
    }

    return { user: withTitle(user) };
  });

  // ── Update preferences ──────────────────────────────
  app.put<{
    Body: { darkMode?: boolean; boardTheme?: string; pieceSet?: string; soundEnabled?: boolean };
  }>(
    "/auth/preferences",
    { schema: { body: preferencesBodySchema }, preHandler: authMiddleware },
    async (request) => {
      const { darkMode, boardTheme, pieceSet, soundEnabled } = request.body;

      const VALID_BOARD_THEMES = ["classic", "wood", "green", "blue", "purple", "dark"];
      const VALID_PIECE_SETS = ["classic", "modern", "minimal"];

      const data: Record<string, unknown> = {};
      if (darkMode !== undefined) data.darkMode = darkMode;
      if (boardTheme && VALID_BOARD_THEMES.includes(boardTheme)) data.boardTheme = boardTheme;
      if (pieceSet && VALID_PIECE_SETS.includes(pieceSet)) data.pieceSet = pieceSet;
      if (soundEnabled !== undefined) data.soundEnabled = soundEnabled;

      const user = await prisma.user.update({
        where: { id: request.user.userId },
        data,
        select: {
          darkMode: true,
          boardTheme: true,
          pieceSet: true,
          soundEnabled: true,
        },
      });

      return { preferences: user };
    }
  );

  // ── Accept TOS ──────────────────────────────────────
  app.post("/auth/accept-tos", { preHandler: authMiddleware }, async (request) => {
    await prisma.user.update({
      where: { id: request.user.userId },
      data: { tosAccepted: true, tosAcceptedAt: new Date() },
    });
    return { success: true };
  });

  // ── Decline TOS ─────────────────────────────────────
  app.post("/auth/decline-tos", { preHandler: authMiddleware }, async (request) => {
    // Record the decline but deactivate the account
    await prisma.user.update({
      where: { id: request.user.userId },
      data: { tosAccepted: false, active: false },
    });
    return { success: true, message: "Account deactivated" };
  });
}
