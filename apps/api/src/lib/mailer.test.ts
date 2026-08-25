import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMailSpy = vi.fn().mockResolvedValue({ messageId: "x" });
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMailSpy }) },
  createTransport: () => ({ sendMail: sendMailSpy }),
}));
vi.mock("./logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() },
}));

import { sendMail, SENDER_ADDRESSES, MAIL_LIMITS, resetMailWindow } from "./mailer.js";

/**
 * These are the tests that matter most in the whole codebase.
 *
 * A mail sender that can be steered by a caller is an open relay signed by our
 * own domain. If that happens, every verification email afterwards lands in
 * spam and the domain's reputation is not quickly recoverable.
 */
describe("mailer security", () => {
  beforeEach(() => {
    resetMailWindow();
    process.env.CLOUDFLARE_EMAIL_TOKEN = "test-token";
    sendMailSpy.mockClear();
  });

  describe("header injection", () => {
    it("blocks a newline in the subject", async () => {
      // Without this, a subject can append `Bcc:` headers and turn any send
      // into a mass mailer.
      const res = await sendMail({
        from: "auth",
        to: "a@b.com",
        subject: "Hi\r\nBcc: victim@example.com",
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(false);
      expect(res.reason).toBe("unsafe-header");
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it("blocks a bare line feed too, not just CRLF", async () => {
      const res = await sendMail({
        from: "auth",
        to: "a@b.com",
        subject: "Hi\nBcc: victim@example.com",
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(false);
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it("blocks a newline in the recipient", async () => {
      const res = await sendMail({
        from: "auth",
        to: "a@b.com\nBcc: victim@example.com",
        text: "x",
        subject: "Hi",
        context: "test",
      });
      expect(res.sent).toBe(false);
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it("blocks an absurdly long subject", async () => {
      const res = await sendMail({
        from: "auth",
        to: "a@b.com",
        subject: "x".repeat(500),
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(false);
    });
  });

  describe("recipient validation", () => {
    it.each([
      ["not-an-email"],
      ["@nodomain.com"],
      ["no-at-sign.com"],
      ["spaces in@email.com"],
      [""],
      ["a@b"],
    ])("rejects %s", async (bad) => {
      const res = await sendMail({
        from: "auth",
        to: bad,
        subject: "Hi",
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(false);
      expect(sendMailSpy).not.toHaveBeenCalled();
    });

    it("rejects an over-length address", async () => {
      const res = await sendMail({
        from: "auth",
        to: "a".repeat(250) + "@example.com",
        subject: "Hi",
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(false);
    });

    it("accepts an ordinary address", async () => {
      const res = await sendMail({
        from: "auth",
        to: "player@example.com",
        subject: "Hi",
        text: "x",
        context: "test",
      });
      expect(res.sent).toBe(true);
    });
  });

  describe("sender cannot be chosen freely", () => {
    it("only ever sends from a known address", async () => {
      // A caller picks a KEY. It cannot supply an address, so a compromised
      // caller cannot send as auth@ to fake a password reset.
      await sendMail({ from: "support", to: "a@b.com", subject: "Hi", text: "x", context: "t" });
      const call = sendMailSpy.mock.calls[0][0];
      const allowed = Object.values(SENDER_ADDRESSES).map((s) => s.address);
      expect(allowed).toContain(call.from.address);
      expect(call.from.address).toBe("support@aurorachess.org");
    });

    it("uses aurorachess.org for every sender", async () => {
      for (const s of Object.values(SENDER_ADDRESSES)) {
        expect(s.address.endsWith("@aurorachess.org")).toBe(true);
      }
    });

    it("never sets cc or bcc", async () => {
      await sendMail({ from: "auth", to: "a@b.com", subject: "Hi", text: "x", context: "t" });
      const call = sendMailSpy.mock.calls[0][0];
      expect(call.cc).toBeUndefined();
      expect(call.bcc).toBeUndefined();
    });

    it("points automated mail's replies at support", async () => {
      await sendMail({ from: "noreply", to: "a@b.com", subject: "Hi", text: "x", context: "t" });
      expect(sendMailSpy.mock.calls[0][0].replyTo).toBe("support@aurorachess.org");
    });
  });

  describe("blast radius", () => {
    it("stops at a global hourly ceiling", async () => {
      // Not a per-user limit — a backstop. If any caller develops a loop, the
      // damage stops here rather than at the domain's reputation.
      let lastReason: string | undefined;
      for (let i = 0; i < MAIL_LIMITS.GLOBAL_HOURLY_CAP + 5; i++) {
        const r = await sendMail({
          from: "auth",
          to: "a@b.com",
          subject: "Hi",
          text: "x",
          context: "flood",
        });
        lastReason = r.reason;
      }
      expect(lastReason).toBe("rate-capped");
      expect(sendMailSpy.mock.calls.length).toBeLessThanOrEqual(MAIL_LIMITS.GLOBAL_HOURLY_CAP);
    });
  });

  describe("failure handling", () => {
    it("reports failure rather than throwing", async () => {
      // Mail must never break the request that triggered it: an email outage
      // should not stop people registering.
      sendMailSpy.mockRejectedValueOnce(new Error("connection refused"));
      const res = await sendMail({
        from: "auth",
        to: "a@b.com",
        subject: "Hi",
        text: "x",
        context: "t",
      });
      expect(res.sent).toBe(false);
      expect(res.reason).toBe("error");
    });

    it("does nothing when no token is configured", async () => {
      delete process.env.CLOUDFLARE_EMAIL_TOKEN;
      const res = await sendMail({
        from: "auth",
        to: "a@b.com",
        subject: "Hi",
        text: "x",
        context: "t",
      });
      expect(res.sent).toBe(false);
    });
  });
});

describe("fire-and-forget safety", () => {
  it("sendVerificationEmail never rejects, even when the database throws", async () => {
    // Registration calls this with `void`, so a rejection here is UNHANDLED —
    // and an unhandled rejection can take the Node process down. A database
    // hiccup while issuing the token would otherwise turn a slow email into a
    // crashed API mid-signup.
    vi.resetModules();
    vi.doMock("./prisma.js", () => ({
      prisma: {
        emailToken: {
          updateMany: vi.fn().mockRejectedValue(new Error("db down")),
          create: vi.fn(),
        },
      },
    }));
    const { sendVerificationEmail } = await import("./emailTokens.js");
    await expect(sendVerificationEmail("u1", "a@b.com", "dani")).resolves.toBe(false);
  });
});
