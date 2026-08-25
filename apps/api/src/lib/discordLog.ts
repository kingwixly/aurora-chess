import { logger } from "./logger.js";
import { redis } from "./redis.js";

/**
 * Staff notifications to Discord.
 *
 * **What is deliberately NOT sent, and why.**
 *
 * No email address, no code or token, no IP, and no user id. Username and
 * timestamp only. That is not squeamishness — a channel that logs "who asked
 * for a password reset and when" is itself a social-engineering aid: it tells
 * anyone reading exactly whose account is mid-reset, which is the opening a
 * support-impersonation attempt needs. Keeping the user id out matters too,
 * since it is a stable identifier useful for correlating across leaks.
 *
 * The channel this posts to must be **staff-only**. Discord appeal volunteers
 * should not see it.
 *
 * Every call is fire-and-forget and swallows its own errors. A webhook outage
 * must never affect a login.
 */

/** Events worth telling staff about. */
export type AuthEvent =
  | "verification-requested"
  | "verification-completed"
  | "password-reset-requested"
  | "password-reset-completed"
  | "password-changed"
  | "email-changed";

const LABELS: Record<AuthEvent, string> = {
  "verification-requested": "requested a verification code",
  "verification-completed": "verified their email",
  "password-reset-requested": "requested a password reset",
  "password-reset-completed": "completed a password reset",
  "password-changed": "changed their password",
  "email-changed": "changed their email address",
};

/**
 * Posts per minute before the webhook goes quiet.
 *
 * A flood of reset requests would otherwise turn the channel into noise at
 * exactly the moment staff need to read it, and Discord rate-limits the
 * endpoint anyway. Suppression is logged locally so nothing is lost.
 */
const MAX_PER_MINUTE = 20;

async function withinRate(): Promise<boolean> {
  try {
    const key = `discord:auth:${Math.floor(Date.now() / 60_000)}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 120);
    return n <= MAX_PER_MINUTE;
  } catch {
    return true;
  }
}

export function notifyAuthEvent(event: AuthEvent, username: string): void {
  const url = process.env.DISCORD_AUTH_WEBHOOK;
  if (!url) return;

  void (async () => {
    try {
      if (!(await withinRate())) {
        logger.warn({ event }, "discord auth webhook rate-limited; suppressed");
        return;
      }

      // Username is escaped so a crafted name cannot forge formatting, ping a
      // role, or inject a link into the staff channel.
      const safe = username.replace(/[`@*_~<>|\\]/g, "").slice(0, 32);
      const body = {
        username: "Aurora auth log",
        // Suppresses every mention type regardless of content.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            description: `**${safe}** ${LABELS[event]}`,
            color: 0x18c0d8,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        logger.warn({ status: res.status, event }, "discord auth webhook rejected");
      }
    } catch (err) {
      logger.warn({ err, event }, "discord auth webhook failed");
    }
  })();
}
