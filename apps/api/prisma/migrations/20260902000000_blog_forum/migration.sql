-- Blog and forum.
--
-- Posts and threads are separate models rather than one with a type flag.
-- They have genuinely different rules: a post is staff-authored, edited over
-- time, and is the site speaking; a thread is anyone's and is a conversation.
-- Merged, every permission check would need the flag anyway.

CREATE TABLE IF NOT EXISTS "Post" (
  "id"          TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "summary"     TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "Post"("slug");
CREATE INDEX IF NOT EXISTS "Post_publishedAt_idx" ON "Post"("publishedAt");
CREATE INDEX IF NOT EXISTS "Post_slug_idx" ON "Post"("slug");

CREATE TABLE IF NOT EXISTS "Thread" (
  "id"          TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "category"    TEXT NOT NULL DEFAULT 'general',
  "authorId"    TEXT NOT NULL,
  "pinned"      BOOLEAN NOT NULL DEFAULT false,
  "locked"      BOOLEAN NOT NULL DEFAULT false,
  "deletedAt"   TIMESTAMP(3),
  "lastReplyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "replyCount"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Thread_category_pinned_lastReplyAt_idx"
  ON "Thread"("category", "pinned", "lastReplyAt");
CREATE INDEX IF NOT EXISTS "Thread_authorId_idx" ON "Thread"("authorId");

CREATE TABLE IF NOT EXISTS "ThreadPost" (
  "id"        TEXT NOT NULL,
  "threadId"  TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "editedAt"  TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThreadPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ThreadPost_threadId_createdAt_idx"
  ON "ThreadPost"("threadId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Thread" ADD CONSTRAINT "Thread_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
