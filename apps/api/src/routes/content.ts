import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireCapability } from "../middleware/capabilities.js";
import { apiError, VALIDATION_FAILED } from "../lib/errorCodes.js";
import { sanitizeString } from "../middleware/admin.js";

const PUBLIC_AUTHOR = {
  id: true,
  username: true,
  titleManual: true,
  titleAuto: true,
  countryCode: true,
  staffRank: true,
} as const;

/** Boards. Fixed rather than user-created: a forum with fifty empty boards is worse than one with four busy ones. */
const CATEGORIES = ["general", "help", "feedback", "off-topic"] as const;

const MAX_TITLE = 140;
const MAX_BODY = 20_000;

/** Turn a title into a URL segment. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function contentRoutes(app: FastifyInstance) {
  // ─────────────────────────── Blog ───────────────────────────

  /** Published posts, newest first. Drafts are staff-only and excluded here. */
  app.get("/blog", async () => {
    const posts = await prisma.post.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        slug: true,
        title: true,
        summary: true,
        publishedAt: true,
        author: { select: PUBLIC_AUTHOR },
      },
    });
    return { posts };
  });

  app.get<{ Params: { slug: string } }>("/blog/:slug", async (request, reply) => {
    const post = await prisma.post.findUnique({
      where: { slug: request.params.slug },
      select: {
        slug: true,
        title: true,
        summary: true,
        body: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: PUBLIC_AUTHOR },
      },
    });

    // An unpublished post is treated as absent rather than forbidden. Saying
    // "this exists but you cannot see it" leaks the existence of drafts.
    if (!post || !post.publishedAt) {
      return apiError(reply, 404, VALIDATION_FAILED, "No such post");
    }
    return { post };
  });

  // ─────────────────────────── Forum ───────────────────────────

  app.get<{ Querystring: { category?: string } }>("/forum/threads", async (request) => {
    const category = request.query.category;
    const threads = await prisma.thread.findMany({
      where: {
        deletedAt: null,
        ...(category && CATEGORIES.includes(category as never) ? { category } : {}),
      },
      // Pinned first, then by recent activity. `lastReplyAt` is denormalised
      // precisely so this does not have to count replies to sort.
      orderBy: [{ pinned: "desc" }, { lastReplyAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        category: true,
        pinned: true,
        locked: true,
        replyCount: true,
        lastReplyAt: true,
        createdAt: true,
        author: { select: PUBLIC_AUTHOR },
      },
    });
    return { threads, categories: CATEGORIES };
  });

  app.get<{ Params: { id: string } }>("/forum/threads/:id", async (request, reply) => {
    const thread = await prisma.thread.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        title: true,
        category: true,
        pinned: true,
        locked: true,
        deletedAt: true,
        createdAt: true,
        author: { select: PUBLIC_AUTHOR },
        posts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            deletedAt: true,
            editedAt: true,
            createdAt: true,
            author: { select: PUBLIC_AUTHOR },
          },
        },
      },
    });

    if (!thread || thread.deletedAt) {
      return apiError(reply, 404, VALIDATION_FAILED, "No such thread");
    }

    // Removed posts leave a tombstone rather than vanishing, so a conversation
    // that referred to them still reads sensibly instead of losing its middle.
    const posts = thread.posts.map((p) =>
      p.deletedAt ? { ...p, body: "[removed by moderators]", author: null } : p
    );

    return { thread: { ...thread, posts } };
  });

  /**
   * Start a thread.
   *
   * Behind the chat capability rather than a new one: someone silenced for how
   * they talk to people in games should not get a fresh audience in the forum.
   */
  app.post<{ Body: { title?: string; body?: string; category?: string } }>(
    "/forum/threads",
    { preHandler: [authMiddleware, requireCapability("chat")] },
    async (request, reply) => {
      const title = sanitizeString(String(request.body?.title ?? "")).trim();
      const body = String(request.body?.body ?? "").trim();
      const category = CATEGORIES.includes(request.body?.category as never)
        ? request.body!.category!
        : "general";

      if (title.length < 3 || title.length > MAX_TITLE) {
        return apiError(reply, 400, VALIDATION_FAILED, "Give the thread a title");
      }
      if (body.length < 1 || body.length > MAX_BODY) {
        return apiError(reply, 400, VALIDATION_FAILED, "Write something in the post");
      }

      const thread = await prisma.thread.create({
        data: {
          title,
          category,
          authorId: request.user.userId,
          lastReplyAt: new Date(),
          posts: { create: { authorId: request.user.userId, body } },
        },
        select: { id: true },
      });

      return { thread };
    }
  );

  app.post<{ Params: { id: string }; Body: { body?: string } }>(
    "/forum/threads/:id/posts",
    { preHandler: [authMiddleware, requireCapability("chat")] },
    async (request, reply) => {
      const body = String(request.body?.body ?? "").trim();
      if (body.length < 1 || body.length > MAX_BODY) {
        return apiError(reply, 400, VALIDATION_FAILED, "Write something first");
      }

      const thread = await prisma.thread.findUnique({
        where: { id: request.params.id },
        select: { id: true, locked: true, deletedAt: true },
      });
      if (!thread || thread.deletedAt) {
        return apiError(reply, 404, VALIDATION_FAILED, "No such thread");
      }
      if (thread.locked) {
        return apiError(reply, 403, VALIDATION_FAILED, "This thread is locked");
      }

      // The counter and timestamp are updated in the same transaction as the
      // post, so the list can never show a reply count that does not match.
      const [post] = await prisma.$transaction([
        prisma.threadPost.create({
          data: { threadId: thread.id, authorId: request.user.userId, body },
          select: { id: true, body: true, createdAt: true },
        }),
        prisma.thread.update({
          where: { id: thread.id },
          data: { lastReplyAt: new Date(), replyCount: { increment: 1 } },
        }),
      ]);

      return { post };
    }
  );

  /** Delete your own post. Staff removal lives in the admin routes. */
  app.delete<{ Params: { id: string } }>(
    "/forum/posts/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const post = await prisma.threadPost.findUnique({
        where: { id: request.params.id },
        select: { id: true, authorId: true, deletedAt: true },
      });
      if (!post || post.deletedAt) {
        return apiError(reply, 404, VALIDATION_FAILED, "No such post");
      }
      if (post.authorId !== request.user.userId) {
        return apiError(reply, 403, VALIDATION_FAILED, "Not your post");
      }

      // Soft delete: the tombstone keeps the surrounding conversation readable.
      await prisma.threadPost.update({
        where: { id: post.id },
        data: { deletedAt: new Date() },
      });
      return { success: true };
    }
  );
}
