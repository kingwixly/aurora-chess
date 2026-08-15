import { redis } from "./redis.js";
import { logger } from "./logger.js";

/**
 * Signup velocity limiting.
 *
 * Open registration means anyone can create an account, including someone who
 * has just been banned. This does not try to stop that outright — it cannot,
 * and a wall that a determined person walks around while blocking legitimate
 * players is a bad trade.
 *
 * What it does is make **bulk** signup impractical. One account is free. Three
 * from the same address in an hour is unusual. Ten is a script.
 *
 * Chosen over email verification deliberately: this costs a legitimate player
 * nothing at all, needs no third-party service, and cannot silently lock
 * someone out because a message went to spam.
 */

/** Signups allowed per address, per window. */
const IP_LIMIT = 5;
/** Signups allowed per device fingerprint, per window. */
const DEVICE_LIMIT = 3;
/** How long the counters live. */
const WINDOW_SECONDS = 60 * 60;

export interface VelocityResult {
  allowed: boolean;
  /** Which signal tripped, for the log. Never shown to the user. */
  reason?: "ip" | "device";
  /** Seconds until they can try again. */
  retryAfter?: number;
}

/**
 * Check and record a signup attempt.
 *
 * The address limit is the looser of the two on purpose: a household, a school
 * or a university hall legitimately shares one, and locking out a whole
 * building to stop one person is the wrong trade. A device fingerprint is far
 * more specific, so it gets a tighter bound.
 *
 * Fails **open**. If Redis is down, registration keeps working — an outage
 * should not close the front door.
 */
export async function checkSignupVelocity(
  ip: string | null,
  device: string | null
): Promise<VelocityResult> {
  try {
    if (device) {
      const key = `signup:dev:${device}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, WINDOW_SECONDS);
      if (count > DEVICE_LIMIT) {
        const ttl = await redis.ttl(key);
        return { allowed: false, reason: "device", retryAfter: Math.max(ttl, 60) };
      }
    }

    if (ip) {
      const key = `signup:ip:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, WINDOW_SECONDS);
      if (count > IP_LIMIT) {
        const ttl = await redis.ttl(key);
        return { allowed: false, reason: "ip", retryAfter: Math.max(ttl, 60) };
      }
    }

    return { allowed: true };
  } catch (err) {
    // Consistent with the ban check and the capability middleware: a
    // dependency failing must not take registration down with it.
    logger.warn({ err }, "signup velocity check failed; allowing");
    return { allowed: true };
  }
}

/**
 * Release a counted attempt.
 *
 * Called when a signup fails validation, so a typo'd password does not spend
 * one of someone's five tries.
 */
export async function releaseSignupAttempt(
  ip: string | null,
  device: string | null
): Promise<void> {
  try {
    if (device) await redis.decr(`signup:dev:${device}`);
    if (ip) await redis.decr(`signup:ip:${ip}`);
  } catch {
    // Best effort. An uncounted release only makes the limit slightly stricter.
  }
}

export const VELOCITY_LIMITS = { IP_LIMIT, DEVICE_LIMIT, WINDOW_SECONDS };
