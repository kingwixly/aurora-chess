import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import { sanitizeString, auditLog } from "../middleware/admin.js";
import { authMiddleware } from "../middleware/auth.js";
import { clientIp } from "../lib/bans.js";
import { redis } from "../lib/redis.js";
import { sendMail } from "../lib/mailer.js";
import { logger } from "../lib/logger.js";

/**
 * Support tickets, and the staff terminal that answers them.
 *
 * ## The threat, stated plainly
 *
 * A staff reply feature is one mistake away from an open mail relay. If a
 * compromised or careless staff account can choose the recipient, the sender, or
 * the headers, then this endpoint sends attacker-controlled mail **signed by our
 * domain**. That burns the domain's reputation, and every legitimate
 * verification email afterwards lands in spam.
 *
 * ## The constraints that prevent it
 *
 * 1. **The recipient is never supplied by the caller.** A reply takes a ticket
 *    id and a body. The address comes from the ticket row, which was written
 *    when the ticket was created and is never updated. There is no code path in
 *    which a request body can influence who receives mail.
 * 2. **The sender is a fixed key**, resolved to an address inside the mailer.
 *    Staff cannot spoof `auth@` to send a fake password reset.
 * 3. **Header injection is blocked in the mailer**, and the subject is derived
 *    from the ticket rather than the request.
 * 4. **Rate limited per staff account**, so a stolen session cannot send in
 *    volume before anyone notices.
 * 5. **Every send is recorded** as a SupportMessage with the author id, and
 *    written to the audit log.
 * 6. **No attachments, no HTML.** Plain text only, so there is no vector for a
 *    payload or a tracking pixel.
 * 7. **Length capped**, so the body cannot be used to smuggle a large payload.
 */

const MAX_BODY = 5000;
const MAX_SUBJECT = 150;
/** Replies one staff account may send per hour. */
const STAFF_REPLY_LIMIT = 30;
/** Tickets one address may open per day. */
const TICKET_LIMIT_PER_EMAIL = 5;
const TICKET_LIMIT_PER_IP = 10;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Public: anyone can open a ticket, signed in or not. */
export async function publicSupportRoutes(app: FastifyInstance) {
  app.post<{ Body: { email?: string; subject: string; body: string } }>(
    "/support/tickets",
    async (request, reply) => {
      const rawSubject = String(request.body?.subject ?? "").trim();
      const rawBody = String(request.body?.body ?? "").trim();
      let email = String(request.body?.email ?? "")
        .trim()
        .toLowerCase();

      // A signed-in user's address is taken from their account, never from the
      // request — otherwise someone could open a ticket "from" another person
      // and have staff replies delivered to an address they chose.
      const userId = request.user?.userId ?? null;
      if (userId) {
        const me = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });
        if (me) email = me.email;
      }

      if (!EMAIL_SHAPE.test(email) || email.length > 254) {
        return apiError(reply, 400, VALIDATION_FAILED, "A valid email address is required");
      }
      if (rawSubject.length < 3 || rawSubject.length > MAX_SUBJECT) {
        return apiError(reply, 400, VALIDATION_FAILED, "Give the ticket a short subject");
      }
      if (rawBody.length < 10 || rawBody.length > MAX_BODY) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          "Describe the problem in a little more detail"
        );
      }

      // Limited by address and by caller. Without this, a script opens
      // thousands of tickets and the confirmation mail becomes a mail bomb
      // aimed at whatever address it supplies.
      const ip = clientIp(request);
      for (const [key, limit] of [
        [`ticket:email:${email}`, TICKET_LIMIT_PER_EMAIL],
        [`ticket:ip:${ip}`, TICKET_LIMIT_PER_IP],
      ] as const) {
        const n = await redis.incr(key).catch(() => 0);
        if (n === 1) await redis.expire(key, 86_400).catch(() => {});
        if (n > limit) {
          return apiError(
            reply,
            429,
            VALIDATION_FAILED,
            "You have opened several tickets recently. Give us a chance to reply first."
          );
        }
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId,
          email,
          subject: sanitizeString(rawSubject),
          messages: {
            create: { fromStaff: false, body: sanitizeString(rawBody) },
          },
        },
        select: { id: true, createdAt: true },
      });

      // Deliberately NOT emailing a confirmation. It would let anyone send one
      // message to any address by opening a ticket, which is a small but real
      // relay. The reference is shown on screen instead.
      return { ticket: { id: ticket.id, createdAt: ticket.createdAt } };
    }
  );

  /** Your own tickets, for signed-in users. */
  app.get("/support/tickets/mine", { preHandler: authMiddleware }, async (request) => {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: request.user.userId },
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { fromStaff: true, body: true, createdAt: true },
        },
      },
    });
    return { tickets };
  });
}

