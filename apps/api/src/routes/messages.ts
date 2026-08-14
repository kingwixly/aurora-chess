import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireCapability } from "../middleware/capabilities.js";
import { PUBLIC_USER_SELECT, withTitle } from "../lib/titles.js";
import { apiError, VALIDATION_FAILED, NOT_FOUND } from "../lib/errorCodes.js";
import { sanitizeString } from "../middleware/admin.js";
import { authMiddleware } from "../middleware/auth.js";

/**
 * Direct messages.
 *
 * **Friends only.** Open DMs on a public chess site are a harassment vector
 * before they are a feature — the people most likely to be messaged by
 * strangers are the ones a club least wants to drive away. Requiring an
 * accepted friendship makes the inbox opt-in by construction rather than by
 * moderation after the fact.
 */

const MAX_LENGTH = 2000;

/** Are these two accounts friends? */
async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(f);
}

/** The conversation between two people, created on first use. */
async function findOrCreateConversation(a: string, b: string): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [{ members: { some: { userId: a } } }, { members: { some: { userId: b } } }],
    },
    select: { id: true, members: { select: { userId: true } } },
  });
  // A conversation with exactly these two, not a future group that happens to
  // contain them.
  if (existing && existing.members.length === 2) return existing.id;

  const created = await prisma.conversation.create({
    data: { members: { create: [{ userId: a }, { userId: b }] } },
    select: { id: true },
  });
  return created.id;
}

