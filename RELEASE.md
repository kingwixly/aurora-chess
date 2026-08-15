# Aurora Chess — release

Registration is open, with velocity limiting instead of email verification.

## Deploying this

On the server:

```sh
cd ~/aurora
git pull
docker compose --env-file .env -f deployment/docker-compose.yml -f deployment/docker-compose.cloudflared.yml build
docker compose --env-file .env -f deployment/docker-compose.yml -f deployment/docker-compose.cloudflared.yml up -d
docker compose --env-file .env -f deployment/docker-compose.yml -f deployment/docker-compose.cloudflared.yml restart nginx
```

**The nginx restart is not optional.** It resolves upstream container IPs once
at startup, so a rebuilt api or web container gets a new IP and nginx keeps
talking to the old one. The symptom is a 502 on a site that is otherwise fine.

Migrations and all three seeds run automatically in the `migrate` container.
Confirm with `logs migrate | tail -20` — you want `Seeded 11 puzzles`.

## Signup velocity limiting

Five accounts per address per hour, three per device.

The address limit is looser on purpose: a household, a school or a hall of
residence legitimately shares one, and locking out a building to stop one person
is the wrong trade. A device fingerprint is far more specific, so it gets a
tighter bound.

Failed validation **refunds** the attempt, so a typo'd username does not spend
one of someone's five tries. The whole check **fails open** — if Redis is down,
registration keeps working, because an outage should not close the front door.

Chosen over email verification deliberately: it costs a legitimate player
nothing, needs no third-party service, and cannot lock someone out because a
message went to spam.

## A bug this surfaced

**The client never sent a device header.** The server has looked for
`x-aurora-device` since the moderation work went in, and nothing ever supplied
it — so device bans and the per-device limit were both dead code that looked
enabled.

It is sent on every request now. Worth being honest about what it is: a browser
cannot produce a hardware ID. This survives a new account, a cleared cookie and
a VPN; it does not survive a different browser or a profile reset. One signal
among several, never proof on its own. The user-facing wording says "device"
rather than anything implying hardware, because someone will test the claim.

Built from coarse, stable properties rather than canvas or audio fingerprinting
— those are more unique and much more fragile, so a ban would evaporate for
innocent reasons while reading as far more invasive than it is worth.

## Verified

| | |
|---|---|
| `packages/chess` | 259 tests |
| `apps/api` | 317 tests |
| `apps/web` | 250 tests |
| Schema check | 29 models |
| Route check | 108 routes |
| Migrations | 28 replay clean |
| Typecheck | all five apps and packages |

## Before telling anyone about it

Run the moderation path by hand. It is the only flow where a bug leaves someone
with no way to help themselves:

1. Ban a test account from the admin panel
2. **Confirm it can still sign in** and reach `/standing`
3. Confirm every other page redirects there
4. Appeal, accept the appeal, confirm access returns

## Known gaps, none blocking

- Avatar upload (the URL field works; file storage does not exist)
- Cross-game pattern detection (logic and tests exist, the query does not)
- Email verification (enforcement is wired; no mail transport)
- Club pages, offline bot play, Google sign-in
