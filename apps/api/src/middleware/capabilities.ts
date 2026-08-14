import type { FastifyRequest, FastifyReply } from "fastify";
import { capabilitiesFor, type Capabilities, type PunishmentRecord } from "@aurora/chess";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

/**
 * Capability enforcement.
 *
 * The rule that shapes everything here: **a banned account must still be able
 * to sign in.** If the ban check lives in the auth middleware, a banned user
 * cannot authenticate, cannot reach their standing page, and cannot appeal —
 * which turns every ban into a permanent one regardless of intent.
 *
 * So authentication is unconditional and *capabilities* are checked per route.
 * The standing routes require none.
 */

declare module "fastify" {
  interface FastifyRequest {
    capabilities?: Capabilities;
  }
}

/** Punishments that could still constrain this account. */
async function loadPunishments(userId: string): Promise<PunishmentRecord[]> {
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
      appealsDisabled: true,
      createdAt: true,
    },
  });
  return rows as PunishmentRecord[];
}

/**
 * Attach capabilities to the request.
 *
 * Runs after `authMiddleware`. Never rejects — deciding what a reduced account
 * may do is the job of {@link requireCapability}, so that a route can opt out.
 */
export async function loadCapabilities(request: FastifyRequest): Promise<void> {
  if (!request.user?.userId) return;
  try {
    request.capabilities = capabilitiesFor(await loadPunishments(request.user.userId));
  } catch (err) {
    // Fail OPEN, deliberately.
    //
    // Failing closed would lock every legitimate player out of the site during
    // a database blip, to keep out the handful of people under a restriction.
    // Bans — the punishment that actually matters — are enforced separately at
    // sign-in, so the exposure here is limited to a suspended player getting a
    // game they should not have during an outage.
    logger.warn({ err, userId: request.user.userId }, "capability lookup failed; allowing");
    request.capabilities = undefined;
  }
}

/**
 * Require a capability, or explain why it is missing.
 *
 * The error carries `standingUrl` so every client can send the person somewhere
 * that tells them what happened, rather than showing a bare 403.
 */
export function requireCapability(cap: keyof Omit<Capabilities, "standing">) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.capabilities) await loadCapabilities(request);
    if (request.capabilities && request.capabilities[cap] === false) {
      return reply.status(403).send({
        code: "MODERATION_RESTRICTED",
        error: "A moderation action on your account prevents this.",
        capability: cap,
        standingPath: "/standing",
      });
    }
  };
}
