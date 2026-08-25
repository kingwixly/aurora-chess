CREATE TYPE "EmailTokenKind" AS ENUM ('VERIFY_EMAIL', 'PASSWORD_RESET');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- Only the hash is stored. A token is a bearer credential exactly like a
-- password, and a leaked database must not hand someone the ability to reset
-- every account.
CREATE TABLE IF NOT EXISTS "EmailToken" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "kind"      "EmailTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailToken_userId_kind_idx" ON "EmailToken"("userId", "kind");
CREATE INDEX IF NOT EXISTS "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");
ALTER TABLE "EmailToken" DROP CONSTRAINT IF EXISTS "EmailToken_userId_fkey";
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The requester's address lives on the ticket. Staff replies always go to this
-- stored value, never to an address supplied in the reply request -- that is
-- the difference between a support inbox and an open mail relay.
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT,
    "email"     TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "status"    "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_email_idx" ON "SupportTicket"("email");
ALTER TABLE "SupportTicket" DROP CONSTRAINT IF EXISTS "SupportTicket_userId_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id"        TEXT NOT NULL,
    "ticketId"  TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL,
    "authorId"  TEXT,
    "body"      TEXT NOT NULL,
    "emailed"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
ALTER TABLE "SupportMessage" DROP CONSTRAINT IF EXISTS "SupportMessage_ticketId_fkey";
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
