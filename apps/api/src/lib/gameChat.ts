import { capabilitiesFor, type Capabilities, type PunishmentRecord } from "@aurora/chess";
import { prisma } from "./prisma.js";
import { redis } from "./redis.js";

/**
 * Helpers for in-game chat.
 *
 * Capability lookup is duplicated from the HTTP middleware because socket
 * events do not pass through Fastify's preHandler chain — a chat message sent
 * over the socket would otherwise bypass a chat restriction entirely.
 */

export async function capabilitiesForUser(userId: string): Promise<Capabilities> {
  const rows = await prisma.punishment.findMany({
    where: {
      userId,
      liftedAt: null,
      overturnedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      type: true,
      reason: true,
      expiresAt: true,
      liftedAt: true,
      overturnedAt: true,
      becameStrikeAt: true,
      createdAt: true,
    },
  });
  return capabilitiesFor(rows as PunishmentRecord[]);
}

/** Messages allowed per window. */
const LIMIT = 5;
const WINDOW_SECONDS = 30;

/**
 * Rate limit in-game chat.
 *
 * Five messages per thirty seconds. The cap is about pressure rather than
 * bandwidth: a stream of messages while an opponent is on the clock is a way of
 * playing the person instead of the position.
 */
export async function checkChatRateLimit(userId: string): Promise<boolean> {
  try {
    const key = `chat:rate:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
    return count <= LIMIT;
  } catch {
    // Redis down: allow rather than silencing everyone.
    return true;
  }
}
