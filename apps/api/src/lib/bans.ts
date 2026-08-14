import type { FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

/**
 * Ban enforcement.
 *
 * Three scopes, because each defeats a different kind of evasion:
 *
 * - **Account** stops the person using that login.
 * - **IP** stops them making a new one from the same connection. Blunt — a
 *   shared household or a school shares an address — so it is short by default
 *   and never applied automatically.
 * - **Device** uses a fingerprint the client sends, which survives a new
 *   account and a VPN but not a browser reinstall.
 *
 * None of these is reliable alone. Together they raise the cost of evasion
 * enough for a club-sized site, which is the honest goal — a determined person
 * with a new device and a mobile connection will get back in, and no amount of
 * fingerprinting changes that.
 */

export interface BanCheck {
  banned: boolean;
  reason?: string;
  /** Null on a permanent ban. */
  expiresAt?: Date | null;
  scope?: "ACCOUNT" | "IP" | "DEVICE";
}

/** Header the client sets with its fingerprint. */
export const DEVICE_HEADER = "x-aurora-device";

/** The caller's address, honouring the proxy header nginx sets. */
export function clientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    // Left-most entry is the original client; the rest are proxies.
    return forwarded.split(",")[0]!.trim();
  }
  return request.ip;
}

export function deviceId(request: FastifyRequest): string | null {
  const raw = request.headers[DEVICE_HEADER];
  if (typeof raw !== "string") return null;
  // Fingerprints are opaque hex from the client; anything else is junk or an
  // injection attempt.
  return /^[a-f0-9]{16,64}$/i.test(raw) ? raw.toLowerCase() : null;
}

/**
 * Is this request banned?
 *
 * Checks all three scopes in one query. Expired and lifted bans are excluded in
 * SQL rather than filtered afterwards, so a stale ban can never leak through.
 */
export async function checkBan(
  userId: string | null,
  ip: string | null,
  device: string | null
): Promise<BanCheck> {
  const now = new Date();

  const where = {
    // Only BAN-type punishments block sign-in. A suspension or restriction is
    // enforced per capability instead, so those accounts still log in.
    type: "BAN" as const,
    liftedAt: null,
    overturnedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    AND: [
      {
        OR: [
          ...(userId ? [{ scope: "ACCOUNT" as const, userId }] : []),
          ...(ip ? [{ scope: "IP" as const, ip }] : []),
          ...(device ? [{ scope: "DEVICE" as const, deviceId: device }] : []),
        ],
      },
    ],
  };

  // Nothing to match on: not banned, rather than "match everything".
  if (where.AND[0]!.OR.length === 0) return { banned: false };

  let ban: { reason: string; expiresAt: Date | null; scope: BanCheck["scope"] } | null = null;
  try {
    ban = await prisma.punishment.findFirst({
      where,
      // Permanent bans sort first so the message reflects the worst one.
      orderBy: [{ expiresAt: { sort: "desc", nulls: "first" } }],
      select: { reason: true, expiresAt: true, scope: true },
    });
  } catch (err) {
    // Fail OPEN, consistent with the capability middleware: a database blip
    // must not lock every legitimate player out of signing in. A ban that is
    // missed here is still enforced on every gated route once they are in.
    logger.warn({ err }, "ban lookup failed; allowing sign-in");
    return { banned: false };
  }

  if (!ban) return { banned: false };
  return {
    banned: true,
    reason: ban.reason,
    expiresAt: ban.expiresAt,
    scope: ban.scope,
  };
}

/**
 * Record where an account has been seen from.
 *
 * Without this an IP or device ban has nothing to match against after the fact:
 * you can ban the address someone is using now, but not the one they used when
 * they cheated. Lists are capped — the point is recent association, not a
 * permanent movement log.
 */
export async function recordSighting(
  userId: string,
  ip: string | null,
  device: string | null
): Promise<void> {
  if (!ip && !device) return;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { knownIps: true, deviceIds: true },
    });
    if (!user) return;

    // Defaulted: these are array columns, but a partial select or an older row
    // can still yield undefined, and this must never throw inside a login.
    const knownIps: string[] = user.knownIps ?? [];
    const deviceIds: string[] = user.deviceIds ?? [];

    const ips = ip ? [ip, ...knownIps.filter((x: string) => x !== ip)].slice(0, 10) : knownIps;
    const devices = device
      ? [device, ...deviceIds.filter((x: string) => x !== device)].slice(0, 5)
      : deviceIds;

    if (ips.length === knownIps.length && devices.length === deviceIds.length) {
      if (ips[0] === knownIps[0] && devices[0] === deviceIds[0]) return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { knownIps: ips, deviceIds: devices },
    });
  } catch (err) {
    // Never let bookkeeping break a request.
    logger.warn({ err, userId }, "failed to record sighting");
  }
}

/** Every account seen from the same address or device, for evasion checks. */
export async function linkedAccounts(
  userId: string
): Promise<{ id: string; username: string; sharedIp: boolean; sharedDevice: boolean }[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { knownIps: true, deviceIds: true },
  });
  if (!me) return [];
  if (me.knownIps.length === 0 && me.deviceIds.length === 0) return [];

  const others = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        ...(me.knownIps.length ? [{ knownIps: { hasSome: me.knownIps } }] : []),
        ...(me.deviceIds.length ? [{ deviceIds: { hasSome: me.deviceIds } }] : []),
      ],
    },
    select: { id: true, username: true, knownIps: true, deviceIds: true },
    take: 25,
  });

  return others.map(
    (o: { id: string; username: string; knownIps: string[]; deviceIds: string[] }) => ({
      id: o.id,
      username: o.username,
      sharedIp: (o.knownIps ?? []).some((x: string) => (me.knownIps ?? []).includes(x)),
      // A shared device is far stronger evidence than a shared address: a
      // household shares an address, it rarely shares a browser profile.
      sharedDevice: (o.deviceIds ?? []).some((x: string) => (me.deviceIds ?? []).includes(x)),
    })
  );
}