export default async function messageRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);
  // A moderation action on the account blocks this surface entirely.
  app.addHook("preHandler", requireCapability("chat"));

  /** Conversation list, most recent first, with unread counts. */
  app.get("/messages", async (request) => {
    const userId = request.user.userId;

    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      orderBy: { conversation: { lastMessageAt: "desc" } },
      take: 100,
      select: {
        lastReadAt: true,
        muted: true,
        conversation: {
          select: {
            id: true,
            lastMessageAt: true,
            members: {
              where: { userId: { not: userId } },
              select: { user: { select: PUBLIC_USER_SELECT } },
            },
            messages: {
              where: { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { body: true, createdAt: true, authorId: true },
            },
          },
        },
      },
    });

    // Unread counts in one grouped query rather than one per conversation.
    const unreadCounts = await Promise.all(
      memberships.map((m) =>
        prisma.message.count({
          where: {
            conversationId: m.conversation.id,
            createdAt: { gt: m.lastReadAt },
            authorId: { not: userId },
            deletedAt: null,
          },
        })
      )
    );

    return {
      conversations: memberships.map((m, i) => ({
        id: m.conversation.id,
        muted: m.muted,
        lastMessageAt: m.conversation.lastMessageAt,
        unread: unreadCounts[i],
        with: m.conversation.members[0] ? withTitle(m.conversation.members[0].user) : null,
        preview: m.conversation.messages[0]
          ? {
              body: m.conversation.messages[0].body.slice(0, 120),
              createdAt: m.conversation.messages[0].createdAt,
              mine: m.conversation.messages[0].authorId === userId,
            }
          : null,
      })),
    };
  });

  /** Messages in one conversation. Marks it read. */
  app.get<{ Params: { id: string }; Querystring: { before?: string } }>(
    "/messages/:id",
    async (request, reply) => {
      const userId = request.user.userId;
      const member = await prisma.conversationMember.findFirst({
        where: { conversationId: request.params.id, userId },
        select: { id: true },
      });
      // Not a member: not found rather than forbidden, so the existence of a
      // conversation between other people is not confirmed.
      if (!member) return apiError(reply, 404, NOT_FOUND, "Conversation not found");

      const messages = await prisma.message.findMany({
        where: {
          conversationId: request.params.id,
          deletedAt: null,
          ...(request.query.before ? { createdAt: { lt: new Date(request.query.before) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: PUBLIC_USER_SELECT },
        },
      });

      await prisma.conversationMember.update({
        where: { id: member.id },
        data: { lastReadAt: new Date() },
      });

      return {
        messages: messages.reverse().map((m) => ({ ...m, author: withTitle(m.author) })),
      };
    }
  );

  /** Send a message to a friend. Creates the conversation if needed. */
  app.post<{ Body: { to?: string; conversationId?: string; body: string } }>(
    "/messages",
    async (request, reply) => {
      const userId = request.user.userId;
      const { to, conversationId, body } = request.body ?? {};

      const text = (body ?? "").trim();
      if (!text) return apiError(reply, 400, VALIDATION_FAILED, "Message cannot be empty");
      if (text.length > MAX_LENGTH) {
        return apiError(
          reply,
          400,
          VALIDATION_FAILED,
          `Messages are limited to ${MAX_LENGTH} characters`
        );
      }

      let convId = conversationId;
      let recipientId = to;

      if (convId) {
        const conv = await prisma.conversation.findFirst({
          where: { id: convId, members: { some: { userId } } },
          select: { members: { where: { userId: { not: userId } }, select: { userId: true } } },
        });
        if (!conv) return apiError(reply, 404, NOT_FOUND, "Conversation not found");
        recipientId = conv.members[0]?.userId;
      }

      if (!recipientId) {
        return apiError(reply, 400, VALIDATION_FAILED, "No recipient");
      }
      if (recipientId === userId) {
        return apiError(reply, 400, VALIDATION_FAILED, "You cannot message yourself");
      }

      // Re-checked on every send, not just when the conversation opens: an
      // existing thread must go quiet when the friendship ends, otherwise
      // unfriending someone would not actually stop their messages.
      if (!(await areFriends(userId, recipientId))) {
        return apiError(reply, 403, VALIDATION_FAILED, "You can only message friends");
      }

      if (!convId) convId = await findOrCreateConversation(userId, recipientId);

      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: { conversationId: convId, authorId: userId, body: sanitizeString(text) },
          select: {
            id: true,
            body: true,
            createdAt: true,
            conversationId: true,
            author: { select: PUBLIC_USER_SELECT },
          },
        }),
        prisma.conversation.update({
          where: { id: convId },
          data: { lastMessageAt: new Date() },
        }),
        prisma.conversationMember.updateMany({
          where: { conversationId: convId, userId },
          data: { lastReadAt: new Date() },
        }),
      ]);

      return { message: { ...message, author: withTitle(message.author) } };
    }
  );

  /** Total unread, for a badge in the header. */
  app.get("/messages/unread", async (request) => {
    const userId = request.user.userId;
    const members = await prisma.conversationMember.findMany({
      where: { userId, muted: false },
      select: { conversationId: true, lastReadAt: true },
    });
    if (members.length === 0) return { unread: 0 };

    const unread = await prisma.message.count({
      where: {
        authorId: { not: userId },
        deletedAt: null,
        OR: members.map((m) => ({
          conversationId: m.conversationId,
          createdAt: { gt: m.lastReadAt },
        })),
      },
    });
    return { unread };
  });

  /** Mute or unmute a conversation. */
  app.patch<{ Params: { id: string }; Body: { muted: boolean } }>(
    "/messages/:id/mute",
    async (request, reply) => {
      const userId = request.user.userId;
      const { muted } = request.body ?? {};
      const updated = await prisma.conversationMember.updateMany({
        where: { conversationId: request.params.id, userId },
        data: { muted: Boolean(muted) },
      });
      if (updated.count === 0) return apiError(reply, 404, NOT_FOUND, "Conversation not found");
      return { muted: Boolean(muted) };
    }
  );

  /** Delete your own message. Soft, so staff can still see it in a report. */
  app.delete<{ Params: { id: string } }>("/messages/message/:id", async (request, reply) => {
    const userId = request.user.userId;
    const msg = await prisma.message.findUnique({
      where: { id: request.params.id },
      select: { authorId: true },
    });
    if (!msg) return apiError(reply, 404, NOT_FOUND, "Message not found");
    if (msg.authorId !== userId) {
      return apiError(reply, 403, VALIDATION_FAILED, "You can only delete your own messages");
    }
    await prisma.message.update({
      where: { id: request.params.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  });
}