/** Staff only. Mounted behind the admin middleware. */
export async function staffSupportRoutes(app: FastifyInstance) {
  app.get("/admin/support", async (request) => {
    const status = (request.query as { status?: string })?.status;
    const tickets = await prisma.supportTicket.findMany({
      where:
        status === "all"
          ? {}
          : { status: { in: status === "closed" ? ["CLOSED"] : ["OPEN", "ANSWERED"] } },
      orderBy: { updatedAt: "asc" },
      take: 100,
      select: {
        id: true,
        email: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, username: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fromStaff: true,
            authorId: true,
            body: true,
            emailed: true,
            createdAt: true,
          },
        },
      },
    });
    return { tickets };
  });

  /**
   * Reply to a ticket.
   *
   * The body contains ONLY a ticket id and message text. There is deliberately
   * no recipient, sender, or subject parameter — those all come from the stored
   * ticket. This is the property that keeps the endpoint from being a relay,
   * and it is the one thing in this file that must never be relaxed for
   * convenience.
   */
  app.post<{ Params: { id: string }; Body: { body: string; close?: boolean } }>(
    "/admin/support/:id/reply",
    async (request, reply) => {
      const staffId = request.user.userId;
      const text = String(request.body?.body ?? "").trim();

      if (text.length < 2 || text.length > MAX_BODY) {
        return apiError(reply, 400, VALIDATION_FAILED, `Reply must be 2-${MAX_BODY} characters`);
      }

      const limitKey = `support:reply:${staffId}`;
      const n = await redis.incr(limitKey).catch(() => 0);
      if (n === 1) await redis.expire(limitKey, 3600).catch(() => {});
      if (n > STAFF_REPLY_LIMIT) {
        logger.error({ staffId }, "staff support reply limit hit");
        return apiError(reply, 429, VALIDATION_FAILED, "Reply limit reached for this hour");
      }

      const ticket = await prisma.supportTicket.findUnique({
        where: { id: request.params.id },
        select: { id: true, email: true, subject: true },
      });
      if (!ticket) return apiError(reply, 404, NOT_FOUND, "Ticket not found");

      const clean = sanitizeString(text);

      // The recipient and subject come from `ticket`. Nothing here is derived
      // from the request body except the message text.
      const result = await sendMail({
        from: "support",
        to: ticket.email,
        subject: `Re: ${ticket.subject}`.slice(0, MAX_SUBJECT + 4),
        text: [
          clean,
          "",
          "—",
          "Aurora Chess support",
          `Ticket ${ticket.id}`,
          "Reply to this email to continue the conversation.",
        ].join("\n"),
        context: `support-reply:${ticket.id}`,
      });

      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          fromStaff: true,
          authorId: staffId,
          body: clean,
          emailed: result.sent,
        },
      });

      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: request.body?.close ? "CLOSED" : "ANSWERED" },
      });

      // Recorded whether or not the mail left, so a silent delivery failure is
      // visible rather than looking like the reply was never written.
      await auditLog(
        staffId,
        "support.reply",
        "supportTicket",
        ticket.id,
        { emailed: result.sent, reason: result.reason },
        request.ip
      );

      if (!result.sent) {
        return apiError(
          reply,
          502,
          VALIDATION_FAILED,
          `Reply saved, but the email did not send (${result.reason}). Try again shortly.`
        );
      }
      return { sent: true };
    }
  );

  app.patch<{ Params: { id: string }; Body: { status: "OPEN" | "ANSWERED" | "CLOSED" } }>(
    "/admin/support/:id",
    async (request, reply) => {
      const status = request.body?.status;
      if (!status || !["OPEN", "ANSWERED", "CLOSED"].includes(status)) {
        return apiError(reply, 400, VALIDATION_FAILED, "Unknown status");
      }
      const ticket = await prisma.supportTicket.update({
        where: { id: request.params.id },
        data: { status },
        select: { id: true, status: true },
      });
      return { ticket };
    }
  );
}
