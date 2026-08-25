import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "./logger.js";

/**
 * Outbound mail, via Cloudflare Email Service.
 *
 * Cloudflare exposes an authenticated SMTP endpoint, so this runs on our own
 * server with no edge Worker and no third-party provider. The API token is the
 * SMTP password.
 *
 * **Why a self-hosted MTA is not an option:** the server sits on a residential
 * connection. Those ranges are on Spamhaus's policy block list by default, most
 * ISPs block outbound port 25, and reverse DNS cannot be set on a consumer IP.
 * Mail would be silently dropped by Gmail. Cloudflare Tunnels do not help —
 * they are inbound only, so outbound SMTP still leaves via the ISP.
 *
 * ## Security model
 *
 * Every send in this file goes through {@link sendMail}, which enforces:
 *
 * - **The sender is chosen from a fixed set**, never from a caller argument.
 *   A caller picks `auth`, `noreply` or `support`; it cannot supply an address.
 * - **Header injection is impossible**: subject and recipient are rejected if
 *   they contain CR or LF. Without this, a crafted subject can append `Bcc:`
 *   headers and turn any send into a mass mailer.
 * - **One recipient per send.** No cc, no bcc, no arrays. If a feature ever
 *   needs to mail several people, it loops and each send is logged separately.
 * - **Every send is counted** against a global hourly ceiling, so a bug in a
 *   caller cannot empty the sending quota or get the domain flagged.
 */

/** Addresses this system is allowed to send from. Callers pick a key. */
const SENDERS = {
  auth: { address: "auth@aurorachess.org", name: "Aurora Chess" },
  noreply: { address: "noreply@aurorachess.org", name: "Aurora Chess" },
  support: { address: "support@aurorachess.org", name: "Aurora Chess Support" },
} as const;

export type SenderKey = keyof typeof SENDERS;

/**
 * Global ceiling on outbound mail per hour.
 *
 * Not a per-user limit — those exist separately. This is a blast radius cap: if
 * any caller develops a loop, the damage stops here rather than at Cloudflare's
 * quota or, worse, at the domain's reputation.
 */
const GLOBAL_HOURLY_CAP = 200;
let windowStart = Date.now();
let sentThisWindow = 0;

/** CR or LF in a header field allows injecting extra headers. */
const HEADER_UNSAFE = /[\r\n]/;

/** Deliberately strict: this is a gate, not a validator for display. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

let transport: Transporter | null = null;

function getTransport(): Transporter | null {
  const token = process.env.CLOUDFLARE_EMAIL_TOKEN;
  // Checked BEFORE the cache, not after. Otherwise clearing the token leaves a
  // live transport behind, and the only way to actually disable mail is a
  // restart — which is the opposite of what you want mid-incident.
  if (!token) {
    logger.warn("CLOUDFLARE_EMAIL_TOKEN not set — mail is disabled");
    transport = null;
    return null;
  }

  if (transport) return transport;

  transport = nodemailer.createTransport({
    host: "smtp.mx.cloudflare.net",
    // 465 with implicit TLS is the only port Cloudflare accepts for
    // submission. Plaintext and STARTTLS on 587 are not supported.
    port: 465,
    secure: true,
    auth: { user: "api_token", pass: token },
    // A stuck connection must not hold a request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transport;
}

export interface SendResult {
  sent: boolean;
  /** Machine-readable reason, for logs. Never shown to a user verbatim. */
  reason?: "no-transport" | "rate-capped" | "invalid-recipient" | "unsafe-header" | "error";
}

/**
 * Send one message.
 *
 * Never throws. Mail is always best-effort: a failure here must not break the
 * request that triggered it, because that would mean an email outage stops
 * people registering or changing their password.
 */
/**
 * Reset the hourly counter.
 *
 * Exists for tests, which would otherwise leak the count between cases and
 * make later assertions fail for the wrong reason. Also useful operationally:
 * if the cap trips because of a bug rather than real volume, this clears it
 * without a restart.
 */
export function resetMailWindow(): void {
  windowStart = Date.now();
  sentThisWindow = 0;
}

export async function sendMail(opts: {
  from: SenderKey;
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** For the audit trail. */
  context: string;
}): Promise<SendResult> {
  const { from, to, subject, text, html, context } = opts;

  if (!EMAIL_SHAPE.test(to) || to.length > 254) {
    logger.warn({ context }, "mail: recipient rejected");
    return { sent: false, reason: "invalid-recipient" };
  }
  // Checked on both fields. A newline in either is an injection attempt, not a
  // typo, so it is logged as such.
  if (HEADER_UNSAFE.test(to) || HEADER_UNSAFE.test(subject)) {
    logger.error({ context }, "mail: header injection attempt blocked");
    return { sent: false, reason: "unsafe-header" };
  }
  if (subject.length > 200) {
    return { sent: false, reason: "unsafe-header" };
  }

  const now = Date.now();
  if (now - windowStart > 3_600_000) {
    windowStart = now;
    sentThisWindow = 0;
  }
  if (sentThisWindow >= GLOBAL_HOURLY_CAP) {
    logger.error({ context, cap: GLOBAL_HOURLY_CAP }, "mail: global hourly cap hit");
    return { sent: false, reason: "rate-capped" };
  }

  const tx = getTransport();
  if (!tx) return { sent: false, reason: "no-transport" };

  const sender = SENDERS[from];
  try {
    sentThisWindow++;
    await tx.sendMail({
      from: { address: sender.address, name: sender.name },
      to,
      subject,
      text,
      ...(html ? { html } : {}),
      // Replies to automated mail go nowhere useful, so point them at support.
      ...(from === "noreply" || from === "auth" ? { replyTo: SENDERS.support.address } : {}),
    });
    logger.info({ context, from: sender.address }, "mail sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, context }, "mail send failed");
    return { sent: false, reason: "error" };
  }
}

/** Whether mail is configured at all, for surfacing honest UI. */
export function mailEnabled(): boolean {
  return Boolean(process.env.CLOUDFLARE_EMAIL_TOKEN);
}

/** Exposed for tests and the admin panel's diagnostics. */
export const MAIL_LIMITS = { GLOBAL_HOURLY_CAP };
export const SENDER_ADDRESSES = SENDERS;
