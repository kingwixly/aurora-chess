# Testing support tickets and email

There is no UI for tickets yet - the API is complete on both sides, but nothing
renders it. That is why you could not find it. Building the two pages is a
sensible next task; in the meantime you can drive it entirely with curl, which
is also the fastest way to prove the mail pipeline works.

## The flow

1. Anyone opens a ticket, signed in or not. If signed out they supply an email.
2. It lands in the queue at `GET /api/v1/admin/support`.
3. Staff reply. **The reply is emailed to the address stored on the ticket**,
   from `support@aurorachess.org`.
4. The reply is never sent to an address the caller supplies - see below.

## Open a ticket

```sh
curl -X POST https://aurorachess.org/api/v1/support/tickets \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your-verified-address@example.com",
    "subject": "Testing the pipeline",
    "body": "Checking that replies arrive."
  }'
```

Use an address **verified in Cloudflare**. Until `aurorachess.org` is fully
onboarded under Email Sending, Cloudflare only delivers to verified
destinations, so an unverified address fails for reasons that have nothing to
do with this code.

The response contains the ticket id.

## See the queue

Needs an admin session. Get an access token by logging in:

```sh
curl -X POST https://aurorachess.org/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dandanvardi@gmail.com","password":"YOUR_PASSWORD"}'
```

Copy `accessToken` from the response, then:

```sh
TOKEN=paste-the-access-token-here
curl https://aurorachess.org/api/v1/admin/support \
  -H "Authorization: Bearer $TOKEN"
```

## Reply, which sends the email

```sh
curl -X POST https://aurorachess.org/api/v1/admin/support/TICKET_ID/reply \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"body":"Thanks for writing in. This is a test reply."}'
```

The email should arrive within a few seconds. **If it does not**, check the API
log rather than guessing:

```sh
docker compose --env-file .env -f deployment/docker-compose.yml logs api --tail=40 | grep -i mail
```

- `CLOUDFLARE_EMAIL_TOKEN not set` - the variable never reached the container
- an SMTP auth failure - wrong token, or missing the Email Sending: Edit scope
- `recipient not verified` - use an address verified on your Cloudflare account

## Close a ticket

```sh
curl -X PATCH https://aurorachess.org/api/v1/admin/support/TICKET_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"CLOSED"}'
```

## Why the reply body has no recipient field

Deliberately, and it is the property that keeps this from being a spam relay.

The reply endpoint takes a ticket id and message text. There is no `to`, no
`from`, no `subject` - all three come from the stored ticket. A compromised
staff account can send annoying replies to people who already wrote in, and
nothing else. If you ever find yourself wanting to add a recipient parameter
"just for testing", that is the moment to stop.

Newlines in recipients and subjects are rejected at the sender, which is what
blocks `to: "a@b.com\nBcc: everyone"`. There are three independent rate
ceilings: per staff member, per ticket, and a global hourly cap.

## Testing verification email instead

Simpler, if you only want to prove mail works: register a new account with a
verified address. The verification email sends on signup, and the account is
limited to bot play until the link is clicked.

Registration never fails because mail failed - the account is created either
way and the send is retried. So a missing email means checking the log, not a
broken signup.
