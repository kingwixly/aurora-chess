CREATE TABLE IF NOT EXISTS "Conversation" (
    "id"            TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Denormalised so the conversation list sorts without touching messages.
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

CREATE TABLE IF NOT EXISTS "ConversationMember" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    -- A timestamp rather than per-message flags: marking a conversation read is
    -- then one write instead of one per message.
    "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muted"          BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationMember_conversationId_userId_key"
    ON "ConversationMember"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "ConversationMember_userId_idx" ON "ConversationMember"("userId");

CREATE TABLE IF NOT EXISTS "Message" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId"       TEXT NOT NULL,
    "body"           TEXT NOT NULL,
    -- Soft delete: the row stays so staff can still see what was said in a
    -- report, and so the conversation does not renumber.
    "deletedAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx"
    ON "Message"("conversationId", "createdAt");

ALTER TABLE "ConversationMember" DROP CONSTRAINT IF EXISTS "ConversationMember_conversationId_fkey";
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" DROP CONSTRAINT IF EXISTS "ConversationMember_userId_fkey";
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_conversationId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_authorId_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
