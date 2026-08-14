# Aurora Chess — release

## The login loop, finally

**`apps/web/src/middleware.ts` was the cause, and it had been there the whole
time.** It redirected `/login` → `/play` whenever a `refresh_token` cookie
merely *existed*. Middleware runs at the edge and **cannot validate a session** —
the token is httpOnly and signed server-side, so all it can see is presence.

An expired cookie is still a present cookie. So:

1. Go to `/login` → middleware sees a cookie → sent to `/play`
2. `/play` asks the server → 401 → "You are signed out"
3. Click **Log in** → `/login` → bounced to `/play`

Clearing cookies was the only exit. That is why it survived so many versions:
every fix I made was on the pages, and the redirect was above them.

**Middleware no longer redirects away from auth pages at all.** A signed-in user
visiting `/login` is redirected by the page, which knows whether the session is
real. Being sent to `/login` while already signed in is a mild annoyance; being
unable to reach `/login` is a locked door. The reverse check stays — a *missing*
cookie definitely means no session, so it can only produce a false "signed out",
never a false "signed in" — and it now passes `?next=` so you land back where
you were headed. Only same-site paths are honoured, since an open redirect right
after a password prompt is a real risk.

## The twelve 401s

Those were not twelve failures — they were one session being destroyed twelve
times over. `/auth/refresh` **rotates** the token. Several components each
called `fetchMe` on mount, so the first request invalidated the token every
other request was holding, and all the losers came back 401.

`fetchMe` now resolves the session **once per page load**, tracked in store
state so it resets properly. Login and logout reset it, because they genuinely
change the answer.

## Glicko-2

Replaces Elo throughout — games, per-time-control pools, and puzzles.

Elo has no notion of confidence: a newcomer's rating and a veteran's are treated
identically, so new players crawl toward their real level and returning players
are judged on stale evidence. Glicko-2 carries a **deviation** (uncertainty) and
a **volatility** (consistency). Uncertain ratings move fast, settled ones move
slowly, and inactivity widens uncertainty without moving the rating.

Verified against **Glickman's own worked example** from the paper — a 1500/200
player beating a 1400 then losing to a 1550 and a 1700 must land near 1464.06
with deviation near 151.52. That test is the difference between real Glicko-2
and something that merely looks like it. 13 tests in total, including that a new
player moves more than 3× faster than a settled one.

Also provided: `isEstablished` (deviation ≤ 110) and `conservativeRating`
(rating − 2×deviation), so a 2400 who has played three games does not top a
leaderboard over a proven 2000.

### The scale changed

Elo was centred on 1200; Glicko-2 is centred on 1500. The migration **shifts**
existing ratings by +300 rather than resetting them — a 1600 player is above
average and should stay above the new centre. Verified on seeded data: 1200 →
1500, 2300 → 2600.

**Title thresholds moved with it** (AM 2200 → 2500, UM 2400 → 2700, and so on).
Leaving them alone would have made every title 300 points easier overnight.
Puzzle difficulties shifted too.

## Everything else in this build

- **Titles now appear everywhere.** Six routes wired — activity, friends, games,
  publicGames, collections, invites — plus the game board, which renders the
  full identity line and links to profiles.
- **Admin can grant things.** A Manage panel with three tabs: FIDE verification
  and profile, badge grant/revoke (credentials refuse to save without evidence),
  and rating correction with a mandatory reason.
- **Analysis board** at `/analysis`: explore freely with the engine's preferred
  move as an arrow, import a PGN *or* a bare FEN (it detects which), or hand the
  position to Stockfish at 800–3000 and play it out.
- **Small logo** is now a legible cyan silhouette below 48px instead of a blob.

## Verified

| Check | Result |
|---|---|
| `pnpm check:schema` | every Prisma select matches the schema |
| `packages/chess` | 223 tests, typecheck clean |
| `apps/web` | 244 tests, typecheck clean |
| `packages/ui`, `api-client`, `apps/admin` | typecheck clean |
| Migrations | all 22 replay clean against Postgres 16, rating shift verified on seeded data |

`apps/api` still cannot be typechecked here; `check:schema` covers the class of
bug that actually caused an outage.

## Deploy

```powershell
docker compose --env-file .env -f deployment/docker-compose.yml down -v
.\bootstrap.ps1
docker compose --env-file .env -f deployment/docker-compose.yml exec api pnpm --filter @aurora/api db:seed-puzzles
docker compose --env-file .env -f deployment/docker-compose.yml exec api pnpm --filter @aurora/api db:seed-bots
```

## Not built

- **Google sign-in** — needs OAuth credentials, a callback route and a provider
  table. A login button that cannot work is worse than no button.
- **The drawing-board minigame** — Snake only in the queue.
- **The rematch bug** — still never reproduced from the code. Send the URL when
  it fails.
