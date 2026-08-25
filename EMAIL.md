# Email

Sends through Cloudflare Email Service over authenticated SMTP. No Worker, no
third-party provider, no API key beyond a Cloudflare token.

## Setup, on your side

1. Cloudflare dashboard → **Email Service → Email Sending** → onboard
   `aurorachess.org`. Add the DNS records it gives you.
2. Create an API token with **Email Sending: Edit**.
3. On the server, add to `.env`:

```sh
CLOUDFLARE_EMAIL_TOKEN=<the token>
DISCORD_AUTH_WEBHOOK=<optional, staff channel>
```

Nothing else changes. The API talks SMTP to `smtp.mx.cloudflare.net:465`
directly — Workers cannot do SMTP at all, so going through one would have meant
an HTTP API and more moving parts for no gain.

**Until the domain is onboarded, Cloudflare only delivers to verified
destination addresses on your account.** Test with your own address first.

## Addresses

| From       | Used for                                                    |
| ---------- | ----------------------------------------------------------- |
| `auth@`    | Verification, password reset, password/email change notices |
| `noreply@` | Account status: punishments, appeal outcomes                |
| `support@` | Staff replies to tickets                                    |

Automated mail sets `Reply-To: support@`, since replying to `noreply` is a
dead end that people do anyway.

## Unverified accounts

**Bot play only.** No public games, no friend games, no puzzles, no chat.

Applied as a capability rather than a punishment, because it is not one: no
record, no appeal, and it clears the moment they click the link. Bots stay open
so a new player can actually try the site while waiting — the difference
between a speed bump and a wall.

Verification never blocks registration. If mail is down, the account is created
and they can play bots; the send is retried later. An email outage costs you
nothing.

## The support terminal, and why it is not a relay

This is the piece that could have been turned into a spam cannon, so the
guarantees are structural rather than procedural.

**The recipient is never supplied by the caller.** A reply takes a ticket id
and message text. There is no `to`, no `from`, no `subject` parameter — all
three come from the stored ticket. A compromised staff account can send
annoying replies to people who already emailed us, and nothing else. This is
the one property in that file that must never be relaxed for convenience.

**Header injection is blocked at the sender.** A newline in a recipient or
subject is rejected and logged as an attempt, not a typo. Both CRLF and bare
LF. This is what stops `to: "a@b.com\nBcc: everyone"`.

**The sender is a key, not a string.** Callers pass `"auth" | "noreply" |
"support"`, which indexes a fixed table. No caller can set an arbitrary From.

**cc and bcc are never set**, and there is a test asserting it.

**Three independent ceilings**: per staff member per hour, per ticket, and a
global hourly cap across the whole process. The global one is the backstop for
a bug rather than an attacker.

**Every send is audit-logged** with who, which ticket, and whether it went.

19 tests cover this file specifically. They are the most important tests in the
codebase: a mail sender that a caller can steer is an open relay signed by our
own domain, and the reputation damage from that is not quickly recoverable.

## The Discord webhook

Posts **username and timestamp only**. Never the email address, never the code,
never a token.

You gave me veto power here and I did not need it — that was already the right
line. Two things I added on top:

- The username is escaped, so a name like `@everyone` or one containing
  backticks cannot forge formatting or ping a role in your staff channel.
  `allowed_mentions` is also set to suppress every mention type regardless.
- The webhook is rate limited and fails silently. A flood of reset requests
  would otherwise fill the channel exactly when staff need to read it, and a
  webhook outage must never affect a login.

## Verified

33 models, 118 routes, 29 migrations replay clean. 333 API, 279 shared, 251 web
tests. Everything typechecks.

## A note on the schema

Three interrupted sends left `SupportTicket`, `SupportMessage`, `TicketStatus`,
`EmailToken` and `EmailTokenKind` each declared two or three times, plus a
duplicate migration directory. Both are cleaned up — deduplicated to the first
definition of each, and the migration chain replays clean from empty.
